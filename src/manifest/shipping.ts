/**
 * Where a carrier finds an order (the manifest's `shipping`). Adminium reads
 * the address from these columns, so no screen can name where a parcel goes.
 *
 * THE LABEL'S COLUMNS ARE NOT THE SHOPPER'S. Adminium writes a bought label's
 * number and company at purchase, and buying a label tells the customer
 * nothing. So they land in two staff-only columns, and "Handed over" copies
 * them to `tracking` and `carrier`, which the shop's order page and e-mail read.
 *
 * WHAT A CUSTOMS FORM DECLARES IS WHAT THE CUSTOMER PAID. A line's total is its
 * quantity times `each_with_features`, exactly: the price with its options and
 * quantity break (`each`) plus its priced features. `unit_price` is the list
 * price before any of that, and `each` alone would leave the features out.
 *
 * A CANCELLED LINE IS NOT IN THE PARCEL, by its stage. The order's refunds sit on
 * the order, so while one stands its values are not what the customer paid and
 * Adminium stops the form.
 */
export const SHIPPING = {
  orders: [
    {
      table: "orders",
      reference: "number",
      address: { name: "name", lines: ["address_line1", "address_line2"], city: "town", postcode: "postcode", country: "country", phone: "phone", email: "email" },
      tracking: "label_tracking",
      carrier: "label_carrier",
      customs: {
        lines: {
          table: "order_lines",
          order: "order_id",
          description: "product_name",
          quantity: "qty",
          unitValue: "each_with_features",
          product: { column: "product_id", table: "products", sku: "code" },
          unitWeight: "grams",
          weightUnit: "g",
          unless: { column: "stage", in: ["cancelled"] },
        },
        refunded: "refunded",
        // Once the shop changes currency, an order from before it cannot be declared in the new one.
        placedAt: "placed_at",
      },
    },
  ],
};
