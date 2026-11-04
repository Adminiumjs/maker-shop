/**
 * The shop after an order: finding it (the order number and the e-mail, then
 * the code Adminium e-mails), opening it by its own link, answering its
 * proofs, putting it back in the basket, the two requests, and what the
 * footer's pages read.
 *
 * Every figure and date shown is one Adminium stored or worked out: an
 * order's stages are its stamps, its post-by its own column, a "posted by"
 * example a dry run's. The page only says them.
 */
import { create } from "zustand";


import { openSavedLink, readDesigns, type SavedDesign } from "../../vendor/customiser/index.js";
import { freshClientKey } from "./door.ts";
import type { AfterPort, CodeAnswer, Extras, OrderRead, ProofAnswer, Via } from "./after-port.ts";
import { isShopError, type Id, type Row } from "./port.ts";
import { addLinesToBasket, goView, keepHeld, optionById, productById, toast, useShop, type BasketLine } from "./store.ts";

// ── finding an order: its number and the e-mail, then the code ─────────────

/** The two pages that find an order the same way: Your order, and Order again. */
export type LookupKey = "order" | "again";

export type LookupError = "mismatch" | "unreachable" | "noMail";
export type CodeError = "short" | "wrong" | "spent" | "locked" | "unreachable";

export interface Lookup {
  step: "find" | "code" | "open";
  ref: string;
  email: string;
  tried: boolean;
  err: LookupError | null;
  digits: string;
  codeErr: CodeError | null;
  triesLeft: number | null;
  /** How many codes this page has asked for: each one starts "Send a new code in 0:29" again. */
  sends: number;
  /** Whether thirty seconds have gone since the last code was asked for. */
  canResend: boolean;
  busy: boolean;
}

const NO_LOOKUP: Lookup = { step: "find", ref: "", email: "", tried: false, err: null, digits: "", codeErr: null, triesLeft: null, sends: 0, canResend: false, busy: false };

/** The order open on "Your order": by the shopper's sign-in or by the order's own link. */
export interface Opened {
  via: Via;
  state: "loading" | "ok" | "failed" | "gone";
  read: OrderRead | null;
}

export interface FormState<V> {
  values: V;
  tried: boolean;
  sending: boolean;
  sent: Row | null;
  /** A column Adminium refused, and why, or a refusal of the whole request. */
  refused: { column: string | null; reason: string | null; code: string } | null;
  clientKey: string;
}

export interface AskValues {
  idea: string;
  material: string;
  when: string;
  name: string;
  email: string;
}

export type ProblemKind = "damaged" | "wrong" | "late" | "mind";

export interface ProblemValues {
  ref: string;
  email: string;
  name: string;
  what: ProblemKind | "";
  details: string;
}

export interface AfterState {
  port: AfterPort | null;
  lookups: Record<LookupKey, Lookup>;
  opened: Opened | null;
  /** How the order's own link went: being opened, opening nothing, or stopped. */
  link: "opening" | "unknown" | "closed" | null;
  /** Each waiting proof's picture, as an address the page may draw (an object URL), or null for none. */
  pictures: Record<string, string | null>;
  /** The proof whose change box is open, what is typed in it, and whether Send was pressed empty. */
  change: { proofId: string | null; note: string; tried: boolean };
  answering: string | null;
  /** What the shopper last answered on this order: the note the page shows after. */
  answered: "approved" | "changed" | null;
  answerFailed: boolean;
  /** Order again: the shopper's orders, and every line, feature and proof of them. */
  again: { state: "idle" | "loading" | "ok" | "failed"; orders: Row[]; lines: Row[]; features: Row[] };
  ask: FormState<AskValues>;
  problem: FormState<ProblemValues>;
  extras: { state: "idle" | "loading" | "ok" | "failed"; rows: Extras | null; today: string | null; examples: Row[] | null };
  /** The sign-in link from the e-mail (`/c#…`): the name it greets, and how opening it went. */
  signIn: { token: string | null; name: string | null; state: "idle" | "peeking" | "ready" | "opening" | "used" | "done" };
  /** What the shop's search box last asked for. */
  query: string;
}

const NO_ASK: AskValues = { idea: "", material: "", when: "", name: "", email: "" };
const NO_PROBLEM: ProblemValues = { ref: "", email: "", name: "", what: "", details: "" };

const form = <V>(values: V): FormState<V> => ({ values, tried: false, sending: false, sent: null, refused: null, clientKey: freshClientKey() });

function initial(): Omit<AfterState, "port"> {
  return {
    lookups: { order: NO_LOOKUP, again: NO_LOOKUP },
    opened: null,
    link: null,
    pictures: {},
    change: { proofId: null, note: "", tried: false },
    answering: null,
    answered: null,
    answerFailed: false,
    again: { state: "idle", orders: [], lines: [], features: [] },
    ask: form(NO_ASK),
    problem: form(NO_PROBLEM),
    extras: { state: "idle", rows: null, today: null, examples: null },
    signIn: { token: null, name: null, state: "idle" },
    query: "",
  };
}

export const useAfter = create<AfterState>(() => ({ port: null, ...initial() }));

const get = () => useAfter.getState();
const set = (patch: Partial<AfterState>) => useAfter.setState(patch);

/** The after-order door: the shop's own, once it is open. */
function port(): AfterPort | null {
  const own = get().port;
  if (own !== null) return own;
  const shop = useShop.getState().port;
  return shop === null ? null : shop.after();
}

/** For tests: back to a fresh page, with this door. */
export function resetAfter(next: AfterPort | null): void {
  for (const url of Object.values(get().pictures)) if (url !== null) revoke(url);
  useAfter.setState({ port: next, ...initial() }, true);
}

function revoke(url: string): void {
  try {
    URL.revokeObjectURL?.(url);
  } catch {
    // not an object URL
  }
}

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
/** An order number as it is written: the studio's prefix, then its number ("BR-2291"). */
const ORDER_NUMBER = /^[A-Z]{1,8}-?\d{1,8}$/;

export const normaliseRef = (ref: string): string => ref.trim().toUpperCase();
export const normaliseEmail = (email: string): string => email.trim().toLowerCase();

/** What the page itself can say of the number and the e-mail before anything is sent. */
export function lookupErrors(lookup: Pick<Lookup, "ref" | "email">): { ref?: "empty" | "shape"; email?: "empty" | "shape" } {
  const ref = normaliseRef(lookup.ref);
  const email = normaliseEmail(lookup.email);
  return {
    ...(ref === "" ? { ref: "empty" as const } : !ORDER_NUMBER.test(ref) ? { ref: "shape" as const } : {}),
    ...(email === "" ? { email: "empty" as const } : !EMAIL.test(email) ? { email: "shape" as const } : {}),
  };
}

function setLookup(key: LookupKey, patch: Partial<Lookup>): void {
  set({ lookups: { ...get().lookups, [key]: { ...get().lookups[key], ...patch } } });
}

export function typeLookup(key: LookupKey, patch: Partial<Pick<Lookup, "ref" | "email" | "digits">>): void {
  setLookup(key, { ...patch, ...("digits" in patch ? { codeErr: null } : { err: null }) });
}

/** The language the shopper reads the shop in: their e-mails come in it. */
function language(): string {
  return document.documentElement.getAttribute("lang") ?? "en-US";
}

/** The number the page last looked for, kept for the tab: a sign-in link opened later opens that order. */
const LOOKED_FOR = "maker.shop.lookedFor";
function remember(ref: string | null): void {
  try {
    if (ref === null) sessionStorage.removeItem(LOOKED_FOR);
    else sessionStorage.setItem(LOOKED_FOR, ref);
  } catch {
    // not kept
  }
}
function remembered(): string | null {
  try {
    return sessionStorage.getItem(LOOKED_FOR);
  } catch {
    return null;
  }
}

/**
 * "E-mail me a code": checked here first, then, when this browser is already
 * signed in as that address, the order is looked for at once; otherwise
 * Adminium e-mails the address a code (the same answer whoever it is).
 */
export async function findOrder(key: LookupKey): Promise<"code" | "open" | "fix" | "failed"> {
  const door = port();
  const lookup = get().lookups[key];
  if (door === null || lookup.busy) return "failed";
  if (Object.keys(lookupErrors(lookup)).length > 0) {
    setLookup(key, { tried: true, err: null });
    return "fix";
  }
  const ref = normaliseRef(lookup.ref);
  const email = normaliseEmail(lookup.email);
  setLookup(key, { tried: false, err: null, busy: true });
  remember(ref);
  try {
    if (door.signedIn()) {
      const mine = await door.myOrders();
      if (mine.some((o) => normaliseEmail(String(o["email"] ?? "")) === email)) return await afterSignIn(key, mine);
    }
    await door.requestCode(email, language());
    sent(key);
    setLookup(key, { step: "code", digits: "", codeErr: null, triesLeft: null, busy: false });
    return "code";
  } catch (error) {
    setLookup(key, { busy: false, err: isShopError(error) && error.refused.code === "PUBLIC_CODE_UNAVAILABLE" ? "noMail" : "unreachable" });
    return "failed";
  }
}

/** A code went: another may be asked for in thirty seconds. */
function sent(key: LookupKey): void {
  const sends = get().lookups[key].sends + 1;
  setLookup(key, { sends, canResend: false });
  setTimeout(() => {
    if (get().lookups[key].sends === sends) setLookup(key, { canResend: true });
  }, 30_000);
}

/** "Send a new code": not before thirty seconds have gone since the last. */
export async function resendCode(key: LookupKey): Promise<boolean> {
  const door = port();
  const lookup = get().lookups[key];
  if (door === null || lookup.busy || !lookup.canResend) return false;
  setLookup(key, { busy: true });
  try {
    await door.requestCode(normaliseEmail(lookup.email), language());
    sent(key);
    setLookup(key, { busy: false, digits: "", codeErr: null, triesLeft: null });
    toast("after.toast.newCode", { ref: normaliseRef(lookup.ref) }, "info");
    return true;
  } catch {
    setLookup(key, { busy: false, codeErr: "unreachable" });
    return false;
  }
}

export function backToFind(key: LookupKey): void {
  setLookup(key, { step: "find", digits: "", codeErr: null, triesLeft: null });
}

/** The code typed back: right, it signs the shopper in and opens the order the number names. */
export async function checkCode(key: LookupKey): Promise<"open" | "fix" | "failed"> {
  const door = port();
  const lookup = get().lookups[key];
  if (door === null || lookup.busy) return "failed";
  if (lookup.digits.length < 6) {
    setLookup(key, { codeErr: "short" });
    return "fix";
  }
  setLookup(key, { busy: true, codeErr: null });
  let answered: CodeAnswer;
  try {
    answered = await door.verifyCode(normaliseEmail(lookup.email), lookup.digits);
  } catch {
    setLookup(key, { busy: false, codeErr: "unreachable" });
    return "failed";
  }
  if (!answered.ok) {
    setLookup(key, { busy: false, codeErr: answered.reason, triesLeft: answered.reason === "wrong" ? answered.triesLeft : null, digits: "" });
    return "fix";
  }
  try {
    return await afterSignIn(key, await door.myOrders());
  } catch {
    setLookup(key, { busy: false, codeErr: "unreachable" });
    return "failed";
  }
}

/** Signed in: the order the number names among the shopper's own, or "we can't find that order with that e-mail". */
async function afterSignIn(key: LookupKey, mine: Row[]): Promise<"open" | "fix"> {
  const lookup = get().lookups[key];
  const ref = normaliseRef(lookup.ref);
  const found = mine.find((o) => normaliseRef(String(o["number"] ?? "")) === ref);
  if (found === undefined) {
    setLookup(key, { step: "find", busy: false, err: "mismatch", digits: "" });
    return "fix";
  }
  setLookup(key, { step: "open", busy: false, digits: "", codeErr: null });
  if (key === "order") await openMine(found);
  else await loadAgain();
  return "open";
}

// ── the order open ─────────────────────────────────────────────────────────

/** The signed-in shopper's order, with its lines, features and proofs. */
export async function openMine(order: Row, again = false): Promise<void> {
  const door = port();
  if (door === null) return;
  // Read again after an answer, the page keeps what it says of the answer, and what it showed meanwhile.
  if (again) set({ opened: { via: "mine", state: "ok", read: get().opened?.read ?? null } });
  else set({ opened: { via: "mine", state: "loading", read: null }, answered: null, answerFailed: false, change: { proofId: null, note: "", tried: false } });
  try {
    const rows = await door.myRows();
    const lines = rows.lines.filter((l) => String(l["order_id"]) === String(order["id"]));
    const ids = new Set(lines.map((l) => String(l["id"])));
    const read: OrderRead = {
      via: "mine",
      order,
      lines,
      features: rows.features.filter((f) => ids.has(String(f["line_id"]))),
      proofs: rows.proofs.filter((p) => String(p["order_id"]) === String(order["id"])),
    };
    set({ opened: { via: "mine", state: "ok", read } });
    void loadPictures(read);
  } catch {
    set({ opened: { via: "mine", state: "failed", read: null } });
  }
}

/** The order the link in its e-mail opens (`/order#<code>`): no code step. */
export async function openOrderLink(token: string): Promise<void> {
  const door = port();
  if (door === null) return;
  set({ link: "opening", opened: { via: "link", state: "loading", read: null }, answered: null, answerFailed: false });
  try {
    const opened = await door.openShared(token);
    if (opened !== "opened") {
      set({ link: opened, opened: null });
      return;
    }
    set({ link: null });
    await readLinked();
  } catch {
    set({ link: null, opened: { via: "link", state: "failed", read: null } });
  }
}

/** The order a link this tab already opened (the confirmation's, or one before a reload). */
export async function readLinked(): Promise<void> {
  const door = port();
  if (door === null) return;
  set({ opened: { via: "link", state: get().opened?.read == null ? "loading" : "ok", read: get().opened?.read ?? null } });
  try {
    const read = await door.readShared();
    set({ opened: read === null ? { via: "link", state: "gone", read: null } : { via: "link", state: "ok", read } });
    if (read !== null) void loadPictures(read);
  } catch {
    set({ opened: { via: "link", state: "failed", read: null } });
  }
}

/** Read the open order again, after an answer. */
async function reread(): Promise<void> {
  const opened = get().opened;
  if (opened?.read == null) return;
  if (opened.via === "link") return readLinked();
  const door = port();
  if (door === null) return;
  const order = (await door.myOrders()).find((o) => String(o["id"]) === String(opened.read!.order["id"]));
  if (order !== undefined) await openMine(order, true);
}

/** The pictures of the proofs waiting on this order. */
async function loadPictures(read: OrderRead): Promise<void> {
  const door = port();
  if (door === null) return;
  for (const proof of read.proofs.filter((p) => p["state"] === "sent")) {
    const id = String(proof["id"]);
    if (id in get().pictures) continue;
    set({ pictures: { ...get().pictures, [id]: null } });
    try {
      const blob = await door.proofPicture(read.via, proof["id"] as Id);
      const url = blob === null || typeof URL.createObjectURL !== "function" ? null : URL.createObjectURL(blob);
      set({ pictures: { ...get().pictures, [id]: url } });
    } catch {
      // drawn from its words instead
    }
  }
}

export function openChange(proofId: string | null): void {
  set({ change: { proofId, note: proofId === get().change.proofId ? get().change.note : "", tried: false } });
}

export function typeChange(note: string): void {
  set({ change: { ...get().change, note } });
}

/** "Yes, make it", or "Send" in the change box: the shopper's answer to one proof, written through their session. */
export async function answerProof(proofId: string, kind: "approved" | "change_asked"): Promise<"done" | "fix" | "failed"> {
  const door = port();
  const opened = get().opened;
  if (door === null || opened?.read == null || get().answering !== null) return "failed";
  const note = get().change.note.trim();
  if (kind === "change_asked" && note === "") {
    set({ change: { ...get().change, tried: true } });
    return "fix";
  }
  const answerTo: ProofAnswer = kind === "approved" ? { state: "approved" } : { state: "change_asked", change_note: note };
  set({ answering: proofId, answerFailed: false });
  try {
    await door.answerProof(opened.via, proofId, answerTo);
    set({ answering: null, answered: kind === "approved" ? "approved" : "changed", change: { proofId: null, note: "", tried: false } });
    await reread();
    return "done";
  } catch {
    set({ answering: null, answerFailed: true });
    return "failed";
  }
}

// ── order again ────────────────────────────────────────────────────────────

/** The orders Order again lists: every one of the signed-in shopper's, or the one its link opened. */
export async function loadAgain(): Promise<void> {
  const door = port();
  if (door === null) return;
  set({ again: { ...get().again, state: "loading" } });
  try {
    if (door.signedIn()) {
      const [orders, rows] = await Promise.all([door.myOrders(), door.myRows()]);
      set({ again: { state: "ok", orders, lines: rows.lines, features: rows.features } });
      return;
    }
    const read = door.sharedHeld() ? await door.readShared() : null;
    set({ again: read === null ? { state: "idle", orders: [], lines: [], features: [] } : { state: "ok", orders: [read.order], lines: read.lines, features: read.features } });
  } catch {
    set({ again: { ...get().again, state: "failed" } });
  }
}

/** The lines of an order the shop can make again today: their piece is still in the shop. */
export function againLines(orderId: unknown, lines: readonly Row[]): Row[] {
  return lines.filter((l) => String(l["order_id"]) === String(orderId) && productById(l["product_id"] as Id) !== null).sort((a, b) => Number(a["position"] ?? 0) - Number(b["position"] ?? 0) || Number(a["id"]) - Number(b["id"]));
}

/**
 * "Put this in the basket": the order's lines as they were (piece, quantity,
 * material, size, finish, words, design, the features it paid for), each a
 * new basket line priced again by the basket's dry run. A design is read by
 * its code, so the basket shows it as it was ordered.
 */
export async function putBack(orderId: unknown): Promise<boolean> {
  const s = get().again;
  const lines = againLines(orderId, s.lines);
  if (lines.length === 0) return false;
  const kept = (id: unknown): Id | null => (id === null || id === undefined || optionById(id as Id) === null ? null : (id as Id));
  const codes = lines.map((l) => (typeof l["design_code"] === "string" && l["design_code"] !== "" ? l["design_code"] : null)).filter((c): c is string => c !== null);
  let designs: SavedDesign[] = [];
  const shop = useShop.getState().port;
  if (codes.length > 0 && shop !== null) designs = await readDesigns(shop.customiser(), codes).catch(() => []);
  const basket: Omit<BasketLine, "id">[] = lines.map((l) => {
    const code = typeof l["design_code"] === "string" && l["design_code"] !== "" ? l["design_code"] : null;
    const design = code === null ? null : (designs.find((d) => d.code === code) ?? { id: l["design_id"] as Id, code, base_id: productById(l["product_id"] as Id)?.baseId ?? 0, ready_design_id: null, values: { parts: {} }, state: "ordered" as const, updatedAt: null, session: null, files: {} });
    const features = s.features.filter((f) => String(f["line_id"]) === String(l["id"])).map((f) => kept(f["option_id"])).filter((id): id is Id => id !== null);
    const lettering = typeof l["lettering"] === "string" && l["lettering"] !== "" ? l["lettering"] : null;
    return { productId: l["product_id"] as Id, qty: Number(l["qty"] ?? 1), materialId: kept(l["material_id"]), sizeId: kept(l["size_id"]), finishId: kept(l["finish_id"]), lettering, design, features };
  });
  if (!addLinesToBasket(basket)) return false;
  toast("after.toast.putBack");
  goView("basket");
  return true;
}

// ── ask us for something, and something's wrong ──────────────────────────

export function typeAsk(patch: Partial<AskValues>): void {
  const ask = get().ask;
  set({ ask: { ...ask, values: { ...ask.values, ...patch }, refused: null } });
}

export function typeProblem(patch: Partial<ProblemValues>): void {
  const problem = get().problem;
  set({ problem: { ...problem, values: { ...problem.values, ...patch }, refused: null } });
}

/** What the page itself can say of "Ask us for something" before it is sent. */
export function askErrors(values: AskValues): Partial<Record<"idea" | "name" | "email", "empty" | "shape">> {
  const email = values.email.trim();
  return {
    ...(values.idea.trim() === "" ? { idea: "empty" as const } : {}),
    ...(values.name.trim() === "" ? { name: "empty" as const } : {}),
    ...(email === "" ? { email: "empty" as const } : !EMAIL.test(email) ? { email: "shape" as const } : {}),
  };
}

/** What the page itself can say of "Something's wrong" before it is sent. */
export function problemErrors(values: ProblemValues): Partial<Record<"ref" | "email" | "name" | "what" | "details", "empty" | "shape">> {
  const lookup = lookupErrors(values);
  return {
    ...(lookup.ref === undefined ? {} : { ref: lookup.ref }),
    ...(lookup.email === undefined ? {} : { email: lookup.email }),
    ...(values.name.trim() === "" ? { name: "empty" as const } : {}),
    ...(values.what === "" ? { what: "empty" as const } : {}),
    ...(values.details.trim() === "" ? { details: "empty" as const } : {}),
  };
}

/** The body "Send it to the studio" writes for a request: only what was typed, trimmed. */
export function askBody(values: AskValues, clientKey: string): Row {
  const out: Row = { name: values.name.trim(), email: values.email.trim(), language: language(), idea: values.idea.trim(), client_key: clientKey };
  if (values.material.trim() !== "") out["material"] = values.material.trim();
  if (values.when.trim() !== "") out["wanted_when"] = values.when.trim();
  return out;
}

/** The body for a problem: the order number as typed, which Adminium finds among the address's own orders. */
export function problemBody(values: ProblemValues, clientKey: string): Row {
  return { order_ref: normaliseRef(values.ref), name: values.name.trim(), email: values.email.trim(), language: language(), what: values.what, details: values.details.trim(), client_key: clientKey };
}

async function sendForm<K extends "ask" | "problem">(key: K, valid: boolean, body: () => Row, write: (door: AfterPort, values: Row) => Promise<Row>): Promise<"sent" | "fix" | "failed"> {
  const door = port();
  const state = get()[key];
  if (door === null || state.sending) return "failed";
  if (!valid) {
    set({ [key]: { ...state, tried: true } } as Partial<AfterState>);
    return "fix";
  }
  set({ [key]: { ...state, tried: true, sending: true, refused: null } } as Partial<AfterState>);
  try {
    const made = await write(door, body());
    set({ [key]: { ...get()[key], sending: false, sent: made, tried: false } } as Partial<AfterState>);
    return "sent";
  } catch (error) {
    const refused = isShopError(error) ? { column: error.refused.column, reason: error.refused.reason, code: error.refused.code } : { column: null, reason: null, code: "UNREACHABLE" };
    set({ [key]: { ...get()[key], sending: false, refused } } as Partial<AfterState>);
    return isShopError(error) ? "fix" : "failed";
  }
}

export function sendAsk(): Promise<"sent" | "fix" | "failed"> {
  const s = get().ask;
  return sendForm("ask", Object.keys(askErrors(s.values)).length === 0, () => askBody(s.values, s.clientKey), (door, values) => door.ask(values));
}

export function sendProblem(): Promise<"sent" | "fix" | "failed"> {
  const s = get().problem;
  return sendForm("problem", Object.keys(problemErrors(s.values)).length === 0, () => problemBody(s.values, s.clientKey), (door, values) => door.report(values));
}

/** "Ask about something else", "Tell us about another one": an empty form, with a new retry key. */
export function againForm(key: "ask" | "problem"): void {
  set(key === "ask" ? { ask: form(NO_ASK) } : { problem: form(NO_PROBLEM) });
}

// ── the footer's pages ─────────────────────────────────────────────────────

/** Today on the studio's own calendar, for an order's "overdue". */
export async function loadToday(): Promise<void> {
  const door = port();
  if (door === null || get().extras.today !== null) return;
  try {
    const now = await door.now();
    set({ extras: { ...get().extras, today: dayIn(now, useShop.getState().config.timezone) } });
  } catch {
    // no "overdue" said without the studio's clock
  }
}

/** The closures, postage rates and machines, read once; and today on the studio's own calendar. */
export async function loadExtras(): Promise<void> {
  const door = port();
  if (door === null || get().extras.state === "loading" || get().extras.state === "ok") return;
  set({ extras: { ...get().extras, state: "loading" } });
  try {
    const [rows, now] = await Promise.all([door.extras(), door.now()]);
    const zone = useShop.getState().config.timezone;
    set({ extras: { ...get().extras, state: "ok", rows, today: dayIn(now, zone) } });
  } catch {
    set({ extras: { ...get().extras, state: "failed" } });
  }
}

/** A moment's day on the studio's own calendar, as `YYYY-MM-DD`. */
export function dayIn(moment: Date, zone: string): string {
  try {
    return new Intl.DateTimeFormat("en-CA", { timeZone: zone, year: "numeric", month: "2-digit", day: "2-digit" }).format(moment);
  } catch {
    return moment.toISOString().slice(0, 10);
  }
}

/**
 * The postage page's "posted by" examples: one dry run of an order of the
 * quickest piece and the slowest, placed now. Adminium dates each line
 * (studio days, the cut-off, the closures); the page says what it answered.
 */
export async function loadExamples(): Promise<void> {
  const shop = useShop.getState();
  if (shop.port === null || shop.catalogue === null || get().extras.examples !== null) return;
  const products = [...shop.catalogue.products].sort((a, b) => a.leadDays - b.leadDays);
  const picks = [products[0], products[products.length - 1]].filter((p, i, all) => p !== undefined && all.findIndex((q) => q?.id === p.id) === i);
  if (picks.length === 0) return;
  const first = (productId: Id, kind: string) => shop.catalogue!.options.find((o) => String(o.productId) === String(productId) && o.kind === kind)?.id;
  const lines = picks.map((p) => {
    const values: Row = { product_id: p!.id, qty: 1 };
    for (const [kind, column] of [["material", "material_id"], ["size", "size_id"], ["finish", "finish_id"]] as const) {
      const option = first(p!.id, kind);
      if (option !== undefined) values[column] = option;
    }
    return { values };
  });
  try {
    const quoted = await shop.port.quote({ values: { ...(shop.serviceId === null ? {} : { service_id: shop.serviceId }), language: language() }, children: { order_lines: lines as never } });
    set({ extras: { ...get().extras, examples: quoted.lines } });
  } catch {
    set({ extras: { ...get().extras, examples: [] } });
  }
}

// ── the sign-in link, Your designs, search ─────────────────────────────────

/** The sign-in link's page (`/c#<code>`): the name it greets, read without using it. */
export async function peekSignIn(token: string): Promise<void> {
  const door = port();
  if (door === null || get().signIn.token === token) return;
  set({ signIn: { token, name: null, state: "peeking" } });
  try {
    const name = await door.peekSignInLink(token);
    set({ signIn: { token, name, state: name === null ? "used" : "ready" } });
  } catch {
    set({ signIn: { token, name: null, state: "ready" } });
  }
}

/** "Continue": the link used, the shopper signed in; their order opens, or their orders to pick from. */
export async function continueSignIn(): Promise<boolean> {
  const door = port();
  const { token } = get().signIn;
  if (door === null || token === null) return false;
  set({ signIn: { ...get().signIn, state: "opening" } });
  try {
    if (!(await door.openSignInLink(token))) {
      set({ signIn: { ...get().signIn, state: "used" } });
      return false;
    }
    set({ signIn: { ...get().signIn, state: "done" } });
    const mine = await door.myOrders();
    const wanted = remembered();
    const found = wanted === null ? undefined : mine.find((o) => normaliseRef(String(o["number"] ?? "")) === wanted);
    goView("order");
    if (found !== undefined) {
      setLookup("order", { step: "open", ref: wanted!, email: String(found["email"] ?? "") });
      await openMine(found);
    } else {
      // No number asked for on this device: their orders, to pick from.
      await loadAgain();
    }
    return true;
  } catch {
    set({ signIn: { ...get().signIn, state: "used" } });
    return false;
  }
}

/** A saved design's own link (`/design#<code>`): kept on this device, so Your designs lists it. */
export async function openDesignLink(token: string): Promise<"opened" | "unknown" | "closed"> {
  const shop = useShop.getState().port;
  if (shop === null) return "unknown";
  const opened = await openSavedLink(shop.customiser(), token).catch(() => "unknown" as const);
  if (typeof opened === "string") return opened;
  keepHeld(opened, null);
  return "opened";
}

export function searchFor(query: string): void {
  set({ query: query.trim() });
  goView("search");
}

/** The design codes the open order's lines name: Your designs reads each by its code. */
export function openCodes(): string[] {
  const read = get().opened?.read;
  return read == null ? [] : read.lines.map((l) => l["design_code"]).filter((c): c is string => typeof c === "string" && c !== "");
}
