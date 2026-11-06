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
  { id: "materials", path: "materials", view: "materials", side: "staff", icon: "layers", labelKey: "studio.nav.materials" },
  { id: "machines", path: "machines", view: "machines", side: "staff", icon: "zap", labelKey: "studio.nav.machines" },
] as const satisfies readonly StudioNavEntry[];

/**
 * The studio's screens with an address but no sidebar item of their own:
 * the batch sheet and the cut list under Today, the count under Materials.
 * The address and the screen are kept in step by them as by the sidebar's.
 */
export const STUDIO_PLACES = [
  { id: "batch", path: "batch", view: "batch", side: "staff", icon: "grid-3x3", labelKey: "bench.batch.screenTitle" },
  { id: "cutlist", path: "cut-list", view: "cutlist", side: "staff", icon: "scissors", labelKey: "bench.cut.title" },
  { id: "stockcount", path: "count", view: "stockcount", side: "staff", icon: "clipboard-list", labelKey: "bench.count.title" },
] as const satisfies readonly StudioNavEntry[];

/** The sidebar item a screen lights: an order under Orders, a product under Products. */
export function navOf(view: View): string {
  if (view === "order") return "orders";
  if (view === "product") return "products";
  if (view === "stockcount") return "materials";
  if (view === "cutlist" || view === "batch") return "today";
  return view;
}

/** A person's own first screen: the first the sidebar offers them (Today for the bench, Orders for the packer). */
export function homeOf(reach: readonly string[]): StudioNavEntry {
  return STUDIO_NAV.find((entry) => entry.id === reach[0]) ?? STUDIO_NAV[0];
}

/**
 * Where sign-out goes: Adminium's sign-in, coming back to the studio's own
 * address and not the screen the last person was on, which the next person's
 * role may not reach. They land on their own first screen.
 */
export function signInAfterSignOut(base: string): string {
  return `/login?next=${encodeURIComponent(base)}`;
}
