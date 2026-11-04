/**
 * The studio's e-mails: the `messages` table is the outbox, and every e-mail
 * is a row in it the dashboard lists.
 *
 * To the shopper, every one service mail (each is about their own order,
 * proof or request):
 *   order-received       the order is in: what it costs, when it will be
 *                        posted, and the order's own link;
 *   proof-ready          a proof of a line is waiting: the picture, and
 *                        approve or ask for a change;
 *   proof-reminder       the studio's nudge about a proof still waiting;
 *   order-posted         the parcel went: the service, and the tracking number
 *                        when DHL carried it;
 *   request-received     "Ask us for something" reached the studio;
 *   problem-received     "Something's wrong" reached the studio.
 * To the studio's own address (staff mail, no class):
 *   request-copy, problem-copy   a copy of what the shopper sent.
 *
 * The code a shopper signs in with and the saved design's link are not
 * here: Adminium sends the first, the Customiser the second.
 */

export const KINDS = ["order-received", "proof-ready", "proof-reminder", "order-posted", "request-received", "problem-received", "request-copy", "problem-copy"] as const;
export type Kind = (typeof KINDS)[number];

/** Mail to the studio's own address: no class. */
const TO_STUDIO: ReadonlySet<Kind> = new Set(["request-copy", "problem-copy"]);

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
  settings: { table: "settings", name: "studio_name", phone: "phone" },
  // An order's own link opens its page on the shop's side; its code rides the fragment.
  pages: { manage: "/order", booking: "/" },
  kinds: Object.fromEntries(KINDS.map((kind) => [kind, `maker-${kind}`])),
  classes: Object.fromEntries(KINDS.filter((kind) => !TO_STUDIO.has(kind)).map((kind) => [kind, "service"])),
  producers: [
    { kind: "order-received", link: "order_id", onCreate: { table: "orders" } },
    { kind: "proof-ready", link: "order_id", onCreate: { table: "proofs", via: "order_id" } },
    { kind: "proof-reminder", link: "order_id", onChange: { table: "proofs", via: "order_id", columns: ["reminded_at"], changed: true } },
    { kind: "order-posted", link: "order_id", onChange: { table: "orders", column: "status", to: "posted" } },
    { kind: "request-received", link: "request_id", onCreate: { table: "commission_requests" }, recipient: { column: "email", name: "name", language: "language" } },
    { kind: "problem-received", link: "problem_id", onCreate: { table: "problem_reports" }, recipient: { column: "email", name: "name", language: "language" } },
    { kind: "request-copy", link: "request_id", onCreate: { table: "commission_requests" }, recipient: studio },
    { kind: "problem-copy", link: "problem_id", onCreate: { table: "problem_reports" }, recipient: studio },
  ],
};
