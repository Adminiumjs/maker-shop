/**
 * The studio's lists: Orders (comp "Orders list"), Proofs, and the Post
 * office run. Every amount and weight on them is the order's own stored
 * column; the lists only choose which rows to show and in what order.
 */
import { useState } from "react";
import { Check, MailCheck } from "lucide-react";

import { postOrders } from "../actions.ts";
import { useData, useEnv, useRun } from "../env.tsx";
import { closuresOf, fileSrc, isLive, linesOf, postRun, productOf, proofQueue, serviceOf, type ProofItem } from "../facts.ts";
import { useFmt } from "../format.ts";
import { go, toast, useStudio, type OrderFilter } from "../store.ts";
import { studioDaysBetween } from "../time.ts";
import { LineTile, ShipChip, Typed } from "../ui.tsx";
import { dayOf, num, text } from "../wire.ts";
import { wordsOfDesign } from "../designs.ts";
import { useT, type MessageKey } from "../../i18n/index.tsx";
import { mayPost } from "../roles.ts";

const STAGE_WORD: Record<string, MessageKey> = {
  make: "bench.col.to-make",
  making: "bench.col.making",
  finishing: "bench.col.finishing",
  ready: "bench.col.ready-to-post",
  posted: "studio.stage.posted",
  cancelled: "studio.stage.cancelled",
};

const FILTERS: [OrderFilter, MessageKey][] = [
  ["all", "bench.orders.filter.all"],
  ["proof", "bench.orders.filter.proof"],
  ["late", "bench.orders.filter.late"],
  ["today", "bench.orders.filter.today"],
  ["ready", "bench.orders.filter.ready"],
];

// ── orders ──────────────────────────────────────────────────────────────────

export function OrdersScreen() {
  const t = useT();
  const fmt = useFmt();
  const data = useData();
  const { door } = useEnv();
  const filter = useStudio((s) => s.orderFilter);
  const today = fmt.today(door.now());
  const facts = door.facts();
  const closures = closuresOf(data);

  const rows = data.orders
    .filter((o) => o["status"] !== "cancelled")
    .map((order) => {
      const lines = linesOf(data, order);
      const live = lines.filter(isLive);
      const postBy = dayOf(order["post_by"]);
      const posted = order["status"] === "posted";
      return { order, lines, postBy, posted, waiting: live.some((l) => l["proof_state"] === "sent"), ready: order["status"] === "ready" };
    })
    .filter((r) => filter === "all" || (filter === "proof" && r.waiting) || (filter === "late" && !r.posted && r.postBy !== null && r.postBy < today) || (filter === "today" && !r.posted && r.postBy === today) || (filter === "ready" && r.ready))
    .sort((a, b) => Number(a.posted) - Number(b.posted) || String(a.postBy ?? "").localeCompare(String(b.postBy ?? "")) || Number(a.order.id) - Number(b.order.id));

  return (
    <section className="st-screen" aria-labelledby="st-orders-title">
      <div className="st-head st-head--tight">
        <h1 className="st-h1" id="st-orders-title">
          {t("bench.orders.title")}
        </h1>
        <span className="st-sub">{t("bench.orders.count", { count: rows.length }, rows.length)}</span>
      </div>
      <div className="st-filters" role="group" aria-label={t("bench.orders.title")}>
        {FILTERS.map(([key, label]) => (
          <button key={key} type="button" className="st-filter" aria-pressed={filter === key} onClick={() => useStudio.setState({ orderFilter: key })}>
            {t(label)}
          </button>
        ))}
      </div>
      <div className="st-panel st-table st-orders">
        <div className="st-table-head" aria-hidden="true">
          <span className="st-th">{t("studio.orders.ref")}</span>
          <span className="st-th">{t("studio.orders.who")}</span>
          <span className="st-th st-wide">{t("studio.orders.what")}</span>
          <span className="st-th st-end st-wide">{t("studio.orders.charged")}</span>
          <span className="st-th st-end">{t("bench.orders.col.ship")}</span>
        </div>
        {rows.map(({ order, lines, postBy, posted, waiting }) => (
          <div key={String(order.id)}>
            <button type="button" className="st-table-row" onClick={() => go("order", { orderId: order.id })}>
              <span className="st-mono st-cell-strong">{text(order["number"])}</span>
              <span className="st-cell-stack">
                <span className="st-cell-strong">
                  <Typed>{text(order["name"])}</Typed>
                </span>
                <span className="st-cell-sub">{text(order["town"])}</span>
              </span>
              <span className="st-cell-stack st-wide">
                <span>{lines.map((l) => `${text(l["product_name"]) ?? ""} ×${String(num(l["qty"]) ?? 0)}`).join(", ")}</span>
                <span className={`st-stage-line${waiting ? " st-stage-line--warn" : ""}`}>{waiting ? t("bench.order.waitingPicture") : [...new Set(lines.map((l) => t(STAGE_WORD[String(l["stage"])] ?? "bench.col.to-make")))].join(" · ").toLocaleLowerCase()}</span>
              </span>
              <span className="st-mono st-cell-strong st-end st-wide">{fmt.money(order["total"])}</span>
              <span className="st-end">
                <ShipChip postBy={postBy} today={today} studioDays={facts.studioDays} closures={closures} posted={posted} />
              </span>
            </button>
          </div>
        ))}
        {rows.length === 0 && <div className="st-empty">{t("bench.orders.none")}</div>}
      </div>
    </section>
  );
}

// ── proofs ──────────────────────────────────────────────────────────────────

export function ProofsScreen() {
  const t = useT();
  const data = useData();
  const mayProof = useEnv().door.who().can("proofs", "create");
  const { waiting, unsent } = proofQueue(data);
  return (
    <section className="st-screen st-narrow" aria-labelledby="st-proofs-title">
      <div className="st-head st-head--tight">
        <h1 className="st-h1" id="st-proofs-title">
          {t("bench.proofs.title")}
        </h1>
        <span className="st-sub">{t("bench.proofs.count", { waiting: waiting.length, unsent: unsent.length })}</span>
      </div>
      <p className="st-lede">{t("bench.proofs.sub")}</p>
      {waiting.length > 0 && (
        <>
          <h2 className="st-section-title">{t("bench.proofs.waiting")}</h2>
          <ul className="st-proof-list">
            {waiting.map((item) => (
              <Waiting key={String(item.line.id)} item={item} />
            ))}
          </ul>
        </>
      )}
      {unsent.length > 0 && (
        <>
          <h2 className="st-section-title">{t("bench.proofs.unsent")}</h2>
          <ul className="st-proof-list">
            {unsent.map(({ order, line }) => (
              <li key={String(line.id)} className="st-unsent">
                <LineTile data={data} line={line} product={productOf(data, line)} size={38} iconSize={15} />
                <span className="st-unsent-text">
                  <span className="st-proof-ids">
                    <span className="st-mono st-small">{text(order["number"])}</span>
                    <strong>{text(line["product_name"])}</strong>
                  </span>
                  <span className="st-mono st-small">
                    <Typed>{`“${(text(line["lettering"]) ?? wordsOfDesign(data, line).join(" / "))}”`}</Typed>
                  </span>
                </span>
                {mayProof && (
                  <button type="button" className="st-btn st-btn--accent" onClick={() => useStudio.setState({ overlay: { kind: "proof", orderId: order.id } })}>
                    {t("bench.order.sendProof")}
                  </button>
                )}
              </li>
            ))}
          </ul>
        </>
      )}
      {waiting.length === 0 && unsent.length === 0 && (
        <div className="st-clear">
          <span className="st-clear-icon">
            <Check size={21} aria-hidden="true" />
          </span>
          <h2 className="st-empty-title">{t("bench.proofs.clear")}</h2>
          <p className="st-lede">{t("bench.proofs.clearBody")}</p>
        </div>
      )}
    </section>
  );
}

function Waiting({ item }: { item: ProofItem }) {
  const t = useT();
  const fmt = useFmt();
  const data = useData();
  const { door } = useEnv();
  const { busy, run } = useRun();
  const { order, line, latest } = item;
  const product = productOf(data, line);
  const customer = text(order["name"]) ?? "";
  const sent = text(latest?.["sent_at"]);
  const today = fmt.today(door.now());
  const waited = sent === null ? 0 : studioDaysBetween(fmt.today(Date.parse(sent)), today, door.facts().studioDays, closuresOf(data));
  const reminded = text(latest?.["reminded_at"]);
  const picture = fileSrc(latest?.["picture"]);
  const words = text(line["lettering"]) ?? wordsOfDesign(data, line).join(" / ");
  const name = text(line["product_name"]) ?? "";
  return (
    <li className="st-proof">
      <div className="st-proof-pic st-tile">
        <LineTile data={data} line={line} product={product} size={62} iconSize={26} />
        {picture !== null && <img src={picture} alt={t("studio.proof.alt", { name, customer })} />}
        {text(product?.["size_text"]) !== null && <span className="st-size">{text(product?.["size_text"])}</span>}
      </div>
      <div className="st-proof-text">
        <div className="st-proof-ids">
          <span className="st-mono st-small">{text(order["number"])}</span>
          <strong>{name}</strong>
          <span className="st-small">
            {t("studio.proofs.for", { customer })}
          </span>
        </div>
        {words !== "" && (
          <span className="st-quote">
            <Typed>{`“${words}”`}</Typed>
          </span>
        )}
        <span className={`st-wait${waited >= 2 ? " st-wait--long" : ""}`}>
          {t("bench.proofs.sentOn", { day: fmt.moment(sent) })} · {waited <= 0 ? t("bench.proofs.sentToday") : t("bench.proofs.waited", { count: waited }, waited)}
        </span>
        {reminded !== null && (
          <span className="st-reminded">
            <MailCheck size={13} aria-hidden="true" />
            {t("studio.proofs.reminded", { day: fmt.moment(reminded) })}
          </span>
        )}
        <div className="st-actions">
          {latest !== undefined && door.who().can("proofs", "update") && (
            <button type="button" className="st-btn st-btn--small" disabled={busy} onClick={() => void run(async (d) => {
              await d.remind(latest);
              return t("studio.proofs.remindedToast", { customer });
            })}>
              {t("studio.proofs.remind")}
            </button>
          )}
          <button type="button" className="st-btn st-btn--link" onClick={() => go("order", { orderId: order.id })}>
            {t("bench.card.open")}
          </button>
        </div>
      </div>
    </li>
  );
}

// ── the post office run ─────────────────────────────────────────────────────

export function PostScreen() {
  const t = useT();
  const fmt = useFmt();
  const data = useData();
  const { door } = useEnv();
  const { busy, run } = useRun();
  const [packed, setPacked] = useState<Set<string>>(new Set());
  const [tracking, setTracking] = useState<Record<string, string>>({});
  const orders = postRun(data);
  const dhl = door.facts().addOns.includes("shipping-dhl");
  const allowed = mayPost(door.who());
  const done = orders.filter((o) => packed.has(String(o.id)));
  const grams = orders.reduce((sum, o) => sum + (num(o["weight_g"]) ?? 0), 0);

  const markRun = () => {
    if (done.length === 0) {
      toast(t("bench.post.tickFirst"), "warn");
      return;
    }
    void run(async (d, fresh) => {
      const people = new Set(done.map((o) => text(o["email"]) ?? String(o.id)));
      await postOrders(d, fresh, done, tracking);
      setPacked(new Set());
      return t("studio.post.done", { count: people.size }, people.size);
    });
  };

  return (
    <section className="st-screen st-narrow" aria-labelledby="st-post-title">
      <div className="st-head st-head--tight">
        <h1 className="st-h1" id="st-post-title">
          {t("bench.post.title")}
        </h1>
        <span className="st-sub">{fmt.day(fmt.today(door.now()))}</span>
      </div>
      <p className="st-lede">{t("bench.post.sub")}</p>
      {orders.length === 0 && (
        <div className="st-empty">
          <div className="st-empty-title">{t("bench.post.empty")}</div>
          {t("bench.post.emptyBody")}
        </div>
      )}
      {orders.length > 0 && done.length === orders.length && (
        <div className="st-done" role="status">
          <Check size={16} aria-hidden="true" />
          {t("bench.post.allDone")}
        </div>
      )}
      <ul className="st-parcels">
        {orders.map((order) => {
          const key = String(order.id);
          const on = packed.has(key);
          const ref = text(order["number"]) ?? "";
          return (
            <li key={key} className="st-parcel">
              <button
                type="button"
                role="checkbox"
                aria-checked={on}
                aria-label={t("studio.post.packed", { ref })}
                className="st-tick"
                disabled={!allowed}
                onClick={() =>
                  setPacked((s) => {
                    const next = new Set(s);
                    if (next.has(key)) next.delete(key);
                    else next.add(key);
                    return next;
                  })
                }
              >
                <Check size={14} aria-hidden="true" />
              </button>
              <div className="st-parcel-body">
                <div className="st-parcel-head">
                  <span className="st-mono st-cell-strong">{ref}</span>
                  <span className="st-cell-strong">
                    <Typed>{text(order["name"])}</Typed>
                  </span>
                  <span className="st-small">{text(order["town"])}</span>
                  <span className="st-parcel-side">
                    <span className="st-mono st-small">{t("bench.post.weight", { weight: fmt.kg(order["weight_g"]) })}</span>
                    <span className="st-badge">{text(serviceOf(data, order)?.["name"])}</span>
                    <span className="st-mono st-cell-strong">{fmt.money(order["postage"])}</span>
                  </span>
                </div>
                <div className="st-pieces">
                  {linesOf(data, order)
                    .filter((l) => l["stage"] === "ready")
                    .map((line) => (
                      <span key={String(line.id)} className="st-piece">
                        <LineTile data={data} line={line} product={productOf(data, line)} size={20} iconSize={11} />
                        {text(line["product_name"])}
                        <span className="st-mono st-small">{t("bench.card.qty", { count: num(line["qty"]) ?? 0 })}</span>
                      </span>
                    ))}
                  <button type="button" className="st-btn st-btn--link" onClick={() => go("order", { orderId: order.id })}>
                    {t("studio.card.open")}
                  </button>
                </div>
                {dhl && allowed && (
                  <label className="st-field">
                    <span className="st-label">{t("studio.post.tracking", { ref })}</span>
                    <input className="st-input st-input--mono" value={tracking[key] ?? ""} onChange={(e) => setTracking((s) => ({ ...s, [key]: e.target.value }))} />
                  </label>
                )}
              </div>
            </li>
          );
        })}
      </ul>
      {orders.length > 0 && (
        <div className="st-runbar">
          <span className="st-runbar-sum">{t("bench.post.summary", { parcels: orders.length, weight: fmt.kg(grams), packed: done.length }, orders.length)}</span>
          {allowed && (
            <button type="button" className="st-btn st-btn--accent" disabled={busy} onClick={markRun}>
              {t("bench.post.markRun")}
            </button>
          )}
        </div>
      )}
    </section>
  );
}
