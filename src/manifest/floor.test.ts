/**
 * The manifest at its floor (`MIN_ADMINIUM`): the words that floor first
 * reads are written, they pass its validator, and an older floor refuses
 * them, so they cannot ship to an Adminium that would not read them.
 */
import { describe, expect, it } from "vitest";

import { validateManifest } from "../testing/manifest/index.ts";
import { buildManifest, MIN_ADMINIUM } from "./build.ts";
import { LETTERING_FITS } from "./public.ts";
import { ROLE_PANELS } from "./roles.ts";

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
    for (const key of ["owner", "maker"]) {
      const held = tablesOf(key);
      for (const table of reads) expect(held[table], `${key} reads ${table}`).toEqual(["read"]);
      // The shopper's words, logo and photo are personal columns: read in clear.
      expect(held["designs"], key).toEqual(["read", "read_pii"]);
      expect(held["design_versions"], key).toEqual(["read", "read_pii", "create", "update"]);
      // Making the files again takes the version's old files away.
      expect(held["version_files"], key).toEqual(["read", "create", "update", "delete"]);
    }
    expect(tablesOf("packer")).toEqual({ designs: ["read"] });
  });

  // Adminium 0.3.50: a proof made anywhere answers the line's proof still out, in the same write.
  it("supersedes the line's proof still out with each new proof, an approved one never", () => {
    const proofs = ((shipped["requiredSchema"] as { tables: Json[] }).tables).find((t) => t["ref"] === "proofs")!;
    expect((proofs["states"] as Json)["supersedes"]).toEqual({ by: "line_id", from: ["sent", "change_asked"], to: "superseded" });
    // No role moves a proof's answer itself: the maker sends and reminds.
    const maker = (shipped["roles"] as { key: string; limits?: Record<string, Json> }[]).find((r) => r.key === "maker")!;
    expect(maker.limits!["proofs"]!["writable"]).toEqual(["reminded_at"]);
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
