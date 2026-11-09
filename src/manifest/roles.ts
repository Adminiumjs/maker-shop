/**
 * Who may do what, enforced by Adminium on every read and write.
 *
 *   owner    everything: the dashboard section, the catalogue and its prices,
 *            the settings, the customers, the e-mails; the studio's own
 *            screens; the Customiser's set-up page (what shoppers make their
 *            own); Holiday calendars' closed days (its settings); and
 *            finding and erasing a customer (Studio → Privacy).
 *   maker    the studio's screens, never the dashboard: the board and the
 *            orders' lines, the proofs (send one, remind, send again: the
 *            one before is answered by Adminium),
 *            batches, machine bookings and the stock, and a product's
 *            lettering settings. Never a price, a customer or the settings.
 *   packer   the studio's screens: the orders ready to post, marking them
 *            posted with a tracking number. Nothing else changes.
 *
 * Every role reads the Customiser's rows its work needs. The Customiser's
 * panels open for the roles below (`ROLE_PANELS`): an order line's design for
 * the owner and the maker, a product's base for the owner, drawn on the
 * studio's own screens (and on the dashboard's record pages for the owner).
 * Those roles read what the panel draws a design from and write what it
 * makes: a design's version, its proof, the machine's files. The packer reads
 * only whether a line names a design.
 *
 * The screens show or hide a button by the role, but the grants and limits
 * below are what refuse the write: a hidden button is not a lock.
 */
import { PAGE_REFS, STUDIO_PAGES } from "./pages.ts";
import { ROLE_PANELS } from "./panels.ts";
import { CUSTOMISER } from "./postings.ts";
import { HOLIDAYS, TABLE_REFS, TABLES } from "./tables.ts";

const grant = (table: string, ...actions: string[]) => actions.map((action) => `table:@${table}:${action}`);
const view = (page: string) => `page:@${page}:view`;
/** Seeing a table's personal columns. */
const pii = (table: string) => `table:@${table}:read_pii`;

/**
 * What the Customiser's panel on an order line reads to draw the design as it
 * will be made (its ready-made design and parts, the base's areas and pieces,
 * the palettes, colours and fonts, the priced features), and what it writes
 * when the proof and the machine's files are made: a version of the design
 * where none was ordered yet, the proof file on it, and the files of the
 * version, the old ones taken away when they are made again. The shopper's
 * words, logo and photo are the design's personal columns, read in clear
 * (`read_pii`). The panel makes them in the browser and saves them as the
 * person signed in (the Customiser's README, "What an app's role needs").
 */
const CUSTOMISER_PANEL = [
  { addOn: CUSTOMISER, table: "designs", actions: ["read", "read_pii"] },
  {
    addOn: CUSTOMISER,
    table: "design_versions",
    actions: ["read", "read_pii", "create", "update"],
    limit: { creatable: ["app", "design_id", "version", "values"], writable: ["proof_file"] },
  },
  {
    addOn: CUSTOMISER,
    table: "version_files",
    actions: ["read", "create", "update", "delete"],
    limit: { creatable: ["app", "version_id", "kind", "name", "about", "layers", "left_out", "position"], writable: ["file"] },
  },
  { addOn: CUSTOMISER, table: "bases", actions: ["read"] },
  { addOn: CUSTOMISER, table: "ready_designs", actions: ["read"] },
  { addOn: CUSTOMISER, table: "ready_parts", actions: ["read"] },
  { addOn: CUSTOMISER, table: "base_areas", actions: ["read"] },
  { addOn: CUSTOMISER, table: "base_pieces", actions: ["read"] },
  { addOn: CUSTOMISER, table: "palettes", actions: ["read"] },
  { addOn: CUSTOMISER, table: "palette_colours", actions: ["read"] },
  { addOn: CUSTOMISER, table: "fonts", actions: ["read"] },
  { addOn: CUSTOMISER, table: "features", actions: ["read"] },
  // The shop's one-colour line: the proof draws a one-colour logo at the line the shopper saw it at.
  { addOn: CUSTOMISER, table: "settings", actions: ["read"] },
];

/**
 * The Customiser's set-up page (`/add-ons/customiser/customiser`): a starter
 * font nobody uploaded is read from the file the add-on ships beside that
 * page, so whoever makes the machine's files holds it, the maker on the
 * studio's screens included.
 */
const CUSTOMISER_SETUP_PAGE = view("customiser");

/**
 * The set-up's own tables, each with the columns its rows are given and
 * changed by: every one the Customiser lets an app's role write there
 * (`appGrants`), the add-on's `app` only on a new row. Named in full, so the
 * install cuts nothing and says nothing was cut.
 */
export const SET_UP_COLUMNS: Record<string, string[]> = {
  bases: ["name", "kind", "width_mm", "height_mm", "depth_mm", "corner_mm", "bleed_mm", "safe_mm", "sides", "back_feature_id", "material", "thickness_mm", "outline_file", "model_file", "print_file", "faces", "offered", "state", "position"],
  base_pieces: ["base_id", "code", "name", "width_mm", "height_mm", "layers", "left_out", "file", "position"],
  base_areas: ["base_id", "code", "name", "side", "piece_id", "face", "shape", "x_mm", "y_mm", "w_mm", "h_mm", "takes", "required", "rules", "feature_id", "position"],
  ready_designs: ["base_id", "name", "tags", "layouts", "state", "preview_file", "position"],
  ready_parts: ["ready_design_id", "code", "name", "kind", "locked", "required", "side", "layout", "area_id", "piece_id", "x_mm", "y_mm", "w_mm", "h_mm", "rules", "value", "feature_id", "position"],
  fonts: ["family", "name", "style", "weights", "licence", "starter", "smallest_mm", "file", "active"],
  palettes: ["ready_design_id", "kind", "code", "name", "position"],
  palette_colours: ["palette_id", "code", "role", "name", "hex", "position"],
  features: ["code", "name", "active"],
};

/** The Customiser's name for this app's rows: its `app` column on every set-up row the shop makes. */
const OWN_APP = "maker";

/**
 * Which of the set-up's rows the owner changes and removes: the shop's own.
 * Another shop app on the same Adminium keeps its own bases and designs in
 * the same tables; its rows are read (the panels draw from every row) and
 * never changed from here. A new row is given this app's name and no other.
 */
const OWN_ROWS = { reach: "all", while: { column: "app", in: [OWN_APP] } } as const;
/**
 * The set-up rows no app names: the Customiser's starter fonts (`app` empty),
 * whose files the set-up page uploads the first time it is opened, so the
 * owner changes every font row. Kept apart, so the font grant follows the
 * Customiser's own word on shared rows.
 */
const SHARED_ROWS = new Set(["fonts"]);

/**
 * What the owner sets the shop's side up with on that page (Customiser
 * 1.0.21, its README's "The set-up page"): the Customiser's settings read,
 * the bases added and changed (a base is never removed), and the pieces,
 * areas, ready-made designs and their parts, fonts, palettes, colours and
 * priced features added, changed and removed, the shop's own rows only. With
 * the line's panel (the designs read in clear, a version's proof and its
 * files) it is thirteen of a role's 24 add-on tables. The Customiser's
 * settings themselves stay its own designer's to change.
 */
const CUSTOMISER_SET_UP = CUSTOMISER_PANEL.map((entry) => {
  const columns = SET_UP_COLUMNS[entry.table];
  if (columns === undefined) return entry;
  const actions = entry.table === "bases" ? ["read", "create", "update"] : ["read", "create", "update", "delete"];
  const rows = SHARED_ROWS.has(entry.table) ? {} : { rows: Object.fromEntries(actions.filter((a) => a === "update" || a === "delete").map((a) => [a, OWN_ROWS])) };
  return { ...entry, actions, limit: { creatable: ["app", ...columns], creatableValues: { app: [OWN_APP] }, writable: columns, ...rows } };
});

/** Finding a customer and erasing what the studio keeps of them (Studio → Privacy): the owner's, never a screens-only role's. */
const ERASE_PEOPLE = "privacy:@:people";

/** Columns Adminium decides: nobody writes them, whatever their role. */
const decided = (ref: string): Set<string> =>
  new Set(
    TABLES.find((t) => t.ref === ref)!
      .columns.filter((c) => {
        const rules = c.rules ?? {};
        return c.ref === "id" || ["rollup", "formula", "copy", "band", "stamp", "sequence", "format", "code", "lookup"].some((rule) => rules[rule] !== undefined);
      })
      .map((c) => c.ref),
  );
const typed = (ref: string, ...leaveOut: string[]): string[] =>
  TABLES.find((t) => t.ref === ref)!
    .columns.map((c) => c.ref)
    .filter((c) => !decided(ref).has(c) && !leaveOut.includes(c));

/** What only the shopper gives, on their own order: the tick for the studio's news. */
export const SHOPPERS_OWN = ["may_email", "link_token", "client_key"];

/** A product's lettering settings: the maker's to change. */
const LETTERING = ["takes_lettering", "lettering_limit", "lettering_prompt", "lettering_hint"];

const STUDIO_READS = [
  "settings",
  "machines",
  "materials",
  "products",
  "options",
  "postage_services",
  "postage_rates",
  "closures",
  "orders",
  "order_lines",
  "order_line_features",
  "proofs",
  "batches",
  "machine_bookings",
  "stock_movements",
];

export { ROLE_PANELS };

export const ROLES = [
  {
    key: "owner",
    name: "Owner",
    permissions: [
      "app:@:staff",
      ...TABLE_REFS.flatMap((table) =>
        // The e-mails are the studio's record of what was sent: nobody deletes from it.
        table === "messages" ? grant(table, "read", "create", "update") : grant(table, "read", "create", "update", "delete"),
      ),
      ...PAGE_REFS.flatMap((page) => [view(page), `page:@${page}:edit`]),
      ...["orders", "customers", "commission_requests", "problem_reports", "messages"].map(pii),
      ...ROLE_PANELS["owner"]!.map(view),
      CUSTOMISER_SETUP_PAGE,
      ERASE_PEOPLE,
      // Holiday calendars' one setting, the days the studio is closed: the owner's to keep, not only an administrator's.
      `addOn:${HOLIDAYS}:settings`,
    ],
    limits: {
      orders: { writable: typed("orders", ...SHOPPERS_OWN), creatable: typed("orders", ...SHOPPERS_OWN) },
    },
    // The public holidays Holiday calendars keeps, read to add one as a closure.
    tables: [...CUSTOMISER_SET_UP, { addOn: HOLIDAYS, table: "holidays", actions: ["read"] }],
  },
  {
    key: "maker",
    name: "Maker",
    screensOnly: true,
    permissions: [
      "app:@:staff",
      ...STUDIO_READS.flatMap((table) => grant(table, "read")),
      pii("orders"),
      ...grant("orders", "update"),
      ...grant("order_lines", "update"),
      ...grant("proofs", "create", "update"),
      ...grant("products", "update"),
      ...grant("batches", "create", "update"),
      ...grant("machine_bookings", "create", "update", "delete"),
      ...grant("stock_movements", "create"),
      ...STUDIO_PAGES.map(view),
      ...ROLE_PANELS["maker"]!.map(view),
      CUSTOMISER_SETUP_PAGE,
    ],
    limits: {
      // The order moves along the bench; nothing of the shopper's or its money.
      orders: { writable: ["status"], writableValues: { status: ["making", "ready"] } },
      order_lines: { writable: ["stage", "batch_id", "spoiled"], writableValues: { stage: ["make", "making", "finishing", "ready"] } },
      // A proof: the line (its order is the line's), its picture, the note and the design version it shows; a reminder.
      // Sent again, the one before is answered by Adminium (`states.supersedes`): no role moves a proof's answer.
      proofs: {
        creatable: ["line_id", "kind", "picture", "design_version_id", "note"],
        writable: ["reminded_at"],
      },
      products: { writable: LETTERING },
      stock_movements: { creatable: ["material_id", "kind", "qty", "counted", "units", "batch_id", "line_id", "note"] },
    },
    tables: CUSTOMISER_PANEL,
  },
  {
    key: "packer",
    name: "Packer",
    screensOnly: true,
    permissions: [
      "app:@:staff",
      ...["settings", "products", "options", "postage_services", "postage_rates", "orders", "order_lines", "order_line_features"].flatMap((table) => grant(table, "read")),
      pii("orders"),
      ...grant("orders", "update"),
      ...grant("order_lines", "update"),
      view("maker-orders"),
    ],
    limits: {
      orders: { writable: ["status", "tracking"], writableValues: { status: ["posted"] }, writableFrom: { status: ["ready"] } },
      order_lines: { writable: ["stage"], writableValues: { stage: ["posted"] }, writableFrom: { stage: ["ready"] } },
    },
    tables: [{ addOn: CUSTOMISER, table: "designs", actions: ["read"] }],
  },
];
