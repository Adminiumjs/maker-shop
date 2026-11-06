/**
 * The add-ons the DEMO studio compiles in: DHL Shipping's client half, and
 * nothing else. A real install never loads this: its studio draws the client
 * half Adminium serves for the app (`connected.ts`), which books with the
 * carrier for real.
 *
 * THIS IS THE ONE PLACE PRODUCTION SOURCE NAMES AN ADD-ON'S CODE. The demo's
 * door reaches it only by a dynamic `import()` (`demo/studio.ts`), and only
 * once a screen needs DHL's flow with DHL switched on, so a demo without DHL
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
 * carrier, in the page, whatever its `demo_transport` setting says, which is
 * why only the demo may mount it. `egress.test.tsx` holds it to reaching
 * nothing off this origin.
 */
import { createRegistry, type AddOn, type AddOnRegistry } from "./host.ts";
import { register as shippingDhl } from "./vendor/shipping-dhl/index.ts";

const REGISTERED: readonly AddOn[] = [shippingDhl()];

/** The registry the studio's slots read. */
export const STUDIO_REGISTRY: AddOnRegistry = createRegistry(REGISTERED);
