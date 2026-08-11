/**
 * Display formatting.
 *
 * Every function here goes through `i18n/ambient.ts` rather than taking a
 * locale argument, because the store, the seed and both engines call these from
 * outside React where no hook can reach the provider. The ambient module
 * mirrors whatever locale the tree is rendering, so a price formatted in the
 * store and a price formatted in a component always agree.
 */

import { money as ambientMoney, number as ambientNumber, locale, t as ambientT } from "../i18n/ambient.ts";
import type { MaterialKey } from "./catalogue.ts";

/** Cents → the reader's currency format. The engine works in integer cents. */
export function cents(value: number): string {
  return ambientMoney(value / 100);
}

/**
 * Millimetres, always tabular — `95 × 95` never flips under RTL.
 *
 * THE UNIT IS A WORD IN THE READER'S LANGUAGE, not the two Latin letters.
 * [Corrected 2026-08-11.] This used to append a literal " mm", so a page in
 * ar-EG read "٩٥ × ٩٥ mm" — Arabic-Indic digits and a Latin unit — directly
 * beside the personalizer's own "٧ مم", two renderings of the same measurement
 * on one screen, and Chinese read "mm" where the stock names and the batch
 * sheet on the same bench said 毫米. The digits were already right, which is
 * what made it easy to miss.
 *
 * It goes through the AMBIENT `t` rather than a table of its own: this module
 * is called from the store, the seed and both engines, where no hook reaches
 * the provider, and `i18n/ambient.ts` exists precisely so those callers use the
 * bundle the tree is using instead of a second copy of it.
 */
export function mm(width: number, height: number): string {
  return ambientT("common.mm", { value: `${trim(width)} × ${trim(height)}` });
}

export function trim(n: number): string {
  return ambientNumber(Math.round(n * 10) / 10);
}

/**
 * A PLAIN NUMBER, FOR THE PLACES A NUMBER GOES STRAIGHT INTO JSX.
 *
 * `t()` formats every number substituted into copy, which covers a sentence
 * with a figure in it and covers nothing else. A count rendered on its own —
 * `<Mono>{queued}</Mono>`, a lead time in a table cell — never goes near `t()`,
 * and those cells sat in Arabic tables printing Latin digits beside prices this
 * same module had formatted. There is nothing clever to do about it: a number
 * on a screen goes through a formatter, and this is the shortest way to say so.
 */
export function num(value: number, opts?: Intl.NumberFormatOptions): string {
  return ambientNumber(value, opts);
}

/**
 * WHAT A READER TYPES INTO A NUMBER FIELD, IN WHATEVER DIGITS THEIR KEYBOARD
 * PRODUCES.
 *
 * The pair below exists because a text field that holds a count has to be right
 * in both directions and this app only ever got one of them:
 *
 *   COMING OUT, the spoilage dialog seeded its field with the string `"1"` —
 *   a Latin digit on an Arabic screen, in a value `textContent` does not carry,
 *   which is exactly the seam `numerals.arabic.test.tsx` reads inputs for. It
 *   went unseen for a different reason: the tour never opened that dialog.
 *
 *   GOING IN, the field then stripped everything outside `[0-9]`, so an Arabic
 *   reader typing ٣ on their own keyboard watched the character vanish. Showing
 *   ١ and refusing ١ is worse than showing 1.
 *
 * `keepDigits` keeps what was typed, in the reader's own digits; `parseCount`
 * is the one place those digits become a number. Both know the three digit sets
 * this app's eight locales can produce: Latin, Arabic-Indic (٠-٩) and Eastern
 * Arabic-Indic (۰-۹), which is what `Intl.NumberFormat` emits for `ar-EG`.
 */
const DIGIT_SETS = ["0123456789", "٠١٢٣٤٥٦٧٨٩", "۰۱۲۳۴۵۶۷۸۹"] as const;

export function keepDigits(raw: string): string {
  return [...raw].filter((ch) => DIGIT_SETS.some((set) => set.includes(ch))).join("");
}

export function parseCount(raw: string): number {
  const latin = [...keepDigits(raw)]
    .map((ch) => {
      for (const set of DIGIT_SETS) {
        const at = set.indexOf(ch);
        if (at >= 0) return String(at);
      }
      return "";
    })
    .join("");
  return latin === "" ? Number.NaN : Number.parseInt(latin, 10);
}

/** An ISO date, in the reader's calendar and language. */
export function day(iso: string, opts?: Intl.DateTimeFormatOptions): string {
  const [y, m, d] = iso.split("-").map((n) => Number.parseInt(n, 10));
  const date = new Date(Date.UTC(y!, m! - 1, d!));
  return new Intl.DateTimeFormat(locale(), {
    timeZone: "UTC",
    ...(opts ?? { weekday: "long", day: "numeric", month: "long" }),
  }).format(date);
}

/** Short form for chips and table cells. */
export function shortDay(iso: string): string {
  return day(iso, { day: "numeric", month: "short" });
}

/** The three-letter weekday the studio calendar's grid prints. */
export function weekdayShort(iso: string): string {
  return day(iso, { weekday: "short" });
}

/**
 * Two digits of a clock face, in the reader's numerals.
 *
 * `String(hour).padStart(2, "0")` is what this used to be, in two places, and
 * it is the same defect `t()` had: the dock read "الخميس، ٦ أغسطس 16:40" — an
 * Arabic date and a Latin time, side by side in one chip. `minimumIntegerDigits`
 * does the padding, so the zero is the locale's own zero and not a Latin one.
 */
export function twoDigits(value: number): string {
  return ambientNumber(value, { minimumIntegerDigits: 2, useGrouping: false });
}

/** The dock's clock readout: the pinned date and time, never a real one. */
export function clock(iso: string, hour: number, minute: number): string {
  const face = `${twoDigits(hour)}:${twoDigits(minute)}`;
  return `${day(iso, { weekday: "short", day: "numeric", month: "short" })} ${face}`;
}

/**
 * Grams → kilogrammes, to two places, in the reader's numerals.
 *
 * `(grams / 1000).toFixed(2)` is what the three parcel-weight call sites did,
 * and `toFixed` is a THIRD way past the formatter — after `String()` in `t()`
 * and `padStart` on the clock. It returns a string, so `t()`'s "a number is
 * formatted, a string is passed through" rule waved it straight onto the page:
 * the post-office run read "طرد واحد · 0.45 كجم · ٠ مُغلّف", a Latin weight
 * beside an Arabic-Indic count on one line. The rounding a reader wants is a
 * PROPERTY OF THE QUANTITY — a parcel is weighed to ten grams — so it belongs
 * in a named formatter here, where `Intl` does the rounding and the digits at
 * the same time, and not in an expression at the call site.
 */
export function kg(grams: number): string {
  return ambientNumber(grams / 1000, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

/** Percentages in the reader's numerals. */
export function pct(value: number): string {
  return ambientNumber(value, { style: "percent", maximumFractionDigits: 0 });
}

/** The CSS custom property carrying a material's gradient. */
export function tint(material: MaterialKey): string {
  return `var(--tint-${material})`;
}

/** The flat colour of the same material, for swatches and small marks. */
export function flatTint(material: MaterialKey): string {
  return `var(--tint-flat-${material})`;
}

/**
 * The material's texture layer, composited OVER its tint.
 *
 * Two backgrounds in one declaration, texture first: this is the whole reason
 * walnut does not read as painted card and slate does not read as walnut. The
 * shop sells objects and has no photography, so the tile has to carry the
 * material itself.
 */
export function materialSurface(material: MaterialKey): string {
  return `var(--tex-${material}), var(--tint-${material})`;
}
