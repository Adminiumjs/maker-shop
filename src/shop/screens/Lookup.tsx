/**
 * Finding an order: its number and the e-mail it was ordered with, then the
 * six-digit code Adminium e-mails to that address. Your order and Order
 * again both open this way; neither opens anything on a number alone or an
 * address alone.
 */
import { CircleAlert, Mail } from "lucide-react";
import { useEffect, useRef, useState, type ClipboardEvent, type KeyboardEvent } from "react";

import { useI18n, type MessageKey } from "../../i18n/index.tsx";
import { backToFind, checkCode, findOrder, lookupErrors, normaliseRef, resendCode, typeLookup, useAfter, type LookupKey } from "../after.ts";
import { Mono } from "../parts.tsx";
import { useShop } from "../store.ts";
import { rich } from "../words.tsx";

/** The code's life, as Adminium gives it (a link and its code last twenty minutes). */
const CODE_MINUTES = 20;

const focusSoon = (id: string) => setTimeout(() => document.getElementById(id)?.focus(), 0);

function FieldError({ id, children }: { id: string; children: string }) {
  return (
    <span id={id} className="sh-field-error">
      <CircleAlert size={14} aria-hidden="true" />
      {children}
    </span>
  );
}

/** The seconds left before another code may be asked for, counted down from each code sent. */
function useResendWait(sends: number, canResend: boolean): number {
  const [wait, setWait] = useState(30);
  useEffect(() => {
    setWait(30);
    const timer = setInterval(() => setWait((n) => Math.max(0, n - 1)), 1000);
    return () => clearInterval(timer);
  }, [sends]);
  return canResend ? 0 : Math.max(1, wait);
}

export function LookupForm({ which }: { which: LookupKey }) {
  const { t } = useI18n();
  const lookup = useAfter((s) => s.lookups[which]);
  const prefix = useShop((s) => s.catalogue?.studio.refPrefix ?? null) ?? "BR-";
  const errors = lookup.tried ? lookupErrors(lookup) : {};
  const id = `sh-lk-${which}`;

  const refErr: MessageKey | null = errors.ref === "empty" ? "after.lookup.err.refEmpty" : errors.ref === "shape" ? "after.lookup.err.refShape" : null;
  const emailErr: MessageKey | null = errors.email === "empty" ? "after.lookup.err.emailEmpty" : errors.email === "shape" ? "after.form.err.emailShape" : null;
  const whole: MessageKey | null = lookup.err === "mismatch" ? "after.lookup.err.mismatch" : lookup.err === "noMail" ? "after.lookup.err.noMail" : lookup.err === "unreachable" ? "after.err.unreachable" : null;

  const find = async () => {
    const done = await findOrder(which);
    const after = useAfter.getState().lookups[which];
    if (done === "code") focusSoon(`${id}-code-0`);
    else if (done === "fix") {
      const e = lookupErrors(after);
      focusSoon(e.ref !== undefined || after.err === "mismatch" ? `${id}-ref` : `${id}-email`);
    }
  };
  const onEnter = (e: KeyboardEvent) => {
    if (e.key === "Enter") void find();
  };

  if (lookup.step === "code") return <CodeStep which={which} />;
  if (lookup.step !== "find") return null;
  const bad = (own: boolean) => own || whole === "after.lookup.err.mismatch";
  return (
    <div className="sh-card sa-lookup">
      <div className="sh-form-grid">
        <div className="sh-form-field">
          <label className="sh-form-label" htmlFor={`${id}-ref`}>
            {t("after.lookup.ref")}
          </label>
          <input
            id={`${id}-ref`}
            className={bad(refErr !== null) ? "sh-input sh-input--bad sh-mono" : "sh-input sh-mono"}
            value={lookup.ref}
            onChange={(e) => typeLookup(which, { ref: e.target.value })}
            onKeyDown={onEnter}
            placeholder={`${prefix}0000`}
            autoComplete="off"
            aria-invalid={bad(refErr !== null)}
            aria-describedby={[refErr === null ? null : `${id}-ref-err`, whole === null ? null : `${id}-err`].filter(Boolean).join(" ") || undefined}
          />
          {refErr !== null && <FieldError id={`${id}-ref-err`}>{t(refErr, { prefix })}</FieldError>}
        </div>
        <div className="sh-form-field">
          <label className="sh-form-label" htmlFor={`${id}-email`}>
            {t("after.lookup.email")}
          </label>
          <input
            id={`${id}-email`}
            type="email"
            className={bad(emailErr !== null) ? "sh-input sh-input--bad" : "sh-input"}
            value={lookup.email}
            onChange={(e) => typeLookup(which, { email: e.target.value })}
            onKeyDown={onEnter}
            placeholder="you@example.com"
            autoComplete="email"
            aria-invalid={bad(emailErr !== null)}
            aria-describedby={[emailErr === null ? null : `${id}-email-err`, whole === null ? null : `${id}-err`].filter(Boolean).join(" ") || undefined}
          />
          {emailErr !== null && <FieldError id={`${id}-email-err`}>{t(emailErr)}</FieldError>}
        </div>
      </div>
      {whole !== null && (
        <div id={`${id}-err`} role="alert" className="sh-note sh-note--bad">
          <CircleAlert size={16} aria-hidden="true" />
          {t(whole)}
        </div>
      )}
      <div className="sa-row">
        <button type="button" className="sh-button sh-button--ink" onClick={() => void find()} aria-busy={lookup.busy || undefined}>
          {lookup.busy ? t("after.sending") : t("after.lookup.send")}
        </button>
        <span className="sa-subtle">{t("after.lookup.everyEmail")}</span>
      </div>
    </div>
  );
}

function CodeStep({ which }: { which: LookupKey }) {
  const { t, locale } = useI18n();
  const lookup = useAfter((s) => s.lookups[which]);
  const waitFor = useResendWait(lookup.sends, lookup.canResend);
  const id = `sh-lk-${which}`;
  const first = useRef(false);
  useEffect(() => {
    if (first.current) return;
    first.current = true;
    document.getElementById(`${id}-code-0`)?.focus();
  }, [id]);

  const digits = lookup.digits;
  const setDigits = (next: string, focusAt?: number) => {
    typeLookup(which, { digits: next.replace(/\D/g, "").slice(0, 6) });
    if (focusAt !== undefined) focusSoon(`${id}-code-${Math.max(0, Math.min(5, focusAt))}`);
  };
  const check = async () => {
    const done = await checkCode(which);
    if (done === "fix") focusSoon(`${id}-code-${Math.min(5, useAfter.getState().lookups[which].digits.length)}`);
  };
  const codeErr: MessageKey | null =
    lookup.codeErr === "short"
      ? "after.code.err.short"
      : lookup.codeErr === "wrong"
        ? "after.code.err.wrong"
        : lookup.codeErr === "spent"
          ? "after.code.err.spent"
          : lookup.codeErr === "locked"
            ? "after.code.err.locked"
            : lookup.codeErr === "unreachable"
              ? "after.err.unreachable"
              : null;
  const nf = (n: number, digitsMin = 1) => new Intl.NumberFormat(locale, { minimumIntegerDigits: digitsMin, useGrouping: false }).format(n);
  const wait = `${nf(Math.floor(waitFor / 60))}:${nf(waitFor % 60, 2)}`;

  return (
    <div className="sh-card sa-lookup sa-code">
      <div className="sa-code-head">
        <span className="sa-icon">
          <Mail size={17} aria-hidden="true" />
        </span>
        <div className="sa-col">
          <span id={`${id}-code-title`} className="sa-strong">
            {t("after.code.title")}
          </span>
          <span className="sa-subtle">{rich(t, "after.code.for", { ref: <Mono className="sa-ref">{normaliseRef(lookup.ref)}</Mono>, minutes: new Intl.NumberFormat(locale).format(CODE_MINUTES) })}</span>
        </div>
      </div>
      <div role="group" aria-labelledby={`${id}-code-title`} aria-describedby={codeErr === null ? undefined : `${id}-code-err`} className="sa-digits">
        {[0, 1, 2, 3, 4, 5].map((i) => (
          <input
            key={i}
            id={`${id}-code-${i}`}
            className={codeErr === null ? "sa-digit sh-mono" : "sa-digit sa-digit--bad sh-mono"}
            value={digits[i] ?? ""}
            inputMode="numeric"
            maxLength={6}
            autoComplete="one-time-code"
            aria-label={t("after.code.digit", { n: i + 1, all: 6 })}
            aria-invalid={codeErr !== null}
            onChange={(e) => {
              const typed = e.target.value.replace(/\D/g, "");
              if (typed === "") {
                setDigits(digits.slice(0, i) + digits.slice(i + 1));
                return;
              }
              setDigits((digits.slice(0, i) + typed).slice(0, 6), i + typed.length);
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter") void check();
              if (e.key === "Backspace" && (digits[i] ?? "") === "" && i > 0) {
                e.preventDefault();
                setDigits(digits.slice(0, i - 1), i - 1);
              }
              if (e.key === "ArrowLeft" || e.key === "ArrowRight") {
                const rtl = document.documentElement.getAttribute("dir") === "rtl";
                const back = (e.key === "ArrowLeft") !== rtl;
                const next = document.getElementById(`${id}-code-${i + (back ? -1 : 1)}`);
                if (next !== null) {
                  e.preventDefault();
                  next.focus();
                }
              }
            }}
            onPaste={(e: ClipboardEvent<HTMLInputElement>) => {
              const pasted = e.clipboardData.getData("text").replace(/\D/g, "");
              if (pasted.length > 1) {
                e.preventDefault();
                setDigits(pasted, pasted.length - 1);
              }
            }}
          />
        ))}
      </div>
      {codeErr !== null && (
        <div id={`${id}-code-err`} role="alert" className="sh-note sh-note--bad">
          <CircleAlert size={16} aria-hidden="true" />
          {t(codeErr)}
        </div>
      )}
      <div className="sa-row">
        <button type="button" className="sh-button sh-button--accent" onClick={() => void check()} aria-busy={lookup.busy || undefined}>
          {lookup.busy ? t("after.code.checking") : which === "order" ? t("after.code.open") : t("after.code.show")}
        </button>
        <button type="button" className="sh-button sa-resend" aria-disabled={waitFor > 0} onClick={() => void resendCode(which).then((sent) => sent && focusSoon(`${id}-code-0`))}>
          {waitFor > 0 ? t("after.code.resendIn", { time: wait }) : t("after.code.resend")}
        </button>
        <button type="button" className="sa-text-button" onClick={() => backToFind(which)}>
          {t("after.code.back")}
        </button>
      </div>
    </div>
  );
}
