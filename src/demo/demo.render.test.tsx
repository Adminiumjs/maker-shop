// @vitest-environment jsdom
/**
 * THE DEMO, DRAWN: both sides boot over the one Birch Row in the page, with
 * no server, and an order the shopper places is on the studio's bench.
 *
 * The Customiser's editor is the add-on's own and is swept by its suite; a
 * stand-in takes its place here, as in the shop's screen suite.
 */
import { act } from "react";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

vi.mock("../../vendor/customiser/index.js", () => ({
  CustomiserEditor: () => <div>The editor</div>,
  designRefusal: () => null,
  heldDesign: () => null,
  hasSavedDesigns: (held: readonly unknown[]) => held.length > 0,
  openSavedLink: async () => "unknown",
  readDesigns: async () => [],
  YourDesigns: () => null,
}));
vi.mock("../../vendor/customiser/editor.css", () => ({}));

import { applyDemoMessage } from "../demoBridge.ts";
import { addChoiceToBasket, choose, goView, openProduct, placeOrder, setDetails, useShop } from "../shop/store.ts";
import { useStudio } from "../studio/store.ts";
import { demoAdminium, resetDemo, useDemo } from "./adminium.ts";
import { bootDemo } from "./boot.tsx";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
// jsdom draws no page to scroll; a new screen asks to start at its top.
window.scrollTo = () => {};

let host: HTMLElement;

/** Let the screens' effects, the doors' promises and the dry runs' short waits run. */
async function settle(ms = 400): Promise<void> {
  for (let i = 0; i < 4; i += 1) {
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, ms / 4));
    });
  }
}

beforeAll(async () => {
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

describe("the demo, with no server", () => {
  it("opens on Birch Row's shop, its catalogue read from the sample", () => {
    expect(useDemo.getState().persona).toBe("shopper");
    expect(useShop.getState().loading).toBe("ok");
    expect(host.textContent).toContain("Birch ply coasters");
    expect(host.textContent).toContain("Engraved walnut coasters");
  });

  it("places an order in the shop as BR-2291, at the total the checkout showed", async () => {
    await act(async () => {
      openProduct("coast-ply");
      choose({ lettering: "Ruth & Sam · June 2026" });
    });
    await settle();
    await act(async () => {
      addChoiceToBasket();
      setDetails({ name: "Priya S.", email: "priya.s@mail.example", line1: "14 Wick Lane", town: "Hove", postcode: "BN3 1AA" });
      goView("checkout");
    });
    await settle();
    expect(useShop.getState().shownTotal).toBe("27.95");
    let placed = "";
    await act(async () => {
      placed = await placeOrder();
    });
    await settle();
    expect(placed).toBe("placed");
    expect(useShop.getState().view).toBe("confirm");
    expect(host.textContent).toContain("BR-2291");
  });

  it("shows that order on the studio's bench when the card switches to the maker", async () => {
    await act(async () => {
      await applyDemoMessage({ type: "adminium:demo:go", dv: 1, screen: "orders" });
    });
    await settle();
    expect(useDemo.getState().persona).toBe("maker");
    expect(useStudio.getState().view).toBe("orders");
    expect(host.querySelector(".sh-app")).toBeNull();
    expect(host.textContent).toContain("BR-2291");
    expect(host.textContent).toContain("Priya S.");
    const line = demoAdminium().world.all("order_lines").find((l) => l["order_number"] === "BR-2291");
    expect({ stage: line?.["stage"], post_by: line?.["post_by"], lettering: line?.["lettering"] }).toEqual({ stage: "make", post_by: "2026-08-11", lettering: "Ruth & Sam · June 2026" });
  });

  it("with DHL switched on, puts DHL's own dispatch flow on the post office run, on its demo carrier", async () => {
    // The demo opens with nothing ready to post: one order is finished first, as the bench would finish it.
    const world = demoAdminium().world;
    const order = world.all("orders").find((o) => o["number"] === "BR-2291")!;
    for (const line of world.all("order_lines").filter((l) => l["order_id"] === order.id)) world.update("order_lines", line.id, { stage: "ready", proof_ok: 1 });
    world.update("orders", order.id, { status: "ready" });
    await act(async () => {
      world.changed();
      await applyDemoMessage({ type: "adminium:demo:set", dv: 1, addOn: { key: "shipping-dhl", on: true } });
      await applyDemoMessage({ type: "adminium:demo:go", dv: 1, screen: "post" });
    });
    await settle();
    expect(useStudio.getState().view).toBe("post");
    expect(host.querySelectorAll("[data-add-on-slot='order.dispatch.actions']").length, host.querySelector("main")?.textContent ?? "").toBeGreaterThan(0);
    expect(host.querySelector("[data-add-on-slot='order.dispatch.actions']")?.textContent).toContain("Book a collection");
  });

  it("with Holiday calendars switched on, offers the coming bank holidays on Machine time", async () => {
    await act(async () => {
      await applyDemoMessage({ type: "adminium:demo:set", dv: 1, addOn: { key: "holiday-calendars", on: true } });
      await applyDemoMessage({ type: "adminium:demo:go", dv: 1, screen: "machines" });
    });
    await settle();
    expect(host.querySelector(".mk-holidays")?.textContent).toContain("Summer bank holiday");
    await act(async () => host.querySelector<HTMLButtonElement>(".mk-holiday button")!.click());
    await settle();
    expect(demoAdminium().world.all("closures").find((c) => c["holiday_id"] === 1)).toMatchObject({ from_date: "2026-08-31", to_date: "2026-08-31", reason: "Summer bank holiday", active: true });
    expect(host.querySelector(".mk-holiday-added")).not.toBeNull();
  });

  it("goes back to the shop, still holding the order", async () => {
    await act(async () => {
      await applyDemoMessage({ type: "adminium:demo:set", dv: 1, persona: "shopper" });
    });
    await settle();
    expect(host.querySelector(".sh-app")).not.toBeNull();
    expect(demoAdminium().world.all("orders").some((o) => o["number"] === "BR-2291")).toBe(true);
  });
});
