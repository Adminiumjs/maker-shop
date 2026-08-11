/**
 * The studio calendar's suite (24 acceptance criterion 13).
 *
 * Three things are asserted by name because the criterion names them: a coaster
 * ordered at the pinned moment is posted on TUESDAY 11 AUGUST, a piece finished
 * on Saturday posts on Tuesday, and "+1 studio day" skips Sunday AND Monday.
 * Everything else here exists so that a change which breaks one of those three
 * cannot pass by breaking it in an interesting way.
 *
 * The pinned clock is imported from the seed rather than retyped, so a test
 * that passes is a test about the app people actually open.
 */

import { describe, expect, it } from "vitest";

import { NOW } from "../data/demo.ts";
import {
  CUTOFF_HOUR,
  STUDIO_DOW,
  addDays,
  addStudioDays,
  dayOfWeek,
  daysBetween,
  finishDay,
  isStudioDay,
  nextStudioDay,
  postDay,
  postDayAfter,
  snapForward,
  startDay,
  studioDaysBetween,
} from "./calendar.ts";
import { leadDaysFor } from "./orders.ts";

/** August 2026, which is the fortnight every date in the demo lands in. */
const THU_6 = "2026-08-06";
const FRI_7 = "2026-08-07";
const SAT_8 = "2026-08-08";
const SUN_9 = "2026-08-09";
const MON_10 = "2026-08-10";
const TUE_11 = "2026-08-11";
const WED_12 = "2026-08-12";
const SAT_15 = "2026-08-15";
const TUE_18 = "2026-08-18";

describe("the pinned clock", () => {
  it("is Thursday, 6 August 2026 at 16:40 — twenty minutes before the cut-off", () => {
    expect(NOW).toEqual({ iso: THU_6, hour: 16, minute: 40 });
    expect(dayOfWeek(NOW.iso)).toBe(4); // Thursday
    expect(NOW.hour).toBeLessThan(CUTOFF_HOUR);
  });

  it("names the calendar the whole app counts in", () => {
    // Tuesday(2) … Saturday(6). The two numbers NOT in this list are the file.
    expect([...STUDIO_DOW]).toEqual([2, 3, 4, 5, 6]);
  });
});

describe("the studio week is Tuesday to Saturday", () => {
  it("runs Tuesday through Saturday and is shut Sunday and Monday", () => {
    expect(isStudioDay(TUE_11)).toBe(true);
    expect(isStudioDay(WED_12)).toBe(true);
    expect(isStudioDay(THU_6)).toBe(true);
    expect(isStudioDay(FRI_7)).toBe(true);
    expect(isStudioDay(SAT_8)).toBe(true);
    expect(isStudioDay(SUN_9)).toBe(false);
    expect(isStudioDay(MON_10)).toBe(false);
  });

  it("snaps a closed date forward to the next open one, and leaves an open one alone", () => {
    expect(snapForward(SUN_9)).toBe(TUE_11);
    expect(snapForward(MON_10)).toBe(TUE_11);
    expect(snapForward(SAT_8)).toBe(SAT_8);
  });

  it("counts a week as five studio days, never seven", () => {
    // Thursday to the following Thursday: Fri, Sat, Tue, Wed, Thu.
    expect(daysBetween(THU_6, "2026-08-13")).toBe(7);
    expect(studioDaysBetween(THU_6, "2026-08-13")).toBe(5);
  });
});

describe('"+1 studio day" skips Sunday AND Monday', () => {
  it("lands on Tuesday from Saturday — the dock chip's whole job", () => {
    expect(addStudioDays(SAT_8, 1)).toBe(TUE_11);
  });

  it("is an ordinary next day everywhere else in the week", () => {
    expect(addStudioDays(THU_6, 1)).toBe(FRI_7);
    expect(addStudioDays(FRI_7, 1)).toBe(SAT_8);
    expect(addStudioDays(TUE_11, 1)).toBe(WED_12);
  });

  it("never returns a Sunday or a Monday, however many times it is pressed", () => {
    let cursor = THU_6;
    for (let i = 0; i < 40; i += 1) {
      cursor = addStudioDays(cursor, 1);
      expect({ day: cursor, open: isStudioDay(cursor) }).toEqual({ day: cursor, open: true });
    }
    // Forty presses is eight studio weeks: 40 studio days is 56 calendar days.
    expect(daysBetween(THU_6, cursor)).toBe(56);
  });

  it("normalises rather than moving when asked for none", () => {
    expect(addStudioDays(SUN_9, 0)).toBe(TUE_11);
    expect(addStudioDays(THU_6, 0)).toBe(THU_6);
  });

  it("refuses to run the bench backwards", () => {
    expect(() => addStudioDays(THU_6, -1)).toThrow(/backwards/);
  });
});

describe("a piece finished on Saturday posts on Tuesday", () => {
  it("posts on the next studio day, not the next day", () => {
    expect(postDayAfter(SAT_8)).toBe(TUE_11);
    expect(nextStudioDay(SAT_8)).toBe(TUE_11);
  });

  it("posts the ordinary next morning from any other bench day", () => {
    expect(postDayAfter(THU_6)).toBe(FRI_7);
    expect(postDayAfter(FRI_7)).toBe(SAT_8);
    expect(postDayAfter(TUE_11)).toBe(WED_12);
  });

  it("holds a fortnight later too, so this is the week and not a coincidence", () => {
    expect(dayOfWeek(SAT_15)).toBe(6);
    expect(postDayAfter(SAT_15)).toBe(TUE_18);
  });
});

describe("the 17:00 cut-off", () => {
  it("starts an order on the same studio day before five o'clock", () => {
    expect(startDay({ iso: THU_6, hour: 16, minute: 40 })).toBe(THU_6);
    expect(startDay({ iso: THU_6, hour: 9, minute: 5 })).toBe(THU_6);
  });

  it("starts it the next studio day from five o'clock on", () => {
    expect(startDay({ iso: THU_6, hour: 17, minute: 0 })).toBe(FRI_7);
    expect(startDay({ iso: SAT_8, hour: 18, minute: 30 })).toBe(TUE_11);
  });

  it("ignores the hour on a day the bench is shut", () => {
    // The cut-off is a question about a day that is already open, so a Sunday
    // order starts Tuesday at nine in the morning and at nine at night alike.
    expect(startDay({ iso: SUN_9, hour: 9, minute: 0 })).toBe(TUE_11);
    expect(startDay({ iso: SUN_9, hour: 21, minute: 0 })).toBe(TUE_11);
    expect(startDay({ iso: MON_10, hour: 12, minute: 0 })).toBe(TUE_11);
  });
});

describe("a coaster ordered at the pinned moment is posted by Tuesday 11 August", () => {
  /*
   * ASKED, NOT RETYPED. This was `const COASTER_LEAD = 3` — the catalogue's
   * number copied into the suite that proves the promise built on it, which
   * means the acceptance criterion's own date ("posted by Tuesday 11 August")
   * would have gone on passing after somebody changed how long a coaster takes.
   * Two threes agreeing with each other is not the same as the app agreeing
   * with itself, and the whole point of this block is the second one.
   */
  const COASTER_LEAD = leadDaysFor("walnut-coasters");

  it("takes its lead time from the catalogue rather than from this file", () => {
    expect(COASTER_LEAD).toBe(3);
  });

  it("finishes on Saturday and posts on Tuesday", () => {
    // Three studio days beginning Thursday: Thu 6, Fri 7, Sat 8.
    expect(finishDay(NOW, COASTER_LEAD)).toBe(SAT_8);
    expect(postDay(NOW, COASTER_LEAD)).toBe(TUE_11);
    expect(dayOfWeek(postDay(NOW, COASTER_LEAD))).toBe(2); // Tuesday
  });

  it("counts the start day as the first of the lead days", () => {
    // One studio day means today, not tomorrow — the off-by-one that would
    // move every date in the app by a day if it were wrong.
    expect(finishDay(NOW, 1)).toBe(THU_6);
    expect(finishDay(NOW, 2)).toBe(FRI_7);
    expect(finishDay(NOW, 3)).toBe(SAT_8);
  });

  it("slips a day when the same order is placed twenty minutes later", () => {
    const afterFive = { iso: THU_6, hour: 17, minute: 5 };
    expect(finishDay(afterFive, COASTER_LEAD)).toBe(TUE_11);
    expect(postDay(afterFive, COASTER_LEAD)).toBe(WED_12);
  });

  it("gives the other three lead times their own dates", () => {
    // Printed pieces 4, slate signs 5, glazed ceramics 10 — asserted here as
    // plain calendar arithmetic, and again in `orders.test.ts` against the
    // table the catalogue actually uses.
    expect(postDay(NOW, 4)).toBe(WED_12);
    expect(postDay(NOW, 5)).toBe("2026-08-13");
    expect(postDay(NOW, 10)).toBe("2026-08-20");
  });

  it("refuses a lead time of nothing", () => {
    expect(() => finishDay(NOW, 0)).toThrow(/at least one studio day/);
  });
});

describe("studioDaysBetween", () => {
  it("is zero for the same day and one for the next open day", () => {
    expect(studioDaysBetween(THU_6, THU_6)).toBe(0);
    expect(studioDaysBetween(THU_6, FRI_7)).toBe(1);
    expect(studioDaysBetween(SAT_8, TUE_11)).toBe(1);
  });

  it("counts nothing across the closed weekend", () => {
    expect(studioDaysBetween(SAT_8, SUN_9)).toBe(0);
    expect(studioDaysBetween(SAT_8, MON_10)).toBe(0);
  });

  it("goes negative for a date already behind you — that is the late chip", () => {
    expect(studioDaysBetween(TUE_11, SAT_8)).toBe(-1);
    expect(studioDaysBetween(TUE_11, THU_6)).toBe(-3);
  });

  it("round-trips against addStudioDays", () => {
    for (let n = 0; n < 12; n += 1) {
      expect(studioDaysBetween(THU_6, addStudioDays(THU_6, n))).toBe(n);
    }
  });
});

describe("plain calendar arithmetic, kept separate on purpose", () => {
  it("crosses a month end without a timezone getting involved", () => {
    expect(addDays("2026-08-31", 1)).toBe("2026-09-01");
    expect(addDays("2026-12-31", 1)).toBe("2027-01-01");
    expect(addDays("2028-02-28", 1)).toBe("2028-02-29"); // a leap year
  });

  it("rejects something that is not a date rather than inventing one", () => {
    expect(() => isStudioDay("the sixth")).toThrow(/Not an ISO date/);
  });
});
