/**
 * The message registry.
 *
 * The app's strings are split across area modules under `../strings/` so they
 * can be authored without one enormous file. This module is the only place that
 * knows they are separate: it flattens them into one bundle per locale, which
 * is what the runtime looks keys up in.
 *
 * Keys must be unique across areas — a later area silently wins a collision —
 * so they are namespaced (`chrome.*`, `screen.*`, `data.*`, `addon.*`).
 *
 * PARITY IS A COMPILE ERROR, NOT A RUNTIME FALLBACK. The `Area<>` type below
 * takes English as the source of truth and requires all seven other locales to
 * carry a string for every one of its keys. A missing translation therefore
 * fails `tsc -b` in this repo rather than rendering an English sentence inside
 * an Arabic page, which is the failure mode nobody notices until a reader
 * complains.
 *
 * An ADD-ON's strings arrive by registration instead (`registerAddOnMessages`),
 * because the host's key vocabulary must not be a function of which add-ons
 * happen to be vendored: a host that has to be edited to add a fourth add-on
 * does not have an add-on system. What the compiler stops checking there, the
 * registration function checks at boot — and it THROWS, naming the locale and
 * the key.
 */
import type { Translated } from "../untranslated.ts";
import { LOCALE_TAGS, type LocaleTag } from "../locales.ts";
import { bench } from "../strings/bench.ts";
import { chrome } from "../strings/chrome.ts";
import { data } from "../strings/data.ts";
import { screens } from "../strings/screens.ts";

type Area<EN extends Record<string, string>> = { "en-US": EN } & Record<
  Exclude<LocaleTag, "en-US">,
  Translated<EN>
>;

const AREAS: [
  Area<(typeof chrome)["en-US"]>,
  Area<(typeof screens)["en-US"]>,
  Area<(typeof bench)["en-US"]>,
  Area<(typeof data)["en-US"]>,
] = [chrome, screens, bench, data];

export const MESSAGES = Object.fromEntries(
  LOCALE_TAGS.map((t) => [t, Object.assign({}, ...AREAS.map((a) => a[t] ?? {}))]),
) as Record<LocaleTag, Record<string, string>>;

/** Keys are typed off English — the source of truth — so a typo is a compile error. */
export type MessageKey =
  | keyof (typeof chrome)["en-US"]
  | keyof (typeof screens)["en-US"]
  | keyof (typeof bench)["en-US"]
  | keyof (typeof data)["en-US"];

/** One add-on's bundle, as it travels on the add-on object. */
export type AddOnMessages = Readonly<Record<string, Readonly<Record<string, string>>>>;

/** Which add-ons have registered, for the suite that checks they all did. */
const registered = new Set<string>();

export function registeredAddOnMessageKeys(): readonly string[] {
  return [...registered].sort();
}

/**
 * Merge an add-on's strings into the runtime bundle, refusing a bundle that is
 * not complete in all eight locales, and refusing one that would overwrite a
 * key the host already owns.
 *
 * THIS THROWS, and loudly, on purpose. A boot that dies with the locale and the
 * key named is strictly better than a shop running with a hole in its Arabic.
 */
export function registerAddOnMessages(addOnKey: string, bundle: AddOnMessages): void {
  const english = bundle["en-US"];
  if (english === undefined) {
    throw new Error(`add-on "${addOnKey}" registered no en-US strings`);
  }

  const keys = Object.keys(english);
  for (const locale of LOCALE_TAGS) {
    const localeBundle = bundle[locale];
    if (localeBundle === undefined) {
      throw new Error(`add-on "${addOnKey}" is missing the ${locale} locale entirely`);
    }
    for (const key of keys) {
      const value = localeBundle[key];
      if (typeof value !== "string" || value.trim() === "") {
        throw new Error(`add-on "${addOnKey}" is missing ${locale} for "${key}"`);
      }
    }
  }

  for (const key of keys) {
    if (MESSAGES["en-US"][key] !== undefined) {
      throw new Error(`add-on "${addOnKey}" would overwrite the existing message key "${key}"`);
    }
  }

  // Mutating the same objects rather than rebuilding `MESSAGES` is what lets
  // the i18n provider hold a reference to a locale's bundle across a
  // registration — and registration happens at module load, before any of them
  // is read, so nothing is ever read half-merged.
  for (const locale of LOCALE_TAGS) Object.assign(MESSAGES[locale], bundle[locale]);
  registered.add(addOnKey);
}
