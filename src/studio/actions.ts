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
import { dueForProof, isLive, lineMaterial, linesOf, lockOf, orderOf, pathOf, payHeld, versionOf, fileIdOf, ORDER_MOVES } from "./facts.ts";
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

/** Refused here, before any write: the line's order takes payment before making and is not paid yet. */
export class HeldByPayment extends Error {
  constructor() {
    super("Waiting for payment");
    this.name = "HeldByPayment";
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
async function walkOrder(door: StudioDoor, order: Row, to: string, keep?: readonly string[]): Promise<Row> {
  const path = pathOf(String(order["status"]), to, ORDER_MOVES);
  if (path === null) return order;
  let at = order;
  for (const step of path) at = await door.moveOrder(at, step, {}, keep);
  return at;
}

/** A person's answer about a paid label, given before anything was written. */
type PaidLabelAnswer = { keep: readonly string[]; moved: boolean };

const ORDER_WAY = ["placed", "making", "ready", "posted"];

/** Asks first when this piece's move would take its order back: Adminium may refuse that over a paid label. */
async function askIfOrderGoesBack(door: StudioDoor, data: StudioData, order: Row, line: Row, to: string): Promise<PaidLabelAnswer | undefined> {
  const lines = linesOf(data, order).map((l) => (same(l.id, line.id) ? { ...l, stage: to } : l));
  const want = orderStatusFor(order, lines);
  const from = ORDER_WAY.indexOf(String(order["status"]));
  const next = ORDER_WAY.indexOf(want);
  return from >= 0 && next >= 0 && next < from ? door.clearPaidLabel?.(order, want) : undefined;
}

/** Bring an order in step with its lines after they moved. */
export async function follow(door: StudioDoor, data: StudioData, order: Row, moved: readonly Row[], keep?: readonly string[]): Promise<void> {
  const lines = linesOf(data, order).map((l) => moved.find((m) => same(m.id, l.id)) ?? l);
  const want = orderStatusFor(order, lines);
  if (want !== order["status"]) await walkOrder(door, order, want, keep);
}

/** Move one line along the bench to a stage; the order follows. */
export async function moveLine(door: StudioDoor, data: StudioData, line: Row, to: string, asked?: PaidLabelAnswer | null): Promise<Row> {
  const order = orderOf(data, line["order_id"]);
  const answer = asked !== undefined || order === undefined ? asked : await askIfOrderGoesBack(door, data, order, line, to);
  const moved = await stepLine(door, line, to, order);
  if (order !== undefined && answer?.moved !== true) await follow(door, data, order, [moved], answer?.keep);
  return moved;
}

/** A line's own steps to a stage, without its order. */
async function stepLine(door: StudioDoor, line: Row, to: string, order?: Row): Promise<Row> {
  const path = pathOf(String(line["stage"]), to);
  if (path === null) throw new ApiError(409, "MOVE_NOT_OFFERED", `A line at ${String(line["stage"])} does not go to ${to}.`);
  // Nothing goes on the machine before its order is paid, when the order takes payment before making.
  if (line["stage"] === "make" && payHeld(order) && path.some((stage) => stage !== "make" && stage !== "cancelled")) throw new HeldByPayment();
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
    if (lockOf(line) !== null || (line["stage"] === "make" && payHeld(order))) {
      held += 1;
      continue;
    }
    moved.push(await stepLine(door, line, to, order));
  }
  if (moved.length > 0) await follow(door, data, order, moved);
  return { moved: moved.length, held };
}

/** A proof's picture and what it shows, for one line. Null when the line's design has no proof made yet. */
export type Drawn = { picture: ProofPicture; kind: "lettering" | "design"; designVersionId: Row["id"] | null } | null;

/** A file the maker chose to send as a line's proof (a PDF, or a picture made elsewhere), named as it came. */
export type OwnProof = (line: Row) => { blob: Blob; filename: string } | null;

/**
 * What a line's proof is: a file the maker chose for it, else the
 * Customiser's proof of the design's newest version, else a picture of the
 * words drawn here.
 */
export async function proofFor(data: StudioData, line: Row, draw: (line: Row) => Promise<Blob | null>, own: OwnProof = () => null): Promise<Drawn> {
  const designed = line["design_id"] !== null && line["design_id"] !== undefined;
  const chosen = own(line);
  if (chosen !== null) return { picture: chosen, kind: designed ? "design" : "lettering", designVersionId: designed ? (versionOf(data, line)?.id ?? null) : null };
  if (designed) {
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
 * Send a proof of every line of an order that waits for one: the new one goes
 * to the customer (Adminium numbers it per line and e-mails it), and in the
 * same write Adminium answers the proof each line still had out with it
 * (superseded). Lines whose design has no proof made yet are left, and named.
 */
export async function sendProofs(door: StudioDoor, data: StudioData, order: Row, draw: (line: Row) => Promise<Blob | null>, note: string | null = null, own: OwnProof = () => null): Promise<{ sent: Row[]; missing: Row[] }> {
  const sent: Row[] = [];
  const missing: Row[] = [];
  for (const line of dueForProof(data, order)) {
    const drawn = await proofFor(data, line, draw, own);
    if (drawn === null) {
      missing.push(line);
      continue;
    }
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
  const order = orderOf(data, line["order_id"]);
  const asked = order !== undefined && line["stage"] !== "make" ? ((await askIfOrderGoesBack(door, data, order, line, "make")) ?? null) : null;
  const material = lineMaterial(data, line);
  if (material !== undefined) await door.spoil({ line, materialId: material.id, units, note: null });
  const counted = await door.updateLine(line, { spoiled: (num(line["spoiled"]) ?? 0) + units });
  if (line["stage"] !== "make") await moveLine(door, data, { ...line, ...counted, stage: line["stage"] }, "make", asked);
}

/**
 * An order cancelled from the studio (an unpaid one, the shopper never
 * paying): each of its pieces still on the bench comes off it, then the order
 * itself. Nothing was taken, so nothing is given back.
 */
export async function cancelOrder(door: StudioDoor, data: StudioData, order: Row): Promise<void> {
  // Asked before any piece comes off: Adminium may refuse the order over a paid label, and it would then stay live.
  const cleared = await door.clearPaidLabel?.(order, "cancelled");
  for (const line of linesOf(data, order).filter(isLive)) await stepLine(door, line, "cancelled");
  if (cleared?.moved !== true) await door.moveOrder(order, "cancelled", {}, cleared?.keep);
}

/**
 * The post office run: each ticked order's ready lines go in the post, then
 * the order itself (Adminium e-mails the customer when it is posted). A
 * tracking number goes with it only when a carrier gave one.
 */
export async function postOrders(door: StudioDoor, data: StudioData, orders: readonly Row[], tracking: Readonly<Record<string, string>> = {}, labels: Readonly<Record<string, { tracking: string | null; carrier: string | null }>> = {}): Promise<number> {
  let posted = 0;
  for (const order of orders) {
    for (const line of linesOf(data, order)) if (line["stage"] === "ready") await door.moveLine(line, "posted");
    const typed = tracking[String(order.id)]?.trim() ?? "";
    const label = labels[String(order.id)];
    // The label's number and company reach the shopper's columns here, at the hand-over, and not at purchase.
    const number = typed !== "" ? typed : (label?.tracking ?? "");
    const carrier = typed === "" ? (label?.carrier ?? null) : null;
    await door.moveOrder(order, "posted", { ...(number === "" ? {} : { tracking: number }), ...(carrier === null || number === "" ? {} : { carrier }) });
    posted += 1;
  }
  return posted;
}
