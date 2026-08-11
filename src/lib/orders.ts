/**
 * The made-to-order machine (24 D5b).
 *
 * Pure and deterministic, like `calendar.ts`: no `Date.now()`, no `Math.random()`,
 * no DOM, no network. The clock is always passed in, and every date this module
 * produces comes out of the studio calendar rather than out of a weekday count.
 *
 * Three things live here and nothing else does:
 *
 *   1. WHAT A PIECE COSTS — the material and size deltas, and the quantity
 *      breaks at 4, 8 and 12.
 *   2. WHEN IT IS POSTED — the lead time by kind, in STUDIO days, with a
 *      basket's ship-by taken from its longest line.
 *   3. WHERE IT IS ON THE BENCH — the stage machine, THE PROOF GATE, and
 *      spoil-and-remake, which puts a piece back in the queue and takes the
 *      material off the shelf a second time.
 *
 * THERE IS NO FINISHED-GOODS STOCK IN THIS FILE OR ANYWHERE ELSE IN THIS APP.
 * The only inventory is `MATERIAL_STOCK`, and `orders.test.ts` asserts the
 * absence rather than trusting a comment to hold the line.
 */

import {
  BREAK_MULTIPLIER,
  LEAD_STUDIO_DAYS,
  PRODUCT_BY_KEY,
  QUANTITY_BREAKS,
  SHEET_USABLE,
  STOCK_BY_KEY,
  type MaterialKey,
  type Product,
  type StockKey,
  type StockRow,
  type StockUnit,
} from "./catalogue.ts";
import {
  addStudioDays,
  postDay,
  postDayAfter,
  studioDaysBetween,
  type StudioClock,
} from "./calendar.ts";

// ── the shapes an order has ──────────────────────────────────────────────────

/**
 * Where a piece is on the bench. These are the four columns of Today, and they
 * are the only places a piece can be while it is being made.
 */
export const BENCH_COLUMNS = ["to-make", "making", "finishing", "ready-to-post"] as const;
export type BenchColumn = (typeof BENCH_COLUMNS)[number];

/**
 * The state of a piece's proof.
 *
 * `not-needed` is a piece with nothing written on it — a bare herb pot goes
 * straight into the queue. Everything else has to go past the gate.
 */
export type ProofState = "not-needed" | "not-sent" | "waiting" | "approved";

/** The order machine, as 24 D5b writes it. */
export const ORDER_STAGES = [
  "placed",
  "proof_sent",
  "approved",
  "making",
  "finishing",
  "posted",
] as const;
export type OrderStage = (typeof ORDER_STAGES)[number];

export interface OrderLine {
  id: string;
  productKey: string;
  materialKey: MaterialKey;
  sizeKey: string;
  finishKey: string;
  quantity: number;
  /** The customer's own words. Empty when they wrote nothing. */
  note: string;
  stage: BenchColumn;
  proof: ProofState;
  /** Blanks ruined and re-cut. Consumes material a second time. */
  spoiled: number;
}

/** One event in an order's proof history, in the order it happened. */
export interface ProofEvent {
  kind: "accepted" | "sent" | "change-asked" | "approved";
  /** ISO date. */
  at: string;
  /** The customer's words, when they wrote any. */
  note?: string;
}

export interface Order {
  ref: string;
  /** Resolved to a display name by the DataSource; a key in the seed. */
  customer: string;
  email: string;
  /** ISO date the order was placed. */
  placedIso: string;
  lines: OrderLine[];
  proofs: ProofEvent[];
  /** Set once the parcel has actually gone. */
  postedIso?: string;
}

// ── what a piece costs ───────────────────────────────────────────────────────

/** The chosen material and size applied to the piece's base price. */
export function unitPriceCents(
  product: Product,
  materialKey: MaterialKey,
  sizeKey: string,
): number {
  const material = product.materials.find((m) => m.key === materialKey);
  const size = product.sizes.find((s) => s.key === sizeKey);
  return product.basePriceCents + (material?.deltaCents ?? 0) + (size?.deltaCents ?? 0);
}

/**
 * The break that applies to a quantity, and what each piece costs at it.
 *
 * The break is the largest one at or below the quantity, so eleven is priced at
 * the eight break rather than falling back to the one-off price — a customer
 * who orders eleven has still done most of the work of ordering eight.
 */
export function breakFor(quantity: number): number {
  let hit = QUANTITY_BREAKS[0]!;
  for (const q of QUANTITY_BREAKS) if (quantity >= q) hit = q;
  return hit;
}

/** The each-price at a quantity, rounded to the cent the customer is charged. */
export function eachPriceCents(unitCents: number, quantity: number): number {
  return Math.round(unitCents * (BREAK_MULTIPLIER[breakFor(quantity)] ?? 1));
}

/** What one basket or order line comes to. */
export function lineTotalCents(line: {
  productKey: string;
  materialKey: MaterialKey;
  sizeKey: string;
  quantity: number;
}): number {
  const product = PRODUCT_BY_KEY[line.productKey];
  if (product === undefined) return 0;
  const unit = unitPriceCents(product, line.materialKey, line.sizeKey);
  return eachPriceCents(unit, line.quantity) * line.quantity;
}

/** What a whole order's pieces come to, before postage. */
export function piecesTotalCents(
  lines: readonly {
    productKey: string;
    materialKey: MaterialKey;
    sizeKey: string;
    quantity: number;
  }[],
): number {
  return lines.reduce((sum, l) => sum + lineTotalCents(l), 0);
}

/** The studio's own two postage options, in cents. */
export const POSTAGE = { second: 395, tracked: 750 } as const;
export type PostageKey = keyof typeof POSTAGE;

// ── when it is posted ────────────────────────────────────────────────────────

/** How many STUDIO days a piece sits on the bench. */
export function leadDaysFor(productKey: string): number {
  const product = PRODUCT_BY_KEY[productKey];
  if (product === undefined) return 0;
  return LEAD_STUDIO_DAYS[product.leadKind];
}

/**
 * A basket's lead time is its LONGEST line, not its average and not its first.
 *
 * One glazed mug in a basket of coasters makes the whole parcel a ten-day
 * parcel, because it goes in one box and the box leaves when the slowest thing
 * in it is finished.
 */
export function longestLeadDays(lines: readonly { productKey: string }[]): number {
  return lines.reduce((most, l) => Math.max(most, leadDaysFor(l.productKey)), 0);
}

/** The date a basket is posted by, from the pinned clock and the studio week. */
export function shipByFor(
  lines: readonly { productKey: string }[],
  now: StudioClock,
): string | null {
  const lead = longestLeadDays(lines);
  return lead === 0 ? null : postDay(now, lead);
}

/**
 * The date an order already on the bench is posted by.
 *
 * Counted from the day it was PLACED rather than from today, because the
 * promise was made then and moving it silently when the clock advances is how
 * an app stops being able to tell anyone it is late.
 */
export function shipByForOrder(order: Order): string {
  const lead = longestLeadDays(order.lines);
  // Placed dates in the seed are studio days, and an order placed before the
  // cut-off starts the same day — so the clock passed here is that morning.
  return postDay({ iso: order.placedIso, hour: 9, minute: 0 }, lead);
}

export type ShipState = "ahead" | "due-soon" | "late";

/** How a ship-by chip reads against today: `--warn` at one studio day, `--danger` past it. */
export function shipState(shipByIso: string, todayIso: string): ShipState {
  const days = studioDaysBetween(todayIso, shipByIso);
  if (days < 0) return "late";
  if (days <= 1) return "due-soon";
  return "ahead";
}

// ── the proof gate ───────────────────────────────────────────────────────────

/** Whether a line still needs its picture approving before it can be made. */
export function isLocked(line: OrderLine): boolean {
  return line.proof === "not-sent" || line.proof === "waiting";
}

export type MoveResult =
  | { ok: true; stage: BenchColumn }
  | {
      ok: false;
      /** What is missing, so the caller can pick an icon as well as a sentence. */
      missing: "proof-not-sent" | "proof-not-approved";
      /** i18n key under `gate.*`. The refusal always NAMES what is missing. */
      reasonKey: string;
    };

/**
 * Move a piece to a bench column.
 *
 * THE PROOF GATE: a piece cannot leave *To make* until its proof is approved,
 * and the refusal SAYS WHY — whether the picture has not been sent yet or has
 * been sent and is waiting on a reply. A silent bounce is the worst thing a
 * drag-and-drop board can do, because the maker is left guessing whether the
 * app or their hand was at fault, and the two refusals need different actions
 * from them, so one sentence for both would not be good enough either.
 */
export function moveLine(line: OrderLine, to: BenchColumn): MoveResult {
  if (line.stage === to) return { ok: true, stage: to };

  if (line.stage === "to-make" && isLocked(line)) {
    return line.proof === "not-sent"
      ? { ok: false, missing: "proof-not-sent", reasonKey: "gate.noProofSent" }
      : { ok: false, missing: "proof-not-approved", reasonKey: "gate.awaitingApproval" };
  }

  return { ok: true, stage: to };
}

/** Whether every piece in an order has cleared the gate. */
export function allProofsSettled(order: Order): boolean {
  return order.lines.every((l) => !isLocked(l));
}

// ── the order machine ────────────────────────────────────────────────────────

const COLUMN_RANK: Readonly<Record<BenchColumn, number>> = {
  "to-make": 0,
  making: 1,
  finishing: 2,
  "ready-to-post": 3,
};

/** The furthest column any piece in the order has reached. */
export function furthestColumn(order: Order): BenchColumn {
  return order.lines.reduce<BenchColumn>(
    (best, l) => (COLUMN_RANK[l.stage] > COLUMN_RANK[best] ? l.stage : best),
    "to-make",
  );
}

/**
 * Where the whole order is, derived from its pieces rather than stored beside
 * them. Two places holding the same fact is how they come to disagree.
 */
export function orderStage(order: Order): OrderStage {
  if (order.postedIso !== undefined) return "posted";
  const furthest = furthestColumn(order);
  if (furthest === "finishing" || furthest === "ready-to-post") return "finishing";
  if (furthest === "making") return "making";
  if (order.lines.some((l) => l.proof === "waiting")) return "proof_sent";
  if (order.lines.some((l) => l.proof === "approved")) return "approved";
  return "placed";
}

/** The five steps the shopper's stage strip shows, in order. */
export const SHOPPER_STAGES = ["accepted", "proof", "making", "finishing", "posted"] as const;
export type ShopperStage = (typeof SHOPPER_STAGES)[number];

/**
 * The date under each of the five steps, in `SHOPPER_STAGES` order.
 *
 * IT LIVES HERE RATHER THAN IN THE SCREEN, AND THAT IS THE GUARD (criterion 13).
 * The order view used to build this array inline, which put five dates' worth of
 * calendar arithmetic in a `.tsx` file — and swapping one `addStudioDays` for
 * `addDays` there passed the whole suite while quietly printing "Sun, 9 Aug"
 * under a bench the shopper has been told is shut on Sundays. Nothing in
 * `screens/` counts days now; `sources.test.ts` asserts that, and this function
 * is asserted to land every date it returns on a day the bench runs.
 *
 * Two of the five are RECORDED rather than computed — the day the order was
 * placed and the day the picture went out — and they are still normalised
 * through the studio week, because a stored date is exactly the kind of value
 * that arrives from somewhere this calendar did not write it.
 */
export function shopperStageDates(order: Order): string[] {
  const lead = longestLeadDays(order.lines);
  const placed = addStudioDays(order.placedIso, 0);
  const proofSent = order.proofs.find((p) => p.kind === "sent")?.at ?? order.placedIso;
  return [
    placed,
    addStudioDays(proofSent, 0),
    // On the bench the next studio day, whatever the calendar says next.
    addStudioDays(placed, 1),
    // Off the bench: the start day counts as the first of the lead days.
    addStudioDays(placed, Math.max(0, lead - 1)),
    addStudioDays(order.postedIso ?? shipByForOrder(order), 0),
  ];
}

/** How many of the five steps are done. Index 0 — accepted — is always done. */
export function shopperStageIndex(order: Order): number {
  const stage = orderStage(order);
  switch (stage) {
    case "posted":
      return 4;
    case "finishing":
      return 3;
    case "making":
      return 2;
    case "approved":
      return 1;
    case "proof_sent":
    case "placed":
      return 0;
  }
}

/** Send the picture. Every line that needs one starts waiting on a reply. */
export function sendProof(order: Order, todayIso: string): Order {
  return {
    ...order,
    lines: order.lines.map((l) => (l.proof === "not-sent" ? { ...l, proof: "waiting" } : l)),
    proofs: [...order.proofs, { kind: "sent", at: todayIso }],
  };
}

/** The customer says yes. Everything waiting goes into the queue. */
export function approveProof(order: Order, todayIso: string): Order {
  return {
    ...order,
    lines: order.lines.map((l) => (l.proof === "waiting" ? { ...l, proof: "approved" } : l)),
    proofs: [...order.proofs, { kind: "approved", at: todayIso }],
  };
}

/**
 * The customer asks for a change.
 *
 * The note is REQUIRED — a change with no words is a piece the maker cannot
 * act on — so this refuses an empty one by returning the order unchanged, and
 * the caller's own guard says so in the UI before it ever gets here.
 */
export function askForChange(order: Order, note: string, todayIso: string): Order {
  const trimmed = note.trim();
  if (trimmed === "") return order;
  return {
    ...order,
    proofs: [...order.proofs, { kind: "change-asked", at: todayIso, note: trimmed }],
  };
}

/**
 * A piece is spoiled: it goes back to the start of the queue AND it takes the
 * material a second time.
 *
 * This is the one bench action that changes a number the customer never sees.
 * The price does not move — Birch Row cut it wrong, so Birch Row pays for the
 * board — but the shelf does, which is why `spoiled` is carried on the line and
 * folded into `consumptionForLine` rather than logged and forgotten.
 */
export function spoilAndRemake(order: Order, lineId: string, blanks: number): Order {
  if (!Number.isFinite(blanks) || blanks <= 0) return order;
  return {
    ...order,
    lines: order.lines.map((l) =>
      l.id === lineId
        ? { ...l, stage: "to-make", spoiled: l.spoiled + Math.floor(blanks) }
        : l,
    ),
  };
}

/** Mark the parcel gone. The only place `postedIso` is ever set. */
export function markPosted(order: Order, todayIso: string): Order {
  return {
    ...order,
    postedIso: todayIso,
    lines: order.lines.map((l) => ({ ...l, stage: "ready-to-post" })),
  };
}

/** The day this order actually goes in the post, given the day it is finished. */
export function postDayFor(finishedIso: string): string {
  return postDayAfter(finishedIso);
}

// ── materials, which are the only stock this app has ─────────────────────────

export interface Consumption {
  stockKey: StockKey;
  unit: StockUnit;
  /** Sheets, blanks, grams or tubs — whatever that row is counted in. */
  amount: number;
}

/**
 * What one line takes off the shelf, spoilage included.
 *
 * Sheet stock is the interesting one: a set of four coasters is four blanks,
 * and four blanks is however much of a sheet they cover once the clamps and the
 * edge waste are off. Rounded UP and never below one, because half a sheet is
 * not a thing you can put back.
 */
export function consumptionForLine(line: {
  productKey: string;
  quantity: number;
  spoiled?: number;
}): Consumption | null {
  const product = PRODUCT_BY_KEY[line.productKey];
  if (product === undefined) return null;
  const foot = product.footprint;
  const row = STOCK_BY_KEY[foot.stockKey];
  if (row === undefined) return null;

  const blanks = line.quantity * foot.perUnit + (line.spoiled ?? 0);

  switch (row.unit) {
    case "sheet": {
      const sheetArea = (row.sheetWidthMm ?? 600) * (row.sheetHeightMm ?? 400) * SHEET_USABLE;
      const needed = blanks * foot.widthMm * foot.heightMm;
      return { stockKey: foot.stockKey, unit: "sheet", amount: Math.max(1, Math.ceil(needed / sheetArea)) };
    }
    case "blank":
      return { stockKey: foot.stockKey, unit: "blank", amount: blanks };
    case "grams":
      return { stockKey: foot.stockKey, unit: "grams", amount: blanks * (foot.grams ?? 0) };
    case "tub":
      return {
        stockKey: foot.stockKey,
        unit: "tub",
        amount: Math.round(blanks * (foot.tubs ?? 0) * 100) / 100,
      };
  }
}

/** Everything one order takes off the shelf, one row per stock. */
export function consumptionForOrder(order: Order): Consumption[] {
  const out: Consumption[] = [];
  for (const line of order.lines) {
    const c = consumptionForLine(line);
    if (c === null) continue;
    const existing = out.find((o) => o.stockKey === c.stockKey);
    if (existing === undefined) out.push({ ...c });
    else existing.amount = Math.round((existing.amount + c.amount) * 100) / 100;
  }
  return out;
}

export interface StockLine extends StockRow {
  /** Committed to pieces that are still on the bench. */
  committed: number;
  /**
   * On hand minus committed.
   *
   * NOT called `free`: 17 §2's release grep reads built output for `free` as a
   * SUBSTRING, and a column header is exactly the kind of word that ships. The
   * shelf still means the same thing, and the app says "to use" where a person
   * would say the other word.
   */
  spare: number;
  belowReorder: boolean;
}

/**
 * The materials screen's three numbers: on hand, committed to the queue, spare.
 *
 * Only open orders commit anything — once a parcel has gone, the board it was
 * cut from went with it.
 */
export function stockLines(rows: readonly StockRow[], orders: readonly Order[]): StockLine[] {
  const open = orders.filter((o) => o.postedIso === undefined);

  return rows.map((row) => {
    let committed = 0;
    for (const order of open) {
      for (const line of order.lines) {
        const c = consumptionForLine(line);
        if (c !== null && c.stockKey === row.key) committed += c.amount;
      }
    }
    committed = Math.round(committed * 100) / 100;
    const spare = Math.round((row.onHand - committed) * 100) / 100;
    return { ...row, committed, spare, belowReorder: spare <= row.reorderAt };
  });
}

/**
 * Whether a material is running short.
 *
 * The shop uses this for ONE quiet line — "made in small batches while the ply
 * lasts" — and never for a scarcity badge or a count. Inventing urgency is not
 * this shop's voice, and a shopper cannot act on a sheet count anyway.
 */
export function materialRunningLow(
  materialKey: MaterialKey,
  lines: readonly StockLine[],
): boolean {
  const prefix: Partial<Record<MaterialKey, string>> = {
    walnut: "walnut",
    ply: "ply",
    slate: "slate",
    acrylic: "acrylic",
    resin: "pla",
    stoneware: "glaze",
  };
  const match = prefix[materialKey];
  if (match === undefined) return false;
  return lines.some((l) => l.key.startsWith(match) && l.belowReorder);
}

/**
 * What a parcel weighs, in grams.
 *
 * A printed piece is its filament; anything cut out of sheet or slate is its
 * area against a rule of thumb the studio arrived at by weighing a few — and
 * then a fixed allowance for the box, the wool and the card. It is the maker's
 * own estimate rather than a scale reading, which is exactly what it is used
 * for: choosing between two postage options before the parcel is made up.
 */
export const PACKAGING_GRAMS = 120;

export function parcelGrams(lines: readonly OrderLine[]): number {
  let grams = PACKAGING_GRAMS;
  for (const line of lines) {
    const product = PRODUCT_BY_KEY[line.productKey];
    if (product === undefined) continue;
    const foot = product.footprint;
    const each = foot.grams ?? Math.round((foot.widthMm * foot.heightMm) / 900);
    grams += each * line.quantity * foot.perUnit;
  }
  return grams;
}

// ── the bench's counters ─────────────────────────────────────────────────────

export interface BenchKpis {
  /** Pieces whose ship-by is today. */
  dueToday: number;
  /** Orders waiting on a customer to approve a picture. */
  waitingOnCustomer: number;
  /** Orders already past their ship-by. */
  late: number;
  /** Pieces sitting in the queue, across every order. */
  inQueue: number;
}

export function benchKpis(orders: readonly Order[], todayIso: string): BenchKpis {
  const open = orders.filter((o) => o.postedIso === undefined);
  let dueToday = 0;
  let late = 0;
  let waitingOnCustomer = 0;
  let inQueue = 0;

  for (const order of open) {
    const shipBy = shipByForOrder(order);
    const days = studioDaysBetween(todayIso, shipBy);
    if (days === 0) dueToday += 1;
    if (days < 0) late += 1;
    if (order.lines.some((l) => l.proof === "waiting" || l.proof === "not-sent")) {
      waitingOnCustomer += 1;
    }
    inQueue += order.lines.filter((l) => l.stage !== "ready-to-post").length;
  }

  return { dueToday, waitingOnCustomer, late, inQueue };
}
