/**
 * CATALOGUE COPY: the shelf entries that are described but not built HERE.
 *
 * A demo shelf holding exactly the add-ons it happens to ship reads as though
 * those are all there could ever be. These say what a next wave would plausibly
 * hold, in the same plain voice, and each carries a muted "Not in this demo"
 * chip INSTEAD OF a Connect button — a button that does nothing is worse than
 * no button, and a chip that says why is better than both. They fill no slots,
 * ask for no permissions and have no settings, because there is nothing behind
 * them to configure.
 *
 * ── THERE USED TO BE FOUR, AND TWO OF THEM HAD STOPPED BEING TRUE ───────────
 *
 * [Amended 2026-08-10, wave 4b.] This file was written when the build vendored
 * NOTHING, and it said so. It then kept describing "a live preview for
 * personalized pieces" and "a delivery company" as absent while the Live
 * Personalizer and the delivery add-on were both vendored, registered and one
 * dock toggle away — so the shelf showed a reviewer a card claiming the demo
 * lacked the exact thing three cards along was doing.
 *
 * The live-preview entry is GONE: `product.options.personalize` is a `single`
 * slot, so a second one would be a conflict rather than a capability, and the
 * built add-on is the honest answer to "could something draw here?".
 *
 * The carrier entry STAYS and is now "a SECOND delivery company", which is the
 * claim actually being made. `checkout.delivery.methods` is a `multi` slot, the
 * dispatch panel already tells a maker "DHL is the only delivery company
 * connected — connect another in Add-ons", and removing the entry would have
 * pointed that sentence at an empty shelf.
 *
 * THEY NAME NO COMPANY, AND THAT IS THE POINT OF THIS FILE EXISTING (24 D12,
 * and `print-shop` learned it by shipping three real firms' names in its own
 * source for integrations that did not exist). Each entry says WHAT IT WOULD DO
 * rather than WHO WOULD DO IT: a live preview for personalized pieces, a
 * delivery company, a card payment processor, a mailing-list service. An add-on
 * that IS built names its own company, nominatively, in its own repo, where a
 * `TRADEMARKS.md` sits beside the claim.
 *
 * D10c APPLIES HERE HARDEST. This is the file where "sell on the same places
 * you sell now" would be a natural line to write, and no shipped copy in this
 * repo names another online marketplace, compares us to one, or quotes anyone's
 * commission.
 *
 * `nameKey` rather than `name`: a real add-on's name is a proper noun and does
 * not translate, but these are DESCRIPTIONS, and a description that stayed in
 * English on an Arabic shelf would be the one untranslated line on the screen.
 *
 * `whatKey` repeats `lineKey` on all four because the connect dialog cannot
 * open for something that is not connectable, and inventing a second sentence
 * for a screen nobody can reach would be inventing copy for a product that does
 * not exist.
 */

import type { AddOn } from "./host.ts";

export const NOT_IN_THIS_DEMO: readonly AddOn[] = [
  {
    key: "delivery-second-carrier",
    name: "A second delivery company",
    nameKey: "addon.stub.carrier.name",
    shortName: "Second carrier",
    lineKey: "addon.stub.carrier.line",
    whatKey: "addon.stub.carrier.line",
    // Monograms are letters on a neutral tile (D12). With no company to
    // initialise, these initialise the capability instead.
    monogram: "DEL",
    category: "delivery",
    connect: "api-key",
    permissions: [],
    settings: [],
    namesCompany: false,
    noCompanyKeys: ["addon.stub.carrier.noCompany"],
    inDemo: false,
    fills: [],
  },
  {
    key: "payments-card",
    name: "A card payment processor",
    nameKey: "addon.stub.cardPayments.name",
    shortName: "Card payments",
    lineKey: "addon.stub.cardPayments.line",
    whatKey: "addon.stub.cardPayments.line",
    monogram: "PAY",
    category: "payments",
    connect: "oauth2",
    permissions: [],
    settings: [],
    namesCompany: false,
    noCompanyKeys: ["addon.stub.cardPayments.noCompany"],
    inDemo: false,
    fills: [],
  },
  {
    key: "email-mailing-list",
    name: "A mailing-list service",
    nameKey: "addon.stub.mailingList.name",
    shortName: "Mailing list",
    lineKey: "addon.stub.mailingList.line",
    whatKey: "addon.stub.mailingList.line",
    monogram: "LST",
    category: "email",
    connect: "api-key",
    permissions: [],
    settings: [],
    namesCompany: false,
    noCompanyKeys: ["addon.stub.mailingList.noCompany"],
    inDemo: false,
    fills: [],
  },
];
