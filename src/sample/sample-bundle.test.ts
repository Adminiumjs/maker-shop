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
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

import { hashText } from "../../scripts/hash-showcase.ts";
import { sampleText, sectionText } from "../../scripts/write-sample.ts";
import { sampleBundleIssues, sampleBundleSchema, sampleSectionIssues } from "../testing/manifest/sample.ts";
import type { AppManifest, Manifest } from "../testing/manifest/schema.ts";
import CUSTOMISER_ROWS from "./customiser-rows.json" with { type: "json" };
import { postBy, STUDIO_DAYS } from "./birch-row.ts";

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

  it("carry the Customiser's own rows for Birch Row as it ships them, each design version labelled, the shop's own after them", () => {
    // What the shop changes on the Customiser's rows (`showcase.ts`): the files it uploads, the faces it marks, where two areas sit.
    const CHANGED = ["file", "model_file", "print_file", "faces", "face", "x_mm", "y_mm", "w_mm", "h_mm"];
    const strip = (row: Record<string, unknown>) => Object.fromEntries(Object.entries(row).filter(([key]) => !CHANGED.includes(key)));
    for (const table of CUSTOMISER_ROWS.tables) {
      const ours = section.tables.find((t) => t.ref === table.ref)!.rows;
      const unlabelled = table.ref === "design_versions" ? ours.map(({ "@label": _label, ...rest }) => rest) : ours;
      expect(unlabelled.slice(0, table.rows.length).map(strip), table.ref).toEqual((table.rows as Record<string, unknown>[]).map(strip));
      for (const row of ours.slice(table.rows.length)) expect(row["app"], table.ref).toBe("maker");
    }
  });

  it("ship every file the sample names, each one hashed, in a kind its column takes", () => {
    const assets = (section as unknown as { assets: Record<string, { file: string; sha256: string }> }).assets;
    expect(Object.keys((main as unknown as { assets?: object }).assets ?? {})).toEqual([]);
    for (const { file, sha256 } of Object.values(assets)) {
      const bytes = readFileSync(fileURLToPath(new URL(`../../${file}`, import.meta.url)));
      expect(createHash("sha256").update(bytes).digest("hex"), file).toBe(sha256);
      // The Customiser's cut files and outlines take 2 MB at most, its models 30 MB.
      expect(bytes.length, file).toBeLessThan(file.endsWith(".svg") ? 2 * 1024 * 1024 : 30 * 1024 * 1024);
    }
    const named = new Set([...JSON.stringify(section).matchAll(/"@asset":"([^"]+)"/g)].map((m) => m[1]));
    expect([...named].sort()).toEqual(Object.keys(assets).sort());
    expect(read("../../src/sample/showcase/assets.json")).toBe(hashText());
    // A photo on every piece in the shop.
    for (const product of rowsOf(section, "products")) expect(product["photo"], String(product["code"])).toEqual({ "@asset": `photo:${String(product["code"])}` });
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

  it("counts every moment that has passed back from the day it is added, so none lands after it, whatever the weekday", () => {
    // Added on a Monday, the week's Thursday is three days ahead: a `@week` moment before it would still be to come.
    const PASSED = ["placed_at", "posted_at", "created_at", "sent_at", "answered_at", "made_at", "started_at"];
    const moments = [main, section].flatMap((bundle) =>
      bundle.tables.flatMap((t) => t.rows.flatMap((row) => PASSED.filter((c) => row[c] !== undefined && row[c] !== null).map((c) => ({ at: `${t.ref}.${c}`, v: row[c] as Row })))),
    );
    expect(new Set(moments.map((m) => m.at.split(".")[0]))).toEqual(new Set(["customers", "orders", "batches", "stock_movements", "commission_requests", "problem_reports", "proofs"]));
    for (const { at, v } of moments) {
      if (typeof v["@ago"] === "string") continue;
      // A posted order's moments keep their weekday (below): far enough before the week's Thursday that a sample added
      // three days before it still has them behind it.
      if (v["@week"] === true) expect(Number(v["@day"]), at).toBeLessThanOrEqual(-4);
      else expect(v["@day"], at).toBeLessThan(0);
    }
    // What the studio plans by keeps its weekday; a line's post-by is three days or more after its order came in,
    // so it stays after it when the sample is added as late as three days after the week's Thursday.
    const orders = new Map(rowsOf(main, "orders").map((o) => [o["@label"], o]));
    for (const line of rowsOf(section, "order_lines")) {
      const postBy = line["post_by"] as Row;
      const order = orders.get((line["order_id"] as { "@ref": string })["@ref"])!;
      if (order["posted_at"] !== null) {
        // Posted: its post-by is counted the same way as its posting, so the two never drift apart; and it went on its
        // post-by or before, never late.
        expect([postBy["@week"], (order["posted_at"] as Row)["@week"]], String(line["@label"])).toEqual([true, true]);
        expect(Number((order["posted_at"] as Row)["@day"]) - Number(postBy["@day"]), String(line["@label"])).toBeLessThanOrEqual(0);
        continue;
      }
      expect(postBy["@week"]).toBe(true);
      expect(Number(postBy["@day"]) - Number((order["placed_at"] as Row)["@day"] ?? 0), String(line["@label"])).toBeGreaterThanOrEqual(3);
    }
    // The batch running now is booked about its own start, never on the week's Thursday while it started today.
    const batch = rowsOf(main, "batches")[0]!;
    const run = rowsOf(main, "machine_bookings").find((b) => b["batch_id"] !== undefined)!;
    expect(run["starts_at"]).toEqual(batch["started_at"]);
    expect(run["ends_at"]).toEqual({ "@in": "PT1H50M" });
  });

  it("posts every parcel on a day the studio is open, by a post-by the studio is open on, whatever day it is added", () => {
    // On its weekday (`@week`): the day the comp dates it, in the week nearest the adding day.
    const weekday = (v: Row) => new Date(Date.UTC(2026, 7, 6 + Number(v["@day"]))).getUTCDay();
    const orders = rowsOf(main, "orders").filter((o) => o["posted_at"] !== null);
    expect(orders.map((o) => o["number"])).toEqual(["BR-2241", "BR-2247", "BR-2252", "BR-2255", "BR-2258", "BR-2260"]);
    for (const order of orders) {
      const posted = order["posted_at"] as Row;
      expect(posted["@week"], String(order["number"])).toBe(true);
      expect(STUDIO_DAYS, String(order["number"])).toContain(weekday(posted));
    }
    const postedLabels = new Set(orders.map((o) => o["@label"]));
    const lines = rowsOf(section, "order_lines").filter((l) => postedLabels.has((l["order_id"] as { "@ref": string })["@ref"]));
    expect(lines.length).toBeGreaterThan(0);
    for (const line of lines) expect(STUDIO_DAYS, String(line["@label"])).toContain(weekday(line["post_by"] as Row));
  });

  it("holds no line with two proofs out: a proof sent again sends the one before it again, keeping the change asked on it", () => {
    const proofs = rowsOf(section, "proofs");
    const lineOf = (p: Row) => (p["line_id"] as { "@ref": string })["@ref"];
    for (const line of new Set(proofs.map(lineOf))) {
      const out = proofs.filter((p) => lineOf(p) === line && (p["state"] === "sent" || p["state"] === "change_asked"));
      expect(out.length, line).toBeLessThanOrEqual(1);
    }
    const versionsOf = (line: string) => proofs.filter((p) => lineOf(p) === line).map((p) => [p["version"], p["state"], p["change_note"] ?? null]);
    expect(versionsOf("line:BR-2262:1")).toEqual([
      [1, "superseded", "Could the est. line sit a bit lower, and slightly smaller than the name?"],
      [2, "approved", null],
    ]);
    expect(versionsOf("line:BR-2288:1")).toEqual([
      [1, "superseded", "Could the sign be a little bigger?"],
      [2, "sent", null],
    ]);
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
