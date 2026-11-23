/**
 * WHETHER A PARCEL MAY BE HANDED OVER, from what Adminium says of its labels.
 *
 * Buying a label moves nothing. The order moves, and the customer is told, only
 * when staff press "Handed over". So this is asked at that press:
 *
 *   a purchase with no answer  never: nobody knows what the customer would be told
 *   a test label               never while the shop is on a test key: it is a sample
 *   a bought label             yes, with its number and company
 *   nothing bought             yes, as a parcel always went, with no number
 */
import type { EngineBooking, EngineMode } from "../add-ons/vendor/host/engine-carrier.ts";

export type HandOver = { may: true; tracking: string | null; carrier: string | null } | { may: false; why: "unknown" | "test" };

const UNSETTLED: ReadonlySet<string> = new Set(["reserved", "calling", "unknown"]);

const firstOutbound = (bookings: readonly EngineBooking[]) => bookings.filter((b) => b.purpose === "outbound").sort((a, b) => a.parcelNumber - b.parcelNumber || a.createdAt - b.createdAt);

export function handOverOf(bookings: readonly EngineBooking[], mode: EngineMode | null): HandOver {
  const outbound = firstOutbound(bookings);
  const live = outbound.filter((b) => !b.test);
  if (live.some((b) => UNSETTLED.has(b.state))) return { may: false, why: "unknown" };
  const bought = live.find((b) => b.state === "booked");
  if (bought !== undefined) return { may: true, tracking: bought.tracking, carrier: bought.carrierName ?? bought.carrier };
  if (mode === "test" && outbound.some((b) => b.test && (b.state === "booked" || UNSETTLED.has(b.state)))) return { may: false, why: "test" };
  return { may: true, tracking: null, carrier: null };
}

/** The parcel whose number the customer holds has a newer one they have not been told. */
export function newNumberOf(bookings: readonly EngineBooking[], told: string | null): { tracking: string; carrier: string } | null {
  const first = firstOutbound(bookings).find((b) => !b.test && b.state === "booked");
  if (first === undefined || first.tracking === null || first.track?.newNumber !== true || first.tracking === told) return null;
  return { tracking: first.tracking, carrier: first.carrierName ?? first.carrier };
}
