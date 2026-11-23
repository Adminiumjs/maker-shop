/**
 * The shared kit's two settings panels: "Countries we deliver to" and the
 * customs defaults. Loaded only when Settings opens, for someone who manages
 * shipping, so the shop's and the bench's pages never carry them.
 */
export { CountriesPanel, CustomsDefaultsPanel, type CountryPrices } from "./vendor/shipping-kit/index.ts";
/** The kit's words read the carrier it is named for, so the panels name it too. */
export { connectShipments as connectCountries } from "./shipments.ts";
export { savedBody } from "./vendor/shipping-kit/ui/customsSettings.ts";
