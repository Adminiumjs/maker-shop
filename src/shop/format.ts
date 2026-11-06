/**
 * Money and days as the shop shows them: formatting only. Every figure comes
 * from Adminium as it is (a price as decimal text, a post-by as a date); this
 * file only writes it in the reader's language and numerals.
 */
import { formatTenantMoney } from "@adminiumjs/public-client";

/** The shop's English reads its dates the British way, as the studio writes them ("Tue 11 Aug"). */
const dateLocale = (locale: string) => (locale === "en-US" ? "en-GB" : locale);

/** A decimal from the server ("34.00"), in the shop's currency. */
export function money(value: unknown, currency: string | null, locale: string): string {
  if (value === null || value === undefined || value === "") return "";
  return formatTenantMoney(String(value), currency, locale);
}

/** A difference, signed ("+£6.00", "−£10.00"), or null when there is none. */
export function signedMoney(value: string, currency: string | null, locale: string): { text: string; sign: 1 | -1 } | null {
  const trimmed = value.trim();
  if (/^-?0*(\.0*)?$/.test(trimmed)) return null;
  const negative = trimmed.startsWith("-");
  return { text: `${negative ? "−" : "+"}${money(negative ? trimmed.slice(1) : trimmed, currency, locale)}`, sign: negative ? -1 : 1 };
}

/** A whole number in the reader's numerals. */
export function count(value: number, locale: string): string {
  return new Intl.NumberFormat(locale).format(value);
}

/** A percentage the server worked out ("8.00"), as "8%". */
export function percent(value: string | null, locale: string): string {
  return new Intl.NumberFormat(locale, { style: "percent", maximumFractionDigits: 2 }).format(Number(value ?? 0) / 100);
}

function asDate(iso: string): Date | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso);
  return match === null ? null : new Date(Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3])));
}

/** "Tue 11 Aug". */
export function dayShort(iso: unknown, locale: string): string {
  const date = typeof iso === "string" ? asDate(iso) : null;
  return date === null ? "" : new Intl.DateTimeFormat(dateLocale(locale), { timeZone: "UTC", weekday: "short", day: "numeric", month: "short" }).format(date);
}

/** "Tuesday 11 August". */
export function dayLong(iso: unknown, locale: string): string {
  const date = typeof iso === "string" ? asDate(iso) : null;
  return date === null ? "" : new Intl.DateTimeFormat(dateLocale(locale), { timeZone: "UTC", weekday: "long", day: "numeric", month: "long" }).format(date);
}

// ── the studio's week, as the postage page lays it out ──

export const WEEK = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"] as const;

/** The studio's week from its setting ("tue,wed,thu,fri,sat"), or null when it is not one. */
export function studioDays(setting: unknown): Set<string> | null {
  if (typeof setting !== "string") return null;
  const days = setting
    .split(",")
    .map((d) => d.trim().toLowerCase())
    .filter((d) => (WEEK as readonly string[]).includes(d));
  return days.length === 0 ? null : new Set(days);
}

/** `YYYY-MM-DD` and the n-th calendar day after it: laying a calendar out, not dating a promise. */
export function plusDays(day: string, n: number): string {
  const [y, m, d] = day.split("-").map(Number);
  return new Date(Date.UTC(y!, m! - 1, d! + n)).toISOString().slice(0, 10);
}
export const weekdayOf = (day: string) => WEEK[new Date(`${day}T12:00:00Z`).getUTCDay()]!;

/** The cut-off as the reader's clock writes it ("17:00", "5:00 PM"). */
export function cutoffTime(cutoff: unknown, locale: string): string {
  const match = typeof cutoff === "string" ? /^(\d{1,2}):(\d{2})$/.exec(cutoff.trim()) : null;
  if (match === null) return "";
  return new Intl.DateTimeFormat(locale === "en-US" ? "en-GB" : locale, { hour: "numeric", minute: "2-digit", timeZone: "UTC" }).format(new Date(Date.UTC(2026, 0, 1, Number(match[1]), Number(match[2]))));
}

/** Days of the week by name, in the reader's language, as a list ("Tuesday to Saturday" is the studio's to say; this lists them). */
export function dayNames(days: readonly string[], locale: string): string {
  const tag = locale === "en-US" ? "en-GB" : locale;
  const names = days.map((d) => new Intl.DateTimeFormat(tag, { weekday: "long", timeZone: "UTC" }).format(new Date(Date.UTC(2026, 7, 2 + WEEK.indexOf(d as (typeof WEEK)[number])))));
  try {
    return new Intl.ListFormat(tag, { type: "conjunction" }).format(names);
  } catch {
    return names.join(", ");
  }
}
