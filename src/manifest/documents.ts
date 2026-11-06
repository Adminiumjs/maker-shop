/**
 * The documents this app declares: the receipt for an order, drawn by
 * Invoices & Receipts (the feature `receipts`); and labels, drawn by Barcode
 * labels (the feature `labels`): a sheet for a line's pieces, one label a
 * piece, and one for an order's parcel. A label carries a Code 128 of the
 * row's own code (`BR-2291/1` for a piece, `BR-2291` for a parcel); nothing
 * is copied into the add-on and nothing is written back.
 *
 * Each line is a piece as the order kept it: its name, how many, the price
 * of one after the break with its customising features (named under it), and
 * the line's total, so how many times each is the total. Under them the
 * pieces' total, no tax (the studio's prices include any), and the total
 * with the postage. Invoices & Receipts has no row for a delivery charge yet,
 * so the postage is in the total and not on a line of its own.
 */
import { l } from "./labels.ts";

export const DOCUMENTS = [
  {
    kind: "receipt",
    addOn: "invoices",
    table: "orders",
    feature: "receipts",
    name: l("Receipt"),
    mapping: {
      items: {
        collections: [
          {
            table: "order_lines",
            via: "order_id",
            orderBy: "position",
            columns: {
              desc: "product_name",
              qty: "qty",
              rate: "each_with_features",
              amount: "line_total",
              options: { list: { table: "order_line_features", via: "line_id", column: "name", orderBy: "id" } },
            },
          },
        ],
      },
      subtotal: { column: "pieces_total" },
      tax: { column: "tax" },
      total: { column: "total" },
      reference: { column: "number" },
      issuedAt: { column: "placed_at" },
    },
  },
  {
    kind: "label-sheet",
    addOn: "barcode-labels",
    table: "order_lines",
    feature: "labels",
    name: l("Piece labels"),
    mapping: {
      sku: { column: "id" },
      code: { column: "label_code" },
      reference: { column: "product_name" },
      // A label for each piece: a set of four coasters is four.
      count: { column: "pieces" },
    },
  },
  {
    kind: "label-sheet",
    addOn: "barcode-labels",
    table: "orders",
    feature: "labels",
    name: l("Parcel label"),
    mapping: {
      sku: { column: "id" },
      code: { column: "number" },
      reference: { column: "town" },
    },
    requestValues: ["count"],
  },
];
