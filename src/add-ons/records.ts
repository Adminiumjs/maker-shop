/**
 * THIS STUDIO'S RECORDS, TURNED INTO SLOT PAYLOADS.
 *
 * ── WHY THE MAPPING LIVES HERE ──────────────────────────────────────────────
 *
 * A slot id names a surface, so its payload has to be a shape every host of
 * that surface can honestly produce (see `payloads.ts`). Birch Row has ORDER
 * LINES — a piece key, a material, a size key, a finish and the shopper's own
 * words — and a print works has jobs with trim sizes and press sheets, and
 * neither vocabulary is the seam's. Something has to convert, and THE HOST IS
 * THE RIGHT PLACE FOR IT: it is the only party that knows both its own records
 * and the shape it promised.
 *
 * This module did not exist, and its absence is one half of 24 D21's failure.
 * Every screen passed its own record straight into `<AddOnSlot>` — `{ order }`,
 * `{ line }`, `{ product }`, `{ postage }` — and the personalizer, the only
 * add-on that had ever been mounted here, simply wrote down what it received:
 * `payload.config.note`, `payload.line.productKey`. That reads like a consumer
 * narrowing safely and is in fact this app's record layout, copied into an
 * add-on's repo. The delivery add-on, written against the OTHER host, did the
 * same thing in the other direction, and neither could run in the other shop.
 *
 * ── WHAT CROSSES, AND WHAT STAYS ────────────────────────────────────────────
 *
 * What crosses: a key, a label ALREADY TRANSLATED, a quantity, the shopper's
 * own words, what one of a thing weighs, how big it is, what it costs.
 *
 * What stays: `materialKey`, `sizeKey`, `finishKey`, `stage`, `proof`,
 * `spoiled`, `leadKind`, `footprint`, `stockKey`. Every one of those is a fact
 * about how THIS studio works, and an add-on that could read them would be an
 * add-on that only runs here.
 *
 * ── THE WEIGHT, WHICH IS THE INTERESTING ONE ────────────────────────────────
 *
 * The studio says what ONE piece weighs; the carrier says what a PARCEL of them
 * weighs. Neither can do the other's half — the studio does not know what a
 * courier's box weighs, and the carrier has no idea that a set of coasters is
 * four 95mm blanks of 3mm walnut. The blank's own footprint is already recorded
 * here for the batcher, so the weight falls out of the data the studio keeps
 * anyway rather than out of a table somebody typed.
 */

import type {
  CatalogueSample,
  HostProduct,
  LineOrder,
  Money,
  OutboundOrder,
  PostalAddress,
  ShopClock,
  SlotItem,
} from "./payloads.ts";
import {
  MATERIALS,
  PRODUCTS,
  type MaterialKey,
  type Product,
} from "../lib/catalogue.ts";
import { eachPriceCents, unitPriceCents, type Order, type OrderLine } from "../lib/orders.ts";
import { CUSTOMERS, STUDIO } from "../data/demo.ts";
import type { BasketLine } from "../state/store.ts";

/** What the studio quotes in, and what a carrier therefore bills in. */
const CURRENCY = "USD";

/**
 * WHAT A SQUARE METRE OF EACH MATERIAL WEIGHS, in grams, at the thickness the
 * studio actually cuts.
 *
 * Density × thickness, done once: 3mm walnut at ~660 kg/m³ is 1980 g/m²; 4mm
 * ply at ~600 is 2400; slate at ~2800 in a 5mm blank is 14000; 3mm acrylic at
 * ~1190 is 3570. Fired stoneware is quoted per finished piece rather than per
 * area because a mug's weight is in its walls, not its footprint.
 *
 * IT IS THE STUDIO'S NUMBER, and that is the whole point of it being here. The
 * delivery add-on used to carry a table like this one — for the OTHER host's
 * paper stocks — which is a fact about a shop held in somebody else's repo.
 */
const GRAMS_PER_SQM: Readonly<Record<MaterialKey, number>> = {
  walnut: 1980,
  ply: 2400,
  slate: 14000,
  acrylic: 3570,
  // Printed pieces are quoted by the filament they eat; see `footprint.grams`.
  resin: 1250,
  // A thrown and twice-fired mug, per piece rather than per area.
  stoneware: 0,
};

/** What one finished thrown piece weighs, where area says nothing useful. */
const STONEWARE_PIECE_GRAMS = 380;

/** The glaze and the wall thickness a fired piece carries beyond its blank. */
const GLAZE_GRAMS = 25;

/**
 * WHAT ONE ORDERED UNIT WEIGHS, in grams.
 *
 * "One unit" is what the shopper buys — a set of four coasters is ONE unit and
 * four blanks, which `footprint.perUnit` already records because the batcher
 * needs it. Nothing here is invented for the carrier: the blank's size, how
 * many of them a unit is, and the grams of filament a printed piece eats are
 * all data this studio keeps to run its own bench.
 */
export function unitWeightGrams(product: Product, materialKey: MaterialKey): number {
  const { footprint } = product;

  // Printed pieces: the filament they eat, plus a little for the raft.
  if (footprint.grams !== undefined) return footprint.grams * 1.06;

  if (materialKey === "stoneware") {
    return (STONEWARE_PIECE_GRAMS + GLAZE_GRAMS) * footprint.perUnit;
  }

  const sqm = (footprint.widthMm / 1000) * (footprint.heightMm / 1000);
  const areal = GRAMS_PER_SQM[materialKey] ?? GRAMS_PER_SQM[product.material];
  const glaze = footprint.tubs === undefined ? 0 : GLAZE_GRAMS;
  return (sqm * areal + glaze) * footprint.perUnit;
}

/** The studio's own address, as the seam wants it. */
export const SHOP_ORIGIN: PostalAddress = {
  name: STUDIO.address.name,
  lines: [...STUDIO.address.lines],
  city: STUDIO.address.city,
  postcode: STUDIO.address.postcode,
  country: STUDIO.address.countryCode,
};

const productOf = (key: string): Product | undefined => PRODUCTS.find((p) => p.key === key);

/**
 * Where a customer is, by the display NAME an order carries.
 *
 * `Order.customer` is a display name by the time a screen sees it — the
 * `DataSource` resolves the key once, on the way out. A miss returns
 * `undefined` rather than anything else: an add-on handed the wrong customer's
 * street would print it onto a label, and nothing on the screen would say it
 * was a guess.
 */
export function addressFor(customerName: string): PostalAddress | undefined {
  const found = CUSTOMERS.find((c) => c.name === customerName);
  if (found === undefined) return undefined;
  return {
    name: found.name,
    lines: [...found.address.lines],
    city: found.town,
    postcode: found.address.postcode,
    country: found.address.country,
  };
}

const money = (cents: number): Money => ({ amount: cents, currency: CURRENCY });

/** One thing the studio sells, as a product-page or setup surface reads it. */
export function hostProduct(product: Product, label: string): HostProduct {
  return {
    key: product.key,
    label,
    // What the studio's OWN note field accepts. An add-on that replaces that
    // field must not let a shopper type more than the shop can store, because
    // the words go back into the shop's field.
    ...(product.personalize !== undefined ? { noteLimit: product.personalize.limitChars } : {}),
    unitSize: { widthMm: product.footprint.widthMm, heightMm: product.footprint.heightMm },
  };
}

/** One line in the basket, as the till's surfaces read it. */
export function basketItem(line: BasketLine, label: string): SlotItem {
  const product = productOf(line.productKey);
  const unitCents =
    product === undefined
      ? 0
      : eachPriceCents(
          unitPriceCents(product, line.materialKey, line.sizeKey),
          line.quantity,
        );

  return {
    id: line.id,
    key: line.productKey,
    label,
    quantity: line.quantity,
    note: line.note,
    ...(product === undefined
      ? {}
      : {
          unitWeightGrams: unitWeightGrams(product, line.materialKey),
          unitSize: {
            widthMm: product.footprint.widthMm,
            heightMm: product.footprint.heightMm,
          },
          unitPrice: money(unitCents),
        }),
  };
}

/** One line on a live order, as the bench's surfaces read it. */
export function orderItem(line: OrderLine, label: string): SlotItem {
  const product = productOf(line.productKey);
  return {
    id: line.id,
    key: line.productKey,
    label,
    quantity: line.quantity,
    note: line.note,
    ...(product === undefined
      ? {}
      : {
          unitWeightGrams: unitWeightGrams(product, line.materialKey),
          unitSize: {
            widthMm: product.footprint.widthMm,
            heightMm: product.footprint.heightMm,
          },
          unitPrice: money(
            eachPriceCents(unitPriceCents(product, line.materialKey, line.sizeKey), line.quantity),
          ),
        }),
  };
}

/** The order a line belongs to, for a line-level surface. */
export function lineOrder(order: Order): LineOrder {
  return { ref: order.ref, recipient: { name: order.customer }, placedOn: order.placedIso };
}

/**
 * A WHOLE ORDER, as `order.dispatch.panel` and `order.dispatch.actions` read it.
 *
 * `promisedFor` is deliberately absent: this studio promises a POST-BY date per
 * line off the calendar rather than one date per order, and inventing an order
 * date to fill an optional field would be worse than leaving it out. An add-on
 * that wants one handles its absence, which is what optional means.
 */
export function outboundOrderFor(
  order: Order,
  label: (productKey: string) => string,
): OutboundOrder {
  const destination = addressFor(order.customer);
  return {
    ref: order.ref,
    recipient: { name: order.customer },
    items: order.lines.map((line) => orderItem(line, label(line.productKey))),
    origin: SHOP_ORIGIN,
    // Absent rather than guessed when the studio has no address on file. The
    // add-on's own screen says so and takes one; see `payloads.ts`.
    ...(destination === undefined ? {} : { destination }),
  };
}

/** The whole basket, as `checkout.delivery.methods` reads it. */
export function checkoutItems(
  basket: readonly BasketLine[],
  label: (productKey: string) => string,
): SlotItem[] {
  return basket.map((line) => basketItem(line, label(line.productKey)));
}

/**
 * ONE REPRESENTATIVE RECORD PER CATEGORY, for `settings.add-on.panel`.
 *
 * It is the studio's own catalogue, narrowed to one per category and labelled
 * in the reader's language — knowledge the host has and no add-on does. It is
 * NOT an estimate of a parcel: no box, no dimensions in centimetres, no rate.
 * An add-on with an opinion about the shop's catalogue forms it with its own
 * engine from these; one with none ignores the field.
 *
 * One row per CATEGORY rather than per piece, because a settings panel listing
 * fourteen pieces would be a catalogue, and the point of the row is the shape
 * of the thing rather than its name.
 */
export function sampleCatalogue(label: (productKey: string) => string): CatalogueSample[] {
  const seen = new Set<string>();
  const rows: CatalogueSample[] = [];

  for (const product of PRODUCTS) {
    if (seen.has(product.category)) continue;
    seen.add(product.category);
    const quantity = product.breaks ? 4 : 1;
    rows.push({
      key: product.key,
      label: label(product.key),
      quantity,
      unitWeightGrams: unitWeightGrams(product, product.material),
      unitSize: { widthMm: product.footprint.widthMm, heightMm: product.footprint.heightMm },
      unitPrice: money(
        eachPriceCents(
          unitPriceCents(product, product.material, product.sizes[0]!.key),
          quantity,
        ),
      ),
    });
  }

  return rows;
}

/**
 * The six materials, kept here ONLY so a reader can see they were deliberately
 * not sent across the seam.
 *
 * `walnut` means nothing to a shop that does not cut wood, and an add-on given
 * a material key would have to keep a table of one studio's materials to do
 * anything with it — which is exactly what the delivery add-on used to do with
 * the other host's paper stocks. A weight and a size cross instead.
 */
export const MATERIALS_STAY_HERE = Object.keys(MATERIALS);

/**
 * THE STUDIO'S OWN CLOCK, as the seam wants it.
 *
 * `iso` is `todayIso()` rather than the seeded date, so "+1 studio day" moves
 * the carrier's estimates with everything else on the screen. The hour and
 * minute are the pin: this studio's demo is set at 16:40 on a Thursday, and
 * that is exactly the instant that matters here — it is PAST a 15:00 collection
 * cut-off, so the delivery add-on has to say the van has gone.
 *
 * It used to hold its own constant and say 10:20, which is the print works'
 * pin, so the panel told a maker the driver was still coming six hours after
 * they had stopped. See `payloads.ts`.
 */
export function shopClock(iso: string, now: { hour: number; minute: number }): ShopClock {
  return { iso, hour: now.hour, minute: now.minute };
}
