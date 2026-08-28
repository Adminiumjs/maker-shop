/**
 * The bench: Today, the batch sheet, and the cut list.
 *
 * TODAY is the board — four columns, cards that drag AND carry a "…" menu with
 * the same moves, because a maker with glue on one hand is not going to drag
 * anything. THE PROOF GATE is here in its refusing form: a locked card cannot
 * leave *To make*, and the refusal names the customer and says which of the two
 * things is missing.
 *
 * THE BATCH SHEET is what makes this a workshop rather than a task list, and it
 * is the screen 24 D5b names as the difference between this app and the print
 * works: pieces from DIFFERENT ORDERS laid out on ONE sheet, with the sheet-use
 * in mono, the overflow listed as the next sheet's work, and one button that
 * moves every included piece to *Making* at once.
 *
 * THE CUT LIST is what gets carried to the laser — the same pack, printed, with
 * the lettering quoted so the person at the machine can check the sheet against
 * the words somebody typed.
 */

import {
  ArrowLeft,
  Clock,
  Hammer,
  Lock,
  MoreHorizontal,
  Printer,
  Rows3,
  TriangleAlert,
  Zap,
} from "lucide-react";
import type { ReactNode } from "react";

import { Icon } from "../components/Icon.tsx";
import { Code, EmptyState, Mono, Tag, Typed } from "../components/Primitives.tsx";
import { useT } from "../i18n/index.tsx";
import {
  SHEET,
  batchGroups,
  machineMinutes,
  packSheet,
  withoutPieces,
  type BatchGroup,
  type Pack,
} from "../lib/batch.ts";
import { PRODUCT_BY_KEY } from "../lib/catalogue.ts";
import { source } from "../data/source.ts";
import { day, materialSurface, mm, pct, trim } from "../lib/format.ts";
import {
  BENCH_COLUMNS,
  benchKpis,
  isLocked,
  shipByForOrder,
  shipState,
  stockLines,
  type BenchColumn,
  type Order,
  type OrderLine,
} from "../lib/orders.ts";
import { bookedMinutes, countedMaterials, useStore, useToday } from "../state/store.ts";

/** The four columns, in bench order. */
/** The machine's own numbers, through the seam. See the settings card below. */
const LASER = source.laser();

const COLUMN_KEYS = BENCH_COLUMNS;

function useOpenOrders(): Order[] {
  const orders = useStore((s) => s.orders);
  return orders.filter((o) => o.postedIso === undefined);
}

/** The ship-by chip a card and a row both wear. */
function ShipChip({ order }: { order: Order }) {
  const today = useToday();
  const shipBy = shipByForOrder(order);
  const state = shipState(shipBy, today);
  const tone = state === "late" ? "danger" : state === "due-soon" ? "warn" : "neutral";
  return (
    <Tag tone={tone}>
      {/* The chip is the DATE and the colour is the state: --warn with one
          studio day left, --danger past it. The word "late" would be a second
          copy of a fact the tone already carries, in the one place on the board
          where a long product name is already fighting for room. */}
      <Mono>
        {day(shipBy, { day: "numeric", month: "short" })}
      </Mono>
    </Tag>
  );
}

// ── Today ────────────────────────────────────────────────────────────────────

export function TodayScreen() {
  const t = useT();
  const today = useToday();
  const orders = useOpenOrders();
  const booked = useStore((s) => s.booked);
  const openBatch = useStore((s) => s.openBatch);

  const kpis = benchKpis(orders, today);
  const minutes = bookedMinutes(booked);
  const groups = batchGroups(orders);

  return (
    <section className="br-screen">
      <div className="br-section-head">
        <div>
          <h1 className="br-h1">{t("bench.today.title")}</h1>
          <p className="br-lede">{t("bench.today.sub", { day: day(today) })}</p>
        </div>
      </div>

      <div className="br-kpis">
        <Kpi icon={<Hammer size={15} aria-hidden="true" />} n={kpis.dueToday} label={t("bench.kpi.due")} />
        <Kpi
          icon={<Clock size={15} aria-hidden="true" />}
          n={kpis.waitingOnCustomer}
          label={t("bench.kpi.waiting")}
          tone="warn"
        />
        <Kpi
          icon={<TriangleAlert size={15} aria-hidden="true" />}
          n={kpis.late}
          label={t("bench.kpi.late", undefined, kpis.late)}
          tone={kpis.late > 0 ? "danger" : "neutral"}
        />
        <Kpi
          icon={<Zap size={15} aria-hidden="true" />}
          /*
           * THROUGH `t()`, BECAUSE `h` AND `m` ARE ENGLISH AND THE FIGURES ARE
           * LATIN.
           *
           * This read `${hours}h ${minutes}m`, built in JSX and rendered
           * identically in all eight locales: two untranslated unit letters,
           * and two raw JavaScript numbers, which are Latin digits on an Arabic
           * page. `numerals.arabic.test.tsx` could not see either, because its
           * rule exempted any token carrying a Latin letter — and `5h` carries
           * one. Substituting through `t()` formats both figures in the
           * reader's own numerals and lets each locale write its own units.
           */
          n={t("bench.kpi.machineTime", {
            hours: Math.floor(minutes / 60),
            minutes: minutes % 60,
          })}
          label={t("bench.kpi.machine")}
        />
      </div>

      {/* The strip that groups the queue ACROSS ORDERS. */}
      <div className="br-batchstrip">
        <div className="br-batchstrip-head">
          <div>
            <div className="br-eyebrow">{t("bench.batch.title")}</div>
            <div className="br-batchstrip-sub">{t("bench.batch.sub")}</div>
          </div>
        </div>
        {groups.length === 0 ? (
          <div className="br-batchstrip-empty">{t("bench.batch.none")}</div>
        ) : (
          <div className="br-batchstrip-row">
            {groups.map((group) => (
              <button
                key={group.key}
                type="button"
                className="br-batchcard br-btn"
                onClick={() => openBatch(group.key)}
              >
                <span
                  className="br-batchcard-tile"
                  style={{ backgroundImage: materialSurface(group.pieces[0]!.materialKey) }}
                />
                <span className="br-batchcard-body">
                  <span className="br-batchcard-title">
                    {t("bench.batch.group", {
                      count: group.pieces.length,
                      material: t(`data.stock.${group.stockKey}.name` as never),
                      machine: t(`data.machine.${group.machine}.name` as never),
                    })}
                  </span>
                  <span className="br-batchcard-sub">
                    <Mono>{t("bench.batch.orders", { count: group.orderCount }, group.orderCount)}</Mono>
                    {" · "}
                    <Mono>{mm(SHEET.widthMm, SHEET.heightMm)}</Mono>
                  </span>
                </span>
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="br-board br-scroll">
        {COLUMN_KEYS.map((column) => (
          <BoardColumn key={column} column={column} orders={orders} />
        ))}
      </div>
    </section>
  );
}

function Kpi({
  icon,
  n,
  label,
  tone = "neutral",
}: {
  icon: ReactNode;
  n: number | string;
  label: string;
  tone?: "neutral" | "warn" | "danger";
}) {
  return (
    <div className="br-kpi" data-tone={tone}>
      {icon}
      <Mono className="br-kpi-n">{n}</Mono>
      <span className="br-kpi-label">{label}</span>
    </div>
  );
}

function BoardColumn({ column, orders }: { column: BenchColumn; orders: readonly Order[] }) {
  const t = useT();
  const dragKey = useStore((s) => s.dragKey);
  const setDragKey = useStore((s) => s.setDragKey);
  const moveLine = useStore((s) => s.moveLine);

  const cards: { order: Order; line: OrderLine }[] = [];
  for (const order of orders) {
    for (const line of order.lines) if (line.stage === column) cards.push({ order, line });
  }

  return (
    <section
      className="br-column"
      onDragOver={(e) => e.preventDefault()}
      onDrop={(e) => {
        e.preventDefault();
        if (dragKey === null) return;
        const [ref, lineId] = dragKey.split("/");
        setDragKey(null);
        if (ref !== undefined && lineId !== undefined) moveLine(ref, lineId, column);
      }}
    >
      <header className="br-column-head">
        <span>{t(`bench.col.${column}` as never)}</span>
        <Mono className="br-column-count">{cards.length}</Mono>
      </header>
      <div className="br-column-body">
        {cards.length === 0 ? (
          <div className="br-column-empty">
            {column === "to-make"
              ? t("bench.col.emptyMake")
              : column === "ready-to-post"
                ? t("bench.col.emptyReady")
                : t("bench.col.emptyOther")}
          </div>
        ) : (
          cards.map(({ order, line }) => (
            <BoardCard key={line.id} order={order} line={line} column={column} />
          ))
        )}
      </div>
    </section>
  );
}

function BoardCard({
  order,
  line,
  column,
}: {
  order: Order;
  line: OrderLine;
  column: BenchColumn;
}) {
  const t = useT();
  const boardMenu = useStore((s) => s.boardMenu);
  const setBoardMenu = useStore((s) => s.setBoardMenu);
  const setDragKey = useStore((s) => s.setDragKey);
  const dragKey = useStore((s) => s.dragKey);
  const moveLine = useStore((s) => s.moveLine);
  const openMakerOrder = useStore((s) => s.openMakerOrder);

  const product = PRODUCT_BY_KEY[line.productKey];
  if (product === undefined) return null;
  const key = `${order.ref}/${line.id}`;
  const locked = isLocked(line);

  return (
    <article
      className="br-card"
      data-dragging={dragKey === key}
      draggable
      onDragStart={(e) => {
        setDragKey(key);
        e.dataTransfer.effectAllowed = "move";
        e.dataTransfer.setData("text/plain", key);
      }}
      onDragEnd={() => setDragKey(null)}
    >
      <div className="br-card-head">
        <button type="button" className="br-card-ref br-btn" onClick={() => openMakerOrder(order.ref)}>
          <Mono>{order.ref}</Mono>
        </button>
        <div className="br-card-tools">
          {locked && (
            <span className="br-card-lock" title={t("bench.card.locked")}>
              <Lock size={13} aria-hidden="true" />
            </span>
          )}
          <button
            type="button"
            className="br-iconbtn br-iconbtn--sm br-btn"
            aria-label={t("bench.card.menu")}
            aria-expanded={boardMenu === key}
            onClick={() => setBoardMenu(boardMenu === key ? null : key)}
          >
            <MoreHorizontal size={15} aria-hidden="true" />
          </button>
        </div>
      </div>

      <div className="br-card-body">
        <span className="br-card-tile" style={{ backgroundImage: materialSurface(line.materialKey) }}>
          <Icon name={product.icon} size={16} />
        </span>
        <div className="br-card-text">
          <div className="br-card-name">
            {t(`data.product.${product.key}.name` as never)}
            <Mono className="br-card-qty">{t("bench.card.qty", { count: line.quantity })}</Mono>
          </div>
          <div className="br-card-sub">
            {t(`data.material.${line.materialKey}.short` as never)} ·{" "}
            {line.note.trim() === "" ? (
              t("bench.card.nothingWritten")
            ) : (
              <Typed>{`“${line.note}”`}</Typed>
            )}
          </div>
        </div>
      </div>

      <div className="br-card-foot">
        <ShipChip order={order} />
      </div>

      {boardMenu === key && (
        <div className="br-cardmenu" role="menu">
          {COLUMN_KEYS.filter((c) => c !== column).map((c) => (
            <button
              key={c}
              type="button"
              role="menuitem"
              className="br-cardmenu-item"
              data-locked={locked && column === "to-make"}
              onClick={() => moveLine(order.ref, line.id, c)}
            >
              {t("bench.card.moveTo", { column: t(`bench.col.${c}` as never).toLocaleLowerCase() })}
            </button>
          ))}
          <button
            type="button"
            role="menuitem"
            className="br-cardmenu-item br-cardmenu-item--accent"
            onClick={() => openMakerOrder(order.ref)}
          >
            {t("bench.card.open")}
          </button>
        </div>
      )}
    </article>
  );
}

// ── the batch sheet ──────────────────────────────────────────────────────────

/** The group and its pack, with whatever the maker has taken off applied. */
function usePack(): { group: BatchGroup; pack: Pack } | null {
  const orders = useOpenOrders();
  const batchKey = useStore((s) => s.batchKey);
  const batchOut = useStore((s) => s.batchOut);

  const group = batchGroups(orders).find((g) => g.key === batchKey);
  if (group === undefined) return null;
  return { group, pack: packSheet(withoutPieces(group.pieces, new Set(batchOut))) };
}

export function BatchScreen() {
  const t = useT();
  const go = useStore((s) => s.go);
  const materials = useStore((s) => s.materials);
  const stockAdj = useStore((s) => s.stockAdj);
  const orders = useOpenOrders();
  const batchOut = useStore((s) => s.batchOut);
  const dropFromSheet = useStore((s) => s.dropFromSheet);
  const putBackOnSheet = useStore((s) => s.putBackOnSheet);
  const startTheBatch = useStore((s) => s.startTheBatch);
  const openCutList = useStore((s) => s.openCutList);

  const found = usePack();
  if (found === null) {
    return (
      <section className="br-screen">
        <EmptyState title={t("bench.batch.screenTitle")} body={t("bench.batch.gone")}>
          <button type="button" className="br-button" onClick={() => go("today")}>
            {t("bench.back")}
          </button>
        </EmptyState>
      </section>
    );
  }

  const { group, pack } = found;
  const shelf = stockLines(countedMaterials(materials, stockAdj), orders).find(
    (row) => row.key === group.stockKey,
  );
  const dropped = group.pieces.filter((p) => batchOut.includes(p.key));

  return (
    <section className="br-screen">
      <button type="button" className="br-backlink br-btn" onClick={() => go("today")}>
        <ArrowLeft size={15} aria-hidden="true" />
        {t("bench.back")}
      </button>

      <div className="br-section-head">
        <div>
          <h1 className="br-h1">{t("bench.batch.screenTitle")}</h1>
          <p className="br-lede">
            {t("bench.batch.group", {
              count: group.pieces.length,
              material: t(`data.stock.${group.stockKey}.name` as never),
              machine: t(`data.machine.${group.machine}.name` as never),
            })}
          </p>
        </div>
        <button
          type="button"
          className="br-button br-button--ghost"
          onClick={() => openCutList(group.key)}
        >
          <Printer size={15} aria-hidden="true" />
          {t("bench.batch.cutList")}
        </button>
      </div>

      <div className="br-batchgrid">
        <div className="br-panel br-panel-pad">
          <div className="br-panel-title">
            <Mono>{t("bench.batch.sheet", { width: SHEET.widthMm, height: SHEET.heightMm })}</Mono>
          </div>

          <SheetDrawing pack={pack} onDrop={dropFromSheet} />

          {/* The sheet is the only drawing in the app you operate by pressing
              it, so it says what pressing does. Without the line the pieces
              read as a picture of the batch rather than the batch itself. */}
          <p className="br-panel-note">{t("bench.batch.takeOutHint")}</p>

          <div className="br-sheetfigs">
            <Mono className="br-sheetfig">{t("bench.batch.used", { pct: `${trim(pack.sheetUsePct)}%` })}</Mono>
            <Mono className="br-sheetfig br-sheetfig--muted">
              {t("bench.batch.leftover", { amount: trim(Math.round(pack.leftoverMm2 / 100)) })}
            </Mono>
          </div>

          {/* The claim this whole screen exists to make, in words and in numbers. */}
          <p className="br-crossorder">
            {t("bench.batch.crossOrder", {
              pieces: pack.placements.length,
              orders: pack.orderRefs.length,
            })}
          </p>
        </div>

        <div className="br-stack">
          <div className="br-panel br-panel-pad">
            <div className="br-panel-title">{t("bench.batch.next")}</div>
            {pack.overflow.length === 0 ? (
              <p className="br-panel-note">{t("bench.batch.nextNone")}</p>
            ) : (
              <>
                <p className="br-panel-note">{t("bench.batch.nextBody")}</p>
                <div className="br-rows">
                  {pack.overflow.map((piece) => (
                    <div key={piece.key} className="br-row">
                      <span>
                        <Mono>{piece.orderRef}</Mono> ·{" "}
                        {t(`data.product.${piece.productKey}.name` as never)}
                      </span>
                      <Mono className="br-row-strong">{mm(piece.widthMm, piece.heightMm)}</Mono>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>

          {dropped.length > 0 && (
            <div className="br-panel br-panel-pad">
              <div className="br-panel-title">{t("bench.batch.takenOff")}</div>
              <div className="br-rows">
                {dropped.map((piece) => (
                  <div key={piece.key} className="br-row">
                    <span>
                      <Mono>{piece.orderRef}</Mono> ·{" "}
                      {t(`data.product.${piece.productKey}.name` as never)}
                    </span>
                    <button
                      type="button"
                      className="br-linkbtn br-btn"
                      onClick={() => putBackOnSheet(piece.key)}
                    >
                      {t("bench.batch.putBack")}
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="br-panel br-panel-pad br-stack br-stack--tight">
            {/* Two sentences with figures in them, so they are FACTS rather
                than weight rows: `.br-mono` never wraps, by design, and a
                sentence that cannot wrap runs out of the panel in the two
                languages where it is longest. The figures that must be mono —
                the sheet-use and the leftover — are, above. */}
            <div className="br-facts">
              <div className="br-fact">
                <span className="br-fact-key">{t("bench.order.materials")}</span>
                <span className="br-fact-value">
                  {t("bench.batch.cost", {
                    sheets: pack.sheetsOffTheShelf,
                    spare: trim(shelf?.spare ?? 0),
                  })}
                </span>
              </div>
              <div className="br-fact">
                <span className="br-fact-key">{t("bench.materials.machines")}</span>
                <span className="br-fact-value">
                  {t("bench.batch.machineTime", {
                    /* The engine's own arithmetic, not a second copy of it:
                       `startBatch` books exactly this many minutes. */
                    minutes: machineMinutes(group.machine, pack.usedMm2),
                  })}
                </span>
              </div>
            </div>

            <button
              type="button"
              className="br-button br-button--block"
              disabled={pack.placements.length === 0}
              onClick={startTheBatch}
            >
              <Rows3 size={16} aria-hidden="true" />
              {t("bench.batch.start")}
            </button>
            <p className="br-panel-note">
              {pack.placements.length === 0 ? t("bench.batch.empty") : t("bench.batch.startNote")}
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}

/**
 * The sheet, drawn.
 *
 * Every rectangle is a percentage of the sheet, so the drawing is the pack's
 * own numbers rather than a picture somebody laid out to look right. Clicking a
 * piece takes it off — the maker's "not that one, somebody rang up".
 */
function SheetDrawing({ pack, onDrop }: { pack: Pack; onDrop: (key: string) => void }) {
  const t = useT();
  return (
    <div
      className="br-sheet"
      style={{ aspectRatio: `${pack.sheet.widthMm} / ${pack.sheet.heightMm}` }}
    >
      {pack.placements.map((p) => (
        <button
          key={p.piece.key}
          type="button"
          className="br-sheet-piece br-btn"
          title={t("bench.batch.takeOut")}
          onClick={() => onDrop(p.piece.key)}
          style={{
            insetInlineStart: `${(p.xMm / pack.sheet.widthMm) * 100}%`,
            insetBlockStart: `${(p.yMm / pack.sheet.heightMm) * 100}%`,
            inlineSize: `${(p.widthMm / pack.sheet.widthMm) * 100}%`,
            blockSize: `${(p.heightMm / pack.sheet.heightMm) * 100}%`,
            backgroundImage: materialSurface(p.piece.materialKey),
          }}
        >
          <Mono className="br-sheet-ref">
            <Code>{p.piece.orderRef.replace("BR-", "")}</Code>
          </Mono>
        </button>
      ))}
    </div>
  );
}

// ── the cut list ─────────────────────────────────────────────────────────────

export function CutListScreen() {
  const t = useT();
  const today = useToday();
  const go = useStore((s) => s.go);
  const cutKey = useStore((s) => s.cutKey);
  const orders = useOpenOrders();

  const group = batchGroups(orders).find((g) => g.key === cutKey) ?? batchGroups(orders)[0];
  if (group === undefined) {
    return (
      <section className="br-screen">
        <EmptyState title={t("bench.cut.title")} body={t("bench.cut.empty")}>
          <button type="button" className="br-button" onClick={() => go("today")}>
            {t("bench.back")}
          </button>
        </EmptyState>
      </section>
    );
  }

  const pack = packSheet(group.pieces);

  /** One row per ORDER LINE — the person at the machine checks words, not blanks. */
  const rows = new Map<
    string,
    { ref: string; productKey: string; blanks: number; customer: string; note: string }
  >();
  for (const { piece } of pack.placements) {
    const key = `${piece.orderRef}/${piece.lineId}`;
    const existing = rows.get(key);
    if (existing === undefined) {
      rows.set(key, {
        ref: piece.orderRef,
        productKey: piece.productKey,
        blanks: 1,
        customer: orders.find((o) => o.ref === piece.orderRef)?.customer ?? "",
        note: piece.note,
      });
    } else {
      existing.blanks += 1;
    }
  }

  /*
   * The figures come from the SEAM rather than out of the sentences — and the
   * seam rather than `data/demo.ts`, which is where they used to come from: a
   * connected studio would have printed this shop's 60 W laser and its cut
   * speeds on somebody else's bench, beside their real orders.
   * A number handed to `t()` is formatted in the reader's numerals; a number
   * TYPED INTO a translation is whatever the translator's keyboard produced,
   * which is how the Arabic pair came to read "18 مم/ث بقدرة 78%".
   */
  const settings: [string, string][] = [
    [
      t("bench.cut.setting.machine"),
      t("bench.cut.setting.machineValue", { watts: LASER.watts }),
    ],
    [
      t("bench.cut.setting.cut"),
      t("bench.cut.setting.cutValue", {
        speed: LASER.cut.speedMmPerSec,
        power: pct(LASER.cut.power),
      }),
    ],
    [
      t("bench.cut.setting.engrave"),
      t("bench.cut.setting.engraveValue", {
        speed: LASER.engrave.speedMmPerSec,
        power: pct(LASER.engrave.power),
        dpi: LASER.engrave.dpi,
      }),
    ],
    [t("bench.cut.setting.air"), t("bench.cut.setting.airValue")],
  ];

  return (
    <section className="br-screen">
      <button type="button" className="br-backlink br-btn" onClick={() => go("today")}>
        <ArrowLeft size={15} aria-hidden="true" />
        {t("bench.back")}
      </button>

      <div className="br-section-head">
        <div>
          <h1 className="br-h1">{t("bench.cut.title")}</h1>
          <p className="br-lede">
            {t("bench.cut.for", {
              material: t(`data.stock.${group.stockKey}.name` as never),
              machine: t(`data.machine.${group.machine}.name` as never),
              when: day(today, { day: "numeric", month: "long", year: "numeric" }),
            })}
          </p>
        </div>
        <button
          type="button"
          className="br-button br-button--ghost"
          onClick={() => {
            if (typeof window !== "undefined") window.print();
          }}
        >
          <Printer size={15} aria-hidden="true" />
          {t("bench.cut.print")}
        </button>
      </div>

      <div className="br-batchgrid">
        <div className="br-panel br-panel-pad">
          <div className="br-panel-title">
            <Mono>{t("bench.batch.sheet", { width: SHEET.widthMm, height: SHEET.heightMm })}</Mono>
          </div>
          <SheetDrawing pack={pack} onDrop={() => undefined} />
          <div className="br-sheetfigs">
            <Mono className="br-sheetfig">
              {t("bench.batch.used", { pct: `${trim(pack.sheetUsePct)}%` })}
            </Mono>
          </div>
        </div>

        <div className="br-panel br-panel-pad">
          <div className="br-panel-title">{t("bench.cut.settings")}</div>
          <div className="br-facts">
            {settings.map(([k, v]) => (
              <div key={k} className="br-fact">
                <span className="br-fact-key">{k}</span>
                <span className="br-fact-value br-mono">{v}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="br-table-wrap">
        <table className="br-table">
          <thead>
            <tr>
              <th>{t("bench.cut.col.ref")}</th>
              <th>{t("bench.cut.col.piece")}</th>
              <th className="br-num">{t("bench.cut.col.blanks")}</th>
              <th>{t("bench.cut.col.customer")}</th>
              <th>{t("bench.cut.col.lettering")}</th>
            </tr>
          </thead>
          <tbody>
            {[...rows.values()].map((row) => (
              <tr key={`${row.ref}-${row.productKey}-${row.note}`}>
                <td>
                  <Mono>{row.ref}</Mono>
                </td>
                <td>{t(`data.product.${row.productKey}.name` as never)}</td>
                <td className="br-num">
                  <Mono>{row.blanks}</Mono>
                </td>
                <td>{row.customer}</td>
                <td>
                  {row.note.trim() === "" ? (
                    <span className="br-muted">{t("bench.cut.noLettering")}</span>
                  ) : (
                    <Mono><Typed>{`“${row.note}”`}</Typed></Mono>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {pack.overflow.length > 0 && (
        <div className="br-panel br-panel-pad">
          <div className="br-panel-title">{t("bench.batch.next")}</div>
          <div className="br-rows">
            {pack.overflow.map((piece) => (
              <div key={piece.key} className="br-row">
                <span>
                  <Mono>{piece.orderRef}</Mono> ·{" "}
                  {t(`data.product.${piece.productKey}.name` as never)}
                </span>
                <Mono className="br-row-strong">{mm(piece.widthMm, piece.heightMm)}</Mono>
              </div>
            ))}
          </div>
        </div>
      )}
    </section>
  );
}
