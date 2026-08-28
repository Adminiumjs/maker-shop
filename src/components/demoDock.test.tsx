/**
 * The dock can be put away, and putting it away leaves the app usable.
 *
 * @vitest-environment jsdom
 *
 * Rule 1 of the comp's four layout rules is that the fixed dock must never
 * cover a primary action. Two thirds of it were already here: the dock LIFTS
 * above a piece's "Add to basket" bar, and it goes away while a sheet is open.
 * The third is this — it collapses to one corner chip — and it is the only one
 * that helps on a phone, where six controls in a fixed bar own a fifth of the
 * viewport whatever they happen to be sitting over.
 *
 * WHAT IS ASSERTED, AND WHY EACH WOULD CATCH A REAL SLIP:
 *
 *   1. Collapsing removes the controls and leaves exactly one way back. A
 *      collapse that hid the chip too would strand a reviewer in a demo with no
 *      persona switch, recoverable only by reloading the page.
 *   2. Expanding brings back the SAME dock, so the chip is a toggle rather than
 *      a fresh mount with a reset clock or a reset persona.
 *   3. Both controls carry an accessible name in ALL EIGHT locales. They are an
 *      icon and three letters of mono; a missing label makes them unreachable
 *      by anyone not using a mouse, and the app-wide accessible-name sweep
 *      cannot see a control that only exists after a press.
 */

import { act, type ReactNode } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, describe, expect, it } from "vitest";

import { I18nProvider } from "../i18n/index.tsx";
import { LOCALE_TAGS, type LocaleTag } from "../i18n/locales.ts";
import { MESSAGES } from "../i18n/messages/index.ts";
import { DemoDock } from "./DemoDock.tsx";

/*
 * `I18nProvider` reads the locale once, from storage, the way the real app
 * does — there is no prop to pass one in. `tour.tsx` switches locale the same
 * way, and a test that invented a second route in would be testing a path no
 * reader has.
 */
const LOCALE_KEY = "maker-shop-locale";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

afterEach(() => {
  localStorage.removeItem(LOCALE_KEY);
});

/** Mount the dock alone in the given locale, hand it over, unmount. */
async function withDock(
  tag: LocaleTag,
  visit: (host: HTMLElement) => void | Promise<void>,
): Promise<void> {
  localStorage.setItem(LOCALE_KEY, tag);
  const host = document.createElement("div");
  document.body.appendChild(host);
  let root: Root | undefined;
  act(() => {
    root = createRoot(host);
    root.render(
      <I18nProvider>
        <DemoDock />
      </I18nProvider> as ReactNode,
    );
  });
  await visit(host);
  act(() => {
    root?.unmount();
  });
  host.remove();
}

/** Every button whose accessible name — label or text — is exactly `name`. */
function buttonNamed(host: HTMLElement, name: string): HTMLButtonElement | undefined {
  return [...host.querySelectorAll("button")].find(
    (b) => (b.getAttribute("aria-label") ?? b.textContent ?? "").trim() === name,
  );
}

describe("the demo dock folds away (comp rule 1)", () => {
  it("collapses to one chip, and the chip brings the same dock back", async () => {
    const m = MESSAGES["en-US"];
    await withDock("en-US", (host) => {
      expect(buttonNamed(host, m["dock.maker"]), "the dock starts open").toBeTruthy();

      act(() => buttonNamed(host, m["dock.collapse"])?.click());
      expect(buttonNamed(host, m["dock.maker"]), "controls survived the collapse").toBeUndefined();
      expect(buttonNamed(host, m["dock.expand"]), "no way back").toBeTruthy();

      act(() => buttonNamed(host, m["dock.expand"])?.click());
      expect(buttonNamed(host, m["dock.maker"]), "the dock did not come back").toBeTruthy();
      expect(buttonNamed(host, m["dock.collapse"])).toBeTruthy();
    });
  });

  it("names both controls in all eight locales", async () => {
    for (const tag of LOCALE_TAGS) {
      const away = MESSAGES[tag]["dock.collapse"];
      const back = MESSAGES[tag]["dock.expand"];
      expect(away.trim(), `${tag} has no collapse label`).not.toBe("");
      expect(back.trim(), `${tag} has no expand label`).not.toBe("");

      await withDock(tag, (host) => {
        const collapse = buttonNamed(host, away);
        expect(collapse, `${tag} cannot reach the collapse control by name`).toBeTruthy();
        act(() => collapse?.click());
        expect(buttonNamed(host, back), `${tag} loses its way back`).toBeTruthy();
      });
    }
  });
});
