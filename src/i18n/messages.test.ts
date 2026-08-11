/**
 * The message bundle's own suite: parity, placeholders, and the vocabulary ban.
 *
 * Parity is already a COMPILE error in `messages/index.ts`, so what this adds
 * is the three things a type cannot see — that a translation still carries the
 * placeholders its English does, that nobody has reached for a banned word in
 * ANY of the eight languages, and that the craft traps 24 D10b names by name
 * are absent from the English copy that produces them.
 */

import { describe, expect, it } from "vitest";

import { CRAFT_TRAPS, TIERING_WORDS, bannedSubstringsIn } from "../testing/lexicon.ts";
import { personalizerStrings } from "../add-ons/vendor/personalizer/i18n/strings.ts";
import { LOCALE_TAGS, type LocaleTag } from "./locales.ts";
import { MESSAGES } from "./messages/index.ts";

/** Placeholder names are not copy — `{limit}` is a number, not a word. */
const strip = (value: string) => value.replace(/\{\w+\}/g, "");

/**
 * The DISTINCT placeholder names, not every occurrence.
 *
 * A message may carry `|`-separated plural variants, and a locale with six CLDR
 * categories repeats `{count}` six times where English repeats it twice.
 * Counting occurrences would fail Arabic on every plural in the app for being
 * correctly Arabic.
 */
const placeholders = (value: string) =>
  [...new Set([...value.matchAll(/\{(\w+)\}/g)].map((m) => m[1]!))].sort();

describe("every locale carries every key", () => {
  const english = Object.keys(MESSAGES["en-US"]);

  it("has eight locales and a bundle worth translating", () => {
    expect(LOCALE_TAGS).toHaveLength(8);
    expect(english.length).toBeGreaterThan(300);
  });

  for (const locale of LOCALE_TAGS.filter((l): l is LocaleTag => l !== "en-US")) {
    it(`${locale} matches English key for key`, () => {
      expect(Object.keys(MESSAGES[locale]).sort()).toEqual([...english].sort());
    });

    it(`${locale} keeps every placeholder`, () => {
      // A dropped `{day}` is a sentence with a hole in it, and it renders
      // perfectly in seven locales while being wrong in the eighth.
      for (const key of english) {
        expect({ key, ph: placeholders(MESSAGES[locale][key]!) }).toEqual({
          key,
          ph: placeholders(MESSAGES["en-US"][key]!),
        });
      }
    });

    it(`${locale} has no empty string`, () => {
      for (const key of english) expect(MESSAGES[locale][key]!.trim()).not.toBe("");
    });
  }

  it("is not English wearing seven hats", () => {
    /*
     * Parity is satisfied by pasting the English bundle eight times, so the
     * type and the key check above would both pass on a repo that had not been
     * translated at all. This is the assertion that would not.
     *
     * A handful of keys are legitimately identical everywhere — the brand name,
     * "404", "3/4", the example address, `mm` in four of the five Latin-script
     * languages, and templates that are nothing but placeholders and
     * punctuation like "{count} × {amount}" — so the bar is small rather than
     * zero.
     *
     * ── WHY IT IS A SHARE AND NOT A COUNT ─────────────────────────────────
     *
     * [Amended 2026-08-11.] It used to be `same.length < 20`, with a comment
     * saying "every locale currently sits at 9 to 13". That was true when it
     * was written and had quietly stopped being true: the bundle had grown by
     * a couple of hundred keys and fr-FR had reached 19 without anybody
     * noticing, so the NEXT key whose French happens to be the English word —
     * `mm` — tripped a guard about translation quality while changing nothing
     * about it. A bar an ordinary edit walks into is a bar somebody eventually
     * raises to get their work in, and raising it is how it stops meaning
     * anything.
     *
     * The honest measure is the SHARE of the bundle: an untranslated locale is
     * at 100%, and a real one sits near two per cent whatever the bundle's
     * size. The list is printed on failure, because the useful question is
     * always "which ones?" and a bare number never answers it.
     */
    const CEILING = 0.04;
    for (const locale of LOCALE_TAGS.filter((l): l is LocaleTag => l !== "en-US")) {
      const same = english.filter((k) => MESSAGES[locale][k] === MESSAGES["en-US"][k]);
      const share = same.length / english.length;
      expect(
        { locale, translated: share < CEILING },
        `${locale}: ${same.length}/${english.length} strings are the English ones — ${same.join(", ")}`,
      ).toEqual({ locale, translated: true });
    }
  });

  it("would catch a locale that had not been translated at all", () => {
    // The bar above is an absence; this is the case that shows it bites. A
    // pasted English bundle is the failure it exists for.
    const pasted = { ...MESSAGES["en-US"] };
    const same = english.filter((k) => pasted[k] === MESSAGES["en-US"][k]);
    expect(same.length / english.length).toBe(1);
  });
});

describe("the host and its add-ons measure in the same unit", () => {
  /**
   * ONE MILLIMETRE, ONE WORD, PER LANGUAGE.
   *
   * `lib/format.ts`'s `mm()` used to append a literal " mm" whatever the
   * reader's language, so a piece's page in ar-EG printed "٩٥ × ٩٥ mm" — the
   * digits correctly Arabic-Indic and the unit stubbornly Latin — while the
   * personalizer, mounted in the very next block on the same page, printed
   * "٧ مم". Two renderings of the same measurement, side by side, and the
   * add-on had it right.
   *
   * The unit is a word rather than a symbol in exactly the places you would
   * expect (毫米, 公釐, مم) and the same two letters everywhere else, so this
   * compares what each side puts AFTER the number rather than the whole string.
   */
  const unitOf = (template: string, placeholder: string) =>
    template.replace(`{${placeholder}}`, "").trim();

  it("uses the add-on's own unit noun in all eight locales", () => {
    for (const locale of LOCALE_TAGS) {
      const host = unitOf(MESSAGES[locale]["common.mm"]!, "value");
      const addOn = unitOf(personalizerStrings[locale]["addon.personalizer.sizeUnit"]!, "mm");
      expect({ locale, host }).toEqual({ locale, host: addOn });
    }
  });

  it("says something other than `mm` where the language does", () => {
    // The half that would pass if both sides were wrong together.
    expect(MESSAGES["zh-CN"]["common.mm"]).toContain("毫米");
    expect(MESSAGES["zh-TW"]["common.mm"]).toContain("公釐");
    expect(MESSAGES["ar-EG"]["common.mm"]).toContain("مم");
    expect(MESSAGES["ar-EG"]["common.mm"]).not.toContain("mm");
  });
});

describe("the vocabulary ban (24 D10, D10b)", () => {
  /*
   * English gets the full list as WORDS as well as substrings. Several of them
   * are this trade's own vocabulary — a quantity break wants to be called a
   * tier and postage wants to be free — so this is the guard that catches the
   * first draft of the next screen.
   */
  const BANNED_EN = /\b(pricing|tiers?|free|plans?|upgrade|billing|premium|pro)\b/i;

  /*
   * The other seven get the four that have no innocent homograph. The full list
   * cannot run against them HERE, where the locale is known: German
   * "pro Stück" means "each", Czech "pro" means "for", Danish "planen" means
   * "the schedule", and a check that forced a translator away from the ordinary
   * word in their language would be trading a real defect for an imaginary one.
   *
   * [Amended 2026-08-11.] THE BUILT BUNDLE IS STRICTER, and it has to be: a
   * minified file carries all eight locales interleaved and there is no way to
   * attribute a byte back to the language it came from, so `builtOutput.test.ts`
   * runs the word-anchored `pro` ban over the lot with `PRO_PHRASES` as the only
   * escape hatch. When that gate was first written it immediately found three
   * Czech sentences using the ordinary preposition — a pet tag's name, a hint
   * about garden markers, and a line about slate. All three were REWRITTEN
   * around it ("na obojek", "z každého", "stranu na písmo") rather than excused,
   * because this app's own copy claims to have been written that way and two of
   * the three were simply places nobody had checked. `PRO_PHRASES` is still
   * empty, and an entry appearing in it is a decision somebody made.
   */
  const BANNED_ANY = /pricing|premium|upgrade|billing/i;

  const substringHits = (value: string) => bannedSubstringsIn(strip(value));

  it("keeps the English copy clear of all of them", () => {
    const hits = Object.entries(MESSAGES["en-US"])
      .filter(([, v]) => BANNED_EN.test(strip(v)))
      .map(([k, v]) => `${k} · ${v}`);
    expect(hits).toEqual([]);
  });

  it("catches them as SUBSTRINGS too, in every locale", () => {
    /*
     * 17 §2's grep is case-insensitive and UNANCHORED, so "explanation" is a
     * hit on "plan" and "frontier" is a hit on "tier" — the two traps D10 names
     * by name, and neither is visible to `\b(plans?|tiers?)\b`. This app's
     * translations were written around the list rather than into it, so the
     * substring rule runs over ALL EIGHT locales with no carve-outs at all.
     */
    for (const locale of LOCALE_TAGS) {
      const hits = Object.entries(MESSAGES[locale])
        .filter(([, v]) => substringHits(v).length > 0)
        .map(([k, v]) => `${locale} ${k} · ${substringHits(v).join(",")} · ${v}`);
      expect(hits).toEqual([]);
    }
  });

  it("would actually catch the traps it is written for", () => {
    // The guard above is an absence, and an absence proves nothing unless the
    // check is shown to bite.
    expect(substringHits("a short explanation of the sizes")).toContain("plan");
    expect(substringHits("the frontier of large format")).toContain("tier");
    expect(substringHits("postage is free on orders over $40")).toContain("free");
    expect(substringHits("a tiered cake topper")).toContain("tier");
    // And the word-anchored guard is shown NOT to, which is why both exist.
    expect(BANNED_EN.test("a short explanation of the sizes")).toBe(false);
  });

  it("keeps the marketing words out of every translation", () => {
    for (const locale of LOCALE_TAGS) {
      const hits = Object.entries(MESSAGES[locale])
        .filter(([, v]) => BANNED_ANY.test(strip(v)))
        .map(([k]) => `${locale} ${k}`);
      expect(hits).toEqual([]);
    }
  });

  it("spells the tiering idea in no language", () => {
    for (const locale of LOCALE_TAGS) {
      const patterns = TIERING_WORDS[locale] ?? [];
      expect(patterns.length, locale).toBeGreaterThan(0);
      const hits = Object.entries(MESSAGES[locale])
        .filter(([, v]) => patterns.some((p) => p.test(strip(v))))
        .map(([k, v]) => `${locale} ${k} · ${v}`);
      expect(hits).toEqual([]);
    }
  });

  it("never writes a path containing /mo", () => {
    for (const locale of LOCALE_TAGS) {
      for (const [key, value] of Object.entries(MESSAGES[locale])) {
        expect({ key, hit: /\/mo\b/.test(value) }).toEqual({ key, hit: false });
      }
    }
  });
});

describe("the craft traps (24 D10b)", () => {
  it("says pot and garden markers, never the banned word for either", () => {
    for (const trap of CRAFT_TRAPS) {
      const hits = Object.entries(MESSAGES["en-US"])
        .filter(([, v]) => trap.wrong.test(v))
        .map(([k, v]) => `${k} · ${v} · say: ${trap.instead}`);
      expect(hits).toEqual([]);
    }
  });

  it("would catch each one — the table is shown to bite", () => {
    const bites = (s: string) => CRAFT_TRAPS.some((t) => t.wrong.test(s));
    expect(bites("slate plant markers")).toBe(true);
    expect(bites("a printed planter for the sill")).toBe(true);
    expect(bites("free postage over $40")).toBe(true);
    expect(bites("free engraving on every piece")).toBe(true);
    expect(bites("a free-standing wedding sign")).toBe(true);
    expect(bites("a tiered cake topper")).toBe(true);
    expect(bites("upgrade to walnut")).toBe(true);
    // And the words the shop actually uses pass.
    expect(bites("a printed herb pot for the windowsill")).toBe(false);
    expect(bites("slate garden markers")).toBe(false);
    expect(bites("postage is included in the total above")).toBe(false);
    expect(bites("a two-layer cake topper")).toBe(false);
    expect(bites("in walnut instead")).toBe(false);
  });
});

/**
 * NO PRICE IS TYPED INTO A TRANSLATED STRING.
 *
 * [Added 2026-08-11, wave 4b round 5.] Three packaging hints were finished
 * sentences carrying their own money: `"$4.50 per 500"` in English and
 * `"٤٫٥٠ $ لكل ٥٠٠"` in Arabic. The digits were correct for their locale, so the
 * numerals guard was satisfied, and two things were still wrong:
 *
 *   THE CURRENCY WAS A BARE `$`, where every price on the same screen renders
 *   `US$` / `$US` through `Intl.NumberFormat`. A bare `$` names a dozen
 *   currencies.
 *
 *   AND A TYPED PRICE CANNOT FOLLOW THE ENGINE. The rate lives in `rates.ts`;
 *   change it and eight bundles go on quoting the old figure on two screens
 *   while the basket charges the new one.
 *
 * ── WHY A SYMBOL AND NOT A NUMBER ───────────────────────────────────────────
 *
 * "No number in a message" is unenforceable — bundles legitimately carry years,
 * limits and step counts, and a rule with a list of allowed numbers is a rule
 * that gets one added to it whenever it fails. A CURRENCY SIGIL has no such
 * excuse: money is formatted, always, by one function, and a sigil in a message
 * means somebody wrote a price by hand. There is nothing to allow.
 *
 * It reads the sigils, not the amounts, so `{price} a unit` — the repaired
 * shape, where the figure is substituted — passes and must.
 */
describe("money is formatted, never typed", () => {
  /** Sigils, not amounts: what a hand-written price cannot avoid carrying. */
  const CURRENCY = /[$€£¥₹₽₩]|\bUSD\b|\bEUR\b|\bGBP\b/;

  it("carries no currency symbol in any locale's messages", () => {
    const bad: string[] = [];
    for (const [tag, bundle] of Object.entries(MESSAGES)) {
      for (const [key, value] of Object.entries(bundle as Record<string, string>)) {
        if (CURRENCY.test(value)) bad.push(`${tag} · ${key} = “${value}”`);
      }
    }
    expect(bad, `\n${bad.join("\n")}\n`).toEqual([]);
  });

  it("knows a typed price from a substituted one", () => {
    // The guard on the guard: a matcher that matched nothing would keep the
    // case above green through anything.
    expect(CURRENCY.test("$4.50 per 500")).toBe(true);
    expect(CURRENCY.test("٤٫٥٠ $ لكل ٥٠٠")).toBe(true);
    expect(CURRENCY.test("0,04 $ l'unité")).toBe(true);
    expect(CURRENCY.test("{price} a unit")).toBe(false);
    expect(CURRENCY.test("每 {n} 件 {price}")).toBe(false);
  });
});
