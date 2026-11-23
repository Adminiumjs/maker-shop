/**
 * The shared kit's two list pieces, for the Shipments screen: who needs a
 * person, and "Refresh open parcels". A real install's carrier bundle does not
 * export them, so they are drawn from the vendored kit, on the app's own client
 * for its shipping routes. Loaded only when that screen opens.
 */
import { configureShippingKit, connectEngineCarrier } from "./vendor/shipping-kit/index.ts";
import { resetShippingKit } from "./vendor/shipping-kit/brand.ts";
import type { EngineCarrier } from "./vendor/host/engine-carrier.ts";

export { NeedsAttentionList, OpenParcelsRefresh } from "./vendor/shipping-kit/index.ts";

const BRANDS: Readonly<Record<string, { name: string; monogram: string; idPrefix: string }>> = {
  "shipping-shippo": { name: "Shippo", monogram: "SH", idPrefix: "SHP" },
  "shipping-dhl": { name: "DHL", monogram: "DH", idPrefix: "DHL" },
};

/** Points the kit's list pieces at this shop's active carrier. A shop that changed carrier gets the new one's name. */
export function connectShipments(client: EngineCarrier): void {
  const brand = BRANDS[client.addOnKey] ?? { name: client.addOnKey, monogram: "--", idPrefix: "X" };
  resetShippingKit();
  configureShippingKit({ addOnKey: client.addOnKey, ...brand });
  connectEngineCarrier(client);
}
