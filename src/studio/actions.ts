/**
 * The studio's writes as a person makes them: a line moved along the bench
 * (its order following it), an order marked made or ready, a proof sent, a
 * reminder, a spoil, the post office run.
 *
 * A move takes the steps the line's states allow, one write each, the stage
 * the screen saw going with every write. A line with words or a design is
 * held at "make" until its proof is approved: the screen says so and writes
 * nothing, and if it wrote anyway Adminium would refuse it (the move's
 * `requires`). An order follows its lines: it starts "making" with its first
 * line on the bench, is "ready" when its last live line is, and goes back to
 * "making" when one of its lines does.
 */
import type { ProofPicture, StudioData, StudioDoor } from "./door.ts";
import { dueForProof, isLive, lineMaterial, linesOf, lockOf, orderOf, pathOf, proofsOf, versionOf, fileIdOf, ORDER_MOVES } from "./facts.ts";
import { ApiError, num, same, type Row } from "./wire.ts";

/** Refused here, before any write: the line waits on its proof. */
export class HeldByProof extends Error {
  readonly lock: "waiting" | "unsent";
  constructor(lock: "waiting" | "unsent") {
    super(lock === "waiting" ? "Waiting on the customer's yes" : "Waiting on the proof: send it first");
    this.name = "HeldByProof";
    this.lock = lock;
  }
}

/** The order's status after one of its lines moved, as its lines now stand. */
function orderStatusFor(order: Row, lines: readonly Row[]): string {
  const status = String(order["status"]);
  const live = lines.filter(isLive);
  if (live.length > 0 && live.every((l) => l["stage"] === "ready")) return "ready";
  if (live.some((l) => l["stage"] !== "make")) return status === "placed" || status === "ready" ? "making" : status;
  return status === "ready" ? "making" : status;
}

/** Walk an order to a status, a move at a time (placed → making → ready). */
async function walkOrder(door: StudioDoor, order: Row, to: string): Promise<Row> {
  const path = pathOf(String(order["status"]), to, ORDER_MOVES);
  if (path === null) return order;
  let at = order;
  for (const step of path) at = await door.moveOrder(at, step);
  return at;
}

/** Bring an order in step with its lines after they moved. */
export async function follow(door: StudioDoor, data: StudioData, order: Row, moved: readonly Row[]): Promise<void> {
  const lines = linesOf(data, order).map((l) => moved.find((m) => same(m.id, l.id)) ?? l);
  const want = orderStatusFor(order, lines);
  if (want !== order["status"]) await walkOrder(door, order, want);
}

/** Move one line along the bench to a stage; the order follows. */
export async function moveLine(door: StudioDoor, data: StudioData, line: Row, to: string): Promise<Row> {
  const moved = await stepLine(door, line, to);
  const order = orderOf(data, line["order_id"]);
  if (order !== undefined) await follow(door, data, order, [moved]);
  return moved;
}

/** A line's own steps to a stage, without its order. */
async function stepLine(door: StudioDoor, line: Row, to: string): Promise<Row> {
  const path = pathOf(String(line["stage"]), to);
  if (path === null) throw new ApiError(409, "MOVE_NOT_OFFERED", `A line at ${String(line["stage"])} does not go to ${to}.`);
  const lock = lockOf(line);
  if (lock !== null && path.some((stage) => stage !== "make" && stage !== "cancelled")) throw new HeldByProof(lock);
  let at = line;
  for (const stage of path) at = await door.moveLine(at, stage);
  return at;
}

/**
 * Several of an order's lines to one stage ("Mark made", "Mark ready to
 * post"): each line that can go, goes; the ones its proof holds stay, and are
 * counted back.
 */
export async function moveOrderLines(door: StudioDoor, data: StudioData, order: Row, to: "finishing" | "ready", from: readonly string[]): Promise<{ moved: number; held: number }> {
  const moved: Row[] = [];
  let held = 0;
  for (const line of linesOf(data, order)) {
    if (!from.includes(String(line["stage"]))) continue;
    if (lockOf(line) !== null) {
      held += 1;
      continue;
    }
    moved.push(await stepLine(door, line, to));
  }
  if (moved.length > 0) await follow(door, data, order, moved);
  return { moved: moved.length, held };
}

/** A proof's picture and what it shows, for one line. Null when the line's design has no proof made yet. */
export type Drawn = { picture: ProofPicture; kind: "lettering" | "design"; designVersionId: Row["id"] | null } | null;

/** What a line's proof is: the Customiser's proof of the design's newest version, or a picture of the words drawn here. */
export async function proofFor(data: StudioData, line: Row, draw: (line: Row) => Promise<Blob | null>): Promise<Drawn> {
  if (line["design_id"] !== null && line["design_id"] !== undefined) {
    const version = versionOf(data, line);
    const file = fileIdOf(version?.["proof_file"]);
    if (version === undefined || file === null) return null;
    return { picture: { copyOf: file }, kind: "design", designVersionId: version.id };
  }
  const blob = await draw(line);
  if (blob === null) return null;
  return { picture: { blob, filename: `proof-line-${String(line.id)}.png` }, kind: "lettering", designVersionId: null };
}

/**
 * Send a proof of every line of an order that waits for one: the proof each
 * line had before is answered by this one (superseded), and the new one goes
 * to the customer (Adminium numbers it per line and e-mails it). Lines whose
 * design has no proof made yet are left, and named.
 */
export async function sendProofs(door: StudioDoor, data: StudioData, order: Row, draw: (line: Row) => Promise<Blob | null>, note: string | null = null): Promise<{ sent: Row[]; missing: Row[] }> {
  const sent: Row[] = [];
  const missing: Row[] = [];
  for (const line of dueForProof(data, order)) {
    const drawn = await proofFor(data, line, draw);
    if (drawn === null) {
      missing.push(line);
      continue;
    }
    const before = proofsOf(data, line)[0];
    if (before !== undefined && (before["state"] === "sent" || before["state"] === "change_asked")) await door.supersede(before);
    sent.push(await door.sendProof({ order, line, kind: drawn.kind, picture: drawn.picture, designVersionId: drawn.designVersionId, note }));
  }
  return { sent, missing };
}

/**
 * Pieces of a line that went wrong: what they took comes off the shelf (a
 * spoil of so many units, Adminium working out how much material that is),
 * the line counts them, and it goes back to "make" to be made again.
 */
export async function spoil(door: StudioDoor, data: StudioData, line: Row, units: number): Promise<void> {
  const material = lineMaterial(data, line);
  if (material !== undefined) await door.spoil({ line, materialId: material.id, units, note: null });
  const counted = await door.updateLine(line, { spoiled: (num(line["spoiled"]) ?? 0) + units });
  if (line["stage"] !== "make") await moveLine(door, data, { ...line, ...counted, stage: line["stage"] }, "make");
}

/**
 * The post office run: each ticked order's ready lines go in the post, then
 * the order itself (Adminium e-mails the customer when it is posted). A
 * tracking number goes with it only when DHL carried it.
 */
export async function postOrders(door: StudioDoor, data: StudioData, orders: readonly Row[], tracking: Readonly<Record<string, string>> = {}): Promise<number> {
  let posted = 0;
  for (const order of orders) {
    for (const line of linesOf(data, order)) if (line["stage"] === "ready") await door.moveLine(line, "posted");
    const number = tracking[String(order.id)]?.trim() ?? "";
    await door.moveOrder(order, "posted", number === "" ? {} : { tracking: number });
    posted += 1;
  }
  return posted;
}
