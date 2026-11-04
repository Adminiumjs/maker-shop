/**
 * A piece's page: its material, size, finish and quantity, the words to put
 * on it or the Customiser's "Make it yours", and what it costs.
 *
 * Every price on it is a dry run's: one line for the quantity chosen and one
 * for each of the piece's quantity breaks, in one dry run of a one-line
 * order, so the chips and the total are the figures the save would write.
 * The differences on the material and size choices are the option rows as
 * the studio typed them. The post-by date is the one Adminium stamps.
 */
import { ArrowLeft, CalendarDays, MailCheck, Minus, PenLine, Plus, Ruler, TriangleAlert, WandSparkles } from "lucide-react";
import { useState } from "react";

import { useI18n } from "../../i18n/index.tsx";
import { count, dayShort, money, percent, signedMoney } from "../format.ts";
import { Mono, PieceIcon, Swatch, Tile } from "../parts.tsx";
import { addChoiceToBasket, breaksOf, choose, figuresFor, goView, openProduct, optionById, optionsOf, productOf, requoteProduct, toast, useShop } from "../store.ts";
import { rich } from "../words.tsx";

const ANGLES = ["shop.product.angle.front", "shop.product.angle.threeQuarter", "shop.product.angle.top", "shop.product.angle.detail"] as const;

export function ProductScreen() {
  const { t, locale } = useI18n();
  const code = useShop((s) => s.productCode);
  const catalogue = useShop((s) => s.catalogue);
  const currency = useShop((s) => s.config.currency);
  const choice = useShop((s) => s.choice);
  const quote = useShop((s) => s.productQuote);
  const [angle, setAngle] = useState(0);
  const product = productOf(code);
  if (catalogue === null) return null;
  if (product === null) {
    return (
      <section className="sh-screen sh-empty" aria-labelledby="sh-gone-title">
        <h1 id="sh-gone-title" className="sh-empty-title">
          {t("shop.product.gone.title")}
        </h1>
        <p>{t("shop.product.gone.body")}</p>
        <button type="button" className="sh-button sh-button--accent" onClick={() => goView("shop")}>
          {t("shop.back.shop")}
        </button>
      </section>
    );
  }

  const m = (value: unknown) => money(value, currency, locale);
  const materials = optionsOf(product.id, "material");
  const sizes = optionsOf(product.id, "size");
  const finishes = optionsOf(product.id, "finish");
  const breaks = breaksOf(product.id);
  const chosenMaterial = optionById(choice.materialId);
  const tintOf = (materialId: unknown) => catalogue.materials.find((x) => String(x.id) === String(materialId))?.tint ?? null;
  const tint = tintOf(chosenMaterial?.materialId ?? product.materialId);
  const line = figuresFor(choice.qty);
  const busy = quote?.state === "busy" && line === null;
  const failed = quote?.state === "failed";
  const takesWords = product.takesLettering && product.baseId === null;
  const limit = product.letteringLimit ?? 0;
  const used = [...choice.lettering].length;
  const room = limit - used;
  const over = takesWords && limit > 0 && room < 0;
  const nearEdge = takesWords && used > 0 && room >= 0 && room <= 3;
  const customiseHref = `${import.meta.env.BASE_URL ?? "/"}piece/${encodeURIComponent(product.code)}/customise`;
  const facts: [string, string | null][] = [
    [t("shop.product.fact.madeFrom"), product.madeFrom],
    [t("shop.product.fact.size"), product.sizeText === null ? null : product.unit === "each" ? product.sizeText : `${product.sizeText}, ${product.unit}`],
    [t("shop.product.fact.finished"), product.finishedWith],
    [t("shop.product.fact.howLong"), t("shop.product.fact.howLongValue", { days: product.leadDays })],
    [t("shop.product.fact.care"), product.care],
  ];

  const add = () => {
    if (addChoiceToBasket() === null) return;
    toast(takesWords && choice.lettering.trim() !== "" ? "shop.toast.addedWords" : "shop.toast.added", { piece: product.name });
    goView("basket");
  };

  return (
    <section className="sh-screen" aria-labelledby="sh-product-title">
      <button type="button" className="sh-back" onClick={() => goView("shop")}>
        <ArrowLeft size={15} aria-hidden="true" className="sh-flip" />
        {t("shop.product.back")}
      </button>
      <div className="sh-product">
        <div className="sh-gallery">
          <Tile tint={tint} angle={angle} photo={product.photo} className="sh-gallery-main">
            {product.photo === null && (
              <span className={`sh-tile-icon sh-tile-icon--big sh-angle-${angle}`}>
                <PieceIcon name={product.icon} size={84} />
              </span>
            )}
            {product.sizeText !== null && <Mono className="sh-tile-chip sh-tile-chip--start">{product.sizeText}</Mono>}
            {chosenMaterial !== null && <span className="sh-tile-chip sh-tile-chip--end">{chosenMaterial.name}</span>}
          </Tile>
          <div className="sh-thumbs">
            {ANGLES.map((key, i) => (
              <button key={key} type="button" className="sh-thumb" aria-label={t(key)} aria-pressed={angle === i} onClick={() => setAngle(i)}>
                <Tile tint={tint} angle={i} photo={product.photo}>
                  {product.photo === null && (
                    <span className={`sh-tile-icon sh-thumb-${i}`}>
                      <PieceIcon name={product.icon} size={22} />
                    </span>
                  )}
                  <span className="sh-thumb-label" aria-hidden="true">
                    {t(key)}
                  </span>
                </Tile>
              </button>
            ))}
          </div>
        </div>

        <div className="sh-options">
          <div>
            <h1 id="sh-product-title" className="sh-h1 sh-h1--product">
              {product.name}
            </h1>
            <div className="sh-each" aria-busy={busy}>
              <Mono className="sh-each-price">{line === null ? "…" : m(line["each"])}</Mono>
              <span className="sh-each-suffix">{product.unit === "each" ? t("shop.product.eachSuffix") : t("shop.product.perSuffix", { unit: product.unit })}</span>
            </div>
            {product.madeFrom !== null && <p className="sh-lede sh-lede--product">{product.madeFrom}</p>}
          </div>

          {materials.length > 0 && (
            <fieldset className="sh-field">
              <legend className="sh-field-label">{t("shop.product.material")}</legend>
              <div className="sh-choices">
                {materials.map((o) => {
                  const delta = signedMoney(o.price, currency, locale);
                  return (
                    <button key={String(o.id)} type="button" className="sh-choice sh-choice--material" aria-pressed={String(choice.materialId) === String(o.id)} onClick={() => choose({ materialId: o.id })}>
                      <Tile tint={tintOf(o.materialId)} className="sh-choice-tile" />
                      <span className="sh-choice-text">
                        <span className="sh-choice-name">{o.name}</span>
                        <Mono className={delta === null ? "sh-delta" : delta.sign > 0 ? "sh-delta sh-delta--up" : "sh-delta sh-delta--down"}>
                          {delta === null ? t("shop.product.noChange") : t("shop.product.deltaEach", { delta: delta.text })}
                        </Mono>
                      </span>
                    </button>
                  );
                })}
              </div>
            </fieldset>
          )}

          {sizes.length > 0 && (
            <fieldset className="sh-field">
              <legend className="sh-field-label">{t("shop.product.size")}</legend>
              <div className="sh-choices">
                {sizes.map((o) => {
                  const delta = signedMoney(o.price, currency, locale);
                  return (
                    <button key={String(o.id)} type="button" className="sh-choice sh-choice--stack" aria-pressed={String(choice.sizeId) === String(o.id)} onClick={() => choose({ sizeId: o.id })}>
                      <span className="sh-choice-name">{o.name}</span>
                      <Mono className={delta === null ? "sh-delta" : "sh-delta sh-delta--up"}>{delta === null ? t("shop.product.included") : delta.text}</Mono>
                    </button>
                  );
                })}
              </div>
            </fieldset>
          )}

          {finishes.length > 0 && (
            <fieldset className="sh-field">
              <legend className="sh-field-label">{product.finishLabel ?? t("shop.product.finish")}</legend>
              <div className="sh-choices">
                {finishes.map((o) => (
                  <button key={String(o.id)} type="button" className="sh-choice sh-choice--pill" aria-pressed={String(choice.finishId) === String(o.id)} onClick={() => choose({ finishId: o.id })}>
                    <Swatch colour={o.swatch} />
                    <span>{o.name}</span>
                  </button>
                ))}
              </div>
            </fieldset>
          )}

          <fieldset className="sh-field">
            <legend className="sh-field-label sh-field-label--row">
              <span>{t("shop.product.howMany")}</span>
              <span className="sh-hint">{breaks.length > 1 ? t("shop.product.breaksHint", { qty: breaks[1]!.minQty ?? 0 }) : t("shop.product.oneAtATime")}</span>
            </legend>
            <div className="sh-qty-row">
              <div className="sh-stepper">
                <button type="button" aria-label={t("shop.qty.fewer")} onClick={() => choose({ qty: choice.qty - 1 })} disabled={choice.qty <= 1}>
                  <Minus size={15} aria-hidden="true" />
                </button>
                <Mono className="sh-stepper-value">
                  <span className="sh-sr">{t("shop.qty.label")} </span>
                  {count(choice.qty, locale)}
                </Mono>
                <button type="button" aria-label={t("shop.qty.more")} onClick={() => choose({ qty: choice.qty + 1 })} disabled={choice.qty >= 50}>
                  <Plus size={15} aria-hidden="true" />
                </button>
              </div>
              {breaks.length > 1 &&
                breaks.map((b) => {
                  const at = figuresFor(b.minQty ?? 1);
                  return (
                    <button key={String(b.id)} type="button" className="sh-break" aria-pressed={choice.qty === b.minQty} onClick={() => choose({ qty: b.minQty ?? 1 })}>
                      <Mono className="sh-break-qty">×{count(b.minQty ?? 1, locale)}</Mono>
                      <Mono className="sh-break-each">{at === null ? "…" : t("shop.product.eachShort", { price: m(at["each"]) })}</Mono>
                      <span className={(b.minQty ?? 1) <= 1 ? "sh-break-save" : "sh-break-save sh-break-save--off"}>{(b.minQty ?? 1) <= 1 ? t("shop.product.plainPrice") : t("shop.product.off", { percent: percent(at === null ? b.percentOff : String(at["percent_off"] ?? b.percentOff), locale) })}</span>
                    </button>
                  );
                })}
            </div>
          </fieldset>

          {takesWords && (
            <div className="sh-card sh-yours">
              <div className="sh-yours-head">
                <span className="sh-yours-icon">
                  <PenLine size={16} aria-hidden="true" />
                </span>
                <span className="sh-yours-title">{t("shop.product.yours")}</span>
              </div>
              <div className="sh-yours-body">
                <label className="sh-words" htmlFor="sh-words">
                  <span className="sh-words-head">
                    <span>{product.letteringPrompt ?? t("shop.product.wordsPrompt")}</span>
                    <Mono className={over ? "sh-counter sh-counter--over" : nearEdge ? "sh-counter sh-counter--near" : "sh-counter"}>
                      {count(used, locale)} / {count(limit, locale)}
                    </Mono>
                  </span>
                </label>
                <textarea
                  id="sh-words"
                  className={over ? "sh-input sh-words-input sh-input--bad" : nearEdge ? "sh-input sh-words-input sh-input--near" : "sh-input sh-words-input"}
                  rows={2}
                  value={choice.lettering}
                  placeholder={t("shop.product.wordsPlaceholder")}
                  aria-invalid={over}
                  aria-describedby={over || nearEdge ? "sh-words-help" : undefined}
                  onChange={(e) => choose({ lettering: e.target.value })}
                />
                {nearEdge && (
                  <div id="sh-words-help" className="sh-note">
                    <Ruler size={16} aria-hidden="true" />
                    <span>{t("shop.product.nearEdge")}</span>
                  </div>
                )}
                {over && (
                  <div id="sh-words-help" className="sh-note sh-note--bad">
                    <TriangleAlert size={16} aria-hidden="true" />
                    <span>{t("shop.product.overLimit", { over: -room })}</span>
                  </div>
                )}
                {product.letteringHint !== null && <p className="sh-small">{product.letteringHint}</p>}
                <div className="sh-yours-foot">
                  <MailCheck size={16} aria-hidden="true" className="sh-pos" />
                  <span>{t("shop.product.proofPromise")}</span>
                </div>
              </div>
            </div>
          )}

          {product.baseId !== null && (
            <div className="sh-card sh-yours">
              <div className="sh-yours-head">
                <span className="sh-yours-icon">
                  <PenLine size={16} aria-hidden="true" />
                </span>
                <span className="sh-yours-title">{t("shop.product.yours")}</span>
              </div>
              <div className="sh-yours-body">
                <p className="sh-small sh-small--lead">{t("shop.product.customiseLead")}</p>
                <a
                  className="sh-button sh-button--accent sh-button--start"
                  href={customiseHref}
                  onClick={(e) => {
                    e.preventDefault();
                    openProduct(product.code, "customise");
                  }}
                >
                  <WandSparkles size={15} aria-hidden="true" />
                  {t("shop.product.yours")}
                </a>
                <div className="sh-yours-foot">
                  <MailCheck size={16} aria-hidden="true" className="sh-pos" />
                  <span>{t("shop.product.proofPromise")}</span>
                </div>
              </div>
            </div>
          )}

          <dl className="sh-facts">
            {facts
              .filter((f): f is [string, string] => f[1] !== null)
              .map(([k, v]) => (
                <div key={k} className="sh-fact">
                  <dt className="sh-kicker">{k}</dt>
                  <dd>{v}</dd>
                </div>
              ))}
          </dl>

          <div className="sh-total-bar">
            <div className="sh-total-text" aria-live="polite" aria-busy={busy}>
              <span className="sh-hint">{choice.qty > 1 ? <Mono>{`${count(choice.qty, locale)} × ${line === null ? "…" : m(line["each"])}`}</Mono> : t("shop.product.oneMade")}</span>
              <Mono className="sh-total-price">{line === null ? "…" : m(line["line_total"])}</Mono>
            </div>
            <button type="button" className="sh-button sh-button--accent sh-button--big" onClick={add} disabled={line === null}>
              {t("shop.product.add")}
            </button>
          </div>
          {failed ? (
            <div className="sh-note sh-note--bad" role="alert">
              <TriangleAlert size={16} aria-hidden="true" />
              <span>{t("shop.product.priceFailed")}</span>
              <button type="button" className="sh-link-button" onClick={() => requoteProduct()}>
                {t("shop.retry")}
              </button>
            </div>
          ) : (
            <div className="sh-ship">
              <CalendarDays size={15} aria-hidden="true" />
              <Mono>{line === null ? "…" : rich(t, "shop.product.postBy", { day: dayShort(line["post_by"], locale) })}</Mono>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
