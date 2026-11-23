/**
 * Where a carrier finds an order (the manifest's `shipping`). Adminium reads
 * the address from these columns, so no screen can name where a parcel goes.
 *
 * THE LABEL'S COLUMNS ARE NOT THE SHOPPER'S. Adminium writes a bought label's
 * number and company at purchase, and buying a label tells the customer
 * nothing. So they land in two staff-only columns, and "Handed over" copies
 * them to `tracking` and `carrier`, which the shop's order page and e-mail read.
 */
export const SHIPPING = {
  orders: [
    {
      table: "orders",
      reference: "number",
      address: { name: "name", lines: ["address_line1", "address_line2"], city: "town", postcode: "postcode", country: "country", email: "email" },
      tracking: "label_tracking",
      carrier: "label_carrier",
    },
  ],
};
