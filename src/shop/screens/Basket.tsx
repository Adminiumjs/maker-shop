/**
 * The basket: each line as the shopper chose it, priced by a dry run of the
 * whole order (its lines, its postage for the parcel's weight, its total),
 * asked again on every change.
 */
import { Minus, Package, Plus, ShoppingBag, TriangleAlert } from "lucide-react";

import type { MessageKey } from "../../i18n/index.tsx";
import { useI18n } from "../../i18n/index.tsx";
import { count, dayLong, money } from "../format.ts";
import { Mono, PieceIcon, Tile } from "../parts.tsx";
import type { Figures, Row } from "../port.ts";
import { basketQty, basketRemove, goView, openProduct, optionById, productById, requoteBasket, useShop, type BasketLine } from "../store.ts";
import { rich } from "../words.tsx";

/** The words a design puts on the piece, part by part. */
export function designWords(line: BasketLine): string[] {
  const parts = line.design?.values.parts ?? {};
  return Object.values(parts)
    .map((part) => (typeof part.text === "string" ? part.text.trim() : ""))
    .filter((text) => text !== "");
}

/** The line of the order whose post-by is the order's: the one the parcel waits for. */
export function longestLine(figures: Figures): Row | null {
  return figures.lines.find((line) => String(line["post_by"]) === String(figures.order["post_by"])) ?? null;
}

export function EmptyBasket({ titleId }: { titleId?: string }) {
  const { t } = useI18n();
  return (
    <div className="sh-card sh-empty-card">
      <span className="sh-empty-icon">
        <ShoppingBag size={21} aria-hidden="true" />
      </span>
      <div id={titleId} className="sh-empty-title">
        {t("shop.basket.empty.title")}
      </div>
      <p className="sh-small">{t("shop.basket.empty.body")}</p>
      <button type="button" className="sh-button sh-button--accent" onClick={() => goView("shop")}>
        {t("shop.back.shop")}
      </button>
    </div>
  );
}

/** Why Adminium refused a line, in the shopper's words. */
export function lineRefusal(reason: string | null): MessageKey {
  return reason === null ? "shop.refused.line" : reason.startsWith("feature") ? "shop.refused.feature" : reason === "design-unknown" ? "shop.refused.designGone" : "shop.refused.design";
}

export function BasketScreen() {
  const { t, locale } = useI18n();
  const basket = useShop((s) => s.basket);
  const quote = useShop((s) => s.basketQuote);
  const catalogue = useShop((s) => s.catalogue);
  const currency = useShop((s) => s.config.currency);
  const refusedLine = useShop((s) => s.refusedLine);
  if (catalogue === null) return null;
  const m = (value: unknown) => money(value, currency, locale);
  const figures = quote?.figures ?? null;
  const longest = figures === null ? null : longestLine(figures);

  return (
    <section className="sh-screen sh-narrow" aria-labelledby="sh-basket-title">
      <h1 id="sh-basket-title" className="sh-h1 sh-h1--page">
        {t("shop.basket.title")}
      </h1>
      {basket.length === 0 ? (
        <EmptyBasket />
      ) : (
        <div className="sh-stack">
          <ul className="sh-stack sh-lines" aria-label={t("shop.basket.lines")}>
            {basket.map((line, i) => {
              const product = productById(line.productId);
              const figure = figures?.lines[i] ?? null;
              const material = optionById(line.materialId);
              const tint = catalogue.materials.find((x) => String(x.id) === String(material?.materialId ?? product?.materialId))?.tint ?? null;
              const words = designWords(line);
              const chips = [material?.name, optionById(line.sizeId)?.name, optionById(line.finishId)?.name].filter((c): c is string => c !== undefined);
              const refused = refusedLine?.index === i ? refusedLine : null;
              return (
                <li key={line.id} className="sh-card sh-line">
                  <Tile tint={tint} className="sh-line-thumb">
                    {line.design === null ? (
                      <span className="sh-tile-icon">
                        <PieceIcon name={product?.icon ?? null} size={26} />
                      </span>
                    ) : (
                      <span className="sh-line-design" role="img" aria-label={t("shop.basket.designAlt", { words: words.join(", ") })}>
                        {words.slice(0, 3).map((w, k) => (
                          <span key={k}>{w}</span>
                        ))}
                      </span>
                    )}
                  </Tile>
                  <div className="sh-line-body">
                    <div className="sh-line-head">
                      <span className="sh-line-name">{product?.name ?? ""}</span>
                      <Mono className="sh-line-total">{figure === null ? "…" : m(figure["line_total"])}</Mono>
                    </div>
                    {chips.length > 0 && (
                      <div className="sh-line-chips">
                        {chips.map((c) => (
                          <span key={c} className="sh-pill">
                            {c}
                          </span>
                        ))}
                      </div>
                    )}
                    {line.lettering !== null && line.design === null && (
                      <div className="sh-asked">
                        <span className="sh-hint">{t("shop.basket.youAsked")}</span>
                        <Mono>“{line.lettering}”</Mono>
                      </div>
                    )}
                    {refused !== null && (
                      <div className="sh-note sh-note--bad" role="alert">
                        <TriangleAlert size={16} aria-hidden="true" />
                        <span>{t(lineRefusal(refused.reason))}</span>
                      </div>
                    )}
                    <div className="sh-line-actions">
                      <div className="sh-stepper sh-stepper--small">
                        <button type="button" aria-label={t("shop.qty.fewerOf", { piece: product?.name ?? "" })} onClick={() => basketQty(line.id, -1)} disabled={line.qty <= 1}>
                          <Minus size={14} aria-hidden="true" />
                        </button>
                        <Mono className="sh-stepper-value">
                          <span className="sh-sr">{t("shop.qty.label")} </span>
                          {count(line.qty, locale)}
                        </Mono>
                        <button type="button" aria-label={t("shop.qty.moreOf", { piece: product?.name ?? "" })} onClick={() => basketQty(line.id, 1)} disabled={line.qty >= 50}>
                          <Plus size={14} aria-hidden="true" />
                        </button>
                      </div>
                      <Mono className="sh-hint">{figure === null ? "" : t("shop.product.eachShort", { price: m(figure["each"]) })}</Mono>
                      {line.design !== null && product !== null && (
                        <a
                          className="sh-link sh-push"
                          href={`${import.meta.env.BASE_URL ?? "/"}piece/${encodeURIComponent(product.code)}/customise`}
                          onClick={(e) => {
                            e.preventDefault();
                            openProduct(product.code, "customise", line.id);
                          }}
                        >
                          {t("shop.basket.editDesign")}
                        </a>
                      )}
                      <button type="button" className={line.design === null ? "sh-remove sh-push" : "sh-remove"} onClick={() => basketRemove(line.id)}>
                        {t("shop.basket.remove")}
                        <span className="sh-sr"> {product?.name ?? ""}</span>
                      </button>
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>

          <div className="sh-card sh-summary" aria-live="polite" aria-busy={quote?.state === "busy"}>
            <div className="sh-sum-row">
              <span>{t("shop.sum.pieces")}</span>
              <Mono>{figures === null ? "…" : m(figures.order["pieces_total"])}</Mono>
            </div>
            <div className="sh-sum-row">
              <span>{t("shop.sum.postage")}</span>
              <Mono>{figures === null ? "…" : m(figures.order["postage"])}</Mono>
            </div>
            <div className="sh-sum-total">
              <span>{t("shop.sum.total")}</span>
              <Mono>{figures === null ? "…" : m(figures.order["total"])}</Mono>
            </div>
            {quote?.state === "failed" ? (
              <div className="sh-note sh-note--bad" role="alert">
                <TriangleAlert size={16} aria-hidden="true" />
                <span>{t("shop.basket.priceFailed")}</span>
                <button type="button" className="sh-link-button" onClick={() => requoteBasket()}>
                  {t("shop.retry")}
                </button>
              </div>
            ) : (
              longest !== null && (
                <div className="sh-ship-note">
                  <Package size={17} aria-hidden="true" />
                  <span>{rich(t, "shop.basket.ship", { days: <Mono>{count(Number(longest["lead_days"] ?? 0), locale)}</Mono>, day: <Mono>{dayLong(figures!.order["post_by"], locale)}</Mono> })}</span>
                </div>
              )
            )}
            <button type="button" className="sh-button sh-button--accent sh-button--wide" onClick={() => goView("checkout")}>
              {t("shop.basket.checkout")}
            </button>
          </div>
        </div>
      )}
    </section>
  );
}
