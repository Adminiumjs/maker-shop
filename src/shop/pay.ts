/**
 * Paying for an order online, on the shopper's side.
 *
 * Adminium says whether the studio takes payments online right now
 * (`available`); only then does the checkout offer to pay, and the order it
 * places asks to be paid online (`pay_online`). Placing it answers the order's
 * pay link: the browser goes to Adminium's pay page, where the shopper picks
 * Stripe or PayPal and pays on that service's own page. Nothing here sees a
 * card or decides an amount: the amount is the order's own, read again by
 * Adminium every time.
 *
 * The pay page's "Back to" link brings the shopper to the shop's order page
 * (`/order`), with nothing in the address. This tab kept the confirmation it
 * was about to show, and the session on the order's own link: the shop shows
 * the confirmation again, checks the order with Adminium until it reads paid,
 * and says so. An order still unpaid by then is offered "Pay now" again.
 *
 * With payments off nothing here shows: the checkout, the confirmation and
 * Your order read exactly as they always did.
 */
import { create } from "zustand";

import { isShopError, type Id, type PayOffer, type Row, type ShopPort } from "./port.ts";
import type { Confirmed } from "./store.ts";

/**
 * How an order's newest online payment stands, as Adminium answers it
 * (`payments.state`): none started, a checkout open at the service, the bank
 * confirming it, paid, did not finish, or its page ran out of time.
 */
export type PaymentState = "none" | "open" | "confirming" | "paid" | "failed" | "expired";

/** Where the confirmation stands after the pay page: checking, paid, or (with a payment's own state to read) the others. */
export type PayBack = "checking" | "paid" | "bank" | "unfinished" | "expired" | "unpaid";

export interface PayState {
  /** What Adminium said of payments when the shop opened; null until it said. */
  offer: PayOffer | null;
  /** Leaving for the pay page: the button pressed says "Taking you to the secure payment page…". */
  going: boolean;
  /** The confirmation after the pay page; null when the shopper has not been to it. */
  back: PayBack | null;
  /** The pay link could not be had: said under the button pressed. */
  failed: boolean;
}

export const usePay = create<PayState>(() => ({ offer: null, going: false, back: null, failed: false }));

const get = () => usePay.getState();
const set = (patch: Partial<PayState>) => usePay.setState(patch);

/** For tests: nothing asked, nothing kept. */
export function resetPay(): void {
  usePay.setState({ offer: null, going: false, back: null, failed: false }, true);
  forget();
}

// ── reading an order's payment ─────────────────────────────────────────────

const num = (value: unknown): number => {
  const n = Number(value);
  return value === null || value === undefined || value === "" || !Number.isFinite(n) ? 0 : n;
};
const yes = (value: unknown): boolean => value === true || value === 1 || value === "1" || value === "true";

/** The states an order may be paid in: placed, on the bench, or ready to post. */
const PAYABLE = new Set(["placed", "making", "ready"]);

/** The shopper was asked to pay this order online at checkout. */
export const asksOnline = (order: Row): boolean => yes(order["pay_online"]);

/** Paid in full, online. */
export const isPaid = (order: Row): boolean => asksOnline(order) && num(order["paid"]) > 0 && num(order["pay_due"]) <= 0;

/** Asked to be paid online, still on its way, and something left to pay. */
export const owes = (order: Row): boolean => asksOnline(order) && PAYABLE.has(String(order["status"] ?? "placed")) && num(order["pay_due"]) > 0;

/** Nothing is made before it is paid ("Take payment before making", as it stood when it was placed). */
export const madeOncePaid = (order: Row): boolean => asksOnline(order) && yes(order["waits_pay"]);

/**
 * The order's post-by as the shopper reads it: the day its pieces go in the
 * post, counted from placing — or, for an order made once it is paid, from the
 * payment (Adminium works it out again when the money lands). Null for such an
 * order not yet paid: it has no date until it is paid.
 */
export function postByOf(order: Row): string | null {
  const at = (value: unknown) => (value === null || value === undefined || value === "" ? null : String(value).slice(0, 10));
  if (!madeOncePaid(order)) return at(order["post_by"]);
  return isPaid(order) ? (at(order["paid_post_by"]) ?? at(order["post_by"])) : null;
}

// ── the offer ───────────────────────────────────────────────────────────────

/** Whether the studio takes payments online right now, asked once. Never throws. */
export async function loadOffer(port: ShopPort | null): Promise<void> {
  const pays = port?.payments() ?? null;
  if (pays === null) {
    set({ offer: { online: false, test: false } });
    return;
  }
  set({ offer: await pays.available() });
}

/** The checkout offers to pay now: Adminium said the studio takes payments online. */
export const paysOnline = (state: PayState = get()): boolean => state.offer?.online === true;

// ── leaving for the pay page, and coming back ──────────────────────────────

const SLOT = "maker.shop.paying";

/** How the browser goes to the pay page: the whole tab, as a link would (a seam the demo and the tests take over). */
let leave: (url: string) => void = (url) => window.location.assign(url);
export function setLeave(go: ((url: string) => void) | null): void {
  leave = go ?? ((url) => window.location.assign(url));
}

function keep(confirmed: Confirmed): void {
  try {
    sessionStorage.setItem(SLOT, JSON.stringify({ confirmed }));
  } catch {
    // not kept: back from paying, the order's page opens as it always does
  }
}

function forget(): void {
  try {
    sessionStorage.removeItem(SLOT);
  } catch {
    // nothing kept
  }
}

/** The confirmation this tab was showing when it left for the pay page, or null. */
export function keptConfirmation(): Confirmed | null {
  try {
    const raw = sessionStorage.getItem(SLOT);
    if (raw === null) return null;
    const kept = JSON.parse(raw) as { confirmed?: Confirmed };
    return kept.confirmed !== undefined && kept.confirmed.order !== undefined ? kept.confirmed : null;
  } catch {
    return null;
  }
}

/** To the pay page, keeping the confirmation for the way back. */
export function goPay(url: string, confirmed: Confirmed | null): void {
  set({ going: true, failed: false });
  if (confirmed !== null) keep(confirmed);
  leave(url);
}

/**
 * "Pay now": the order's pay link, asked of Adminium again, through the
 * session that reads the order. Refused (paid meanwhile, payments switched
 * off), the order is read again and shows as it now is.
 */
export async function payNow(port: ShopPort | null, via: "link" | "mine", orderId: Id, confirmed: Confirmed | null, reread: () => Promise<void>): Promise<void> {
  const pays = port?.payments() ?? null;
  if (pays === null || get().going) return;
  set({ going: true, failed: false });
  try {
    const url = await pays.start(via, orderId);
    goPay(url, confirmed);
  } catch (error) {
    set({ going: false });
    if (isShopError(error) && (error.refused.code === "PUBLIC_PAY_REFUSED" || error.refused.status === 404 || error.refused.status === 409)) {
      await reread();
      return;
    }
    set({ failed: true });
  }
}

/** How often the confirmation asks after the order, and how long between, before it stops checking. */
export const CHECKS = 8;
export const CHECK_MS = 1_500;

/**
 * Back from the pay page: the confirmation again, checking with Adminium how
 * the order's payment stands. Paid (the order reads paid), it says so. With
 * the bank, it says the bank is confirming it and not to pay again. Did not
 * finish, or its page ran out of time, it says nothing was taken and offers
 * "Pay now" again. While the service has not said yet, it asks again, a few
 * times; still nothing by then, the order reads "Not paid yet" with "Pay now".
 * An Adminium that does not answer a payment's state (before 0.3.61) is asked
 * only for the order.
 */
export async function checkBack(
  read: () => Promise<Row | null>,
  show: (order: Row) => void,
  wait: (ms: number) => Promise<void> = (ms) => new Promise((done) => setTimeout(done, ms)),
  stateOf?: () => Promise<PaymentState | null>,
): Promise<PayBack> {
  set({ back: "checking", going: false });
  const settle = (back: PayBack, order: Row | null): PayBack => {
    if (order !== null) show(order);
    forget();
    set({ back });
    return back;
  };
  let last: Row | null = null;
  for (let i = 0; i < CHECKS; i += 1) {
    if (i > 0) await wait(CHECK_MS);
    try {
      last = await read();
    } catch {
      last = null;
    }
    if (last !== null && isPaid(last)) return settle("paid", last);
    const state = stateOf === undefined ? null : await stateOf().catch(() => null);
    // The money arrived: the order is read again until it says so (Adminium writes it down as it answers).
    if (state === "paid" || state === "open" || state === null) continue;
    if (state === "confirming") return settle("bank", last);
    if (state === "failed") return settle("unfinished", last);
    if (state === "expired") return settle("expired", last);
    // None started (the shopper never reached the service): not paid yet.
    return settle("unpaid", last);
  }
  return settle("unpaid", last);
}
