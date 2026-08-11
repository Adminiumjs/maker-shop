/**
 * A NUMBER PUT INTO A SENTENCE IS FORMATTED, IN EVERY LOCALE.
 *
 * @vitest-environment jsdom
 *
 * The shop tile said "ready in 3 studio days" in Arabic — a Latin 3, in the
 * middle of Arabic prose, directly under a price the same screen had formatted
 * as ‏٢٤٫٠٠‏. The cause was one `String()` in `t()`'s placeholder substitution,
 * so it was not one screen's bug: EVERY `t("…", { days })` in the app had it,
 * and so did every `{count}` on every plural in the bundle, because a plural's
 * count arrives as a number by definition.
 *
 * The fix is at the seam rather than at the call sites — a number is formatted,
 * a string is passed through — which is why this suite tests `t()` itself
 * through a rendered provider rather than testing the three call sites somebody
 * happened to notice. Those come and go; the rule does not.
 */

import { act, type ReactNode } from "react";
import { createRoot } from "react-dom/client";
import { beforeAll, describe, expect, it } from "vitest";

import { I18nProvider, useI18n, type MessageKey } from "./index.tsx";
import { LOCALE_TAGS, type LocaleTag } from "./locales.ts";
import { MESSAGES } from "./messages/index.ts";

beforeAll(() => {
  (globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
});

/** Render one call to `t()` in one locale, and read back what a person sees. */
function say(
  locale: LocaleTag,
  key: MessageKey,
  params?: Record<string, string | number>,
  count?: number,
): string {
  let out = "";
  function Probe() {
    const { t, locale: current } = useI18n();
    expect(current).toBe(locale);
    out = t(key, params, count);
    return null;
  }
  /*
   * The locale is chosen through the provider's OWN startup path — the stored
   * preference — rather than by calling `setLocale` from inside a render, which
   * is both a React warning and a different code path from the one a reader
   * takes.
   */
  localStorage.setItem("maker-shop-locale", locale);
  const host = document.createElement("div");
  document.body.appendChild(host);
  const root = createRoot(host);
  act(() => {
    root.render(
      <I18nProvider>
        <Probe />
      </I18nProvider> as ReactNode,
    );
  });
  act(() => {
    root.unmount();
  });
  host.remove();
  return out;
}

/** Arabic-Indic digits — what `ar-EG` renders a number as. */
const ARABIC_INDIC = /[٠-٩]/;
const LATIN = /[0-9]/;

describe("a number in a sentence is in the reader's numerals", () => {
  it("writes the lead time in Arabic-Indic digits for ar-EG", () => {
    const arabic = say("ar-EG", "screen.shop.tile.lead", { days: 3 });
    expect({ arabic, arabicIndic: ARABIC_INDIC.test(arabic), latin: LATIN.test(arabic) }).toEqual({
      arabic,
      arabicIndic: true,
      latin: false,
    });
  });

  it("leaves English alone", () => {
    expect(say("en-US", "screen.shop.tile.lead", { days: 3 })).toContain("3");
  });

  it("formats a PLURAL's own count too, which is where most of them are", () => {
    /*
     * `t(key, params, count)` folds `count` into the substitution map itself,
     * so every `{count}` in the bundle went through the same `String()`. This
     * is the case no call site can fix by being careful.
     */
    const arabic = say("ar-EG", "bench.count.summary", undefined, 3);
    expect({ arabicIndic: ARABIC_INDIC.test(arabic), latin: LATIN.test(arabic) }).toEqual({
      arabicIndic: true,
      latin: false,
    });
  });

  it("passes an already-formatted string straight through", () => {
    // Money and percentages arrive as strings from `lib/format.ts`, and a
    // second pass through a number formatter would wreck them.
    const money = say("ar-EG", "screen.order.postedBy", { day: "١١ أغسطس" });
    expect(money).toContain("١١ أغسطس");
  });

  it("leaves no locale rendering a bare Latin digit from a number param", () => {
    /*
     * The rule stated over all eight rather than over the one that shows it
     * most. Seven of them format Latin digits anyway — this fails only if a
     * locale that should not is, or if the substitution stops happening.
     */
    const rendered = LOCALE_TAGS.map((locale) => ({
      locale,
      text: say(locale, "screen.shop.tile.lead", { days: 1234 }),
    }));
    for (const { locale, text } of rendered) {
      // Every locale substituted something.
      expect({ locale, has: text !== MESSAGES[locale]["screen.shop.tile.lead"] }).toEqual({
        locale,
        has: true,
      });
      // And nobody printed the raw, unseparated number.
      expect({ locale, raw: text.includes("1234") }).toEqual({ locale, raw: false });
    }
  });
});
