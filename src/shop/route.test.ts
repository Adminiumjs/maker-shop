/**
 * The shop's paths, both ways, wherever it is served: each of the manifest's
 * customer routes opens its screen, and a screen writes the path it opened on.
 */
import { describe, expect, it } from "vitest";

import { CUSTOMER_ROUTES } from "../manifest/build.ts";
import { ELSEWHERE, pathOf, placeOf, relativePath } from "./route.ts";

describe("the shop's paths", () => {
  it("reads what follows the shop's mount, hosted, for one database, or on its own domain", () => {
    expect(relativePath("/apps/maker/customer/piece/coast-wal", "/apps/maker/customer/")).toBe("piece/coast-wal");
    expect(relativePath("/apps/maker/settle/customer/basket", "/apps/maker/customer/")).toBe("basket");
    expect(relativePath("/checkout", "/")).toBe("checkout");
  });

  it("opens each screen its path names, and writes the same path back", () => {
    const cases: [string, ReturnType<typeof placeOf>][] = [
      ["", { view: "shop", code: null }],
      ["piece/coast-wal", { view: "product", code: "coast-wal" }],
      ["piece/coast-wal/customise", { view: "customise", code: "coast-wal" }],
      ["basket", { view: "basket", code: null }],
      ["checkout", { view: "checkout", code: null }],
    ];
    for (const [path, place] of cases) {
      expect(placeOf(path)).toEqual(place);
      expect(pathOf(place)).toBe(path);
    }
    expect(pathOf({ view: "confirm", code: null })).toBe("checkout");
    expect(placeOf("piece/coast-wal/other")).toEqual({ view: "missing", code: null });
    expect(placeOf("nowhere")).toEqual({ view: "missing", code: null });
  });

  it("covers every customer route the manifest names", () => {
    const paths = Object.values(CUSTOMER_ROUTES).map((route) => route.replace(/^\//, ""));
    for (const path of paths) expect(placeOf(path).view, path).not.toBe("missing");
    // Those drawn by the order's later screens keep the manifest's paths.
    for (const [key, path] of Object.entries(ELSEWHERE)) if (key in CUSTOMER_ROUTES || key === "problem") expect(paths).toContain(path);
    // A piece's page sits under the manifest's `/piece`.
    expect(CUSTOMER_ROUTES.product).toBe("/piece");
  });
});
