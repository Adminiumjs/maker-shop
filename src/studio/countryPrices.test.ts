/**
 * A delivery price abroad is what the shop sells, so the shop offers a country
 * only while Adminium's list holds it, whichever save failed.
 */
import { describe, expect, it, vi } from "vitest";

import type { EngineCarrier, EngineInternational } from "../add-ons/vendor/host/engine-carrier.ts";
import { countryPrices } from "./countryPrices.ts";
import type { AbroadDoor, AbroadRow } from "./door.ts";

const view = (countries: string[]): EngineInternational => ({
  ownCountry: "GB",
  codeListUrl: null,
  shipsAbroad: countries.length > 0,
  settings: { countries, currency: "GBP", originCountry: "GB", signerId: "u1", signerName: "Ada", products: [] },
});

function stand(listed: string[], rows: AbroadRow[] = []) {
  const held = { listed, rows };
  const door: AbroadDoor & { offer: ReturnType<typeof vi.fn> } = {
    rows: async () => held.rows,
    save: vi.fn(async (country: string, _name: string, price: string) => {
      const row = held.rows.find((one) => one.country === country);
      if (row === undefined) held.rows.push({ country, price, offered: false });
      else row.price = price;
    }),
    offer: vi.fn(async (countries: readonly string[]) => {
      for (const row of held.rows) row.offered = countries.includes(row.country);
    }),
  };
  const engine = {
    international: vi.fn(async () => view(held.listed)),
    saveInternational: vi.fn(async (body: { countries: string[] }) => {
      held.listed = body.countries;
      return view(body.countries);
    }),
  } as unknown as EngineCarrier;
  return { held, door, engine, ...countryPrices(door, engine, (code) => `name of ${code}`) };
}

describe("a country's price", () => {
  it("is written unoffered, and offered once the list holds it", async () => {
    const { held, client, prices } = stand([]);
    await prices.save("DE", "12.50");
    expect(held.rows).toEqual([{ country: "DE", price: "12.50", offered: false }]);
    await client.saveInternational({ countries: ["DE"], currency: "GBP", originCountry: "GB" });
    expect(held.rows[0]!.offered).toBe(true);
  });

  it("stays unoffered when the list refuses it", async () => {
    const { held, engine, client, prices } = stand([]);
    (engine.saveInternational as ReturnType<typeof vi.fn>).mockRejectedValueOnce(new Error("refused"));
    await prices.save("DE", "12.50");
    await expect(client.saveInternational({ countries: ["DE"], currency: "GBP", originCountry: "GB" })).rejects.toThrow("refused");
    expect(held.rows[0]!.offered).toBe(false);
  });

  it("stops being offered when the country leaves the list, and keeps the row past orders name", async () => {
    const { held, client, prices } = stand(["DE"], [{ country: "DE", price: "12.50", offered: true }]);
    await client.saveInternational({ countries: [], currency: "GBP", originCountry: "GB" });
    await prices.remove("DE");
    expect(held.rows).toEqual([{ country: "DE", price: "12.50", offered: false }]);
  });

  it("puts right on opening what a failed save left out of step", async () => {
    const { held, prices } = stand(["FR"], [{ country: "DE", price: "12.50", offered: true }, { country: "FR", price: "9.00", offered: false }]);
    expect(await prices.read()).toEqual({ FR: "9.00" });
    expect(held.rows.map((r) => [r.country, r.offered])).toEqual([["DE", false], ["FR", true]]);
  });

  it("keeps the price an exact decimal string", async () => {
    const { door, prices } = stand([]);
    await prices.save("DE", "1234567.05");
    expect(door.save).toHaveBeenCalledWith("DE", "name of DE", "1234567.05");
  });

  it("still shows its prices when putting them right fails", async () => {
    const { door, prices } = stand(["DE"], [{ country: "DE", price: "12.50", offered: false }]);
    door.offer.mockRejectedValueOnce(new Error("offline"));
    expect(await prices.read()).toEqual({ DE: "12.50" });
  });
});
