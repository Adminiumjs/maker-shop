/**
 * The order as DHL's dispatch flow is handed it: the studio's rows reshaped,
 * never a figure of its own, and the shopper's service as DHL names it.
 */
import { describe, expect, it } from "vitest";

import { chosenService, dispatchPayload, outboundOrder, shopClock, studioAddress } from "./outbound.ts";
import { fixture, THURSDAY } from "./testing/fixture.ts";

const order = (id: number) => fixture().orders.find((o) => o.id === id)!;

describe("the service the shopper chose", () => {
  it("is the postage service's DHL product, under DHL's key", () => {
    const data = fixture();
    expect(chosenService(data, order(13))).toEqual({ addOn: "shipping-dhl", code: "EXP-NWD" });
  });

  it("is null when the service names no DHL product, so DHL picks for itself", () => {
    const data = fixture();
    expect(chosenService(data, order(14))).toBeNull();
    data.services[0]!["dhl_product"] = "";
    expect(chosenService(data, order(14))).toBeNull();
  });

  it("is null when the order's service is not among the services", () => {
    const data = fixture();
    expect(chosenService(data, { ...order(14), service_id: 99 })).toBeNull();
  });
});

describe("the order, as the flow reads it", () => {
  it("goes from the studio's own address, split where its one line splits", () => {
    expect(studioAddress(fixture().settings, "GB")).toEqual({ name: "Birch Row", lines: ["Unit 4", "Station Yard"], city: "Settle", postcode: "BD24 9AA", country: "GB" });
  });

  it("carries its pieces with what one weighs, its post-by, its worth in pence and the shopper's address", () => {
    const data = fixture();
    data.lines.find((l) => l.id === 141)!["grams"] = 285;
    const o = { ...order(14), address_line1: "4 Fellside", address_line2: null, postcode: "LA9 4AA" };
    expect(outboundOrder(data, o, "GBP")).toEqual({
      ref: "BR-2271",
      recipient: { name: "Sam & Robin", key: "2" },
      items: [{ id: "141", key: "4", label: "3D-printed desk tray", quantity: 1, unitWeightGrams: 285 }],
      origin: { name: "Birch Row", lines: ["Unit 4", "Station Yard"], city: "Settle", postcode: "BD24 9AA", country: "GB" },
      destination: { name: "Sam & Robin", lines: ["4 Fellside"], city: "Kendal", postcode: "LA9 4AA", country: "GB" },
      promisedFor: "2026-08-10",
      value: { amount: 4195, currency: "GBP" },
    });
  });

  it("leaves out an address the order has not got, rather than inventing one", () => {
    const sent = outboundOrder(fixture(), order(14), "GBP");
    expect(sent.destination).toBeUndefined();
  });

  it("is handed the studio's clock and the chosen service together", () => {
    const payload = dispatchPayload(fixture(), order(13), { currency: "GBP", zone: "Europe/London", now: THURSDAY });
    expect(payload.now).toEqual({ iso: "2026-08-06", hour: 16, minute: 40 });
    expect(payload.chosen).toEqual({ addOn: "shipping-dhl", code: "EXP-NWD" });
    expect(shopClock(THURSDAY, "UTC")).toEqual({ iso: "2026-08-06", hour: 15, minute: 40 });
  });
});
