/**
 * The overlays and the toasts.
 *
 * Two overlays in the shopper build: the mobile nav sheet, and the
 * character-limit warning — which exists because "Add to basket" refusing
 * silently is the one thing the personalization field must never do. It names
 * the number it is over by, which is the same rule the proof gate follows one
 * module over.
 *
 * On the workshop side, the two an add-on brings: CONNECT, which says what it
 * will be able to do and takes a key if it needs one, and DISCONNECT, which
 * names what goes and what stays before anything happens (24 D16). Neither
 * existed: the Add-ons shelf carried one button labelled with the add-on's own
 * name and switching it either way said nothing at all.
 *
 * Escape closes whatever is open. The scrim is clickable for the same reason.
 */

import { KeyRound, MailCheck, Scissors, ShieldCheck, TriangleAlert, Unplug, X } from "lucide-react";
import { useEffect, useId, useState } from "react";

import { credentialState, type AddOn, type CredentialState } from "../add-ons/host.ts";
import { Affiliation } from "./Affiliation.tsx";
import { useT, type MessageKey } from "../i18n/index.tsx";
import { PRODUCT_BY_KEY } from "../lib/catalogue.ts";
import { keepDigits, materialSurface, num, parseCount } from "../lib/format.ts";
import { useStore, type MakerView, type ShopperView } from "../state/store.ts";
import { orderItem } from "../add-ons/records.ts";
import { AddOnSlot } from "./AddOnSlot.tsx";
import { Icon } from "./Icon.tsx";
import { Field, Typed } from "./Primitives.tsx";

/**
 * The slide-in sheet has TWO lists, because it serves two products.
 *
 * The shopper's hamburger and the workshop's are the same control in the same
 * corner, and a maker who opened it on a phone and got "Ask us for something"
 * would be looking at somebody else's shop.
 */
const MAKER_LINKS: { view: MakerView; key: string }[] = [
  { view: "today", key: "nav.today" },
  { view: "orders", key: "nav.orders" },
  { view: "proofs", key: "bench.nav.proofs" },
  { view: "post", key: "bench.nav.post" },
  { view: "customers", key: "bench.nav.customers" },
  { view: "pieces", key: "nav.pieces" },
  { view: "materials", key: "nav.materials" },
  { view: "machines", key: "bench.nav.machines" },
  { view: "addons", key: "bench.nav.addons" },
];

const NAV_LINKS: { view: ShopperView; key: string }[] = [
  { view: "shop", key: "nav.shop" },
  { view: "order", key: "nav.order" },
  { view: "about", key: "nav.about" },
  { view: "postage", key: "footer.postage" },
  { view: "care", key: "footer.care" },
  { view: "reorder", key: "footer.reorder" },
  { view: "ask", key: "footer.ask" },
  { view: "wrong", key: "footer.wrong" },
];

export function Overlays() {
  const t = useT();
  const overlay = useStore((s) => s.overlay);
  const closeOverlay = useStore((s) => s.closeOverlay);
  const go = useStore((s) => s.go);
  const config = useStore((s) => s.config);
  const productKey = useStore((s) => s.productKey);
  const persona = useStore((s) => s.persona);

  useEffect(() => {
    if (overlay.kind === "none") return undefined;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") closeOverlay();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [overlay.kind, closeOverlay]);

  if (overlay.kind === "none") return null;

  if (overlay.kind === "nav") {
    const links = persona === "maker" ? MAKER_LINKS : NAV_LINKS;
    return (
      <>
        <div className="br-drawer-scrim" onClick={closeOverlay} aria-hidden="true" />
        <nav className="br-navsheet" aria-label={t("nav.shop")}>
          <button
            type="button"
            className="br-iconbtn br-btn"
            aria-label={t("common.close")}
            onClick={closeOverlay}
            style={{ alignSelf: "flex-end" }}
          >
            <X size={18} aria-hidden="true" />
          </button>
          {links.map((link) => (
            <button
              key={link.view}
              type="button"
              className="br-navlink"
              onClick={() => go(link.view)}
            >
              {t(link.key as never)}
            </button>
          ))}
        </nav>
      </>
    );
  }

  if (overlay.kind === "proof") return <ProofSheet refValue={overlay.ref} />;
  if (overlay.kind === "spoil") return <SpoilSheet refValue={overlay.ref} lineId={overlay.lineId} />;
  if (overlay.kind === "connect") return <ConnectDialog addOnKey={overlay.addOn} />;
  if (overlay.kind === "disconnect") return <DisconnectConfirm addOnKey={overlay.addOn} />;

  // The character-limit warning.
  const product = productKey === null ? undefined : PRODUCT_BY_KEY[productKey];
  const limit = product?.personalize?.limitChars ?? 0;
  const over = Math.max(0, (config?.note.length ?? 0) - limit);

  return (
    <>
      <div className="br-modal-scrim" onClick={closeOverlay} aria-hidden="true" />
      <div className="br-modal br-modal--narrow" role="dialog" aria-modal="true">
        {/* Its own title and its own way out. Headed "Make it yours" it read
            as the panel behind it rather than as the refusal it is, and a
            "Close" button says nothing about what the shopper should do next. */}
        <div className="br-modal-head">
          <TriangleAlert size={18} aria-hidden="true" style={{ color: "var(--danger)" }} />
          <span>{t("screen.product.limit.title")}</span>
        </div>
        <div className="br-modal-body">
          <p style={{ margin: 0, lineHeight: 1.6 }}>
            {t("screen.product.personal.over", { over })}
          </p>
          <p style={{ margin: "10px 0 0", lineHeight: 1.6, color: "var(--fg-muted)" }}>
            {t("screen.product.limit.body")}
          </p>
        </div>
        <div className="br-modal-foot">
          <button type="button" className="br-button" onClick={closeOverlay}>
            {t("screen.product.limit.cta")}
          </button>
        </div>
      </div>
    </>
  );
}

export function Toasts() {
  const toasts = useStore((s) => s.toasts);
  const dismiss = useStore((s) => s.dismissToast);

  return (
    <div className="br-toasts" role="status" aria-live="polite">
      {toasts.map((toast) => (
        <button
          key={toast.id}
          type="button"
          className={toast.tone === "neutral" ? "br-toast" : `br-toast br-toast--${toast.tone}`}
          onClick={() => dismiss(toast.id)}
        >
          {toast.message}
        </button>
      ))}
    </div>
  );
}

/**
 * Sending the picture.
 *
 * It shows exactly what is going out — every piece and the words on it — because
 * the whole point of the gate is that nothing is cut until the customer has
 * seen what we read. Sending locks the pieces; the toast says so.
 */
function ProofSheet({ refValue }: { refValue: string }) {
  const t = useT();
  const closeOverlay = useStore((s) => s.closeOverlay);
  const sendTheProof = useStore((s) => s.sendTheProof);
  const order = useStore((s) => s.orders.find((o) => o.ref === refValue));
  if (order === undefined) return null;

  return (
    <>
      <div className="br-modal-scrim" onClick={closeOverlay} aria-hidden="true" />
      <div className="br-modal" role="dialog" aria-modal="true">
        <div className="br-modal-head">
          <MailCheck size={18} aria-hidden="true" />
          <span>{t("bench.proof.title", { ref: order.ref })}</span>
        </div>
        <div className="br-modal-body br-stack br-stack--tight">
          <p style={{ margin: 0, lineHeight: 1.6 }}>
            {t("bench.proof.body", { customer: order.customer })}
          </p>
          {order.lines.map((line) => {
            const product = PRODUCT_BY_KEY[line.productKey];
            if (product === undefined) return null;
            return (
              <div key={line.id} className="br-proofrow-face">
                {/*
                 * `cart.line.preview` — THE MAKER SEES WHAT IS BEING SENT
                 * (24 AC17).
                 *
                 * This dialog is where somebody presses "send the picture", and
                 * it drew a material tile with a Lucide icon on it: an honest
                 * empty state, and not a picture of anything anybody had
                 * personalized. So with the personalizer connected the SHOPPER
                 * approved a render (`screens/Order.tsx` mounts this same slot)
                 * and the maker sending it had never seen one — which is the
                 * exact failure a proof exists to prevent, with the two sides
                 * the wrong way round.
                 *
                 * THE TILE IS THE FALLBACK, so with nothing connected this
                 * dialog is exactly the dialog it has always been. The same
                 * arrangement `Order.tsx` uses, for the same reason: the tile
                 * is the host's own finished content and an add-on REPLACES it
                 * rather than filling a gap it left.
                 */}
                <AddOnSlot
                  slot="cart.line.preview"
                  payload={{
                    line: orderItem(line, t(`data.product.${product.key}.name` as never)),
                  }}
                  fallback={
                    <span
                      className="br-orderline-tile"
                      style={{ backgroundImage: materialSurface(line.materialKey) }}
                    >
                      <Icon name={product.icon} size={17} />
                    </span>
                  }
                />
                <div>
                  <div className="br-line-name">
                    {t(`data.product.${product.key}.name` as never)}
                  </div>
                  <div className="br-orderline-opts">
                    {line.note.trim() === "" ? (
                      t("bench.card.nothingWritten")
                    ) : (
                      /*
                       * `<Typed>`, NOT `<Mono>` — the six other screens that
                       * print a customer's engraving all use it, and this one
                       * did not. The words are somebody else's: without
                       * `dir="auto"` the bidi algorithm reorders their
                       * punctuation against an Arabic paragraph, and a year in
                       * them ("The Pinfold · 2019") reads as a Latin quantity
                       * this shop worked out rather than as text to engrave.
                       */
                      <Typed>{`“${line.note}”`}</Typed>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
        <div className="br-modal-foot">
          <button type="button" className="br-button br-button--ghost" onClick={closeOverlay}>
            {t("common.close")}
          </button>
          <button type="button" className="br-button" onClick={() => sendTheProof(order.ref)}>
            {t("bench.proof.send")}
          </button>
        </div>
      </div>
    </>
  );
}

/**
 * A blank was ruined.
 *
 * The number is asked for rather than assumed, because two coasters spoiled out
 * of a set of four is a different amount of walnut from one, and the shelf is
 * the only place that difference shows up.
 */
function SpoilSheet({ refValue, lineId }: { refValue: string; lineId: string }) {
  const t = useT();
  const closeOverlay = useStore((s) => s.closeOverlay);
  const recordSpoiled = useStore((s) => s.recordSpoiled);
  /*
   * SEEDED IN THE READER'S OWN DIGITS, not with the string "1".
   *
   * An input's value is read off the screen and is not in `textContent`, so a
   * Latin `1` here was a Latin digit on an Arabic page that only a guard
   * reading input values could see — and only if the tour ever opened this
   * dialog, which until now it did not. `keepDigits` then lets the reader type
   * in the digits their keyboard produces instead of silently swallowing them.
   */
  const [blanks, setBlanks] = useState(() => num(1));

  const n = parseCount(blanks);
  const valid = !Number.isNaN(n) && n > 0;

  return (
    <>
      <div className="br-modal-scrim" onClick={closeOverlay} aria-hidden="true" />
      <div className="br-modal br-modal--narrow" role="dialog" aria-modal="true">
        <div className="br-modal-head">
          <Scissors size={18} aria-hidden="true" />
          <span>{t("bench.spoil.title")}</span>
        </div>
        <div className="br-modal-body br-stack br-stack--tight">
          <p style={{ margin: 0, lineHeight: 1.6 }}>{t("bench.spoil.body")}</p>
          <label className="br-field">
            <span className="br-label">{t("bench.spoil.howMany")}</span>
            <input
              className="br-input br-input--mono br-fld"
              inputMode="numeric"
              value={blanks}
              onChange={(e) => setBlanks(keepDigits(e.target.value))}
            />
          </label>
        </div>
        <div className="br-modal-foot">
          <button type="button" className="br-button br-button--ghost" onClick={closeOverlay}>
            {t("common.close")}
          </button>
          <button
            type="button"
            className="br-button br-button--danger"
            disabled={!valid}
            onClick={() => recordSpoiled(refValue, lineId, n)}
          >
            {t("bench.spoil.record")}
          </button>
        </div>
      </div>
    </>
  );
}

/**
 * The add-on both dialogs are about, or `null` — the registry is the only place
 * the host looks one up, and it holds whatever was registered rather than a
 * list this file knows.
 */
function useAddOn(key: string): AddOn | null {
  const registry = useStore((s) => s.registry);
  return registry.byKey(key) ?? null;
}

/**
 * SWITCHING ONE ON (24 §5.6, D11, D15).
 *
 * Three shapes, and the host does not know which add-on is which: it reads
 * `connect` and `demoSwitch` off the object `register()` returned.
 *
 *   `none`      — said out loud, positively, rather than left as an empty
 *                 credential form for the studio to puzzle over.
 *   `api-key`   — a key field, and above it the add-on's OWN declared switch
 *                 for "use the demo instead". While that is on the field is
 *                 disabled, because there is nothing to reach.
 *
 * THE KEY NEVER LEAVES THIS COMPONENT. It is `useState` here and is dropped
 * with the dialog; what reaches the store is the boolean `keyGiven`, which is
 * the fact D16's confirm has to be able to state. A key in a browser-readable
 * store is a leak whatever else is true.
 */
function ConnectDialog({ addOnKey }: { addOnKey: string }) {
  const t = useT();
  const addOn = useAddOn(addOnKey);
  const closeOverlay = useStore((s) => s.closeOverlay);
  const connectAddOn = useStore((s) => s.connectAddOn);
  const patchAddOnSettings = useStore((s) => s.patchAddOnSettings);
  const settings = useStore((s) => s.addOnSettings);
  const toast = useStore((s) => s.toast);
  const [key, setKey] = useState("");
  const fieldId = useId();

  if (addOn === null) return null;

  const demoSwitch = addOn.demoSwitch;
  const demo =
    demoSwitch === undefined ? false : (settings[addOn.key]?.[demoSwitch.key] ?? false) === true;
  const needsKey = addOn.connect === "api-key" && !demo;
  const ready = !needsKey || key.trim() !== "";

  return (
    <>
      <div className="br-modal-scrim" onClick={closeOverlay} aria-hidden="true" />
      <div className="br-modal" role="dialog" aria-modal="true">
        <div className="br-modal-head">
          <span className="br-monogram">{addOn.monogram}</span>
          <span>{t("bench.addons.connectTitle", { name: addOn.shortName })}</span>
        </div>
        <div className="br-modal-body br-stack br-stack--tight">
          <p style={{ margin: 0, lineHeight: 1.6 }}>{t(addOn.whatKey as never)}</p>

          {addOn.connect === "none" && (
            <p className="br-perm br-perm--plain">
              <ShieldCheck size={14} aria-hidden="true" /> {t("bench.addons.noAccount")}
            </p>
          )}

          {addOn.connect === "api-key" && (
            <>
              {/*
                D11, DECLARED RATHER THAN RECOGNISED. The add-on names which of
                its OWN settings means "do not reach the third party" and
                supplies the words; this dialog flips that setting and skips the
                key while it is on, without learning what the third party is.
               */}
              {demoSwitch !== undefined && (
                <button
                  type="button"
                  className="br-switch"
                  aria-pressed={demo}
                  onClick={() => patchAddOnSettings(addOn.key, { [demoSwitch.key]: !demo })}
                >
                  <span className="br-switch-track" aria-hidden="true">
                    <span className="br-switch-knob" />
                  </span>
                  <span className="br-switch-body">
                    <span className="br-switch-label">{t(demoSwitch.labelKey as never)}</span>
                    <span className="br-switch-note">
                      {t((demo ? demoSwitch.noteOnKey : demoSwitch.noteOffKey) as never)}
                    </span>
                  </span>
                </button>
              )}
              <Field label={<span id={fieldId}>{t("bench.addons.key")}</span>}>
                <input
                  className="br-input br-input--mono"
                  type="password"
                  autoComplete="off"
                  disabled={demo}
                  aria-labelledby={fieldId}
                  value={key}
                  onChange={(e) => setKey(e.target.value)}
                  placeholder="••••••••••••"
                />
              </Field>
              <p className="br-perm br-perm--plain">
                <KeyRound size={14} aria-hidden="true" /> {t("bench.addons.keyNote")}
              </p>
            </>
          )}

          {/*
           * AC6, on the dialog as well as on the card. This is the surface that
           * puts the company's monogram in its own title bar, and a reader who
           * opened it straight from the dock never saw the shelf.
           */}
          <Affiliation addOn={addOn} />
        </div>
        <div className="br-modal-foot">
          <button type="button" className="br-button br-button--ghost" onClick={closeOverlay}>
            {t("common.close")}
          </button>
          <button
            type="button"
            className="br-button"
            disabled={!ready}
            onClick={() => {
              connectAddOn(addOn.key, { keyGiven: needsKey });
              toast(t("toast.addOnOn", { name: addOn.shortName }));
            }}
          >
            {t("bench.addons.connect")}
          </button>
        </div>
      </div>
    </>
  );
}

/**
 * THE CONFIRM THAT NAMES WHAT DISAPPEARS AND WHAT STAYS (24 D16).
 *
 * Two labelled blocks, never one paragraph: "are you sure?" teaches a studio
 * nothing, and the fear it leaves behind is that switching an add-on off might
 * take the work with it. It does not — the words a shopper typed on a piece are
 * in the ORDER, in this studio's own column — and this is where that is said.
 *
 * The third block is the half that is about the KEY rather than the work, and
 * it is THREE different sentences, which is one more than it used to be.
 *
 * ── THE CARD THAT SAID BOTH THINGS AT ONCE ──────────────────────────────────
 *
 * It used to be two: "the key you gave it is deleted", or "it never asked for
 * an account, so there is no key to delete", chosen by whether `credentialled`
 * held this add-on. That set only fills when the CONNECT DIALOG reports a typed
 * key — and the dock's toggle, which is how a reviewer switches an add-on on,
 * calls `connectAddOn` with nothing. So the carrier, whose own card two
 * paragraphs up says "This one needs an account", was told on the same screen
 * that it had never asked for one. A reader learns nothing from a card that
 * says both.
 *
 * The two questions are different and both have to be asked. `addOn.connect`
 * is what the ADD-ON needs — an unchanging fact about it. `credentialled` is
 * what this STUDIO has handed over — a fact about this session. So:
 *
 *   connect: "none"            → it never asked, and there is nothing to delete
 *   a key was given            → that key is deleted here
 *   it asks, none given yet    → it does ask, but nothing was given, so there
 *                                is nothing here to delete
 *
 * The third is the honest sentence for an add-on running on its own demo
 * transport (D11), which is the state every reviewer sees.
 */
/** What a disconnect does about the key, for each credential state. */
const CONFIRM_CREDENTIAL_LINE: Readonly<Record<CredentialState, MessageKey>> = {
  "never-asks": "bench.addons.disconnectNoKey",
  "key-held": "bench.addons.disconnectKey",
  "asks-none-given": "bench.addons.disconnectNoKeyYet",
};

function DisconnectConfirm({ addOnKey }: { addOnKey: string }) {
  const t = useT();
  const addOn = useAddOn(addOnKey);
  const closeOverlay = useStore((s) => s.closeOverlay);
  const disconnectAddOn = useStore((s) => s.disconnectAddOn);
  const credentialled = useStore((s) => s.credentialled);
  const toast = useStore((s) => s.toast);
  if (addOn === null) return null;

  /*
   * THE SAME DERIVATION THE CARD READS. This dialog worked out the three states
   * inline and correctly; the card worked out two of them and got the third
   * wrong. One function, two maps of words — see `credentialState` in
   * `add-ons/host.ts`.
   */
  const keyLine = CONFIRM_CREDENTIAL_LINE[credentialState(addOn, credentialled)];

  return (
    <>
      <div className="br-modal-scrim" onClick={closeOverlay} aria-hidden="true" />
      <div className="br-modal br-modal--narrow" role="dialog" aria-modal="true">
        <div className="br-modal-head">
          <Unplug size={18} aria-hidden="true" style={{ color: "var(--danger)" }} />
          <span>{t("bench.addons.disconnectTitle", { name: addOn.shortName })}</span>
        </div>
        <div className="br-modal-body br-stack br-stack--tight">
          {addOn.disconnect !== undefined && (
            <>
              <div>
                <div className="br-eyebrow">{t("bench.addons.disconnectGoes")}</div>
                <p style={{ margin: 0, lineHeight: 1.6 }}>{t(addOn.disconnect.goesKey as never)}</p>
              </div>
              <div>
                <div className="br-eyebrow">{t("bench.addons.disconnectKeeps")}</div>
                <p style={{ margin: 0, lineHeight: 1.6 }}>{t(addOn.disconnect.staysKey as never)}</p>
              </div>
            </>
          )}
          <p className="br-perm br-perm--plain">
            <KeyRound size={14} aria-hidden="true" />{" "}
            {t(keyLine)}
          </p>
          {/* AC6 — this dialog names the company in its own title. */}
          <Affiliation addOn={addOn} />
        </div>
        <div className="br-modal-foot">
          <button type="button" className="br-button br-button--ghost" onClick={closeOverlay}>
            {t("bench.addons.keepConnected")}
          </button>
          <button
            type="button"
            className="br-button br-danger-hover"
            onClick={() => {
              disconnectAddOn(addOn.key);
              toast(t("toast.addOnOff", { name: addOn.shortName }));
            }}
          >
            {t("bench.addons.disconnect")}
          </button>
        </div>
      </div>
    </>
  );
}
