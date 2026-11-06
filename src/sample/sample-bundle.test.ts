/**
 * THE SAMPLE FILES, THEIR SOURCE AND THE MANIFEST AGREE.
 *
 * `seeds/maker.sample.json` and `seeds/maker.customiser.sample.json` are what
 * an operator adds from Adminium. They are written from `birch-row.ts`
 * (`npm run sample`); this fails when a file and the source drift, puts both
 * through the checks Adminium runs when they are added (vendored with the
 * rest of the manifest checks), and then checks what a sample load cannot.
 *
 * The figures Adminium works out of these rows (a line's price at its break,
 * BR-2290's £83.95, the post-by dates) are proved on a real install by the
 * engine's `maker-rework-install.test.ts`; the dates written here for history
 * are held to the same studio-day rule below.
 */
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

import { sampleText, sectionText } from "../../scripts/write-sample.ts";
import { sampleBundleIssues, sampleBundleSchema, sampleSectionIssues } from "../testing/manifest/sample.ts";
import type { AppManifest, Manifest } from "../testing/manifest/schema.ts";
import CUSTOMISER_ROWS from "./customiser-rows.json" with { type: "json" };
import { postBy } from "./birch-row.ts";

type Row = Record<string, unknown>;
interface Bundle {
  tables: { ref: string; own?: true; rows: Row[] }[];
}
const read = (path: string) => readFileSync(fileURLToPath(new URL(path, import.meta.url)), "utf8");
const manifest = JSON.parse(read("../../manifest.json")) as Manifest & { sampleData: { file: string; addOns: Record<string, { file: string }> } };
const main = JSON.parse(read("../../seeds/maker.sample.json")) as Bundle;
const section = JSON.parse(read("../../seeds/maker.customiser.sample.json")) as Bundle;
const rowsOf = (bundle: Bundle, ref: string) => bundle.tables.find((t) => t.ref === ref)?.rows ?? [];

describe("the sample files are what their source writes", () => {
  it("are byte for byte `birch-row.ts`'s bundles — run `npm run sample` after changing it", () => {
    expect(read("../../seeds/maker.sample.json") === sampleText()).toBe(true);
    expect(read("../../seeds/maker.customiser.sample.json") === sectionText()).toBe(true);
  });

  it("are the files the manifest names", () => {
    expect(manifest.sampleData.file).toBe("seeds/maker.sample.json");
    expect(manifest.sampleData.addOns).toEqual({ customiser: { file: "seeds/maker.customiser.sample.json" } });
  });

  it("carry the Customiser's own rows for Birch Row as it ships them, each design version labelled", () => {
    for (const table of CUSTOMISER_ROWS.tables) {
      const ours = section.tables.find((t) => t.ref === table.ref)!.rows;
      const unlabelled = table.ref === "design_versions" ? ours.map(({ "@label": _label, ...rest }) => rest) : ours;
      expect(unlabelled, table.ref).toEqual(table.rows);
    }
  });
});

describe("Adminium would add them", () => {
  it("are well-formed adminium.sample/1 bundles", () => {
    expect(sampleBundleSchema.safeParse(main).success).toBe(true);
    expect(sampleBundleSchema.safeParse(section).success).toBe(true);
  });

  it("pass the checks Adminium runs before it adds them", () => {
    expect(sampleBundleIssues(main as never, manifest)).toEqual([]);
    expect(sampleSectionIssues(section as never, manifest as AppManifest)).toEqual([]);
  });
});

describe("every row is one the studio could have made", () => {
  it("stamps today's proofs as so long ago, so a sample added in the morning sends none in the future", () => {
    const customiser = JSON.parse(read("../../seeds/maker.customiser.sample.json")) as { tables: { ref: string; rows: Record<string, unknown>[] }[] };
    const stamps = customiser.tables.find((t) => t.ref === "proofs")!.rows.flatMap((row) => [row["sent_at"], row["answered_at"]]).filter((v): v is Record<string, unknown> => typeof v === "object" && v !== null);
    expect(stamps.filter((v) => v["@day"] === 0)).toEqual([]);
    const ago = stamps.filter((v) => typeof v["@ago"] === "string").map((v) => v["@ago"]);
    expect(ago.length).toBeGreaterThan(0);
    // 11:00 and 15:00 on the sample's Thursday, written at 16:40.
    expect([...new Set(ago)].sort()).toEqual(["PT1H40M", "PT5H40M"]);
  });

  it("mails nobody real: every address is on a reserved .example domain", () => {
    const addresses = [...JSON.stringify([main, section]).matchAll(/"email":\s*"([^"]+)"/g)].map((m) => m[1]!);
    expect(addresses.length).toBeGreaterThan(20);
    for (const address of addresses) expect(address, address).toMatch(/\.example$/);
  });

  it("numbers its orders off the running series, so the studio's own next order is BR-2291", () => {
    const orders = rowsOf(main, "orders");
    for (const row of orders) {
      expect(row["number"]).toMatch(/^BR-\d{4}$/);
      expect(row["number_seq"]).toBeNull();
    }
    expect(orders.map((row) => Number(String(row["number"]).slice(3))).sort((a, b) => b - a)[0]).toBe(2290);
    expect(rowsOf(main, "settings")[0]).toMatchObject({ ref_prefix: "BR-", first_order_number: 2291 });
  });

  it("keeps one table of materials: walnut 6 mm, birch ply 3 mm, slate 5 mm, and PLA", () => {
    const materials = rowsOf(main, "materials");
    const sheets = materials.filter((m) => m["group"] === "sheet" || m["family"] === "Slate");
    expect(sheets.filter((m) => m["family"] !== "Acrylic").map((m) => [m["family"], m["thickness_mm"]])).toEqual([
      ["Walnut", 6],
      ["Birch ply", 3],
      ["Slate", 5],
    ]);
    expect(materials.filter((m) => m["family"] === "PLA").map((m) => m["code"])).toEqual(["pla-chalk", "pla-grey"]);
  });

  it("gives each product one row, with its lead, its breaks and its size", () => {
    const products = rowsOf(section, "products");
    expect(new Set(products.map((p) => p["code"])).size).toBe(products.length);
    const breaks = (code: string) =>
      rowsOf(section, "options")
        .filter((o) => o["kind"] === "break" && (o["product_id"] as { "@ref": string })["@ref"] === `product:${code}`)
        .map((o) => [o["min_qty"], o["percent_off"]]);
    expect(breaks("coast-wal")).toEqual([[1, 0], [4, 8], [8, 14], [12, 18]]);
    expect(breaks("sign-house")).toEqual([[1, 0]]);
    expect(products.find((p) => p["code"] === "coast-wal")).toMatchObject({ lead_days: 3, size_text: "95 × 95 × 6 mm", pieces: 4, base_id: { "@ref": "base:coasters" } });
  });

  it("dates each line's post-by by the studio-day rule: Thursday 16:40 gives Tue 11, Wed 12, Thu 13 and Fri 21 August", () => {
    expect([3, 4, 5, 10].map((lead) => postBy("2026-08-06", "16:40", lead))).toEqual(["2026-08-11", "2026-08-12", "2026-08-13", "2026-08-21"]);
    // After five, the order comes in on the next studio day.
    expect(postBy("2026-08-06", "17:01", 3)).toBe("2026-08-12");
    // A Saturday after five comes in on Tuesday.
    expect(postBy("2026-08-08", "17:30", 3)).toBe("2026-08-14");
  });

  it("charges Tom's logo coasters for the logo they carry", () => {
    const tom = rowsOf(section, "order_lines").find((l) => (l["order_id"] as { "@ref": string })["@ref"] === "order:BR-2290")!;
    expect(tom).toMatchObject({ qty: 2, design_id: { "@ref": "design:br-2290" } });
    expect(rowsOf(section, "order_line_features")).toEqual([
      { line_id: { "@ref": "line:BR-2290:1" }, option_id: { "@ref": "option:coast-wal:feature:logo" }, feature_id: { "@ref": "feature:maker-logo" } },
    ]);
  });

  it("says nothing the product never says", () => {
    const words = JSON.stringify([main, section]).toLowerCase();
    for (const banned of ["upgrade", "tier", "pricing", "demo", "lorem"]) expect(words, banned).not.toContain(banned);
    expect(words).not.toMatch(/\bfree\b/);
  });
});
