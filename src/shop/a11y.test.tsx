// @vitest-environment jsdom
/**
 * EVERY SCREEN OF THE SHOP, IN EVERY STATE IT HAS, UNDER AXE.
 *
 * The shop side is mounted whole (header, footer, toasts, the one sheet)
 * against the stand-ins for Adminium, driven into one state, and swept by
 * axe: WCAG 2.0, 2.1 and 2.2 A/AA and axe's best practices, at every impact.
 * Each state runs in English and in Arabic (`dir="rtl"`), in the light
 * theme and the dark one (the `data-theme` the header's switch sets).
 *
 * The states are a table, one row each. The table is checked against the
 * shop's own lists of screens (`ShopView`, the address bar's `ELSEWHERE`,
 * the customer side's `SHOP_NAV`), so a screen added without a row here
 * fails this file, and every row proves it reached its state before axe
 * looks at it.
 *
 * The Customiser's editor and its "Your designs" list are the add-on's,
 * swept by its own suite; stand-ins take their place here.
 */
import axe from "axe-core";
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { CustomiserEditorProps } from "../../vendor/customiser/index.js";
import { I18nProvider } from "../i18n/index.tsx";
import { resetAfter, searchFor, useAfter } from "./after.ts";
import { SHOP_NAV } from "./nav.ts";
import { ELSEWHERE } from "./route.ts";
import ShopApp from "./ShopApp.tsx";
import { goView, resetShop, useShop, type ShopView } from "./store.ts";
import { fakePort, type FakePort } from "./testing.ts";

vi.mock("../../vendor/customiser/index.js", () => ({
  CustomiserEditor: (props: CustomiserEditorProps) => (
    <div>
      <h2>The editor</h2>
      <button type="button" onClick={() => props.onAddToBasket({ id: 7, code: "DSGN-7Q2K-X4PA", base_id: 101, ready_design_id: 5, values: { parts: { ring: { text: "Pinfold" } } }, state: "draft", updatedAt: null, session: null, files: {}, used: [] })}>
        {props.addLabel ?? "Add to basket"}
      </button>
    </div>
  ),
  YourDesigns: () => <h1>Your designs</h1>,
  designRefusal: () => null,
  heldDesign: () => null,
  hasSavedDesigns: (held: readonly unknown[]) => held.length > 0,
  openSavedLink: async () => "unknown",
  readDesigns: async () => [],
}));
vi.mock("../../vendor/customiser/editor.css", () => ({}));

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

/**
 * What axe is asked. Two rules are off, each because jsdom draws nothing:
 * colour contrast needs computed colours over a laid-out page, and target
 * size needs the boxes a layout gives.
 */
const AXE: axe.RunOptions = {
  runOnly: { type: "tag", values: ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa", "best-practice"] },
  rules: {
    "color-contrast": { enabled: false }, // jsdom computes no colours over a layout
    "target-size": { enabled: false }, // jsdom lays nothing out, so every box is 0 × 0
  },
};

// ── the harness ───────────────────────────────────────────────────────────

let port: FakePort;
let root: Root | null = null;
let host: HTMLDivElement | null = null;

async function settle(times = 4): Promise<void> {
  for (let i = 0; i < times; i += 1) {
    await act(async () => {
      await vi.advanceTimersByTimeAsync(200);
    });
  }
}

async function mount(path: string): Promise<void> {
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

const $ = (selector: string) => document.querySelector<HTMLElement>(selector);
const $$ = (selector: string) => [...document.querySelectorAll<HTMLElement>(selector)];

async function type(selector: string, value: string): Promise<void> {
  const el = document.querySelector<HTMLInputElement | HTMLTextAreaElement>(selector);
  if (el === null) throw new Error(`nothing to type into: ${selector}`);
  const setter = Object.getOwnPropertyDescriptor(Object.getPrototypeOf(el), "value")!.set!;
  await act(async () => {
    setter.call(el, value);
    el.dispatchEvent(new Event("input", { bubbles: true }));
  });
  await settle(1);
}

async function click(selector: string, at = 0): Promise<void> {
  const el = $$(selector)[at];
  if (el === undefined) throw new Error(`nothing to click: ${selector} [${at}]`);
  await act(async () => el.click());
  await settle();
}

const set = async (fn: () => void): Promise<void> => {
  await act(async () => fn());
  await settle(1);
};

// ── the walks several states start from ───────────────────────────────────

/** A piece with words put in the basket: the birch ply coasters, "Mill Lane". */
async function wordsInBasket(): Promise<void> {
  await click(".sh-piece", 1);
  await type("#sh-words", "Mill Lane");
  await click(".sh-total-bar button");
}

async function toCheckout(): Promise<void> {
  await wordsInBasket();
  await click(".sh-summary .sh-button");
}

async function filledCheckout(): Promise<void> {
  await toCheckout();
  for (const [selector, value] of [
    ["#sh-ck-name", "Priya Shah"],
    ["#sh-ck-email", "priya@example.com"],
    ["#sh-ck-line1", "12 Mill Lane"],
    ["#sh-ck-town", "Settle"],
    ["#sh-ck-postcode", "BD24 9AA"],
  ] as const)
    await type(selector, value);
}

const placeButton = ".sh-summary .sh-button";

async function lookUp(ref: string, email = "iris.p@example.com"): Promise<void> {
  await type("#sh-lk-order-ref", ref);
  await type("#sh-lk-order-email", email);
  await click(".sa-lookup .sh-button--ink");
}

async function openOrder(ref = "BR-2276"): Promise<void> {
  await lookUp(ref);
  await type("#sh-lk-order-code-0", "123456");
  await click(".sa-code .sh-button--accent");
}

async function fillAsk(): Promise<void> {
  await type("#sa-ask-what", "A sign for the allotment gate");
  await type("#sa-ask-name", "Bex Thorne");
  await type("#sa-ask-email", "bex@example.com");
  await type("#sa-ask-when", "End of August");
}

async function fillProblem(ref = "BR-2276"): Promise<void> {
  await type("#sa-wr-ref", ref);
  await type("#sa-wr-email", "iris.p@example.com");
  await type("#sa-wr-name", "Iris P.");
  await type("#sa-wr-details", "One coaster came cracked.");
  await click('[role="radio"]', 0);
}

// ── the states ────────────────────────────────────────────────────────────

interface Row {
  view: ShopView;
  state: string;
  /** The address the shop is opened at. */
  path?: string;
  /** Anything to do to the stand-ins before the shop opens. */
  before?: () => void;
  /** Drive the open shop into the state. */
  go?: () => Promise<void>;
  /** Proof the state was reached: a selector that must match. */
  shows: string;
  /** Why this state has no heading of its own, when it has none (the page's one `h1` is checked by hand: axe leaves it undecided in jsdom). */
  noHeading?: string;
}

const STATES: Row[] = [
  // The shop
  { view: "shop", state: "opening", go: () => set(() => useShop.setState({ loading: "loading" })), shows: ".sh-loading[aria-busy='true']", noHeading: "a skeleton for a moment, its busy region says it is loading" },
  { view: "shop", state: "failed to open", go: () => set(() => useShop.setState({ loading: "failed" })), shows: "#sh-failed-title" },
  { view: "shop", state: "its pieces", shows: ".sh-piece" },
  { view: "shop", state: "filtered", go: () => set(() => useShop.setState({ category: "coasters" })), shows: ".sh-piece" },
  { view: "shop", state: "filtered to nothing", go: () => set(() => useShop.setState({ category: "signs", family: "Walnut" })), shows: ".sh-empty .sh-empty-title" },
  // A piece's page
  { view: "product", state: "priced", path: "/piece/coast-ply", shows: "#sh-words" },
  { view: "product", state: "being priced", path: "/piece/coast-ply", before: () => void port.hold(), shows: ".sh-each[aria-busy='true']" },
  { view: "product", state: "its price failed", path: "/piece/coast-ply", before: () => port.refuseNext({ code: "UNREACHABLE" }), shows: ".sh-options [role='alert']" },
  { view: "product", state: "another angle, material and quantity", path: "/piece/coast-wal", go: async () => (await click(".sh-thumb", 2), await click(".sh-choice--material", 1), await click(".sh-break", 1)), shows: ".sh-thumb[aria-pressed='true']" },
  { view: "product", state: "words near the edge", path: "/piece/coast-ply", go: () => type("#sh-words", "Ann and Tom, 14 June 20"), shows: "#sh-words-help" },
  { view: "product", state: "words over the limit", path: "/piece/coast-ply", go: () => type("#sh-words", "The Bellamy-Hart Kitchen Co."), shows: "#sh-words[aria-invalid='true']" },
  { view: "product", state: "the sheet: too long to cut", path: "/piece/coast-ply", go: async () => (await type("#sh-words", "The Bellamy-Hart Kitchen Co."), await click(".sh-total-bar button")), shows: "[role='dialog'][aria-modal='true']" },
  { view: "product", state: "made by the Customiser", path: "/piece/coast-wal", shows: "a[href$='/customise']" },
  { view: "product", state: "a piece not in the shop", path: "/piece/teapot", shows: "#sh-gone-title" },
  // Make it yours
  { view: "customise", state: "the editor", path: "/piece/coast-wal/customise", shows: ".sh-customise", noHeading: "the Customiser's editor draws the headings, swept by the add-on's suite" },
  { view: "customise", state: "the editor on a basket line", path: "/piece/coast-wal/customise", go: async () => (await click(".sh-customise button"), await click(".sh-line a")), shows: ".sh-customise", noHeading: "the Customiser's editor draws the headings, swept by the add-on's suite" },
  // The basket
  { view: "basket", state: "empty", path: "/basket", shows: ".sh-empty-card" },
  { view: "basket", state: "a line with words, and its toast", go: wordsInBasket, shows: ".sh-line .sh-asked" },
  { view: "basket", state: "a designed line", path: "/piece/coast-wal/customise", go: () => click(".sh-customise button"), shows: ".sh-line-design[role='img']" },
  { view: "basket", state: "being priced", go: async () => (await click(".sh-piece", 1), port.hold(), await click(".sh-total-bar button")), shows: ".sh-summary[aria-busy='true']" },
  { view: "basket", state: "its price failed", go: async () => (await click(".sh-piece", 1), port.refuseNext({ code: "UNREACHABLE" }), await click(".sh-total-bar button")), shows: ".sh-summary [role='alert']" },
  { view: "basket", state: "a line refused", go: async () => (await wordsInBasket(), await set(() => useShop.setState({ refusedLine: { index: 0, reason: "design-unknown", raw: null } }))), shows: ".sh-line [role='alert']" },
  // The checkout
  { view: "checkout", state: "empty", path: "/checkout", shows: ".sh-empty-card" },
  { view: "checkout", state: "the form", go: toCheckout, shows: "#sh-ck-name" },
  { view: "checkout", state: "the form's errors", go: async () => (await toCheckout(), await click(placeButton)), shows: "#sh-ck-name[aria-invalid='true']" },
  { view: "checkout", state: "refused on a field", go: async () => (await filledCheckout(), port.refuseNext({ code: "PUBLIC_WRITE_REFUSED", column: "postcode", reason: "plain-text" }), await click(placeButton)), shows: "#sh-ck-postcode-err" },
  {
    view: "checkout",
    state: "checking",
    go: async () => {
      await filledCheckout();
      port.hold();
      await act(async () => $(placeButton)!.click());
    },
    shows: ".sh-summary .sh-button[aria-busy='true']",
  },
  { view: "checkout", state: "the price moved", go: async () => (await filledCheckout(), port.raise(2, 1), await click(placeButton)), shows: ".sh-moved[role='alert']" },
  { view: "checkout", state: "not taking orders", go: async () => (await filledCheckout(), port.refuseNext({ code: "PUBLIC_SWITCHED_OFF" }), await click(placeButton)), shows: ".sh-summary [role='alert']" },
  { view: "checkout", state: "Adminium unreachable", go: async () => (await filledCheckout(), await set(() => useShop.setState({ failure: "unreachable" }))), shows: ".sh-summary [role='alert']" },
  { view: "checkout", state: "a line refused", go: async () => (await filledCheckout(), port.refuseNext({ code: "PUBLIC_WRITE_REFUSED", child: "order_lines", index: 0, reason: "feature" }), await click(placeButton)), shows: ".sh-summary [role='alert']" },
  { view: "checkout", state: "the newsletter ticked, tracked post", go: async () => (await toCheckout(), await click(".sh-tick input"), await click(".sh-service", 1)), shows: ".sh-service[aria-checked='true']" },
  // The confirmation
  { view: "confirm", state: "a proof to come", go: async () => (await filledCheckout(), await click(placeButton)), shows: "#sh-confirm-title" },
  {
    view: "confirm",
    state: "nothing to prove",
    go: async () => {
      await click(".sh-piece", 2);
      await click(".sh-total-bar button");
      await click(".sh-summary .sh-button");
      for (const [selector, value] of [
        ["#sh-ck-name", "Priya Shah"],
        ["#sh-ck-email", "priya@example.com"],
        ["#sh-ck-line1", "12 Mill Lane"],
        ["#sh-ck-town", "Settle"],
        ["#sh-ck-postcode", "BD24 9AA"],
      ] as const)
        await type(selector, value);
      await click(placeButton);
    },
    shows: "#sh-confirm-title",
  },
  // Your order
  { view: "order", state: "find it", path: "/order", shows: "#sh-lk-order-ref" },
  { view: "order", state: "its fields' errors", path: "/order", go: () => click(".sa-lookup .sh-button--ink"), shows: "#sh-lk-order-ref-err" },
  { view: "order", state: "no such order with that e-mail", path: "/order", go: () => set(() => useAfter.setState((s) => ({ lookups: { ...s.lookups, order: { ...s.lookups.order, ref: "BR-2299", email: "a@b.example", tried: true, err: "mismatch" } } }))), shows: "#sh-lk-order-err[role='alert']" },
  { view: "order", state: "sending the code", path: "/order", go: () => set(() => useAfter.setState((s) => ({ lookups: { ...s.lookups, order: { ...s.lookups.order, busy: true } } }))), shows: ".sa-lookup .sh-button--ink[aria-busy='true']" },
  { view: "order", state: "the code step", path: "/order", go: () => lookUp("BR-2276"), shows: "#sh-lk-order-code-0" },
  { view: "order", state: "a wrong code", path: "/order", go: async () => (await lookUp("BR-2276"), await type("#sh-lk-order-code-0", "111111"), await click(".sa-code .sh-button--accent")), shows: "#sh-lk-order-code-err" },
  { view: "order", state: "too many tries", path: "/order", go: async () => (await lookUp("BR-2276"), await type("#sh-lk-order-code-0", "000000"), await click(".sa-code .sh-button--accent")), shows: "#sh-lk-order-code-err" },
  { view: "order", state: "a new code may be asked for", path: "/order", go: async () => (await lookUp("BR-2276"), await settle(160)), shows: ".sa-resend[aria-disabled='false']" },
  { view: "order", state: "opening", path: "/order", go: () => set(() => useAfter.setState({ opened: { via: "mine", state: "loading", read: null } })), shows: ".sh-loading[aria-busy='true']" },
  { view: "order", state: "failed to open", path: "/order", go: () => set(() => useAfter.setState({ opened: { via: "mine", state: "failed", read: null } })), shows: "[role='alert']" },
  { view: "order", state: "gone", path: "/order", go: () => set(() => useAfter.setState({ opened: { via: "mine", state: "gone", read: null } })), shows: "[role='alert']" },
  { view: "order", state: "a proof waiting", path: "/order", go: () => openOrder(), shows: ".sa-proof" },
  { view: "order", state: "the change box, empty and refused", path: "/order", go: async () => (await openOrder(), await click(".sa-proof .sa-row .sh-button:not(.sh-button--accent)"), await click(".sa-change .sh-button--ink")), shows: ".sa-change textarea[aria-invalid='true']" },
  { view: "order", state: "a change asked", path: "/order", go: async () => (await openOrder(), await click(".sa-proof .sa-row .sh-button:not(.sh-button--accent)"), await type(".sa-change textarea", "A little lower?"), await click(".sa-change .sh-button--ink")), shows: ".sa-order" },
  { view: "order", state: "an answer that failed", path: "/order", go: async () => (await openOrder(), port.afterFake.refuseNext({ code: "UNREACHABLE" }), await click(".sa-proof .sh-button--accent")), shows: ".sa-order [role='alert']" },
  { view: "order", state: "approved, by its own link", path: "/order#LINKCODE0000000A", go: () => click(".sa-proof .sh-button--accent"), shows: ".sa-stage--done" },
  { view: "order", state: "a link that opens nothing", path: "/order#NOSUCHLINK000000", shows: "[role='alert']" },
  { view: "order", state: "a link stopped", path: "/order#STOPPEDLINK00000", shows: "[role='alert']" },
  { view: "order", state: "posted", path: "/order", before: () => void (port.afterFake.session = "iris.p@example.com"), go: () => lookUp("BR-2247"), shows: ".sa-order" },
  { view: "order", state: "orders to pick from", path: "/c#SIGNINLINK000000", go: () => click(".sa-lookup .sh-button--accent"), shows: ".sa-pick" },
  // Order again
  { view: "find", state: "find it", path: "/find", shows: "#sh-lk-again-ref" },
  { view: "find", state: "the code step", path: "/find", go: async () => (await type("#sh-lk-again-ref", "BR-2276"), await type("#sh-lk-again-email", "iris.p@example.com"), await click(".sa-lookup .sh-button--ink")), shows: "#sh-lk-again-code-0" },
  { view: "find", state: "reading", path: "/find", go: () => set(() => useAfter.setState((s) => ({ again: { ...s.again, state: "loading" } }))), shows: ".sh-loading[aria-busy='true']" },
  { view: "find", state: "the orders", path: "/find", before: () => void (port.afterFake.session = "iris.p@example.com"), shows: ".sa-again-card" },
  { view: "find", state: "no orders", path: "/find", before: () => void (port.afterFake.session = "nobody@example.com"), shows: "#sa-again-title" },
  // Ask us for something
  { view: "ask", state: "the form", path: "/ask", shows: "#sa-ask-what" },
  { view: "ask", state: "its errors", path: "/ask", go: () => click(".sa-form .sh-button--wide"), shows: "#sa-ask-what[aria-invalid='true']" },
  { view: "ask", state: "a material chosen", path: "/ask", go: () => click(".sa-chip", 2), shows: ".sa-chip[aria-pressed='true']" },
  { view: "ask", state: "refused on a field", path: "/ask", go: async () => (await fillAsk(), port.afterFake.refuseNext({ code: "PUBLIC_WRITE_REFUSED", column: "wanted_when", reason: "plain-text" }), await click(".sa-form .sh-button--wide")), shows: "#sa-ask-when[aria-invalid='true']" },
  { view: "ask", state: "refused whole", path: "/ask", go: async () => (await fillAsk(), port.afterFake.refuseNext({ code: "PUBLIC_LIMIT_REACHED" }), await click(".sa-form .sh-button--wide")), shows: ".sa-form [role='alert']" },
  { view: "ask", state: "sent", path: "/ask", go: async () => (await fillAsk(), await click(".sa-form .sh-button--wide")), shows: ".sa-sent" },
  // If something's wrong
  { view: "problem", state: "the form", path: "/something-wrong", shows: "#sa-wr-ref" },
  { view: "problem", state: "its errors", path: "/something-wrong", go: () => click(".sa-form .sh-button--wide"), shows: "#sa-wr-kind-err" },
  { view: "problem", state: "an order not theirs", path: "/something-wrong", go: async () => (await fillProblem("BR-2288"), port.afterFake.refuseNext({ code: "PUBLIC_WRITE_REFUSED", column: "order_id", reason: "lookup" }), await click(".sa-form .sh-button--wide")), shows: "#sa-wr-ref-err" },
  { view: "problem", state: "refused whole", path: "/something-wrong", go: async () => (await fillProblem(), port.afterFake.refuseNext({ code: "UNREACHABLE" }), await click(".sa-form .sh-button--wide")), shows: ".sa-form [role='alert']" },
  { view: "problem", state: "sent", path: "/something-wrong", go: async () => (await fillProblem(), await click(".sa-form .sh-button--wide")), shows: ".sa-sent" },
  // Postage and the calendar
  { view: "postage", state: "reading", path: "/postage", go: () => set(() => useAfter.setState({ extras: { state: "loading", rows: null, today: null, examples: null } })), shows: ".sh-loading[aria-busy='true']" },
  { view: "postage", state: "failed to read", path: "/postage", go: () => set(() => useAfter.setState({ extras: { state: "failed", rows: null, today: null, examples: null } })), shows: ".sh-note--bad" },
  { view: "postage", state: "the calendar", path: "/postage", go: () => settle(6), shows: ".sa-day--closed" },
  // Looking after it
  { view: "care", state: "nothing written yet", path: "/care", shows: "h1" },
  {
    view: "care",
    state: "the notes",
    path: "/care",
    go: () => set(() => useShop.setState((s) => ({ catalogue: { ...s.catalogue!, materials: s.catalogue!.materials.map((m) => ({ ...m, care: "Wipe it with a damp cloth.\nNo dishwasher." })) } }))),
    shows: ".sa-care-card",
  },
  // About us
  { view: "about", state: "the studio", path: "/about", shows: ".sa-machine" },
  // Search
  { view: "search", state: "hits", go: () => set(() => searchFor("coasters")), shows: ".sh-piece" },
  { view: "search", state: "nothing", go: () => set(() => searchFor("teapot")), shows: "h1" },
  // Your designs
  { view: "design", state: "the list", path: "/design", shows: "h1" },
  { view: "design", state: "a link that opens nothing", path: "/design#NOSUCHDESIGN0000", shows: "[role='alert']" },
  // The sign-in link
  { view: "link", state: "ready", path: "/c#SIGNINLINK000000", shows: ".sa-strong" },
  { view: "link", state: "used", path: "/c#SPENTLINK0000000", shows: "[role='alert']" },
  { view: "link", state: "no code", path: "/c", shows: "[role='alert']" },
  // The page that isn't there
  { view: "missing", state: "an address the shop has no page for", path: "/nowhere/at/all", shows: "h1" },
  { view: "missing", state: "opened from the shop", go: () => set(() => goView("missing")), shows: "h1" },
];

/** Every screen the shop draws. A new one is a type error here until it is listed, and a failure below until it has a row. */
const VIEWS = {
  shop: true,
  product: true,
  customise: true,
  basket: true,
  checkout: true,
  confirm: true,
  missing: true,
  order: true,
  find: true,
  ask: true,
  problem: true,
  postage: true,
  care: true,
  about: true,
  design: true,
  search: true,
  link: true,
} as const satisfies Record<ShopView, true>;

const LOCALES = [
  ["en-US", "ltr"],
  ["ar-EG", "rtl"],
] as const;
const THEMES = ["light", "dark"] as const;

describe("the table of states", () => {
  const covered = new Set(STATES.map((row) => row.view));
  it("has a row for every screen the shop draws", () => {
    expect(Object.keys(VIEWS).filter((v) => !covered.has(v as ShopView))).toEqual([]);
  });
  it("has a row for every address the address bar reads and every door Adminium lists", () => {
    const routed = [...Object.keys(ELSEWHERE), ...SHOP_NAV.map((entry) => entry.view)];
    expect(routed.filter((v) => !covered.has(v as ShopView))).toEqual([]);
  });
  it("names each state once per screen", () => {
    const names = STATES.map((row) => `${row.view} · ${row.state}`);
    expect(names.length).toBe(new Set(names).size);
  });
});

beforeEach(() => {
  vi.useFakeTimers();
  // The page the shop is served in names itself (`index.html`); axe reads the whole document.
  document.title = "Maker Shop";
  sessionStorage.clear();
  localStorage.clear();
  window.scrollTo = () => {};
  port = fakePort();
  resetShop(port);
  resetAfter(null);
});

afterEach(async () => {
  await act(async () => root?.unmount());
  root = null;
  host?.remove();
  host = null;
  vi.useRealTimers();
});

describe.each(LOCALES)("every state of the shop in %s", (locale, dir) => {
  describe.each(THEMES)("in the %s theme", (theme) => {
    it.each(STATES.map((row) => [`${row.view} · ${row.state}`, row] as const))("%s", async (label, row) => {
      localStorage.setItem("maker-shop-locale", locale);
      localStorage.setItem("maker-shop-theme", theme);
      row.before?.();
      await mount(row.path ?? "/");
      await row.go?.();
      expect(document.documentElement.getAttribute("dir"), label).toBe(dir);
      expect(document.documentElement.getAttribute("data-theme"), label).toBe(theme);
      expect($(row.shows), `${label}: never reached (${row.shows})`).not.toBeNull();
      expect($$("main").length, `${label}: one main`).toBe(1);
      if (row.noHeading === undefined) expect($$("h1").length, `${label}: one h1`).toBe(1);

      vi.useRealTimers();
      const result = await axe.run(document, AXE);
      vi.useFakeTimers();
      expect(result.passes.length, `${label}: axe examined nothing`).toBeGreaterThan(0);
      expect(
        result.violations.map((v) => `${v.id} (${v.impact ?? "?"}): ${v.nodes.map((n) => n.target.join(" ")).join(", ")}`),
        `${locale} · ${theme} · ${label}`,
      ).toEqual([]);
    });
  });
});
