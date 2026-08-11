/**
 * The slot registry, and the nine slots THIS app hosts (24 §5.4, D19, §8A).
 *
 * A mirror of the closed registry in `@adminium/add-on-contracts`, copied
 * rather than imported for the same reason `styles/tokens.css` and
 * `i18n/locales.ts` are: this app is a standalone repo published to the
 * Adminiumjs org and cannot depend on the monorepo. The ids are the contract —
 * do not invent one here.
 *
 * TWO LISTS, AND THE DIFFERENCE MATTERS. `SLOT_IDS` is the whole registry:
 * eleven names an add-on is allowed to declare a fill against, whoever hosts
 * them. `HOSTED_SLOTS` is the nine this shop actually mounts. An add-on
 * written for the print works may fill `artwork.sources`; Birch Row does not
 * mount that, so such a fill simply does not render here — which is exactly what D21 claims when it says the same
 * delivery add-on runs in both shops with no change to either repo. A host that
 * could only accept fills it happened to mount would make that claim false, and
 * a fill silently dropped is not the same defect as a slot declared and never
 * mounted.
 *
 * `addOns.test.ts` asserts that EVERY id in `HOSTED_SLOTS` is mounted somewhere
 * in `src/`, which is the guard `printing` learned the hard way: it declared
 * `nav.add-on.routes`, an add-on shipped a real fill for it, and nothing ever
 * drew it.
 */

/** The closed registry (24 §5.4). Eleven names, and not a twelfth. */
export const SLOT_IDS = [
  'artwork.sources',
  'checkout.delivery.methods',
  'order.dispatch.panel',
  'order.dispatch.actions',
  'settings.add-on.panel',
  'nav.add-on.routes',
  'product.options.personalize',
  'cart.line.preview',
  'product.admin.panel',
  'order.line.actions',
  'record.editor.panel',
] as const;

export type SlotId = (typeof SLOT_IDS)[number];

/**
 * THE NINE THIS SHOP HOSTS (D19, §8A).
 *
 * Three of them a shopper meets — the note field on a piece's page, the postage
 * options at the till, and the dispatch panel on their order. FOUR belong to
 * the bench: a piece's own settings, the actions beside a line on an order, and
 * the two on the dispatch end of a live order. And two are the shop's own
 * management of what is plugged in: the panel an add-on renders inside the
 * manage drawer, and a full-screen route in the maker shell for an add-on that
 * needs a whole page.
 *
 * Three plus four plus two is nine, and the arithmetic is written out because
 * the sentence above said "six" and then "eight" for two revisions after the
 * list had stopped agreeing with either.
 *
 * [Amended 2026-08-10, wave 4b.] `order.dispatch.actions` was MISSING and
 * §8A says this app's bench Order view carries it. Worse than missing: the
 * suite asserted its absence — `isHosted("order.dispatch.actions") === false` —
 * which turned an oversight into a guarded invariant, and a guard written
 * around a gap stops being a guard. It is hosted, mounted in `MakerOrder.tsx`
 * beside what a parcel weighs, and the assertion now says it IS hosted. Its
 * arrival is also what lets the delivery add-on run here at all, which is the
 * concrete half of D21.
 *
 * The other two arrived with the Live Personalizer, and `nav.add-on.routes` is
 * the interesting one. `printing`
 * declared that slot for a release, Design Studio shipped a real fill for it,
 * and nothing anywhere drew it — the print works switches views off one store
 * field and has no route to occupy (24 §5.4's amendment). Birch Row's maker
 * shell does have one, so the slot is hosted HERE and is genuinely mounted, and
 * `addOns.test.ts` asserts every id in this list appears as a `slot="…"`
 * somewhere in `src/`. A slot a host declares and never mounts is worse than an
 * absent one, because an add-on author reads the list and writes code to it.
 */
export const HOSTED_SLOTS = [
  'product.options.personalize',
  'cart.line.preview',
  'checkout.delivery.methods',
  'order.dispatch.panel',
  'order.dispatch.actions',
  'order.line.actions',
  'product.admin.panel',
  'settings.add-on.panel',
  'nav.add-on.routes',
] as const satisfies readonly SlotId[];

export type HostedSlotId = (typeof HOSTED_SLOTS)[number];

/**
 * How a slot behaves when nothing fills it.
 *
 * `speaks` — the host renders a real, honest empty state IN WORDS. THREE of
 * this app's nine do, and each of them has something a person can act on: the
 * note field with its character counter IS the personalization surface until an
 * add-on replaces it (D19); the till says whose postage options those are; and
 * the order says the studio posts everything itself.
 *
 * `silent` — the host renders NOTHING AT ALL. Not a dashed box, not a muted
 * "no add-ons here", not a heading with a gap under it. A dashed placeholder
 * drawn for one of these SIX is THE DEFECT, and their absence is not: the
 * basket line already quotes the shopper's own words back at them, and a maker
 * looking at their own order does not need to be told that a feature they have
 * not bought is not there.
 *
 * Where an empty slot has something to explain it says it in words; where it
 * has nothing to explain it renders nothing.
 *
 * ── THIS TABLE IS THIS APP'S, AND NO OTHER APP'S ────────────────────────────
 *
 * [Ruled 2026-08-11, wave 4b round 3.] The add-on monorepo used to keep a
 * shared copy of these values and make every host match it. It is gone, and the
 * case that settled it is `settings.add-on.panel` below: the print works speaks
 * into that slot because its manage drawer puts the panel under a heading, and
 * this studio is silent in it because its drawer inlines the panel with nothing
 * promised above it. Two screens, both right, one slot id — and the note on
 * `cart.line.preview` below had already found the same thing INSIDE this app,
 * where one id is mounted three times and behaves two ways.
 *
 * Empty behaviour is a property of the screen, so the declaration is local and
 * what checks it is local: `slotRender.test.tsx` renders THIS app and compares
 * every line below against what the page actually hands its mounts, in both
 * directions. The monorepo still checks, across both hosts, that a host decides
 * a behaviour for every slot it mounts and for no slot it does not.
 */
export const SLOT_EMPTY_BEHAVIOUR: Readonly<Record<HostedSlotId, 'speaks' | 'silent'>> = {
  'product.options.personalize': 'speaks',
  'checkout.delivery.methods': 'speaks',
  'order.dispatch.panel': 'speaks',
  /*
   * SILENT, AND TWO OF ITS THREE MOUNTS PASS A FALLBACK ANYWAY — worth knowing
   * before somebody reads this line and the screens together.
   *
   * On the BASKET it is silent in the plain sense: nothing renders, because the
   * quoted note above the line already answers the only question the line has.
   * On the shopper's ORDER and in the maker's send-a-proof dialog the fallback
   * is the material TILE — the picture this app has always drawn there, which
   * exists whether or not a slot does. An add-on REPLACES it rather than
   * filling a gap it left, which is not the same act as a host printing "your
   * preview would go here" and is not what D19 bans.
   *
   * The table has two values and this is three behaviours, so it is written
   * down rather than encoded. `slotRender.test.tsx`'s silent check reaches the
   * basket mount and says so in its own header; extending it to the other two
   * needs this decided first, and deciding it is a third value on this table
   * plus a third count in the shelf's slot copy in eight languages.
   */
  'cart.line.preview': 'silent',
  'order.dispatch.actions': 'silent',
  'order.line.actions': 'silent',
  'product.admin.panel': 'silent',
  /*
   * SILENT HERE AND SPEAKING IN THE PRINT WORKS, which is not drift.
   *
   * `AddOns.tsx` mounts this panel inside the row it is already managing —
   * under the add-on's own name, between the permissions line and the
   * disconnect sentence — and promises nothing above it, so it passes no
   * fallback and an add-on with no settings costs the reader nothing. Marlow
   * Press's drawer gives the same slot its own "Settings" heading, which is a
   * promise, and so it speaks. Change this line only by changing the screen.
   */
  'settings.add-on.panel': 'silent',
  'nav.add-on.routes': 'silent',
};

/**
 * `single` slots take the lowest `order`; `multi` render every fill;
 * `per-add-on` renders the fill belonging to ONE add-on, named by the caller.
 *
 * Stated for all eleven, not only the nine, because it is the registry's rule
 * rather than this app's choice.
 */
export const SLOT_FILL: Readonly<Record<SlotId, 'single' | 'multi' | 'per-add-on'>> = {
  'artwork.sources': 'multi',
  'checkout.delivery.methods': 'multi',
  'order.dispatch.panel': 'single',
  'order.dispatch.actions': 'multi',
  'settings.add-on.panel': 'per-add-on',
  'nav.add-on.routes': 'multi',
  'product.options.personalize': 'single',
  'cart.line.preview': 'multi',
  'product.admin.panel': 'multi',
  'order.line.actions': 'multi',
  'record.editor.panel': 'multi',
};

/** Whether this build mounts a slot at all. */
export function isHosted(slot: SlotId): slot is HostedSlotId {
  return (HOSTED_SLOTS as readonly string[]).includes(slot);
}
