/**
 * The delivery company's own dispatch flow on the post office run: its
 * `order.dispatch.actions` fill (the parcel, its rates, booking the
 * collection, the label, the tracking), handed the order as the studio keeps
 * it and the service the shopper chose, so it opens with that service picked.
 *
 * WHERE IT COMES FROM is the door's (`StudioDoor.addOnRegistry`): on a real
 * install, the add-on's client half as Adminium serves it for this app
 * (`add-ons/connected.ts`), which books with the carrier through the add-on's
 * server half and its account; in the demo, the vendored copy compiled in,
 * which answers from its demo carrier and says so on every screen.
 *
 * NOTHING OF IT LOADS WITHOUT A CARRIER. The registry is asked for the first
 * time a screen needs it with DHL attached to the studio; a studio without it
 * never fetches it, and the run shows the service as it always has.
 */
import { useEffect, useState } from "react";

import type { AddOnRegistry } from "../add-ons/host.ts";
import type { StudioDoor } from "./door.ts";
import { useData, useEnv } from "./env.tsx";
import { DHL, dispatchPayload } from "./outbound.ts";
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

/** Whether the studio has DHL attached and switched on. */
export function useDhl(): boolean {
  return useEnv().door.facts().addOns.includes(DHL);
}

/** The delivery company's dispatch flow for one order, or nothing while it loads or without it. */
export function DispatchFill({ order }: { order: Row }) {
  const data = useData();
  const { door } = useEnv();
  const facts = door.facts();
  const on = facts.addOns.includes(DHL);
  const registry = useRegistry(on);
  if (!on || registry === null) return null;
  const fills = registry.fillsFor("order.dispatch.actions", new Set(facts.addOns));
  if (fills.length === 0) return null;
  const payload = dispatchPayload(data, order, { currency: facts.currency, zone: facts.zone, now: door.now() });
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
