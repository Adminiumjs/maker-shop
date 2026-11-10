/**
 * The studio's main buttons, held in the stylesheet itself: jsdom draws
 * nothing. "Send a proof" waits with its button `aria-disabled` while no
 * proof is made, and was drawn in the accent, dimmed but still reading as
 * ready to press. A main button that cannot be pressed is drawn plain, and
 * never brightens under the pointer.
 */
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

const css = readFileSync(fileURLToPath(new URL("./studio.css", import.meta.url)), "utf8");
/** The declarations of the rule whose selector list is exactly `selector`. */
const rule = (selector: string) => {
  const escaped = selector.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return new RegExp(`^${escaped} \\{([^}]*)\\}`, "m").exec(css)?.[1] ?? "";
};

describe("a main button that cannot be pressed yet", () => {
  it("is drawn plain, not in the accent, whether disabled or aria-disabled", () => {
    const plain = rule('.st-btn--accent:disabled, .st-btn--accent[aria-disabled="true"]');
    expect(plain).toContain("background: var(--surface-3)");
    expect(plain).toContain("color: var(--fg-muted)");
  });

  it("brightens under the pointer only while it can be pressed", () => {
    expect(rule(".st-btn--accent:hover:not(:disabled)")).toBe("");
    expect(rule('.st-btn--accent:hover:not(:disabled):not([aria-disabled="true"])')).toContain("filter: brightness(1.12)");
  });
});
