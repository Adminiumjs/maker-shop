/**
 * Batches (comp "Batch these" on Today, the batch dialog, "Batch sheet",
 * "Cut list"): queued pieces of different orders that share a sheet and a
 * machine, laid out on the sheet, started as one batch, and printed for the
 * bench.
 *
 * The sheet is drawn here from the pieces' stored sizes (a picture, as the
 * proof's is); what a batch takes off the shelf is what its lines take as
 * Adminium keeps it (`stock_use`), in whole sheets. Starting a batch books
 * the machine first, so a time Adminium refuses (another booking overlaps)
 * leaves nothing written; then the batch with its sheets, then the lines.
 */
import { useState } from "react";
import { ArrowLeft, ArrowRight, LayoutGrid, Plus, Printer, Tags, X } from "lucide-react";

import { useData, useEnv, useRun } from "../env.tsx";
import { fileSrc, versionOf } from "../facts.ts";
import { useFmt } from "../format.ts";
import { wordsOfDesign } from "../designs.ts";
import { batchGroups, groupOfBatch, packSheet, rowsOf, sheetsFor, linesOnSheet, type Group, type Packed, type Piece } from "../making.ts";
import { isTaken, NothingOnSheet, startBatch } from "../making-actions.ts";
import { wordsOf } from "../picture.ts";
import { go, toast, useStudio } from "../store.ts";
import { Tile, Typed } from "../ui.tsx";
import { num, same, text, type Row } from "../wire.ts";
import { useI18n, useT, type TFunction } from "../../i18n/index.tsx";
import { close, Modal } from "./Modal.tsx";

/** "6 pieces · walnut, 6 mm · laser". */
const titleOf = (t: TFunction, g: Group) => t("studio.batch.group", { material: (text(g.material["name"]) ?? "").toLocaleLowerCase() }, g.pieces.length);

/** The pieces a sheet holds once some are taken off it. */
function onSheet(group: Group, takenOff: Readonly<Record<string, true>>): Packed {
  return packSheet(
    group.pieces.filter((p) => takenOff[p.key] !== true),
    group.sheet,
  );
}

const open = (key: string) => useStudio.setState({ overlay: { kind: "batch", key }, takenOff: {} });

// ── a sheet, drawn ──────────────────────────────────────────────────────────

/**
 * The sheet and the pieces on it, in mm: the material's own colour, each
 * piece named by its order's number. With `onDrop` each piece is a button
 * that takes it off the sheet. A right-to-left page lays the sheet out from
 * the other edge, as the comp's logical insets do.
 */
export function SheetDrawing({ group, packed, bench = false, onDrop }: { group: Group; packed: Packed; bench?: boolean; onDrop?: (piece: Piece) => void }) {
  const t = useT();
  const { dir } = useI18n();
  const { w: W, h: H } = group.sheet;
  const tint = text(group.material["tint"]) ?? "#8a8378";
  const label = t("studio.batch.drawing", {}, packed.placed.length);
  return (
    <svg className={`mk-sheet${bench ? " mk-sheet--bench" : ""}`} viewBox={`0 0 ${String(W)} ${String(H)}`} role={onDrop === undefined ? "img" : "group"} aria-label={label}>
      {packed.placed.map((p) => {
        const x = dir === "rtl" ? W - p.x - p.w : p.x;
        const body = (
          <>
            <rect x={x} y={p.y} width={p.w} height={p.h} rx={3} fill={bench ? undefined : tint} />
            <text x={x + p.w / 2} y={p.y + p.h / 2} textAnchor="middle" dominantBaseline="central">
              {p.ref}
            </text>
          </>
        );
        if (onDrop === undefined)
          return (
            <g key={p.key} className={`mk-piece${bench ? " mk-piece--bench" : ""}`} aria-hidden="true">
              {body}
            </g>
          );
        const drop = () => onDrop(p);
        return (
          <g
            key={p.key}
            className="mk-piece mk-piece--drop"
            role="button"
            tabIndex={0}
            aria-label={t("studio.batch.takeOff", { ref: p.ref })}
            onClick={drop}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                drop();
              }
            }}
          >
            <title>{t("studio.batch.takeOff", { ref: p.ref })}</title>
            {body}
          </g>
        );
      })}
    </svg>
  );
}

/** How much of the sheet is used, and what is left of it. */
function Use({ packed }: { packed: Packed }) {
  const t = useT();
  const fmt = useFmt();
  return (
    <div className="mk-use">
      <span className="mk-use-pct">{t("studio.batch.used", { pct: packed.pct })}</span>
      <span className="mk-use-left">{t("studio.batch.left", { amount: fmt.number(Math.round(packed.leftMm2 / 100)) })}</span>
    </div>
  );
}

/** "1 sheet off the shelf · 12 to use": what its lines take, in whole sheets, and what the shelf has to use. */
function Cost({ group, packed }: { group: Group; packed: Packed }) {
  const t = useT();
  const fmt = useFmt();
  const lines = linesOnSheet(group, packed);
  const sheets = lines.length === 0 ? 0 : sheetsFor(lines);
  return <span className="mk-cost">{t("studio.batch.cost", { spare: fmt.number(num(group.material["available"]) ?? 0, 2) }, sheets)}</span>;
}

/** Start a sheet's batch, as the dialog and the batch sheet do it. */
function useStart(): { busy: boolean; start: (key: string, takenOff: Readonly<Record<string, true>>) => void } {
  const t = useT();
  const { run, busy } = useRun();
  const start = (key: string, takenOff: Readonly<Record<string, true>>) => {
    void run(async (door, fresh) => {
      const group = batchGroups(fresh).find((g) => g.key === key);
      if (group === undefined) {
        toast(t("bench.batch.gone"), "warn");
        close();
        return null;
      }
      const packed = onSheet(group, takenOff);
      const family = text(group.material["family"]) ?? text(group.material["name"]) ?? "";
      const label = t("studio.batch.label", { material: family }, packed.placed.length);
      try {
        const started = await startBatch(door, fresh, group, packed, label, door.now());
        useStudio.setState({ overlay: null, takenOff: {} });
        if (started.stale > 0) toast(t("studio.batch.moved", {}, started.stale), "warn");
        return `${t("studio.batch.started", { pieces: started.pieces }, started.orders)} ${t("studio.batch.sheetsOff", { material: (text(group.material["name"]) ?? "").toLocaleLowerCase() }, started.sheets)}`;
      } catch (error) {
        if (error instanceof NothingOnSheet) {
          toast(t("studio.batch.nothing"), "warn");
          return null;
        }
        if (isTaken(error)) {
          toast(t("studio.batch.taken", { machine: text(group.machine?.["name"]) ?? "" }), "warn");
          return null;
        }
        throw error;
      }
    });
  };
  return { busy, start };
}

// ── batch these, on Today ───────────────────────────────────────────────────

export function BatchStrip() {
  const t = useT();
  const data = useData();
  const { door } = useEnv();
  if (!door.who().can("batches", "create")) return null;
  const groups = batchGroups(data);
  return (
    <section className="mk-strip" aria-labelledby="mk-strip-title">
      <div className="mk-strip-head">
        <LayoutGrid size={16} aria-hidden="true" />
        <h2 className="mk-strip-title" id="mk-strip-title">
          {t("bench.batch.title")}
        </h2>
        <span className="mk-strip-sub">{t("bench.batch.sub")}</span>
      </div>
      {groups.length === 0 ? (
        <span className="mk-strip-none">{t("bench.batch.none")}</span>
      ) : (
        <ul className="mk-strip-groups" role="list">
          {groups.map((g) => (
            <li key={g.key}>
              <button type="button" className="mk-group" onClick={() => open(g.key)}>
                <Tile tint={text(g.material["tint"])} size={32} />
                <span className="mk-group-text">
                  <span className="mk-group-title">{titleOf(t, g)}</span>
                  <span className="mk-group-sub">{t("studio.batch.groupSub", { width: g.sheet.w, height: g.sheet.h }, g.refs.length)}</span>
                </span>
                <ArrowRight className="mk-group-arrow" size={15} aria-hidden="true" />
              </button>
            </li>
          ))}
        </ul>
      )}
      {groups.length > 0 && (
        <div className="mk-strip-foot">
          <button type="button" className="mk-linkbtn" onClick={() => go("cutlist", { cutKey: groups[0]!.key })}>
            <Printer size={14} aria-hidden="true" />
            {t("studio.batch.cutList")}
          </button>
        </div>
      )}
    </section>
  );
}

// ── the batch dialog ────────────────────────────────────────────────────────

export function BatchDialog({ sheetKey }: { sheetKey: string }) {
  const t = useT();
  const data = useData();
  const takenOff = useStudio((s) => s.takenOff);
  const { busy, start } = useStart();
  const group = batchGroups(data).find((g) => g.key === sheetKey);
  if (group === undefined) return null;
  const packed = onSheet(group, takenOff);
  const dropped = group.pieces.filter((p) => takenOff[p.key] === true);
  const title = titleOf(t, group);
  const drop = (p: Piece) => useStudio.setState((s) => ({ takenOff: { ...s.takenOff, [p.key]: true } }));
  const putBack = (p: Piece) =>
    useStudio.setState((s) => {
      const next = { ...s.takenOff };
      delete next[p.key];
      return { takenOff: next };
    });

  return (
    <Modal labelledBy="mk-batch-title" className="mk-dialog st-pop">
      <div className="mk-dialog-head">
        <span className="mk-dialog-icon" aria-hidden="true">
          <LayoutGrid size={17} />
        </span>
        <span className="mk-dialog-titles">
          <h2 className="mk-dialog-title" id="mk-batch-title">
            {title}
          </h2>
          <span className="mk-dialog-sub">{t("studio.batch.sheetOf", { width: group.sheet.w, height: group.sheet.h, material: text(group.material["name"]) ?? "" })}</span>
        </span>
        <button type="button" className="st-close" aria-label={t("studio.close")} onClick={close}>
          <X size={16} aria-hidden="true" />
        </button>
      </div>
      <div className="mk-two">
        <div className="mk-col">
          <SheetDrawing group={group} packed={packed} onDrop={drop} />
          <Use packed={packed} />
          <Cost group={group} packed={packed} />
        </div>
        <div className="mk-col mk-col--wide">
          {packed.over.length > 0 && (
            <div>
              <h3 className="mk-subtitle">{t("studio.batch.next")}</h3>
              <ul className="mk-list">
                {packed.over.map((p) => (
                  <li key={p.key} className="mk-over">
                    <span className="mk-over-ref">{p.ref}</span>
                    <span className="mk-over-name">{p.name}</span>
                    <span className="mk-over-size">{`${String(p.w)} × ${String(p.h)} mm`}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
          {dropped.length > 0 && (
            <div>
              <h3 className="mk-subtitle">{t("studio.batch.takenOff")}</h3>
              <ul className="mk-list">
                {dropped.map((p) => (
                  <li key={p.key}>
                    <button type="button" className="mk-putback" aria-label={t("studio.batch.putBack", { ref: p.ref })} onClick={() => putBack(p)}>
                      <Plus size={14} aria-hidden="true" />
                      <span className="mk-over-ref">{p.ref}</span>
                      <span className="mk-over-name">{p.name}</span>
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}
          <p className="mk-hint">{t("bench.batch.takeOutHint")}</p>
          <button type="button" className="mk-wide-btn" onClick={() => go("cutlist", { cutKey: group.key })}>
            <Printer size={15} aria-hidden="true" />
            {t("bench.batch.cutList")}
          </button>
          <button type="button" className="mk-start" disabled={busy} onClick={() => start(group.key, takenOff)}>
            {t("bench.batch.start")}
          </button>
        </div>
      </div>
    </Modal>
  );
}

// ── the batch sheet ─────────────────────────────────────────────────────────

export function BatchPageScreen() {
  const t = useT();
  const data = useData();
  const sheetKey = useStudio((s) => s.sheetKey);
  const takenOff = useStudio((s) => s.takenOff);
  const { busy, start } = useStart();
  const groups = batchGroups(data);
  const sel = groups.find((g) => g.key === sheetKey) ?? groups[0];
  const orders = new Set(groups.flatMap((g) => g.refs)).size;
  const packed = sel === undefined ? null : onSheet(sel, takenOff);

  return (
    <section className="st-screen mk-page" aria-labelledby="mk-page-title">
      <div className="st-head st-head--tight">
        <h1 className="st-h1" id="mk-page-title">
          {t("bench.batch.screenTitle")}
        </h1>
        <span className="st-sub">{`${t("studio.batch.sheets", {}, groups.length)} · ${t("studio.batch.orders", {}, orders)}`}</span>
      </div>
      <p className="st-lede">{t("studio.batch.pageSub")}</p>
      {sel === undefined || packed === null ? (
        <div className="st-empty">
          <div className="st-empty-title">{t("studio.batch.emptyTitle")}</div>
          <div>{t("studio.batch.emptyBody")}</div>
        </div>
      ) : (
        <>
          <div className="mk-tabs" role="tablist" aria-label={t("studio.batch.tabs")}>
            {groups.map((g) => (
              <button
                key={g.key}
                type="button"
                role="tab"
                id={`mk-tab-${g.key}`}
                aria-selected={g.key === sel.key ? "true" : "false"}
                aria-controls="mk-sheet-panel"
                className="mk-tab"
                onClick={() => useStudio.setState({ sheetKey: g.key, takenOff: {} })}
              >
                <Tile tint={text(g.material["tint"])} size={22} />
                <span className="mk-tab-text">
                  <span className="mk-tab-title">{titleOf(t, g)}</span>
                  <span className="mk-tab-sub">{t("studio.batch.tabSub", { width: g.sheet.w, height: g.sheet.h }, g.refs.length)}</span>
                </span>
              </button>
            ))}
          </div>
          <div className="mk-panel" role="tabpanel" id="mk-sheet-panel" aria-labelledby={`mk-tab-${sel.key}`}>
            <div className="mk-two">
              <div className="mk-col">
                <SheetDrawing group={sel} packed={packed} />
                <Use packed={packed} />
              </div>
              <div className="mk-col">
                <ul className="mk-rows">
                  {rowsOf(sel, packed.placed).map((r) => (
                    <li key={`${r.ref}-${r.name}`} className="mk-row">
                      <span className="mk-row-ref">{r.ref}</span>
                      <span className="mk-row-name">{r.name}</span>
                      <span className="mk-row-n">{`×${String(r.n)}`}</span>
                    </li>
                  ))}
                </ul>
                <Cost group={sel} packed={packed} />
                <button type="button" className="mk-wide-btn" onClick={() => useStudio.setState({ overlay: { kind: "batch", key: sel.key } })}>
                  <LayoutGrid size={15} aria-hidden="true" />
                  {t("studio.batch.change")}
                </button>
                <button type="button" className="mk-wide-btn" onClick={() => go("cutlist", { cutKey: sel.key })}>
                  <Printer size={15} aria-hidden="true" />
                  {t("bench.batch.cutList")}
                </button>
                <button type="button" className="mk-start" disabled={busy} onClick={() => start(sel.key, takenOff)}>
                  {t("bench.batch.start")}
                </button>
              </div>
            </div>
          </div>
        </>
      )}
    </section>
  );
}

// ── the cut list ────────────────────────────────────────────────────────────

/** The group a cut list is of: a sheet still to start (its key), or a batch started (`batch-<id>`). */
function cutGroup(data: ReturnType<typeof useData>, key: string | null): Group | null {
  if (key !== null && key.startsWith("batch-")) {
    const batch = data.batches.find((b) => String(b.id) === key.slice("batch-".length));
    return batch === undefined ? null : groupOfBatch(data, batch);
  }
  const groups = batchGroups(data);
  return groups.find((g) => g.key === key) ?? groups[0] ?? null;
}

/** What a line carries for the bench: the customer's words, or the design's, and the design's files for the machine. */
function wordsFor(data: ReturnType<typeof useData>, line: Row): string[] {
  return line["design_id"] !== null && line["design_id"] !== undefined ? wordsOfDesign(data, line) : wordsOf(line);
}

export function CutListScreen() {
  const t = useT();
  const fmt = useFmt();
  const data = useData();
  const { door } = useEnv();
  const cutKey = useStudio((s) => s.cutKey);
  const group = cutGroup(data, cutKey);
  const [labels, setLabels] = useState<{ ref: string; url: string }[]>([]);
  const { run, busy } = useRun();
  const today = fmt.today(door.now());

  const back = (
    <button type="button" className="mk-back" onClick={() => go("today")}>
      <ArrowLeft size={15} aria-hidden="true" />
      {t("studio.cut.back")}
    </button>
  );
  if (group === null || group.pieces.length === 0) {
    return (
      <section className="st-screen mk-cut" aria-labelledby="mk-cut-title">
        {back}
        <h1 className="st-h1" id="mk-cut-title">
          {t("bench.cut.title")}
        </h1>
        <div className="st-empty">{t("bench.cut.empty")}</div>
      </section>
    );
  }
  const packed = packSheet(group.pieces, group.sheet);
  const machine = group.machine;
  const power = text(machine?.["power"]);
  const settings: [string, string | null][] = [
    ["bench.cut.setting.machine", machine === undefined ? null : power === null ? text(machine["name"]) : t("studio.cut.machine", { machine: text(machine["name"]) ?? "", power })],
    ["bench.cut.setting.cut", text(machine?.["cut_settings"])],
    ["bench.cut.setting.engrave", text(machine?.["engrave_settings"])],
    ["bench.cut.setting.air", text(machine?.["air_settings"])],
  ];
  const mayLabel = door.facts().addOns.includes("barcode-labels");
  const printLabels = () =>
    void run(async (d) => {
      const made: { ref: string; url: string }[] = [];
      for (const line of group.lines) {
        const doc = await d.render({ kind: "label-sheet", ref: "order_lines", pk: line.id });
        const ref = group.pieces.find((p) => same(p.lineId, line.id))?.ref ?? "";
        made.push({ ref, url: doc.printUrl ?? doc.contentUrl });
      }
      setLabels(made);
    });

  return (
    <section className="st-screen mk-cut" aria-labelledby="mk-cut-title">
      {back}
      <div className="mk-cut-card">
        <div className="mk-cut-head">
          <div className="mk-cut-title">
            <h1 className="mk-cut-name" id="mk-cut-title">
              {t("bench.cut.title")}
            </h1>
            <span className="mk-cut-meta">{titleOf(t, group)}</span>
          </div>
          <div className="mk-cut-when">
            <span className="mk-cut-meta">{fmt.dayYear(today)}</span>
            <span className="mk-cut-meta">{t("studio.cut.sheet", { width: group.sheet.w, height: group.sheet.h, material: text(group.material["name"]) ?? "" })}</span>
          </div>
        </div>
        <div className="mk-two">
          <div className="mk-col">
            <SheetDrawing group={group} packed={packed} bench />
            <span className="mk-cut-used">{t("studio.cut.used", { pct: packed.pct, placed: packed.placed.length, total: group.pieces.length })}</span>
            {packed.over.length > 0 && (
              <div className="mk-notsheet">
                <h2 className="mk-notsheet-title">{t("bench.batch.next")}</h2>
                {packed.over.map((p) => (
                  <span key={p.key} className="mk-notsheet-row">
                    <span className="mk-over-ref">{p.ref}</span>
                    <span>{p.name}</span>
                    <span className="mk-over-size">{`${String(p.w)} × ${String(p.h)} mm`}</span>
                  </span>
                ))}
              </div>
            )}
          </div>
          <div className="mk-col mk-col--wide">
            <ul className="mk-rows">
              {rowsOf(group).map((r) => {
                const words = r.lines.flatMap((l) => wordsFor(data, l));
                const files = r.lines.flatMap((l) => {
                  const version = l["design_id"] === null || l["design_id"] === undefined ? undefined : versionOf(data, l);
                  return version === undefined ? [] : data.files.filter((f) => same(f["version_id"], version.id));
                });
                return (
                  <li key={`${r.ref}-${r.name}`} className="mk-cutrow">
                    <span className="mk-cutrow-top">
                      <span className="mk-row-ref">{r.ref}</span>
                      <span className="mk-row-name">{r.name}</span>
                      <span className="mk-row-n">{`×${String(r.n)}`}</span>
                    </span>
                    <span className="mk-cutrow-note">{words.length > 0 ? <Typed>{words.join(" / ")}</Typed> : t("bench.cut.noLettering")}</span>
                    {files.length > 0 && (
                      <ul className="mk-files" aria-label={t("studio.cut.files")}>
                        {files.map((f) => (
                          <li key={String(f.id)}>
                            <a href={fileSrc(f["file"]) ?? "#"} download>
                              {text(f["name"])}
                            </a>
                          </li>
                        ))}
                      </ul>
                    )}
                  </li>
                );
              })}
            </ul>
            <dl className="mk-settings">
              {settings
                .filter((s): s is [string, string] => s[1] !== null)
                .map(([k, v]) => (
                  <div key={k} className="mk-setting">
                    <dt>{t(k as Parameters<TFunction>[0])}</dt>
                    <dd>{v}</dd>
                  </div>
                ))}
            </dl>
            {mayLabel && (
              <button type="button" className="mk-wide-btn mk-noprint" disabled={busy} onClick={printLabels}>
                <Tags size={15} aria-hidden="true" />
                {t("studio.labels.pieces")}
              </button>
            )}
            {labels.length > 0 && (
              <ul className="mk-files mk-noprint" aria-label={t("studio.labels.pieces")}>
                {labels.map((l) => (
                  <li key={l.url}>
                    <a href={l.url} target="_blank" rel="noreferrer">
                      {l.ref}
                    </a>
                  </li>
                ))}
              </ul>
            )}
            <button
              type="button"
              className="mk-print"
              onClick={() => {
                try {
                  window.print();
                } catch {
                  // A browser that cannot print still shows the list.
                }
              }}
            >
              {t("bench.cut.print")}
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}
