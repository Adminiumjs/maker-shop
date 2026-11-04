/**
 * What the shop's pages ask of Adminium, and the shapes it answers in.
 *
 * The pages never work a figure out: a price is a dry run's, a total the
 * row the order wrote, a post-by date the one Adminium stamped. Money stays
 * the decimal text the server sent ("34.00") until it is formatted.
 */
import type { CustomiserApi } from "../../vendor/customiser/index.js";
import type { AfterPort } from "./after-port.ts";

export type Id = string | number;
export type Row = Record<string, unknown>;

export interface Product {
  id: Id;
  code: string;
  name: string;
  category: string;
  unit: string;
  price: string;
  leadDays: number;
  materialId: Id | null;
  sizeText: string | null;
  finishLabel: string | null;
  madeFrom: string | null;
  finishedWith: string | null;
  care: string | null;
  icon: string | null;
  /** The address of its photo, or null. */
  photo: string | null;
  takesLettering: boolean;
  letteringLimit: number | null;
  letteringPrompt: string | null;
  letteringHint: string | null;
  /** The Customiser's base it is made on: set, the page offers "Make it yours". */
  baseId: Id | null;
}

export type OptionKind = "material" | "size" | "finish" | "feature" | "break";

export interface Option {
  id: Id;
  productId: Id;
  kind: OptionKind;
  code: string;
  name: string;
  /** A difference to the product's price, or a feature's price a piece. */
  price: string;
  materialId: Id | null;
  swatch: string | null;
  featureCode: string | null;
  minQty: number | null;
  percentOff: string | null;
}

export interface Material {
  id: Id;
  code: string;
  name: string;
  family: string;
  tint: string | null;
  /** Looking after it, a line each, as the studio wrote it. */
  care?: string | null;
}

export interface Service {
  id: Id;
  code: string;
  name: string;
  detail: string | null;
  tracked: boolean;
}

export interface Studio {
  name: string;
  address: string | null;
  about: string | null;
  /** The About page, in the studio's own words (a blank line between paragraphs), and its note on the materials. */
  aboutPage?: string | null;
  materialsNote?: string | null;
  /** What every order number starts with ("BR-"). */
  refPrefix?: string | null;
  takingOrders: boolean;
}

export interface Catalogue {
  products: Product[];
  options: Option[];
  materials: Material[];
  services: Service[];
  studio: Studio;
}

/** The server's zone and money, from its config. */
export interface ShopConfig {
  timezone: string;
  currency: string | null;
}

/** One line of an order as the page sends it. */
export interface LineValues {
  product_id: Id;
  qty: number;
  material_id?: Id;
  size_id?: Id;
  finish_id?: Id;
  lettering?: string;
  design_code?: string;
}

/** An order as the page sends it: the shopper's values, and each line with the features it pays for. */
export interface OrderBody {
  values: Row;
  children: { order_lines: { values: LineValues; children?: { order_line_features: { values: { option_id: Id } }[] } }[] };
}

/** What a dry run or a save answers: the order's figures, and each line's. */
export interface Figures {
  order: Row;
  lines: Row[];
}

/** An order placed: its figures, and its own link. */
export interface Placed extends Figures {
  replayed: boolean;
  link: { token: string } | null;
}

/** A refusal, as the pages read it. */
export interface Refused {
  code: string;
  status: number;
  /** The order's column, or a line's (with its place in the basket). */
  column: string | null;
  child: string | null;
  index: number | null;
  reason: string | null;
  /** On a changed price: the figures the save came to. */
  changed: Figures | null;
  /** The error as the client threw it, for the editor's own reading of a design's refusal. */
  raw: unknown;
}

export interface ShopPort {
  config(): Promise<ShopConfig>;
  catalogue(): Promise<Catalogue>;
  /** A dry run of the order: every figure the save would write, nothing kept. */
  quote(body: OrderBody): Promise<Figures>;
  /** The order, saved once, at the total the shopper was shown. */
  place(body: OrderBody, clientKey: string, expectTotal: string): Promise<Placed>;
  /** The Customiser's calls, through the shop's own clients. */
  customiser(): CustomiserApi;
  /** The pages after an order: signing in, an order and its proofs, the two requests, the footer's pages. */
  after(): AfterPort;
}

/** A refusal is a thrown `ShopError`; anything else is a failure to reach Adminium. */
export class ShopError extends Error {
  readonly refused: Refused;
  constructor(refused: Refused, message: string) {
    super(message);
    this.name = "ShopError";
    this.refused = refused;
  }
}

export const isShopError = (error: unknown): error is ShopError => error instanceof ShopError;
