/**
 * Your order: found by its number and the e-mail with the code Adminium
 * sends, or opened straight by the link its e-mails carry. The order's
 * stages, each dated by the stamp Adminium wrote; the proof waiting, its
 * picture as the studio sent it, approved or a change asked for through the
 * shopper's own session; what is being made; the proofs so far; and how it
 * goes in the post.
 */
import { BadgeCheck, CircleAlert, Eye, FolderHeart, Mail, RotateCcw, Truck } from "lucide-react";
import { useEffect, useRef } from "react";

import { useI18n, type MessageKey } from "../../i18n/index.tsx";
import { answerProof, dayIn, loadAgain, loadToday, openChange, openMine, openOrderLink, readLinked, typeChange, useAfter } from "../after.ts";
import { orderView, type OrderView, type StageKey } from "../after-view.ts";
import { dayShort, money } from "../format.ts";
import { Mono, PieceIcon, Tile } from "../parts.tsx";
import { goView, useShop } from "../store.ts";
import { rich } from "../words.tsx";
import { LookupForm } from "./Lookup.tsx";

const STAGE_KEYS: Record<StageKey, MessageKey> = {
  accepted: "after.stage.accepted",
  proof: "after.stage.proof",
  making: "after.stage.making",
  finishing: "after.stage.finishing",
  posted: "after.stage.posted",
};

/** A stored day, or a stored moment read on the studio's own calendar, as "Thu 6 Aug". */
export function useDay(): (value: string | null) => string {
  const { locale } = useI18n();
  const zone = useShop((s) => s.config.timezone);
  return (value) => {
    if (value === null) return "";
    const day = /^\d{4}-\d{2}-\d{2}$/.test(value) ? value : dayIn(new Date(value), zone);
    return dayShort(day, locale);
  };
}

/** The order's own link from the address bar (`/order#<code>`), taken off it once read. */
function linkInAddress(): string | null {
  const token = window.location.hash.replace(/^#/, "").split("&")[0] ?? "";
  if (!/^[A-Za-z0-9_-]{8,64}$/.test(token)) return null;
  window.history.replaceState(window.history.state, "", `${window.location.pathname}${window.location.search}`);
  return token;
}

export function OrderScreen() {
  const { t } = useI18n();
  const opened = useAfter((s) => s.opened);
  const link = useAfter((s) => s.link);
  const step = useAfter((s) => s.lookups.order.step);
  const again = useAfter((s) => s.again);
  const port = useShop((s) => s.port);

  useEffect(() => {
    if (port === null) return;
    void loadToday();
    const token = linkInAddress();
    if (token !== null) void openOrderLink(token);
    // A link this tab opened before (the confirmation's), unless the one just tried opened nothing.
    else if (useAfter.getState().opened === null && useAfter.getState().link === null && port.after().sharedHeld()) void readLinked();
  }, [port]);

  const open = opened !== null && step !== "code" && (opened.state !== "ok" || opened.read !== null);
  // Signed in by the e-mail's link with no number asked for: their orders, to pick from.
  const picking = opened === null && step === "find" && again.state === "ok" && again.orders.length > 0 && port?.after().signedIn() === true;
  return (
    <section className="sh-screen sa-page" aria-labelledby="sa-order-title">
      <h1 id="sa-order-title" className="sh-h1 sh-h1--page sa-h1">
        {t("after.order.title")}
      </h1>
      {link === "unknown" || link === "closed" ? (
        <div role="alert" className="sh-note sh-note--bad sa-gap">
          <CircleAlert size={16} aria-hidden="true" />
          {t(link === "unknown" ? "after.link.unknown" : "after.link.closed")}
        </div>
      ) : null}
      {!open && <p className="sh-lede sa-intro">{t("after.order.intro")}</p>}
      {!open && !picking && <LookupForm which="order" />}
      {picking && <Picker />}
      {open && <Opened />}
    </section>
  );
}

/** The signed-in shopper's orders, after the e-mail's link: one to open. */
function Picker() {
  const { t } = useI18n();
  const orders = useAfter((s) => s.again.orders);
  const day = useDay();
  return (
    <div className="sh-card sa-list">
      <h2 className="sa-card-head">{t("after.mine.title")}</h2>
      <p className="sh-small sa-pad">{t("after.mine.pick")}</p>
      <ul className="sa-rows">
        {orders.map((o) => (
          <li key={String(o["id"])}>
            <button type="button" className="sa-pick" onClick={() => void openMine(o)}>
              <Mono className="sa-ref">{String(o["number"] ?? "")}</Mono>
              <span className="sa-subtle">
                <Mono>{day(String(o["placed_at"] ?? ""))}</Mono>
              </span>
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}

function Opened() {
  const { t } = useI18n();
  const opened = useAfter((s) => s.opened)!;
  const catalogue = useShop((s) => s.catalogue);
  const today = useAfter((s) => s.extras.today);
  if (opened.state === "loading" || catalogue === null)
    return (
      <div className="sh-loading" aria-busy="true">
        <span className="sh-sr">{t("after.order.loading")}</span>
        <div className="sh-skel sh-skel--title" />
      </div>
    );
  if (opened.state === "failed" || opened.state === "gone" || opened.read === null)
    return (
      <div role="alert" className="sh-note sh-note--bad">
        <CircleAlert size={16} aria-hidden="true" />
        {t(opened.state === "gone" ? "after.order.gone" : "after.order.failed")}
      </div>
    );
  return <OrderCard view={orderView(opened.read, catalogue, today)} />;
}

function OrderCard({ view }: { view: OrderView }) {
  const { t, locale } = useI18n();
  const currency = useShop((s) => s.config.currency);
  const answered = useAfter((s) => s.answered);
  const day = useDay();
  const codes = view.lines.map((l) => l.designCode).filter((c): c is string => c !== null);

  const postLabel =
    view.post === "posted"
      ? rich(t, "after.post.posted", { date: day(view.postedAt) })
      : view.post === "cancelled"
        ? t("after.post.cancelled")
        : view.post === "late"
          ? t("after.post.late")
          : rich(t, "after.post.due", { date: day(view.postBy) });
  return (
    <div className="sa-order">
      <div className="sh-card sa-head-card">
        <div className="sa-head">
          <div className="sa-col">
            <Mono className="sa-number">{view.number}</Mono>
            <span className="sa-subtle">{rich(t, "after.order.ordered", { date: <Mono>{day(view.placedAt)}</Mono>, name: view.name })}</span>
          </div>
          <span className={view.post === "late" || view.post === "cancelled" ? "sa-post sa-post--late sh-mono" : "sa-post sh-mono"}>{postLabel}</span>
        </div>
        <ol className="sa-stages">
          {view.stages.map((stage) => (
            <li key={stage.key} className={stage.done ? "sa-stage sa-stage--done" : "sa-stage"}>
              <span className="sa-stage-bar" aria-hidden="true" />
              <span className="sa-stage-label">
                {t(STAGE_KEYS[stage.key])}
                <span className="sh-sr">{stage.done ? ` · ${t("after.stage.done")}` : ""}</span>
              </span>
              <Mono className="sa-stage-date">{stage.at === null ? "" : stage.due ? t("after.stage.by", { date: day(stage.at) }) : day(stage.at)}</Mono>
            </li>
          ))}
        </ol>
      </div>

      {view.waiting.map((proof) => (
        <ProofCard key={proof.id} proof={proof} />
      ))}
      {view.waiting.length === 0 && answered !== null && (
        <div role="status" className={answered === "approved" ? "sa-answered sa-answered--ok" : "sa-answered"}>
          {answered === "approved" ? <BadgeCheck size={18} aria-hidden="true" /> : <Mail size={18} aria-hidden="true" />}
          <span>{t(answered === "approved" ? "after.proof.approved" : "after.proof.changed")}</span>
        </div>
      )}

      <div className="sh-card sa-list">
        <h2 className="sa-card-head">{t("after.lines.title")}</h2>
        <ul className="sa-rows">
          {view.lines.map((line) => (
            <li key={line.id} className="sa-line">
              <Tile tint={line.tint} className="sa-line-tile">
                <span className="sh-tile-icon">
                  <PieceIcon name={line.icon} size={22} />
                </span>
              </Tile>
              <div className="sa-col sa-grow">
                <div className="sa-line-head">
                  <span className="sa-line-name">{line.name}</span>
                  <Mono className="sa-subtle">×{new Intl.NumberFormat(locale).format(line.qty)}</Mono>
                </div>
                {line.options.length > 0 && <span className="sa-faint">{line.options.join(" · ")}</span>}
                {line.lettering !== null && <span className="sa-words sh-mono">“{line.lettering}”</span>}
                {line.designCode !== null && <span className="sa-faint">{t("after.lines.designed")}</span>}
              </div>
            </li>
          ))}
        </ul>
        <div className="sa-total">
          <span className="sa-subtle">{t("after.total")}</span>
          <Mono className="sa-strong">{money(view.total, currency, locale)}</Mono>
        </div>
        <div className="sa-log">
          <h3 className="sa-log-title">{t("after.proofs.title")}</h3>
          {view.log.length === 0 ? (
            <span className="sa-faint">{t("after.proofs.none")}</span>
          ) : (
            <ul className="sa-log-rows">
              {view.log.map((entry, i) => (
                <li key={i} className="sa-log-row">
                  <Mono className="sa-log-when">{day(entry.at)}</Mono>
                  <span className="sa-col">
                    <span className={entry.kind === "approved" ? "sa-log-what sa-log-what--ok" : entry.kind === "change" ? "sa-log-what sa-log-what--warn" : "sa-log-what"}>
                      {entry.kind === "sent" ? t("after.proofs.sent", { version: entry.version }) : t(entry.kind === "approved" ? "after.proofs.approved" : "after.proofs.change")}
                    </span>
                    {entry.detail !== null && <span className="sa-subtle">{entry.kind === "change" ? `“${entry.detail}”` : entry.detail}</span>}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      <div className="sa-ship">
        <Truck size={18} aria-hidden="true" />
        <div className="sa-col">
          <span className="sa-strong">{view.serviceName}</span>
          <span className="sa-subtle">{t(view.dispatch === "posted" ? "after.dispatch.posted" : view.dispatch === "packed" ? "after.dispatch.packed" : "after.dispatch.later")}</span>
          {view.tracking !== null && <span className="sa-subtle">{rich(t, "after.dispatch.tracking", { number: <Mono>{view.tracking}</Mono> })}</span>}
        </div>
      </div>

      <div className="sa-row">
        {codes.length > 0 && (
          <button type="button" className="sh-button" onClick={() => goView("design")}>
            <FolderHeart size={16} aria-hidden="true" />
            {t("after.designs.label")}
          </button>
        )}
        {view.lines.length > 0 && (
          <button
            type="button"
            className="sh-button"
            onClick={() => {
              goView("find");
              void loadAgain();
            }}
          >
            <RotateCcw size={16} aria-hidden="true" />
            {t("after.order.again")}
          </button>
        )}
      </div>
    </div>
  );
}

function ProofCard({ proof }: { proof: OrderView["waiting"][number] }) {
  const { t } = useI18n();
  const picture = useAfter((s) => s.pictures[proof.id] ?? null);
  const change = useAfter((s) => s.change);
  const answering = useAfter((s) => s.answering);
  const failed = useAfter((s) => s.answerFailed);
  const day = useDay();
  const box = useRef<HTMLTextAreaElement>(null);
  const open = change.proofId === proof.id;
  const empty = open && change.tried && change.note.trim() === "";
  const boxId = `sa-change-${proof.id}`;
  useEffect(() => {
    if (open) box.current?.focus();
  }, [open]);
  const busy = answering === proof.id;

  return (
    <div className="sa-proof" aria-labelledby={`sa-proof-${proof.id}`} role="group">
      <div className="sa-proof-head">
        <Eye size={18} aria-hidden="true" />
        <h2 id={`sa-proof-${proof.id}`} className="sa-proof-title">
          {t("after.proof.waiting")}
        </h2>
      </div>
      <div className="sa-proof-body">
        <div className="sa-proof-grid">
          <div className="sa-proof-picture">
            {picture !== null ? (
              <img src={picture} alt={t("after.proof.picture", { version: proof.version, piece: proof.productName })} />
            ) : (
              <Tile tint={proof.tint} className="sa-proof-tile">
                {proof.words.length === 0 ? (
                  <span className="sh-tile-icon">
                    <PieceIcon name={proof.icon} size={34} />
                  </span>
                ) : (
                  <span className="sa-proof-words">
                    {proof.words.map((w, i) => (
                      <span key={i}>{w}</span>
                    ))}
                  </span>
                )}
              </Tile>
            )}
            {proof.sizeText !== null && <span className="sa-proof-size sh-mono">{proof.sizeText}</span>}
          </div>
          <div className="sa-col">
            <span className="sa-strong">{proof.productName}</span>
            <p className="sh-small">{proof.note ?? t("after.proof.detail")}</p>
            <Mono className="sa-faint">{rich(t, "after.proof.sent", { when: day(proof.sentAt) })}</Mono>
          </div>
        </div>
        <div className="sa-row">
          <button type="button" className="sh-button sh-button--accent sh-button--big" aria-busy={busy || undefined} onClick={() => void answerProof(proof.id, "approved")}>
            {t("after.proof.yes")}
          </button>
          <button type="button" className="sh-button" aria-expanded={open} aria-controls={boxId} onClick={() => openChange(open ? null : proof.id)}>
            {t("after.proof.change")}
          </button>
        </div>
        {open && (
          <div id={boxId} className="sa-change">
            <label className="sh-form-field">
              <span className="sh-form-label">{t("after.proof.what")}</span>
              <textarea
                ref={box}
                className={empty ? "sh-input sh-input--bad sa-textarea" : "sh-input sa-textarea"}
                rows={3}
                maxLength={400}
                value={change.note}
                placeholder={t("after.proof.placeholder")}
                aria-invalid={empty}
                aria-describedby={empty ? `${boxId}-err` : undefined}
                onChange={(e) => typeChange(e.target.value)}
              />
              {empty && (
                <span id={`${boxId}-err`} className="sh-field-error">
                  <CircleAlert size={14} aria-hidden="true" />
                  {t("after.proof.err.empty")}
                </span>
              )}
            </label>
            <div className="sa-row">
              <button
                type="button"
                className="sh-button sh-button--ink"
                aria-busy={busy || undefined}
                onClick={() =>
                  void answerProof(proof.id, "change_asked").then((done) => {
                    if (done === "fix") box.current?.focus();
                  })
                }
              >
                {busy ? t("after.sending") : t("after.proof.send")}
              </button>
            </div>
          </div>
        )}
        {failed && (
          <div role="alert" className="sh-note sh-note--bad">
            <CircleAlert size={16} aria-hidden="true" />
            {t("after.proof.failed")}
          </div>
        )}
      </div>
    </div>
  );
}
