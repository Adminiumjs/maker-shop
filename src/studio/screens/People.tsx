/**
 * Customers (comp "Customers"), Products and one product (comp "Products",
 * "One product"), and the workshop's 404.
 *
 * A customer's orders and what they were charged in all are Adminium's
 * (`customers.order_count`, `customers.spent`); each order shows its stored
 * total. A product's lettering settings are the maker's to change: whether it
 * takes words, how many characters, what the shopper is asked and told.
 * Adminium holds the limit to 1–80 and refuses anything else.
 */
import { useState } from "react";
import { ArrowLeft, CircleAlert, PenLine } from "lucide-react";

import { useData, useEnv, useRun } from "../env.tsx";
import { linesOf, materialOf, ordersOfCustomer, productOf, queued, usualMaterial } from "../facts.ts";
import { useFmt } from "../format.ts";
import { go, useStudio } from "../store.ts";
import { LineTile, ProductTile, Typed } from "../ui.tsx";
import { num, same, text, type Id, type Row } from "../wire.ts";
import { useT, type MessageKey } from "../../i18n/index.tsx";
import { mayOpenPanel, mayReadCustomers } from "../roles.ts";

// ── customers ───────────────────────────────────────────────────────────────

export function CustomersScreen() {
  const t = useT();
  const fmt = useFmt();
  const data = useData();
  const { door } = useEnv();
  const chosen = useStudio((s) => s.customerId);
  if (!mayReadCustomers(door.who())) {
    return (
      <section className="st-screen">
        <div className="st-empty">{t("studio.customers.closed")}</div>
      </section>
    );
  }
  const people = [...data.customers].filter((c) => (num(c["order_count"]) ?? 0) > 0).sort((a, b) => (num(b["spent"]) ?? 0) - (num(a["spent"]) ?? 0) || String(text(a["name"]) ?? "").localeCompare(String(text(b["name"]) ?? "")));
  const person = people.find((c) => same(c.id, chosen)) ?? people[0];

  return (
    <section className="st-screen" aria-labelledby="st-people-title">
      <h1 className="st-h1" id="st-people-title">
        {t("bench.customers.title")}
      </h1>
      <p className="st-lede">{t("bench.customers.sub")}</p>
      <div className="st-people">
        <ul className="st-people-list">
          {people.map((c) => {
            const count = num(c["order_count"]) ?? 0;
            const live = ordersOfCustomer(data, c).filter((o) => o["status"] !== "posted" && o["status"] !== "cancelled").length;
            return (
              <li key={String(c.id)}>
                <button type="button" className="st-person" aria-current={person !== undefined && same(person.id, c.id)} onClick={() => useStudio.setState({ customerId: c.id })}>
                  <span className="st-person-name">
                    <Typed>{text(c["name"]) ?? text(c["email"])}</Typed>
                    {live > 0 && <span className="st-live">{t("bench.customers.onBench", { count: live })}</span>}
                  </span>
                  <span className="st-mono st-small">{t("bench.customers.meta", { count, amount: fmt.money(c["spent"]) }, count)}</span>
                </button>
              </li>
            );
          })}
        </ul>
        {person === undefined ? <div className="st-empty">{t("bench.customers.pick")}</div> : <Person person={person} />}
      </div>
    </section>
  );
}

function Person({ person }: { person: Row }) {
  const t = useT();
  const fmt = useFmt();
  const data = useData();
  const orders = ordersOfCustomer(data, person);
  const town = orders.map((o) => text(o["town"])).find((v) => v !== null) ?? "";
  const usual = usualMaterial(data, orders);
  return (
    <div className="st-panel st-panel--shadow" aria-live="polite">
      <div className="st-person-card-head">
        <h2 className="st-person-card-name">
          <Typed>{text(person["name"])}</Typed>
        </h2>
        <div className="st-small">
          {text(person["email"])}
          {town !== "" && ` · ${town}`}
        </div>
        <dl className="st-stats">
          <div className="st-stat">
            <dt>{t("bench.customers.count")}</dt>
            <dd>{fmt.number(num(person["order_count"]) ?? 0)}</dd>
          </div>
          <div className="st-stat">
            <dt>{t("studio.customers.charged")}</dt>
            <dd>{fmt.money(person["spent"])}</dd>
          </div>
          <div className="st-stat st-stat--word">
            <dt>{t("bench.customers.fav")}</dt>
            <dd>{text(usual?.["name"]) ?? "—"}</dd>
          </div>
          <div className="st-stat st-stat--word">
            <dt>{t("bench.customers.since")}</dt>
            <dd>{fmt.moment(person["created_at"])}</dd>
          </div>
        </dl>
      </div>
      {orders.map((order) => {
        const live = order["status"] !== "posted" && order["status"] !== "cancelled";
        return (
          <div key={String(order.id)} className="st-past">
            <div className="st-past-head">
              <span className="st-mono st-cell-strong">{text(order["number"])}</span>
              <span className="st-mono st-small">{fmt.moment(order["placed_at"])}</span>
              <span className={`st-past-state${live ? " st-past-state--live" : ""}`}>{live ? t("bench.customers.live") : t("bench.customers.posted", { day: fmt.moment(order["posted_at"]) })}</span>
              <span className="st-past-charged">
                {t("studio.customers.chargedOne")}
                <span className="st-mono st-cell-strong">{fmt.money(order["total"])}</span>
              </span>
            </div>
            {linesOf(data, order).map((line) => (
              <div key={String(line.id)} className="st-past-line">
                <LineTile data={data} line={line} product={productOf(data, line)} size={22} iconSize={12} />
                {text(line["product_name"])}
                <span className="st-mono st-small">{t("bench.card.qty", { count: num(line["qty"]) ?? 0 })}</span>
                {text(line["lettering"]) !== null && (
                  <span className="st-mono st-small">
                    <Typed>{`“${text(line["lettering"]) ?? ""}”`}</Typed>
                  </span>
                )}
              </div>
            ))}
            {live && (
              <button type="button" className="st-btn st-btn--link" onClick={() => go("order", { orderId: order.id })}>
                {t("bench.card.open")}
              </button>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ── products ────────────────────────────────────────────────────────────────

export function ProductsScreen() {
  const t = useT();
  const fmt = useFmt();
  const data = useData();
  return (
    <section className="st-screen" aria-labelledby="st-products-title">
      <h1 className="st-h1 st-head" id="st-products-title">
        {t("bench.pieces.title")}
      </h1>
      <div className="st-panel st-table st-products">
        <div className="st-table-head" aria-hidden="true">
          <span className="st-th">{t("bench.pieces.col.piece")}</span>
          <span className="st-th st-wide">{t("bench.pieces.col.size")}</span>
          <span className="st-th st-end st-wide">{t("bench.pieces.col.price")}</span>
          <span className="st-th st-end">{t("studio.products.lead")}</span>
          <span className="st-th st-end">{t("bench.pieces.col.queue")}</span>
        </div>
        {data.products.map((product) => {
          const n = queued(data, product.id);
          return (
            <div key={String(product.id)}>
              <button type="button" className="st-table-row" onClick={() => go("product", { productId: product.id })}>
                <span className="st-cell-piece">
                  <ProductTile data={data} product={product} size={32} iconSize={15} />
                  <span className="st-cell-stack">
                    <span className="st-cell-strong">{text(product["name"])}</span>
                    <span className="st-cell-sub">
                      {text(materialOf(data, product["material_id"])?.["name"])}
                      {(product["takes_lettering"] === true || product["base_id"] != null) && <span className="st-personal"> · {t("bench.pieces.personalTag")}</span>}
                    </span>
                  </span>
                </span>
                <span className="st-mono st-small st-wide">{text(product["size_text"])}</span>
                <span className="st-mono st-cell-strong st-end st-wide">{fmt.money(product["price"])}</span>
                <span className="st-mono st-small st-end">{t("studio.products.days", { days: num(product["lead_days"]) ?? 0 })}</span>
                <span className={`st-mono st-cell-strong st-end${n > 0 ? " st-personal" : ""}`}>{fmt.number(n)}</span>
              </button>
            </div>
          );
        })}
      </div>
    </section>
  );
}

const MACHINE: Record<string, MessageKey> = { laser: "studio.machine.laser", printer: "studio.machine.printer", kiln: "studio.machine.kiln" };

export function ProductScreen() {
  const t = useT();
  const data = useData();
  const productId = useStudio((s) => s.productId);
  const product = data.products.find((p) => same(p.id, productId));
  if (product === undefined) {
    return (
      <section className="st-screen st-narrower">
        <div className="st-empty">
          <h1 className="st-empty-title">{t("studio.product.none")}</h1>
          <button type="button" className="st-btn" onClick={() => go("products")}>
            {t("bench.piece.back")}
          </button>
        </div>
      </section>
    );
  }
  // A product read again after a save starts its draft afresh.
  return <ProductEditor key={`${String(product.id)}:${String(product["lettering_limit"])}:${String(product["takes_lettering"])}:${String(product["lettering_prompt"])}:${String(product["lettering_hint"])}`} product={product} />;
}

function ProductEditor({ product }: { product: Row }) {
  const t = useT();
  const fmt = useFmt();
  const data = useData();
  const { door } = useEnv();
  const { busy, run } = useRun();
  const saved = {
    takes: product["takes_lettering"] === true,
    limit: num(product["lettering_limit"]) === null ? "" : String(num(product["lettering_limit"])),
    prompt: text(product["lettering_prompt"]) ?? "",
    hint: text(product["lettering_hint"]) ?? "",
  };
  const [draft, setDraft] = useState(saved);
  const [tried, setTried] = useState(false);
  const editable = door.who().can("products", "update");
  const designed = product["base_id"] !== null && product["base_id"] !== undefined;
  const limit = Number.parseInt(draft.limit, 10);
  const limitErr: MessageKey | null = !tried || !draft.takes ? null : draft.limit.trim() === "" ? "studio.product.limitMissing" : !Number.isFinite(limit) || limit < 1 || limit > 80 ? "studio.product.limitRange" : null;
  const promptErr: MessageKey | null = tried && draft.takes && draft.prompt.trim() === "" ? "studio.product.promptMissing" : null;
  const dirty = draft.takes !== saved.takes || draft.limit !== saved.limit || draft.prompt !== saved.prompt || draft.hint !== saved.hint;

  const save = () => {
    setTried(true);
    const bad = draft.takes && (draft.limit.trim() === "" || !Number.isFinite(limit) || limit < 1 || limit > 80 || draft.prompt.trim() === "");
    if (bad) {
      document.getElementById(draft.limit.trim() === "" || !Number.isFinite(limit) || limit < 1 || limit > 80 ? "st-mp-limit" : "st-mp-prompt")?.focus();
      return;
    }
    void run(async (d) => {
      await d.saveProduct(product, {
        takes_lettering: draft.takes,
        lettering_limit: draft.takes ? limit : num(product["lettering_limit"]),
        lettering_prompt: draft.prompt.trim() === "" ? null : draft.prompt.trim(),
        lettering_hint: draft.hint.trim() === "" ? null : draft.hint.trim(),
      });
      setTried(false);
      return t("studio.product.savedToast", { name: text(product["name"]) ?? "" });
    });
  };

  const material = materialOf(data, product["material_id"]);
  return (
    <section className="st-screen st-narrower" aria-labelledby="st-product-title">
      <button type="button" className="st-back" onClick={() => go("products")}>
        <span className="st-flip">
          <ArrowLeft size={15} aria-hidden="true" />
        </span>
        {t("bench.piece.back")}
      </button>
      <div className="st-product-head">
        <ProductTile data={data} product={product} size={62} iconSize={28} />
        <div className="st-cell-stack">
          <h1 className="st-h1" id="st-product-title">
            {text(product["name"])}
          </h1>
          <span className="st-sub">{t("bench.piece.meta", { price: fmt.money(product["price"]), size: text(product["size_text"]) ?? "", days: num(product["lead_days"]) ?? 0 })}</span>
        </div>
      </div>
      <dl className="st-facts">
        <div className="st-fact">
          <dt>{t("bench.piece.row.material")}</dt>
          <dd>{[text(material?.["name"]), text(product["made_from"])].filter(Boolean).join(" — ")}</dd>
        </div>
        <div className="st-fact">
          <dt>{t("bench.piece.row.size")}</dt>
          <dd>{text(product["size_text"])}</dd>
        </div>
        <div className="st-fact">
          <dt>{t("bench.piece.row.soldAs")}</dt>
          <dd>{text(product["unit"])}</dd>
        </div>
        <div className="st-fact">
          <dt>{t("bench.piece.row.machine")}</dt>
          <dd>{t(MACHINE[String(product["machine_kind"])] ?? "studio.machine.laser")}</dd>
        </div>
        <div className="st-fact">
          <dt>{t("bench.piece.row.queue")}</dt>
          <dd>{t("bench.piece.row.queueValue", { count: queued(data, product.id) })}</dd>
        </div>
      </dl>

      <div className="st-personal-card">
        <h2 className="st-personal-head">
          <span className="st-personal-icon">
            <PenLine size={16} aria-hidden="true" />
          </span>
          {t("bench.piece.personal.title")}
        </h2>
        <div className="st-personal-body">
          <button type="button" role="switch" aria-checked={draft.takes} className="st-switch" disabled={!editable} onClick={() => setDraft({ ...draft, takes: !draft.takes })}>
            <span className="st-switch-track">
              <span className="st-switch-knob" />
            </span>
            <span className="st-switch-text">
              <span className="st-switch-label">{t("bench.piece.personal.takes")}</span>
              <span className="st-switch-sub">{designed ? t("studio.product.customiser") : draft.takes ? t("bench.piece.personal.on") : t("bench.piece.personal.off")}</span>
            </span>
          </button>
          <div className="st-fields">
            <label className="st-field">
              <span className="st-label">{t("bench.piece.personal.limit")}</span>
              <input
                id="st-mp-limit"
                className="st-input st-input--mono"
                inputMode="numeric"
                value={draft.limit}
                disabled={!draft.takes || !editable}
                aria-invalid={limitErr !== null}
                aria-describedby={limitErr !== null ? "st-mp-limit-err" : undefined}
                onChange={(e) => setDraft({ ...draft, limit: e.target.value.replace(/[^0-9]/g, "") })}
              />
              {limitErr !== null && (
                <span className="st-error" id="st-mp-limit-err">
                  <CircleAlert size={14} aria-hidden="true" />
                  {t(limitErr)}
                </span>
              )}
            </label>
            <label className="st-field">
              <span className="st-label">{t("bench.piece.personal.prompt")}</span>
              <input
                id="st-mp-prompt"
                className="st-input"
                value={draft.prompt}
                disabled={!draft.takes || !editable}
                aria-invalid={promptErr !== null}
                aria-describedby={promptErr !== null ? "st-mp-prompt-err" : undefined}
                onChange={(e) => setDraft({ ...draft, prompt: e.target.value })}
              />
              {promptErr !== null && (
                <span className="st-error" id="st-mp-prompt-err">
                  <CircleAlert size={14} aria-hidden="true" />
                  {t(promptErr)}
                </span>
              )}
            </label>
          </div>
          <label className="st-field">
            <span className="st-label">{t("bench.piece.personal.hint")}</span>
            <textarea className="st-input" rows={3} value={draft.hint} disabled={!draft.takes || !editable} onChange={(e) => setDraft({ ...draft, hint: e.target.value })} />
          </label>
          <div className="st-save">
            {editable && (
              <button type="button" className="st-btn st-btn--accent" disabled={busy} onClick={save}>
                {t("studio.product.save")}
              </button>
            )}
            <span className="st-small" role="status">
              {dirty ? t("studio.product.unsaved") : t("studio.product.saved")}
            </span>
            {designed && mayOpenPanel(door.who(), "customiser-product") && (
              <button type="button" className="st-linkbtn" onClick={() => useStudio.setState({ overlay: { kind: "panel", panel: { id: "customiser-product", table: "products", row: product.id }, linked: product["base_id"] as Id, title: text(product["name"]) ?? "" } })}>
                {t("studio.product.customiserLink")}
              </button>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}

// ── not here ────────────────────────────────────────────────────────────────

export function NotFoundScreen() {
  const t = useT();
  return (
    <section className="st-screen st-notfound" aria-labelledby="st-404-title">
      <span className="st-notfound-code">404</span>
      <h1 id="st-404-title">{t("studio.notFound.title")}</h1>
      <p>{t("studio.notFound.body")}</p>
      <button type="button" className="st-btn st-btn--accent" onClick={() => go("today")}>
        {t("studio.notFound.back")}
      </button>
    </section>
  );
}
