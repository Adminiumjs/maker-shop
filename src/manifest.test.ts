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
 * product — so it prints what it looked for and skips.
 *
 * ── AND THE SKIP IS NO LONGER A HOLE (added 2026-08-20) ────────────────────
 *
 * That skip used to be a KNOWN COST written down and left: without a product
 * checkout this document was held to nothing at all, and the works one repo
 * over had solved it a wave earlier by VENDORING the validator under
 * `testing/manifest/`. So the schema block at the bottom of this file runs the
 * vendored copy and runs ALWAYS, a clean clone included, and the block after it
 * asks the sharper question a copy makes possible: do the copy and the original
 * AGREE? A copy nobody compares drifts — the works' copy sat a whole schema
 * behind the product, refusing a manifest that was in fact valid, which is why
 * `scripts/sync-manifest-validator.mjs` now owns it instead of a hand-copy.
 *
 * Everything above this line still runs the REAL validator when it is reachable,
 * because a copy agreeing with itself proves nothing.
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
import { validateManifest as validateVendored } from "./testing/manifest/index.ts";
import { CATEGORY_KEYS, LEAD_STUDIO_DAYS, MATERIAL_STOCK } from "./lib/catalogue.ts";
import { BENCH_COLUMNS } from "./lib/orders.ts";

const PRODUCT_ROOT =
  process.env.ADMINIUM_REPO || fileURLToPath(new URL("../../adminium", import.meta.url));

const VALIDATOR = join(PRODUCT_ROOT, "packages", "manifest", "dist", "index.js");

interface Issue {
  path: string;
  message: string;
}

interface Validator {
  validateManifest: (value: unknown) => { ok: boolean; issues?: readonly Issue[] };
}

const available = existsSync(VALIDATOR);

/** CI sets this beside the product checkout; see .github/workflows/ci.yml. */
const VALIDATOR_REQUIRED = process.env.ADMINIUM_REQUIRE_VALIDATOR === "true";

/**
 * ── AND CI MAY NOT SKIP IT (28-T26 follow-up) ──────────────────────────────
 *
 * `describe.skipIf` above is right for a developer with no product checkout —
 * somebody reading the example app is not required to clone the product. It was
 * WRONG for CI, where it meant half this file, the whole drift check included,
 * never ran anywhere automated while the job reported green.
 *
 * The workflow sets `ADMINIUM_REQUIRE_VALIDATOR` in the same condition that
 * checks the product out, so the two cannot disagree: if CI promised the
 * validator and it is not there, that is a failure, not a skip.
 */
it.skipIf(!VALIDATOR_REQUIRED)("has the product validator that CI promised", () => {
  expect(
    available,
    `ADMINIUM_REQUIRE_VALIDATOR is set, so the real validator must be present, and ` +
      `nothing is at ${VALIDATOR}. The checkout or build step did not run.`,
  ).toBe(true);
});


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

/**
 * ── FOUR MISTAKES THE SCHEMA CANNOT SEE, AND NOBODY WAS CHECKING ──────────
 *
 * [Added 2026-08-20 from an adversarial pass.] The schema is genuinely
 * enforced — the drift block below proves the copy agrees with the product on
 * every mutation thrown at it — but a schema constrains SHAPES, and these four
 * documents are all correctly shaped and still wrong. Both validators accept
 * every one of them, and until now so did this suite.
 *
 * They are asserted here rather than in the product because each is a fact
 * about THIS app. The general forms — a duplicate `ref`, a `bindings` target
 * that is not a table — belong in `packages/manifest` and are worth raising
 * there; a per-repo assertion is what can be had today without re-vendoring
 * the validator into fifteen repos.
 */
describe("mistakes that are correctly shaped and still wrong", () => {
  const tables: { ref: string }[] = manifest.requiredSchema.tables;

  it("gives every page a distinct ref", () => {
    // Two pages with one ref is an install that silently drops a screen.
    const refs = manifest.pages.map((page) => page.ref);
    expect(refs.length, "duplicate page refs: " + refs.join(", ")).toBe(new Set(refs).size);
  });

  it("gives every table a distinct ref", () => {
    const refs = tables.map((table) => table.ref);
    expect(refs.length, "duplicate table refs: " + refs.join(", ")).toBe(new Set(refs).size);
  });

  it("names each facet once", () => {
    expect(manifest.categories.length).toBe(new Set(manifest.categories).size);
  });

  it("gives every declared side something to load", () => {
    // A `frontends[]` entry with no entry point is a side the installer cannot
    // serve. The schema only requires the entry to be well-formed.
    for (const frontend of manifest.frontends as { side: string; entry?: string }[]) {
      expect(typeof frontend.entry, `${frontend.side} has no entry`).toBe("string");
      expect((frontend.entry ?? "").length, `${frontend.side} entry is blank`).toBeGreaterThan(0);
    }
  });
});

/**
 * ── THE SAME SCHEMA, WITHOUT A PRODUCT CHECKOUT ────────────────────────────
 *
 * No `skipIf`. This is the half a clean clone gets, and it is why the document
 * is now held to the frozen schema on every machine rather than only on one
 * with the product beside it.
 */
describe("manifest.json passes the vendored validator, always", () => {
  it("validates against the frozen v1 schema with no issues at all", () => {
    const result = validateVendored(manifest);
    expect(result.ok ? [] : result.issues, "the vendored validator rejects this manifest").toEqual(
      [],
    );
    expect(result.ok).toBe(true);
  });

  it("refuses the same real mistakes, so it is wired up and not a stub", () => {
    // A validator nobody has watched REFUSE something might not be wired up at
    // all: an import that resolved to `{ validateManifest: () => ({ ok: true }) }`
    // would look exactly like the case above passing.
    for (const patch of [
      { publisher: { ...manifest.publisher, id: "somebody-else" } },
      { addOn: { attaches: [], provides: [] } },
      { manifestVersion: 2 },
      { categories: ["handmade"] },
      // The schema this repo's document was normalised INTO. A copy taken
      // before that change accepts `frontend` and refuses `frontends`, which is
      // the drift that actually happened next door.
      { frontends: [] },
    ]) {
      expect(validateVendored({ ...manifest, ...patch }).ok, JSON.stringify(patch)).toBe(false);
    }
  });
});

/**
 * ── AND THE COPY IS HELD TO THE ORIGINAL ───────────────────────────────────
 *
 * Runs only where the product is, because that is the only place the question
 * can be asked. Comparing the VERDICT is not enough on its own — a copy that
 * refuses the same document for a different reason has drifted too — so the
 * issue PATHS are compared as well.
 */
/**
 * ── AND THE COPY IS HELD TO THE ORIGINAL ───────────────────────────────────
 *
 * Runs only where the product is, because that is the only place the question
 * can be asked. Comparing the VERDICT is not enough on its own — a copy that
 * refuses the same document for a different reason has drifted too — so the
 * issue PATHS are compared as well.
 *
 * ── WHY THE CASES ARE GENERATED AND NOT LISTED ────────────────────────────
 *
 * [Changed 2026-08-20 by an adversarial pass.] Six hand-written documents stood
 * here, and six documents can only detect a drift they happen to touch: any
 * product change tightening or loosening a rule those six do not exercise left
 * the copy a rule behind with this block green. That is the exact failure the
 * block exists to prevent — the works' copy sat a whole schema behind the
 * product — reached from a different direction.
 *
 * So the documents are DERIVED from the manifest instead: every top-level key
 * removed and re-typed in turn, every table removed and its ref duplicated,
 * every column's type corrupted, every page's binding pointed at nothing, plus
 * the hand-written ones worth keeping by name. Roughly a hundred and fifty
 * documents, each one a place the two validators could disagree.
 */
function mutations(): { what: string; document: unknown }[] {
  const out: { what: string; document: unknown }[] = [];
  const base = manifest as unknown as Record<string, unknown>;
  const clone = (): Record<string, unknown> =>
    structuredClone(base) as Record<string, unknown>;

  out.push({ what: "as it ships", document: manifest });

  for (const key of Object.keys(base)) {
    const dropped = clone();
    delete dropped[key];
    out.push({ what: `without ${key}`, document: dropped });

    // A wrong TYPE is a different refusal from a missing key, and a copy can
    // drift on one without drifting on the other.
    for (const [label, value] of [
      ["a number", 42],
      ["null", null],
      ["an array", []],
      ["an object", {}],
    ] as const) {
      const retyped = clone();
      retyped[key] = value;
      out.push({ what: `${key} as ${label}`, document: retyped });
    }
  }

  const tables = (base["requiredSchema"] as { tables: { ref: string; columns: { type: string }[] }[] })
    .tables;
  for (let t = 0; t < tables.length; t += 1) {
    const dropped = clone();
    (dropped["requiredSchema"] as { tables: unknown[] }).tables.splice(t, 1);
    out.push({ what: `without table ${tables[t]?.ref ?? t}`, document: dropped });

    const duped = clone();
    const list = (duped["requiredSchema"] as { tables: { ref: string }[] }).tables;
    list.push(structuredClone(list[t]!));
    out.push({ what: `table ${tables[t]?.ref ?? t} declared twice`, document: duped });

    const columns = tables[t]?.columns ?? [];
    for (let c = 0; c < columns.length; c += 1) {
      const broken = clone();
      const target = (broken["requiredSchema"] as { tables: { columns: { type: string }[] }[] })
        .tables[t]?.columns[c];
      if (target === undefined) continue;
      // `varchar` is what somebody who thinks in SQL writes; the abstract types
      // are the contract.
      target.type = "varchar";
      out.push({ what: `${tables[t]?.ref}.column[${c}] typed varchar`, document: broken });
    }
  }

  const pages = base["pages"] as { ref: string; bindings?: Record<string, string> }[];
  for (let i = 0; i < pages.length; i += 1) {
    const broken = clone();
    const page = (broken["pages"] as { bindings?: Record<string, string> }[])[i];
    if (page?.bindings === undefined) continue;
    for (const key of Object.keys(page.bindings)) page.bindings[key] = "no_such_table";
    out.push({ what: `page ${pages[i]?.ref} bound to nothing`, document: broken });
  }

  for (const [what, patch] of [
    ["a publisher that is not first-party", { publisher: { ...manifest.publisher, id: "somebody-else" } }],
    ["an add-on block on an app", { addOn: { attaches: [], provides: [] } }],
    ["a facet outside the closed vocabulary", { categories: ["handmade"] }],
    ["a capability nobody implements", { capabilities: [...manifest.capabilities, "telepathy"] }],
    ["an app with no side at all", { frontends: [] }],
    ["a reserved key", { key: "admin" }],
    ["a manifest version that is not the frozen one", { manifestVersion: 2 }],
  ] as const) {
    out.push({ what, document: { ...manifest, ...patch } });
  }

  return out;
}

describe.skipIf(!available)("the vendored validator has not drifted from @adminium/manifest", () => {
  it("agrees with the real one about every derived document", async () => {
    const real = await load();
    const paths = (r: { ok: boolean; issues?: readonly { path: string }[] }): string =>
      [...(r.issues ?? [])].map((i) => i.path).sort().join("|");

    const disagreements: string[] = [];
    const cases = mutations();
    for (const { what, document } of cases) {
      const theirs = real(document);
      const ours = validateVendored(document);
      if (ours.ok !== theirs.ok) {
        disagreements.push(`${what}: vendored ok=${String(ours.ok)}, real ok=${String(theirs.ok)}`);
      } else if (paths(ours) !== paths(theirs)) {
        disagreements.push(`${what}: same verdict, different paths`);
      }
    }
    expect(disagreements, `${String(cases.length)} documents compared`).toEqual([]);
  });

  it("asks about enough documents, and enough that are REFUSED", () => {
    // A drift check whose cases all PASS proves nothing: two validators that
    // accept everything agree perfectly. This keeps the generator honest if a
    // future manifest happens to survive most of its own mutations.
    const cases = mutations();
    expect(cases.length).toBeGreaterThan(40);
    const refused = cases.filter(({ document }) => !validateVendored(document).ok);
    expect(refused.length, "too few refused documents to prove anything").toBeGreaterThan(20);
  });
});
