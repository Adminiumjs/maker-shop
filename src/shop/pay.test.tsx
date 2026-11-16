// @vitest-environment jsdom
/**
 * PAYING FOR AN ORDER ONLINE, ON THE SHOPPER'S SIDE.
 *
 * Against a stand-in for Adminium: with payments off the checkout, the
 * confirmation and Your order read exactly as they always did; with them on,
 * the order placed asks to be paid online and the browser goes to the pay
 * link it answered; back from the pay page the confirmation checks the order
 * until it reads paid, or offers "Pay now" again. Every new state is swept by
 * axe in English and in Arabic.
 */
import axe from "axe-core";
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { I18nProvider } from "../i18n/index.tsx";
import { CHECKS, CHECK_MS, checkBack, isPaid, keptConfirmation, owes, payNow, postByOf, resetPay, setLeave, usePay } from "./pay.ts";
import ShopApp from "./ShopApp.tsx";
import { resetAfter } from "./after.ts";
import { backFromPaying, goView, resetShop, useShop } from "./store.ts";
import { fakePort, type FakePort } from "./testing.ts";
import type { Row } from "./port.ts";

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

const TAGS = ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"];
(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

let port: FakePort;
let root: Root | null = null;
let host: HTMLDivElement;
let left: string[];

async function settle(times = 4, ms = 200): Promise<void> {
  for (let i = 0; i < times; i += 1) {
    await act(async () => {
      await vi.advanceTimersByTimeAsync(ms);
    });
  }
}

async function mount(locale: "en-US" | "ar-EG" = "en-US"): Promise<void> {
  localStorage.setItem("maker-shop-locale", locale);
  host = document.createElement("div");
  document.body.append(host);
  root = createRoot(host);
  await act(async () => {
    root!.render(
      <I18nProvider>
        <ShopApp />
      </I18nProvider>,
    );
  });
  await settle();
}

const text = () => document.body.textContent ?? "";
const click = async (selector: string): Promise<void> => {
  await act(async () => document.querySelector<HTMLElement>(selector)!.click());
  await settle();
};
const type = async (selector: string, value: string): Promise<void> => {
  const el = document.querySelector<HTMLInputElement>(selector)!;
  const setter = Object.getOwnPropertyDescriptor(Object.getPrototypeOf(el), "value")!.set!;
  await act(async () => {
    setter.call(el, value);
    el.dispatchEvent(new Event("input", { bubbles: true }));
  });
  await settle(1);
};

async function sweep(label: string): Promise<void> {
  vi.useRealTimers();
  const result = await axe.run(document.body, { runOnly: { type: "tag", values: TAGS }, rules: { "color-contrast": { enabled: false }, region: { enabled: false } } });
  vi.useFakeTimers();
  const bad = result.violations.filter((v) => v.impact === "critical" || v.impact === "serious" || v.impact === "moderate");
  expect(result.passes.length, `${label}: axe examined nothing`).toBeGreaterThan(0);
  expect(bad.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(" ")).join(", ")}`), label).toEqual([]);
}

/** A basket of one lettered walnut coaster, the form filled, on the checkout. */
async function toCheckout(): Promise<void> {
  await act(async () => (document.querySelectorAll<HTMLButtonElement>(".sh-piece")[1]!).click());
  await settle();
  await type("#sh-words", "Mill Lane");
  await click(".sh-total-bar button");
  await click(".sh-summary .sh-button");
  for (const [selector, value] of [
    ["#sh-ck-name", "Priya Shah"],
    ["#sh-ck-email", "priya@example.com"],
    ["#sh-ck-line1", "12 Mill Lane"],
    ["#sh-ck-town", "Settle"],
    ["#sh-ck-postcode", "BD24 9AA"],
  ] as const)
    await type(selector, value);
  await settle();
}

const placeButton = () => document.querySelector<HTMLButtonElement>(".sh-summary .sh-button--accent")!;

beforeEach(() => {
  vi.useFakeTimers();
  sessionStorage.clear();
  localStorage.clear();
  window.history.replaceState(null, "", "/");
  window.scrollTo = () => {};
  port = fakePort();
  resetShop(port);
  resetAfter(null);
  resetPay();
  left = [];
  setLeave((url) => left.push(url));
});
afterEach(async () => {
  await act(async () => root?.unmount());
  root = null;
  host?.remove();
  setLeave(null);
  vi.useRealTimers();
});

describe("with payments off, the shop reads as it always did", () => {
  it("says the invoice line, places the order as before, and asks nothing of paying", async () => {
    await mount();
    await toCheckout();
    expect(text()).toContain("We'll send an invoice with your order. Nothing is charged now.");
    expect(text()).not.toMatch(/Stripe|PayPal|Pay £/);
    expect(placeButton().textContent).toBe("Place the order");
    await act(async () => placeButton().click());
    await settle();
    const place = port.calls.find((c) => c.call === "place")!;
    expect("pay_online" in place.body.values).toBe(false);
    expect(useShop.getState().view).toBe("confirm");
    expect(left).toEqual([]);
    expect(text()).toContain("Total");
    expect(text()).not.toMatch(/Not paid|Pay £|Paid/);
  });
});

describe("with payments on", () => {
  beforeEach(() => {
    port.offer = { online: true, test: false };
  });

  it("says where the shopper pays, and places the order and pays in one press", async () => {
    await mount();
    await toCheckout();
    expect(text()).not.toContain("We'll send an invoice");
    expect(text()).toContain("You'll pay on the Stripe or PayPal page.");
    expect(text()).toMatch(/Pay £\d+\.\d\d now/);
    expect(placeButton().textContent).toMatch(/^Place the order and pay £\d+\.\d\d$/);
    await sweep("en-US · checkout, paying online");
    await act(async () => placeButton().click());
    await settle();
    const place = port.calls.find((c) => c.call === "place")!;
    expect(place.body.values["pay_online"]).toBe(true);
    // To the pay link the order answered, the confirmation kept for the way back.
    expect(left).toEqual(["pay-link:2291"]);
    expect(usePay.getState().going).toBe(true);
    expect(keptConfirmation()?.order["number"]).toBe("BR-2291");
    expect(text()).toContain("Taking you to the secure payment page…");
    await sweep("en-US · taking you to pay");
    // Never a card's number, its expiry or its code: those are typed on the payment service's page.
    expect(document.querySelector("input[autocomplete^='cc-']")).toBeNull();
  });

  it("shows the test band to someone who manages payments rehearsing here, and to nobody else", async () => {
    port.offer = { online: true, test: true };
    await mount();
    await toCheckout();
    expect(text()).toContain("Test mode — only you see this. No money moves. This order is sample data and goes when you remove sample data.");
    await sweep("en-US · checkout, rehearsing");
  });

  it("checks the order when the shopper comes back, and says it is paid", async () => {
    await mount();
    await toCheckout();
    await act(async () => placeButton().click());
    await settle();
    const placed = keptConfirmation()!.order;
    // Adminium recorded the payment: the order reads paid through its own link's session.
    port.afterFake.linkOpen = true;
    port.afterFake.rows.orders[0] = { ...placed, paid: placed["total"], pay_due: "0.00", paid_at: "2026-08-06T15:42:00Z" };
    await act(async () => {
      backFromPaying();
    });
    await settle();
    expect(usePay.getState().back).toBe("paid");
    expect(keptConfirmation()).toBeNull();
    // "Paid" where it said "Total", for what was paid.
    const rows = [...document.querySelectorAll(".sh-confirm-row")].map((r) => r.textContent);
    expect(rows).toContain(`Paid£${String(placed["total"])}`);
    expect(text()).not.toMatch(/Not paid|Pay £/);
    await sweep("en-US · back, paid");
  });

  it("offers Pay now again for an order still unpaid after the checks, and never says nothing was taken", async () => {
    await mount("ar-EG");
    await toCheckout();
    await act(async () => placeButton().click());
    await settle();
    const placed = keptConfirmation()!.order;
    port.afterFake.linkOpen = true;
    port.afterFake.rows.orders[0] = { ...placed };
    await act(async () => {
      backFromPaying();
    });
    // Still asking after the order: it says so, politely, while it does.
    await settle(1, CHECK_MS);
    expect(usePay.getState().back).toBe("checking");
    expect(text()).toContain("نتحقق من الدفع…");
    await settle(CHECKS + 2, CHECK_MS);
    expect(usePay.getState().back).toBe("unpaid");
    expect(text()).toContain("لم يُدفع بعد");
    expect(text()).not.toContain("لم يُؤخذ أي مبلغ");
    await sweep("ar-EG · back, not paid yet");
    left = [];
    await click(".sh-pay-card .sh-button--accent");
    expect(port.starts).toEqual([{ via: "link", orderId: placed["id"] }]);
    expect(left).toEqual([`pay-link:${String(placed["id"])}`]);
  });

  it("says the bank is confirming, or that the payment did not finish, where Adminium tells the payment's state", async () => {
    for (const [state, back, words] of [
      ["confirming", "bank", "Your bank is confirming the payment"],
      ["failed", "unfinished", "the payment didn't finish. Nothing was taken."],
      ["expired", "expired", "the payment page ran out of time. Nothing was taken."],
    ] as const) {
      window.history.replaceState(null, "", "/");
      sessionStorage.clear();
      port = fakePort();
      port.offer = { online: true, test: false };
      port.paymentState = state;
      resetShop(port);
      resetAfter(null);
      resetPay();
      setLeave((url) => left.push(url));
      await mount();
      await toCheckout();
      await act(async () => placeButton().click());
      await settle();
      const placed = keptConfirmation()!.order;
      port.afterFake.linkOpen = true;
      port.afterFake.rows.orders[0] = { ...placed };
      await act(async () => {
        backFromPaying();
      });
      await settle(CHECKS + 2, CHECK_MS);
      expect(usePay.getState().back).toBe(back);
      expect(text()).toContain(words);
      // With the bank, nothing more to pay; otherwise Pay now, and the e-mail's link.
      expect(document.querySelector(".sh-pay-card") === null).toBe(back === "bank");
      if (back !== "bank") expect(text()).toContain("You can also pay later from the link in our e-mail.");
      await sweep(`en-US · back, ${back}`);
      await act(async () => root?.unmount());
      root = null;
      host.remove();
    }
  });
});

describe("back from the pay page, as Adminium tells the payment's state", () => {
  const unpaid: Row = { id: 91, number: "BR-2291", status: "placed", pay_online: true, total: "37.95", paid: "0.00", pay_due: "37.95" };
  const paid: Row = { ...unpaid, paid: "37.95", pay_due: "0.00" };
  const noWait = async () => {};

  it("asks again while the service has not said, and says paid once the order reads paid", async () => {
    const reads = [unpaid, unpaid, paid];
    const states: ("open" | "paid")[] = ["open", "paid"];
    const shown: Row[] = [];
    const back = await checkBack(async () => reads.shift() ?? paid, (o) => shown.push(o), noWait, async () => states.shift() ?? "paid");
    expect(back).toBe("paid");
    expect(shown.pop()).toEqual(paid);
  });

  it("says not paid yet when no payment was started, and after the last check while the service is still silent", async () => {
    expect(await checkBack(async () => unpaid, () => {}, noWait, async () => "none")).toBe("unpaid");
    let asked = 0;
    expect(await checkBack(async () => unpaid, () => {}, noWait, async () => ((asked += 1), "open"))).toBe("unpaid");
    expect(asked).toBe(CHECKS);
  });

  it("stops at the first word of the bank, a payment that did not finish, or one whose page ran out", async () => {
    for (const [state, back] of [["confirming", "bank"], ["failed", "unfinished"], ["expired", "expired"]] as const) {
      let reads = 0;
      expect(await checkBack(async () => ((reads += 1), unpaid), () => {}, noWait, async () => state)).toBe(back);
      expect(reads).toBe(1);
    }
  });
});

describe("Pay now", () => {
  const order: Row = { id: 76, number: "BR-2276", status: "placed", pay_online: true, total: "65.50", paid: "0.00", pay_due: "65.50" };

  it("asks the pay link through the session that reads the order, and goes to it", async () => {
    await payNow(port, "mine", 76, null, async () => {});
    expect(port.starts).toEqual([{ via: "mine", orderId: 76 }]);
    expect(left).toEqual(["pay-link:76"]);
    expect(owes(order)).toBe(true);
  });

  it("reads the order again when Adminium refuses it (paid meanwhile), and says nothing went wrong", async () => {
    port.refuseStart("PUBLIC_PAY_REFUSED");
    let reread = 0;
    await payNow(port, "link", 76, null, async () => {
      reread += 1;
    });
    expect(reread).toBe(1);
    expect(usePay.getState().failed).toBe(false);
    expect(left).toEqual([]);
  });
});

describe("an order's payment, as the shopper reads it", () => {
  const base: Row = { status: "placed", pay_online: true, total: "71.50", post_by: "2026-08-12", paid_post_by: null };

  it("is paid once nothing is left, and owes while something is and it is on its way", () => {
    expect(isPaid({ ...base, paid: "71.50", pay_due: "0.00" })).toBe(true);
    expect(isPaid({ ...base, paid: "0.00", pay_due: "71.50" })).toBe(false);
    expect(owes({ ...base, paid: "0.00", pay_due: "71.50" })).toBe(true);
    expect(owes({ ...base, status: "cancelled", paid: "0.00", pay_due: "71.50" })).toBe(false);
    // Placed with payments off: nothing about paying.
    expect(owes({ ...base, pay_online: false, pay_due: "71.50" })).toBe(false);
  });

  it("dates an order made once it is paid from the payment, and gives it no date till then", () => {
    expect(postByOf({ ...base, waits_pay: false, pay_due: "71.50" })).toBe("2026-08-12");
    expect(postByOf({ ...base, waits_pay: true, pay_due: "71.50", paid: "0.00" })).toBeNull();
    expect(postByOf({ ...base, waits_pay: true, pay_due: "0.00", paid: "71.50", paid_post_by: "2026-08-14" })).toBe("2026-08-14");
  });
});

describe("Your order", () => {
  it("shows an unpaid order's first step as not paid yet, a chip by its total, and Pay now while payments are on", async () => {
    port.offer = { online: true, test: false };
    const after = port.afterFake;
    after.linkOpen = true;
    Object.assign(after.rows.orders[0]!, { pay_online: true, waits_pay: true, paid: "0.00", pay_due: "65.50", lead_max: 3 });
    await mount();
    await act(async () => goView("order"));
    await settle();
    const stages = [...document.querySelectorAll(".sa-stage")].map((s) => s.textContent);
    expect(stages[0]).toBe("Not paid yet—");
    expect(document.querySelector(".sa-paychip")?.textContent).toBe("Not paid yet");
    expect(text()).toContain("We'll start making once it's paid.");
    expect(document.querySelector(".sh-pay-card .sh-button--accent")?.textContent).toBe("Pay £65.50 now");
    // Made once it is paid: no post-by of its own until then, only the day it would be if paid today.
    expect(text()).toMatch(/Post by .+ if it's paid today/);
    await sweep("en-US · your order, not paid yet");
  });

  it("says the bank is confirming an order's payment, and offers no second Pay now", async () => {
    port.offer = { online: true, test: false };
    port.paymentState = "confirming";
    port.afterFake.linkOpen = true;
    Object.assign(port.afterFake.rows.orders[0]!, { pay_online: true, waits_pay: false, paid: "0.00", pay_due: "65.50" });
    await mount();
    await act(async () => goView("order"));
    await settle();
    expect(text()).toContain("Your bank is confirming the payment");
    expect(document.querySelector(".sh-pay-card")).toBeNull();
    await sweep("en-US · your order, the bank confirming");
  });

  it("reads as it always did for an order placed with payments off", async () => {
    port.afterFake.linkOpen = true;
    await mount();
    await act(async () => goView("order"));
    await settle();
    const stages = [...document.querySelectorAll(".sa-stage")].map((s) => s.textContent);
    expect(stages[0]).toMatch(/^Accepted/);
    expect(document.querySelector(".sa-paychip")).toBeNull();
    expect(document.querySelector(".sh-pay-card")).toBeNull();
  });
});
