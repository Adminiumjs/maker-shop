/**
 * What opens over a screen: the proof sheet (comp "Send a proof") and the
 * spoil dialog (comp "Spoiled — remake it").
 *
 * The proof sheet shows each piece of the order that waits for a proof as the
 * customer will see it: a design's proof as the Customiser's panel made it
 * from the design's newest version, or the words drawn here on the piece's
 * material; or, for either, a file the maker chose instead (a PDF, or a
 * picture made elsewhere), sent as it is. Sending stores each picture and makes the proof rows; Adminium
 * numbers them, e-mails the customer, and holds the pieces until they say
 * yes. A design whose proof is not made yet is named, with the way to the
 * Customiser's panel that makes it (for a role that opens it), and is not
 * sent.
 */
import { useEffect, useMemo, useState } from "react";
import { FileText, TriangleAlert, X } from "lucide-react";

import { sendProofs, spoil } from "../actions.ts";
import { useData, useEnv, useRun } from "../env.tsx";
import { dueForProof, fileSrc, productOf, versionOf } from "../facts.ts";
import { wordsOfDesign } from "../designs.ts";
import { wordsOf } from "../picture.ts";
import { useStudio } from "../store.ts";
import { LineTile, ProofImage, Typed } from "../ui.tsx";
import { num, same, text, type Id, type Row } from "../wire.ts";
import { useT } from "../../i18n/index.tsx";
import { BatchDialog } from "./Batches.tsx";
import { PanelSheet } from "../panels/PanelSheet.tsx";
import { mayOpenPanel } from "../roles.ts";
import { close, Modal } from "./Modal.tsx";

export function Overlays() {
  const overlay = useStudio((s) => s.overlay);
  if (overlay === null) return null;
  if (overlay.kind === "proof") return <ProofSheet orderId={overlay.orderId} />;
  if (overlay.kind === "batch") return <BatchDialog sheetKey={overlay.key} />;
  if (overlay.kind === "panel") return <PanelSheet panel={overlay.panel} linked={overlay.linked} title={overlay.title} />;
  return <SpoilDialog lineId={overlay.lineId} />;
}

/** The kinds a proof's file may be, as the proofs table takes them (`PROOF_KINDS`): a PDF, or a picture. */
const PROOF_ACCEPT = "application/pdf,image/png,image/jpeg,image/webp,.pdf,.png,.jpg,.jpeg,.webp";

function ProofSheet({ orderId }: { orderId: Row["id"] }) {
  const t = useT();
  const data = useData();
  const { draw, door } = useEnv();
  const opensPanel = mayOpenPanel(door.who(), "customiser-line");
  const { busy, run } = useRun();
  const order = data.orders.find((o) => same(o.id, orderId));
  const due = useMemo(() => (order === undefined ? [] : dueForProof(data, order)), [data, order]);
  const [drawn, setDrawn] = useState<Map<string, Blob | null>>(new Map());
  const [urls, setUrls] = useState<Map<string, string>>(new Map());
  /** The files the maker chose to send instead (a PDF, or a picture made elsewhere), by line. */
  const [own, setOwn] = useState<Map<string, File>>(new Map());
  const choose = (line: Row, file: File | null) =>
    setOwn((held) => {
      const next = new Map(held);
      if (file === null) next.delete(String(line.id));
      else next.set(String(line.id), file);
      return next;
    });

  // The words' pictures, drawn once each: what is shown is what is sent.
  useEffect(() => {
    let live = true;
    const made: string[] = [];
    void (async () => {
      const blobs = new Map<string, Blob | null>();
      const shown = new Map<string, string>();
      for (const line of due) {
        if (line["design_id"] !== null && line["design_id"] !== undefined) continue;
        const blob = await draw(line, data);
        blobs.set(String(line.id), blob);
        if (blob !== null && typeof URL.createObjectURL === "function") {
          const url = URL.createObjectURL(blob);
          made.push(url);
          shown.set(String(line.id), url);
        }
      }
      if (live) {
        setDrawn(blobs);
        setUrls(shown);
      }
    })();
    return () => {
      live = false;
      if (typeof URL.revokeObjectURL === "function") for (const url of made) URL.revokeObjectURL(url);
    };
  }, [due, draw, data]);

  if (order === undefined) return null;
  const customer = text(order["name"]) ?? "";
  const ready = due.filter((line) => own.has(String(line.id)) || (line["design_id"] !== null && line["design_id"] !== undefined ? text(versionOf(data, line)?.["proof_file"]) !== null : drawn.get(String(line.id)) != null));

  const send = () =>
    run(async (door, fresh) => {
      const ownFor = (line: Row) => {
        const file = own.get(String(line.id));
        return file === undefined ? null : { blob: file, filename: file.name === "" ? `proof-line-${String(line.id)}` : file.name };
      };
      const { sent, missing } = await sendProofs(door, fresh, order, async (line) => drawn.get(String(line.id)) ?? null, null, ownFor);
      useStudio.setState({ overlay: null });
      const said = sent.length === 0 ? "" : t("studio.proof.sent", { customer }, sent.length);
      return missing.length === 0 ? said : `${said} ${t("studio.proof.missing", { count: missing.length }, missing.length)}`.trim();
    });

  return (
    <Modal side labelledBy="st-ps-title">
      <div className="st-sheet-head">
        <h2 className="st-sheet-title" id="st-ps-title">
          {t("bench.order.sendProof")}
        </h2>
        <button type="button" className="st-close" aria-label={t("studio.close")} onClick={close}>
          <X size={16} aria-hidden="true" />
        </button>
      </div>
      <div className="st-sheet-body">
        <div className="st-small">{t("studio.proof.for", { customer, ref: text(order["number"]) ?? "" })}</div>
        {due.length === 0 && <div className="st-empty">{t("studio.proof.none")}</div>}
        {due.map((line) => {
          const product = productOf(data, line);
          const name = text(line["product_name"]) ?? text(product?.["name"]) ?? "";
          const designed = line["design_id"] !== null && line["design_id"] !== undefined;
          const version = designed ? versionOf(data, line) : undefined;
          const picture = designed ? fileSrc(version?.["proof_file"]) : (urls.get(String(line.id)) ?? null);
          const words = designed ? wordsOfDesign(data, line) : wordsOf(line);
          const chosen = own.get(String(line.id));
          return (
            <div key={String(line.id)} className="st-ps-line">
              {chosen !== undefined ? (
                <div className="st-ps-own">
                  <FileText size={18} aria-hidden="true" />
                  <span className="st-mono">{t("studio.proof.ownChosen", { name: chosen.name })}</span>
                  <button type="button" className="st-btn st-btn--link" onClick={() => choose(line, null)}>
                    {t("studio.proof.ownClear")}
                  </button>
                </div>
              ) : picture !== null ? (
                <div className="st-ps-pic">
                  <ProofImage src={picture} alt={t("studio.proof.alt", { name, customer })} name={name} />
                  {version !== undefined && <span className="st-ps-version">{t("studio.proof.version", { version: num(version["version"]) ?? 1 })}</span>}
                </div>
              ) : designed ? (
                <div className="st-ps-missing">
                  <span>{t("studio.proof.notMade")}</span>
                  {opensPanel && (
                    <button type="button" className="st-linkbtn" onClick={() => useStudio.setState({ overlay: { kind: "panel", panel: { id: "customiser-line", table: "order_lines", row: line.id }, linked: line["design_id"] as Id, title: name } })}>
                      {t("studio.order.makeProof")}
                    </button>
                  )}
                </div>
              ) : drawn.has(String(line.id)) ? (
                <div className="st-ps-missing">{t("studio.proof.cannotDraw")}</div>
              ) : (
                <div className="st-ps-pic">
                  <LineTile data={data} line={line} product={product} size={62} iconSize={22} />
                </div>
              )}
              <div className="st-ps-text">
                <strong>{name}</strong>
                {words.length > 0 && (
                  <span className="st-mono st-small">
                    <Typed>{`“${words.join(" / ")}”`}</Typed>
                  </span>
                )}
                <label className="st-ps-file">
                  <span>{t("studio.proof.ownFile")}</span>
                  <input type="file" accept={PROOF_ACCEPT} onChange={(e) => choose(line, e.target.files?.[0] ?? null)} />
                </label>
              </div>
            </div>
          );
        })}
        <p className="st-small">{t("studio.proof.explain")}</p>
      </div>
      <div className="st-sheet-foot">
        <button type="button" className="st-btn st-btn--accent" aria-disabled={ready.length === 0 || busy} onClick={() => ready.length > 0 && !busy && void send()}>
          {t("studio.proof.send", { customer })}
        </button>
        <button type="button" className="st-btn" onClick={close}>
          {t("studio.cancel")}
        </button>
      </div>
    </Modal>
  );
}

function SpoilDialog({ lineId }: { lineId: Row["id"] }) {
  const t = useT();
  const data = useData();
  const { busy, run } = useRun();
  const [qty, setQty] = useState("1");
  const [tried, setTried] = useState(false);
  const line = data.lines.find((l) => same(l.id, lineId));
  if (line === undefined) return null;
  const name = text(line["product_name"]) ?? text(productOf(data, line)?.["name"]) ?? "";
  const n = Number.parseInt(qty, 10);
  const invalid = !Number.isFinite(n) || n < 1;

  const record = () => {
    setTried(true);
    if (invalid) return;
    void run(async (door, fresh) => {
      await spoil(door, fresh, line, n);
      useStudio.setState({ overlay: null });
      return t("studio.spoil.done", { count: n });
    });
  };

  return (
    <Modal labelledBy="st-sp-title">
      <span className="st-dialog-icon">
        <TriangleAlert size={19} aria-hidden="true" />
      </span>
      <h2 className="st-dialog-title" id="st-sp-title">
        {t("bench.order.spoil")}
      </h2>
      <p className="st-dialog-body">{t("studio.spoil.body", { name })}</p>
      <label className="st-field">
        <span className="st-label">{t("studio.spoil.howMany")}</span>
        <input
          className="st-input st-input--mono"
          inputMode="numeric"
          value={qty}
          aria-invalid={tried && invalid}
          aria-describedby={tried && invalid ? "st-sp-err" : undefined}
          onChange={(e) => setQty(e.target.value.replace(/[^0-9]/g, ""))}
          onKeyDown={(e) => e.key === "Enter" && record()}
        />
        {tried && invalid && (
          <span className="st-error" id="st-sp-err">
            {t("studio.spoil.invalid")}
          </span>
        )}
      </label>
      <div className="st-dialog-foot">
        <button type="button" className="st-btn st-btn--dark" disabled={busy} onClick={record}>
          {t("studio.spoil.record")}
        </button>
        <button type="button" className="st-btn" onClick={close}>
          {t("studio.cancel")}
        </button>
      </div>
    </Modal>
  );
}
