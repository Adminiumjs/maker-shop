/**
 * CROSS-ORDER BATCHING (24 D5b), and this is what keeps `maker` distinct from
 * `printing`. State it once, plainly, so a later reader cannot blur the two:
 *
 *   MARLOW PRESS imposes ONE job onto N sheets — a thousand of the same card,
 *   laid up 21-up, run over 48 sheets. The unit of work is a job, and the
 *   question is how many sheets it takes.
 *
 *   BIRCH ROW packs pieces from DIFFERENT ORDERS onto ONE sheet — four
 *   bookmarks for Priya, four coasters for Sam and one cake topper for Theo,
 *   all 3 mm walnut, all on the laser, all cut in one go. The unit of work is
 *   a sheet, and the question is whose pieces share it.
 *
 * That difference is the whole shape of this module: nothing here takes an
 * order and asks what it needs. Everything takes the QUEUE and asks what can
 * travel together.
 *
 * Pure and deterministic, like `calendar.ts` and `orders.ts`: no `Date.now()`,
 * no `Math.random()`, no DOM, no network. Given the same orders it returns the
 * same placements in the same order, which is what lets `batch.test.ts` assert
 * a picture rather than a summary.
 *
 * WHAT DOES AND DOES NOT BATCH. Only SHEET stock does. A slate blank arrives
 * pre-cut and is engraved on its own; filament and glaze are not laid out at
 * all. Grouping them anyway would draw a sheet for pieces that never share
 * one, which is a lie told in a diagram — the most convincing kind.
 */

import {
  PRODUCT_BY_KEY,
  SHEET_USABLE,
  STOCK_BY_KEY,
  type MaterialKey,
  type Product,
  type StockKey,
} from "./catalogue.ts";
import { isLocked, type Order, type OrderLine } from "./orders.ts";

// ── the machines ─────────────────────────────────────────────────────────────

/** The three machines in the unit. Two printers are one queue. */
export const MACHINE_KEYS = ["laser", "printers", "kiln"] as const;
export type MachineKey = (typeof MACHINE_KEYS)[number];

/**
 * Which machine a piece is made on, DERIVED FROM WHAT IT IS MADE OF.
 *
 * Not a field on the product, because it is not an independent fact: a piece
 * cut out of sheet or engraved on a blank goes on the laser, a piece measured
 * in grams comes off a printer, and a piece measured in tubs of glaze is fired.
 * A separate column would be a second copy of the same truth, free to drift
 * from the shelf row that decides it.
 */
export function machineFor(product: Product): MachineKey {
  const row = STOCK_BY_KEY[product.footprint.stockKey];
  if (row === undefined) return "laser";
  switch (row.unit) {
    case "grams":
      return "printers";
    case "tub":
      return "kiln";
    default:
      return "laser";
  }
}

// ── the sheet ────────────────────────────────────────────────────────────────

export interface Sheet {
  widthMm: number;
  heightMm: number;
}

/** The stock sheet the studio buys, and the one every group is packed onto. */
export const SHEET: Sheet = { widthMm: 600, heightMm: 400 };

/**
 * The cut itself takes material away, so two pieces cannot share an edge.
 *
 * 3 mm is the gap Birch Row leaves: a hair over the kerf, which stops a piece
 * being scorched by its neighbour's cut and gives the tabs somewhere to be.
 */
export const KERF_MM = 3;

/**
 * The margin no piece is placed inside.
 *
 * The bed does not reach the last few millimetres and a clamp is sitting on
 * the corner. It is the same fact `SHEET_USABLE` states as a fraction, applied
 * here as geometry, because a packer needs an edge and a shelf needs a ratio.
 */
export const SHEET_MARGIN_MM = 8;

// ── what is waiting to be made ───────────────────────────────────────────────

/**
 * ONE BLANK, from one line, of one order.
 *
 * A set of four coasters is FOUR of these. The packer lays out blanks, not
 * order lines, because a sheet does not know what a set is — and a batch that
 * counted a set of four as one rectangle would come back saying a sheet holds
 * four times what it holds.
 */
export interface QueuedPiece {
  /** Stable and unique: order, line, and which blank of that line. */
  key: string;
  orderRef: string;
  lineId: string;
  productKey: string;
  materialKey: MaterialKey;
  stockKey: StockKey;
  machine: MachineKey;
  widthMm: number;
  heightMm: number;
  /** The customer's own words, carried through to the cut list. */
  note: string;
}

/**
 * Every blank a line puts on the bench, spoilage included.
 *
 * A spoiled blank is a real second piece of material — the piece is re-cut,
 * and the sheet has to hold it.
 */
export function piecesForLine(order: Order, line: OrderLine): QueuedPiece[] {
  const product = PRODUCT_BY_KEY[line.productKey];
  if (product === undefined) return [];
  const foot = product.footprint;
  const count = line.quantity * foot.perUnit + line.spoiled;

  const out: QueuedPiece[] = [];
  for (let i = 0; i < count; i += 1) {
    out.push({
      key: `${order.ref}/${line.id}#${i + 1}`,
      orderRef: order.ref,
      lineId: line.id,
      productKey: product.key,
      materialKey: line.materialKey,
      stockKey: foot.stockKey,
      machine: machineFor(product),
      widthMm: foot.widthMm,
      heightMm: foot.heightMm,
      note: line.note,
    });
  }
  return out;
}

/**
 * Everything queued and free to be made, across every open order.
 *
 * THE PROOF GATE IS APPLIED HERE, not left to the caller. A piece whose
 * picture is still waiting cannot leave *To make* (`orders.ts`), so putting it
 * on a sheet would build a batch that the very next step refuses to start.
 */
export function queuedPieces(orders: readonly Order[]): QueuedPiece[] {
  const out: QueuedPiece[] = [];
  for (const order of orders) {
    if (order.postedIso !== undefined) continue;
    for (const line of order.lines) {
      if (line.stage !== "to-make") continue;
      if (isLocked(line)) continue;
      out.push(...piecesForLine(order, line));
    }
  }
  return out;
}

// ── the groups the bench actually sees ───────────────────────────────────────

/**
 * A machine and a material, with everything queued on it FROM EVERY ORDER.
 *
 * The key is `machine/stock` and never an order reference, which is the whole
 * point: two orders that share a group have never met.
 */
export interface BatchGroup {
  key: string;
  machine: MachineKey;
  stockKey: StockKey;
  pieces: QueuedPiece[];
  /** How many DIFFERENT orders are represented. The headline figure. */
  orderCount: number;
  orderRefs: string[];
}

/**
 * Group the queue by machine and material.
 *
 * Sheet stock only (see the header), and a group with pieces from a single
 * order is still a group — it is a sheet with room on it, and hiding it would
 * hide the reason to wait before cutting.
 *
 * Ordered by how much is waiting, then by key, so the strip above *To make*
 * is stable and puts the fullest sheet first.
 */
export function batchGroups(orders: readonly Order[]): BatchGroup[] {
  const groups = new Map<string, BatchGroup>();

  for (const piece of queuedPieces(orders)) {
    if (STOCK_BY_KEY[piece.stockKey]?.unit !== "sheet") continue;
    const key = `${piece.machine}/${piece.stockKey}`;
    const existing = groups.get(key);
    if (existing === undefined) {
      groups.set(key, {
        key,
        machine: piece.machine,
        stockKey: piece.stockKey,
        pieces: [piece],
        orderCount: 1,
        orderRefs: [piece.orderRef],
      });
    } else {
      existing.pieces.push(piece);
      if (!existing.orderRefs.includes(piece.orderRef)) {
        existing.orderRefs.push(piece.orderRef);
        existing.orderCount += 1;
      }
    }
  }

  return [...groups.values()].sort(
    (a, b) => b.pieces.length - a.pieces.length || a.key.localeCompare(b.key),
  );
}

// ── the packer ───────────────────────────────────────────────────────────────

export interface Placement {
  piece: QueuedPiece;
  /** Millimetres from the sheet's start edge — logical, never "left". */
  xMm: number;
  yMm: number;
  widthMm: number;
  heightMm: number;
  /** Turned a quarter to make it fit. The cut list needs to know. */
  rotated: boolean;
}

export interface Pack {
  sheet: Sheet;
  kerfMm: number;
  placements: Placement[];
  /** What did not fit, in the order it was tried. THE NEXT SHEET'S LIST. */
  overflow: QueuedPiece[];
  /** Area of the placed pieces themselves, kerf and margin excluded. */
  usedMm2: number;
  /** Of the whole sheet, as a percentage, one decimal. */
  sheetUsePct: number;
  leftoverMm2: number;
  /** Distinct orders WITH A PIECE ON THIS SHEET. The cross-order figure. */
  orderRefs: string[];
  /** What the run costs the shelf, in whole sheets. */
  sheetsOffTheShelf: number;
}

/**
 * Shelf packing, tallest first.
 *
 * Deliberately the simple algorithm and not a clever one: it is what a person
 * does with a sheet of ply and a pencil — lay a row of the tallest pieces along
 * the top, start a new row underneath when the row runs out, and put whatever
 * is left on the next sheet. A maker can look at the drawing and see that it is
 * what they would have done, which matters more here than three points of yield
 * that nobody can check by eye.
 *
 * A piece that does not fit as drawn is tried turned a quarter before it is
 * given up on, because that is also what a person does.
 *
 * The sort is by height then width then key: `key` is in there so two identical
 * blanks from different orders never swap places between renders.
 */
export function packSheet(
  pieces: readonly QueuedPiece[],
  sheet: Sheet = SHEET,
  kerfMm: number = KERF_MM,
): Pack {
  const usableW = sheet.widthMm - SHEET_MARGIN_MM * 2;
  const usableH = sheet.heightMm - SHEET_MARGIN_MM * 2;

  const order = [...pieces].sort(
    (a, b) => b.heightMm - a.heightMm || b.widthMm - a.widthMm || a.key.localeCompare(b.key),
  );

  const placements: Placement[] = [];
  const overflow: QueuedPiece[] = [];

  let rowY = SHEET_MARGIN_MM;
  let cursorX = SHEET_MARGIN_MM;
  let rowHeight = 0;

  for (const piece of order) {
    const options: { w: number; h: number; rotated: boolean }[] = [
      { w: piece.widthMm, h: piece.heightMm, rotated: false },
      { w: piece.heightMm, h: piece.widthMm, rotated: true },
    ];

    let placed = false;
    for (const shape of options) {
      if (shape.w > usableW || shape.h > usableH) continue;

      // Room in the row being filled?
      const fitsRow =
        cursorX + shape.w <= SHEET_MARGIN_MM + usableW &&
        rowY + Math.max(rowHeight, shape.h) <= SHEET_MARGIN_MM + usableH;

      if (fitsRow) {
        placements.push({
          piece,
          xMm: cursorX,
          yMm: rowY,
          widthMm: shape.w,
          heightMm: shape.h,
          rotated: shape.rotated,
        });
        cursorX += shape.w + kerfMm;
        rowHeight = Math.max(rowHeight, shape.h);
        placed = true;
        break;
      }

      // Start a new row underneath.
      const nextY = rowHeight === 0 ? rowY : rowY + rowHeight + kerfMm;
      if (nextY + shape.h <= SHEET_MARGIN_MM + usableH) {
        rowY = nextY;
        cursorX = SHEET_MARGIN_MM;
        rowHeight = shape.h;
        placements.push({
          piece,
          xMm: cursorX,
          yMm: rowY,
          widthMm: shape.w,
          heightMm: shape.h,
          rotated: shape.rotated,
        });
        cursorX += shape.w + kerfMm;
        placed = true;
        break;
      }
    }

    if (!placed) overflow.push(piece);
  }

  const usedMm2 = placements.reduce((sum, p) => sum + p.widthMm * p.heightMm, 0);
  const sheetArea = sheet.widthMm * sheet.heightMm;
  const refs: string[] = [];
  for (const placement of placements) {
    if (!refs.includes(placement.piece.orderRef)) refs.push(placement.piece.orderRef);
  }
  refs.sort();

  return {
    sheet,
    kerfMm,
    placements,
    overflow,
    usedMm2,
    sheetUsePct: Math.round((usedMm2 / sheetArea) * 1000) / 10,
    leftoverMm2: sheetArea - usedMm2,
    orderRefs: refs,
    sheetsOffTheShelf:
      usedMm2 === 0 ? 0 : Math.max(1, Math.ceil(usedMm2 / (sheetArea * SHEET_USABLE))),
  };
}

// ── starting the batch ───────────────────────────────────────────────────────

/**
 * How long a run takes, in whole minutes.
 *
 * Setting up costs the same whatever is on the sheet — that is the entire
 * argument for batching — and after that it is area. The numbers are the
 * studio's own rules of thumb rather than anybody's spec sheet, and they are
 * constants so a test can name them.
 */
export const SETUP_MINUTES: Readonly<Record<MachineKey, number>> = {
  laser: 12,
  printers: 20,
  kiln: 45,
};

/** Minutes per 100 cm² of piece, by machine. */
export const MINUTES_PER_DM2: Readonly<Record<MachineKey, number>> = {
  laser: 4,
  printers: 26,
  kiln: 9,
};

export function machineMinutes(machine: MachineKey, areaMm2: number): number {
  return SETUP_MINUTES[machine] + Math.ceil((areaMm2 / 10000) * MINUTES_PER_DM2[machine]);
}

export interface BatchStart {
  /** The orders, with every included piece moved on. */
  orders: Order[];
  /**
   * The lines that ACTUALLY CHANGED STAGE, as `orderRef/lineId`.
   *
   * Read off the new orders rather than off the sheet. It used to be the
   * sheet's placements — every line the packer had put down — which is a
   * different set the moment one of them is not in *To make*: `startBatch`
   * only advances `to-make` lines, so a line already in *Making* stayed where
   * it was and was reported as having moved anyway. The toast then said three
   * orders and two pieces had started when one of them had started earlier.
   */
  movedLines: string[];
  /** The orders those lines came from — again, the ones that really moved. */
  orderRefs: string[];
  pieceCount: number;
  machine: MachineKey;
  /** Machine time this run books. */
  minutes: number;
}

/**
 * START THE BATCH: every included piece moves to *Making* IN ONE ACTION, and
 * the machine is booked for the run.
 *
 * One call, one new array of orders. Not a loop the caller writes over a
 * per-piece mover — a batch that could be half-started is a batch the maker has
 * to reconcile by hand, and the sheet has already been cut by then.
 *
 * A line moves when ANY of its blanks is on the sheet, because the line is the
 * thing the board has a card for. A set of four coasters with one blank on the
 * next sheet is still a set that is now being made.
 *
 * WHAT IT REPORTS IS WHAT IT DID. `movedLines` and `orderRefs` are collected
 * as the stages are rewritten, not copied off the sheet beforehand. Those two
 * lists agreed with the sheet only while every placed line happened to be in
 * *To make*; the guard is `startBatch` reporting a line it did not touch.
 */
export function startBatch(orders: readonly Order[], pack: Pack): BatchStart {
  const onTheSheet = new Set(pack.placements.map((p) => `${p.piece.orderRef}/${p.piece.lineId}`));
  const machine = pack.placements[0]?.piece.machine ?? "laser";
  const moved: string[] = [];

  const next = orders.map((order) => {
    if (!order.lines.some((l) => onTheSheet.has(`${order.ref}/${l.id}`))) return order;
    return {
      ...order,
      lines: order.lines.map((line) => {
        const key = `${order.ref}/${line.id}`;
        if (!onTheSheet.has(key) || line.stage !== "to-make") return line;
        moved.push(key);
        return { ...line, stage: "making" as const };
      }),
    };
  });

  return {
    orders: next,
    movedLines: [...moved].sort(),
    orderRefs: [...new Set(moved.map((key) => key.split("/")[0]!))].sort(),
    pieceCount: pack.placements.length,
    machine,
    minutes: machineMinutes(machine, pack.usedMm2),
  };
}

/**
 * Drop a piece from a sheet by key, and put one back.
 *
 * The batch sheet lets the maker take a piece off — somebody rang up, the
 * board has a knot in it — and packing is a pure function of the list, so
 * "remove" is a filter and nothing else.
 */
export function withoutPieces(
  pieces: readonly QueuedPiece[],
  dropped: ReadonlySet<string>,
): QueuedPiece[] {
  return pieces.filter((p) => !dropped.has(p.key));
}
