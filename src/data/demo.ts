/**
 * The seeded fiction (prompt K).
 *
 * Fourteen pieces live in `lib/catalogue.ts` because they are the option graph
 * the engines read. What is here is everything that happened: twelve live
 * orders, sixteen already posted, the people who placed them, and the machines
 * in the unit.
 *
 * THE CLOCK IS PINNED AND NOTHING READS A REAL ONE. Every date below is chosen
 * against Thursday 6 August 2026 at 16:40, so the demo's ship-by chips, its one
 * late order and its "+1 studio day" jump are reproducible on the droplet and
 * assertable in a test.
 *
 * NO DISPLAY STRINGS. Names of people are proper nouns and sit here verbatim;
 * everything a translator would need to touch is a `data.*` key in the bundle.
 */

import type { MaterialKey } from "../lib/catalogue.ts";
import type { Order, OrderLine, ProofState } from "../lib/orders.ts";
import type { CareCard, Customer, Machine, Now } from "./types.ts";

/**
 * Thursday, 6 August 2026, 16:40.
 *
 * The whole calendar hangs off this: the bench runs Tuesday to Saturday, the
 * cut-off is 17:00, and a coaster ordered at this exact moment is posted on
 * Tuesday 11 August. `calendar.test.ts` asserts that sentence by name.
 */
export const NOW: Now = { iso: "2026-08-06", hour: 16, minute: 40 };

/** The seeded history ends at BR-2287, so the next order takes BR-2288. */
export const NEXT_REF = "BR-2288";

export const CUSTOMERS: readonly Customer[] = [
  { key: "bex", name: "Bex T.", email: "bex.t@example.com", town: "Saltburn",
    address: { lines: ["14 Milton Street"], postcode: "TS12 1DP", country: "GB" } },
  { key: "hana", name: "Hana W.", email: "hana.w@example.com", town: "Whitby",
    address: { lines: ["3 Flowergate"], postcode: "YO21 3BA", country: "GB" } },
  { key: "iris", name: "Iris P.", email: "iris.p@example.com", town: "Guisborough",
    address: { lines: ["21 Westgate"], postcode: "TS14 6AH", country: "GB" } },
  { key: "dara", name: "Dara M.", email: "dara.m@example.com", town: "Redcar",
    address: { lines: ["8 Newcomen Terrace"], postcode: "TS10 1DB", country: "GB" } },
  { key: "otto", name: "Otto L.", email: "otto.l@example.com", town: "Stokesley",
    address: { lines: ["5 College Square"], postcode: "TS9 5DL", country: "GB" } },
  { key: "priya", name: "Priya N.", email: "priya.n@example.com", town: "Yarm",
    address: { lines: ["17 High Street"], postcode: "TS15 9AE", country: "GB" } },
  { key: "sam", name: "Sam K.", email: "sam.k@example.com", town: "Loftus",
    address: { lines: ["2 Zetland Road"], postcode: "TS13 4PW", country: "GB" } },
  { key: "elin", name: "Elin R.", email: "elin.r@example.com", town: "Marske",
    address: { lines: ["9 Windsor Road"], postcode: "TS11 6AA", country: "GB" } },
  { key: "joss", name: "Joss B.", email: "joss.b@example.com", town: "Skelton",
    address: { lines: ["12 Boosbeck Road"], postcode: "TS12 2AF", country: "GB" } },
  { key: "mira", name: "Mira C.", email: "mira.c@example.com", town: "Great Ayton",
    address: { lines: ["4 Station Road"], postcode: "TS9 6BA", country: "GB" } },
  { key: "theo", name: "Theo A.", email: "theo.a@example.com", town: "Danby",
    address: { lines: ["6 Briar Hill"], postcode: "YO21 2NH", country: "GB" } },
  { key: "rosa", name: "Rosa V.", email: "rosa.v@example.com", town: "Castleton",
    address: { lines: ["11 High Street"], postcode: "YO21 2DA", country: "GB" } },
];

export const CUSTOMER_BY_KEY: Readonly<Record<string, Customer>> = Object.fromEntries(
  CUSTOMERS.map((c) => [c.key, c]),
);

/** What is in the unit. Two printers are one card that says two. */
export const MACHINES: readonly Machine[] = [
  { key: "laser", icon: "zap", count: 1 },
  { key: "printers", icon: "box", count: 2 },
  { key: "kiln", icon: "flame", count: 1 },
];

/**
 * WHAT THE LASER IS SET TO FOR A RUN — numbers, because they were prose.
 *
 * The cut-list panel's three settings lines used to be whole sentences in the
 * bundle, digits and all: "18 mm/s at 78% power, one pass", written out again
 * in each of the eight languages. Seven of those spellings were fine by
 * accident and the eighth was not — the ar-EG pair read "18 مم/ث بقدرة 78%"
 * with LATIN digits inside Arabic prose, on a bench screen whose every other
 * figure was Arabic-Indic, and no formatter could have saved it because there
 * was no number to format: a translator had typed the characters.
 *
 * A figure a machine is set to is DATA. Holding it here and interpolating it
 * means `t()` renders it in the reader's own numerals for free, the eight
 * bundles cannot disagree about what the laser does, and `numerals.test.tsx`'s
 * ban on a Latin digit in an Arabic string has nothing left to argue with.
 */
export const LASER_SETTINGS = {
  watts: 60,
  cut: { speedMmPerSec: 18, power: 0.78 },
  engrave: { speedMmPerSec: 300, power: 0.22, dpi: 500 },
} as const;

/** One card per material on Looking after it. */
export const CARE_CARDS: readonly CareCard[] = [
  { key: "walnut", material: "walnut", lines: 3 },
  { key: "ply", material: "ply", lines: 3 },
  { key: "slate", material: "slate", lines: 3 },
  { key: "acrylic", material: "acrylic", lines: 3 },
  { key: "resin", material: "resin", lines: 3 },
  { key: "stoneware", material: "stoneware", lines: 3 },
];

// ── the orders ───────────────────────────────────────────────────────────────

interface LineSeed {
  productKey: string;
  materialKey: MaterialKey;
  sizeKey: string;
  finishKey: string;
  quantity: number;
  note?: string;
  stage?: OrderLine["stage"];
  proof?: ProofState;
  spoiled?: number;
}

function line(id: string, seed: LineSeed): OrderLine {
  return {
    id,
    productKey: seed.productKey,
    materialKey: seed.materialKey,
    sizeKey: seed.sizeKey,
    finishKey: seed.finishKey,
    quantity: seed.quantity,
    note: seed.note ?? "",
    stage: seed.stage ?? "to-make",
    // A piece with nothing written on it needs no picture and never sees the
    // gate — that is what `not-needed` means, and it is not the same fact as
    // "the picture has not been sent yet".
    proof: seed.proof ?? (seed.note === undefined || seed.note === "" ? "not-needed" : "approved"),
    spoiled: seed.spoiled ?? 0,
  };
}

function order(
  ref: string,
  customer: string,
  placedIso: string,
  lines: readonly LineSeed[],
  proofs: Order["proofs"],
  postedIso?: string,
): Order {
  return {
    ref,
    customer,
    email: CUSTOMER_BY_KEY[customer]?.email ?? `${customer}@example.com`,
    placedIso,
    lines: lines.map((l, i) => line(`${ref}-L${i + 1}`, l)),
    proofs,
    ...(postedIso !== undefined ? { postedIso } : {}),
  };
}

/**
 * The twelve orders on the bench right now.
 *
 * Read against the pinned Thursday they are: THREE waiting on a picture
 * (BR-2278 and BR-2279 sent and waiting on a reply, BR-2280 not sent yet), ONE
 * late (BR-2276, promised Wednesday and still on the laser), and SIX sitting in
 * *To make* with their proofs settled and nothing stopping them — which is
 * exactly enough walnut and ply to fill two sheets when session 2's batcher
 * groups them.
 */
export const ORDERS: readonly Order[] = [
  // ── late: promised Wednesday 5 August, still being made ──────────────────
  order(
    "BR-2276",
    "iris",
    "2026-07-31",
    [
      {
        productKey: "walnut-coasters",
        materialKey: "walnut",
        sizeKey: "standard",
        finishKey: "oiled",
        quantity: 2,
        note: "The Pinfold · 2019",
        stage: "making",
        proof: "approved",
      },
    ],
    [
      { kind: "accepted", at: "2026-07-31" },
      { kind: "sent", at: "2026-07-31" },
      { kind: "approved", at: "2026-08-01" },
    ],
  ),

  // ── due today, in finishing ─────────────────────────────────────────────
  order(
    "BR-2277",
    "dara",
    "2026-08-01",
    [
      {
        productKey: "ply-coasters",
        materialKey: "ply",
        sizeKey: "standard",
        finishKey: "bare",
        quantity: 1,
        note: "Quarry Cottage",
        stage: "finishing",
        proof: "approved",
      },
    ],
    [
      { kind: "accepted", at: "2026-08-01" },
      { kind: "sent", at: "2026-08-01" },
      { kind: "approved", at: "2026-08-04" },
    ],
  ),

  // ── three waiting on a picture ──────────────────────────────────────────
  order(
    "BR-2278",
    "hana",
    "2026-08-04",
    [
      {
        productKey: "stoneware-mug",
        materialKey: "stoneware",
        sizeKey: "standard",
        finishKey: "seafoam",
        quantity: 2,
        note: "Hana · Whitby",
        proof: "waiting",
      },
    ],
    [
      { kind: "accepted", at: "2026-08-04" },
      { kind: "sent", at: "2026-08-05" },
    ],
  ),
  order(
    "BR-2279",
    "bex",
    "2026-08-05",
    [
      {
        productKey: "walnut-coasters",
        materialKey: "walnut",
        sizeKey: "standard",
        finishKey: "waxed",
        quantity: 1,
        note: "Bex & Sam · 2026",
        proof: "waiting",
      },
      {
        productKey: "keyring",
        materialKey: "acrylic",
        sizeKey: "standard",
        finishKey: "amber",
        quantity: 2,
        note: "Ollie",
        proof: "waiting",
      },
    ],
    [
      { kind: "accepted", at: "2026-08-05" },
      { kind: "sent", at: "2026-08-05" },
    ],
  ),
  order(
    "BR-2280",
    "otto",
    "2026-08-05",
    [
      {
        productKey: "cake-topper",
        materialKey: "walnut",
        sizeKey: "standard",
        finishKey: "oiled",
        quantity: 1,
        // Twenty-two of twenty-two: the counter sitting on --warn is a real
        // state a reviewer can find rather than one they have to type.
        note: "Fifty, and still cross",
        proof: "not-sent",
      },
    ],
    [{ kind: "accepted", at: "2026-08-05" }],
  ),

  // ── six in To make with nothing stopping them ───────────────────────────
  order(
    "BR-2281",
    "priya",
    "2026-08-05",
    [
      {
        productKey: "bookmark",
        materialKey: "walnut",
        sizeKey: "standard",
        finishKey: "oiled",
        quantity: 4,
        note: "For Ada",
        proof: "approved",
      },
    ],
    [
      { kind: "accepted", at: "2026-08-05" },
      { kind: "sent", at: "2026-08-05" },
      { kind: "approved", at: "2026-08-05" },
    ],
  ),
  order(
    "BR-2282",
    "sam",
    "2026-08-05",
    [
      {
        productKey: "walnut-coasters",
        materialKey: "walnut",
        sizeKey: "standard",
        finishKey: "oiled",
        /*
         * EIGHT SETS, AND THE NUMBER IS THE POINT (24 AC15).
         *
         * This was `1`, and with it the whole seeded bench fitted on one sheet:
         * every batchable group packed with an empty overflow list, so half of
         * what the batch sheet is FOR — "these go on the next sheet" — could be
         * asserted in `batch.test.ts` against a made-up 200 × 200 offcut and
         * could not be seen by anybody driving the app. A reviewer opening
         * Batch found a feature that never fires.
         *
         * Eight sets is thirty-two blanks at 95 mm (`footprint.perUnit` is 4),
         * which is more than a 600 × 400 sheet holds — so the walnut group now
         * fills a sheet, names what is left over, and says how many sheets it
         * needs. It is also an ordinary order for this studio rather than a
         * number chosen to trip a threshold: a café buying coasters for its
         * tables is exactly who orders eight of something, and the quantity
         * breaks already run to twelve.
         */
        quantity: 8,
        note: "Kestrel House · 1908",
        proof: "approved",
      },
    ],
    [
      { kind: "accepted", at: "2026-08-05" },
      { kind: "sent", at: "2026-08-05" },
      { kind: "approved", at: "2026-08-06" },
    ],
  ),
  order(
    "BR-2283",
    "elin",
    "2026-08-06",
    [
      {
        productKey: "keyring",
        materialKey: "acrylic",
        sizeKey: "small",
        finishKey: "ink",
        quantity: 4,
        note: "Elin",
        proof: "approved",
      },
    ],
    [
      { kind: "accepted", at: "2026-08-06" },
      { kind: "sent", at: "2026-08-06" },
      { kind: "approved", at: "2026-08-06" },
    ],
  ),
  order(
    "BR-2284",
    "joss",
    "2026-08-06",
    [
      {
        productKey: "ply-coasters",
        materialKey: "ply",
        sizeKey: "standard",
        finishKey: "bare",
        quantity: 2,
        note: "Joss & Ruth",
        proof: "approved",
      },
    ],
    [
      { kind: "accepted", at: "2026-08-06" },
      { kind: "sent", at: "2026-08-06" },
      { kind: "approved", at: "2026-08-06" },
    ],
  ),
  order(
    "BR-2285",
    "mira",
    "2026-08-06",
    [
      {
        productKey: "photo-block",
        materialKey: "ply",
        sizeKey: "standard",
        finishKey: "bare",
        quantity: 1,
        note: "Mira · 2026",
        proof: "approved",
      },
    ],
    [
      { kind: "accepted", at: "2026-08-06" },
      { kind: "sent", at: "2026-08-06" },
      { kind: "approved", at: "2026-08-06" },
    ],
  ),
  order(
    "BR-2286",
    "theo",
    "2026-08-06",
    [
      {
        productKey: "cake-topper",
        materialKey: "walnut",
        sizeKey: "large",
        finishKey: "waxed",
        quantity: 1,
        note: "Theo is thirty",
        proof: "approved",
      },
    ],
    [
      { kind: "accepted", at: "2026-08-06" },
      { kind: "sent", at: "2026-08-06" },
      { kind: "approved", at: "2026-08-06" },
    ],
  ),

  // ── packed, waiting for the post office run ─────────────────────────────
  order(
    "BR-2287",
    "rosa",
    "2026-08-04",
    [
      {
        productKey: "herb-pot",
        materialKey: "resin",
        sizeKey: "tall",
        finishKey: "matte-sage",
        quantity: 2,
        stage: "ready-to-post",
        proof: "not-needed",
      },
    ],
    [{ kind: "accepted", at: "2026-08-04" }],
  ),
];

/**
 * BR-2260 … BR-2275, already posted.
 *
 * They exist so that "Order again" has something to find and so that a
 * reference a shopper types is more often a real one than not. Iris P. carries
 * three of them, which is why the reorder screen's hint chip is her email.
 */
export const PAST_ORDERS: readonly Order[] = [
  order("BR-2260", "iris", "2026-06-16", [
    { productKey: "walnut-coasters", materialKey: "walnut", sizeKey: "standard", finishKey: "oiled", quantity: 1, note: "The Pinfold", stage: "ready-to-post", proof: "approved" },
  ], [{ kind: "accepted", at: "2026-06-16" }, { kind: "approved", at: "2026-06-17" }], "2026-06-20"),
  order("BR-2261", "bex", "2026-06-18", [
    { productKey: "bookmark", materialKey: "walnut", sizeKey: "standard", finishKey: "oiled", quantity: 2, note: "Bex", stage: "ready-to-post", proof: "approved" },
  ], [{ kind: "accepted", at: "2026-06-18" }, { kind: "approved", at: "2026-06-19" }], "2026-06-23"),
  order("BR-2262", "hana", "2026-06-20", [
    { productKey: "stoneware-mug", materialKey: "stoneware", sizeKey: "standard", finishKey: "oatmeal", quantity: 1, note: "Hana", stage: "ready-to-post", proof: "approved" },
  ], [{ kind: "accepted", at: "2026-06-20" }, { kind: "approved", at: "2026-06-23" }], "2026-07-04"),
  order("BR-2263", "dara", "2026-06-23", [
    { productKey: "herb-pot", materialKey: "resin", sizeKey: "small", finishKey: "matte-bone", quantity: 3, stage: "ready-to-post", proof: "not-needed" },
  ], [{ kind: "accepted", at: "2026-06-23" }], "2026-06-27"),
  order("BR-2264", "iris", "2026-06-25", [
    { productKey: "garden-markers", materialKey: "slate", sizeKey: "standard", finishKey: "plain-edge", quantity: 1, note: "Herbs", stage: "ready-to-post", proof: "approved" },
  ], [{ kind: "accepted", at: "2026-06-25" }, { kind: "approved", at: "2026-06-26" }], "2026-07-02"),
  order("BR-2265", "otto", "2026-06-27", [
    { productKey: "keyring", materialKey: "acrylic", sizeKey: "standard", finishKey: "clear", quantity: 4, note: "Otto", stage: "ready-to-post", proof: "approved" },
  ], [{ kind: "accepted", at: "2026-06-27" }, { kind: "approved", at: "2026-06-27" }], "2026-07-02"),
  order("BR-2266", "priya", "2026-06-30", [
    { productKey: "cutting-board", materialKey: "walnut", sizeKey: "standard", finishKey: "oiled", quantity: 1, note: "For the Nolans", stage: "ready-to-post", proof: "approved" },
  ], [{ kind: "accepted", at: "2026-06-30" }, { kind: "approved", at: "2026-07-01" }], "2026-07-04"),
  order("BR-2267", "sam", "2026-07-02", [
    { productKey: "pet-tag", materialKey: "acrylic", sizeKey: "small", finishKey: "amber", quantity: 2, note: "Biscuit", stage: "ready-to-post", proof: "approved" },
  ], [{ kind: "accepted", at: "2026-07-02" }, { kind: "approved", at: "2026-07-02" }], "2026-07-08"),
  order("BR-2268", "elin", "2026-07-04", [
    { productKey: "photo-block", materialKey: "ply", sizeKey: "small", finishKey: "bare", quantity: 2, note: "Elin · 2025", stage: "ready-to-post", proof: "approved" },
  ], [{ kind: "accepted", at: "2026-07-04" }, { kind: "approved", at: "2026-07-06" }], "2026-07-11"),
  order("BR-2269", "joss", "2026-07-07", [
    { productKey: "wedding-sign", materialKey: "walnut", sizeKey: "standard", finishKey: "oiled", quantity: 1, note: "Joss & Ruth · 12 September", stage: "ready-to-post", proof: "approved" },
  ], [{ kind: "accepted", at: "2026-07-07" }, { kind: "approved", at: "2026-07-09" }], "2026-07-14"),
  order("BR-2270", "mira", "2026-07-09", [
    { productKey: "ply-coasters", materialKey: "ply", sizeKey: "standard", finishKey: "bare", quantity: 2, note: "Mira", stage: "ready-to-post", proof: "approved" },
  ], [{ kind: "accepted", at: "2026-07-09" }, { kind: "approved", at: "2026-07-10" }], "2026-07-15"),
  order("BR-2271", "theo", "2026-07-11", [
    { productKey: "desk-tray", materialKey: "resin", sizeKey: "standard", finishKey: "matte-clay", quantity: 1, stage: "ready-to-post", proof: "not-needed" },
  ], [{ kind: "accepted", at: "2026-07-11" }], "2026-07-18"),
  order("BR-2272", "rosa", "2026-07-14", [
    { productKey: "house-sign", materialKey: "slate", sizeKey: "standard", finishKey: "bevelled", quantity: 1, note: "Rowan Cottage", stage: "ready-to-post", proof: "approved" },
  ], [{ kind: "accepted", at: "2026-07-14" }, { kind: "approved", at: "2026-07-16" }], "2026-07-22"),
  order("BR-2273", "iris", "2026-07-17", [
    { productKey: "keyring", materialKey: "walnut", sizeKey: "standard", finishKey: "oiled", quantity: 8, note: "The Pinfold", stage: "ready-to-post", proof: "approved" },
  ], [{ kind: "accepted", at: "2026-07-17" }, { kind: "approved", at: "2026-07-18" }], "2026-07-23"),
  order("BR-2274", "bex", "2026-07-21", [
    { productKey: "cake-topper", materialKey: "acrylic", sizeKey: "standard", finishKey: "clear", quantity: 1, note: "Sam is forty", stage: "ready-to-post", proof: "approved" },
  ], [{ kind: "accepted", at: "2026-07-21" }, { kind: "approved", at: "2026-07-22" }], "2026-07-25"),
  order("BR-2275", "hana", "2026-07-24", [
    { productKey: "stoneware-mug", materialKey: "stoneware", sizeKey: "large", finishKey: "ink-glaze", quantity: 2, note: "Whitby", stage: "ready-to-post", proof: "approved" },
  ], [{ kind: "accepted", at: "2026-07-24" }, { kind: "approved", at: "2026-07-25" }], "2026-08-05"),
];

/** The studio itself, for the footer and About us. */
export const STUDIO = {
  /** Where the demo lives, printed as a mono chip in the footer. */
  demoPath: "adminium.dev/demo/maker-shop",
  /** Two people. Both of them make things; neither of them is an account manager. */
  makers: ["Ada", "Nell"],
  /**
   * THE UNIT BEHIND THE STATION, written down.
   *
   * [Added 2026-08-10, wave 4b.] "We work from a unit behind the station" is
   * what About us has always said; this is that address as an address, because
   * a delivery add-on has to book a collection FROM somewhere and the shop is
   * the only party that knows where. It is not display copy — About us keeps
   * its own sentence in eight languages — so nothing here needs translating.
   *
   * `countryCode` sits beside nothing else on purpose: a carrier checks a
   * postcode against a CODE, and this app has no other use for one.
   */
  address: {
    name: "Birch Row",
    lines: ["Unit 6, Station Yard", "Marske Mill Lane"],
    city: "Saltburn",
    postcode: "TS12 1HJ",
    /** ISO 3166-1 alpha-2. */
    countryCode: "GB",
  },
} as const;
