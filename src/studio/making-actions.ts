/**
 * The making screens' writes: a sheet's batch started, and the shelf counted.
 *
 * STARTING A BATCH is four writes, in an order chosen so that the one
 * Adminium may refuse for the studio's own reason comes first:
 *
 *   1. the machine is booked from when it is next free, for as long as the
 *      sheets take it (`run_minutes` a sheet). Adminium refuses a booking
 *      that overlaps another of the machine (`BOOKING_TAKEN`), and then
 *      nothing else is written;
 *   2. the batch, in one write with the sheets it takes off the shelf (a
 *      `used` movement below it): every row or none. If it is refused, the
 *      booking is let go again;
 *   3. the batch is started (planned → running, Adminium stamping who and
 *      when) and the booking tied to it;
 *   4. each line with a piece on the sheet goes to making on the batch, from
 *      the stage the screen saw; its order follows it. A line that moved on
 *      since is left where it is now, and counted back.
 *
 * Adminium writes a booking alone (a table that takes a machine for a time
 * takes no rows of another table in the same write), so the four cannot be
 * one; the order above is what keeps a refused booking from leaving anything
 * behind.
 */
import type { StudioData, StudioDoor } from "./door.ts";
import { follow } from "./actions.ts";
import { orderOf } from "./facts.ts";
import { bookingsOf, linesOnSheet, nextFreeAt, sheetsFor, type Group, type Packed } from "./making.ts";
import { ApiError, isApiError, num, same, type Row } from "./wire.ts";

/** Refused here, before any write: nothing is on the sheet. */
export class NothingOnSheet extends Error {
  constructor() {
    super("Nothing is on the sheet yet.");
    this.name = "NothingOnSheet";
  }
}

export interface Started {
  batch: Row;
  /** Pieces on the sheet, the orders they are of, and the whole sheets taken off the shelf. */
  pieces: number;
  orders: number;
  sheets: number;
  /** Lines that had moved on since the screen read them, and so stayed where they are. */
  stale: number;
}

const iso = (at: number) => new Date(at).toISOString();

/** Whether a refusal says the row moved on since the screen read it. */
const movedOn = (error: unknown) => isApiError(error) && (error.code === "ROW_CHANGED" || error.code === "WRITE_CONFLICT" || error.code === "STATE_MOVE_REFUSED");

/**
 * Start a sheet's batch: the machine booked, the batch made with what it
 * takes off the shelf, the lines on it to making. `label` is the batch's and
 * the booking's name ("Walnut sheet · 6 pieces"); `at` the server's clock.
 */
export async function startBatch(door: StudioDoor, data: StudioData, group: Group, packed: Packed, label: string, at: number): Promise<Started> {
  const lines = linesOnSheet(group, packed);
  if (lines.length === 0 || packed.placed.length === 0) throw new NothingOnSheet();
  const machine = group.machine;
  if (machine === undefined) throw new ApiError(422, "MACHINE_MISSING", `${String(group.material["name"])} names no machine.`);
  const sheets = sheetsFor(lines);
  const minutes = (num(machine["run_minutes"]) ?? 60) * sheets;
  const from = nextFreeAt(bookingsOf(data, machine), at, minutes);

  // 1. The machine, first: a booking Adminium refuses leaves nothing else written.
  const booking = await door.book({ machineId: machine.id, label, startsAt: iso(from), endsAt: iso(from + minutes * 60_000) });

  // 2. The batch and its sheets, in one write; the booking let go if it is refused.
  let batch: Row;
  try {
    batch = await door.createBatch({ label, machineId: machine.id, materialId: group.material.id, sheets });
  } catch (error) {
    await door.unbook(booking).catch(() => undefined);
    throw error;
  }

  // 3. Started, and the booking tied to it.
  batch = await door.moveBatch(batch, "running");
  await door.tieBooking(booking, batch.id);

  // 4. The lines on the sheet to making, on the batch; their orders follow.
  const moved: Row[] = [];
  let stale = 0;
  for (const line of lines) {
    try {
      moved.push(await door.moveLine(line, "making", { batch_id: batch.id }));
    } catch (error) {
      if (!movedOn(error)) throw error;
      stale += 1;
    }
  }
  const orders = [...new Set(moved.map((l) => String(l["order_id"])))];
  for (const id of orders) {
    const order = orderOf(data, id);
    if (order !== undefined) await follow(door, data, order, moved.filter((l) => same(l["order_id"], id)));
  }
  return { batch, pieces: packed.placed.length, orders: new Set(packed.placed.map((p) => p.ref)).size, sheets, stale };
}

/** Whether a refusal is Adminium's word that the machine is booked then. */
export const isTaken = (error: unknown): boolean => isApiError(error) && (error.code === "BOOKING_TAKEN" || error.params["reason"] === "BOOKING_TAKEN");

/**
 * The shelf, counted: a count of each material typed, one movement each.
 * Adminium keeps the book's figure beside it (`on_hand_before`) and moves
 * the stock by the difference. Returns how many were saved.
 */
export async function saveCount(door: StudioDoor, counts: readonly { materialId: Row["id"]; counted: number }[]): Promise<number> {
  let saved = 0;
  for (const c of counts) {
    await door.count(c);
    saved += 1;
  }
  return saved;
}
