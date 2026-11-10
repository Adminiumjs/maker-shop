/**
 * What the studio's screens read off the rows: which line is where on the
 * bench, which is held back by its proof, which proofs wait and which are
 * still to send, what goes in today's post. Every figure here is a count of
 * rows or a stored column; no price, total, weight or date is worked out in
 * the browser.
 */
import type { StudioData } from "./door.ts";
import { dayOf, num, same, text, type Id, type Row } from "./wire.ts";
import { addDays, dayStartIn, studioDaysBetween, type Closure, type Day } from "./time.ts";

/** The bench's four columns, in order. */
export const BENCH = ["make", "making", "finishing", "ready"] as const;
export type BenchStage = (typeof BENCH)[number];

/** The moves a line's stage takes, as the manifest's states give them (`order_lines.states.moves`). */
export const LINE_MOVES: Readonly<Record<string, readonly string[]>> = {
  make: ["making", "cancelled"],
  making: ["finishing", "ready", "make"],
  finishing: ["ready", "make"],
  ready: ["posted", "make"],
};

/** The moves an order's status takes (`orders.states.moves`). */
export const ORDER_MOVES: Readonly<Record<string, readonly string[]>> = {
  placed: ["making", "cancelled"],
  making: ["ready", "cancelled"],
  ready: ["posted", "making"],
};

/**
 * The stages a line passes through to reach `to` from `from`, shortest first
 * (`finishing` to `making` goes back to `make` and on again, through the
 * proof's gate). Empty when it is already there; null when it cannot go.
 */
export function pathOf(from: string, to: string, moves: Readonly<Record<string, readonly string[]>> = LINE_MOVES): string[] | null {
  if (from === to) return [];
  const seen = new Map<string, string[]>([[from, []]]);
  const queue = [from];
  while (queue.length > 0) {
    const at = queue.shift()!;
    for (const next of moves[at] ?? []) {
      if (seen.has(next)) continue;
      const path = [...seen.get(at)!, next];
      if (next === to) return path;
      seen.set(next, path);
      queue.push(next);
    }
  }
  return null;
}

/** Whether a line is still on the bench or on its way to the post. */
export const isLive = (line: Row): boolean => line["stage"] !== "posted" && line["stage"] !== "cancelled";

/** Whether a line has anything on it to proof: words, or a design of the Customiser's. */
export const takesProof = (line: Row): boolean => text(line["lettering"]) !== null || (line["design_id"] !== null && line["design_id"] !== undefined) || text(line["design_code"]) !== null;

/**
 * Why a line may not pass "make", as Adminium says it (`proof_ok`): its proof
 * is waiting on the customer, or no proof has gone (or a change was asked).
 * Null when it may go.
 */
export function lockOf(line: Row): "waiting" | "unsent" | null {
  if (num(line["proof_ok"]) === 1) return null;
  if (!takesProof(line)) return null;
  return line["proof_state"] === "sent" ? "waiting" : "unsent";
}

/** The studio days a proof waits before a reminder is offered: the studio's own setting (3 when it says none). */
export function reminderDays(data: StudioData): number {
  const days = num(data.settings?.["proof_reminder_days"]);
  return days === null || days < 1 ? 3 : days;
}

/** A line's proofs, newest first. */
export function proofsOf(data: StudioData, line: Row): Row[] {
  return data.proofs.filter((p) => same(p["line_id"], line.id)).sort((a, b) => (num(b["version"]) ?? 0) - (num(a["version"]) ?? 0));
}

/** The order a row belongs to. */
export const orderOf = (data: StudioData, orderId: unknown): Row | undefined => data.orders.find((o) => same(o.id, orderId));
export const linesOf = (data: StudioData, order: Row): Row[] => data.lines.filter((l) => same(l["order_id"], order.id)).sort((a, b) => (num(a["position"]) ?? 0) - (num(b["position"]) ?? 0) || Number(a.id) - Number(b.id));
/**
 * The code on a line's label, "BR-2291/1", as Adminium works it out from the order's number and the line's place on
 * it: what tells two lines of one order apart. The order's number where Adminium has given the line none.
 */
export const lineCode = (order: Row, line: Row): string => text(line["label_code"]) ?? text(order["number"]) ?? "";
export const productOf = (data: StudioData, line: Row): Row | undefined => data.products.find((p) => same(p.id, line["product_id"]));
export const optionOf = (data: StudioData, id: unknown): Row | undefined => data.options.find((o) => same(o.id, id));
export const materialOf = (data: StudioData, id: unknown): Row | undefined => data.materials.find((m) => same(m.id, id));
export const serviceOf = (data: StudioData, order: Row): Row | undefined => data.services.find((s) => same(s.id, order["service_id"]));

/** The material a line is cut from: its material option's, else its product's. */
export function lineMaterial(data: StudioData, line: Row): Row | undefined {
  const option = optionOf(data, line["material_id"]);
  const id = option?.["material_id"] ?? productOf(data, line)?.["material_id"];
  return materialOf(data, id);
}

/** The newest version of a line's design: what its proof is made from. */
export function versionOf(data: StudioData, line: Row): Row | undefined {
  return data.versions.filter((v) => same(v["design_id"], line["design_id"])).sort((a, b) => (num(b["version"]) ?? 0) - (num(a["version"]) ?? 0))[0];
}

/** The id of a stored file, from the value its column holds (`…/api/v1/files/<id>/content`, or the id itself). */
export function fileIdOf(ref: unknown): string | null {
  const value = text(ref);
  if (value === null) return null;
  const m = /(file_[0-9A-HJKMNP-TV-Z]{26})/.exec(value);
  return m === null ? null : m[1]!;
}

/** Where a stored file is read from, at this origin: its content route, whatever spelling its column keeps. */
export function fileSrc(ref: unknown): string | null {
  const id = fileIdOf(ref);
  if (id !== null) return `/api/v1/files/${id}/content`;
  return text(ref);
}

/** The studio's closures in effect, as days. */
export function closuresOf(data: StudioData): Closure[] {
  return data.closures.filter((c) => c["active"] !== false).flatMap((c) => {
    const from = dayOf(c["from_date"]);
    const to = dayOf(c["to_date"]) ?? from;
    return from === null || to === null ? [] : [{ from, to }];
  });
}

/** Where a post-by stands against today: past it, today or the next studio day, or later. */
export function postTone(postBy: Day | null, today: Day, studioDays: readonly string[], closures: readonly Closure[]): "late" | "soon" | "later" {
  if (postBy === null) return "later";
  if (postBy < today) return "late";
  return studioDaysBetween(today, postBy, studioDays, closures) <= 1 ? "soon" : "later";
}

/** A board's lines by column: every live line in a bench stage. */
export function bench(data: StudioData): Record<BenchStage, Row[]> {
  const out: Record<BenchStage, Row[]> = { make: [], making: [], finishing: [], ready: [] };
  for (const line of data.lines) {
    const stage = line["stage"] as BenchStage;
    if (stage in out) out[stage].push(line);
  }
  for (const stage of BENCH) out[stage].sort((a, b) => String(dayOf(a["post_by"]) ?? "9").localeCompare(String(dayOf(b["post_by"]) ?? "9")) || Number(a.id) - Number(b.id));
  return out;
}

/**
 * Today's four counts: pieces due, orders waiting on a customer, pieces late, machine time booked (minutes).
 * A piece is late while it is not posted by its post-by, made and waiting by the door too, as its card says. The
 * machine time is what of each run falls in today, in the studio's zone: a firing that runs on past midnight counts
 * on both days.
 */
export function kpis(data: StudioData, today: Day, zone: string): { due: number; waiting: number; late: number; bookedMinutes: number } {
  let due = 0;
  let late = 0;
  for (const line of data.lines) {
    if (!isLive(line)) continue;
    const postBy = dayOf(line["post_by"]);
    if (postBy === null) continue;
    const qty = num(line["qty"]) ?? 0;
    if (postBy < today) late += qty;
    else if (postBy === today && line["stage"] !== "ready") due += qty;
  }
  const waiting = new Set(data.lines.filter((l) => isLive(l) && l["proof_state"] === "sent").map((l) => String(l["order_id"]))).size;
  const opens = dayStartIn(today, zone);
  const closes = dayStartIn(addDays(today, 1), zone);
  let bookedMinutes = 0;
  for (const b of data.bookings) {
    if (b["kind"] !== undefined && b["kind"] !== "run") continue;
    const from = Date.parse(text(b["starts_at"]) ?? "");
    const to = Date.parse(text(b["ends_at"]) ?? "");
    if (Number.isNaN(from) || Number.isNaN(to)) continue;
    bookedMinutes += Math.max(0, Math.round((Math.min(to, closes) - Math.max(from, opens)) / 60_000));
  }
  return { due, waiting, late, bookedMinutes };
}

/** A line on the Proofs screen: its latest proof, and whether it waits on the customer or on the studio. */
export interface ProofItem {
  order: Row;
  line: Row;
  latest: Row | undefined;
}

/** The Proofs screen: what waits on a customer's answer, and what the studio has still to send. */
export function proofQueue(data: StudioData): { waiting: ProofItem[]; unsent: ProofItem[] } {
  const waiting: ProofItem[] = [];
  const unsent: ProofItem[] = [];
  for (const line of data.lines) {
    if (!isLive(line) || !takesProof(line) || num(line["proof_ok"]) === 1) continue;
    const order = orderOf(data, line["order_id"]);
    if (order === undefined) continue;
    const latest = proofsOf(data, line)[0];
    (latest?.["state"] === "sent" ? waiting : unsent).push({ order, line, latest });
  }
  const sentAt = (item: ProofItem) => text(item.latest?.["sent_at"]) ?? "";
  waiting.sort((a, b) => sentAt(a).localeCompare(sentAt(b)));
  return { waiting, unsent };
}

/** The lines of an order a proof can go for now: words or a design, not yet approved. */
export const dueForProof = (data: StudioData, order: Row): Row[] => linesOf(data, order).filter((l) => isLive(l) && takesProof(l) && num(l["proof_ok"]) !== 1);

/** Today's post: every order whose live lines are all ready, oldest post-by first. */
export function postRun(data: StudioData): Row[] {
  return data.orders
    .filter((o) => {
      if (o["status"] !== "ready") return false;
      const live = linesOf(data, o).filter(isLive);
      return live.length > 0 && live.every((l) => l["stage"] === "ready");
    })
    .sort((a, b) => String(dayOf(a["post_by"]) ?? "").localeCompare(String(dayOf(b["post_by"]) ?? "")) || Number(a.id) - Number(b.id));
}

/** How many of a product are queued: units on lines not yet ready or posted. */
export function queued(data: StudioData, productId: Id): number {
  return data.lines.filter((l) => same(l["product_id"], productId) && isLive(l) && l["stage"] !== "ready").reduce((sum, l) => sum + (num(l["qty"]) ?? 0), 0);
}

/** A person's orders, newest first. */
export function ordersOfCustomer(data: StudioData, customer: Row): Row[] {
  return data.orders.filter((o) => same(o["customer_id"], customer.id)).sort((a, b) => String(text(b["placed_at"]) ?? "").localeCompare(String(text(a["placed_at"]) ?? "")));
}

/** What a person usually orders: the material of most of the units on their orders' lines. */
export function usualMaterial(data: StudioData, orders: readonly Row[]): Row | undefined {
  const units = new Map<string, number>();
  for (const order of orders) {
    for (const line of linesOf(data, order)) {
      const material = lineMaterial(data, line);
      if (material === undefined) continue;
      units.set(String(material.id), (units.get(String(material.id)) ?? 0) + (num(line["qty"]) ?? 0));
    }
  }
  const top = [...units].sort((a, b) => b[1] - a[1])[0];
  return top === undefined ? undefined : materialOf(data, top[0]);
}
