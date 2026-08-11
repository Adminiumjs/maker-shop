/**
 * Looking an order up, and About us.
 *
 * THE PROOF ACTION IS THE POINT OF THIS SCREEN. A made-to-order shop cannot cut
 * anything until the customer has seen what it will say, so when a picture is
 * waiting there is an "Approve it" button and an "Ask for a change" composer —
 * and the composer REQUIRES a note, because a change with no words is a change
 * the bench cannot act on. Approving moves the piece into the queue and
 * restates the posted-by date rather than leaving the shopper to work out what
 * just happened.
 *
 * The dispatch panel at the bottom is the `order.dispatch.panel` slot. Empty it
 * reads "We post everything ourselves" — a true sentence about how this studio
 * works, not an apology for an absent integration.
 */

import { CircleAlert, Eye, Truck } from "lucide-react";

import { AddOnSlot } from "../components/AddOnSlot.tsx";
import { orderItem, outboundOrderFor, shopClock } from "../add-ons/records.ts";
import { Icon } from "../components/Icon.tsx";
import { Field, Mono, Tile, Typed } from "../components/Primitives.tsx";
import { useT } from "../i18n/index.tsx";
import { PRODUCT_BY_KEY } from "../lib/catalogue.ts";
import { day, shortDay } from "../lib/format.ts";
import {
  SHOPPER_STAGES,
  shipByForOrder,
  shipState,
  shopperStageDates,
  shopperStageIndex,
  type Order,
  type ProofEvent,
} from "../lib/orders.ts";
import { useStore, useToday } from "../state/store.ts";

const HINTS = [
  { ref: "BR-2287", email: "rosa.v@example.com" },
  { ref: "BR-2279", email: "bex.t@example.com" },
  { ref: "BR-2262", email: "hana.w@example.com" },
];

const LOG_LABEL: Record<ProofEvent["kind"], string> = {
  accepted: "screen.order.log.accepted",
  sent: "screen.order.log.sent",
  "change-asked": "screen.order.log.changeAsked",
  approved: "screen.order.log.approved",
};

const LOG_DETAIL: Record<ProofEvent["kind"], string | null> = {
  accepted: "screen.order.log.acceptedDetail",
  sent: "screen.order.log.sentDetail",
  "change-asked": null,
  approved: "screen.order.log.approvedDetail",
};

export function OrderScreen() {
  const t = useT();
  const lookup = useStore((s) => s.lookup);
  const setLookup = useStore((s) => s.setLookup);
  const doLookup = useStore((s) => s.doLookup);
  const lookupRef = useStore((s) => s.lookupRef);
  const lookupError = useStore((s) => s.lookupError);
  const orders = useStore((s) => s.orders);
  const pastOrders = useStore((s) => s.pastOrders);

  const order = [...orders, ...pastOrders].find((o) => o.ref === lookupRef);

  return (
    <section className="br-screen br-narrow">
      <h1 className="br-h1">{t("screen.order.title")}</h1>
      <p className="br-lede">{t("screen.order.intro")}</p>

      <div className="br-panel br-panel-pad br-stack br-stack--tight">
        <div className="br-form-2">
          <Field label={t("screen.order.ref")}>
            <input
              className="br-input br-input--mono br-fld"
              value={lookup.ref}
              placeholder={t("screen.order.refPlaceholder")}
              onChange={(e) => setLookup({ ref: e.target.value })}
            />
          </Field>
          <Field label={t("screen.order.email")}>
            <input
              className="br-input br-fld"
              value={lookup.email}
              placeholder={t("screen.checkout.emailPlaceholder")}
              onChange={(e) => setLookup({ email: e.target.value })}
            />
          </Field>
        </div>

        <div className="br-hints">
          <span className="br-hints-label">{t("screen.order.tryOne")}</span>
          {HINTS.map((hint) => (
            <button
              key={hint.ref}
              type="button"
              className="br-hint br-btn br-mono"
              onClick={() => {
                setLookup(hint);
                doLookup();
              }}
            >
              {hint.ref}
            </button>
          ))}
        </div>

        {lookupError !== null && (
          <div className="br-note br-note--danger">
            <CircleAlert size={16} aria-hidden="true" />
            <span>
              {lookupError === "notFound"
                ? t("screen.order.err.notFound")
                : t("screen.order.err.wrongEmail")}
            </span>
          </div>
        )}

        <button type="button" className="br-button br-button--dark" onClick={doLookup}>
          {t("screen.order.find")}
        </button>
      </div>

      {order !== undefined && <FoundOrder order={order} />}
    </section>
  );
}

function FoundOrder({ order }: { order: Order }) {
  const t = useT();
  const today = useToday();
  const now = useStore((s) => s.now);
  const changeOpen = useStore((s) => s.changeOpen);
  const changeNote = useStore((s) => s.changeNote);
  const toggleChange = useStore((s) => s.toggleChange);
  const setChangeNote = useStore((s) => s.setChangeNote);
  const approve = useStore((s) => s.approve);
  const sendChange = useStore((s) => s.sendChange);
  const toast = useStore((s) => s.toast);

  const shipBy = shipByForOrder(order);
  const late = shipState(shipBy, today) === "late" && order.postedIso === undefined;
  const reached = shopperStageIndex(order);

  /*
   * ASKED FOR, NOT WORKED OUT HERE. These five dates used to be built in this
   * function out of `addStudioDays` and a stored ISO string, and a screen
   * counting days is a screen that can count the wrong ones: swapping one call
   * for plain `addDays` printed a Sunday under a bench this app spends a whole
   * module saying is shut, and every test stayed green. `shopperStageDates` is
   * asserted to land on open days for every order in the seed and for a
   * fortnight of synthetic ones.
   */
  const stageDates = shopperStageDates(order);

  const waiting = order.lines.find((l) => l.proof === "waiting");
  const waitingProduct = waiting === undefined ? undefined : PRODUCT_BY_KEY[waiting.productKey];
  const lastProof = order.proofs.at(-1);

  return (
    <div className="br-stack">
      <div className="br-panel br-panel-pad">
        <div className="br-order-head">
          <div>
            <Mono className="br-order-ref">{order.ref}</Mono>
            <div className="br-order-sub">
              {t("screen.order.orderedOn", {
                day: day(order.placedIso),
                customer: order.customer,
              })}
            </div>
          </div>
          <span className={late ? "br-pill br-pill--danger" : "br-pill br-pill--pos"}>
            {late ? t("screen.order.overdue") : t("screen.order.postedBy", { day: day(shipBy) })}
          </span>
        </div>

        <div className="br-stages">
          {SHOPPER_STAGES.map((stage, i) => (
            <div key={stage} className="br-stage" data-done={i <= reached}>
              <span className="br-stage-bar" />
              <span className="br-stage-label">{t(`screen.order.stage.${stage}` as never)}</span>
              <Mono className="br-stage-date">{shortDay(stageDates[i]!)}</Mono>
            </div>
          ))}
        </div>
      </div>

      {waiting !== undefined && waitingProduct !== undefined && (
        <div className="br-panel br-proof">
          <div className="br-proof-head">
            <Eye size={18} aria-hidden="true" />
            {t("screen.order.proof.title")}
          </div>
          <div className="br-proof-body">
            <div className="br-proof-grid">
              {/*
               * `cart.line.preview` — AND THE PROOF IS THE THIRD OF THE THREE
               * PICTURES (24 AC17).
               *
               * The criterion says the cart thumbnail, THE PROOF and the order
               * line are the same picture. The proof was not in the set: this
               * grid drew a material tile with the piece's icon on it and the
               * customer's words in a chip under it — a good empty state, and
               * not a picture of anything anybody had personalized. So a
               * shopper approved one image and the bench worked from another,
               * which is the exact failure a proof exists to prevent.
               *
               * WHY THIS SLOT ID AND NOT A NEW ONE. The registry is CLOSED at
               * eleven (§5.4) and a twelfth may not be invented for one screen.
               * `cart.line.preview` is the id whose surface is "the picture of
               * one line" and whose payload is exactly that — a `SlotItem` and
               * nothing else. It is named for where it first appeared rather
               * than for all it is, which is a fact about the name; a proof IS
               * one line of an order with its picture beside it, and the fill
               * that draws it is handed the same shape here as in the basket.
               *
               * THE TILE IS THE FALLBACK, so with nothing connected this panel
               * is exactly the screen it has always been. That is not the slot
               * "speaking" in the sense `slots.ts` declares — this is the
               * host's own finished content, the way the note field is on a
               * piece's page (D19), and an add-on replaces it rather than
               * filling a gap it left.
               */}
              <AddOnSlot
                slot="cart.line.preview"
                payload={{
                  line: orderItem(waiting, t(`data.product.${waiting.productKey}.name` as never)),
                }}
                fallback={
              <Tile
                material={waiting.materialKey}
                icon={<Icon name={waitingProduct.icon} size={34} />}
                angle={1}
                className="br-proof-tile"
                chip={<Mono><Typed>{waiting.note}</Typed></Mono>}
              />
                }
              />
              <div className="br-stack br-stack--tight">
                <span className="br-proof-title">
                  {t(`data.product.${waiting.productKey}.name` as never)}
                </span>
                <p className="br-proof-detail">{t("screen.order.proof.detail")}</p>
                {lastProof !== undefined && (
                  <Mono className="br-proof-when">
                    {t("screen.order.proof.sent", { day: day(lastProof.at) })}
                  </Mono>
                )}
              </div>
            </div>

            <div className="br-proof-actions">
              <button
                type="button"
                className="br-button"
                onClick={() => {
                  approve();
                  toast(t("toast.approved", { day: day(shipBy) }), "pos");
                }}
              >
                {t("screen.order.proof.approve")}
              </button>
              <button type="button" className="br-button br-button--ghost" onClick={toggleChange}>
                {t("screen.order.proof.askChange")}
              </button>
            </div>

            {changeOpen && (
              <div className="br-changer">
                <Field label={t("screen.order.change.label")}>
                  <textarea
                    className="br-input br-fld"
                    rows={3}
                    value={changeNote}
                    placeholder={t("screen.order.change.placeholder")}
                    onChange={(e) => setChangeNote(e.target.value)}
                  />
                </Field>
                <div className="br-changer-foot">
                  <button
                    type="button"
                    className="br-button br-button--dark"
                    onClick={() => {
                      if (changeNote.trim() === "") {
                        toast(t("toast.changeNeedsNote"), "warn");
                        return;
                      }
                      sendChange();
                      toast(t("toast.changeSent"), "pos");
                    }}
                  >
                    {t("screen.order.change.send")}
                  </button>
                  <span className="br-changer-hint">
                    {changeNote.trim() === ""
                      ? t("screen.order.change.hintEmpty")
                      : t("screen.order.change.hint")}
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      <div className="br-panel">
        <div className="br-panel-head">{t("screen.order.whatWeAreMaking")}</div>
        {order.lines.map((line) => {
          const product = PRODUCT_BY_KEY[line.productKey]!;
          const size = product.sizes.find((s) => s.key === line.sizeKey);
          return (
            <div key={line.id} className="br-orderline">
              <Tile
                material={line.materialKey}
                icon={<Icon name={product.icon} size={22} />}
                className="br-orderline-tile"
              />
              <div className="br-orderline-body">
                <div className="br-orderline-head">
                  <span>{t(`data.product.${line.productKey}.name` as never)}</span>
                  <Mono className="br-orderline-qty">×{line.quantity}</Mono>
                </div>
                <span className="br-orderline-opts">
                  {[
                    t(`data.material.${line.materialKey}.name` as never),
                    size === undefined ? null : t(`data.size.${size.key}` as never),
                    t(`data.finish.${line.finishKey}` as never),
                  ]
                    .filter(Boolean)
                    .join(" · ")}
                </span>
                {line.note.trim() !== "" && (
                  <Mono className="br-quote-text">
                    <Typed>{`“${line.note}”`}</Typed>
                  </Mono>
                )}
              </div>
            </div>
          );
        })}

        <div className="br-panel-pad">
          <div className="br-panel-title">{t("screen.order.proofs")}</div>
          <div className="br-log">
            {order.proofs.map((event, i) => {
              const detailKey = LOG_DETAIL[event.kind];
              return (
                <div key={`${event.kind}-${i}`} className="br-log-row">
                  <Mono className="br-log-when">{shortDay(event.at)}</Mono>
                  <span className="br-log-body">
                    <span className="br-log-what" data-kind={event.kind}>
                      {t(LOG_LABEL[event.kind] as never)}
                    </span>
                    <span className="br-log-detail">
                      {event.note !== undefined ? (
                        <Typed>{`“${event.note}”`}</Typed>
                      ) : detailKey === null ? (
                        ""
                      ) : (
                        t(detailKey as never)
                      )}
                    </span>
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/*
       * `order.dispatch.panel` — SPEAKS when empty. It says how this studio
       * actually posts things, which is a fact rather than a gap. With a
       * carrier add-on connected, tracking appears here instead — and that is
       * the cross-app claim 24 D21 makes, because the slot id and the contract
       * name a SURFACE rather than this app.
       */}
      {/*
        * THE ORDER, MAPPED INTO THE NEUTRAL SHAPE the slot declares.
        *
        * It used to be `payload={{ order }}` — this app's own record, straight
        * across — and that is precisely the defect: the delivery add-on reads
        * `order.items`, `order.origin` and `order.recipient`, none of which a
        * Birch Row `Order` has, so it compiled and threw. `records.ts` does the
        * conversion, which is the host's job and the seam that makes the add-on
        * portable.
        */}
      <AddOnSlot
        slot="order.dispatch.panel"
        payload={{
          order: outboundOrderFor(order, (key) => t(`data.product.${key}.name` as never)),
          // The studio's own clock. A tracking panel that dates itself from the
          // add-on's pin tells a customer about another shop's Wednesday.
          now: shopClock(today, now),
        }}
        fallback={
      <div className="br-panel br-panel-pad br-dispatch">
        <Truck size={18} aria-hidden="true" />
        <div>
          <div className="br-panel-title">{t("screen.order.dispatch")}</div>
          <div className="br-dispatch-body">
            {order.lines.every((l) => l.stage === "ready-to-post")
              ? t("screen.order.dispatch.packed")
              : t("screen.order.dispatch.empty")}
          </div>
        </div>
      </div>
        }
      />
    </div>
  );
}

export function AboutScreen() {
  const t = useT();
  const machines = useStore((s) => s.machines);

  return (
    <section className="br-screen br-narrow">
      <h1 className="br-h1">{t("screen.about.title")}</h1>
      <div className="br-prose">
        <p>{t("screen.about.p1")}</p>
        <p>{t("screen.about.p2")}</p>
      </div>

      <div className="br-section-head">{t("screen.about.whatsIn")}</div>
      <div className="br-cards">
        {machines.map((machine) => (
          <div key={machine.key} className="br-panel br-panel-pad br-machine">
            <span className="br-machine-mark">
              <Icon name={machine.icon} size={18} />
            </span>
            <span className="br-machine-name">
              {t(`data.machine.${machine.key}.name` as never)}
            </span>
            <span className="br-machine-what">
              {t(`data.machine.${machine.key}.what` as never)}
            </span>
          </div>
        ))}
      </div>

      <div className="br-panel br-panel-pad br-materials-note">
        <div className="br-panel-title">{t("screen.about.materials.title")}</div>
        <p className="br-prose-p">{t("screen.about.materials.body")}</p>
      </div>
    </section>
  );
}
