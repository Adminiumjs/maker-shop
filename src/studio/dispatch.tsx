/**
 * The delivery company's own dispatch flow: its `order.dispatch.actions` fill
 * (the parcel, its rates, the label, the tracking), handed the order as the
 * studio keeps it and the service the shopper chose.
 *
 * WHERE IT COMES FROM is the door's (`StudioDoor.addOnRegistry`): on a real
 * install, the add-on's client half as Adminium serves it for this app
 * (`add-ons/connected.ts`), which reaches the carrier through Adminium and the
 * shop's own account; in the demo, the vendored copy compiled in, which answers
 * from its demo carrier and says so on every screen.
 *
 * ONE CARRIER AT A TIME. A shop may have two attached. Adminium says which is
 * active, and only that one's flow is drawn, so nobody can buy from the other.
 *
 * NOTHING OF IT LOADS WITHOUT A CARRIER. A studio with none attached never
 * fetches the registry, and the run shows the service as it always has.
 */
import { useEffect, useState } from "react";

import type { ShippingDoor } from "../add-ons/shipping-door.ts";
import type { AddOnRegistry } from "../add-ons/host.ts";
import type { EngineAccess } from "../add-ons/vendor/host/engine-carrier.ts";
import { useT } from "../i18n/index.tsx";
import type { StudioDoor } from "./door.ts";
import { useData, useEnv } from "./env.tsx";
import { CARRIERS, DHL, dispatchPayload } from "./outbound.ts";
import type { Row } from "./wire.ts";

/** Each door's registry once it has loaded, so a screen drawn again does not wait for it twice. */
const loaded = new WeakMap<StudioDoor, AddOnRegistry>();

/** The door's add-on registry once it is loaded; null until then, and null (never asked) when `wanted` is false. */
export function useRegistry(wanted: boolean): AddOnRegistry | null {
  const { door } = useEnv();
  const [registry, setRegistry] = useState<AddOnRegistry | null>(loaded.get(door) ?? null);
  useEffect(() => {
    if (!wanted || registry !== null) return;
    let live = true;
    void door.addOnRegistry().then((r) => {
      loaded.set(door, r);
      if (live) setRegistry(r);
    });
    return () => {
      live = false;
    };
  }, [wanted, registry, door]);
  return wanted ? registry : null;
}

/** Whether the studio has a delivery company attached and switched on. */
export function useCarrierAttached(): boolean {
  const addOns = useEnv().door.facts().addOns;
  return CARRIERS.some((key) => addOns.includes(key));
}

export interface ShippingView {
  /** Null in the demo, which has no Adminium to ask. */
  ship: ShippingDoor | null;
  /** What this person may do. Null with no right on the app's labels, or while unread. */
  access: EngineAccess | null;
  ready: boolean;
}

const asked = new WeakMap<ShippingDoor, Promise<EngineAccess | null>>();

/** What Adminium says this person may do with this app's labels, asked once per door. */
export function useShipping(): ShippingView {
  const { door } = useEnv();
  const attached = useCarrierAttached();
  const ship = attached ? door.shipping() : null;
  const [seen, setSeen] = useState<{ access: EngineAccess | null; ready: boolean }>({ access: null, ready: false });
  useEffect(() => {
    if (ship === null) return;
    let live = true;
    const once = asked.get(ship) ?? ship.access().catch(() => null);
    asked.set(ship, once);
    void once.then((access) => {
      if (live) setSeen({ access, ready: true });
    });
    return () => {
      live = false;
    };
  }, [ship]);
  return { ship, access: seen.access, ready: ship === null || seen.ready };
}

/** The active delivery company's dispatch flow for one order, or nothing while it loads or without one. */
export function DispatchFill({ order }: { order: Row }) {
  const t = useT();
  const data = useData();
  const { door } = useEnv();
  const facts = door.facts();
  const on = useCarrierAttached();
  const { ship, access, ready } = useShipping();
  const registry = useRegistry(on);
  if (!on || !ready || registry === null) return null;
  if (ship !== null && access === null) return null;
  const active = ship === null ? DHL : (access?.carrier ?? null);
  if (active === null) return <p className="st-small">{t("studio.ship.noCarrier")}</p>;
  const fills = registry.fillsFor("order.dispatch.actions", new Set(facts.addOns)).filter((entry) => entry.addOn === active);
  if (fills.length === 0) return null;
  const payload = dispatchPayload(data, order, { currency: facts.currency, zone: facts.zone, now: door.now(), carrier: active });
  return (
    <div className="st-fill" data-add-on-slot="order.dispatch.actions">
      {fills.map((entry) => {
        const settings = facts.addOnSettings[entry.addOn] ?? {};
        // An add-on that keeps its own copy of its settings is told them before it draws (replacing, so it is the same every time).
        registry.byKey(entry.addOn)?.applySettings?.(settings);
        return <div key={entry.addOn}>{entry.fill.render({ ...payload, settings })}</div>;
      })}
    </div>
  );
}
