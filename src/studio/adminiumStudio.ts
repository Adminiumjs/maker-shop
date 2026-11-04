/**
 * The studio's door into a real Adminium: the data API as the person signed
 * in to it, the app served by Adminium at `/apps/maker/staff/`, riding that
 * person's session. Their roles and limits hold every read and write: a
 * maker may move a line along the bench and send a proof, never touch a
 * price; a packer may post what is ready.
 *
 * Everything the studio needs to start is in the staff `surface-config.json`:
 * the connection, the tables' real names, the studio's zone and money, its
 * settings, who is signed in and what they may do, the add-ons attached.
 *
 * A move is a change of a state column, judged by the table's states: the
 * state the screen saw goes with it (`from`), so a line that moved on since is
 * refused rather than moved twice. A proof's picture is stored through the
 * files route first, for the proofs table's `picture` column, and the row that
 * sends it names what that store answered.
 *
 * Each engine spells a moment and a yes/no its own way (SQLite: the server's
 * wall time with no zone, and 0 or 1); every row is read back here as the
 * screens expect it, an ISO instant and a boolean.
 */
import type { StaffConfig } from "./transport/staffConnection.ts";
import { SessionPortError, type SessionTransport } from "./transport/sessionSource.ts";
import { momentOf } from "./time.ts";
import type { Action, AddOnTable, Person, ProofPicture, StudioData, StudioDoor, StudioFacts, Table } from "./door.ts";
import { ApiError, type Id, type Row } from "./wire.ts";

const APP_KEY = "maker";
const CUSTOMISER = "customiser";
const PAGE = 200;

/** The moments each table holds: SQLite hands them back without a zone. */
export const MOMENTS: Readonly<Partial<Record<Table | AddOnTable, readonly string[]>>> = {
  customers: ["forgotten_at", "created_at"],
  orders: ["placed_at", "posted_at", "cancelled_at", "link_expires"],
  order_lines: ["placed_at", "started_at", "finishing_at", "made_at"],
  proofs: ["sent_at", "answered_at", "reminded_at"],
  batches: ["started_at", "done_at"],
  machine_bookings: ["starts_at", "ends_at"],
  stock_movements: ["made_at"],
  designs: ["created_at", "updated_at"],
  design_versions: ["made_at"],
  version_files: ["made_at"],
};

/** The yes/no columns each table holds: SQLite and MySQL hand back 0 or 1. */
export const YES_NO: Readonly<Partial<Record<Table, readonly string[]>>> = {
  settings: ["taking_orders"],
  machines: ["active"],
  materials: ["active"],
  products: ["takes_lettering", "published"],
  options: ["active"],
  postage_services: ["tracked", "active"],
  closures: ["active"],
  customers: ["may_email"],
  orders: ["link_stopped", "may_email"],
};

const yesNo = (value: unknown): unknown =>
  value === null || value === undefined || typeof value === "boolean" ? value : value === 1 || value === "1" || value === "true";

/** The transport's refusal as the screens read one: its status, its code, what it said beside. */
function asApiError(error: unknown): unknown {
  if (error instanceof SessionPortError) {
    const details = error.details !== null && typeof error.details === "object" && !Array.isArray(error.details) ? (error.details as Record<string, unknown>) : {};
    return new ApiError(error.status, error.code, error.message, details);
  }
  return error;
}

const q = (value: unknown) => encodeURIComponent(JSON.stringify(value));

export interface StudioDoorOptions {
  /** The server's clock less the device's, as the config said it. */
  skew?: number;
  /** How the picture of a proof is sent: the browser's `fetch`, or a test's. */
  fetchImpl?: typeof fetch;
}

export class AdminiumStudio implements StudioDoor {
  private readonly t: SessionTransport;
  private readonly cfg: StaffConfig;
  private readonly skew: number;
  private readonly fetchImpl: typeof fetch;

  constructor(transport: SessionTransport, config: StaffConfig, options: StudioDoorOptions = {}) {
    this.t = transport;
    this.cfg = config;
    this.skew = options.skew ?? 0;
    this.fetchImpl = options.fetchImpl ?? globalThis.fetch.bind(globalThis);
  }

  // ── the wire ──────────────────────────────────────────────────────────────

  private get serverZone(): string {
    return this.cfg.serverTimezone ?? "UTC";
  }
  /** A table's real name: the server's, or the app's prefix when it does not say. */
  private real(table: Table): string {
    return this.cfg.tables[table] ?? `${APP_KEY}_${table}`;
  }
  private realAddOn(table: AddOnTable): string {
    return this.cfg.tables[`${CUSTOMISER}:${table}`] ?? `${CUSTOMISER}_${table}`;
  }
  private async conn(): Promise<string> {
    return this.cfg.connectionId ?? (await this.t.connection());
  }
  private async path(real: string, rest = ""): Promise<string> {
    return `/api/v1/data/${encodeURIComponent(await this.conn())}/${encodeURIComponent(real)}${rest}`;
  }
  private row(table: Table | AddOnTable, row: Row): Row {
    const out: Row = { ...row };
    for (const column of MOMENTS[table] ?? []) if (column in out) out[column] = momentOf(out[column], this.serverZone);
    for (const column of YES_NO[table as Table] ?? []) if (column in out) out[column] = yesNo(out[column]);
    return out;
  }
  private async run<T>(work: () => Promise<T>): Promise<T> {
    try {
      return await work();
    } catch (error) {
      throw asApiError(error);
    }
  }
  private async listReal(table: Table | AddOnTable, real: string, query: { where?: unknown; order?: string } = {}): Promise<Row[]> {
    const rows: Row[] = [];
    const extra = `${query.where === undefined ? "" : `&where=${q(query.where)}`}${query.order === undefined ? "" : `&order=${encodeURIComponent(query.order)}`}`;
    for (let offset = 0; offset < 50 * PAGE; offset += PAGE) {
      const got = await this.t.get<{ data: Row[] }>(await this.path(real, `?limit=${String(PAGE)}&offset=${String(offset)}${extra}`));
      rows.push(...got.data.map((r) => this.row(table, r)));
      if (got.data.length < PAGE) break;
    }
    return rows;
  }
  /** A table the person may read, every row; none at all when their roles do not let them read it. */
  private async list(table: Table, order?: string): Promise<Row[]> {
    if (!this.who().can(table, "read")) return [];
    return this.listReal(table, this.real(table), order === undefined ? {} : { order });
  }
  private async create(table: Table, values: Record<string, unknown>): Promise<Row> {
    return this.row(table, (await this.t.mutate<{ data: Row }>(await this.path(this.real(table)), "POST", { values })).data);
  }
  private async change(table: Table, id: Id, values: Record<string, unknown>, from?: string): Promise<Row> {
    const body = from === undefined ? { values } : { values, from };
    return this.row(table, (await this.t.mutate<{ data: Row }>(await this.path(this.real(table), `/${encodeURIComponent(String(id))}`), "PATCH", body)).data);
  }

  // ── who, and the studio ───────────────────────────────────────────────────

  who(): Person {
    const prefix = `${APP_KEY}-`;
    const roles = (this.cfg.access?.roles ?? []).map((r) => r.slug).filter((slug) => slug.startsWith(prefix)).map((slug) => slug.slice(prefix.length));
    const access = this.cfg.access;
    return {
      name: this.cfg.user?.name ?? "",
      roles,
      can: (table: Table, action: Action) => access === null || (access.tables[table]?.includes(action) ?? false),
    };
  }

  facts(): StudioFacts {
    const days = this.cfg.settings["studio_days"];
    return {
      zone: this.cfg.timezone ?? this.cfg.serverTimezone ?? "UTC",
      currency: this.cfg.currency ?? "GBP",
      studioDays: (typeof days === "string" && days.trim() !== "" ? days : "tue,wed,thu,fri,sat").split(",").map((d) => d.trim().toLowerCase().slice(0, 3)),
      addOns: Object.keys(this.cfg.addOns),
      connectionId: this.cfg.connectionId,
    };
  }

  now(): number {
    return Date.now() + this.skew;
  }

  load(): Promise<StudioData> {
    return this.run(async () => {
      // The session's write token comes with the first read.
      await this.t.port.config();
      const [settings, products, options, materials, machines, services, closures, customers, orders, lines, features, proofs, bookings, batches, movements] = await Promise.all([
        this.list("settings"),
        this.list("products", "position.asc,id.asc"),
        this.list("options", "position.asc,id.asc"),
        this.list("materials", "position.asc,id.asc"),
        this.list("machines", "position.asc,id.asc"),
        this.list("postage_services", "position.asc,id.asc"),
        this.list("closures"),
        this.list("customers"),
        this.list("orders", "id.asc"),
        this.list("order_lines", "order_id.asc,position.asc"),
        this.list("order_line_features"),
        this.list("proofs", "line_id.asc,version.asc"),
        this.list("machine_bookings", "starts_at.asc"),
        this.list("batches", "id.asc"),
        this.list("stock_movements", "id.asc"),
      ]);
      // The designs the lines name, and their versions: the Customiser's rows, read as its readers may.
      const designIds = [...new Set(lines!.map((l) => l["design_id"]).filter((v) => v !== null && v !== undefined))];
      let designs: Row[] = [];
      let versions: Row[] = [];
      let files: Row[] = [];
      if (designIds.length > 0) {
        try {
          [designs, versions] = await Promise.all([
            this.listReal("designs", this.realAddOn("designs"), { where: { column: "id", op: "in", value: designIds } }),
            this.listReal("design_versions", this.realAddOn("design_versions"), { where: { column: "design_id", op: "in", value: designIds }, order: "version.desc" }),
          ]);
        } catch (error) {
          // Someone the Customiser's tables are closed to sees the lines without their designs.
          if (!(error instanceof SessionPortError && (error.status === 403 || error.status === 404))) throw error;
        }
      }
      // The machines' files of those versions, for the cut list: read as the Customiser's readers may, or not at all.
      if (versions.length > 0) {
        try {
          files = await this.listReal("version_files", this.realAddOn("version_files"), { where: { column: "version_id", op: "in", value: versions.map((v) => v.id) }, order: "position.asc" });
        } catch (error) {
          if (!(error instanceof SessionPortError && (error.status === 403 || error.status === 404))) throw error;
        }
      }
      return { settings: settings![0] ?? null, products: products!, options: options!, materials: materials!, machines: machines!, services: services!, closures: closures!, customers: customers!, orders: orders!, lines: lines!, features: features!, proofs: proofs!, bookings: bookings!, batches: batches!, movements: movements!, designs, versions, files };
    });
  }

  // ── the writes ────────────────────────────────────────────────────────────

  moveLine(line: Row, to: string, values: Record<string, unknown> = {}): Promise<Row> {
    return this.run(() => this.change("order_lines", line.id, { stage: to, ...values }, String(line["stage"])));
  }

  updateLine(line: Row, values: Record<string, unknown>): Promise<Row> {
    return this.run(() => this.change("order_lines", line.id, values));
  }

  moveOrder(order: Row, to: string, values: Record<string, unknown> = {}): Promise<Row> {
    return this.run(() => this.change("orders", order.id, { status: to, ...values }, String(order["status"])));
  }

  supersede(proof: Row): Promise<Row> {
    return this.run(() => this.change("proofs", proof.id, { state: "superseded" }, String(proof["state"])));
  }

  /** What the files route answers for a column: the value the row stores. */
  private async storePicture(picture: ProofPicture): Promise<string> {
    const conn = await this.conn();
    const table = this.real("proofs");
    if ("copyOf" in picture) {
      try {
        const made = await this.t.mutate<{ ref: string }>(`/api/v1/files/${encodeURIComponent(picture.copyOf)}/copy`, "POST", { connectionId: conn, table, column: "picture" });
        return made.ref;
      } catch (error) {
        // The copy route is the dashboard's: someone whose role opens only the app's screens is refused it.
        // Their own browser carries the bytes across instead, read and stored again as the proof's picture.
        if (!(error instanceof SessionPortError && error.status === 403)) throw error;
        const res = await this.fetchImpl(`/api/v1/files/${encodeURIComponent(picture.copyOf)}/content`, { credentials: "same-origin" });
        if (!res.ok) throw asApiError(error);
        const blob = await res.blob();
        return this.storePicture({ blob, filename: `${picture.copyOf}.${blob.type === "image/jpeg" ? "jpg" : blob.type === "application/pdf" ? "pdf" : "png"}` });
      }
    }
    // The bytes are the body: the files route reads no multipart form. The session's token goes with them.
    await this.t.port.config();
    const query = new URLSearchParams({ filename: picture.filename, connectionId: conn, table, column: "picture" });
    const res = await this.fetchImpl(`/api/v1/files?${query.toString()}`, {
      method: "POST",
      credentials: "same-origin",
      headers: { accept: "application/json", "content-type": picture.blob.type || "image/png", ...(this.cfg.csrfToken === null ? {} : { "x-adminium-csrf": this.cfg.csrfToken }) },
      body: picture.blob,
    });
    const body = (await res.json().catch(() => null)) as { ref?: string; error?: { code?: string; message?: string; details?: Record<string, unknown> } } | null;
    if (!res.ok || typeof body?.ref !== "string") {
      throw new ApiError(res.status, body?.error?.code ?? "UPLOAD_FAILED", body?.error?.message ?? "The picture was not stored.", body?.error?.details ?? {});
    }
    return body.ref;
  }

  sendProof(input: { order: Row; line: Row; kind: "lettering" | "design"; picture: ProofPicture | null; designVersionId: Id | null; note: string | null }): Promise<Row> {
    return this.run(async () => {
      const picture = input.picture === null ? null : await this.storePicture(input.picture);
      return this.create("proofs", {
        order_id: input.order.id,
        line_id: input.line.id,
        kind: input.kind,
        ...(picture === null ? {} : { picture }),
        ...(input.designVersionId === null ? {} : { design_version_id: input.designVersionId }),
        ...(input.note === null ? {} : { note: input.note }),
      });
    });
  }

  remind(proof: Row): Promise<Row> {
    return this.run(() => this.change("proofs", proof.id, { reminded_at: new Date(this.now()).toISOString() }));
  }

  spoil(input: { line: Row; materialId: Id; units: number; note: string | null }): Promise<Row> {
    return this.run(() =>
      this.create("stock_movements", {
        material_id: input.materialId,
        kind: "spoiled",
        units: input.units,
        line_id: input.line.id,
        ...(input.note === null ? {} : { note: input.note }),
      }),
    );
  }

  saveProduct(product: Row, values: Record<string, unknown>): Promise<Row> {
    return this.run(() => this.change("products", product.id, values));
  }

  // ── making ────────────────────────────────────────────────────────────────

  book(input: { machineId: Id; label: string; startsAt: string; endsAt: string }): Promise<Row> {
    return this.run(() => this.create("machine_bookings", { machine_id: input.machineId, kind: "run", label: input.label, starts_at: input.startsAt, ends_at: input.endsAt }));
  }

  unbook(booking: Row): Promise<void> {
    return this.run(async () => {
      await this.t.mutate(await this.path(this.real("machine_bookings"), `/${encodeURIComponent(String(booking.id))}`), "DELETE");
    });
  }

  createBatch(input: { label: string; machineId: Id; materialId: Id; sheets: number }): Promise<Row> {
    return this.run(async () => {
      // The batch and the sheets it takes off the shelf, in one write: the movement is a row below the batch.
      const body = {
        values: { label: input.label, machine_id: input.machineId, material_id: input.materialId, sheets: input.sheets },
        children: { stock_movements: [{ values: { material_id: input.materialId, kind: "used", qty: input.sheets } }] },
      };
      return this.row("batches", (await this.t.mutate<{ data: Row }>(await this.path(this.real("batches")), "POST", body)).data);
    });
  }

  moveBatch(batch: Row, to: string): Promise<Row> {
    return this.run(() => this.change("batches", batch.id, { state: to }, String(batch["state"])));
  }

  tieBooking(booking: Row, batchId: Id): Promise<Row> {
    return this.run(() => this.change("machine_bookings", booking.id, { batch_id: batchId }));
  }

  count(input: { materialId: Id; counted: number }): Promise<Row> {
    return this.run(() => this.create("stock_movements", { material_id: input.materialId, kind: "count", counted: input.counted }));
  }

  render(input: { kind: string; ref: Table; pk: Id; values?: Record<string, unknown> }): Promise<{ contentUrl: string; printUrl: string | null }> {
    return this.run(async () => {
      const body = { kind: input.kind, ref: input.ref, pk: { id: input.pk }, ...(input.values === undefined ? {} : { values: input.values }) };
      const made = await this.t.mutate<{ contentUrl: string; printUrl?: string }>(`/api/v1/apps/${APP_KEY}/documents/render`, "POST", body);
      return { contentUrl: made.contentUrl, printUrl: made.printUrl ?? null };
    });
  }
}
