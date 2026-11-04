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
import { peopleFor } from "./people.ts";
import { PUBLIC_KEYS, publicAccessFor } from "./public.ts";
import { rolesFor } from "./roles.ts";
import { SETTINGS } from "./settings.ts";
import { TABLES } from "./tables.ts";

export const VERSION = "0.1.0";

/**
 * The Adminium release that first reads everything below: quantity breaks
 * and postage rates picked by band, post-by dates in studio days, the
 * Customiser's design checked and snapshotted by an order line, its copies
 * of a person, and its panels on a record.
 */
export const MIN_ADMINIUM = "0.3.43";

/**
 * The release that reads three more things this app says: a role's grant of
 * the Customiser's panels, a lettering held to its product's limit, and a
 * person's copies in the versions of their designs. They are written only in
 * a manifest whose floor is that release, so raising `MIN_ADMINIUM` to it is
 * the one change that turns them on.
 */
export const PANELS_AND_LIMITS = "0.3.44";

/** Whether release `a` is `b` or later, on major.minor.patch. */
export function atLeast(a: string, b: string): boolean {
  const [x, y] = [a, b].map((v) => v.split(/[.-]/).slice(0, 3).map(Number));
  for (let i = 0; i < 3; i += 1) if (x![i] !== y![i]) return x![i]! > y![i]!;
  return true;
}

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

/** `floor` builds the manifest for another floor than the one it ships with (the contract tries the next one). */
export function buildManifest(options: { floor?: string } = {}): Record<string, unknown> {
  const floor = options.floor ?? MIN_ADMINIUM;
  const newer = atLeast(floor, PANELS_AND_LIMITS);
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
      minAdminiumVersion: floor,
      engines: ["sqlite", "postgres", "mysql"],
    },
    capabilities: ["email-delivery", "file-storage"],
    frontends: [
      { side: "staff", kind: "spa", entry: "index.html", env: ENV, placement: "external", routes: STAFF_ROUTES },
      { side: "customer", kind: "spa", entry: "index.html", env: ENV, routes: CUSTOMER_ROUTES },
    ],
    settings: SETTINGS,
    addOns: ADD_ONS,
    documents: DOCUMENTS,
    navGroups: NAV_GROUPS,
    requiredSchema: { prefixed: true, tables: TABLES },
    pages: pages(),
    roles: rolesFor(newer),
    publicKeys: PUBLIC_KEYS,
    publicAccess: publicAccessFor(newer),
    outbox: OUTBOX,
    people: peopleFor(newer),
    emailTemplates: emailTemplates(KINDS),
    sampleData: { file: "seeds/maker.sample.json", addOns: { customiser: { file: "seeds/maker.customiser.sample.json" } } },
  };
}

/** The file's text: two-space JSON and a final newline. */
export function manifestText(options: { floor?: string } = {}): string {
  return `${JSON.stringify(buildManifest(options), null, 2)}\n`;
}
