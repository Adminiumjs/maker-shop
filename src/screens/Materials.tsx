/**
 * The shelf and the machines, and the Saturday-morning job of counting one.
 *
 * THE ONLY INVENTORY THIS APP HAS IS RAW MATERIAL (24 D5b): sheet stock, slate
 * blanks, filament and glaze. There is no finished-goods column here and there
 * is nowhere for one to go — a piece that exists is on its way to somebody.
 *
 * The three figures are on hand, committed to the queue, and what is left to
 * use. The third is called `spare` in the types and "TO USE" on the screen for
 * a reason that is written down in `orders.ts`: the word a person would
 * naturally use is one the release grep reads as a banned substring, and a
 * column header is exactly the kind of word that ships.
 */

import { ArrowLeft, Check, Layers, TriangleAlert, Zap } from "lucide-react";

import { Mono, Tag } from "../components/Primitives.tsx";
import { useT } from "../i18n/index.tsx";
import { MACHINE_KEYS, batchGroups, queuedPieces } from "../lib/batch.ts";
import { day, num, parseCount, trim, twoDigits } from "../lib/format.ts";
import { stockLines, type StockLine } from "../lib/orders.ts";
import { bookedMinutes, countedMaterials, useStore, useToday } from "../state/store.ts";

function useShelf(): StockLine[] {
  const materials = useStore((s) => s.materials);
  const stockAdj = useStore((s) => s.stockAdj);
  const orders = useStore((s) => s.orders);
  return stockLines(
    countedMaterials(materials, stockAdj),
    orders.filter((o) => o.postedIso === undefined),
  );
}

/** The unit a row is counted in, already plural-aware. */
function useUnitLabel(): (row: { unit: StockLine["unit"] }, amount: number) => string {
  const t = useT();
  return (row, amount) =>
    row.unit === "grams" ? t("bench.unit.grams") : t(`bench.unit.${row.unit}` as never, undefined, amount);
}

export function MaterialsScreen() {
  const t = useT();
  const go = useStore((s) => s.go);
  const shelf = useShelf();
  const unit = useUnitLabel();

  return (
    <section className="br-screen">
      <div className="br-section-head">
        <div>
          <h1 className="br-h1">{t("bench.materials.title")}</h1>
          <p className="br-lede">{t("bench.materials.sub")}</p>
        </div>
        <div className="br-actionbar br-actionbar--tight">
          <button type="button" className="br-button br-button--ghost" onClick={() => go("machines")}>
            <Zap size={15} aria-hidden="true" />
            {t("bench.materials.machines")}
          </button>
          <button type="button" className="br-button" onClick={() => go("stockcount")}>
            <Layers size={15} aria-hidden="true" />
            {t("bench.materials.count")}
          </button>
        </div>
      </div>

      <div className="br-table-wrap">
        <table className="br-table">
          <thead>
            <tr>
              <th>{t("bench.materials.col.material")}</th>
              <th className="br-num">{t("bench.materials.col.onHand")}</th>
              <th className="br-num">{t("bench.materials.col.committed")}</th>
              <th className="br-num">{t("bench.materials.col.spare")}</th>
            </tr>
          </thead>
          <tbody>
            {shelf.map((row) => (
              <tr key={row.key} data-low={row.belowReorder}>
                <td>
                  <div className="br-line-name">{t(`data.stock.${row.key}.name` as never)}</div>
                  <div className="br-muted">{t(`data.stock.${row.key}.note` as never)}</div>
                  {row.belowReorder && (
                    <div className="br-lowline">
                      <TriangleAlert size={13} aria-hidden="true" />
                      {t("bench.materials.reorder", {
                        amount: `${trim(row.reorderAt)} ${unit(row, row.reorderAt)}`,
                      })}
                    </div>
                  )}
                </td>
                <td className="br-num">
                  <Mono>{trim(row.onHand)}</Mono>
                </td>
                <td className="br-num">
                  <Mono>{trim(row.committed)}</Mono>
                </td>
                <td className="br-num">
                  <Mono className={row.belowReorder ? "br-warn-figure" : undefined}>
                    {trim(row.spare)} {unit(row, row.spare)}
                  </Mono>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

// ── the machines ─────────────────────────────────────────────────────────────

export function MachinesScreen() {
  const t = useT();
  const today = useToday();
  const now = useStore((s) => s.now);
  const booked = useStore((s) => s.booked);
  const orders = useStore((s) => s.orders);

  const queue = queuedPieces(orders.filter((o) => o.postedIso === undefined));
  const total = bookedMinutes(booked);

  return (
    <section className="br-screen">
      <div className="br-section-head">
        <div>
          <h1 className="br-h1">{t("bench.machines.title")}</h1>
          <p className="br-lede">
            {day(today)} · {t("bench.machines.sub")}
          </p>
        </div>
        <Mono className="br-runsummary">
          {t("bench.machines.booked", {
            hours: Math.floor(total / 60),
            minutes: total % 60,
          })}
        </Mono>
      </div>

      <div className="br-cards">
        {MACHINE_KEYS.map((machine) => {
          const minutes = booked[machine] ?? 0;
          const queued = queue.filter((p) => p.machine === machine).length;
          const groups = batchGroups(orders).filter((g) => g.machine === machine);
          return (
            <div key={machine} className="br-panel br-panel-pad br-machinecard">
              <div className="br-panel-head">
                <span className="br-machine-mark" data-idle={minutes === 0}>
                  <Zap size={17} aria-hidden="true" />
                </span>
                <div>
                  <div className="br-panel-title">
                    {t(`data.machine.${machine}.name` as never)}
                  </div>
                  <div className="br-muted">{t(`data.machine.${machine}.what` as never)}</div>
                </div>
                <Tag tone={minutes === 0 ? "neutral" : "pos"}>
                  {minutes === 0 ? t("bench.machines.idle") : t("bench.machines.running")}
                </Tag>
              </div>

              <div className="br-weights">
                <div className="br-weights-row">
                  <span>{t("bench.machines.queued", { count: queued }, queued)}</span>
                  <Mono>
                    {minutes === 0
                      ? t("bench.machines.nothing")
                      : t("bench.machines.booked", {
                          hours: Math.floor(minutes / 60),
                          minutes: minutes % 60,
                        })}
                  </Mono>
                </div>
                <div className="br-weights-row">
                  <span>{t("bench.batch.title")}</span>
                  <Mono>{groups.length}</Mono>
                </div>
                <div className="br-weights-row">
                  <span>{t("bench.machines.finish", { time: offAt(now.hour, now.minute, minutes) })}</span>
                  <Mono>{offAt(now.hour, now.minute, minutes)}</Mono>
                </div>
              </div>

              {minutes === 0 && <p className="br-panel-note">{t("bench.machines.emptyNote")}</p>}
            </div>
          );
        })}
      </div>
    </section>
  );
}

/**
 * When a machine comes off, counted forward from the PINNED clock.
 *
 * Plain arithmetic on the two numbers the seed carries — nothing here reads a
 * real clock, and a run that would finish after midnight simply wraps, which is
 * honest for a studio that does not work through the night either.
 */
function offAt(hour: number, minute: number, minutes: number): string {
  const total = (hour * 60 + minute + minutes) % (24 * 60);
  // The reader's own numerals, and the reader's own zero — see `twoDigits`.
  return `${twoDigits(Math.floor(total / 60))}:${twoDigits(total % 60)}`;
}

// ── counting the shelf ───────────────────────────────────────────────────────

export function StockCountScreen() {
  const t = useT();
  const shelf = useShelf();
  const unit = useUnitLabel();
  const countDraft = useStore((s) => s.countDraft);
  const setCount = useStore((s) => s.setCount);
  const saveCount = useStore((s) => s.saveCount);
  const cancelCount = useStore((s) => s.cancelCount);
  const go = useStore((s) => s.go);

  const changed = shelf.filter((row) => {
    const raw = countDraft[row.key];
    if (raw === undefined || raw === "") return false;
    const value = Number.parseInt(raw, 10);
    return !Number.isNaN(value) && value !== row.onHand;
  }).length;

  return (
    <section className="br-screen">
      <button type="button" className="br-backlink br-btn" onClick={() => go("materials")}>
        <ArrowLeft size={15} aria-hidden="true" />
        {t("bench.materials.title")}
      </button>

      <div className="br-section-head">
        <div>
          <h1 className="br-h1">{t("bench.count.title")}</h1>
          <p className="br-lede">{t("bench.count.body")}</p>
        </div>
      </div>

      <div className="br-table-wrap">
        <table className="br-table">
          <thead>
            <tr>
              <th>{t("bench.materials.col.material")}</th>
              <th className="br-num">{t("bench.count.book")}</th>
              <th className="br-num">{t("bench.count.counted")}</th>
              <th className="br-num" />
            </tr>
          </thead>
          <tbody>
            {shelf.map((row) => {
              const raw = countDraft[row.key] ?? "";
              // `Number.parseInt` reads Latin digits and nothing else, so an
              // Arabic-Indic count parsed to NaN and the difference column went
              // blank. One parser, the same one the store saves through.
              const value = raw === "" ? null : parseCount(raw);
              const diff = value === null || Number.isNaN(value) ? null : value - row.onHand;
              return (
                <tr key={row.key}>
                  <td>
                    <div className="br-line-name">{t(`data.stock.${row.key}.name` as never)}</div>
                    <div className="br-muted">{unit(row, 2)}</div>
                  </td>
                  <td className="br-num">
                    <Mono>{trim(row.onHand)}</Mono>
                  </td>
                  <td className="br-num">
                    <input
                      className="br-input br-input--mono br-fld br-countinput"
                      inputMode="numeric"
                      value={raw}
                      aria-label={t("bench.count.counted")}
                      data-changed={diff !== null && diff !== 0}
                      onChange={(e) => setCount(row.key, e.target.value)}
                    />
                  </td>
                  <td className="br-num">
                    {diff === null || diff === 0 ? (
                      <button
                        type="button"
                        className="br-linkbtn br-btn"
                        /*
                         * `String(row.onHand)` seeded the field with a LATIN
                         * digit run — on the screen, in a value `textContent`
                         * does not carry, so the numerals guard's DOM pass could
                         * not see it and the reader could. `num` writes it in
                         * their own digits, and `keepDigits` in the store keeps
                         * them when they edit it.
                         */
                        onClick={() => setCount(row.key, num(row.onHand))}
                      >
                        <Check size={13} aria-hidden="true" />
                        {t("bench.count.same")}
                      </button>
                    ) : (
                      <Mono className={diff < 0 ? "br-danger-figure" : "br-pos-figure"}>
                        {diff > 0 ? `+${trim(diff)}` : trim(diff)}
                      </Mono>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="br-actionbar">
        <button type="button" className="br-button" onClick={saveCount}>
          {t("bench.count.save")}
        </button>
        <button type="button" className="br-button br-button--ghost" onClick={cancelCount}>
          {t("bench.count.cancel")}
        </button>
        <span className="br-muted">
          {changed === 0
            ? t("bench.count.nothing")
            : t("bench.count.summary", { count: changed }, changed)}
        </span>
      </div>
    </section>
  );
}
