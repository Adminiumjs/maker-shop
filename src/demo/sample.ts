/**
 * Birch Row's sample, as Adminium would hold it once added: the two bundles
 * an operator adds (`seeds/maker.sample.json`, then the Customiser's rows in
 * `seeds/maker.customiser.sample.json`), every row given a key, every
 * `@ref` the key of the row it names, every `@day`/`@time` the date or
 * instant it means at the demo's moment.
 *
 * The sample is written for a Thursday (`weekAnchor`), and the demo's clock
 * stands on that Thursday, so a `@week` day counts from it exactly. A wall
 * time is the studio's own (Europe/London), turned into the instant it is.
 *
 * DEMO BUILD ONLY — nothing in a real build imports it.
 */
import STUDIO_BUNDLE from "../../seeds/maker.sample.json" with { type: "json" };
import CUSTOMISER_BUNDLE from "../../seeds/maker.customiser.sample.json" with { type: "json" };

import { addDays, momentOf } from "../studio/time.ts";
import { assetUrl } from "./files.ts";

export type Row = Record<string, unknown> & { id: number };

interface BundleTable {
  ref: string;
  rows: Record<string, unknown>[];
}
interface Bundle {
  tables: BundleTable[];
}

/** The demo's day and moment: Thursday 6 August 2026, 16:40 in Settle. */
export const DEMO_DAY = "2026-08-06";
export const DEMO_ZONE = "Europe/London";
export const DEMO_START = Date.parse("2026-08-06T15:40:00.000Z");

/**
 * The columns a decimal is kept in, and its places: the data API answers a
 * decimal as text ("34.00"), so the screens read the sample as they read a
 * real install.
 */
const DECIMALS: Readonly<Record<string, Readonly<Record<string, number>>>> = {
  products: { price: 2, stock_per_unit: 3 },
  options: { price: 2, percent_off: 2 },
  postage_rates: { price: 2 },
  materials: { cost: 2 },
  stock_movements: { qty: 2 },
};

/** A wall time on a day in the studio's zone, as the instant it is. */
function instantOf(day: string, time: string): string {
  return String(momentOf(`${day} ${time}`, DEMO_ZONE));
}

function resolveValue(value: unknown, labels: ReadonlyMap<string, number>): unknown {
  if (Array.isArray(value)) return value.map((v) => resolveValue(v, labels));
  if (typeof value !== "object" || value === null) return value;
  const record = value as Record<string, unknown>;
  if (typeof record["@ref"] === "string") {
    const id = labels.get(record["@ref"]);
    if (id === undefined) throw new Error(`the sample names "${record["@ref"]}" before any row is labelled so`);
    return id;
  }
  // A file the sample adds: its address in the demo build.
  if (typeof record["@asset"] === "string") return assetUrl(record["@asset"]);
  // So long before the demo's moment (`PT1H20M`).
  // …or so long after it (`@in`).
  for (const [key, sign] of [["@ago", -1], ["@in", 1]] as const) {
    if (typeof record[key] !== "string") continue;
    const m = /^PT(?:(\d+)H)?(?:(\d+)M)?$/.exec(record[key]);
    if (m === null) throw new Error(`the sample's "${key}" ${record[key]} is not hours and minutes`);
    return new Date(DEMO_START + sign * (Number(m[1] ?? 0) * 60 + Number(m[2] ?? 0)) * 60_000).toISOString();
  }
  if (typeof record["@day"] === "number") {
    const day = addDays(DEMO_DAY, record["@day"]);
    return typeof record["@time"] === "string" ? instantOf(day, record["@time"]) : day;
  }
  return Object.fromEntries(Object.entries(record).map(([k, v]) => [k, resolveValue(v, labels)]));
}

/** Every table of both bundles, its rows keyed from 1 in the order they are added. */
export function sampleTables(): Record<string, Row[]> {
  const labels = new Map<string, number>();
  const tables: Record<string, Row[]> = {};
  for (const bundle of [STUDIO_BUNDLE, CUSTOMISER_BUNDLE] as unknown as Bundle[]) {
    for (const table of bundle.tables) {
      const rows = (tables[table.ref] ??= []);
      for (const raw of table.rows) {
        const id = rows.length + 1;
        const row: Row = { id };
        for (const [key, value] of Object.entries(raw)) {
          if (key === "@label") continue;
          const places = DECIMALS[table.ref]?.[key];
          const resolved = resolveValue(value, labels);
          row[key] = places !== undefined && typeof resolved === "number" ? resolved.toFixed(places) : resolved;
        }
        if (typeof raw["@label"] === "string") labels.set(raw["@label"], id);
        rows.push(row);
      }
    }
  }
  return tables;
}
