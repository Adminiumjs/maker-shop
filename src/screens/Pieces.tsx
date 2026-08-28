/**
 * The pieces: what the shop sells, and what one of them is set up to be.
 *
 * A piece's screen ends in the PERSONALIZATION SETUP, which in this build is
 * deliberately plain — a switch, the character limit, and the words the shopper
 * sees beside the field — and then the `product.admin.panel` slot, which is
 * SILENT when empty and has NOTHING UNDERNEATH IT.
 *
 * [Corrected 2026-08-11.] This paragraph used to describe a muted line under
 * the mount — "Nothing else is connected yet." — as though it were still there,
 * while the comment at the mount itself explained why it had been removed. Two
 * halves of one file disagreeing about what is on the screen is the kind of
 * thing a reader trusts the header for and gets wrong. The line is gone, for
 * the reasons the mount records: it is the dashed placeholder D19 bans, written
 * in prose instead of drawn in a box, and it went stale the moment an add-on
 * was switched on. `add-ons/slotRender.test.tsx` now asserts the absence, so
 * this paragraph is no longer the only thing holding the line.
 *
 * PRICES ARE READ-ONLY HERE (24 D4a): the SPA is the shop and the bench, and
 * the generated dashboard is the books and the catalogue. A maker changes what
 * a coaster costs in the dashboard, not on the bench.
 */

import { ArrowLeft, Hammer } from "lucide-react";

import { AddOnSlot } from "../components/AddOnSlot.tsx";
import { hostProduct } from "../add-ons/records.ts";
import { Icon } from "../components/Icon.tsx";
import { Mono, Tag } from "../components/Primitives.tsx";
import { useT } from "../i18n/index.tsx";
import { machineFor } from "../lib/batch.ts";
import { LEAD_STUDIO_DAYS, PRODUCTS, PRODUCT_BY_KEY, type Product } from "../lib/catalogue.ts";
import { cents, materialSurface, mm, num } from "../lib/format.ts";
import type { Order } from "../lib/orders.ts";
import { useStore } from "../state/store.ts";

/** How many of a piece are on the bench right now, in blanks a maker counts. */
function queuedFor(productKey: string, orders: readonly Order[]): number {
  let n = 0;
  for (const order of orders) {
    if (order.postedIso !== undefined) continue;
    for (const line of order.lines) {
      if (line.productKey === productKey && line.stage !== "ready-to-post") n += line.quantity;
    }
  }
  return n;
}

export function PiecesScreen() {
  const t = useT();
  const orders = useStore((s) => s.orders);
  const personalizeOn = useStore((s) => s.personalizeOn);
  const openPiece = useStore((s) => s.openPiece);

  return (
    <section className="br-screen">
      <div className="br-section-head">
        <div>
          <h1 className="br-h1">{t("bench.pieces.title")}</h1>
          <p className="br-lede">{t("bench.pieces.sub")}</p>
        </div>
      </div>

      <div className="br-table-wrap">
        <table className="br-table">
          <thead>
            <tr>
              <th>{t("bench.pieces.col.piece")}</th>
              <th className="br-wide-only">{t("bench.pieces.col.size")}</th>
              <th className="br-num">{t("bench.pieces.col.price")}</th>
              <th className="br-num br-wide-only">{t("bench.pieces.col.lead")}</th>
              <th className="br-num">{t("bench.pieces.col.queue")}</th>
            </tr>
          </thead>
          <tbody>
            {PRODUCTS.map((product) => {
              const queued = queuedFor(product.key, orders);
              const size = product.sizes[0]!;
              return (
                <tr key={product.key} data-clickable="true" onClick={() => openPiece(product.key)}>
                  <td>
                    <div className="br-cellpiece">
                      <span
                        className="br-orderline-tile"
                        style={{ backgroundImage: materialSurface(product.material) }}
                      >
                        <Icon name={product.icon} size={16} />
                      </span>
                      <div>
                        <div className="br-line-name">
                          {t(`data.product.${product.key}.name` as never)}
                        </div>
                        <div className="br-muted">
                          {t(`data.material.${product.material}.name` as never)}
                          {personalizeOn[product.key] === true &&
                            ` · ${t("bench.pieces.personalTag")}`}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="br-wide-only">
                    <Mono>{mm(size.widthMm, size.heightMm)}</Mono>
                  </td>
                  <td className="br-num">
                    <Mono>{cents(product.basePriceCents)}</Mono>
                  </td>
                  <td className="br-num br-wide-only">
                    <Mono>{num(LEAD_STUDIO_DAYS[product.leadKind])}</Mono>
                  </td>
                  <td className="br-num">
                    {queued === 0 ? (
                      <span className="br-muted">{t("bench.pieces.queueNone")}</span>
                    ) : (
                      <Mono className="br-queued">{num(queued)}</Mono>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
}

export function PieceScreen() {
  const t = useT();
  const go = useStore((s) => s.go);
  const key = useStore((s) => s.pieceKey);
  const orders = useStore((s) => s.orders);
  const personalizeOn = useStore((s) => s.personalizeOn);
  const togglePersonalize = useStore((s) => s.togglePersonalize);

  const product: Product | undefined = key === null ? undefined : PRODUCT_BY_KEY[key];
  if (product === undefined) {
    go("pieces");
    return null;
  }

  const size = product.sizes[0]!;
  const on = personalizeOn[product.key] === true;
  const queued = queuedFor(product.key, orders);

  const rows: [string, string][] = [
    [
      t("bench.piece.row.material"),
      `${t(`data.material.${product.material}.name` as never)} — ${t(
        `data.product.${product.key}.madeFrom` as never,
      )}`,
    ],
    [t("bench.piece.row.size"), mm(size.widthMm, size.heightMm)],
    [t("bench.piece.row.soldAs"), t(`data.unit.${product.unit}` as never)],
    [t("bench.piece.row.machine"), t(`data.machine.${machineFor(product)}.name` as never)],
    [t("bench.piece.row.queue"), t("bench.piece.row.queueValue", { count: queued })],
  ];

  return (
    <section className="br-screen br-narrow">
      <button type="button" className="br-backlink br-btn" onClick={() => go("pieces")}>
        <ArrowLeft size={15} aria-hidden="true" />
        {t("bench.piece.back")}
      </button>

      <div className="br-section-head">
        <div className="br-cellpiece">
          <span
            className="br-orderline-tile"
            style={{ backgroundImage: materialSurface(product.material) }}
          >
            <Icon name={product.icon} size={19} />
          </span>
          <div>
            <h1 className="br-h1">{t(`data.product.${product.key}.name` as never)}</h1>
            <p className="br-lede">
              <Mono>
                {t("bench.piece.meta", {
                  price: cents(product.basePriceCents),
                  size: mm(size.widthMm, size.heightMm),
                  days: LEAD_STUDIO_DAYS[product.leadKind],
                })}
              </Mono>
            </p>
          </div>
        </div>
        {queued > 0 && (
          <Tag tone="info">
            <Hammer size={13} aria-hidden="true" />
            <Mono>{num(queued)}</Mono>
          </Tag>
        )}
      </div>

      <div className="br-panel br-panel-pad">
        <div className="br-facts">
          {rows.map(([k, v]) => (
            <div key={k} className="br-fact">
              <span className="br-fact-key">{k}</span>
              <span className="br-fact-value">{v}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="br-panel br-panel-pad br-stack br-stack--tight">
        <div className="br-panel-title">{t("bench.piece.personal.title")}</div>

        <button
          type="button"
          className="br-switch br-btn"
          role="switch"
          aria-checked={on}
          onClick={() => togglePersonalize(product.key)}
        >
          <span className="br-switch-track" aria-hidden="true">
            <span className="br-switch-knob" />
          </span>
          <span className="br-switch-body">
            <span className="br-switch-label">{t("bench.piece.personal.takes")}</span>
            <span className="br-switch-note">
              {on ? t("bench.piece.personal.on") : t("bench.piece.personal.off")}
            </span>
          </span>
        </button>

        <div className="br-facts">
          <div className="br-fact">
            <span className="br-fact-key">{t("bench.piece.personal.limit")}</span>
            <span className="br-fact-value br-mono">
              {on && product.personalize !== undefined
                ? num(product.personalize.limitChars)
                : "—"}
            </span>
          </div>
          <div className="br-fact">
            <span className="br-fact-key">{t("bench.piece.personal.prompt")}</span>
            <span className="br-fact-value">
              {on && product.personalize !== undefined
                ? t("screen.product.personal.prompt", { limit: product.personalize.limitChars })
                : t("bench.piece.personal.none")}
            </span>
          </div>
          <div className="br-fact">
            <span className="br-fact-key">{t("bench.piece.personal.hint")}</span>
            <span className="br-fact-value">
              {on && product.personalize !== undefined
                ? t(`data.personalHint.${product.personalize.hintKey}` as never)
                : t("bench.piece.personal.nothing")}
            </span>
          </div>
        </div>

        {/*
         * `product.admin.panel` — SILENT when empty, so no fallback is passed.
         * A setup surface would appear here; with nothing connected the panel
         * above is the whole of this piece's personalization settings, and it
         * is a finished thing rather than a stub (24 D19).
         *
         * AND NOTHING FOLLOWS IT. A muted line reading "this is the only part
         * of this page an add-on changes" used to render here, unconditionally,
         * directly under this mount — which is the dashed placeholder D19 bans,
         * written in prose instead of drawn in a box. It also went stale the
         * moment an add-on WAS switched on, because it then sat under the panel
         * the add-on had just drawn and told the maker nothing had changed. The
         * same sentence still renders on the shopper's piece page, where it
         * belongs to the PAGE beside a slot that speaks; here there was nothing
         * to explain, so there is nothing.
         */}
        <AddOnSlot
          slot="product.admin.panel"
          payload={{ product: hostProduct(product, t(`data.product.${product.key}.name` as never)) }}
        />
      </div>
    </section>
  );
}
