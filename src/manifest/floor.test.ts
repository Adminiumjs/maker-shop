/**
 * The manifest at the next floor: what raising `MIN_ADMINIUM` to 0.3.44
 * writes, held to the validator of that release before anybody raises it.
 */
import { describe, expect, it } from "vitest";

import { validateManifest } from "../testing/manifest/index.ts";
import { buildManifest, MIN_ADMINIUM, PANELS_AND_LIMITS } from "./build.ts";
import { LETTERING_FITS } from "./public.ts";
import { ROLE_PANELS } from "./roles.ts";

type Json = Record<string, unknown>;
const roleOf = (m: Json, key: string) => (m["roles"] as { key: string; permissions: string[] }[]).find((r) => r.key === key)!;
const orderEntry = (m: Json) => (m["publicAccess"] as Json[]).find((e) => (e["children"] as Json | undefined)?.["order_lines"] !== undefined)!;
const linesOf = (m: Json) => (orderEntry(m)["children"] as Record<string, Json>)["order_lines"]!;
const copiesOf = (m: Json) => ((m["people"] as Json[])[0]!["copies"] as Json[]).filter((c) => c["addOn"] === "customiser").map((c) => `${String(c["table"])}.${String(c["column"])}`);

describe("the manifest at the floor it ships with", () => {
  const shipped = buildManifest();

  it("says none of the next release's words", () => {
    expect(shipped["compatibility"]).toMatchObject({ minAdminiumVersion: MIN_ADMINIUM });
    expect(roleOf(shipped, "maker").permissions.filter((p) => p.startsWith("page:@customiser-"))).toEqual([]);
    expect(linesOf(shipped)["agrees"]).toBeUndefined();
    expect(copiesOf(shipped)).toEqual(["designs.email", "designs.values"]);
  });
});

describe(`the manifest at ${PANELS_AND_LIMITS}`, () => {
  const next = buildManifest({ floor: PANELS_AND_LIMITS });

  it("passes that release's validator", () => {
    const result = validateManifest(next);
    expect(result.ok ? [] : result.issues).toEqual([]);
  });

  it("grants the Customiser's panels to the owner and the maker, and none to the packer", () => {
    for (const [key, panels] of Object.entries(ROLE_PANELS)) {
      expect(roleOf(next, key).permissions.filter((p) => p.startsWith("page:@customiser-")).sort()).toEqual(panels.map((p) => `page:@${p}:view`).sort());
    }
    expect(roleOf(next, "packer").permissions.filter((p) => p.startsWith("page:@customiser-"))).toEqual([]);
  });

  it("holds a placed line's lettering to its product's limit", () => {
    expect(linesOf(next)["agrees"]).toEqual([LETTERING_FITS]);
  });

  it("follows a person into their designs' logo, photo, versions and files", () => {
    expect(copiesOf(next)).toEqual([
      "designs.email",
      "designs.values",
      "designs.logo_file",
      "designs.photo_file",
      "design_versions.values",
      "design_versions.proof_file",
      "version_files.file",
    ]);
  });

  it("is refused by the validator at the older floor, so the words cannot ship early", () => {
    expect(validateManifest({ ...next, compatibility: { ...(next["compatibility"] as Json), minAdminiumVersion: MIN_ADMINIUM } }).ok).toBe(false);
  });
});
