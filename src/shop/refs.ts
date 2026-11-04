/**
 * The public API's names for the shop's entries.
 *
 * Adminium names each entry of the manifest's `publicAccess` when it installs
 * the app: the table's real name, a suffix for what the entry is, and `_2`
 * for the second of the same. The table's real name is the one the server
 * sends in `surface-config.json` (`orders` → `maker_orders`); the suffixes are
 * the manifest's, written out in `PUBLIC_REFS` and held to the entries by
 * the manifest's drift test. `refs.test.ts` holds this table to that one.
 */

/** Each entry the shop's pages call: the table, and its suffix. */
export const SHOP_REFS = {
  products: ["products", ""],
  options: ["options", ""],
  materials: ["materials", ""],
  postageServices: ["postage_services", ""],
  settings: ["settings", ""],
  placeOrder: ["orders", "_verified_2"],
  orderByLink: ["orders", "_claimed"],
} as const satisfies Record<string, readonly [string, string]>;

export type ShopRefName = keyof typeof SHOP_REFS;
export type ShopRefs = Record<ShopRefName, string>;

/** The app's key, which names its tables when the server does not say (`maker_orders`). */
export const APP_KEY = "maker";

/** Every ref by its real name, from the server's table names. */
export function shopRefs(tables: Readonly<Record<string, string>> = {}): ShopRefs {
  const out = {} as ShopRefs;
  for (const [name, [table, suffix]] of Object.entries(SHOP_REFS) as [ShopRefName, readonly [string, string]][]) {
    out[name] = `${tables[table] ?? `${APP_KEY}_${table}`}${suffix}`;
  }
  return out;
}

/** The browser keys the shop uses beside its own, by the purpose Adminium serves them under. */
export const KEYS = {
  /** One order, by its own link (the manifest's `order` key). */
  order: "order",
  /** A saved design, by its own link: the Customiser's. */
  design: "customiser-link",
} as const;
