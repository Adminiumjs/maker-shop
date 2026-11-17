/**
 * Paying for an order online, at checkout (Adminium's `payments.payables`).
 *
 * An order is payable once placed by a shopper the shop asked to pay online
 * (`pay_online`, set by the checkout while the studio takes payments online),
 * while it is still on its way (placed, making or ready to post) and anything
 * is left to pay. The shopper pays on the payment service's own page, reached
 * through Adminium's pay page, and comes back to the shop's order page.
 *
 * Each payment is a row of `payments`, written by Adminium alone: the amount,
 * the moment, the service it went through and its reference, once. A refund
 * is kept on the payment's own row (`refunded`); the order's `paid` adds the
 * payments up and `pay_due` is what is left. A refund gives money back and
 * never asks for it again.
 *
 * Adminium switches the app's payments off at install; someone who manages
 * payments switches them on in Studio → Payments. While they are off the shop
 * and the studio read exactly as they always did.
 *
 * The receipt is the app's own: the order-received e-mail of a paid order
 * (`order-paid`, see `outbox.ts`), never Adminium's as well.
 */

/** The shop's order page: the pay page's "Back to" link lands there, and the page reopens the order this tab placed. */
export const RETURN_TO = "/order";

export const PAYABLE_STATES = ["placed", "making", "ready"] as const;

export const PAYMENTS = {
  payables: [
    {
      table: "orders",
      label: "number",
      amount: { column: "total" },
      currency: { connection: true },
      due: { column: "pay_due" },
      payments: {
        kind: "table",
        table: "payments",
        link: "order_id",
        amount: "amount",
        paidAt: "paid_at",
        method: { column: "method", values: { "*": "online" } },
        note: "note",
        reference: "payment_ref",
        refunded: "refunded",
        provider: "provider",
        currency: "currency",
      },
      customerEmail: "email",
      payableWhen: [
        { column: "pay_online", eq: true },
        { column: "status", in: [...PAYABLE_STATES] },
        { column: "pay_due", gt: 0 },
      ],
      returnTo: RETURN_TO,
      receipt: "app",
      // The shop has no way of its own to pay by hand: the pay page offers only the payment services.
      onlyOnline: true,
      refunds: { model: "column" },
    },
  ],
};
