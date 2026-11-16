/**
 * The demo's pay page: the order paid in the page's own world after the
 * hand-off moment ("Taking you to the secure payment page…"), then the
 * shopper back on the confirmation, as from the real pay page. No money
 * moves and nothing leaves the page.
 *
 * DEMO BUILD ONLY — nothing in a real build imports it.
 */
import { backFromPaying } from "../shop/store.ts";
import { demoAdminium } from "./adminium.ts";
import { DEMO_PAY } from "./shop.ts";

/** How long the demo shows the hand-off before the order comes back paid. */
export const DEMO_PAY_MS = 1_400;

export function payInDemo(url: string, after = DEMO_PAY_MS): void {
  if (!url.startsWith(DEMO_PAY)) return;
  const orderId = url.slice(DEMO_PAY.length);
  setTimeout(() => {
    demoAdminium().world.pay(orderId);
    backFromPaying();
  }, after);
}
