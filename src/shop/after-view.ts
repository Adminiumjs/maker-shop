/**
 * What "Your order" shows of an order, read off the rows Adminium keeps:
 * each stage lit by the line's own stage and dated by its own stamp, the
 * post-by the order's column, the proofs as they were sent and answered.
 * Nothing here works a date out; a stage not yet reached has none.
 */
import type { OrderRead } from "./after-port.ts";
import type { Catalogue, Id, Row } from "./port.ts";

export type StageKey = "accepted" | "proof" | "making" | "finishing" | "posted";

export interface Stage {
  key: StageKey;
  done: boolean;
  /** The stamp that lit it (a moment or a day), or the day it is due by (Posted), or null. */
  at: string | null;
  /** True when `at` is the day it is due by, not the day it happened. */
  due: boolean;
}

export interface WaitingProof {
  id: string;
  version: number;
  productName: string;
  sizeText: string | null;
  tint: string | null;
  icon: string | null;
  words: string[];
  note: string | null;
  sentAt: string | null;
}

export interface LineView {
  id: string;
  name: string;
  qty: number;
  options: string[];
  lettering: string | null;
  designCode: string | null;
  tint: string | null;
  icon: string | null;
}

export type LogKind = "sent" | "approved" | "change";
export interface LogEntry {
  kind: LogKind;
  at: string;
  version: number;
  detail: string | null;
}

export interface OrderView {
  number: string;
  name: string;
  placedAt: string | null;
  total: unknown;
  postBy: string | null;
  postedAt: string | null;
  status: string;
  /** Posted, cancelled, overdue (its post-by gone by), or due by its post-by. */
  post: "posted" | "cancelled" | "late" | "due";
  stages: Stage[];
  waiting: WaitingProof[];
  lines: LineView[];
  log: LogEntry[];
  serviceName: string;
  tracking: string | null;
  dispatch: "posted" | "packed" | "later";
}

const BENCH = ["making", "finishing", "ready", "posted"];
const text = (value: unknown): string | null => (value === null || value === undefined || value === "" ? null : String(value));

/** The earliest of the stamps given, as Adminium wrote them. */
function earliest(values: readonly unknown[]): string | null {
  const stamps = values.map(text).filter((v): v is string => v !== null);
  return stamps.length === 0 ? null : stamps.reduce((a, b) => (Date.parse(b) < Date.parse(a) ? b : a));
}
function latest(values: readonly unknown[]): string | null {
  const stamps = values.map(text).filter((v): v is string => v !== null);
  return stamps.length === 0 ? null : stamps.reduce((a, b) => (Date.parse(b) > Date.parse(a) ? b : a));
}

const yes = (value: unknown) => value === true || value === 1 || value === "1" || value === "true";

export function orderView(read: OrderRead, catalogue: Catalogue, today: string | null): OrderView {
  const { order } = read;
  const lines = [...read.lines].sort((a, b) => Number(a["position"] ?? 0) - Number(b["position"] ?? 0) || Number(a["id"]) - Number(b["id"]));
  const live = lines.filter((l) => l["stage"] !== "cancelled");
  const product = (id: unknown) => catalogue.products.find((p) => String(p.id) === String(id)) ?? null;
  const option = (id: unknown) => (id === null || id === undefined ? null : (catalogue.options.find((o) => String(o.id) === String(id)) ?? null));
  const tintOf = (line: Row): string | null => {
    const materialId = option(line["material_id"])?.materialId ?? product(line["product_id"])?.materialId ?? null;
    return materialId === null ? null : (catalogue.materials.find((m) => String(m.id) === String(materialId))?.tint ?? null);
  };
  const status = String(order["status"] ?? "placed");
  const posted = status === "posted";

  // Each stage: lit by where the lines are, dated by the stamp each line got when it went there.
  const proofed = live.every((l) => yes(l["proof_ok"]) || Number(l["proof_ok"]) === 1);
  const asked = live.filter((l) => l["lettering"] != null || l["design_id"] != null);
  const approvedAt = latest(read.proofs.filter((p) => p["state"] === "approved").map((p) => p["answered_at"]));
  const onBench = live.filter((l) => BENCH.includes(String(l["stage"])));
  const finishing = live.filter((l) => ["finishing", "ready", "posted"].includes(String(l["stage"])));
  const stages: Stage[] = [
    { key: "accepted", done: true, at: text(order["placed_at"]), due: false },
    { key: "proof", done: posted || proofed, at: asked.length === 0 ? text(order["placed_at"]) : proofed ? approvedAt : null, due: false },
    { key: "making", done: posted || onBench.length > 0, at: earliest(onBench.map((l) => l["started_at"])), due: false },
    { key: "finishing", done: posted || finishing.length > 0, at: earliest(finishing.map((l) => l["finishing_at"] ?? l["made_at"])), due: false },
    { key: "posted", done: posted, at: posted ? text(order["posted_at"]) : text(order["post_by"]), due: !posted },
  ];

  const postBy = text(order["post_by"]);
  const post: OrderView["post"] = posted ? "posted" : status === "cancelled" ? "cancelled" : today !== null && postBy !== null && postBy.slice(0, 10) < today ? "late" : "due";

  const lineOf = (id: unknown) => lines.find((l) => String(l["id"]) === String(id)) ?? null;
  /**
   * A proof the customer can look at: its picture, or a piece's words drawn as they will be cut. A design's proof
   * added (on the dashboard) before its picture has nothing to show: it is neither offered for an answer nor said
   * to be sent, and its e-mail goes once the picture is added.
   */
  const shown = (p: Row): boolean => text(p["picture"]) !== null || (p["kind"] !== "design" && text(lineOf(p["line_id"])?.["lettering"]) !== null);
  const proofs = read.proofs.filter(shown);
  const waiting: WaitingProof[] = proofs
    .filter((p) => p["state"] === "sent")
    .sort((a, b) => Number(a["version"] ?? 0) - Number(b["version"] ?? 0))
    .map((p) => {
      const line = lineOf(p["line_id"]);
      const piece = line === null ? null : product(line["product_id"]);
      const words = text(line?.["lettering"]);
      return {
        id: String(p["id"]),
        version: Number(p["version"] ?? 1),
        productName: text(line?.["product_name"]) ?? piece?.name ?? "",
        sizeText: piece?.sizeText ?? null,
        tint: line === null ? null : tintOf(line),
        icon: piece?.icon ?? null,
        words: words === null ? [] : words.split("\n"),
        note: text(p["note"]),
        sentAt: text(p["sent_at"]),
      };
    });

  const log: LogEntry[] = [];
  for (const p of proofs) {
    const version = Number(p["version"] ?? 1);
    const sent = text(p["sent_at"]);
    if (sent !== null) log.push({ kind: "sent", at: sent, version, detail: text(p["note"]) });
    const answered = text(p["answered_at"]);
    if (answered !== null && p["state"] === "approved") log.push({ kind: "approved", at: answered, version, detail: null });
    if (answered !== null && (p["state"] === "change_asked" || text(p["change_note"]) !== null)) log.push({ kind: "change", at: answered, version, detail: text(p["change_note"]) });
  }
  log.sort((a, b) => Date.parse(a.at) - Date.parse(b.at));

  const service = catalogue.services.find((s) => String(s.id) === String(order["service_id"]));
  return {
    number: String(order["number"] ?? ""),
    name: String(order["name"] ?? ""),
    placedAt: text(order["placed_at"]),
    total: order["total"],
    postBy,
    postedAt: text(order["posted_at"]),
    status,
    post,
    stages,
    waiting,
    lines: lines.map((l) => ({
      id: String(l["id"]),
      name: text(l["product_name"]) ?? product(l["product_id"])?.name ?? "",
      qty: Number(l["qty"] ?? 1),
      options: [l["material_id"], l["size_id"], l["finish_id"]].map((id) => option(id)?.name ?? null).filter((n): n is string => n !== null),
      lettering: text(l["lettering"]),
      designCode: text(l["design_code"]),
      tint: tintOf(l),
      icon: product(l["product_id"])?.icon ?? null,
    })),
    log,
    serviceName: service?.name ?? "",
    tracking: text(order["tracking"]),
    dispatch: posted ? "posted" : status === "ready" ? "packed" : "later",
  };
}

/** An order's line ids as numbers or text, for matching rows read by different sessions. */
export const sameId = (a: Id | unknown, b: Id | unknown): boolean => String(a) === String(b);
