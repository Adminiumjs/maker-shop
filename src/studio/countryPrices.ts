/**
 * THE STUDIO'S DELIVERY PRICE PER COUNTRY, kept as postage: one service for the
 * country with one rate for any weight, so Adminium prices a parcel abroad the
 * way it prices every other.
 *
 * WHAT THE SHOP OFFERS FOLLOWS ADMINIUM'S LIST. A price is written unoffered, and
 * only a country on the saved list is offered, so a price left behind by a
 * failed save sells nothing. Opening the panel puts right anything a failure
 * left out of step. A row is never deleted: past orders name it.
 */
import type { CountryPrices } from "../add-ons/countries.ts";
import type { EngineCarrier } from "../add-ons/vendor/host/engine-carrier.ts";
import type { AbroadDoor } from "./door.ts";

export function countryPrices(door: AbroadDoor, engine: EngineCarrier, nameOf: (code: string) => string): { client: EngineCarrier; prices: CountryPrices } {
  const follow = (listed: readonly string[]) => door.offer(listed).catch(() => undefined);
  const client: EngineCarrier = {
    ...engine,
    async saveInternational(body) {
      const fresh = await engine.saveInternational(body);
      await follow(fresh.settings?.countries ?? []);
      return fresh;
    },
  };
  const prices: CountryPrices = {
    async read() {
      const [rows, view] = await Promise.all([door.rows(), engine.international()]);
      const listed = view.settings?.countries ?? [];
      await follow(listed);
      const out: Record<string, string> = {};
      for (const row of rows) if (row.price !== null && listed.includes(row.country)) out[row.country] = row.price;
      return out;
    },
    save: (country, amount) => door.save(country, nameOf(country), amount),
    async remove(country) {
      const view = await engine.international();
      await door.offer((view.settings?.countries ?? []).filter((one) => one !== country));
    },
  };
  return { client, prices };
}
