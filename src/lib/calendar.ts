/**
 * The studio calendar — the spine of this app (24 D5b).
 *
 * Birch Row is two people and a bench, and the bench runs TUESDAY TO SATURDAY.
 * Sunday and Monday it is shut. That is not decoration: every lead time, every
 * ship-by date and every queue chip in this app counts STUDIO DAYS, so a piece
 * finished on Saturday posts on Tuesday and "+1 studio day" skips two nights.
 *
 * Three engines and two views read this module, which is why it is separated
 * from `orders.ts` rather than living inside it. Cut it and every date in the
 * app becomes a lie — 24 §8A lists it under "not cuttable" for that reason.
 *
 * PURE AND DETERMINISTIC, like every engine in the house: no `Date.now()`, no
 * `Math.random()`, no DOM, no network. The clock is always passed in. Dates are
 * ISO `YYYY-MM-DD` strings and all arithmetic goes through `Date.UTC`, so a
 * reviewer in Auckland and the droplet in Frankfurt get the same Tuesday.
 */

/**
 * The days the bench runs, as `Date.getUTCDay()` numbers (0 = Sunday).
 *
 * Tuesday(2) through Saturday(6). The two absent numbers are the whole point of
 * this file: 0 (Sunday) and 1 (Monday).
 */
export const STUDIO_DOW: readonly number[] = [2, 3, 4, 5, 6];

/**
 * Orders placed before 17:00 start the same studio day.
 *
 * The pinned clock sits at 16:40 precisely so that this is the day's live
 * tension when a reviewer opens the demo: twenty minutes to get on today's
 * bench, and "+1 studio day" is what shows them what the other side looks like.
 */
export const CUTOFF_HOUR = 17;

/** The clock, as the app carries it. Nothing anywhere reads a real one. */
export interface StudioClock {
  /** ISO `YYYY-MM-DD`. */
  iso: string;
  /** 24-hour, studio local. */
  hour: number;
  minute: number;
}

const MS_PER_DAY = 86_400_000;

function parse(iso: string): number {
  const [y, m, d] = iso.split("-").map((n) => Number.parseInt(n, 10));
  if (y === undefined || m === undefined || d === undefined || Number.isNaN(y)) {
    throw new Error(`Not an ISO date: ${iso}`);
  }
  return Date.UTC(y, m - 1, d);
}

function format(ms: number): string {
  const d = new Date(ms);
  const mm = String(d.getUTCMonth() + 1).padStart(2, "0");
  const dd = String(d.getUTCDate()).padStart(2, "0");
  return `${d.getUTCFullYear()}-${mm}-${dd}`;
}

/** 0 = Sunday … 6 = Saturday, in UTC so no local timezone can shift it. */
export function dayOfWeek(iso: string): number {
  return new Date(parse(iso)).getUTCDay();
}

/** Whether the bench runs on this date. False for Sunday and Monday, always. */
export function isStudioDay(iso: string): boolean {
  return STUDIO_DOW.includes(dayOfWeek(iso));
}

/** Plain calendar arithmetic — the only place a day is a day rather than a studio day. */
export function addDays(iso: string, days: number): string {
  return format(parse(iso) + days * MS_PER_DAY);
}

/** Whole calendar days between two dates. Negative when `to` is in the past. */
export function daysBetween(fromIso: string, toIso: string): number {
  return Math.round((parse(toIso) - parse(fromIso)) / MS_PER_DAY);
}

/**
 * The same date if the bench runs on it, otherwise the next day it does.
 *
 * Saturday stays Saturday; Sunday and Monday both become Tuesday. Used wherever
 * a date arrives from outside the calendar — a seeded order, a stored promise —
 * and has to be made sense of before anything counts from it.
 */
export function snapForward(iso: string): string {
  let out = iso;
  let guard = 0;
  while (!isStudioDay(out)) {
    out = addDays(out, 1);
    guard += 1;
    if (guard > 7) throw new Error("No studio day found within a week — check STUDIO_DOW");
  }
  return out;
}

/** The next studio day STRICTLY AFTER `iso`. Saturday → Tuesday. */
export function nextStudioDay(iso: string): string {
  return snapForward(addDays(iso, 1));
}

/**
 * Advance `n` studio days from `iso`, skipping Sunday and Monday.
 *
 * `n === 0` snaps a closed date forward and otherwise returns the date given,
 * which is what makes `addStudioDays(x, 0)` a safe way to normalise a date.
 * This is also the dock's "+1 studio day" chip: from Saturday it lands on
 * Tuesday, and that jump is how the calendar becomes visible to a reviewer who
 * has not read a word of this file.
 */
export function addStudioDays(iso: string, n: number): string {
  if (n < 0) throw new Error("The bench does not run backwards");
  let out = snapForward(iso);
  for (let i = 0; i < n; i += 1) out = nextStudioDay(out);
  return out;
}

/**
 * How many studio days from `fromIso` to `toIso`, signed.
 *
 * Counts the studio days you would have to advance to arrive: same day is 0,
 * the next open day is 1, and a date already behind you is negative. The board
 * and the ship-by chips are the callers — "late" is `< 0` and "post tomorrow"
 * is `<= 1`, in studio days rather than in nights slept.
 */
export function studioDaysBetween(fromIso: string, toIso: string): number {
  const forwards = daysBetween(fromIso, toIso) >= 0;
  const [early, late] = forwards ? [fromIso, toIso] : [toIso, fromIso];

  let count = 0;
  let cursor = early;
  while (cursor < late) {
    cursor = addDays(cursor, 1);
    if (isStudioDay(cursor)) count += 1;
  }
  return forwards ? count : -count;
}

/**
 * The studio day a piece ordered at `now` actually starts on.
 *
 * Before 17:00 on a day the bench runs, it starts today. After the cut-off it
 * starts the next studio day — and an order that lands on a Sunday starts
 * Tuesday whatever the hour says, because the cut-off is a question about a day
 * that is already open.
 */
export function startDay(now: StudioClock): string {
  const snapped = snapForward(now.iso);
  if (snapped !== now.iso) return snapped;
  return now.hour < CUTOFF_HOUR ? snapped : nextStudioDay(snapped);
}

/**
 * The day a piece with `leadStudioDays` on the bench comes off it.
 *
 * THE START DAY IS THE FIRST OF THE LEAD DAYS, not the day before it. Three
 * studio days beginning Thursday means Thursday, Friday, Saturday — finished
 * Saturday — which is why the arithmetic is `leadStudioDays - 1` and not
 * `leadStudioDays`. Getting this off by one moves every date in the app.
 */
export function finishDay(now: StudioClock, leadStudioDays: number): string {
  if (leadStudioDays < 1) throw new Error("A piece takes at least one studio day");
  return addStudioDays(startDay(now), leadStudioDays - 1);
}

/**
 * The day it goes in the post.
 *
 * Nothing is posted the day it is finished: it is packed at the end of the
 * bench day and goes on the next post office run, which is the next studio day.
 * A piece finished on Saturday therefore posts on TUESDAY, and that single
 * sentence is what most of this module exists to make true.
 */
export function postDay(now: StudioClock, leadStudioDays: number): string {
  return nextStudioDay(finishDay(now, leadStudioDays));
}

/**
 * The next `length` CALENDAR days from `iso`, each marked open or shut.
 *
 * The one place plain calendar days are the right unit, and it is here rather
 * than in the postage screen that draws it because NO SCREEN COUNTS DAYS —
 * `sources.test.ts` holds that line, and it can only hold it absolutely if the
 * grid's own arithmetic has somewhere honest to live. A fortnight with two
 * holes in it explains the studio week faster than a paragraph does, so the
 * shut days are RETURNED and drawn shut rather than filtered out.
 */
export function fortnight(iso: string, length = 14): { date: string; open: boolean }[] {
  return Array.from({ length }, (_, i) => {
    const date = addDays(iso, i);
    return { date, open: isStudioDay(date) };
  });
}

/**
 * The post day for a piece whose bench day is already known.
 *
 * The order view has a finish date and no clock to re-derive it from, so it
 * asks this rather than rebuilding a `StudioClock` out of a stored date.
 */
export function postDayAfter(finishedIso: string): string {
  return nextStudioDay(finishedIso);
}
