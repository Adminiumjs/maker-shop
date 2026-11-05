/**
 * THE CUSTOMISER'S PANEL, ON THE STUDIO'S SCREENS: a sheet over the order
 * (a line's design: as it will be made, its proof, the machine's files) or
 * over a product (its base, its areas, its designs).
 *
 * The panel is the Customiser's own code, served by Adminium for that one row
 * to the person signed in (their role must hold the panel, `ROLE_PANELS`),
 * and drawn with the studio's host (`host.tsx`). It makes the proof and the
 * files in this browser and saves them as that person. When the sheet
 * closes the studio reads its rows again, so the proof sheet finds the proof
 * the panel just made.
 *
 * What it says when the panel does not come: the role does not open it (the
 * server's 403), there is no panel here (404: the Customiser is off for the
 * studio), it would not load (nothing of it ran), or, in the demo, that the
 * panel draws here on an Adminium.
 */
import { Component, Suspense, useEffect, useMemo, useState, type ComponentType, type ReactNode } from "react";
import { X } from "lucide-react";

import type { PanelOpen } from "../door.ts";
import { reload, useEnv } from "../env.tsx";
import type { Id } from "../wire.ts";
import { PanelRefused } from "../../add-ons/connected.ts";
import { useI18n, useT } from "../../i18n/index.tsx";
import { close, Modal } from "../screens/Modal.tsx";
import { PanelScopeProvider } from "./host.tsx";
import "./panels.css";

const ADD_ON = "customiser";

interface PanelProps {
  connectionId: string;
  table: string;
  row: string;
  linked: string | null;
}

type Loaded = { status: "loading" } | { status: "ready"; Panel: ComponentType<PanelProps> } | { status: "refused" } | { status: "none" } | { status: "failed" };

/** A panel's own crash, kept off the studio: the sheet says it failed. */
class PanelBoundary extends Component<{ children: ReactNode; fallback: ReactNode }, { crashed: boolean }> {
  override state = { crashed: false };
  static getDerivedStateFromError(): { crashed: boolean } {
    return { crashed: true };
  }
  override render(): ReactNode {
    return this.state.crashed ? this.props.fallback : this.props.children;
  }
}

const isComponent = (value: unknown): value is ComponentType<PanelProps> => typeof value === "function" || (typeof value === "object" && value !== null && "$$typeof" in value);

export function PanelSheet({ panel, linked, title }: { panel: PanelOpen; linked: Id | null; title: string }) {
  const t = useT();
  const { locale } = useI18n();
  const { door } = useEnv();
  const panels = door.panels();
  const [loaded, setLoaded] = useState<Loaded>({ status: "loading" });

  useEffect(() => {
    if (panels === null) return;
    let live = true;
    setLoaded({ status: "loading" });
    panels.load(panel).then(
      (value) => live && setLoaded(isComponent(value) ? { status: "ready", Panel: value } : { status: "failed" }),
      (caught: unknown) => {
        if (!live) return;
        if (caught instanceof PanelRefused && caught.status === 403) setLoaded({ status: "refused" });
        else if (caught instanceof PanelRefused && caught.status === 404) setLoaded({ status: "none" });
        else setLoaded({ status: "failed" });
      },
    );
    return () => {
      live = false;
    };
  }, [panels, panel.id, panel.table, panel.row]);

  // What the panel made (a proof, the files) is read again when the sheet goes.
  useEffect(() => () => void reload(door), [door]);

  const scope = useMemo(() => (panels === null ? null : { door: panels, addOn: ADD_ON, locale }), [panels, locale]);
  const failed = <p className="st-small" role="alert">{t("studio.panel.failed")}</p>;
  let body: ReactNode;
  if (panels === null || scope === null) body = <div className="st-empty">{t("studio.panel.demo")}</div>;
  else if (loaded.status === "loading") body = <div className="st-small" role="status">{t("studio.panel.loading")}</div>;
  else if (loaded.status === "refused") body = <div className="st-empty">{t("studio.panel.refused")}</div>;
  else if (loaded.status === "none") body = <div className="st-empty">{t("studio.panel.none")}</div>;
  else if (loaded.status === "failed") body = failed;
  else {
    const Panel = loaded.Panel;
    body = (
      <PanelBoundary fallback={failed}>
        <Suspense fallback={<div className="st-small" role="status">{t("studio.panel.loading")}</div>}>
          <PanelScopeProvider scope={scope}>
            <Panel connectionId={door.facts().connectionId ?? ""} table={panel.table} row={String(panel.row)} linked={linked === null || linked === undefined || linked === "" ? null : String(linked)} />
          </PanelScopeProvider>
        </Suspense>
      </PanelBoundary>
    );
  }

  return (
    <Modal side labelledBy="st-panel-title" className="st-sheet st-sheet--wide">
      <div className="st-sheet-head">
        <h2 className="st-sheet-title" id="st-panel-title">
          {title}
        </h2>
        <button type="button" className="st-close" aria-label={t("studio.close")} onClick={close}>
          <X size={16} aria-hidden="true" />
        </button>
      </div>
      <div className="st-sheet-body st-cz">{body}</div>
    </Modal>
  );
}
