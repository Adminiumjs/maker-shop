/**
 * The studio's e-mails: the `messages` table is the outbox, and every e-mail
 * is a row in it the dashboard lists.
 *
 * To the shopper, every one service mail (each is about their own order,
 * proof or request):
 *   order-received       the order is in: its lines, what it comes to, when
 *                        it will be posted, and the order's own link;
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
  "proof-ready",
  "proof-reminder",
  "order-posted",
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
  "proof-ready": "Proof ready",
  "proof-reminder": "Proof reminder",
  "order-posted": "Order posted",
  "request-received": "Request received",
  "problem-received": "Problem received",
  "request-copy": "Request: studio copy",
  "problem-copy": "Problem: studio copy",
  "change-asked": "Change asked to a proof",
};

const studio = { setting: { table: "settings", column: "email" } };

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
    { kind: "order-received", link: "order_id", onCreate: { table: "orders" } },
    // About the proof itself, so each proof of an order is its own e-mail; the order and the shopper are found through it.
    // Only a proof with its picture: one added on the dashboard with none has nothing to look at, and is e-mailed once
    // it is given its picture.
    { kind: "proof-ready", link: "proof_id", onCreate: { table: "proofs", where: { column: "picture", isNull: false } } },
    { kind: "proof-ready", link: "proof_id", onChange: { table: "proofs", columns: ["picture"], changed: true, where: { column: "picture", isNull: false } } },
    { kind: "proof-reminder", link: "proof_id", onChange: { table: "proofs", columns: ["reminded_at"], changed: true } },
    { kind: "order-posted", link: "order_id", onChange: { table: "orders", column: "status", to: "posted" } },
    { kind: "request-received", link: "request_id", onCreate: { table: "commission_requests" }, recipient: { column: "email", name: "name", language: "language" } },
    { kind: "problem-received", link: "problem_id", onCreate: { table: "problem_reports" }, recipient: { column: "email", name: "name", language: "language" } },
    { kind: "request-copy", link: "request_id", onCreate: { table: "commission_requests" }, recipient: studio },
    { kind: "problem-copy", link: "problem_id", onCreate: { table: "problem_reports" }, recipient: studio },
    { kind: "change-asked", link: "proof_id", onChange: { table: "proofs", column: "state", to: "change_asked" }, recipient: studio },
  ],
};
