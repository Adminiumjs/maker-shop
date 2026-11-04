/**
 * The studio's screens with an address of their own, as data: the staff
 * build routes by them (`urlSync.ts`), Adminium's sidebar offers them
 * (`surface.json`), and the studio's own sidebar lists them. Labels are
 * message keys every locale already carries. An order or a product opens
 * over its list and keeps the list's address.
 */
import type { MessageKey } from "../i18n/messages/index.ts";
import type { SurfaceNavEntry } from "../surface-types.ts";
import type { View } from "./store.ts";

export const APP_KEY = "maker";

export type StudioNavEntry = SurfaceNavEntry<View> & { labelKey: MessageKey; icon: string };

export const STUDIO_NAV = [
  { id: "today", path: "", view: "today", side: "staff", icon: "layout-grid", labelKey: "bench.today.title" },
  { id: "orders", path: "orders", view: "orders", side: "staff", icon: "receipt-text", labelKey: "bench.orders.title" },
  { id: "proofs", path: "proofs", view: "proofs", side: "staff", icon: "eye", labelKey: "bench.nav.proofs" },
  { id: "post", path: "post", view: "post", side: "staff", icon: "truck", labelKey: "bench.nav.post" },
  { id: "customers", path: "customers", view: "customers", side: "staff", icon: "users", labelKey: "bench.nav.customers" },
  { id: "products", path: "products", view: "products", side: "staff", icon: "package", labelKey: "bench.pieces.title" },
] as const satisfies readonly StudioNavEntry[];

/** The sidebar item a screen lights: an order under Orders, a product under Products. */
export function navOf(view: View): string {
  if (view === "order") return "orders";
  if (view === "product") return "products";
  return view;
}
