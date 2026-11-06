/**
 * The order is in: its number, what it came to and when it will be posted, as
 * the row Adminium wrote says them. The order's own link went to the
 * shopper's e-mail; this page holds it once, for "Look at the order".
 */
import { Check } from "lucide-react";

import { useI18n } from "../../i18n/index.tsx";
import { dayShort, money } from "../format.ts";
import { Mono } from "../parts.tsx";
import { goView, useShop, waitsForProof } from "../store.ts";

/** The order's own page, opened by the link the save answered (its code after the `#`). */
export function lookAtOrder(token: string | null): void {
  goView("order");
  if (token !== null) window.history.replaceState(window.history.state, "", `${window.location.pathname}#${token}`);
}

export function ConfirmScreen() {
  const { t, locale } = useI18n();
  const confirmed = useShop((s) => s.confirmed);
  const currency = useShop((s) => s.config.currency);
  if (confirmed === null) return null;
  const m = (value: unknown) => money(value, currency, locale);
  const { order } = confirmed;
  const rows: [string, string, boolean][] = [
    [t("shop.sum.pieces"), m(order["pieces_total"]), false],
    [confirmed.serviceName === "" ? t("shop.sum.postage") : confirmed.serviceName, m(order["postage"]), false],
    [t("shop.sum.total"), m(order["total"]), true],
    [t("shop.confirm.postBy"), dayShort(order["post_by"], locale), false],
  ];
  return (
    <section className="sh-screen sh-narrowest" aria-labelledby="sh-confirm-title">
      <div className="sh-card sh-confirm">
        <span className="sh-confirm-icon">
          <Check size={26} aria-hidden="true" />
        </span>
        <h1 id="sh-confirm-title" className="sh-h1 sh-h1--confirm">
          {t("shop.confirm.thanks")} <Mono>{String(order["number"] ?? "")}</Mono>
        </h1>
        <p className="sh-lede">{t("shop.confirm.emailed")}</p>
        <dl className="sh-confirm-rows">
          {rows.map(([label, value, strong]) => (
            <div key={label} className={strong ? "sh-confirm-row sh-confirm-row--total" : "sh-confirm-row"}>
              <dt>{label}</dt>
              <dd>
                <Mono>{value}</Mono>
              </dd>
            </div>
          ))}
        </dl>
        <p className="sh-small">{waitsForProof(confirmed.lines) ? t("shop.confirm.proof") : t("shop.confirm.noProof")}</p>
        <div className="sh-confirm-actions">
          <button type="button" className="sh-button sh-button--accent" onClick={() => lookAtOrder(confirmed.token)}>
            {t("shop.confirm.look")}
          </button>
          <button type="button" className="sh-button" onClick={() => goView("shop")}>
            {t("shop.back.shop")}
          </button>
        </div>
      </div>
    </section>
  );
}
