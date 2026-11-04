/**
 * The one document this app declares: the receipt for an order, drawn by
 * Invoices & Receipts (the feature `receipts`).
 *
 * Each line is a piece as the order kept it: its name, how many, the price
 * of one after the break, and the line's total with its customising
 * features. The postage is the order's own line under them.
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
            columns: { desc: "product_name", qty: "qty", rate: "each", amount: "line_total" },
          },
        ],
      },
      subtotal: { column: "pieces_total" },
      total: { column: "total" },
      reference: { column: "number" },
      issuedAt: { column: "placed_at" },
    },
  },
];
