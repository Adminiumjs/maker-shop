/**
 * How the studio's figures read, in the reader's language and the studio's
 * zone and money: a stored amount, a stored date, a stored weight. Nothing
 * here works a figure out; it only says one.
 */
import { useMemo } from "react";

import { useI18n } from "../i18n/index.tsx";
import { useEnv } from "./env.tsx";
import { dayIn } from "./time.ts";
import { num } from "./wire.ts";

export interface Fmt {
  /** A stored amount in the studio's money; a dash when it is empty. */
  money(value: unknown): string;
  /** A stored date (`YYYY-MM-DD`): "Thu 6 Aug". */
  day(day: string | null): string;
  /** A stored date in full: "Thursday 6 August". */
  dayLong(day: string | null): string;
  /** An instant, as the studio's date: "Thu 6 Aug". */
  moment(iso: unknown): string;
  /** An instant's year, on the studio's calendar. */
  year(at: number): string;
  /** Grams as kilograms: "0.87". */
  kg(grams: unknown): string;
  /** A count or an amount of stock, in the reader's digits. */
  number(value: number, digits?: number): string;
  /** The studio's day of an instant. */
  today(at: number): string;
}

const noon = (day: string) => new Date(`${day}T12:00:00Z`);

export function useFmt(): Fmt {
  const { locale, money, number } = useI18n();
  const { door } = useEnv();
  const { zone, currency } = door.facts();
  return useMemo<Fmt>(() => {
    const short = new Intl.DateTimeFormat(locale, { weekday: "short", day: "numeric", month: "short", timeZone: "UTC" });
    const long = new Intl.DateTimeFormat(locale, { weekday: "long", day: "numeric", month: "long", timeZone: "UTC" });
    const year = new Intl.DateTimeFormat(locale, { year: "numeric", timeZone: zone });
    return {
      money: (value) => {
        const n = num(value);
        return n === null ? "—" : money(n, currency);
      },
      day: (day) => (day === null ? "—" : short.format(noon(day))),
      dayLong: (day) => (day === null ? "—" : long.format(noon(day))),
      moment: (iso) => (typeof iso === "string" && iso !== "" ? short.format(noon(dayIn(iso, zone))) : "—"),
      year: (at) => year.format(new Date(at)),
      kg: (grams) => number((num(grams) ?? 0) / 1000, { minimumFractionDigits: 2, maximumFractionDigits: 2 }),
      number: (value, digits = 0) => number(value, { maximumFractionDigits: digits }),
      today: (at) => dayIn(at, zone),
    };
  }, [locale, money, number, zone, currency]);
}
