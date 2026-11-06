/**
 * What the studio's making screens read off the rows: which queued pieces
 * share a sheet and a machine, how they lie on the sheet, what is booked on
 * each machine today and when it is next free, what the shelf holds and when
 * it was last counted.
 *
 * Every amount here is a stored column or a count of rows: a line's pieces
 * and what it takes off the shelf (`pieces`, `stock_use`), a material's on
 * hand, committed and available, a booking's start and end. The one thing
 * worked out here is where each piece lies on the sheet (a drawing, as the
 * proof's picture is), and from it how much of the sheet is used.
 */
import type { StudioData } from "./door.ts";
import { isLive, lineMaterial, orderOf, productOf } from "./facts.ts";
import { zoneOffsetMs } from "./time.ts";
import { num, same, text, type Id, type Row } from "./wire.ts";

/** The hours the machine screens draw: nine to six, as the comp says it. */
export const DAY_FROM = 9;
export const DAY_TO = 18;
/** The day's width in five-minute steps, the grid the timelines are drawn on. */
export const STEPS = ((DAY_TO - DAY_FROM) * 60) / 5;

/** A sheet's clear edge and the gap between two pieces, in mm. */
export const SHEET_MARGIN = 5;
export const SHEET_GAP = 4;

/** One piece of a line, as it is cut: its line, its order's number, its size. */
export interface Piece {
  key: string;
  lineId: Id;
  ref: string;
  name: string;
  w: number;
  h: number;
}

export interface Placed extends Piece {
  x: number;
  y: number;
}

/** Queued pieces from different orders that share a material and so a sheet and a machine. */
export interface Group {
  key: string;
  material: Row;
  machine: Row | undefined;
  sheet: { w: number; h: number };
  pieces: Piece[];
  lines: Row[];
  /** The orders the pieces are of, by their numbers. */
  refs: string[];
}

export interface Packed {
  placed: Placed[];
  over: Piece[];
  usedMm2: number;
  totalMm2: number;
  pct: number;
  leftMm2: number;
}

/** A material's sheet, from its own row; null when it is not sheet stock with a size. */
export function sheetOf(material: Row | undefined): { w: number; h: number } | null {
  if (material === undefined || material["group"] !== "sheet") return null;
  const w = num(material["sheet_w_mm"]);
  const h = num(material["sheet_h_mm"]);
  return w === null || h === null || w <= 0 || h <= 0 ? null : { w, h };
}

/** The pieces a line is cut as: so many of its product's size (a set of four coasters is four). */
export function piecesOf(data: StudioData, line: Row): Piece[] {
  const product = productOf(data, line);
  const w = num(product?.["width_mm"]);
  const h = num(product?.["height_mm"]);
  if (w === null || h === null) return [];
  const count = num(line["pieces"]) ?? (num(line["qty"]) ?? 0) * (num(line["pieces_per_unit"]) ?? 1);
  const ref = text(orderOf(data, line["order_id"])?.["number"]) ?? "";
  const name = text(line["product_name"]) ?? text(product?.["name"]) ?? "";
  return Array.from({ length: count }, (_, i) => ({ key: `${String(line.id)}/${String(i)}`, lineId: line.id, ref, name, w, h }));
}

/**
 * The lines that may go on a sheet now: still to make, their proof approved
 * or nothing on them to proof (Adminium's `proof_ok`), made on the laser from
 * sheet stock. A line a batch took to making that came back to "make" (a
 * spoil to remake) is queued again, and its next batch takes it.
 */
export function queuedForSheet(data: StudioData, line: Row): boolean {
  if (line["stage"] !== "make" || num(line["proof_ok"]) !== 1) return false;
  const order = orderOf(data, line["order_id"]);
  if (order === undefined || order["status"] === "cancelled") return false;
  if (productOf(data, line)?.["machine_kind"] !== "laser") return false;
  return sheetOf(lineMaterial(data, line)) !== null;
}

function groupOf(data: StudioData, key: string, material: Row, lines: Row[]): Group {
  const pieces = lines.flatMap((l) => piecesOf(data, l));
  const refs = [...new Set(lines.map((l) => text(orderOf(data, l["order_id"])?.["number"]) ?? ""))].filter((r) => r !== "");
  return { key, material, machine: data.machines.find((m) => same(m.id, material["machine_id"])), sheet: sheetOf(material)!, pieces, lines, refs };
}

/** The sheets to batch: queued pieces of every order, by the material they are cut from, the fullest first. */
export function batchGroups(data: StudioData): Group[] {
  const byMaterial = new Map<string, { material: Row; lines: Row[] }>();
  for (const line of data.lines) {
    if (!queuedForSheet(data, line)) continue;
    const material = lineMaterial(data, line)!;
    const key = String(material.id);
    const at = byMaterial.get(key) ?? { material, lines: [] };
    at.lines.push(line);
    byMaterial.set(key, at);
  }
  return [...byMaterial]
    .map(([key, { material, lines }]) => groupOf(data, key, material, lines))
    .filter((g) => g.pieces.length > 0)
    .sort((a, b) => b.pieces.length - a.pieces.length || String(a.key).localeCompare(String(b.key)));
}

/** A batch already started, as a group: its lines (on it by `batch_id`) and its material. */
export function groupOfBatch(data: StudioData, batch: Row): Group | null {
  const material = data.materials.find((m) => same(m.id, batch["material_id"]));
  if (material === undefined || sheetOf(material) === null) return null;
  const lines = data.lines.filter((l) => same(l["batch_id"], batch.id));
  return groupOf(data, `batch-${String(batch.id)}`, material, lines);
}

/**
 * Shelf packing, biggest first so a small piece never takes the place a large
 * one needed: good enough to be honest about what fits. What does not fit
 * waits for the next sheet.
 */
export function packSheet(pieces: readonly Piece[], sheet: { w: number; h: number }): Packed {
  const usableW = sheet.w - SHEET_MARGIN * 2;
  const usableH = sheet.h - SHEET_MARGIN * 2;
  const placed: Placed[] = [];
  const over: Piece[] = [];
  let shelfY = SHEET_MARGIN;
  let shelfH = 0;
  let x = SHEET_MARGIN;
  const order = pieces.map((p, i) => ({ p, i })).sort((a, b) => b.p.w * b.p.h - a.p.w * a.p.h || a.i - b.i);
  for (const { p } of order) {
    if (p.w > usableW || p.h > usableH) {
      over.push(p);
      continue;
    }
    if (x + p.w > SHEET_MARGIN + usableW) {
      shelfY += shelfH + SHEET_GAP;
      x = SHEET_MARGIN;
      shelfH = 0;
    }
    if (shelfY + p.h > SHEET_MARGIN + usableH) {
      over.push(p);
      continue;
    }
    placed.push({ ...p, x, y: shelfY });
    x += p.w + SHEET_GAP;
    if (p.h > shelfH) shelfH = p.h;
  }
  const usedMm2 = placed.reduce((a, p) => a + p.w * p.h, 0);
  const totalMm2 = sheet.w * sheet.h;
  return { placed, over, usedMm2, totalMm2, pct: Math.round((usedMm2 / totalMm2) * 100), leftMm2: totalMm2 - usedMm2 };
}

/** The lines with a piece on the sheet: what the batch moves to making. */
export function linesOnSheet(group: Group, packed: Packed): Row[] {
  const on = new Set(packed.placed.map((p) => String(p.lineId)));
  return group.lines.filter((l) => on.has(String(l.id)));
}

/**
 * The whole sheets a batch takes off the shelf: what its lines take, as
 * Adminium keeps it on each (`stock_use`, a share of a sheet), rounded up to
 * a sheet; one at the least.
 */
export function sheetsFor(lines: readonly Row[]): number {
  const share = lines.reduce((a, l) => a + (num(l["stock_use"]) ?? 0), 0);
  return Math.max(1, Math.ceil(Math.round(share * 1000) / 1000));
}

/** The pieces on a group's lines, by order: what a cut list and a batch sheet list. */
export function rowsOf(group: Group, only?: readonly Placed[]): { ref: string; name: string; n: number; lines: Row[] }[] {
  const pieces = only ?? group.pieces;
  const out = new Map<string, { ref: string; name: string; n: number; lines: Row[] }>();
  for (const piece of pieces) {
    const key = `${piece.ref}\u0000${piece.name}`;
    const at = out.get(key) ?? { ref: piece.ref, name: piece.name, n: 0, lines: [] };
    at.n += 1;
    const line = group.lines.find((l) => same(l.id, piece.lineId));
    if (line !== undefined && !at.lines.includes(line)) at.lines.push(line);
    out.set(key, at);
  }
  return [...out.values()];
}

// ── the machines ────────────────────────────────────────────────────────────

const DAY_MS = 24 * 60 * 60_000;

/** Minutes since midnight on the studio's clock. */
export function minuteOfDay(instant: number, zone: string): number {
  const local = instant + zoneOffsetMs(zone, instant);
  return Math.floor((((local % DAY_MS) + DAY_MS) % DAY_MS) / 60_000);
}

/**
 * Where a booking lies on a day's grid of five-minute steps from nine: its
 * first step and how many it spans, held to nine to six. `startsToday` and
 * `endsToday` say whether its ends fall on the day drawn (a firing that holds
 * overnight runs to the day's end). Null when it lies wholly outside the day.
 */
export function placeOnDay(from: number, to: number, zone: string, startsToday: boolean, endsToday: boolean): { at: number; span: number } | null {
  const first = startsToday ? minuteOfDay(from, zone) : 0;
  const last = endsToday ? minuteOfDay(to, zone) : 24 * 60;
  const at = Math.max(0, Math.round((first - DAY_FROM * 60) / 5));
  const end = Math.min(STEPS, Math.round((Math.min(last, DAY_TO * 60) - DAY_FROM * 60) / 5));
  if (at >= STEPS || end <= at) return null;
  return { at, span: end - at };
}

/** A booking's start and end, as instants; null when either is missing. */
export function spanOf(booking: Row): { from: number; to: number } | null {
  const from = Date.parse(text(booking["starts_at"]) ?? "");
  const to = Date.parse(text(booking["ends_at"]) ?? "");
  return Number.isNaN(from) || Number.isNaN(to) ? null : { from, to };
}

/** A machine's bookings, earliest first. */
export function bookingsOf(data: StudioData, machine: Row): Row[] {
  return data.bookings.filter((b) => same(b["machine_id"], machine.id)).sort((a, b) => (spanOf(a)?.from ?? 0) - (spanOf(b)?.from ?? 0));
}

/** The minutes a machine's runs take on a day (upkeep is not machine time). */
export function bookedMinutes(bookings: readonly Row[]): number {
  let minutes = 0;
  for (const b of bookings) {
    if (b["kind"] !== undefined && b["kind"] !== null && b["kind"] !== "run") continue;
    const span = spanOf(b);
    if (span !== null) minutes += Math.max(0, Math.round((span.to - span.from) / 60_000));
  }
  return minutes;
}

/**
 * When a machine is next free for so many minutes from a moment: the first
 * gap between its bookings that long, else after the last of them. A guess
 * the screen books by; Adminium judges the booking itself, and refuses one
 * that overlaps (`BOOKING_TAKEN`).
 */
export function nextFreeAt(bookings: readonly Row[], from: number, minutes: number): number {
  const step = 5 * 60_000;
  let at = Math.ceil(from / step) * step;
  const spans = bookings.map(spanOf).filter((s): s is { from: number; to: number } => s !== null).sort((a, b) => a.from - b.from);
  for (const span of spans) {
    if (span.to <= at) continue;
    if (span.from >= at + minutes * 60_000) break;
    at = Math.max(at, span.to);
  }
  return at;
}

/** Which bookings of a machine hold it at a moment, and its last booking from then on. */
export function machineNow(bookings: readonly Row[], at: number): { running: Row | undefined; last: Row | undefined; ahead: Row[] } {
  const ahead = bookings.filter((b) => (spanOf(b)?.to ?? 0) > at && (b["kind"] === undefined || b["kind"] === null || b["kind"] === "run"));
  const running = ahead.find((b) => (spanOf(b)?.from ?? Infinity) <= at);
  return { running, last: ahead[ahead.length - 1], ahead };
}

/** The order numbers a batch's booking is cutting, read off the lines on the batch. */
export function refsOfBooking(data: StudioData, booking: Row): string[] {
  if (booking["batch_id"] === null || booking["batch_id"] === undefined) return [];
  const refs = data.lines.filter((l) => same(l["batch_id"], booking["batch_id"])).map((l) => text(orderOf(data, l["order_id"])?.["number"]) ?? "");
  return [...new Set(refs)].filter((r) => r !== "").sort();
}

/** The pieces on the batches a machine has booked from a moment on. */
export function piecesAhead(data: StudioData, bookings: readonly Row[]): number {
  const batches = new Set(bookings.map((b) => b["batch_id"]).filter((v) => v !== null && v !== undefined).map(String));
  return data.lines.filter((l) => l["batch_id"] !== null && l["batch_id"] !== undefined && batches.has(String(l["batch_id"])) && isLive(l)).reduce((a, l) => a + (num(l["pieces"]) ?? num(l["qty"]) ?? 0), 0);
}

// ── the shelf ───────────────────────────────────────────────────────────────

/** Whether a material is at or under its reorder point, by what is available (on hand less committed). */
export function isLow(material: Row): boolean {
  const reorder = num(material["reorder_at"]);
  const available = num(material["available"]);
  return reorder !== null && available !== null && available <= reorder;
}

/** The shelf's last count: its day (by its newest row) and its rows, each counted against the book's figure. */
export function lastCount(data: StudioData, dayOfInstant: (iso: string) => string): { at: string; n: number; diff: number } | null {
  const counts = data.movements.filter((m) => m["kind"] === "count" && text(m["made_at"]) !== null);
  if (counts.length === 0) return null;
  const newest = counts.reduce((a, m) => (text(m["made_at"])! > text(a["made_at"])! ? m : a));
  const day = dayOfInstant(text(newest["made_at"])!);
  const that = counts.filter((m) => dayOfInstant(text(m["made_at"])!) === day);
  // A material counted twice that day counts once: its latest count.
  const latest = new Map<string, Row>();
  for (const m of that) {
    const at = latest.get(String(m["material_id"]));
    if (at === undefined || text(m["made_at"])! >= text(at["made_at"])!) latest.set(String(m["material_id"]), m);
  }
  const rows = [...latest.values()];
  const diff = rows.filter((m) => num(m["counted"]) !== (num(m["on_hand_before"]) ?? 0)).length;
  return { at: text(newest["made_at"])!, n: rows.length, diff };
}

/** The materials on the shelf, in the order the studio keeps them. */
export const shelf = (data: StudioData): Row[] => data.materials.filter((m) => m["active"] !== false);

/** A batch's lines, by their orders: what the batch's booking says it is cutting. */
export const linesOfBatch = (data: StudioData, batch: Row): Row[] => data.lines.filter((l) => same(l["batch_id"], batch.id));
