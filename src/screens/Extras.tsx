/**
 * The pages the footer links to, plus search, the 404, and the bench's holding
 * screen.
 *
 * Comp K ships these as finished screens rather than as filler, and the wave-3
 * precedent is to port them in full: a maker's shopper genuinely reads
 * "Postage and the calendar" (it is where the studio week is explained without
 * being explained), "Looking after it" (real wood behaves in ways a shopper has
 * to be told about) and "If something's wrong" (there is nobody else to go
 * through). Cutting them would leave five footer links pointing at nothing,
 * which is the one thing 18 §1.1 does not allow.
 */

import { Calendar, FileText, MailCheck, Truck } from "lucide-react";

import { Icon } from "../components/Icon.tsx";
import { EmptyState, Field, Mono, Typed } from "../components/Primitives.tsx";
import { PieceTile } from "./Shop.tsx";
import { useT } from "../i18n/index.tsx";
import { finishDay, fortnight, postDay } from "../lib/calendar.ts";
import {
  MATERIALS,
  MATERIAL_KEYS,
  PRODUCTS,
  PRODUCT_BY_KEY,
  type MaterialKey,
} from "../lib/catalogue.ts";
import { cents, day, flatTint, materialSurface, shortDay, weekdayShort } from "../lib/format.ts";
import { POSTAGE, lineTotalCents, materialRunningLow, stockLines } from "../lib/orders.ts";
import { useStore, useToday, type ShopperView } from "../state/store.ts";

// ── search ───────────────────────────────────────────────────────────────────

const PAGE_HITS: { view: ShopperView; key: string; words: string }[] = [
  {
    view: "postage",
    key: "footer.postage",
    words: "postage post delivery calendar days shipping when tracked",
  },
  { view: "care", key: "footer.care", words: "care clean wash oil wax dishwasher looking after" },
  { view: "ask", key: "footer.ask", words: "commission custom bespoke ask special one off" },
  { view: "wrong", key: "footer.wrong", words: "broken wrong late remake return problem" },
];

export function SearchScreen() {
  const t = useT();
  const term = useStore((s) => s.searchTerm);
  const go = useStore((s) => s.go);
  const materials = useStore((s) => s.materials);
  const orders = useStore((s) => s.orders);
  const shelf = stockLines(materials, orders);

  const q = term.trim().toLowerCase();
  const hits = PRODUCTS.filter((p) => {
    const haystack = [
      t(`data.product.${p.key}.name` as never),
      t(`data.product.${p.key}.madeFrom` as never),
      t(`data.material.${p.material}.name` as never),
      t(`data.category.${p.category}` as never),
    ]
      .join(" ")
      .toLowerCase();
    return haystack.includes(q);
  });

  const pages = q === "" ? [] : PAGE_HITS.filter((p) => `${t(p.key as never)} ${p.words}`.toLowerCase().includes(q));

  return (
    <section className="br-screen">
      <h1 className="br-h1">“{term}”</h1>
      <Mono className="br-search-count">
        {hits.length === 0 ? t("screen.search.none") : t("screen.search.count", {}, hits.length)}
      </Mono>

      {pages.length > 0 && (
        <div className="br-search-pages">
          {pages.map((page) => (
            <button
              key={page.view}
              type="button"
              className="br-button br-button--ghost"
              onClick={() => go(page.view)}
            >
              <FileText size={15} aria-hidden="true" />
              {t(page.key as never)}
            </button>
          ))}
        </div>
      )}

      {hits.length === 0 ? (
        <EmptyState title={t("screen.search.empty.title")} body={t("screen.search.empty.body")}>
          <button type="button" className="br-button" onClick={() => go("ask")}>
            {t("screen.search.empty.cta")}
          </button>
        </EmptyState>
      ) : (
        <div className="br-grid">
          {hits.map((product) => (
            <PieceTile
              key={product.key}
              product={product}
              lowMaterial={materialRunningLow(product.material, shelf)}
            />
          ))}
        </div>
      )}
    </section>
  );
}

// ── postage and the calendar ─────────────────────────────────────────────────

const LEAD_ROWS: { key: string; days: number; noteKey?: string }[] = [
  { key: "screen.postage.lead.laser", days: 3 },
  { key: "screen.postage.lead.printed", days: 4 },
  { key: "screen.postage.lead.slate", days: 5 },
  { key: "screen.postage.lead.glazed", days: 10, noteKey: "screen.postage.lead.glazedNote" },
];

export function PostageScreen() {
  const t = useT();
  const now = useStore((s) => s.now);
  const iso = useToday();
  const clock = { ...now, iso };

  /*
   * The calendar grid IS the studio week made visible. Sunday and Monday are
   * drawn shut rather than left out, because a fortnight with two holes in it
   * explains the arithmetic faster than a paragraph does.
   *
   * The days come from `fortnight()` rather than from an `addDays` loop written
   * here. This was the last plain-calendar arithmetic in `screens/`, and while
   * it existed the rule "no screen counts days" had an exception in it — which
   * is how a promise date somewhere else got counted in plain weekdays and no
   * test noticed. There is no exception now, and `sources.test.ts` says so.
   */
  const days = fortnight(iso).map((d, i) => ({ ...d, today: i === 0 }));

  return (
    <section className="br-screen br-narrow">
      <h1 className="br-h1">{t("screen.postage.title")}</h1>
      <p className="br-lede">{t("screen.postage.intro")}</p>

      <div className="br-section-head">{t("screen.postage.nextTwoWeeks")}</div>
      <div className="br-cal">
        {days.map((d) => (
          <div key={d.date} className="br-cal-day" data-open={d.open} data-today={d.today}>
            <Mono className="br-cal-dow">{weekdayShort(d.date)}</Mono>
            <Mono className="br-cal-date">{shortDay(d.date)}</Mono>
            <span className="br-cal-note">
              {d.today ? t("screen.postage.today") : d.open ? "" : t("screen.postage.closed")}
            </span>
          </div>
        ))}
      </div>

      <div className="br-section-head">{t("screen.postage.howLong")}</div>
      <div className="br-rows">
        {LEAD_ROWS.map((row) => (
          <div key={row.key} className="br-row">
            <span>{t(row.key as never)}</span>
            <Mono className="br-row-strong">
              {row.noteKey === undefined
                ? t("screen.postage.lead.days", { days: row.days })
                : t(row.noteKey as never)}
            </Mono>
          </div>
        ))}
      </div>

      <div className="br-note br-note--accent">
        <Calendar size={17} aria-hidden="true" />
        <span>
          {t("screen.postage.example", {
            finish: day(finishDay(clock, 3)),
            post: day(postDay(clock, 3)),
          })}
        </span>
      </div>

      <div className="br-section-head">{t("screen.postage.whatCosts")}</div>
      <div className="br-stack br-stack--tight">
        {(["second", "tracked"] as const).map((key) => (
          <div key={key} className="br-panel br-panel-pad br-postrow">
            <Truck size={17} aria-hidden="true" />
            <span className="br-postrow-body">
              <span className="br-pick-label">{t(`screen.postage.${key}.label` as never)}</span>
              <span className="br-pick-sub">{t(`screen.postage.${key}.sub` as never)}</span>
            </span>
            <Mono>{cents(POSTAGE[key])}</Mono>
          </div>
        ))}
      </div>

      <p className="br-prose-p">{t("screen.postage.foot")}</p>
    </section>
  );
}

// ── looking after it ─────────────────────────────────────────────────────────

export function CareScreen() {
  const t = useT();
  const cards = useStore((s) => s.careCards);

  return (
    <section className="br-screen">
      <h1 className="br-h1">{t("screen.care.title")}</h1>
      <p className="br-lede">{t("screen.care.intro")}</p>

      <div className="br-cards">
        {cards.map((card) => (
          <div key={card.key} className="br-panel br-care">
            <div
              className="br-care-head"
              style={{ backgroundImage: materialSurface(card.material) }}
            >
              <span className="br-care-title">
                <Icon name={MATERIALS[card.material].icon} size={18} />
                {t(`data.care.${card.key}.title` as never)}
              </span>
            </div>
            <ul className="br-care-list">
              {Array.from({ length: card.lines }, (_, i) => (
                <li key={i}>{t(`data.care.${card.key}.l${i + 1}` as never)}</li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </section>
  );
}

// ── ask us for something ─────────────────────────────────────────────────────

export function AskScreen() {
  const t = useT();
  const forms = useStore((s) => s.forms);
  const patchAsk = useStore((s) => s.patchAsk);
  const sendAsk = useStore((s) => s.sendAsk);
  const resetAsk = useStore((s) => s.resetAsk);
  const go = useStore((s) => s.go);
  const toast = useStore((s) => s.toast);

  if (forms.askSent) {
    return (
      <section className="br-screen br-narrow br-narrow--tight">
        <div className="br-panel br-confirm">
          <span className="br-confirm-mark br-confirm-mark--mail">
            <MailCheck size={24} aria-hidden="true" />
          </span>
          <h1 className="br-h1">{t("screen.ask.sent.title")}</h1>
          <p className="br-lede">{t("screen.ask.sent.body")}</p>
          <div className="br-confirm-actions">
            <button type="button" className="br-button" onClick={() => go("shop")}>
              {t("screen.confirm.back")}
            </button>
            <button type="button" className="br-button br-button--ghost" onClick={resetAsk}>
              {t("screen.ask.sent.again")}
            </button>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="br-screen br-narrow br-narrow--tight">
      <h1 className="br-h1">{t("screen.ask.title")}</h1>
      <p className="br-lede">{t("screen.ask.intro")}</p>

      <div className="br-panel br-panel-pad br-stack br-stack--tight">
        <Field label={t("screen.ask.what")}>
          <textarea
            className="br-input br-fld"
            rows={4}
            value={forms.ask.what}
            placeholder={t("screen.ask.whatPlaceholder")}
            onChange={(e) => patchAsk({ what: e.target.value })}
          />
        </Field>

        <div>
          <div className="br-label">{t("screen.ask.material")}</div>
          <div className="br-optrow">
            {MATERIAL_KEYS.map((key: MaterialKey) => (
              <button
                key={key}
                type="button"
                className="br-pill-btn br-btn"
                aria-pressed={forms.ask.material === key}
                onClick={() => patchAsk({ material: key })}
              >
                <span className="br-swatch" style={{ background: flatTint(key) }} />
                {t(`data.material.${key}.name` as never)}
              </button>
            ))}
          </div>
        </div>

        <Field label={t("screen.ask.when")}>
          <input
            className="br-input br-fld"
            value={forms.ask.when}
            placeholder={t("screen.ask.whenPlaceholder")}
            onChange={(e) => patchAsk({ when: e.target.value })}
          />
        </Field>

        <div className="br-form-2">
          <Field label={t("screen.checkout.name")}>
            <input
              className="br-input br-fld"
              value={forms.ask.name}
              placeholder={t("screen.checkout.namePlaceholder")}
              onChange={(e) => patchAsk({ name: e.target.value })}
            />
          </Field>
          <Field label={t("screen.checkout.email")}>
            <input
              className="br-input br-fld"
              value={forms.ask.email}
              placeholder={t("screen.checkout.emailPlaceholder")}
              onChange={(e) => patchAsk({ email: e.target.value })}
            />
          </Field>
        </div>

        <button
          type="button"
          className="br-button br-button--block"
          onClick={() => {
            if (forms.ask.what.trim() === "") {
              toast(t("toast.askNeedsWhat"), "warn");
              return;
            }
            sendAsk();
            toast(t("toast.askSent"), "pos");
          }}
        >
          {t("screen.ask.send")}
        </button>
        <p className="br-centre-note">{t("screen.ask.noPayment")}</p>
      </div>
    </section>
  );
}

// ── order again ──────────────────────────────────────────────────────────────

export function ReorderScreen() {
  const t = useT();
  const forms = useStore((s) => s.forms);
  const setEmail = useStore((s) => s.setReorderEmail);
  const find = useStore((s) => s.findReorders);
  const reorder = useStore((s) => s.reorder);
  const orders = useStore((s) => s.orders);
  const pastOrders = useStore((s) => s.pastOrders);
  const toast = useStore((s) => s.toast);

  const email = forms.reorderEmail.trim().toLowerCase();
  const mine = forms.reorderSearched
    ? [...pastOrders, ...orders].filter((o) => o.email.toLowerCase() === email)
    : [];

  return (
    <section className="br-screen br-narrow">
      <h1 className="br-h1">{t("screen.reorder.title")}</h1>
      <p className="br-lede">{t("screen.reorder.intro")}</p>

      <div className="br-panel br-panel-pad br-stack br-stack--tight">
        <Field label={t("screen.reorder.email")}>
          <input
            className="br-input br-fld"
            value={forms.reorderEmail}
            placeholder={t("screen.checkout.emailPlaceholder")}
            onChange={(e) => setEmail(e.target.value)}
          />
        </Field>
        <div className="br-hints">
          <button
            type="button"
            className="br-button br-button--dark"
            onClick={() => {
              find();
              const hits = [...pastOrders, ...orders].some(
                (o) => o.email.toLowerCase() === email,
              );
              if (!hits) toast(t("toast.reorderNone"), "warn");
            }}
          >
            {t("screen.reorder.find")}
          </button>
          <button
            type="button"
            className="br-hint br-btn br-mono"
            onClick={() => {
              setEmail("iris.p@example.com");
              find();
            }}
          >
            iris.p@example.com
          </button>
        </div>
      </div>

      {forms.reorderSearched && mine.length === 0 && (
        <EmptyState title={t("screen.reorder.empty")} />
      )}

      <div className="br-stack">
        {mine.map((order) => (
          <div key={order.ref} className="br-panel br-panel-pad br-stack br-stack--tight">
            <div className="br-order-head">
              <Mono className="br-order-ref">{order.ref}</Mono>
              <span className="br-order-sub">
                {day(order.placedIso)} ·{" "}
                {order.postedIso === undefined
                  ? t("screen.reorder.onBench")
                  : t("screen.reorder.postedOn", { day: shortDay(order.postedIso) })}
              </span>
              <Mono className="br-order-total">
                {cents(order.lines.reduce((sum, l) => sum + lineTotalCents(l), 0))}
              </Mono>
            </div>

            {order.lines.map((line) => {
              const product = PRODUCT_BY_KEY[line.productKey]!;
              return (
                <div key={line.id} className="br-orderline">
                  <div
                    className="br-orderline-tile br-tile"
                    style={{ backgroundImage: materialSurface(line.materialKey) }}
                  >
                    <span className="br-tile-icon">
                      <Icon name={product.icon} size={20} />
                    </span>
                  </div>
                  <div className="br-orderline-body">
                    <div className="br-orderline-head">
                      <span>{t(`data.product.${line.productKey}.name` as never)}</span>
                      <Mono className="br-orderline-qty">×{line.quantity}</Mono>
                    </div>
                    {line.note.trim() !== "" && (
                      <Mono className="br-quote-text">
                        <Typed>{`“${line.note}”`}</Typed>
                      </Mono>
                    )}
                  </div>
                </div>
              );
            })}

            <button
              type="button"
              className="br-button"
              style={{ alignSelf: "flex-start" }}
              onClick={() => {
                reorder(order.ref);
                toast(t("toast.reorderAdded"), "pos");
              }}
            >
              {t("screen.reorder.add")}
            </button>
          </div>
        ))}
      </div>
    </section>
  );
}

// ── if something's wrong ─────────────────────────────────────────────────────

const WRONG_KINDS = ["broken", "wrong", "late", "mind"] as const;

export function WrongScreen() {
  const t = useT();
  const forms = useStore((s) => s.forms);
  const patchWrong = useStore((s) => s.patchWrong);
  const sendWrong = useStore((s) => s.sendWrong);
  const resetWrong = useStore((s) => s.resetWrong);
  const go = useStore((s) => s.go);
  const toast = useStore((s) => s.toast);

  if (forms.wrongSent) {
    return (
      <section className="br-screen br-narrow br-narrow--tight">
        <div className="br-panel br-confirm">
          <span className="br-confirm-mark br-confirm-mark--mail">
            <MailCheck size={24} aria-hidden="true" />
          </span>
          <h1 className="br-h1">{t("screen.wrong.sent.title")}</h1>
          <p className="br-lede">{t("screen.wrong.sent.body")}</p>
          <div className="br-confirm-actions">
            <button type="button" className="br-button" onClick={() => go("shop")}>
              {t("screen.confirm.back")}
            </button>
            <button type="button" className="br-button br-button--ghost" onClick={resetWrong}>
              {t("screen.wrong.sent.again")}
            </button>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="br-screen br-narrow br-narrow--tight">
      <h1 className="br-h1">{t("screen.wrong.title")}</h1>
      <p className="br-lede">{t("screen.wrong.intro")}</p>

      <div className="br-panel br-panel-pad br-stack br-stack--tight">
        <Field label={t("screen.wrong.ref")}>
          <input
            className="br-input br-input--mono br-fld"
            value={forms.wrong.ref}
            placeholder="BR-2287"
            onChange={(e) => patchWrong({ ref: e.target.value })}
          />
        </Field>

        <div>
          <div className="br-label">{t("screen.wrong.what")}</div>
          <div className="br-stack br-stack--tight">
            {WRONG_KINDS.map((kind) => (
              <button
                key={kind}
                type="button"
                className="br-pick br-btn"
                aria-pressed={forms.wrong.kind === kind}
                onClick={() => patchWrong({ kind })}
              >
                <span className="br-radio" aria-hidden="true" />
                <span className="br-pick-body">
                  <span className="br-pick-label">
                    {t(`screen.wrong.kind.${kind}` as never)}
                  </span>
                  <span className="br-pick-sub">
                    {t(`screen.wrong.kind.${kind}Sub` as never)}
                  </span>
                </span>
              </button>
            ))}
          </div>
        </div>

        <Field label={t("screen.wrong.note")}>
          <textarea
            className="br-input br-fld"
            rows={3}
            value={forms.wrong.note}
            placeholder={t("screen.wrong.notePlaceholder")}
            onChange={(e) => patchWrong({ note: e.target.value })}
          />
        </Field>

        <button
          type="button"
          className="br-button br-button--block"
          onClick={() => {
            if (forms.wrong.ref.trim() === "" || forms.wrong.kind === "") {
              toast(t("toast.wrongNeedsMore"), "warn");
              return;
            }
            sendWrong();
            toast(t("toast.wrongSent"), "pos");
          }}
        >
          {t("screen.wrong.send")}
        </button>
      </div>
    </section>
  );
}

// ── 404, and the bench's holding screen ──────────────────────────────────────

export function NotFoundScreen() {
  const t = useT();
  const go = useStore((s) => s.go);
  return (
    <section className="br-screen br-notfound">
      <Mono className="br-notfound-code">{t("notFound.code")}</Mono>
      <h1 className="br-h1">{t("notFound.title")}</h1>
      <p className="br-lede">{t("notFound.body")}</p>
      <button type="button" className="br-button" onClick={() => go("shop")}>
        {t("notFound.cta")}
      </button>
    </section>
  );
}
