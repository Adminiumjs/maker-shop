/**
 * `nav.add-on.routes` — a whole page in the maker's shell, lent to an add-on.
 *
 * WHY THIS SCREEN EXISTS AT ALL, and it is not "because the registry has a slot
 * for it". The print works declared this id for a release, Design Studio
 * shipped a real fill against it, and nothing anywhere drew it — that app
 * switches views off one store field and has no route for an add-on to occupy
 * (24 §5.4's amendment). The lesson recorded there is that a slot a host
 * declares and never mounts is WORSE than an absent one, because an add-on
 * author reads the list and writes code to it.
 *
 * So Birch Row hosts it and Birch Row mounts it: the maker's shell has a view,
 * this is the view, and `addOns.test.ts` greps `src/` for a `slot="…"` per
 * hosted id so the same failure cannot recur in either direction.
 *
 * THE SHELL IS ALL THE HOST LENDS. No heading of ours over the add-on's own, no
 * frame, no chrome inside the panel — a full-screen route means the add-on owns
 * the page. What the host keeps is the sidebar, the dock and the crumb back to
 * the shelf, because those are the shop's, and a page a reviewer cannot leave
 * is not a page.
 *
 * [Amended 2026-08-10, wave 4b.] The paragraph above was true of the intent and
 * false of the file: it drew an `<h1>Set-up</h1>` and a lede of the host's own,
 * directly above whatever heading the add-on's page began with. Two headings,
 * one page, and the outer one written by the shop about a page it knows nothing
 * about. Both are gone. Their absence is also what makes the empty case honest
 * — with nothing connected this route renders a way back and NOTHING ELSE, per
 * D19, where before it drew a titled, permanently empty page.
 */

import { ChevronLeft } from "lucide-react";

import { AddOnSlot } from "../components/AddOnSlot.tsx";
import { useT } from "../i18n/index.tsx";
import { useStore } from "../state/store.ts";

export function AddOnRouteScreen() {
  const t = useT();
  const go = useStore((s) => s.go);

  return (
    <section className="br-screen">
      <button type="button" className="br-backlink br-btn" onClick={() => go("addons")}>
        <ChevronLeft size={14} aria-hidden="true" />
        {t("bench.addons.title")}
      </button>

      {/*
       * SILENT WHEN EMPTY, and that is the right behaviour rather than a
       * shortcut: this view is only reachable from a link an add-on's own panel
       * draws, so an empty one is a page nobody navigated to. A dashed "no
       * add-ons here" box would be a placeholder on a page that should not have
       * been opened.
       */}
      <AddOnSlot slot="nav.add-on.routes" payload={{}} />
    </section>
  );
}
