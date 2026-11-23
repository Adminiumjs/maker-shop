/**
 * The checkout: where the parcel goes, how it is posted, and the order placed
 * in one write: the order, its lines, their priced features and their
 * designs, and the shopper found or made by their e-mail. Adminium prices it
 * (a dry run first, then the save held to the total shown), asks the human
 * check, and keeps a retry from making a second order. Nothing is charged:
 * the studio sends an invoice — unless the studio takes payments online, and
 * then the same press places the order and takes the shopper to pay it on the
 * Stripe or PayPal page (through Adminium's pay page).
 */
import { CircleAlert, FlaskConical, Globe, Info, Lock, Mail, ReceiptText, TrendingUp, TriangleAlert } from "lucide-react";
import { useEffect, useRef, useState, type ChangeEvent } from "react";

import { NEWS_TICK } from "../../manifest/people.ts";
import { useI18n } from "../../i18n/index.tsx";
import { count, countryName, dayShort, listOf, money } from "../format.ts";
import { Mono } from "../parts.tsx";
import { chooseCountry, chooseService, chosenAbroad, firstBadField, formErrors, placeOrder, setDetails, useShop, type Details, type Field } from "../store.ts";
import { paysOnline, usePay } from "../pay.ts";
import { EmptyBasket } from "./Basket.tsx";

const FIELD_IDS: Record<Field, string> = { name: "sh-ck-name", email: "sh-ck-email", line1: "sh-ck-line1", town: "sh-ck-town", postcode: "sh-ck-postcode", phone: "sh-ck-phone" };

/** The tick's own words, in the reader's language: the sentence Adminium's consent log keeps. */
function tickWords(locale: string): string {
  const text = NEWS_TICK.wording.text as Record<string, string>;
  return text[locale] ?? text["en-US"]!;
}

export function CheckoutScreen() {
  const { t, locale } = useI18n();
  const s = useShop();
  const pay = usePay();
  const online = paysOnline(pay);
  const [pressed, setPressed] = useState(0);
  const [notListed, setNotListed] = useState(false);
  const button = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    if (pressed === 0) return;
    const bad = firstBadField();
    if (bad !== null) document.getElementById(FIELD_IDS[bad])?.focus();
  }, [pressed]);
  // The page changes under the reader: they land on its heading, and back on the link they pressed.
  const wasNotListed = useRef(false);
  useEffect(() => {
    if (notListed) document.getElementById("sh-checkout-title")?.focus();
    else if (wasNotListed.current) document.querySelector<HTMLElement>(".sh-not-listed")?.focus();
    wasNotListed.current = notListed;
  }, [notListed]);
  if (s.catalogue === null) return null;
  const m = (value: unknown) => money(value, s.config.currency, locale);
  const figures = s.basketQuote?.figures ?? null;
  const abroad = chosenAbroad(s);
  const errors = { ...(s.tried ? formErrors(s.details, abroad !== null) : {}), ...s.refusedFields };
  const service = s.catalogue.services.find((one) => String(one.id) === String(s.serviceId)) ?? null;
  // Until the owner lists a country there is no choice to make, and the page is the one it always was.
  const home = s.catalogue.studio.homeCountry ?? null;
  const countries = home === null || s.catalogue.abroad.length === 0 ? [] : [home, ...s.catalogue.abroad.map((one) => one.country)];

  const place = async () => {
    const done = await placeOrder();
    if (done === "fix") setPressed((n) => n + 1);
    if (done === "moved") button.current?.focus();
  };

  const field = (name: Field, label: string, input: { value: string; onChange: (e: ChangeEvent<HTMLInputElement>) => void; type?: string; autoComplete: string; placeholder?: string; inputMode?: "tel"; line?: string }) => {
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
          inputMode={input.inputMode}
          aria-invalid={error !== undefined}
          aria-describedby={[...(input.line === undefined ? [] : [`${id}-why`]), ...(error === undefined ? [] : [`${id}-err`])].join(" ") || undefined}
        />
        {input.line !== undefined && (
          <span id={`${id}-why`} className="sh-hint">
            {input.line}
          </span>
        )}
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

  if (notListed && countries.length > 0) {
    const studioEmail = s.catalogue.studio.email ?? null;
    return (
      <section className="sh-screen sh-narrower" aria-labelledby="sh-checkout-title">
        <div className="sh-card sh-not-served">
          <span className="sh-not-served-icon" aria-hidden="true">
            <Globe size={19} />
          </span>
          <h1 id="sh-checkout-title" className="sh-h1 sh-h1--page" tabIndex={-1}>
            {t("shop.checkout.notServed")}
          </h1>
          <p>{t("shop.checkout.servedList", { shop: s.catalogue.studio.name, list: listOf(countries.map((code) => countryName(code, locale)), locale) })}</p>
          {studioEmail !== null && (
            <>
              <p>{t("shop.checkout.writeToUs")}</p>
              <a className="sh-link" href={`mailto:${studioEmail}`}>
                <Mail size={15} aria-hidden="true" /> {studioEmail}
              </a>
            </>
          )}
          <div>
            <button type="button" className="sh-button sh-button--accent" onClick={() => setNotListed(false)}>
              {t("shop.checkout.backToCheckout")}
            </button>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="sh-screen sh-narrower" aria-labelledby="sh-checkout-title">
      {online && (pay.offer?.test === true || pay.offer?.demo === true) && (
        <p className="sh-test-band">
          <FlaskConical size={16} aria-hidden="true" />
          <span>{t(pay.offer?.demo === true ? "pay.demo" : "pay.test")}</span>
        </p>
      )}
      <h1 id="sh-checkout-title" className="sh-h1 sh-h1--page">
        {t("shop.checkout.title")}
      </h1>
      {pay.going && s.basket.length === 0 ? (
        // The order is placed and the shopper is on their way to pay it: the moment of handing over.
        <div className="sh-card sh-summary sh-handoff" role="status">
          <span className="sh-spinner" aria-hidden="true" />
          <span>{t("pay.taking")}</span>
        </div>
      ) : s.basket.length === 0 ? (
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
            {countries.length > 0 && (
              <div className="sh-form-col">
                <div className="sh-form-field">
                  <label className="sh-form-label" htmlFor="sh-ck-country">
                    {t("shop.checkout.country")}
                  </label>
                  <select id="sh-ck-country" className="sh-input" value={abroad?.country ?? home ?? ""} onChange={(e) => chooseCountry(e.target.value)} autoComplete="country">
                    {countries.map((code) => (
                      <option key={code} value={code}>
                        {countryName(code, locale)}
                      </option>
                    ))}
                  </select>
                </div>
                <button type="button" className="sh-link-button sh-not-listed" onClick={() => setNotListed(true)}>
                  {t("shop.checkout.notListed")}
                </button>
                {abroad !== null &&
                  field("phone", t("shop.checkout.phone"), {
                    value: s.details.phone,
                    onChange: typed("phone"),
                    type: "tel",
                    inputMode: "tel",
                    autoComplete: "tel",
                    line: t("shop.checkout.phoneWhy", { country: countryName(home ?? "", locale) }),
                  })}
                {abroad !== null && (
                  <p className="sh-note">
                    <Info size={16} aria-hidden="true" />
                    <span>{t("shop.checkout.importCharges")}</span>
                  </p>
                )}
              </div>
            )}
          </fieldset>

          {abroad === null && (
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
          )}

          {online ? (
            <div className="sh-invoice sh-pay-line">
              <Lock size={16} aria-hidden="true" />
              <span className="sh-pay-text">
                <span className="sh-pay-now">{t("pay.checkout.now", { amount: s.shownTotal === null ? "…" : m(s.shownTotal) })}</span>
                <span className="sh-hint">{t("pay.checkout.where")}</span>
              </span>
            </div>
          ) : (
            <p className="sh-invoice">
              <ReceiptText size={16} aria-hidden="true" />
              {t("shop.checkout.invoice")}
            </p>
          )}

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
              <span>{abroad !== null ? t("shop.sum.delivery") : (service?.name ?? t("shop.sum.postage"))}</span>
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
              aria-busy={s.checking || pay.going}
              aria-disabled={s.checking || pay.going || s.shownTotal === null}
              onClick={() => {
                if (!s.checking && !pay.going && s.shownTotal !== null) void place();
              }}
            >
              {(s.checking || pay.going) && <span className="sh-spinner" aria-hidden="true" />}
              <span>
                {pay.going
                  ? t("pay.taking")
                  : s.checking
                    ? t("shop.checkout.checking")
                    : s.priceMoves !== null
                      ? t("shop.checkout.orderAt", { total: m(s.shownTotal) })
                      : online
                        ? t("pay.checkout.place", { amount: m(s.shownTotal) })
                        : t("shop.checkout.place")}
              </span>
            </button>
            {pay.going && (
              <span className="sh-sr" role="status">
                {t("pay.taking")}
              </span>
            )}
          </div>
        </div>
      )}
    </section>
  );
}
