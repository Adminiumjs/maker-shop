/**
 * The shop's state: what is on screen, the basket, the checkout's form, and
 * Adminium's answers to them.
 *
 * Nothing here works out money or a date. A product page's prices are a dry
 * run of a one-line order (one line for the quantity chosen and one for each
 * quantity break, in one dry run); the basket's and the checkout's figures
 * are a dry run of the whole order; the confirmation shows the row the order
 * wrote. Placing sends the total the shopper was shown: a save that would
 * come to another one is refused and nothing is kept, and the page shows the
 * new figures before the next press.
 *
 * The basket lives for the tab (its own storage), with the design sessions
 * the Customiser handed it, as the shop's other sessions do.
 */
import { create } from "zustand";

import type { MessageKey } from "../i18n/index.tsx";

import { heldDesign, type DesignForBasket, type HeldDesign, type SavedDesign } from "../../vendor/customiser/index.js";
import { freshClientKey } from "./door.ts";
import type { Elsewhere } from "./route.ts";
import { isShopError, type Catalogue, type Figures, type Id, type LineValues, type Option, type OrderBody, type Placed, type Product, type Refused, type Row, type ShopConfig, type ShopPort } from "./port.ts";

export type ShopView = "shop" | "product" | "customise" | "basket" | "checkout" | "confirm" | "missing" | Elsewhere;

/** A line in the basket: what the shopper chose, never a price. */
export interface BasketLine {
  id: string;
  productId: Id;
  qty: number;
  materialId: Id | null;
  sizeId: Id | null;
  finishId: Id | null;
  lettering: string | null;
  /** The Customiser's design the line is made from: its code, and the session that may change it. */
  design: SavedDesign | null;
  /** The priced features the design uses, as the product's own option rows. */
  features: Id[];
}

/** The choices on a product's page. */
export interface Choice {
  materialId: Id | null;
  sizeId: Id | null;
  finishId: Id | null;
  qty: number;
  lettering: string;
}

export interface Details {
  name: string;
  email: string;
  line1: string;
  line2: string;
  town: string;
  postcode: string;
  news: boolean;
}

export type Field = "name" | "email" | "line1" | "town" | "postcode";

/** A field's error: a message key of the shop's, said beside the field. */
export type FieldErrors = Partial<Record<Field, ShopMessage>>;

export type ShopMessage =
  | "shop.checkout.err.name"
  | "shop.checkout.err.email"
  | "shop.checkout.err.emailShape"
  | "shop.checkout.err.line1"
  | "shop.checkout.err.town"
  | "shop.checkout.err.postcode"
  | "shop.checkout.err.refused";

export interface Quoted {
  /** What was asked: a later answer to an older question is dropped. */
  key: string;
  state: "busy" | "ok" | "failed";
  figures: Figures | null;
}

/** One line whose price moved since the shopper saw it: each before and after, as Adminium said them. */
export interface PriceMove {
  name: string;
  qty: number;
  was: string;
  now: string;
}

export interface Confirmed {
  order: Row;
  lines: Row[];
  serviceName: string;
  token: string | null;
}

export interface Toast {
  id: number;
  tone: "ok" | "info";
  /** A message of the shop's, said in the reader's language when it is shown. */
  key: MessageKey;
  params?: Record<string, string | number>;
}

export interface ShopState {
  port: ShopPort | null;
  config: ShopConfig;
  catalogue: Catalogue | null;
  loading: "loading" | "ok" | "failed";
  view: ShopView;
  productCode: string | null;
  category: string;
  family: string;
  choice: Choice;
  productQuote: Quoted | null;
  /** The priced features the design in the editor uses, by feature code. */
  used: string[];
  basket: BasketLine[];
  /** The basket line the editor is changing, when it opened from one. */
  editing: string | null;
  basketQuote: Quoted | null;
  /** Each postage service's charge for this basket's parcel, by service: a dry run of the order with it. */
  servicePostage: Record<string, string>;
  serviceKey: string | null;
  serviceId: Id | null;
  details: Details;
  tried: boolean;
  /** Errors Adminium gave, by field, or on a basket line. */
  refusedFields: FieldErrors;
  refusedLine: { index: number; reason: string | null; raw: unknown } | null;
  failure: "unreachable" | "closed" | "refused" | null;
  checking: boolean;
  /** The total the checkout showed, which the save is held to. */
  shownTotal: string | null;
  priceMoves: PriceMove[] | null;
  clientKey: string;
  confirmed: Confirmed | null;
  limitWarn: boolean;
  toasts: Toast[];
  /** Designs saved for later on this device, for "Your designs". */
  held: HeldDesign[];
}

const BASKET_SLOT = "maker.shop.basket";
const HELD_SLOT = "maker.shop.designs";

function tab(): Storage | null {
  try {
    return typeof sessionStorage === "undefined" ? null : sessionStorage;
  } catch {
    return null;
  }
}

function readSlot<T>(slot: string, fallback: T): T {
  try {
    const raw = tab()?.getItem(slot) ?? null;
    return raw === null ? fallback : (JSON.parse(raw) as T);
  } catch {
    return fallback;
  }
}

function writeSlot(slot: string, value: unknown): void {
  try {
    tab()?.setItem(slot, JSON.stringify(value));
  } catch {
    // storage refused (full, blocked): the basket lasts until the page goes
  }
}

const NO_DETAILS: Details = { name: "", email: "", line1: "", line2: "", town: "", postcode: "", news: false };
const NO_CHOICE: Choice = { materialId: null, sizeId: null, finishId: null, qty: 1, lettering: "" };

function initial(): Omit<ShopState, "port"> {
  const kept = readSlot<{ lines: BasketLine[]; clientKey: string | null; serviceId: Id | null }>(BASKET_SLOT, { lines: [], clientKey: null, serviceId: null });
  return {
    config: { timezone: "UTC", currency: null },
    catalogue: null,
    loading: "loading",
    view: "shop",
    productCode: null,
    category: "all",
    family: "all",
    choice: NO_CHOICE,
    productQuote: null,
    used: [],
    basket: Array.isArray(kept.lines) ? kept.lines : [],
    editing: null,
    basketQuote: null,
    servicePostage: {},
    serviceKey: null,
    serviceId: kept.serviceId ?? null,
    details: NO_DETAILS,
    tried: false,
    refusedFields: {},
    refusedLine: null,
    failure: null,
    checking: false,
    shownTotal: null,
    priceMoves: null,
    clientKey: typeof kept.clientKey === "string" && kept.clientKey !== "" ? kept.clientKey : freshClientKey(),
    confirmed: null,
    limitWarn: false,
    toasts: [],
    held: readSlot<HeldDesign[]>(HELD_SLOT, []),
  };
}

export const useShop = create<ShopState>(() => ({ port: null, ...initial() }));

const get = () => useShop.getState();
const set = (patch: Partial<ShopState>) => useShop.setState(patch);

function keepBasket(): void {
  const s = get();
  writeSlot(BASKET_SLOT, { lines: s.basket, clientKey: s.clientKey, serviceId: s.serviceId });
}

/** For tests: back to a fresh page, with this port. */
export function resetShop(port: ShopPort | null): void {
  useShop.setState({ port, ...initial(), basket: [], held: [], serviceId: null, clientKey: freshClientKey() }, true);
}

// ── reading the catalogue ─────────────────────────────────────────────────

export function productOf(code: string | null): Product | null {
  return get().catalogue?.products.find((p) => p.code === code) ?? null;
}

export function productById(id: Id): Product | null {
  return get().catalogue?.products.find((p) => String(p.id) === String(id)) ?? null;
}

export function optionsOf(productId: Id, kind: Option["kind"]): Option[] {
  return (get().catalogue?.options ?? []).filter((o) => String(o.productId) === String(productId) && o.kind === kind);
}

export function optionById(id: Id | null): Option | null {
  return id === null ? null : (get().catalogue?.options.find((o) => String(o.id) === String(id)) ?? null);
}

/** The quantities a product is cheaper from, the first among them 1, when it has more than one. */
export function breaksOf(productId: Id): Option[] {
  return optionsOf(productId, "break")
    .filter((o) => o.minQty !== null)
    .sort((a, b) => (a.minQty ?? 0) - (b.minQty ?? 0));
}

export async function loadShop(): Promise<void> {
  const port = get().port;
  if (port === null) return;
  set({ loading: "loading" });
  try {
    const [config, catalogue] = await Promise.all([port.config(), port.catalogue()]);
    const serviceId = get().serviceId;
    const known = serviceId !== null && catalogue.services.some((s) => String(s.id) === String(serviceId));
    set({ config, catalogue, loading: "ok", serviceId: known ? serviceId : (catalogue.services[0]?.id ?? null) });
    const view = get().view;
    if (view === "product" || view === "customise") openProduct(get().productCode, view, get().editing);
    requoteBasket();
  } catch {
    set({ loading: "failed" });
  }
}

// ── moving about ──────────────────────────────────────────────────────────

let onNavigate: ((view: ShopView, code: string | null) => void) | null = null;
/** The address bar's half: told of every move, so the address follows the screen. */
export function onShopNavigate(listener: ((view: ShopView, code: string | null) => void) | null): void {
  onNavigate = listener;
}

export function goView(view: ShopView, code: string | null = null): void {
  set({ view, productCode: code ?? (view === "product" || view === "customise" ? get().productCode : null) });
  onNavigate?.(view, get().productCode);
  if (view === "basket" || view === "checkout") requoteBasket();
  if (view === "checkout") requoteServices();
  if (view !== "checkout") set({ priceMoves: null });
}

/** A product's page, with its first material, size and finish chosen. */
export function openProduct(code: string | null, view: "product" | "customise" = "product", editing: string | null = null): void {
  const product = productOf(code);
  set({ view, productCode: code, editing, used: [], limitWarn: false });
  onNavigate?.(view, code);
  if (product === null) return;
  const line = editing === null ? null : (get().basket.find((b) => b.id === editing) ?? null);
  const first = (kind: Option["kind"]) => optionsOf(product.id, kind)[0]?.id ?? null;
  set({
    choice:
      line === null
        ? { materialId: first("material"), sizeId: first("size"), finishId: first("finish"), qty: 1, lettering: "" }
        : { materialId: line.materialId, sizeId: line.sizeId, finishId: line.finishId, qty: line.qty, lettering: line.lettering ?? "" },
  });
  requoteProduct();
}

export function setFilter(patch: { category?: string; family?: string }): void {
  set(patch);
}

export function choose(patch: Partial<Choice>): void {
  const before = get().choice;
  const qty = patch.qty === undefined ? before.qty : Math.max(1, Math.min(50, patch.qty));
  set({ choice: { ...before, ...patch, qty } });
  // Words cost nothing: only a change Adminium prices asks again.
  if (patch.lettering === undefined || Object.keys(patch).length > 1) requoteProduct();
}

/** The priced features the editor's design uses, by code: the line pays for each. */
export function setUsedFeatures(codes: readonly string[]): void {
  const sorted = [...codes].sort();
  if (sorted.join(",") === get().used.join(",")) return;
  set({ used: sorted });
  requoteProduct();
}

function featureOptions(productId: Id, codes: readonly string[]): Id[] {
  const features = optionsOf(productId, "feature");
  return codes.map((code) => features.find((f) => f.featureCode === code)?.id).filter((id): id is Id => id !== undefined);
}

// ── the bodies sent to Adminium ───────────────────────────────────────────

function lineValues(line: Pick<BasketLine, "productId" | "qty" | "materialId" | "sizeId" | "finishId" | "lettering" | "design">): LineValues {
  return {
    product_id: line.productId,
    qty: line.qty,
    ...(line.materialId === null ? {} : { material_id: line.materialId }),
    ...(line.sizeId === null ? {} : { size_id: line.sizeId }),
    ...(line.finishId === null ? {} : { finish_id: line.finishId }),
    ...(line.lettering === null || line.lettering.trim() === "" ? {} : { lettering: line.lettering }),
    ...(line.design?.code ? { design_code: line.design.code } : {}),
  };
}

function withFeatures(values: LineValues, features: readonly Id[]): OrderBody["children"]["order_lines"][number] {
  return features.length === 0 ? { values } : { values, children: { order_line_features: features.map((id) => ({ values: { option_id: id } })) } };
}

/** The order as it would be sent: the shopper's values, then each basket line with its features. */
export function orderBody(values: Row, lines: readonly BasketLine[]): OrderBody {
  return { values, children: { order_lines: lines.map((line) => withFeatures(lineValues(line), line.features)) } };
}

function language(): string {
  return document.documentElement.getAttribute("lang") ?? "en-US";
}

/** The shopper's own values, only those typed, trimmed. */
export function detailValues(details: Details): Row {
  const out: Row = {};
  const put = (column: string, value: string) => {
    if (value.trim() !== "") out[column] = value.trim();
  };
  put("name", details.name);
  put("email", details.email);
  put("address_line1", details.line1);
  put("address_line2", details.line2);
  put("town", details.town);
  put("postcode", details.postcode);
  out["may_email"] = details.news;
  return out;
}

// ── the product page's prices ─────────────────────────────────────────────

/** The quantities one dry run prices for a product's page: the one chosen, then each break's. */
export function productQuantities(productId: Id, qty: number): number[] {
  const breaks = breaksOf(productId);
  const shown = breaks.length > 1 ? breaks.map((b) => b.minQty!) : [];
  return [qty, ...shown.filter((q) => q !== qty)];
}

let productTimer: ReturnType<typeof setTimeout> | null = null;

export function requoteProduct(): void {
  const s = get();
  const product = productOf(s.productCode);
  if (product === null || s.port === null) return;
  const features = featureOptions(product.id, s.used);
  const quantities = productQuantities(product.id, s.choice.qty);
  const body: OrderBody = {
    values: { ...(s.serviceId === null ? {} : { service_id: s.serviceId }), language: language() },
    children: {
      order_lines: quantities.map((qty) =>
        withFeatures(lineValues({ productId: product.id, qty, materialId: s.choice.materialId, sizeId: s.choice.sizeId, finishId: s.choice.finishId, lettering: null, design: null }), features),
      ),
    },
  };
  const key = JSON.stringify(body);
  if (s.productQuote?.key === key && s.productQuote.state !== "failed") return;
  set({ productQuote: { key, state: "busy", figures: s.productQuote?.figures ?? null } });
  if (productTimer !== null) clearTimeout(productTimer);
  productTimer = setTimeout(() => {
    productTimer = null;
    void runQuote(body, key, (quoted) => set({ productQuote: quoted }), () => get().productQuote?.key);
  }, 120);
}

async function runQuote(body: OrderBody, key: string, put: (q: Quoted) => void, current: () => string | undefined): Promise<void> {
  const port = get().port;
  if (port === null) return;
  try {
    const figures = await port.quote(body);
    if (current() === key) put({ key, state: "ok", figures });
  } catch {
    if (current() === key) put({ key, state: "failed", figures: null });
  }
}

/** The product page's figures for one quantity, from its dry run. */
export function figuresFor(qty: number): Row | null {
  const s = get();
  const product = productOf(s.productCode);
  const figures = s.productQuote?.figures;
  if (product === null || figures === null || figures === undefined) return null;
  const at = productQuantities(product.id, s.choice.qty).indexOf(qty);
  return at === -1 ? null : (figures.lines[at] ?? null);
}

// ── the basket ────────────────────────────────────────────────────────────

let basketTimer: ReturnType<typeof setTimeout> | null = null;

export function requoteBasket(): void {
  const s = get();
  if (s.port === null || s.catalogue === null) return;
  if (s.basket.length === 0) {
    set({ basketQuote: null });
    return;
  }
  const body = orderBody({ ...(s.serviceId === null ? {} : { service_id: s.serviceId }), language: language() }, s.basket);
  const key = JSON.stringify(body);
  if (s.basketQuote?.key === key && s.basketQuote.state !== "failed") return;
  set({ basketQuote: { key, state: "busy", figures: s.basketQuote?.figures ?? null } });
  if (basketTimer !== null) clearTimeout(basketTimer);
  basketTimer = setTimeout(() => {
    basketTimer = null;
    void runQuote(body, key, (quoted) => {
      set({ basketQuote: quoted });
      if (quoted.state === "ok" && quoted.figures !== null && get().serviceId !== null) set({ servicePostage: { ...get().servicePostage, [String(get().serviceId)]: String(quoted.figures.order["postage"] ?? "") } });
      // The checkout's total is the one the save is held to, until the shopper is told of another.
      if (quoted.state === "ok" && get().priceMoves === null) set({ shownTotal: String(quoted.figures?.order["total"] ?? "") });
    }, () => get().basketQuote?.key);
  }, 120);
}

/**
 * What each postage service would charge for this basket's parcel, for the
 * checkout's choice: one dry run of the order with each service. Asked again
 * only when the lines change, not when the shopper picks another service.
 */
export function requoteServices(): void {
  const s = get();
  if (s.port === null || s.catalogue === null || s.basket.length === 0) return;
  const lines = orderBody({}, s.basket).children;
  const key = JSON.stringify(lines);
  if (s.serviceKey === key) return;
  set({ serviceKey: key, servicePostage: {} });
  for (const service of s.catalogue.services) {
    const body: OrderBody = { values: { service_id: service.id, language: language() }, children: lines };
    void s.port
      .quote(body)
      .then((figures) => {
        if (get().serviceKey === key) set({ servicePostage: { ...get().servicePostage, [String(service.id)]: String(figures.order["postage"] ?? "") } });
      })
      .catch(() => {
        // The checkout shows "…" for a service it could not price; the save still prices the one chosen.
      });
  }
}

let toastSeq = 0;
export function toast(key: MessageKey, params?: Record<string, string | number>, tone: Toast["tone"] = "ok"): void {
  const id = (toastSeq += 1);
  set({ toasts: [...get().toasts, { id, tone, key, ...(params === undefined ? {} : { params }) }] });
  setTimeout(() => set({ toasts: get().toasts.filter((t) => t.id !== id) }), 3600);
}

/** A basket line's own id: one more than any the basket holds, so a kept basket's ids stay its own. */
function lineId(): string {
  const taken = get().basket.map((b) => Number.parseInt(b.id.replace(/^l/, ""), 36)).filter((n) => Number.isFinite(n));
  return `l${(Math.max(0, ...taken) + 1).toString(36)}`;
}

/** What the product page adds: its choices, as one line. Refused when the words are over the piece's limit. */
export function addChoiceToBasket(): BasketLine | null {
  const s = get();
  const product = productOf(s.productCode);
  if (product === null) return null;
  const words = product.takesLettering && product.baseId === null ? s.choice.lettering.trim() : "";
  if (words !== "" && product.letteringLimit !== null && [...words].length > product.letteringLimit) {
    set({ limitWarn: true });
    return null;
  }
  const line: BasketLine = { id: lineId(), productId: product.id, qty: s.choice.qty, materialId: s.choice.materialId, sizeId: s.choice.sizeId, finishId: s.choice.finishId, lettering: words === "" ? null : words, design: null, features: [] };
  set({ basket: [...s.basket, line] });
  keepBasket();
  return line;
}

/** What the editor hands over: the design saved, as a new line or the line it was opened from. */
export function addDesignToBasket(design: DesignForBasket): "added" | "updated" {
  const s = get();
  const product = productOf(s.productCode);
  if (product === null) return "added";
  const features = featureOptions(product.id, design.used);
  const kept = { ...design } as SavedDesign & { used?: string[] };
  delete kept.used;
  keepHeld(design, null);
  const editing = s.editing === null ? null : (s.basket.find((b) => b.id === s.editing) ?? null);
  if (editing !== null) {
    set({ basket: s.basket.map((b) => (b.id === editing.id ? { ...b, qty: s.choice.qty, materialId: s.choice.materialId, sizeId: s.choice.sizeId, finishId: s.choice.finishId, design: kept, features } : b)), editing: null });
    keepBasket();
    return "updated";
  }
  const line: BasketLine = { id: lineId(), productId: product.id, qty: s.choice.qty, materialId: s.choice.materialId, sizeId: s.choice.sizeId, finishId: s.choice.finishId, lettering: null, design: kept, features };
  set({ basket: [...s.basket, line] });
  keepBasket();
  return "added";
}

/** A design saved for later: its session is kept, for "Your designs". */
export function keepHeld(design: SavedDesign, email: string | null): void {
  const held = heldDesign(design, email);
  if (held === null) return;
  const rest = get().held.filter((one) => String(one.id) !== String(held.id));
  set({ held: [held, ...rest] });
  writeSlot(HELD_SLOT, get().held);
}

export function basketQty(id: string, by: number): void {
  set({ basket: get().basket.map((b) => (b.id === id ? { ...b, qty: Math.max(1, Math.min(50, b.qty + by)) } : b)), refusedLine: null });
  keepBasket();
  requoteBasket();
}

export function basketRemove(id: string): void {
  set({ basket: get().basket.filter((b) => b.id !== id), refusedLine: null });
  keepBasket();
  requoteBasket();
  toast("shop.toast.removed", undefined, "info");
}

export function chooseService(id: Id): void {
  set({ serviceId: id });
  keepBasket();
  requoteBasket();
}

// ── the checkout ──────────────────────────────────────────────────────────

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** What the page itself can say of the form before anything is sent. */
export function formErrors(details: Details): FieldErrors {
  const e: FieldErrors = {};
  if (details.name.trim() === "") e.name = "shop.checkout.err.name";
  if (details.email.trim() === "") e.email = "shop.checkout.err.email";
  else if (!EMAIL.test(details.email.trim())) e.email = "shop.checkout.err.emailShape";
  if (details.line1.trim() === "") e.line1 = "shop.checkout.err.line1";
  if (details.town.trim() === "") e.town = "shop.checkout.err.town";
  if (details.postcode.trim() === "") e.postcode = "shop.checkout.err.postcode";
  return e;
}

export function setDetails(patch: Partial<Details>): void {
  const refused = { ...get().refusedFields };
  for (const key of Object.keys(patch)) delete refused[key as Field];
  set({ details: { ...get().details, ...patch }, refusedFields: refused, failure: null });
}

/** The column Adminium names, as the field it is typed into. */
const FIELD_OF: Record<string, Field> = { name: "name", email: "email", address_line1: "line1", town: "town", postcode: "postcode" };

/** Where a refusal goes: a field of the form, a line of the basket, or the summary. */
function placeRefusal(refused: Refused): void {
  const field = refused.child === null && refused.column !== null ? FIELD_OF[refused.column] : undefined;
  if (field !== undefined) {
    set({ refusedFields: { ...get().refusedFields, [field]: "shop.checkout.err.refused" }, failure: null });
    return;
  }
  if (refused.child === "order_lines" && refused.index !== null) {
    set({ refusedLine: { index: refused.index, reason: refused.reason, raw: refused.raw }, failure: "refused" });
    return;
  }
  set({ failure: refused.code === "PUBLIC_SWITCHED_OFF" ? "closed" : "refused" });
}

/** The lines whose price moved, before and after, as the two dry runs said them. */
function movesBetween(before: Figures | null, after: Figures): PriceMove[] {
  const s = get();
  return after.lines
    .map((line, i) => ({ line, was: before?.lines[i] ?? null, basket: s.basket[i] }))
    .filter(({ line, was }) => was !== null && String(was["each"]) !== String(line["each"]))
    .map(({ line, was, basket }) => ({ name: String(line["product_name"] ?? (basket === undefined ? "" : productById(basket.productId)?.name) ?? ""), qty: Number(line["qty"] ?? basket?.qty ?? 1), was: String(was!["each"]), now: String(line["each"]) }));
}

/** The first field with something to fix, for the page to move focus to. */
export function firstBadField(): Field | null {
  const s = get();
  const errors = { ...(s.tried ? formErrors(s.details) : {}), ...s.refusedFields };
  return (["name", "email", "line1", "town", "postcode"] as const).find((f) => errors[f] !== undefined) ?? null;
}

/**
 * Place the order: the form checked here, then a dry run with the shopper's
 * own values (Adminium's refusals land on their fields), then the save held
 * to the total shown. A total that moved stops it, saves nothing, and shows
 * the shopper the new figures; their next press orders at those.
 */
export async function placeOrder(): Promise<"placed" | "fix" | "moved" | "failed"> {
  const s = get();
  if (s.checking || s.port === null || s.basket.length === 0 || s.catalogue === null || s.shownTotal === null) return "failed";
  set({ tried: true, refusedLine: null, failure: null });
  if (Object.keys(formErrors(s.details)).length > 0 || Object.keys(s.refusedFields).length > 0) return "fix";
  set({ checking: true });
  const body = orderBody({ ...detailValues(s.details), ...(s.serviceId === null ? {} : { service_id: s.serviceId }), language: language() }, s.basket);
  try {
    const quoted = await s.port.quote(body);
    const total = String(quoted.order["total"] ?? "");
    const shown = get().shownTotal ?? "";
    if (shown !== total) {
      const moves = movesBetween(get().basketQuote?.figures ?? null, quoted);
      set({ checking: false, priceMoves: moves, shownTotal: total, basketQuote: { key: get().basketQuote?.key ?? "", state: "ok", figures: quoted } });
      return "moved";
    }
    const placed = await s.port.place(body, s.clientKey, shown);
    confirm(placed);
    return "placed";
  } catch (error) {
    set({ checking: false });
    if (!isShopError(error)) {
      set({ failure: "unreachable" });
      return "failed";
    }
    const refused = error.refused;
    if (refused.code === "PUBLIC_PRICE_CHANGED" && refused.changed !== null) {
      const moves = movesBetween(get().basketQuote?.figures ?? null, refused.changed);
      set({ priceMoves: moves, shownTotal: String(refused.changed.order["total"] ?? "") });
      return "moved";
    }
    placeRefusal(refused);
    return "fix";
  }
}

function confirm(placed: Placed): void {
  const s = get();
  const service = s.catalogue?.services.find((one) => String(one.id) === String(placed.order["service_id"] ?? s.serviceId));
  set({
    checking: false,
    confirmed: { order: placed.order, lines: placed.lines, serviceName: service?.name ?? "", token: placed.link?.token ?? null },
    basket: [],
    basketQuote: null,
    priceMoves: null,
    shownTotal: null,
    tried: false,
    refusedFields: {},
    clientKey: freshClientKey(),
  });
  keepBasket();
  goView("confirm");
}

/** Whether any line of a placed order waits for a proof: words on it, or a design. */
export function waitsForProof(lines: readonly Row[]): boolean {
  return lines.some((line) => (line["lettering"] ?? null) !== null || (line["design_id"] ?? null) !== null);
}
