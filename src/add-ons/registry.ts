/**
 * The add-ons this studio compiles in: DHL Shipping's client half, and
 * nothing else.
 *
 * THIS IS THE ONE PLACE PRODUCTION SOURCE NAMES AN ADD-ON'S CODE. The studio
 * reaches it only by a dynamic `import()` (`studio/dispatch.tsx`), and only
 * once Adminium says DHL is attached to this app, so a studio without DHL
 * loads none of it.
 *
 * `./vendor/shipping-dhl/` is a SYNCED COPY of the add-ons monorepo's
 * package, not a fork: edit the package and re-run `scripts/sync-add-ons.sh
 * sync`; `status` is the drift check. The object `register()` returns is
 * typed by the vendored contract and assigned here into `readonly AddOn[]`
 * typed by our own `./host.ts`, so `tsc` is the check that the two agree.
 *
 * The client half makes no third-party call of its own: with no carrier
 * injected (nothing in this app injects one) it answers from its demo
 * carrier, in the page, whatever its `demo_transport` setting says.
 * `egress.test.tsx` holds it to reaching nothing off this origin.
 */
import { createRegistry, type AddOn, type AddOnRegistry } from "./host.ts";
import { register as shippingDhl } from "./vendor/shipping-dhl/index.ts";

const REGISTERED: readonly AddOn[] = [shippingDhl()];

/** The registry the studio's slots read. */
export const STUDIO_REGISTRY: AddOnRegistry = createRegistry(REGISTERED);
