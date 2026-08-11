/**
 * The one store. Zustand, no middleware, no persistence beyond the theme and
 * the locale — a demo that remembered a half-built basket across reloads would
 * be harder to review, not easier.
 *
 * THE CLOCK LIVES HERE AS AN OFFSET IN STUDIO DAYS from the pinned moment,
 * never as a date. Everything downstream derives from `todayIso()`, so the
 * dock's "+1 studio day" chip moves the ship-by chips, the calendar grid and
 * the overdue count together and cannot leave two views disagreeing about what
 * day it is — and because the offset counts STUDIO days, pressing it on a
 * Saturday lands on Tuesday, which is the calendar becoming visible.
 */

import { create } from "zustand";

import {
  applyAddOnSettings,
  createRegistry,
  type AddOnRegistry,
  type AddOnSettings,
} from "../add-ons/host.ts";
import type { DeliveryChoice } from "../add-ons/payloads.ts";
import { DEFAULT_ADD_ON_SETTINGS, demoAddOns } from "../add-ons/registry.ts";
import { t as ambientT } from "../i18n/ambient.ts";
import { keepDigits, parseCount } from "../lib/format.ts";
import { addStudioDays } from "../lib/calendar.ts";
import { source } from "../data/source.ts";
import type { CareCard, Customer, Machine, Now } from "../data/types.ts";
import {
  PRODUCTS,
  PRODUCT_BY_KEY,
  type CategoryKey,
  type MaterialKey,
  type StockRow,
} from "../lib/catalogue.ts";
import {
  MACHINE_KEYS,
  batchGroups,
  packSheet,
  startBatch,
  withoutPieces,
  type MachineKey,
} from "../lib/batch.ts";
import {
  POSTAGE,
  approveProof,
  askForChange,
  longestLeadDays,
  markPosted,
  moveLine as moveLineOnBench,
  piecesTotalCents,
  sendProof,
  spoilAndRemake,
  type BenchColumn,
  type Order,
  type PostageKey,
} from "../lib/orders.ts";

export type Persona = "shopper" | "maker";

/**
 * ── THE VIEW LISTS ARE THE SOURCE, AND THE TYPES COME OFF THEM ──────────────
 *
 * These used to be two hand-written unions with a separate `SHOPPER_VIEWS`
 * array below repeating the first one. A suite that wants to visit EVERY view —
 * `numerals.a11y.test.tsx` does, twice, once per locale — could then only be
 * given a third copy of the list, and a third copy is a list that goes stale
 * the day somebody adds a screen. The array is the fact now and the union is
 * derived from it, so a new view is covered by every such suite without anybody
 * remembering to add it.
 */
export const SHOPPER_VIEWS = [
  "shop",
  "product",
  "basket",
  "checkout",
  "confirm",
  "order",
  "about",
  "search",
  "postage",
  "care",
  "ask",
  "reorder",
  "wrong",
] as const;

export type ShopperView = (typeof SHOPPER_VIEWS)[number];

/**
 * The maker's views.
 *
 * Fourteen, which is more than 24 §8A's list of six because comp K ships the
 * bench the way a bench actually works: the board is where the day starts, but
 * the cut list is what gets carried to the laser, the post office run is a
 * different job with a different rhythm, and counting the shelf is a thing that
 * happens on a Saturday morning. The six the spec names are all here; the rest
 * are the comp's, ported for the same reason wave 3's extras were.
 */
export const MAKER_VIEWS = [
  "today",
  "batch",
  "cutlist",
  "makerorder",
  "orders",
  "proofs",
  "post",
  "customers",
  "pieces",
  "makerpiece",
  "materials",
  "machines",
  "stockcount",
  "addons",
  /** A whole page lent to an add-on — `nav.add-on.routes` (24 §5.4). */
  "addonroute",
] as const;

export type MakerView = (typeof MAKER_VIEWS)[number];

export type View = ShopperView | MakerView | "404";

/** Every view the app can show, the 404 included. */
export const ALL_VIEWS: readonly View[] = [...SHOPPER_VIEWS, ...MAKER_VIEWS, "404"];

/** Whether a view belongs to the shop or the bench. */
export function personaFor(view: View): Persona {
  return (SHOPPER_VIEWS as readonly string[]).includes(view) ? "shopper" : "maker";
}

/** What the shopper has chosen on a piece's page. */
export interface Configuration {
  materialKey: MaterialKey;
  sizeKey: string;
  finishKey: string;
  quantity: number;
  /** The shopper's own words. Empty is a complete and ordinary answer. */
  note: string;
}

export interface BasketLine extends Configuration {
  id: string;
  productKey: string;
}

export interface Toast {
  id: number;
  message: string;
  tone: "neutral" | "pos" | "warn";
}

/** Which overlay is open. Exactly one at a time — Escape closes it. */
export type Overlay =
  | { kind: "none" }
  | { kind: "nav" }
  | { kind: "limit" }
  /** Sending the picture for one order. */
  | { kind: "proof"; ref: string }
  /** A blank was ruined: record it and re-cut. */
  | { kind: "spoil"; ref: string; lineId: string }
  /** Switching an add-on on: what it will do, and the key if it needs one. */
  | { kind: "connect"; addOn: string }
  /** Switching one off: what goes, what stays, and the key (24 D16). */
  | { kind: "disconnect"; addOn: string };

interface Forms {
  ask: { what: string; material: MaterialKey; when: string; name: string; email: string };
  askSent: boolean;
  wrong: { ref: string; kind: string; note: string };
  wrongSent: boolean;
  reorderEmail: string;
  reorderSearched: boolean;
}

interface State {
  // chrome
  persona: Persona;
  view: View;
  theme: "light" | "dark" | null;
  overlay: Overlay;
  toasts: Toast[];
  loading: boolean;

  // the pinned clock, plus however many STUDIO days the dock has advanced
  now: Now;
  dayOffset: number;

  // data
  orders: Order[];
  pastOrders: Order[];
  customers: Customer[];
  materials: StockRow[];
  machines: Machine[];
  careCards: CareCard[];

  // the shop
  category: CategoryKey | "all";
  material: MaterialKey | "all";
  query: string;
  searchTerm: string;

  // one piece
  productKey: string | null;
  angle: number;
  config: Configuration | null;

  // the basket and the till
  basket: BasketLine[];
  postage: PostageKey;
  /**
   * WHAT A DELIVERY ADD-ON QUOTED AND THE SHOPPER PICKED, or null.
   *
   * [Added 2026-08-10, wave 4b.] The till hosts `checkout.delivery.methods`,
   * and a slot whose rows look selectable and change nothing is a control that
   * lies: the shop would go on charging its own postage, the summary would
   * never mention the carrier, and the click would buy a filled radio dot. This
   * is the studio's record of what it has been told, and `chooseAddOnDelivery`
   * is the only way it learns. While it is set the studio's own postage line
   * steps aside — one decision, one place.
   */
  deliveryChoice: DeliveryChoice | null;
  details: { name: string; email: string; address: string };
  placed: { ref: string; postBy: string | null; totalCents: number; needsProof: boolean } | null;

  // looking an order up
  lookup: { ref: string; email: string };
  lookupRef: string | null;
  lookupError: "notFound" | "wrongEmail" | null;
  changeOpen: boolean;
  changeNote: string;

  forms: Forms;

  // ── the bench ────────────────────────────────────────────────────────────
  /** The order the maker has open. */
  makerOrderRef: string | null;
  /** The piece whose settings are open. */
  pieceKey: string | null;
  /** Search over references, customers and pieces, in the workshop topbar. */
  makerQuery: string;
  /** Which "…" menu is open on the board, as `orderRef/lineId`. */
  boardMenu: string | null;
  /** The card being dragged, as `orderRef/lineId`. */
  dragKey: string | null;
  /** The group the batch sheet is laid out for, as `machine/stock`. */
  batchKey: string | null;
  /** Pieces the maker has taken off the open batch sheet, by piece key. */
  batchOut: string[];
  /** The group the cut list is printed for. */
  cutKey: string | null;
  orderFilter: "all" | "proof" | "late" | "today" | "ready";
  /** Whose record is open on Customers. */
  customerEmail: string | null;
  /** Parcels ticked off on the post office run, by reference. */
  packed: string[];
  /** Whether a piece takes personalization, by product key. */
  personalizeOn: Readonly<Record<string, boolean>>;
  /** What the shelf was counted at, by stock key — the stocktake's result. */
  stockAdj: Readonly<Record<string, number>>;
  /** What is typed into the stocktake, before it is saved. */
  countDraft: Readonly<Record<string, string>>;
  /** Machine time booked today, in minutes. A batch books more. */
  booked: Readonly<Record<MachineKey, number>>;

  // ── add-ons ──────────────────────────────────────────────────────────────
  registry: AddOnRegistry;
  /** REGISTERED IS NOT ENABLED: the app boots with its base state, not a filled one. */
  enabled: Set<string>;
  /**
   * WHICH ADD-ONS THIS STUDIO IS HOLDING A CREDENTIAL FOR — and not the
   * credential (24 D15).
   *
   * The key itself lives in the connect dialog's own local state for as long as
   * the dialog is open and is never written here, because this store is
   * readable from the browser and a secret that reaches it is a leak whatever
   * else is true. What is recorded is the FACT that a key was supplied, which
   * is exactly the fact D16's confirm has to be able to state and the fact a
   * disconnect has to be able to delete.
   *
   * Separate from `enabled` because the two are genuinely different things: a
   * credential is something the studio handed over, connecting is a decision.
   * An add-on that needs no account is connected and never appears here — and
   * its disconnect says so rather than claiming to delete something.
   */
  credentialled: Set<string>;
  addOnSettings: AddOnSettings;
}

interface Actions {
  todayIso: () => string;
  go: (view: View) => void;
  setPersona: (p: Persona) => void;
  setTheme: (t: "light" | "dark") => void;
  openOverlay: (o: Overlay) => void;
  closeOverlay: () => void;
  toast: (message: string, tone?: Toast["tone"]) => void;
  dismissToast: (id: number) => void;

  advanceDay: () => void;
  resetDay: () => void;

  setCategory: (c: CategoryKey | "all") => void;
  setMaterial: (m: MaterialKey | "all") => void;
  setQuery: (q: string) => void;
  runSearch: () => void;

  openProduct: (key: string) => void;
  setAngle: (i: number) => void;
  patchConfig: (patch: Partial<Configuration>) => void;
  addToBasket: () => void;

  setBasketQuantity: (id: string, delta: number) => void;
  removeLine: (id: string) => void;
  setPostage: (p: PostageKey) => void;
  /**
   * Record a delivery an add-on quoted. Choosing one of the studio's own
   * options clears it again, which is what `setPostage` does.
   */
  chooseAddOnDelivery: (choice: DeliveryChoice) => void;
  setDetails: (patch: Partial<State["details"]>) => void;
  placeOrder: () => void;

  setLookup: (patch: Partial<State["lookup"]>) => void;
  doLookup: () => void;
  toggleChange: () => void;
  setChangeNote: (note: string) => void;
  approve: () => void;
  sendChange: () => void;

  patchAsk: (patch: Partial<Forms["ask"]>) => void;
  sendAsk: () => void;
  resetAsk: () => void;
  patchWrong: (patch: Partial<Forms["wrong"]>) => void;
  sendWrong: () => void;
  resetWrong: () => void;
  setReorderEmail: (email: string) => void;
  findReorders: () => void;
  reorder: (ref: string) => void;

  // ── the bench ────────────────────────────────────────────────────────────
  openMakerOrder: (ref: string) => void;
  openPiece: (key: string) => void;
  setMakerQuery: (q: string) => void;
  setBoardMenu: (key: string | null) => void;
  setDragKey: (key: string | null) => void;
  /** Move one piece between columns. Refuses a locked card BY NAME. */
  moveLine: (ref: string, lineId: string, to: BenchColumn) => void;
  openBatch: (group: string) => void;
  dropFromSheet: (pieceKey: string) => void;
  putBackOnSheet: (pieceKey: string) => void;
  /** Start the batch: every included piece moves to Making in ONE action. */
  startTheBatch: () => void;
  openCutList: (group: string) => void;
  sendTheProof: (ref: string) => void;
  recordSpoiled: (ref: string, lineId: string, blanks: number) => void;
  markMade: (ref: string) => void;
  markReady: (ref: string) => void;
  setOrderFilter: (f: State["orderFilter"]) => void;
  openCustomer: (email: string) => void;
  togglePacked: (ref: string) => void;
  markRunPosted: () => void;
  togglePersonalize: (productKey: string) => void;
  setCount: (stockKey: string, value: string) => void;
  saveCount: () => void;
  cancelCount: () => void;

  // ── add-ons ──────────────────────────────────────────────────────────────
  toggleAddOn: (key: string) => void;
  connectAddOn: (key: string, options?: { keyGiven?: boolean }) => void;
  disconnectAddOn: (key: string) => void;
  patchAddOnSettings: (addOn: string, patch: Record<string, unknown>) => void;
}

function defaultConfig(productKey: string): Configuration {
  const product = PRODUCT_BY_KEY[productKey]!;
  return {
    materialKey: product.material,
    sizeKey: product.sizes[0]!.key,
    finishKey: product.finishes[0]!.key,
    quantity: 1,
    note: "",
  };
}

let toastSeq = 0;
let lineSeq = 0;

export const useStore = create<State & Actions>((set, get) => ({
  persona: "shopper",
  view: "shop",
  theme: null,
  overlay: { kind: "none" },
  toasts: [],
  loading: false,

  now: source.now(),
  dayOffset: 0,

  orders: source.orders(),
  pastOrders: source.pastOrders(),
  customers: source.customers(),
  materials: source.materials(),
  machines: source.machines(),
  careCards: source.careCards(),

  category: "all",
  material: "all",
  query: "",
  searchTerm: "",

  productKey: null,
  angle: 0,
  config: null,

  basket: [],
  postage: "second",
  deliveryChoice: null,
  details: { name: "", email: "", address: "" },
  placed: null,

  lookup: { ref: "", email: "" },
  lookupRef: null,
  lookupError: null,
  changeOpen: false,
  changeNote: "",

  forms: {
    ask: { what: "", material: "walnut", when: "", name: "", email: "" },
    askSent: false,
    wrong: { ref: "", kind: "", note: "" },
    wrongSent: false,
    reorderEmail: "",
    reorderSearched: false,
  },

  makerOrderRef: null,
  pieceKey: null,
  makerQuery: "",
  boardMenu: null,
  dragKey: null,
  batchKey: null,
  batchOut: [],
  cutKey: null,
  orderFilter: "all",
  customerEmail: null,
  packed: [],
  /**
   * Which pieces take personalization, seeded from the catalogue.
   *
   * Held in the store rather than read off the product because the maker can
   * turn it off on the Products screen and watch the shop's note field go with
   * it — the setting is the maker's, and a shopper-facing panel that could not
   * be switched off would not be a setting at all.
   */
  personalizeOn: Object.fromEntries(
    PRODUCTS.map((p) => [p.key, p.personalize !== undefined]),
  ),
  stockAdj: {},
  countDraft: {},
  /**
   * What is already booked on each machine today, in minutes.
   *
   * Seeded against the pinned Thursday — the laser has had a morning of small
   * jobs, both printers have a long run on, the kiln is cold — so the bench's
   * "machine time booked" chip is a real figure before anybody presses
   * anything, and starting a batch visibly adds to it.
   */
  booked: { laser: 95, printers: 210, kiln: 0 },

  /**
   * The add-on seam, wired at boot with NOTHING ENABLED.
   *
   * `enabled` starts empty on purpose. The build VENDORS two add-ons and
   * ENABLES neither, which is the whole demo device (24 §5.9): every screen a
   * reviewer opens first is therefore the screen a maker with nothing connected
   * sees, which is the only way to know D19's nine slots are finished in that
   * state rather than pending. A dock toggle each turns them on.
   */
  registry: createRegistry(demoAddOns()),
  enabled: new Set<string>(),
  credentialled: new Set<string>(),
  addOnSettings: DEFAULT_ADD_ON_SETTINGS,

  // ── clock ────────────────────────────────────────────────────────────────

  todayIso: () => {
    const { now, dayOffset } = get();
    return addStudioDays(now.iso, dayOffset);
  },

  advanceDay: () => set((s) => ({ dayOffset: s.dayOffset + 1 })),
  resetDay: () => set({ dayOffset: 0 }),

  // ── chrome ───────────────────────────────────────────────────────────────

  /**
   * Switching views scrolls back to the top. Opening an order has to land on
   * its header, not halfway down the page where the shop left the scroll.
   */
  go: (view) => {
    set({ view, overlay: { kind: "none" }, boardMenu: null, loading: true });
    if (typeof window !== "undefined") {
      window.scrollTo({ top: 0, behavior: "auto" });
      window.setTimeout(() => set({ loading: false }), 180);
    } else {
      set({ loading: false });
    }
  },

  setPersona: (persona) => {
    const view: View = persona === "shopper" ? "shop" : "today";
    set({ persona, view, overlay: { kind: "none" } });
    if (typeof window !== "undefined") window.scrollTo({ top: 0, behavior: "auto" });
  },

  setTheme: (theme) => set({ theme }),

  openOverlay: (overlay) => set({ overlay }),
  closeOverlay: () => set({ overlay: { kind: "none" } }),

  toast: (message, tone = "neutral") => {
    toastSeq += 1;
    const id = toastSeq;
    set((s) => ({ toasts: [...s.toasts, { id, message, tone }] }));
    if (typeof window !== "undefined") {
      window.setTimeout(() => get().dismissToast(id), 4200);
    }
  },

  dismissToast: (id) => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),

  // ── the shop ─────────────────────────────────────────────────────────────

  setCategory: (category) => set({ category }),
  setMaterial: (material) => set({ material }),
  setQuery: (query) => set({ query }),

  runSearch: () => {
    const term = get().query.trim();
    if (term === "") return;
    set({ searchTerm: term });
    get().go("search");
  },

  openProduct: (key) => {
    if (PRODUCT_BY_KEY[key] === undefined) {
      get().go("404");
      return;
    }
    set({ productKey: key, angle: 0, config: defaultConfig(key) });
    get().go("product");
  },

  setAngle: (angle) => set({ angle }),

  patchConfig: (patch) => {
    const current = get().config;
    const product = get().productKey === null ? undefined : PRODUCT_BY_KEY[get().productKey!];
    if (current === null || product === undefined) return;
    const next = { ...current, ...patch };

    // Every choice narrows the next: a finish the new material cannot take is
    // replaced with one it can, but ONLY when the old choice has actually
    // become impossible, so a shopper never loses a selection that was valid.
    if (!product.materials.some((m) => m.key === next.materialKey)) {
      next.materialKey = product.material;
    }
    if (!product.sizes.some((s) => s.key === next.sizeKey)) next.sizeKey = product.sizes[0]!.key;
    if (!product.finishes.some((f) => f.key === next.finishKey)) {
      next.finishKey = product.finishes[0]!.key;
    }
    next.quantity = Math.max(1, Math.min(24, Math.round(next.quantity)));

    set({ config: next });
  },

  /**
   * Add the piece to the basket, unless the note is longer than the piece can
   * take — in which case the character-limit overlay says so with the number,
   * rather than the button quietly doing nothing.
   */
  addToBasket: () => {
    const { config, productKey } = get();
    if (config === null || productKey === null) return;
    const product = PRODUCT_BY_KEY[productKey]!;
    const limit = product.personalize?.limitChars ?? 0;
    if (limit > 0 && config.note.length > limit) {
      set({ overlay: { kind: "limit" } });
      return;
    }
    lineSeq += 1;
    set((s) => ({
      basket: [...s.basket, { id: `line-${lineSeq}`, productKey, ...config }],
    }));
    get().go("basket");
  },

  setBasketQuantity: (id, delta) =>
    set((s) => ({
      basket: s.basket.map((l) =>
        l.id === id ? { ...l, quantity: Math.max(1, Math.min(24, l.quantity + delta)) } : l,
      ),
    })),

  removeLine: (id) => set((s) => ({ basket: s.basket.filter((l) => l.id !== id) })),

  /*
   * Picking one of the studio's own options DROPS an add-on's quote. There is
   * one delivery decision on this screen and it cannot be two things at once —
   * a selected carrier row sitting above a selected studio row, both drawn as
   * chosen, is the state this line exists to make unreachable.
   */
  setPostage: (postage) => set({ postage, deliveryChoice: null }),

  chooseAddOnDelivery: (deliveryChoice) => set({ deliveryChoice }),

  setDetails: (patch) => set((s) => ({ details: { ...s.details, ...patch } })),

  /**
   * Place the order.
   *
   * The new order joins `orders` rather than being kept somewhere special, so
   * the moment it exists the bench can see it, the lookup can find it and the
   * ship-by arithmetic treats it exactly like the twelve that were seeded.
   */
  placeOrder: () => {
    const { basket, details, orders, postage, deliveryChoice, todayIso } = get();
    if (basket.length === 0) return;
    const today = todayIso();

    const base = Number.parseInt(source.nextRef().replace("BR-", ""), 10);
    const placedCount = orders.length - source.orders().length;
    const ref = `BR-${base + Math.max(0, placedCount)}`;

    const needsProof = basket.some((l) => l.note.trim() !== "");
    const order: Order = {
      ref,
      customer: details.name.trim() === "" ? "Bex T." : details.name.trim(),
      email: details.email.trim() === "" ? "bex.t@example.com" : details.email.trim(),
      placedIso: today,
      lines: basket.map((l, i) => ({
        id: `${ref}-L${i + 1}`,
        productKey: l.productKey,
        materialKey: l.materialKey,
        sizeKey: l.sizeKey,
        finishKey: l.finishKey,
        quantity: l.quantity,
        note: l.note,
        stage: "to-make",
        proof: l.note.trim() === "" ? "not-needed" : "not-sent",
        spoiled: 0,
      })),
      proofs: [{ kind: "accepted", at: today }],
    };

    const lead = longestLeadDays(basket);
    const postBy =
      lead === 0
        ? null
        : addStudioDays(
            // The finish day counts today as the first studio day, then the
            // parcel goes on the next post office run.
            addStudioDays(today, lead - 1),
            1,
          );

    set((s) => ({
      orders: [...s.orders, order],
      basket: [],
      config: null,
      deliveryChoice: null,
      placed: {
        ref,
        postBy,
        // The carriage the shopper actually agreed to: an add-on's quote when
        // one was chosen, the studio's own postage otherwise.
        totalCents:
          piecesTotalCents(basket) +
          (deliveryChoice === null
            ? POSTAGE[postage]
            : Math.round(deliveryChoice.amount * 100)),
        needsProof,
      },
    }));
    get().go("confirm");
  },

  // ── looking an order up ──────────────────────────────────────────────────

  setLookup: (patch) => set((s) => ({ lookup: { ...s.lookup, ...patch } })),

  doLookup: () => {
    const { lookup, orders, pastOrders } = get();
    const ref = lookup.ref.trim().toUpperCase();
    const found = [...orders, ...pastOrders].find((o) => o.ref === ref);
    if (found === undefined) {
      set({ lookupRef: null, lookupError: "notFound" });
      return;
    }
    const email = lookup.email.trim().toLowerCase();
    if (email !== "" && email !== found.email.toLowerCase()) {
      set({ lookupRef: null, lookupError: "wrongEmail" });
      return;
    }
    set({ lookupRef: found.ref, lookupError: null, changeOpen: false, changeNote: "" });
  },

  toggleChange: () => set((s) => ({ changeOpen: !s.changeOpen })),
  setChangeNote: (changeNote) => set({ changeNote }),

  approve: () => {
    const { lookupRef, todayIso } = get();
    if (lookupRef === null) return;
    const today = todayIso();
    set((s) => ({
      orders: s.orders.map((o) => (o.ref === lookupRef ? approveProof(o, today) : o)),
      changeOpen: false,
    }));
  },

  sendChange: () => {
    const { lookupRef, changeNote, todayIso } = get();
    if (lookupRef === null || changeNote.trim() === "") return;
    const today = todayIso();
    set((s) => ({
      orders: s.orders.map((o) => (o.ref === lookupRef ? askForChange(o, changeNote, today) : o)),
      changeOpen: false,
      changeNote: "",
    }));
  },

  // ── the three little forms ───────────────────────────────────────────────

  patchAsk: (patch) =>
    set((s) => ({ forms: { ...s.forms, ask: { ...s.forms.ask, ...patch } } })),
  sendAsk: () => set((s) => ({ forms: { ...s.forms, askSent: true } })),
  resetAsk: () =>
    set((s) => ({
      forms: {
        ...s.forms,
        askSent: false,
        ask: { what: "", material: "walnut", when: "", name: "", email: "" },
      },
    })),

  patchWrong: (patch) =>
    set((s) => ({ forms: { ...s.forms, wrong: { ...s.forms.wrong, ...patch } } })),
  sendWrong: () => set((s) => ({ forms: { ...s.forms, wrongSent: true } })),
  resetWrong: () =>
    set((s) => ({
      forms: { ...s.forms, wrongSent: false, wrong: { ref: "", kind: "", note: "" } },
    })),

  setReorderEmail: (reorderEmail) =>
    set((s) => ({ forms: { ...s.forms, reorderEmail } })),

  findReorders: () => set((s) => ({ forms: { ...s.forms, reorderSearched: true } })),

  /** Put an old order's lines back in the basket, wording and all. */
  reorder: (ref) => {
    const { orders, pastOrders } = get();
    const order = [...orders, ...pastOrders].find((o) => o.ref === ref);
    if (order === undefined) return;
    const lines: BasketLine[] = order.lines.map((l) => {
      lineSeq += 1;
      return {
        id: `line-${lineSeq}`,
        productKey: l.productKey,
        materialKey: l.materialKey,
        sizeKey: l.sizeKey,
        finishKey: l.finishKey,
        quantity: l.quantity,
        note: l.note,
      };
    });
    set((s) => ({ basket: [...s.basket, ...lines] }));
    get().go("basket");
  },

  // ── the bench ────────────────────────────────────────────────────────────

  openMakerOrder: (ref) => {
    set({ makerOrderRef: ref, boardMenu: null, makerQuery: "" });
    get().go("makerorder");
  },

  openPiece: (key) => {
    set({ pieceKey: key, makerQuery: "" });
    get().go("makerpiece");
  },

  setMakerQuery: (makerQuery) => set({ makerQuery }),
  setBoardMenu: (boardMenu) => set({ boardMenu }),
  setDragKey: (dragKey) => set({ dragKey }),

  /**
   * Move one piece between the board's columns.
   *
   * THE PROOF GATE LIVES IN THE ENGINE, and this is the whole of its UI: the
   * engine decides, and the refusal is repeated to the maker WITH THE REASON
   * AND THE CUSTOMER'S NAME. Both routes into this — the drag and the "…"
   * menu — end up here, so there is exactly one place a locked card can be
   * refused and exactly one sentence it can be refused with.
   */
  moveLine: (ref, lineId, to) => {
    const order = get().orders.find((o) => o.ref === ref);
    const line = order?.lines.find((l) => l.id === lineId);
    if (order === undefined || line === undefined) return;

    const result = moveLineOnBench(line, to);
    if (!result.ok) {
      get().toast(
        ambientT(result.reasonKey as never, { customer: order.customer }),
        "warn",
      );
      set({ dragKey: null, boardMenu: null });
      return;
    }

    set((s) => ({
      orders: s.orders.map((o) =>
        o.ref === ref
          ? { ...o, lines: o.lines.map((l) => (l.id === lineId ? { ...l, stage: to } : l)) }
          : o,
      ),
      dragKey: null,
      boardMenu: null,
    }));
  },

  openBatch: (group) => {
    set({ batchKey: group, batchOut: [], boardMenu: null });
    get().go("batch");
  },

  dropFromSheet: (pieceKey) =>
    set((s) => ({ batchOut: s.batchOut.includes(pieceKey) ? s.batchOut : [...s.batchOut, pieceKey] })),

  putBackOnSheet: (pieceKey) =>
    set((s) => ({ batchOut: s.batchOut.filter((k) => k !== pieceKey) })),

  /**
   * START THE BATCH.
   *
   * ONE action, one `set`: every piece on the sheet moves to *Making* together
   * and the machine is booked for the run. The engine does the moving —
   * `startBatch` returns the whole new list of orders — so there is no window
   * in which half a sheet has been started, which matters because the sheet is
   * about to be cut whether or not the app kept up.
   */
  startTheBatch: () => {
    const { orders, batchKey, batchOut, booked } = get();
    if (batchKey === null) return;
    const group = batchGroups(orders).find((g) => g.key === batchKey);
    if (group === undefined) return;

    const pack = packSheet(withoutPieces(group.pieces, new Set(batchOut)));
    if (pack.placements.length === 0) return;

    const started = startBatch(orders, pack);
    set({
      orders: started.orders,
      batchKey: null,
      batchOut: [],
      booked: { ...booked, [started.machine]: booked[started.machine] + started.minutes },
    });
    /* Back to the board, because the sheet the maker was looking at has just
       stopped existing: its pieces are on the machine, and a screen that stayed
       put would be showing a group that has been made. */
    get().go("today");
    get().toast(
      ambientT(
        "bench.batch.started",
        { pieces: started.pieceCount, orders: started.orderRefs.length },
        started.orderRefs.length,
      ),
      "pos",
    );
  },

  openCutList: (group) => {
    set({ cutKey: group });
    get().go("cutlist");
  },

  sendTheProof: (ref) => {
    const today = get().todayIso();
    set((s) => ({
      orders: s.orders.map((o) => (o.ref === ref ? sendProof(o, today) : o)),
      overlay: { kind: "none" },
    }));
    get().toast(ambientT("bench.proof.sentToast"), "pos");
  },

  recordSpoiled: (ref, lineId, blanks) => {
    if (blanks <= 0) return;
    set((s) => ({
      orders: s.orders.map((o) => (o.ref === ref ? spoilAndRemake(o, lineId, blanks) : o)),
      overlay: { kind: "none" },
    }));
    get().toast(ambientT("bench.spoil.toast", { blanks }, blanks), "warn");
  },

  markMade: (ref) => {
    set((s) => ({
      orders: s.orders.map((o) =>
        o.ref === ref
          ? {
              ...o,
              lines: o.lines.map((l) =>
                l.stage === "to-make" || l.stage === "making" ? { ...l, stage: "finishing" } : l,
              ),
            }
          : o,
      ),
    }));
    get().toast(ambientT("bench.order.madeToast"), "pos");
  },

  markReady: (ref) => {
    set((s) => ({
      orders: s.orders.map((o) =>
        o.ref === ref ? { ...o, lines: o.lines.map((l) => ({ ...l, stage: "ready-to-post" })) } : o,
      ),
    }));
    get().toast(ambientT("bench.order.readyToast", { ref }), "pos");
  },

  setOrderFilter: (orderFilter) => set({ orderFilter }),

  openCustomer: (customerEmail) => set({ customerEmail }),

  togglePacked: (ref) =>
    set((s) => ({
      packed: s.packed.includes(ref) ? s.packed.filter((r) => r !== ref) : [...s.packed, ref],
    })),

  /**
   * The post office run is finished: everything ticked has actually gone.
   *
   * `markPosted` is the only place `postedIso` is set, and setting it here is
   * what takes the order off the bench, off the shelf's committed column and
   * onto the customer's "posted" step in one move.
   */
  markRunPosted: () => {
    const { packed, todayIso } = get();
    if (packed.length === 0) {
      get().toast(ambientT("bench.post.tickFirst"), "warn");
      return;
    }
    const today = todayIso();
    set((s) => ({
      orders: s.orders.map((o) => (packed.includes(o.ref) ? markPosted(o, today) : o)),
      packed: [],
    }));
    get().toast(ambientT("bench.post.doneToast", { count: packed.length }, packed.length), "pos");
  },

  togglePersonalize: (productKey) =>
    set((s) => ({
      personalizeOn: { ...s.personalizeOn, [productKey]: !s.personalizeOn[productKey] },
    })),

  /*
   * THE STOCK-COUNT FIELD, IN THE READER'S OWN DIGITS.
   *
   * [Corrected 2026-08-11, wave 4b round 5.] This was `value.replace(/[^0-9]/g,
   * "")` — everything outside the LATIN digits thrown away — so a maker in Cairo
   * counting on their own keyboard typed ٣ and watched it vanish. The stock
   * sheet was unusable in Arabic, and it had been for the whole of this wave.
   *
   * The spoilage dialog had the same defect and it was found in round 4 and
   * fixed THERE, in `Overlays.tsx`, with `keepDigits`/`parseCount` written in
   * `lib/format.ts` for the purpose. This second field, two screens away, kept
   * its own copy of the bug — the same one-host-one-place repair this round was
   * sent to sweep for, except both places are in the same host.
   *
   * So the parsing is `parseCount` here too, and it is done ONCE, on the way in
   * to a number. `keepDigits` at the input keeps what was typed.
   */
  setCount: (stockKey, value) =>
    set((s) => ({
      countDraft: { ...s.countDraft, [stockKey]: keepDigits(value) },
    })),

  saveCount: () => {
    const { countDraft, stockAdj } = get();
    const next = { ...stockAdj };
    let counted = 0;
    for (const [key, raw] of Object.entries(countDraft)) {
      if (raw === "") continue;
      const value = parseCount(raw);
      if (Number.isNaN(value)) continue;
      next[key] = value;
      counted += 1;
    }
    set({ stockAdj: next, countDraft: {} });
    get().toast(ambientT("bench.count.saved", { count: counted }, counted), "pos");
    get().go("materials");
  },

  cancelCount: () => {
    set({ countDraft: {} });
    get().go("materials");
  },

  // ── add-ons ──────────────────────────────────────────────────────────────

  /**
   * Switch an add-on on or off.
   *
   * The whole of D6 in four lines: enabling is adding a key to a set, and
   * disabling is taking it out again. Nothing is copied into the host when an
   * add-on arrives, so nothing has to be cleaned up when it leaves — which is
   * why turning one off can be trusted to leave the app exactly where it
   * started rather than nearly there.
   */
  /**
   * The demo dock's switch: straight on, straight off, no dialog.
   *
   * That is deliberate and it is what `print-shop` does too. The dock is the
   * REVIEWER's device for watching a feature arrive and leave (D6); making it
   * ask "are you sure?" would put a confirm in front of the one control whose
   * whole purpose is to be flipped twice in five seconds. The STUDIO's own
   * control is on the Add-ons shelf, and that one goes through the dialogs.
   */
  toggleAddOn: (key) => {
    if (get().enabled.has(key)) get().disconnectAddOn(key);
    else get().connectAddOn(key);
  },

  /**
   * Switch an add-on on, and record whether a key came with it.
   *
   * `keyGiven` is what the connect dialog reports: `true` when the studio typed
   * a key into it, `false` (or absent) when the add-on needs no account or is
   * running on its own demo transport (D11). The KEY is not passed and could
   * not be — see `credentialled`.
   */
  connectAddOn: (key, options) =>
    set((s) => {
      const enabled = new Set(s.enabled);
      enabled.add(key);
      const credentialled = new Set(s.credentialled);
      if (options?.keyGiven === true) credentialled.add(key);
      return { enabled, credentialled, overlay: { kind: "none" } };
    }),

  /**
   * DISCONNECT DELETES THE CREDENTIAL AND KEEPS THE WORK (24 D16).
   *
   * WHAT GOES: the add-on's fills stop rendering, so its preview on a basket
   * line, its postage rows and its dispatch panel are gone from the moment the
   * set changes — and the key this studio handed over is deleted, so connecting
   * again asks for a new one.
   *
   * WHAT STAYS: everything already committed. The words a shopper typed on a
   * piece are in the ORDER, in this studio's own column, not in the add-on
   * (that is why `payload.setNote` writes to the host); a booked parcel is
   * still booked; and the settings the studio chose are still here if it
   * reconnects. The confirm says all of this in words before anything happens.
   *
   * This used to be four lines that flipped a Set. Nothing was said, nothing
   * was deleted, and the studio could not have told which of the two D16
   * promises it was getting.
   */
  disconnectAddOn: (key) =>
    set((s) => {
      const enabled = new Set(s.enabled);
      enabled.delete(key);
      const credentialled = new Set(s.credentialled);
      credentialled.delete(key);
      /*
       * A DELIVERY THIS ADD-ON QUOTED IS A SURFACE TOO, and only that add-on's.
       * Without this the till would keep charging for a service from a company
       * that is no longer connected, with no row on the screen to explain where
       * the amount came from — which is the one way this app could fail to
       * return to exactly its base state (D6). It is not "data" in D16's sense:
       * a quote is what the add-on was showing, not what the studio recorded.
       */
      const dropped = s.deliveryChoice !== null && s.deliveryChoice.addOn === key;
      return {
        enabled,
        credentialled,
        overlay: { kind: "none" as const },
        ...(dropped ? { deliveryChoice: null } : {}),
      };
    }),

  patchAddOnSettings: (addOn, patch) => {
    const addOnSettings: AddOnSettings = {
      ...get().addOnSettings,
      [addOn]: { ...(get().addOnSettings[addOn] ?? {}), ...patch },
    };
    set({ addOnSettings });
    applyAddOnSettings(get().registry.all, addOnSettings);
  },
}));

/**
 * The shelf as the maker sees it, with the stocktake's corrections applied.
 *
 * A counted row wins over the book — that is what counting is for — and it is
 * applied here rather than written back into the seed so the DataSource stays
 * the record of what the server said.
 */
export function countedMaterials(
  rows: readonly StockRow[],
  adjustments: Readonly<Record<string, number>>,
): StockRow[] {
  return rows.map((row) =>
    adjustments[row.key] === undefined ? row : { ...row, onHand: adjustments[row.key]! },
  );
}

/** Total machine time booked today, in minutes, across the three machines. */
export function bookedMinutes(booked: Readonly<Record<MachineKey, number>>): number {
  return MACHINE_KEYS.reduce((sum, key) => sum + (booked[key] ?? 0), 0);
}

/** The postage the shopper has chosen, in cents. */
export function postageCents(key: PostageKey): number {
  return POSTAGE[key];
}

/**
 * Today, for a component.
 *
 * NOT `useStore((s) => s.todayIso)()`, and the difference is a bug this app
 * shipped for about an hour: selecting the ACTION returns a stable function
 * reference, so a screen that called it never subscribed to `dayOffset` and sat
 * there showing last Tuesday's ship-by while the dock's clock had moved on.
 * Selecting the two pieces of STATE the date is derived from is what makes
 * "+1 studio day" move every date on the screen at once.
 */
export function useToday(): string {
  const now = useStore((s) => s.now);
  const dayOffset = useStore((s) => s.dayOffset);
  return addStudioDays(now.iso, dayOffset);
}
