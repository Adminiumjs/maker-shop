/**
 * What the shop's pages may read and write, through two browser keys.
 *
 * The `customer` key is the shop's: the catalogue (products in the shop,
 * their options, quantity breaks and photos), the postage services and
 * their rates, the closures, the materials' names and care notes, the
 * studio's public settings; placing an order with its lines, their features
 * and the shopper's details in one write, priced by Adminium and checked
 * against the total the shopper saw; asking for something made; telling the
 * studio something went wrong with an order of theirs. A shopper who signs
 * in with a link or code e-mailed to them reads their own orders, their
 * lines and proofs, and answers a proof: approve it, or ask for a change.
 *
 * The `order` key opens one order by the code in its own link (the link its
 * confirmation e-mail carries, and the one the confirmation page is handed
 * once): the order, its lines and its proofs, and the same answer to a proof.
 *
 * The Customiser declares its own entries on the `customer` key (its
 * catalogue for this shop, a shopper's design and its link), not here.
 *
 * What never leaves through these keys: anybody else's order, who in the
 * studio did what, the order's link code and retry key, the stock.
 */
import { NEWS_TICK } from "./people.ts";

/** What a shopper sees of an order: its progress, their details, what it cost. */
export const ORDER_SELECT = [
  "id",
  "number",
  "status",
  "name",
  "email",
  "address_line1",
  "address_line2",
  "town",
  "postcode",
  "note",
  "service_id",
  "item_count",
  "weight_g",
  "postage",
  "pieces_total",
  "total",
  "placed_at",
  "post_by",
  "posted_at",
  "tracking",
  "cancelled_at",
  "link_expires",
];

/** What placing an order answers: its figures, never the shopper's own details back. */
export const PLACED_SELECT = ORDER_SELECT.filter((column) => !["name", "email", "address_line1", "address_line2", "town", "postcode", "note"].includes(column));

export const LINE_SELECT = [
  "id",
  "order_id",
  "position",
  "product_id",
  "product_name",
  "qty",
  "material_id",
  "size_id",
  "finish_id",
  "lettering",
  "design_id",
  "unit_price",
  "base_each",
  "percent_off",
  "each",
  "pieces",
  "features_each",
  "features_total",
  "line_total",
  "lead_days",
  "post_by",
  "stage",
  "proof_state",
];
export const FEATURE_SELECT = ["id", "line_id", "option_id", "feature", "name", "price"];
export const PROOF_SELECT = ["id", "order_id", "line_id", "version", "kind", "picture", "design_version_id", "note", "state", "change_note", "sent_at", "answered_at"];

/** The shopper's answer to a proof: approve it, or ask for a change in their own words, while it waits. */
const ANSWER = {
  writable: ["state", "change_note"],
  writableValues: { state: ["approved", "change_asked"] },
  writableWhen: { state: ["sent"] },
};

/** An order's lines, features and proofs, read where the order is; a proof answered there too. */
function underOrder(key?: string) {
  const keyed = key === undefined ? {} : { key };
  return [
    { table: "order_lines", ...keyed, methods: ["GET"], level: "verified", visibleWith: { table: "orders", via: "order_id" }, select: LINE_SELECT },
    { table: "order_line_features", ...keyed, methods: ["GET"], level: "verified", visibleWith: { table: "order_lines", via: "line_id" }, select: FEATURE_SELECT },
    { table: "proofs", ...keyed, methods: ["GET", "PATCH"], level: "verified", visibleWith: { table: "orders", via: "order_id" }, select: PROOF_SELECT, files: ["picture"], ...ANSWER },
  ];
}

export const PRODUCT_SELECT = [
  "id",
  "code",
  "name",
  "category",
  "unit",
  "pieces",
  "price",
  "lead_days",
  "machine_kind",
  "material_id",
  "grams",
  "size_text",
  "width_mm",
  "height_mm",
  "finish_label",
  "made_from",
  "finished_with",
  "care",
  "icon",
  "photo",
  "takes_lettering",
  "lettering_limit",
  "lettering_prompt",
  "lettering_hint",
  "base_id",
  "position",
];
export const OPTION_SELECT = ["id", "product_id", "kind", "code", "name", "price", "material_id", "swatch", "feature_code", "feature_id", "position"];

export const SETTINGS_SELECT = ["id", "studio_name", "address", "phone", "email", "about", "taking_orders"];

/** The order key: one order, by its own link. */
export const ORDER_KEY = "order";

export const PUBLIC_KEYS = { [ORDER_KEY]: {} };

export const PUBLIC_ACCESS = [
  // ── the shopper who signs in with a link or code e-mailed to them ───────────
  {
    table: "customers",
    methods: ["GET"],
    select: ["name", "email"],
    claim: { verify: "email-link", email: "email" },
    humanCheck: true,
    // "Delete my details" also stops every link their orders were e-mailed with, and takes back the newsletter.
    forget: { columns: ["email", "name", "may_email"], stamp: "forgotten_at", links: true },
  },
  { table: "orders", methods: ["GET"], level: "verified", claimedBy: { table: "customers", column: "customer_id" }, select: ORDER_SELECT },
  ...underOrder(),

  // ── the catalogue, the post and the calendar ─────────────────────────────────
  { table: "products", methods: ["GET"], select: PRODUCT_SELECT, filters: [{ column: "published", op: "eq", value: true }], pictures: ["photo"] },
  { table: "options", methods: ["GET"], select: OPTION_SELECT, filters: [{ column: "active", op: "eq", value: true }] },
  { table: "quantity_breaks", methods: ["GET"], select: ["id", "product_id", "min_qty", "percent_off"] },
  { table: "postage_services", methods: ["GET"], select: ["id", "code", "name", "detail", "tracked", "position"], filters: [{ column: "active", op: "eq", value: true }] },
  { table: "postage_rates", methods: ["GET"], select: ["id", "service_id", "min_grams", "max_grams", "price"] },
  {
    table: "closures",
    methods: ["GET"],
    select: ["id", "from_date", "to_date", "reason"],
    filters: [
      { column: "active", op: "eq", value: true },
      { column: "to_date", op: "from-today" },
    ],
  },
  { table: "materials", methods: ["GET"], select: ["id", "code", "name", "family", "thickness_mm", "tint", "care"], filters: [{ column: "active", op: "eq", value: true }] },
  { table: "settings", methods: ["GET"], select: SETTINGS_SELECT },

  // ── placing an order ─────────────────────────────────────────────────────────
  {
    table: "orders",
    methods: ["POST"],
    humanCheck: true,
    level: "verified",
    select: PLACED_SELECT,
    writable: ["name", "email", "address_line1", "address_line2", "town", "postcode", "note", "language", "service_id", "client_key", "may_email"],
    requires: ["name", "email", "address_line1", "town", "postcode", "service_id"],
    requireSetting: [{ table: "settings", column: "taking_orders" }],
    claimedBy: { table: "customers", column: "customer_id", optional: true },
    identity: { table: "customers", email: "email", link: "customer_id", fill: { name: "name", language: "language" } },
    consent: NEWS_TICK,
    shareLink: "link_token",
    anonymous: {
      perValue: { columns: ["email"], n: 10 },
      perIpHour: 10,
      perKeyHour: 300,
      plainText: ["name", "town", { column: "address_line1", digits: 4, max: 120 }, { column: "address_line2", digits: 4, max: 120 }, { column: "note", digits: 4, max: 200 }],
    },
    children: {
      order_lines: {
        via: "order_id",
        writable: ["product_id", "qty", "material_id", "size_id", "finish_id", "lettering", "design_code"],
        requires: ["product_id"],
        select: LINE_SELECT.filter((c) => c !== "order_id"),
        position: "position",
        min: 1,
        max: 20,
        children: {
          order_line_features: {
            via: "line_id",
            writable: ["option_id"],
            select: FEATURE_SELECT.filter((c) => c !== "line_id"),
            max: 4,
          },
        },
      },
    },
    dryRun: true,
    expect: "total",
    clientKey: "client_key",
  },

  // ── asking for something made, and telling the studio something went wrong ──
  {
    table: "commission_requests",
    methods: ["POST"],
    humanCheck: true,
    select: ["id", "ref", "status"],
    writable: ["name", "email", "language", "idea", "quantity", "wanted_by", "budget", "client_key"],
    requires: ["name", "email", "idea"],
    anonymous: { perValue: { columns: ["email"], n: 3 }, perIpHour: 3, perKeyHour: 60, plainText: ["name", { column: "idea", digits: 4, max: 200 }, { column: "budget", digits: 4, max: 80 }] },
    clientKey: "client_key",
  },
  {
    table: "problem_reports",
    methods: ["POST"],
    humanCheck: true,
    select: ["id", "ref", "status"],
    // The order number must be one of the orders sent to this address: Adminium finds it, or refuses.
    writable: ["order_ref", "name", "email", "language", "what", "details", "client_key"],
    requires: ["order_ref", "name", "email", "what", "details"],
    anonymous: { perValue: { columns: ["email"], n: 3 }, perIpHour: 3, perKeyHour: 60, plainText: ["name", { column: "details", digits: 4, max: 200 }] },
    clientKey: "client_key",
  },

  // ── one order, by its own link ───────────────────────────────────────────────
  {
    table: "orders",
    key: ORDER_KEY,
    methods: ["GET"],
    select: ORDER_SELECT,
    claim: { by: "token", column: "link_token", expires: "link_expires", stopped: "link_stopped", own: true, address: "email" },
  },
  ...underOrder(ORDER_KEY),
];
