// @vitest-environment jsdom
/**
 * THE SHOP'S SCREENS, DRAWN, AND EACH STATE UNDER AXE.
 *
 * The whole shop side is mounted (its header, footer, toasts and the one
 * sheet) against a stand-in for Adminium, and walked as a shopper walks it:
 * the shop and its filters, a piece's page and its words, "Make it yours",
 * the basket, the checkout with its errors, a refusal, a moved price and
 * "Checking…", and the confirmation. Every state is swept by axe in English
 * and in Arabic. No stylesheet is loaded, so axe reads names, roles, labels,
 * the ties between a field and its messages, and never colour.
 *
 * The Customiser's editor is the add-on's, swept by its own suite; here a
 * stand-in takes its place and records what the shop hands it.
 */
import axe from "axe-core";
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { CustomiserEditorProps } from "../../vendor/customiser/index.js";
import { I18nProvider } from "../i18n/index.tsx";
import ShopApp from "./ShopApp.tsx";
import { goView, resetShop, useShop } from "./store.ts";
import { fakePort, type FakePort } from "./testing.ts";

const editor = vi.hoisted(() => ({ props: null as CustomiserEditorProps | null }));
vi.mock("../../vendor/customiser/index.js", () => ({
  CustomiserEditor: (props: CustomiserEditorProps) => {
    editor.props = props;
    return (
      <div>
        <h2>The editor</h2>
        <button type="button" onClick={() => props.onAddToBasket({ id: 7, code: "DSGN-7Q2K-X4PA", base_id: 101, ready_design_id: 5, values: { parts: { ring: { text: "Pinfold" }, date: { text: "Est. 1987" } } }, state: "draft", updatedAt: null, session: null, files: {}, used: ["logo"] })}>
          {props.addLabel ?? "Add to basket"}
        </button>
      </div>
    );
  },
  designRefusal: () => null,
  heldDesign: () => null,
}));
vi.mock("../../vendor/customiser/editor.css", () => ({}));

const TAGS = ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"];
(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

let port: FakePort;
let root: Root | null = null;
let host: HTMLDivElement;

async function settle(times = 4): Promise<void> {
  for (let i = 0; i < times; i += 1) {
    await act(async () => {
      await vi.advanceTimersByTimeAsync(200);
    });
  }
}

async function mount(locale: "en-US" | "ar-EG" = "en-US"): Promise<void> {
  localStorage.setItem("maker-shop-locale", locale);
  host = document.createElement("div");
  document.body.append(host);
  root = createRoot(host);
  await act(async () => {
    root!.render(
      <I18nProvider>
        <ShopApp />
      </I18nProvider>,
    );
  });
  await settle();
}

const type = async (selector: string, value: string): Promise<void> => {
  const el = document.querySelector<HTMLInputElement | HTMLTextAreaElement>(selector)!;
  const setter = Object.getOwnPropertyDescriptor(Object.getPrototypeOf(el), "value")!.set!;
  await act(async () => {
    setter.call(el, value);
    el.dispatchEvent(new Event("input", { bubbles: true }));
  });
  await settle(1);
};
const text = () => document.body.textContent ?? "";

/** Every axe violation that matters, named. */
async function sweep(label: string): Promise<void> {
  vi.useRealTimers();
  const result = await axe.run(document.body, { runOnly: { type: "tag", values: TAGS }, rules: { "color-contrast": { enabled: false }, region: { enabled: false } } });
  vi.useFakeTimers();
  const bad = result.violations.filter((v) => v.impact === "critical" || v.impact === "serious" || v.impact === "moderate");
  expect(result.passes.length, `${label}: axe examined nothing`).toBeGreaterThan(0);
  expect(
    bad.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(" ")).join(", ")}`),
    label,
  ).toEqual([]);
}

beforeEach(() => {
  vi.useFakeTimers();
  sessionStorage.clear();
  localStorage.clear();
  window.history.replaceState(null, "", "/");
  window.scrollTo = () => {};
  port = fakePort();
  resetShop(port);
  editor.props = null;
});
afterEach(async () => {
  await act(async () => root?.unmount());
  root = null;
  host?.remove();
  vi.useRealTimers();
});

const click = async (selector: string): Promise<void> => {
  await act(async () => document.querySelector<HTMLElement>(selector)!.click());
  await settle();
};

async function walkToCheckout(): Promise<void> {
  await act(async () => (document.querySelectorAll<HTMLButtonElement>(".sh-piece")[1]!).click());
  await settle();
  await type("#sh-words", "Mill Lane");
  await click(".sh-total-bar button");
  await click(".sh-summary .sh-button");
}

const DETAILS: [string, string][] = [
  ["#sh-ck-name", "Priya Shah"],
  ["#sh-ck-email", "priya@example.com"],
  ["#sh-ck-line1", "12 Mill Lane"],
  ["#sh-ck-town", "Settle"],
  ["#sh-ck-postcode", "BD24 9AA"],
];

describe.each(["en-US", "ar-EG"] as const)("the shop's screens in %s", (locale) => {
  const english = locale === "en-US";

  it("the shop, filtered, and filtered to nothing", async () => {
    await mount(locale);
    if (english) {
      expect(text()).toContain("Engraved walnut coasters");
      expect(text()).toContain("£34.00");
    }
    expect(document.querySelectorAll(".sh-piece")).toHaveLength(3);
    await sweep(`${locale} · shop`);
    await act(async () => useShop.setState({ category: "signs", family: "Walnut" }));
    expect(document.querySelectorAll(".sh-piece")).toHaveLength(0);
    await sweep(`${locale} · shop, nothing in that combination`);
  });

  it("a piece's page: priced, its words near the edge, over the limit, and the sheet", async () => {
    await mount(locale);
    await act(async () => goView("shop"));
    await act(async () => (document.querySelectorAll<HTMLButtonElement>(".sh-piece")[1]!).click());
    await settle();
    expect(window.location.pathname).toBe("/piece/coast-ply");
    if (english) {
      expect(text()).toContain("£24.00");
      expect(text()).toContain("Post by Tue 11 Aug");
      expect(text()).toContain("8% off");
    }
    await sweep(`${locale} · product`);
    await type("#sh-words", "Ann and Tom, 14 June 20");
    expect(document.querySelector("#sh-words-help")).not.toBeNull();
    await sweep(`${locale} · product, near the edge`);
    await type("#sh-words", "The Bellamy-Hart Kitchen Co.");
    expect(document.querySelector("#sh-words")!.getAttribute("aria-invalid")).toBe("true");
    await sweep(`${locale} · product, over the limit`);
    await act(async () => (document.querySelector<HTMLButtonElement>(".sh-total-bar button")!).click());
    await settle();
    expect(document.querySelector('[role="dialog"]')).not.toBeNull();
    await sweep(`${locale} · product, too long to cut`);
    expect(useShop.getState().basket).toEqual([]);
  });

  it("a piece the Customiser makes: Make it yours, then the editor, priced and put in the basket", async () => {
    await mount(locale);
    await act(async () => (document.querySelectorAll<HTMLButtonElement>(".sh-piece")[0]!).click());
    await settle();
    expect(document.querySelector('a[href="/piece/coast-wal/customise"]')).not.toBeNull();
    await sweep(`${locale} · product, customisable`);
    await act(async () => document.querySelector<HTMLAnchorElement>('a[href="/piece/coast-wal/customise"]')!.click());
    await settle();
    expect(window.location.pathname).toBe("/piece/coast-wal/customise");
    const props = editor.props!;
    expect(props.base).toBe(101);
    expect(props.look).toBe("maker");
    expect(props.quantity?.breaks?.map((b) => b.qty)).toEqual([4, 8, 12]);
    if (english) {
      expect(props.price?.total).toBe("£34.00");
      expect(props.product).toEqual({ name: "Engraved walnut coasters", price: "£34.00", unit: "set of 4" });
      expect(props.featurePrices).toEqual({ logo: "+£1.50 a piece" });
      expect(props.price?.note).toBe("We post it by Tue 11 Aug");
    }
    await act(async () => props.onDesignChange?.({ design: { base_id: 101, ready_design_id: 5, values: { parts: {} } }, used: ["logo"], ok: true }));
    await settle();
    if (english) expect(editor.props!.price?.total).toBe("£40.00");
    await sweep(`${locale} · customise`);
    await act(async () => (document.querySelector<HTMLButtonElement>(".sh-customise button")!).click());
    await settle();
    expect(window.location.pathname).toBe("/basket");
    const line = useShop.getState().basket[0]!;
    expect(line.design?.code).toBe("DSGN-7Q2K-X4PA");
    expect(line.features).toEqual([20]);
    expect(document.querySelector(".sh-line-design")?.getAttribute("aria-label")).toContain("Pinfold");
    await sweep(`${locale} · basket, a designed line`);
    // Edit the design: the editor opens on the line's design, and updates the line.
    await act(async () => document.querySelector<HTMLAnchorElement>(".sh-line a")!.click());
    await settle();
    expect(editor.props!.design).toMatchObject({ code: "DSGN-7Q2K-X4PA" });
    await act(async () => (document.querySelector<HTMLButtonElement>(".sh-customise button")!).click());
    await settle();
    expect(useShop.getState().basket).toHaveLength(1);
  });

  it("the basket: lines priced by a dry run, quantities changed, and empty", async () => {
    await mount(locale);
    await walkToCheckout();
    await act(async () => goView("basket"));
    await settle();
    if (english) {
      expect(text()).toContain("You asked for");
      expect(text()).toContain("£27.95");
      expect(text()).toContain("posted by Tuesday 11 August");
    }
    await sweep(`${locale} · basket`);
    await act(async () => (document.querySelector<HTMLButtonElement>(".sh-stepper button:last-child")!).click());
    await settle();
    expect(useShop.getState().basket[0]!.qty).toBe(2);
    await act(async () => (document.querySelector<HTMLButtonElement>(".sh-remove")!).click());
    await settle();
    expect(document.querySelector(".sh-empty-card")).not.toBeNull();
    await sweep(`${locale} · basket, empty`);
  });

  it("the checkout: its errors, a refusal on its field, Checking…, a moved price, and the confirmation", async () => {
    await mount(locale);
    await walkToCheckout();
    expect(window.location.pathname).toBe("/checkout");
    await sweep(`${locale} · checkout`);
    await act(async () => (document.querySelector<HTMLButtonElement>(".sh-summary .sh-button")!).click());
    await settle();
    expect(document.querySelectorAll('[aria-invalid="true"]')).toHaveLength(5);
    expect(document.activeElement?.id).toBe("sh-ck-name");
    await sweep(`${locale} · checkout, the form's errors`);

    for (const [selector, value] of DETAILS) await type(selector, value);
    port.refuseNext({ code: "PUBLIC_WRITE_REFUSED", column: "postcode", reason: "plain-text" });
    await act(async () => (document.querySelector<HTMLButtonElement>(".sh-summary .sh-button")!).click());
    await settle();
    expect(document.querySelector("#sh-ck-postcode")!.getAttribute("aria-invalid")).toBe("true");
    expect(document.querySelector("#sh-ck-postcode-err")).not.toBeNull();
    expect(document.activeElement?.id).toBe("sh-ck-postcode");
    await sweep(`${locale} · checkout, refused on its field`);

    await type("#sh-ck-postcode", "BD24 9AB");
    const release = port.hold();
    await act(async () => (document.querySelector<HTMLButtonElement>(".sh-summary .sh-button")!).click());
    await act(async () => {
      await Promise.resolve();
    });
    expect(document.querySelector('.sh-summary .sh-button[aria-busy="true"]')).not.toBeNull();
    if (english) expect(text()).toContain("Checking…");
    await sweep(`${locale} · checkout, checking`);
    port.raise(2, 1);
    release();
    await settle();
    expect(document.querySelector(".sh-moved")).not.toBeNull();
    if (english) expect(text()).toContain("Order at £28.95");
    expect(port.calls.some((c) => c.call === "place")).toBe(false);
    await sweep(`${locale} · checkout, the price moved`);

    await act(async () => (document.querySelector<HTMLButtonElement>(".sh-summary .sh-button")!).click());
    await settle();
    expect(port.calls.find((c) => c.call === "place")!.expect).toBe("28.95");
    expect(window.location.pathname).toBe("/checkout");
    expect(text()).toContain("BR-2291");
    if (english) {
      expect(text()).toContain("£28.95");
      expect(text()).toContain("Tue 11 Aug");
      expect(text()).toContain("We'll send you a picture to approve");
    }
    await sweep(`${locale} · confirmation`);
    // "Look at the order": the order's own page, its link's code after the `#`.
    await act(async () => (document.querySelector<HTMLButtonElement>(".sh-confirm-actions .sh-button--accent")!).click());
    await settle();
    expect(window.location.pathname).toBe("/order");
    expect(window.location.hash).toBe("#LINKCODE0000000A");
  });

  it("an empty checkout, a failed shop, and a page that isn't here", async () => {
    await mount(locale);
    await act(async () => goView("checkout"));
    await settle();
    expect(document.querySelector(".sh-empty-card")).not.toBeNull();
    await sweep(`${locale} · checkout, empty`);
    await act(async () => goView("missing"));
    await settle();
    await sweep(`${locale} · not here`);
    await act(async () => useShop.setState({ loading: "failed" }));
    await sweep(`${locale} · the shop failed to open`);
  });
});
