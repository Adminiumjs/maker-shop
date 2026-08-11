/**
 * The basket, the till and the confirmation.
 *
 * THE BASKET QUOTES THE SHOPPER'S OWN WORDS BACK. The note goes in a mono
 * quote beside the line, because "what did I ask for?" is the question a
 * made-to-order basket has to answer and the exact wording is the answer.
 *
 * Underneath each line is a slot an add-on would fill with a picture of the
 * actual piece. WITH NOTHING CONNECTED IT RENDERS NOTHING AT ALL — no dashed
 * box, no placeholder — because the quoted note is already complete, and a
 * dashed rectangle under every line would be the app apologising for a feature
 * nobody has asked for.
 *
 * The ship-by comes from the LONGEST lead time in the basket and the studio
 * calendar, so one glazed mug turns a box of coasters into a ten-day box.
 */

import { Info, Minus, Package, Plus } from "lucide-react";

import { Icon } from "../components/Icon.tsx";
import { EmptyState, Field, Mono, Tile, Typed } from "../components/Primitives.tsx";
import { AddOnSlot } from "../components/AddOnSlot.tsx";
import { basketItem, checkoutItems, shopClock, SHOP_ORIGIN } from "../add-ons/records.ts";
import { useI18n, useT } from "../i18n/index.tsx";
import { PRODUCT_BY_KEY } from "../lib/catalogue.ts";
import { cents, day } from "../lib/format.ts";
import {
  POSTAGE,
  eachPriceCents,
  lineTotalCents,
  longestLeadDays,
  piecesTotalCents,
  shipByFor,
  unitPriceCents,
  type PostageKey,
} from "../lib/orders.ts";
import { useStore, useToday } from "../state/store.ts";

const POSTAGE_OPTIONS: { key: PostageKey; labelKey: string; subKey: string }[] = [
  { key: "second", labelKey: "screen.postage.second.label", subKey: "screen.postage.second.sub" },
  {
    key: "tracked",
    labelKey: "screen.postage.tracked.label",
    subKey: "screen.postage.tracked.sub",
  },
];

function useBasketTotals() {
  const basket = useStore((s) => s.basket);
  const postage = useStore((s) => s.postage);
  const deliveryChoice = useStore((s) => s.deliveryChoice);
  const now = useStore((s) => s.now);
  const today = useToday();

  const pieces = piecesTotalCents(basket);
  /*
   * ONE CARRIAGE LINE, AND AN ADD-ON'S QUOTE WINS WHEN THERE IS ONE. The
   * alternative — showing both, or showing the studio's while charging the
   * carrier's — is how a till ends up with two prices and no way to tell which
   * one the shopper agreed to.
   */
  const post =
    deliveryChoice === null ? POSTAGE[postage] : Math.round(deliveryChoice.amount * 100);
  return {
    basket,
    pieces,
    post,
    deliveryChoice,
    total: pieces + post,
    lead: longestLeadDays(basket),
    shipBy: shipByFor(basket, { ...now, iso: today }),
  };
}

export function BasketScreen() {
  const t = useT();
  const { number } = useI18n();
  const go = useStore((s) => s.go);
  const setQuantity = useStore((s) => s.setBasketQuantity);
  const removeLine = useStore((s) => s.removeLine);
  const toast = useStore((s) => s.toast);
  const { basket, pieces, post, total, lead, shipBy } = useBasketTotals();

  if (basket.length === 0) {
    return (
      <section className="br-screen br-narrow">
        <h1 className="br-h1">{t("screen.basket.title")}</h1>
        <EmptyState title={t("screen.basket.empty.title")} body={t("screen.basket.empty.body")}>
          <button type="button" className="br-button" onClick={() => go("shop")}>
            {t("screen.basket.empty.cta")}
          </button>
        </EmptyState>
      </section>
    );
  }

  return (
    <section className="br-screen br-narrow">
      <h1 className="br-h1">{t("screen.basket.title")}</h1>

      <div className="br-stack">
        {basket.map((line) => {
          const product = PRODUCT_BY_KEY[line.productKey]!;
          const unit = unitPriceCents(product, line.materialKey, line.sizeKey);
          const each = eachPriceCents(unit, line.quantity);
          const size = product.sizes.find((s) => s.key === line.sizeKey);

          return (
            <div key={line.id} className="br-line br-panel">
              <Tile
                material={line.materialKey}
                icon={<Icon name={product.icon} size={26} />}
                className="br-line-tile"
              />
              <div className="br-line-body">
                <div className="br-line-head">
                  <span className="br-line-name">
                    {t(`data.product.${line.productKey}.name` as never)}
                  </span>
                  <Mono className="br-line-total">{cents(lineTotalCents(line))}</Mono>
                </div>

                <div className="br-line-chips">
                  <span className="br-pill">
                    {t(`data.material.${line.materialKey}.name` as never)}
                  </span>
                  {size !== undefined && (
                    <span className="br-pill">{t(`data.size.${size.key}` as never)}</span>
                  )}
                  <span className="br-pill">
                    {t(`data.finish.${line.finishKey}` as never)}
                  </span>
                </div>

                {line.note.trim() !== "" && (
                  <div className="br-quote">
                    <span className="br-quote-label">{t("screen.basket.youAskedFor")}</span>
                    <Mono className="br-quote-text">
                      <Typed>{`“${line.note}”`}</Typed>
                    </Mono>
                  </div>
                )}

                {/*
                 * `cart.line.preview` — SILENT when empty, so no fallback is
                 * passed and nothing at all renders. Deliberate: the quoted
                 * note above already answers the only question this line has to
                 * answer, and a dashed "your preview would go here" box under
                 * every line would be the defect rather than the feature.
                 */}
                <AddOnSlot
                  slot="cart.line.preview"
                  payload={{
                    line: basketItem(line, t(`data.product.${line.productKey}.name` as never)),
                  }}
                />


                <div className="br-line-foot">
                  <div className="br-stepper br-stepper--sm">
                    <button
                      type="button"
                      className="br-btn"
                      aria-label={t("screen.product.qty.fewer")}
                      onClick={() => setQuantity(line.id, -1)}
                    >
                      <Minus size={14} aria-hidden="true" />
                    </button>
                    <Mono className="br-stepper-value">{number(line.quantity)}</Mono>
                    <button
                      type="button"
                      className="br-btn"
                      aria-label={t("screen.product.qty.more")}
                      onClick={() => setQuantity(line.id, 1)}
                    >
                      <Plus size={14} aria-hidden="true" />
                    </button>
                  </div>
                  <Mono className="br-line-each">
                    {t("screen.basket.each", { amount: cents(each) })}
                  </Mono>
                  <button
                    type="button"
                    className="br-linkbtn br-btn"
                    onClick={() => {
                      removeLine(line.id);
                      toast(t("toast.removed"));
                    }}
                  >
                    {t("screen.basket.remove")}
                  </button>
                </div>
              </div>
            </div>
          );
        })}

        <div className="br-panel br-summary">
          <div className="br-summary-row">
            <span>{t("screen.basket.pieces")}</span>
            <Mono>{cents(pieces)}</Mono>
          </div>
          <div className="br-summary-row">
            <span>{t("screen.basket.postage")}</span>
            <Mono>{cents(post)}</Mono>
          </div>
          <div className="br-summary-total">
            <span>{t("screen.basket.total")}</span>
            <Mono>{cents(total)}</Mono>
          </div>
          {shipBy !== null && (
            <div className="br-note">
              <Package size={17} aria-hidden="true" />
              <span>{t("screen.basket.ship", { days: lead, day: day(shipBy) })}</span>
            </div>
          )}
          <button
            type="button"
            className="br-button br-button--block"
            onClick={() => go("checkout")}
          >
            {t("screen.basket.checkout")}
          </button>
        </div>
      </div>
    </section>
  );
}

export function CheckoutScreen() {
  const t = useT();
  const details = useStore((s) => s.details);
  const setDetails = useStore((s) => s.setDetails);
  const postage = useStore((s) => s.postage);
  const setPostage = useStore((s) => s.setPostage);
  const placeOrder = useStore((s) => s.placeOrder);
  const { basket, pieces, post, total, shipBy, deliveryChoice } = useBasketTotals();
  const chooseDelivery = useStore((s) => s.chooseAddOnDelivery);
  // The studio's pinned hour, and the day "+1 studio day" has moved us to.
  const now = useStore((s) => s.now);
  const today = useToday();

  if (basket.length === 0) return <BasketScreen />;

  return (
    <section className="br-screen br-narrow">
      <h1 className="br-h1">{t("screen.checkout.title")}</h1>

      <div className="br-stack">
        <div className="br-panel br-panel-pad">
          <div className="br-panel-title">{t("screen.checkout.where")}</div>
          <div className="br-form-2">
            <Field label={t("screen.checkout.name")}>
              <input
                className="br-input br-fld"
                value={details.name}
                placeholder={t("screen.checkout.namePlaceholder")}
                onChange={(e) => setDetails({ name: e.target.value })}
              />
            </Field>
            <Field label={t("screen.checkout.email")}>
              <input
                className="br-input br-fld"
                value={details.email}
                placeholder={t("screen.checkout.emailPlaceholder")}
                onChange={(e) => setDetails({ email: e.target.value })}
              />
            </Field>
          </div>
          <Field label={t("screen.checkout.address")}>
            <textarea
              className="br-input br-fld"
              rows={3}
              value={details.address}
              placeholder={t("screen.checkout.addressPlaceholder")}
              onChange={(e) => setDetails({ address: e.target.value })}
            />
          </Field>
        </div>

        <div className="br-panel br-panel-pad">
          <div className="br-panel-title">{t("screen.checkout.how")}</div>
          <div className="br-stack br-stack--tight">
            {POSTAGE_OPTIONS.map((option) => (
              <button
                key={option.key}
                type="button"
                className="br-pick br-btn"
                aria-pressed={postage === option.key}
                onClick={() => setPostage(option.key)}
              >
                <span className="br-radio" aria-hidden="true" />
                <span className="br-pick-body">
                  <span className="br-pick-label">{t(option.labelKey as never)}</span>
                  <span className="br-pick-sub">{t(option.subKey as never)}</span>
                </span>
                <Mono>{cents(POSTAGE[option.key])}</Mono>
              </button>
            ))}
          </div>
          {/*
           * `checkout.delivery.methods` — SPEAKS when empty. A delivery
           * company's services would list here; with nothing connected the
           * studio says whose options these are, which is a settled fact rather
           * than a gap.
           */}
          <AddOnSlot
            slot="checkout.delivery.methods"
            payload={{
              /*
               * THE BASKET, MAPPED INTO NEUTRAL LINES. It used to be
               * `{ postage }` — this app's own postage KEY, which is the one
               * thing a delivery company has no use for: it names an option the
               * studio sells. What a carrier needs is what is in the box, and
               * that is a label, a quantity, a weight and a size.
               */
              items: checkoutItems(basket, (key) => t(`data.product.${key}.name` as never)),
              // Where the studio posts from. A shop knows its own address; the
              // add-on that used to hold one held another shop's.
              origin: SHOP_ORIGIN,
              /*
               * The studio's record, handed back down so the fill draws the
               * selection rather than remembering one of its own — and scoped by
               * add-on key, so a second delivery company's rows do not light up
               * because the first one's did.
               */
              chosen: deliveryChoice,
              onChoose: chooseDelivery,
              /*
               * WHEN THE STUDIO THINKS IT IS. "Arrives Friday" is arithmetic on
               * today, so a till quoting from the add-on's own pinned Wednesday
               * would print a date the rest of the page disagrees with.
               */
              now: shopClock(today, now),
              /*
               * AND WHEN THERE WILL BE SOMETHING TO COLLECT. This studio makes
               * every piece after it is ordered, so the panel two blocks up
               * already says "posted by …"; without this the carrier quoted
               * transit from today and the same screen offered a delivery date
               * BEFORE the day the studio said it would post. `shipByFor` is
               * the same call that draws that line, so the two cannot disagree.
               */
              ...(shipBy === null ? {} : { readyOn: shipBy }),
            }}
            fallback={<div className="br-slot-line">{t("screen.checkout.ownOptions")}</div>}
          />
        </div>

        <div className="br-panel br-panel-pad">
          <div className="br-panel-title">{t("screen.checkout.payment")}</div>
          <div className="br-note br-note--info">
            <Info size={17} aria-hidden="true" />
            <span>{t("screen.checkout.demo")}</span>
          </div>
          <div className="br-form-2">
            <Field label={t("screen.checkout.card")}>
              <input
                dir="ltr"
                className="br-input br-input--mono br-fld"
                value="4242 4242 4242 4242"
                readOnly
              />
            </Field>
            <Field label={t("screen.checkout.expiry")}>
              <input
                dir="ltr"
                className="br-input br-input--mono br-fld"
                value="04/29 · 123"
                readOnly
              />
            </Field>
          </div>
        </div>

        <div className="br-panel br-summary br-summary--muted">
          <div className="br-summary-row">
            <span>{t("screen.basket.pieces")}</span>
            <Mono>{cents(pieces)}</Mono>
          </div>
          <div className="br-summary-row">
            <span>
              {/* The add-on's own words for its own service, already in the
                  reader's language, when the shopper picked one. */}
              {deliveryChoice !== null
                ? deliveryChoice.label
                : postage === "tracked"
                  ? t("screen.postage.tracked.label")
                  : t("screen.postage.second.label")}
            </span>
            <Mono>{cents(post)}</Mono>
          </div>
          <div className="br-summary-total">
            <span>{t("screen.basket.total")}</span>
            <Mono>{cents(total)}</Mono>
          </div>
          {shipBy !== null && (
            <div className="br-summary-note">{t("screen.confirm.postedBy")}: {day(shipBy)}</div>
          )}
          <button type="button" className="br-button br-button--block" onClick={placeOrder}>
            {t("screen.checkout.place")}
          </button>
        </div>
      </div>
    </section>
  );
}

export function ConfirmScreen() {
  const t = useT();
  const placed = useStore((s) => s.placed);
  const go = useStore((s) => s.go);
  const setLookup = useStore((s) => s.setLookup);
  const doLookup = useStore((s) => s.doLookup);

  if (placed === null) return <BasketScreen />;

  return (
    <section className="br-screen br-narrow br-narrow--tight">
      <div className="br-panel br-confirm">
        <span className="br-confirm-mark">✓</span>
        <h1 className="br-h1">{t("screen.confirm.title")}</h1>
        <p className="br-lede">{t("screen.confirm.body")}</p>

        <div className="br-rows">
          <div className="br-row">
            <span>{t("screen.confirm.ref")}</span>
            <Mono className="br-row-strong">{placed.ref}</Mono>
          </div>
          <div className="br-row">
            <span>{t("screen.confirm.postedBy")}</span>
            <Mono className="br-row-strong">
              {placed.postBy === null ? "—" : day(placed.postBy)}
            </Mono>
          </div>
          <div className="br-row">
            <span>{t("screen.confirm.paid")}</span>
            <Mono className="br-row-strong">{cents(placed.totalCents)}</Mono>
          </div>
        </div>

        <p className="br-confirm-proof">
          {placed.needsProof ? t("screen.confirm.proofYes") : t("screen.confirm.proofNo")}
        </p>

        <div className="br-confirm-actions">
          <button
            type="button"
            className="br-button"
            onClick={() => {
              setLookup({ ref: placed.ref, email: "" });
              go("order");
              doLookup();
            }}
          >
            {t("screen.confirm.look")}
          </button>
          <button type="button" className="br-button br-button--ghost" onClick={() => go("shop")}>
            {t("screen.confirm.back")}
          </button>
        </div>
      </div>
    </section>
  );
}
