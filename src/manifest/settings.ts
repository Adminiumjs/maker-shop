/**
 * The studio's own settings (the manifest's `settings`, on the app's settings
 * page): the days it works and the time of day an order still starts that
 * day. Adminium reads both when it dates an order's post-by (`post_by` on
 * each line, `addWorkingDays`); the shop's closures are a table of their own.
 *
 * A week is a comma list of the days, Monday first: Birch Row works Tuesday
 * to Saturday. The cut-off is a 24-hour time: an order placed before five
 * o'clock on a studio day starts that day, one placed after starts the next.
 */
export const STUDIO_DAYS = "studio_days";
export const CUTOFF = "cutoff";

export const SETTINGS = [
  {
    key: STUDIO_DAYS,
    type: "string",
    default: "tue,wed,thu,fri,sat",
    label: { key: "mft.maker.setting.studioDays", fallback: "Studio days" },
    help: { key: "mft.maker.setting.studioDays.help", fallback: "The days the studio works, as a comma list: mon,tue,wed,thu,fri,sat,sun." },
  },
  {
    key: CUTOFF,
    type: "string",
    default: "17:00",
    label: { key: "mft.maker.setting.cutoff", fallback: "Orders start the same day before" },
    help: { key: "mft.maker.setting.cutoff.help", fallback: "A time on a 24-hour clock. An order placed after it starts on the next studio day." },
  },
];
