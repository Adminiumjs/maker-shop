/**
 * Assertions about the SOURCE ITSELF, which no unit test can make.
 *
 * Each of these is a property of the tree rather than of any function's return
 * value, and each is the kind of thing a well-meaning edit reintroduces:
 *
 *   - THE CLOCK IS ALWAYS PASSED IN. No engine, screen or store may read
 *     `Date.now()`, `new Date()` with no argument, or `Math.random()`. A demo
 *     whose dates move on their own cannot be asserted or reproduced.
 *   - THERE IS NO FINISHED-GOODS STOCK (24 acceptance criterion 14, which asks
 *     for this to be "verifiable by grep"). Three rules about meaning, spelt in
 *     all eight languages, over every file that renders — see the block itself
 *     for what the seven-English-regex version of it let through.
 *   - NO VIEW COUNTS PLAIN WEEKDAYS (criterion 13). The bench runs Tuesday to
 *     Saturday and `lib/calendar.ts` is the only module allowed to know what
 *     that means; a screen asks for a named day and never computes one.
 *   - THE TEST LEXICON NEVER SHIPS. `testing/lexicon.ts` spells every banned
 *     word, so a bundle that imported it would fail the very grep it defines.
 *   - CSS LOGICAL PROPERTIES ONLY, because Arabic renders RTL with no RTL
 *     stylesheet and one `margin-left` is all it takes.
 */

import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

import { LOCALE_TAGS } from "./i18n/locales.ts";
import { impuritiesIn, restatementsIn } from "./testing/purity.ts";
import {
  foreignImportsIn,
  offendingAddresses,
  sendersIn,
  type InertOrigin,
} from "./testing/egress.ts";
import { MESSAGES } from "./i18n/messages/index.ts";

const SRC = fileURLToPath(new URL(".", import.meta.url));

function walk(dir: string): string[] {
  const out: string[] = [];
  for (const entry of readdirSync(dir)) {
    const path = join(dir, entry);
    if (statSync(path).isDirectory()) out.push(...walk(path));
    else if (/\.(ts|tsx|css)$/.test(entry)) out.push(path);
  }
  return out;
}

const ALL = walk(SRC).map((path) => {
  const text = readFileSync(path, "utf8");
  return {
    path,
    rel: path.slice(SRC.length),
    text,
    /**
     * The same file with its comments removed.
     *
     * Load-bearing rather than tidy: this repo's engines document the rule in
     * the words `no Date.now()`, and a check that read the comments would
     * report every file that promises to obey it as a file that breaks it.
     */
    code: text.replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|[^:])\/\/.*$/gm, "$1"),
  };
});

/** Everything that actually ships — no suites, no fixtures. */
const SHIPPED = ALL.filter((f) => !/\.test\.tsx?$/.test(f.rel) && !f.rel.startsWith("testing/"));

describe("the clock is always passed in", () => {
  /*
   * THE RULE IS `testing/purity.ts` NOW — one file, byte for byte in this repo,
   * the maker studio and the add-ons monorepo, with the mirror guard there
   * failing on any difference. There were three separate regular expressions
   * before, they had drifted, and the drift was invisible: this app never
   * checked `crypto.randomUUID` and the studio checked neither that nor
   * `performance.now`, so appending
   *
   *     export const zzSeed = { at: performance.now(), id: crypto.randomUUID() };
   *
   * to a shipped module left both suites green.
   */
  it("reads no real clock and no random number anywhere that ships", () => {
    // `new Date(Date.UTC(...))` and `new Date(ms)` stay fine — they are pure
    // arithmetic over a value that came from somewhere the caller controls.
    const hits = SHIPPED.flatMap((f) =>
      impuritiesIn(f.code).map((means) => `${f.rel} → ${means}`),
    );
    expect(hits).toEqual([]);
  });

  it("would say so if one arrived, in every spelling the three repos disagreed on", () => {
    // The mutant that proved the drift, driven through the shared rule rather
    // than through a restatement of it.
    expect(
      impuritiesIn("export const zzSeed = { at: performance.now(), id: crypto.randomUUID() };")
        .length,
    ).toBe(2);
    expect(impuritiesIn("const t = Date.now();").length).toBe(1);
    expect(impuritiesIn("const d = new Date();").length).toBe(1);
    expect(impuritiesIn("const r = Math.random();").length).toBe(1);
    expect(impuritiesIn("crypto.getRandomValues(new Uint8Array(8))").length).toBe(1);
    // …and pure arithmetic over a value passed in stays quiet.
    expect(impuritiesIn("const d = new Date(Date.UTC(2026, 7, 5));")).toEqual([]);
    expect(impuritiesIn("const d = new Date(iso);")).toEqual([]);
    expect(impuritiesIn("const at = clock.now();")).toEqual([]);
  });

  /**
   * AND NOBODY HERE MAY STATE THE RULE A SECOND TIME.
   *
   * The byte-for-byte mirror guard in the add-ons repo can only see a copy of
   * `testing/purity.ts` that DIFFERS. It is blind to the commoner shape, which
   * is a file that never imported it and is running its own regex beside it —
   * and that is precisely what all four add-on packages were doing while every
   * suite in this wave was green. This repo is where that would show up as an
   * app shipping a die, so the check runs here too rather than only in the
   * monorepo, which a published clone of this app does not have beside it.
   *
   * `testing/purity.ts` is excluded because it IS the rule and has to spell
   * every pattern out. Nothing else may.
   */
  it("states that rule in exactly one file, and this is not it", () => {
    const offenders = ALL.filter((f) => f.rel !== join("testing", "purity.ts")).flatMap((f) =>
      restatementsIn(f.code).map((means) => `${f.rel} → ${means}`),
    );
    expect(
      offenders,
      "a pattern of its own beside the shared rule is two rules, and only one of them gets " +
        "repaired next time — see testing/purity.ts",
    ).toEqual([]);
  });
});

/**
 * THE ADDRESSES THIS BUNDLE IS ALLOWED TO NAME, AND WHY EACH IS INERT.
 *
 * Anything not declared is reported. The comparison is on the ORIGIN and it is
 * exact, so a host that merely starts with an allowed one inherits nothing.
 */
/**
 * ── AN ADDRESS AN ADD-ON NAMES IS THE ADD-ON'S FACT, NOT THIS APP'S ─────────
 *
 * What stood here was a list of origins this app allows, and two of the entries
 * were Canva's — declared by an app that merely RECEIVES the add-on that names
 * them. That is AC20/D21 broken in both directions, and it was demonstrated in
 * both: vendoring the personalizer into this app unchanged, registration only,
 * turned this suite red on
 * `add-ons/vendor/personalizer/template.ts → http://www.w3.org/2000/svg`, and
 * vendoring Canva Import into the studio turned ITS suite red the same way.
 * Making a portable add-on pass required an edit to an exemption list inside
 * the host — the exact thing a closed slot registry exists to make unnecessary.
 *
 * This is the FOURTH host-local list found holding an add-on's fact, after
 * `HOSTED_SLOTS`, the Czech "pro" carve-out and the ar-EG numeral allowances.
 * Round 5 built the mechanism for the third; this is that mechanism, applied.
 * Every add-on exports `INERT_ORIGINS` from its own `add-on-facts.ts`, the
 * sync vendors it, and `addOnOrigins()` reads whatever THIS app has vendored.
 * Vendor an add-on and its declarations arrive; drop it and they leave; nothing
 * in this file changes either way.
 *
 * `import.meta.glob` is resolved by the bundler, so by the time this runs it is
 * a static list of modules — no filesystem read, no dynamic import.
 */
const VENDORED_ORIGINS = import.meta.glob<{
  INERT_ORIGINS?: readonly { origin: string; why: string }[];
  NEVER_IN_A_BROWSER?: readonly { text: string; why: string }[];
}>("./add-ons/vendor/*/add-on-facts.ts", { eager: true });

function addOnOrigins(): InertOrigin[] {
  return Object.values(VENDORED_ORIGINS).flatMap((module) => [...(module.INERT_ORIGINS ?? [])]);
}

/**
 * What every add-on this app vendors declares must never reach a browser.
 *
 * The same discovery the inert origins use, off the same file. See
 * `builtOutput.test.ts` for why these are the add-on's facts and not this
 * app's, and what shipped green while they were this app's.
 */
function addOnNeedles(): { text: string; why: string }[] {
  return Object.values(VENDORED_ORIGINS).flatMap((module) => [
    ...(module.NEVER_IN_A_BROWSER ?? []),
  ]);
}


/**
 * THIS STUDIO'S OWN, WHICH IS NONE.
 *
 * The one entry that used to stand here was the SVG XML namespace the
 * PERSONALIZER writes into every picture it draws — an add-on's fact, in a
 * host's list. It is declared where it belongs now, and this app names no
 * address of its own at all.
 */
const OURS: readonly InertOrigin[] = [];

/** Ours, plus whatever the add-ons this studio vendors declare for themselves. */
const INERT: readonly InertOrigin[] = [...OURS, ...addOnOrigins()];

describe("nothing here can reach a host we do not control (24 D11)", () => {
  /*
   * D11 AS A RULE, NOT A WORD LIST.
   *
   * This was `\bfetch\(|XMLHttpRequest|WebSocket` — three spellings — and a
   * verifier beat the sibling host's copy of it by writing
   *
   *     const img = new Image();
   *     img.src = "https://tracking.example-analytics.net/p?c=" + …
   *
   * into a vendored add-on component. An image beacon is a request and holds
   * none of the three words; neither does a `<script>` tag, a
   * `<link rel=preconnect>`, a form `action`, a CSS `url()`, an `<iframe>`, a
   * `Worker`, a dynamic `import()` or `sendBeacon` under an alias.
   *
   * `testing/egress.ts` states the category in three nets. Two are static and
   * are below — an ADDRESS nobody declared inert, and an API whose only purpose
   * is to issue a request. The third watches the running page
   * (`add-ons/egress.test.tsx`), because whether `img.src = x` is a defect
   * depends on x, and that is not a property of the text.
   */
  it("names no address outside the ones declared inert", () => {
    const offenders = SHIPPED.flatMap((f) =>
      offendingAddresses(f.code, INERT).map((url) => `${f.rel} → ${url}`),
    );
    expect(offenders).toEqual([]);
  });

  it("carries nothing that can issue a request", () => {
    const offenders = SHIPPED.flatMap((f) => [
      ...sendersIn(f.code).map((means) => `${f.rel} → ${means}`),
      ...foreignImportsIn(f.code).map((spec) => `${f.rel} → ${spec}`),
    ]);
    expect(offenders).toEqual([]);
  });

  it("read something, so an empty result is never a pass", () => {
    expect(SHIPPED.length).toBeGreaterThan(20);
  });
});

describe("no finished-goods stock, verifiable by grep (criterion 14)", () => {
  /**
   * ── WHAT WAS WRONG WITH THE OLD VERSION OF THIS BLOCK ─────────────────────
   *
   * It was seven English regexes run over two directories, and both halves of
   * that leaked.
   *
   * THE PHRASE LIST WAS A FINGERPRINT, NOT A RULE. It knew "only 3 left" and
   * "in stock". It did not know "Just 2 left", "1 remaining" or "Selling fast",
   * so a badge reading all three passed INSIDE `screens/` — proven by pasting
   * it there and watching the suite stay green. A list of the sentences
   * somebody already thought of cannot catch the next one.
   *
   * IT WAS ENGLISH ONLY. Seven of the eight locales could say anything at all.
   *
   * AND IT SAW TWO DIRECTORIES. `components/`, `data/`, `state/` and the
   * vendored add-on halves were invisible, so a `StockBadge` component — the
   * single most likely place for this defect to appear — shipped unseen.
   *
   * ── WHAT IT IS NOW ────────────────────────────────────────────────────────
   *
   * Three rules about MEANING, each spelt in all eight languages, over
   * everything that ships:
   *
   *   1. STOCK OF FINISHED PIECES. Any phrase that says a made thing is or is
   *      not held on a shelf. Absolute — no number needed.
   *   2. A COUNT NEXT TO A WORD OF REMAINDER. "left", "übrig", "剩", "متبق" and
   *      their kin are ordinary words on their own ("Left bare", "Tilbage til
   *      butikken", "let the rest be what it is" all ship today and all are
   *      fine); what a shop with no shelf can never honestly write is one of
   *      them with a QUANTITY beside it.
   *   3. HURRYING THE READER. "Selling fast", "last chance", "almost gone" —
   *      the scarcity idea with the count left out, which is how it comes back
   *      after a rule about counts is written.
   *
   * Rules 1 and 2 are asserted over SHOPPER-facing copy. The maker's shelf is
   * the one inventory this shop has and it genuinely counts: "4 sheets left" is
   * on the bench because it is TRUE there, of walnut and not of coasters. That
   * carve-out is drawn by KEY PREFIX rather than by file, and it does not
   * extend to rule 3 — nothing in this app hurries anybody.
   */

  /**
   * A QUANTITY OF THINGS — which is narrower than "a number", on purpose.
   *
   * Three exclusions, each one a false positive this rule actually produced
   * before they were added:
   *
   *   - A MEASUREMENT IS NOT A COUNT. "Birch ply, 4mm, with the pale face left
   *     showing" is a description of a material, and it read as "4 … left".
   *   - A PLACEHOLDER IS ONLY A COUNT IF IT COUNTS. `{day}` is a date, and
   *     "Uret tilbage til {day}" — Danish for "clock back to Thursday" — read
   *     as a quantity beside a word of remainder. The names below are the ones
   *     that hold numbers of things.
   *   - CJK NUMERALS ARE NOT COUNTS HERE. 一 and 十 are ordinary syllables in
   *     ordinary sentences ("那一周" is "that week"), and this app formats every
   *     number it renders in Chinese as a digit anyway, so including them
   *     bought nothing and matched everything.
   */
  const COUNTING_NAME =
    "count|n|qty|quantity|num|number|total|pieces|blanks|items|lines|sheets|units|remaining|left";
  const COUNT =
    String.raw`(?:\{(?:${COUNTING_NAME})\}` +
    String.raw`|(?<![\p{L}\p{N}])[0-9٠-٩۰-۹]+(?![\p{L}\p{N}]|\s*(?:mm|cm|kg|g\b|%|°)))`;

  /**
   * Words meaning "how many of this are still to be had", per language.
   *
   * Substrings, not words, so an inflection cannot walk around them: Czech
   * "zbýv" covers zbývá/zbývají/zbývající, Arabic "متبق" covers متبقي/متبقية.
   */
  const REMAINDER: Record<string, string[]> = {
    "en-US": ["left", "remain", "to go", "in stock", "available", "on the shelf", "up for grabs"],
    "de-DE": ["übrig", "verbleib", "verfügbar", "auf lager", "vorrätig", "rest"],
    "fr-FR": ["restant", "reste", "disponible", "en stock", "il n'en"],
    "cs-CZ": ["zbýv", "skladem", "dostupn", "poslední"],
    "da-DK": ["tilbage", "på lager", "resterende", "tilovers"],
    "zh-CN": ["剩", "仅存", "库存", "还有", "现货"],
    "zh-TW": ["剩", "僅存", "庫存", "還有", "現貨"],
    "ar-EG": ["متبق", "باقي", "باقٍ", "متوفر", "المخزون"],
  };

  /** Saying a MADE PIECE is or is not on a shelf. Absolute — no count needed. */
  const ON_A_SHELF: Record<string, RegExp[]> = {
    "en-US": [/in stock/i, /out of stock/i, /sold out/i, /low stock/i, /stock count/i],
    "de-DE": [/auf lager/i, /ausverkauft/i, /lagerbestand/i],
    "fr-FR": [/en stock/i, /épuisé/i, /rupture de stock/i],
    "cs-CZ": [/skladem/i, /vyprodán/i, /zásob/i],
    "da-DK": [/på lager/i, /udsolgt/i, /lagerbeholdning/i],
    "zh-CN": [/有货/, /售罄/, /缺货/, /库存/],
    "zh-TW": [/有貨/, /售罄/, /缺貨/, /庫存/],
    "ar-EG": [/نفدت/, /نفد المخزون/, /المخزون/],
  };

  /** The scarcity idea with the count left out. Nothing here hurries anybody. */
  const HURRY: Record<string, RegExp[]> = {
    "en-US": [
      /selling fast/i,
      /going fast/i,
      /almost gone/i,
      /last chance/i,
      /hurry/i,
      /while stocks last/i,
      /don'?t miss/i,
      /act now/i,
      /before (it|they)'?s? gone/i,
    ],
    "de-DE": [/schnell weg/i, /fast ausverkauft/i, /letzte chance/i, /beeil/i, /nur noch kurz/i],
    "fr-FR": [/part vite/i, /dernière chance/i, /dépêche/i, /plus que quelques/i],
    "cs-CZ": [/rychle mizí/i, /poslední šance/i, /pospěš/i, /už jen pár/i],
    "da-DK": [/går hurtigt/i, /sidste chance/i, /skynd/i, /kun få tilbage/i],
    "zh-CN": [/手慢无/, /抓紧/, /最后机会/, /售完为止/],
    "zh-TW": [/手慢無/, /抓緊/, /最後機會/, /售完為止/],
    "ar-EG": [/تنفد بسرعة/, /آخر فرصة/, /أسرع/, /حتى نفاد/],
  };

  /**
   * A count within a short reach of a word of remainder, in either order.
   *
   * Either order because the languages disagree: English puts the count first
   * ("2 left"), Arabic and Chinese can put it second (متبقٍ ٢ / 还有 2 件). The
   * window stops at sentence punctuation so two unrelated clauses cannot be
   * read as one claim.
   */
  const countedRemainder = (text: string, locale: string): string | null => {
    for (const word of REMAINDER[locale] ?? []) {
      const w = word.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      const near = String.raw`[^.!?;\n|]{0,24}`;
      for (const source of [`${COUNT}${near}${w}`, `${w}${near}${COUNT}`]) {
        const hit = new RegExp(source, "iu").exec(text);
        if (hit !== null) return hit[0];
      }
    }
    return null;
  };

  const matched = (text: string, patterns: RegExp[] = []): string | null => {
    for (const pattern of patterns) {
      const hit = pattern.exec(text);
      if (hit !== null) return hit[0];
    }
    return null;
  };

  /**
   * The maker's own copy, which is the one place a count of things on a shelf
   * is TRUE — and it is about sheets, blanks, filament and glaze, never about a
   * finished piece. Named by key prefix so the carve-out is a property of what
   * the string says rather than of which file somebody put it in.
   */
  const MAKER_KEY = /^(bench\.|data\.stock\.|addon\.)/;

  /**
   * The same three rules over the SOURCE of everything that renders.
   *
   * A badge whose copy is hardcoded in a component never reaches the bundle, so
   * the checks above cannot see it — which is exactly the case the widening was
   * for. English rules, because copy that skipped the bundle is by definition
   * untranslated. Comments stripped, because this repo's prose legitimately
   * discusses the rule it is obeying.
   */
  const SHOPPER_SOURCES = SHIPPED.filter(
    (f) =>
      f.rel.startsWith("screens/") ||
      f.rel.startsWith("components/") ||
      f.rel.startsWith("data/") ||
      f.rel.startsWith("state/") ||
      f.rel.startsWith("i18n/strings/") ||
      f.rel.startsWith("add-ons/"),
  );

  /**
   * The sentences inside a source file, as against its code.
   *
   * All three rules run over this rather than over the raw text, and the third
   * one is why. `countedRemainder` looks for a number near a word of
   * remainder, and a `.tsx` file is full of both: `<ChevronLeft size={14} />`
   * is "Left" with a 14 beside it and means nothing at all. So the check reads
   * what a person would read — JSX text and prose-shaped string literals —
   * which is also where the defect would actually be written.
   */
  /**
   * Replace each top-level `{…}` in a JSX text run with what it means to a
   * reader: nothing, if it carries a translated string (that string has its own
   * entry in the bundle and is checked there), or a stand-in count otherwise.
   *
   * Depth-aware rather than a regex, because `{t("…leftover", { count })}` has
   * a brace inside a brace: a flat `\{[^{}]*\}` collapsed only the INNER one
   * and left `leftover", {count}` behind as if a screen had written it.
   */
  const collapseExpressions = (text: string): string => {
    let out = "";
    let inner = "";
    let depth = 0;
    for (const ch of text) {
      if (ch === "{") {
        depth += 1;
        if (depth === 1) {
          inner = "";
          continue;
        }
      } else if (ch === "}") {
        depth -= 1;
        if (depth === 0) {
          out += /["'`]/.test(inner) ? " " : "{count}";
          continue;
        }
      }
      if (depth === 0) out += ch;
      else inner += ch;
    }
    return out;
  };

  const visibleCopy = (rel: string, code: string): string[] => {
    const prose = (s: string) => /\s/.test(s.trim()) && (s.match(/\p{L}/gu) ?? []).length > 3;
    /*
     * A JSX text run is read WITH its interpolations in place, because that is
     * how the reader sees it: `Only {n} left in stock` is one sentence, and an
     * extractor that stopped at the brace saw "Only" and "left in stock" as two
     * unrelated fragments and missed a `StockBadge` sitting in `components/`.
     * An interpolation that carries a translated string is dropped (it has its
     * own entry in the bundle and is checked there); anything else stands in as
     * a count, which is what a bare value in the middle of a sentence is.
     */
    /*
     * Only in a `.tsx` file, and never after an `=`. `(x) => t("…leftover", …)`
     * and `available(p: ProductRef): boolean` both put a `>` and a `<` around a
     * run of code that is not text at all, and both were reported as copy the
     * first time this ran.
     */
    const jsxText = rel.endsWith(".tsx")
      ? [...code.matchAll(/(?<![=<>!+-])>([^<>]*)</g)].map((m) => collapseExpressions(m[1]!))
      : [];
    const literals = [...code.matchAll(/(["'`])([^"'`\n]{4,})\1/g)].map((m) => m[2]!);
    return [...jsxText, ...literals].filter(prose);
  };

  it("has the whole bundle and every shipped file to check", () => {
    expect(LOCALE_TAGS).toHaveLength(8);
    expect(Object.keys(MESSAGES["en-US"]).length).toBeGreaterThan(300);
    expect(SHOPPER_SOURCES.length).toBeGreaterThan(20);
  });

  it("never says a made piece is on a shelf, in any of the eight languages", () => {
    const hits: string[] = [];
    for (const locale of LOCALE_TAGS) {
      for (const [key, value] of Object.entries(MESSAGES[locale])) {
        if (MAKER_KEY.test(key)) continue;
        const hit = matched(value, ON_A_SHELF[locale]);
        if (hit !== null) hits.push(`${locale} ${key} · ${hit} · ${value}`);
      }
    }
    expect(hits).toEqual([]);
  });

  it("never puts a count beside a word of remainder, in any of the eight", () => {
    const hits: string[] = [];
    for (const locale of LOCALE_TAGS) {
      for (const [key, value] of Object.entries(MESSAGES[locale])) {
        if (MAKER_KEY.test(key)) continue;
        const hit = countedRemainder(value, locale);
        if (hit !== null) hits.push(`${locale} ${key} · ${hit} · ${value}`);
      }
    }
    expect(hits).toEqual([]);
  });

  it("hurries nobody — not even on the maker's own screens", () => {
    const hits: string[] = [];
    for (const locale of LOCALE_TAGS) {
      for (const [key, value] of Object.entries(MESSAGES[locale])) {
        const hit = matched(value, HURRY[locale]);
        if (hit !== null) hits.push(`${locale} ${key} · ${hit} · ${value}`);
      }
    }
    expect(hits).toEqual([]);
  });

  it("carries no hardcoded scarcity copy in any file that renders", () => {
    const hits: string[] = [];
    for (const file of SHOPPER_SOURCES) {
      for (const line of visibleCopy(file.rel, file.code)) {
        const hit =
          matched(line, ON_A_SHELF["en-US"]) ??
          matched(line, HURRY["en-US"]) ??
          countedRemainder(line, "en-US");
        if (hit !== null) hits.push(`${file.rel} · ${hit}`);
      }
    }
    expect(hits).toEqual([]);
  });

  it("would catch every shape of the defect, including the ones a list missed", () => {
    /*
     * The proof the rules bite, and half of these are the sentences the old
     * seven-regex version let through.
     */
    const bites = (s: string, locale = "en-US") =>
      matched(s, ON_A_SHELF[locale]) !== null ||
      matched(s, HURRY[locale]) !== null ||
      countedRemainder(s, locale) !== null;

    // The three the old list knew.
    expect(bites("Only 3 left in stock")).toBe(true);
    expect(bites("Sold out")).toBe(true);
    expect(bites("Low stock — order soon")).toBe(true);
    // The three it did not, which is the whole reason this was rewritten.
    expect(bites("Just 2 left")).toBe(true);
    expect(bites("1 remaining")).toBe(true);
    expect(bites("Selling fast")).toBe(true);
    // Nor a count that arrives as a placeholder, which is how it would ship.
    expect(bites("{count} left")).toBe(true);
    expect(bites("Hurry — almost gone")).toBe(true);

    // And the other seven languages, which had no rule at all before.
    expect(bites("Nur noch 2 übrig", "de-DE")).toBe(true);
    expect(bites("Il ne reste que 3 pièces", "fr-FR")).toBe(true);
    expect(bites("Zbývají poslední 2 kusy", "cs-CZ")).toBe(true);
    expect(bites("Kun 2 tilbage", "da-DK")).toBe(true);
    expect(bites("仅剩 2 件", "zh-CN")).toBe(true);
    expect(bites("僅剩 2 件", "zh-TW")).toBe(true);
    expect(bites("متبقي ٢ فقط", "ar-EG")).toBe(true);

    // What the shop DOES say, in each language, and none of it is a hit.
    expect(bites("Made in small batches while the walnut lasts.")).toBe(false);
    expect(bites("Left bare")).toBe(false); // a finish, not a count
    expect(bites("Tilbage til butikken", "da-DK")).toBe(false); // "back to the shop"
    expect(bites("lassen den Rest, wie er ist", "de-DE")).toBe(false);
    expect(bites("laissons le reste tel quel", "fr-FR")).toBe(false);
  });

  it("keeps the one inventory it has out of every rendering file but the bench's", () => {
    /*
     * `MATERIAL_STOCK` may be named in the catalogue, the engine and the store.
     * Nothing that renders may reach for it — widened from `screens/` to every
     * component and every vendored add-on half, because a badge in a shared
     * primitive is drawn on the shopper's side too.
     */
    const reaching = SHIPPED.filter(
      (f) =>
        (f.rel.startsWith("screens/") ||
          f.rel.startsWith("components/") ||
          f.rel.startsWith("add-ons/")) &&
        /MATERIAL_STOCK/.test(f.text),
    ).map((f) => f.rel);
    expect(reaching).toEqual([]);
  });
});

describe("NO VIEW COUNTS PLAIN WEEKDAYS (criterion 13)", () => {
  /**
   * The bench runs Tuesday to Saturday, and `lib/calendar.ts` is the only place
   * in this repo allowed to know what that means.
   *
   * A screen that does its own day arithmetic can count the wrong kind of day,
   * and one did: the order view's stage strip added a plain calendar day to the
   * date an order was placed. Swapping `addStudioDays` for `addDays` there left
   * every test in the repo green while printing a Sunday under a step, three
   * clicks from the page that explains the shop is shut on Sundays.
   *
   * The behavioural half of this guard is in `orders.test.ts`, over the dates
   * themselves. This half is the reason it cannot come back: no view computes a
   * date at all. Screens ask for a NAMED day — `postDay`, `finishDay`,
   * `fortnight`, `shopperStageDates` — and the arithmetic behind those names is
   * tested where it lives.
   *
   * There is NO exception list, and there deliberately isn't one: the postage
   * calendar was the last holdout and its grid moved into `fortnight()` rather
   * than being named here. An exception in this rule is a place the next defect
   * fits.
   */
  const ARITHMETIC = /\b(addDays|addStudioDays|nextStudioDay|daysBetween|snapForward)\s*\(/;
  const RAW_DATE = /Date\.UTC|getUTC(Date|Day|Month|FullYear)|86[_,]?400[_,]?000/;

  const VIEWS = SHIPPED.filter(
    (f) => f.rel.startsWith("screens/") || f.rel.startsWith("components/"),
  );

  it("has views to check", () => {
    expect(VIEWS.length).toBeGreaterThan(8);
  });

  it("does no day arithmetic in any screen or component", () => {
    const hits: string[] = [];
    for (const file of VIEWS) {
      const a = ARITHMETIC.exec(file.code);
      if (a !== null) hits.push(`${file.rel} · ${a[0]}`);
      const d = RAW_DATE.exec(file.code);
      if (d !== null) hits.push(`${file.rel} · ${d[0]}`);
    }
    expect(hits).toEqual([]);
  });

  it("would catch the exact swap that got through before", () => {
    const bites = (s: string) => ARITHMETIC.test(s) || RAW_DATE.test(s);
    expect(bites("const finish = addDays(order.placedIso, 1);")).toBe(true);
    expect(bites("const finish = addStudioDays(order.placedIso, 1);")).toBe(true);
    expect(bites("const d = new Date(Date.UTC(2026, 7, 6));")).toBe(true);
    // What a screen is supposed to do instead.
    expect(bites("const stageDates = shopperStageDates(order);")).toBe(false);
    expect(bites("const days = fortnight(iso);")).toBe(false);
    expect(bites("day(postDay(clock, 3))")).toBe(false);
  });
});

describe("the test lexicon never ships", () => {
  it("is imported by suites only", () => {
    const importers = ALL.filter(
      (f) => /from "\.\.?\/.*testing\//.test(f.text) && !/\.test\.tsx?$/.test(f.rel),
    ).map((f) => f.rel);
    expect(importers).toEqual([]);
  });
});

describe("CSS logical properties only", () => {
  /**
   * The app renders RTL for Arabic with NO RTL stylesheet, which only works
   * while every positional rule is logical. One `margin-left` is all it takes
   * to put a stage strip's dates on the wrong side in exactly one of eight
   * languages, which is the failure mode nobody reviewing in English sees.
   */
  const PHYSICAL =
    /(?:^|[\s;{])(margin|padding|border)-(left|right)\s*:|(?:^|[\s;{])(left|right)\s*:/;

  it("uses no physical left/right rule in any stylesheet", () => {
    const hits: string[] = [];
    for (const file of ALL.filter((f) => f.rel.endsWith(".css"))) {
      for (const line of file.text.split("\n")) {
        if (PHYSICAL.test(line)) hits.push(`${file.rel} · ${line.trim()}`);
      }
    }
    expect(hits).toEqual([]);
  });

  it("uses no physical left/right in an inline style either", () => {
    const hits: string[] = [];
    for (const file of SHIPPED.filter((f) => f.rel.endsWith(".tsx"))) {
      for (const match of file.text.matchAll(/\b(marginLeft|marginRight|paddingLeft|paddingRight|left|right):/g)) {
        hits.push(`${file.rel} · ${match[1]}`);
      }
    }
    expect(hits).toEqual([]);
  });
});

/**
 * THE DOCUMENTED COMMAND IS THE ONE THAT HAS TO PASS.
 *
 * `npm test` shipped RED on a clean tree for a whole round. Three suites take
 * 7–19 s — they mount the app and crawl it — and nothing configured a timeout,
 * so vitest's 5 s default failed all three. Every one of them passed for the
 * round that wrote them, because that round ran `npx vitest run --testTimeout=…`
 * with its own flags and never ran the command the README gives a reader.
 *
 * The repair is in `vite.config.ts`. This is the part that keeps it there: a
 * config line has no other test, it reads as boilerplate in a diff, and the only
 * person who notices its absence is whoever next runs the documented command.
 */
describe("the test command a reader is given is the one that is configured", () => {
  const config = readFileSync(join(process.cwd(), "vite.config.ts"), "utf8");

  it("gives the suites long enough to finish", () => {
    const declared = /testTimeout:\s*([\d_]+)/.exec(config);
    expect(declared, "vite.config.ts sets no test.testTimeout — see the block there").not.toBe(
      null,
    );
    /*
     * The slowest suite measured about 17 s. Anything under 30 s is a gate that
     * goes red on a loaded CI box, which is the same defect one machine later.
     */
    expect(Number((declared?.[1] ?? "0").replace(/_/g, ""))).toBeGreaterThanOrEqual(30_000);
  });

  it("runs the whole suite, with no flag a reader would have to know", () => {
    // `vitest run` and nothing else. A `--testTimeout` here would be the same
    // defect wearing the fix's clothes: the flag would live in one repo's
    // package.json and the reason for it nowhere.
    const scripts = JSON.parse(readFileSync(join(process.cwd(), "package.json"), "utf8")) as {
      scripts: Record<string, string>;
    };
    expect(scripts.scripts.test).toBe("vitest run");
    expect(readFileSync(join(process.cwd(), "README.md"), "utf8")).toContain("npm test");
  });
});

/**
 * AND THE DISCOVERY ITSELF IS GUARDED, because it is only as honest as what it
 * finds.
 *
 * A vendored package that exported nothing would contribute nothing and read
 * exactly like a package with nothing to declare. A renamed export, or a sync
 * that dropped the file, would leave this studio quietly allowing no origin at all
 * — which fails loudly here rather than silently on the day an add-on that
 * really does name an address is vendored.
 */
describe("an add-on brings its own inert origins with it (24 AC20, D21)", () => {
  it("reads a declaration off every add-on this studio vendors", () => {
    const declared = Object.entries(VENDORED_ORIGINS);
    expect(declared.length, "no vendored inert-origin declarations were found").toBeGreaterThan(0);
    const silent = declared
      .filter(([, module]) => module.INERT_ORIGINS === undefined)
      .map(([file]) => file);
    expect(silent, "these vendored packages export no INERT_ORIGINS").toEqual([]);
  });

  it("keeps no origin of its own that belongs to an add-on", () => {
    // The ratchet on the repair. Re-adding an add-on"s address to this studio"s
    // own list would work, and would put the defect straight back: every entry
    // here has to be an address THIS app names, and this studio names none.
    expect(OURS).toEqual([]);
  });

  it("says why, for every origin it allows, wherever it came from", () => {
    expect(INERT.length, "nothing was discovered at all").toBeGreaterThan(0);
    for (const entry of INERT) {
      expect(
        { origin: entry.origin, explained: entry.why.length > 30 },
        `${entry.origin} is allowed with no reason a reviewer can read`,
      ).toEqual({ origin: entry.origin, explained: true });
    }
  });

  it("forgives the declared origin and nothing that merely starts the same", () => {
    // The comparison is exact, and this is the case that says so: an add-on
    // declaring `api.canva.com` does not hand a look-alike host an allowance.
    const declared = INERT[0]!.origin;
    expect(offendingAddresses(`const a = "${declared}/x";`, INERT)).toEqual([]);
    expect(offendingAddresses(`const a = "${declared}.attacker.test/x";`, INERT)).not.toEqual([]);
  });
});

describe("secrets are server-only (24 D15)", () => {
  /**
   * ── THE SAME NEEDLES, ONE BUILD EARLIER, AND THEY ARE THE ADD-ON"S ────────
   *
   * `builtOutput.test.ts` greps the artefact; this catches a leak at the import
   * that would have caused one. Both used to spell the needles out — the
   * credentialled add-on"s two `secret: true` setting keys and the type its
   * server half reads them into — inside an app that merely receives it, so a
   * THIRD credentialled add-on would have been checked for nothing at all.
   * They come off each vendored add-on"s own `add-on-facts.ts` now; see the
   * block in `builtOutput.test.ts` for the argument.
   *
   * `apiKey` in camelCase is deliberately not among them, and that stays true
   * whoever declares it: the connect dialog holds one in component state while
   * the shop types it and drops it on submit, and `shop.connect.apiKey` is the
   * LABEL on that field. Banning the words a credential form has to say would
   * be banning the form, not the leak. What must never appear is the key a
   * value would be SAVED under.
   *
   * THE DECLARATION FILES THEMSELVES ARE NOT A LEAK. `add-on-facts.ts` exists
   * to NAME these strings, so it names them; it is data, it is imported by no
   * screen, and every other gate in this file — senders, clocks, the ban on
   * reaching `testing/` — still applies to it exactly as to any other vendored
   * module. Nothing else is excused.
   */
  it("keeps every secret setting out of the client half", () => {
    const needles = addOnNeedles();
    expect(needles.length, "no add-on declared anything server-only").toBeGreaterThan(0);
    const offenders = ALL.filter(
      (file) =>
        !/\.test\.tsx?$/.test(file.rel) &&
        !file.rel.endsWith("add-on-facts.ts") &&
        needles.some((needle) => file.code.includes(needle.text)),
    );
    expect(offenders.map((file) => file.rel)).toEqual([]);
  });

  /*
   * AND THIS STUDIO HAD NO SUCH GATE AT ALL, which is failure mode two in one
   * line: it vendors the same credentialled delivery add-on the works does, the
   * works has checked its own sources since round 1, and nobody ever asked this
   * one. The needles are declared by the add-on, so porting the gate is this
   * block and nothing else.
   */
  it("bites on a leak, so the absence above means something", () => {
    const needles = addOnNeedles();
    const leaked = `const saved = { ${needles[0]!.text}: value };`;
    expect(needles.some((needle) => leaked.includes(needle.text))).toBe(true);
  });
});
