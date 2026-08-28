/**
 * The desk: one order, the orders list, proofs, the post office run, and the
 * people who ordered.
 *
 * ONE ORDER is where the customer's own words are quoted EXACTLY, in mono and
 * in quotation marks, because they are going to be cut into a piece of walnut
 * and a paraphrase is how the wrong thing gets made. Beside each piece is the
 * `order.line.actions` slot, which is SILENT when empty — no dashed box, no
 * heading with a gap under it. A maker looking at their own order does not need
 * telling that a feature they have not connected is not there.
 */

import {
  ArrowLeft,
  Bell,
  Check,
  Eye,
  MailCheck,
  PackageCheck,
  Scissors,
  Truck,
  Users,
} from "lucide-react";

import { AddOnSlot } from "../components/AddOnSlot.tsx";
import { lineOrder, orderItem, outboundOrderFor, shopClock } from "../add-ons/records.ts";
import { Icon } from "../components/Icon.tsx";
import { EmptyState, Mono, Tag, Typed } from "../components/Primitives.tsx";
import { useT } from "../i18n/index.tsx";
import { studioDaysBetween } from "../lib/calendar.ts";
import { PRODUCT_BY_KEY } from "../lib/catalogue.ts";
import { cents, day, kg, materialSurface, trim } from "../lib/format.ts";
import { number as localNumber } from "../i18n/ambient.ts";
import {
  POSTAGE,
  consumptionForOrder,
  isLocked,
  lineTotalCents,
  parcelGrams,
  shipByForOrder,
  shipState,
  stockLines,
  type Order,
  type OrderLine,
} from "../lib/orders.ts";
import { countedMaterials, useStore, useToday } from "../state/store.ts";

function useAllOrders(): Order[] {
  const orders = useStore((s) => s.orders);
  return orders;
}

/** What one order is worth, for the list and for a person's record. */
function orderValueCents(order: Order): number {
  return order.lines.reduce((sum, line) => sum + lineTotalCents(line), 0);
}

function townFor(email: string, customers: readonly { email: string; town: string }[]): string {
  return customers.find((c) => c.email.toLowerCase() === email.toLowerCase())?.town ?? "";
}

// ── one order ────────────────────────────────────────────────────────────────

export function MakerOrderScreen() {
  const t = useT();
  const today = useToday();
  const now = useStore((s) => s.now);
  const go = useStore((s) => s.go);
  const ref = useStore((s) => s.makerOrderRef);
  const orders = useAllOrders();
  const customers = useStore((s) => s.customers);
  const materials = useStore((s) => s.materials);
  const stockAdj = useStore((s) => s.stockAdj);
  const openOverlay = useStore((s) => s.openOverlay);
  const markMade = useStore((s) => s.markMade);
  const markReady = useStore((s) => s.markReady);

  const order = orders.find((o) => o.ref === ref);
  if (order === undefined) {
    return (
      <section className="br-screen">
        <EmptyState title={t("bench.orders.title")} body={t("bench.order.none")}>
          <button type="button" className="br-button" onClick={() => go("orders")}>
            {t("bench.order.back")}
          </button>
        </EmptyState>
      </section>
    );
  }

  const shipBy = shipByForOrder(order);
  const state = shipState(shipBy, today);
  const shelf = stockLines(
    countedMaterials(materials, stockAdj),
    orders.filter((o) => o.postedIso === undefined),
  );
  const grams = parcelGrams(order.lines);
  const anyLocked = order.lines.some(isLocked);
  const unsent = order.lines.some((l) => l.proof === "not-sent");

  return (
    <section className="br-screen">
      <button type="button" className="br-backlink br-btn" onClick={() => go("orders")}>
        <ArrowLeft size={15} aria-hidden="true" />
        {t("bench.order.back")}
      </button>

      <div className="br-section-head">
        <div>
          <h1 className="br-h1">
            <Mono>{order.ref}</Mono>
          </h1>
          <p className="br-lede">
            {order.customer}
            {townFor(order.email, customers) !== "" && ` · ${townFor(order.email, customers)}`} ·{" "}
            {t("bench.order.placed", { day: day(order.placedIso) })}
          </p>
        </div>
        <Tag tone={state === "late" ? "danger" : state === "due-soon" ? "warn" : "neutral"}>
          {state === "late"
            ? t("bench.order.overdue", { day: day(shipBy, { day: "numeric", month: "short" }) })
            : t("bench.order.postBy", { day: day(shipBy, { day: "numeric", month: "short" }) })}
        </Tag>
      </div>

      {anyLocked && (
        <div className="br-note br-note--warn">
          <Eye size={17} aria-hidden="true" />
          <span>{t("bench.order.locked")}</span>
        </div>
      )}

      <div className="br-panel br-panel-pad">
        <div className="br-panel-title">{t("bench.order.pieces")}</div>
        <div className="br-stack br-stack--tight">
          {order.lines.map((line) => (
            <MakerLine key={line.id} order={order} line={line} />
          ))}
        </div>
      </div>

      <div className="br-actionbar">
        <button
          type="button"
          className="br-button"
          disabled={!unsent}
          onClick={() => openOverlay({ kind: "proof", ref: order.ref })}
        >
          <MailCheck size={16} aria-hidden="true" />
          {t("bench.order.sendProof")}
        </button>
        <button
          type="button"
          className="br-button br-button--ghost"
          onClick={() => markMade(order.ref)}
        >
          <Check size={16} aria-hidden="true" />
          {t("bench.order.markMade")}
        </button>
        <button
          type="button"
          className="br-button br-button--ghost"
          onClick={() => markReady(order.ref)}
        >
          <PackageCheck size={16} aria-hidden="true" />
          {t("bench.order.markReady")}
        </button>
      </div>

      <div className="br-twocol">
        <div className="br-panel br-panel-pad">
          <div className="br-panel-title">{t("bench.order.history")}</div>
          <div className="br-log">
            {order.proofs.map((event, i) => (
              <div key={`${event.kind}-${i}`} className="br-log-row">
                <Mono className="br-log-when">
                  {day(event.at, { day: "numeric", month: "short" })}
                </Mono>
                <div className="br-log-body">
                  <div className="br-log-what" data-kind={event.kind}>
                    {t(`bench.order.proof.${event.kind}` as never)}
                  </div>
                  {event.note !== undefined && (
                    <div className="br-log-detail">
                      <Mono><Typed>{`“${event.note}”`}</Typed></Mono>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="br-stack">
          <div className="br-panel br-panel-pad">
            <div className="br-panel-title">{t("bench.order.materials")}</div>
            <div className="br-weights">
              {consumptionForOrder(order).map((row) => {
                const line = shelf.find((s) => s.key === row.stockKey);
                return (
                  <div key={row.stockKey} className="br-weights-row">
                    <span>{t(`data.stock.${row.stockKey}.name` as never)}</span>
                    <span>
                      <Mono>
                        {trim(row.amount)}{" "}
                        {row.unit === "grams"
                          ? t("bench.unit.grams")
                          : t(`bench.unit.${row.unit}` as never, undefined, row.amount)}
                      </Mono>
                      <span className="br-muted">
                        {" · "}
                        {t("bench.order.materialLeft", { amount: trim(line?.spare ?? 0) })}
                      </span>
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="br-panel br-panel-pad">
            <div className="br-panel-title">{t("bench.order.postage")}</div>
            <p className="br-panel-note">
              <Mono>{t("bench.order.weight", { weight: kg(grams) })}</Mono>
            </p>
            <div className="br-weights">
              <div className="br-weights-row">
                <span>{t("screen.postage.second.label")}</span>
                <Mono>{cents(POSTAGE.second)}</Mono>
              </div>
              <div className="br-weights-row">
                <span>{t("screen.postage.tracked.label")}</span>
                <Mono>{cents(POSTAGE.tracked)}</Mono>
              </div>
            </div>

            {/*
             * `order.dispatch.actions` — SILENT when empty, and that is the
             * whole of its empty state: the studio walks its parcels to the
             * post office, so with nothing connected the two rows above are the
             * finished panel rather than a stub waiting for something.
             *
             * [Added 2026-08-10, wave 4b.] 24 §8A says this view carries this
             * slot and it was missing — and the suite ASSERTED the omission
             * (`isHosted("order.dispatch.actions") === false`), which locked it
             * in: a guard written around a gap stops being a guard. It is
             * mounted here, beside what a parcel costs and what it weighs,
             * because that is where somebody stands when they are about to book
             * a collection.
             */}
            <AddOnSlot
              slot="order.dispatch.actions"
              payload={{
                order: outboundOrderFor(order, (key) => t(`data.product.${key}.name` as never)),
                /*
                 * WHEN THE STUDIO THINKS IT IS. A dispatch surface has to be
                 * dated against the SHOP's clock — the add-on used to hold its
                 * own and told this bench about the print works' Wednesday.
                 */
                now: shopClock(today, now),
              }}
            />
          </div>
        </div>
      </div>
    </section>
  );
}

function MakerLine({ order, line }: { order: Order; line: OrderLine }) {
  const t = useT();
  const openOverlay = useStore((s) => s.openOverlay);
  const product = PRODUCT_BY_KEY[line.productKey];
  if (product === undefined) return null;

  return (
    <div className="br-benchline">
      <div className="br-orderline-head">
        <span
          className="br-orderline-tile"
          style={{ backgroundImage: materialSurface(line.materialKey) }}
        >
          <Icon name={product.icon} size={17} />
        </span>
        <div className="br-orderline-body">
          <div className="br-line-name">
            {t(`data.product.${product.key}.name` as never)}
            <Mono className="br-orderline-qty">{t("bench.card.qty", { count: line.quantity })}</Mono>
          </div>
          <div className="br-orderline-opts">
            {t(`data.material.${line.materialKey}.name` as never)} ·{" "}
            {t(`data.size.${line.sizeKey}` as never)} · {t(`data.finish.${line.finishKey}` as never)}
          </div>
        </div>
        <Tag tone={isLocked(line) ? "warn" : "neutral"}>
          {isLocked(line) ? t("bench.order.waitingPicture") : t(`bench.col.${line.stage}` as never)}
        </Tag>
      </div>

      {line.note.trim() !== "" && (
        <div className="br-quote">
          <span className="br-quote-label">{t("bench.order.asked")}</span>
          <Mono className="br-quote-text">
            <Typed>{`“${line.note}”`}</Typed>
          </Mono>
        </div>
      )}

      {line.spoiled > 0 && (
        <div className="br-line-spoiled">
          <Mono>{t("bench.order.spoiled", { count: line.spoiled })}</Mono>
        </div>
      )}

      <div className="br-orderline-foot">
        <button
          type="button"
          className="br-linkbtn br-danger-hover br-btn"
          onClick={() => openOverlay({ kind: "spoil", ref: order.ref, lineId: line.id })}
        >
          <Scissors size={14} aria-hidden="true" />
          {t("bench.order.spoil")}
        </button>
        {/*
         * `order.line.actions` — SILENT when empty. No fallback is passed, and
         * that is the whole of its empty state: nothing renders at all.
         */}
        <AddOnSlot
          slot="order.line.actions"
          payload={{
            order: lineOrder(order),
            line: orderItem(line, t(`data.product.${line.productKey}.name` as never)),
          }}
        />
      </div>
    </div>
  );
}

// ── the orders list ──────────────────────────────────────────────────────────

const FILTERS = ["all", "proof", "late", "today", "ready"] as const;

export function OrdersScreen() {
  const t = useT();
  const today = useToday();
  const orders = useAllOrders().filter((o) => o.postedIso === undefined);
  const customers = useStore((s) => s.customers);
  const filter = useStore((s) => s.orderFilter);
  const setOrderFilter = useStore((s) => s.setOrderFilter);
  const openMakerOrder = useStore((s) => s.openMakerOrder);

  const rows = orders
    .map((order) => {
      const shipBy = shipByForOrder(order);
      const days = studioDaysBetween(today, shipBy);
      const waiting = order.lines.some(isLocked);
      const ready = order.lines.every((l) => l.stage === "ready-to-post");
      return { order, shipBy, days, waiting, ready };
    })
    .filter((row) => {
      switch (filter) {
        case "proof":
          return row.waiting;
        case "late":
          return row.days < 0;
        case "today":
          return row.days >= 0 && row.days <= 1;
        case "ready":
          return row.ready;
        default:
          return true;
      }
    })
    .sort((a, b) => (a.shipBy < b.shipBy ? -1 : 1));

  return (
    <section className="br-screen">
      <div className="br-section-head">
        <div>
          <h1 className="br-h1">{t("bench.orders.title")}</h1>
          <p className="br-lede">
            <Mono>{t("bench.orders.count", { count: rows.length }, rows.length)}</Mono>
          </p>
        </div>
      </div>

      <div className="br-filter-row">
        {FILTERS.map((key) => (
          <button
            key={key}
            type="button"
            className="br-pick br-btn"
            aria-pressed={filter === key}
            onClick={() => setOrderFilter(key)}
          >
            {t(`bench.orders.filter.${key}` as never)}
          </button>
        ))}
      </div>

      {rows.length === 0 ? (
        <EmptyState title={t("bench.orders.none")} />
      ) : (
        <div className="br-table-wrap">
          <table className="br-table">
            <thead>
              <tr>
                <th>{t("bench.orders.col.ref")}</th>
                <th>{t("bench.orders.col.customer")}</th>
                <th className="br-wide-only">{t("bench.orders.col.pieces")}</th>
                <th className="br-num">{t("bench.orders.col.value")}</th>
                <th>{t("bench.orders.col.ship")}</th>
              </tr>
            </thead>
            <tbody>
              {rows.map(({ order, shipBy, days, waiting }) => (
                <tr
                  key={order.ref}
                  data-clickable="true"
                  onClick={() => openMakerOrder(order.ref)}
                >
                  <td>
                    <Mono>{order.ref}</Mono>
                  </td>
                  <td>
                    <div>{order.customer}</div>
                    <div className="br-muted">{townFor(order.email, customers)}</div>
                  </td>
                  <td className="br-wide-only">
                    {order.lines
                      .map(
                        (l) =>
                          `${t(`data.product.${l.productKey}.name` as never)} ×${localNumber(l.quantity)}`,
                      )
                      .join(", ")}
                  </td>
                  <td className="br-num">
                    <Mono>{cents(orderValueCents(order))}</Mono>
                  </td>
                  <td>
                    <Tag tone={days < 0 ? "danger" : days <= 1 ? "warn" : "neutral"}>
                      <Mono>{day(shipBy, { day: "numeric", month: "short" })}</Mono>
                    </Tag>
                    {waiting && (
                      <div className="br-muted">{t("bench.order.waitingPicture")}</div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

// ── proofs ───────────────────────────────────────────────────────────────────

export function ProofsScreen() {
  const t = useT();
  const today = useToday();
  const orders = useAllOrders().filter((o) => o.postedIso === undefined);
  const openMakerOrder = useStore((s) => s.openMakerOrder);
  const openOverlay = useStore((s) => s.openOverlay);
  const toast = useStore((s) => s.toast);

  const waiting: { order: Order; line: OrderLine; sentAt: string | null }[] = [];
  const unsent: { order: Order; line: OrderLine }[] = [];

  for (const order of orders) {
    const sent = [...order.proofs].reverse().find((p) => p.kind === "sent");
    for (const line of order.lines) {
      if (line.proof === "waiting") waiting.push({ order, line, sentAt: sent?.at ?? null });
      else if (line.proof === "not-sent") unsent.push({ order, line });
    }
  }

  if (waiting.length === 0 && unsent.length === 0) {
    return (
      <section className="br-screen">
        <EmptyState title={t("bench.proofs.clear")} body={t("bench.proofs.clearBody")} />
      </section>
    );
  }

  return (
    <section className="br-screen">
      <div className="br-section-head">
        <div>
          <h1 className="br-h1">{t("bench.proofs.title")}</h1>
          <p className="br-lede">{t("bench.proofs.sub")}</p>
          <p className="br-lede br-lede--tight">
            {t("bench.proofs.count", { waiting: waiting.length, unsent: unsent.length })}
          </p>
        </div>
      </div>

      {waiting.length > 0 && (
        <div className="br-panel br-panel-pad">
          <div className="br-panel-title">{t("bench.proofs.waiting")}</div>
          <div className="br-stack br-stack--tight">
            {waiting.map(({ order, line, sentAt }) => {
              const waited = sentAt === null ? 0 : studioDaysBetween(sentAt, today);
              return (
                <div key={line.id} className="br-proofrow">
                  <ProofFace order={order} line={line} />
                  <div className="br-proofrow-side">
                    <Mono className="br-proofrow-when" data-late={waited >= 2}>
                      {sentAt === null
                        ? t("bench.proofs.sentToday")
                        : waited <= 0
                          ? t("bench.proofs.sentToday")
                          : t("bench.proofs.waited", { count: waited }, waited)}
                    </Mono>
                    <button
                      type="button"
                      className="br-button br-button--ghost"
                      onClick={() =>
                        toast(t("bench.proofs.nudged", { customer: order.customer, ref: order.ref }))
                      }
                    >
                      <Bell size={15} aria-hidden="true" />
                      {t("bench.proofs.nudge")}
                    </button>
                    <button
                      type="button"
                      className="br-linkbtn br-btn"
                      onClick={() => openMakerOrder(order.ref)}
                    >
                      {t("bench.card.open")}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {unsent.length > 0 && (
        <div className="br-panel br-panel-pad">
          <div className="br-panel-title">{t("bench.proofs.unsent")}</div>
          <div className="br-stack br-stack--tight">
            {unsent.map(({ order, line }) => (
              <div key={line.id} className="br-proofrow">
                <ProofFace order={order} line={line} />
                <div className="br-proofrow-side">
                  <button
                    type="button"
                    className="br-button"
                    onClick={() => openOverlay({ kind: "proof", ref: order.ref })}
                  >
                    <MailCheck size={15} aria-hidden="true" />
                    {t("bench.order.sendProof")}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </section>
  );
}

function ProofFace({ order, line }: { order: Order; line: OrderLine }) {
  const t = useT();
  const product = PRODUCT_BY_KEY[line.productKey];
  if (product === undefined) return null;
  return (
    <div className="br-proofrow-face">
      <span
        className="br-orderline-tile"
        style={{ backgroundImage: materialSurface(line.materialKey) }}
      >
        <Icon name={product.icon} size={17} />
      </span>
      <div>
        <div className="br-line-name">
          <Mono>{order.ref}</Mono> · {order.customer}
        </div>
        <div className="br-orderline-opts">
          {t(`data.product.${product.key}.name` as never)} ·{" "}
          {line.note.trim() === "" ? (
            t("bench.card.nothingWritten")
          ) : (
            <Mono><Typed>{`“${line.note}”`}</Typed></Mono>
          )}
        </div>
      </div>
    </div>
  );
}

// ── the post office run ──────────────────────────────────────────────────────

export function PostRunScreen() {
  const t = useT();
  const today = useToday();
  const orders = useAllOrders().filter((o) => o.postedIso === undefined);
  const customers = useStore((s) => s.customers);
  const packed = useStore((s) => s.packed);
  const togglePacked = useStore((s) => s.togglePacked);
  const markRunPosted = useStore((s) => s.markRunPosted);
  const openMakerOrder = useStore((s) => s.openMakerOrder);

  const rows = orders.filter((o) => o.lines.every((l) => l.stage === "ready-to-post"));

  if (rows.length === 0) {
    return (
      <section className="br-screen">
        <div className="br-section-head">
          <div>
            <h1 className="br-h1">{t("bench.post.title")}</h1>
            <p className="br-lede">{day(today)}</p>
            <p className="br-lede br-lede--tight">{t("bench.post.sub")}</p>
          </div>
        </div>
        <EmptyState title={t("bench.post.empty")} body={t("bench.post.emptyBody")} />
      </section>
    );
  }

  const totalGrams = rows.reduce((sum, o) => sum + parcelGrams(o.lines), 0);

  return (
    <section className="br-screen">
      <div className="br-section-head">
        <div>
          <h1 className="br-h1">{t("bench.post.title")}</h1>
          <p className="br-lede">{day(today)}</p>
          <p className="br-lede br-lede--tight">{t("bench.post.sub")}</p>
        </div>
        <Mono className="br-runsummary">
          {t(
            "bench.post.summary",
            {
              parcels: rows.length,
              weight: kg(totalGrams),
              packed: packed.length,
            },
            rows.length,
          )}
        </Mono>
      </div>

      <div className="br-stack br-stack--tight">
        {rows.map((order) => {
          const grams = parcelGrams(order.lines);
          const ticked = packed.includes(order.ref);
          return (
            <div key={order.ref} className="br-postrow" data-packed={ticked}>
              <button
                type="button"
                className="br-tickbox br-btn"
                aria-pressed={ticked}
                aria-label={t("bench.post.packedBox")}
                onClick={() => togglePacked(order.ref)}
              >
                {ticked && <Check size={14} aria-hidden="true" />}
              </button>
              <div className="br-postrow-body">
                <div className="br-line-name">
                  <Mono>{order.ref}</Mono> · {order.customer}
                </div>
                <div className="br-orderline-opts">
                  {townFor(order.email, customers)} ·{" "}
                  {order.lines
                    .map((l) => `${t(`data.product.${l.productKey}.name` as never)} ×${localNumber(l.quantity)}`)
                    .join(", ")}
                </div>
              </div>
              <div className="br-postrow-side">
                <Mono>{t("bench.post.weight", { weight: kg(grams) })}</Mono>
                <span className="br-muted">
                  {grams > 750 ? t("screen.postage.tracked.label") : t("screen.postage.second.label")}
                </span>
                <button
                  type="button"
                  className="br-linkbtn br-btn"
                  onClick={() => openMakerOrder(order.ref)}
                >
                  {t("bench.card.open")}
                </button>
              </div>
            </div>
          );
        })}
      </div>

      <div className="br-actionbar">
        <button type="button" className="br-button" onClick={markRunPosted}>
          <Truck size={16} aria-hidden="true" />
          {t("bench.post.markRun")}
        </button>
        {/* Everything on the list is packed, so the run is a bag and a walk.
            Saying so beside the button is the difference between a screen that
            tracks work and one that tells you the work is over. */}
        {packed.length === rows.length && (
          <span className="br-actionbar-note">{t("bench.post.allDone")}</span>
        )}
      </div>
    </section>
  );
}

// ── the people who ordered ───────────────────────────────────────────────────

export function CustomersScreen() {
  const t = useT();
  const orders = useAllOrders();
  const pastOrders = useStore((s) => s.pastOrders);
  const customers = useStore((s) => s.customers);
  const selected = useStore((s) => s.customerEmail);
  const openCustomer = useStore((s) => s.openCustomer);
  const openMakerOrder = useStore((s) => s.openMakerOrder);

  const everything = [...orders, ...pastOrders];
  const people = customers
    .map((customer) => {
      const theirs = everything
        .filter((o) => o.email.toLowerCase() === customer.email.toLowerCase())
        .sort((a, b) => (a.placedIso < b.placedIso ? 1 : -1));
      const live = theirs.filter((o) => o.postedIso === undefined);
      return {
        customer,
        orders: theirs,
        live: live.length,
        spend: theirs.reduce((sum, o) => sum + orderValueCents(o), 0),
      };
    })
    .filter((p) => p.orders.length > 0)
    .sort((a, b) => b.spend - a.spend);

  const chosen = people.find((p) => p.customer.email === selected) ?? people[0];

  return (
    <section className="br-screen">
      <div className="br-section-head">
        <div>
          <h1 className="br-h1">{t("bench.customers.title")}</h1>
          <p className="br-lede">{t("bench.customers.sub")}</p>
          <p className="br-lede br-lede--tight">{t("bench.customers.pick")}</p>
        </div>
      </div>

      <div className="br-twocol br-twocol--narrow-first">
        <div className="br-stack br-stack--tight">
          {people.map((person) => (
            <button
              key={person.customer.email}
              type="button"
              className="br-personrow br-btn"
              aria-pressed={chosen?.customer.email === person.customer.email}
              onClick={() => openCustomer(person.customer.email)}
            >
              <span className="br-personrow-body">
                <span className="br-line-name">{person.customer.name}</span>
                <span className="br-orderline-opts">
                  {person.customer.town} ·{" "}
                  <Mono>
                    {t(
                      "bench.customers.meta",
                      { count: person.orders.length, amount: cents(person.spend) },
                      person.orders.length,
                    )}
                  </Mono>
                </span>
              </span>
              {person.live > 0 && (
                <Tag tone="info">
                  <Mono>{t("bench.customers.onBench", { count: person.live })}</Mono>
                </Tag>
              )}
            </button>
          ))}
        </div>

        {chosen !== undefined && (
          <div className="br-stack">
            <div className="br-panel br-panel-pad">
              <div className="br-panel-head">
                <Users size={18} aria-hidden="true" />
                <div>
                  <div className="br-panel-title">{chosen.customer.name}</div>
                  <div className="br-muted">
                    {chosen.customer.town} · {chosen.customer.email}
                  </div>
                </div>
              </div>
              <div className="br-facts">
                <div className="br-fact">
                  <span className="br-fact-key">{t("bench.customers.spend")}</span>
                  <span className="br-fact-value br-mono">{cents(chosen.spend)}</span>
                </div>
                <div className="br-fact">
                  <span className="br-fact-key">{t("bench.customers.count")}</span>
                  <span className="br-fact-value br-mono">{localNumber(chosen.orders.length)}</span>
                </div>
                <div className="br-fact">
                  <span className="br-fact-key">{t("bench.customers.since")}</span>
                  <span className="br-fact-value">
                    {day(chosen.orders[chosen.orders.length - 1]!.placedIso, {
                      day: "numeric",
                      month: "long",
                      year: "numeric",
                    })}
                  </span>
                </div>
                <div className="br-fact">
                  <span className="br-fact-key">{t("bench.customers.fav")}</span>
                  <span className="br-fact-value">
                    {t(`data.material.${favouriteMaterial(chosen.orders)}.name` as never)}
                  </span>
                </div>
              </div>
            </div>

            <div className="br-stack br-stack--tight">
              {chosen.orders.map((order) => (
                <div key={order.ref} className="br-benchline">
                  <div className="br-orderline-head">
                    <div className="br-orderline-body">
                      <div className="br-line-name">
                        <Mono>{order.ref}</Mono> · {day(order.placedIso)}
                      </div>
                      <div className="br-orderline-opts">
                        {order.lines
                          .map(
                            (l) =>
                              `${t(`data.product.${l.productKey}.name` as never)} ×${localNumber(l.quantity)}`,
                          )
                          .join(", ")}
                      </div>
                    </div>
                    {order.postedIso === undefined ? (
                      <button
                        type="button"
                        className="br-linkbtn br-btn"
                        onClick={() => openMakerOrder(order.ref)}
                      >
                        {t("bench.customers.live")}
                      </button>
                    ) : (
                      <span className="br-muted">
                        {t("bench.customers.posted", {
                          day: day(order.postedIso, { day: "numeric", month: "short" }),
                        })}
                      </span>
                    )}
                  </div>
                  {order.lines.some((l) => l.note.trim() !== "") && (
                    <div className="br-quote">
                      <span className="br-quote-label">{t("bench.order.asked")}</span>
                      <Mono className="br-quote-text">
                        {order.lines
                          .filter((l) => l.note.trim() !== "")
                          .map((l, at) => (
                            <span key={`${l.id}-${at}`}>
                              {at > 0 && " · "}
                              <Typed>{`“${l.note}”`}</Typed>
                            </span>
                          ))}
                      </Mono>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </section>
  );
}

/** What this person orders most, by pieces made rather than by money spent. */
function favouriteMaterial(orders: readonly Order[]): string {
  const tally = new Map<string, number>();
  for (const order of orders) {
    for (const line of order.lines) {
      tally.set(line.materialKey, (tally.get(line.materialKey) ?? 0) + line.quantity);
    }
  }
  return [...tally.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))[0]?.[0] ?? "walnut";
}
