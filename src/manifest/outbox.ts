/**
 * The studio's e-mails: the `messages` table is the outbox, and every e-mail
 * is a row in it the dashboard lists.
 *
 * To the shopper, every one service mail (each is about their own order,
 * proof or request):
 *   order-received       the order is in: its lines, what it comes to, when
 *                        it will be posted, and the order's own link (an
 *                        order placed with payments off, at once);
 *   order-paid           the same once an order asked to pay online is paid:
 *                        what was paid, and it is the receipt;
 *   order-unpaid         the same an hour after such an order, still unpaid:
 *                        the button that opens its pay link;
 *   pay-reminder         the one nudge the studio day after, still unpaid;
 *   proof-ready          a proof of a line is waiting: approve it or ask for
 *                        a change;
 *   proof-reminder       the studio's one nudge about a proof still waiting;
 *   order-posted         the parcel went: the service, and the tracking number
 *                        with a "Track it" button when DHL carried it;
 *   request-received     a copy of what "Ask us for something" sent;
 *   problem-received     a copy of what "Something's wrong" sent.
 * To the studio's own address (staff mail, no class):
 *   request-copy, problem-copy   what the shopper sent;
 *   change-asked                 a shopper asked for a change to a proof.
 *
 * Two more e-mails a shopper gets are not the app's: the code they sign in
 * with is Adminium's own, and a saved design's link is the Customiser's.
 */

export const KINDS = [
  "order-received",
  "order-unpaid",
  "order-paid",
  "pay-reminder",
  "proof-ready",
  "proof-reminder",
  "order-posted",
  "order-new-number",
  "request-received",
  "problem-received",
  "request-copy",
  "problem-copy",
  "change-asked",
] as const;
export type Kind = (typeof KINDS)[number];

/** Mail to the studio's own address: no class. */
export const TO_STUDIO: ReadonlySet<Kind> = new Set(["request-copy", "problem-copy", "change-asked"]);

/** The outbox's kinds, as the E-mails page names them. */
export const KIND_NAMES: Record<Kind, string> = {
  "order-received": "Order received",
  "order-unpaid": "Order received, not paid",
  "order-paid": "Order received, paid",
  "pay-reminder": "Payment reminder",
  "proof-ready": "Proof ready",
  "proof-reminder": "Proof reminder",
  "order-posted": "Order posted",
  "order-new-number": "New tracking number",
  "request-received": "Request received",
  "problem-received": "Problem received",
  "request-copy": "Request: studio copy",
  "problem-copy": "Problem: studio copy",
  "change-asked": "Change asked to a proof",
};

const studio = { setting: { table: "settings", column: "email" } };

/** A message asking for the payment waits while nothing is paid, and is skipped once it is, or once the order is cancelled. */
const UNTIL_PAID = [
  { column: "pay_due", lte: 0, reason: "paid" },
  { column: "status", eq: "cancelled", reason: "void" },
];

export const OUTBOX = {
  table: "messages",
  columns: {
    kind: "kind",
    status: "status",
    to: "to_address",
    language: "language",
    due: "due",
    sentAt: "sent_at",
    error: "error",
    skipReason: "skip_reason",
    repeatKey: "repeat_key",
  },
  links: { order: "order_id", proof: "proof_id", request: "request_id", problem: "problem_id", customer: "customer_id" },
  recipient: {
    via: "customer_id",
    table: "customers",
    email: "email",
    name: "name",
    // Written in the language the order was placed in, whatever the customer's own row says.
    language: { column: "language" },
    fallback: { via: "order_id", email: "email", name: "name", language: "language" },
  },
  // A reply to any of them reaches the studio's own mailbox, as the e-mails promise.
  settings: { table: "settings", name: "studio_name", phone: "phone", replyTo: "email" },
  // An order's own link opens its page on the shop's side; its code rides the fragment.
  pages: { manage: "/order", booking: "/" },
  kinds: Object.fromEntries(KINDS.map((kind) => [kind, `maker-${kind}`])),
  classes: Object.fromEntries(KINDS.filter((kind) => !TO_STUDIO.has(kind)).map((kind) => [kind, "service"])),
  producers: [
    // While the studio takes no payments online (as Adminium judges it when the order comes in): at once, as it always was.
    { kind: "order-received", link: "order_id", onCreate: { table: "orders" }, payments: "off" },
    // While it does, the same at once for an order the studio placed itself (on the dashboard): nobody was asked to pay.
    { kind: "order-received", link: "order_id", onCreate: { table: "orders", where: { column: "pay_online", eq: false } }, payments: "on" },
    // An order the shop placed asking to pay online: its e-mail goes when the money comes in, and is the receipt …
    { kind: "order-paid", link: "order_id", onCreate: { table: "payments", via: "order_id" } },
    // … or, still unpaid an hour after it was placed, as the e-mail with the pay link (paid meanwhile, it never goes) …
    { kind: "order-unpaid", link: "order_id", onCreate: { table: "orders", where: { column: "pay_online", eq: true } }, payments: "on", holdSeconds: 3600, dropWhen: UNTIL_PAID },
    // … and, still unpaid the studio day after, the one reminder.
    { kind: "pay-reminder", link: "order_id", onCreate: { table: "orders", where: { column: "pay_online", eq: true } }, payments: "on", due: { date: "remind_on", days: 0, at: "17:00" }, dropWhen: UNTIL_PAID },
    // About the proof itself, so each proof of an order is its own e-mail; the order and the shopper are found through it.
    // Only a proof with its picture: one added on the dashboard with none has nothing to look at, and is e-mailed once
    // it is given its picture.
    { kind: "proof-ready", link: "proof_id", onCreate: { table: "proofs", where: { column: "picture", isNull: false } } },
    { kind: "proof-ready", link: "proof_id", onChange: { table: "proofs", columns: ["picture"], changed: true, where: { column: "picture", isNull: false } } },
    { kind: "proof-reminder", link: "proof_id", onChange: { table: "proofs", columns: ["reminded_at"], changed: true } },
    { kind: "order-posted", link: "order_id", onChange: { table: "orders", column: "status", to: "posted" } },
    // Only when staff press "New number: tell the customer": a number changing by itself mails nobody.
    { kind: "order-new-number", link: "order_id", onChange: { table: "orders", columns: ["number_told_at"], changed: true, where: { column: "number_told_at", isNull: false } } },
    { kind: "request-received", link: "request_id", onCreate: { table: "commission_requests" }, recipient: { column: "email", name: "name", language: "language" } },
    { kind: "problem-received", link: "problem_id", onCreate: { table: "problem_reports" }, recipient: { column: "email", name: "name", language: "language" } },
    { kind: "request-copy", link: "request_id", onCreate: { table: "commission_requests" }, recipient: studio },
    { kind: "problem-copy", link: "problem_id", onCreate: { table: "problem_reports" }, recipient: studio },
    { kind: "change-asked", link: "proof_id", onChange: { table: "proofs", column: "state", to: "change_asked" }, recipient: studio },
  ],
};
