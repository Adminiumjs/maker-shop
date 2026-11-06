/**
 * The studio's tables, as the manifest asks Adminium to make them.
 *
 * Every figure a shopper or the studio reads is decided here, by Adminium,
 * never by a page:
 *
 *   - a line's price is its product's price plus the differences of the
 *     options it names (each option a row of that product's own, held to it
 *     by `linkable.same`), less the product's quantity break (`band` over the
 *     quantity, among its offered breaks only), plus each priced customising feature at its own flat
 *     price a piece, never lowered by the break;
 *   - an order's postage is its service's rate for the parcel's weight (a
 *     `band` over the lines' weight, scoped to the service), its total the
 *     pieces plus the postage;
 *   - each line's post-by is so many studio days after the order came in
 *     (`addWorkingDays`: the studio's days and its five o'clock cut-off are
 *     settings, its closures a table), and the order's is its latest line's;
 *   - an order's number runs without gaps, `BR-2291` and on, from the
 *     settings' first number and prefix;
 *   - a line naming a design in the Customiser has the design checked inside
 *     the save (`check`) and snapshotted when the order is made (the
 *     `design` posting), and a line with words on it waits for its proof.
 *
 * Stock is materials, not finished goods. With Inventory on it is kept
 * there; without it, `stock_movements` keeps it here, a count among its
 * kinds.
 */
import { l, type Labels } from "./labels.ts";
import { KIND_NAMES } from "./outbox.ts";
import { DESIGN_POSTING, CUSTOMISER } from "./postings.ts";
import { CUTOFF, STUDIO_DAYS } from "./settings.ts";

type Tone = "pos" | "warn" | "danger" | "info" | "neutral" | "accent";

export interface Column {
  ref: string;
  type: "int" | "text" | "decimal" | "money" | "bool" | "enum" | "date" | "timestamptz" | "fk" | "json";
  role?: "pk" | "created_at";
  semantic?: "name" | "email" | "image" | "money";
  nullable?: true;
  enum?: string[];
  references?: string;
  default?: string | number | boolean;
  maxLength?: number;
  unique?: true;
  index?: true;
  scale?: number | "currency";
  rules?: Record<string, unknown>;
  label?: Labels | Record<string, string>;
}

export interface Table {
  ref: string;
  label: Labels | Record<string, string>;
  labelPlural: Labels | Record<string, string>;
  keyField?: string;
  unique?: string[][];
  states?: Record<string, unknown>;
  postings?: Record<string, unknown>[];
  check?: Record<string, unknown>;
  keep?: { law: "tax" | "health" | "contract" | "safety" };
  occupies?: Record<string, unknown>;
  columns: Column[];
}

/** The record of a sale and its money, kept for the tax years whoever asks to be forgotten. */
const KEPT_FOR_TAX = { law: "tax" } as const;

// ── column makers ───────────────────────────────────────────────────────────

const id: Column = { ref: "id", type: "int", role: "pk" };
const opt = { nullable: true } as const;

function text(ref: string, maxLength: number, label: string, more: Partial<Column> = {}): Column {
  return { ref, type: "text", maxLength, label: l(label), ...more };
}
function int(ref: string, label: string, more: Partial<Column> = {}): Column {
  return { ref, type: "int", label: l(label), ...more };
}
function bool(ref: string, label: string, value: boolean): Column {
  return { ref, type: "bool", default: value, label: l(label) };
}
function fk(ref: string, references: string, label: string, more: Partial<Column> = {}): Column {
  return { ref, type: "fk", references, label: l(label), ...more };
}
function date(ref: string, label: string, more: Partial<Column> = {}): Column {
  return { ref, type: "date", label: l(label), ...more };
}
function at(ref: string, label: string, more: Partial<Column> = {}): Column {
  return { ref, type: "timestamptz", label: l(label), ...more };
}
function num(ref: string, scale: number, label: string, more: Partial<Column> = {}): Column {
  return { ref, type: "decimal", scale, label: l(label), ...more };
}
/** A price somebody types: the studio's, in the connection's currency. */
function price(ref: string, label: string, more: Partial<Column> = {}): Column {
  return { ref, type: "decimal", scale: "currency", label: l(label), ...more };
}
/** Money Adminium works out: empty until it has what it needs. */
function money(ref: string, label: string, rules: Record<string, unknown>): Column {
  return { ref, type: "decimal", scale: "currency", nullable: true, label: l(label), rules };
}
/** A whole number or decimal Adminium works out. */
function figure(ref: string, type: "int" | "decimal", label: string, rules: Record<string, unknown>, scale?: number): Column {
  return { ref, type, nullable: true, label: l(label), rules, ...(scale === undefined ? {} : { scale }) };
}
/** An enum, each value labelled, with tones where a list shows it as a chip. */
function choice(
  ref: string,
  label: string,
  values: Record<string, string>,
  more: Partial<Column> & { tones?: Record<string, Tone> } = {},
): Column {
  const { tones, rules, ...rest } = more;
  return {
    ref,
    type: "enum",
    enum: Object.keys(values),
    label: l(label),
    ...rest,
    rules: {
      ...rules,
      enumLabels: {
        labels: Object.fromEntries(Object.entries(values).map(([value, word]) => [value, l(word)])),
        ...(tones === undefined ? {} : { tones }),
      },
    },
  };
}
/** The add-on that keeps the public holidays a closure may come from. */
export const HOLIDAYS = "holiday-calendars";

/** A row of the Customiser's, by its key. No database link: the add-on keeps its own tables. */
function link(ref: string, table: string, label: string, rules: Record<string, unknown> = {}): Column {
  return { ref, type: "int", nullable: true, label: l(label), rules: { addOnLink: { addOn: CUSTOMISER, table }, ...rules } };
}
/** What a proof may be: the kinds and size of the Customiser's proof of a design's version (`design_versions.proof_file`), and the studio's PNG. */
export const PROOF_KINDS = ["png", "jpeg", "webp", "pdf"] as const;
export const PROOF_MAX_BYTES = 26214400;
/** A picture somebody uploads for the row, shown on the shop where an entry says so. */
function picture(ref: string, label: string): Column {
  return { ref, type: "text", maxLength: 64, nullable: true, semantic: "image", label: l(label), rules: { file: { accept: ["png", "jpeg", "webp"], maxBytes: 5242880 } } };
}
const stamp = (set: unknown, on: unknown) => ({ stamp: { set, on } });
const onCreate = "create";
const onState = (column: string, ...values: string[]) => ({ column, values });
const setting = (column: string) => ({ table: "settings", column });

// ── the words the tables share ──────────────────────────────────────────────

/** The eight languages an order or a request may be written in, by their own names. */
export const LANGUAGES: Record<string, string> = {
  "en-US": "English",
  "de-DE": "Deutsch",
  "fr-FR": "Français",
  "da-DK": "Dansk",
  "cs-CZ": "Čeština",
  "ar-EG": "العربية",
  "zh-CN": "简体中文",
  "zh-TW": "繁體中文",
};

/** A language column: the emails read their language from it. */
function language(ref: string): Column {
  return {
    ref,
    type: "text",
    maxLength: 16,
    nullable: true,
    label: l("Language"),
    rules: { options: { values: Object.entries(LANGUAGES).map(([value, label]) => ({ value, label })) } },
  };
}

/** What a product is, as the shop's filters group it. */
export const CATEGORIES: Record<string, string> = {
  coasters: "Coasters",
  signs: "Signs",
  keyrings: "Keyrings",
  pots: "Pots",
  desk: "Desk pieces",
  mugs: "Mugs",
};

/** The studio's machines, by kind: what a batch is cut, printed or fired on. */
export const MACHINE_KINDS: Record<string, string> = { laser: "Laser", printer: "3D printer", kiln: "Kiln" };

/**
 * The kinds of a product's own options. A feature is a priced customising
 * part, flat a piece. A break is the product's price off from a quantity on:
 * coasters 4, 8 and 12, a sign one at a time.
 */
export const OPTION_KINDS: Record<string, string> = { material: "Material", size: "Size", finish: "Finish", feature: "Customising feature", break: "Quantity break" };

/** Where a line is on the bench. */
export const STAGES = ["make", "making", "finishing", "ready", "posted", "cancelled"] as const;

/** A proof's answer. A proof sent again supersedes the one before it. */
export const PROOF_STATES = ["sent", "approved", "change_asked", "superseded"] as const;

/** How stock moves. A count says what is on the shelf; the rest move it by an amount. */
export const MOVEMENT_KINDS: Record<string, string> = {
  received: "Received",
  used: "Used",
  spoiled: "Spoiled",
  committed: "Committed to a batch",
  released: "Released from a batch",
  count: "Counted",
};

const LINE_STAGE_LABELS: Record<string, string> = {
  make: "To make",
  making: "Making",
  finishing: "Finishing",
  ready: "Ready",
  posted: "Posted",
  cancelled: "Cancelled",
};

const ORDER_STATUSES: Record<string, string> = {
  placed: "Placed",
  making: "Making",
  ready: "Ready to post",
  posted: "Posted",
  cancelled: "Cancelled",
};

// ── formulas ────────────────────────────────────────────────────────────────

/** An option's quantity as a break: only an offered break has one (an empty `div` is no value). */
const BREAK_FROM = { if: [{ and: [{ eq: ["kind", "break"] }, { eq: ["active", true] }] }, "min_qty", { div: [0, 0] }] };
/** A line's price of one, before the break: the product's price and its options' differences. */
const BASE_EACH = {
  add: ["unit_price", { coalesce: ["material_delta", 0] }, { coalesce: ["size_delta", 0] }, { coalesce: ["finish_delta", 0] }],
};
/** The price of one after the product's quantity break, to the penny: £34 at 8 % off is £31.28. */
const EACH = { round: [{ div: [{ mul: ["base_each", { sub: [100, { coalesce: ["percent_off", 0] }] }] }, 100] }, 2] };
/** Customising features are flat a piece, never broken: "+£1.50 a piece" on a set of four is £6.00 a set. */
const FEATURES_TOTAL = { mul: [{ coalesce: ["features_each", 0] }, "pieces"] };
const LINE_TOTAL = { add: [{ mul: ["each", "qty"] }, { coalesce: ["features_total", 0] }] };
/** A unit's price with its features: the features a piece times the pieces a unit, so `qty` times it is the line total exactly. */
const EACH_WITH_FEATURES = { add: ["each", { mul: [{ coalesce: ["features_each", 0] }, { coalesce: ["pieces_per_unit", 1] }] }] };
/**
 * Whether a line may go to the bench: one with nothing on it to proof goes;
 * one with words or a design goes once its latest proof is approved.
 */
const PROOF_OK = {
  if: [{ and: [{ isNull: "lettering" }, { isNull: "design_id" }] }, 1, { if: [{ eq: ["proof_state", "approved"] }, 1, 0] }],
};
/** A count sets what is on the shelf: its change is what was counted less what the shelf held. */
const ON_HAND_CHANGE = {
  if: [
    { eq: ["kind", "received"] },
    "qty",
    {
      if: [
        { eq: ["kind", "used"] },
        { sub: [0, "qty"] },
        {
          if: [
            // A spoil takes what the spoiled pieces took: an amount typed, or so many units of the line's product.
            { eq: ["kind", "spoiled"] },
            { sub: [0, { coalesce: ["qty", { mul: [{ coalesce: ["units", 0] }, { coalesce: ["per_unit", 0] }] }] }] },
            { if: [{ eq: ["kind", "count"] }, { sub: ["counted", { coalesce: ["on_hand_before", 0] }] }, 0] },
          ],
        },
      ],
    },
  ],
};
const COMMITTED_CHANGE = { if: [{ eq: ["kind", "committed"] }, "qty", { if: [{ eq: ["kind", "released"] }, { sub: [0, "qty"] }, 0] }] };

/**
 * With Inventory keeping the stock (the feature `stock`), what a batch's
 * sheets and a spoil take off the shelf is used from Inventory too, in the
 * same save: the material is the row Inventory links to its item. A delivery
 * and a count are Inventory's own to record on its own pages.
 */
const STOCK_POSTINGS = [
  {
    id: "used",
    into: { addOn: "inventory", ledger: "stock", action: "use" },
    needs: "stock",
    post: { on: { create: true } },
    only: { column: "kind", eq: "used" },
    map: { what: "material_id", quantity: "taken", kind: { value: "used" } },
  },
  {
    id: "spoiled",
    into: { addOn: "inventory", ledger: "stock", action: "use" },
    needs: "stock",
    post: { on: { create: true } },
    only: { column: "kind", eq: "spoiled" },
    map: { what: "material_id", quantity: "taken", kind: { value: "written_off" } },
  },
];

// ── the tables ──────────────────────────────────────────────────────────────

export const TABLES: Table[] = [
  {
    ref: "settings",
    label: l("Studio settings"),
    labelPlural: l("Studio settings"),
    keyField: "studio_name",
    columns: [
      id,
      text("studio_name", 80, "Studio name"),
      // A business's own address, phone and e-mail, shown on its shop: not a person's.
      text("address", 160, "Address", { ...opt, rules: { personal: false } }),
      text("phone", 32, "Phone", { ...opt, rules: { personal: false, validation: { format: "phone" } } }),
      text("email", 254, "Studio e-mail", { ...opt, rules: { personal: false, validation: { format: "email" } } }),
      text("about", 400, "About the studio", opt),
      // The shop's About page in the studio's own words, a blank line between paragraphs, and its note on the materials.
      text("about_page", 1000, "About page", opt),
      text("materials_note", 600, "A word about the materials", opt),
      // The order number: its prefix and the first number of the series.
      text("ref_prefix", 8, "Order number prefix", { default: "BR-" }),
      int("first_order_number", "First order number", { default: 1001, rules: { validation: { min: 1 } } }),
      // A proof waiting this many studio days is worth a reminder.
      int("proof_reminder_days", "Remind about a proof after (days)", { default: 3, rules: { validation: { min: 1, max: 30 } } }),
      // What the box and its packing weigh, added to every parcel.
      int("packaging_grams", "Packing weight (g)", { default: 120, rules: { validation: { min: 0, max: 5000 } } }),
      bool("taking_orders", "Taking orders", true),
    ],
  },
  {
    ref: "machines",
    label: l("Machine"),
    labelPlural: l("Machines"),
    keyField: "name",
    columns: [
      id,
      text("code", 32, "Code", { unique: true }),
      text("name", 80, "Name"),
      choice("kind", "Kind", MACHINE_KINDS),
      text("detail", 120, "Detail", opt),
      text("icon", 32, "Icon", opt),
      // How long one sheet, one print or one firing keeps the machine: what a batch books it for, a sheet at a time.
      int("run_minutes", "A run takes (min)", { default: 60, rules: { validation: { min: 1, max: 1440 } } }),
      // What the cut list tells the bench: the machine's power and its settings for a run, as the studio writes them.
      text("power", 16, "Power", opt),
      text("cut_settings", 120, "Cut settings", opt),
      text("engrave_settings", 120, "Engrave settings", opt),
      text("air_settings", 120, "Air", opt),
      // What the machine does, in a sentence for the shop's About page: a machine without one is not shown there.
      text("shop_note", 200, "What it does, on the About page", opt),
      bool("active", "In use", true),
      int("position", "Position", opt),
    ],
  },
  {
    ref: "materials",
    label: l("Material"),
    labelPlural: l("Materials"),
    keyField: "name",
    columns: [
      id,
      text("code", 32, "Code", { unique: true }),
      text("name", 80, "Name"),
      // Walnut, ply, slate, PLA: what the product page and the care notes call it.
      text("family", 32, "Material"),
      choice("group", "Kind of stock", { sheet: "Sheet stock", blank: "Blanks", filament: "Filament", glaze: "Glaze" }),
      num("thickness_mm", 1, "Thickness (mm)", opt),
      text("size_note", 80, "Size", opt),
      // A sheet's size: what the batch sheet packs its pieces onto.
      int("sheet_w_mm", "Sheet width (mm)", { ...opt, rules: { validation: { min: 1, max: 5000 } } }),
      int("sheet_h_mm", "Sheet height (mm)", { ...opt, rules: { validation: { min: 1, max: 5000 } } }),
      choice("unit", "Counted in", { sheets: "Sheets", blanks: "Blanks", g: "Grams", tubs: "Tubs" }),
      fk("machine_id", "machines", "Machine", opt),
      text("tint", 16, "Tint", opt),
      // What is on the shelf and what batches have spoken for: from the stock movements.
      figure("on_hand", "decimal", "On hand", { rollup: { from: "stock_movements", via: "material_id", sum: "on_hand_change" } }, 2),
      figure("committed", "decimal", "Committed", { rollup: { from: "stock_movements", via: "material_id", sum: "committed_change" } }, 2),
      figure("available", "decimal", "Available", { formula: { sub: [{ coalesce: ["on_hand", 0] }, { coalesce: ["committed", 0] }] } }, 2),
      num("reorder_at", 2, "Reorder at", opt),
      num("cost", 4, "Cost a unit", opt),
      text("care", 600, "Looking after it", opt),
      bool("active", "In use", true),
      int("position", "Position", opt),
    ],
  },
  {
    ref: "products",
    label: l("Product"),
    labelPlural: l("Products"),
    keyField: "name",
    columns: [
      id,
      text("code", 32, "Code", { unique: true }),
      text("name", 80, "Name"),
      choice("category", "Category", CATEGORIES),
      text("unit", 32, "Sold as"),
      // A set of four coasters is four pieces: a customising feature is priced a piece.
      int("pieces", "Pieces a unit", { default: 1, rules: { validation: { min: 1, max: 100 } } }),
      price("price", "Price", { rules: { validation: { min: 0 } } }),
      // Studio days from the order coming in to the piece going in the post.
      int("lead_days", "Lead (studio days)", { default: 3, rules: { validation: { min: 0, max: 60 } } }),
      choice("machine_kind", "Made on", MACHINE_KINDS),
      fk("material_id", "materials", "Material", opt),
      int("grams", "Weight a unit (g)", { default: 100, rules: { validation: { min: 0, max: 30000 } } }),
      // How much of its material one unit takes, in the material's own unit: a share of a sheet, one blank, grams of filament.
      num("stock_per_unit", 3, "Stock a unit takes", { ...opt, rules: { validation: { min: 0, max: 100000 } } }),
      text("size_text", 64, "Size", opt),
      int("width_mm", "Width (mm)", opt),
      int("height_mm", "Height (mm)", opt),
      text("finish_label", 32, "The finish is called", opt),
      text("made_from", 400, "Made from", opt),
      text("finished_with", 400, "Finished with", opt),
      text("care", 400, "Care", opt),
      text("icon", 32, "Icon", opt),
      picture("photo", "Photo"),
      // Words on a plain piece: whether it takes them, how many, and what the shopper is told.
      bool("takes_lettering", "Takes lettering", false),
      int("lettering_limit", "Lettering up to (characters)", { ...opt, rules: { validation: { min: 1, max: 80 } } }),
      text("lettering_prompt", 120, "Lettering prompt", opt),
      text("lettering_hint", 400, "Lettering hint", opt),
      // The Customiser's base this product is made on: set, the product page opens "Customise".
      link("base_id", "bases", "Customiser base"),
      bool("published", "In the shop", true),
      int("position", "Position", opt),
    ],
  },
  {
    // One table for every option of a product: its materials, sizes, finishes, priced customising features and quantity breaks.
    ref: "options",
    label: l("Option"),
    labelPlural: l("Options"),
    keyField: "name",
    unique: [["product_id", "kind", "code"]],
    columns: [
      id,
      fk("product_id", "products", "Product"),
      choice("kind", "Kind", OPTION_KINDS),
      text("code", 32, "Code", { rules: { normalize: "trim" } }),
      text("name", 80, "Name"),
      // A material, size or finish: the difference to the product's price. A feature: its price a piece.
      price("price", "Price", { default: 0 }),
      fk("material_id", "materials", "Material", opt),
      text("swatch", 16, "Swatch", opt),
      // A feature names the Customiser's feature it pays for, by its code, which the design check compares.
      text("feature_code", 40, "Feature code", { ...opt, rules: { requiredWhen: { column: "kind", in: ["feature"] } } }),
      link("feature_id", "features", "Customiser feature"),
      // A break: from how many, and the percentage off.
      int("min_qty", "From (quantity)", { ...opt, rules: { validation: { min: 1, max: 1000 }, requiredWhen: { column: "kind", in: ["break"] } } }),
      num("percent_off", 2, "Off (%)", { ...opt, rules: { validation: { min: 0, max: 90 } } }),
      bool("active", "Offered", true),
      // Where a line's quantity break is picked from: an offered break's quantity, and empty on any other option (one
      // switched off, or a material, size, finish or feature with a quantity typed on it), so the band never picks it.
      figure("break_from", "int", "Break picked from (quantity)", { formula: BREAK_FROM }),
      int("position", "Position", opt),
    ],
  },
  {
    ref: "postage_services",
    label: l("Postage service"),
    labelPlural: l("Postage services"),
    keyField: "name",
    columns: [
      id,
      text("code", 32, "Code", { unique: true }),
      text("name", 80, "Name"),
      text("detail", 160, "What it says", opt),
      bool("tracked", "Tracked", false),
      // The DHL product this service books when DHL shipping is on.
      text("dhl_product", 32, "DHL product", opt),
      bool("active", "Offered", true),
      int("position", "Position", opt),
    ],
  },
  {
    ref: "postage_rates",
    label: l("Postage rate"),
    labelPlural: l("Postage rates"),
    keyField: "min_grams",
    unique: [["service_id", "min_grams"]],
    columns: [
      id,
      fk("service_id", "postage_services", "Service"),
      int("min_grams", "From (g)", { default: 0, rules: { validation: { min: 0 } } }),
      int("max_grams", "Up to (g)", { ...opt, rules: { validation: { min: 0 } } }),
      price("price", "Price", { rules: { validation: { min: 0 } } }),
    ],
  },
  {
    ref: "closures",
    label: l("Closure"),
    labelPlural: l("Closures"),
    keyField: "reason",
    columns: [
      id,
      // The public holiday from Holiday calendars this closure was added for ("Add as a closure" in the studio
      // writes its day and name in; they stay the studio's to change).
      { ref: "holiday_id", type: "int", nullable: true, label: l("Public holiday"), rules: { addOnLink: { addOn: HOLIDAYS, table: "holidays" } } },
      date("from_date", "From"),
      date("to_date", "To"),
      text("reason", 120, "Reason", opt),
      // Switched off, a closure is kept but no longer closes the studio.
      bool("active", "In effect", true),
    ],
  },
  {
    ref: "customers",
    label: l("Customer"),
    labelPlural: l("Customers"),
    keyField: "email",
    columns: [
      id,
      text("email", 254, "E-mail", { ...opt, unique: true, semantic: "email", rules: { normalize: "email", validation: { format: "email" } } }),
      text("name", 80, "Name", opt),
      language("language"),
      // "News from the workshop": kept in step with Adminium's consent log, set by the tick at checkout.
      bool("may_email", "News from the workshop", false),
      at("forgotten_at", "Details deleted", opt),
      at("created_at", "First order", { ...opt, rules: stamp("now", onCreate) }),
      // What the studio's Customers screen shows of them: how many orders, and what they were charged in all. A
      // cancelled order is neither: it is left out from the moment it is cancelled (`cancelled_at` is stamped then).
      figure("order_count", "int", "Orders", { rollup: { from: "orders", via: "customer_id", count: true, unlessSet: "cancelled_at" } }),
      money("spent", "Charged in all", { rollup: { from: "orders", via: "customer_id", sum: "total", unlessSet: "cancelled_at" } }),
    ],
  },
  {
    ref: "orders",
    keep: KEPT_FOR_TAX,
    label: l("Order"),
    labelPlural: l("Orders"),
    keyField: "number",
    states: {
      column: "status",
      initial: "placed",
      moves: {
        placed: ["making", "cancelled"],
        making: ["ready", "cancelled"],
        ready: ["posted", "making"],
      },
      lock: { when: ["posted", "cancelled"], except: ["link_stopped", "tracking"] },
    },
    columns: [
      id,
      int("number_seq", "Number (running)", { ...opt, rules: { sequence: { gapless: true, startSetting: setting("first_order_number") } } }),
      text("number", 16, "Number", { ...opt, unique: true, rules: { format: { from: "number_seq", prefixSetting: setting("ref_prefix") } } }),
      // The number as a typed code is read: what "Something's wrong" finds the order by.
      text("number_code", 16, "Number as typed", { ...opt, unique: true, rules: { formula: { join: ["number", " "] }, normalize: "code" } }),
      choice("status", "Status", ORDER_STATUSES, {
        default: "placed",
        tones: { placed: "info", making: "warn", ready: "accent", posted: "pos", cancelled: "danger" },
      }),
      // Who it goes to: the shopper's own details, kept with the order. The address is kept trimmed and in lower
      // case, as the customer's is, so a problem typed in another case still finds the order.
      text("name", 80, "Name", { semantic: "name" }),
      text("email", 254, "E-mail", { semantic: "email", rules: { normalize: "email", validation: { format: "email" } } }),
      text("address_line1", 120, "Address"),
      text("address_line2", 120, "Address, second line", opt),
      text("town", 80, "Town"),
      text("postcode", 16, "Postcode"),
      text("note", 200, "Note for the studio", opt),
      language("language"),
      fk("customer_id", "customers", "Customer", opt),
      // The postage service the shopper picked, and its rate for the parcel's weight.
      fk("service_id", "postage_services", "Postage"),
      figure("item_count", "int", "Items", { rollup: { from: "order_lines", via: "order_id", sum: "qty" } }),
      // The parcel's weight: its pieces and the packing, as the settings say it weighs.
      figure("pieces_weight_g", "int", "Pieces' weight (g)", { rollup: { from: "order_lines", via: "order_id", sum: "weight_g" } }),
      figure("packing_g", "int", "Packing (g)", { default: { from: setting("packaging_grams") } }),
      figure("weight_g", "int", "Weight (g)", { formula: { add: [{ coalesce: ["pieces_weight_g", 0] }, { coalesce: ["packing_g", 0] }] } }),
      fk("postage_rate_id", "postage_rates", "Postage rate", {
        ...opt,
        rules: { band: { table: "postage_rates", min: "min_grams", max: "max_grams", value: "weight_g", scope: [{ column: "service_id", equals: "service_id" }], over: "refuse" } },
      }),
      money("postage", "Postage", { copy: { via: "postage_rate_id", from: "price", mode: "always" } }),
      money("pieces_total", "Pieces", { rollup: { from: "order_lines", via: "order_id", sum: "line_total" } }),
      money("total", "Total", { formula: { add: [{ coalesce: ["pieces_total", 0] }, { coalesce: ["postage", 0] }] } }),
      // The studio's prices include any tax: nothing is added on top. Kept as a figure so a receipt says so, and
      // never reads the postage as tax.
      money("tax", "Tax", { formula: { mul: [{ coalesce: ["total", 0] }, 0] } }),
      at("placed_at", "Placed", { ...opt, rules: stamp("now", onCreate) }),
      // The day the last of its pieces goes in the post: its latest line's.
      date("post_by", "Post by", { ...opt, rules: { rollup: { from: "order_lines", via: "order_id", latest: { of: "post_by", by: "post_by" } } } }),
      at("posted_at", "Posted", { ...opt, rules: stamp("now", onState("status", "posted")) }),
      text("posted_by", 80, "Posted by", { ...opt, rules: stamp("user-name", onState("status", "posted")) }),
      // A tracking number comes only through DHL; without it the order says the service it went by.
      text("tracking", 64, "Tracking number", opt),
      at("cancelled_at", "Cancelled", { ...opt, rules: stamp("now", onState("status", "cancelled")) }),
      text("cancel_reason", 160, "Why it was cancelled", opt),
      // The order's own link, e-mailed to the shopper: no staff screen reads or copies it.
      text("link_token", 16, "Link code", { ...opt, rules: { code: { length: 16, hiddenFromStaff: true } } }),
      // The link works for a year after the order.
      at("link_expires", "Link works until", { ...opt, rules: stamp({ moment: { column: "placed_at", plus: { days: 365 } } }, { columns: ["placed_at"] }) }),
      bool("link_stopped", "Link stopped", false),
      // The shopper's retry key: a retried order lands on the same row.
      text("client_key", 64, "Retry key", { ...opt, unique: true }),
      // The tick the shopper gave at checkout: theirs, written by nobody else.
      bool("may_email", "News from the workshop", false),
    ],
  },
  {
    ref: "order_lines",
    keep: KEPT_FOR_TAX,
    label: l("Order line"),
    labelPlural: l("Order lines"),
    keyField: "product_name",
    states: {
      column: "stage",
      initial: "make",
      moves: {
        // A line with words or a design goes to the bench only once its proof is approved.
        make: [{ to: "making", requires: { where: [{ column: "proof_ok", eq: 1 }] } }, "cancelled"],
        making: ["finishing", "ready", { to: "make", roles: ["owner", "maker"] }],
        finishing: ["ready", { to: "make", roles: ["owner", "maker"] }],
        ready: ["posted", { to: "make", roles: ["owner", "maker"] }],
      },
    },
    check: { by: { addOn: CUSTOMISER }, design: "design_id", paid: { table: "order_line_features", via: "line_id", feature: "feature" } },
    postings: [DESIGN_POSTING],
    columns: [
      id,
      fk("order_id", "orders", "Order", { index: true }),
      // The order's customer, so the words on the line are found with them (people.ts).
      fk("customer_id", "customers", "Customer", { ...opt, rules: { copy: { via: "order_id", from: "customer_id", mode: "always" } } }),
      int("position", "Position", opt),
      fk("product_id", "products", "Product", { rules: { linkable: { where: [{ column: "published", eq: true }] } } }),
      text("product_name", 80, "Product name", { ...opt, rules: { copy: { via: "product_id", from: "name", mode: "always" } } }),
      int("qty", "Quantity", { default: 1, rules: { validation: { min: 1, max: 50 } } }),
      // The product's own options, each held to the line's product.
      fk("material_id", "options", "Material", { ...opt, rules: { linkable: { where: [{ column: "kind", eq: "material" }, { column: "active", eq: true }], same: [{ column: "product_id", as: "product_id" }] } } }),
      fk("size_id", "options", "Size", { ...opt, rules: { linkable: { where: [{ column: "kind", eq: "size" }, { column: "active", eq: true }], same: [{ column: "product_id", as: "product_id" }] } } }),
      fk("finish_id", "options", "Finish", { ...opt, rules: { linkable: { where: [{ column: "kind", eq: "finish" }, { column: "active", eq: true }], same: [{ column: "product_id", as: "product_id" }] } } }),
      // Words on a plain piece, as the shopper wrote them.
      text("lettering", 80, "Lettering", opt),
      // The options' names as they were when the line was made, and the line in a few words: what its e-mail lists.
      text("material_name", 80, "Material name", { ...opt, rules: { copy: { via: "material_id", from: "name", mode: "always" } } }),
      text("size_name", 80, "Size name", { ...opt, rules: { copy: { via: "size_id", from: "name", mode: "always" } } }),
      text("finish_name", 80, "Finish name", { ...opt, rules: { copy: { via: "finish_id", from: "name", mode: "always" } } }),
      text("summary", 330, "In a few words", { ...opt, rules: { formula: { join: ["material_name", " · ", "size_name", " · ", "finish_name", " · ", "lettering"] } } }),
      // A design in the Customiser, found by its code: the shopper types the code, Adminium fills the link.
      text("design_code", 40, "Design code", opt),
      link("design_id", "designs", "Design", { lookup: { from: "design_code", table: { addOn: CUSTOMISER, table: "designs" }, column: "code" } }),
      // The price, copied from the product and its options as they were when the line was made.
      { ref: "unit_price", type: "decimal", scale: "currency", nullable: true, label: l("Price"), rules: { copy: { via: "product_id", from: "price", mode: "always" } } },
      money("material_delta", "Material difference", { copy: { via: "material_id", from: "price", mode: "always" } }),
      money("size_delta", "Size difference", { copy: { via: "size_id", from: "price", mode: "always" } }),
      money("finish_delta", "Finish difference", { copy: { via: "finish_id", from: "price", mode: "always" } }),
      money("base_each", "Each before the break", { formula: BASE_EACH }),
      // The product's quantity break, picked by Adminium from the quantity.
      fk("break_id", "options", "Quantity break", {
        ...opt,
        rules: { band: { table: "options", min: "break_from", value: "qty", scope: [{ column: "product_id", equals: "product_id" }] } },
      }),
      figure("percent_off", "decimal", "Off (%)", { copy: { via: "break_id", from: "percent_off", mode: "always" } }, 2),
      money("each", "Each", { formula: EACH }),
      figure("pieces_per_unit", "int", "Pieces a unit", { copy: { via: "product_id", from: "pieces", mode: "always" } }),
      figure("pieces", "int", "Pieces", { formula: { mul: ["qty", { coalesce: ["pieces_per_unit", 1] }] } }),
      money("features_each", "Features a piece", { rollup: { from: "order_line_features", via: "line_id", sum: "price" } }),
      money("features_total", "Features", { formula: FEATURES_TOTAL }),
      money("line_total", "Line total", { formula: LINE_TOTAL }),
      // One unit with its features: what a receipt prints as "each", so its quantity times it is the line's total.
      money("each_with_features", "Each with its features", { formula: EACH_WITH_FEATURES }),
      figure("grams", "int", "Weight a unit (g)", { copy: { via: "product_id", from: "grams", mode: "always" } }),
      figure("weight_g", "int", "Weight (g)", { formula: { mul: ["qty", { coalesce: ["grams", 0] }] } }),
      // What the line takes off the shelf, in its material's unit.
      figure("stock_per_unit", "decimal", "Stock a unit takes", { copy: { via: "product_id", from: "stock_per_unit", mode: "always" } }, 3),
      figure("stock_use", "decimal", "Stock it takes", { formula: { mul: ["qty", { coalesce: ["stock_per_unit", 0] }] } }, 3),
      // When the post-by is counted from, and how many studio days the product takes.
      at("placed_at", "Placed", { ...opt, rules: { copy: { via: "order_id", from: "placed_at", mode: "always" } } }),
      figure("lead_days", "int", "Lead (studio days)", { copy: { via: "product_id", from: "lead_days", mode: "always" } }),
      date("post_by", "Post by", {
        ...opt,
        rules: stamp(
          {
            addWorkingDays: {
              from: "placed_at",
              days: "lead_days",
              weekdays: STUDIO_DAYS,
              cutoff: CUTOFF,
              closures: { table: "closures", from: "from_date", to: "to_date", active: "active" },
            },
          },
          { columns: ["placed_at", "lead_days"] },
        ),
      }),
      choice("stage", "Stage", LINE_STAGE_LABELS, {
        default: "make",
        tones: { make: "info", making: "warn", finishing: "accent", ready: "pos", posted: "neutral", cancelled: "danger" },
      }),
      // The latest proof's answer, and whether the line may go to the bench.
      choice("proof_state", "Proof", { sent: "Waiting", approved: "Approved", change_asked: "Change asked", superseded: "Sent again" }, {
        ...opt,
        rules: { rollup: { from: "proofs", via: "line_id", latest: { of: "state", by: "version" } } },
      }),
      figure("proof_ok", "int", "Ready for the bench", { formula: PROOF_OK }),
      fk("batch_id", "batches", "Batch", opt),
      // The code on a piece's label: its order's number and its place on the order, "BR-2291/1".
      text("order_number", 16, "Order number", { ...opt, rules: { copy: { via: "order_id", from: "number", mode: "always" } } }),
      text("label_code", 24, "Label code", { ...opt, rules: { formula: { join: ["order_number", "/", "position"] } } }),
      // When the line last went on the bench and into finishing: the shopper's timeline shows each.
      at("started_at", "Started", { ...opt, rules: stamp("now", onState("stage", "making")) }),
      at("finishing_at", "Into finishing", { ...opt, rules: stamp("now", onState("stage", "finishing")) }),
      at("made_at", "Made", { ...opt, rules: stamp("now", onState("stage", "ready")) }),
      text("made_by", 80, "Made by", { ...opt, rules: stamp("user-name", onState("stage", "ready")) }),
      int("spoiled", "Spoiled and remade", { default: 0, rules: { validation: { min: 0 } } }),
    ],
  },
  {
    // The priced customising features a line pays for: one a row, each a flat price a piece.
    ref: "order_line_features",
    keep: KEPT_FOR_TAX,
    label: l("Feature on a line"),
    labelPlural: l("Features on lines"),
    keyField: "feature",
    unique: [["line_id", "option_id"]],
    columns: [
      id,
      fk("line_id", "order_lines", "Order line", { index: true }),
      fk("option_id", "options", "Option", {
        rules: { linkable: { where: [{ column: "kind", eq: "feature" }, { column: "active", eq: true }], same: [{ column: "product_id", as: "line_id.product_id" }] } },
      }),
      text("feature", 40, "Feature", { ...opt, rules: { copy: { via: "option_id", from: "feature_code", mode: "always" } } }),
      // The Customiser's feature itself, for the studio's screens: a link into an add-on is a person's to name,
      // never a copy. (It is also what lets the sample's rows for the Customiser carry a line's features.)
      link("feature_id", "features", "Customiser feature"),
      text("name", 80, "Name", { ...opt, rules: { copy: { via: "option_id", from: "name", mode: "always" } } }),
      money("price", "Price a piece", { copy: { via: "option_id", from: "price", mode: "always" } }),
    ],
  },
  {
    // A proof of a line: a picture of what will be made, numbered per line. The shopper approves it or asks for a change.
    ref: "proofs",
    label: l("Proof"),
    labelPlural: l("Proofs"),
    keyField: "version",
    states: {
      column: "state",
      initial: "sent",
      moves: {
        sent: ["approved", "change_asked", "superseded"],
        change_asked: ["superseded"],
      },
    },
    columns: [
      id,
      // The order is the line's own: a proof can name no other.
      fk("order_id", "orders", "Order", { ...opt, rules: { copy: { via: "line_id", from: "order_id", mode: "always" } } }),
      fk("line_id", "order_lines", "Order line", { index: true }),
      // The line's customer, so the picture of their words and what they asked to change go with them (people.ts).
      fk("customer_id", "customers", "Customer", { ...opt, rules: { copy: { via: "line_id", from: "customer_id", mode: "always" } } }),
      int("version", "Proof", { ...opt, rules: { sequence: { gapless: true, scope: "line_id", sample: true } } }),
      choice("kind", "Drawn from", { lettering: "The lettering", design: "The Customiser design" }, { default: "lettering" }),
      // What the customer is shown: the lettering drawn here, or the Customiser's proof of the design's version copied
      // as it is, of the kinds and size that proof may be (a PDF among them, so this is a file, not a picture).
      { ref: "picture", type: "text", maxLength: 64, nullable: true, label: l("Picture"), rules: { file: { accept: [...PROOF_KINDS], maxBytes: PROOF_MAX_BYTES } } },
      // The language its order was placed in: its e-mails are written in it.
      { ...language("language"), rules: { copy: { via: "order_id", from: "language", mode: "always" } } },
      // The Customiser's version of the design this proof shows, when the line has one.
      link("design_version_id", "design_versions", "Design version"),
      text("note", 280, "Note to the customer", opt),
      choice("state", "Answer", { sent: "Waiting", approved: "Approved", change_asked: "Change asked", superseded: "Sent again" }, {
        default: "sent",
        tones: { sent: "info", approved: "pos", change_asked: "warn", superseded: "neutral" },
      }),
      // What the shopper asked to change, in their words.
      text("change_note", 400, "What to change", opt),
      at("sent_at", "Sent", { ...opt, rules: stamp("now", onCreate) }),
      text("sent_by", 80, "Sent by", { ...opt, rules: stamp("user-name", onCreate) }),
      at("answered_at", "Answered", { ...opt, rules: stamp("now", onState("state", "approved", "change_asked")) }),
      at("reminded_at", "Reminded", opt),
    ],
  },
  {
    ref: "commission_requests",
    label: l("Request"),
    labelPlural: l("Requests"),
    keyField: "ref",
    states: { column: "status", initial: "new", moves: { new: ["replied", "closed"], replied: ["closed"] } },
    columns: [
      id,
      int("ref_seq", "Reference (running)", { ...opt, rules: { sequence: { gapless: true } } }),
      text("ref", 16, "Reference", { ...opt, unique: true, rules: { format: { from: "ref_seq", prefix: "ASK-", pad: 4 } } }),
      choice("status", "Status", { new: "New", replied: "Replied", closed: "Closed" }, { default: "new", tones: { new: "info", replied: "accent", closed: "neutral" } }),
      text("name", 80, "Name", { semantic: "name" }),
      text("email", 254, "E-mail", { semantic: "email", rules: { normalize: "email", validation: { format: "email" } } }),
      language("language"),
      text("idea", 200, "What they would like"),
      // The material they named, if any, and when they need it, in their own words ("a date, or no rush").
      text("material", 32, "Material", opt),
      text("wanted_when", 80, "When they need it", opt),
      int("quantity", "How many", { ...opt, rules: { validation: { min: 1, max: 1000 } } }),
      date("wanted_by", "Wanted by", opt),
      text("budget", 80, "Budget", opt),
      text("staff_note", 400, "Studio note", opt),
      at("created_at", "Sent", { ...opt, rules: stamp("now", onCreate) }),
      text("client_key", 64, "Retry key", { ...opt, unique: true }),
    ],
  },
  {
    ref: "problem_reports",
    label: l("Problem"),
    labelPlural: l("Problems"),
    keyField: "ref",
    states: { column: "status", initial: "new", moves: { new: ["handled"] } },
    columns: [
      id,
      int("ref_seq", "Reference (running)", { ...opt, rules: { sequence: { gapless: true } } }),
      text("ref", 16, "Reference", { ...opt, unique: true, rules: { format: { from: "ref_seq", prefix: "FIX-", pad: 4 } } }),
      choice("status", "Status", { new: "New", handled: "Handled" }, { default: "new", tones: { new: "warn", handled: "neutral" } }),
      // The order it is about, as the shopper typed it: it must be one of their own orders.
      text("order_ref", 16, "Order number", opt),
      fk("order_id", "orders", "Order", {
        ...opt,
        rules: { lookup: { from: "order_ref", table: "orders", column: "number_code", scope: [{ column: "email", equals: "email" }] } },
      }),
      text("name", 80, "Name", { semantic: "name" }),
      text("email", 254, "E-mail", { semantic: "email", rules: { normalize: "email", validation: { format: "email" } } }),
      language("language"),
      choice("what", "What went wrong", { damaged: "It arrived damaged", wrong: "Something is wrong on it", late: "It has not arrived", other: "Something else", mind: "They changed their mind" }),
      text("details", 200, "What happened"),
      text("staff_note", 400, "Studio note", opt),
      at("created_at", "Sent", { ...opt, rules: stamp("now", onCreate) }),
      text("client_key", 64, "Retry key", { ...opt, unique: true }),
    ],
  },
  {
    // A batch: pieces of different orders cut, printed or fired together on one machine.
    ref: "batches",
    label: l("Batch"),
    labelPlural: l("Batches"),
    keyField: "label",
    states: { column: "state", initial: "planned", moves: { planned: ["running", "cancelled"], running: ["done"] } },
    columns: [
      id,
      text("label", 120, "Batch"),
      fk("machine_id", "machines", "Machine"),
      fk("material_id", "materials", "Material", opt),
      choice("state", "State", { planned: "Planned", running: "Running", done: "Done", cancelled: "Cancelled" }, {
        default: "planned",
        tones: { planned: "info", running: "warn", done: "pos", cancelled: "neutral" },
      }),
      num("sheets", 2, "Stock used", opt),
      figure("piece_count", "int", "Lines", { rollup: { from: "order_lines", via: "batch_id", count: true } }),
      text("note", 280, "Note", opt),
      at("started_at", "Started", { ...opt, rules: stamp("now", onState("state", "running")) }),
      text("started_by", 80, "Started by", { ...opt, rules: stamp("user-name", onState("state", "running")) }),
      at("done_at", "Done", { ...opt, rules: stamp("now", onState("state", "done")) }),
    ],
  },
  {
    ref: "machine_bookings",
    label: l("Machine booking"),
    labelPlural: l("Machine bookings"),
    keyField: "label",
    // A machine is booked by one row at a time: a booking that overlaps another on the same machine is refused.
    occupies: { resource: "machine_id", start: "starts_at", end: "ends_at" },
    columns: [
      id,
      fk("machine_id", "machines", "Machine"),
      fk("batch_id", "batches", "Batch", opt),
      choice("kind", "Kind", { run: "Run", upkeep: "Upkeep" }, { default: "run" }),
      text("label", 120, "What"),
      at("starts_at", "Starts", { rules: { venueLocal: true } }),
      at("ends_at", "Ends", { rules: { venueLocal: true } }),
      text("booked_by", 80, "Booked by", { ...opt, rules: stamp("user-name", onCreate) }),
    ],
  },
  {
    // How materials move when Inventory is not keeping them: a delivery in, a batch's use, a spoil, a count.
    ref: "stock_movements",
    label: l("Stock movement"),
    labelPlural: l("Stock movements"),
    keyField: "kind",
    postings: STOCK_POSTINGS,
    columns: [
      id,
      fk("material_id", "materials", "Material", { index: true }),
      choice("kind", "Kind", MOVEMENT_KINDS),
      num("qty", 2, "Amount", { ...opt, rules: { validation: { min: 0 } } }),
      // A count: what was on the shelf, and what the shelf was said to hold just before.
      num("counted", 2, "Counted", { ...opt, rules: { validation: { min: 0 }, requiredWhen: { column: "kind", in: ["count"] } } }),
      // A spoil: how many units of the line's product went wrong, and what one unit takes of the material.
      int("units", "Units spoiled", { ...opt, rules: { validation: { min: 1, max: 1000 } } }),
      figure("per_unit", "decimal", "Stock a unit takes", { copy: { via: "line_id", from: "stock_per_unit", mode: "always" } }, 3),
      figure("on_hand_before", "decimal", "On hand before", { copy: { via: "material_id", from: "on_hand", mode: "always" } }, 2),
      figure("on_hand_change", "decimal", "Change on hand", { formula: ON_HAND_CHANGE }, 2),
      figure("committed_change", "decimal", "Change committed", { formula: COMMITTED_CHANGE }, 2),
      // What a batch's sheets or a spoil took off the shelf, as an amount: what Inventory is told was used.
      figure("taken", "decimal", "Taken off the shelf", { formula: { sub: [0, { coalesce: ["on_hand_change", 0] }] } }, 3),
      fk("batch_id", "batches", "Batch", opt),
      fk("line_id", "order_lines", "Order line", opt),
      text("note", 200, "Note", opt),
      at("made_at", "When", { ...opt, rules: stamp("now", onCreate) }),
      text("made_by", 80, "By", { ...opt, rules: stamp("user-name", onCreate) }),
    ],
  },
  {
    ref: "messages",
    label: l("E-mail"),
    labelPlural: l("E-mails"),
    keyField: "kind",
    columns: [
      id,
      choice("kind", "Kind", KIND_NAMES),
      choice("status", "Status", { queued: "Going out", sent: "Sent", failed: "Not sent", skipped: "Skipped" }, {
        default: "queued",
        tones: { queued: "info", sent: "pos", failed: "danger", skipped: "neutral" },
      }),
      text("to_address", 254, "Sent to", { ...opt, semantic: "email" }),
      text("language", 16, "Language", opt),
      fk("order_id", "orders", "Order", opt),
      fk("proof_id", "proofs", "Proof", opt),
      fk("request_id", "commission_requests", "Request", opt),
      fk("problem_id", "problem_reports", "Problem", opt),
      fk("customer_id", "customers", "Customer", opt),
      at("due", "Due", opt),
      at("created_at", "Created", { ...opt, rules: stamp("now", onCreate) }),
      at("sent_at", "Sent", opt),
      text("error", 500, "What went wrong", opt),
      text("repeat_key", 64, "Resend key", opt),
      choice("skip_reason", "Why it was skipped", {
        overtaken: "A later e-mail took its place",
        paid: "Paid",
        void: "Void",
        "no-longer-needed": "No longer needed",
        "by-hand": "Skipped by hand",
      }, opt),
    ],
  },
];

export const TABLE_REFS = TABLES.map((t) => t.ref);
