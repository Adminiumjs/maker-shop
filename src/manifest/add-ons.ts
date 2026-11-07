/**
 * The add-ons this app needs and the ones it works better with.
 *
 * It needs the Customiser: a shopper makes a piece their own there (their
 * words, their logo, a ready-made design), and the order line names the
 * design they made. Everything else is offered: the studio takes, makes and
 * posts orders without any of them.
 *
 * The ranges name the add-ons' release this app is made against: 1.0.21 lets
 * an app's role hold everything the Customiser's set-up page reads and
 * writes (the owner sets the shop up without the Customiser's designer
 * role), and 1.0.22 shows a shop's 3D models from above.
 */
import { l } from "./labels.ts";
import { CUSTOMISER } from "./postings.ts";

/** The add-ons' release the owner's set-up grants and the Customiser's 3D views come with. */
export const ADD_ONS_RANGE = "^1.0.22";

export const ADD_ONS = {
  requires: [{ key: CUSTOMISER, range: ADD_ONS_RANGE, reason: l("Shoppers make a piece their own: their words, their logo, a ready-made design.") }],
  suggests: [
    { key: "shipping-dhl", range: ADD_ONS_RANGE, reason: l("Book DHL for a parcel, print its label, and send the shopper a tracking number.") },
    { key: "barcode-labels", range: ADD_ONS_RANGE, reason: l("Print a label for each piece and each parcel.") },
    { key: "inventory", range: ADD_ONS_RANGE, reason: l("Keep sheets, blanks, filament and glaze in stock, with what each batch takes.") },
    { key: "invoices", range: ADD_ONS_RANGE, checked: true, reason: l("Send a receipt with each order, and print one from the dashboard.") },
    { key: "holiday-calendars", range: ADD_ONS_RANGE, reason: l("Close the studio for public holidays in a tap.") },
  ],
  features: [
    { id: "tracking", label: l("Tracking numbers"), requires: ["shipping-dhl"] },
    { id: "labels", label: l("Piece and parcel labels"), requires: ["barcode-labels"] },
    { id: "stock", label: l("Stock through Inventory"), requires: ["inventory"] },
    { id: "receipts", label: l("Receipts"), requires: ["invoices"] },
    { id: "holiday-closures", label: l("Public holidays as closures"), requires: ["holiday-calendars"] },
  ],
};
