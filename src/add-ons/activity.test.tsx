/**
 * A SEEDED ADD-ON HISTORY IS TRUE OF THIS STUDIO, OR IT IS NOT DRAWN.
 *
 * @vitest-environment jsdom
 *
 * ── WHAT THIS EXISTS TO STOP, TWICE OVER ────────────────────────────────────
 *
 * FIRST, the original defect: an add-on used to AUTHOR its own history —
 * absolute timestamps and order references, written into the bundle. The
 * carrier is the same bundle the print works hosts, so it shipped `MP-4119`
 * and a Wednesday afternoon, and Birch Row printed both verbatim on its own
 * shelf. `SeededActivityEntry` is relative now ("22 minutes ago, about your
 * most recent order") and `resolveActivity` turns that into a day, a time and
 * one of THIS studio's own references.
 *
 * SECOND, and this is why the file is new: THIS APP NEVER CALLED IT.
 * `resolveActivity` was exported from `host.ts` and had no consumer anywhere in
 * `src/` — the Print Shop had a hook and a screen, this app had a function. So
 * the repair was real in the type system, asserted in the mirror, and invisible
 * in the app it was built for. A guard on a mechanism nothing renders is a
 * guard on nothing.
 *
 * So this renders the shelf and reads the line. What it asserts is the property
 * the mechanism exists for, not the presence of the call: the reference and the
 * date on screen are the STUDIO's, and the other host's references appear
 * nowhere on the page.
 */

import { act, type ReactNode } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeAll, beforeEach, describe, expect, it } from "vitest";

import { resolveActivity } from "./host.ts";
import { activityRefs } from "./useActivityContext.ts";
import { ORDERS } from "../data/demo.ts";
import { I18nProvider } from "../i18n/index.tsx";
import { AddOnsScreen } from "../screens/AddOns.tsx";
import { useStore } from "../state/store.ts";

let host: HTMLElement;
let root: Root;

beforeAll(() => {
  (globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
  localStorage.setItem("maker-shop-locale", "en-US");
  window.scrollTo = () => {};
});

function mount(node: ReactNode): void {
  host = document.createElement("div");
  document.body.appendChild(host);
  root = createRoot(host);
  act(() => {
    root.render(<I18nProvider>{node}</I18nProvider>);
  });
}

const words = () => (host.textContent ?? "").replace(/\s+/g, " ");

beforeEach(() => {
  useStore.setState({ enabled: new Set(), credentialled: new Set(), overlay: { kind: "none" } });
  mount(<AddOnsScreen />);
});

afterEach(() => {
  act(() => {
    root.unmount();
  });
  host.remove();
});

describe("what a connected add-on last did, on this studio's shelf", () => {
  it("draws a resolved line rather than nothing at all", () => {
    // Nothing connected: no add-on has a history to show, and the shelf says
    // nothing about one. This is the state a reviewer opens.
    expect(words()).not.toContain("Last used");

    act(() => {
      useStore.getState().toggleAddOn("shipping-dhl");
    });

    /*
     * THE ASSERTION THAT WOULD HAVE FAILED BEFORE THIS ROUND, in the plainest
     * possible form: the seam's second half is on the page.
     */
    expect(words(), "no seeded add-on history is rendered anywhere").toContain("Last used");
  });

  it("dates it against the studio's own clock, on the studio's own day", () => {
    act(() => {
      useStore.getState().toggleAddOn("shipping-dhl");
    });

    const addOn = useStore.getState().registry.byKey("shipping-dhl")!;
    const now = useStore.getState().now;
    const resolved = resolveActivity(addOn.activity, {
      now: { iso: useStore.getState().todayIso(), hour: now.hour, minute: now.minute },
      refs: activityRefs(useStore.getState().orders),
    });
    expect(resolved.length, "every seeded line was dropped").toBeGreaterThan(0);

    // The newest line's time is what the shelf prints, in the studio's format.
    const newest = resolved[0]!;
    expect(newest.iso).toBe(useStore.getState().todayIso());
    expect(words()).toContain(
      `${String(newest.hour).padStart(2, "0")}:${String(newest.minute).padStart(2, "0")}`,
    );

    // And the reference it names is one of this studio's own orders.
    expect(ORDERS.map((order) => order.ref)).toContain(newest.ref);
  });

  it("names no other shop's paperwork anywhere on the page", () => {
    act(() => {
      useStore.getState().toggleAddOn("shipping-dhl");
      useStore.getState().toggleAddOn("personalizer");
    });

    /*
     * The shape of the original defect, checked on the rendered page rather
     * than in a bundle: the print works' references are `MP-` and four digits,
     * and this studio's are `BR-`. One of these belongs here.
     */
    expect(words()).not.toMatch(/\bMP-\d{3,}\b/);
  });

  it("advances with the studio's own day", () => {
    act(() => {
      useStore.getState().toggleAddOn("shipping-dhl");
    });
    const before = useStore.getState().todayIso();

    act(() => {
      useStore.getState().advanceDay();
    });

    /*
     * A seeded line dated against the PIN while the board says tomorrow is the
     * same untruth this mechanism exists to stop, with the two shops being one
     * shop on two different days. `useActivityContext` reads `todayIso()`, not
     * the pin, and this is what says so.
     */
    const after = useStore.getState().todayIso();
    expect(after).not.toBe(before);
    const addOn = useStore.getState().registry.byKey("shipping-dhl")!;
    const now = useStore.getState().now;
    const resolved = resolveActivity(addOn.activity, {
      now: { iso: after, hour: now.hour, minute: now.minute },
      refs: activityRefs(useStore.getState().orders),
    });
    expect(resolved[0]!.iso).toBe(after);
  });
});
