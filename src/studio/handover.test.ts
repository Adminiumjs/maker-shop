import { describe, expect, it } from "vitest";

import type { EngineBooking } from "../add-ons/vendor/host/engine-carrier.ts";
import { handOverOf, newNumberOf } from "./handover.ts";

const booking = (over: Partial<EngineBooking>): EngineBooking => ({
  id: "b1",
  state: "booked",
  test: false,
  purpose: "outbound",
  parcelNumber: 1,
  carrier: "shipping-shippo",
  service: "Next day",
  tracking: "TRK1",
  carrierName: "Evri",
  reason: null,
  duplicates: 0,
  createdAt: 1,
  calledAt: 1,
  checkedAt: null,
  releaseAfter: null,
  applied: true,
  label: { state: "ready", size: null, sizeGot: null, sizeDiffers: false, customsInvoice: false, customsInvoiceOwed: false },
  track: null,
  ...over,
});

describe("whether a parcel may be handed over", () => {
  it("takes a bought label's number and company", () => {
    expect(handOverOf([booking({})], "live")).toEqual({ may: true, tracking: "TRK1", carrier: "Evri" });
  });

  it("lets a parcel with no label go as it always went, with no number", () => {
    expect(handOverOf([], "live")).toEqual({ may: true, tracking: null, carrier: null });
    expect(handOverOf([booking({ state: "refused", tracking: null })], "live")).toEqual({ may: true, tracking: null, carrier: null });
  });

  it.each(["unknown", "reserved", "calling"] as const)("never goes while a purchase is %s", (state) => {
    expect(handOverOf([booking({ state })], "live")).toEqual({ may: false, why: "unknown" });
  });

  it("never hands over a test label on a test key", () => {
    expect(handOverOf([booking({ test: true })], "test")).toEqual({ may: false, why: "test" });
  });

  it("gives a test label's number to nobody once the shop is live", () => {
    expect(handOverOf([booking({ test: true })], "live")).toEqual({ may: true, tracking: null, carrier: null });
  });

  it("prefers the live label when a sample sits beside it", () => {
    expect(handOverOf([booking({ id: "t", test: true, tracking: "SAMPLE" }), booking({ id: "l" })], "test")).toEqual({ may: true, tracking: "TRK1", carrier: "Evri" });
  });

  it("reads the first parcel's number, not a return's", () => {
    const list = [booking({ id: "r", purpose: "return", tracking: "RET" }), booking({ id: "2", parcelNumber: 2, tracking: "TRK2" }), booking({ id: "1" })];
    expect(handOverOf(list, "live")).toEqual({ may: true, tracking: "TRK1", carrier: "Evri" });
  });
});

describe("a new number", () => {
  const track = { status: null, statusAt: null, checkedAt: null, flag: null, newNumber: true };

  it("is owed only when the carrier changed it and the customer holds another", () => {
    expect(newNumberOf([booking({ tracking: "TRK2", track })], "TRK1")).toEqual({ tracking: "TRK2", carrier: "Evri" });
  });

  it("is not owed once they were told", () => {
    expect(newNumberOf([booking({ tracking: "TRK2", track })], "TRK2")).toBeNull();
  });

  it("is not owed without the carrier's change, or for a sample", () => {
    expect(newNumberOf([booking({ tracking: "TRK2" })], "TRK1")).toBeNull();
    expect(newNumberOf([booking({ test: true, tracking: "TRK2", track })], "TRK1")).toBeNull();
  });
});
