/**
 * An order asked to be paid online and not paid yet: what the confirmation
 * and Your order show under it, while the studio takes payments online.
 * "Pay now" asks Adminium for the order's pay link again (the amount is the
 * order's own) and goes to the pay page; for an order made once it is paid,
 * the shopper is told nothing is made before. The post-by of such an order
 * counts from the payment, so it is said "if it's paid today", as a dry run
 * of its slowest piece placed now dates it.
 */
import { CircleAlert, Clock, Lock } from "lucide-react";
import { useEffect, useState } from "react";

import { useI18n } from "../../i18n/index.tsx";
import { dayShort, money } from "../format.ts";
import { madeOncePaid, payNow, usePay } from "../pay.ts";
import type { Confirmed } from "../store.ts";
import { useShop } from "../store.ts";
import type { Id, Row } from "../port.ts";

export interface PayCardProps {
  order: Row;
  /** The session the order is read through: its own link's, or the shopper's sign-in. */
  via: "link" | "mine";
  /** The confirmation to keep for the way back (the confirmation's own card); null on Your order. */
  confirmed: Confirmed | null;
  /** The order read again: paid meanwhile, or no longer payable. */
  reread: () => Promise<void>;
  /** Said under the button: "You can also pay later from the link in our e-mail." */
  later?: boolean;
  /** Drawn inside another card (the confirmation's), without a card of its own. */
  bare?: boolean;
}

export function PayCard({ order, via, confirmed, reread, later = false, bare = false }: PayCardProps) {
  const { t, locale } = useI18n();
  const currency = useShop((s) => s.config.currency);
  const port = useShop((s) => s.port);
  const going = usePay((s) => s.going);
  const failed = usePay((s) => s.failed);
  const amount = money(order["pay_due"], currency, locale);
  const press = () => void payNow(port, via, order["id"] as Id, confirmed, reread);
  const body = (
    <>
      <button type="button" className="sh-button sh-button--accent sh-button--wide" aria-busy={going} aria-disabled={going} onClick={() => !going && press()}>
        {going ? <span className="sh-spinner" aria-hidden="true" /> : <Lock size={16} aria-hidden="true" />}
        <span>{going ? t("pay.taking") : t("pay.checkout.now", { amount })}</span>
      </button>
      <span className="sh-hint">{t("pay.checkout.where")}</span>
      {madeOncePaid(order) && <span className="sh-small sh-pay-start">{t("pay.startOnce")}</span>}
      {later && <span className="sh-hint">{t("pay.later")}</span>}
      {failed && (
        <span role="alert" className="sh-note sh-note--bad">
          <CircleAlert size={16} aria-hidden="true" />
          {t("pay.noStart")}
        </span>
      )}
    </>
  );
  if (bare) return <div className="sh-pay-card sh-pay-card--bare">{body}</div>;
  return (
    <section className="sh-card sh-pay-card" aria-labelledby={`sh-pay-${String(order["id"])}`}>
      <h2 id={`sh-pay-${String(order["id"])}`} className="sh-pay-title">
        <Clock size={17} aria-hidden="true" />
        {t("pay.notPaid")}
      </h2>
      {body}
    </section>
  );
}

/**
 * The day an order made once it is paid would be posted by if it were paid
 * now: a dry run of its slowest piece, placed now, as Adminium dates it (its
 * studio days, the cut-off, the closures). Null until Adminium answers, and
 * for any other order.
 */
export function usePostByToday(order: Row | null, lines: readonly Row[]): string | null {
  const port = useShop((s) => s.port);
  const [day, setDay] = useState<string | null>(null);
  const wanted = order !== null && madeOncePaid(order) && Number(order["pay_due"] ?? 0) > 0;
  const slowest = [...lines].sort((a, b) => Number(b["lead_days"] ?? 0) - Number(a["lead_days"] ?? 0))[0];
  const key = wanted && slowest !== undefined ? `${String(order!["id"])}:${String(slowest["id"])}` : null;
  useEffect(() => {
    if (key === null || port === null || slowest === undefined) return;
    let live = true;
    const values: Row = { product_id: slowest["product_id"], qty: 1 };
    for (const column of ["material_id", "size_id", "finish_id"]) if (slowest[column] !== null && slowest[column] !== undefined) values[column] = slowest[column];
    port
      .quote({ values: { ...(order!["service_id"] == null ? {} : { service_id: order!["service_id"] }) }, children: { order_lines: [{ values: values as never }] } })
      .then((quoted) => {
        const at = quoted.lines[0]?.["post_by"];
        if (live) setDay(typeof at === "string" ? at.slice(0, 10) : null);
      })
      .catch(() => {
        if (live) setDay(null);
      });
    return () => {
      live = false;
    };
    // Asked once an order, of its slowest piece.
  }, [key, port]);
  return key === null ? null : day;
}

/** "Post by Wed 12 Aug if it's paid today", for an order made once it is paid; null when it has no such day. */
export function PostByToday({ day }: { day: string | null }) {
  const { t, locale } = useI18n();
  if (day === null) return null;
  return <span className="sh-post-by sh-mono">{t("pay.postByToday", { day: dayShort(day, locale) })}</span>;
}
