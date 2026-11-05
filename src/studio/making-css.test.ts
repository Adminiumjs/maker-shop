/**
 * The machines' day at a laptop's width, held in the stylesheet itself:
 * jsdom lays nothing out. The hour labels were a grid widened past the day
 * by a negative margin, and at 1280 px the last label's box reached past its
 * card and the page scrolled sideways. Each label is now a box of no width
 * on its hour's line, so the first and last sit in the card's padding.
 */
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

const css = readFileSync(fileURLToPath(new URL("./making.css", import.meta.url)), "utf8");
const rule = (selector: string) => new RegExp(`^\\${selector} \\{([^}]*)\\}`, "m").exec(css)?.[1] ?? "";

describe("the machines' day at a laptop's width", () => {
  it("keeps the hour labels inside their card: no negative margin, boxes of no width", () => {
    expect(rule(".mk-ticks")).not.toMatch(/margin-inline:\s*calc\(-/);
    expect(rule(".mk-ticks")).toContain("justify-content: space-between");
    expect(rule(".mk-tick")).toContain("inline-size: 0");
  });
});
