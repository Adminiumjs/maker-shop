/**
 * The public holidays the studio may close for, from Holiday calendars.
 *
 * The add-on keeps its days as rows (`holidays`: `id, country, region, day,
 * name`), read-only for apps; "Add as a closure" is the studio's own write, a
 * `closures` row linked back by `holiday_id`. The add-on never writes the
 * studio's tables.
 *
 * WHICH COUNTRY. The add-on's settings hold no country of their own: its one
 * setting is `days`, the sets the owner imported in its panel, each day
 * stamped `from: { country, region, year }`. So the studio's country is the
 * one the owner imported (the first set's, with its area), and, when nothing
 * has been imported, the place the studio's money says it is in: for pounds,
 * England and Wales (`GB`, area `england-and-wales`), the add-on's only set
 * for Great Britain; for another money, its country's own set.
 */
import type { StudioData } from "./door.ts";
import { dayOf, same, text, type Row } from "./wire.ts";

/** The add-on's key, as Adminium lists it among the attached. */
export const HOLIDAY_ADD_ON = "holiday-calendars";

/** The country a studio's money says it is in; Great Britain for pounds. */
export function countryOf(currency: string): string {
  const known: Record<string, string> = { GBP: "GB", EUR: "IE", DKK: "DK", CZK: "CZ", USD: "US", CNY: "CN", TWD: "TW", EGP: "EG" };
  return known[currency] ?? "GB";
}

export interface HolidayPlace {
  /** ISO 3166 alpha-2, as the add-on's `country` column holds it. */
  country: string;
  /** The add-on's area for a regional set (`alsace-moselle`), or null for the country's own. */
  region: string | null;
}

/** The add-on's areas a studio's money names, where its country has no set of its own. */
const AREA_BY_CURRENCY: Record<string, string> = { GBP: "england-and-wales" };

/** The country and area the studio's holidays are read for (see the header). */
export function holidayPlace(settings: Record<string, unknown> | undefined, currency: string): HolidayPlace {
  const days = settings?.["days"];
  if (Array.isArray(days)) {
    for (const day of days) {
      const from = day !== null && typeof day === "object" ? (day as { from?: unknown }).from : undefined;
      if (from === null || typeof from !== "object") continue;
      const country = text((from as Record<string, unknown>)["country"]);
      if (country !== null) return { country: country.toUpperCase(), region: text((from as Record<string, unknown>)["region"]) };
    }
  }
  return { country: countryOf(currency), region: AREA_BY_CURRENCY[currency] ?? null };
}

/** A holiday row is the place's: its country, and its area or none. */
export function inPlace(row: Row, place: HolidayPlace): boolean {
  const region = text(row["region"]);
  return text(row["country"])?.toUpperCase() === place.country && (region === null || region === place.region);
}

/** The holidays from today on, by day. */
export function comingHolidays(data: StudioData, today: string): Row[] {
  return (data.holidays ?? [])
    .filter((h) => {
      const day = dayOf(h["day"]);
      return day !== null && day >= today;
    })
    .sort((a, b) => String(dayOf(a["day"])).localeCompare(String(dayOf(b["day"]))) || Number(a.id) - Number(b.id));
}

/** The closure already added for a holiday, if there is one. */
export function closureFor(data: StudioData, holiday: Row): Row | undefined {
  return data.closures.find((c) => same(c["holiday_id"], holiday.id));
}

/** The closure "Add as a closure" writes: the holiday's day, under its own name, in effect. */
export function holidayClosure(holiday: Row): Record<string, unknown> {
  const day = dayOf(holiday["day"]);
  return { holiday_id: holiday.id, from_date: day, to_date: day, reason: text(holiday["name"]), active: true };
}
