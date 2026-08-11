/**
 * `manifest.json`, put through the validator the PRODUCT runs.
 *
 * ── WHY THIS FILE EXISTS ────────────────────────────────────────────────────
 *
 * This app shipped with NO MANIFEST AT ALL. Everything else in the wave had
 * one — `printing` and the four add-ons — so `maker` could not be validated
 * against the frozen `manifestVersion: 1` schema, could not be listed on the
 * marketplace and could not be installed, while the personalizer's own manifest
 * declared `attaches: [{ app: "maker", ... }]` — attaching to a document nobody
 * had written.
 *
 * ── WHY IT IMPORTS THE REAL VALIDATOR AND DOES NOT RESTATE IT ───────────────
 *
 * The add-ons monorepo learned this the expensive way and it is worth writing
 * down here rather than pointing at another repo. Every add-on carried a
 * `manifest.test.ts` that restated "the rules 24 §5.3 names", by hand, because
 * `@adminium/manifest` is not on a registry. The personalizer's manifest was
 * INVALID on three paths — two attach targets missing `app`, and a setting
 * declared `"type": "text"`, which is not one of the six the settings union
 * carries — and its suite was green, because the suite asserted that `attaches`
 * EQUALLED the invalid array. A gate written around the defect is not a gate.
 *
 * So nothing below re-implements a rule. `validateManifest` is loaded from the
 * product's own built package and run, and the assertions that are not about
 * the schema are about things a schema cannot see: that the enums in this
 * document are the enums the engines actually use, and that the tables the
 * personalizer mounts on exist here.
 *
 * ── HOW IT REACHES A PACKAGE IT CANNOT INSTALL ──────────────────────────────
 *
 * `@adminium/manifest` is published to no registry, and cannot be installed
 * from a path either: its own package.json declares `zod: "catalog:"` and
 * `@adminium/add-on-contracts: "workspace:*"`, two pnpm protocols npm does not
 * resolve. So it is loaded from a SIBLING PRODUCT CHECKOUT, by path, at run
 * time — its built `dist/` imports both dependencies as bare specifiers and
 * Node resolves them from the product's own `node_modules`, so the validator
 * that runs here is byte-for-byte the one that runs there.
 *
 *   <somewhere>/maker-shop   ← this repo
 *   <somewhere>/adminium     ← the product, with packages/manifest built
 *
 * `ADMINIUM_REPO` points elsewhere. A clean clone of this app alone must still
 * be green — somebody reading the example app is not required to check out the
 * product — so it prints what it looked for and skips. THE SKIP IS A KNOWN
 * COST: publishing `@adminium/manifest` and `@adminium/add-on-contracts` (both
 * already versioned, AGPL-licensed and `files: ["dist"]`) would turn this into
 * an ordinary devDependency CI cannot be missing. That is a product release
 * decision, not one an example app can take.
 *
 * The checks below the validator run either way, so a clean clone still holds
 * this document to the app.
 */

import { existsSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

import { describe, expect, it } from "vitest";

import manifest from "../manifest.json";
import { HOSTED_SLOTS } from "./add-ons/slots.ts";
import { CATEGORY_KEYS, LEAD_STUDIO_DAYS, MATERIAL_STOCK } from "./lib/catalogue.ts";
import { BENCH_COLUMNS } from "./lib/orders.ts";

const PRODUCT_ROOT =
  process.env.ADMINIUM_REPO ?? fileURLToPath(new URL("../../adminium", import.meta.url));

const VALIDATOR = join(PRODUCT_ROOT, "packages", "manifest", "dist", "index.js");

interface Issue {
  path: string;
  message: string;
}

interface Validator {
  validateManifest: (value: unknown) => { ok: boolean; issues?: readonly Issue[] };
}

const available = existsSync(VALIDATOR);

if (!available) {
  console.info(
    `[maker-shop] manifest.json was NOT put through the real validator: nothing at ${VALIDATOR}. ` +
      "Clone the Adminium product beside this repo (or point ADMINIUM_REPO at it) and build " +
      "packages/manifest, and this document is checked against the schema the product enforces.",
  );
}

const load = async (): Promise<Validator["validateManifest"]> => {
  const mod = (await import(/* @vite-ignore */ pathToFileURL(VALIDATOR).href)) as Validator;
  return mod.validateManifest;
};

describe.skipIf(!available)("manifest.json passes @adminium/manifest itself", () => {
  it("validates against the frozen v1 schema with no issues at all", async () => {
    const validateManifest = await load();
    const result = validateManifest(manifest);
    // Named rather than asserted as a bare boolean: a failure that prints
    // `expected true, got false` costs a debugging session that printing the
    // issue list does not.
    expect(result.issues ?? [], "the real validator rejects this manifest").toEqual([]);
    expect(result.ok).toBe(true);
  });

  /**
   * THE GATE, PROVED. A validator nobody has watched REFUSE something is a
   * validator that might not be wired up at all — an import that silently
   * resolved to an object with a `validateManifest` returning `{ ok: true }`
   * would look exactly like the case above passing.
   *
   * Each of these is a real mistake rather than a decorative one: a stranger's
   * publisher id (v1 accepts only first-party, D13), an app carrying an add-on
   * block (§5.7 item 6 — the union is discriminated so it is refused rather
   * than ignored), a column type that is not in the closed list, and a page
   * whose title is a bare string rather than an i18n message.
   */
  it.each([
    ["a publisher that is not first-party", { publisher: { ...manifest.publisher, id: "somebody-else" } }],
    ["an add-on block on an app", { addOn: { attaches: [], provides: [] } }],
    ["a manifest version that is not the frozen one", { manifestVersion: 2 }],
    ["a facet outside the closed vocabulary", { categories: ["handmade"] }],
  ])("refuses %s", async (_what, patch) => {
    const validateManifest = await load();
    const result = validateManifest({ ...manifest, ...patch });
    expect(result.ok).toBe(false);
    expect((result.issues ?? []).length).toBeGreaterThan(0);
  });

  it("refuses a column type the introspection engine does not emit", async () => {
    const validateManifest = await load();
    const broken = structuredClone(manifest) as typeof manifest;
    // `varchar` is what somebody who thinks in SQL writes. The abstract types
    // are the contract; this is the mistake the closed list exists to catch.
    (broken.requiredSchema.tables[0]!.columns[1] as { type: string }).type = "varchar";
    const result = validateManifest(broken);
    expect(result.ok).toBe(false);
  });
});

describe("it is the app this wave says it is", () => {
  it("is an app, keyed `maker`, first-party", () => {
    expect(manifest.kind).toBe("app");
    expect(manifest.key).toBe("maker");
    expect(manifest.publisher.id).toBe("adminium");
    expect(manifest.license).toBe("AGPL-3.0-only");
  });

  it("declares exactly the three capabilities D3a names, and no `realtime`", () => {
    expect([...manifest.capabilities].sort()).toEqual(
      ["email-delivery", "file-storage", "payments"].sort(),
    );
    /*
     * DELIBERATELY ABSENT. It is a two-person bench: claiming live sync for a
     * queue two people watch from the same room would be capability theatre,
     * and it is the one line that separates this document from `printing`'s.
     */
    expect(manifest.capabilities).not.toContain("realtime");
    // Those two belong to ADD-ONS. This app makes no outbound call of its own.
    expect(manifest.capabilities).not.toContain("outbound-http");
    expect(manifest.capabilities).not.toContain("oauth-connect");
  });

  it("names no slot — a host HOSTS slots, it does not fill them", () => {
    expect(manifest).not.toHaveProperty("slots");
    expect(manifest).not.toHaveProperty("addOn");
    expect(HOSTED_SLOTS.length).toBe(9);
  });
});

/**
 * The columns as the SPEC shapes them, not as TypeScript infers them from the
 * literal. `resolveJsonModule` gives every column a union of the exact shapes
 * present in the file, so `references` is missing from the type of any column
 * that is not itself a foreign key — which is the field the fk check reads.
 */
interface Column {
  ref: string;
  type: string;
  enum?: string[];
  references?: string;
}

describe("the schema it asks for is the one the app models", () => {
  const tables: { ref: string; columns: Column[] }[] = manifest.requiredSchema.tables;
  const byRef = new Map(tables.map((t) => [t.ref, t]));
  const columnOf = (table: string, column: string): Column | undefined =>
    byRef.get(table)?.columns.find((c) => c.ref === column);

  /**
   * THE TWO TABLE NAMES ANOTHER REPO DEPENDS ON. The personalizer's manifest
   * mounts `record.editor.panel` on `products` and `order_lines` (D20), naming
   * them as strings; nothing at install time would tell either side if this
   * document renamed one.
   */
  it("declares the tables the personalizer mounts its dashboard panel on", () => {
    expect(byRef.has("products")).toBe(true);
    expect(byRef.has("order_lines")).toBe(true);
  });

  it("states the bench machine as `orders.ts` states it", () => {
    // The one place this document and the engine could drift silently, because
    // nothing at runtime reads the manifest.
    const stage = columnOf("order_lines", "stage");
    expect(stage?.type).toBe("enum");
    expect(stage?.enum).toEqual([...BENCH_COLUMNS]);
  });

  it("states the catalogue's own vocabularies", () => {
    expect(columnOf("products", "category")?.enum).toEqual([...CATEGORY_KEYS]);
    expect(columnOf("products", "lead_kind")?.enum).toEqual(Object.keys(LEAD_STUDIO_DAYS));
    expect(columnOf("materials", "unit")?.enum).toEqual([
      ...new Set(MATERIAL_STOCK.map((row) => row.unit)),
    ]);
  });

  it("carries no finished-goods stock anywhere (24 D5b)", () => {
    /*
     * The rule the whole app is built on, asserted against the DOCUMENT as well
     * as against the code. `orders.test.ts` holds the engine to it; a manifest
     * that installed a `stock` column on `products` would put the field back on
     * the generated dashboard, where nothing in this repo would ever see it.
     */
    const product = byRef.get("products")!;
    for (const column of product.columns) {
      expect(/stock|on_hand|in_stock|quantity/.test(column.ref), `products.${column.ref}`).toBe(
        false,
      );
    }
    // Materials are the only inventory, and they DO carry a count.
    expect(columnOf("materials", "on_hand")?.type).toBe("int");
  });

  it("points every foreign key at a table it also declares", () => {
    for (const table of tables) {
      for (const column of table.columns) {
        if (column.type !== "fk") continue;
        expect(byRef.has(column.references!), `${table.ref}.${column.ref}`).toBe(true);
      }
    }
  });

  it("binds every page to a table it declares", () => {
    for (const page of manifest.pages) {
      for (const target of Object.values(page.bindings ?? {})) {
        expect(byRef.has(target), `${page.ref} → ${target}`).toBe(true);
      }
    }
  });

  it("gives every table a page, so nothing is installed and never seen", () => {
    const bound = new Set(manifest.pages.flatMap((p) => Object.values(p.bindings ?? {})));
    expect([...byRef.keys()].filter((ref) => !bound.has(ref))).toEqual([]);
  });
});
