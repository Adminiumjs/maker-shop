/**
 * Every language says every string, and says it with the same pieces:
 * the same placeholders as English, plural forms in the language's own CLDR
 * order, and no string left in English unless it is the same word there too
 * (a cognate, the brand or a sample address, named below — a new one fails
 * until named).
 *
 * It reads the five areas the app keeps (`chrome`, `shop`, `studio`,
 * `making`, `after`) directly rather than the merged bundle, so the areas
 * that are on their way out do not decide what it checks.
 */
import { describe, expect, it } from "vitest";

import { LOCALE_TAGS, type LocaleTag } from "./locales.ts";
import { after } from "./strings/after.ts";
import { chrome } from "./strings/chrome.ts";
import { making } from "./strings/making.ts";
import { shop } from "./strings/shop.ts";
import { studio } from "./strings/studio.ts";

const AREAS = [chrome, shop, studio, making, after] as const;
const BUNDLES = Object.fromEntries(
  LOCALE_TAGS.map((t) => [t, Object.assign({}, ...AREAS.map((a) => a[t]))]),
) as Record<LocaleTag, Record<string, string>>;

/**
 * How many `|` forms a language's plural strings carry (one form is always
 * allowed): the length of `PLURAL_ORDER` in `index.tsx`, which picks a form by
 * its place in that list. A Czech string with a fourth form for fractions
 * would have its `other` read as the fraction form ("5 dne").
 */
const FORMS: Record<LocaleTag, number> = { "en-US": 2, "de-DE": 2, "fr-FR": 2, "da-DK": 2, "cs-CZ": 3, "zh-CN": 1, "zh-TW": 1, "ar-EG": 6 };

/** Strings that are the same word in English and in the language. */
const SAME_AS_ENGLISH: Partial<Record<LocaleTag, string[]>> = {
  "de-DE": ["common.mm", "brand.name", "dock.short", "shop.brand", "shop.home.filter.material", "shop.product.angle.detail", "shop.product.material", "studio.proof.version", "studio.cut.sheet"],
  "fr-FR": ["common.mm", "brand.name", "shop.brand", "shop.category.pots", "shop.category.mugs", "shop.sum.total", "shop.checkout.email", "studio.menu", "studio.proof.version", "studio.cut.sheet", "after.total", "after.ask.email"],
  "da-DK": ["common.mm", "brand.name", "dock.short", "shop.brand", "shop.checkout.email", "studio.menu", "studio.proof.version", "studio.cut.sheet", "after.proof.send", "after.ask.email"],
  "cs-CZ": ["common.mm", "brand.name", "shop.brand", "shop.product.angle.detail", "shop.checkout.email", "studio.cut.sheet", "after.ask.email"],
  "ar-EG": ["brand.name", "shop.brand", "shop.checkout.emailPlaceholder"],
  "zh-CN": ["brand.name", "shop.brand", "shop.checkout.emailPlaceholder"],
  "zh-TW": ["brand.name", "shop.brand", "shop.checkout.emailPlaceholder"],
};

const EN = BUNDLES["en-US"];
const params = (text: string) => new Set([...text.matchAll(/\{(\w+)\}/g)].map((m) => m[1]!));

describe("en-US", () => {
  it("writes its plural strings in two forms", () => {
    expect(Object.keys(EN).filter((key) => EN[key]!.includes("|") && EN[key]!.split("|").length !== FORMS["en-US"])).toEqual([]);
  });
});

describe.each(LOCALE_TAGS.filter((t) => t !== "en-US"))("%s", (tag) => {
  const bundle = BUNDLES[tag];

  it("carries every English key", () => {
    expect(Object.keys(EN).filter((k) => bundle[k] === undefined || bundle[k] === "")).toEqual([]);
  });

  it("uses English's placeholders and no others", () => {
    const wrong: string[] = [];
    for (const [key, en] of Object.entries(EN)) {
      const text = bundle[key] ?? "";
      const want = params(en);
      const got = params(text);
      // A plural form may say its number in words ("قطعة واحدة"), so {count} may be missing.
      for (const p of want) if (p !== "count" && !got.has(p)) wrong.push(`${key}: no {${p}}`);
      for (const p of got) if (!want.has(p)) wrong.push(`${key}: {${p}} is not English's`);
    }
    expect(wrong).toEqual([]);
  });

  it("writes plural forms in the language's CLDR order", () => {
    const wrong = Object.keys(EN)
      .filter((key) => EN[key]!.includes("|"))
      .filter((key) => {
        const n = (bundle[key] ?? "").split("|").length;
        return n !== 1 && n !== FORMS[tag];
      });
    expect(wrong).toEqual([]);
  });

  it("leaves nothing in English but the named same words", () => {
    const same = Object.keys(EN).filter((k) => bundle[k] === EN[k] && /\p{L}/u.test(EN[k]!.replace(/\{\w+\}/g, "")));
    expect(same.sort()).toEqual([...(SAME_AS_ENGLISH[tag] ?? [])].sort());
  });
});

/** Labels that sit side by side and must never read the same. */
const SIDE_BY_SIDE = [
  ["shop.nav.shop", "shop.nav.order", "shop.nav.about", "shop.nav.basket"],
  ["shop.category.coasters", "shop.category.signs", "shop.category.keyrings", "shop.category.pots", "shop.category.desk", "shop.category.mugs", "shop.category.other"],
  ["shop.footer.postage", "shop.footer.care", "shop.footer.again", "shop.footer.ask", "shop.footer.wrong"],
] as const;

describe.each(LOCALE_TAGS)("%s: side-by-side labels", (tag) => {
  it("are all different", () => {
    for (const group of SIDE_BY_SIDE) {
      const words = group.map((key) => BUNDLES[tag][key]);
      expect(words.every((w) => typeof w === "string"), group.join(", ")).toBe(true);
      expect(new Set(words).size, group.join(", ")).toBe(group.length);
    }
  });
});
