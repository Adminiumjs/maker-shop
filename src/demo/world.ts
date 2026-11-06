/**
 * The demo's Adminium for Birch Row, in the page: the sample's rows, held in
 * memory and worked by the manifest's rules (`rules.ts`), a clock that stands
 * on Thursday 6 August 2026 at 16:40 until the demo card moves it, and the
 * add-ons switched on. The shop's door (`shop.ts`) and the studio's
 * (`studio.ts`) both read and write this one world, so an order placed in the
 * shop is on the studio's bench the moment it is placed.
 *
 * The sample's orders carry their own numbers (BR-2241 to BR-2290) and no
 * running number, so the first order placed here is BR-2291, as the
 * settings' `first_order_number` says.
 *
 * DEMO BUILD ONLY — nothing in a real build imports it.
 */
import { dayIn, momentOf } from "../studio/time.ts";
import { closuresIn, deriveAll, nextStudioDay, type Tables } from "./rules.ts";
import { DEMO_START, DEMO_ZONE, sampleTables, type Row } from "./sample.ts";

/** Tables the sample adds no rows to, which the screens still read or write. */
const EMPTY = ["batches", "commission_requests", "problem_reports", "version_files", "order_line_features", "proofs", "postage_rates", "closures"];

/** The add-ons a new demo starts with: the Customiser the app requires, and Invoices, which the install ticks. */
export const START_ADD_ONS = ["customiser", "invoices"] as const;

/** The add-ons the demo card switches, by their marketplace keys. */
export const CARD_ADD_ONS = ["shipping-dhl", "barcode-labels", "inventory", "invoices", "holiday-calendars"] as const;
export type CardAddOn = (typeof CARD_ADD_ONS)[number];

const same = (a: unknown, b: unknown) => a !== null && a !== undefined && b !== null && b !== undefined && String(a) === String(b);
const pad = (n: number, width: number) => String(n).padStart(width, "0");

export class DemoWorld {
  now: number;
  readonly zone = DEMO_ZONE;
  readonly currency = "GBP";
  readonly tables: Tables;
  readonly addOns: Set<string>;
  /** The codes "e-mailed" to an address, newest last: the demo has no post office, so the card types them. */
  readonly codes = new Map<string, string[]>();
  /** Pictures the studio drew for a proof, by the proof's key: the shop's "Your order" shows the same one. */
  readonly pictures = new Map<string, Blob>();
  private readonly nextIds: Record<string, number> = {};
  private readonly listeners = new Set<() => void>();
  private serial = 0;

  constructor(start = DEMO_START) {
    this.now = start;
    this.tables = sampleTables();
    for (const table of EMPTY) this.tables[table] ??= [];
    for (const [table, rows] of Object.entries(this.tables)) this.nextIds[table] = Math.max(0, ...rows.map((r) => r.id)) + 1;
    this.addOns = new Set(START_ADD_ONS);
    deriveAll(this.tables);
  }

  // ── reading ───────────────────────────────────────────────────────────────

  all(table: string): Row[] {
    return (this.tables[table] ??= []);
  }

  get(table: string, id: unknown): Row | undefined {
    return this.all(table).find((r) => same(r.id, id));
  }

  settings(): Row {
    return this.all("settings")[0] ?? { id: 1 };
  }

  /** The studio's day and wall time now. */
  today(): string {
    return dayIn(this.now, this.zone);
  }

  wallTime(): string {
    return new Intl.DateTimeFormat("en-GB", { timeZone: this.zone, hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).format(new Date(this.now));
  }

  nowIso(): string {
    return new Date(this.now).toISOString();
  }

  // ── writing ───────────────────────────────────────────────────────────────

  insert(table: string, values: Record<string, unknown>): Row {
    const id = (this.nextIds[table] ??= 1);
    this.nextIds[table] = id + 1;
    const row = { ...values, id } as Row;
    this.all(table).push(row);
    return row;
  }

  update(table: string, id: unknown, values: Record<string, unknown>): Row {
    const row = this.get(table, id);
    if (row === undefined) throw new Error(`no ${table} ${String(id)}`);
    Object.assign(row, values);
    return row;
  }

  remove(table: string, id: unknown): void {
    this.tables[table] = this.all(table).filter((r) => !same(r.id, id));
  }

  /** After a write: every stored figure again, then whoever is watching. */
  changed(): void {
    deriveAll(this.tables);
    for (const listener of this.listeners) listener();
  }

  onChange(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  /** A code nobody else has, of a given length, for a link or a design: counted, never drawn at random. */
  code(prefix: string, length = 16): string {
    this.serial += 1;
    return `${prefix}${pad(this.serial, Math.max(1, length - prefix.length))}`.slice(0, length);
  }

  /** The order number the next order takes: the settings' first number, then one past the last given. */
  nextNumber(): { seq: number; number: string } {
    const first = Number(this.settings()["first_order_number"] ?? 1);
    const given = this.all("orders").map((o) => Number(o["number_seq"])).filter((n) => Number.isFinite(n) && n > 0);
    const seq = given.length === 0 ? first : Math.max(...given) + 1;
    return { seq, number: `${String(this.settings()["ref_prefix"] ?? "")}${String(seq)}` };
  }

  // ── the clock and the add-ons ─────────────────────────────────────────────

  /** "+1 studio day": the next day the studio works (Tuesday to Saturday, not a closure), at the same time of day. */
  advanceStudioDay(): void {
    const next = nextStudioDay(this.today(), closuresIn(this.tables));
    this.now = Date.parse(String(momentOf(`${next} ${this.wallTime()}`, this.zone)));
    this.changed();
  }

  setAddOn(key: string, on: boolean): void {
    if (on) this.addOns.add(key);
    else this.addOns.delete(key);
    this.changed();
  }
}
