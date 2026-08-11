/**
 * THE ONE PLACE THIS STUDIO DECIDES WHAT ITS SEEDED ADD-ON HISTORY IS TRUE OF.
 *
 * ── WHY THIS FILE DID NOT EXIST, AND WHAT THAT COST ─────────────────────────
 *
 * `resolveActivity` is the second half of wave 4b's cross-host repair. A
 * `SeededActivityEntry` is declared RELATIVE — "316 minutes ago, about your
 * most recent order" — precisely because the alternative had shipped: the
 * carrier add-on wrote `MP-4119` and an absolute timestamp into its own bundle,
 * and Birch Row printed the print works' job reference on its own screen.
 *
 * The repair landed in `host.ts` and in the add-ons. It never landed HERE.
 * `resolveActivity` was exported from this app's mirror and had no caller
 * anywhere in `src/`, so the half of the fix that a maker can actually see —
 * a seeded line dated against THIS studio's clock, naming THIS studio's order —
 * was never drawn in the app it was built for. Print Shop had this hook and
 * used it on its own shelf; this app had the function and no screen.
 *
 * ── WHY THE REFERENCES ARE DERIVED AND NOT WRITTEN DOWN ─────────────────────
 *
 * A hand-kept list beside `ORDERS` is a second copy of the studio's paperwork
 * that nothing compares with the first: delete an order from the demo and the
 * list still names it. Sorting the studio's own references is the studio
 * stating a fact about itself.
 *
 * `Order.ref` is `BR-` and four digits for every order this studio has taken
 * (`data/demo.ts`), and the number IS the order they came in, so a plain
 * descending string sort is "newest first" exactly. A studio that ever issues a
 * reference in another shape has one line to change, in one file.
 */

import { useMemo } from "react";

import type { ActivityContext } from "./host.ts";
import type { Order } from "../lib/orders.ts";
import { useStore } from "../state/store.ts";

/** The studio's own order references, newest first. Pure, for the suites. */
export function activityRefs(orders: readonly Order[]): readonly string[] {
  return [...orders].map((order) => order.ref).sort((a, b) => (a < b ? 1 : a > b ? -1 : 0));
}

export function useActivityContext(): ActivityContext {
  const now = useStore((s) => s.now);
  const orders = useStore((s) => s.orders);
  const dayOffset = useStore((s) => s.dayOffset);
  const todayIso = useStore((s) => s.todayIso);
  /*
   * TODAY, NOT THE PIN. The studio's clock advances a day at a time from the
   * dock, and a seeded line dated against the pin while the board says
   * Thursday is the same class of untruth this whole mechanism exists to stop —
   * one shop's calendar printed on another's screen, with the shops being the
   * same shop on two different days.
   *
   * Depended on BY ITS PARTS: `now` is rebuilt by the store on every change and
   * an object identity here would re-sort the studio's references for nothing.
   */
  const iso = todayIso();
  return useMemo(
    () => ({ now: { iso, hour: now.hour, minute: now.minute }, refs: activityRefs(orders) }),
    // `dayOffset` is what `todayIso()` reads; naming it keeps the memo honest
    // about its own input rather than depending on a function identity.
    [iso, dayOffset, now.hour, now.minute, orders],
  );
}
