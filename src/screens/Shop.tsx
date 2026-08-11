/**
 * The shop and a piece's page.
 *
 * TWO THINGS ON THESE SCREENS ARE LOAD-BEARING and everything else is dressing:
 *
 *   1. THERE ARE NO STOCK COUNTS ANYWHERE (24 D5b). Nothing here is held on a
 *      shelf, so a "3 left" chip would be a lie about the business as well as a
 *      lie about the data. Where a material is running short the tile says
 *      "made in small batches while the board lasts" — a plain sentence a
 *      shopper can understand, not a countdown invented to hurry them up.
 *
 *   2. "MAKE IT YOURS" IS A FINISHED SCREEN, NOT A PLACEHOLDER (24 D19). With
 *      no add-on connected, a personalizable piece gets a note field with a
 *      live counter, the maker's own instructions, and the promise of a picture
 *      before anything is cut. That is how most small shops genuinely work, so
 *      it is designed as a complete thing — and the Live Personalizer add-on
 *      later replaces this whole block with a live preview, which is a visible
 *      increase in capability rather than the repair of a broken page.
 */

import { useState } from "react";

import { ArrowLeft, Calendar, Hammer, MailCheck, Minus, PenLine, Plus } from "lucide-react";

import { Icon } from "../components/Icon.tsx";
import { Chip, EmptyState, Mono, Tile } from "../components/Primitives.tsx";
import { AddOnSlot } from "../components/AddOnSlot.tsx";
import { hostProduct } from "../add-ons/records.ts";
import { useI18n, useT } from "../i18n/index.tsx";
import {
  CATEGORY_KEYS,
  MATERIAL_KEYS,
  PRODUCTS,
  PRODUCT_BY_KEY,
  QUANTITY_BREAKS,
  type Product,
} from "../lib/catalogue.ts";
import { cents, day, flatTint, mm } from "../lib/format.ts";
import {
  eachPriceCents,
  leadDaysFor,
  materialRunningLow,
  shipByFor,
  stockLines,
  unitPriceCents,
} from "../lib/orders.ts";
import { useStore, useToday } from "../state/store.ts";

const ANGLES = ["data.angle.front", "data.angle.threeQuarter", "data.angle.top", "data.angle.detail"];

/** One card in the grid. Shared by the shop and the search results. */
export function PieceTile({ product, lowMaterial }: { product: Product; lowMaterial: boolean }) {
  const t = useT();
  const openProduct = useStore((s) => s.openProduct);
  const size = product.sizes[0]!;

  return (
    <button type="button" className="br-piece br-card br-btn" onClick={() => openProduct(product.key)}>
      <Tile
        material={product.material}
        icon={<Icon name={product.icon} size={52} />}
        chip={<Mono>{mm(size.widthMm, size.heightMm)}</Mono>}
        badge={
          product.personalize !== undefined ? t("screen.shop.tile.personalize") : undefined
        }
        className="br-piece-tile"
      />
      <span className="br-piece-body">
        <span className="br-piece-head">
          <span className="br-piece-name">{t(`data.product.${product.key}.name` as never)}</span>
          <Mono className="br-piece-price">{cents(product.basePriceCents)}</Mono>
        </span>
        <span className="br-piece-material">
          {t(`data.material.${product.material}.name` as never)} ·{" "}
          {t(`data.unit.${product.unit}` as never)}
        </span>
        <span className="br-piece-chips">
          <span className="br-pill br-pill--accent">{t("screen.shop.tile.madeToOrder")}</span>
          <span className="br-pill">
            {t("screen.shop.tile.lead", { days: leadDaysFor(product.key) })}
          </span>
        </span>
        {/*
         * WHAT IS ACTUALLY RUNNING LOW, NAMED. This line read "Made in small
         * batches while the board lasts" for every piece in the shop — on a
         * stoneware mug, which is thrown and glazed and was never near a board,
         * and on a printed pot, which is filament. `materialRunningLow` already
         * knows which shelf it looked at; the sentence now says so, and the
         * only inventory this shop has stays the only thing it can mean.
         */}
        {lowMaterial && (
          <span className="br-piece-note">
            {t("screen.shop.tile.smallBatch", {
              material: t(`data.runsOut.${product.material}` as never),
            })}
          </span>
        )}
      </span>
    </button>
  );
}

export function ShopScreen() {
  const t = useT();
  const category = useStore((s) => s.category);
  const material = useStore((s) => s.material);
  const setCategory = useStore((s) => s.setCategory);
  const setMaterial = useStore((s) => s.setMaterial);
  const materials = useStore((s) => s.materials);
  const orders = useStore((s) => s.orders);

  const shelf = stockLines(materials, orders);

  const list = PRODUCTS.filter(
    (p) =>
      (category === "all" || p.category === category) &&
      (material === "all" || p.materials.some((m) => m.key === material)),
  );

  return (
    <section className="br-screen">
      <div className="br-hero">
        <span className="br-badge">
          <Hammer size={14} aria-hidden="true" />
          {t("screen.shop.badge")}
        </span>
        <h1 className="br-h1">{t("screen.shop.title")}</h1>
        <p className="br-lede">{t("screen.shop.intro")}</p>
      </div>

      <div className="br-filters">
        <div className="br-filter-row">
          <Mono className="br-filter-label">{t("screen.shop.filter.what")}</Mono>
          <button
            type="button"
            className="br-pill-btn br-btn"
            aria-pressed={category === "all"}
            onClick={() => setCategory("all")}
          >
            {t("screen.shop.filter.everything")}
          </button>
          {CATEGORY_KEYS.map((key) => (
            <button
              key={key}
              type="button"
              className="br-pill-btn br-btn"
              aria-pressed={category === key}
              onClick={() => setCategory(key)}
            >
              {t(`data.category.${key}` as never)}
            </button>
          ))}
        </div>
        <div className="br-filter-row">
          <Mono className="br-filter-label">{t("screen.shop.filter.material")}</Mono>
          <button
            type="button"
            className="br-pill-btn br-btn"
            aria-pressed={material === "all"}
            onClick={() => setMaterial("all")}
          >
            {t("screen.shop.filter.anyMaterial")}
          </button>
          {MATERIAL_KEYS.map((key) => (
            <button
              key={key}
              type="button"
              className="br-pill-btn br-btn"
              aria-pressed={material === key}
              onClick={() => setMaterial(key)}
            >
              <span className="br-swatch" style={{ background: flatTint(key) }} />
              {t(`data.material.${key}.short` as never)}
            </button>
          ))}
        </div>
      </div>

      {list.length === 0 ? (
        <EmptyState title={t("screen.shop.empty.title")} body={t("screen.shop.empty.body")} />
      ) : (
        <div className="br-grid">
          {list.map((product) => (
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

export function ProductScreen() {
  const t = useT();
  const { number } = useI18n();
  const productKey = useStore((s) => s.productKey);
  const config = useStore((s) => s.config);
  const angle = useStore((s) => s.angle);
  const setAngle = useStore((s) => s.setAngle);
  const patchConfig = useStore((s) => s.patchConfig);
  /* The maker's own switch, on the bench's Products screen. Turning it off
     takes the note field off the shop's page — a setting a shopper can see. */
  const personalizeOn = useStore((s) => s.personalizeOn);
  const addToBasket = useStore((s) => s.addToBasket);
  const go = useStore((s) => s.go);
  const now = useStore((s) => s.now);
  const today = useToday();
  const toast = useStore((s) => s.toast);

  /*
   * WHY THE ADD-ON SAYS THIS PIECE CANNOT BE ADDED YET, in its own words.
   *
   * The shop's own gate is a character count: type past the limit and
   * `addToBasket` opens the warning instead of adding. An add-on that REPLACES
   * this block brings rules this app cannot know — a name that will not fit the
   * area at any size the studio cuts, a letter the alphabet does not have — and
   * with no way to say so it did the worst available thing instead: it wrote an
   * EMPTY note whenever a zone failed, so the words a customer had typed
   * disappeared and the button stayed green.
   *
   * `undefined` means nothing is in the way. The sentence is the add-on's,
   * already translated, because the rule is the add-on's; this app renders it
   * and closes its own button. When the add-on is switched off in the dock its
   * fill unmounts and clears this on the way out, which is why turning it off
   * cannot leave a shop unable to sell anything.
   */
  const [addOnBlock, setAddOnBlock] = useState<string | undefined>(undefined);

  const product = productKey === null ? undefined : PRODUCT_BY_KEY[productKey];
  if (product === undefined || config === null) return null;

  const unit = unitPriceCents(product, config.materialKey, config.sizeKey);
  const each = eachPriceCents(unit, config.quantity);
  const size = product.sizes.find((s) => s.key === config.sizeKey) ?? product.sizes[0]!;
  const lead = leadDaysFor(product.key);
  const shipBy = shipByFor([{ productKey: product.key }], { ...now, iso: today });

  const limit = product.personalize?.limitChars ?? 0;
  const used = config.note.length;
  const left = limit - used;
  const counterTone = left < 0 ? "danger" : left <= 3 ? "warn" : "subtle";

  const finishLabelKey =
    product.finishLabel === "glaze"
      ? "screen.product.glaze"
      : product.finishLabel === "colour"
        ? "screen.product.colour"
        : "screen.product.finish";

  return (
    <section className="br-screen">
      <button type="button" className="br-backlink br-btn" onClick={() => go("shop")}>
        <ArrowLeft size={15} aria-hidden="true" />
        {t("screen.product.back")}
      </button>

      <div className="br-product">
        <div className="br-gallery">
          <Tile
            material={config.materialKey}
            icon={<Icon name={product.icon} size={84} />}
            angle={angle}
            chip={<Mono>{mm(size.widthMm, size.heightMm)}</Mono>}
            badge={t(`data.material.${config.materialKey}.name` as never)}
            className="br-gallery-main"
          />
          <div className="br-thumbs">
            {ANGLES.map((key, i) => (
              <button
                key={key}
                type="button"
                className="br-thumb br-btn"
                aria-pressed={angle === i}
                aria-label={t(key as never)}
                onClick={() => setAngle(i)}
              >
                <Tile
                  material={config.materialKey}
                  icon={<Icon name={product.icon} size={22} />}
                  angle={i}
                  chip={<Mono>{t(key as never)}</Mono>}
                />
              </button>
            ))}
          </div>
        </div>

        <div className="br-options">
          <div>
            <h1 className="br-h1">{t(`data.product.${product.key}.name` as never)}</h1>
            <div className="br-price-row">
              <Mono className="br-price-big">{cents(each)}</Mono>
              <span className="br-price-suffix">
                {t("screen.product.eachSuffix", {
                  unit: t(`data.unit.${product.unit}` as never),
                })}
              </span>
            </div>
            <p className="br-lede">{t(`data.product.${product.key}.madeFrom` as never)}</p>
          </div>

          {product.materials.length > 1 && (
            <div className="br-optgroup">
              <div className="br-optgroup-head">{t("screen.product.material")}</div>
              <div className="br-optrow">
                {product.materials.map((m) => (
                  <Chip
                    key={m.key}
                    selected={config.materialKey === m.key}
                    tile={m.key}
                    label={t(`data.material.${m.key}.name` as never)}
                    sub={
                      m.deltaCents === 0
                        ? t("screen.product.delta.none")
                        : m.deltaCents > 0
                          ? t("screen.product.delta.plus", { amount: cents(m.deltaCents) })
                          : t("screen.product.delta.minus", { amount: cents(-m.deltaCents) })
                    }
                    onClick={() => patchConfig({ materialKey: m.key })}
                  />
                ))}
              </div>
            </div>
          )}

          {product.sizes.length > 1 && (
            <div className="br-optgroup">
              <div className="br-optgroup-head">{t("screen.product.size")}</div>
              <div className="br-optrow">
                {product.sizes.map((s) => (
                  <Chip
                    key={s.key}
                    selected={config.sizeKey === s.key}
                    label={t(`data.size.${s.key}` as never)}
                    sub={mm(s.widthMm, s.heightMm)}
                    foot={
                      s.deltaCents === 0
                        ? t("screen.product.size.included")
                        : t("screen.product.size.plus", { amount: cents(s.deltaCents) })
                    }
                    onClick={() => patchConfig({ sizeKey: s.key })}
                  />
                ))}
              </div>
            </div>
          )}

          <div className="br-optgroup">
            <div className="br-optgroup-head">{t(finishLabelKey as never)}</div>
            <div className="br-optrow">
              {product.finishes.map((f) => (
                <Chip
                  key={f.key}
                  selected={config.finishKey === f.key}
                  swatch={f.swatch}
                  label={t(`data.finish.${f.key}` as never)}
                  onClick={() => patchConfig({ finishKey: f.key })}
                />
              ))}
            </div>
          </div>

          <div className="br-optgroup">
            <div className="br-optgroup-head br-optgroup-head--split">
              <span>{t("screen.product.qty")}</span>
              <span className="br-optgroup-hint">
                {product.breaks
                  ? t("screen.product.qty.hintBreaks")
                  : t("screen.product.qty.hintSingle")}
              </span>
            </div>
            <div className="br-optrow">
              <div className="br-stepper">
                <button
                  type="button"
                  className="br-btn"
                  aria-label={t("screen.product.qty.fewer")}
                  onClick={() => patchConfig({ quantity: config.quantity - 1 })}
                >
                  <Minus size={15} aria-hidden="true" />
                </button>
                <Mono className="br-stepper-value">{number(config.quantity)}</Mono>
                <button
                  type="button"
                  className="br-btn"
                  aria-label={t("screen.product.qty.more")}
                  onClick={() => patchConfig({ quantity: config.quantity + 1 })}
                >
                  <Plus size={15} aria-hidden="true" />
                </button>
              </div>

              {product.breaks &&
                QUANTITY_BREAKS.map((q) => {
                  const at = eachPriceCents(unit, q);
                  const saved = (unit - at) * q;
                  return (
                    <Chip
                      key={q}
                      selected={config.quantity === q}
                      label={<Mono>×{number(q)}</Mono>}
                      sub={t("screen.product.break.each", { amount: cents(at) })}
                      foot={
                        q === 1
                          ? t("screen.product.break.plain")
                          : t("screen.product.break.saves", { amount: cents(saved) })
                      }
                      onClick={() => patchConfig({ quantity: q })}
                    />
                  );
                })}
            </div>
          </div>

          {product.personalize !== undefined && personalizeOn[product.key] !== false && (
            <>
              {/*
               * `product.options.personalize` — the slot that SPEAKS when it is
               * empty, and whose empty state is this whole panel (24 D19). The
               * note field with its live counter, the maker's instructions and
               * the proof promise are not a placeholder waiting for an add-on:
               * they are how most small shops genuinely work, and they are
               * designed as a finished thing. An add-on replaces the block
               * wholesale with a live preview; nothing else on the page moves.
               */}
              <AddOnSlot
                slot="product.options.personalize"
                /*
                 * `note` AND `setNote` ARE THE WHOLE INTEGRATION, and they are
                 * this shop's OWN free-text field rather than anything the
                 * add-on invents. What a line stores is the shopper's own words
                 * — a plain string, which is what a shop with nothing connected
                 * has and what this slot's empty state is built around (D19).
                 * An add-on that replaces this block writes the words back
                 * through the same setter, so the basket line reads the same
                 * either way and a disconnect leaves the request in plain
                 * language rather than inside a picture nobody can open (D16).
                 *
                 * IT USED TO BE `{ product, config, patchConfig }` — this app's
                 * whole configuration record and its whole setter — and the one
                 * add-on that had ever been mounted here wrote down
                 * `payload.config.note` and `payload.patchConfig` as its
                 * payload type. That is Birch Row's record layout living in an
                 * add-on's repo, and it is why the same add-on could not have
                 * run anywhere else.
                 */
                payload={{
                  product: hostProduct(product, t(`data.product.${product.key}.name` as never)),
                  note: config.note,
                  setNote: (note: string) => patchConfig({ note }),
                  setBlocked: setAddOnBlock,
                  /*
                   * THE TWO SENTENCES THE STUDIO WROTE, HANDED OVER SO AN
                   * ADD-ON CANNOT DELETE THEM.
                   *
                   * This is a `single` slot: a mounted fill takes the whole
                   * block below, and the block below is three parts — the
                   * field, the maker's instructions for this piece, and the
                   * promise that a picture comes back first. A fill that draws
                   * a live preview has improved on the last two. A fill that
                   * falls back to a plain note field, which the personalizer
                   * does for every piece the studio has not drawn areas on,
                   * has not — and it was dropping both, so connecting an
                   * add-on took the studio's own words off ten of its twelve
                   * personalizable pieces.
                   *
                   * They are resolved here rather than passed as keys because
                   * they are THIS shop's copy in the reader's language, and an
                   * add-on has no business looking anything up in the host's
                   * bundle (D21).
                   */
                  hostSays: [
                    t(`data.personalHint.${product.personalize.hintKey}` as never),
                    t("screen.product.personal.proof"),
                  ],
                }}
                fallback={
              <div className="br-personal">
                <div className="br-personal-head">
                  <span className="br-personal-mark">
                    <PenLine size={16} aria-hidden="true" />
                  </span>
                  <span>{t("screen.product.personal.title")}</span>
                </div>
                <div className="br-personal-body">
                  <label className="br-field">
                    <span className="br-personal-label">
                      <span>{t("screen.product.personal.prompt", { limit })}</span>
                      <Mono data-tone={counterTone} className="br-counter">
                        {t("screen.product.personal.counter", {
                          used: number(used),
                          limit: number(limit),
                        })}
                      </Mono>
                    </span>
                    <textarea
                      className="br-input br-fld"
                      data-tone={counterTone}
                      rows={2}
                      value={config.note}
                      placeholder={t("screen.product.personal.placeholder")}
                      onChange={(e) => patchConfig({ note: e.target.value })}
                    />
                  </label>

                  {left < 0 && (
                    <div className="br-note br-note--danger">
                      {t("screen.product.personal.over", { over: -left })}
                    </div>
                  )}

                  <p className="br-personal-hint">
                    {t(`data.personalHint.${product.personalize.hintKey}` as never)}
                  </p>

                  <div className="br-personal-promise">
                    <MailCheck size={16} aria-hidden="true" />
                    {t("screen.product.personal.proof")}
                  </div>
                </div>
              </div>
                }
              />
              {/*
               * ── THE LINE THAT USED TO BE HERE, AND WHY IT IS NOT ──────────
               *
               * `<div className="br-slot-line">This is the only part of this
               * page an add-on changes.</div>`, rendered unconditionally
               * directly under the mount. It was defended on the grounds that
               * it "belongs to the PAGE rather than to the slot, so it stays
               * put whichever of the two the slot renders". Both halves of
               * that were wrong.
               *
               * IT IS THE SHOPPER'S PAGE. Somebody buying a set of coasters is
               * not told which parts of a shop's website are supplied by
               * software the shop bought. That sentence is written to a
               * reviewer, and a reviewer has the dock and the Add-ons shelf,
               * which are surfaces built to say exactly this.
               *
               * IT IS ALSO MUTANT B, VERBATIM — same class, same markup, a bare
               * run of words immediately after a slot mount, captioning
               * whatever the add-on drew the moment one is switched on. It
               * escaped the guard only because this slot is declared `speaks`
               * and the guard is scoped to silent ones, which is an accident of
               * scope rather than a difference in kind.
               */}
            </>
          )}

          <div className="br-facts">
            <Fact
              k={t("screen.product.facts.madeFrom")}
              v={t(`data.product.${product.key}.madeFrom` as never)}
            />
            <Fact k={t("screen.product.facts.size")} v={mm(size.widthMm, size.heightMm)} mono />
            <Fact
              k={t("screen.product.facts.finished")}
              v={t(`data.finishedBy.${config.materialKey}` as never)}
            />
            <Fact
              k={t("screen.product.facts.howLong")}
              v={t("screen.product.facts.howLongValue", { days: lead })}
            />
            <Fact
              k={t("screen.product.facts.care")}
              v={t(`data.careSummary.${config.materialKey}` as never)}
            />
          </div>

          <div className="br-buybar">
            <div className="br-buybar-total">
              <span className="br-buybar-label">
                {config.quantity > 1
                  ? t("screen.product.total.many", {
                      count: number(config.quantity),
                      amount: cents(each),
                    })
                  : t("screen.product.total.one")}
              </span>
              <Mono className="br-buybar-price">{cents(each * config.quantity)}</Mono>
            </div>
            <button
              type="button"
              className="br-button"
              // The add-on's own refusal, printed under this button. Nothing
              // connected means nothing to refuse: `addOnBlock` is `undefined`
              // and this reads exactly as it always did.
              disabled={addOnBlock !== undefined}
              onClick={() => {
                // Over the limit, `addToBasket` opens the warning instead of
                // adding — so the toast is only right when it did not.
                const over = limit > 0 && used > limit;
                addToBasket();
                if (over) return;
                toast(
                  t("toast.added", {
                    piece: t(`data.product.${product.key}.name` as never),
                  }),
                  "pos",
                );
              }}
            >
              {t("screen.product.add")}
            </button>
          </div>

          {addOnBlock !== undefined && (
            <div className="br-note br-note--danger br-blockline">{addOnBlock}</div>
          )}

          {shipBy !== null && (
            <div className="br-shipline">
              <Calendar size={15} aria-hidden="true" />
              {t("screen.product.ship", { day: day(shipBy) })}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

function Fact({ k, v, mono = false }: { k: string; v: string; mono?: boolean }) {
  return (
    <div className="br-fact">
      <Mono className="br-fact-key">{k}</Mono>
      <span className="br-fact-value">{mono ? <Mono>{v}</Mono> : v}</span>
    </div>
  );
}
