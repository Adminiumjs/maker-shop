/**
 * Order again: the shopper's orders, found the way Your order finds one (the
 * number, the e-mail, the code) or opened by an order's own link, each put
 * back in the basket as it was. The basket prices it again by its dry run,
 * so today's prices and today's limits are the ones that hold.
 */
import { useEffect } from "react";

import { useI18n } from "../../i18n/index.tsx";
import { againLines, loadAgain, putBack, useAfter } from "../after.ts";
import { money } from "../format.ts";
import { Mono, PieceIcon, Tile } from "../parts.tsx";
import { productById, useShop } from "../store.ts";
import { rich } from "../words.tsx";
import { LookupForm } from "./Lookup.tsx";
import { useDay } from "./Order.tsx";

export function AgainScreen() {
  const { t } = useI18n();
  const port = useShop((s) => s.port);
  const again = useAfter((s) => s.again);
  const step = useAfter((s) => s.lookups.again.step);

  useEffect(() => {
    if (port === null) return;
    const door = port.after();
    if ((door.signedIn() || door.sharedHeld()) && useAfter.getState().again.state === "idle") void loadAgain();
  }, [port]);

  const listed = again.state === "ok" && step !== "code";
  return (
    <section className="sh-screen sa-page" aria-labelledby="sa-again-title">
      <h1 id="sa-again-title" className="sh-h1 sh-h1--page sa-h1">
        {t("after.again.title")}
      </h1>
      {!listed && <p className="sh-lede sa-intro">{t("after.again.intro")}</p>}
      {!listed && <LookupForm which="again" />}
      {again.state === "loading" && (
        <div className="sh-loading" aria-busy="true">
          <span className="sh-sr">{t("after.order.loading")}</span>
          <div className="sh-skel sh-skel--title" />
        </div>
      )}
      {listed && <Orders />}
    </section>
  );
}

function Orders() {
  const { t, locale } = useI18n();
  const again = useAfter((s) => s.again);
  const currency = useShop((s) => s.config.currency);
  const catalogue = useShop((s) => s.catalogue);
  const day = useDay();
  const materials = catalogue?.materials ?? [];
  const tint = (line: Record<string, unknown>): string | null => {
    const option = catalogue?.options.find((o) => String(o.id) === String(line["material_id"]));
    const materialId = option?.materialId ?? productById(line["product_id"] as never)?.materialId ?? null;
    return materials.find((m) => String(m.id) === String(materialId))?.tint ?? null;
  };
  return (
    <ul className="sa-again">
      {again.orders.map((order) => {
        const lines = againLines(order["id"], again.lines);
        const status = String(order["status"] ?? "");
        const state =
          status === "posted"
            ? rich(t, "after.again.posted", { date: <Mono>{day(String(order["posted_at"] ?? ""))}</Mono> })
            : status === "cancelled"
              ? t("after.again.cancelled")
              : t("after.again.bench");
        return (
          <li key={String(order["id"])} className="sh-card sa-again-card">
            <div className="sa-again-head">
              <Mono className="sa-ref">{String(order["number"] ?? "")}</Mono>
              <span className="sa-faint">
                <Mono>{day(String(order["placed_at"] ?? ""))}</Mono> · {state}
              </span>
              <span className="sa-again-total">
                <span className="sa-faint">{t("after.total")}</span>
                <Mono className="sa-strong">{money(order["total"], currency, locale)}</Mono>
              </span>
            </div>
            {lines.length === 0 ? (
              <p className="sa-empty-line">{t("after.again.none")}</p>
            ) : (
              <>
                <ul className="sa-rows sa-rows--plain">
                  {lines.map((line) => {
                    const product = productById(line["product_id"] as never);
                    const words = typeof line["lettering"] === "string" && line["lettering"] !== "" ? line["lettering"] : null;
                    return (
                      <li key={String(line["id"])} className="sa-again-line">
                        <Tile tint={tint(line)} className="sa-again-tile">
                          <span className="sh-tile-icon">
                            <PieceIcon name={product?.icon ?? null} size={20} />
                          </span>
                        </Tile>
                        <span className="sa-col">
                          <span className="sa-line-head">
                            <span className="sa-line-name">{String(line["product_name"] ?? product?.name ?? "")}</span>
                            <Mono className="sa-faint">×{new Intl.NumberFormat(locale).format(Number(line["qty"] ?? 1))}</Mono>
                          </span>
                          {words !== null && <span className="sa-words sh-mono">“{words}”</span>}
                          {typeof line["design_code"] === "string" && line["design_code"] !== "" && <span className="sa-faint">{t("after.lines.designed")}</span>}
                        </span>
                      </li>
                    );
                  })}
                </ul>
                <button type="button" className="sh-button sh-button--accent sh-button--start" onClick={() => void putBack(order["id"])}>
                  {t("after.again.put")}
                </button>
              </>
            )}
          </li>
        );
      })}
      {again.orders.length === 0 && <li className="sa-empty">{t("after.again.none")}</li>}
    </ul>
  );
}
