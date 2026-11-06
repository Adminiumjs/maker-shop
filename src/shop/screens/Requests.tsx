/**
 * "Ask us for something" and "If something's wrong": two guest writes,
 * each behind the human check and the per-address caps Adminium keeps, each
 * e-mailing the shopper a copy and the studio its own. A problem names one
 * of the shopper's orders by its number, and Adminium finds it among the
 * orders sent to the address typed, or refuses it.
 */
import { CircleAlert, MailCheck } from "lucide-react";
import { useEffect, useRef, type ReactNode } from "react";

import { useI18n, type MessageKey } from "../../i18n/index.tsx";
import { againForm, askErrors, problemErrors, sendAsk, sendProblem, typeAsk, typeProblem, useAfter, type FormState, type ProblemKind } from "../after.ts";
import { Swatch } from "../parts.tsx";
import { goView, useShop } from "../store.ts";

const focusSoon = (id: string) => setTimeout(() => document.getElementById(id)?.focus(), 0);

/** What a refusal Adminium gave says, on its field or for the whole request. */
function refusalKey(refused: FormState<unknown>["refused"]): MessageKey | null {
  if (refused === null) return null;
  if (refused.code === "UNREACHABLE") return "after.err.unreachable";
  if (refused.code === "PUBLIC_LIMIT_REACHED") return "after.form.err.limit";
  if (refused.reason === "plain-text") return "after.form.err.plain";
  return "after.form.err.refused";
}

function Field({ id, label, error, children }: { id: string; label: string; error: string | null; children: ReactNode }) {
  return (
    <div className="sh-form-field">
      <label className="sh-form-label" htmlFor={id}>
        {label}
      </label>
      {children}
      {error !== null && (
        <span id={`${id}-err`} className="sh-field-error">
          <CircleAlert size={14} aria-hidden="true" />
          {error}
        </span>
      )}
    </div>
  );
}

const input = (bad: boolean, extra = "") => `sh-input${bad ? " sh-input--bad" : ""}${extra === "" ? "" : ` ${extra}`}`;
const tied = (id: string, bad: boolean) => ({ "aria-invalid": bad, "aria-describedby": bad ? `${id}-err` : undefined });

function Sent({ title, body, again, onAgain }: { title: MessageKey; body: MessageKey; again: MessageKey; onAgain: () => void }) {
  const { t } = useI18n();
  const heading = useRef<HTMLHeadingElement>(null);
  useEffect(() => heading.current?.focus(), []);
  return (
    <div className="sh-card sa-sent">
      <span className="sa-sent-icon">
        <MailCheck size={24} aria-hidden="true" />
      </span>
      <h1 ref={heading} tabIndex={-1} className="sh-h1 sh-h1--confirm">
        {t(title)}
      </h1>
      <p role="status" className="sh-lede">
        {t(body)}
      </p>
      <div className="sa-row sa-row--centre">
        <button type="button" className="sh-button sh-button--accent" onClick={() => goView("shop")}>
          {t("shop.back.shop")}
        </button>
        <button type="button" className="sh-button" onClick={onAgain}>
          {t(again)}
        </button>
      </div>
    </div>
  );
}

export function AskScreen() {
  const { t } = useI18n();
  const ask = useAfter((s) => s.ask);
  const materials = useShop((s) => s.catalogue?.materials) ?? [];
  const errors = ask.tried ? askErrors(ask.values) : {};
  const refusedOn = ask.refused?.column ?? null;
  const refused = refusalKey(ask.refused);
  // The families the studio works in, each once, with the colour of its first stock.
  const families = materials.filter((m, i) => materials.findIndex((n) => n.family === m.family) === i);

  if (ask.sent !== null) return <Sent title="after.ask.sent.title" body="after.ask.sent.body" again="after.ask.sent.again" onAgain={() => againForm("ask")} />;

  const send = async () => {
    const done = await sendAsk();
    if (done === "fix") {
      const e = askErrors(useAfter.getState().ask.values);
      const on = useAfter.getState().ask.refused?.column;
      focusSoon(e.idea !== undefined || on === "idea" ? "sa-ask-what" : e.name !== undefined || on === "name" ? "sa-ask-name" : on === "wanted_when" ? "sa-ask-when" : "sa-ask-email");
    }
  };
  const fieldError = (column: string, own: MessageKey | null): string | null => (own !== null ? t(own) : refusedOn === column && refused !== null ? t(refused) : null);
  const whatErr = fieldError("idea", errors.idea === undefined ? null : "after.ask.err.what");
  const nameErr = fieldError("name", errors.name === undefined ? null : "after.ask.err.name");
  const emailErr = fieldError("email", errors.email === "empty" ? "after.ask.err.email" : errors.email === "shape" ? "after.form.err.emailShape" : null);
  const whenErr = fieldError("wanted_when", null);
  const whole = refused !== null && !["idea", "name", "email", "wanted_when"].includes(refusedOn ?? "") ? refused : null;

  return (
    <section className="sh-screen sa-page sa-page--narrow" aria-labelledby="sa-ask-title">
      <h1 id="sa-ask-title" className="sh-h1 sh-h1--page sa-h1">
        {t("after.ask.title")}
      </h1>
      <p className="sh-lede sa-intro">{t("after.ask.intro")}</p>
      <div className="sh-card sa-form">
        <Field id="sa-ask-what" label={t("after.ask.what")} error={whatErr}>
          <textarea id="sa-ask-what" className={input(whatErr !== null, "sa-textarea")} rows={4} maxLength={200} value={ask.values.idea} placeholder={t("after.ask.whatPlaceholder")} onChange={(e) => typeAsk({ idea: e.target.value })} {...tied("sa-ask-what", whatErr !== null)} />
        </Field>
        <div>
          <div id="sa-ask-material-label" className="sh-form-label sa-gap-s">
            {t("after.ask.material")}
          </div>
          <div className="sa-chips" role="group" aria-labelledby="sa-ask-material-label">
            {families.map((m) => (
              <button key={m.family} type="button" className="sh-chip sa-chip" aria-pressed={ask.values.material === m.family} onClick={() => typeAsk({ material: ask.values.material === m.family ? "" : m.family })}>
                <Swatch colour={m.tint} shape="square" size={12} />
                {m.family}
              </button>
            ))}
          </div>
        </div>
        <Field id="sa-ask-when" label={t("after.ask.when")} error={whenErr}>
          <input id="sa-ask-when" className={input(whenErr !== null)} maxLength={80} value={ask.values.when} placeholder={t("after.ask.whenPlaceholder")} onChange={(e) => typeAsk({ when: e.target.value })} {...tied("sa-ask-when", whenErr !== null)} />
        </Field>
        <div className="sh-form-grid">
          <Field id="sa-ask-name" label={t("after.ask.name")} error={nameErr}>
            <input id="sa-ask-name" className={input(nameErr !== null)} maxLength={80} value={ask.values.name} autoComplete="name" onChange={(e) => typeAsk({ name: e.target.value })} {...tied("sa-ask-name", nameErr !== null)} />
          </Field>
          <Field id="sa-ask-email" label={t("after.ask.email")} error={emailErr}>
            <input id="sa-ask-email" type="email" className={input(emailErr !== null)} value={ask.values.email} autoComplete="email" placeholder="you@example.com" onChange={(e) => typeAsk({ email: e.target.value })} {...tied("sa-ask-email", emailErr !== null)} />
          </Field>
        </div>
        {whole !== null && (
          <div role="alert" className="sh-note sh-note--bad">
            <CircleAlert size={16} aria-hidden="true" />
            {t(whole)}
          </div>
        )}
        <button type="button" className="sh-button sh-button--accent sh-button--wide" aria-busy={ask.sending || undefined} onClick={() => void send()}>
          {ask.sending ? t("after.sending") : t("after.form.send")}
        </button>
        <p className="sa-faint sa-centre">{t("after.ask.noPayment")}</p>
      </div>
    </section>
  );
}

const KINDS: [ProblemKind, MessageKey, MessageKey][] = [
  ["damaged", "after.wrong.kind.damaged", "after.wrong.kind.damaged.sub"],
  ["wrong", "after.wrong.kind.wrong", "after.wrong.kind.wrong.sub"],
  ["late", "after.wrong.kind.late", "after.wrong.kind.late.sub"],
  ["mind", "after.wrong.kind.mind", "after.wrong.kind.mind.sub"],
];

export function ProblemScreen() {
  const { t } = useI18n();
  const problem = useAfter((s) => s.problem);
  const prefix = useShop((s) => s.catalogue?.studio.refPrefix ?? null) ?? "BR-";
  const errors = problem.tried ? problemErrors(problem.values) : {};
  const refusedOn = problem.refused?.column ?? null;
  const refused = refusalKey(problem.refused);
  // An order Adminium did not find among the address's own: said on the number, as Your order says it.
  const mismatch = problem.refused !== null && (refusedOn === "order_ref" || refusedOn === "order_id");

  if (problem.sent !== null) return <Sent title="after.wrong.sent.title" body="after.wrong.sent.body" again="after.wrong.sent.again" onAgain={() => againForm("problem")} />;

  const send = async () => {
    const done = await sendProblem();
    if (done === "fix") {
      const s = useAfter.getState().problem;
      const e = problemErrors(s.values);
      const on = s.refused?.column;
      focusSoon(e.ref !== undefined || on === "order_ref" || on === "order_id" ? "sa-wr-ref" : e.email !== undefined || on === "email" ? "sa-wr-email" : e.name !== undefined || on === "name" ? "sa-wr-name" : e.what !== undefined ? "sa-wr-kind-0" : "sa-wr-details");
    }
  };
  const refErr = errors.ref === "empty" ? t("after.lookup.err.refEmpty", { prefix }) : errors.ref === "shape" ? t("after.lookup.err.refShape", { prefix }) : mismatch ? t("after.lookup.err.mismatch") : null;
  const emailErr = errors.email === "empty" ? t("after.lookup.err.emailEmpty") : errors.email === "shape" ? t("after.form.err.emailShape") : refusedOn === "email" && refused !== null ? t(refused) : null;
  const nameErr = errors.name !== undefined ? t("after.wrong.err.name") : refusedOn === "name" && refused !== null ? t(refused) : null;
  const kindErr = errors.what !== undefined ? t("after.wrong.err.kind") : null;
  const detailsErr = errors.details !== undefined ? t("after.wrong.err.details") : refusedOn === "details" && refused !== null ? t(refused) : null;
  const whole = refused !== null && !mismatch && !["email", "name", "details"].includes(refusedOn ?? "") ? refused : null;

  return (
    <section className="sh-screen sa-page sa-page--narrow" aria-labelledby="sa-wr-title">
      <h1 id="sa-wr-title" className="sh-h1 sh-h1--page sa-h1">
        {t("after.wrong.title")}
      </h1>
      <p className="sh-lede sa-intro">{t("after.wrong.intro")}</p>
      <div className="sh-card sa-form">
        <div className="sh-form-grid">
          <Field id="sa-wr-ref" label={t("after.lookup.ref")} error={refErr}>
            <input id="sa-wr-ref" className={input(refErr !== null, "sh-mono")} value={problem.values.ref} placeholder={`${prefix}0000`} autoComplete="off" onChange={(e) => typeProblem({ ref: e.target.value })} {...tied("sa-wr-ref", refErr !== null)} />
          </Field>
          <Field id="sa-wr-email" label={t("after.lookup.email")} error={emailErr}>
            <input id="sa-wr-email" type="email" className={input(emailErr !== null)} value={problem.values.email} placeholder="you@example.com" autoComplete="email" onChange={(e) => typeProblem({ email: e.target.value })} {...tied("sa-wr-email", emailErr !== null)} />
          </Field>
        </div>
        <Field id="sa-wr-name" label={t("after.ask.name")} error={nameErr}>
          <input id="sa-wr-name" className={input(nameErr !== null)} maxLength={80} value={problem.values.name} autoComplete="name" onChange={(e) => typeProblem({ name: e.target.value })} {...tied("sa-wr-name", nameErr !== null)} />
        </Field>
        <div>
          <div id="sa-wr-kind-label" className="sh-form-label sa-gap-s">
            {t("after.wrong.what")}
          </div>
          <div role="radiogroup" aria-labelledby="sa-wr-kind-label" aria-describedby={kindErr === null ? undefined : "sa-wr-kind-err"} className="sh-services">
            {KINDS.map(([kind, label, sub], i) => {
              const on = problem.values.what === kind;
              return (
                <button
                  key={kind}
                  id={`sa-wr-kind-${i}`}
                  type="button"
                  role="radio"
                  aria-checked={on}
                  tabIndex={on || (problem.values.what === "" && i === 0) ? 0 : -1}
                  className="sh-service"
                  onClick={() => typeProblem({ what: kind })}
                  onKeyDown={(e) => {
                    const rtl = document.documentElement.getAttribute("dir") === "rtl";
                    const step = e.key === "ArrowDown" || e.key === (rtl ? "ArrowLeft" : "ArrowRight") ? 1 : e.key === "ArrowUp" || e.key === (rtl ? "ArrowRight" : "ArrowLeft") ? -1 : 0;
                    if (step === 0) return;
                    e.preventDefault();
                    const next = (i + step + KINDS.length) % KINDS.length;
                    typeProblem({ what: KINDS[next]![0] });
                    focusSoon(`sa-wr-kind-${next}`);
                  }}
                >
                  <span className="sh-radio" aria-hidden="true" />
                  <span className="sh-service-text">
                    <span className="sh-service-name">{t(label)}</span>
                    <span className="sa-faint">{t(sub)}</span>
                  </span>
                </button>
              );
            })}
          </div>
          {kindErr !== null && (
            <span id="sa-wr-kind-err" className="sh-field-error sa-gap-t">
              <CircleAlert size={14} aria-hidden="true" />
              {kindErr}
            </span>
          )}
        </div>
        <Field id="sa-wr-details" label={t("after.wrong.details")} error={detailsErr}>
          <textarea id="sa-wr-details" className={input(detailsErr !== null, "sa-textarea")} rows={3} maxLength={200} value={problem.values.details} placeholder={t("after.wrong.detailsPlaceholder")} onChange={(e) => typeProblem({ details: e.target.value })} {...tied("sa-wr-details", detailsErr !== null)} />
        </Field>
        {whole !== null && (
          <div role="alert" className="sh-note sh-note--bad">
            <CircleAlert size={16} aria-hidden="true" />
            {t(whole)}
          </div>
        )}
        <button type="button" className="sh-button sh-button--accent sh-button--wide" aria-busy={problem.sending || undefined} onClick={() => void send()}>
          {problem.sending ? t("after.sending") : t("after.form.send")}
        </button>
      </div>
    </section>
  );
}
