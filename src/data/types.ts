/**
 * The shapes the DATA has.
 *
 * The engines own their own types (`lib/calendar.ts`, `lib/orders.ts`); this
 * module carries what the seed holds — customers, machines, care notes — plus
 * the pinned clock.
 */

import type { MaterialKey } from "../lib/catalogue.ts";
import type { Order, OrderLine } from "../lib/orders.ts";
import type { StudioClock } from "../lib/calendar.ts";

export type { Order, OrderLine, StudioClock };

/**
 * The pinned clock, restated as a domain type.
 *
 * Thursday, 6 August 2026 at 16:40 — twenty minutes before the studio's 17:00
 * cut-off, which is what makes "does this get on today's bench?" the live
 * question when a reviewer opens the demo. Nothing anywhere reads a real clock.
 */
export type Now = StudioClock;

export interface Customer {
  key: string;
  /**
   * Invented private people, in the first-name-and-initial form somebody
   * actually gives a small shop. Not companies: a maker's customers are people.
   */
  name: string;
  email: string;
  town: string;
  /**
   * WHERE THE STUDIO POSTS THEIR PARCEL.
   *
   * [Added 2026-08-10, wave 4b.] A delivery add-on needs somewhere to send a
   * parcel, and the shop is the only party that knows. The carrier this app now
   * hosts used to ship its own address book keyed by ANOTHER app's customer
   * keys, which resolved nothing at all here — the whole reason this field
   * exists is that the fact belongs to the shop.
   *
   * `country` is a CODE rather than a country's name in the reader's language,
   * because a carrier checks the postcode against it.
   */
  address: {
    lines: readonly string[];
    postcode: string;
    /** ISO 3166-1 alpha-2. */
    country: string;
  };
}

/** One machine in the unit, for About us and (in session 2) the bench. */
export interface Machine {
  key: string;
  icon: string;
  /** How many of it there are. Two printers are one card reading "two". */
  count: number;
}

/** One material's looking-after card. */
export interface CareCard {
  key: string;
  material: MaterialKey;
  /** How many bullet lines the bundle carries for it. */
  lines: number;
}
