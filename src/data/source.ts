/**
 * The DataSource seam (18 D7).
 *
 * This app ships in demo mode: every read below returns the seeded fiction in
 * `demo.ts`, synchronously, with no network involved. The seam exists so that
 * pointing the app at a real Adminium deployment is a change to ONE file rather
 * than a rewrite — the screens and the store already talk to this interface and
 * never import `demo.ts` for data they render.
 *
 * Records are copied on the way out, nested arrays and all, so a caller that
 * mutates what it is given cannot reach back into the seed. That is what lets
 * the demo reset cleanly without a page reload.
 *
 * NOTE WHAT IS NOT ON THIS INTERFACE: there is no `inventory()`, no
 * `availability()` and no `stockFor(product)`. The only shelf this shop has is
 * `materials()`, and it is the maker's.
 */

import { MATERIAL_STOCK, type StockRow } from "../lib/catalogue.ts";
import type { Order } from "../lib/orders.ts";
import {
  CARE_CARDS,
  CUSTOMERS,
  CUSTOMER_BY_KEY,
  MACHINES,
  NEXT_REF,
  NOW,
  ORDERS,
  PAST_ORDERS,
  STUDIO,
} from "./demo.ts";
import type { CareCard, Customer, Machine, Now } from "./types.ts";

export interface DataSource {
  /** The pinned clock. A live deployment would return the real one here. */
  now(): Now;
  /** Orders still on the bench. */
  orders(): Order[];
  /** Orders already posted. */
  pastOrders(): Order[];
  customers(): Customer[];
  /** The ONLY inventory this app has, and it is raw material. */
  materials(): StockRow[];
  machines(): Machine[];
  careCards(): CareCard[];
  nextRef(): string;
  studio(): typeof STUDIO;
}

/**
 * Orders carry a customer KEY in the seed. Resolving it here rather than in
 * each screen means one lookup, and it keeps `Order.customer` a display name
 * for everything downstream — the bench, the order view, the lookup and search.
 */
const copyOrder = (o: Order): Order => ({
  ...o,
  customer: CUSTOMER_BY_KEY[o.customer]?.name ?? o.customer,
  lines: o.lines.map((l) => ({ ...l })),
  proofs: o.proofs.map((p) => ({ ...p })),
});

export const demoSource: DataSource = {
  now: () => ({ ...NOW }),
  orders: () => ORDERS.map(copyOrder),
  pastOrders: () => PAST_ORDERS.map(copyOrder),
  customers: () => CUSTOMERS.map((c) => ({ ...c })),
  materials: () => MATERIAL_STOCK.map((s) => ({ ...s })),
  machines: () => MACHINES.map((m) => ({ ...m })),
  careCards: () => CARE_CARDS.map((c) => ({ ...c })),
  nextRef: () => NEXT_REF,
  studio: () => STUDIO,
};

/** The source the app is currently wired to. */
export const source: DataSource = demoSource;
