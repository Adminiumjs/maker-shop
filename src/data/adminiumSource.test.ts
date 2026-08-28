// SPDX-License-Identifier: AGPL-3.0-only
/**
 * Connected mode (28-public-surface.md §5.2, 28-T28 wave 3).
 *
 * ── WHY THIS DRIVES A REAL CLIENT ──────────────────────────────────────────
 * `createPublicClient` takes an injectable `fetch`, so these run the SHIPPED
 * client against canned wire responses rather than a hand-written stub of it.
 * `assertRefs`, the config fetch, the paging and the URL building are therefore
 * under test too.
 *
 * ── THE TWO PROPERTIES THIS REPO CARES ABOUT MOST ──────────────────────────
 *  1. A line for a product or a material this build cannot make is DROPPED.
 *     The catalogue is compile-time code; the database's copy is read only to
 *     turn a foreign key back into a key the bench knows. Keeping such a line
 *     would put somebody else's footprint and cut time on this studio's bench.
 *  2. The studio is BLANK and the laser reads zero. `add-ons/records.ts` books
 *     a courier FROM that address, and sending one to another maker's yard is a
 *     defect nobody finds until nobody turns up.
 */

import { describe, expect, it } from "vitest";

import { createPublicClient } from "@adminiumjs/public-client";

import { loadSnapshot, snapshotSource } from "./adminiumSource.ts";
import { demoSource, isConnected, setDataSource, source } from "./source.ts";

const REFS = ["customers", "products", "materials", "machines", "orders", "orderLines", "proofs"];

const ROWS: Record<string, unknown[]> = {
  customers: [
    {
      id: 1, name: "Ivy M.", email: "ivy@example.test", town: "Saltburn",
      address_lines: ["12 Sea View"], postcode: "TS12 1AA", country: "GB",
    },
  ],
  products: [
    { id: 4, key: "walnut-coasters" },
    { id: 5, key: "titanium-doorstops" },
  ],
  materials: [
    { id: 7, key: "walnut-3mm", unit: "sheet", sheet_width_mm: "600.0", sheet_height_mm: "400.0", on_hand: 18, reorder_at: 6 },
    { id: 8, key: "glaze-ink", unit: "tub", sheet_width_mm: null, sheet_height_mm: null, on_hand: 3, reorder_at: 1 },
    { id: 9, key: "unobtanium-1mm", unit: "sheet", sheet_width_mm: "600.0", sheet_height_mm: "400.0", on_hand: 1, reorder_at: 1 },
  ],
  machines: [{ key: "laser", count: 1 }],
  orders: [
    { id: 20, ref: "BR-0311", customer_id: 1, placed_on: "2026-08-06", posted_on: null },
    { id: 21, ref: "BR-0310", customer_id: 1, placed_on: "2026-08-03", posted_on: "2026-08-05" },
    { id: 22, ref: "BR-0400", customer_id: 1, placed_on: "2026-08-06", posted_on: null },
  ],
  orderLines: [
    {
      id: 30, order_id: 20, product_id: 4, material_key: "walnut", size_key: "set-4",
      finish_key: "oiled", quantity: 2, note: "Initials, please", stage: "making",
      proof: "approved", spoiled: 1,
    },
    {
      id: 31, order_id: 21, product_id: 4, material_key: "walnut", size_key: "set-4",
      finish_key: "oiled", quantity: 1, note: null, stage: "ready-to-post",
      proof: "not-needed", spoiled: 0,
    },
    {
      id: 32, order_id: 22, product_id: 5, material_key: "titanium", size_key: "one",
      finish_key: "none", quantity: 1, note: null, stage: "to-make",
      proof: "not-needed", spoiled: 0,
    },
  ],
  proofs: [
    { order_id: 20, kind: "sent", note: null, at: "2026-08-04" },
    { order_id: 20, kind: "change-asked", note: "Smaller initials", at: "2026-08-05" },
  ],
};

interface FakeOptions {
  rows?: Record<string, unknown[]>;
  expose?: (ref: string) => string[];
  /** The scope's per-ref page ceiling — the operator's number, not the app's. */
  limit?: number;
}

/** A server that answers exactly what the scope would, paging included. */
function fakeFetch(overrides: FakeOptions = {}) {
  const rows = overrides.rows ?? ROWS;
  const limit = overrides.limit ?? 500;
  return async (input: RequestInfo | URL): Promise<Response> => {
    const url = new URL(String(input));
    const json = (body: unknown) =>
      new Response(JSON.stringify(body), { status: 200, headers: { "content-type": "application/json" } });

    if (url.pathname.endsWith("/public/config")) {
      const refs: Record<string, unknown> = {};
      for (const ref of REFS) {
        refs[ref] = {
          actions: ["list"],
          expose: overrides.expose?.(ref) ?? Object.keys((rows[ref]?.[0] ?? {}) as object),
          filterable: [], searchable: [], orderable: [], writable: [], limit,
        };
      }
      // `/public/config` is the one route the client unwraps: it reads
      // `body.data`, while `list` reads the body itself.
      return json({
        data: { version: 1, side: "staff", timezone: "Europe/London", currency: "GBP", claim: null, refs },
      });
    }

    const ref = url.pathname.split("/").pop() ?? "";
    const all = rows[ref] ?? [];
    const offset = Number(url.searchParams.get("offset") ?? "0");
    const size = Number(url.searchParams.get("limit") ?? String(all.length));
    return json({ data: all.slice(offset, offset + size) });
  };
}

const clientWith = (fetch: ReturnType<typeof fakeFetch>) =>
  createPublicClient({ baseUrl: "https://api.example.test", publishableKey: "adm_pub_test", fetch });

const snapshot = async (overrides: FakeOptions = {}) =>
  loadSnapshot(clientWith(fakeFetch(overrides))!);

describe("demo mode is the structural default", () => {
  it("builds no client when either variable is absent", () => {
    expect(createPublicClient({ baseUrl: "https://x.test", publishableKey: "" })).toBeNull();
    expect(createPublicClient({ baseUrl: "", publishableKey: "adm_pub_x" })).toBeNull();
    expect(createPublicClient(undefined)).toBeNull();
  });

  it("falls back rather than throwing when the server is unreachable", async () => {
    const client = clientWith(async () => {
      throw new Error("ECONNREFUSED");
    });
    expect(await loadSnapshot(client!)).toBeNull();
  });

  it("falls back when the scope does not expose a column the app reads", async () => {
    expect(await snapshot({ expose: () => ["id"] })).toBeNull();
  });
});

describe("the catalogue is code, and the database only maps back onto it", () => {
  it("drops a line the bench cannot make, and the order with nothing left", async () => {
    const snap = await snapshot();
    expect(snap).not.toBeNull();
    // BR-0400 is one titanium doorstop: no footprint, no cut time, no column.
    expect(snap!.orders.map((o) => o.ref)).toEqual(["BR-0311"]);
    expect(snap!.pastOrders.map((o) => o.ref)).toEqual(["BR-0310"]);
    // The shelf is the same story: a stock key nothing can cut is not a shelf.
    expect(snap!.materials.map((m) => m.key)).toEqual(["walnut-3mm", "glaze-ink"]);
    // Sheet sizes arrive as decimal strings and must not stay strings.
    expect(snap!.materials[0]!.sheetWidthMm).toBe(600);
    expect(snap!.materials[1]!.sheetWidthMm).toBeUndefined();
  });

  it("resolves an order to a display name and carries its proof history", async () => {
    const snap = await snapshot();
    const order = snap!.orders[0]!;
    // `Order.customer` is a NAME by the time a screen sees it — one lookup here
    // rather than one in the bench, the order view, the lookup and search.
    expect(order.customer).toBe("Ivy M.");
    expect(order.email).toBe("ivy@example.test");
    expect(order.proofs).toEqual([
      { kind: "sent", at: "2026-08-04" },
      { kind: "change-asked", at: "2026-08-05", note: "Smaller initials" },
    ]);
    expect(order.lines[0]).toMatchObject({ stage: "making", spoiled: 1, note: "Initials, please" });
    // A line with no note is an empty string, which is what the app's type says.
    expect(snap!.pastOrders[0]!.lines[0]!.note).toBe("");
    expect(snap!.pastOrders[0]!.postedIso).toBe("2026-08-05");
    expect(order.postedIso).toBeUndefined();
  });

  it("reads a jsonb address whether it arrives parsed or as text", async () => {
    const parsed = await snapshot();
    expect(parsed!.customers[0]!.address.lines).toEqual(["12 Sea View"]);
    // sqlite hands a `json` column back as TEXT while postgres and mysql parse
    // it — the same split `packages/meta`'s public-api repo had to handle.
    const asText = await snapshot({
      rows: {
        ...ROWS,
        customers: [{ ...(ROWS["customers"]![0] as object), address_lines: '["12 Sea View"]' }],
      },
    });
    expect(asText!.customers[0]!.address.lines).toEqual(["12 Sea View"]);
    expect(asText!.customers[0]!.address.country).toBe("GB");
  });

  it("continues the studio’s own reference sequence, prefix and width included", async () => {
    const snap = await snapshot();
    // BR-0400 is the highest ref even though its order was dropped: a number
    // the studio has issued is issued, whatever became of the order.
    expect(snap!.nextRef).toBe("BR-0401");
  });

  it("reads every page, not just the first the scope allows", async () => {
    const snap = await snapshot({ limit: 1 });
    expect(snap!.orders[0]!.proofs).toHaveLength(2);
    expect(snap!.materials).toHaveLength(2);
  });
});

describe("what a connected build refuses to carry over", () => {
  it("returns a blank studio and a laser of zero watts", async () => {
    const connected = snapshotSource((await snapshot())!);
    // WS-I G-1. `add-ons/records.ts` books a courier FROM this address.
    expect(connected.studio()).toEqual({
      demoPath: "", makers: [],
      address: { name: "", lines: [], city: "", postcode: "", countryCode: "" },
    });
    // WS-I G-2. `machines` carries a key and a count and no specification, so
    // the bench's settings card reads zero rather than this studio's 60 W.
    expect(connected.laser().watts).toBe(0);
    expect(connected.laser().cut.speedMmPerSec).toBe(0);
    // …and the machine list itself does come from the database.
    expect(connected.machines()).toEqual([{ key: "laser", icon: "laser", count: 1 }]);
  });

  it("keeps the care cards, because they are the app’s copy and not rows", async () => {
    const connected = snapshotSource((await snapshot())!);
    // WS-I G-4: `lines` counts bullet points in the i18n bundle. A database has
    // nothing to say about it, so these come across unchanged.
    expect(connected.careCards().length).toBeGreaterThan(0);
    expect(connected.careCards().every((c) => c.lines > 0)).toBe(true);
  });

  it("hands back the same shapes demoSource does", async () => {
    const connected = snapshotSource((await snapshot())!);
    for (const key of Object.keys(demoSource) as (keyof typeof demoSource)[]) {
      expect(typeof connected[key]).toBe("function");
    }
    connected.orders()[0]!.lines.push({ ...connected.orders()[0]!.lines[0]! });
    expect(connected.orders()[0]!.lines).toHaveLength(1);
  });

  it("reads the clock in the tenant’s zone, in the app’s own shape", async () => {
    const snap = await snapshot();
    expect(snap!.now.iso).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(snap!.now.hour).toBeLessThan(24);
    expect(snap!.now.minute).toBeLessThan(60);
  });
});

describe("the seam", () => {
  it("reports demo mode until a real source is installed", () => {
    expect(isConnected()).toBe(false);
  });

  it("refuses a swap that arrives after the store has read", () => {
    // THE SILENT FAILURE THIS PINS. `state/store.ts`, `add-ons/records.ts` and
    // `screens/Bench.tsx` all read at module scope, so a static `import App`
    // evaluates them during main.tsx's own imports — before any fetch can
    // resolve. The studio then runs on demo data against a configured backend.
    source.orders();
    expect(() => setDataSource(demoSource)).toThrow(/after the store already read/);
  });
});
