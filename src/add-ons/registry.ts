/**
 * The static list the demo registers at startup (24 §5.9).
 *
 * In DEMO MODE the add-on bundles are compiled into the app and named here; in
 * CONNECTED MODE (Phase B) this list comes from `GET /api/v1/add-ons` and the
 * bundles are `import()`ed with their SRI hashes. Only the SOURCE of the list
 * changes — `createRegistry` and every surface below it stay exactly as they
 * are, which is the same seam rule `DataSource` follows.
 *
 * TWO ADD-ONS ARE VENDORED, AND BOTH ARRIVED EXACTLY AS THIS FILE SAID ONE
 * WOULD: an import and an array entry each, beside `./vendor/personalizer/` and
 * `./vendor/shipping-dhl/` copies synced from the `add-ons` monorepo by
 * `scripts/sync-add-ons.sh`. Nothing in `src/screens/` changed to accept either
 * — the nine slots were already there, already mounted, and already honest with
 * nothing connected.
 *
 * THE SECOND ONE IS THE CROSS-APP PROOF, NOT A LEFTOVER (24 D21, AC20).
 * `shipping-dhl` was written for the print works months before this app
 * existed, and it is vendored here with not one byte changed in its package.
 * Registration was the whole integration. It is kept registered rather than
 * removed after the experiment because a claim a reviewer can flip a toggle and
 * watch is worth more than the same claim in a test, and because the surfaces
 * it needs — `order.dispatch.actions` most of all — are surfaces §8A always
 * said this bench had and this app had simply never mounted.
 *
 * BOTH START SWITCHED OFF (`enabled` is an empty set in the store), and that is
 * the demo device rather than an accident: a reviewer sees the shop as a maker
 * with nothing connected sees it — a plain note field with a character counter,
 * the maker's instructions and a proof promise, which is a FINISHED screen and
 * not a gap (D19) — and then flips one toggle in the dock and watches the same
 * page become a live preview. Each toggles independently, so a shop can have
 * the carrier and not the personalizer or the other way round, and flipping
 * either back leaves no orphan control behind.
 *
 * The described-but-not-built shelf entries are NOT add-ons in this sense and
 * are not registered: they are catalogue copy, they name no company, they fill
 * no slot, and they live in `./shelf.ts` — see that file's header for why.
 */

import { registerAddOnMessages } from "../i18n/messages/index.ts";
import { register as registerShippingDhl } from "./vendor/shipping-dhl/index.ts";
import { register as registerPersonalizer } from "./vendor/personalizer/index.ts";
import { defaultSettingsFor, type AddOn, type AddOnSettings } from "./host.ts";
import { NOT_IN_THIS_DEMO } from "./shelf.ts";

/**
 * Registered once, at module load, because REGISTRATION IS WHERE THE MESSAGES
 * ARRIVE.
 *
 * An add-on's strings travel on the add-on object and are merged here rather
 * than being imported by `i18n/messages/index.ts` and type-unioned into the
 * host's own `MessageKey` — a host whose key vocabulary depends on which
 * add-ons happen to be vendored is a host that has to be edited to accept a
 * second one. Doing it at module load rather than in a mount effect is
 * deliberate: this module is imported by the store, which every screen imports,
 * so the merge is complete before the first render reads a bundle.
 */
const REGISTERED: readonly AddOn[] = [registerPersonalizer(), registerShippingDhl()];
for (const addOn of REGISTERED) {
  if (addOn.messages !== undefined) registerAddOnMessages(addOn.key, addOn.messages);
}

/** Everything the shelf shows. */
export function demoAddOns(): AddOn[] {
  return [...REGISTERED, ...NOT_IN_THIS_DEMO];
}

/**
 * What every add-on starts from, keyed by add-on key and OPAQUE to the host.
 *
 * A credentialled add-on's secrets are absent by construction rather than by
 * omission (24 D15): they are `secret: true` settings, they live in its server
 * half, and a store the browser can read is precisely where they must never
 * appear. A connect dialog collects them into component state and drops them;
 * nothing here ever holds one.
 */
export const DEFAULT_ADD_ON_SETTINGS: AddOnSettings = defaultSettingsFor(REGISTERED);

/** The keys a dock toggle could switch — the ones a reviewer can watch. */
export const DEMO_KEYS: readonly string[] = REGISTERED.map((a) => a.key);
