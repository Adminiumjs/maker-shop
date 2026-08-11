/**
 * The host's own shelf.
 *
 * Two halves, and the second one is the interesting one. The SHELF lists what
 * could plug in; the SLOT TABLE says where, and — the part a reviewer should be
 * able to check against the running app — which of those places SPEAK when they
 * are empty and which show nothing at all. Every number in the table's own
 * sentence is COUNTED from `HOSTED_SLOTS`; none of them is typed.
 *
 * NOTHING IS CONNECTED UNTIL SOMEBODY CONNECTS IT. The build vendors two
 * add-ons and enables neither, so the shelf a reviewer meets is a shelf of
 * things that COULD plug in, and every screen behind it is still the screen a
 * maker with nothing connected sees. The two that are built get a Connect
 * button and, once connected, their own settings panel inside this page. The
 * ones that are not carry a muted "Not in this demo" chip where that button
 * would be: a button that does nothing is worse than no button, and a chip that
 * says why is better than both.
 *
 * The monograms are letters on a neutral tile and there is not a company logo
 * anywhere on this page, drawn, traced or approximated (24 D12).
 */

import { Blocks, Ear, EyeOff, KeyRound, ShieldCheck } from "lucide-react";

import {
  credentialState,
  isConnectable,
  resolveActivity,
  type CredentialState,
} from "../add-ons/host.ts";
import { Affiliation } from "../components/Affiliation.tsx";
import { useActivityContext } from "../add-ons/useActivityContext.ts";
import { AddOnSlot } from "../components/AddOnSlot.tsx";
import { sampleCatalogue } from "../add-ons/records.ts";
import { HOSTED_SLOTS, SLOT_EMPTY_BEHAVIOUR } from "../add-ons/slots.ts";
import { Mono, Tag } from "../components/Primitives.tsx";
import { clock } from "../lib/format.ts";
import { useT, type MessageKey } from "../i18n/index.tsx";
import { useStore } from "../state/store.ts";

/**
 * The shape of the slot table, counted rather than stated (24 D19).
 *
 * Module scope on purpose: these are facts about the build, not about a render,
 * and computing them here is what makes the copy below unable to disagree with
 * the rows below it.
 */
const openSlots = HOSTED_SLOTS.length;
const speakingSlots = HOSTED_SLOTS.filter((s) => SLOT_EMPTY_BEHAVIOUR[s] === "speaks").length;
const silentSlots = openSlots - speakingSlots;

/**
 * The card's word for each credential state (`credentialState`, `host.ts`).
 *
 * A total map rather than a chain of ternaries: adding a fourth state to the
 * union without saying what this card prints for it is a compile error, which
 * is the property the two-branch ternary this replaced did not have.
 *
 * The confirm dialog keeps its OWN map of the same three states, because it is
 * answering a different question — what a disconnect does — in different words.
 * What they share is the derivation, not the copy.
 */
const CARD_CREDENTIAL_LINE: Readonly<Record<CredentialState, MessageKey>> = {
  "never-asks": "bench.addons.noAccount",
  "key-held": "bench.addons.keyHeld",
  "asks-none-given": "bench.addons.noKeyYet",
};

export function AddOnsScreen() {
  const t = useT();
  const registry = useStore((s) => s.registry);
  const enabled = useStore((s) => s.enabled);
  const credentialled = useStore((s) => s.credentialled);
  const openOverlay = useStore((s) => s.openOverlay);
  const patchAddOnSettings = useStore((s) => s.patchAddOnSettings);
  const go = useStore((s) => s.go);
  const activityContext = useActivityContext();

  return (
    <section className="br-screen">
      <div className="br-section-head">
        <div>
          <h1 className="br-h1">{t("bench.addons.title")}</h1>
          <p className="br-lede">{t("bench.addons.sub")}</p>
        </div>
      </div>

      <div className="br-cards">
        {registry.all.map((addOn) => (
          <div key={addOn.key} className="br-panel br-panel-pad br-stack br-stack--tight">
            <div className="br-panel-head">
              <span className="br-monogram">{addOn.monogram}</span>
              <div>
                <div className="br-panel-title">
                  {addOn.nameKey === undefined ? addOn.name : t(addOn.nameKey as never)}
                </div>
                <Tag>{t(`bench.addons.category.${addOn.category}` as never)}</Tag>
              </div>
            </div>

            <p className="br-panel-note">{t(addOn.lineKey as never)}</p>

            {/*
             * 24 AC6, as amended: an add-on that names a company carries the
             * not-affiliated line; one that names none says so positively, in
             * ITS OWN words.
             *
             * THIS BLOCK USED TO RENDER ONLY THE SECOND HALF. It printed
             * `noCompanyKeys` and nothing else, so the shelf disclaimed a
             * relationship for every add-on that has none and said nothing at
             * all on the one card that names a real company. See
             * `components/Affiliation.tsx`.
             */}
            <Affiliation addOn={addOn} />

            {isConnectable(addOn) ? (
              <>
                {/*
                  * CONNECTING AND DISCONNECTING ARE TWO DECISIONS, AND BOTH ARE
                  * SAID OUT LOUD (24 §5.6, D16).
                  *
                  * This used to be ONE button labelled with the add-on's own
                  * name, calling `toggleAddOn` straight through: the carrier
                  * disconnected in a single click with nothing said, and a
                  * studio watching its postage rows vanish had no way to know
                  * whether the parcels it had already booked went with them.
                  * They do not. The confirm is where that is stated.
                  *
                  * The DOCK still toggles instantly and should: that is the
                  * reviewer's device for watching a feature arrive and leave,
                  * not the studio's own control.
                  */}
                <button
                  type="button"
                  className={
                    enabled.has(addOn.key)
                      ? "br-button br-button--ghost"
                      : "br-button br-button--block"
                  }
                  onClick={() =>
                    openOverlay({
                      kind: enabled.has(addOn.key) ? "disconnect" : "connect",
                      addOn: addOn.key,
                    })
                  }
                >
                  {t(
                    enabled.has(addOn.key)
                      ? "bench.addons.disconnect"
                      : "bench.addons.connect",
                  )}
                </button>

                {enabled.has(addOn.key) && (
                  <>
                    {/*
                     * WHAT IT LAST DID, DATED AGAINST THIS STUDIO'S CLOCK AND
                     * NAMING THIS STUDIO'S ORDER.
                     *
                     * `resolveActivity` is the host half of wave 4b's repair:
                     * an add-on declares its history RELATIVE ("316 minutes
                     * ago, about your most recent order") because the version
                     * that declared it absolutely shipped the OTHER host's job
                     * reference onto this screen. The function lived in this
                     * app's mirror with no caller anywhere in `src/`, so the
                     * repair was real in the type system and invisible in the
                     * app. This is the screen that was missing.
                     *
                     * It drops any seeded line naming a reference this studio
                     * has not got, so "not used yet" also covers "every seeded
                     * line was about somebody else's paperwork" — which is the
                     * honest thing to say when there is nothing left to date.
                     */}
                    <Mono className="br-addon-last">
                      {(() => {
                        const last = resolveActivity(addOn.activity, activityContext)[0];
                        return last === undefined
                          ? t("bench.addons.neverUsed")
                          : t("bench.addons.lastUsed", {
                              when: clock(last.iso, last.hour, last.minute),
                            });
                      })()}
                    </Mono>
                    {/*
                      * WHICH OF THE D16 PROMISES THIS ONE IS ABOUT, ON THE CARD
                      * RATHER THAN ONLY IN THE CONFIRM. An add-on holding a key
                      * and one that never asked for an account are different
                      * things to disconnect, and the difference has to be
                      * visible before somebody presses the button.
                      *
                      * THREE STATES, NOT TWO, AND NOT DERIVED HERE. This block
                      * used to read `credentialled` alone, which folded "asks
                      * for an account and has not been given one" into "never
                      * asks" and printed "Nothing about your pieces leaves the
                      * studio" under the delivery company's name. The answer
                      * comes from `credentialState` now — the same function the
                      * confirm dialog reads — so the two cannot disagree again,
                      * and the sentence about where a customer's address goes is
                      * a function of what the ADD-ON declares rather than of
                      * what this session happens to hold.
                      */}
                    <p className="br-perm br-perm--plain">
                      {(() => {
                        const state = credentialState(addOn, credentialled);
                        const Icon = state === "never-asks" ? ShieldCheck : KeyRound;
                        return (
                          <>
                            <Icon size={14} aria-hidden="true" />{" "}
                            {t(CARD_CREDENTIAL_LINE[state])}
                          </>
                        );
                      })()}
                    </p>
                    {/*
                     * A LINK TO THE PAGE, WHICH IS WHAT MAKES HOSTING THE SLOT
                     * HONEST. The host asks the registry whether this add-on
                     * fills `nav.add-on.routes` and offers the page if it does
                     * — it does not know which add-on that is or what the page
                     * contains. Without this the slot would be mounted and
                     * unreachable, which is the same defect as not mounting it
                     * (24 §5.4's amendment) wearing a different hat.
                     */}
                    {registry.fillsFor("nav.add-on.routes", enabled, addOn.key).length > 0 && (
                      <button
                        type="button"
                        className="br-button br-button--ghost"
                        onClick={() => go("addonroute")}
                      >
                        {t("bench.addons.route")}
                      </button>
                    )}

                    {/*
                     * `settings.add-on.panel` — a PER-ADD-ON slot, which is why
                     * it is scoped with `forAddOn`: the drawer asks for the
                     * panel of the add-on it is managing and gets that one or
                     * nothing. The host renders no form of its own here and
                     * knows none of the fields; it hands over the saved values
                     * and a patch handle, and the add-on writes its own words.
                     */}
                    <AddOnSlot
                      slot="settings.add-on.panel"
                      forAddOn={addOn.key}
                      payload={{
                        patch: (values: Record<string, unknown>) =>
                          patchAddOnSettings(addOn.key, values),
                        /*
                         * WHAT THE STUDIO KNOWS AND NO ADD-ON DOES: its own
                         * catalogue, one representative piece per category,
                         * labelled in the reader's language. Nothing is
                         * estimated here — an add-on with an opinion about
                         * these forms it with its own engine.
                         *
                         * IT WAS MISSING, and that is the second of the three
                         * runtime crashes the type system now catches: the
                         * shared payload declared `samples` required, this
                         * passed `{ patch }` alone, `AddOnFill<never>` erased
                         * the difference, and the carrier's settings form threw
                         * on `.map`. The prop is typed by the slot now.
                         */
                        samples: sampleCatalogue((key) =>
                          t(`data.product.${key}.name` as never),
                        ),
                      }}
                    />

                    {/*
                      * What a disconnect takes and what it keeps, in the
                      * add-on's own words (24 D16) — HERE AS WELL AS in the
                      * confirm, because a studio deciding whether to press
                      * Disconnect should not have to press it to find out.
                      */}
                    {addOn.disconnect !== undefined && (
                      <p className="br-perm br-perm--plain">
                        {t(addOn.disconnect.goesKey as never)}{" "}
                        {t(addOn.disconnect.staysKey as never)}
                      </p>
                    )}
                  </>
                )}
              </>
            ) : (
              <span className="br-not-in-demo">
                <Blocks size={14} aria-hidden="true" />
                {t("bench.addons.notInDemo")}
              </span>
            )}
          </div>
        ))}
      </div>

      <div className="br-panel br-panel-pad">
        <div className="br-panel-title">{t("bench.addons.slotsTitle")}</div>
        {/*
         * THE THREE NUMBERS ARE COUNTED FROM THE TABLE BELOW, NEVER TYPED.
         *
         * This sentence used to be one hand-written string per locale — "Six
         * places in this shop are open to an add-on. Three of them say
         * something…" — and the table under it was already rendering nine rows
         * in every one of the eight languages. A count spelt out in copy is a
         * fact about the code kept somewhere the code cannot reach, so it goes
         * stale on the next slot and goes stale in all eight at once.
         *
         * Three sentences rather than one, because `t()` selects a plural
         * category from a SINGLE count and this needs three. Each is a whole
         * sentence so a translator is never assembling clauses, and the count
         * goes in as a NUMBER so `t()` formats it in the reader's numerals —
         * Arabic reads ٩, not 9.
         */}
        <p className="br-panel-note">
          {t("bench.addons.slotsBody.open", undefined, openSlots)}{" "}
          {t("bench.addons.slotsBody.speaks", undefined, speakingSlots)}{" "}
          {t("bench.addons.slotsBody.silent", undefined, silentSlots)}
        </p>

        <div className="br-weights">
          {HOSTED_SLOTS.map((slot) => {
            const speaks = SLOT_EMPTY_BEHAVIOUR[slot] === "speaks";
            return (
              <div key={slot} className="br-weights-row">
                <span>
                  <span className="br-line-name">
                    {t(`bench.addons.slot.${slot}` as never)}
                  </span>
                  <Mono className="br-slotid">{slot}</Mono>
                </span>
                <span className="br-slotbehaviour" data-speaks={speaks}>
                  {speaks ? <Ear size={14} aria-hidden="true" /> : <EyeOff size={14} aria-hidden="true" />}
                  {speaks ? t("bench.addons.speaks") : t("bench.addons.silent")}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
