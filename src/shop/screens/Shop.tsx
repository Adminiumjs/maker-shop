/**
 * The shop: every piece the studio has in the shop, filtered by what it is and
 * what it is made of. The pieces, their prices and their materials are the
 * catalogue's rows as the studio typed them.
 */
import { Hammer } from "lucide-react";

import { useI18n } from "../../i18n/index.tsx";
import { count, money } from "../format.ts";
import { Mono, PieceIcon, Swatch, Tile } from "../parts.tsx";
import { openProduct, optionsOf, setFilter, useShop } from "../store.ts";
import type { Material, Product } from "../port.ts";
import { categoryKey, rich } from "../words.tsx";

/** The material families a piece can be had in: its own, and its material options'. */
function familiesOf(product: Product, materials: readonly Material[]): string[] {
  const ids = [product.materialId, ...optionsOf(product.id, "material").map((o) => o.materialId)].filter((id) => id !== null).map(String);
  return [...new Set(materials.filter((m) => ids.includes(String(m.id))).map((m) => m.family))];
}

export function ShopScreen() {
  const { t, locale } = useI18n();
  const catalogue = useShop((s) => s.catalogue);
  const currency = useShop((s) => s.config.currency);
  const category = useShop((s) => s.category);
  const family = useShop((s) => s.family);
  if (catalogue === null) return null;
  const { products, materials } = catalogue;

  const categories = [...new Set(products.map((p) => p.category))];
  const families = [...new Set(products.flatMap((p) => familiesOf(p, materials)))];
  const tintOf = (name: string) => materials.find((m) => m.family === name)?.tint ?? null;
  const list = products.filter((p) => (category === "all" || p.category === category) && (family === "all" || familiesOf(p, materials).includes(family)));

  return (
    <section className="sh-screen" aria-labelledby="sh-shop-title">
      <div className="sh-intro">
        <span className="sh-badge">
          <Hammer size={14} aria-hidden="true" />
          {t("shop.home.badge")}
        </span>
        <h1 id="sh-shop-title" className="sh-h1">
          {catalogue.studio.name}
        </h1>
        {catalogue.studio.about !== null && <p className="sh-lede">{catalogue.studio.about}</p>}
      </div>

      <div className="sh-filters">
        <div className="sh-filter-row" role="group" aria-labelledby="sh-filter-what">
          <span id="sh-filter-what" className="sh-kicker sh-filter-label">
            {t("shop.home.filter.what")}
          </span>
          {["all", ...categories].map((c) => (
            <button key={c} type="button" className="sh-chip" aria-pressed={category === c} onClick={() => setFilter({ category: c })}>
              {c === "all" ? t("shop.home.filter.everything") : t(categoryKey(c))}
            </button>
          ))}
        </div>
        <div className="sh-filter-row" role="group" aria-labelledby="sh-filter-material">
          <span id="sh-filter-material" className="sh-kicker sh-filter-label">
            {t("shop.home.filter.material")}
          </span>
          {["all", ...families].map((f) => (
            <button key={f} type="button" className="sh-chip" aria-pressed={family === f} onClick={() => setFilter({ family: f })}>
              <Swatch colour={f === "all" ? null : tintOf(f)} shape="square" size={11} />
              {f === "all" ? t("shop.home.filter.any") : f}
            </button>
          ))}
        </div>
      </div>

      {list.length === 0 ? (
        <div className="sh-empty">
          <div className="sh-empty-title">{t("shop.home.empty.title")}</div>
          <div>{t("shop.home.empty.body")}</div>
        </div>
      ) : (
        <ul className="sh-grid" aria-label={t("shop.home.list")}>
          {list.map((p) => {
            const material = materials.find((m) => String(m.id) === String(p.materialId));
            return (
              <li key={String(p.id)}>
                <button type="button" className="sh-piece" onClick={() => openProduct(p.code)}>
                  <Tile tint={material?.tint ?? null} photo={p.photo} className="sh-piece-tile">
                    {p.photo === null && (
                      <span className="sh-tile-icon">
                        <PieceIcon name={p.icon} size={52} />
                      </span>
                    )}
                    {p.sizeText !== null && <Mono className="sh-tile-chip sh-tile-chip--start">{p.sizeText}</Mono>}
                    {(p.takesLettering || p.baseId !== null) && <span className="sh-tile-chip sh-tile-chip--end">{t("shop.home.tile.yours")}</span>}
                  </Tile>
                  <span className="sh-piece-body">
                    <span className="sh-piece-head">
                      <span className="sh-piece-name">{p.name}</span>
                      <Mono className="sh-piece-price">{money(p.price, currency, locale)}</Mono>
                    </span>
                    <span className="sh-piece-material">{t("shop.home.tile.made", { material: material?.family ?? "", unit: p.unit })}</span>
                    <span className="sh-piece-chips">
                      <span className="sh-pill sh-pill--accent">{t("shop.home.tile.madeToOrder")}</span>
                      <span className="sh-pill">{rich(t, "shop.home.tile.lead", { days: <Mono>{count(p.leadDays, locale)}</Mono> })}</span>
                    </span>
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
