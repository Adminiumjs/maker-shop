// @vitest-environment jsdom
/**
 * THE SHOP'S PAGES AFTER AN ORDER, DRAWN, AND EACH STATE UNDER AXE.
 *
 * The whole shop side is mounted against stand-ins for Adminium and walked
 * as a shopper walks it: Your order found by its number and a code (the
 * errors, a wrong code, the order with its proof waiting, a change asked
 * for, an approval), opened by its own link and by a link that opens
 * nothing; the sign-in link's page; Order again; Your designs; "Ask us for
 * something" and "If something's wrong" with their errors and their sent
 * states; postage and the calendar; About us; looking after it; search with
 * and without hits; and the page that isn't there. Every state is swept by
 * axe in English and in Arabic. No stylesheet is loaded, so axe reads names,
 * roles, labels and the ties between a field and its messages.
 */
import axe from "axe-core";
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { I18nProvider } from "../i18n/index.tsx";
import { resetAfter, searchFor } from "./after.ts";
import ShopApp from "./ShopApp.tsx";
import { goView, resetShop, useShop } from "./store.ts";
import { fakePort, type FakePort } from "./testing.ts";

const designs = vi.hoisted(() => ({ codes: null as readonly string[] | null }));
vi.mock("../../vendor/customiser/index.js", () => ({
  CustomiserEditor: () => <h2>The editor</h2>,
  YourDesigns: (props: { codes?: readonly string[] }) => {
    designs.codes = props.codes ?? [];
    return <h1>Your designs</h1>;
  },
  designRefusal: () => null,
  heldDesign: () => null,
  hasSavedDesigns: (held: readonly unknown[]) => held.length > 0,
  openSavedLink: async () => "unknown",
  readDesigns: async () => [],
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

async function mount(locale: "en-US" | "ar-EG", path = "/"): Promise<void> {
  localStorage.setItem("maker-shop-locale", locale);
  window.history.replaceState(null, "", path);
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
const click = async (selector: string, at = 0): Promise<void> => {
  await act(async () => document.querySelectorAll<HTMLElement>(selector)[at]!.click());
  await settle();
};
const text = () => document.body.textContent ?? "";

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
  window.scrollTo = () => {};
  port = fakePort();
  resetShop(port);
  resetAfter(null);
  designs.codes = null;
});
afterEach(async () => {
  await act(async () => root?.unmount());
  root = null;
  host?.remove();
  vi.useRealTimers();
});

describe.each(["en-US", "ar-EG"] as const)("the pages after an order in %s", (locale) => {
  const english = locale === "en-US";

  it("Your order: found by its number and a code, its proof answered", async () => {
    await mount(locale, "/order");
    expect(window.location.pathname).toBe("/order");
    if (english) expect(text()).toContain("Open the link in any e-mail we've sent about it.");
    await sweep(`${locale} · your order, find`);

    // Nothing typed: each field says so, and nothing is asked.
    await click(".sa-lookup .sh-button--ink");
    expect(document.querySelector("#sh-lk-order-ref")!.getAttribute("aria-invalid")).toBe("true");
    expect(document.querySelector("#sh-lk-order-ref-err")).not.toBeNull();
    expect(port.afterFake.calls).toEqual([]);
    await sweep(`${locale} · your order, field errors`);

    await type("#sh-lk-order-ref", "BR-2276");
    await type("#sh-lk-order-email", "iris.p@example.com");
    await click(".sa-lookup .sh-button--ink");
    expect(document.querySelectorAll(".sa-digit")).toHaveLength(6);
    expect(document.activeElement?.id).toBe("sh-lk-order-code-0");
    if (english) {
      expect(text()).toContain("We've sent a 6-digit code to the e-mail on that order");
      expect(text()).toContain("It works once, for 20 minutes.");
      expect(text()).toContain("Send a new code in 0:30");
    }
    await sweep(`${locale} · your order, the code`);

    // A wrong code, then the right one, pasted.
    await type("#sh-lk-order-code-0", "111111");
    await click(".sa-code .sh-button--accent");
    expect(document.querySelector("#sh-lk-order-code-err")).not.toBeNull();
    if (english) expect(text()).toContain("Wrong code. Check the e-mail we sent and try again.");
    await sweep(`${locale} · your order, wrong code`);
    await type("#sh-lk-order-code-0", "123456");
    await click(".sa-code .sh-button--accent");

    // The order: its stages, the proof waiting, what is being made, the proofs so far.
    expect(text()).toContain("BR-2276");
    expect(document.querySelectorAll(".sa-stage")).toHaveLength(5);
    expect(document.querySelectorAll(".sa-stage--done")).toHaveLength(1);
    expect(document.querySelectorAll(".sa-proof")).toHaveLength(1);
    if (english) {
      expect(text()).toContain("A picture is waiting for you");
      expect(text()).toContain("Post by Fri 7 Aug");
      expect(text()).toContain("“The Old Mill”");
      expect(text()).toContain("Proof 2 sent");
      expect(text()).toContain("“Could the words be a little bigger?”");
      expect(text()).toContain("£65.50");
    }
    await sweep(`${locale} · your order, proof waiting`);

    // Ask for a change: an empty note is refused on its field; a note is sent.
    await click(".sa-proof .sa-row .sh-button:not(.sh-button--accent)");
    expect(document.activeElement?.tagName).toBe("TEXTAREA");
    await click(".sa-change .sh-button--ink");
    expect(document.querySelector(".sa-change textarea")!.getAttribute("aria-invalid")).toBe("true");
    await sweep(`${locale} · your order, change box with its error`);
    await type(".sa-change textarea", "Could it sit a little lower?");
    await click(".sa-change .sh-button--ink");
    expect(port.afterFake.calls.filter((c) => c.call === "answerProof").map((c) => c.args)).toEqual([["mine", "502", { state: "change_asked", change_note: "Could it sit a little lower?" }]]);
    expect(document.querySelectorAll(".sa-proof")).toHaveLength(0);
    if (english) expect(text()).toContain("We'll send a new proof.");
    await sweep(`${locale} · your order, change asked`);
  });

  it("Your order: approved, opened by its own link, and a link that opens nothing", async () => {
    await mount(locale, "/order#LINKCODE0000000A");
    expect(window.location.hash).toBe("");
    expect(document.querySelectorAll(".sa-proof")).toHaveLength(1);
    await click(".sa-proof .sh-button--accent");
    expect(port.afterFake.calls.filter((c) => c.call === "answerProof").map((c) => c.args)).toEqual([["link", "502", { state: "approved" }]]);
    if (english) expect(text()).toContain("Approved — we'll start on it.");
    expect(document.querySelectorAll(".sa-stage--done")).toHaveLength(2);
    await sweep(`${locale} · your order, approved`);
    await act(async () => root?.unmount());
    host.remove();

    resetAfter(null);
    await mount(locale, "/order#NOSUCHLINK000000");
    expect(document.querySelector('[role="alert"]')).not.toBeNull();
    expect(document.querySelector("#sh-lk-order-ref")).not.toBeNull();
    if (english) expect(text()).toContain("That link doesn't open an order.");
    await sweep(`${locale} · your order, a link that opens nothing`);
  });

  it("a posted order, Your designs from its lines, and Order again", async () => {
    port.afterFake.session = "iris.p@example.com";
    await mount(locale, "/order");
    await type("#sh-lk-order-ref", "BR-2247");
    await type("#sh-lk-order-email", "iris.p@example.com");
    await click(".sa-lookup .sh-button--ink");
    expect(document.querySelectorAll(".sa-stage--done")).toHaveLength(5);
    if (english) {
      expect(text()).toContain("Posted Fri 17 Jul");
      expect(text()).toContain("In the post. We e-mailed you when it went.");
    }
    await sweep(`${locale} · your order, posted`);

    // Your designs: the codes the order's lines name.
    await click(".sa-order > .sa-row .sh-button", 0);
    expect(designs.codes).toEqual(["DSGN-7Q2K-X4PA"]);
    await sweep(`${locale} · your designs`);

    // Order again: both orders, newest first; one put back in the basket.
    await act(async () => goView("find"));
    await settle();
    expect(document.querySelectorAll(".sa-again-card")).toHaveLength(2);
    if (english) {
      expect(text()).toContain("posted Fri 17 Jul");
      expect(text()).toContain("on the bench");
      expect(text()).not.toContain("Charged");
    }
    await sweep(`${locale} · order again`);
    await click(".sa-again-card .sh-button--accent", 0);
    expect(window.location.pathname).toBe("/basket");
    expect(useShop.getState().basket.map((b) => [b.productId, b.qty, b.lettering])).toEqual([[2, 2, "The Old Mill"]]);
  });

  it("the sign-in link's page, then the orders to pick from", async () => {
    await mount(locale, "/c#SIGNINLINK000000");
    expect(port.afterFake.calls.map((c) => c.call)).toEqual(["peekSignInLink"]);
    if (english) expect(text()).toContain("Hello Iris.");
    await sweep(`${locale} · sign-in link`);
    await click(".sa-lookup .sh-button--accent");
    expect(window.location.pathname).toBe("/order");
    expect(document.querySelectorAll(".sa-pick")).toHaveLength(2);
    await sweep(`${locale} · your orders to pick from`);
    await click(".sa-pick", 1);
    expect(text()).toContain("BR-2247");

    await act(async () => root?.unmount());
    host.remove();
    resetAfter(null);
    await mount(locale, "/c#SPENTLINK0000000");
    expect(document.querySelector('[role="alert"]')).not.toBeNull();
    await sweep(`${locale} · sign-in link used`);
  });

  it("Ask us for something: its errors, a refusal on its field, and sent", async () => {
    await mount(locale, "/ask");
    await sweep(`${locale} · ask us`);
    await click(".sa-form .sh-button--wide");
    expect(document.querySelector("#sa-ask-what")!.getAttribute("aria-invalid")).toBe("true");
    expect(document.querySelector("#sa-ask-email-err")).not.toBeNull();
    expect(document.querySelector("#sa-ask-name-err")).not.toBeNull();
    await sweep(`${locale} · ask us, errors`);
    await type("#sa-ask-what", "A sign for the allotment gate");
    await type("#sa-ask-name", "Bex Thorne");
    await type("#sa-ask-email", "bex@example.com");
    await type("#sa-ask-when", "29/08/2026");
    await click(".sa-chip", 2);
    port.afterFake.refuseNext({ code: "PUBLIC_WRITE_REFUSED", column: "wanted_when", reason: "plain-text" });
    await click(".sa-form .sh-button--wide");
    expect(document.querySelector("#sa-ask-when")!.getAttribute("aria-invalid")).toBe("true");
    await sweep(`${locale} · ask us, refused on its field`);
    await type("#sa-ask-when", "End of August");
    await click(".sa-form .sh-button--wide");
    const sent = port.afterFake.calls.filter((c) => c.call === "ask").at(-1)!.args[0] as Record<string, unknown>;
    expect(sent).toMatchObject({ idea: "A sign for the allotment gate", name: "Bex Thorne", email: "bex@example.com", material: "Slate", wanted_when: "End of August", language: locale });
    expect(document.querySelector(".sa-sent")).not.toBeNull();
    if (english) expect(text()).toContain("Thanks — we've e-mailed you a copy and we'll reply within two studio days.");
    await sweep(`${locale} · ask us, sent`);
  });

  it("If something's wrong: its errors, an order not theirs, and sent", async () => {
    await mount(locale, "/something-wrong");
    await sweep(`${locale} · something's wrong`);
    await click(".sa-form .sh-button--wide");
    expect(document.querySelector("#sa-wr-kind-err")).not.toBeNull();
    expect(document.querySelector("#sa-wr-ref")!.getAttribute("aria-invalid")).toBe("true");
    await sweep(`${locale} · something's wrong, errors`);
    await type("#sa-wr-ref", "BR-2288");
    await type("#sa-wr-email", "iris.p@example.com");
    await type("#sa-wr-name", "Iris P.");
    await type("#sa-wr-details", "One coaster came cracked.");
    await click('[role="radio"]', 0);
    expect(document.querySelector('[role="radio"]')!.getAttribute("aria-checked")).toBe("true");
    port.afterFake.refuseNext({ code: "PUBLIC_WRITE_REFUSED", column: "order_id", reason: "lookup" });
    await click(".sa-form .sh-button--wide");
    expect(document.querySelector("#sa-wr-ref-err")).not.toBeNull();
    if (english) expect(text()).toContain("We can't find that order with that e-mail.");
    await sweep(`${locale} · something's wrong, not their order`);
    await type("#sa-wr-ref", "BR-2276");
    await click(".sa-form .sh-button--wide");
    expect(port.afterFake.calls.filter((c) => c.call === "report").at(-1)!.args[0]).toMatchObject({ order_ref: "BR-2276", what: "damaged", details: "One coaster came cracked." });
    expect(document.querySelector(".sa-sent")).not.toBeNull();
    await sweep(`${locale} · something's wrong, sent`);
  });

  it("postage and the calendar, about us, looking after it", async () => {
    await mount(locale, "/postage");
    await settle(6);
    const days = [...document.querySelectorAll(".sa-day")];
    expect(days).toHaveLength(14);
    // From Thursday 6 August: Sunday 9, Monday 10 not studio days; Saturday 15 closed for the fair.
    expect(days[0]!.className).toContain("sa-day--today");
    expect([3, 4, 10, 11].every((i) => days[i]!.className.includes("sa-day--off"))).toBe(true);
    expect(days[9]!.className).toContain("sa-day--closed");
    if (english) {
      expect(days[9]!.textContent).toContain("Closed — we're at the Whitby craft fair");
      expect(text()).toContain("The bench runs Tuesday, Wednesday, Thursday, Friday and Saturday and we are shut Sunday and Monday. An order placed before 17:00 starts the same studio day.");
      expect(text()).toContain("Order by 17:00 today, Thu 6 Aug → posted by Tue 11 Aug");
      expect(text()).toContain("Engraved walnut coasters");
      expect(text()).toContain("3 studio days");
      expect(text()).toContain("£3.95");
      expect(text()).toContain("£7.50");
    }
    await sweep(`${locale} · postage and the calendar`);

    await act(async () => goView("about"));
    await settle();
    expect(document.querySelectorAll(".sa-machine")).toHaveLength(2);
    if (english) expect(text()).toContain("Two of us, a laser, two printers and a kiln.");
    await sweep(`${locale} · about us`);

    await act(async () => goView("care"));
    await settle();
    expect(document.querySelectorAll(".sa-care-card")).toHaveLength(0);
    await sweep(`${locale} · looking after it, nothing written yet`);
    await act(async () => useShop.setState({ catalogue: { ...useShop.getState().catalogue!, materials: useShop.getState().catalogue!.materials.map((m) => ({ ...m, care: "Wipe it with a damp cloth.\nNo dishwasher." })) } }));
    expect(document.querySelectorAll(".sa-care-card")).toHaveLength(3);
    expect(document.querySelectorAll(".sa-care-lines li")).toHaveLength(6);
    await sweep(`${locale} · looking after it`);
  });

  it("search, with hits and with none, and the page that isn't there", async () => {
    await mount(locale);
    await act(async () => searchFor("coasters"));
    await settle();
    expect(window.location.pathname).toBe("/search");
    expect(document.querySelectorAll(".sh-piece")).toHaveLength(2);
    await sweep(`${locale} · search`);
    await act(async () => searchFor("teapot"));
    await settle();
    expect(document.querySelectorAll(".sh-piece")).toHaveLength(0);
    if (english) expect(text()).toContain("We don't make that — yet");
    await sweep(`${locale} · search, nothing`);
    await act(async () => goView("missing"));
    await settle();
    if (english) expect(text()).toContain("Nothing on this bench");
    await sweep(`${locale} · 404`);
  });
});
