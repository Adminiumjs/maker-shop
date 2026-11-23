// @vitest-environment jsdom
/**
 * SELLING ABROAD, AT THE CHECKOUT. Until the owner lists a country the page is
 * the one it always was. Once one is listed the shopper picks from the list,
 * pays that country's price, and gives a phone number for the carrier.
 */
import axe from "axe-core";
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { I18nProvider } from "../i18n/index.tsx";
import { catalogueFrom } from "./door.ts";
import type { Catalogue } from "./port.ts";
import ShopApp from "./ShopApp.tsx";
import { detailValues, formErrors, goView, resetShop, useShop } from "./store.ts";
import { fakePort, sampleCatalogue, type FakePort } from "./testing.ts";

vi.mock("../../vendor/customiser/index.js", () => ({
  CustomiserEditor: () => null,
  designRefusal: () => null,
  heldDesign: () => null,
  hasSavedDesigns: () => false,
  openSavedLink: async () => "unknown",
  readDesigns: async () => [],
  YourDesigns: () => null,
}));
vi.mock("../../vendor/customiser/editor.css", () => ({}));

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const listed = (): Catalogue => {
  const base = sampleCatalogue();
  return {
    ...base,
    studio: { ...base.studio, homeCountry: "GB", email: "hello@example.test" },
    abroad: [{ id: 9, code: "abroad-de", name: "Germany", detail: null, tracked: false, country: "DE" }],
  };
};

let port: FakePort;
let root: Root | null = null;
let host: HTMLDivElement;

const settle = async (times = 4) => {
  for (let i = 0; i < times; i += 1) await act(async () => void (await vi.advanceTimersByTimeAsync(200)));
};
async function open(catalogue: Catalogue, locale: "en-US" | "ar-EG" = "en-US") {
  port = fakePort(catalogue);
  resetShop(port);
  localStorage.setItem("maker-shop-locale", locale);
  host = document.createElement("div");
  document.body.append(host);
  root = createRoot(host);
  await act(async () => root!.render(<I18nProvider><ShopApp /></I18nProvider>));
  await settle();
  await act(async () => document.querySelectorAll<HTMLButtonElement>(".sh-piece")[1]!.click());
  await settle();
  await type("#sh-words", "Mill Lane");
  await act(async () => document.querySelector<HTMLButtonElement>(".sh-total-bar button")!.click());
  await settle();
  await act(async () => goView("checkout"));
  await settle();
}
async function type(selector: string, value: string) {
  const el = document.querySelector<HTMLInputElement>(selector)!;
  const setter = Object.getOwnPropertyDescriptor(Object.getPrototypeOf(el), "value")!.set!;
  await act(async () => {
    setter.call(el, value);
    el.dispatchEvent(new Event("input", { bubbles: true }));
  });
  await settle(1);
}
async function pick(country: string) {
  const el = document.querySelector<HTMLSelectElement>("#sh-ck-country")!;
  const setter = Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype, "value")!.set!;
  await act(async () => {
    setter.call(el, country);
    el.dispatchEvent(new Event("change", { bubbles: true }));
  });
  await settle();
}
async function fill() {
  for (const [selector, value] of [["#sh-ck-name", "Priya Shah"], ["#sh-ck-email", "priya@example.com"], ["#sh-ck-line1", "Hauptstr. 1"], ["#sh-ck-town", "Berlin"], ["#sh-ck-postcode", "10115"]] as const) await type(selector, value);
}
const place = async () => {
  await act(async () => document.querySelector<HTMLButtonElement>(".sh-summary .sh-button")!.click());
  await settle();
};
const placedBody = () => port.calls.filter((c) => c.call === "place").at(-1)?.body;

async function clean(label: string) {
  vi.useRealTimers();
  const result = await axe.run(document.body, { runOnly: { type: "tag", values: ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"] }, rules: { "color-contrast": { enabled: false }, region: { enabled: false } } });
  vi.useFakeTimers();
  expect(result.violations.filter((v) => v.impact === "critical" || v.impact === "serious" || v.impact === "moderate").map((v) => v.id), label).toEqual([]);
}

beforeEach(() => {
  vi.useFakeTimers();
  sessionStorage.clear();
  localStorage.clear();
  window.history.replaceState(null, "", "/");
  window.scrollTo = () => {};
});
afterEach(async () => {
  await act(async () => root?.unmount());
  root = null;
  host?.remove();
  vi.useRealTimers();
});

describe("what the catalogue offers", () => {
  const row = (id: number, country: string | null) => ({ id, code: `c${String(id)}`, name: "n", detail: null, tracked: false, position: id, country });
  const rows = (services: unknown[], home: string | null) => ({ products: [], options: [], materials: [], services: services as never[], settings: [{ studio_name: "Birch Row", home_country: home }] as never[] });

  it("is the studio's own post alone until a country is listed", () => {
    const catalogue = catalogueFrom(rows([row(1, null), row(2, null)], "GB"), () => null);
    expect(catalogue.services.map((s) => s.id)).toEqual([1, 2]);
    expect(catalogue.abroad).toEqual([]);
  });

  it("keeps a country's delivery out of the studio's own post", () => {
    const catalogue = catalogueFrom(rows([row(1, null), row(2, "de")], "GB"), () => null);
    expect(catalogue.services.map((s) => s.id)).toEqual([1]);
    expect(catalogue.abroad.map((s) => [s.id, s.country])).toEqual([[2, "DE"]]);
  });

  it("offers nothing abroad from a studio with no country of its own", () => {
    expect(catalogueFrom(rows([row(1, null), row(2, "DE")], null), () => null).abroad).toEqual([]);
  });
});

describe("the form", () => {
  const details = { name: "A", email: "a@example.com", line1: "1", line2: "", town: "T", postcode: "P", phone: "", news: false };

  it("asks for a phone only for a parcel abroad, in the shape Adminium holds it to", () => {
    expect(formErrors(details)).toEqual({});
    expect(formErrors(details, true).phone).toBe("shop.checkout.err.phone");
    expect(formErrors({ ...details, phone: "call me" }, true).phone).toBe("shop.checkout.err.phoneShape");
    expect(formErrors({ ...details, phone: "+49 30 1234567" }, true).phone).toBeUndefined();
  });

  it("sends a phone only for a parcel abroad", () => {
    expect(detailValues({ ...details, phone: "+49 30 1234567" })).not.toHaveProperty("phone");
    expect(detailValues({ ...details, phone: " +49 30 1234567 " }, true)["phone"]).toBe("+49 30 1234567");
  });
});

describe("the checkout", () => {
  it("is the page it always was until a country is listed", async () => {
    await open(sampleCatalogue());
    expect(document.querySelector("#sh-ck-country")).toBeNull();
    expect(document.querySelector("#sh-ck-phone")).toBeNull();
    expect(document.querySelector(".sh-not-listed")).toBeNull();
    expect(document.querySelector('[role="radiogroup"]')).not.toBeNull();
    await fill();
    await place();
    expect(placedBody()?.values).not.toHaveProperty("phone");
  });

  it("offers only the listed countries, and leaves the home parcel as it was", async () => {
    await open(listed());
    const options = [...document.querySelectorAll<HTMLOptionElement>("#sh-ck-country option")].map((o) => o.value);
    expect(options).toEqual(["GB", "DE"]);
    expect(document.querySelector("#sh-ck-phone")).toBeNull();
    expect(document.querySelector('[role="radiogroup"]')).not.toBeNull();
  });

  it("charges the country's price, and will not place the order without a phone", async () => {
    await open(listed());
    await pick("DE");
    expect(useShop.getState().serviceId).toBe(9);
    expect(document.querySelector('[role="radiogroup"]')).toBeNull();
    expect(document.body.textContent).toContain("Import charges may be due on delivery.");
    expect(document.querySelector(".sh-summary")!.textContent).toContain("18.50");
    // A dry run asked before a number is typed holds a stand-in, and the stand-in never reaches a save.
    expect(port.calls.filter((c) => c.call === "quote").at(-1)?.body.values).toMatchObject({ service_id: 9, phone: "+00000" });
    await clean("abroad");
    await fill();
    await place();
    expect(placedBody()).toBeUndefined();
    expect(document.querySelector("#sh-ck-phone")!.getAttribute("aria-invalid")).toBe("true");
    expect(document.activeElement?.id).toBe("sh-ck-phone");
    await type("#sh-ck-phone", "+49 30 1234567");
    await place();
    expect(placedBody()?.values).toMatchObject({ service_id: 9, phone: "+49 30 1234567" });
    expect(placedBody()?.values).not.toHaveProperty("country");
  });

  it("drops the phone when the shopper comes home", async () => {
    await open(listed());
    await pick("DE");
    await type("#sh-ck-phone", "+49 30 1234567");
    await pick("GB");
    expect(document.querySelector("#sh-ck-phone")).toBeNull();
    await fill();
    await place();
    expect(placedBody()?.values).not.toHaveProperty("phone");
    expect(placedBody()?.values["service_id"]).toBe(1);
  });

  it.each(["en-US", "ar-EG"] as const)("says plainly when a country is not served, and goes back (%s)", async (locale) => {
    await open(listed(), locale);
    await act(async () => document.querySelector<HTMLButtonElement>(".sh-not-listed")!.click());
    await settle();
    expect(document.querySelector("#sh-ck-country")).toBeNull();
    expect(document.querySelector('a[href="mailto:hello@example.test"]')).not.toBeNull();
    await clean(`${locale} not served`);
    await act(async () => document.querySelector<HTMLButtonElement>(".sh-not-served .sh-button")!.click());
    await settle();
    expect(document.querySelector("#sh-ck-country")).not.toBeNull();
  });
});
