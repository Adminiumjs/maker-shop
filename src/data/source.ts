/**
 * The DataSource seam (18 D7).
 *
 * This app ships in demo mode: every read below returns the seeded fiction in
 * `demo.ts`, synchronously, with no network involved. The seam exists so that
 * pointing the app at a real Adminium deployment is a change to ONE file rather
 * than a rewrite — the screens and the store already talk to this interface and
 * never import `demo.ts` for data they render.
 *
 * That second implementation now exists: `adminiumSource.ts` reads a real
 * Adminium instance through `@adminiumjs/public-client` and is swapped in by
 * `main.tsx` before React mounts. `demoSource` remains the fallback whenever
 * either build-time env var is absent — which is the case for every
 * marketplace demo, and is why that fallback is structural rather than a catch.
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
  LASER_SETTINGS,
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

/**
 * The studio itself: who makes things here, where the unit is, and where the
 * demo lives.
 *
 * This used to be typed `typeof STUDIO`, and `STUDIO` is `as const`: the seam
 * therefore declared, in the type system, that the studio IS Birch Row at Unit
 * 6, Station Yard. A second implementation could not return anything else
 * without a type error, which is a seam that cannot be swapped — the exact
 * failure this file exists to prevent, hiding in a return type.
 */
export interface Studio {
  demoPath: string;
  makers: readonly string[];
  address: {
    name: string;
    lines: readonly string[];
    city: string;
    postcode: string;
    /** ISO 3166-1 alpha-2. */
    countryCode: string;
  };
}

/** What the laser is and how it is driven. Printed on the bench, never used. */
export interface LaserSettings {
  watts: number;
  cut: { speedMmPerSec: number; power: number };
  engrave: { speedMmPerSec: number; power: number; dpi: number };
}

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
  studio(): Studio;
  /** The machine's own numbers, as the bench's settings card prints them. */
  laser(): LaserSettings;
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
  laser: () => LASER_SETTINGS,
};

let current: DataSource = demoSource;
let read = false;

/**
 * The source the app is currently wired to.
 *
 * An indirection rather than a re-export, because `state/store.ts` reads it at
 * MODULE SCOPE — a re-exported binding would be captured at import time and a
 * later swap would change nothing.
 */
export const source: DataSource = {
  now: () => ((read = true), current.now()),
  orders: () => ((read = true), current.orders()),
  pastOrders: () => ((read = true), current.pastOrders()),
  customers: () => ((read = true), current.customers()),
  materials: () => ((read = true), current.materials()),
  machines: () => ((read = true), current.machines()),
  careCards: () => ((read = true), current.careCards()),
  nextRef: () => ((read = true), current.nextRef()),
  studio: () => ((read = true), current.studio()),
  laser: () => ((read = true), current.laser()),
};

/**
 * Swap the backing source. Must happen before any module-scope read.
 *
 * The tripwire is the whole reason this is a function and not an assignment:
 * the ordering it depends on is invisible, and getting it wrong fails SILENTLY
 * — the app renders demo data against a configured backend and looks fine. A
 * thrown error at boot is the only way that mistake announces itself.
 */
export function setDataSource(next: DataSource): void {
  if (read) {
    throw new Error(
      "setDataSource() called after the store already read \u2014 import App dynamically, after the snapshot resolves.",
    );
  }
  current = next;
}

/**
 * True once a real backend is behind the seam.
 *
 * Read by the demo dock, which resets the studio and advances the clock:
 * against a real maker's orders those controls either lie or do damage, so it
 * does not render.
 */
export function isConnected(): boolean {
  return current !== demoSource;
}
