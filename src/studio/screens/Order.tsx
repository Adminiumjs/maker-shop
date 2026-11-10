/**
 * THE ORDER, as the studio sees it (comp "Maker order"): who it is for and
 * what they were charged (stored), its post-by, the pieces with the
 * customer's own words quoted exactly, each piece's proofs as they went and
 * came back, what it takes off the shelf, and the postage the customer chose.
 *
 * From here a proof goes (the proof sheet), the pieces are marked made or
 * ready to post, and a spoiled piece is recorded and queued again. A piece
 * with a design of the Customiser's opens the Customiser's panel on its line
 * in a sheet, for a role that opens it (the owner, the maker): it makes the
 * proof and the machine's files.
 */
import { ArrowLeft, Check, FileCog, Image as ImageIcon, PackageCheck, Send, Truck } from "lucide-react";

import { moveOrderLines } from "../actions.ts";
import { useData, useEnv, useRun } from "../env.tsx";
import { closuresOf, isLive, lineCode, lineMaterial, linesOf, lockOf, optionOf, productOf, proofsOf, serviceOf, takesProof } from "../facts.ts";
import { useFmt } from "../format.ts";
import { go, useStudio } from "../store.ts";
import { postTone } from "../facts.ts";
import { LineTile, Tile, Typed } from "../ui.tsx";
import { dayOf, num, same, text, type Id, type Row } from "../wire.ts";
import { useT, type MessageKey } from "../../i18n/index.tsx";
import { wordsOfDesign } from "../designs.ts";
import { mayMake, mayOpenPanel } from "../roles.ts";

const STAGE_LABEL: Record<string, MessageKey> = {
  make: "bench.col.to-make",
  making: "bench.col.making",
  finishing: "bench.col.finishing",
  ready: "bench.col.ready-to-post",
  posted: "studio.stage.posted",
  cancelled: "studio.stage.cancelled",
};

export function OrderScreen() {
  const t = useT();
  const fmt = useFmt();
  const data = useData();
  const { door } = useEnv();
  const { busy, run } = useRun();
  const orderId = useStudio((s) => s.orderId);
  const order = data.orders.find((o) => same(o.id, orderId));
  const who = door.who();

  if (order === undefined) {
    return (
      <section className="st-screen st-narrow">
        <div className="st-empty">
          <h1 className="st-empty-title">{t("bench.order.none")}</h1>
          <button type="button" className="st-btn" onClick={() => go("today")}>
            {t("bench.back")}
          </button>
        </div>
      </section>
    );
  }

  const facts = door.facts();
  const today = fmt.today(door.now());
  const postBy = dayOf(order["post_by"]);
  const tone = postTone(postBy, today, facts.studioDays, closuresOf(data));
  const lines = linesOf(data, order);
  const customer = text(order["name"]) ?? "";
  const service = serviceOf(data, order);
  const posted = order["status"] === "posted";
  const maker = mayMake(who);
  const canProof = who.can("proofs", "create") && lines.some((l) => isLive(l) && takesProof(l) && lockOf(l) !== null);

  const mark = (to: "finishing" | "ready") =>
    run(async (d, fresh) => {
      const { moved, held } = await moveOrderLines(d, fresh, order, to, to === "finishing" ? ["make", "making"] : ["make", "making", "finishing"]);
      if (moved === 0 && held > 0) return t("studio.order.held", { count: held }, held);
      if (moved === 0) return t("studio.order.nothingToMove");
      return to === "finishing" ? t("bench.order.madeToast") : t("bench.order.readyToast", { ref: text(order["number"]) ?? "" });
    });

  return (
    <section className="st-screen st-narrow" aria-labelledby="st-order-ref">
      <button type="button" className="st-back" onClick={() => go("today")}>
        <span className="st-flip">
          <ArrowLeft size={15} aria-hidden="true" />
        </span>
        {t("bench.back")}
      </button>

      <div className="st-order-head">
        <div className="st-order-ids">
          <h1 className="st-order-ref" id="st-order-ref">
            {text(order["number"])}
          </h1>
          <span className="st-order-meta">
            {t("studio.order.meta", { customer, town: text(order["town"]) ?? "", day: fmt.moment(order["placed_at"]), total: fmt.money(order["total"]) })}
          </span>
        </div>
        {!posted && (
          <span className={`st-chip st-order-chip st-tone-${tone}`}>{tone === "late" ? t("bench.order.overdue", { day: fmt.day(postBy) }) : t("bench.order.postBy", { day: fmt.day(postBy) })}</span>
        )}
      </div>

      {!posted && (
        <div className="st-actions">
          {who.can("proofs", "create") && (
            <button type="button" className="st-btn st-btn--accent" disabled={!canProof} onClick={() => useStudio.setState({ overlay: { kind: "proof", orderId: order.id } })}>
              <Send size={15} aria-hidden="true" />
              {t("bench.order.sendProof")}
            </button>
          )}
          {maker && (
            <>
              <button type="button" className="st-btn" disabled={busy} onClick={() => void mark("finishing")}>
                <Check size={15} aria-hidden="true" />
                {t("bench.order.markMade")}
              </button>
              <button type="button" className="st-btn" disabled={busy} onClick={() => void mark("ready")}>
                <PackageCheck size={15} aria-hidden="true" />
                {t("bench.order.markReady")}
              </button>
            </>
          )}
        </div>
      )}

      <div className="st-panel st-lines">
        <h2 className="st-lines-title">{t("bench.order.pieces")}</h2>
        {lines.map((line) => (
          <Line key={String(line.id)} line={line} maker={maker} opensPanel={mayOpenPanel(who, "customiser-line")} />
        ))}
      </div>

      <div className="st-twocol">
        {who.can("proofs", "read") && <ProofLog order={order} lines={lines} customer={customer} />}
        <Shelf lines={lines} />
      </div>

      <div className="st-panel st-panel--pad">
        <div className="st-postage-head">
          <h2 className="st-panel-title">{t("bench.order.postage")}</h2>
          <span className="st-sub">{t("bench.post.weight", { weight: fmt.kg(order["weight_g"]) })}</span>
        </div>
        <div className="st-service">
          <Truck size={16} aria-hidden="true" />
          <span className="st-service-text">
            <span className="st-service-name">{text(service?.["name"])}</span>
            <span className="st-service-sub">{text(service?.["detail"])}</span>
          </span>
          <span className="st-service-price">{fmt.money(order["postage"])}</span>
        </div>
        {posted ? (
          <div className="st-small">
            {t("studio.order.posted", { day: fmt.moment(order["posted_at"]), service: text(service?.["name"]) ?? "" })}
            {text(order["tracking"]) !== null && ` ${t("studio.order.tracking", { number: text(order["tracking"]) ?? "" })}`}
          </div>
        ) : (
          <div className="st-small">{t("studio.order.service", { customer: customer.split(" ")[0] ?? customer })}</div>
        )}
      </div>
    </section>
  );
}

function Line({ line, maker, opensPanel }: { line: Row; maker: boolean; opensPanel: boolean }) {
  const t = useT();
  const data = useData();
  const product = productOf(data, line);
  const lock = lockOf(line);
  const stage = String(line["stage"]);
  const words = text(line["lettering"]);
  const designed = line["design_id"] !== null && line["design_id"] !== undefined;
  const opts = [text(lineMaterial(data, line)?.["name"]), text(optionOf(data, line["size_id"])?.["name"]), text(optionOf(data, line["finish_id"])?.["name"])].filter(Boolean).join(" · ");
  const spoiled = num(line["spoiled"]) ?? 0;
  const held = lock !== null && stage === "make";
  const designWords = designed ? wordsOfDesign(data, line) : [];
  const name = text(line["product_name"]) ?? text(product?.["name"]) ?? "";
  // Both open the Customiser's panel on the line: it makes the proof and the files.
  const openPanel = () => useStudio.setState({ overlay: { kind: "panel", panel: { id: "customiser-line", table: "order_lines", row: line.id }, linked: line["design_id"] as Id, title: name } });

  return (
    <div className="st-line">
      <div className="st-line-main">
        <LineTile data={data} line={line} product={product} size={62} iconSize={22} />
        <div className="st-line-text">
          <span className="st-line-name">
            <strong>{name}</strong>
            <span className="st-qty">{t("bench.card.qty", { count: num(line["qty"]) ?? 0 })}</span>
            <span className={`st-stage${held ? " st-stage--held" : ""}`}>{held ? t(lock === "waiting" ? "studio.chip.waiting" : "studio.chip.unsent") : t(STAGE_LABEL[stage] ?? "bench.col.to-make")}</span>
          </span>
          <span className="st-opts">{opts}</span>
          {words !== null && (
            <span className="st-quote">
              <Typed>{`“${words}”`}</Typed>
            </span>
          )}
          {designed && (
            <span className="st-small">
              {t("studio.order.designedPlain")}
              {designWords.length > 0 && (
                <>
                  {" · "}
                  <Typed>{designWords.join(" / ")}</Typed>
                </>
              )}
            </span>
          )}
          {spoiled > 0 && <span className="st-spoiled">{t("studio.order.spoiled", { count: spoiled }, spoiled)}</span>}
        </div>
      </div>
      <div className="st-line-side">
        {designed && opensPanel && (
          <>
            <button type="button" className="st-linkbtn" onClick={openPanel}>
              <ImageIcon size={14} aria-hidden="true" />
              {t("studio.order.makeProof")}
            </button>
            <button type="button" className="st-linkbtn" onClick={openPanel}>
              <FileCog size={14} aria-hidden="true" />
              {t("studio.order.makeFiles")}
            </button>
          </>
        )}
        {maker && isLive(line) && (
          <button type="button" className="st-btn st-btn--small st-btn--warn" onClick={() => useStudio.setState({ overlay: { kind: "spoil", lineId: line.id } })}>
            {t("bench.order.spoil")}
          </button>
        )}
      </div>
    </div>
  );
}

/** Each piece's proofs as they went and came back, oldest first. */
function ProofLog({ order, lines, customer }: { order: Row; lines: Row[]; customer: string }) {
  const t = useT();
  const fmt = useFmt();
  const data = useData();
  const rows = lines.flatMap((line) => proofsOf(data, line).map((proof) => ({ line, proof })));
  // Each entry names its piece, by its label code and what it is: two lines of one order each have a proof 1.
  type Entry = { at: string; piece: string; what: string; tone: "pos" | "warn" | "plain"; detail: string | null; key: string };
  const entries: Entry[] = [];
  for (const { line, proof } of rows) {
    const piece = [lineCode(order, line), text(line["product_name"])].filter((part) => part !== null && part !== "").join(" · ");
    const version = num(proof["version"]) ?? 0;
    const sent = text(proof["sent_at"]);
    // Sent again: the piece's next proof replaced it, so nobody is waiting on a reply to this one.
    const next = proof["state"] === "superseded" ? proofsOf(data, line).map((p) => num(p["version"]) ?? 0).filter((v) => v > version).sort((a, b) => a - b)[0] : undefined;
    const detail = next === undefined ? t("studio.log.sentDetail", { customer }) : t("studio.log.replacedDetail", { customer, next });
    if (sent !== null) entries.push({ at: sent, piece, what: t("studio.log.sent", { version }), tone: "plain", detail, key: `${String(proof.id)}-sent` });
    const answered = text(proof["answered_at"]);
    if (proof["state"] === "approved" && answered !== null) entries.push({ at: answered, piece, what: t("studio.log.approved"), tone: "pos", detail: t("studio.log.approvedDetail"), key: `${String(proof.id)}-ok` });
    if ((proof["state"] === "change_asked" || text(proof["change_note"]) !== null) && answered !== null)
      entries.push({ at: answered, piece, what: t("studio.log.changeAsked"), tone: "warn", detail: text(proof["change_note"]) === null ? null : `“${text(proof["change_note"]) ?? ""}”`, key: `${String(proof.id)}-change` });
    const reminded = text(proof["reminded_at"]);
    if (reminded !== null) entries.push({ at: reminded, piece, what: t("studio.log.reminded", { day: fmt.moment(reminded) }), tone: "plain", detail: null, key: `${String(proof.id)}-reminded` });
  }
  entries.sort((a, b) => a.at.localeCompare(b.at));
  return (
    <div className="st-panel st-panel--pad">
      <h2 className="st-panel-title">{t("bench.proofs.title")}</h2>
      {entries.length === 0 ? (
        <div className="st-small">{t("studio.log.none")}</div>
      ) : (
        <ol className="st-log">
          {entries.map((e) => (
            <li key={e.key} className="st-log-row">
              <span className="st-log-when">{fmt.moment(e.at)}</span>
              <span className="st-log-text">
                <span className="st-log-piece">{e.piece}</span>
                <span className="st-log-what" data-tone={e.tone}>
                  {e.what}
                </span>
                {e.detail !== null && (
                  <span className="st-log-detail">
                    <Typed>{e.detail}</Typed>
                  </span>
                )}
              </span>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}

/** What the order's pieces take off the shelf: each material, the stock its lines take (Adminium's `stock_use`), and what is left to use. */
function Shelf({ lines }: { lines: Row[] }) {
  const t = useT();
  const fmt = useFmt();
  const data = useData();
  const by = new Map<string, { material: Row; amount: number }>();
  for (const line of lines.filter(isLive)) {
    const material = lineMaterial(data, line);
    if (material === undefined) continue;
    const key = String(material.id);
    const held = by.get(key) ?? { material, amount: 0 };
    held.amount += num(line["stock_use"]) ?? 0;
    by.set(key, held);
  }
  const unit = (material: Row, amount: number): string => {
    const u = text(material["unit"]);
    const n = fmt.number(amount, 2);
    if (u === "g") return `${n} ${t("bench.unit.grams")}`;
    const key: MessageKey = u === "blanks" ? "bench.unit.blank" : u === "tubs" ? "bench.unit.tub" : "bench.unit.sheet";
    return `${n} ${t(key, {}, amount === 1 ? 1 : 2)}`;
  };
  return (
    <div className="st-panel st-panel--pad">
      <h2 className="st-panel-title">{t("bench.order.materials")}</h2>
      <ul className="st-shelf">
        {[...by.values()].map(({ material, amount }) => (
          <li key={String(material.id)} className="st-shelf-row">
            <Tile tint={text(material["tint"])} size={18} />
            <span className="st-shelf-name">{text(material["name"])}</span>
            <span className="st-shelf-amt">{unit(material, amount)}</span>
            {material["available"] !== undefined && material["available"] !== null && <span className="st-shelf-left">{t("studio.order.left", { amount: fmt.number(num(material["available"]) ?? 0, 2) })}</span>}
          </li>
        ))}
      </ul>
    </div>
  );
}
