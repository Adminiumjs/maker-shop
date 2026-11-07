/**
 * `manifest.json`, assembled from the modules beside this file.
 *
 * The manifest is what Adminium installs: the tables and their rules, the
 * pages, the roles, the shop's doors, the e-mails, the add-ons. It is
 * written from typed modules rather than by hand because it is long and says
 * many things more than once; the modules say each thing once. The file
 * itself is still the product's input, checked in, and
 * `manifest-drift.test.ts` fails when it and the modules disagree
 * (`npm run manifest` writes it again).
 */
import { ADD_ONS } from "./add-ons.ts";
import { DOCUMENTS } from "./documents.ts";
import { emailTemplates } from "./emails.ts";
import { KINDS, OUTBOX } from "./outbox.ts";
import { NAV_GROUPS, pages } from "./pages.ts";
import { PEOPLE } from "./people.ts";
import { PUBLIC_ACCESS, PUBLIC_KEYS } from "./public.ts";
import { ROLES } from "./roles.ts";
import { SETTINGS } from "./settings.ts";
import { TABLES } from "./tables.ts";

export const VERSION = "0.2.1";

/**
 * The Adminium release that first reads everything below: quantity breaks
 * and postage rates picked by band, post-by dates in studio days, the
 * Customiser's design checked and snapshotted by an order line, its copies
 * of a person and its panels on a record; a role's grant of those panels
 * (opened to a role that sees only the app's screens), a lettering held to
 * its product's limit, a person's copies in the versions of their designs,
 * a proof's picture in its e-mail; and a role's personal-column read and
 * delete on the Customiser's tables, more than twelve of them, and the
 * owner's right to find and erase a customer; and the Customiser 1.0.19 it
 * bundles, whose tables open to an app's roles (a proof made on the studio's
 * screens). 0.3.49 installs the app once per database
 * (`frontends[].instances`) and tells each install's screens which install
 * they are. 0.3.50 answers a line's proof still out when a new one is made,
 * wherever it is made (`states.supersedes`), and erases a remade proof's
 * earlier picture with its customer. 0.3.51 adds the files the sample's rows for the Customiser ship
 * (its photos, models and cut files); an older Adminium drops them, and the
 * sample cannot be added; it bundles the Customiser 1.0.22, whose set-up page
 * opens to the app's owner.
 */
export const MIN_ADMINIUM = "0.3.51";

const ENV = {
  VITE_ADMINIUM_API_BASE_URL: { required: false, example: "https://admin.example.com" },
  VITE_ADMINIUM_PUBLISHABLE_KEY: { required: false, example: "adm_pub_..." },
};

/** The studio's screens open on one address; their tabs are its own. */
export const STAFF_ROUTES = { studio: "/" };

/** The shop's side. An order's own link lands on `/order`, its code in the fragment. */
export const CUSTOMER_ROUTES = {
  home: "/",
  product: "/piece",
  basket: "/basket",
  checkout: "/checkout",
  order: "/order",
  // The sign-in link Adminium e-mails lands here, its token in the fragment.
  link: "/c",
  find: "/find",
  ask: "/ask",
  problem: "/something-wrong",
  postage: "/postage",
  care: "/care",
  about: "/about",
  // A saved design's link: the key the Customiser's own e-mail looks for.
  customiserDesign: "/design",
};

export function buildManifest(): Record<string, unknown> {
  return {
    kind: "app",
    manifestVersion: 1,
    key: "maker",
    name: "Maker Shop",
    version: VERSION,
    publisher: { id: "adminium", name: "Adminium", url: "https://adminium.dev" },
    license: "AGPL-3.0-only",
    description: {
      key: "mft.maker.desc",
      fallback:
        "A maker's studio, front and back. Shoppers choose a piece, its material, size and finish, make it their own in the Customiser, and see when it will be posted; the studio proofs every piece with words on it, batches pieces onto the machines and posts them — every price and date decided by your own database.",
    },
    categories: ["commerce"],
    compatibility: {
      minAdminiumVersion: MIN_ADMINIUM,
      engines: ["sqlite", "postgres", "mysql"],
    },
    capabilities: ["email-delivery", "file-storage"],
    frontends: [
      { side: "staff", kind: "spa", entry: "index.html", env: ENV, placement: "external", routes: STAFF_ROUTES, instances: true },
      { side: "customer", kind: "spa", entry: "index.html", env: ENV, routes: CUSTOMER_ROUTES, instances: true },
    ],
    settings: SETTINGS,
    addOns: ADD_ONS,
    documents: DOCUMENTS,
    navGroups: NAV_GROUPS,
    requiredSchema: { prefixed: true, tables: TABLES },
    pages: pages(),
    roles: ROLES,
    publicKeys: PUBLIC_KEYS,
    publicAccess: PUBLIC_ACCESS,
    outbox: OUTBOX,
    people: PEOPLE,
    emailTemplates: emailTemplates(KINDS),
    sampleData: { file: "seeds/maker.sample.json", addOns: { customiser: { file: "seeds/maker.customiser.sample.json" } } },
  };
}

/** The file's text: two-space JSON and a final newline. */
export function manifestText(): string {
  return `${JSON.stringify(buildManifest(), null, 2)}\n`;
}
