/**
 * The demo build's start: the shop and the studio, both, over the one Birch
 * Row held in the page (`adminium.ts`), with no server anywhere. Whoever the
 * card says is using it — the shopper or the maker — has their side drawn;
 * an order placed on one side is on the other the moment it is placed.
 *
 * The page answers the website's demo card (`demoBridge.ts`) and keeps no
 * card of its own. DEMO BUILD ONLY — `main.tsx` reaches it behind the
 * build-time `DEMO` flag.
 */
import { StrictMode, useEffect, useMemo } from "react";
import { createRoot } from "react-dom/client";

import "../studio/studio.css";
import "../studio/making.css";

import { I18nProvider, useI18n } from "../i18n/index.tsx";
import { resolveLocale } from "../i18n/locales.ts";
import ShopApp from "../shop/ShopApp.tsx";
import { useShop } from "../shop/store.ts";
import { StudioProvider, type StudioEnv } from "../studio/env.tsx";
import { drawLettering } from "../studio/picture.ts";
import { useStudio } from "../studio/store.ts";
import { StudioApp } from "../studio/StudioApp.tsx";
import { attachDemoBridge, clearTab } from "../demoBridge.ts";
import { demoAdminium, useDemo } from "./adminium.ts";

/** The card's language, once it has said one. */
function CardLocale() {
  const { setLocale } = useI18n();
  const asked = useDemo((s) => s.locale);
  useEffect(() => {
    if (asked !== null) setLocale(resolveLocale([asked]));
  }, [asked, setLocale]);
  return null;
}

/** The studio's theme and the card's, kept as one. */
function useOneTheme(): "light" | "dark" {
  const theme = useDemo((s) => s.theme);
  useEffect(() => {
    if (useStudio.getState().theme !== theme) useStudio.setState({ theme });
  }, [theme]);
  useEffect(
    () =>
      useStudio.subscribe((s) => {
        if (s.theme !== null && s.theme !== useDemo.getState().theme) useDemo.setState({ theme: s.theme });
      }),
    [],
  );
  return theme;
}

export function DemoRoot() {
  const persona = useDemo((s) => s.persona);
  const generation = useDemo((s) => s.generation);
  const theme = useOneTheme();
  const env = useMemo<StudioEnv>(
    // A record's own page is the dashboard's, which the demo does not have: the link stays on this page.
    () => ({ door: demoAdminium().studio, draw: drawLettering, recordHref: () => "#" }),
    // A fresh world is a new door.
    [generation],
  );
  return (
    <>
      <CardLocale />
      {persona === "shopper" ? (
        <ShopApp theme={theme} onTheme={(next) => useDemo.setState({ theme: next })} />
      ) : (
        <StudioProvider env={env}>
          <StudioApp />
        </StudioProvider>
      )}
    </>
  );
}

export async function bootDemo(mount: HTMLElement): Promise<void> {
  // A new demo page is a new Birch Row: nothing of the last one's basket, designs or sign-in.
  clearTab();
  useShop.setState({ port: demoAdminium().shop });
  createRoot(mount).render(
    <StrictMode>
      <I18nProvider>
        <DemoRoot />
      </I18nProvider>
    </StrictMode>,
  );
  attachDemoBridge();
}
