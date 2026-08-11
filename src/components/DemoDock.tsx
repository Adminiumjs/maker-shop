/**
 * The demo dock: the Shopper | Maker segment, the pinned clock, "+1 studio
 * day", the theme toggle and the locale picker.
 *
 * "+1 STUDIO DAY" IS THE MOST INTERESTING CONTROL IN THIS APP. It advances the
 * clock by one day the bench actually runs, so pressing it on a Saturday lands
 * on Tuesday — and that jump is how a reviewer discovers the studio week
 * without reading a word about it. Ship-by chips escalate together, one order
 * tips into overdue, and every date in the app moves at once because they all
 * derive from the same offset.
 *
 * The dock is fixed, and it MUST NOT COVER A PRIMARY ACTION (rule 1 of the
 * comp's four layout rules): a piece's page keeps "Add to basket" low on a
 * narrow viewport, so the dock lifts clear of it rather than sitting on top.
 */

import { Blocks, Clock, FastForward, Globe, Moon, Sun } from "lucide-react";

import { DEMO_KEYS } from "../add-ons/registry.ts";
import { LOCALES, LOCALE_TAGS, useI18n, useT } from "../i18n/index.tsx";
import { clock, day } from "../lib/format.ts";
import { useStore, useToday } from "../state/store.ts";

export function ThemeToggle() {
  const t = useT();
  const theme = useStore((s) => s.theme);
  const setTheme = useStore((s) => s.setTheme);
  const dark = theme === "dark";

  return (
    <button
      type="button"
      className="br-iconbtn br-btn"
      aria-label={dark ? t("theme.toLight") : t("theme.toDark")}
      title={dark ? t("theme.toLight") : t("theme.toDark")}
      onClick={() => setTheme(dark ? "light" : "dark")}
    >
      {dark ? <Sun size={16} aria-hidden="true" /> : <Moon size={16} aria-hidden="true" />}
    </button>
  );
}

/**
 * Languages listed in their own language, always — a reader looking for
 * `العربية` should not have to find it under "Arabic".
 */
export function LocalePicker() {
  const t = useT();
  const { locale, setLocale } = useI18n();

  return (
    <span style={{ position: "relative", display: "inline-flex", alignItems: "center" }}>
      <Globe
        size={15}
        aria-hidden="true"
        style={{
          position: "absolute",
          insetInlineStart: 9,
          pointerEvents: "none",
          color: "var(--fg-subtle)",
        }}
      />
      <select
        className="br-input br-fld"
        aria-label={t("dock.language")}
        value={locale}
        onChange={(e) => setLocale(e.target.value as (typeof LOCALE_TAGS)[number])}
        style={{
          paddingInlineStart: 28,
          paddingBlock: 7,
          fontSize: 12.5,
          fontWeight: 600,
          inlineSize: "auto",
          borderRadius: 9,
        }}
      >
        {LOCALE_TAGS.map((tag) => (
          <option key={tag} value={tag}>
            {LOCALES[tag].native}
          </option>
        ))}
      </select>
    </span>
  );
}

export function DemoDock() {
  const t = useT();
  const persona = useStore((s) => s.persona);
  const setPersona = useStore((s) => s.setPersona);
  const view = useStore((s) => s.view);
  const now = useStore((s) => s.now);
  const dayOffset = useStore((s) => s.dayOffset);
  const advanceDay = useStore((s) => s.advanceDay);
  const resetDay = useStore((s) => s.resetDay);
  const toast = useStore((s) => s.toast);
  const overlay = useStore((s) => s.overlay);
  const enabled = useStore((s) => s.enabled);
  const toggleAddOn = useStore((s) => s.toggleAddOn);
  const registry = useStore((s) => s.registry);

  const iso = useToday();

  /*
   * A piece's page keeps its "Add to basket" bar low, and an open sheet owns
   * the screen. On the first the dock lifts above the bar; on the second it
   * gets out of the way entirely rather than floating over a modal.
   */
  const lifted = view === "product" || view === "checkout";
  const hidden = overlay.kind !== "none";

  return (
    <div
      className="br-dock"
      data-lifted={lifted}
      data-hidden={hidden}
      role="region"
      aria-label={t("dock.label")}
    >
      <span className="br-dock-label">{t("dock.label")}</span>

      <div className="br-seg">
        <button
          type="button"
          aria-pressed={persona === "shopper"}
          onClick={() => setPersona("shopper")}
        >
          {t("dock.shopper")}
        </button>
        <button type="button" aria-pressed={persona === "maker"} onClick={() => setPersona("maker")}>
          {t("dock.maker")}
        </button>
      </div>

      <button
        type="button"
        className="br-dock-chip br-btn br-mono"
        title={t("dock.clockTitle")}
        onClick={() => {
          if (dayOffset === 0) return;
          resetDay();
          toast(t("toast.clockReset", { day: day(now.iso) }));
        }}
      >
        <Clock size={13} aria-hidden="true" />
        {clock(iso, now.hour, now.minute)}
      </button>

      <button
        type="button"
        className="br-dock-chip br-btn"
        onClick={() => {
          advanceDay();
          toast(t("toast.dayAdvanced", { day: day(useStore.getState().todayIso()) }));
        }}
      >
        <FastForward size={13} aria-hidden="true" />
        {t("dock.advance")}
      </button>

      {/*
       * THE DEMO DEVICE (24 §5.9). One toggle per add-on this build vendors,
       * OFF when the app loads, so a reviewer watches the plain note field
       * become a live preview and go back again — which is what makes D6's
       * claim about honest empty states checkable rather than asserted. It is
       * the same `enabled` set the connected mode will use; only where the list
       * comes from changes.
       */}
      {DEMO_KEYS.map((key) => {
        const addOn = registry.byKey(key);
        if (addOn === undefined) return null;
        return (
          <button
            key={key}
            type="button"
            className="br-dock-chip br-btn"
            aria-pressed={enabled.has(key)}
            onClick={() => {
              toggleAddOn(key);
              toast(
                t(enabled.has(key) ? "toast.addOnOff" : "toast.addOnOn", {
                  name: addOn.shortName,
                }),
              );
            }}
          >
            <Blocks size={13} aria-hidden="true" />
            {addOn.shortName}
          </button>
        );
      })}

      <ThemeToggle />
    </div>
  );
}
