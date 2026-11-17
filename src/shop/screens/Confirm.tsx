/**
 * The order is in: its number, what it came to and when it will be posted, as
 * the row Adminium wrote says them. The order's own link went to the
 * shopper's e-mail; this page holds it once, for "Look at the order".
 *
 * Paying online, the same page is where the shopper comes back to from the
 * pay page: it checks the order with Adminium, then says it is paid ("Paid"
 * where it said "Total"), or offers "Pay now" again. Where Adminium tells the
 * payment's own state, it also says the bank is confirming it, or that the
 * payment did not finish or its page ran out of time (Adminium 0.3.61's
 * `payments.state`).
 */
import { Check, TriangleAlert } from "lucide-react";

import { useI18n } from "../../i18n/index.tsx";
import { dayShort, money } from "../format.ts";
import { Mono } from "../parts.tsx";
import { isPaid, madeOncePaid, owes, paysOnline, postByOf, usePay } from "../pay.ts";
import { goView, useShop, waitsForProof } from "../store.ts";
import { BankConfirming, PayCard, PostByToday, usePostByToday } from "./PayCard.tsx";

/** The order's own page, opened by the link the save answered (its code after the `#`). */
export function lookAtOrder(token: string | null): void {
  goView("order");
  if (token !== null) window.history.replaceState(window.history.state, "", `${window.location.pathname}#${token}`);
}

export function ConfirmScreen() {
  const { t, locale } = useI18n();
  const confirmed = useShop((s) => s.confirmed);
  const currency = useShop((s) => s.config.currency);
  const port = useShop((s) => s.port);
  const pay = usePay();
  const today = usePostByToday(confirmed?.order ?? null, confirmed?.lines ?? []);
  if (confirmed === null) return null;
  const m = (value: unknown) => money(value, currency, locale);
  const { order } = confirmed;
  const back = pay.back;
  const checking = back === "checking";
  const paid = isPaid(order);
  const failedPay = back === "unfinished" || back === "expired";
  const postBy = postByOf(order);
  const rows: [string, string, boolean][] = [
    [t("shop.sum.pieces"), m(order["pieces_total"]), false],
    [confirmed.serviceName === "" ? t("shop.sum.postage") : confirmed.serviceName, m(order["postage"]), false],
    // Paid online, the total is what was paid.
    paid ? [t("pay.paid"), m(order["paid"]), true] : [t("shop.sum.total"), m(order["total"]), true],
    ...(postBy === null ? [] : [[t("shop.confirm.postBy"), dayShort(postBy, locale), false] as [string, string, boolean]]),
  ];
  const offer = !checking && back !== "bank" && owes(order) && paysOnline(pay);
  const reread = async () => {
    const read = await port?.after().readShared().catch(() => null);
    const now = useShop.getState().confirmed;
    if (read != null && now !== null) useShop.setState({ confirmed: { ...now, order: { ...now.order, ...read.order } } });
  };
  return (
    <section className="sh-screen sh-narrowest" aria-labelledby="sh-confirm-title">
      <div className="sh-card sh-confirm">
        {checking ? (
          <>
            <span className="sh-confirm-icon sh-confirm-icon--quiet">
              <span className="sh-spinner" aria-hidden="true" />
            </span>
            <h1 id="sh-confirm-title" className="sh-h1 sh-h1--confirm">
              {t("shop.confirm.thanks")} <Mono>{String(order["number"] ?? "")}</Mono>
            </h1>
            <p className="sh-lede" role="status">
              {t("pay.checking")}
            </p>
          </>
        ) : failedPay ? (
          <>
            <span className="sh-confirm-icon sh-confirm-icon--warn">
              <TriangleAlert size={26} aria-hidden="true" />
            </span>
            <h1 id="sh-confirm-title" className="sh-h1 sh-h1--confirm">
              {t(back === "expired" ? "pay.expired" : "pay.unfinished", { ref: String(order["number"] ?? "") })}
            </h1>
          </>
        ) : (
          <>
            <span className="sh-confirm-icon">
              <Check size={26} aria-hidden="true" />
            </span>
            <h1 id="sh-confirm-title" className="sh-h1 sh-h1--confirm">
              {t("shop.confirm.thanks")} <Mono>{String(order["number"] ?? "")}</Mono>
            </h1>
            <p className="sh-lede">{t("shop.confirm.emailed")}</p>
          </>
        )}
        {back === "bank" && <BankConfirming />}
        {offer && <PayCard order={order} via="link" confirmed={confirmed} reread={reread} later={back !== null} bare={failedPay} />}
        {!checking && (
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
        )}
        {!checking && madeOncePaid(order) && !paid && <PostByToday day={today} />}
        {!checking && <p className="sh-small">{waitsForProof(confirmed.lines) ? t("shop.confirm.proof") : t("shop.confirm.noProof")}</p>}
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
