// @vitest-environment jsdom
/**
 * What the shop sends Adminium and what it does with the answer: the order's
 * one write in its exact shape, a refusal put on the field it names, a moved
 * price stopping the save, and a product page priced by one dry run.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { addChoiceToBasket, addDesignToBasket, choose, figuresFor, goView, loadShop, openProduct, placeOrder, resetShop, setDetails, setUsedFeatures, useShop } from "./store.ts";
import { fakePort, type FakePort } from "./testing.ts";

let port: FakePort;
const flush = async () => {
  await vi.advanceTimersByTimeAsync(300);
};

beforeEach(async () => {
  vi.useFakeTimers();
  sessionStorage.clear();
  port = fakePort();
  resetShop(port);
  await loadShop();
});
afterEach(() => {
  vi.useRealTimers();
});

const DETAILS = { name: "Priya Shah", email: "priya@example.com", line1: "12 Mill Lane", line2: "", town: "Settle", postcode: "BD24 9AA", news: true };

async function basketOfWalnutCoasters(qty = 1): Promise<void> {
  openProduct("coast-wal");
  choose({ qty });
  await flush();
  addChoiceToBasket();
  goView("checkout");
  await flush();
}

describe("a piece's page", () => {
  it("prices the quantity chosen and each quantity break in one dry run of a one-line order", async () => {
    openProduct("coast-wal");
    await flush();
    const quotes = port.calls.filter((c) => c.call === "quote");
    expect(quotes).toHaveLength(1);
    expect(quotes[0]!.body.children.order_lines.map((l) => l.values.qty)).toEqual([1, 4, 8, 12]);
    expect(quotes[0]!.body.children.order_lines[0]!.values).toEqual({ product_id: 1, qty: 1, material_id: 10, size_id: 12, finish_id: 14 });
    expect(figuresFor(1)?.["each"]).toBe("34.00");
    expect(figuresFor(4)?.["each"]).toBe("31.28");
    expect(figuresFor(8)?.["line_total"]).toBe("233.92");
    expect(figuresFor(12)?.["each"]).toBe("27.88");
  });

  it("asks again with the features a design uses, each as the product's own option row", async () => {
    openProduct("coast-wal", "customise");
    await flush();
    setUsedFeatures(["logo"]);
    await flush();
    const last = port.calls.filter((c) => c.call === "quote").pop()!;
    expect(last.body.children.order_lines[0]).toEqual({ values: { product_id: 1, qty: 1, material_id: 10, size_id: 12, finish_id: 14 }, children: { order_line_features: [{ values: { option_id: 20 } }] } });
    // A feature is flat, never broken: +£1.50 a piece on a set of four.
    expect(figuresFor(1)?.["line_total"]).toBe("40.00");
  });

  it("refuses words over the piece's limit, and opens the sheet that says so", async () => {
    openProduct("coast-ply");
    choose({ lettering: "The Bellamy-Hart Kitchen Co." });
    expect(addChoiceToBasket()).toBeNull();
    expect(useShop.getState().limitWarn).toBe(true);
    expect(useShop.getState().basket).toEqual([]);
  });
});

describe("placing the order", () => {
  it("sends one write: the shopper, the service, each line with its options, words, design code and features, the retry key and the total shown", async () => {
    openProduct("coast-ply");
    choose({ qty: 4, lettering: "Mill Lane" });
    await flush();
    addChoiceToBasket();
    openProduct("coast-wal", "customise");
    await flush();
    setUsedFeatures(["logo"]);
    await flush();
    addDesignToBasket({ id: 7, code: "DSGN-7Q2K-X4PA", base_id: 101, ready_design_id: 5, values: { parts: { words: { text: "Pinfold" } } }, state: "draft", updatedAt: null, session: null, files: {}, used: ["logo"] });
    goView("checkout");
    await flush();
    setDetails(DETAILS);
    const shown = useShop.getState().shownTotal;
    expect(shown).toBe("132.27");
    const key = useShop.getState().clientKey;

    expect(await placeOrder()).toBe("placed");
    const place = port.calls.find((c) => c.call === "place")!;
    expect(place.expect).toBe("132.27");
    expect(place.clientKey).toBe(key);
    expect(place.body).toEqual({
      values: { name: "Priya Shah", email: "priya@example.com", address_line1: "12 Mill Lane", town: "Settle", postcode: "BD24 9AA", may_email: true, service_id: 1, language: "en-US" },
      children: {
        order_lines: [
          { values: { product_id: 2, qty: 4, material_id: 30, size_id: 31, finish_id: 32, lettering: "Mill Lane" } },
          { values: { product_id: 1, qty: 1, material_id: 10, size_id: 12, finish_id: 14, design_code: "DSGN-7Q2K-X4PA" }, children: { order_line_features: [{ values: { option_id: 20 } }] } },
        ],
      },
    });
    const s = useShop.getState();
    expect(s.view).toBe("confirm");
    expect(s.confirmed?.order["number"]).toBe("BR-2291");
    expect(s.basket).toEqual([]);
    // A new basket gets a new retry key.
    expect(s.clientKey).not.toBe(key);
  });

  it("checks the form before anything is sent", async () => {
    await basketOfWalnutCoasters();
    setDetails({ ...DETAILS, email: "priya.example.com", town: "" });
    expect(await placeOrder()).toBe("fix");
    expect(port.calls.some((c) => c.call === "place")).toBe(false);
  });

  it("shows Adminium's refusal on the field it names, and nothing is placed", async () => {
    await basketOfWalnutCoasters();
    setDetails(DETAILS);
    port.refuseNext({ code: "PUBLIC_WRITE_REFUSED", column: "postcode", reason: "plain-text" });
    expect(await placeOrder()).toBe("fix");
    expect(useShop.getState().refusedFields).toEqual({ postcode: "shop.checkout.err.refused" });
    expect(port.calls.some((c) => c.call === "place")).toBe(false);
    // Typing in the field clears it.
    setDetails({ postcode: "BD24 9AB" });
    expect(useShop.getState().refusedFields).toEqual({});
  });

  it("puts a refused line on the basket line it names", async () => {
    await basketOfWalnutCoasters();
    setDetails(DETAILS);
    port.refuseNext({ code: "PUBLIC_WRITE_REFUSED", child: "order_lines", index: 0, column: "design_code", reason: "too-long" });
    expect(await placeOrder()).toBe("fix");
    expect(useShop.getState().refusedLine).toMatchObject({ index: 0, reason: "too-long" });
  });

  it("stops at a price that moved since the total was shown, saves nothing, and orders at the new total on the next press", async () => {
    await basketOfWalnutCoasters();
    setDetails(DETAILS);
    expect(useShop.getState().shownTotal).toBe("37.95");
    port.raise(1, 2);
    expect(await placeOrder()).toBe("moved");
    const s = useShop.getState();
    expect(s.priceMoves).toEqual([{ name: "Engraved walnut coasters", qty: 1, was: "34.00", now: "36.00" }]);
    expect(s.shownTotal).toBe("39.95");
    expect(port.calls.some((c) => c.call === "place")).toBe(false);
    expect(await placeOrder()).toBe("placed");
    expect(port.calls.find((c) => c.call === "place")!.expect).toBe("39.95");
  });

  it("reads a save refused for a changed price the same way", async () => {
    await basketOfWalnutCoasters();
    setDetails(DETAILS);
    // The dry run answers the old price; by the save, it has moved.
    const save = port.place.bind(port);
    port.place = (...args) => {
      port.raise(1, 2);
      return save(...args);
    };
    expect(await placeOrder()).toBe("moved");
    expect(useShop.getState().shownTotal).toBe("39.95");
  });
});
