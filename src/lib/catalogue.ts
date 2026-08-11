/**
 * What Birch Row makes, and what each piece is allowed to be.
 *
 * This is DATA. The engines read it; no screen retypes a millimetre and no
 * screen retypes a price. Labels live in the i18n bundle under `data.*` —
 * nothing here is a display string, only keys and numbers — so the whole
 * catalogue translates without this file being touched.
 *
 * THERE IS NO STOCK FIELD ON A PRODUCT, and there never will be (24 D5b).
 * Nothing here is held on a shelf: every piece is made after it is ordered, so
 * the only inventory this app has is MATERIALS, which live in `MATERIAL_STOCK`
 * below and are the maker's business rather than the shopper's.
 * `orders.test.ts` asserts the absence rather than trusting this paragraph.
 */

/** The six materials the studio cuts, prints, throws and glazes. */
export type MaterialKey = "walnut" | "ply" | "slate" | "acrylic" | "resin" | "stoneware";

export const MATERIAL_KEYS: readonly MaterialKey[] = [
  "walnut",
  "ply",
  "slate",
  "acrylic",
  "resin",
  "stoneware",
];

export interface Material {
  key: MaterialKey;
  /** Lucide icon name, one per material, reused wherever the material appears. */
  icon: string;
}

export const MATERIALS: Readonly<Record<MaterialKey, Material>> = {
  walnut: { key: "walnut", icon: "trees" },
  ply: { key: "ply", icon: "layers" },
  slate: { key: "slate", icon: "square" },
  acrylic: { key: "acrylic", icon: "sparkles" },
  resin: { key: "resin", icon: "box" },
  stoneware: { key: "stoneware", icon: "coffee" },
};

/** What a piece IS, for the shop's first filter row. */
export type CategoryKey = "coasters" | "signs" | "keyrings" | "pots" | "desk" | "mugs";

export const CATEGORY_KEYS: readonly CategoryKey[] = [
  "coasters",
  "signs",
  "keyrings",
  "pots",
  "desk",
  "mugs",
];

/**
 * How long a piece sits on the bench, named by the bench it sits on.
 *
 * The four numbers are 24 D5b's, and they are counted in STUDIO days: coasters
 * and keyrings 3, printed pieces 4, slate signs 5, glazed ceramics 10 (they are
 * fired twice). `engraved-wood` is the three-day laser bench that coasters
 * share — a cutting board and a set of coasters are the same machine and the
 * same wait, and giving them two names with one number would invite a future
 * edit to move only one of them.
 */
export type LeadKind = "engraved-wood" | "keyrings" | "printed" | "slate" | "glazed";

export const LEAD_STUDIO_DAYS: Readonly<Record<LeadKind, number>> = {
  "engraved-wood": 3,
  keyrings: 3,
  printed: 4,
  slate: 5,
  glazed: 10,
};

/** The quantity breaks, for the things people buy in sets. */
export const QUANTITY_BREAKS: readonly number[] = [1, 4, 8, 12];

/**
 * What each break costs, as a multiplier on the one-off price.
 *
 * A set of twelve is four sheets' worth of setting-up done once, so the saving
 * is real work rather than a lever. Above twelve the curve stops: 24 §8A puts
 * "quantity breaks above 12" on the cutline, and a bench of two people does not
 * pretend to a hundred.
 */
export const BREAK_MULTIPLIER: Readonly<Record<number, number>> = {
  1: 1,
  4: 0.92,
  8: 0.86,
  12: 0.82,
};

/** A size a piece can be made at, with the millimetres the mono chip prints. */
export interface SizeOption {
  /** Shared vocabulary: `data.size.*` in the bundle. */
  key: "small" | "standard" | "large" | "tall";
  widthMm: number;
  heightMm: number;
  /** Cents on top of the base price. The first size is always 0. */
  deltaCents: number;
}

/** A finish or a glaze colour, as a swatch chip. */
export interface FinishOption {
  /** Shared vocabulary: `data.finish.*` in the bundle. */
  key: string;
  /** The swatch's own colour. Materials are tinted; a finish is a colour. */
  swatch: string;
}

/** An alternative material for the same piece, with what it changes. */
export interface MaterialOption {
  key: MaterialKey;
  deltaCents: number;
}

/**
 * The personalization a piece takes.
 *
 * `limitChars` is what the live counter counts against, and it is a property of
 * the PIECE rather than of the shop: a keyring has one line of eighteen and a
 * wedding sign has thirty, because that is what fits on the object.
 *
 * `hintKey` points at one of five shared sets of maker's instructions — the
 * words beside the field, in the maker's own voice. With the Live Personalizer
 * add-on connected this whole block is replaced by a preview (24 D19); with it
 * off, this is a finished screen and not a placeholder.
 */
export interface Personalize {
  limitChars: number;
  hintKey: "engraved-wood" | "engraved-slate" | "engraved-acrylic" | "painted-glaze" | "markers";
}

/** What one piece consumes off the shelf, per unit made. */
export interface Footprint {
  /** The stock row it comes off. */
  stockKey: StockKey;
  /** The blank's own size in millimetres — what the batcher packs. */
  widthMm: number;
  heightMm: number;
  /** How many blanks one ordered unit is. A set of four is four. */
  perUnit: number;
  /** Grams of filament, for the printed pieces. */
  grams?: number;
  /** Tubs of glaze, for the fired pieces. */
  tubs?: number;
}

export interface Product {
  key: string;
  category: CategoryKey;
  /** The material it is made from by default. */
  material: MaterialKey;
  /** Every material it can be made from, including the default. */
  materials: readonly MaterialOption[];
  leadKind: LeadKind;
  /** Cents, at quantity one, in the default material and the first size. */
  basePriceCents: number;
  /** `data.unit.*` — "each", "set of four", "set of six". */
  unit: "each" | "set-of-four" | "set-of-six";
  sizes: readonly SizeOption[];
  /** `finish` for wood and slate, `glaze` for the fired pieces, `colour` for cut sheet. */
  finishLabel: "finish" | "glaze" | "colour";
  finishes: readonly FinishOption[];
  /** Absent when the piece takes no personalization. */
  personalize?: Personalize;
  /** Whether the quantity break chips show at all. */
  breaks: boolean;
  icon: string;
  footprint: Footprint;
}

const WOOD_FINISHES: readonly FinishOption[] = [
  { key: "oiled", swatch: "#a97b3f" },
  { key: "waxed", swatch: "#4a2d12" },
  { key: "bare", swatch: "#d8c3a2" },
];

const SLATE_FINISHES: readonly FinishOption[] = [
  { key: "plain-edge", swatch: "#4b5563" },
  { key: "bevelled", swatch: "#94a3b8" },
];

const ACRYLIC_FINISHES: readonly FinishOption[] = [
  { key: "clear", swatch: "#cbd5e1" },
  { key: "amber", swatch: "#d97706" },
  { key: "ink", swatch: "#1e293b" },
];

const RESIN_FINISHES: readonly FinishOption[] = [
  { key: "matte-bone", swatch: "#e7e2d8" },
  { key: "matte-sage", swatch: "#8ca88f" },
  { key: "matte-clay", swatch: "#b0705a" },
];

const GLAZES: readonly FinishOption[] = [
  { key: "oatmeal", swatch: "#ddd2be" },
  { key: "seafoam", swatch: "#7fb3a5" },
  { key: "ink-glaze", swatch: "#2b3a55" },
];

/**
 * The fourteen pieces (prompt K's seed).
 *
 * Prices run $9 to $68 and every one of them is made after it is ordered.
 */
export const PRODUCTS: readonly Product[] = [
  {
    key: "walnut-coasters",
    category: "coasters",
    material: "walnut",
    materials: [
      { key: "walnut", deltaCents: 0 },
      { key: "ply", deltaCents: -1200 },
    ],
    leadKind: "engraved-wood",
    basePriceCents: 3400,
    unit: "set-of-four",
    sizes: [
      { key: "standard", widthMm: 95, heightMm: 95, deltaCents: 0 },
      { key: "large", widthMm: 110, heightMm: 110, deltaCents: 600 },
    ],
    finishLabel: "finish",
    finishes: WOOD_FINISHES,
    personalize: { limitChars: 24, hintKey: "engraved-wood" },
    breaks: true,
    icon: "circle-dot",
    footprint: { stockKey: "walnut-3mm", widthMm: 95, heightMm: 95, perUnit: 4 },
  },
  {
    key: "ply-coasters",
    category: "coasters",
    material: "ply",
    materials: [
      { key: "ply", deltaCents: 0 },
      { key: "walnut", deltaCents: 1200 },
    ],
    leadKind: "engraved-wood",
    basePriceCents: 2200,
    unit: "set-of-four",
    sizes: [{ key: "standard", widthMm: 95, heightMm: 95, deltaCents: 0 }],
    finishLabel: "finish",
    finishes: WOOD_FINISHES,
    personalize: { limitChars: 24, hintKey: "engraved-wood" },
    breaks: true,
    icon: "circle-dot",
    footprint: { stockKey: "ply-4mm", widthMm: 95, heightMm: 95, perUnit: 4 },
  },
  {
    key: "house-sign",
    category: "signs",
    material: "slate",
    materials: [{ key: "slate", deltaCents: 0 }],
    leadKind: "slate",
    basePriceCents: 4800,
    unit: "each",
    sizes: [
      { key: "standard", widthMm: 300, heightMm: 200, deltaCents: 0 },
      { key: "large", widthMm: 400, heightMm: 250, deltaCents: 1400 },
    ],
    finishLabel: "finish",
    finishes: SLATE_FINISHES,
    personalize: { limitChars: 28, hintKey: "engraved-slate" },
    breaks: false,
    icon: "home",
    footprint: { stockKey: "slate-blank", widthMm: 300, heightMm: 200, perUnit: 1 },
  },
  {
    key: "garden-markers",
    category: "signs",
    material: "slate",
    materials: [{ key: "slate", deltaCents: 0 }],
    leadKind: "slate",
    basePriceCents: 1800,
    unit: "set-of-six",
    sizes: [{ key: "standard", widthMm: 60, heightMm: 150, deltaCents: 0 }],
    finishLabel: "finish",
    finishes: SLATE_FINISHES,
    personalize: { limitChars: 16, hintKey: "markers" },
    breaks: true,
    icon: "sprout",
    footprint: { stockKey: "slate-blank", widthMm: 60, heightMm: 150, perUnit: 6 },
  },
  {
    key: "keyring",
    category: "keyrings",
    material: "acrylic",
    materials: [
      { key: "acrylic", deltaCents: 0 },
      { key: "walnut", deltaCents: 300 },
    ],
    leadKind: "keyrings",
    basePriceCents: 900,
    unit: "each",
    sizes: [
      { key: "small", widthMm: 38, heightMm: 38, deltaCents: 0 },
      { key: "standard", widthMm: 50, heightMm: 50, deltaCents: 200 },
    ],
    finishLabel: "colour",
    finishes: ACRYLIC_FINISHES,
    personalize: { limitChars: 18, hintKey: "engraved-acrylic" },
    breaks: true,
    icon: "key-round",
    footprint: { stockKey: "acrylic-3mm", widthMm: 50, heightMm: 50, perUnit: 1 },
  },
  {
    key: "pet-tag",
    category: "keyrings",
    material: "acrylic",
    materials: [
      { key: "acrylic", deltaCents: 0 },
      { key: "walnut", deltaCents: 300 },
    ],
    leadKind: "keyrings",
    basePriceCents: 1200,
    unit: "each",
    sizes: [
      { key: "small", widthMm: 28, heightMm: 28, deltaCents: 0 },
      { key: "standard", widthMm: 34, heightMm: 34, deltaCents: 150 },
    ],
    finishLabel: "colour",
    finishes: ACRYLIC_FINISHES,
    personalize: { limitChars: 20, hintKey: "engraved-acrylic" },
    breaks: false,
    icon: "dog",
    footprint: { stockKey: "acrylic-3mm", widthMm: 34, heightMm: 34, perUnit: 1 },
  },
  {
    key: "desk-tray",
    category: "desk",
    material: "resin",
    materials: [{ key: "resin", deltaCents: 0 }],
    leadKind: "printed",
    basePriceCents: 2600,
    unit: "each",
    sizes: [
      { key: "standard", widthMm: 210, heightMm: 140, deltaCents: 0 },
      { key: "large", widthMm: 260, heightMm: 170, deltaCents: 700 },
    ],
    finishLabel: "colour",
    finishes: RESIN_FINISHES,
    breaks: false,
    icon: "inbox",
    footprint: { stockKey: "pla-natural", widthMm: 210, heightMm: 140, perUnit: 1, grams: 240 },
  },
  {
    key: "herb-pot",
    category: "pots",
    material: "resin",
    materials: [{ key: "resin", deltaCents: 0 }],
    leadKind: "printed",
    basePriceCents: 1900,
    unit: "each",
    sizes: [
      { key: "small", widthMm: 90, heightMm: 90, deltaCents: 0 },
      { key: "tall", widthMm: 110, heightMm: 140, deltaCents: 500 },
    ],
    finishLabel: "colour",
    finishes: RESIN_FINISHES,
    breaks: true,
    icon: "flower-2",
    footprint: { stockKey: "pla-sage", widthMm: 110, heightMm: 140, perUnit: 1, grams: 165 },
  },
  {
    key: "stoneware-mug",
    category: "mugs",
    material: "stoneware",
    materials: [{ key: "stoneware", deltaCents: 0 }],
    leadKind: "glazed",
    basePriceCents: 2800,
    unit: "each",
    sizes: [
      { key: "standard", widthMm: 85, heightMm: 95, deltaCents: 0 },
      { key: "large", widthMm: 95, heightMm: 105, deltaCents: 400 },
    ],
    finishLabel: "glaze",
    finishes: GLAZES,
    personalize: { limitChars: 14, hintKey: "painted-glaze" },
    breaks: true,
    icon: "coffee",
    footprint: { stockKey: "glaze-oatmeal", widthMm: 85, heightMm: 95, perUnit: 1, tubs: 0.15 },
  },
  {
    key: "cake-topper",
    category: "signs",
    material: "walnut",
    materials: [
      { key: "walnut", deltaCents: 0 },
      { key: "acrylic", deltaCents: -400 },
    ],
    leadKind: "engraved-wood",
    basePriceCents: 2400,
    unit: "each",
    sizes: [
      { key: "standard", widthMm: 140, heightMm: 90, deltaCents: 0 },
      { key: "large", widthMm: 180, heightMm: 110, deltaCents: 500 },
    ],
    finishLabel: "finish",
    finishes: WOOD_FINISHES,
    personalize: { limitChars: 22, hintKey: "engraved-wood" },
    breaks: false,
    icon: "cake",
    footprint: { stockKey: "walnut-3mm", widthMm: 180, heightMm: 110, perUnit: 1 },
  },
  {
    key: "cutting-board",
    category: "desk",
    material: "walnut",
    materials: [{ key: "walnut", deltaCents: 0 }],
    leadKind: "engraved-wood",
    basePriceCents: 6800,
    unit: "each",
    sizes: [
      { key: "standard", widthMm: 340, heightMm: 240, deltaCents: 0 },
      { key: "large", widthMm: 420, heightMm: 280, deltaCents: 1600 },
    ],
    finishLabel: "finish",
    finishes: WOOD_FINISHES,
    personalize: { limitChars: 26, hintKey: "engraved-wood" },
    breaks: false,
    icon: "utensils",
    footprint: { stockKey: "walnut-6mm", widthMm: 420, heightMm: 280, perUnit: 1 },
  },
  {
    key: "wedding-sign",
    category: "signs",
    material: "walnut",
    materials: [
      { key: "walnut", deltaCents: 0 },
      { key: "ply", deltaCents: -1800 },
    ],
    leadKind: "engraved-wood",
    basePriceCents: 5600,
    unit: "each",
    sizes: [
      { key: "standard", widthMm: 300, heightMm: 400, deltaCents: 0 },
      { key: "large", widthMm: 400, heightMm: 600, deltaCents: 1900 },
    ],
    finishLabel: "finish",
    finishes: WOOD_FINISHES,
    personalize: { limitChars: 30, hintKey: "engraved-wood" },
    breaks: false,
    icon: "heart",
    footprint: { stockKey: "walnut-6mm", widthMm: 400, heightMm: 600, perUnit: 1 },
  },
  {
    key: "bookmark",
    category: "desk",
    material: "walnut",
    materials: [
      { key: "walnut", deltaCents: 0 },
      { key: "ply", deltaCents: -300 },
    ],
    leadKind: "engraved-wood",
    basePriceCents: 1100,
    unit: "each",
    sizes: [{ key: "standard", widthMm: 40, heightMm: 150, deltaCents: 0 }],
    finishLabel: "finish",
    finishes: WOOD_FINISHES,
    personalize: { limitChars: 20, hintKey: "engraved-wood" },
    breaks: true,
    icon: "bookmark",
    footprint: { stockKey: "walnut-3mm", widthMm: 40, heightMm: 150, perUnit: 1 },
  },
  {
    key: "photo-block",
    category: "desk",
    material: "ply",
    materials: [{ key: "ply", deltaCents: 0 }],
    leadKind: "printed",
    basePriceCents: 1600,
    unit: "each",
    sizes: [
      { key: "small", widthMm: 100, heightMm: 100, deltaCents: 0 },
      { key: "standard", widthMm: 150, heightMm: 150, deltaCents: 400 },
    ],
    finishLabel: "finish",
    finishes: WOOD_FINISHES,
    personalize: { limitChars: 18, hintKey: "engraved-wood" },
    breaks: true,
    icon: "image",
    footprint: { stockKey: "ply-4mm", widthMm: 150, heightMm: 150, perUnit: 1 },
  },
];

export const PRODUCT_BY_KEY: Readonly<Record<string, Product>> = Object.fromEntries(
  PRODUCTS.map((p) => [p.key, p]),
);

// ── materials on the shelf ───────────────────────────────────────────────────

export type StockKey =
  | "walnut-3mm"
  | "walnut-6mm"
  | "ply-4mm"
  | "acrylic-3mm"
  | "slate-blank"
  | "pla-natural"
  | "pla-sage"
  | "glaze-oatmeal"
  | "glaze-seafoam"
  | "glaze-ink";

/**
 * How a stock row is counted. FOUR KINDS, ALL OF THEM RAW MATERIAL.
 *
 * There is no fifth kind for finished pieces and there is no room for one: a
 * piece that exists is on its way to somebody, and a piece that does not exist
 * is a line on the queue rather than a number on a shelf.
 */
export type StockUnit = "sheet" | "blank" | "grams" | "tub";

export interface StockRow {
  key: StockKey;
  unit: StockUnit;
  /** The sheet's own size, for the sheet stocks. */
  sheetWidthMm?: number;
  sheetHeightMm?: number;
  onHand: number;
  reorderAt: number;
}

/**
 * The shelf. Four sheet stocks, slate blanks, two filaments and three glazes.
 *
 * `ply-4mm` sits below its reorder point on purpose — it is what makes the
 * "made in small batches" line appear on the shop's ply pieces, which is this
 * app's answer to a scarcity badge: a plain sentence about the material rather
 * than a countdown invented to hurry somebody up.
 */
export const MATERIAL_STOCK: readonly StockRow[] = [
  { key: "walnut-3mm", unit: "sheet", sheetWidthMm: 600, sheetHeightMm: 400, onHand: 18, reorderAt: 6 },
  { key: "walnut-6mm", unit: "sheet", sheetWidthMm: 600, sheetHeightMm: 400, onHand: 9, reorderAt: 4 },
  { key: "ply-4mm", unit: "sheet", sheetWidthMm: 600, sheetHeightMm: 400, onHand: 7, reorderAt: 8 },
  { key: "acrylic-3mm", unit: "sheet", sheetWidthMm: 600, sheetHeightMm: 400, onHand: 12, reorderAt: 5 },
  { key: "slate-blank", unit: "blank", onHand: 34, reorderAt: 12 },
  { key: "pla-natural", unit: "grams", onHand: 2400, reorderAt: 800 },
  { key: "pla-sage", unit: "grams", onHand: 1150, reorderAt: 800 },
  { key: "glaze-oatmeal", unit: "tub", onHand: 4, reorderAt: 2 },
  { key: "glaze-seafoam", unit: "tub", onHand: 3, reorderAt: 2 },
  { key: "glaze-ink", unit: "tub", onHand: 2, reorderAt: 2 },
];

export const STOCK_BY_KEY: Readonly<Record<string, StockRow>> = Object.fromEntries(
  MATERIAL_STOCK.map((s) => [s.key, s]),
);

/**
 * How much of a sheet is usable once the clamps and the edge waste are off.
 *
 * A laser bed does not reach the last few millimetres and nobody cuts a piece
 * out of the corner a clamp is sitting on.
 */
export const SHEET_USABLE = 0.72;
