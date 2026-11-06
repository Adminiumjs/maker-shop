/**
 * The making screens' writes: a sheet's batch started, and the shelf counted.
 *
 * STARTING A BATCH is one write, then the moves that follow it:
 *
 *   1. the batch, with the machine's booking and the sheets it takes off the
 *      shelf below it (a `used` movement), as one create: every row or none.
 *      The machine is booked from when it is next free, for as long as the
 *      sheets take it (`run_minutes` a sheet). Adminium judges the booking
 *      inside that write: a time that overlaps another booking of the machine
 *      refuses the whole write (`BOOKING_TAKEN`), and nothing is written;
 *   2. the batch is started (planned → running, Adminium stamping who and
 *      when);
 *   3. each line with a piece on the sheet goes to making on the batch, from
 *      the stage the screen saw; its order follows it. A line that moved on
 *      since is left where it is now, and counted back.
 *
 * The booking goes in the batch's own write so that a refused time can leave
 * nothing behind, with no booking to let go again afterwards.
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

  // 1. The batch, its booking and its sheets, in one write: a time that is taken refuses all three.
  let batch = await door.createBatch({ label, machineId: machine.id, materialId: group.material.id, sheets, booking: { startsAt: iso(from), endsAt: iso(from + minutes * 60_000) } });

  // 2. Started.
  batch = await door.moveBatch(batch, "running");

  // 3. The lines on the sheet to making, on the batch; their orders follow.
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
