/**
 * Paying online, on the studio's side: an order's payment chips and its
 * Payment card, "Copy pay link", the refund and the cancel of an unpaid
 * order, and the studio's Settings screen ("Take payment before making").
 *
 * None of it shows until someone who manages payments has switched the app
 * on in Adminium (`payments.on` of the staff config): until then the studio
 * reads exactly as it always did. Every figure is a stored column Adminium
 * worked out (what was paid, what is left, what went back); the studio
 * writes no payment.
 *
 * A refund is Adminium's own two steps, drawn by its kit inside the studio's
 * sheet over this person's session, for someone who may give money back; the
 * server asks the right again. Where there is no kit (the demo), the sheet
 * takes the same two steps itself.
 */
import { useEffect, useRef, useState } from "react";
import { CircleCheck, Clock, Globe, Link2, Lock, Undo2, Wallet, X, XCircle } from "lucide-react";

import { cancelOrder } from "../actions.ts";
import type { StudioDoor } from "../door.ts";
import { reload, useData, useEnv, useRun } from "../env.tsx";
import { madeOncePaid, paymentOf, refundableOf, serviceName } from "../facts.ts";
import { useFmt } from "../format.ts";
import { toast, useStudio } from "../store.ts";
import { num, same, text, type Row } from "../wire.ts";
import { useI18n, useT } from "../../i18n/index.tsx";
import { close, Modal } from "./Modal.tsx";

/** The kit's mount contract the studio was built against: another one is not mounted. */
export const KIT_CONTRACT = 1;

/** Whether the studio shows payments: someone who manages payments switched the app on. */
export function paymentsOn(door: StudioDoor): boolean {
  return door.payments()?.on === true;
}

/** Whether this person may give money back from here: the right, and a way to give it (Adminium's kit, or the demo's own). */
export function mayRefund(door: StudioDoor): boolean {
  const pay = door.payments();
  if (pay === null || !pay.refund) return false;
  const kit = door.kit();
  return (kit !== null && kit.contract === KIT_CONTRACT) || door.refund !== undefined;
}

/**
 * The Settings screen has a door: the app's own admin (who may change the
 * studio's settings), once payments are on, or while the setting is still on
 * (so it can be turned off again).
 */
export function settingsShown(door: StudioDoor, settings: Row | null): boolean {
  if (settings === null || !door.who().can("settings", "update")) return false;
  return paymentsOn(door) || settings["pay_first"] === true;
}

// ── an order's chips ────────────────────────────────────────────────────────

/** Paid · Online · Stripe, or Not paid; and what went back. Nothing for an order not asked to pay online. */
export function PayChips({ order }: { order: Row }) {
  const t = useT();
  const fmt = useFmt();
  const data = useData();
  const pay = paymentOf(data, order);
  if (!pay.online) return null;
  return (
    <span className="st-pay-chips">
      {pay.paid ? (
        <span className="st-paychip st-paychip--pos">
          <CircleCheck size={13} aria-hidden="true" />
          {t("studio.pay.chip.paid", { service: serviceName(pay.provider) })}
        </span>
      ) : pay.owes ? (
        <span className="st-paychip st-paychip--warn">
          <Clock size={13} aria-hidden="true" />
          {t("studio.pay.chip.notPaid")}
        </span>
      ) : null}
      {pay.refunded > 0 && (
        <span className="st-paychip">
          <Undo2 size={13} aria-hidden="true" />
          {t("studio.pay.chip.refunded", { amount: fmt.money(pay.refunded) })}
        </span>
      )}
    </span>
  );
}

// ── the Payment card ────────────────────────────────────────────────────────

/** An order's payments: each one taken online, each refund, and what is paid or left to pay. */
export function PaymentCard({ order }: { order: Row }) {
  const t = useT();
  const fmt = useFmt();
  const data = useData();
  const pay = paymentOf(data, order);
  if (!pay.online) return null;
  const placed = Date.parse(text(order["placed_at"]) ?? "");
  return (
    <section className="st-panel st-panel--pad st-paycard" aria-labelledby={`st-pay-${String(order.id)}`}>
      <h2 className="st-panel-title st-paycard-title" id={`st-pay-${String(order.id)}`}>
        <Wallet size={15} aria-hidden="true" />
        {t("studio.pay.card")}
      </h2>
      <ul className="st-payrows">
        {pay.rows.map((p) => {
          const at = text(p["paid_at"]);
          // Paid within the hour of ordering: taken at checkout.
          const ordering = at !== null && !Number.isNaN(placed) && Date.parse(at) - placed < 3_600_000;
          const when = at === null ? "—" : `${fmt.moment(at)} ${fmt.time(at)}`;
          const refunded = num(p["refunded"]) ?? 0;
          return (
            <li key={String(p.id)} className="st-payrow-group">
              <div className="st-payrow">
                <span className="st-payrow-text">
                  <span className="st-payrow-label">{t("studio.pay.online")}</span>
                  <span className="st-payrow-sub st-mono">{t(ordering ? "studio.pay.whenOrdering" : "studio.pay.when", { when })}</span>
                </span>
                <span className="st-paychip">
                  <Globe size={13} aria-hidden="true" />
                  {t("studio.pay.service", { service: serviceName(text(p["provider"])) })}
                </span>
                <span className="st-payrow-amount st-mono">{fmt.money(p["amount"])}</span>
              </div>
              {refunded > 0 && (
                <div className="st-payrow st-payrow--back">
                  <span className="st-payrow-text">
                    <span className="st-payrow-label">{t("studio.pay.refunded")}</span>
                  </span>
                  <span className="st-payrow-amount st-mono">−{fmt.money(refunded)}</span>
                </div>
              )}
            </li>
          );
        })}
      </ul>
      {pay.owes && (
        <div className="st-payhint">
          <span>{t("studio.pay.hint", { amount: fmt.money(pay.due) })}</span>
          {madeOncePaid(order) && (
            <span className="st-payhint-lock">
              <Lock size={13} aria-hidden="true" />
              {t("studio.pay.nothingCut")}
            </span>
          )}
        </div>
      )}
      <div className="st-paysum">
        <span>{t(pay.owes ? "studio.pay.sumDue" : "studio.pay.sumPaid")}</span>
        <span className="st-mono">{fmt.money(pay.owes ? pay.due : pay.paidSum - pay.refunded)}</span>
      </div>
    </section>
  );
}

// ── the order's own actions: Copy pay link, Refund, Cancel the order ────────

export function PayActions({ order }: { order: Row }) {
  const t = useT();
  const fmt = useFmt();
  const data = useData();
  const { door } = useEnv();
  const { busy, run } = useRun();
  if (!paymentsOn(door)) return null;
  const pay = paymentOf(data, order);
  if (!pay.online) return null;
  const who = door.who();
  const refundable = [...pay.rows].reverse().find((p) => text(p["payment_ref"]) !== null && refundableOf(p) > 0);
  const ref = text(order["number"]) ?? "";
  const copy = () =>
    run(async (d) => {
      try {
        const link = await d.payLink(order);
        await navigator.clipboard?.writeText(link.url);
        return t("studio.pay.copied", { amount: fmt.money(pay.due) });
      } catch {
        toast(t("studio.pay.copyFailed", { ref }), "warn");
        return null;
      }
    });
  return (
    <>
      {pay.owes && who.can("orders", "update") && (door.payments()?.online === true || door.payments()?.test === true) && (
        <button type="button" className="st-btn" disabled={busy} onClick={() => void copy()}>
          <Link2 size={15} aria-hidden="true" />
          {t("studio.pay.copy")}
        </button>
      )}
      {refundable !== undefined && mayRefund(door) && (
        <button type="button" className="st-btn" onClick={() => useStudio.setState({ overlay: { kind: "refund", orderId: order.id, paymentId: refundable.id } })}>
          <Undo2 size={15} aria-hidden="true" />
          {t("studio.pay.refund")}
        </button>
      )}
      {pay.owes && pay.paidSum <= 0 && who.roles.includes("owner") && (
        <button type="button" className="st-btn st-btn--warn" onClick={() => useStudio.setState({ overlay: { kind: "cancel", orderId: order.id } })}>
          <XCircle size={15} aria-hidden="true" />
          {t("studio.pay.cancel")}
        </button>
      )}
    </>
  );
}

// ── the refund ──────────────────────────────────────────────────────────────

interface KitModule {
  mount(part: "refund", element: Element, props: Record<string, unknown>): Promise<{ unmount(): void }>;
}

export function RefundSheet({ orderId, paymentId }: { orderId: Row["id"]; paymentId: Row["id"] }) {
  const t = useT();
  const data = useData();
  const { door } = useEnv();
  const order = data.orders.find((o) => same(o.id, orderId));
  const payment = data.payments.find((p) => same(p.id, paymentId));
  if (order === undefined || payment === undefined) return null;
  const customer = text(order["name"]) ?? "";
  const kit = door.kit();
  return (
    <Modal side labelledBy="st-refund-title">
      <div className="st-sheet-head">
        <span className="st-sheet-text">
          <h2 className="st-sheet-title" id="st-refund-title">
            {t("studio.pay.refund")}
          </h2>
          <span className="st-sub">{t("studio.pay.refundSub", { customer, ref: text(order["number"]) ?? "", service: serviceName(text(payment["provider"])) })}</span>
        </span>
        <button type="button" className="st-close" aria-label={t("studio.close")} onClick={close}>
          <X size={16} aria-hidden="true" />
        </button>
      </div>
      <div className="st-sheet-body">
        {kit !== null && kit.contract === KIT_CONTRACT ? <KitRefund payment={payment} /> : door.refund !== undefined ? <OwnRefund order={order} payment={payment} /> : <p role="alert">{t("studio.pay.refundUnavailable")}</p>}
      </div>
    </Modal>
  );
}

/** Adminium's own two steps, with its words and its toast, drawn by its kit over this person's session. */
function KitRefund({ payment }: { payment: Row }) {
  const t = useT();
  const { locale, dir } = useI18n();
  const { door } = useEnv();
  const theme = useStudio((s) => s.theme);
  const host = useRef<HTMLDivElement>(null);
  const [failed, setFailed] = useState(false);
  const attemptId = text(payment["payment_ref"]);
  useEffect(() => {
    const kit = door.kit();
    const element = host.current;
    if (kit === null || attemptId === null || element === null) return;
    let live = true;
    let mounted: { unmount(): void } | null = null;
    void (async () => {
      try {
        const part = (await import(/* @vite-ignore */ kit.entry)) as KitModule;
        if (!live) return;
        mounted = await part.mount("refund", element, {
          locale,
          dir,
          ...(theme === null ? {} : { theme }),
          attemptId,
          csrfToken: door.csrf() ?? "",
          // Taken: the rows are read again, so the order shows what was given back.
          onRefunded: () => void reload(door),
        });
        if (!live) mounted.unmount();
      } catch {
        if (live) setFailed(true);
      }
    })();
    return () => {
      live = false;
      mounted?.unmount();
    };
  }, [door, attemptId, locale, dir, theme]);
  return (
    <>
      <div className="st-kit" ref={host} data-part="refund" />
      {failed && <p role="alert">{t("studio.pay.refundUnavailable")}</p>}
    </>
  );
}

/** The same two steps where no kit draws them (the demo): how much and why, then the one sentence that says what happens. */
function OwnRefund({ order, payment }: { order: Row; payment: Row }) {
  const t = useT();
  const fmt = useFmt();
  const { door } = useEnv();
  const { busy, run } = useRun();
  const most = refundableOf(payment);
  const [step, setStep] = useState<1 | 2>(1);
  const [amount, setAmount] = useState(most.toFixed(2));
  const [why, setWhy] = useState("");
  const [tried, setTried] = useState(false);
  const typed = Number(amount.replace(",", "."));
  const badAmount = !Number.isFinite(typed) || typed <= 0 || Math.round(typed * 100) > Math.round(most * 100);
  const badWhy = why.trim() === "";
  const next = () => {
    setTried(true);
    if (!badAmount && !badWhy) setStep(2);
  };
  const give = () =>
    run(async () => {
      await door.refund!(payment, typed.toFixed(2), why.trim());
      close();
      return t("studio.pay.refundedToast", { amount: fmt.money(typed) });
    });
  if (step === 2)
    return (
      <div className="st-refund">
        <p className="st-refund-say">{oneStop(t("studio.pay.refundSay", { amount: fmt.money(typed), customer: text(order["name"]) ?? "", ref: text(order["number"]) ?? "", why: why.trim() }))}</p>
        <p className="st-small">{t("studio.pay.cantUndo")}</p>
        <div className="st-dialog-foot">
          <button type="button" className="st-btn" onClick={() => setStep(1)}>
            {t("studio.pay.back")}
          </button>
          <button type="button" className="st-btn st-btn--danger" disabled={busy} onClick={() => void give()}>
            {t("studio.pay.refund")}
          </button>
        </div>
      </div>
    );
  return (
    <div className="st-refund">
      <label className="st-field">
        <span className="st-label">{t("studio.pay.amount")}</span>
        <input
          className="st-input st-input--mono"
          inputMode="decimal"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          aria-invalid={tried && badAmount}
          aria-describedby={tried && badAmount ? "st-refund-amount-help st-refund-amount-err" : "st-refund-amount-help"}
        />
        <span id="st-refund-amount-help" className="st-small">
          {t("studio.pay.upTo", { amount: fmt.money(most) })}
        </span>
        {tried && badAmount && (
          <span id="st-refund-amount-err" role="alert" className="st-error">
            {t("studio.pay.errAmount", { amount: fmt.money(most) })}
          </span>
        )}
      </label>
      <label className="st-field">
        <span className="st-label">{t("studio.pay.reason")}</span>
        <input className="st-input" value={why} placeholder={t("studio.pay.reasonHint")} onChange={(e) => setWhy(e.target.value)} aria-invalid={tried && badWhy} aria-describedby={tried && badWhy ? "st-refund-why-err" : undefined} />
        {tried && badWhy && (
          <span id="st-refund-why-err" role="alert" className="st-error">
            {t("studio.pay.errReason")}
          </span>
        )}
      </label>
      <div className="st-dialog-foot">
        <button type="button" className="st-btn" onClick={close}>
          {t("studio.pay.notNow")}
        </button>
        <button type="button" className="st-btn st-btn--dark" onClick={next}>
          {t("studio.pay.next")}
        </button>
      </div>
    </div>
  );
}

// ── cancelling an unpaid order ──────────────────────────────────────────────

/** A name that ends in its own full stop ("Iris P.") keeps one, not two, where a sentence stops after it. */
const oneStop = (sentence: string): string => sentence.replace(/\.\.(?=\s|$)/g, ".");

/** "Cancel the order": one sentence that says what happens, that it can't be undone, and the button that does it. */
export function CancelSheet({ orderId }: { orderId: Row["id"] }) {
  const t = useT();
  const data = useData();
  const { busy, run } = useRun();
  const order = data.orders.find((o) => same(o.id, orderId));
  if (order === undefined) return null;
  const ref = text(order["number"]) ?? "";
  const cancel = () =>
    run(async (door, fresh) => {
      await cancelOrder(door, fresh, order);
      close();
      return t("studio.pay.cancelled", { ref });
    });
  return (
    <Modal labelledBy="st-cancel-title">
      <span className="st-dialog-icon">
        <XCircle size={18} aria-hidden="true" />
      </span>
      <h2 className="st-dialog-title" id="st-cancel-title">
        {t("studio.pay.cancel")}
      </h2>
      <p className="st-dialog-body">
        {oneStop(t("studio.pay.cancelSay", { ref, customer: text(order["name"]) ?? "" }))} {t("studio.pay.cantUndo")}
      </p>
      <div className="st-dialog-foot">
        <button type="button" className="st-btn" onClick={close}>
          {t("studio.pay.keep")}
        </button>
        <button type="button" className="st-btn st-btn--danger" disabled={busy} onClick={() => void cancel()}>
          {t("studio.pay.cancel")}
        </button>
      </div>
    </Modal>
  );
}

// ── Settings ────────────────────────────────────────────────────────────────

/** The studio's Settings: how shoppers pay, and "Take payment before making", the app's own admin's to switch. */
export function SettingsScreen() {
  const t = useT();
  const data = useData();
  const { door } = useEnv();
  const { busy, run } = useRun();
  const settings = data.settings;
  const [said, setSaid] = useState("");
  if (settings === null) return null;
  const on = paymentsOn(door);
  const first = settings["pay_first"] === true;
  const flip = () =>
    run(async (d) => {
      await d.saveSettings(settings, { pay_first: !first });
      setSaid(t("studio.settings.saved"));
    });
  return (
    <section className="st-screen st-narrow" aria-labelledby="st-settings-title">
      <div className="st-head st-head--tight">
        <h1 className="st-h1" id="st-settings-title">
          {t("studio.settings.title")}
        </h1>
      </div>
      <div className="st-panel st-panel--pad st-settings">
        <h2 className="st-panel-title">{t("studio.settings.payments")}</h2>
        <p className="st-small">{t(on ? "studio.settings.on" : "studio.settings.off")}</p>
        {(on || first) && (
          <button type="button" role="switch" aria-checked={first} aria-describedby="st-settings-first-line" className="st-switch" disabled={busy} onClick={() => void flip()}>
            <span className="st-switch-track">
              <span className="st-switch-knob" />
            </span>
            <span className="st-switch-text">
              <span className="st-switch-label">{t("studio.settings.first")}</span>
              <span className="st-switch-sub" id="st-settings-first-line">
                {t("studio.settings.firstLine")}
              </span>
            </span>
          </button>
        )}
        <span className="st-visually-hidden" role="status">
          {said}
        </span>
      </div>
    </section>
  );
}
