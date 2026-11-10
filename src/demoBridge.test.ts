// @vitest-environment jsdom
/**
 * The demo card's commands, as the page answers them: it says hello to the
 * window framing it and to no one else, takes a message only from that
 * window and this origin, goes to a screen, switches the person, presses a
 * shortcut, moves the studio clock a studio day at a time (Tuesday to
 * Saturday), switches an add-on, and starts Thursday afternoon again — and
 * after each says where it is.
 */
import { act } from "react";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

vi.mock("../vendor/customiser/index.js", () => ({
  CustomiserEditor: () => null,
  designRefusal: () => null,
  heldDesign: () => null,
  hasSavedDesigns: (held: readonly unknown[]) => held.length > 0,
  openSavedLink: async () => "unknown",
  readDesigns: async () => [],
  YourDesigns: () => null,
}));
vi.mock("../vendor/customiser/editor.css", () => ({}));

import type { DemoMessage } from "./demo-types.ts";
import { demoAdminium, resetDemo, useDemo } from "./demo/adminium.ts";
import { bootDemo } from "./demo/boot.tsx";
import { SCREEN_IDS, SHORTCUT_IDS } from "./demoBridge.ts";
import { useAfter } from "./shop/after.ts";
import { placeOrder, useShop } from "./shop/store.ts";
import { useStudio } from "./studio/store.ts";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
window.scrollTo = () => {};

let card: Window;
let sent: { message: DemoMessage; origin: string }[] = [];
let host: HTMLElement;

async function settle(ms = 300): Promise<void> {
  for (let i = 0; i < 3; i += 1) {
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, ms / 3));
    });
  }
}

/** A message from the card, as the browser hands it over. */
async function send(data: Record<string, unknown>, from: { source?: Window; origin?: string } = {}): Promise<void> {
  await act(async () => {
    window.dispatchEvent(new MessageEvent("message", { data: { dv: 1, ...data }, origin: from.origin ?? window.location.origin, source: from.source ?? card }));
  });
  await settle();
}

const lastState = () => [...sent].reverse().find((s) => s.message.type === "adminium:demo:state")?.message as Extract<DemoMessage, { type: "adminium:demo:state" }> | undefined;

beforeAll(async () => {
  // The website's page, framing this one: its window is the parent, at the same origin.
  const frame = document.createElement("iframe");
  document.body.append(frame);
  card = frame.contentWindow!;
  vi.spyOn(card, "postMessage").mockImplementation(((message: DemoMessage, origin: string) => {
    sent.push({ message, origin });
  }) as typeof card.postMessage);
  Object.defineProperty(window, "parent", { configurable: true, value: card });
  localStorage.setItem("maker-shop-locale", "en-US");
  resetDemo();
  host = document.createElement("div");
  document.body.append(host);
  await act(async () => {
    await bootDemo(host);
  });
  await settle();
});

afterAll(() => {
  host.remove();
});

describe("the demo bridge", () => {
  it("says hello to the window framing it, at this origin only", () => {
    expect(sent[0]).toEqual({ message: { type: "adminium:demo:hello", dv: 1, appKey: "maker" }, origin: window.location.origin });
    expect(sent.every((s) => s.origin === window.location.origin)).toBe(true);
  });

  it("answers the card's init with where it is, and the studio clock as the card prints it", async () => {
    await send({ type: "adminium:demo:init", locale: "en-US", theme: "dark", screen: "postage" });
    expect(useShop.getState().view).toBe("postage");
    expect(lastState()).toMatchObject({ screen: "postage", persona: "shopper", theme: "dark", clockLabel: "Thu 6 Aug · 16:40", overlay: false, toggles: { "shipping-dhl": false, "barcode-labels": false, inventory: false, invoices: true, "holiday-calendars": false } });
  });

  it("takes no message from another window, or from another origin", async () => {
    await send({ type: "adminium:demo:go", screen: "about" }, { source: window });
    await send({ type: "adminium:demo:go", screen: "about" }, { origin: "https://elsewhere.example" });
    expect(useShop.getState().view).toBe("postage");
    await send({ type: "adminium:demo:go", screen: "about" });
    expect(useShop.getState().view).toBe("about");
  });

  it("presses a shopper's shortcut on the screen it belongs to", async () => {
    await send({ type: "adminium:demo:go", screen: "checkout" });
    await send({ type: "adminium:demo:do", shortcut: "fill-priya" });
    expect(useShop.getState().details).toMatchObject({ name: "Priya S.", email: "priya.s@mail.example", postcode: "BN3 1AA" });
    await send({ type: "adminium:demo:go", screen: "order" });
    await send({ type: "adminium:demo:do", shortcut: "fill-iris-order" });
    await send({ type: "adminium:demo:do", shortcut: "fill-order-code" });
    expect(useAfter.getState().lookups.order).toMatchObject({ step: "code", ref: "BR-2276", email: "iris.p@mail.example", digits: "482913" });
  });

  it("raises a price while the shopper is at the checkout, and the page finds out when they place", async () => {
    await send({ type: "adminium:demo:go", screen: "checkout" });
    await send({ type: "adminium:demo:do", shortcut: "price-up" });
    expect(useShop.getState().shownTotal).toBe("27.95");
    let placed = "";
    await act(async () => {
      placed = await placeOrder();
    });
    expect(placed).toBe("moved");
    expect(useShop.getState().priceMoves).toEqual([{ name: "Birch ply coasters", qty: 1, was: "24.00", now: "26.00" }]);
  });

  it("reaches the confirmation by placing the order at the price now shown", async () => {
    await send({ type: "adminium:demo:go", screen: "confirm" });
    expect(useShop.getState().view).toBe("confirm");
    expect(useShop.getState().confirmed?.order["number"]).toBe("BR-2291");
    expect(useShop.getState().confirmed?.order["total"]).toBe("29.95");
  });

  it("opens Iris's order, signed in, with a proof waiting for her, sent with its picture", async () => {
    // Iris asked for a change, so the shortcut sends her a new proof, as the studio would.
    const w = demoAdminium().world;
    const order = w.all("orders").find((o) => o["number"] === "BR-2276")!;
    for (const p of w.all("proofs").filter((one) => one["order_id"] === order.id && one["state"] === "sent")) w.update("proofs", p.id, { state: "change_asked", change_note: "Could it be a little bigger?" });
    await send({ type: "adminium:demo:go", screen: "order" });
    await send({ type: "adminium:demo:do", shortcut: "proof-waiting" });
    const opened = useAfter.getState().opened;
    expect(opened?.state).toBe("ok");
    expect(opened?.read?.order["number"]).toBe("BR-2276");
    const waiting = w.all("proofs").filter((p) => p["order_id"] === order.id && p["state"] === "sent");
    expect(waiting).toHaveLength(1);
    expect(w.pictures.get(String(waiting[0]!.id))).toBeInstanceOf(Blob);
    expect(opened?.read?.proofs.some((p) => p["state"] === "sent")).toBe(true);
  });

  it("opens the too-long sheet on the plain lettered piece, and steps the card aside while it is open", async () => {
    await send({ type: "adminium:demo:go", screen: "product" });
    await send({ type: "adminium:demo:do", shortcut: "too-long" });
    expect(useShop.getState().productCode).toBe("coast-ply");
    expect(useShop.getState().limitWarn).toBe(true);
    expect(lastState()?.overlay).toBe(true);
    useShop.setState({ limitWarn: false });
  });

  it("switches to the maker, and a proof answered yes shows on the bench", async () => {
    await send({ type: "adminium:demo:set", persona: "maker" });
    expect(lastState()).toMatchObject({ persona: "maker", screen: "today" });
    const waitingBefore = demoAdminium().world.all("proofs").filter((p) => p["state"] === "sent").length;
    await send({ type: "adminium:demo:do", shortcut: "proof-approved" });
    expect(demoAdminium().world.all("proofs").filter((p) => p["state"] === "sent")).toHaveLength(waitingBefore - 1);
    expect(useStudio.getState().toasts.at(-1)?.text).toMatch(/said yes to the proof for BR-\d{4}\./);
  });

  it("moves the clock a studio day at a time, Tuesday to Saturday", async () => {
    await send({ type: "adminium:demo:clock", advance: "day" });
    expect(lastState()?.clockLabel).toBe("Fri 7 Aug · 16:40");
    await send({ type: "adminium:demo:clock", advance: "day" });
    await send({ type: "adminium:demo:clock", advance: "day" });
    expect(lastState()?.clockLabel).toBe("Tue 11 Aug · 16:40");
    await send({ type: "adminium:demo:do", shortcut: "tomorrow-run" });
    expect(useStudio.getState().view).toBe("post");
    expect(lastState()?.clockLabel).toBe("Wed 12 Aug · 16:40");
  });

  it("switches an add-on, and the studio's facts with it", async () => {
    await send({ type: "adminium:demo:set", addOn: { key: "shipping-dhl", on: true } });
    expect(demoAdminium().studio.facts().addOns).toContain("shipping-dhl");
    expect(lastState()?.toggles["shipping-dhl"]).toBe(true);
    await send({ type: "adminium:demo:set", addOn: { key: "not-an-add-on", on: true } });
    expect(demoAdminium().studio.facts().addOns).not.toContain("not-an-add-on");
  });

  it("goes back to Thursday afternoon, with a fresh Birch Row and the same person", async () => {
    await send({ type: "adminium:demo:reset" });
    expect(lastState()).toMatchObject({ persona: "maker", clockLabel: "Thu 6 Aug · 16:40", toggles: { "shipping-dhl": false } });
    expect(useDemo.getState().persona).toBe("maker");
    expect(useStudio.getState().view).toBe("today");
    expect(useShop.getState().basket).toEqual([]);
  });

  it("answers to every screen and shortcut it lists", () => {
    expect(SCREEN_IDS).toHaveLength(26);
    expect(SHORTCUT_IDS).toHaveLength(13);
  });
});
