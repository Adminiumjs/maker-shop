/**
 * The workshop's half of the manifest, held to what its screens and its
 * add-ons rest on: a machine booked twice is Adminium's refusal, not a
 * screen's; a batch's sheets and a spoil are used from Inventory when it
 * keeps the stock; a piece's and a parcel's labels are Barcode labels'
 * documents, mapped as Point of Sale maps its shelf labels.
 */
import { describe, expect, it } from "vitest";

import { buildManifest } from "./build.ts";

type Json = Record<string, unknown>;
const manifest = buildManifest() as Json & {
  requiredSchema: { tables: (Json & { ref: string; columns: (Json & { ref: string; rules?: Json })[]; postings?: Json[]; occupies?: Json })[] };
  documents: (Json & { kind: string; table: string })[];
  addOns: { suggests: { key: string }[]; features: { id: string; requires: string[] }[] };
  roles: (Json & { key: string; permissions: string[] })[];
};
const table = (ref: string) => manifest.requiredSchema.tables.find((t) => t.ref === ref)!;
const rules = (t: string, c: string) => table(t).columns.find((col) => col.ref === c)!.rules ?? {};

describe("machine time", () => {
  it("lets one booking take a machine at a time: an overlap is refused by Adminium", () => {
    expect(table("machine_bookings").occupies).toEqual({ resource: "machine_id", start: "starts_at", end: "ends_at" });
  });

  it("says how long a run keeps each machine, what a batch books it for", () => {
    expect(table("machines").columns.find((c) => c.ref === "run_minutes")).toMatchObject({ type: "int", default: 60 });
  });

  it("lets the maker book, move and let go of machine time, start batches and record stock", () => {
    const maker = manifest.roles.find((r) => r.key === "maker")!.permissions;
    for (const grant of ["table:@machine_bookings:create", "table:@machine_bookings:update", "table:@machine_bookings:delete", "table:@batches:create", "table:@batches:update", "table:@stock_movements:create"]) expect(maker).toContain(grant);
  });
});

describe("stock through Inventory", () => {
  const postings = table("stock_movements").postings ?? [];

  it("uses a batch's sheets and a spoil from Inventory in the same save, only while the stock feature is on", () => {
    expect(postings.map((p) => [p["id"], (p["only"] as Json)["eq"], (p["map"] as Json)["kind"]])).toEqual([
      ["used", "used", { value: "used" }],
      ["spoiled", "spoiled", { value: "written_off" }],
    ]);
    for (const p of postings) {
      expect(p).toMatchObject({ into: { addOn: "inventory", ledger: "stock", action: "use" }, needs: "stock", post: { on: { create: true } } });
      expect((p["map"] as Json)["what"]).toBe("material_id");
      expect((p["map"] as Json)["quantity"]).toBe("taken");
    }
    expect(manifest.addOns.features.find((f) => f.id === "stock")!.requires).toEqual(["inventory"]);
  });

  it("hands Inventory what was taken as an amount Adminium works out, never typed", () => {
    expect(rules("stock_movements", "taken")["formula"]).toEqual({ sub: [0, { coalesce: ["on_hand_change", 0] }] });
  });
});

describe("labels through Barcode labels", () => {
  const labels = manifest.documents.filter((d) => d.kind === "label-sheet");

  it("draws a sheet of a line's pieces, a label a piece, and a parcel's label", () => {
    expect(labels.map((d) => [d.table, d["addOn"], d["feature"]])).toEqual([
      ["order_lines", "barcode-labels", "labels"],
      ["orders", "barcode-labels", "labels"],
    ]);
    expect(labels[0]!["mapping"]).toEqual({ sku: { column: "id" }, code: { column: "label_code" }, reference: { column: "product_name" }, count: { column: "pieces" } });
    expect(labels[1]!["mapping"]).toMatchObject({ code: { column: "number" } });
    expect(labels[1]!["requestValues"]).toEqual(["count"]);
    expect(manifest.addOns.suggests.map((s) => s.key)).toContain("barcode-labels");
  });

  it("codes a piece by its order's number and its place on the order", () => {
    expect(rules("order_lines", "order_number")["copy"]).toEqual({ via: "order_id", from: "number", mode: "always" });
    expect(rules("order_lines", "label_code")["formula"]).toEqual({ join: ["order_number", "/", "position"] });
  });
});
