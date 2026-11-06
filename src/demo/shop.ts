/**
 * The shop's doors into the demo's Adminium: the catalogue and the order
 * (`ShopPort`), the pages after an order (`AfterPort`) and the Customiser's
 * calls (`CustomiserApi`), each answering as the real ones do — a dry run's
 * figures, an order saved once at the total the shopper was shown, a code
 * "e-mailed" before an order opens — over the one world the studio reads.
 *
 * DEMO BUILD ONLY — nothing in a real build imports it.
 */
import type { CustomiserApi, DesignData, DesignValues, HeldSession, SavedDesign } from "../../vendor/customiser/index.js";
import type { AfterPort, CodeAnswer, Extras, OrderRead, ProofAnswer, Via } from "../shop/after-port.ts";
import { catalogueFrom } from "../shop/door.ts";
import { ShopError, type Catalogue, type Figures, type Id, type OrderBody, type Placed, type Refused, type ShopConfig, type ShopPort } from "../shop/port.ts";
import { deriveLine, deriveOrder, postBy, closuresIn, CUTOFF, STUDIO_DAYS } from "./rules.ts";
import type { Row } from "./sample.ts";
import type { DemoWorld } from "./world.ts";

const same = (a: unknown, b: unknown) => a !== null && a !== undefined && b !== null && b !== undefined && String(a) === String(b);
const lower = (value: unknown) => String(value ?? "").trim().toLowerCase();
const copy = <T>(value: T): T => structuredClone(value);

/** The codes the demo's Adminium issues for an order lookup, in the order it issues them. */
export const DEMO_CODES = ["482913", "730561", "195738", "864205"] as const;

function refusal(code: string, status: number, more: Partial<Refused> = {}): ShopError {
  return new ShopError({ code, status, column: null, child: null, index: null, reason: null, changed: null, raw: { code, params: {} }, ...more }, code);
}

/** The order and its lines as the save would write them, kept apart from the world: a dry run. */
function draft(world: DemoWorld, body: OrderBody): { order: Row; lines: Row[]; features: Row[] } {
  const order: Row = { id: -1, ...body.values, placed_at: world.nowIso() };
  const features: Row[] = [];
  const lines = body.children.order_lines.map((child, i) => {
    const line: Row = { id: -(i + 2), order_id: -1, position: i + 1, lettering: null, design_code: null, ...child.values };
    const code = typeof line["design_code"] === "string" ? line["design_code"] : null;
    line["design_id"] = code === null ? null : (world.all("designs").find((d) => d["code"] === code)?.id ?? null);
    for (const f of child.children?.order_line_features ?? []) features.push({ id: -(100 + features.length), line_id: line.id, option_id: f.values.option_id });
    return line;
  });
  const tables = { ...world.tables, orders: [order], order_lines: lines, order_line_features: features, proofs: [] };
  const closures = closuresIn(world.tables);
  for (const line of lines) {
    deriveLine(line, tables);
    line["post_by"] = postBy(world.today(), world.wallTime(), Number(line["lead_days"] ?? 0), closures);
  }
  deriveOrder(order, tables);
  return { order, lines, features };
}

export class DemoShop implements ShopPort {
  private readonly world: DemoWorld;
  readonly afterDoor: DemoAfter;
  private readonly api: CustomiserApi;

  constructor(world: DemoWorld) {
    this.world = world;
    this.afterDoor = new DemoAfter(world);
    this.api = demoCustomiser(world);
  }

  async config(): Promise<ShopConfig> {
    return { timezone: this.world.zone, currency: this.world.currency };
  }

  async catalogue(): Promise<Catalogue> {
    const w = this.world;
    const live = (row: Row) => row["active"] !== false;
    return catalogueFrom(
      {
        products: w.all("products").filter((p) => p["published"] !== false).map(copy),
        options: w.all("options").filter(live).map(copy),
        materials: w.all("materials").filter(live).map(copy),
        services: w.all("postage_services").filter(live).map(copy),
        settings: [copy(w.settings())],
      },
      () => null,
    );
  }

  async quote(body: OrderBody): Promise<Figures> {
    const made = draft(this.world, body);
    return copy({ order: made.order, lines: made.lines });
  }

  async place(body: OrderBody, clientKey: string, expectTotal: string): Promise<Placed> {
    const w = this.world;
    const again = w.all("orders").find((o) => o["client_key"] === clientKey);
    if (again !== undefined) {
      return copy({ order: again, lines: w.all("order_lines").filter((l) => same(l["order_id"], again.id)), replayed: true, link: { token: String(again["link_token"]) } });
    }
    if (w.settings()["taking_orders"] === false) throw refusal("PUBLIC_WRITE_CLOSED", 409);
    const made = draft(w, body);
    if (made.order["total"] !== expectTotal) throw refusal("PUBLIC_PRICE_CHANGED", 409, { changed: copy({ order: made.order, lines: made.lines }) });

    const email = lower(body.values["email"]);
    const customer =
      w.all("customers").find((c) => lower(c["email"]) === email) ??
      w.insert("customers", { email, name: body.values["name"] ?? null, language: body.values["language"] ?? "en-US", may_email: body.values["may_email"] === true, created_at: w.nowIso() });
    const { seq, number } = w.nextNumber();
    const order = w.insert("orders", {
      ...body.values,
      email,
      number_seq: seq,
      number,
      status: "placed",
      customer_id: customer.id,
      placed_at: w.nowIso(),
      posted_at: null,
      tracking: null,
      client_key: clientKey,
      link_token: w.code("LINK"),
      link_stopped: false,
    });
    for (const [i, line] of made.lines.entries()) {
      const saved = w.insert("order_lines", { ...line, id: undefined, order_id: order.id, position: i + 1, stage: "make", spoiled: 0, batch_id: null, started_at: null, finishing_at: null, made_at: null });
      for (const f of made.features.filter((one) => one.line_id === line.id)) {
        const option = w.get("options", f["option_id"]);
        const feature = w.all("features").find((one) => one["code"] === option?.["feature_code"]);
        w.insert("order_line_features", { line_id: saved.id, option_id: f["option_id"], feature_id: feature?.id ?? null });
      }
      if (saved["design_id"] !== null) w.update("designs", saved["design_id"], { state: "ordered" });
    }
    w.changed();
    const placed = w.get("orders", order.id)!;
    return copy({ order: placed, lines: w.all("order_lines").filter((l) => same(l["order_id"], order.id)), replayed: false, link: { token: String(placed["link_token"]) } });
  }

  customiser(): CustomiserApi {
    return this.api;
  }

  after(): AfterPort {
    return this.afterDoor;
  }
}

/** The pages after an order, as the demo's Adminium answers them. */
export class DemoAfter implements AfterPort {
  private readonly world: DemoWorld;
  /** Who is signed in, by address: a code typed back, or the card's "signed in as". */
  session: string | null = null;
  /** The order the order's own link opened. */
  private linked: Id | null = null;

  constructor(world: DemoWorld) {
    this.world = world;
  }

  async requestCode(email: string): Promise<void> {
    const key = lower(email);
    const sent = this.world.codes.get(key) ?? [];
    sent.push(DEMO_CODES[sent.length % DEMO_CODES.length]!);
    this.world.codes.set(key, sent);
  }

  /** The newest code sent to an address, as the card's "Fill the code" types it. */
  codeFor(email: string): string | null {
    const sent = this.world.codes.get(lower(email)) ?? [];
    return sent[sent.length - 1] ?? null;
  }

  async verifyCode(email: string, code: string): Promise<CodeAnswer> {
    const key = lower(email);
    const sent = this.world.codes.get(key) ?? [];
    if (sent.length === 0 || code.trim() !== sent[sent.length - 1]) return sent.slice(0, -1).includes(code.trim()) ? { ok: false, reason: "spent" } : { ok: false, reason: "wrong", triesLeft: 4 };
    this.world.codes.set(key, []);
    this.session = key;
    return { ok: true };
  }

  async openSignInLink(): Promise<boolean> {
    return false;
  }

  async peekSignInLink(): Promise<string | null> {
    return null;
  }

  signedIn(): boolean {
    return this.session !== null;
  }

  /** Signed in as an address straight away: what the card does for a shopper who already opened their e-mail. */
  signInAs(email: string): void {
    this.session = lower(email);
  }

  private mine(): Row[] {
    return this.world.all("orders").filter((o) => this.session !== null && lower(o["email"]) === this.session);
  }

  async myOrders(): Promise<Row[]> {
    return copy(this.mine()).sort((a, b) => String(b["placed_at"] ?? "").localeCompare(String(a["placed_at"] ?? "")) || Number(b.id) - Number(a.id));
  }

  private rowsOf(orders: readonly Row[]): { lines: Row[]; features: Row[]; proofs: Row[] } {
    const ids = new Set(orders.map((o) => String(o.id)));
    const lines = this.world.all("order_lines").filter((l) => ids.has(String(l["order_id"])));
    const lineIds = new Set(lines.map((l) => String(l.id)));
    return copy({
      lines,
      features: this.world.all("order_line_features").filter((f) => lineIds.has(String(f["line_id"]))),
      proofs: this.world.all("proofs").filter((p) => ids.has(String(p["order_id"]))),
    });
  }

  async myRows(): Promise<{ lines: Row[]; features: Row[]; proofs: Row[] }> {
    return this.rowsOf(this.mine());
  }

  async openShared(token: string): Promise<"opened" | "unknown" | "closed"> {
    const order = this.world.all("orders").find((o) => o["link_token"] === token);
    if (order === undefined) return "unknown";
    if (order["link_stopped"] === true) return "closed";
    this.linked = order.id;
    return "opened";
  }

  sharedHeld(): boolean {
    return this.linked !== null;
  }

  async readShared(): Promise<OrderRead | null> {
    const order = this.linked === null ? undefined : this.world.get("orders", this.linked);
    if (order === undefined) return null;
    return { via: "link", order: copy(order), ...this.rowsOf([order]) };
  }

  async answerProof(_via: Via, proofId: Id, answer: ProofAnswer): Promise<Row> {
    const proof = this.world.get("proofs", proofId);
    if (proof === undefined || proof["state"] !== "sent") throw refusal("STATE_MOVE_REFUSED", 409);
    this.world.update("proofs", proofId, { ...answer, answered_at: this.world.nowIso() });
    this.world.changed();
    return copy(this.world.get("proofs", proofId)!);
  }

  async proofPicture(_via: Via, proofId: Id): Promise<Blob | null> {
    return this.world.pictures.get(String(proofId)) ?? null;
  }

  async ask(values: Row): Promise<Row> {
    const row = this.world.insert("commission_requests", { ...values, status: "new", made_at: this.world.nowIso() });
    row["ref"] = `ASK-${String(row.id).padStart(4, "0")}`;
    this.world.changed();
    return copy(row);
  }

  async report(values: Row): Promise<Row> {
    const row = this.world.insert("problem_reports", { ...values, status: "new", made_at: this.world.nowIso() });
    row["ref"] = `FIX-${String(row.id).padStart(4, "0")}`;
    this.world.changed();
    return copy(row);
  }

  async extras(): Promise<Extras> {
    const w = this.world;
    const byPosition = (a: Row, b: Row) => Number(a["position"] ?? 0) - Number(b["position"] ?? 0) || a.id - b.id;
    return copy({ closures: w.all("closures").filter((c) => c["active"] !== false), rates: w.all("postage_rates"), machines: [...w.all("machines")].sort(byPosition) });
  }

  settings(): Readonly<Record<string, unknown>> {
    return { studio_days: STUDIO_DAYS.join(","), cutoff: CUTOFF };
  }

  async now(): Promise<Date> {
    return new Date(this.world.now);
  }
}

/**
 * The Customiser's calls over the world's rows: its bases, pieces, areas,
 * ready-made designs and palettes, and the designs a shopper saves. No file
 * is stored in the demo, so an upload is not offered.
 */
export function demoCustomiser(world: DemoWorld): CustomiserApi {
  const savedOf = (row: Row): SavedDesign => ({
    id: row.id,
    code: typeof row["code"] === "string" ? row["code"] : null,
    base_id: row["base_id"] as Id,
    ready_design_id: (row["ready_design_id"] as Id | null | undefined) ?? null,
    values: copy(row["values"] as DesignValues),
    state: row["state"] === "ordered" ? "ordered" : "draft",
    updatedAt: typeof row["updated_at"] === "string" ? row["updated_at"] : null,
    session: typeof row["session"] === "string" ? { token: row["session"], level: "verified", expiresAt: world.now + 30 * 86_400_000 } : null,
    files: {},
    link: typeof row["link"] === "string" ? row["link"] : null,
  });
  const ofBase = (table: string, base: unknown) => copy(world.all(table).filter((r) => same(r["base_id"], base)));
  return {
    async catalogue(base) {
      const ready = ofBase("ready_designs", base).filter((r) => r["state"] !== "draft");
      const readyIds = new Set(ready.map((r) => String(r.id)));
      const palettes = copy(world.all("palettes"));
      return {
        bases: copy(world.all("bases").filter((b) => same(b.id, base))),
        pieces: ofBase("base_pieces", base),
        areas: ofBase("base_areas", base),
        ready,
        parts: copy(world.all("ready_parts").filter((p) => readyIds.has(String(p["ready_design_id"])))),
        fonts: [],
        palettes,
        colours: copy(world.all("palette_colours")),
        features: copy(world.all("features")),
        settings: [],
      };
    },
    fontUrl: async () => null,
    async create(design: DesignData) {
      const row = world.insert("designs", { app: "maker", code: world.code("BRD"), format: 1, base_id: design.base_id, ready_design_id: design.ready_design_id, values: copy(design.values), state: "draft", session: world.code("S"), link: world.code("L"), updated_at: world.nowIso() });
      world.changed();
      return savedOf(row);
    },
    async change(design: SavedDesign, values: DesignValues) {
      const row = world.update("designs", design.id, { values: copy(values), updated_at: world.nowIso() });
      world.changed();
      return savedOf(row);
    },
    async remove(design: SavedDesign) {
      world.remove("designs", design.id);
      world.changed();
    },
    async openLink(token: string) {
      const row = world.all("designs").find((d) => d["link"] === token);
      return row === undefined ? "unknown" : savedOf(row);
    },
    async reopen(session: HeldSession) {
      const row = world.all("designs").find((d) => d["session"] === session.token);
      return row === undefined ? null : savedOf(row);
    },
    async byCodes(codes: readonly string[]) {
      return world.all("designs").filter((d) => codes.includes(String(d["code"]))).map(savedOf);
    },
    upload: null,
    file: async () => null,
  };
}
