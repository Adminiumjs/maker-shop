/**
 * A stand-in for the studio's door: it keeps the fixture's rows, writes each
 * change into them the way the server would store it (a stage, a status, a
 * new proof row), and records every call, in order, with what it was given.
 * A test can make the next call of a kind refuse, as Adminium would.
 *
 * Tests only; nothing that ships imports it.
 */
import type { Person, ProofPicture, StudioData, StudioDoor, StudioFacts } from "../door.ts";
import { ApiError, same, type Id, type Row } from "../wire.ts";
import { FACTS, fixture, person, THURSDAY } from "./fixture.ts";

export interface Call {
  method: string;
  args: Record<string, unknown>;
}

export class FakeDoor implements StudioDoor {
  data: StudioData;
  calls: Call[] = [];
  private readonly person: Person;
  private readonly studio: StudioFacts;
  private refusals = new Map<string, ApiError>();
  private nextId = 5000;

  constructor(options: { roles?: string[]; data?: StudioData; facts?: Partial<StudioFacts> } = {}) {
    this.data = options.data ?? fixture();
    this.person = person(options.roles ?? ["owner"]);
    this.studio = { ...FACTS, ...options.facts };
  }

  /** The next call of `method` is refused with this. */
  refuse(method: string, error: ApiError): void {
    this.refusals.set(method, error);
  }

  private record(method: string, args: Record<string, unknown>): void {
    this.calls.push({ method, args });
    const refusal = this.refusals.get(method);
    if (refusal !== undefined) {
      this.refusals.delete(method);
      throw refusal;
    }
  }

  private update(list: Row[], id: Id, values: Record<string, unknown>): Row {
    const i = list.findIndex((r) => same(r.id, id));
    if (i < 0) throw new ApiError(404, "NOT_FOUND", "No such row.");
    list[i] = { ...list[i]!, ...values };
    return list[i]!;
  }

  who(): Person {
    return this.person;
  }
  facts(): StudioFacts {
    return this.studio;
  }
  now(): number {
    return THURSDAY;
  }
  async load(): Promise<StudioData> {
    return structuredClone(this.data);
  }

  async moveLine(line: Row, to: string, values: Record<string, unknown> = {}): Promise<Row> {
    this.record("moveLine", { id: line.id, from: line["stage"], to, values });
    return this.update(this.data.lines, line.id, { stage: to, ...values });
  }
  async updateLine(line: Row, values: Record<string, unknown>): Promise<Row> {
    this.record("updateLine", { id: line.id, values });
    return this.update(this.data.lines, line.id, values);
  }
  async moveOrder(order: Row, to: string, values: Record<string, unknown> = {}): Promise<Row> {
    this.record("moveOrder", { id: order.id, from: order["status"], to, values });
    return this.update(this.data.orders, order.id, { status: to, ...values });
  }
  async supersede(proof: Row): Promise<Row> {
    this.record("supersede", { id: proof.id, from: proof["state"] });
    return this.update(this.data.proofs, proof.id, { state: "superseded" });
  }
  async sendProof(input: { order: Row; line: Row; kind: "lettering" | "design"; picture: ProofPicture | null; designVersionId: Id | null; note: string | null }): Promise<Row> {
    const picture = input.picture === null ? null : "copyOf" in input.picture ? { copyOf: input.picture.copyOf } : { filename: input.picture.filename, type: input.picture.blob.type };
    this.record("sendProof", { order: input.order.id, line: input.line.id, kind: input.kind, picture, designVersionId: input.designVersionId, note: input.note });
    this.nextId += 1;
    const version = this.data.proofs.filter((p) => same(p["line_id"], input.line.id)).length + 1;
    const row: Row = { id: this.nextId, order_id: input.order.id, line_id: input.line.id, version, kind: input.kind, picture: "/api/v1/files/file_01J8Z6Q3M4N5P6R7S8T9V0W1XZ/content", state: "sent", sent_at: new Date(THURSDAY).toISOString() };
    this.data.proofs.push(row);
    this.update(this.data.lines, input.line.id, { proof_state: "sent", proof_ok: 0 });
    return row;
  }
  async remind(proof: Row): Promise<Row> {
    this.record("remind", { id: proof.id });
    return this.update(this.data.proofs, proof.id, { reminded_at: new Date(THURSDAY).toISOString() });
  }
  async spoil(input: { line: Row; materialId: Id; units: number; note: string | null }): Promise<Row> {
    this.record("spoil", { line: input.line.id, materialId: input.materialId, units: input.units, note: input.note });
    this.nextId += 1;
    return { id: this.nextId, kind: "spoiled", units: input.units, line_id: input.line.id, material_id: input.materialId };
  }
  async saveProduct(product: Row, values: Record<string, unknown>): Promise<Row> {
    this.record("saveProduct", { id: product.id, values });
    return this.update(this.data.products, product.id, values);
  }

  /** The calls made, as `method id→to` lines, for a short assertion. */
  trail(): string[] {
    return this.calls.map((c) => {
      const a = c.args;
      if (c.method === "moveLine" || c.method === "moveOrder") return `${c.method} ${String(a["id"])} ${String(a["from"])}→${String(a["to"])}`;
      return `${c.method} ${String(a["id"] ?? a["line"])}`;
    });
  }
}
