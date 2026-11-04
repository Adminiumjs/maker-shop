/**
 * The studio's door into the demo's Adminium: every row the screens read,
 * and each write made the way the real server makes it — a line held at
 * "make" until its proof is approved, a move refused when the row has moved
 * on since the screen read it, a proof numbered per line, a booking that
 * overlaps another refused, a batch and the sheets it takes saved together.
 *
 * Signed in as Ada, who owns the studio, so every screen is open.
 *
 * DEMO BUILD ONLY — nothing in a real build imports it.
 */
import type { Person, ProofPicture, StudioData, StudioDoor, StudioFacts } from "../studio/door.ts";
import { LINE_MOVES, ORDER_MOVES } from "../studio/facts.ts";
import { ApiError, type Id, type Row } from "../studio/wire.ts";
import { STUDIO_DAYS } from "./rules.ts";
import type { DemoWorld } from "./world.ts";

const same = (a: unknown, b: unknown) => a !== null && a !== undefined && b !== null && b !== undefined && String(a) === String(b);
const copy = <T>(value: T): T => structuredClone(value);
const byNumber = (column: string) => (a: Row, b: Row) => Number(a[column] ?? 0) - Number(b[column] ?? 0) || Number(a.id) - Number(b.id);

/** The person the studio is signed in as. */
export const DEMO_PERSON: Person = { name: "Ada", roles: ["owner"], can: () => true };

export class DemoStudio implements StudioDoor {
  private readonly world: DemoWorld;

  constructor(world: DemoWorld) {
    this.world = world;
  }

  who(): Person {
    return DEMO_PERSON;
  }

  facts(): StudioFacts {
    return { zone: this.world.zone, currency: this.world.currency, studioDays: [...STUDIO_DAYS], addOns: [...this.world.addOns], connectionId: null };
  }

  now(): number {
    return this.world.now;
  }

  async load(): Promise<StudioData> {
    const w = this.world;
    const lines = [...w.all("order_lines")].sort((a, b) => Number(a["order_id"]) - Number(b["order_id"]) || Number(a["position"] ?? 0) - Number(b["position"] ?? 0));
    const named = new Set(lines.map((l) => String(l["design_id"] ?? "")).filter((id) => id !== ""));
    const versions = w.all("design_versions").filter((v) => named.has(String(v["design_id"]))).sort((a, b) => Number(b["version"]) - Number(a["version"]));
    const versionIds = new Set(versions.map((v) => String(v.id)));
    return copy({
      settings: w.settings(),
      products: [...w.all("products")].sort(byNumber("position")),
      options: [...w.all("options")].sort(byNumber("position")),
      materials: [...w.all("materials")].sort(byNumber("position")),
      machines: [...w.all("machines")].sort(byNumber("position")),
      services: [...w.all("postage_services")].sort(byNumber("position")),
      closures: w.all("closures"),
      customers: w.all("customers"),
      orders: w.all("orders"),
      lines,
      features: w.all("order_line_features"),
      proofs: [...w.all("proofs")].sort((a, b) => Number(a["line_id"]) - Number(b["line_id"]) || Number(a["version"]) - Number(b["version"])),
      bookings: [...w.all("machine_bookings")].sort((a, b) => String(a["starts_at"]).localeCompare(String(b["starts_at"]))),
      batches: w.all("batches"),
      movements: w.all("stock_movements"),
      designs: w.all("designs").filter((d) => named.has(String(d.id))),
      versions,
      files: w.all("version_files").filter((f) => versionIds.has(String(f["version_id"]))),
    });
  }

  /** A row moved from the state the screen saw: refused when it is not there any more, or the move is not one the table allows. */
  private move(table: string, row: Row, column: string, to: string, moves: Readonly<Record<string, readonly string[]>>, values: Record<string, unknown> = {}): Row {
    const held = this.world.get(table, row.id);
    if (held === undefined) throw new ApiError(404, "NOT_FOUND", "No such row.");
    const from = String(held[column]);
    if (from !== String(row[column])) throw new ApiError(409, "STATE_MOVE_REFUSED", "It moved on.", { from, to, named: row[column] });
    if (!(moves[from] ?? []).includes(to)) throw new ApiError(409, "STATE_MOVE_REFUSED", "Not a move this table makes.", { from, to });
    return this.world.update(table, row.id, { [column]: to, ...values });
  }

  async moveLine(line: Row, to: string, values: Record<string, unknown> = {}): Promise<Row> {
    const held = this.world.get("order_lines", line.id);
    // Words or a design go to the bench once the proof is approved (the move's `requires`).
    if (held !== undefined && held["stage"] === "make" && to === "making" && Number(held["proof_ok"]) !== 1) throw new ApiError(409, "STATE_MOVE_REFUSED", "The proof is not approved.", { from: "make", to: "making" });
    const at = this.world.nowIso();
    const stamps = to === "making" ? { started_at: at } : to === "finishing" ? { finishing_at: at } : to === "ready" ? { made_at: at, made_by: DEMO_PERSON.name } : {};
    const row = this.move("order_lines", line, "stage", to, LINE_MOVES, { ...stamps, ...values });
    this.world.changed();
    return copy(row);
  }

  async updateLine(line: Row, values: Record<string, unknown>): Promise<Row> {
    const row = this.world.update("order_lines", line.id, values);
    this.world.changed();
    return copy(row);
  }

  async moveOrder(order: Row, to: string, values: Record<string, unknown> = {}): Promise<Row> {
    const stamps = to === "posted" ? { posted_at: this.world.nowIso(), posted_by: DEMO_PERSON.name } : to === "cancelled" ? { cancelled_at: this.world.nowIso() } : {};
    const row = this.move("orders", order, "status", to, ORDER_MOVES, { ...stamps, ...values });
    this.world.changed();
    return copy(row);
  }

  async supersede(proof: Row): Promise<Row> {
    const row = this.world.update("proofs", proof.id, { state: "superseded" });
    this.world.changed();
    return copy(row);
  }

  async sendProof(input: { order: Row; line: Row; kind: "lettering" | "design"; picture: ProofPicture | null; designVersionId: Id | null; note: string | null }): Promise<Row> {
    const w = this.world;
    const version = w.all("proofs").filter((p) => same(p["line_id"], input.line.id)).reduce((top, p) => Math.max(top, Number(p["version"] ?? 0)), 0) + 1;
    const row = w.insert("proofs", { order_id: input.order.id, line_id: input.line.id, version, kind: input.kind, design_version_id: input.designVersionId, note: input.note, picture: null, state: "sent", sent_at: w.nowIso(), answered_at: null, reminded_at: null, change_note: null });
    if (input.picture !== null && "blob" in input.picture) {
      w.pictures.set(String(row.id), input.picture.blob);
      row["picture"] = typeof URL.createObjectURL === "function" ? URL.createObjectURL(input.picture.blob) : null;
    }
    w.changed();
    return copy(row);
  }

  async remind(proof: Row): Promise<Row> {
    const row = this.world.update("proofs", proof.id, { reminded_at: this.world.nowIso() });
    this.world.changed();
    return copy(row);
  }

  async spoil(input: { line: Row; materialId: Id; units: number; note: string | null }): Promise<Row> {
    const line = this.world.get("order_lines", input.line.id);
    const row = this.world.insert("stock_movements", { material_id: input.materialId, kind: "spoiled", qty: null, units: input.units, per_unit: line?.["stock_per_unit"] ?? null, line_id: input.line.id, note: input.note, made_at: this.world.nowIso() });
    this.world.changed();
    return copy(row);
  }

  async saveProduct(product: Row, values: Record<string, unknown>): Promise<Row> {
    const row = this.world.update("products", product.id, values);
    this.world.changed();
    return copy(row);
  }

  async book(input: { machineId: Id; label: string; startsAt: string; endsAt: string }): Promise<Row> {
    const from = Date.parse(input.startsAt);
    const to = Date.parse(input.endsAt);
    const taken = this.world.all("machine_bookings").some((b) => same(b["machine_id"], input.machineId) && Date.parse(String(b["starts_at"])) < to && from < Date.parse(String(b["ends_at"])));
    if (taken) throw new ApiError(409, "BOOKING_TAKEN", "The machine is booked then.");
    const row = this.world.insert("machine_bookings", { machine_id: input.machineId, kind: "run", label: input.label, starts_at: new Date(from).toISOString(), ends_at: new Date(to).toISOString(), batch_id: null });
    this.world.changed();
    return copy(row);
  }

  async unbook(booking: Row): Promise<void> {
    this.world.remove("machine_bookings", booking.id);
    this.world.changed();
  }

  async createBatch(input: { label: string; machineId: Id; materialId: Id; sheets: number }): Promise<Row> {
    const w = this.world;
    // Its state is the table's first, which Adminium fills in and no screen reads; `moveBatch` writes the next.
    const batch = w.insert("batches", { label: input.label, machine_id: input.machineId, material_id: input.materialId, sheets: input.sheets, state: null });
    w.insert("stock_movements", { material_id: input.materialId, kind: "used", qty: input.sheets.toFixed(2), batch_id: batch.id, note: input.label, made_at: w.nowIso() });
    w.changed();
    return copy(batch);
  }

  async moveBatch(batch: Row, to: string): Promise<Row> {
    const row = this.world.update("batches", batch.id, { state: to });
    this.world.changed();
    return copy(row);
  }

  async tieBooking(booking: Row, batchId: Id): Promise<Row> {
    const row = this.world.update("machine_bookings", booking.id, { batch_id: batchId });
    this.world.changed();
    return copy(row);
  }

  async count(input: { materialId: Id; counted: number }): Promise<Row> {
    const w = this.world;
    const before = Number(w.get("materials", input.materialId)?.["on_hand"] ?? 0);
    const row = w.insert("stock_movements", { material_id: input.materialId, kind: "count", counted: input.counted, on_hand_before: before, made_at: w.nowIso() });
    w.changed();
    return copy(row);
  }

  /**
   * A sheet of labels, as Barcode labels would draw it: one line of text a
   * piece, in a page of its own. A picture made in the browser, so it opens
   * without a server.
   */
  async render(input: { kind: string; ref: string; pk: Id }): Promise<{ contentUrl: string; printUrl: string | null }> {
    const line = this.world.get(input.ref, input.pk);
    const code = String(line?.["label_code"] ?? line?.id ?? "");
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="400" height="120" viewBox="0 0 400 120"><rect width="400" height="120" fill="#fff"/><text x="20" y="50" font-family="monospace" font-size="28">${code}</text><text x="20" y="90" font-family="sans-serif" font-size="18">${String(line?.["product_name"] ?? "")}</text></svg>`;
    const url = typeof URL.createObjectURL === "function" ? URL.createObjectURL(new Blob([svg], { type: "image/svg+xml" })) : `data:image/svg+xml,${encodeURIComponent(svg)}`;
    return { contentUrl: url, printUrl: null };
  }
}
