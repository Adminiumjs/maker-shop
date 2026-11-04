/**
 * `manifest.json` is written from `src/manifest/` (`npm run manifest`), and
 * this is what keeps the two from drifting: an edit to a module that was not
 * written out, or a hand edit to the file, fails here with the fix named.
 *
 * It also holds the manifest's own promises that the validator cannot see:
 * every price, weight and date is Adminium's; a shopper reads nothing of
 * anybody else's and nothing the studio keeps to itself; the Customiser is
 * bound as its README asks; the studio's roles write only what their work
 * needs.
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import { buildManifest, CUSTOMER_ROUTES, manifestText } from "./build.ts";
import { untranslated } from "./labels.ts";
import { DESIGN_POSTING } from "./postings.ts";
import { PUBLIC_REFS } from "./public.ts";
import UNTRANSLATED from "./untranslated-labels.json" with { type: "json" };

const FILE = join(__dirname, "..", "..", "manifest.json");

type Json = Record<string, unknown>;
type Entry = Json & { table: string; methods: string[]; key?: string; select?: string[] };
const manifest = buildManifest() as Json & {
  requiredSchema: { prefixed: boolean; tables: (Json & { ref: string; columns: (Json & { ref: string })[] })[] };
  publicAccess: Entry[];
  roles: (Json & { key: string; permissions: string[]; limits?: Record<string, Json>; tables?: Json[] })[];
  addOns: { requires: Json[]; suggests: Json[] };
  people: (Json & { copies: Json[] })[];
};
const table = (ref: string) => manifest.requiredSchema.tables.find((t) => t.ref === ref)!;
const column = (t: string, c: string) => table(t).columns.find((col) => col.ref === c)!;
const rules = (t: string, c: string) => (column(t, c)["rules"] ?? {}) as Json;
const role = (key: string) => manifest.roles.find((r) => r.key === key)!;

describe("manifest.json is what src/manifest/ writes", () => {
  it("is byte for byte the modules' output — run `npm run manifest` after changing them", () => {
    expect(readFileSync(FILE, "utf8") === manifestText()).toBe(true);
  });

  it("is prefixed, keyed maker, and needs the engine that reads its rules", () => {
    expect(manifest.requiredSchema.prefixed).toBe(true);
    expect(manifest["key"]).toBe("maker");
    expect((manifest["compatibility"] as Json)["minAdminiumVersion"]).toBe("0.3.43");
  });

  it("holds its English-only labels to the list recorded, so a new one cannot slip in untranslated", () => {
    buildManifest();
    expect(untranslated()).toEqual(UNTRANSLATED);
  });
});

describe("every price, weight and date is Adminium's", () => {
  it("prices a line from its product and the product's own options", () => {
    expect(rules("order_lines", "unit_price")["copy"]).toEqual({ via: "product_id", from: "price", mode: "always" });
    for (const [link, kind] of [["material_id", "material"], ["size_id", "size"], ["finish_id", "finish"]] as const) {
      expect(rules("order_lines", link)["linkable"]).toEqual({
        where: [{ column: "kind", eq: kind }, { column: "active", eq: true }],
        same: [{ column: "product_id", as: "product_id" }],
      });
    }
    expect(rules("order_line_features", "option_id")["linkable"]).toEqual({
      where: [{ column: "kind", eq: "feature" }, { column: "active", eq: true }],
      same: [{ column: "product_id", as: "line_id.product_id" }],
    });
  });

  it("picks the product's quantity break and the postage rate by band", () => {
    expect(rules("order_lines", "break_id")["band"]).toEqual({ table: "options", min: "min_qty", value: "qty", scope: [{ column: "product_id", equals: "product_id" }] });
    expect(rules("orders", "postage_rate_id")["band"]).toMatchObject({ table: "postage_rates", value: "weight_g", scope: [{ column: "service_id", equals: "service_id" }] });
    expect(rules("orders", "postage")["copy"]).toEqual({ via: "postage_rate_id", from: "price", mode: "always" });
  });

  it("keeps a customising feature flat a piece, outside the break", () => {
    expect(rules("order_lines", "features_total")["formula"]).toEqual({ mul: [{ coalesce: ["features_each", 0] }, "pieces"] });
    expect(rules("order_lines", "line_total")["formula"]).toEqual({ add: [{ mul: ["each", "qty"] }, { coalesce: ["features_total", 0] }] });
  });

  it("dates a line's post-by in studio days from the order coming in, with the cut-off and the closures", () => {
    const set = ((rules("order_lines", "post_by")["stamp"] as Json)["set"] as Json)["addWorkingDays"];
    expect(set).toEqual({
      from: "placed_at",
      days: "lead_days",
      weekdays: "studio_days",
      cutoff: "cutoff",
      closures: { table: "closures", from: "from_date", to: "to_date", active: "active" },
    });
    expect(rules("orders", "post_by")["rollup"]).toEqual({ from: "order_lines", via: "order_id", latest: { of: "post_by", by: "post_by" } });
    const settings = manifest["settings"] as Json[];
    expect(settings.map((s) => [s["key"], s["default"]])).toEqual([["studio_days", "tue,wed,thu,fri,sat"], ["cutoff", "17:00"]]);
  });

  it("numbers orders without gaps, from the settings' first number and prefix", () => {
    expect(rules("orders", "number_seq")["sequence"]).toEqual({ gapless: true, startSetting: { table: "settings", column: "first_order_number" } });
    expect(rules("orders", "number")["format"]).toEqual({ from: "number_seq", prefixSetting: { table: "settings", column: "ref_prefix" } });
  });
});

describe("the Customiser is bound as its README asks", () => {
  it("requires it at the release that carries it, and names the page its saved-design mail opens", () => {
    expect(manifest.addOns.requires).toEqual([expect.objectContaining({ key: "customiser", range: "^1.0.16" })]);
    expect(CUSTOMER_ROUTES.customiserDesign).toBe("/design");
    expect(manifest.addOns.suggests.map((s) => s["key"])).toEqual(["shipping-dhl", "barcode-labels", "inventory", "invoices", "holiday-calendars"]);
  });

  it("links a product to its base, and a line to its design by the design's code only", () => {
    expect(rules("products", "base_id")["addOnLink"]).toEqual({ addOn: "customiser", table: "bases" });
    expect(rules("order_lines", "design_id")).toEqual({
      addOnLink: { addOn: "customiser", table: "designs" },
      lookup: { from: "design_code", table: { addOn: "customiser", table: "designs" }, column: "code" },
    });
    const create = manifest.publicAccess.find((e) => e.table === "orders" && e.methods.includes("POST"))!;
    const lines = (create["children"] as Json)["order_lines"] as Json;
    expect(lines["writable"]).toContain("design_code");
    expect(lines["writable"]).not.toContain("design_id");
  });

  it("checks the design a line names against the features it pays for, and posts it when the line is made", () => {
    expect(table("order_lines")["check"]).toEqual({ by: { addOn: "customiser" }, design: "design_id", paid: { table: "order_line_features", via: "line_id", feature: "feature" } });
    expect(table("order_lines")["postings"]).toEqual([DESIGN_POSTING]);
    expect(rules("options", "feature_id")["addOnLink"]).toEqual({ addOn: "customiser", table: "features" });
  });

  it("copies a person onto the designs their lines name", () => {
    const copies = manifest.people[0]!.copies.filter((c) => c["addOn"] === "customiser");
    expect(copies).toEqual([
      { addOn: "customiser", table: "designs", column: "email", holds: "email", via: "order_lines.design_id" },
      { addOn: "customiser", table: "designs", column: "values", holds: "details", via: "order_lines.design_id" },
    ]);
  });
});

describe("a shopper reads nothing of anyone else's, and nothing the studio keeps", () => {
  const NEVER = ["link_token", "client_key", "customer_id", "number_seq", "number_code", "posted_by", "sent_by", "made_by", "staff_note", "reminded_at", "may_email"];
  const selects = (e: Json): string[] => [
    ...((e["select"] as string[] | undefined) ?? []),
    ...Object.values((e["children"] ?? {}) as Record<string, Json>).flatMap((child) => [
      ...((child["select"] as string[] | undefined) ?? []),
      ...Object.values((child["children"] ?? {}) as Record<string, Json>).flatMap((grand) => (grand["select"] as string[] | undefined) ?? []),
    ]),
  ];

  it("never selects a link code, a retry key, a stamp of who, or a studio note", () => {
    for (const entry of manifest.publicAccess) {
      for (const name of NEVER) expect(selects(entry), `${entry.table} ${entry.methods.join(",")}`).not.toContain(name);
    }
  });

  it("reads orders only through a signed-in shopper, or one order by its own link", () => {
    for (const entry of manifest.publicAccess.filter((e) => e.table === "orders" && e.methods.includes("GET"))) {
      const claimed = entry["claimedBy"] !== undefined && entry["level"] === "verified";
      const own = entry.key === "order" && (entry["claim"] as Json | undefined)?.["own"] === true;
      expect(claimed || own).toBe(true);
    }
  });

  it("answers a proof only to approve it or ask for a change, while it waits", () => {
    const answers = manifest.publicAccess.filter((e) => e.table === "proofs");
    expect(answers.map((e) => e.key ?? "customer")).toEqual(["customer", "order"]);
    for (const entry of answers) {
      expect(entry["writable"]).toEqual(["state", "change_note"]);
      expect(entry["writableValues"]).toEqual({ state: ["approved", "change_asked"] });
      expect(entry["writableWhen"]).toEqual({ state: ["sent"] });
    }
  });

  it("finds a problem's order only among the orders sent to the address it gives", () => {
    expect(rules("problem_reports", "order_id")["lookup"]).toEqual({ from: "order_ref", table: "orders", column: "number_code", scope: [{ column: "email", equals: "email" }] });
  });

  it("places an order with a retry key, a quote first, and a refusal if the total moved", () => {
    const create = manifest.publicAccess.find((e) => e.table === "orders" && e.methods.includes("POST"))!;
    expect([create["dryRun"], create["expect"], create["clientKey"], create["humanCheck"]]).toEqual([true, "total", "client_key", true]);
    expect((create["consent"] as Json)["column"]).toBe("may_email");
  });
});

describe("the shop's pages call each entry by the ref Adminium gives it", () => {
  it("names every entry, in order, as Adminium names them", () => {
    const taken = new Set<string>();
    const refs = manifest.publicAccess.map((entry) => {
      const real = `maker_${entry.table}`;
      const reached = entry["claimedBy"] !== undefined || entry["visibleWith"] !== undefined;
      const base = entry["claim"] !== undefined || (reached && entry["level"] !== "verified") ? `${real}_claimed` : reached ? `${real}_verified` : real;
      let ref = base;
      for (let n = 2; taken.has(ref); n += 1) ref = `${base}_${String(n)}`;
      taken.add(ref);
      return ref;
    });
    expect(Object.values(PUBLIC_REFS)).toEqual(refs);
  });
});

describe("the studio writes only what its work needs", () => {
  it("keeps the maker and the packer on the studio's screens", () => {
    expect(role("maker")["screensOnly"]).toBe(true);
    expect(role("packer")["screensOnly"]).toBe(true);
    expect(role("owner")["screensOnly"]).toBeUndefined();
  });

  it("reads the design a line names, for every role that sees orders", () => {
    for (const key of ["owner", "maker", "packer"]) {
      expect(role(key).tables, key).toEqual(expect.arrayContaining([{ addOn: "customiser", table: "designs", actions: ["read"] }]));
    }
  });

  it("never lets a role write a price, a total or the shopper's own tick", () => {
    for (const key of ["owner", "maker", "packer"]) {
      for (const [ref, limit] of Object.entries(role(key).limits ?? {})) {
        for (const list of ["writable", "creatable"] as const) {
          const named = (limit[list] as string[] | undefined) ?? [];
          for (const c of named) {
            const r = rules(ref, c);
            expect(["rollup", "formula", "copy", "band", "stamp", "sequence", "format", "code", "lookup"].filter((k) => r[k] !== undefined), `${key} ${ref}.${c}`).toEqual([]);
          }
          if (ref === "orders") expect(named, key).not.toContain("may_email");
        }
      }
    }
  });

  it("lets the packer only post what is ready", () => {
    expect(role("packer").limits!["orders"]).toEqual({ writable: ["status", "tracking"], writableValues: { status: ["posted"] }, writableFrom: { status: ["ready"] } });
  });
});
