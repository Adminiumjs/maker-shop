/**
 * The batcher's suite (24 acceptance criterion 15).
 *
 * The criterion asks for one thing above all: that a pack draws pieces from AT
 * LEAST THREE DIFFERENT ORDERS onto ONE sheet, returns placements, sheet-use
 * and an overflow list, and that "Start the batch" moves every included piece
 * in ONE action. Everything below builds to that, and the three-order case is
 * driven off the SEED rather than off a fixture — a hand-written queue would
 * prove the packer works on a queue somebody wrote for it, which is not the
 * claim. If the seed ever stops holding three orders' worth of walnut, this
 * suite goes red, which is correct: the demo would no longer show the thing.
 */

import { describe, expect, it } from "vitest";

import { ORDERS } from "../data/demo.ts";
import { PRODUCT_BY_KEY, STOCK_BY_KEY } from "./catalogue.ts";
import {
  KERF_MM,
  MINUTES_PER_DM2,
  SETUP_MINUTES,
  SHEET,
  SHEET_MARGIN_MM,
  batchGroups,
  machineFor,
  machineMinutes,
  packSheet,
  piecesForLine,
  queuedPieces,
  startBatch,
  withoutPieces,
  type QueuedPiece,
} from "./batch.ts";
import { isLocked, type Order } from "./orders.ts";
import { bench } from "../i18n/strings/bench.ts";

/** The seed as the store gets it — customer keys unresolved, which we never read. */
const SEED: readonly Order[] = ORDERS;

/** The walnut group: the one the bench actually opens first. */
function walnutGroup() {
  const group = batchGroups(SEED).find((g) => g.stockKey === "walnut-3mm");
  expect(group, "the seed no longer queues any 3 mm walnut").toBeDefined();
  return group!;
}

describe("what is waiting to be made", () => {
  it("counts BLANKS and not order lines", () => {
    // A set of four coasters is four rectangles on the sheet. Counting the line
    // once is how a sheet comes back claiming four times the room it has.
    const order = SEED.find((o) => o.ref === "BR-2282")!;
    const line = order.lines[0]!;
    expect(PRODUCT_BY_KEY[line.productKey]!.footprint.perUnit).toBe(4);
    expect(piecesForLine(order, line)).toHaveLength(4 * line.quantity);
  });

  it("adds a spoiled blank, because the sheet has to hold the re-cut", () => {
    const order = SEED.find((o) => o.ref === "BR-2282")!;
    const line = { ...order.lines[0]!, spoiled: 2 };
    expect(piecesForLine(order, line)).toHaveLength(4 * line.quantity + 2);
  });

  it("leaves a locked piece in the queue and off every sheet (the proof gate)", () => {
    // BR-2280's picture has not been sent, so it cannot leave To make — and a
    // sheet that included it would be refused by the very next step.
    const locked = SEED.find((o) => o.ref === "BR-2280")!;
    expect(isLocked(locked.lines[0]!)).toBe(true);
    const keys = queuedPieces(SEED).map((p) => p.orderRef);
    expect(keys).not.toContain("BR-2280");
    // BR-2279 is sent and waiting on a reply — also locked, also absent.
    expect(keys).not.toContain("BR-2279");
  });

  it("leaves pieces already on a machine out of the queue", () => {
    const refs = new Set(queuedPieces(SEED).map((p) => p.orderRef));
    expect(refs.has("BR-2276")).toBe(false); // making
    expect(refs.has("BR-2277")).toBe(false); // finishing
    expect(refs.has("BR-2287")).toBe(false); // packed
  });

  it("sends a piece to the machine its material implies", () => {
    expect(machineFor(PRODUCT_BY_KEY["walnut-coasters"]!)).toBe("laser");
    expect(machineFor(PRODUCT_BY_KEY["herb-pot"]!)).toBe("printers");
    expect(machineFor(PRODUCT_BY_KEY["stoneware-mug"]!)).toBe("kiln");
  });
});

describe("grouping is by machine and material, never by order", () => {
  it("groups only sheet stock — a blank, a filament and a glaze do not lay up", () => {
    for (const group of batchGroups(SEED)) {
      expect(STOCK_BY_KEY[group.stockKey]!.unit).toBe("sheet");
    }
  });

  it("puts three different orders on the walnut group", () => {
    const group = walnutGroup();
    expect(group.orderCount).toBeGreaterThanOrEqual(3);
    expect(new Set(group.pieces.map((p) => p.orderRef)).size).toBe(group.orderCount);
    expect(group.orderRefs).toEqual(expect.arrayContaining(["BR-2281", "BR-2282", "BR-2286"]));
  });

  it("is stable: the fullest sheet first, ties broken by key", () => {
    const once = batchGroups(SEED).map((g) => g.key);
    const twice = batchGroups(SEED).map((g) => g.key);
    expect(twice).toEqual(once);
    const counts = batchGroups(SEED).map((g) => g.pieces.length);
    expect([...counts].sort((a, b) => b - a)).toEqual(counts);
  });
});

describe("packing one sheet (criterion 15)", () => {
  it("draws pieces from at least three different orders onto ONE sheet", () => {
    const group = walnutGroup();
    const pack = packSheet(group.pieces);

    // The headline: one sheet, three customers who have never met.
    expect(pack.orderRefs.length).toBeGreaterThanOrEqual(3);
    expect(pack.orderRefs).toEqual(expect.arrayContaining(["BR-2281", "BR-2282", "BR-2286"]));

    // Placements, sheet-use and an overflow list — the three things the
    // criterion names, all present on the one return value.
    expect(pack.placements.length).toBeGreaterThan(0);
    expect(pack.placements.length + pack.overflow.length).toBe(group.pieces.length);
    expect(pack.sheetUsePct).toBeGreaterThan(0);
    expect(pack.sheetUsePct).toBeLessThan(100);
    expect(pack.usedMm2 + pack.leftoverMm2).toBe(SHEET.widthMm * SHEET.heightMm);
  });

  it("OVERFLOWS THE STUDIO'S OWN SHEET on the seeded bench", () => {
    /*
     * THE HALF OF AC15 A REVIEWER COULD NOT SEE.
     *
     * The overflow list was only ever exercised by handing `packSheet` a
     * made-up 200 × 200 offcut (below). On the seeded bench every batchable
     * group fitted on one sheet with room to spare, so somebody driving the app
     * opened Batch, found "nothing left over" on every group, and had no way to
     * discover that the next-sheet list exists at all. A feature that cannot
     * fire in the demo is a feature the demo does not have.
     *
     * `data/demo.ts` now queues eight sets of walnut coasters for Kestrel
     * House — thirty-two blanks at 95 mm — so the walnut group genuinely runs
     * off the end of a 600 × 400 sheet. THIS CASE IS WHAT KEEPS IT THAT WAY:
     * trim that order back and the demo goes quiet again, and this goes red.
     */
    const group = walnutGroup();
    const pack = packSheet(group.pieces); // the studio's own sheet, not an offcut

    expect(pack.overflow.length).toBeGreaterThan(0);
    expect(pack.placements.length).toBeGreaterThan(0);
    expect(pack.placements.length + pack.overflow.length).toBe(group.pieces.length);
    // Nothing is on both lists.
    const placed = new Set(pack.placements.map((p) => p.piece.key));
    expect(pack.overflow.some((p) => placed.has(p.key))).toBe(false);
    // And the sheet it filled is genuinely full rather than abandoned early.
    expect(pack.sheetUsePct).toBeGreaterThan(50);
  });

  it("puts every piece inside the margins and never on top of another", () => {
    const pack = packSheet(walnutGroup().pieces);
    for (const p of pack.placements) {
      expect(p.xMm).toBeGreaterThanOrEqual(SHEET_MARGIN_MM);
      expect(p.yMm).toBeGreaterThanOrEqual(SHEET_MARGIN_MM);
      expect(p.xMm + p.widthMm).toBeLessThanOrEqual(SHEET.widthMm - SHEET_MARGIN_MM);
      expect(p.yMm + p.heightMm).toBeLessThanOrEqual(SHEET.heightMm - SHEET_MARGIN_MM);
    }

    const overlaps = (a: (typeof pack.placements)[number], b: typeof a) =>
      a.xMm < b.xMm + b.widthMm &&
      b.xMm < a.xMm + a.widthMm &&
      a.yMm < b.yMm + b.heightMm &&
      b.yMm < a.yMm + a.heightMm;

    const clashes: string[] = [];
    for (let i = 0; i < pack.placements.length; i += 1) {
      for (let j = i + 1; j < pack.placements.length; j += 1) {
        if (overlaps(pack.placements[i]!, pack.placements[j]!)) {
          clashes.push(`${pack.placements[i]!.piece.key} · ${pack.placements[j]!.piece.key}`);
        }
      }
    }
    expect(clashes).toEqual([]);
  });

  it("leaves the kerf between neighbours in a row", () => {
    const pack = packSheet(walnutGroup().pieces);
    const row = pack.placements
      .filter((p) => p.yMm === pack.placements[0]!.yMm)
      .sort((a, b) => a.xMm - b.xMm);
    expect(row.length).toBeGreaterThan(1);
    for (let i = 1; i < row.length; i += 1) {
      expect(row[i]!.xMm - (row[i - 1]!.xMm + row[i - 1]!.widthMm)).toBe(KERF_MM);
    }
  });

  it("returns the OVERFLOW LIST for the next sheet when the sheet runs out", () => {
    // A stated sheet size, per D5b — the packer takes one rather than assuming
    // the studio's. An offcut 200 × 200 holds some of the walnut and not the rest.
    const group = walnutGroup();
    const pack = packSheet(group.pieces, { widthMm: 200, heightMm: 200 });
    expect(pack.placements.length).toBeGreaterThan(0);
    expect(pack.overflow.length).toBeGreaterThan(0);
    expect(pack.placements.length + pack.overflow.length).toBe(group.pieces.length);
    // Nothing is on two lists at once.
    const placedKeys = new Set(pack.placements.map((p) => p.piece.key));
    expect(pack.overflow.some((p) => placedKeys.has(p.key))).toBe(false);
  });

  it("turns a piece a quarter rather than giving up on it", () => {
    const long: QueuedPiece = {
      key: "BR-9000/L1#1",
      orderRef: "BR-9000",
      lineId: "L1",
      productKey: "wedding-sign",
      materialKey: "walnut",
      stockKey: "walnut-6mm",
      machine: "laser",
      widthMm: 120,
      heightMm: 380,
      note: "",
    };
    // 380 is taller than the usable height (400 − 16) is not — but on a sheet
    // turned the other way it only fits rotated.
    const pack = packSheet([long], { widthMm: 400, heightMm: 200 });
    expect(pack.overflow).toEqual([]);
    expect(pack.placements[0]!.rotated).toBe(true);
    expect(pack.placements[0]!.widthMm).toBe(380);
  });

  it("gives up honestly on a piece bigger than the sheet", () => {
    const huge: QueuedPiece = { ...walnutGroup().pieces[0]!, widthMm: 900, heightMm: 900 };
    const pack = packSheet([huge], SHEET);
    expect(pack.placements).toEqual([]);
    expect(pack.overflow).toHaveLength(1);
    expect(pack.sheetUsePct).toBe(0);
    expect(pack.sheetsOffTheShelf).toBe(0);
  });

  it("is deterministic — the same queue draws the same sheet twice", () => {
    const group = walnutGroup();
    const a = packSheet(group.pieces);
    const b = packSheet([...group.pieces].reverse());
    expect(b.placements.map((p) => `${p.piece.key}@${p.xMm},${p.yMm}`)).toEqual(
      a.placements.map((p) => `${p.piece.key}@${p.xMm},${p.yMm}`),
    );
    expect(b.sheetUsePct).toBe(a.sheetUsePct);
  });

  it("takes a piece off the sheet and re-packs without it", () => {
    const group = walnutGroup();
    const full = packSheet(group.pieces);
    const dropped = new Set([group.pieces[0]!.key]);
    const smaller = packSheet(withoutPieces(group.pieces, dropped));
    expect(smaller.placements.length).toBe(full.placements.length - 1);
    expect(smaller.usedMm2).toBeLessThan(full.usedMm2);
  });

  it("says what the run costs the shelf in whole sheets", () => {
    const pack = packSheet(walnutGroup().pieces);
    expect(pack.sheetsOffTheShelf).toBe(1);
  });
});

describe("starting the batch (criterion 15, second half)", () => {
  it("moves EVERY included piece to Making in ONE action", () => {
    const group = walnutGroup();
    const pack = packSheet(group.pieces);

    const before = SEED.flatMap((o) => o.lines.map((l) => `${o.ref}/${l.id}:${l.stage}`));
    const started = startBatch(SEED, pack);

    // One call. Three orders. Every line on the sheet is now being made.
    expect(started.orderRefs.length).toBeGreaterThanOrEqual(3);
    expect(started.movedLines.length).toBeGreaterThanOrEqual(3);
    for (const moved of started.movedLines) {
      const [ref, lineId] = moved.split("/");
      const line = started.orders.find((o) => o.ref === ref)!.lines.find((l) => l.id === lineId)!;
      expect(`${ref}/${lineId}:${line.stage}`).toBe(`${ref}/${lineId}:making`);
    }

    // Nothing else moved, and the seed itself was not touched.
    const after = started.orders.flatMap((o) => o.lines.map((l) => `${o.ref}/${l.id}:${l.stage}`));
    const changed = after.filter((row, i) => row !== before[i]);
    expect(changed.map((row) => row.split(":")[0]!).sort()).toEqual([...started.movedLines].sort());
    expect(SEED.flatMap((o) => o.lines.map((l) => `${o.ref}/${l.id}:${l.stage}`))).toEqual(before);
  });

  it("books the machine for the run", () => {
    const pack = packSheet(walnutGroup().pieces);
    const started = startBatch(SEED, pack);
    expect(started.machine).toBe("laser");
    expect(started.minutes).toBe(machineMinutes("laser", pack.usedMm2));
    // Setting up is paid once, which is the entire argument for batching.
    expect(started.minutes).toBeGreaterThan(SETUP_MINUTES.laser);
    expect(machineMinutes("laser", 0)).toBe(SETUP_MINUTES.laser);
    expect(machineMinutes("printers", 10000)).toBe(SETUP_MINUTES.printers + MINUTES_PER_DM2.printers);
  });

  it("moves a line whose blanks are split across two sheets", () => {
    // Four bookmarks, one of them on the next sheet: the card on the board is
    // the LINE, and the line is being made.
    const group = walnutGroup();
    const pack = packSheet(group.pieces, { widthMm: 200, heightMm: 200 });
    expect(pack.overflow.length).toBeGreaterThan(0);
    const started = startBatch(SEED, pack);
    for (const placement of pack.placements) {
      const key = `${placement.piece.orderRef}/${placement.piece.lineId}`;
      expect(started.movedLines).toContain(key);
    }
  });

  /**
   * THE SENTENCE ON THE BUTTON AND THE FUNCTION UNDER IT SAY THE SAME THING.
   *
   * The note under "Start the batch" read "Every piece on the sheet moves to
   * Making, and the machine is booked." Driven on the 37-piece walnut batch,
   * three orders moved wholesale — the twenty blanks listed under "These did
   * not fit" went with them, because `startBatch` moves LINES and a line is
   * what the board has a card for.
   *
   * The behaviour is right and is asserted directly above: a set of four
   * coasters with one blank on the next sheet is still a set that is being
   * made, and half-moving it would leave the maker reconciling a board against
   * a sheet. The COPY was what was wrong, and copy that contradicts the button
   * it sits under is how a maker learns not to trust the screen.
   *
   * This asserts both halves at once, which is the only way the pair can drift
   * back apart: the overflow blanks really do move, and the sentence really
   * does say so rather than promising a piece-level move it never performs.
   */
  it("promises what it does: the overflow moves with its line", () => {
    // The studio's own sheet and the studio's own queue, which is what the
    // screen draws: 37 walnut blanks, 17 on the sheet, 20 under "These did not
    // fit" — and all 20 belong to a line that has a blank on the sheet.
    const group = walnutGroup();
    const pack = packSheet(group.pieces);
    expect(pack.overflow.length).toBeGreaterThan(0);
    const started = startBatch(SEED, pack);

    // The property the sentence has to describe: a blank that did NOT fit is
    // nonetheless on a line that has moved.
    const carried = pack.overflow.filter((piece) =>
      started.movedLines.includes(`${piece.orderRef}/${piece.lineId}`),
    );
    expect(carried.length, "no overflow blank belongs to a moved line").toBeGreaterThan(0);

    const note = bench["en-US"]["bench.batch.startNote"];
    // Not the old promise, which was about PIECES and was false of these.
    expect(note).not.toMatch(/every piece on (the|this) sheet/i);
    // And it names what actually happens to them.
    expect(note.toLowerCase()).toContain("next sheet");
  });

  it("reports only the lines it actually moved, not everything on the sheet", () => {
    /*
     * The one case the sheet and the stage disagree about.
     *
     * `startBatch` advances lines in *To make* and leaves everything else
     * alone, but `movedLines` and `orderRefs` were read off the PLACEMENTS —
     * so a line already in *Making* that the packer had put on the sheet was
     * reported as having just started. The store turns those two lists into
     * the toast a maker reads ("{pieces} pieces from {orders} orders"), so the
     * defect was a screen stating something the data does not say.
     */
    const group = walnutGroup();
    const pack = packSheet(group.pieces);
    const already = pack.placements[0]!.piece;
    const key = `${already.orderRef}/${already.lineId}`;

    // The same sheet, against a queue where that one line is already running.
    const queue = SEED.map((order) =>
      order.ref !== already.orderRef
        ? order
        : {
            ...order,
            lines: order.lines.map((line) =>
              line.id === already.lineId ? { ...line, stage: "making" as const } : line,
            ),
          },
    );

    const started = startBatch(queue, pack);
    expect(started.movedLines).not.toContain(key);
    // And it is still on the sheet, which is why the old version reported it.
    expect(pack.placements.some((p) => `${p.piece.orderRef}/${p.piece.lineId}` === key)).toBe(true);

    // Every reported line really is one whose stage changed under this call.
    const before = new Map(
      queue.flatMap((o) => o.lines.map((l) => [`${o.ref}/${l.id}`, l.stage] as const)),
    );
    const changed = started.orders
      .flatMap((o) => o.lines.map((l) => [`${o.ref}/${l.id}`, l.stage] as const))
      .filter(([k, stage]) => before.get(k) !== stage)
      .map(([k]) => k)
      .sort();
    expect(started.movedLines).toEqual(changed);
    expect(started.orderRefs).toEqual([...new Set(changed.map((k) => k.split("/")[0]!))].sort());
  });

  it("is a no-op on an empty sheet", () => {
    const started = startBatch(SEED, packSheet([]));
    expect(started.movedLines).toEqual([]);
    expect(started.pieceCount).toBe(0);
    expect(started.orders.map((o) => o.lines.map((l) => l.stage).join()).join("|")).toBe(
      SEED.map((o) => o.lines.map((l) => l.stage).join()).join("|"),
    );
  });
});
