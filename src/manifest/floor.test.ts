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
    }
    expect(roleOf(shipped, "packer").permissions.filter((p) => p.startsWith("page:@customiser-"))).toEqual([]);
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
    expect(validateManifest({ ...shipped, compatibility: { ...(shipped["compatibility"] as Json), minAdminiumVersion: "0.3.43" } }).ok).toBe(false);
  });
});
