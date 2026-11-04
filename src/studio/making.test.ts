/**
 * WHAT THE MAKING SCREENS READ OFF THE ROWS: the sheets to batch, how the
 * pieces lie on a sheet, when a machine is next free, where a booking lies on
 * the day, the shelf's last count; and a batch started and a shelf counted,
 * write by write, against a stand-in door.
 */
import { describe, expect, it } from "vitest";

import { batchGroups, groupOfBatch, lastCount, linesOnSheet, nextFreeAt, packSheet, placeOnDay, sheetsFor, type Piece } from "./making.ts";
import { saveCount, startBatch } from "./making-actions.ts";
import { FakeDoor } from "./testing/fakeDoor.ts";
import { THURSDAY } from "./testing/fixture.ts";
import { dayIn } from "./time.ts";
import { ApiError } from "./wire.ts";

const piece = (key: string, w: number, h: number): Piece => ({ key, lineId: key, ref: `BR-${key}`, name: "Piece", w, h });
const at = (iso: string) => Date.parse(iso);

describe("the sheets to batch", () => {
  it("groups queued pieces of different orders by the material they are cut from, approved proofs only", () => {
    const door = new FakeDoor();
    const groups = batchGroups(door.data);
    // Fern's walnut coasters (a set of four) and Tom's two bookmarks; the sign waits on its proof, the mug is fired.
    expect(groups.map((g) => [g.key, g.pieces.length, g.refs])).toEqual([["1", 6, ["BR-2281", "BR-2282"]]]);
    expect(groups[0]!.sheet).toEqual({ w: 400, h: 300 });
    expect(groups[0]!.machine?.["code"]).toBe("laser");
  });

  it("leaves out a line already on a batch, one not approved, and one of a cancelled order", () => {
    const door = new FakeDoor();
    door.data.lines.find((l) => l.id === 171)!["batch_id"] = 1;
    door.data.orders.find((o) => o.id === 12)!["status"] = "cancelled";
    expect(batchGroups(door.data)).toEqual([]);
  });

  it("reads a started batch's lines as its group", () => {
    const door = new FakeDoor();
    const group = groupOfBatch(door.data, door.data.batches[0]!)!;
    expect(group.lines.map((l) => l.id)).toEqual([132]);
    expect(group.pieces).toHaveLength(4);
  });
});

describe("a sheet, packed", () => {
  it("lays pieces in shelves, biggest first, and keeps the clear edge and the gaps", () => {
    const packed = packSheet([piece("a", 95, 95), piece("b", 150, 40), piece("c", 95, 95)], { w: 400, h: 300 });
    expect(packed.placed.map((p) => [p.key, p.x, p.y])).toEqual([
      ["a", 5, 5],
      ["c", 104, 5],
      ["b", 203, 5],
    ]);
    expect(packed.pct).toBe(Math.round(((95 * 95 * 2 + 150 * 40) / 120_000) * 100));
    expect(packed.leftMm2).toBe(120_000 - (95 * 95 * 2 + 150 * 40));
  });

  it("sends what is too big, or what no longer fits, to the next sheet", () => {
    const packed = packSheet([piece("sign", 420, 300), ...Array.from({ length: 13 }, (_, i) => piece(`c${String(i)}`, 95, 95))], { w: 400, h: 300 });
    expect(packed.over.map((p) => p.key)).toContain("sign");
    // Inside the clear edge a 400 × 300 sheet takes three of them a row, two rows: the seventh waits.
    expect(packed.placed).toHaveLength(6);
    expect(packed.over).toHaveLength(8);
  });

  it("takes whole sheets off the shelf: what the lines take as Adminium keeps it, rounded up, one at the least", () => {
    expect(sheetsFor([{ id: 1, stock_use: "0.418" }, { id: 2, stock_use: "0.138" }])).toBe(1);
    expect(sheetsFor([{ id: 1, stock_use: "0.729" }, { id: 2, stock_use: "0.418" }])).toBe(2);
    expect(sheetsFor([{ id: 1, stock_use: "1.000" }])).toBe(1);
    expect(sheetsFor([{ id: 1, stock_use: null }])).toBe(1);
  });
});

describe("a machine's day", () => {
  const bookings = [
    { id: 1, starts_at: "2026-08-06T08:00:00.000Z", ends_at: "2026-08-06T10:15:00.000Z" },
    { id: 2, starts_at: "2026-08-06T10:45:00.000Z", ends_at: "2026-08-06T13:30:00.000Z" },
  ];

  it("is next free in the first gap long enough, else after its last booking", () => {
    expect(new Date(nextFreeAt(bookings, at("2026-08-06T09:00:00Z"), 30)).toISOString()).toBe("2026-08-06T10:15:00.000Z");
    expect(new Date(nextFreeAt(bookings, at("2026-08-06T09:00:00Z"), 60)).toISOString()).toBe("2026-08-06T13:30:00.000Z");
    // From a moment between two five-minute steps, the next step.
    expect(new Date(nextFreeAt([], at("2026-08-06T15:41:10Z"), 60)).toISOString()).toBe("2026-08-06T15:45:00.000Z");
  });

  it("lies on the grid of five-minute steps from nine to six, on the studio's clock", () => {
    // 09:00–11:15 in Settle (BST) is steps 0 to 27.
    expect(placeOnDay(at("2026-08-06T08:00:00Z"), at("2026-08-06T10:15:00Z"), "Europe/London", true, true)).toEqual({ at: 0, span: 27 });
    // A firing that holds overnight runs to six.
    expect(placeOnDay(at("2026-08-06T16:00:00Z"), at("2026-08-07T08:00:00Z"), "Europe/London", true, false)).toEqual({ at: 96, span: 12 });
    // Before nine and after six: nothing to draw.
    expect(placeOnDay(at("2026-08-06T05:00:00Z"), at("2026-08-06T07:00:00Z"), "Europe/London", true, true)).toBeNull();
  });
});

describe("the shelf's last count", () => {
  it("is its newest day's rows, each against the book's figure", () => {
    const door = new FakeDoor();
    expect(lastCount(door.data, (iso) => dayIn(iso, "Europe/London"))).toEqual({ at: "2026-08-04T09:01:00.000Z", n: 2, diff: 1 });
  });
  it("is nothing before the shelf was ever counted", () => {
    const door = new FakeDoor();
    door.data.movements = [];
    expect(lastCount(door.data, (iso) => dayIn(iso, "Europe/London"))).toBeNull();
  });
});

describe("starting a batch", () => {
  it("books the machine first, then makes the batch with its sheets, starts it, and moves the lines on the sheet", async () => {
    const door = new FakeDoor();
    const group = batchGroups(door.data)[0]!;
    const packed = packSheet(group.pieces, group.sheet);
    const started = await startBatch(door, door.data, group, packed, "Walnut sheet · 6 pieces", THURSDAY);
    expect(door.trail()).toEqual([
      "book 1",
      "createBatch 1",
      `moveBatch ${String(started.batch.id)} planned→running`,
      "tieBooking 5001",
      "moveLine 121 make→making",
      "moveLine 171 make→making",
      "moveOrder 12 placed→making",
      "moveOrder 17 placed→making",
    ]);
    // The laser is next free once the lens is cleaned (17:10 in Settle); one sheet keeps it 135 minutes.
    expect(door.calls[0]!.args).toEqual({ machineId: 1, label: "Walnut sheet · 6 pieces", startsAt: "2026-08-06T16:10:00.000Z", endsAt: "2026-08-06T18:25:00.000Z" });
    expect(door.calls[1]!.args).toEqual({ label: "Walnut sheet · 6 pieces", machineId: 1, materialId: 1, sheets: 1 });
    expect(door.calls[4]!.args).toMatchObject({ values: { batch_id: started.batch.id } });
    expect(started).toMatchObject({ pieces: 6, orders: 2, sheets: 1, stale: 0 });
    expect(door.data.movements.at(-1)).toMatchObject({ kind: "used", qty: 1, batch_id: started.batch.id });
  });

  it("writes nothing else when Adminium refuses the booking", async () => {
    const door = new FakeDoor();
    door.refuse("book", new ApiError(409, "BOOKING_TAKEN", "Taken."));
    const group = batchGroups(door.data)[0]!;
    await expect(startBatch(door, door.data, group, packSheet(group.pieces, group.sheet), "Walnut sheet", THURSDAY)).rejects.toMatchObject({ code: "BOOKING_TAKEN" });
    expect(door.trail()).toEqual(["book 1"]);
  });

  it("lets the booking go when the batch is refused", async () => {
    const door = new FakeDoor();
    door.refuse("createBatch", new ApiError(403, "FORBIDDEN", "No."));
    const group = batchGroups(door.data)[0]!;
    await expect(startBatch(door, door.data, group, packSheet(group.pieces, group.sheet), "Walnut sheet", THURSDAY)).rejects.toMatchObject({ status: 403 });
    expect(door.trail()).toEqual(["book 1", "createBatch 1", "unbook 5001"]);
    expect(door.data.bookings.some((b) => b.id === 5001)).toBe(false);
  });

  it("moves only the lines with a piece on the sheet, and counts back one that moved on", async () => {
    const door = new FakeDoor();
    const group = batchGroups(door.data)[0]!;
    const packed = packSheet(group.pieces.filter((p) => p.lineId !== 171), group.sheet);
    expect(linesOnSheet(group, packed).map((l) => l.id)).toEqual([121]);
    door.refuse("moveLine", new ApiError(409, "ROW_CHANGED", "Moved."));
    const started = await startBatch(door, door.data, group, packed, "Walnut sheet · 4 pieces", THURSDAY);
    expect(started).toMatchObject({ pieces: 4, orders: 1, stale: 1 });
    expect(door.trail().filter((c) => c.startsWith("moveOrder"))).toEqual([]);
  });

  it("refuses to start an empty sheet before writing anything", async () => {
    const door = new FakeDoor();
    const group = batchGroups(door.data)[0]!;
    await expect(startBatch(door, door.data, group, packSheet([], group.sheet), "Walnut sheet", THURSDAY)).rejects.toThrow("Nothing is on the sheet yet.");
    expect(door.calls).toEqual([]);
  });
});

describe("counting the shelf", () => {
  it("saves one count a material, with what was counted", async () => {
    const door = new FakeDoor();
    expect(await saveCount(door, [{ materialId: 1, counted: 13 }, { materialId: 2, counted: 5 }])).toBe(2);
    expect(door.calls.map((c) => c.args)).toEqual([{ materialId: 1, counted: 13 }, { materialId: 2, counted: 5 }]);
  });
});
