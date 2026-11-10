/**
 * The manifest at its floor (`MIN_ADMINIUM`): the words that floor first
 * reads are written, they pass its validator, and an older floor refuses
 * them, so they cannot ship to an Adminium that would not read them.
 */
import { describe, expect, it } from "vitest";

import { validateManifest } from "../testing/manifest/index.ts";
import { buildManifest, MIN_ADMINIUM } from "./build.ts";
import { LETTERING_FITS } from "./public.ts";
import APP_GRANTS from "../../vendor/customiser/app-grants.json" with { type: "json" };
import { ROLE_PANELS, SET_UP_COLUMNS } from "./roles.ts";

type Json = Record<string, unknown>;
const roleOf = (m: Json, key: string) => (m["roles"] as { key: string; permissions: string[] }[]).find((r) => r.key === key)!;
const orderEntry = (m: Json) => (m["publicAccess"] as Json[]).find((e) => (e["children"] as Json | undefined)?.["order_lines"] !== undefined)!;
const linesOf = (m: Json) => (orderEntry(m)["children"] as Record<string, Json>)["order_lines"]!;
const copiesOf = (m: Json) => ((m["people"] as Json[])[0]!["copies"] as Json[]).filter((c) => c["addOn"] === "customiser").map((c) => `${String(c["table"])}.${String(c["column"])}`);
const ownCopiesOf = (m: Json, table: string) => ((m["people"] as Json[])[0]!["copies"] as Json[]).filter((c) => c["addOn"] === undefined && c["table"] === table).map((c) => String(c["column"]));

describe(`the manifest at its floor, ${MIN_ADMINIUM}`, () => {
  const shipped = buildManifest();

  it("asks for that floor and passes its validator", () => {
    expect(shipped["compatibility"]).toMatchObject({ minAdminiumVersion: MIN_ADMINIUM });
    const result = validateManifest(shipped);
    expect(result.ok ? [] : result.issues).toEqual([]);
  });

  it("grants the Customiser's panels to the owner and the maker, and none to the packer", () => {
    for (const [key, panels] of Object.entries(ROLE_PANELS)) {
      expect(roleOf(shipped, key).permissions.filter((p) => p.startsWith("page:@customiser-")).sort()).toEqual(panels.map((p) => `page:@${p}:view`).sort());
      // The set-up page, beside which the starter fonts' files are handed out: whoever makes the files holds it.
      expect(roleOf(shipped, key).permissions).toContain("page:@customiser:view");
    }
    expect(roleOf(shipped, "packer").permissions.filter((p) => p.startsWith("page:@customiser"))).toEqual([]);
  });

  it("gives the owner and the maker what the Customiser's line panel reads and writes, and the packer only the design", () => {
    type Grant = { addOn: string; table: string; actions: string[] };
    const tablesOf = (key: string) => Object.fromEntries(((roleOf(shipped, key) as unknown as { tables: Grant[] }).tables.filter((g) => g.addOn === "customiser")).map((g) => [g.table, g.actions]));
    const reads = ["bases", "ready_designs", "ready_parts", "base_areas", "base_pieces", "palettes", "palette_colours", "fonts", "features"];
    for (const table of reads) expect(tablesOf("maker")[table], `maker reads ${table}`).toEqual(["read"]);
    for (const key of ["owner", "maker"]) {
      const held = tablesOf(key);
      for (const table of reads) expect(held[table], `${key} reads ${table}`).toContain("read");
      // The shopper's words, logo and photo are personal columns: read in clear.
      expect(held["designs"], key).toEqual(["read", "read_pii"]);
      expect(held["design_versions"], key).toEqual(["read", "read_pii", "create", "update"]);
      // Making the files again takes the version's old files away.
      expect(held["version_files"], key).toEqual(["read", "create", "update", "delete"]);
    }
    expect(tablesOf("packer")).toEqual({ designs: ["read"] });
  });

  // Customiser 1.0.21: an app's role may hold what the set-up page reads and writes, so the owner needs no designer role.
  it("gives the owner what the Customiser's set-up page reads and writes, and the maker none of its writes but the settings' read", () => {
    type Grant = { addOn: string; table: string; actions: string[]; limit?: { creatable?: string[]; writable?: string[] } };
    const grantsOf = (key: string) => (roleOf(shipped, key) as unknown as { tables: Grant[] }).tables;
    const owner = Object.fromEntries(grantsOf("owner").filter((g) => g.addOn === "customiser").map((g) => [g.table, g]));
    // The shop's settings, the one-colour line among them, set on the set-up page (Customiser 1.0.23).
    expect(owner["settings"]!.actions).toEqual(["read", "update"]);
    expect(owner["settings"]!.limit!.writable).toEqual(["default_bleed_mm", "default_safe_mm", "one_colour_threshold", "smallest_line_mm", "min_dpi"]);
    expect(owner["bases"]!.actions).toEqual(["read", "create", "update"]);
    for (const table of ["base_pieces", "base_areas", "ready_designs", "ready_parts", "fonts", "palettes", "palette_colours", "features"]) {
      expect(owner[table]!.actions, table).toEqual(["read", "create", "update", "delete"]);
    }
    // A new row names the add-on's app; no change moves a row to another.
    for (const table of ["bases", "fonts", "features"]) {
      expect(owner[table]!.limit!.creatable, table).toContain("app");
      expect(owner[table]!.limit!.writable, table).not.toContain("app");
    }
    expect(grantsOf("maker").filter((g) => g.addOn === "customiser" && g.table !== "design_versions" && g.table !== "version_files").flatMap((g) => g.actions.filter((a) => a !== "read" && a !== "read_pii"))).toEqual([]);
    // The maker's proof draws a one-colour logo at the shop's own line, as the shopper saw it.
    expect(grantsOf("maker").find((g) => g.addOn === "customiser" && g.table === "settings")?.actions).toEqual(["read"]);
  });

  // Two shop apps on one Adminium share the Customiser's tables: each owner changes only its own shop's set-up.
  it("lets the owner see, add, change and remove Birch Row's own set-up rows only, and use the starter fonts no app names", () => {
    type Grant = { addOn: string; table: string; actions: string[]; limit?: { creatableValues?: Json; rows?: Json } };
    const owner = Object.fromEntries((roleOf(shipped, "owner") as unknown as { tables: Grant[] }).tables.filter((g) => g.addOn === "customiser").map((g) => [g.table, g]));
    const own = { reach: "all", while: { column: "app", in: ["maker"] } };
    const starter = { reach: "all", while: { column: "starter", in: [true] } };
    for (const table of Object.keys(SET_UP_COLUMNS)) {
      const limit = owner[table]!.limit!;
      if (table === "fonts") {
        // A starter font names no app: read and given its file by the owner, never removed; no font is made one.
        expect(limit.creatableValues, table).toEqual({ app: ["maker"], starter: [false] });
        expect((limit as { writable?: string[] }).writable, table).not.toContain("starter");
        expect(limit.rows, table).toEqual({ read: [own, starter], update: [own, starter], delete: own });
        continue;
      }
      expect(limit.creatableValues, table).toEqual({ app: ["maker"] });
      expect(limit.rows, table).toEqual(table === "bases" ? { read: own, update: own } : { read: own, update: own, delete: own });
    }
  });

  // The customers' designs, their versions and files: Birch Row's own customers alone, for every role that reads them in
  // clear (the Customiser's `ownPanel`); the packer reads only whether a line names a design.
  it("keeps the owner and the maker to Birch Row's own customers' designs, versions and files", () => {
    type Grant = { addOn: string; table: string; actions: string[]; limit?: { creatableValues?: Json; rows?: Json } };
    const own = { reach: "all", while: { column: "app", in: ["maker"] } };
    for (const key of ["owner", "maker"]) {
      const held = Object.fromEntries((roleOf(shipped, key) as unknown as { tables: Grant[] }).tables.filter((g) => g.addOn === "customiser").map((g) => [g.table, g]));
      expect(held["designs"]!.limit, key).toEqual({ rows: { read: own } });
      expect(held["design_versions"]!.limit!.creatableValues, key).toEqual({ app: ["maker"] });
      expect(held["design_versions"]!.limit!.rows, key).toEqual({ read: own, update: own });
      expect(held["version_files"]!.limit!.creatableValues, key).toEqual({ app: ["maker"] });
      expect(held["version_files"]!.limit!.rows, key).toEqual({ read: own, update: own, delete: own });
    }
    expect((roleOf(shipped, "packer") as unknown as { tables: Grant[] }).tables).toEqual([{ addOn: "customiser", table: "designs", actions: ["read"] }]);
  });

  type Offered = Record<string, { actions: string[]; creatable?: string[]; writable?: string[] }>;
  type Held = { addOn: string; table: string; actions: string[]; limit?: { creatable?: string[]; writable?: string[] } };
  const heldBy = (key: string) => (roleOf(shipped, key) as unknown as { tables: Held[] }).tables.filter((g) => g.addOn === "customiser");
  const offered = APP_GRANTS as Offered;
  const sorted = (list: readonly string[] | undefined) => [...(list ?? [])].sort();

  it("asks no more of the Customiser's tables than it lets an app's role hold (its vendored appGrants), so the install cuts nothing", () => {
    // Every table the Customiser lets an app's role add rows to but its own ledger's (a design's versions and files) is set up here.
    const setUp = Object.keys(offered).filter((table) => offered[table]!.actions.includes("create") && !["design_versions", "version_files"].includes(table));
    expect(Object.keys(SET_UP_COLUMNS).sort()).toEqual(setUp.sort());
    for (const key of ["owner", "maker", "packer"]) {
      for (const grant of heldBy(key)) {
        const theirs = offered[grant.table]!;
        expect(grant.actions.filter((a) => !theirs.actions.includes(a)), `${key} ${grant.table}`).toEqual([]);
        expect((grant.limit?.creatable ?? []).filter((c) => !(theirs.creatable ?? []).includes(c)), `${key} ${grant.table} creatable`).toEqual([]);
        expect((grant.limit?.writable ?? []).filter((c) => !(theirs.writable ?? []).includes(c)), `${key} ${grant.table} writable`).toEqual([]);
      }
    }
  });

  // The Customiser 1.0.23 and later: the shop's settings an app's role changes, and no font's `starter`.
  it("holds the owner's set-up and settings to exactly what the Customiser lets an app's role write (vendored 1.0.23 or later)", () => {
    const owner = Object.fromEntries(heldBy("owner").map((g) => [g.table, g]));
    for (const table of [...Object.keys(SET_UP_COLUMNS), "settings"]) {
      const theirs = offered[table]!;
      expect(owner[table]!.actions, table).toEqual(theirs.actions);
      expect(sorted(owner[table]!.limit?.creatable), `${table} creatable`).toEqual(sorted(theirs.creatable));
      expect(sorted(owner[table]!.limit?.writable), `${table} writable`).toEqual(sorted(theirs.writable));
    }
  });

  it("gives no role more than 24 of the add-ons' tables", () => {
    for (const role of shipped["roles"] as { key: string; tables?: unknown[] }[]) expect((role.tables ?? []).length, role.key).toBeLessThanOrEqual(24);
  });

  // Adminium 0.3.50: a proof made anywhere answers the line's proof still out, in the same write.
  it("supersedes the line's proof still out with each new proof, an approved one never", () => {
    const proofs = ((shipped["requiredSchema"] as { tables: Json[] }).tables).find((t) => t["ref"] === "proofs")!;
    expect((proofs["states"] as Json)["supersedes"]).toEqual({ by: "line_id", from: ["sent", "change_asked"], to: "superseded" });
    // No role moves a proof's answer itself: the maker sends and reminds.
    const maker = (shipped["roles"] as { key: string; limits?: Record<string, Json> }[]).find((r) => r.key === "maker")!;
    expect(maker.limits!["proofs"]!["writable"]).toEqual(["reminded_at"]);
  });

  // A proof with nothing to look at would supersede the one the customer can answer: none is made without its picture.
  it("makes no proof without its picture, and the dashboard's Proofs form asks for it", () => {
    const proofs = ((shipped["requiredSchema"] as { tables: Json[] }).tables).find((t) => t["ref"] === "proofs")!;
    expect((proofs["states"] as Json)["create"]).toEqual({ requires: { where: [{ column: "picture", isNull: false }] } });
    const page = (shipped["pages"] as { ref: string; config: { form: { sections: { fields: Json[] }[] } } }[]).find((p) => p.ref === "maker-proofs")!;
    const picture = page.config.form.sections.flatMap((s) => s.fields).find((f) => f["column"] === "picture");
    expect(picture).toMatchObject({ required: true });
  });

  // Two orders' coasters read apart: a line by its label code, a proof by its line and number, never "lettering".
  it("names a line by its label code and a proof by its line and number, and the pickers show them", () => {
    const tables = (shipped["requiredSchema"] as { tables: Json[] }).tables;
    const of = (ref: string) => tables.find((t) => t["ref"] === ref)!;
    const column = (table: string, ref: string) => (of(table)["columns"] as Json[]).find((c) => c["ref"] === ref)!;
    expect([of("order_lines")["keyField"], of("proofs")["keyField"]]).toEqual(["label_code", "title"]);
    expect((column("proofs", "line_code")["rules"] as Json)["copy"]).toEqual({ via: "line_id", from: "label_code", mode: "always", follow: true });
    // Every line has its place on its order, however it is made: the code never reads "BR-2291" for two lines.
    expect((column("order_lines", "position")["rules"] as Json)["sequence"]).toEqual({ gapless: true, scope: "order_id", sample: true });
    expect((column("proofs", "title")["rules"] as Json)["formula"]).toEqual({ join: ["line_code", " #", "version"] });
    const fields = (ref: string) => (shipped["pages"] as { ref: string; config: { form: { sections: { fields: Json[] }[] } } }[]).find((p) => p.ref === ref)!.config.form.sections.flatMap((s) => s.fields);
    for (const page of ["maker-proofs", "maker-stock"]) {
      expect(fields(page).find((f) => f["column"] === "line_id"), page).toMatchObject({ reference: { name: "label_code", detail: ["summary"] } });
    }
    // On the Proofs form, only the chosen order's lines.
    expect(fields("maker-proofs").find((f) => f["column"] === "line_id")).toMatchObject({ reference: { scope: { field: "order_id", column: "order_id" } } });
    expect(fields("maker-messages").find((f) => f["column"] === "proof_id")).toMatchObject({ reference: { name: "title" } });
  });

  it("lets the owner find and erase a customer, and no screens-only role", () => {
    expect(roleOf(shipped, "owner").permissions).toContain("privacy:@:people");
    for (const key of ["maker", "packer"]) expect(roleOf(shipped, key).permissions.filter((p) => p.startsWith("privacy:"))).toEqual([]);
  });

  it("gives the owner Holiday calendars' settings, and no other role", () => {
    expect(roleOf(shipped, "owner").permissions).toContain("addOn:holiday-calendars:settings");
    for (const key of ["maker", "packer"]) expect(roleOf(shipped, key).permissions.filter((p) => p.startsWith("addOn:"))).toEqual([]);
  });

  it("holds a placed line's lettering to its product's limit", () => {
    expect(linesOf(shipped)["agrees"]).toEqual([LETTERING_FITS]);
  });

  it("follows a person into their designs' logo, photo, versions and files", () => {
    expect(copiesOf(shipped)).toEqual([
      "designs.email",
      "designs.values",
      "designs.logo_file",
      "designs.photo_file",
      "design_versions.values",
      "design_versions.proof_file",
      "version_files.file",
    ]);
  });

  it("deletes the picture of a proof with the person it was sent to", () => {
    expect(ownCopiesOf(shipped, "proofs")).toEqual(["change_note", "picture"]);
  });

  it("is refused by the validator at an older floor, so its words cannot ship early", () => {
    expect(validateManifest({ ...shipped, compatibility: { ...(shipped["compatibility"] as Json), minAdminiumVersion: "0.3.46" } }).ok).toBe(false);
  });
});
