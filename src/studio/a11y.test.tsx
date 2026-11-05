/**
 * @vitest-environment jsdom
 *
 * EVERY SCREEN OF THE STUDIO, IN EVERY STATE IT HAS, UNDER AXE.
 *
 * The staff side is mounted whole (sidebar, header, the screen, the
 * overlays and toasts) against the stand-in door, driven into one state and
 * swept by axe: WCAG 2.0, 2.1 and 2.2 A/AA and axe's best practices, at every
 * impact. Each state runs in English and in Arabic (`dir="rtl"`), in the
 * light theme and the dark one (the `data-theme` the header's switch sets).
 *
 * The states are a table, one row each. The table is checked against the
 * studio's own lists (`View`, the overlays, `STUDIO_NAV`, `STUDIO_PLACES`),
 * so a screen or an overlay added without a row here fails this file, and
 * every row proves it reached its state before axe looks at it.
 */
import axe from "axe-core";
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { I18nProvider } from "../i18n/index.tsx";
import { StudioProvider, type StudioEnv } from "./env.tsx";
import { STUDIO_NAV, STUDIO_PLACES } from "./nav.ts";
import { StudioApp } from "./StudioApp.tsx";
import { useStudio, type Overlay, type StudioState, type View } from "./store.ts";
import { FakeDoor } from "./testing/fakeDoor.ts";
import { UK_HOLIDAYS } from "./testing/fixture.ts";
import { strings as DHL_WORDS } from "../add-ons/vendor/shipping-dhl/i18n/strings.ts";

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

let root: Root | null = null;
let host: HTMLElement;
const INITIAL = useStudio.getState();

const draw = async () => new Blob([new Uint8Array([0x89, 0x50, 0x4e, 0x47])], { type: "image/png" });

async function settle(): Promise<void> {
  for (let i = 0; i < 6; i += 1) await act(async () => new Promise((resolve) => setTimeout(resolve, 0)));
}

async function mount(door: FakeDoor, view: View, more: Partial<StudioState>): Promise<void> {
  const env: StudioEnv = { door, draw, recordHref: (page, id) => `/p/${page}/r/${String(id)}` };
  useStudio.setState({ data: await door.load(), view, ...more });
  await act(async () => {
    root = createRoot(host);
    root.render(
      <I18nProvider>
        <StudioProvider env={env}>
          <StudioApp />
        </StudioProvider>
      </I18nProvider>,
    );
  });
  await settle();
}

const $ = (selector: string) => document.querySelector<HTMLElement>(selector);
const $$ = (selector: string) => [...document.querySelectorAll<HTMLElement>(selector)];

async function click(selector: string, at = 0): Promise<void> {
  const el = $$(selector)[at];
  if (el === undefined) throw new Error(`nothing to click: ${selector} [${at}]`);
  await act(async () => {
    el.dispatchEvent(new MouseEvent("click", { bubbles: true }));
  });
  await settle();
}

async function type(selector: string, value: string): Promise<void> {
  const input = $(selector) as HTMLInputElement | null;
  if (input === null) throw new Error(`nothing to type into: ${selector}`);
  const setter = Object.getOwnPropertyDescriptor(Object.getPrototypeOf(input), "value")!.set!;
  await act(async () => {
    setter.call(input, value);
    input.dispatchEvent(new Event("input", { bubbles: true }));
  });
  await settle();
}

/** Wait, a while at most, for what a lazily loaded add-on draws. */
async function until(selector: string): Promise<void> {
  for (let i = 0; i < 100 && $(selector) === null; i += 1) await act(async () => new Promise((resolve) => setTimeout(resolve, 10)));
  if ($(selector) === null) throw new Error(`never drawn: ${selector}`);
}

/** A button inside DHL's flow, pressed by its own words in the language the page is in. */
async function pressInSlot(key: "addon.shipping-dhl.action.book" | "addon.shipping-dhl.rates.get"): Promise<void> {
  const lang = (document.documentElement.getAttribute("lang") ?? "en-US") as keyof typeof DHL_WORDS;
  const words = (DHL_WORDS[lang] ?? DHL_WORDS["en-US"])[key];
  const found = $$("[data-add-on-slot] button").find((b) => (b.textContent ?? "").trim() === words);
  if (found === undefined) throw new Error(`no "${words}" in the slot`);
  await act(async () => found.click());
  await settle();
}

/** The studio with DHL attached and the ready parcel going to an address it can quote for. */
const withDhl = () =>
  doorWith(
    (d) => {
      Object.assign(d.orders.find((o) => o.id === 14)!, { service_id: 2, address_line1: "4 Fellside", postcode: "LA9 4AA" });
      d.lines.find((l) => l.id === 141)!["grams"] = 285;
    },
    { facts: { addOns: ["customiser", "shipping-dhl"], addOnSettings: { "shipping-dhl": { demo_transport: true } } } },
  );

/** The studio with Holiday calendars attached and its British days readable. */
const withHolidays = (change: (data: FakeDoor["data"]) => void = () => {}) =>
  doorWith(
    (d) => {
      d.holidays = [...UK_HOLIDAYS];
      change(d);
    },
    { facts: { addOns: ["customiser", "holiday-calendars"] } },
  );

const set = async (patch: Partial<StudioState>): Promise<void> => {
  await act(async () => useStudio.setState(patch));
  await settle();
};

/** A stand-in door with its rows changed first. */
const doorWith = (change: (data: FakeDoor["data"]) => void, options: ConstructorParameters<typeof FakeDoor>[0] = {}) => {
  const door = new FakeDoor(options);
  change(door.data);
  return door;
};

/** A door whose bench has nothing a sheet may take: every queued line still waits on its proof. */
const nothingToBatch = () => {
  const door = new FakeDoor();
  for (const line of door.data.lines) if (line["stage"] === "make") line["proof_ok"] = 0;
  return door;
};

// ── the states ────────────────────────────────────────────────────────────

interface Row {
  view: View;
  state: string;
  door?: () => FakeDoor;
  /** The screen state it opens with: an order, a filter, an overlay. */
  more?: Partial<StudioState>;
  /** Drive the open studio into the state. */
  go?: () => Promise<void>;
  /** Proof the state was reached: a selector that must match. */
  shows: string;
  /** And, read in English, words it must say. */
  says?: string;
  /** Why this state has no heading of its own, when it has none (the page's one `h1` is checked by hand: axe leaves it undecided in jsdom). */
  noHeading?: string;
}

const proof = (orderId: number): Overlay => ({ kind: "proof", orderId });

const STATES: Row[] = [
  // The shell
  { view: "today", state: "reading", go: () => set({ data: null }), shows: "[aria-busy='true']", noHeading: "a skeleton for a moment, its busy status says it is reading" },
  { view: "today", state: "the read failed", go: () => set({ data: null, failure: "Adminium did not answer." }), shows: ".st-failed[role='alert']", says: "The workshop could not be read", noHeading: "the shell's one alert, with nothing else drawn" },
  { view: "today", state: "the nav drawer", go: () => click(".st-menu-btn"), shows: ".st-drawer" },
  { view: "today", state: "search with results", go: () => type("input[type='search']", "iris"), shows: "#st-results .st-result", says: "BR-2276 · Iris P." },
  { view: "today", state: "search with none", go: () => type("input[type='search']", "zzz"), shows: "#st-results .st-noresults" },
  { view: "today", state: "a toast", go: () => set({ toasts: [{ id: 1, tone: "pos", text: "Marked made. On to finishing." }, { id: 2, tone: "danger", text: "Waiting on the proof — send it first" }] }), shows: ".st-toast--danger" },
  // Today
  { view: "today", state: "the board", shows: ".st-board", says: "pieces due today" },
  { view: "today", state: "a card's menu", go: () => click(".st-card-more", 1), shows: "[role='menu']" },
  { view: "today", state: "nothing to batch", door: nothingToBatch, shows: ".st-board", says: "Nothing left to gang up" },
  { view: "today", state: "an empty bench", door: () => doorWith((d) => void (d.lines = [])), shows: ".st-board" },
  // The batch dialog over Today
  { view: "today", state: "the batch dialog", more: { overlay: { kind: "batch", key: "1" } }, shows: "[role='dialog']", says: "Start the batch" },
  { view: "today", state: "the batch dialog, a piece taken off", more: { overlay: { kind: "batch", key: "1" }, takenOff: { "171/0": true } }, shows: "[role='dialog']", says: "Taken off" },
  // An order
  { view: "order", state: "waiting on its proof", more: { orderId: 10 }, shows: ".st-screen", says: "BR-2276" },
  { view: "order", state: "a lettered piece", more: { orderId: 11 }, shows: ".st-screen", says: "BR-2287" },
  { view: "order", state: "a customer's design", more: { orderId: 16 }, shows: ".st-screen", says: "Make the proof" },
  { view: "order", state: "on the bench", more: { orderId: 13 }, shows: ".st-screen", says: "charged £79.95" },
  { view: "order", state: "posted", more: { orderId: 15 }, shows: ".st-screen", says: "Posted" },
  { view: "order", state: "not there", more: { orderId: 999 }, shows: ".st-screen", says: "That order isn't on the bench." },
  { view: "order", state: "the proof sheet, a lettered piece drawn", more: { orderId: 11, overlay: proof(11) }, shows: "[role='dialog'] img, [role='dialog'] svg", says: "The picture that goes to Bex T. for BR-2287." },
  { view: "order", state: "the proof sheet, a design's proof", more: { orderId: 16, overlay: proof(16) }, shows: "[role='dialog'] img" },
  {
    view: "order",
    state: "the proof sheet, a design whose proof is not made",
    door: () => doorWith((d) => void (d.versions[0]!["proof_file"] = null)),
    more: { orderId: 16, overlay: proof(16) },
    shows: "[role='dialog']",
    says: "The proof of this design is not made yet.",
  },
  { view: "order", state: "the spoil dialog", more: { orderId: 12, overlay: { kind: "spoil", lineId: 121 } }, shows: "[role='dialog'] input" },
  { view: "order", state: "the spoil dialog refusing nothing", more: { orderId: 12, overlay: { kind: "spoil", lineId: 121 } }, go: async () => (await type("[role='dialog'] input", ""), await click("[role='dialog'] .st-btn--dark")), shows: "[role='dialog'] input[aria-invalid='true']" },
  { view: "order", state: "a packer's order", door: () => new FakeDoor({ roles: ["packer"] }), more: { orderId: 12 }, shows: ".st-screen", says: "BR-2281" },
  // The orders
  { view: "orders", state: "all", shows: ".st-filters", says: "BR-2276" },
  { view: "orders", state: "waiting on a customer", more: { orderFilter: "proof" }, shows: ".st-filters", says: "BR-2276" },
  { view: "orders", state: "late", more: { orderFilter: "late" }, shows: ".st-filters", says: "BR-2268" },
  { view: "orders", state: "due today", more: { orderFilter: "today" }, shows: ".st-filters", says: "BR-2281" },
  { view: "orders", state: "ready to post", more: { orderFilter: "ready" }, shows: ".st-filters", says: "BR-2271" },
  { view: "orders", state: "none", door: () => doorWith((d) => void (d.orders = [])), shows: ".st-empty" },
  { view: "orders", state: "a packer's list", door: () => new FakeDoor({ roles: ["packer"] }), shows: ".st-filters" },
  // The proofs
  { view: "proofs", state: "waiting and to send", shows: ".st-screen", says: "Sent, waiting on a reply" },
  { view: "proofs", state: "a reminder sent", go: () => click(".st-screen .st-btn:not(.st-btn--accent)"), shows: ".st-screen" },
  { view: "proofs", state: "nobody waiting", door: () => doorWith((d) => void (d.lines = d.lines.filter((l) => ![101, 111, 161].includes(Number(l.id))))), shows: ".st-screen", says: "Nobody is waiting on us" },
  // The post office run
  { view: "post", state: "parcels to pack", shows: ".st-tick[role='checkbox']" },
  { view: "post", state: "all packed", go: () => click(".st-tick"), shows: ".st-done[role='status']" },
  { view: "post", state: "with tracking numbers", door: () => new FakeDoor({ facts: { addOns: ["customiser", "shipping-dhl"] } }), shows: "input[class*='st-input']" },
  { view: "post", state: "DHL's dispatch flow, closed", door: withDhl, go: () => until("[data-add-on-slot='order.dispatch.actions'] button"), shows: "[data-add-on-slot='order.dispatch.actions'] button", says: "Book a collection" },
  {
    view: "post",
    state: "DHL's dispatch flow, rates quoted",
    door: withDhl,
    go: async () => {
      await until("[data-add-on-slot='order.dispatch.actions'] button");
      await pressInSlot("addon.shipping-dhl.action.book");
      await pressInSlot("addon.shipping-dhl.rates.get");
      await until("[data-add-on-slot] button[aria-pressed='true']");
    },
    shows: "[data-add-on-slot] button[aria-pressed='true']",
    says: "Express, next working day",
  },
  { view: "post", state: "nothing ready", door: () => doorWith((d) => void (d.orders = d.orders.filter((o) => o.id !== 14))), shows: ".st-empty", says: "Nothing to post today" },
  // The customers
  { view: "customers", state: "the list", shows: ".st-screen", says: "charged in all" },
  { view: "customers", state: "one customer", more: { customerId: 1 }, shows: ".st-screen", says: "iris.p@mail.example" },
  // The products
  { view: "products", state: "the list", shows: ".st-screen", says: "Engraved walnut coasters" },
  { view: "product", state: "lettering settings", more: { productId: 2 }, shows: "#st-mp-limit", says: "Personalization" },
  { view: "product", state: "not saved yet", more: { productId: 2 }, go: () => type("#st-mp-limit", "30"), shows: "#st-mp-limit", says: "Not saved yet." },
  { view: "product", state: "its errors", more: { productId: 2 }, go: async () => (await type("#st-mp-limit", ""), await click(".st-save .st-btn--accent")), shows: "#st-mp-limit[aria-invalid='true']" },
  { view: "product", state: "lettering switched off", more: { productId: 2 }, go: () => click(".st-switch[role='switch']"), shows: ".st-switch[aria-checked='false']" },
  { view: "product", state: "set up for the Customiser", more: { productId: 1 }, shows: ".st-screen", says: "Set up for the Customiser" },
  { view: "product", state: "not there", more: { productId: 999 }, shows: ".st-screen", says: "That product isn't in the shop." },
  // Materials, machines and the count
  { view: "materials", state: "the shelf and the machines", shows: ".mk-stock[role='table']" },
  {
    view: "materials",
    state: "without the right to count",
    door: () => {
      const door = new FakeDoor({ roles: ["maker"] });
      door.who().can = (table, action) => !(table === "stock_movements" && action === "create");
      return door;
    },
    shows: ".mk-stock[role='table']",
  },
  { view: "machines", state: "today's bookings", shows: ".mk-block", says: "Nothing booked all day." },
  { view: "machines", state: "public holidays to add", door: () => withHolidays(), shows: ".mk-holiday button", says: "Summer bank holiday" },
  { view: "machines", state: "a public holiday added", door: () => withHolidays((d) => void d.closures.push({ id: 7, holiday_id: 901, from_date: "2026-08-31", to_date: "2026-08-31", reason: "Summer bank holiday", active: true })), shows: ".mk-holiday-added", says: "Added" },
  { view: "machines", state: "no public holidays coming", door: () => withHolidays((d) => void (d.holidays = [])), shows: ".mk-holidays-none" },
  { view: "stockcount", state: "the count", shows: ".mk-count-summary[role='status']", says: "Count the shelf" },
  { view: "stockcount", state: "typed, one line off the book", more: { countDraft: { "1": "12", "2": "5" } }, shows: ".mk-count-diff--down, .mk-count-diff--up", says: "1 line does not match the book." },
  // The batch sheet and the cut list
  { view: "batch", state: "the sheets", shows: "[role='tablist']", says: "Change what's on the sheet" },
  { view: "batch", state: "the batch dialog over the sheet", go: () => click(".mk-wide-btn"), shows: "[role='dialog']" },
  { view: "batch", state: "nothing to batch", door: nothingToBatch, shows: ".st-screen, .mk-screen, section", says: "Nothing to batch" },
  { view: "cutlist", state: "a sheet's cut list", shows: "section", says: "Print it for the bench" },
  { view: "cutlist", state: "a batch started", more: { cutKey: "batch-1" }, shows: "section", says: "The Pughs" },
  { view: "cutlist", state: "nothing queued", door: nothingToBatch, shows: "section", says: "Nothing is queued for a sheet." },
  // The 404
  { view: "notfound", state: "an address with no screen", shows: "h1", says: "Nothing on this bench" },
  { view: "customers", state: "a maker at the customers' address", door: () => new FakeDoor({ roles: ["maker"] }), shows: "h1", says: "Nothing on this bench" },
];

/** Every screen the studio draws. A new one is a type error here until it is listed, and a failure below until it has a row. */
const VIEWS = {
  today: true,
  order: true,
  orders: true,
  proofs: true,
  post: true,
  customers: true,
  products: true,
  product: true,
  materials: true,
  machines: true,
  stockcount: true,
  batch: true,
  cutlist: true,
  notfound: true,
} as const satisfies Record<View, true>;

/** Every overlay a screen opens. */
const OVERLAYS = { proof: true, spoil: true, batch: true } as const satisfies Record<NonNullable<Overlay>["kind"], true>;

const LOCALES = [
  ["en-US", "ltr"],
  ["ar-EG", "rtl"],
] as const;
const THEMES = ["light", "dark"] as const;

describe("the table of states", () => {
  const covered = new Set(STATES.map((row) => row.view));
  it("has a row for every screen the studio draws", () => {
    expect(Object.keys(VIEWS).filter((v) => !covered.has(v as View))).toEqual([]);
  });
  it("has a row for every sidebar item and every address of the staff side", () => {
    expect([...STUDIO_NAV, ...STUDIO_PLACES].map((entry) => entry.view).filter((v) => !covered.has(v))).toEqual([]);
  });
  it("has a row for every overlay", () => {
    const opened = new Set(STATES.map((row) => row.more?.overlay?.kind).filter((k) => k !== undefined));
    expect(Object.keys(OVERLAYS).filter((k) => !opened.has(k as NonNullable<Overlay>["kind"]))).toEqual([]);
  });
  it("names each state once per screen", () => {
    const names = STATES.map((row) => `${row.view} · ${row.state}`);
    expect(names.length).toBe(new Set(names).size);
  });
});

beforeEach(() => {
  useStudio.setState({ ...INITIAL, toasts: [], overlay: null, data: null, failure: null, takenOff: {}, countDraft: {}, cutKey: null, sheetKey: null });
  host = document.createElement("div");
  document.body.replaceChildren(host);
  localStorage.clear();
  // The page the studio is served in names itself; axe reads the whole document.
  document.title = "Maker Shop — studio";
});

afterEach(() => {
  act(() => root?.unmount());
  root = null;
});

describe.each(LOCALES)("every state of the studio in %s", (locale, dir) => {
  describe.each(THEMES)("in the %s theme", (theme) => {
    it.each(STATES.map((row) => [`${row.view} · ${row.state}`, row] as const))("%s", async (label, row) => {
      localStorage.setItem("maker-shop-locale", locale);
      await mount(row.door?.() ?? new FakeDoor(), row.view, { theme, ...row.more });
      await row.go?.();
      expect(document.documentElement.getAttribute("dir"), label).toBe(dir);
      expect(document.documentElement.getAttribute("data-theme"), label).toBe(theme);
      expect($(row.shows), `${label}: never reached (${row.shows})`).not.toBeNull();
      if (locale === "en-US" && row.says !== undefined) expect(document.body.textContent, label).toContain(row.says);
      expect($$("main").length, `${label}: one main`).toBe(1);
      if (row.noHeading === undefined) expect($$("h1").length, `${label}: one h1`).toBe(1);

      const result = await axe.run(document, AXE);
      expect(result.passes.length, `${label}: axe examined nothing`).toBeGreaterThan(0);
      expect(
        result.violations.map((v) => `${v.id} (${v.impact ?? "?"}): ${v.nodes.map((n) => n.target.join(" ")).join(", ")}`),
        `${locale} · ${theme} · ${label}`,
      ).toEqual([]);
    });
  });
});
