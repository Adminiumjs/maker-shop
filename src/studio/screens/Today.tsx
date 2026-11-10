/**
 * TODAY: the bench at a glance (comp "Today"). Four counts read off the rows,
 * then the board: a line in each of four columns by its stage, its post-by
 * chip from the date Adminium gave it. A line is moved from its card's menu,
 * or dragged to another column; each move is a write of the line's stage,
 * and its order follows it. A line with words or a design wears a padlock
 * until its proof is approved, and is not moved past "make" until then.
 *
 * Under the counts, the comp's "Batch these" strip: queued pieces of
 * different orders that share a sheet and a machine (`Batches.tsx`).
 */
import { useState, type DragEvent } from "react";
import { Clock, Ellipsis, Hammer, Lock, TriangleAlert, Zap } from "lucide-react";

import { moveLine } from "../actions.ts";
import { useData, useEnv, useRun } from "../env.tsx";
import { BENCH, bench, closuresOf, kpis, lockOf, pathOf, productOf, lineMaterial, optionOf, type BenchStage } from "../facts.ts";
import { useFmt } from "../format.ts";
import { go } from "../store.ts";
import { isStudioDay } from "../time.ts";
import { LineTile, ShipChip, Typed } from "../ui.tsx";
import { dayOf, num, text, type Row } from "../wire.ts";
import { useT, type MessageKey } from "../../i18n/index.tsx";
import { wordsOfDesign } from "../designs.ts";
import { BatchStrip } from "./Batches.tsx";

const COLUMN_LABEL: Record<BenchStage, MessageKey> = {
  make: "bench.col.to-make",
  making: "bench.col.making",
  finishing: "bench.col.finishing",
  ready: "bench.col.ready-to-post",
};

export function TodayScreen() {
  const t = useT();
  const fmt = useFmt();
  const data = useData();
  const { door } = useEnv();
  const facts = door.facts();
  const today = fmt.today(door.now());
  const closures = closuresOf(data);
  const open = isStudioDay(today, facts.studioDays, closures);
  const counts = kpis(data, today, facts.zone);
  const columns = bench(data);
  const mayMove = door.who().can("order_lines", "update");

  return (
    <section className="st-screen" aria-labelledby="st-today-title">
      <div className="st-head">
        <h1 className="st-h1" id="st-today-title">
          {t("bench.today.title")}
        </h1>
        <span className="st-sub">{open ? t("bench.today.sub", { day: fmt.dayLong(today) }) : t("studio.today.closed", { day: fmt.dayLong(today) })}</span>
      </div>

      <ul className="st-kpis" role="list">
        <li className="st-kpi">
          <Hammer size={16} aria-hidden="true" />
          <span className="st-kpi-n">{fmt.number(counts.due)}</span>
          <span className="st-kpi-label">{t("bench.kpi.due")}</span>
        </li>
        <li className="st-kpi st-kpi--warn">
          <Clock size={16} aria-hidden="true" />
          <span className="st-kpi-n">{fmt.number(counts.waiting)}</span>
          <span className="st-kpi-label">{t("studio.kpi.waiting", {}, counts.waiting)}</span>
        </li>
        <li className="st-kpi st-kpi--danger">
          <TriangleAlert size={16} aria-hidden="true" />
          <span className="st-kpi-n">{fmt.number(counts.late)}</span>
          <span className="st-kpi-label">{t("bench.kpi.late", {}, counts.late)}</span>
        </li>
        <li className="st-kpi">
          <Zap size={16} aria-hidden="true" />
          <span className="st-kpi-n">{t("studio.kpi.hm", { hours: Math.floor(counts.bookedMinutes / 60), minutes: counts.bookedMinutes % 60 })}</span>
          <span className="st-kpi-label">{t("bench.kpi.machine")}</span>
        </li>
      </ul>

      <BatchStrip />

      <div className="st-board" role="group" aria-label={t("studio.board.label")}>
        {BENCH.map((stage) => (
          <Column key={stage} stage={stage} lines={columns[stage]} today={today} studioDays={facts.studioDays} closures={closures} mayMove={mayMove} />
        ))}
      </div>
    </section>
  );
}

function Column({ stage, lines, today, studioDays, closures, mayMove }: { stage: BenchStage; lines: Row[]; today: string; studioDays: string[]; closures: { from: string; to: string }[]; mayMove: boolean }) {
  const t = useT();
  const data = useData();
  const { run } = useRun();
  const [over, setOver] = useState(false);
  const labelId = `st-col-${stage}`;

  const drop = (event: DragEvent) => {
    event.preventDefault();
    setOver(false);
    const id = event.dataTransfer.getData("text/plain");
    const line = data.lines.find((l) => String(l.id) === id);
    if (line === undefined || line["stage"] === stage) return;
    void run(async (door, fresh) => {
      await moveLine(door, fresh, line, stage);
    });
  };

  return (
    <section
      className="st-col"
      aria-labelledby={labelId}
      data-over={over ? "true" : "false"}
      onDragOver={(e) => {
        if (!mayMove) return;
        e.preventDefault();
        setOver(true);
      }}
      onDragLeave={() => setOver(false)}
      onDrop={drop}
    >
      <h2 className="st-col-head" id={labelId}>
        <span className="st-col-label">{t(COLUMN_LABEL[stage])}</span>
        <span className="st-col-count">{lines.length}</span>
      </h2>
      {lines.length === 0 ? (
        <div className="st-col-empty">{t(stage === "make" ? "bench.col.emptyMake" : stage === "ready" ? "bench.col.emptyReady" : "bench.col.emptyOther")}</div>
      ) : (
        <ul className="st-cards" role="list">
          {lines.map((line) => (
            <Card key={String(line.id)} line={line} today={today} studioDays={studioDays} closures={closures} mayMove={mayMove} />
          ))}
        </ul>
      )}
    </section>
  );
}

function Card({ line, today, studioDays, closures, mayMove }: { line: Row; today: string; studioDays: string[]; closures: { from: string; to: string }[]; mayMove: boolean }) {
  const t = useT();
  const data = useData();
  const { run } = useRun();
  const [menuOpen, setMenuOpen] = useState(false);
  const [dragging, setDragging] = useState(false);
  const order = data.orders.find((o) => String(o.id) === String(line["order_id"]));
  const product = productOf(data, line);
  const lock = lockOf(line);
  const ref = text(order?.["number"]) ?? "";
  const lockLabel = lock === null ? "" : t(lock === "waiting" ? "studio.lock.waiting" : "studio.lock.unsent");
  const stage = String(line["stage"]) as BenchStage;
  const targets = BENCH.filter((s) => s !== stage && pathOf(stage, s) !== null);
  const openOrder = () => order !== undefined && go("order", { orderId: order.id });

  return (
    <li
      className="st-card"
      draggable={mayMove}
      data-dragging={dragging ? "true" : "false"}
      onDragStart={(e) => {
        setDragging(true);
        e.dataTransfer.effectAllowed = "move";
        e.dataTransfer.setData("text/plain", String(line.id));
      }}
      onDragEnd={() => setDragging(false)}
    >
      <div className="st-card-top">
        <div className="st-card-ids">
          <span className="st-card-ref">
            {ref}
            {lock !== null && (
              <span className="st-lock" role="img" aria-label={lockLabel} title={lockLabel}>
                <Lock size={12} aria-hidden="true" />
              </span>
            )}
          </span>
          <span className="st-card-name">{text(line["product_name"]) ?? text(product?.["name"])}</span>
        </div>
        <ShipChip postBy={dayOf(line["post_by"])} today={today} studioDays={studioDays} closures={closures} />
      </div>
      <div className="st-card-mat">
        <LineTile data={data} line={line} product={product} size={20} iconSize={11} />
        <span className="st-mono">{t("bench.card.qty", { count: num(line["qty"]) ?? 0 })}</span>
        <span>{text(lineMaterial(data, line)?.["name"])}</span>
      </div>
      <span className="st-card-summary">
        <Summary line={line} />
      </span>
      <div className="st-card-foot">
        <button type="button" className="st-btn--link st-btn" onClick={openOrder}>
          {t("studio.card.open")}
        </button>
        <button type="button" className="st-card-more" aria-label={t("studio.card.more", { ref })} aria-haspopup="menu" aria-expanded={menuOpen} onClick={() => setMenuOpen((v) => !v)} onKeyDown={(e) => e.key === "Escape" && setMenuOpen(false)}>
          <Ellipsis size={15} aria-hidden="true" />
        </button>
        {menuOpen && (
          <ul className="st-menu st-pop" role="menu" onKeyDown={(e) => e.key === "Escape" && setMenuOpen(false)}>
            {mayMove &&
              targets.map((target) => {
                const held = lock !== null && target !== "make";
                return (
                  <li key={target} role="none">
                    <button
                      type="button"
                      role="menuitem"
                      className="st-menu-item"
                      data-held={held ? "true" : "false"}
                      onClick={() => {
                        setMenuOpen(false);
                        void run(async (door, fresh) => {
                          await moveLine(door, fresh, line, target);
                        });
                      }}
                    >
                      {t("bench.card.moveTo", { column: t(COLUMN_LABEL[target]).toLocaleLowerCase() })}
                    </button>
                  </li>
                );
              })}
            <li role="none">
              <button type="button" role="menuitem" className="st-menu-item st-menu-item--open" onClick={openOrder}>
                {t("bench.card.open")}
              </button>
            </li>
          </ul>
        )}
      </div>
    </li>
  );
}

/** What a card says of the piece: the customer's words and its finish, the design's words, or its size and finish. */
export function Summary({ line }: { line: Row }) {
  const t = useT();
  const data = useData();
  const finish = text(optionOf(data, line["finish_id"])?.["name"]);
  const size = text(optionOf(data, line["size_id"])?.["name"]);
  const words = text(line["lettering"]);
  if (line["design_id"] !== null && line["design_id"] !== undefined) {
    const design = wordsOfDesign(data, line);
    return (
      <>
        {t("studio.card.design")}
        {design.length > 0 && (
          <>
            {" · "}
            <Typed>{design.join(" / ")}</Typed>
          </>
        )}
      </>
    );
  }
  if (words !== null)
    return (
      <>
        <Typed>{`“${words}”`}</Typed>
        {finish !== null && ` · ${finish.toLocaleLowerCase()}`}
      </>
    );
  return <>{[size, finish?.toLocaleLowerCase() ?? t("studio.card.plain")].filter(Boolean).join(" · ")}</>;
}
