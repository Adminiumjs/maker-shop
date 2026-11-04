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
