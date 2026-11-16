// @vitest-environment jsdom
/**
 * PAYING ONLINE, ON THE STUDIO'S SIDE.
 *
 * With payments off (Adminium says nothing, or the app is not switched on)
 * every screen reads as it always did. With them on: an order's chips and
 * Payment card, Copy pay link, the refund's two steps, the cancel of an
 * unpaid order, the Orders list's Total and its Paid / Not paid chips, and
 * Settings. An order that takes payment before making holds its pieces at
 * "make" until it is paid, says so before any write, and is never late.
 */
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { I18nProvider } from "../i18n/index.tsx";
import { cancelOrder, HeldByPayment, moveLine, moveOrderLines } from "./actions.ts";
import { StudioProvider, type StudioEnv } from "./env.tsx";
import { benchLockOf, kpis, linePostBy, orderPostBy, paymentOf, serviceName } from "./facts.ts";
import { StudioApp } from "./StudioApp.tsx";
import { useStudio, type StudioState, type View } from "./store.ts";
import { FakeDoor } from "./testing/fakeDoor.ts";
import type { Row } from "./wire.ts";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const INITIAL = useStudio.getState();
let root: Root | null = null;
let host: HTMLElement;
let clipboard: string[];

const draw = async () => new Blob([new Uint8Array([0x89])], { type: "image/png" });

async function settle(): Promise<void> {
  for (let i = 0; i < 6; i += 1) await act(async () => new Promise((resolve) => setTimeout(resolve, 0)));
}

async function mount(door: FakeDoor, view: View, more: Partial<StudioState> = {}): Promise<void> {
  const env: StudioEnv = { door, draw };
  useStudio.setState({ data: await door.load(), view, ...more });
  await act(async () => {
    root = createRoot(host);
    root.render(
      <I18nProvider>
        <StudioProvider env={env}>
          <StudioApp />
        </StudioProvider>
      </I18nProvider>,
    );
  });
  await settle();
}

const text = () => host.textContent ?? "";
const $ = (selector: string) => host.querySelector<HTMLElement>(selector) ?? document.querySelector<HTMLElement>(selector);
const button = (words: string) => [...document.querySelectorAll<HTMLButtonElement>("button")].find((b) => (b.textContent ?? "").trim() === words);
async function press(el: HTMLElement | null | undefined): Promise<void> {
  if (el == null) throw new Error("nothing to press");
  await act(async () => el.click());
  await settle();
}

/** BR-2268 paid online at checkout, £20 of it given back; BR-2276 asked to pay online, made once paid, not paid yet. */
function paying(on = true): FakeDoor {
  const door = new FakeDoor();
  Object.assign(door.data.orders.find((o) => o.id === 13)!, { pay_online: true, waits_pay: false, paid: "79.95", refunded: "20.00", pay_due: "0.00", pay_hold: 0, paid_at: "2026-07-23T09:02:00.000Z" });
  Object.assign(door.data.orders.find((o) => o.id === 10)!, { pay_online: true, waits_pay: true, paid: "0.00", refunded: "0.00", pay_due: "61.95", pay_hold: 1, lead_max: 3 });
  door.data.payments = [{ id: 1, order_id: 13, amount: "79.95", paid_at: "2026-07-23T09:02:00.000Z", method: "online", payment_ref: "pat_01", provider: "payments-stripe", currency: "GBP", refunded: "20.00" }];
  if (on) door.pay = { on: true, online: true, test: false, refund: true };
  return door;
}

const order = (door: FakeDoor, id: number): Row => door.data.orders.find((o) => o.id === id)!;
const line = (door: FakeDoor, id: number): Row => door.data.lines.find((l) => l.id === id)!;

beforeEach(() => {
  localStorage.setItem("maker-shop-locale", "en-US");
  useStudio.setState(INITIAL, true);
  host = document.createElement("div");
  document.body.append(host);
  clipboard = [];
  Object.defineProperty(navigator, "clipboard", { configurable: true, value: { writeText: async (value: string) => void clipboard.push(value) } });
});
afterEach(async () => {
  await act(async () => root?.unmount());
  root = null;
  host.remove();
});

describe("with payments off, the studio reads as it always did", () => {
  it("says what an order was charged, with no chip, card or button of paying, and no Settings", async () => {
    // The rows carry their payment columns, and Adminium says nothing of payments: nothing shows.
    await mount(paying(false), "order", { orderId: 13 });
    expect(text()).toContain("charged £79.95");
    expect($(".st-pay-chips")).toBeNull();
    expect($(".st-paycard")).toBeNull();
    expect(button("Copy pay link")).toBeUndefined();
    expect(button("Refund")).toBeUndefined();
    expect(button("Settings")).toBeUndefined();
  });

  it("heads the Orders list's money CHARGED, with no chip", async () => {
    await mount(paying(false), "orders");
    expect(text()).toContain("CHARGED");
    expect($(".st-paychip")).toBeNull();
  });
});

describe("with payments on", () => {
  it("says an order paid online, where it was paid and what went back", async () => {
    await mount(paying(), "order", { orderId: 13 });
    expect(text()).toContain("total £79.95");
    expect([...host.querySelectorAll(".st-pay-chips .st-paychip")].map((c) => c.textContent)).toEqual(["Paid · Online · Stripe", "Refunded £20.00"]);
    expect($(".st-paycard")?.textContent).toContain("Online · Stripe");
    expect($(".st-paysum")?.textContent).toBe("Paid£59.95");
    // Paid in full: no pay link to copy, and no cancel.
    expect(button("Copy pay link")).toBeUndefined();
    expect(button("Cancel the order")).toBeUndefined();
  });

  it("copies an unpaid order's pay link, as Adminium makes it", async () => {
    const door = paying();
    await mount(door, "order", { orderId: 10 });
    expect([...host.querySelectorAll(".st-pay-chips .st-paychip")].map((c) => c.textContent)).toEqual(["Not paid"]);
    expect(text()).toContain("Not paid. A pay link opens the pay page for £61.95. Send it by e-mail.");
    expect(text()).toContain("Nothing is cut until the order is paid.");
    await press(button("Copy pay link"));
    expect(door.trail()).toContain("payLink 10");
    expect(clipboard).toEqual(["pay-link:10"]);
    expect(useStudio.getState().toasts.map((t) => t.text)).toContain("Pay link copied. It opens the pay page for £61.95.");
  });

  it("offers no pay link to copy while shoppers cannot pay online right now", async () => {
    const door = paying();
    door.pay = { on: true, online: false, test: false, refund: true };
    await mount(door, "order", { orderId: 10 });
    expect(button("Copy pay link")).toBeUndefined();
  });

  it("gives money back in two steps: how much and why, then the sentence that says what happens", async () => {
    const door = paying();
    await mount(door, "order", { orderId: 13 });
    await press(button("Refund"));
    expect(text()).toContain("Up to £59.95.");
    const [amount, why] = [...document.querySelectorAll<HTMLInputElement>("[role='dialog'] input")];
    expect(amount!.value).toBe("59.95");
    // Nothing goes without a reason.
    await press(button("Next"));
    expect(why!.getAttribute("aria-invalid")).toBe("true");
    await act(async () => {
      const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")!.set!;
      setter.call(amount, "20");
      amount!.dispatchEvent(new Event("input", { bubbles: true }));
      setter.call(why, "The sign was set too small");
      why!.dispatchEvent(new Event("input", { bubbles: true }));
    });
    await press(button("Next"));
    expect($(".st-refund-say")?.textContent).toBe("Refund £20.00 to The Pughs for BR-2268. Reason: The sign was set too small.");
    expect(door.calls.filter((c) => c.method === "refund")).toEqual([]);
    await press(document.querySelector<HTMLElement>("[role='dialog'] .st-btn--danger"));
    expect(door.calls.filter((c) => c.method === "refund").map((c) => c.args)).toEqual([{ id: 1, amount: "20.00", reason: "The sign was set too small" }]);
    expect(door.data.payments[0]!["refunded"]).toBe("40.00");
  });

  it("offers no refund to someone who may not give money back", async () => {
    const door = paying();
    door.pay = { on: true, online: true, test: false, refund: false };
    await mount(door, "order", { orderId: 13 });
    expect(button("Refund")).toBeUndefined();
  });

  it("cancels an unpaid order for the owner, its pieces first, after saying it cannot be undone", async () => {
    const door = paying();
    await mount(door, "order", { orderId: 10 });
    await press(button("Cancel the order"));
    expect(document.querySelector("[role='dialog']")?.textContent).toContain("Cancel BR-2276 for Iris P. It isn't paid, so nothing is given back. This can't be undone.");
    await press(document.querySelector<HTMLElement>("[role='dialog'] .st-btn--danger"));
    expect(door.trail()).toEqual(["moveLine 101 make→cancelled", "moveOrder 10 placed→cancelled"]);
  });

  it("heads the Orders list's money TOTAL, with Paid and Not paid chips, and lists a waiting order last, never late", async () => {
    await mount(paying(), "orders");
    expect(text()).toContain("TOTAL");
    const rows = [...host.querySelectorAll(".st-table-row")].map((r) => r.textContent ?? "");
    expect(rows.find((r) => r.includes("BR-2268"))).toContain("Paid");
    const waiting = rows.find((r) => r.includes("BR-2276"))!;
    expect(waiting).toContain("Not paid");
    expect(waiting).toContain("waiting for payment");
    // Last of the orders still to post (the posted BR-2241 after it).
    expect(rows.indexOf(waiting)).toBe(rows.findIndex((r) => r.includes("BR-2241")) - 1);
  });

  it("switches Take payment before making from Settings, for the studio's admin", async () => {
    const door = paying();
    await mount(door, "today");
    await press(button("Settings"));
    expect(useStudio.getState().view).toBe("settings");
    expect(text()).toContain("Shoppers pay on the Stripe or PayPal page when they order.");
    await press($(".st-switch[role='switch']"));
    expect(door.calls.filter((c) => c.method === "saveSettings").map((c) => c.args)).toEqual([{ id: 1, values: { pay_first: true } }]);
    expect($(".st-switch[role='switch']")?.getAttribute("aria-checked")).toBe("true");
  });

  it("has no Settings for a maker", async () => {
    const door = new FakeDoor({ roles: ["maker"] });
    door.pay = { on: true, online: true, test: false, refund: false };
    await mount(door, "today");
    expect(button("Settings")).toBeUndefined();
  });
});

describe("an order that takes payment before making", () => {
  it("holds its pieces at make until it is paid, said before any write", async () => {
    const door = paying();
    // Its proof approved: only the payment holds it.
    Object.assign(line(door, 101), { proof_state: "approved", proof_ok: 1 });
    expect(benchLockOf(door.data, line(door, 101))).toBe("pay");
    const refused = await moveLine(door, door.data, line(door, 101), "making").catch((e: unknown) => e);
    expect(refused).toBeInstanceOf(HeldByPayment);
    expect(door.calls).toEqual([]);
    expect(await moveOrderLines(door, door.data, order(door, 10), "finishing", ["make", "making"])).toEqual({ moved: 0, held: 1 });
    expect(door.calls).toEqual([]);
    // Paid: on to the bench.
    Object.assign(order(door, 10), { pay_hold: 0, paid: "61.95", pay_due: "0.00" });
    expect(benchLockOf(door.data, line(door, 101))).toBeNull();
    await moveLine(door, door.data, line(door, 101), "making");
    expect(door.trail()).toEqual(["moveLine 101 make→making", "moveOrder 10 placed→making"]);
  });

  it("says the payment's lock where both locks hold", () => {
    const door = paying();
    expect(line(door, 101)["proof_ok"]).toBe(0);
    expect(benchLockOf(door.data, line(door, 101))).toBe("pay");
  });

  it("has no post-by while it waits, is never late, and counts from the payment once paid", () => {
    const door = paying();
    const held = order(door, 10);
    expect(orderPostBy(held)).toBeNull();
    expect(linePostBy(door.data, line(door, 101))).toBeNull();
    // Its post-by from placing (7 August) is long gone on 20 August; it waits for its payment, so it is not late.
    const late = kpis(door.data, "2026-08-20", "Europe/London").late;
    Object.assign(held, { waits_pay: false });
    expect(kpis(door.data, "2026-08-20", "Europe/London").late).toBeGreaterThan(late);
    Object.assign(held, { waits_pay: true, pay_hold: 0, paid: "61.95", pay_due: "0.00", paid_post_by: "2026-08-25" });
    expect(orderPostBy(held)).toBe("2026-08-25");
    expect(linePostBy(door.data, line(door, 101))).toBe("2026-08-25");
  });

  it("is cancelled from the studio, its pieces taken off the bench", async () => {
    const door = paying();
    await cancelOrder(door, door.data, order(door, 10));
    expect(door.trail()).toEqual(["moveLine 101 make→cancelled", "moveOrder 10 placed→cancelled"]);
  });
});

describe("an order's payment, read off its rows", () => {
  it("adds up what was paid, what went back and what is left, by the service it went through", () => {
    const door = paying();
    expect(paymentOf(door.data, order(door, 13))).toMatchObject({ online: true, paid: true, owes: false, paidSum: 79.95, refunded: 20, due: 0, provider: "payments-stripe" });
    expect(paymentOf(door.data, order(door, 10))).toMatchObject({ online: true, paid: false, owes: true, due: 61.95 });
    expect(paymentOf(door.data, order(door, 12))).toMatchObject({ online: false, paid: false, owes: false });
    expect([serviceName("payments-stripe"), serviceName("payments-paypal"), serviceName(null)]).toEqual(["Stripe", "PayPal", ""]);
  });
});
