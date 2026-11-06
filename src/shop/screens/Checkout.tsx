/**
 * The checkout: where the parcel goes, how it is posted, and the order placed
 * in one write: the order, its lines, their priced features and their
 * designs, and the shopper found or made by their e-mail. Adminium prices it
 * (a dry run first, then the save held to the total shown), asks the human
 * check, and keeps a retry from making a second order. Nothing is charged:
 * the studio sends an invoice.
 */
import { CircleAlert, ReceiptText, TrendingUp, TriangleAlert } from "lucide-react";
import { useEffect, useRef, useState, type ChangeEvent } from "react";

import { NEWS_TICK } from "../../manifest/people.ts";
import { useI18n } from "../../i18n/index.tsx";
import { count, dayShort, money } from "../format.ts";
import { Mono } from "../parts.tsx";
import { chooseService, firstBadField, formErrors, placeOrder, setDetails, useShop, type Details, type Field } from "../store.ts";
import { EmptyBasket } from "./Basket.tsx";

const FIELD_IDS: Record<Field, string> = { name: "sh-ck-name", email: "sh-ck-email", line1: "sh-ck-line1", town: "sh-ck-town", postcode: "sh-ck-postcode" };

/** The tick's own words, in the reader's language: the sentence Adminium's consent log keeps. */
function tickWords(locale: string): string {
  const text = NEWS_TICK.wording.text as Record<string, string>;
  return text[locale] ?? text["en-US"]!;
}

export function CheckoutScreen() {
  const { t, locale } = useI18n();
  const s = useShop();
  const [pressed, setPressed] = useState(0);
  const button = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    if (pressed === 0) return;
    const bad = firstBadField();
    if (bad !== null) document.getElementById(FIELD_IDS[bad])?.focus();
  }, [pressed]);
  if (s.catalogue === null) return null;
  const m = (value: unknown) => money(value, s.config.currency, locale);
  const figures = s.basketQuote?.figures ?? null;
  const errors = { ...(s.tried ? formErrors(s.details) : {}), ...s.refusedFields };
  const service = s.catalogue.services.find((one) => String(one.id) === String(s.serviceId)) ?? null;

  const place = async () => {
    const done = await placeOrder();
    if (done === "fix") setPressed((n) => n + 1);
    if (done === "moved") button.current?.focus();
  };

  const field = (name: Field, label: string, input: { value: string; onChange: (e: ChangeEvent<HTMLInputElement>) => void; type?: string; autoComplete: string; placeholder?: string }) => {
    const error = errors[name];
    const id = FIELD_IDS[name];
    return (
      <div className="sh-form-field">
        <label className="sh-form-label" htmlFor={id}>
          {label}
        </label>
        <input
          id={id}
          className={error === undefined ? "sh-input" : "sh-input sh-input--bad"}
          type={input.type ?? "text"}
          value={input.value}
          onChange={input.onChange}
          autoComplete={input.autoComplete}
          placeholder={input.placeholder}
          aria-invalid={error !== undefined}
          aria-describedby={error === undefined ? undefined : `${id}-err`}
        />
        {error !== undefined && (
          <span id={`${id}-err`} className="sh-field-error">
            <CircleAlert size={14} aria-hidden="true" />
            {t(error)}
          </span>
        )}
      </div>
    );
  };
  const typed = (key: keyof Details) => (e: ChangeEvent<HTMLInputElement>) => setDetails({ [key]: e.target.value });

  return (
    <section className="sh-screen sh-narrower" aria-labelledby="sh-checkout-title">
      <h1 id="sh-checkout-title" className="sh-h1 sh-h1--page">
        {t("shop.checkout.title")}
      </h1>
      {s.basket.length === 0 ? (
        <EmptyBasket />
      ) : (
        <div className="sh-stack">
          <fieldset className="sh-card sh-form">
            <legend className="sh-card-title">{t("shop.checkout.where")}</legend>
            <div className="sh-form-grid">
              {field("name", t("shop.checkout.name"), { value: s.details.name, onChange: typed("name"), autoComplete: "name" })}
              <div className="sh-form-col">
                {field("email", t("shop.checkout.email"), { value: s.details.email, onChange: typed("email"), type: "email", autoComplete: "email", placeholder: t("shop.checkout.emailPlaceholder") })}
                <div className="sh-tick">
                  <label className="sh-tick-label">
                    <input type="checkbox" checked={s.details.news} onChange={(e) => setDetails({ news: e.target.checked })} aria-describedby="sh-ck-news-line" />
                    <span>{tickWords(locale)}</span>
                  </label>
                  <span id="sh-ck-news-line" className="sh-tick-line">
                    {t("shop.checkout.newsLine")}
                  </span>
                </div>
              </div>
            </div>
            <div className="sh-form-grid">
              {field("line1", t("shop.checkout.line1"), { value: s.details.line1, onChange: typed("line1"), autoComplete: "address-line1", placeholder: t("shop.checkout.line1Placeholder") })}
              <div className="sh-form-field">
                <label className="sh-form-label" htmlFor="sh-ck-line2">
                  {t("shop.checkout.line2")}
                </label>
                <input id="sh-ck-line2" className="sh-input" value={s.details.line2} onChange={typed("line2")} autoComplete="address-line2" />
              </div>
              {field("town", t("shop.checkout.town"), { value: s.details.town, onChange: typed("town"), autoComplete: "address-level2" })}
              {field("postcode", t("shop.checkout.postcode"), { value: s.details.postcode, onChange: typed("postcode"), autoComplete: "postal-code" })}
            </div>
          </fieldset>

          <div className="sh-card sh-form">
            <h2 id="sh-ck-post" className="sh-card-title">
              {t("shop.checkout.how")}
            </h2>
            <div role="radiogroup" aria-labelledby="sh-ck-post" className="sh-services">
              {s.catalogue.services.map((one) => {
                const chosen = String(one.id) === String(s.serviceId);
                const price = s.servicePostage[String(one.id)];
                return (
                  <button key={String(one.id)} type="button" role="radio" aria-checked={chosen} className="sh-service" onClick={() => chooseService(one.id)}>
                    <span className="sh-radio" aria-hidden="true" />
                    <span className="sh-service-text">
                      <span className="sh-service-name">{one.name}</span>
                      {one.detail !== null && <span className="sh-hint">{one.detail}</span>}
                    </span>
                    <Mono className="sh-service-price">{price === undefined ? "…" : m(price)}</Mono>
                  </button>
                );
              })}
            </div>
            <div className="sh-hint">{t("shop.checkout.onePostage")}</div>
          </div>

          <p className="sh-invoice">
            <ReceiptText size={16} aria-hidden="true" />
            {t("shop.checkout.invoice")}
          </p>

          <div className={s.priceMoves === null ? "sh-card sh-summary sh-summary--quiet" : "sh-card sh-summary sh-summary--moved"} aria-busy={s.basketQuote?.state === "busy"}>
            {s.priceMoves !== null && (
              <div className="sh-moved" role="alert">
                <div className="sh-moved-head">
                  <TrendingUp size={17} aria-hidden="true" />
                  <span>{t("shop.checkout.moved")}</span>
                </div>
                {s.priceMoves.map((move, i) => (
                  <div key={i} className="sh-moved-row">
                    <span className="sh-moved-name">{move.name}</span>
                    <Mono className="sh-hint">×{count(move.qty, locale)}</Mono>
                    <span className="sh-moved-figures">
                      <Mono className="sh-was">{t("shop.product.eachShort", { price: m(move.was) })}</Mono>
                      <Mono className="sh-now">{t("shop.product.eachShort", { price: m(move.now) })}</Mono>
                    </span>
                  </div>
                ))}
              </div>
            )}
            <div className="sh-sum-row">
              <span>{t("shop.sum.pieces")}</span>
              <Mono>{figures === null ? "…" : m(figures.order["pieces_total"])}</Mono>
            </div>
            <div className="sh-sum-row">
              <span>{service?.name ?? t("shop.sum.postage")}</span>
              <Mono>{figures === null ? "…" : m(figures.order["postage"])}</Mono>
            </div>
            <div className="sh-sum-total">
              <span>{t("shop.sum.total")}</span>
              <Mono>{figures === null ? "…" : m(figures.order["total"])}</Mono>
            </div>
            {figures !== null && <Mono className="sh-post-by">{t("shop.checkout.postBy", { day: dayShort(figures.order["post_by"], locale) })}</Mono>}
            {s.failure !== null && (
              <div className="sh-note sh-note--bad" role="alert">
                <TriangleAlert size={16} aria-hidden="true" />
                <span>{t(s.failure === "unreachable" ? "shop.checkout.unreachable" : s.failure === "closed" ? "shop.checkout.closed" : "shop.checkout.refusedLine")}</span>
              </div>
            )}
            <button
              ref={button}
              type="button"
              className="sh-button sh-button--accent sh-button--wide"
              aria-busy={s.checking}
              aria-disabled={s.checking || s.shownTotal === null}
              onClick={() => {
                if (!s.checking && s.shownTotal !== null) void place();
              }}
            >
              {s.checking && <span className="sh-spinner" aria-hidden="true" />}
              <span>{s.checking ? t("shop.checkout.checking") : s.priceMoves !== null ? t("shop.checkout.orderAt", { total: m(s.shownTotal) }) : t("shop.checkout.place")}</span>
            </button>
          </div>
        </div>
      )}
    </section>
  );
}
