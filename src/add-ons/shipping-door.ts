/** The shape of this app's shipping routes as the studio's screens use them. Types only. */
import type { EngineAccess, EngineCarrier } from "./vendor/host/engine-carrier.ts";

/** The shop's Ship from, as Adminium keeps it. Every field may be missing: a half-filled one is saved, and stops only a purchase. */
export interface ShipFrom {
  name?: string;
  lines?: string[];
  city?: string;
  region?: string;
  postcode?: string;
  country?: string;
  phone?: string;
  company?: string;
  email?: string;
}

/** What someone who manages shipping reads of this install. */
export interface ShippingStatus {
  activeCarrier: string | null;
  carriers: { key: string; name: string }[];
  shipFrom: ShipFrom | null;
  shipFromMissing: string[];
}

/** This app's shipping routes, for the studio's own screens: the client the carrier's screens use, and the shop's setup. */
export interface ShippingDoor {
  client(addOnKey: string): EngineCarrier;
  /** Null for someone with no right on this app's labels. */
  access(): Promise<EngineAccess | null>;
  /** Null for someone who does not manage shipping. */
  status(): Promise<ShippingStatus | null>;
  saveShipFrom(values: ShipFrom): Promise<ShippingStatus>;
}
