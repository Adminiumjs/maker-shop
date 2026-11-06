/**
 * The figures Adminium keeps for Birch Row, worked out the way the manifest's
 * rules say (`src/manifest/tables.ts`): a line's price from its product and
 * options, its quantity break and its features; its weight, the stock it
 * takes and its proof's state; an order's weight, its postage band and its
 * total; a customer's orders; a material's stock from its movements.
 *
 * The screens never work a figure out, so the demo's Adminium has to: this
 * is that half of it. Money is counted in pence and kept as the decimal text
 * the data API answers ("31.28").
 *
 * DEMO BUILD ONLY — nothing in a real build imports it.
 */
import { addDays, isStudioDay, type Closure } from "../studio/time.ts";
import type { Row } from "./sample.ts";

export type Tables = Record<string, Row[]>;

/** Tuesday to Saturday, the 17:00 cut-off: the app's own settings. */
export const STUDIO_DAYS = ["tue", "wed", "thu", "fri", "sat"] as const;
export const CUTOFF = "17:00";

const same = (a: unknown, b: unknown) => a !== null && a !== undefined && b !== null && b !== undefined && String(a) === String(b);
const n = (value: unknown): number => {
  const v = Number(value);
  return value === null || value === undefined || value === "" || !Number.isFinite(v) ? 0 : v;
};
const pence = (value: unknown): number => Math.round(n(value) * 100);
export const money = (p: number): string => (p / 100).toFixed(2);
const fixed = (value: number, places: number): string => value.toFixed(places);
const byId = (rows: readonly Row[], id: unknown): Row | undefined => rows.find((r) => same(r.id, id));

/** The studio's closures in effect, as the calendar reads them. */
export function closuresIn(tables: Tables): Closure[] {
  return (tables["closures"] ?? []).filter((c) => c["active"] !== false).map((c) => ({ from: String(c["from_date"]), to: String(c["to_date"]) }));
}

/** The next studio day after `day`. */
export function nextStudioDay(day: string, closures: readonly Closure[]): string {
  let d = addDays(day, 1);
  for (let guard = 0; !isStudioDay(d, STUDIO_DAYS, closures) && guard < 400; guard += 1) d = addDays(d, 1);
  return d;
}

/**
 * A line's post-by (`addWorkingDays`): counted from the day it came in —
 * that day when it is a studio day and before five, else the next studio
 * day — so many studio days on.
 */
export function postBy(day: string, time: string, lead: number, closures: readonly Closure[]): string {
  let d = isStudioDay(day, STUDIO_DAYS, closures) && time < CUTOFF ? day : nextStudioDay(day, closures);
  for (let left = lead; left > 0; left -= 1) d = nextStudioDay(d, closures);
  return d;
}

/** A line's figures, from its product, its options, its features and its proofs. */
export function deriveLine(line: Row, tables: Tables): void {
  const product = byId(tables["products"] ?? [], line["product_id"]);
  const options = tables["options"] ?? [];
  const delta = (id: unknown) => pence(byId(options, id)?.["price"]);
  const qty = Math.max(1, n(line["qty"]));
  const base = pence(product?.["price"]) + delta(line["material_id"]) + delta(line["size_id"]) + delta(line["finish_id"]);
  const band = options
    .filter((o) => same(o["product_id"], line["product_id"]) && o["kind"] === "break" && o["active"] !== false && n(o["min_qty"]) <= qty)
    .sort((a, b) => n(b["min_qty"]) - n(a["min_qty"]))[0];
  const off = n(band?.["percent_off"]);
  const each = Math.round((base * (100 - off)) / 100);
  const perUnit = product?.["pieces"] === undefined || product["pieces"] === null ? 1 : n(product["pieces"]);
  const pieces = qty * perUnit;
  const features = (tables["order_line_features"] ?? []).filter((f) => same(f["line_id"], line.id));
  const featuresEach = features.reduce((sum, f) => sum + pence(byId(options, f["option_id"])?.["price"]), 0);
  for (const f of features) {
    const option = byId(options, f["option_id"]);
    Object.assign(f, { feature: option?.["feature_code"] ?? null, name: option?.["name"] ?? null, price: money(pence(option?.["price"])) });
  }
  const proofs = (tables["proofs"] ?? []).filter((p) => same(p["line_id"], line.id)).sort((a, b) => n(b["version"]) - n(a["version"]));
  const proofState = proofs[0]?.["state"] ?? null;
  const takesProof = (line["lettering"] !== null && line["lettering"] !== undefined && line["lettering"] !== "") || (line["design_id"] !== null && line["design_id"] !== undefined);
  const order = byId(tables["orders"] ?? [], line["order_id"]);
  Object.assign(line, {
    product_name: product?.["name"] ?? null,
    qty,
    unit_price: money(pence(product?.["price"])),
    material_delta: money(delta(line["material_id"])),
    size_delta: money(delta(line["size_id"])),
    finish_delta: money(delta(line["finish_id"])),
    base_each: money(base),
    break_id: band?.id ?? null,
    percent_off: fixed(off, 2),
    each: money(each),
    pieces_per_unit: perUnit,
    pieces,
    features_each: money(featuresEach),
    features_total: money(featuresEach * pieces),
    line_total: money(each * qty + featuresEach * pieces),
    grams: n(product?.["grams"]),
    weight_g: qty * n(product?.["grams"]),
    stock_per_unit: fixed(n(product?.["stock_per_unit"]), 3),
    stock_use: fixed(qty * n(product?.["stock_per_unit"]), 3),
    lead_days: n(product?.["lead_days"]),
    proof_state: proofState,
    proof_ok: !takesProof ? 1 : proofState === "approved" ? 1 : 0,
    placed_at: order?.["placed_at"] ?? line["placed_at"] ?? null,
    order_number: order?.["number"] ?? null,
    label_code: order?.["number"] === undefined || order["number"] === null ? null : `${String(order["number"])}/${String(line["position"] ?? 1)}`,
    spoiled: n(line["spoiled"]),
  });
}

/** An order's figures, from its lines, the packing and the postage band its weight falls in. */
export function deriveOrder(order: Row, tables: Tables): void {
  const lines = (tables["order_lines"] ?? []).filter((l) => same(l["order_id"], order.id) && l["stage"] !== "cancelled");
  const settings = tables["settings"]?.[0];
  const packing = order["packing_g"] === undefined || order["packing_g"] === null ? n(settings?.["packaging_grams"]) : n(order["packing_g"]);
  const piecesWeight = lines.reduce((sum, l) => sum + n(l["weight_g"]), 0);
  const weight = piecesWeight + packing;
  const rate = (tables["postage_rates"] ?? []).find(
    (r) => same(r["service_id"], order["service_id"]) && n(r["min_grams"]) <= weight && (r["max_grams"] === null || r["max_grams"] === undefined || weight <= n(r["max_grams"])),
  );
  const piecesTotal = lines.reduce((sum, l) => sum + pence(l["line_total"]), 0);
  const postage = pence(rate?.["price"]);
  const postBys = lines.map((l) => l["post_by"]).filter((d): d is string => typeof d === "string").sort();
  Object.assign(order, {
    item_count: lines.reduce((sum, l) => sum + n(l["qty"]), 0),
    pieces_weight_g: piecesWeight,
    packing_g: packing,
    weight_g: weight,
    postage_rate_id: rate?.id ?? null,
    postage: money(postage),
    pieces_total: money(piecesTotal),
    total: money(piecesTotal + postage),
    post_by: postBys[postBys.length - 1] ?? null,
  });
}

/** Every stored figure again, after a write: lines first, then the orders, customers and stock they feed. */
export function deriveAll(tables: Tables): void {
  for (const line of tables["order_lines"] ?? []) deriveLine(line, tables);
  for (const order of tables["orders"] ?? []) deriveOrder(order, tables);
  for (const customer of tables["customers"] ?? []) {
    const orders = (tables["orders"] ?? []).filter((o) => same(o["customer_id"], customer.id));
    Object.assign(customer, { order_count: orders.length, spent: money(orders.reduce((sum, o) => sum + pence(o["total"]), 0)) });
  }
  for (const m of tables["stock_movements"] ?? []) {
    const kind = m["kind"];
    const qty = n(m["qty"]);
    const onHand =
      kind === "received" ? qty : kind === "used" ? -qty : kind === "spoiled" ? -(m["qty"] === null || m["qty"] === undefined ? n(m["units"]) * n(m["per_unit"]) : qty) : kind === "count" ? n(m["counted"]) - n(m["on_hand_before"]) : 0;
    const committed = kind === "committed" ? qty : kind === "released" ? -qty : 0;
    Object.assign(m, { on_hand_change: fixed(onHand, 2), committed_change: fixed(committed, 2), taken: fixed(-onHand, 3) });
  }
  for (const material of tables["materials"] ?? []) {
    const moves = (tables["stock_movements"] ?? []).filter((m) => same(m["material_id"], material.id));
    const onHand = moves.reduce((sum, m) => sum + n(m["on_hand_change"]), 0);
    const committed = moves.reduce((sum, m) => sum + n(m["committed_change"]), 0);
    Object.assign(material, { on_hand: fixed(onHand, 2), committed: fixed(committed, 2), available: fixed(onHand - committed, 2) });
  }
  for (const batch of tables["batches"] ?? []) {
    Object.assign(batch, { piece_count: (tables["order_lines"] ?? []).filter((l) => same(l["batch_id"], batch.id)).length });
  }
}
