// SPDX-License-Identifier: AGPL-3.0-only
/**
 * A `DataSource` backed by a real Adminium instance (28-public-surface.md §5.2,
 * 28-T28 wave 3).
 *
 * ── READS DO NOT BECOME ASYNC ──────────────────────────────────────────────
 * `loadSnapshot` fetches the whole read-set once, before React mounts, and
 * hands back the same SYNCHRONOUS shapes `demoSource` returns — so the store,
 * the bench engine and every screen are untouched.
 *
 * ── THE EGRESS GATE IS NOT RELAXED FOR THIS FILE ───────────────────────────
 * This studio bans the MEANS of sending, over sources and over built output,
 * and §5.4 budgeted a "relax NET TWO for one declared file" change here. That
 * turned out to be the wrong shape and 28-T26 measured why: a connected data
 * source NAMES no request-issuing API — it imports a client that does — so NET
 * TWO never fires on it, while NET ONE reports the ORIGIN Vite inlines. So the
 * only widening is `connectedBackend(VITE_ADMINIUM_API_BASE_URL)`, which
 * forgives one host in EVERY file rather than every host in one file. A
 * tracker's address in THIS file is still a finding.
 *
 * The purity net is narrowed for this file too, and just as narrowly: the two
 * CLOCK means, here and nowhere else. A demo's dates derive from a pinned
 * instant so a screenshot still matches in a year; a connected studio's job is
 * to show what is on the bench NOW. A die is still a finding in this file.
 *
 * ── THE CATALOGUE IS CODE, AND THE DATABASE'S COPY IS NOT READ ─────────────
 * `lib/catalogue.ts` holds the products, the materials, their footprints and
 * the stock keys — as compile-time unions the bench and the quote engine reason
 * about. The database has `products` and `materials` tables that MIRROR them,
 * and this file reads them for one purpose: turning a line's `product_id` back
 * into the app's own key. A maker who adds a product gets a row the generated
 * dashboard can edit and the bench cannot make, and an order line whose product
 * or material this build does not know is DROPPED rather than made with the
 * wrong footprint.
 *
 * ── WHAT THE SCHEMA CANNOT SAY (WS-I gaps, marked not hidden) ──────────────
 * G-1 THE STUDIO HAS NO RECORD. Its address, its makers and the demo path are
 *     in `demo.ts` and nowhere in `db/schema.sql`. Connected mode returns a
 *     BLANK studio rather than Birch Row — because `add-ons/records.ts` books
 *     collections FROM that address, and booking one shop's courier from
 *     another shop's yard is worse than booking none.
 * G-2 THE LASER HAS NO RECORD EITHER. `machines` carries a key and a count and
 *     no specification, so the bench's settings card reads zero watts rather
 *     than this studio's 60.
 * G-3 There is no customer key, so a customer is addressed by row id. The app
 *     only ever renders the display name, so nothing downstream notices.
 * G-4 The care cards are the APP's own copy bundles — `lines` counts how many
 *     bullet points the i18n bundle carries — so they are not tenant rows and
 *     come across unchanged, filtered to the materials this build knows.
 * G-5 `orders.total` is not read: the app prices from the catalogue, and a
 *     stored total that disagreed with it would be silently authoritative.
 */

import { createPublicClient, toTenantDay, type PublicClient } from "@adminiumjs/public-client";

import {
  MATERIAL_KEYS,
  PRODUCTS,
  type MaterialKey,
  type StockKey,
  type StockRow,
  type StockUnit,
} from "../lib/catalogue.ts";
import type { BenchColumn, Order, OrderLine, ProofEvent, ProofState } from "../lib/orders.ts";
import { CARE_CARDS } from "./demo.ts";
import type { CareCard, Customer, Machine, Now } from "./types.ts";
import type { DataSource, LaserSettings, Studio } from "./source.ts";

/* --------------------------------------------------------------- the wire */

interface WireCustomer {
  id: number;
  name: string;
  email: string;
  town: string;
  /** `jsonb`: parsed on postgres and mysql, TEXT on sqlite. */
  address_lines: readonly string[] | string;
  postcode: string;
  country: string;
}

interface WireProduct {
  id: number;
  key: string;
}

interface WireMaterial {
  id: number;
  key: string;
  unit: StockUnit;
  /** `numeric` serializes as a STRING, not a number. */
  sheet_width_mm: string | null;
  sheet_height_mm: string | null;
  on_hand: number;
  reorder_at: number;
}

interface WireMachine {
  key: string;
  count: number;
}

interface WireOrder {
  id: number;
  ref: string;
  customer_id: number;
  placed_on: string;
  posted_on: string | null;
}

interface WireOrderLine {
  id: number;
  order_id: number;
  product_id: number;
  material_key: string;
  size_key: string;
  finish_key: string;
  quantity: number;
  note: string | null;
  stage: BenchColumn;
  proof: ProofState;
  spoiled: number;
}

interface WireProof {
  order_id: number;
  kind: ProofEvent["kind"];
  note: string | null;
  at: string;
}

/**
 * WS-I G-1 — the studio itself, which `db/schema.sql` has nowhere to put.
 *
 * Blank, not the seed's. `add-ons/records.ts` books a collection FROM
 * `SHOP_ORIGIN`, so carrying Birch Row across would send a courier to another
 * maker's yard — a defect a reader only finds when nobody turns up.
 */
const NO_STUDIO: Studio = {
  demoPath: "",
  makers: [],
  address: { name: "", lines: [], city: "", postcode: "", countryCode: "" },
};

/** WS-I G-2 — `machines` has a key and a count, and no specification. */
const NO_LASER: LaserSettings = {
  watts: 0,
  cut: { speedMmPerSec: 0, power: 0 },
  engrave: { speedMmPerSec: 0, power: 0, dpi: 0 },
};

/**
 * The columns the scope must expose, checked at boot.
 *
 * `orders.total` is deliberately absent — see G-5.
 */
const REQUIRED = {
  customers: ["id", "name", "email", "town", "address_lines", "postcode", "country"],
  products: ["id", "key"],
  materials: ["id", "key", "unit", "sheet_width_mm", "sheet_height_mm", "on_hand", "reorder_at"],
  machines: ["key", "count"],
  orders: ["id", "ref", "customer_id", "placed_on", "posted_on"],
  orderLines: [
    "id", "order_id", "product_id", "material_key", "size_key", "finish_key",
    "quantity", "note", "stage", "proof", "spoiled",
  ],
  proofs: ["order_id", "kind", "note", "at"],
};

export interface Snapshot {
  now: Now;
  orders: Order[];
  pastOrders: Order[];
  customers: Customer[];
  materials: StockRow[];
  machines: Machine[];
  careCards: CareCard[];
  nextRef: string;
}

/**
 * The client, or null when either build-time variable is absent.
 *
 * The emptiness check is `createPublicClient`'s, not repeated here: it already
 * treats a missing or empty value as "this build has no server", and a second
 * copy of that rule is a second place for it to drift.
 */
export function clientFromEnv(): PublicClient | null {
  return createPublicClient({
    baseUrl: import.meta.env["VITE_ADMINIUM_API_BASE_URL"] as string | undefined,
    publishableKey: import.meta.env["VITE_ADMINIUM_PUBLISHABLE_KEY"] as string | undefined,
  });
}

/** Read a whole ref, a page at a time, at whatever size the scope permits. */
async function listAll<T>(
  client: PublicClient,
  ref: string,
  size: number,
  max: number,
): Promise<T[]> {
  const out: T[] = [];
  const page = Math.max(1, Math.min(size, 500));
  for (let offset = 0; offset < max; offset += page) {
    const res = await client.list<T>(ref, { limit: page, offset });
    out.push(...res.data);
    if (res.data.length < page) return out;
  }
  console.warn(`[adminium] ${ref}: stopped at ${String(max)} rows — the rest were not read.`);
  return out;
}

/** `jsonb` arrives parsed on postgres and mysql, and as text on sqlite. */
function linesOf(value: readonly string[] | string): readonly string[] {
  if (Array.isArray(value)) return value;
  try {
    const parsed: unknown = JSON.parse(value as string);
    return Array.isArray(parsed) ? (parsed as string[]) : [];
  } catch {
    return [];
  }
}

/**
 * Fetch the read-set and map it into the app's shapes.
 *
 * Returns `null` on ANY failure so the caller falls back to demo mode
 * structurally rather than in a catch — the marketplace demos are static clones
 * with no server and must keep working byte-identically.
 */
export async function loadSnapshot(client: PublicClient): Promise<Snapshot | null> {
  try {
    await client.assertRefs(REQUIRED);
    const config = await client.config();
    const tz = config.timezone;
    const cap = (ref: string): number => config.refs[ref]?.limit ?? 100;

    const [customers, products, materials, machines, orders, lines, proofs] = await Promise.all([
      listAll<WireCustomer>(client, "customers", cap("customers"), 20_000),
      listAll<WireProduct>(client, "products", cap("products"), 500),
      listAll<WireMaterial>(client, "materials", cap("materials"), 500),
      listAll<WireMachine>(client, "machines", cap("machines"), 200),
      listAll<WireOrder>(client, "orders", cap("orders"), 50_000),
      listAll<WireOrderLine>(client, "orderLines", cap("orderLines"), 200_000),
      listAll<WireProof>(client, "proofs", cap("proofs"), 100_000),
    ]);

    /* The catalogue is code. This map is the ONLY thing the database's mirror
     * of it is read for: turning a foreign key back into a key the bench knows.
     * A product this build has never heard of is not in the map, and every line
     * that uses it is dropped below. */
    const known = new Set(PRODUCTS.map((p) => p.key as string));
    const productKey = new Map<number, string>();
    for (const row of products) if (known.has(row.key)) productKey.set(row.id, row.key);

    const knownMaterial = new Set<string>(MATERIAL_KEYS);
    const knownStock = new Set(
      materials.map((m) => m.key).filter((key) => STOCK_PREFIXES.some((p) => key.startsWith(p))),
    );

    const mappedCustomers: Customer[] = customers.map((row) => ({
      // WS-I G-3: no customer key column, so the row id is the key. Nothing
      // downstream renders it — the seam resolves it to a display name.
      key: String(row.id),
      name: row.name,
      email: row.email,
      town: row.town,
      address: {
        lines: linesOf(row.address_lines),
        postcode: row.postcode,
        country: row.country,
      },
    }));
    const nameOf = new Map(mappedCustomers.map((c) => [c.key, c.name]));
    const emailOf = new Map(mappedCustomers.map((c) => [c.key, c.email]));

    const linesByOrder = new Map<number, OrderLine[]>();
    for (const row of lines) {
      const product = productKey.get(row.product_id);
      /* A line for a product or a material this build cannot make has no
       * footprint, no cut time and no column on the bench. Dropped, not made
       * with somebody else's numbers. */
      if (product === undefined || !knownMaterial.has(row.material_key)) continue;
      const list = linesByOrder.get(row.order_id) ?? [];
      list.push({
        id: String(row.id),
        productKey: product,
        materialKey: row.material_key as MaterialKey,
        sizeKey: row.size_key,
        finishKey: row.finish_key,
        quantity: row.quantity,
        note: row.note ?? "",
        stage: row.stage,
        proof: row.proof,
        spoiled: row.spoiled,
      });
      linesByOrder.set(row.order_id, list);
    }

    const proofsByOrder = new Map<number, ProofEvent[]>();
    for (const row of proofs) {
      const list = proofsByOrder.get(row.order_id) ?? [];
      const event: ProofEvent = { kind: row.kind, at: row.at };
      if (row.note !== null && row.note.length > 0) event.note = row.note;
      list.push(event);
      proofsByOrder.set(row.order_id, list);
    }

    const bench: Order[] = [];
    const posted: Order[] = [];
    for (const row of orders) {
      const own = linesByOrder.get(row.id) ?? [];
      // An order whose every line was dropped has nothing to show on a card.
      if (own.length === 0) continue;
      const key = String(row.customer_id);
      const order: Order = {
        ref: row.ref,
        // The seam's own convention: an order carries a display NAME by the
        // time a screen sees it, resolved once here.
        customer: nameOf.get(key) ?? key,
        email: emailOf.get(key) ?? "",
        placedIso: row.placed_on,
        lines: own,
        proofs: proofsByOrder.get(row.id) ?? [],
        ...(row.posted_on === null ? {} : { postedIso: row.posted_on }),
      };
      (row.posted_on === null ? bench : posted).push(order);
    }

    const nowIso = new Date().toISOString();
    const clock = new Intl.DateTimeFormat("en-GB", {
      timeZone: tz,
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    }).format(new Date(nowIso));
    const parts = clock.split(":");

    return {
      now: {
        iso: toTenantDay(nowIso, tz),
        hour: Number(parts[0]),
        minute: Number(parts[1] ?? "0"),
      },
      orders: bench,
      pastOrders: posted,
      customers: mappedCustomers,
      materials: materials
        .filter((row) => knownStock.has(row.key))
        .map((row) => ({
          key: row.key as StockKey,
          unit: row.unit,
          onHand: row.on_hand,
          reorderAt: row.reorder_at,
          ...(row.sheet_width_mm === null ? {} : { sheetWidthMm: Number(row.sheet_width_mm) }),
          ...(row.sheet_height_mm === null ? {} : { sheetHeightMm: Number(row.sheet_height_mm) }),
        })),
      machines: machines.map((row) => ({
        key: row.key,
        // WS-I G-2: no icon column either. The bench's card falls back to the
        // machine's own key rather than drawing nothing.
        icon: row.key,
        count: row.count,
      })),
      // WS-I G-4: the app's own copy bundles, not the studio's rows.
      careCards: CARE_CARDS.filter((card) => knownMaterial.has(card.material)).map((c) => ({ ...c })),
      nextRef: nextRefFrom(orders),
    };
  } catch (error) {
    console.warn("[adminium] connected mode unavailable, using demo data:", error);
    return null;
  }
}

/**
 * The material half of a stock key: `walnut-3mm` is walnut, `glaze-ink` is not
 * a material at all.
 *
 * `StockKey` is a compile-time union of ten and the database is free of it, so
 * a stock row is kept only when its key starts with something this build knows
 * how to price and cut. Anything else is a shelf the bench cannot draw from.
 */
const STOCK_PREFIXES: readonly string[] = [...MATERIAL_KEYS, "pla", "glaze"];

/**
 * The reference the next order takes, continuing the studio's own sequence.
 *
 * Anything that does not end in digits is ignored rather than parsed into
 * `NaN`, and the width is kept so `BR-0042` does not become `BR-43`.
 */
function nextRefFrom(orders: readonly WireOrder[]): string {
  let prefix = "";
  let highest = 0;
  let width = 0;
  for (const row of orders) {
    const match = /^(.*?)(\d+)$/.exec(row.ref);
    if (match === null) continue;
    const value = Number(match[2]);
    if (value <= highest) continue;
    highest = value;
    prefix = match[1] ?? "";
    width = (match[2] ?? "").length;
  }
  if (highest === 0) return "";
  return `${prefix}${String(highest + 1).padStart(width, "0")}`;
}

/** A synchronous `DataSource` over an already-fetched snapshot. */
export function snapshotSource(snap: Snapshot): DataSource {
  const copyOrder = (o: Order): Order => ({
    ...o,
    lines: o.lines.map((l) => ({ ...l })),
    proofs: o.proofs.map((p) => ({ ...p })),
  });
  return {
    now: () => ({ ...snap.now }),
    orders: () => snap.orders.map(copyOrder),
    pastOrders: () => snap.pastOrders.map(copyOrder),
    customers: () =>
      snap.customers.map((c) => ({ ...c, address: { ...c.address, lines: [...c.address.lines] } })),
    materials: () => snap.materials.map((s) => ({ ...s })),
    machines: () => snap.machines.map((m) => ({ ...m })),
    careCards: () => snap.careCards.map((c) => ({ ...c })),
    nextRef: () => snap.nextRef,
    // WS-I G-1 and G-2: blank, not Birch Row, and zero watts. See the header.
    studio: () => ({ ...NO_STUDIO, makers: [], address: { ...NO_STUDIO.address, lines: [] } }),
    laser: () => ({ ...NO_LASER, cut: { ...NO_LASER.cut }, engrave: { ...NO_LASER.engrave } }),
  };
}
