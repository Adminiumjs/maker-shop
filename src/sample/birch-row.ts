/**
 * Birch Row's Thursday: the one source of the app's sample data.
 *
 * `npm run sample` writes two files from this module:
 *
 *   seeds/maker.sample.json             the studio itself: its settings,
 *                                        machines, materials and their stock,
 *                                        the postage, the Whitby closure, the
 *                                        customers and their orders, today's
 *                                        machine bookings;
 *   seeds/maker.customiser.sample.json  the Customiser's rows for Birch Row
 *                                        (its bases, ready-made designs and
 *                                        the three ordered designs), copied
 *                                        from the Customiser's own
 *                                        `seeds/maker.sample.json`
 *                                        (`customiser-rows.json`), and the
 *                                        studio's rows that link into them:
 *                                        the products and their options, every
 *                                        order line, its features and proofs.
 *
 * Every product row is in the second file because five of them are made on
 * a Customiser base, and a row of the first file cannot point at a row of the
 * second; an order line follows its product, a proof its line. The Customiser
 * is required, so both files always go in together.
 *
 * The data are the comps' (`birch-row-data.js`, `birch-row-customiser-data.js`),
 * with the two modules' disagreements settled one way: one table of
 * materials, walnut 6 mm, birch ply 3 mm, slate 5 mm and PLA, and one product
 * row each, with its lead, its breaks and its size.
 *
 * Every figure the screens show is Adminium's: line and order totals, the
 * postage by weight, stock on hand from its movements. Only what Adminium
 * never works out for history is written here: each line's post-by (a stamp,
 * which sample data never fires), counted in studio days by the same rule.
 *
 * The studio's clock is pinned to Thursday 6 August 2026, 16:40, as the comps
 * draw it: every date is a `@week` day from the bundle's Thursday, so it
 * keeps its weekday whatever day the sample is added on. The orders carry
 * their own numbers (BR-2241 to BR-2290) and no running number, so the
 * studio's own next order is BR-2291. Addresses end in `.example`, which
 * Adminium never mails.
 */
import CUSTOMISER_ROWS from "./customiser-rows.json" with { type: "json" };

type Value = unknown;
type Row = Record<string, Value>;
interface Table {
  ref: string;
  own?: true;
  onlyIfEmpty?: true;
  rows: Row[];
}
export interface SampleBundle {
  format: "adminium.sample/1";
  app: "maker";
  addOn?: "customiser";
  weekAnchor: "thu";
  tables: Table[];
}

// ── the clock ───────────────────────────────────────────────────────────────

/** The day the sample is written for: Thursday 6 August 2026. */
export const TODAY = "2026-08-06";
export const NOW_TIME = "16:40";
export const CUTOFF = "17:00";
/** Tuesday to Saturday. */
export const STUDIO_DAYS = [2, 3, 4, 5, 6];

const parse = (iso: string): Date => {
  const [y, m, d] = iso.split("-").map(Number) as [number, number, number];
  return new Date(Date.UTC(y, m - 1, d));
};
const isoOf = (d: Date): string => d.toISOString().slice(0, 10);
export const addDays = (iso: string, n: number): string => {
  const d = parse(iso);
  d.setUTCDate(d.getUTCDate() + n);
  return isoOf(d);
};
/** Days from the bundle's Thursday. */
const offset = (iso: string): number => Math.round((parse(iso).getTime() - parse(TODAY).getTime()) / 86_400_000);
const day = (iso: string): Row => ({ "@day": offset(iso), "@week": true });
const wall = (iso: string, time: string): Row => ({ "@day": offset(iso), "@time": time, "@week": true });

// ── the studio ──────────────────────────────────────────────────────────────

export const CLOSURES = [{ from: "2026-08-15", to: "2026-08-15", reason: "Closed — we're at the Whitby craft fair" }];

const isStudioDay = (iso: string): boolean => STUDIO_DAYS.includes(parse(iso).getUTCDay()) && !CLOSURES.some((c) => iso >= c.from && iso <= c.to);
const nextStudioDay = (iso: string): string => {
  let d = addDays(iso, 1);
  while (!isStudioDay(d)) d = addDays(d, 1);
  return d;
};
/**
 * The post-by of an order placed on `iso` at `time`: it comes in that day when
 * that is a studio day and it is before five, else on the next studio day;
 * the date is the lead's studio day after that. The same count Adminium makes
 * (`addWorkingDays`), for rows Adminium never stamps.
 */
export function postBy(iso: string, time: string, lead: number): string {
  let d = isStudioDay(iso) && time < CUTOFF ? iso : nextStudioDay(iso);
  for (let left = lead; left > 0; left -= 1) d = nextStudioDay(d);
  return d;
}

const SETTINGS: Row = {
  "@label": "settings",
  studio_name: "Birch Row",
  address: "Unit 4, Station Yard, Settle BD24 9AA",
  email: "studio@birchrow.example",
  about: "Two of us, a laser, two printers and a kiln, in a unit by the station in Settle. Everything is made to order.",
  ref_prefix: "BR-",
  first_order_number: 2291,
  proof_reminder_days: 3,
  packaging_grams: 120,
  taking_orders: true,
};

/** The machines, and how long one run keeps each: a sheet on the laser (the comp's walnut sheet, 09:00–11:15), a print, a firing. */
const MACHINES = [
  {
    code: "laser",
    name: "The laser",
    kind: "laser",
    detail: "60 W CO₂, 300 × 200 bed",
    icon: "zap",
    run_minutes: 135,
    power: "60 W",
    cut_settings: "18 mm/s at 78% power, one pass",
    engrave_settings: "300 mm/s at 22% power, 500 dpi",
    air_settings: "On. Check the lens before the run.",
  },
  { code: "printer-a", name: "Printer A", kind: "printer", detail: "0.4 mm nozzle", icon: "box", run_minutes: 200 },
  { code: "printer-b", name: "Printer B", kind: "printer", detail: "0.4 mm nozzle", icon: "box", run_minutes: 200 },
  { code: "kiln", name: "The kiln", kind: "kiln", detail: "60 litre, top loader", icon: "flame", run_minutes: 540 },
];

/** Looking after each material, as the care page lists it. */
const CARE: Record<string, string[]> = {
  Walnut: [
    "Wipe it with a damp cloth and dry it off. No dishwasher — the heat opens the grain and lifts the oil.",
    "When the surface starts looking dry and pale, rub in a little food-safe oil and leave it overnight.",
    "Rings and marks sand out with 240 grit if you ever need to start again.",
  ],
  "Birch ply": [
    "Indoors only. Ply and rain do not get on, and a wet edge will lift within a season.",
    "Dust it, and wipe spills off quickly rather than letting them soak in.",
    "If it was waxed, a fresh coat once a year keeps the face even.",
  ],
  Slate: [
    "A house sign lives outside quite happily. Wipe the face once a year with water and nothing else.",
    "Filled lettering is sealed, but a wire brush will take the fill out — use a cloth.",
    "Slate chips if you drop it on a hard floor. Fix it to the wall with the pads we send.",
  ],
  Acrylic: [
    "Warm soapy water and a soft cloth. Solvent cleaners cloud the surface permanently.",
    "It scuffs with use, which is what keys and cake tins do to things.",
    "Check the split ring on a keyring or a pet tag every few months.",
  ],
  PLA: [
    "Keep it off a sunny windowsill and out of a hot car — PLA softens at about 60°C.",
    "Wash it by hand in cool water. The dishwasher will warp it.",
    "A pot is for the windowsill, not the garden. Empty the saucer so it does not sit wet.",
  ],
  Stoneware: [
    "Dishwasher and microwave are both fine — it is fired to 1240°C.",
    "Do not take it from the fridge straight to a hot oven; the shock crazes the glaze.",
    "Small variations in the glaze are how it comes out of the kiln, not a fault.",
  ],
};

interface Material {
  code: string;
  name: string;
  family: string;
  group: "sheet" | "blank" | "filament" | "glaze";
  thickness?: number;
  note: string;
  unit: "sheets" | "blanks" | "g" | "tubs";
  machine: string;
  tint: string;
  onHand: number;
  committed: number;
  reorder: number;
  cost: number;
}

/** The materials on the shelf: the only stock the studio keeps. Walnut 6 mm, ply 3 mm, slate 5 mm. */
export const MATERIALS: Material[] = [
  { code: "wal6", name: "Walnut, 6 mm", family: "Walnut", group: "sheet", thickness: 6, note: "400 × 300 mm sheet", unit: "sheets", machine: "laser", tint: "#6b4423", onHand: 14, committed: 2, reorder: 6, cost: 6.4 },
  { code: "ply3", name: "Birch ply, 3 mm", family: "Birch ply", group: "sheet", thickness: 3, note: "400 × 300 mm sheet", unit: "sheets", machine: "laser", tint: "#c2a175", onHand: 5, committed: 3, reorder: 6, cost: 3.2 },
  { code: "acr3", name: "Acrylic, 3 mm", family: "Acrylic", group: "sheet", thickness: 3, note: "400 × 300 mm sheet", unit: "sheets", machine: "laser", tint: "#6f8299", onHand: 9, committed: 2, reorder: 4, cost: 5.1 },
  { code: "wal18", name: "Walnut board, 18 mm", family: "Walnut", group: "blank", thickness: 18, note: "400 × 280 mm blank", unit: "blanks", machine: "laser", tint: "#6b4423", onHand: 4, committed: 0, reorder: 2, cost: 21 },
  { code: "pla-chalk", name: "PLA, chalk", family: "PLA", group: "filament", note: "1.75 mm, matte", unit: "g", machine: "printer-a", tint: "#e8e4dc", onHand: 2400, committed: 330, reorder: 800, cost: 0.021 },
  { code: "pla-grey", name: "PLA, warm grey", family: "PLA", group: "filament", note: "1.75 mm, matte", unit: "g", machine: "printer-a", tint: "#8a8378", onHand: 1400, committed: 240, reorder: 800, cost: 0.021 },
  { code: "slate5", name: "Slate blanks, 5 mm", family: "Slate", group: "blank", thickness: 5, note: "300 × 200 mm, riven", unit: "blanks", machine: "laser", tint: "#3d4348", onHand: 22, committed: 3, reorder: 8, cost: 9.5 },
  { code: "glaze-oat", name: "Oatmeal glaze", family: "Stoneware", group: "glaze", note: "2 kg tub", unit: "tubs", machine: "kiln", tint: "#cbb9a1", onHand: 4, committed: 1, reorder: 2, cost: 26 },
  { code: "glaze-sea", name: "Sea green glaze", family: "Stoneware", group: "glaze", note: "2 kg tub", unit: "tubs", machine: "kiln", tint: "#6f8f80", onHand: 2, committed: 1, reorder: 2, cost: 28 },
  { code: "glaze-chalk", name: "Chalk white glaze", family: "Stoneware", group: "glaze", note: "2 kg tub", unit: "tubs", machine: "kiln", tint: "#ece7de", onHand: 3, committed: 0, reorder: 2, cost: 24 },
];

/** A product's material choice, by the comp's id: the family and the stock it is cut from. */
const FAMILY: Record<string, { name: string; stock: string }> = {
  walnut: { name: "Walnut", stock: "wal6" },
  ply: { name: "Birch ply", stock: "ply3" },
  slate: { name: "Slate", stock: "slate5" },
  acrylic: { name: "Acrylic", stock: "acr3" },
  resin: { name: "PLA", stock: "pla-chalk" },
  stoneware: { name: "Stoneware", stock: "glaze-oat" },
};

export const POSTAGE = [
  { code: "second", name: "Second class", detail: "2–3 days once it's posted", tracked: false, price: 3.95 },
  { code: "tracked", name: "Tracked", detail: "Next day once it's posted, with a tracking number", tracked: true, price: 7.5 },
];

// ── the products ────────────────────────────────────────────────────────────

interface Choice {
  id: string;
  label: string;
  delta?: number;
  sw?: string;
}
interface Product {
  id: string;
  name: string;
  cat: string;
  unit: string;
  icon: string;
  mat: string;
  alts: { id: string; delta: number }[];
  price: number;
  lead: number;
  machine: "laser" | "printer" | "kiln";
  stock: string;
  size: string;
  foot: { w: number; h: number; per: number };
  grams?: number;
  /** Pieces a unit, for a customising feature priced a piece: a set of four coasters is four. */
  pieces: number;
  sizes: Choice[];
  finishLabel: string;
  finishes: Choice[];
  breaks: number[];
  lettering: { limit: number; prompt: string; hint: string } | null;
  madeFrom: string;
  finishedWith: string;
  care: string;
  /** The Customiser base it is made on, by the Customiser sample's label. */
  base?: string;
  /** Priced customising features: the Customiser's feature, and its price a piece. */
  features?: { label: string; name: string; code: string; price: number }[];
}

const LOGO = { label: "feature:maker-logo", name: "Your own logo", code: "logo", price: 1.5 };

/** The shop's pieces (`birch-row-data.js` 105–186), sizes and materials as the Customiser's comp gives them. */
export const PRODUCTS: Product[] = [
  { id: "coast-wal", name: "Engraved walnut coasters", cat: "coasters", unit: "set of 4", icon: "disc", mat: "walnut", alts: [{ id: "walnut", delta: 0 }, { id: "ply", delta: -10 }], price: 34, lead: 3, machine: "laser", stock: "wal6", size: "95 × 95 × 6 mm", foot: { w: 95, h: 95, per: 4 }, pieces: 4,
    sizes: [{ id: "s95", label: "95 mm square", delta: 0 }, { id: "s110", label: "110 mm square", delta: 6 }],
    finishLabel: "Finish", finishes: [{ id: "oil", label: "Danish oil", sw: "#6b4423" }, { id: "wax", label: "Beeswax", sw: "#a3763f" }, { id: "bare", label: "Left bare", sw: "#c9a97a" }],
    breaks: [1, 4, 8, 12], lettering: { limit: 24, prompt: "One line, up to 24 characters", hint: "Tell us the name and the date. We set it in the font shown in the photos — if you want something else, say so and we'll reply before we cut." },
    madeFrom: "American black walnut, 6 mm, cut and engraved on the laser.", finishedWith: "Sanded to 240 grit, then two coats of Danish oil.", care: "Wipe with a damp cloth. Keep them out of the dishwasher.", base: "base:coasters", features: [LOGO] },
  { id: "coast-ply", name: "Birch ply coasters", cat: "coasters", unit: "set of 4", icon: "disc", mat: "ply", alts: [{ id: "ply", delta: 0 }, { id: "walnut", delta: 10 }], price: 24, lead: 3, machine: "laser", stock: "ply3", size: "95 × 95 × 3 mm", foot: { w: 95, h: 95, per: 4 }, pieces: 4,
    sizes: [{ id: "s95", label: "95 mm square", delta: 0 }, { id: "s110", label: "110 mm square", delta: 4 }],
    finishLabel: "Finish", finishes: [{ id: "bare", label: "Left bare", sw: "#e0c69e" }, { id: "wax", label: "Beeswax", sw: "#c8a26a" }],
    breaks: [1, 4, 8, 12], lettering: { limit: 24, prompt: "One line, up to 24 characters", hint: "Tell us the name and the date. We set it in the font shown in the photos — if you want something else, say so and we'll reply before we cut." },
    madeFrom: "Baltic birch ply, 3 mm, cut and engraved on the laser.", finishedWith: "Sanded and left bare, or waxed if you ask.", care: "Wipe with a damp cloth. Keep them out of the dishwasher." },
  { id: "sign-house", name: "Slate house sign", cat: "signs", unit: "each", icon: "house", mat: "slate", alts: [{ id: "slate", delta: 0 }], price: 48, lead: 5, machine: "laser", stock: "slate5", size: "300 × 200 × 5 mm", foot: { w: 300, h: 200, per: 1 }, pieces: 1,
    sizes: [{ id: "s300", label: "300 × 200 mm", delta: 0 }, { id: "s400", label: "400 × 250 mm", delta: 14 }],
    finishLabel: "Lettering", finishes: [{ id: "white", label: "Filled white", sw: "#f2f2f0" }, { id: "etch", label: "Etched only", sw: "#6d757c" }],
    breaks: [1], lettering: { limit: 28, prompt: "House name or number, up to 28 characters", hint: "Tell us exactly how you want it written, including any punctuation. We set it in the font shown in the photos — if you want something else, say so and we'll reply before we cut." },
    madeFrom: "Welsh slate blanks, riven face, 5 mm.", finishedWith: "Etched on the laser, lettering filled by hand and sealed.", care: "It lives outside quite happily. Wipe the face clean once a year.", base: "base:sign" },
  { id: "mark-slate", name: "Slate garden markers", cat: "signs", unit: "set of 6", icon: "sprout", mat: "slate", alts: [{ id: "slate", delta: 0 }], price: 22, lead: 5, machine: "laser", stock: "slate5", size: "150 × 40 × 5 mm", foot: { w: 150, h: 40, per: 6 }, pieces: 6,
    sizes: [{ id: "s150", label: "150 × 40 mm", delta: 0 }],
    finishLabel: "Lettering", finishes: [{ id: "etch", label: "Etched only", sw: "#6d757c" }, { id: "white", label: "Filled white", sw: "#f2f2f0" }],
    breaks: [1, 4], lettering: { limit: 12, prompt: "One word per marker, up to 12 characters each", hint: "List what you'd like on each of the six — basil, thyme, and so on. We'll set them all the same way." },
    madeFrom: "Slate offcuts from the sign blanks, 5 mm.", finishedWith: "Etched on the laser and left raw.", care: "Rinse them off at the end of the season." },
  { id: "key-acr", name: "Acrylic keyring", cat: "keyrings", unit: "each", icon: "key-round", mat: "acrylic", alts: [{ id: "acrylic", delta: 0 }, { id: "walnut", delta: 3 }], price: 9, lead: 3, machine: "laser", stock: "acr3", size: "50 × 32 × 3 mm", foot: { w: 50, h: 32, per: 1 }, pieces: 1,
    sizes: [{ id: "s50", label: "50 × 32 mm", delta: 0 }, { id: "s64", label: "64 × 40 mm", delta: 2 }],
    finishLabel: "Colour", finishes: [{ id: "frost", label: "Frosted", sw: "#cfd8e2" }, { id: "amber", label: "Amber", sw: "#c98a2e" }, { id: "ink", label: "Ink", sw: "#2b3340" }],
    breaks: [1, 4, 8, 12], lettering: { limit: 16, prompt: "One line, up to 16 characters", hint: "A name, a nickname, a date. We set it in the font shown in the photos." },
    madeFrom: "Cast acrylic, 3 mm, with a split ring.", finishedWith: "Flame-polished edges.", care: "It will scuff eventually. That is what keys do." },
  { id: "tag-pet", name: "Engraved pet tag", cat: "keyrings", unit: "each", icon: "bone", mat: "acrylic", alts: [{ id: "acrylic", delta: 0 }], price: 12, lead: 3, machine: "laser", stock: "acr3", size: "32 × 32 × 3 mm", foot: { w: 32, h: 32, per: 1 }, pieces: 1,
    sizes: [{ id: "s32", label: "32 mm round", delta: 0 }, { id: "s25", label: "25 mm round", delta: 0 }],
    finishLabel: "Colour", finishes: [{ id: "amber", label: "Amber", sw: "#c98a2e" }, { id: "frost", label: "Frosted", sw: "#cfd8e2" }, { id: "ink", label: "Ink", sw: "#2b3340" }],
    breaks: [1, 4], lettering: { limit: 20, prompt: "Name on the front, number on the back — up to 20 characters each", hint: "Give us the name and the number you want us to reach you on. We cut both sides in one pass." },
    madeFrom: "Cast acrylic, 3 mm, with a small split ring.", finishedWith: "Engraved both sides, edges polished.", care: "Check the ring every few months." },
  { id: "tray-3d", name: "3D-printed desk tray", cat: "desk", unit: "each", icon: "inbox", mat: "resin", alts: [{ id: "resin", delta: 0 }], price: 38, lead: 4, machine: "printer", stock: "pla-chalk", size: "220 × 120 × 30 mm", foot: { w: 220, h: 120, per: 1 }, grams: 165, pieces: 1,
    sizes: [{ id: "s220", label: "220 × 120 mm", delta: 0 }, { id: "s280", label: "280 × 150 mm", delta: 9 }],
    finishLabel: "Colour", finishes: [{ id: "chalk", label: "Chalk", sw: "#e8e4dc" }, { id: "warm", label: "Warm grey", sw: "#8a8378" }],
    breaks: [1], lettering: null,
    madeFrom: "Matte PLA, printed at 0.2 mm on the small printers.", finishedWith: "Base sanded flat, feet trimmed by hand.", care: "Keep it off a sunny windowsill — PLA softens in a hot car." },
  { id: "pot-3d", name: "3D-printed herb pot", cat: "pots", unit: "each", icon: "flower-2", mat: "resin", alts: [{ id: "resin", delta: 0 }], price: 26, lead: 4, machine: "printer", stock: "pla-grey", size: "110 × 110 × 105 mm", foot: { w: 110, h: 110, per: 1 }, grams: 120, pieces: 1,
    sizes: [{ id: "s110", label: "110 mm across", delta: 0 }, { id: "s140", label: "140 mm across", delta: 7 }],
    finishLabel: "Colour", finishes: [{ id: "warm", label: "Warm grey", sw: "#8a8378" }, { id: "chalk", label: "Chalk", sw: "#e8e4dc" }],
    breaks: [1, 4], lettering: null,
    madeFrom: "Matte PLA, printed at 0.2 mm, with a saucer that prints with it.", finishedWith: "Ribbed outside, sealed inside with two extra walls.", care: "For the windowsill, not the garden. Empty the saucer." },
  { id: "mug-stone", name: "Stoneware mug", cat: "mugs", unit: "each", icon: "coffee", mat: "stoneware", alts: [{ id: "stoneware", delta: 0 }], price: 32, lead: 10, machine: "kiln", stock: "glaze-oat", size: "85 × 95 mm · 350 ml", foot: { w: 120, h: 120, per: 1 }, pieces: 1,
    sizes: [{ id: "s350", label: "350 ml", delta: 0 }, { id: "s450", label: "450 ml", delta: 5 }],
    finishLabel: "Glaze", finishes: [{ id: "oat", label: "Oatmeal", sw: "#cbb9a1" }, { id: "sea", label: "Sea green", sw: "#6f8f80" }, { id: "chalk", label: "Chalk white", sw: "#ece7de" }],
    breaks: [1, 4], lettering: { limit: 18, prompt: "One line, up to 18 characters", hint: "We letter the mug by hand under the glaze, so the line stays soft at the edges. Tell us what it should say." },
    madeFrom: "Stoneware clay, thrown by hand and fired twice.", finishedWith: "Bisque fired, glazed, then fired again to 1240°C.", care: "Dishwasher and microwave are both fine." },
  { id: "cake-top", name: "Two-layer cake topper", cat: "signs", unit: "each", icon: "cake", mat: "acrylic", alts: [{ id: "acrylic", delta: 0 }, { id: "ply", delta: -6 }], price: 28, lead: 3, machine: "laser", stock: "acr3", size: "160 × 120 × 3 mm", foot: { w: 160, h: 120, per: 1 }, pieces: 1,
    sizes: [{ id: "s160", label: "160 × 120 mm", delta: 0 }, { id: "s200", label: "200 × 150 mm", delta: 6 }],
    finishLabel: "Colour", finishes: [{ id: "ink", label: "Ink", sw: "#2b3340" }, { id: "frost", label: "Frosted", sw: "#cfd8e2" }, { id: "amber", label: "Amber", sw: "#c98a2e" }],
    breaks: [1], lettering: { limit: 24, prompt: "Two lines, up to 24 characters in total", hint: "Give us both lines and we'll cut them as one piece with a spike on the back." },
    madeFrom: "Cast acrylic, 3 mm, cut in two layers that sit slightly apart.", finishedWith: "Edges flame-polished, spike glued and left overnight.", care: "Wash it and keep it — most people do." },
  { id: "board-cut", name: "Walnut cutting board", cat: "desk", unit: "each", icon: "utensils-crossed", mat: "walnut", alts: [{ id: "walnut", delta: 0 }], price: 68, lead: 3, machine: "laser", stock: "wal18", size: "380 × 260 × 18 mm", foot: { w: 380, h: 260, per: 1 }, pieces: 1,
    sizes: [{ id: "s380", label: "380 × 260 mm", delta: 0 }, { id: "s440", label: "440 × 300 mm", delta: 12 }],
    finishLabel: "Finish", finishes: [{ id: "oil", label: "Food-safe oil", sw: "#6b4423" }, { id: "wax", label: "Oil and beeswax", sw: "#a3763f" }],
    breaks: [1], lettering: { limit: 32, prompt: "One line, up to 32 characters", hint: "We engrave into the face, off to one corner so the middle stays flat for the knife." },
    madeFrom: "One board of American black walnut, 18 mm, edges rounded.", finishedWith: "Sanded to 320 grit and oiled three times.", care: "Hand wash and re-oil it when it looks thirsty.", base: "base:board" },
  { id: "sign-wed", name: "Wedding sign", cat: "signs", unit: "each", icon: "heart", mat: "ply", alts: [{ id: "ply", delta: 0 }, { id: "walnut", delta: 16 }], price: 58, lead: 3, machine: "laser", stock: "ply3", size: "420 × 300 × 3 mm", foot: { w: 420, h: 300, per: 1 }, pieces: 1,
    sizes: [{ id: "s420", label: "420 × 300 mm", delta: 0 }, { id: "s500", label: "500 × 350 mm", delta: 11 }],
    finishLabel: "Finish", finishes: [{ id: "bare", label: "Left bare", sw: "#e0c69e" }, { id: "white", label: "Painted white", sw: "#f2f2f0" }, { id: "wax", label: "Beeswax", sw: "#c8a26a" }],
    breaks: [1], lettering: { limit: 40, prompt: "Up to 40 characters across two lines", hint: "Names and the date, usually. Send us the wording exactly as you want it and we'll send a picture back before we cut." },
    madeFrom: "Baltic birch ply, 3 mm, cut and engraved on the laser.", finishedWith: "Sanded, with a standing foot cut from the same sheet.", care: "Indoors only — ply and rain do not get on." },
  { id: "book-wal", name: "Walnut bookmark", cat: "desk", unit: "each", icon: "bookmark", mat: "walnut", alts: [{ id: "walnut", delta: 0 }, { id: "ply", delta: -4 }], price: 14, lead: 3, machine: "laser", stock: "wal6", size: "150 × 40 × 6 mm", foot: { w: 150, h: 40, per: 1 }, pieces: 1,
    sizes: [{ id: "s150", label: "150 × 40 mm", delta: 0 }],
    finishLabel: "Finish", finishes: [{ id: "oil", label: "Danish oil", sw: "#6b4423" }, { id: "bare", label: "Left bare", sw: "#c9a97a" }],
    breaks: [1, 4, 8], lettering: { limit: 24, prompt: "One line, up to 24 characters", hint: "A name or a short line. It runs down the length of the bookmark." },
    madeFrom: "American black walnut, 6 mm, cut from the same boards as the coasters.", finishedWith: "Sanded thin at the tip and oiled.", care: "Wipe it. That is all it asks." },
  { id: "block-photo", name: "Photo block", cat: "desk", unit: "each", icon: "image", mat: "ply", alts: [{ id: "ply", delta: 0 }, { id: "walnut", delta: 8 }], price: 42, lead: 3, machine: "laser", stock: "ply3", size: "120 × 120 × 20 mm", foot: { w: 120, h: 120, per: 1 }, pieces: 1,
    sizes: [{ id: "s120", label: "120 mm square", delta: 0 }, { id: "s160", label: "160 mm square", delta: 8 }],
    finishLabel: "Finish", finishes: [{ id: "bare", label: "Left bare", sw: "#e0c69e" }, { id: "wax", label: "Beeswax", sw: "#c8a26a" }],
    breaks: [1], lettering: { limit: 30, prompt: "One line under the picture, up to 30 characters", hint: "Send the picture and the line you want under it. We engrave the picture in greyscale, so high contrast works best." },
    madeFrom: "Layers of birch ply pressed to a 20 mm block.", finishedWith: "Engraved in greyscale, edges sanded round.", care: "Keep it out of direct sun so the engraving stays dark." },
  { id: "nook", name: "The Little Bookshop", cat: "desk", unit: "kit of 14 pieces", icon: "house", mat: "ply", alts: [{ id: "ply", delta: 0 }], price: 64, lead: 4, machine: "laser", stock: "ply3", size: "110 × 180 × 150 mm", foot: { w: 150, h: 180, per: 4 }, pieces: 1,
    sizes: [{ id: "kit", label: "One kit", delta: 0 }],
    finishLabel: "Finish", finishes: [{ id: "engraved", label: "Engraved", sw: "#6a4321" }, { id: "paint-black", label: "Painted black", sw: "#17140f" }],
    breaks: [1, 4], lettering: { limit: 14, prompt: "The shop sign, up to 14 characters", hint: "Name the shop. You can put your own words or logo in the left window too." },
    madeFrom: "Birch ply, 3 mm, fourteen pieces cut on the laser.", finishedWith: "Engraved, sanded, packed flat with a sheet of instructions.", care: "Dust it with a soft brush. Keep it out of damp rooms.", base: "base:nook", features: [LOGO] },
  { id: "key-name", name: "Name keyring", cat: "keyrings", unit: "each", icon: "key-round", mat: "resin", alts: [{ id: "resin", delta: 0 }], price: 12, lead: 4, machine: "printer", stock: "pla-chalk", size: "56 × 24 × 4 mm", foot: { w: 56, h: 24, per: 1 }, grams: 6, pieces: 1,
    sizes: [{ id: "s56", label: "56 × 24 mm", delta: 0 }],
    finishLabel: "Colour", finishes: [{ id: "amber", label: "Amber", sw: "#c98a2e" }, { id: "chalk", label: "Chalk", sw: "#e6e1d7" }, { id: "grey", label: "Warm grey", sw: "#8a8378" }, { id: "ink", label: "Ink", sw: "#2b3340" }],
    breaks: [1, 4, 8], lettering: { limit: 8, prompt: "A name, up to 8 letters", hint: "Printed in PLA with the letters raised 1 mm." },
    madeFrom: "Matte PLA, printed at 0.2 mm, with a split ring.", finishedWith: "Edges cleaned by hand, letters raised 1 mm.", care: "Keep it out of a hot car — PLA softens at about 60°C.", base: "base:keyring" },
];
const productById = new Map(PRODUCTS.map((p) => [p.id, p]));

/** The price off from a quantity on, the same ladder for every product that breaks: each product says where its own breaks fall. */
const PERCENT_OFF: Record<number, number> = { 1: 0, 4: 8, 8: 14, 12: 18 };

/** The comp's sheet (`birch-row-data.js` SHEET), and the share of it a nest of pieces fills (`sheetsFor`). */
const SHEET_MM2 = 400 * 300;

/** A sheet's size from its note ("400 × 300 mm sheet"): sheet stock only, what the batch sheet packs onto. */
function sheetSize(m: Material): { sheet_w_mm: number | null; sheet_h_mm: number | null } {
  const found = /^(\d+) × (\d+) mm/.exec(m.note);
  return m.group === "sheet" && found !== null ? { sheet_w_mm: Number(found[1]), sheet_h_mm: Number(found[2]) } : { sheet_w_mm: null, sheet_h_mm: null };
}
const NESTED = 0.72;

/**
 * What one unit takes of its material, in the material's unit (the comp's
 * `sheetsFor`, a unit at a time): a share of a sheet by its footprint, a
 * blank a piece, its grams of filament, a little of a tub of glaze.
 */
function stockPerUnit(p: Product): number {
  const group = MATERIALS.find((m) => m.code === p.stock)?.group;
  if (group === "sheet") return Math.round(((p.foot.w * p.foot.h * p.foot.per) / (SHEET_MM2 * NESTED)) * 1000) / 1000;
  if (group === "blank") return p.foot.per;
  if (group === "filament") return p.grams ?? 100;
  return 0.15;
}

/** A unit's weight: the printed piece's own, or its footprint (the comp's one weight rule, `lineWeight`), times its pieces. */
const gramsOf = (p: Product): number => (p.grams ?? Math.round((p.foot.w * p.foot.h) / 900)) * p.foot.per;

// ── the orders ──────────────────────────────────────────────────────────────

type Stage = "make" | "making" | "finishing" | "ready" | "posted";
type ProofKind = "none" | "waiting" | "approved";
interface Line {
  pid: string;
  qty: number;
  mat: string;
  size: string;
  finish: string;
  note: string;
  stage: Stage;
  proof: ProofKind;
  design?: string;
}
interface LogEntry {
  what: "Proof sent" | "Change asked" | "Approved";
  when: string;
  detail: string;
}
interface Order {
  ref: string;
  ship: "second" | "tracked";
  customer: string;
  email: string;
  placed: string;
  town: string;
  lines: Line[];
  log: LogEntry[];
  posted?: string;
}

const L = (pid: string, qty: number, mat: string, size: string, finish: string, note: string, stage: Stage, proof: ProofKind, design?: string): Line => ({
  pid,
  qty,
  mat,
  size,
  finish,
  note,
  stage,
  proof,
  ...(design === undefined ? {} : { design }),
});
const sent = (when: string, detail: string): LogEntry => ({ what: "Proof sent", when, detail });
const asked = (when: string, detail: string): LogEntry => ({ what: "Change asked", when, detail });
const yes = (when: string, detail: string): LogEntry => ({ what: "Approved", when, detail });

/** The orders on the bench (`birch-row-data.js` 241–342), BR-2288..2290 designed in the Customiser. */
export const ORDERS: Order[] = [
  { ref: "BR-2262", ship: "tracked", customer: "Hana W.", email: "hana.w@mail.example", placed: "2026-07-29", town: "Bramley",
    lines: [L("sign-house", 1, "slate", "s300", "white", "Wren Cottage · est. 1904", "making", "approved")],
    log: [sent("2026-07-29", "Laid out on the 300 mm blank, lettering filled white."), asked("2026-07-30", "Could the est. line sit a bit lower, and slightly smaller than the name?"), sent("2026-07-30", "Second layout with the date line dropped 12 mm."), yes("2026-07-31", "Cut booked on the laser.")] },
  { ref: "BR-2268", ship: "second", customer: "Iris P.", email: "iris.p@mail.example", placed: "2026-07-24", town: "Colne",
    lines: [L("mug-stone", 2, "stoneware", "s350", "sea", "Morning, then", "finishing", "approved"), L("coast-wal", 1, "walnut", "s95", "oil", "The Pughs", "ready", "approved")],
    log: [sent("2026-07-24", "Hand lettering traced on the mug body."), yes("2026-07-25", "Thrown the same afternoon.")] },
  { ref: "BR-2271", ship: "tracked", customer: "Sam O.", email: "sam.o@mail.example", placed: "2026-08-04", town: "Ashby",
    lines: [L("tray-3d", 1, "resin", "s220", "chalk", "", "making", "none"), L("sign-wed", 1, "ply", "s420", "bare", "Sam & Robin — 22 August 2026", "finishing", "approved"), L("key-acr", 2, "acrylic", "s50", "amber", "Robin", "ready", "approved")],
    log: [sent("2026-08-04", "Wedding sign wording, both lines centred."), yes("2026-08-04", "Cut on the Tuesday sheet.")] },
  { ref: "BR-2276", ship: "tracked", customer: "Iris P.", email: "iris.p@mail.example", placed: "2026-08-04", town: "Colne",
    lines: [L("sign-wed", 1, "ply", "s420", "bare", "Iris & Tom · 5 September 2026", "make", "waiting")],
    log: [sent("2026-08-05", "Your layout on the 420 mm sign, both lines centred.")] },
  { ref: "BR-2278", ship: "second", customer: "Erin M.", email: "erin.m@mail.example", placed: "2026-08-05", town: "Rye",
    lines: [L("mug-stone", 2, "stoneware", "s450", "oat", "For the long shifts", "make", "waiting")],
    log: [sent("2026-08-05", "Lettering laid out on the 450 ml body — waiting on Erin.")] },
  { ref: "BR-2280", ship: "second", customer: "Devon A.", email: "devon.a@mail.example", placed: "2026-08-05", town: "Selby",
    lines: [L("tag-pet", 2, "acrylic", "s32", "amber", "Biscuit · 07700 900418", "make", "waiting")],
    log: [sent("2026-08-06", "Both sides shown at size — waiting on Devon.")] },
  { ref: "BR-2281", ship: "second", customer: "Nadia R.", email: "nadia.r@mail.example", placed: "2026-08-06", town: "Lewes",
    lines: [L("coast-wal", 1, "walnut", "s95", "oil", "Fern & Robin — 12.09.2026", "make", "approved")],
    log: [sent("2026-08-06", "Set of four, same line on each."), yes("2026-08-06", "In the queue for the walnut sheet.")] },
  { ref: "BR-2282", ship: "second", customer: "Tom H.", email: "tom.h@mail.example", placed: "2026-08-06", town: "Frome",
    lines: [L("book-wal", 2, "walnut", "s150", "oil", "Read slowly", "make", "approved")],
    log: [yes("2026-08-06", "Short line, no proof needed — Tom asked us to go ahead.")] },
  { ref: "BR-2283", ship: "tracked", customer: "Maya L.", email: "maya.l@mail.example", placed: "2026-08-06", town: "Otley",
    lines: [L("block-photo", 1, "ply", "s120", "bare", "Grandad's boat, 1978", "make", "approved")],
    log: [sent("2026-08-06", "Greyscale test at 120 mm."), yes("2026-08-06", "Queued for the ply sheet.")] },
  { ref: "BR-2284", ship: "second", customer: "Rafe D.", email: "rafe.d@mail.example", placed: "2026-08-06", town: "Truro",
    lines: [L("coast-ply", 2, "ply", "s95", "bare", "Flat 3", "make", "approved")],
    log: [yes("2026-08-06", "Two sets, same line.")] },
  { ref: "BR-2285", ship: "second", customer: "Callum B.", email: "callum.b@mail.example", placed: "2026-08-06", town: "Ayr",
    lines: [L("key-acr", 6, "acrylic", "s50", "frost", "Ferry crew 2026", "make", "approved")],
    log: [yes("2026-08-06", "Six the same.")] },
  { ref: "BR-2286", ship: "tracked", customer: "Priya S.", email: "priya.s@mail.example", placed: "2026-08-06", town: "Hove",
    lines: [L("cake-top", 1, "acrylic", "s160", "ink", "Sixty · and still gardening", "make", "approved")],
    log: [sent("2026-08-06", "Both lines, cut as one piece."), yes("2026-08-06", "On the acrylic sheet.")] },
  { ref: "BR-2287", ship: "tracked", customer: "Bex T.", email: "bex.t@mail.example", placed: "2026-08-06", town: "Kendal",
    lines: [L("sign-house", 1, "slate", "s300", "white", "Number 14 · The Old Dairy", "make", "waiting")],
    log: [sent("2026-08-06", "Laid out on the 300 mm blank, both lines centred, lettering filled white.")] },
  { ref: "BR-2288", ship: "tracked", customer: "Iris P.", email: "iris.p@mail.example", placed: "2026-08-05", town: "Colne",
    lines: [L("nook", 1, "ply", "kit", "engraved", "", "make", "waiting", "design:br-2288")],
    log: [sent("2026-08-05", "Proof 1 — the shop sign at 9 mm, engraved."), asked("2026-08-05", "Could the sign be a little bigger?"), sent("2026-08-06", "Proof 2 — the sign set at 10 mm.")] },
  { ref: "BR-2289", ship: "second", customer: "Sam O.", email: "sam.o@mail.example", placed: "2026-08-06", town: "Ashby",
    lines: [L("key-name", 2, "resin", "s56", "amber", "", "make", "approved", "design:br-2289")],
    log: [sent("2026-08-06", "Proof 1 — raised 1 mm, amber."), yes("2026-08-06", "Queued for printer B.")] },
  { ref: "BR-2290", ship: "second", customer: "Tom H.", email: "tom.h@mail.example", placed: "2026-08-06", town: "Frome",
    lines: [L("coast-wal", 2, "walnut", "s95", "oil", "", "make", "none", "design:br-2290")],
    log: [] },
];

/** Posted orders: the history the customers and Order again pages read (`birch-row-data.js` 389–420). */
export const ARCHIVE: Order[] = [
  { ref: "BR-2241", ship: "second", customer: "Hana W.", email: "hana.w@mail.example", placed: "2026-06-16", posted: "2026-06-20", town: "Bramley", log: [],
    lines: [L("coast-wal", 1, "walnut", "s95", "oil", "Wren Cottage", "posted", "approved")] },
  { ref: "BR-2247", ship: "tracked", customer: "Iris P.", email: "iris.p@mail.example", placed: "2026-06-30", posted: "2026-07-04", town: "Colne", log: [],
    lines: [L("book-wal", 2, "walnut", "s150", "oil", "Iris", "posted", "approved"), L("key-acr", 4, "acrylic", "s50", "frost", "Colne 2026", "posted", "approved")] },
  { ref: "BR-2252", ship: "second", customer: "Sam O.", email: "sam.o@mail.example", placed: "2026-07-09", posted: "2026-07-14", town: "Ashby", log: [],
    lines: [L("pot-3d", 2, "resin", "s110", "warm", "", "posted", "none")] },
  { ref: "BR-2255", ship: "tracked", customer: "Bex T.", email: "bex.t@mail.example", placed: "2026-07-14", posted: "2026-07-18", town: "Kendal", log: [],
    lines: [L("mark-slate", 1, "slate", "s150", "etch", "basil · thyme · mint", "posted", "approved")] },
  { ref: "BR-2258", ship: "second", customer: "Priya S.", email: "priya.s@mail.example", placed: "2026-07-21", posted: "2026-07-25", town: "Hove", log: [],
    lines: [L("board-cut", 1, "walnut", "s380", "oil", "The Sharmas · 2019", "posted", "approved")] },
  { ref: "BR-2260", ship: "tracked", customer: "Erin M.", email: "erin.m@mail.example", placed: "2026-07-23", posted: "2026-07-28", town: "Rye", log: [],
    lines: [L("block-photo", 1, "ply", "s120", "bare", "The allotment, 2015", "posted", "approved")] },
];

/** The studio's order wall clock: the comps keep dates only, so an order came in mid-morning. */
const PLACED_AT = "10:00";

/** A postcode and a street that are nobody's: the sample's own fiction. */
const ADDRESSES: Record<string, { line1: string; postcode: string }> = {
  Bramley: { line1: "Wren Cottage, Back Lane", postcode: "LS13 9ZZ" },
  Colne: { line1: "4 Mill Row", postcode: "BB8 9ZZ" },
  Ashby: { line1: "12 Station Road", postcode: "LE65 9ZZ" },
  Rye: { line1: "2 Mermaid Steps", postcode: "TN31 9ZZ" },
  Selby: { line1: "31 Abbey Walk", postcode: "YO8 9ZZ" },
  Lewes: { line1: "7 Castle Banks", postcode: "BN7 9ZZ" },
  Frome: { line1: "19 Catherine Hill", postcode: "BA11 9ZZ" },
  Otley: { line1: "5 Kirkgate Yard", postcode: "LS21 9ZZ" },
  Truro: { line1: "Flat 3, 8 Lemon Quay", postcode: "TR1 9ZZ" },
  Ayr: { line1: "22 Harbour Street", postcode: "KA7 9ZZ" },
  Hove: { line1: "9 Ventnor Villas", postcode: "BN3 9ZZ" },
  Kendal: { line1: "The Old Dairy, 14 Fellside", postcode: "LA9 9ZZ" },
};

/** Today's bookings on the machines (`birch-row-data.js` 452–464): what is cut, printed and fired, and the lens cleaned. */
const BOOKINGS: { machine: string; from: string; to: string; label: string; kind: "run" | "upkeep" }[] = [
  { machine: "laser", from: "09:00", to: "11:15", label: "Walnut sheet · 6 pieces", kind: "run" },
  { machine: "laser", from: "11:15", to: "11:45", label: "Clean the lens", kind: "upkeep" },
  { machine: "laser", from: "11:45", to: "14:30", label: "Ply sheet · wedding sign and blocks", kind: "run" },
  { machine: "laser", from: "15:00", to: "17:40", label: "Slate · house sign", kind: "run" },
  { machine: "printer-a", from: "09:00", to: "12:20", label: "Desk tray", kind: "run" },
  { machine: "printer-a", from: "13:00", to: "18:00", label: "Desk tray · second half", kind: "run" },
  { machine: "kiln", from: "09:00", to: "18:00", label: "Glaze firing · 2 mugs, holds overnight", kind: "run" },
];

// ── the bundles ─────────────────────────────────────────────────────────────

const opt = (pid: string, kind: string, id: string): string => `option:${pid}:${kind}:${id}`;
const orderLabel = (ref: string): string => `order:${ref}`;
const customerLabel = (email: string): string => `customer:${email.split("@")[0]!}`;

/** The studio's own sample: everything that does not point at a product. */
export function sampleBundle(): SampleBundle {
  const all = [...ARCHIVE, ...ORDERS];
  const customers = new Map<string, { name: string; email: string; first: string }>();
  for (const order of [...all].sort((a, b) => a.placed.localeCompare(b.placed))) {
    if (!customers.has(order.email)) customers.set(order.email, { name: order.customer, email: order.email, first: order.placed });
  }
  return {
    format: "adminium.sample/1",
    app: "maker",
    weekAnchor: "thu",
    tables: [
      { ref: "settings", onlyIfEmpty: true, rows: [SETTINGS] },
      { ref: "machines", rows: MACHINES.map((m, i) => ({ "@label": `machine:${m.code}`, ...m, active: true, position: i + 1 })) },
      {
        ref: "materials",
        rows: MATERIALS.map((m, i) => ({
          "@label": `material:${m.code}`,
          code: m.code,
          name: m.name,
          family: m.family,
          group: m.group,
          thickness_mm: m.thickness ?? null,
          size_note: m.note,
          ...sheetSize(m),
          unit: m.unit,
          machine_id: { "@ref": `machine:${m.machine}` },
          tint: m.tint,
          reorder_at: m.reorder,
          cost: m.cost,
          care: CARE[m.family]!.join("\n"),
          active: true,
          position: i + 1,
        })),
      },
      { ref: "postage_services", rows: POSTAGE.map((s, i) => ({ "@label": `service:${s.code}`, code: s.code, name: s.name, detail: s.detail, tracked: s.tracked, active: true, position: i + 1 })) },
      // One rate a service, from nothing up: a flat charge for the whole order, whatever it weighs.
      { ref: "postage_rates", rows: POSTAGE.map((s) => ({ service_id: { "@ref": `service:${s.code}` }, min_grams: 0, max_grams: null, price: s.price })) },
      { ref: "closures", rows: CLOSURES.map((c) => ({ from_date: day(c.from), to_date: day(c.to), reason: c.reason, active: true })) },
      {
        ref: "customers",
        rows: [...customers.values()].map((c) => ({ "@label": customerLabel(c.email), email: c.email, name: c.name, language: "en-US", may_email: false, created_at: wall(c.first, PLACED_AT) })),
      },
      {
        ref: "orders",
        rows: all.map((o) => ({
          "@label": orderLabel(o.ref),
          number_seq: null,
          number: o.ref,
          status: statusOf(o),
          name: o.customer,
          email: o.email,
          address_line1: ADDRESSES[o.town]!.line1,
          town: o.town,
          postcode: ADDRESSES[o.town]!.postcode,
          language: "en-US",
          customer_id: { "@ref": customerLabel(o.email) },
          service_id: { "@ref": `service:${o.ship}` },
          placed_at: wall(o.placed, PLACED_AT),
          posted_at: o.posted === undefined ? null : wall(o.posted, "16:00"),
          may_email: false,
        })),
      },
      {
        ref: "machine_bookings",
        rows: BOOKINGS.map((b) => ({ machine_id: { "@ref": `machine:${b.machine}` }, kind: b.kind, label: b.label, starts_at: wall(TODAY, b.from), ends_at: wall(TODAY, b.to) })),
      },
      // What is on the shelf: a delivery each, and what this week's batches have spoken for.
      {
        ref: "stock_movements",
        rows: MATERIALS.flatMap((m) => [
          { material_id: { "@ref": `material:${m.code}` }, kind: "received", qty: m.onHand, note: "Opening stock", made_at: wall(addDays(TODAY, -28), "09:00") },
          ...(m.committed === 0 ? [] : [{ material_id: { "@ref": `material:${m.code}` }, kind: "committed", qty: m.committed, note: "This week's batches", made_at: wall(addDays(TODAY, -2), "09:00") }]),
        ]),
      },
    ],
  };
}

/** An order's state from its lines: posted, ready when every line is, placed while none has started. */
function statusOf(o: Order): string {
  if (o.posted !== undefined) return "posted";
  if (o.lines.every((l) => l.stage === "ready")) return "ready";
  if (o.lines.every((l) => l.stage === "make")) return "placed";
  return "making";
}

/** The Customiser's rows for Birch Row, as its own sample ships them, each design version labelled for the proofs. */
function customiserTables(): Table[] {
  const tables = structuredClone(CUSTOMISER_ROWS.tables) as Table[];
  const versions = tables.find((t) => t.ref === "design_versions")!;
  for (const row of versions.rows) {
    const design = ((row["design_id"] as { "@ref": string })["@ref"]).replace("design:", "");
    row["@label"] = `version:${design}-${String(row["version"])}`;
  }
  return tables;
}

/** The studio's rows that link into the Customiser: the catalogue, and every order line with its features and proofs. */
export function customiserSection(): SampleBundle {
  const options: Row[] = [];
  for (const p of PRODUCTS) {
    let position = 0;
    const push = (row: Row) => options.push({ product_id: { "@ref": `product:${p.id}` }, active: true, position: (position += 1), ...row });
    for (const alt of p.alts) push({ "@label": opt(p.id, "material", alt.id), kind: "material", code: alt.id, name: FAMILY[alt.id]!.name, price: alt.delta, material_id: { "@ref": `material:${alt.id === p.mat ? p.stock : FAMILY[alt.id]!.stock}` } });
    for (const size of p.sizes) push({ "@label": opt(p.id, "size", size.id), kind: "size", code: size.id, name: size.label, price: size.delta ?? 0 });
    for (const finish of p.finishes) push({ "@label": opt(p.id, "finish", finish.id), kind: "finish", code: finish.id, name: finish.label, price: 0, swatch: finish.sw ?? null });
    for (const min of p.breaks) push({ kind: "break", code: `from-${String(min)}`, name: min === 1 ? "One or more" : `${String(min)} or more`, price: 0, min_qty: min, percent_off: PERCENT_OFF[min]! });
    for (const f of p.features ?? []) push({ "@label": opt(p.id, "feature", f.code), kind: "feature", code: f.code, name: f.name, price: f.price, feature_code: f.code, feature_id: { "@ref": f.label } });
  }

  const lines: Row[] = [];
  const features: Row[] = [];
  const proofs: Row[] = [];
  for (const order of [...ARCHIVE, ...ORDERS]) {
    order.lines.forEach((line, i) => {
      const p = productById.get(line.pid)!;
      const label = `line:${order.ref}:${String(i + 1)}`;
      const design = line.design === undefined ? null : designOf(line.design);
      lines.push({
        "@label": label,
        order_id: { "@ref": orderLabel(order.ref) },
        position: i + 1,
        product_id: { "@ref": `product:${p.id}` },
        qty: line.qty,
        material_id: { "@ref": opt(p.id, "material", line.mat) },
        size_id: { "@ref": opt(p.id, "size", line.size) },
        finish_id: { "@ref": opt(p.id, "finish", line.finish) },
        lettering: line.note === "" ? null : line.note,
        design_code: design === null ? null : design.code,
        design_id: design === null ? null : { "@ref": line.design },
        post_by: day(postBy(order.placed, PLACED_AT, p.lead)),
        stage: line.stage,
        spoiled: 0,
      });
      // Tom's coasters carry his own logo: the feature his design takes, at its price a piece.
      if (design !== null && design.logo) {
        features.push({ line_id: { "@ref": label }, option_id: { "@ref": opt(p.id, "feature", "logo") }, feature_id: { "@ref": LOGO.label } });
      }
    });
    proofs.push(...proofRows(order));
  }

  return {
    format: "adminium.sample/1",
    app: "maker",
    addOn: "customiser",
    weekAnchor: "thu",
    tables: [
      ...customiserTables(),
      {
        ref: "products",
        own: true,
        rows: PRODUCTS.map((p, i) => ({
          "@label": `product:${p.id}`,
          code: p.id,
          name: p.name,
          category: p.cat,
          unit: p.unit,
          pieces: p.pieces,
          price: p.price,
          lead_days: p.lead,
          machine_kind: p.machine,
          material_id: { "@ref": `material:${p.stock}` },
          grams: gramsOf(p),
          stock_per_unit: stockPerUnit(p),
          size_text: p.size,
          width_mm: p.foot.w,
          height_mm: p.foot.h,
          finish_label: p.finishLabel,
          made_from: p.madeFrom,
          finished_with: p.finishedWith,
          care: p.care,
          icon: p.icon,
          takes_lettering: p.lettering !== null,
          lettering_limit: p.lettering?.limit ?? null,
          lettering_prompt: p.lettering?.prompt ?? null,
          lettering_hint: p.lettering?.hint ?? null,
          base_id: p.base === undefined ? null : { "@ref": p.base },
          published: true,
          position: i + 1,
        })),
      },
      { ref: "options", own: true, rows: options },
      { ref: "order_lines", own: true, rows: lines },
      { ref: "order_line_features", own: true, rows: features },
      { ref: "proofs", own: true, rows: proofs },
    ],
  };
}

/** One of the Customiser's ordered designs: its code, and whether it carries a logo. */
function designOf(label: string): { code: string; logo: boolean } {
  const designs = CUSTOMISER_ROWS.tables.find((t) => t.ref === "designs")!.rows as Row[];
  const found = designs.find((d) => d["@label"] === label);
  if (found === undefined) throw new Error(`the Customiser's sample has no ${label}`);
  const parts = ((found["values"] as { parts?: Record<string, Record<string, unknown>> }).parts ?? {}) as Record<string, Record<string, unknown>>;
  return { code: String(found["code"]), logo: Object.values(parts).some((part) => part["file"] !== undefined) };
}

/**
 * An order's proofs, from its log: each "Proof sent" a version of the first
 * line with words or a design; a change asked marks the version before it, an
 * approval the latest. A line approved with no proof sent ("go ahead") has one
 * version, approved. Every other line with words takes one approved version
 * when the order's was approved.
 */
function proofRows(order: Order): Row[] {
  const lettered = order.lines.map((line, i) => ({ line, i })).filter(({ line }) => line.note !== "" || line.design !== undefined);
  if (lettered.length === 0) return [];
  const rows: Row[] = [];
  const first = lettered[0]!;
  const lineRef = (i: number) => ({ "@ref": `line:${order.ref}:${String(i + 1)}` });
  const versions: Row[] = [];
  for (const entry of order.log) {
    if (entry.what === "Proof sent") {
      versions.push({
        order_id: { "@ref": orderLabel(order.ref) },
        line_id: lineRef(first.i),
        version: versions.length + 1,
        kind: first.line.design === undefined ? "lettering" : "design",
        design_version_id: first.line.design === undefined ? null : { "@ref": `version:${first.line.design.replace("design:", "")}-${String(versions.length + 1)}` },
        note: entry.detail,
        state: "sent",
        sent_at: wall(entry.when, "11:00"),
      });
    } else if (entry.what === "Change asked") {
      Object.assign(versions[versions.length - 1]!, { state: "change_asked", change_note: entry.detail, answered_at: wall(entry.when, "15:00") });
    } else {
      if (versions.length === 0) {
        versions.push({ order_id: { "@ref": orderLabel(order.ref) }, line_id: lineRef(first.i), version: 1, kind: "lettering", design_version_id: null, note: entry.detail, state: "sent", sent_at: wall(entry.when, "11:00") });
      }
      Object.assign(versions[versions.length - 1]!, { state: "approved", answered_at: wall(entry.when, "15:00") });
    }
  }
  rows.push(...versions);
  // The order's other lines with words, approved with it.
  const approved = versions.some((v) => v["state"] === "approved") || order.posted !== undefined;
  for (const { line, i } of lettered.slice(versions.length === 0 ? 0 : 1)) {
    if (!approved || line.proof !== "approved") continue;
    rows.push({ order_id: { "@ref": orderLabel(order.ref) }, line_id: lineRef(i), version: 1, kind: "lettering", design_version_id: null, note: null, state: "approved", sent_at: wall(order.placed, "11:00"), answered_at: wall(order.placed, "15:00") });
  }
  return rows;
}
