/**
 * The shop's screens as Adminium lists them for the customer side
 * (`surface.json`): a path under the shop's mount, and the name it goes by,
 * as a message every language carries. The shop's own address bar reads
 * `route.ts`; these are the doors into it.
 */
import type { MessageKey } from "../i18n/messages/index.ts";
import type { SurfaceNavEntry } from "../surface-types.ts";

export type ShopNavEntry = SurfaceNavEntry<string> & { labelKey: MessageKey };

export const SHOP_NAV = [
  { id: "home", path: "", view: "shop", side: "customer", labelKey: "nav.shop" },
  { id: "basket", path: "basket", view: "basket", side: "customer", labelKey: "header.basket" },
  { id: "order", path: "order", view: "order", side: "customer", labelKey: "nav.order" },
  { id: "about", path: "about", view: "about", side: "customer", labelKey: "nav.about" },
] as const satisfies readonly ShopNavEntry[];
