/**
 * THE STAFF SURFACE'S `surface.json`: the studio's screens Adminium's sidebar
 * offers, read from the list the studio routes by, labelled in all eight
 * languages.
 */
import { describe, expect, it } from "vitest";

import { buildSurfaceJson } from "../../surface-emit.ts";
import { MESSAGES } from "../i18n/messages/index.ts";
import { LOCALE_TAGS } from "../i18n/locales.ts";
import { APP_KEY, STUDIO_NAV } from "./nav.ts";

describe("the staff surface's sidebar", () => {
  const doc = buildSurfaceJson("staff", { appKey: APP_KEY, appLabelKey: "brand.name", nav: STUDIO_NAV, messages: MESSAGES });

  it("offers the studio's screens, today first, each with its own path", () => {
    expect(doc.appKey).toBe("maker");
    expect(doc.side).toBe("staff");
    expect(doc.nav.map((n) => [n.id, n.path, n.icon])).toEqual([
      ["today", "", "layout-grid"],
      ["orders", "orders", "receipt-text"],
      ["proofs", "proofs", "eye"],
      ["post", "post", "truck"],
      ["customers", "customers", "users"],
      ["products", "products", "package"],
      ["materials", "materials", "layers"],
      ["machines", "machines", "zap"],
    ]);
  });

  it("labels each in all eight languages", () => {
    for (const item of doc.nav) expect(Object.keys(item.labels).sort()).toEqual([...LOCALE_TAGS].sort());
    expect(doc.nav[3]!.labels["de-DE"]).toBe("Gang zur Post");
    expect(Object.keys(doc.appLabels)).toHaveLength(8);
  });

  it("offers no customer screen", () => {
    expect(buildSurfaceJson("customer", { appKey: APP_KEY, appLabelKey: "brand.name", nav: STUDIO_NAV, messages: MESSAGES }).nav).toEqual([]);
  });
});
