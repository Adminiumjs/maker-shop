/**
 * DHL's own dispatch flow on the post office run: its `order.dispatch.actions`
 * fill (the parcel, its rates, booking the collection, the label, the
 * tracking), handed the order as the studio keeps it and the service the
 * shopper chose, so it opens with that service picked.
 *
 * NOTHING OF IT LOADS WITHOUT DHL. The add-on's client half is compiled into
 * its own chunk (`add-ons/registry.ts`) and imported the first time a screen
 * asks for it with DHL attached to the studio; a studio without DHL never
 * fetches it, and the run shows the service as it always has.
 */
import { useEffect, useState } from "react";

import type { AddOnRegistry } from "../add-ons/host.ts";
import { useData, useEnv } from "./env.tsx";
import { DHL, dispatchPayload } from "./outbound.ts";
import type { Row } from "./wire.ts";

let loaded: AddOnRegistry | null = null;
let loading: Promise<AddOnRegistry> | null = null;

/** The registry of the add-ons the studio compiles in, imported once. */
export function loadRegistry(): Promise<AddOnRegistry> {
  loading ??= import("../add-ons/registry.ts").then((m) => {
    loaded = m.STUDIO_REGISTRY;
    return loaded;
  });
  return loading;
}

/** The registry once it is loaded; null until then, and null (never loaded) when `wanted` is false. */
export function useRegistry(wanted: boolean): AddOnRegistry | null {
  const [registry, setRegistry] = useState<AddOnRegistry | null>(loaded);
  useEffect(() => {
    if (!wanted || registry !== null) return;
    let live = true;
    void loadRegistry().then((r) => {
      if (live) setRegistry(r);
    });
    return () => {
      live = false;
    };
  }, [wanted, registry]);
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
