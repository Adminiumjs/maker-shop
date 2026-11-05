/**
 * THE STUDIO'S DOOR, ON THE WIRE: each write the studio makes, with the exact
 * address, method and body Adminium's data API receives; and each read, as it
 * is handed back to the screens.
 */
import { readFileSync } from "node:fs";

import { describe, expect, it } from "vitest";

import { AdminiumStudio, MOMENTS, YES_NO } from "./adminiumStudio.ts";
import type { StaffConfig } from "./transport/staffConnection.ts";
import type { SessionTransport } from "./transport/sessionSource.ts";
import { SessionPortError } from "./transport/sessionSource.ts";
import { THURSDAY } from "./testing/fixture.ts";
import { ApiError, type Row } from "./wire.ts";

interface Sent {
  path: string;
  method: string;
  body: unknown;
}

const TABLES: Record<string, string> = {
  orders: "maker_orders",
  order_lines: "maker_order_lines",
  proofs: "maker_proofs",
  products: "maker_products",
  stock_movements: "maker_stock_movements",
};

function config(more: Partial<StaffConfig> = {}): StaffConfig {
  return {
    connectionId: "conn-1",
    appName: "Birch Row",
    tables: TABLES,
    settings: { studio_days: "tue,wed,thu,fri,sat", cutoff: "17:00" },
    timezone: "Europe/London",
    timezoneSource: "operator",
    serverTimezone: "Europe/London",
    currency: "GBP",
    now: new Date(THURSDAY).toISOString(),
    user: { id: "u1", name: "Jo Marsh", email: "jo@birchrow.example" },
    csrfToken: "tok-1",
    publicKeys: {},
    access: { tables: { orders: ["read", "update"], order_lines: ["read", "update"], proofs: ["read", "create", "update"] }, roles: [{ slug: "maker-maker", name: "Maker" }, { slug: "other-app-owner", name: "Owner of another app" }] },
    addOns: { customiser: { version: "1.0.16", settings: {} } },
    sharedTables: {},
    ...more,
  };
}

/** A transport that records every write and answers each read from a table of rows. */
function transport(rows: Record<string, Row[]> = {}, refuse: Record<string, SessionPortError> = {}): { t: SessionTransport; sent: Sent[]; reads: string[] } {
  const sent: Sent[] = [];
  const reads: string[] = [];
  const t: SessionTransport = {
    port: { config: async () => ({ side: "staff", timezone: "Europe/London", currency: "GBP", refs: {} }), assertRefs: async () => {}, list: async () => ({ data: [] }) },
    connection: async () => "conn-1",
    tableId: async (name) => name,
    relation: async () => "rel",
    refresh: async () => {},
    get: async <T,>(path: string): Promise<T> => {
      reads.push(path);
      const table = /\/api\/v1\/data\/conn-1\/([^?/]+)/.exec(path)?.[1] ?? "";
      if (refuse[table] !== undefined) throw refuse[table];
      const offset = Number(/offset=(\d+)/.exec(path)?.[1] ?? 0);
      return { data: offset === 0 ? (rows[decodeURIComponent(table)] ?? []) : [] } as T;
    },
    mutate: async <T,>(path: string, method: "POST" | "PUT" | "PATCH" | "DELETE", body?: unknown): Promise<T> => {
      sent.push({ path, method, body });
      if (path.includes("/copy")) return { ref: "https://studio.example/api/v1/files/file_01J8Z6Q3M4N5P6R7S8T9V0W1XB/content", data: {} } as T;
      return { data: { id: 99, ...((body as { values?: object } | undefined)?.values ?? {}) } } as T;
    },
  };
  return { t, sent, reads };
}

describe("the studio's writes, as Adminium receives them", () => {
  it("moves a line by its stage, naming the stage the screen saw", async () => {
    const { t, sent } = transport();
    await new AdminiumStudio(t, config()).moveLine({ id: 101, stage: "make" }, "making");
    expect(sent).toEqual([{ path: "/api/v1/data/conn-1/maker_order_lines/101", method: "PATCH", body: { values: { stage: "making" }, from: "make" } }]);
  });

  it("posts an order with its DHL tracking number, from ready", async () => {
    const { t, sent } = transport();
    await new AdminiumStudio(t, config()).moveOrder({ id: 14, status: "ready" }, "posted", { tracking: "00 3400 1234 5678 9012" });
    expect(sent).toEqual([{ path: "/api/v1/data/conn-1/maker_orders/14", method: "PATCH", body: { values: { status: "posted", tracking: "00 3400 1234 5678 9012" }, from: "ready" } }]);
  });

  it("supersedes a proof it sent before, from the state the screen saw", async () => {
    const { t, sent } = transport();
    await new AdminiumStudio(t, config()).supersede({ id: 1001, state: "change_asked" });
    expect(sent).toEqual([{ path: "/api/v1/data/conn-1/maker_proofs/1001", method: "PATCH", body: { values: { state: "superseded" }, from: "change_asked" } }]);
  });

  it("stores a drawn picture through the files route for the proofs' picture column, then sends the proof naming it and its line, never an order", async () => {
    const { t, sent } = transport();
    const uploads: { url: string; init: RequestInit }[] = [];
    const fetchImpl = (async (url: string, init: RequestInit) => {
      uploads.push({ url, init });
      return new Response(JSON.stringify({ data: { id: "file_01J8Z6Q3M4N5P6R7S8T9V0W1XC" }, ref: "https://studio.example/api/v1/files/file_01J8Z6Q3M4N5P6R7S8T9V0W1XC/content" }), { status: 201 });
    }) as unknown as typeof fetch;
    const blob = new Blob([new Uint8Array([0x89, 0x50, 0x4e, 0x47])], { type: "image/png" });
    await new AdminiumStudio(t, config(), { fetchImpl }).sendProof({ order: { id: 11 }, line: { id: 111 }, kind: "lettering", picture: { blob, filename: "proof-line-111.png" }, designVersionId: null, note: null });
    expect(uploads).toHaveLength(1);
    expect(uploads[0]!.url).toBe("/api/v1/files?filename=proof-line-111.png&connectionId=conn-1&table=maker_proofs&column=picture");
    expect(uploads[0]!.init.method).toBe("POST");
    expect(uploads[0]!.init.body).toBe(blob);
    expect(uploads[0]!.init.headers).toMatchObject({ "content-type": "image/png", "x-adminium-csrf": "tok-1" });
    expect(sent).toEqual([
      {
        path: "/api/v1/data/conn-1/maker_proofs",
        method: "POST",
        body: { values: { line_id: 111, kind: "lettering", picture: "https://studio.example/api/v1/files/file_01J8Z6Q3M4N5P6R7S8T9V0W1XC/content" } },
      },
    ]);
  });

  it("copies the Customiser's proof of a design's version into the proof's picture, and names the version", async () => {
    const { t, sent } = transport();
    await new AdminiumStudio(t, config()).sendProof({ order: { id: 16 }, line: { id: 161 }, kind: "design", picture: { copyOf: "file_01J8Z6Q3M4N5P6R7S8T9V0W1XA" }, designVersionId: 30, note: null });
    expect(sent).toEqual([
      { path: "/api/v1/files/file_01J8Z6Q3M4N5P6R7S8T9V0W1XA/copy", method: "POST", body: { connectionId: "conn-1", table: "maker_proofs", column: "picture" } },
      {
        path: "/api/v1/data/conn-1/maker_proofs",
        method: "POST",
        body: { values: { line_id: 161, kind: "design", picture: "https://studio.example/api/v1/files/file_01J8Z6Q3M4N5P6R7S8T9V0W1XB/content", design_version_id: 30 } },
      },
    ]);
  });

  it("refuses a design's proof whose file the copy route would not copy, writing no proof", async () => {
    const { t, sent } = transport();
    const mutate = t.mutate;
    t.mutate = async <T,>(path: string, method: "POST" | "PUT" | "PATCH" | "DELETE", body?: unknown): Promise<T> => {
      if (path.endsWith("/copy")) throw new SessionPortError("You may not write that column.", 403, "FORBIDDEN");
      return mutate<T>(path, method, body);
    };
    const fetchImpl = (async () => {
      throw new Error("the bytes are never carried by the browser");
    }) as unknown as typeof fetch;
    await expect(new AdminiumStudio(t, config(), { fetchImpl }).sendProof({ order: { id: 16 }, line: { id: 161 }, kind: "design", picture: { copyOf: "file_01J8Z6Q3M4N5P6R7S8T9V0W1XA" }, designVersionId: 30, note: null })).rejects.toMatchObject({ status: 403, code: "FORBIDDEN" });
    expect(sent.some((c) => c.path.endsWith("/maker_proofs"))).toBe(false);
  });

  it("refuses a proof whose picture the files route would not store, writing no proof", async () => {
    const { t, sent } = transport();
    const fetchImpl = (async () => new Response(JSON.stringify({ error: { code: "UNSUPPORTED_MEDIA_TYPE", message: "Not a picture." } }), { status: 415 })) as unknown as typeof fetch;
    const blob = new Blob(["x"], { type: "image/png" });
    await expect(new AdminiumStudio(t, config(), { fetchImpl }).sendProof({ order: { id: 11 }, line: { id: 111 }, kind: "lettering", picture: { blob, filename: "p.png" }, designVersionId: null, note: null })).rejects.toMatchObject({ code: "UNSUPPORTED_MEDIA_TYPE", status: 415 });
    expect(sent).toEqual([]);
  });

  it("stamps a reminder with the server's moment", async () => {
    const { t, sent } = transport();
    await new AdminiumStudio(t, config(), { skew: 0 }).remind({ id: 1001, state: "sent" });
    expect(sent[0]!.path).toBe("/api/v1/data/conn-1/maker_proofs/1001");
    expect(sent[0]!.method).toBe("PATCH");
    const body = sent[0]!.body as { values: { reminded_at: string }; from?: unknown };
    expect(Object.keys(body)).toEqual(["values"]);
    expect(Object.keys(body.values)).toEqual(["reminded_at"]);
    expect(Number.isNaN(Date.parse(body.values.reminded_at))).toBe(false);
  });

  it("records a spoil as so many units of the line, in the line's material", async () => {
    const { t, sent } = transport();
    await new AdminiumStudio(t, config()).spoil({ line: { id: 121 }, materialId: 1, units: 2, note: null });
    expect(sent).toEqual([{ path: "/api/v1/data/conn-1/maker_stock_movements", method: "POST", body: { values: { material_id: 1, kind: "spoiled", units: 2, line_id: 121 } } }]);
  });

  it("saves a product's lettering settings", async () => {
    const { t, sent } = transport();
    await new AdminiumStudio(t, config()).saveProduct({ id: 2 }, { takes_lettering: true, lettering_limit: 30, lettering_prompt: "Two lines", lettering_hint: null });
    expect(sent).toEqual([{ path: "/api/v1/data/conn-1/maker_products/2", method: "PATCH", body: { values: { takes_lettering: true, lettering_limit: 30, lettering_prompt: "Two lines", lettering_hint: null } } }]);
  });

  it("counts a spoil on its line without moving it", async () => {
    const { t, sent } = transport();
    await new AdminiumStudio(t, config()).updateLine({ id: 121, stage: "make" }, { spoiled: 1 });
    expect(sent).toEqual([{ path: "/api/v1/data/conn-1/maker_order_lines/121", method: "PATCH", body: { values: { spoiled: 1 } } }]);
  });

  it("says a refusal by its code and params", async () => {
    const { t } = transport();
    t.mutate = async () => {
      throw new SessionPortError("A order_lines row goes from make to making only when …", 409, "STATE_MOVE_REFUSED", { column: "stage", from: "make", to: "making" });
    };
    const error = await new AdminiumStudio(t, config()).moveLine({ id: 111, stage: "make" }, "making").catch((e: unknown) => e);
    expect(error).toBeInstanceOf(ApiError);
    expect(error).toMatchObject({ status: 409, code: "STATE_MOVE_REFUSED", params: { from: "make", to: "making" } });
  });
});

describe("the studio's reads", () => {
  it("names the person by the app's roles they hold, and what those let them do", () => {
    const who = new AdminiumStudio(transport().t, config()).who();
    expect(who.name).toBe("Jo Marsh");
    expect(who.roles).toEqual(["maker"]);
    expect(who.can("proofs", "create")).toBe(true);
    expect(who.can("customers", "read")).toBe(false);
  });

  it("reads the studio's week and add-ons from its configuration", () => {
    expect(new AdminiumStudio(transport().t, config({ settings: { studio_days: "Tue, Wed,thu" } })).facts()).toMatchObject({ studioDays: ["tue", "wed", "thu"], zone: "Europe/London", currency: "GBP", addOns: ["customiser"] });
  });

  it("reads every table the person may, hands moments back as instants and yes/no as booleans, and the lines' designs from the Customiser", async () => {
    const { t, reads } = transport({
      maker_orders: [{ id: 10, placed_at: "2026-08-04 10:00:00", link_stopped: 0, may_email: 1 }],
      maker_order_lines: [{ id: 161, order_id: 10, design_id: 3 }],
      customiser_designs: [{ id: 3, values: "{}" }],
      customiser_design_versions: [{ id: 30, design_id: 3, version: 1, made_at: "2026-08-06 09:00:00" }],
    });
    const data = await new AdminiumStudio(t, config()).load();
    expect(data.orders).toEqual([{ id: 10, placed_at: "2026-08-04T09:00:00.000Z", link_stopped: false, may_email: true }]);
    expect(data.versions[0]!["made_at"]).toBe("2026-08-06T08:00:00.000Z");
    expect(data.designs).toHaveLength(1);
    // A table the person may not read is not asked for at all.
    expect(reads.some((p) => p.includes("maker_customers"))).toBe(false);
    expect(reads.some((p) => p.includes("customiser_design_versions") && decodeURIComponent(p).includes('"column":"design_id","op":"in","value":[3]'))).toBe(true);
  });

  it("reads the lines without their designs for someone the Customiser's tables are closed to", async () => {
    const { t } = transport({ maker_order_lines: [{ id: 161, design_id: 3 }] }, { customiser_designs: new SessionPortError("No.", 403, "FORBIDDEN") });
    const data = await new AdminiumStudio(t, config()).load();
    expect(data.lines).toHaveLength(1);
    expect(data.designs).toEqual([]);
  });
});

describe("the making screens' writes, as Adminium receives them", () => {
  it("books a machine for a time, a run, by its own row", async () => {
    const { t, sent } = transport();
    await new AdminiumStudio(t, config()).book({ machineId: 1, label: "Walnut sheet · 6 pieces", startsAt: "2026-08-06T15:10:00.000Z", endsAt: "2026-08-06T17:25:00.000Z" });
    expect(sent).toEqual([
      {
        path: "/api/v1/data/conn-1/maker_machine_bookings",
        method: "POST",
        body: { values: { machine_id: 1, kind: "run", label: "Walnut sheet · 6 pieces", starts_at: "2026-08-06T15:10:00.000Z", ends_at: "2026-08-06T17:25:00.000Z" } },
      },
    ]);
  });

  it("lets a booking go by deleting its row", async () => {
    const { t, sent } = transport();
    await new AdminiumStudio(t, config()).unbook({ id: 7 });
    expect(sent).toEqual([{ path: "/api/v1/data/conn-1/maker_machine_bookings/7", method: "DELETE", body: undefined }]);
  });

  it("makes a batch in one write with the machine's booking and the sheets it takes off the shelf, rows below it", async () => {
    const { t, sent } = transport();
    await new AdminiumStudio(t, config()).createBatch({ label: "Walnut sheet · 6 pieces", machineId: 1, materialId: 1, sheets: 1, booking: { startsAt: "2026-08-06T15:10:00.000Z", endsAt: "2026-08-06T17:25:00.000Z" } });
    expect(sent).toEqual([
      {
        path: "/api/v1/data/conn-1/maker_batches",
        method: "POST",
        body: {
          values: { label: "Walnut sheet · 6 pieces", machine_id: 1, material_id: 1, sheets: 1 },
          children: {
            machine_bookings: [{ values: { machine_id: 1, kind: "run", label: "Walnut sheet · 6 pieces", starts_at: "2026-08-06T15:10:00.000Z", ends_at: "2026-08-06T17:25:00.000Z" } }],
            stock_movements: [{ values: { material_id: 1, kind: "used", qty: 1 } }],
          },
        },
      },
    ]);
  });

  it("starts a batch from the state the screen saw", async () => {
    const { t, sent } = transport();
    await new AdminiumStudio(t, config()).moveBatch({ id: 3, state: "planned" }, "running");
    expect(sent).toEqual([{ path: "/api/v1/data/conn-1/maker_batches/3", method: "PATCH", body: { values: { state: "running" }, from: "planned" } }]);
  });

  it("puts a line on a batch as it moves it to making", async () => {
    const { t, sent } = transport();
    await new AdminiumStudio(t, config()).moveLine({ id: 121, stage: "make" }, "making", { batch_id: 3 });
    expect(sent).toEqual([{ path: "/api/v1/data/conn-1/maker_order_lines/121", method: "PATCH", body: { values: { stage: "making", batch_id: 3 }, from: "make" } }]);
  });

  it("saves a count as a count movement: what was counted, and nothing the book says", async () => {
    const { t, sent } = transport();
    await new AdminiumStudio(t, config()).count({ materialId: 2, counted: 4 });
    expect(sent).toEqual([{ path: "/api/v1/data/conn-1/maker_stock_movements", method: "POST", body: { values: { material_id: 2, kind: "count", counted: 4 } } }]);
  });

  it("asks for a line's labels by the app's own names", async () => {
    const { t, sent } = transport();
    await new AdminiumStudio(t, config()).render({ kind: "label-sheet", ref: "order_lines", pk: 121 });
    expect(sent).toEqual([{ path: "/api/v1/apps/maker/documents/render", method: "POST", body: { kind: "label-sheet", ref: "order_lines", pk: { id: 121 } } }]);
  });
});

describe("the moments and yes/no columns the door reads back are the manifest's", () => {
  const manifest = JSON.parse(readFileSync(new URL("../../manifest.json", import.meta.url), "utf8")) as { requiredSchema: { tables: { ref: string; columns: { ref: string; type: string }[] }[] } };
  for (const table of manifest.requiredSchema.tables) {
    it(table.ref, () => {
      const moments = table.columns.filter((c) => c.type === "timestamptz").map((c) => c.ref);
      const yesNo = table.columns.filter((c) => c.type === "bool").map((c) => c.ref);
      const read = ["settings", "machines", "materials", "products", "options", "postage_services", "closures", "customers", "orders", "order_lines", "order_line_features", "proofs", "batches", "machine_bookings", "stock_movements"];
      if (!read.includes(table.ref)) return;
      expect([...(MOMENTS[table.ref as keyof typeof MOMENTS] ?? [])].sort()).toEqual(moments.sort());
      expect([...(YES_NO[table.ref as keyof typeof YES_NO] ?? [])].sort()).toEqual(yesNo.sort());
    });
  }
});
