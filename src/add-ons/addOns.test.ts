/**
 * The add-on seam's own suite.
 *
 * What it tests is the SEAM: that registering an add-on and enabling one are
 * different things (D6), that the registry resolves fills the way each slot's
 * fill rule says it should, and that the shelf carries what 24 D12 and AC6
 * require of it. All of that is data and functions, which is what a suite over
 * modules can honestly hold.
 *
 * WHAT IT NO LONGER CLAIMS TO HOLD IS D19. Two of its assertions used to, and
 * neither did: the empty-state check read `SLOT_EMPTY_BEHAVIOUR` back to
 * itself, and "mounts every id it hosts" was a grep for `slot="…"` that a
 * COMMENT satisfied. Both are proven blind by mutants recorded in
 * `slotRender.test.tsx`, which renders the screens in a DOM and holds the rule
 * where the rule lives — on the page.
 */

import { describe, expect, it } from "vitest";

import { createRegistry, isConnectable, type AddOn, type AddOnFill } from "./host.ts";
import { DEFAULT_ADD_ON_SETTINGS, DEMO_KEYS, demoAddOns } from "./registry.ts";
import { HOSTED_SLOTS, SLOT_EMPTY_BEHAVIOUR, SLOT_FILL, SLOT_IDS, isHosted } from "./slots.ts";

const ALL = demoAddOns();

describe("the registry this build ships", () => {
  /**
   * TWO ADD-ONS ARE VENDORED, AND BOTH START SWITCHED OFF.
   *
   * The distinction is the whole demo device (24 §5.9, D6): a REGISTERED
   * add-on is one the build carries, an ENABLED one is one the shop has turned
   * on, and the app boots with `enabled` empty. So every screen a reviewer
   * opens first is still the screen a maker with nothing connected sees — the
   * only way to know the empty states are finished rather than pending (D19) —
   * and one toggle in the dock turns the plain note field into a live preview.
   *
   * ── THE SECOND ONE IS THE POINT (D21) ──────────────────────────────────
   *
   * `shipping-dhl` was written for the PRINT WORKS, months before this app
   * existed, and it is vendored here with not one byte changed in its package.
   * What it took was registration: one line in `scripts/sync-add-ons.sh`, one
   * import and one array entry in `registry.ts`. Nothing in `packages/shipping-dhl`
   * and nothing in this app's screens knows the other exists.
   *
   * That was FALSE the first time it was tried, and the falsehood is worth
   * keeping written down: the add-on compiled, then threw in three components,
   * because every payload had been shaped like whichever host happened to send
   * it. The fix was `payloads.ts` — payloads named for the SURFACE — plus
   * hosting `order.dispatch.actions`, which §8A always said this view carried.
   *
   * ── AND IT NO LONGER PINS THE CENSUS ────────────────────────────────────
   *
   * [Amended 2026-08-11, wave 4b round 4.] This assertion used to open with
   * `expect(DEMO_KEYS).toEqual(["personalizer", "shipping-dhl"])`, and that one
   * line made the whole claim above self-defeating: vendoring a THIRD portable
   * add-on here turned the suite red before a single screen was looked at. It
   * was found by doing exactly that — registering the print works' Design
   * Studio in this app, which ran faultlessly and failed here alone.
   *
   * It is the `HOSTED_SLOTS` defect this wave already fixed, one file over: a
   * host whose suite forbids the thing the host exists to allow. What is worth
   * asserting is not HOW MANY add-ons are on the shelf but the RELATIONS that
   * have to hold whatever the count is — every vendored key is registered, the
   * defaults table and the vendored list name each other exactly, no two
   * add-ons share a key, and nothing is enabled at boot. Each of those is still
   * true of a build with a fourth add-on, and each of them would still catch a
   * registration that was half-done.
   *
   * The two named add-ons keep their own assertions below, because "this add-on
   * carries these settings" is a fact about that add-on rather than a count.
   */
  it("registers every add-on it vendors, and enables none of them", () => {
    for (const key of DEMO_KEYS) {
      expect(ALL.map((a) => a.key), `${key} is vendored but not registered`).toContain(key);
    }
    expect(new Set(ALL.map((a) => a.key)).size, "two add-ons share a key").toBe(ALL.length);
    // The defaults table and the vendored list are each other's, exactly: a
    // vendored add-on with no defaults boots with an empty settings object, and
    // defaults for an add-on nobody vendors are dead weight nothing applies.
    expect(Object.keys(DEFAULT_ADD_ON_SETTINGS).sort()).toEqual([...DEMO_KEYS].sort());
    // Connectable and vendored are the same set — an add-on the shelf offers a
    // Connect button for is one this build can actually switch on.
    expect(ALL.filter((addOn) => isConnectable(addOn)).map((a) => a.key).sort()).toEqual(
      [...DEMO_KEYS].sort(),
    );
    // Each one's defaults are its own, under its own machine keys, opaque here.
    expect(Object.keys(DEFAULT_ADD_ON_SETTINGS.personalizer!).sort()).toEqual([
      "default_finish",
      "offered_fonts",
      "proof_required",
    ]);
    expect(Object.keys(DEFAULT_ADD_ON_SETTINGS["shipping-dhl"]!).sort()).toEqual([
      "collection_cutoff",
      "demo_transport",
    ]);
  });

  /**
   * THE CROSS-APP CLAIM, ASSERTED RATHER THAN DESCRIBED.
   *
   * The delivery add-on fills four slots, and this shop mounts all four — which
   * is why registration was the whole integration.
   *
   * ── AND THE COMMENT THAT USED TO BE HERE WAS WRONG ────────────────────────
   *
   * [Corrected 2026-08-11, wave 4b round 4.] It read "This app mounts three of
   * them and does not mount `artwork.sources`", and closed with
   * `expect(isHosted("artwork.sources")).toBe(false)` as though that were the
   * fourth fill going quietly undrawn. `artwork.sources` is not one of this
   * add-on's fills and never was: it fills `order.dispatch.actions`,
   * `checkout.delivery.methods`, `order.dispatch.panel` and
   * `settings.add-on.panel`, all four of them mounted here. The assertion was
   * true and the sentence it was written to support was not, which is the worst
   * combination a test can carry — a green line under a false claim.
   *
   * The mechanism the sentence was reaching for is real and worth asserting, so
   * it is asserted below with a fill that genuinely names a slot this shop does
   * not mount, rather than borrowed from an add-on that does not have one.
   */
  it("renders the print works' delivery add-on on THIS app's surfaces (D21)", () => {
    const registry = createRegistry(ALL);
    const on = new Set(["shipping-dhl"]);

    for (const slot of [
      "checkout.delivery.methods",
      "order.dispatch.panel",
      "order.dispatch.actions",
      "settings.add-on.panel",
    ] as const) {
      expect(registry.fillsFor(slot, on), slot).toHaveLength(1);
    }

    // Every slot it fills is one this shop mounts. Nothing it ships is dropped
    // here — the fills and the mounts happen to line up exactly.
    const carrier = ALL.find((addOn) => addOn.key === "shipping-dhl")!;
    for (const fill of carrier.fills) {
      expect(isHosted(fill.slot), `${fill.slot} is filled but not mounted here`).toBe(true);
    }
  });

  /**
   * AND THE ONE THAT IS ABOUT A SLOT RATHER THAN ABOUT A PACKAGE (24 D21).
   *
   * The case above proves a package crosses two shops unchanged. This proves
   * something the delivery add-on cannot: that `record.actions` names a
   * SURFACE. Both example apps mount it, on the same day, on two screens with
   * nothing whatever in common — a maker's piece here, a works' job there — and
   * `barcode-labels` fills it once, for both. An id with a single host is
   * indistinguishable from an id that names that host's own screen; an id with
   * two is a contract.
   *
   * The fill is asserted through the registry rather than by reading the
   * add-on's `fills` array, because what a shop draws is what the registry
   * hands its mounts. `slotRender.test.tsx` closes the other end by rendering
   * the piece screen and finding the mount there.
   */
  it("resolves the label add-on's fills, including the twelfth slot", () => {
    const registry = createRegistry(ALL);
    const on = new Set(["barcode-labels"]);

    for (const slot of ["record.actions", "settings.add-on.panel"] as const) {
      expect(registry.fillsFor(slot, on), slot).toHaveLength(1);
    }

    // Every slot it fills is one this shop mounts — which was NOT true before
    // `record.actions` was hosted, and is the concrete thing 31-T11 changed.
    const labels = ALL.find((addOn) => addOn.key === "barcode-labels")!;
    for (const fill of labels.fills) {
      expect(isHosted(fill.slot), `${fill.slot} is filled but not mounted here`).toBe(true);
    }
  });

  /**
   * AND A FILL FOR A SLOT THIS SHOP DOES NOT MOUNT IS DROPPED IN SILENCE.
   *
   * The other half of D21, and the half that lets an add-on be written once: a
   * host is not required to mount everything an add-on fills, and one that
   * refused such an add-on would make "runs in both shops with no change to
   * either repo" false. `artwork.sources` is a print works' surface — a way for
   * a customer to send in artwork — and this studio has no use for it, so an
   * add-on that fills it is registered like any other and simply never asked.
   *
   * WHERE THE DROP HAPPENS IS THE POINT. The registry answers honestly — it
   * holds the fill and would hand it over — and NOTHING EVER ASKS, because the
   * only thing that asks is an `<AddOnSlot slot="…">` on a screen and this app
   * mounts no such surface. That is the difference between a host that tolerates
   * a foreign add-on and one that has to be edited to accept it.
   */
  it("registers an add-on whose slot it does not mount, and never draws it", () => {
    const carrier = ALL.find((addOn) => addOn.key === "shipping-dhl")!;
    /*
     * The fill is written out rather than spread off the carrier's: a fill is
     * typed BY ITS SLOT — `render` takes that slot's payload — so changing the
     * `slot` of an existing one is a type error, which is the seam working.
     */
    const artworkFill: AddOnFill<"artwork.sources"> = {
      slot: "artwork.sources",
      order: 10,
      render: () => null,
    };
    const fromElsewhere: AddOn = {
      ...carrier,
      key: "an-add-on-for-another-shop",
      fills: [artworkFill],
    };

    expect(isHosted("artwork.sources")).toBe(false);
    const registry = createRegistry([...ALL, fromElsewhere]);
    // Registered, not refused: no throw, no filtering, no complaint.
    expect(registry.byKey(fromElsewhere.key), "the registry refused it").toBeDefined();
    // And the surface that would draw it does not exist in this app, which is
    // what `slotRender.test.tsx` checks from the other end by mounting every
    // screen and collecting the slots React actually asked for.
    expect(HOSTED_SLOTS as readonly string[]).not.toContain("artwork.sources");
  });

  it("gives every entry a monogram of two or three letters and no brand colour", () => {
    // 24 D12. A monogram is the entire visual identity an add-on gets, and the
    // shelf is where a logo-ish mark would first appear.
    for (const addOn of ALL) {
      expect(addOn.monogram).toMatch(/^[A-Z]{2,3}$/);
      expect(JSON.stringify(addOn)).not.toMatch(/#[0-9a-f]{3,6}/i);
    }
  });

  it("only lets a described-but-not-built entry claim a slot if it is built", () => {
    for (const addOn of ALL) {
      if (!isConnectable(addOn)) expect(addOn.fills).toHaveLength(0);
    }
  });

  it("leaves no detail surface silent about who else is involved (24 AC6)", () => {
    // An entry that names a company carries the disclaimer; one that names none
    // says so positively, in ITS OWN words. Rendering nothing there is
    // indistinguishable from having forgotten the notice.
    const silent = ALL.filter(
      (addOn) => !addOn.namesCompany && (addOn.noCompanyKeys ?? []).length === 0,
    ).map((a) => a.key);
    expect(silent).toEqual([]);
    for (const addOn of ALL) {
      if (addOn.namesCompany) expect(addOn.noCompanyKeys ?? []).toEqual([]);
    }
  });

  it("names no other online marketplace anywhere on the shelf (24 D10c)", () => {
    // The one file where "sell where you already sell" would be a natural line
    // to write. It is a positioning ruling, and it is cheap to hold here.
    const shelf = JSON.stringify(ALL).toLowerCase();
    for (const name of ["etsy", "amazon", "ebay", "shopify", "not on the high street", "folksy"]) {
      expect({ name, present: shelf.includes(name) }).toEqual({ name, present: false });
    }
  });

  it("sorts by key so the shelf and every multi slot are stable", () => {
    const registry = createRegistry(ALL);
    expect(registry.all.map((a) => a.key)).toEqual([...registry.all.map((a) => a.key)].sort());
  });
});

describe("the slot registry", () => {
  it("mirrors the closed twelve, and hosts ten of them (24 §5.4, D19, §8A)", () => {
    /*
     * TWELVE since 2026-08-28: `record.actions` (31 O1).
     *
     * [Amended the same day, 31-T11.] The hosted count is TEN, and the line
     * above it used to read "This shop does not mount it and the count of what
     * it hosts is unchanged" — asserted as `toHaveLength(9)` beside
     * `isHosted("record.actions") === false` below. Both were true when they
     * were written and both stopped being true together, which is exactly what
     * a count is for: this shop now mounts the slot on a piece's own screen,
     * the first add-on to fill it prints a sheet of labels for that piece, and
     * the number moved because a real thing changed rather than because
     * somebody was making a suite pass.
     *
     * The PAIR is still the thing worth asserting: a registry that grows must
     * not quietly grow what any one shop claims to draw. `SLOT_IDS` is
     * unchanged at twelve here — the twelfth was already mirrored — and only
     * the hosted list moved.
     */
    expect(SLOT_IDS).toHaveLength(12);
    expect(HOSTED_SLOTS).toHaveLength(10);
    for (const slot of HOSTED_SLOTS) expect(SLOT_IDS).toContain(slot);
    expect(Object.keys(SLOT_FILL).sort()).toEqual([...SLOT_IDS].sort());
  });

  it("DECLARES exactly three that speak and seven that stay silent", () => {
    /*
     * A declaration, and named as one. This block reads a constant back to
     * itself and cannot do otherwise — which is precisely why it used to be a
     * hole: it was the only thing in the repo claiming to hold D19, and adding
     * a dashed placeholder to a silent slot in a real screen left it green.
     * What each slot ACTUALLY renders when it is empty is asserted in
     * `slotRender.test.tsx`, against the DOM. This says what the table intends;
     * that says whether the app agrees.
     */
    const speaks = HOSTED_SLOTS.filter((s) => SLOT_EMPTY_BEHAVIOUR[s] === "speaks");
    const silent = HOSTED_SLOTS.filter((s) => SLOT_EMPTY_BEHAVIOUR[s] === "silent");
    // The three that speak are the three where a person has something to be
    // told, and they have not changed: the note field IS the personalization
    // surface until an add-on replaces it, the till says whose postage those
    // are, and the order says the studio posts everything itself.
    expect(speaks).toEqual([
      "product.options.personalize",
      "checkout.delivery.methods",
      "order.dispatch.panel",
    ]);
    // The rest are silent for the same reason: an add-on's settings form has
    // nothing to say when there is no add-on, a page nobody navigated to should
    // not draw a placeholder, and a studio that walks its own parcels to the
    // post office does not need to be told it has no carrier. `record.actions`
    // joined them in wave 6 and is the clearest case of the rule: the only
    // empty state it could have is "no add-on offers anything to do with this
    // piece", which describes an absence rather than a finished thing, and D19
    // is precisely the ban on writing that down.
    expect(silent).toEqual([
      "cart.line.preview",
      "order.dispatch.actions",
      "order.line.actions",
      "product.admin.panel",
      "record.actions",
      "settings.add-on.panel",
      "nav.add-on.routes",
    ]);
  });

  it("knows which of the twelve this build does not mount", () => {
    /*
     * `order.dispatch.actions` USED TO BE ASSERTED ABSENT HERE, and that line
     * was the defect rather than the guard it looked like. 24 §8A says the
     * bench Order view carries this slot; it was never mounted, and a test that
     * wrote the omission down as an invariant is how a gap survives a review.
     * It is hosted now, and hosting it is what lets a delivery add-on written
     * for the print works run here unchanged — D21's claim, made concrete.
     */
    expect(isHosted("order.dispatch.actions")).toBe(true);
    /*
     * AND `record.actions` HAS JUST DONE THE SAME THING, WHICH IS WHY THIS CASE
     * IS WORTH READING TWICE.
     *
     * [Amended 2026-08-28, 31-T11.] The line here read
     * `expect(isHosted("record.actions")).toBe(false)`, under a comment saying
     * "Nothing in this shop shows one record with an add-on's action to take on
     * it". That sentence was a claim about the app and it was wrong: a piece's
     * own screen on the bench is one record, opened by the maker who is about
     * to make it. Two waves apart, in the same file, an id was declared, a
     * reason for not mounting it was written down, and the reason turned out to
     * describe what nobody had looked for.
     *
     * The assertion is flipped rather than deleted, because the pair of them is
     * now the interesting fact: a slot id is supposed to name a SURFACE, and an
     * id with one host cannot be told from an id that names that host's screen.
     * The print works mounts this same id on a job, on the same day, with the
     * same add-on and the same payload.
     */
    expect(isHosted("record.actions")).toBe(true);
    // An add-on written for the print works may still fill this one; Birch Row
    // does not draw it, and a fill it drops is not an error in either repo.
    expect(isHosted("artwork.sources")).toBe(false);
    // And the one whose host is Adminium's generated dashboard rather than an
    // example app, whose mount is Phase B (24 §5.10, D20).
    expect(isHosted("record.editor.panel")).toBe(false);
  });
});

describe("slot fills", () => {
  const registry = createRegistry(ALL);
  const everything = new Set(ALL.map((a) => a.key));

  it("renders nothing at all until something is enabled", () => {
    // REGISTERED IS NOT ENABLED. The app boots with an empty `enabled` set and
    // must be its base state, not its filled one.
    for (const slot of HOSTED_SLOTS) {
      expect(registry.fillsFor(slot, new Set())).toHaveLength(0);
    }
  });

  /*
   * ── "MOUNTS EVERY ID IT HOSTS" USED TO BE ASSERTED HERE, AND IT WAS BLIND ──
   *
   * The check was a grep of the sources for `slot="<id>"`, defended in a
   * comment as being stronger than a render because "the failure is an ABSENCE
   * and no amount of mounting one screen proves the other five". The defence
   * was wrong twice over. A grep over text is satisfied by TEXT: commenting a
   * mount out and leaving the string behind kept this green — proven — which is
   * exactly the shape a mount deleted in a hurry leaves behind. And the premise
   * was false: a suite can render every screen, and now one does.
   *
   * `slotRender.test.tsx` renders each host surface in a DOM, in both of the
   * states a reviewer can be in, and collects the mounts React actually
   * reached. A slot is proven mounted by being drawn, which is the claim.
   * The empty-state half of D19 moved there for the same reason: the table
   * below says what each slot SHOULD do, and only a render can say what it does.
   */

  it("goes back to exactly nothing when everything is switched off again", () => {
    const before = HOSTED_SLOTS.map((s) => registry.fillsFor(s, new Set()).length);
    HOSTED_SLOTS.forEach((s) => registry.fillsFor(s, everything));
    const after = HOSTED_SLOTS.map((s) => registry.fillsFor(s, new Set()).length);
    expect(after).toEqual(before);
    expect(after.every((n) => n === 0)).toBe(true);
  });

  it("takes the lowest order on a single slot and every fill on a multi one", () => {
    // Driven with a made-up pair rather than the two shipped add-ons, because
    // the rule belongs to the registry and neither of those two fills the same
    // `single` slot as the other, so they cannot demonstrate it.
    const fake = (key: string, order: number): AddOn => ({
      key,
      name: key,
      shortName: key,
      lineKey: "x",
      whatKey: "x",
      monogram: "XX",
      category: "artwork",
      connect: "none",
      permissions: [],
      settings: [],
      namesCompany: false,
      noCompanyKeys: [`addon.${key}.noCompany`],
      fills: [
        { slot: "product.options.personalize", order, render: () => null },
        { slot: "cart.line.preview", order, render: () => null },
      ],
    });
    const two = createRegistry([fake("b-late", 20), fake("a-early", 10)]);
    const on = new Set(["a-early", "b-late"]);

    expect(two.fillsFor("product.options.personalize", on).map((f) => f.addOn)).toEqual([
      "a-early",
    ]);
    expect(two.fillsFor("cart.line.preview", on).map((f) => f.addOn)).toEqual([
      "a-early",
      "b-late",
    ]);
  });
});
