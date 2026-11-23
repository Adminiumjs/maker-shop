/**
 * The shared kit's two settings panels: "Countries we deliver to" and the
 * customs defaults. Loaded only when Settings opens, for someone who manages
 * shipping, so the shop's and the bench's pages never carry them.
 */
export { CountriesPanel, CustomsDefaultsPanel, type CountryPrices } from "./vendor/shipping-kit/index.ts";
