/**
 * WHO ELSE IS INVOLVED — the line every add-on surface that names one ends on.
 *
 * ── THE DEFECT THIS EXISTS TO CLOSE (24 AC6) ────────────────────────────────
 *
 * [Added 2026-08-11, wave 4b round 4.] The shelf rendered `noCompanyKeys` and
 * nothing else, so an add-on that names NO company said so — and the one that
 * names a real one said nothing at all. A page-wide grep for "affiliat" outside
 * `vendor/` came back empty in this repo: the Add-ons screen printed the
 * delivery company's name, its monogram and its category with no disclaimer
 * anywhere on it. The add-on carries the line on its OWN surfaces (the till,
 * the dispatch panel, the customer's order), which is exactly why the gap was
 * easy to miss — every screen the add-on drew was correct and the host's own
 * shelf was not.
 *
 * The print works has had this since wave 4a, as `Affiliation` in its
 * `Overlays.tsx`. This is that component, in this app's voice and class names.
 *
 * ── THE TWO SENTENCES, AND WHOSE THEY ARE ───────────────────────────────────
 *
 * `namesCompany: true`  → the HOST's line, "Adminium is not affiliated with
 *                         this company." It is generic — it names no add-on and
 *                         no company — so carrying it here does not make the
 *                         host know anything about its add-ons (AC5).
 * `namesCompany: false` → the ADD-ON's own words, from its own eight-locale
 *                         bundle. The host has no sentence claiming an add-on
 *                         connects to nothing, because that is not the host's
 *                         fact to assert.
 *
 * An absent line is indistinguishable from a forgotten one, which is why the
 * second branch exists at all. But NOTHING is still the right answer when the
 * add-on has supplied nothing to say: an empty paragraph in a `gap` layout is a
 * blank stripe with no words in it, which reads as a bug rather than as silence.
 */

import type { AddOn } from "../add-ons/host.ts";
import { useT } from "../i18n/index.tsx";

export function Affiliation({ addOn }: { addOn: AddOn }) {
  const t = useT();
  const line = addOn.namesCompany
    ? t("bench.addons.notAffiliated")
    : (addOn.noCompanyKeys ?? []).map((key) => t(key as never)).join(" ");
  if (line.trim().length === 0) return null;
  return <p className="br-perm br-perm--plain br-perm--quiet">{line}</p>;
}
