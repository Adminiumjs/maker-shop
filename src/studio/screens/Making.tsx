/**
 * The workshop's own screens (comp "Machines", "Materials and machines",
 * "Stock count"): what is booked on each machine today, what is on the shelf
 * and what is running, and the shelf counted.
 *
 * Every figure is a stored column or a count of rows: a booking's start and
 * end, a material's on hand, committed and available (Adminium's totals of
 * its stock movements), the book's figure a count was made against. A count
 * is saved as one `count` movement a material; Adminium keeps what the book
 * said beside it and moves the stock by the difference.
 */
import { Box, CalendarPlus, Check, ClipboardCheck, ClipboardList, Cog, Flame, Zap, type LucideIcon } from "lucide-react";

import { useData, useEnv, useRun } from "../env.tsx";
import { kpis } from "../facts.ts";
import { useFmt } from "../format.ts";
import { bookedMinutes, bookingsOf, DAY_FROM, DAY_TO, isLow, lastCount, machineNow, minuteOfDay, piecesAhead, placeOnDay, refsOfBooking, shelf, spanOf, STEPS } from "../making.ts";
import { saveCount } from "../making-actions.ts";
import { go, toast, useStudio } from "../store.ts";
import { num, text, type Row } from "../wire.ts";
import { closureFor, comingHolidays, HOLIDAY_ADD_ON, holidayPlace } from "../holidays.ts";
import { mayKeepClosedDays } from "../roles.ts";
import { useI18n, useT, type MessageKey } from "../../i18n/index.tsx";

const MACHINE_ICONS: Readonly<Record<string, LucideIcon>> = { zap: Zap, box: Box, flame: Flame };

function MachineIcon({ name, size }: { name: unknown; size: number }) {
  const Found = MACHINE_ICONS[text(name) ?? ""] ?? Cog;
  return <Found size={size} aria-hidden="true" focusable="false" />;
}

const active = (data: { machines: Row[] }): Row[] => data.machines.filter((m) => m["active"] !== false);

// ── machine time ────────────────────────────────────────────────────────────

export function MachinesScreen() {
  const t = useT();
  const fmt = useFmt();
  const data = useData();
  const { door } = useEnv();
  const zone = door.facts().zone;
  const now = door.now();
  const today = fmt.today(now);
  const total = kpis(data, today, zone).bookedMinutes;
  const hm = (minutes: number) => t("studio.kpi.hm", { hours: Math.floor(minutes / 60), minutes: minutes % 60 });
  const nowMinute = minuteOfDay(now, zone);
  const nowStep = nowMinute >= DAY_FROM * 60 && nowMinute <= DAY_TO * 60 ? Math.min(STEPS - 1, Math.round((nowMinute - DAY_FROM * 60) / 5)) : null;
  const hours = Array.from({ length: DAY_TO - DAY_FROM + 1 }, (_, i) => DAY_FROM + i);

  return (
    <section className="st-screen" aria-labelledby="mk-machines-title">
      <div className="st-head st-head--tight">
        <h1 className="st-h1" id="mk-machines-title">
          {t("bench.machines.title")}
        </h1>
        <span className="st-sub">{t("studio.machines.meta", { day: fmt.day(today), time: hm(total) })}</span>
      </div>
      <p className="st-lede">{t("bench.machines.sub")}</p>
      <div className="mk-machines">
        {active(data).map((machine) => {
          const day = bookingsOf(data, machine).filter((b) => {
            const span = spanOf(b);
            return span !== null && fmt.today(span.from) <= today && fmt.today(span.to - 1) >= today;
          });
          const runs = day.filter((b) => fmt.today(spanOf(b)!.from) === today);
          const booked = bookedMinutes(runs);
          const name = text(machine["name"]) ?? "";
          return (
            <article key={String(machine.id)} className="mk-machine" aria-label={name}>
              <div className="mk-machine-head">
                <span className="mk-machine-icon" aria-hidden="true">
                  <MachineIcon name={machine["icon"]} size={16} />
                </span>
                <h2 className="mk-machine-name">{name}</h2>
                <span className="mk-machine-load">{booked > 0 ? t("studio.machines.load", { time: hm(booked) }) : t("studio.machines.nothing")}</span>
                <span className={`mk-status${day.length > 0 ? " mk-status--on" : ""}`}>{day.length > 0 ? t("studio.machines.booked") : t("studio.machines.nothing")}</span>
              </div>
              <div className="mk-day">
                <div className="mk-hours" aria-hidden="true">
                  {hours.slice(1).map((h) => (
                    <span key={h} className="mk-hour" />
                  ))}
                </div>
                {day.length === 0 ? (
                  <span className="mk-day-empty">{t("studio.machines.empty")}</span>
                ) : (
                  <ul className="mk-blocks" aria-label={t("studio.machines.day", { machine: name, from: fmt.hour(DAY_FROM), to: fmt.hour(DAY_TO) })}>
                    {day.map((b) => {
                      const span = spanOf(b)!;
                      const placed = placeOnDay(span.from, span.to, zone, fmt.today(span.from) === today, fmt.today(span.to) === today);
                      if (placed === null) return null;
                      const time = `${fmt.time(span.from)}–${fmt.time(span.to)}`;
                      const refs = refsOfBooking(data, b).join(" · ");
                      const label = text(b["label"]) ?? "";
                      return (
                        <li key={String(b.id)} className={`mk-block mk-at-${String(placed.at)} mk-span-${String(placed.span)}${b["kind"] === "upkeep" ? " mk-block--upkeep" : ""}`} title={time}>
                          <span className="mk-block-label">{label}</span>
                          <span className="mk-block-time">
                            {time} {refs}
                          </span>
                        </li>
                      );
                    })}
                    {nowStep !== null && <li className={`mk-now mk-at-${String(nowStep)}`} aria-hidden="true" />}
                  </ul>
                )}
              </div>
              <div className="mk-ticks" aria-hidden="true">
                {hours.map((h) => (
                  <span key={h} className="mk-tick">
                    {fmt.hour(h)}
                  </span>
                ))}
              </div>
            </article>
          );
        })}
      </div>
      <PublicHolidays />
    </section>
  );
}

/**
 * The coming public holidays from Holiday calendars, each one a tap from
 * being a closure (the studio's calendar is these screens' days: a closure
 * moves every post-by past it). Only for someone who may add a closure, with
 * the add-on attached and its days readable; nothing at all otherwise.
 */
function PublicHolidays() {
  const t = useT();
  const fmt = useFmt();
  const { locale } = useI18n();
  const data = useData();
  const { door } = useEnv();
  const { busy, run } = useRun();
  const facts = door.facts();
  if (!facts.addOns.includes(HOLIDAY_ADD_ON) || !door.who().can("closures", "create") || data.holidays === null) return null;
  const coming = comingHolidays(data, fmt.today(door.now()));
  const country = holidayPlace(facts.addOnSettings[HOLIDAY_ADD_ON], facts.currency).country;
  const countryName = new Intl.DisplayNames([locale], { type: "region" }).of(country) ?? country;
  return (
    <section className="st-panel mk-holidays" aria-labelledby="mk-holidays-title">
      <h2 className="st-section-title" id="mk-holidays-title">
        {t("studio.holidays.title")}
      </h2>
      <p className="mk-holidays-sub">{t("studio.holidays.sub")}</p>
      {mayKeepClosedDays(door.who()) && (
        // Holiday calendars' own picker, drawn by Adminium: which country's days, and the studio's own closed days.
        <a className="st-linkbtn mk-holidays-settings" href="/add-on-settings/holiday-calendars" target="_top">
          {t("studio.holidays.settings")}
        </a>
      )}
      {coming.length === 0 ? (
        <p className="mk-holidays-none">{t("studio.holidays.none", { country: countryName })}</p>
      ) : (
        <ul className="mk-holiday-list">
          {coming.map((holiday) => {
            const name = text(holiday["name"]) ?? "";
            const day = fmt.day(text(holiday["day"]));
            const added = closureFor(data, holiday) !== undefined;
            return (
              <li key={String(holiday.id)} className="mk-holiday">
                <span className="st-mono mk-holiday-day">{day}</span>
                <span className="mk-holiday-name">
                  <bdi>{name}</bdi>
                </span>
                {added ? (
                  <span className="mk-holiday-added">
                    <Check size={13} aria-hidden="true" />
                    {t("studio.holidays.added")}
                  </span>
                ) : (
                  <button
                    type="button"
                    className="st-btn st-btn--small"
                    disabled={busy}
                    aria-label={t("studio.holidays.addNamed", { name, day })}
                    onClick={() =>
                      void run(async (d) => {
                        await d.addHolidayClosure(holiday);
                        return t("studio.holidays.addedToast", { name, day });
                      })
                    }
                  >
                    <CalendarPlus size={14} aria-hidden="true" />
                    {t("studio.holidays.add")}
                  </button>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}

// ── materials and machines ──────────────────────────────────────────────────

const LOW: Record<string, MessageKey> = { sheets: "studio.materials.low.sheets", blanks: "studio.materials.low.blanks", g: "studio.materials.low.g", tubs: "studio.materials.low.tubs" };
const STATUS: Record<string, MessageKey> = { laser: "studio.materials.status.laser", printer: "studio.materials.status.printer", kiln: "studio.materials.status.kiln" };

export function MaterialsScreen() {
  const t = useT();
  const fmt = useFmt();
  const data = useData();
  const { door } = useEnv();
  const now = door.now();
  const today = fmt.today(now);
  const counted = lastCount(data, (iso) => fmt.today(Date.parse(iso)));
  const mayCount = door.who().can("stock_movements", "create");
  const amount = (value: unknown) => fmt.number(num(value) ?? 0, 2);

  return (
    <section className="st-screen" aria-labelledby="mk-materials-title">
      <div className="mk-head">
        <div className="mk-head-text">
          <h1 className="st-h1" id="mk-materials-title">
            {t("bench.materials.title")}
          </h1>
          <p className="st-lede">{t("studio.materials.sub")}</p>
          {counted !== null && (
            <span className="mk-counted">
              <ClipboardCheck size={14} aria-hidden="true" />
              <span className="st-mono">{t("studio.materials.counted", { day: fmt.moment(counted.at), diff: counted.diff }, counted.n)}</span>
            </span>
          )}
        </div>
        <div className="mk-head-actions">
          {mayCount && (
            <button type="button" className="mk-outline" onClick={() => go("stockcount")}>
              <ClipboardList size={15} aria-hidden="true" />
              {t("bench.materials.count")}
            </button>
          )}
          <button type="button" className="mk-outline" onClick={() => go("machines")}>
            <Zap size={15} aria-hidden="true" />
            {t("bench.materials.machines")}
          </button>
        </div>
      </div>
      <div className="mk-matgrid">
        <div className="mk-stock" role="table" aria-labelledby="mk-materials-title">
          <div className="mk-stock-row mk-stock-row--head" role="row">
            <span className="mk-th" role="columnheader">
              {t("bench.materials.col.material")}
            </span>
            <span className="mk-th mk-num" role="columnheader">
              {t("bench.materials.col.onHand")}
            </span>
            <span className="mk-th mk-num" role="columnheader">
              {t("bench.materials.col.committed")}
            </span>
            <span className="mk-th mk-num" role="columnheader">
              {t("studio.materials.left")}
            </span>
          </div>
          {shelf(data).map((m) => {
            const low = isLow(m);
            const unit = text(m["unit"]) ?? "sheets";
            return (
              <div key={String(m.id)} className={`mk-stock-row${low ? " mk-stock-row--low" : ""}`} role="row">
                <span className="mk-stock-name" role="cell">
                  <span className="mk-stock-title">{text(m["name"])}</span>
                  <span className="mk-stock-note">{text(m["size_note"])}</span>
                  {low && <span className="mk-stock-low">{t(LOW[unit] ?? "studio.materials.low.sheets", {}, num(m["reorder_at"]) ?? 0)}</span>}
                </span>
                <span className="mk-num" role="cell">
                  {amount(m["on_hand"])}
                </span>
                <span className="mk-num mk-num--muted" role="cell">
                  {amount(m["committed"])}
                </span>
                <span className={`mk-num mk-num--strong${low ? " mk-num--warn" : ""}`} role="cell">
                  {amount(m["available"])}
                </span>
              </div>
            );
          })}
        </div>
        <ul className="mk-mrows" aria-label={t("bench.materials.machines")}>
          {active(data).map((machine) => {
            const { running, last, ahead } = machineNow(bookingsOf(data, machine), now);
            const kind = text(machine["kind"]) ?? "";
            const idle = running === undefined;
            const pieces = piecesAhead(data, ahead);
            const end = last === undefined ? null : spanOf(last)!.to;
            const finish = end === null ? "—" : fmt.today(end) === today ? t("studio.materials.untilToday", { time: fmt.time(end) }) : t("studio.materials.until", { time: fmt.time(end), day: fmt.weekday(fmt.today(end)) });
            const queued =
              ahead.length === 0
                ? t("studio.materials.nothingQueued")
                : [t("studio.materials.runs", {}, ahead.length), ...(pieces > 0 ? [t("studio.materials.pieces", {}, pieces)] : [])].join(" · ");
            return (
              <li key={String(machine.id)} className="mk-mrow">
                <div className="mk-mrow-head">
                  <span className={`mk-mrow-icon${idle ? " mk-mrow-icon--idle" : ""}`} aria-hidden="true">
                    <MachineIcon name={machine["icon"]} size={17} />
                  </span>
                  <span className="mk-mrow-text">
                    <span className="mk-mrow-name">{text(machine["name"])}</span>
                    <span className="mk-mrow-sub">{text(machine["detail"])}</span>
                  </span>
                  <span className={`mk-status${idle ? "" : " mk-status--on"}`}>{idle ? t("studio.materials.status.idle") : t(STATUS[kind] ?? "studio.materials.status.laser")}</span>
                </div>
                <div className="mk-mrow-foot">
                  <span className="mk-mrow-queued">{queued}</span>
                  <span className="mk-mrow-finish">{finish}</span>
                </div>
              </li>
            );
          })}
        </ul>
      </div>
    </section>
  );
}

// ── the count ───────────────────────────────────────────────────────────────

export function StockCountScreen() {
  const t = useT();
  const fmt = useFmt();
  const data = useData();
  const { run, busy } = useRun();
  const draft = useStudio((s) => s.countDraft);
  const rows = shelf(data).map((m) => {
    const book = num(m["on_hand"]) ?? 0;
    const typed = draft[String(m.id)] ?? "";
    const n = typed === "" ? null : Number(typed);
    const diff = n === null || Number.isNaN(n) ? null : Math.round((n - book) * 100) / 100;
    return { m, book, typed, n, diff };
  });
  const changed = rows.filter((r) => r.diff !== null && r.diff !== 0).length;
  const set = (id: string, value: string) => useStudio.setState((s) => ({ countDraft: { ...s.countDraft, [id]: value.replace(/[^0-9.]/g, "") } }));

  const save = () => {
    const counts = rows.filter((r) => r.n !== null && !Number.isNaN(r.n)).map((r) => ({ materialId: r.m.id, counted: r.n! }));
    if (counts.length === 0) {
      toast(t("studio.count.none"), "warn");
      return;
    }
    void run(async (door) => {
      const saved = await saveCount(door, counts);
      useStudio.setState({ countDraft: {} });
      go("materials");
      return t("studio.count.saved", {}, saved);
    });
  };

  return (
    <section className="st-screen mk-narrow" aria-labelledby="mk-count-title">
      <h1 className="st-h1 mk-h1-gap" id="mk-count-title">
        {t("bench.count.title")}
      </h1>
      <p className="st-lede">{t("studio.count.body")}</p>
      <ul className="mk-count" aria-labelledby="mk-count-title">
        {rows.map(({ m, book, typed, diff }) => {
          const name = text(m["name"]) ?? "";
          return (
            <li key={String(m.id)} className="mk-count-row">
              <span className="mk-count-name">
                <span className="mk-stock-title">{name}</span>
                <span className="mk-stock-note">{text(m["size_note"])}</span>
              </span>
              <span className="mk-count-book">
                <span className="mk-count-book-n">{fmt.number(book, 2)}</span>
                <span className="mk-count-book-l">{t("studio.count.book")}</span>
              </span>
              <input
                className="mk-count-input"
                inputMode="numeric"
                value={typed}
                placeholder="—"
                aria-label={t("studio.count.input", { name })}
                data-differs={diff !== null && diff !== 0 ? "true" : "false"}
                onChange={(e) => set(String(m.id), e.target.value)}
              />
              <span className={`mk-count-diff${diff === null || diff === 0 ? "" : diff < 0 ? " mk-count-diff--down" : " mk-count-diff--up"}`}>
                {diff === null || diff === 0 ? "" : diff > 0 ? `+${fmt.number(diff, 2)}` : fmt.number(diff, 2)}
              </span>
              <button type="button" className="mk-same" aria-label={t("studio.count.sameLabel", { name })} onClick={() => set(String(m.id), String(book))}>
                {t("studio.count.same")}
              </button>
            </li>
          );
        })}
      </ul>
      <div className="mk-count-foot">
        <span className="mk-count-summary" role="status">
          {changed === 0 ? t("bench.count.nothing") : t("bench.count.summary", {}, changed)}
        </span>
        <button
          type="button"
          className="st-btn"
          onClick={() => {
            useStudio.setState({ countDraft: {} });
            go("materials");
          }}
        >
          {t("bench.count.cancel")}
        </button>
        <button type="button" className="st-btn st-btn--accent" disabled={busy} onClick={save}>
          {t("bench.count.save")}
        </button>
      </div>
    </section>
  );
}
