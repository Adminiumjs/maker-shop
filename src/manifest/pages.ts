/**
 * The Maker Shop section in the dashboard: its pages, their forms and the
 * groups they sit in.
 *
 * The studio's own screens (the board, proofs, batches, the post office run)
 * are the app's staff side, on their own address; these pages are the
 * records behind them: orders, the catalogue, the workshop's stock and
 * machines, the people who wrote in, the e-mails and the settings.
 *
 * Forms are v2 documents. A value Adminium works out (a total, a number, a
 * stamp) shows in a form and cannot be typed over.
 */
import { l, titles } from "./labels.ts";

export const NAV_GROUPS = [
  { key: "orders", label: l("Orders"), order: 1 },
  { key: "catalogue", label: l("Catalogue"), order: 2 },
  { key: "workshop", label: l("Workshop"), order: 3 },
  { key: "people", label: l("People"), order: 4 },
  { key: "manage", label: l("Manage"), order: 5 },
];

type Field = Record<string, unknown>;
const f = (column: string, more: Field = {}): Field => ({ column, ...more });
const title = (column: string): Field => ({ column, control: "title", span: 2 });
const wide = (column: string, control = "textarea"): Field => ({ column, control, span: 2 });
const toggle = (column: string): Field => ({ column, control: "toggle-row" });
const rows = (relation: string, columns: Field[]): Field => ({ relation, control: "child-rows", span: 2, columns });
const form = (...sections: Field[][]) => ({
  form: { v: 2, sections: sections.map((fields, i) => ({ id: `s${String(i + 1)}`, fields })) },
});

interface PageSpec {
  ref: string;
  title: string;
  group: string;
  icon: string;
  order: number;
  table: string;
  config: Record<string, unknown>;
}

const SPECS: PageSpec[] = [
  // ── orders ─────────────────────────────────────────────────────────────────
  {
    ref: "maker-orders",
    title: "Orders",
    group: "orders",
    icon: "receipt",
    order: 1,
    table: "orders",
    config: form(
      [title("number"), f("status", { control: "segmented" }), f("placed_at", { control: "datetime" }), f("post_by", { control: "date" })],
      [f("name"), f("email", { control: "email" }), f("address_line1"), f("address_line2"), f("town"), f("postcode"), f("language"), wide("note", "text")],
      [
        rows("order_lines", [
          { column: "product_id", control: "reference", width: "2fr" },
          { column: "qty", width: "80px" },
          { column: "lettering", width: "1fr" },
          { column: "stage", width: "110px" },
          { column: "each", control: "currency", width: "110px" },
          { column: "line_total", control: "currency", width: "110px" },
        ]),
      ],
      [f("service_id", { control: "reference" }), f("weight_g", { control: "number" }), f("postage", { control: "currency" }), f("pieces_total", { control: "currency" }), f("total", { control: "currency" })],
      [f("posted_at", { control: "datetime" }), f("posted_by"), f("tracking"), f("cancelled_at", { control: "datetime" }), wide("cancel_reason", "text")],
      [f("customer_id", { control: "reference" }), f("link_expires", { control: "datetime" }), toggle("link_stopped")],
    ),
  },
  {
    ref: "maker-proofs",
    title: "Proofs",
    group: "orders",
    icon: "image",
    order: 2,
    table: "proofs",
    config: form(
      [f("order_id", { control: "reference" }), f("line_id", { control: "reference" }), f("version", { control: "number" }), f("state", { control: "segmented" })],
      [f("kind", { control: "segmented" }), f("picture", { control: "image" }), wide("note", "text"), wide("change_note", "text")],
      [f("sent_at", { control: "datetime" }), f("sent_by"), f("answered_at", { control: "datetime" }), f("reminded_at", { control: "datetime" })],
    ),
  },
  {
    ref: "maker-requests",
    title: "Requests",
    group: "orders",
    icon: "inbox",
    order: 3,
    table: "commission_requests",
    config: form(
      [title("ref"), f("status", { control: "segmented" }), f("created_at", { control: "datetime" })],
      [f("name"), f("email", { control: "email" }), f("language"), wide("idea"), f("quantity", { control: "stepper" }), f("wanted_by", { control: "date" }), f("budget")],
      [wide("staff_note")],
    ),
  },
  {
    ref: "maker-problems",
    title: "Problems",
    group: "orders",
    icon: "triangle-alert",
    order: 4,
    table: "problem_reports",
    config: form(
      [title("ref"), f("status", { control: "segmented" }), f("created_at", { control: "datetime" })],
      [f("order_ref"), f("order_id", { control: "reference" }), f("what", { control: "select" }), wide("details")],
      [f("name"), f("email", { control: "email" }), f("language"), wide("staff_note")],
    ),
  },

  // ── the catalogue ───────────────────────────────────────────────────────────
  {
    ref: "maker-products",
    title: "Products",
    group: "catalogue",
    icon: "package",
    order: 1,
    table: "products",
    config: form(
      [title("name"), f("code"), f("category", { control: "select" }), f("unit"), f("pieces", { control: "stepper" }), f("price", { control: "currency" })],
      [f("lead_days", { control: "stepper" }), f("machine_kind", { control: "segmented" }), f("material_id", { control: "reference" }), f("grams", { control: "number" }), f("size_text"), f("width_mm", { control: "number" }), f("height_mm", { control: "number" })],
      [f("photo", { control: "image" }), f("icon"), f("finish_label"), wide("made_from"), wide("finished_with"), wide("care")],
      [toggle("takes_lettering"), f("lettering_limit", { control: "stepper" }), f("lettering_prompt"), wide("lettering_hint")],
      [toggle("published"), f("position", { control: "stepper" })],
    ),
  },
  {
    ref: "maker-options",
    title: "Options",
    group: "catalogue",
    icon: "list-checks",
    order: 2,
    table: "options",
    config: form(
      [title("name"), f("product_id", { control: "reference" }), f("kind", { control: "segmented" }), f("code"), f("price", { control: "currency" })],
      [f("material_id", { control: "reference" }), f("swatch"), f("feature_code"), toggle("active"), f("position", { control: "stepper" })],
    ),
  },
  {
    ref: "maker-breaks",
    title: "Quantity breaks",
    group: "catalogue",
    icon: "layers",
    order: 3,
    table: "quantity_breaks",
    config: form([f("product_id", { control: "reference" }), f("min_qty", { control: "stepper" }), f("percent_off", { control: "number" })]),
  },
  {
    ref: "maker-postage",
    title: "Postage",
    group: "catalogue",
    icon: "mail",
    order: 4,
    table: "postage_services",
    config: form([title("name"), f("code"), wide("detail", "text"), toggle("tracked"), f("dhl_product"), toggle("active"), f("position", { control: "stepper" })]),
  },
  {
    ref: "maker-postage-rates",
    title: "Postage rates",
    group: "catalogue",
    icon: "scale",
    order: 5,
    table: "postage_rates",
    config: form([f("service_id", { control: "reference" }), f("min_grams", { control: "number" }), f("max_grams", { control: "number" }), f("price", { control: "currency" })]),
  },

  // ── the workshop ────────────────────────────────────────────────────────────
  {
    ref: "maker-materials",
    title: "Materials",
    group: "workshop",
    icon: "trees",
    order: 1,
    table: "materials",
    config: form(
      [title("name"), f("code"), f("family"), f("group", { control: "select" }), f("thickness_mm", { control: "number" }), f("size_note"), f("unit", { control: "select" })],
      [f("on_hand", { control: "number" }), f("committed", { control: "number" }), f("available", { control: "number" }), f("reorder_at", { control: "number" }), f("cost", { control: "number" })],
      [f("machine_id", { control: "reference" }), f("tint"), wide("care"), toggle("active"), f("position", { control: "stepper" })],
    ),
  },
  {
    ref: "maker-stock",
    title: "Stock movements",
    group: "workshop",
    icon: "arrow-left-right",
    order: 2,
    table: "stock_movements",
    config: form(
      [f("material_id", { control: "reference" }), f("kind", { control: "select" }), f("qty", { control: "number" }), f("counted", { control: "number" })],
      [f("on_hand_before", { control: "number" }), f("on_hand_change", { control: "number" }), f("committed_change", { control: "number" })],
      [f("batch_id", { control: "reference" }), f("line_id", { control: "reference" }), wide("note", "text"), f("made_at", { control: "datetime" }), f("made_by")],
    ),
  },
  {
    ref: "maker-machines",
    title: "Machines",
    group: "workshop",
    icon: "zap",
    order: 3,
    table: "machines",
    config: form([title("name"), f("code"), f("kind", { control: "segmented" }), f("detail"), f("icon"), toggle("active"), f("position", { control: "stepper" })]),
  },
  {
    ref: "maker-bookings",
    title: "Machine bookings",
    group: "workshop",
    icon: "calendar-clock",
    order: 4,
    table: "machine_bookings",
    config: form([f("machine_id", { control: "reference" }), f("batch_id", { control: "reference" }), f("kind", { control: "segmented" }), f("label"), f("starts_at", { control: "datetime" }), f("ends_at", { control: "datetime" }), f("booked_by")]),
  },
  {
    ref: "maker-batches",
    title: "Batches",
    group: "workshop",
    icon: "boxes",
    order: 5,
    table: "batches",
    config: form(
      [title("label"), f("machine_id", { control: "reference" }), f("material_id", { control: "reference" }), f("state", { control: "segmented" })],
      [f("sheets", { control: "number" }), f("piece_count", { control: "number" }), wide("note", "text")],
      [f("started_at", { control: "datetime" }), f("started_by"), f("done_at", { control: "datetime" })],
    ),
  },
  {
    ref: "maker-closures",
    title: "Closures",
    group: "workshop",
    icon: "calendar-x",
    order: 6,
    table: "closures",
    config: form([f("from_date", { control: "date" }), f("to_date", { control: "date" }), wide("reason", "text"), toggle("active")]),
  },

  // ── people ───────────────────────────────────────────────────────────────────
  {
    ref: "maker-customers",
    title: "Customers",
    group: "people",
    icon: "contact",
    order: 1,
    table: "customers",
    config: form([title("name"), f("email", { control: "email" }), f("language"), toggle("may_email"), f("created_at", { control: "datetime" }), f("forgotten_at", { control: "datetime" })]),
  },

  // ── the e-mails and the settings ────────────────────────────────────────────
  {
    ref: "maker-messages",
    title: "E-mails",
    group: "manage",
    icon: "message-square",
    order: 1,
    table: "messages",
    config: form([
      f("kind", { control: "select" }),
      f("status", { control: "select" }),
      f("to_address", { control: "email" }),
      f("language"),
      f("order_id", { control: "reference" }),
      f("proof_id", { control: "reference" }),
      f("request_id", { control: "reference" }),
      f("problem_id", { control: "reference" }),
      f("customer_id", { control: "reference" }),
      f("due", { control: "datetime" }),
      f("sent_at", { control: "datetime" }),
      f("skip_reason", { control: "select" }),
      wide("error", "text"),
    ]),
  },
  {
    ref: "maker-settings",
    title: "Settings",
    group: "manage",
    icon: "settings",
    order: 2,
    table: "settings",
    config: form(
      [title("studio_name"), f("phone", { control: "phone" }), f("email", { control: "email" }), wide("address", "text"), wide("about")],
      [f("ref_prefix"), f("first_order_number", { control: "number" }), f("proof_reminder_days", { control: "stepper" }), toggle("taking_orders")],
    ),
  },
];

/** A page as the manifest carries it. */
const pageOf = (spec: PageSpec) => ({
  ref: spec.ref,
  template: "page-crud",
  title: { key: `mft.${spec.ref.replaceAll("-", ".")}`, fallback: spec.title },
  titles: titles(spec.title),
  nav: { group: spec.group, icon: spec.icon, order: spec.order },
  bindings: { rows: spec.table },
  config: spec.config,
});

export function pages(): unknown[] {
  return SPECS.map(pageOf);
}

/** Every page's ref, in order (the owner's role grants them by name). */
export const PAGE_REFS = SPECS.map((spec) => spec.ref);

/** The pages the studio's screens-only roles open records on. */
export const STUDIO_PAGES = ["maker-orders", "maker-proofs"];
