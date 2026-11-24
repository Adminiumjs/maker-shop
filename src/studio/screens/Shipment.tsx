/**
 * THE SHIPMENT: the card on an order at every status, the Shipments list, and
 * the shop's Ship from.
 *
 * ADMINIUM IS THE RECORD. Whether a label was bought, and what it says, is read
 * from it each time, and again at the moment of a hand-over, because the
 * carrier's own flow on this screen does not tell the studio when it buys.
 *
 * BUYING IS NOT SHIPPING. The order moves and the customer is mailed only when
 * staff press "Handed over", and tracking never moves an order.
 */
import { useCallback, useEffect, useId, useMemo, useRef, useState, type ComponentType } from "react";
import { PackageCheck, RefreshCw } from "lucide-react";

import type { ShipFrom, ShippingDoor, ShippingStatus } from "../../add-ons/shipping-door.ts";
import type { EngineAccess, EngineBooking } from "../../add-ons/vendor/host/engine-carrier.ts";
import { useI18n, useT } from "../../i18n/index.tsx";
import { postOrders } from "../actions.ts";
import { DispatchFill, useCarrierAttached, useShipping } from "../dispatch.tsx";
import { useData, useEnv, useRun } from "../env.tsx";
import { handOverOf, newNumberOf, type HandOver } from "../handover.ts";
import { studioAddress } from "../outbound.ts";
import { countryPrices } from "../countryPrices.ts";
import { mayFixPhone, mayPost } from "../roles.ts";
import { go, toast } from "../store.ts";
import { text, type Row } from "../wire.ts";

type Labels = Record<string, { tracking: string | null; carrier: string | null }>;

const stored = (order: Row) => ({ tracking: text(order["label_tracking"]), carrier: text(order["label_carrier"]) });

async function readBookings(ship: ShippingDoor, access: EngineAccess, order: Row): Promise<readonly EngineBooking[]> {
  if (access.carrier === null) return [];
  return (await ship.client(access.carrier).bookings({ table: "orders", id: String(order.id) })).bookings;
}

/**
 * Which of these orders may go now, each with what its label says, read afresh.
 * An order whose labels cannot be read is held: telling a customer something
 * nobody could check is worse than a parcel waiting for one more press.
 */
export async function checkHandOver(ship: ShippingDoor | null, access: EngineAccess | null, orders: readonly Row[]): Promise<{ go: Row[]; labels: Labels; held: Row[] }> {
  const out: Row[] = [];
  const held: Row[] = [];
  const labels: Labels = {};
  for (const order of orders) {
    let said: HandOver = { may: true, tracking: null, carrier: null };
    if (ship !== null && access !== null) {
      try {
        said = handOverOf(await readBookings(ship, access, order), access.mode);
      } catch {
        held.push(order);
        continue;
      }
    }
    if (!said.may) {
      held.push(order);
      continue;
    }
    const kept = stored(order);
    labels[String(order.id)] = { tracking: said.tracking ?? kept.tracking, carrier: said.carrier ?? kept.carrier };
    out.push(order);
  }
  return { go: out, labels, held };
}

// ── the card ────────────────────────────────────────────────────────────────

export function ShipmentCard({ order }: { order: Row }) {
  const t = useT();
  const { door } = useEnv();
  const { busy, run } = useRun();
  const { ship, access, ready } = useShipping();
  const [bookings, setBookings] = useState<readonly EngineBooking[] | null>(null);
  const [said, setSaid] = useState<string | null>(null);
  const status = String(order["status"]);
  const orderId = String(order.id);

  const read = useCallback(async () => {
    if (ship === null || access === null) return;
    try {
      setBookings(await readBookings(ship, access, { ...order, id: orderId } as Row));
    } catch {
      setBookings(null);
    }
    // The row's id is what is read; a new render of the same order is not a reason to ask again.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ship, access, orderId]);
  useEffect(() => {
    void read();
  }, [read, status]);

  if (ship === null || !ready || access === null) return null;

  const list = bookings ?? [];
  const live = list.find((b) => b.purpose === "outbound" && !b.test && b.state === "booked");
  const sample = list.find((b) => b.purpose === "outbound" && b.test && b.state === "booked");
  const unsettled = list.some((b) => b.purpose === "outbound" && (b.state === "unknown" || b.state === "reserved" || b.state === "calling"));
  const posted = status === "posted";
  const toldNumber = text(order["tracking"]);
  const fresh = posted ? newNumberOf(list, toldNumber) : null;
  const showFlow = status === "ready" || list.length > 0;
  const mayHand = status === "ready" && mayPost(door.who());

  const handOver = () =>
    run(async (d, data) => {
      setSaid(null);
      const checked = await checkHandOver(ship, access, [order]);
      if (checked.go.length === 0) {
        const why = handOverOf(await readBookings(ship, access, order).catch(() => []), access.mode);
        const line = !why.may && why.why === "test" ? t("studio.ship.testLocked") : t("studio.ship.unknownLocked");
        setSaid(line);
        toast(line, "warn");
        return null;
      }
      await postOrders(d, data, checked.go, {}, checked.labels);
      return t("studio.ship.handedToast", { ref: text(order["number"]) ?? "" });
    });

  const tell = () =>
    run(async (d) => {
      if (fresh === null) return null;
      await d.tellNewNumber(order, fresh);
      await read();
      return t("studio.ship.newNumberToast");
    });

  const stateLine = posted ? t("studio.ship.handedOver") : unsettled ? t("studio.ship.unknownLocked") : live !== undefined ? t("studio.ship.notYet") : sample !== undefined ? t("studio.ship.testLocked") : status === "ready" ? null : t("studio.ship.readyFirst");

  return (
    <div className="st-panel st-panel--pad" data-testid="shipment-card">
      <div className="st-postage-head">
        <h2 className="st-panel-title">{t("studio.ship.title")}</h2>
        {sample !== undefined && live === undefined && <span className="st-chip">{t("studio.ship.sample")}</span>}
      </div>
      {stateLine !== null && <p className="st-small">{stateLine}</p>}
      {posted && toldNumber !== null && (
        <p className="st-small">
          {text(order["carrier"]) !== null && `${text(order["carrier"]) ?? ""} · `}
          <span className="st-mono">{toldNumber}</span>
        </p>
      )}
      {fresh !== null && (
        <div className="st-settings" role="group" aria-label={t("studio.ship.newNumber")}>
          <p className="st-small">{t("studio.ship.newNumberBody", { number: fresh.tracking })}</p>
          <button type="button" className="st-btn" disabled={busy} onClick={() => void tell()}>
            {t("studio.ship.newNumber")}
          </button>
        </div>
      )}
      {showFlow && <DispatchFill order={order} />}
      {mayHand && (
        <div className="st-actions">
          <button type="button" className="st-btn st-btn--accent" disabled={busy} onClick={() => void handOver()}>
            <PackageCheck size={15} aria-hidden="true" />
            {t("studio.ship.handOver")}
          </button>
          <span className="st-small">{t("studio.ship.handNote")}</span>
        </div>
      )}
      <span className="st-visually-hidden" role="status">
        {said ?? ""}
      </span>
    </div>
  );
}

// ── the list ────────────────────────────────────────────────────────────────

type ListPieces = typeof import("../../add-ons/shipments.ts");
const LIST_LIMIT = 40;

type Parcel = { order: Row; booking: EngineBooking };

export function ShipmentsScreen() {
  const t = useT();
  const data = useData();
  const { door } = useEnv();
  const { ship, access, ready } = useShipping();
  const [pieces, setPieces] = useState<ListPieces | null>(null);
  const [parcels, setParcels] = useState<Parcel[] | null>(null);
  const [round, setRound] = useState(0);
  const carrier = access?.carrier ?? null;

  useEffect(() => {
    if (ship === null || carrier === null) return;
    let live = true;
    void import("../../add-ons/shipments.ts").then((mod) => {
      mod.connectShipments(ship.client(carrier));
      if (live) setPieces(mod);
    });
    return () => {
      live = false;
    };
  }, [ship, carrier]);

  const candidates = data.orders
    .filter((o) => o["status"] === "ready" || o["status"] === "posted")
    .sort((a, b) => String(b["placed_at"] ?? "").localeCompare(String(a["placed_at"] ?? "")));
  const shown = candidates.slice(0, LIST_LIMIT);
  const key = shown.map((o) => `${String(o.id)}:${String(o["status"])}`).join(",");

  useEffect(() => {
    if (ship === null || access === null || carrier === null) return;
    let live = true;
    void (async () => {
      const found: Parcel[] = [];
      for (const order of shown) {
        try {
          for (const booking of await readBookings(ship, access, order)) if (booking.state === "booked" && booking.purpose === "outbound") found.push({ order, booking });
        } catch {
          // One order that cannot be read leaves its row out; the attention list still names it.
        }
      }
      if (live) setParcels(found);
    })();
    return () => {
      live = false;
    };
    // `key` is what `shown` is.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ship, access, carrier, key, round]);

  if (!ready) return null;
  const open = (id: unknown) => go("order", { orderId: id as Row["id"] });
  const Attention = pieces?.NeedsAttentionList as ComponentType<{ onOpen: (source: { table: string; id: string }) => void; reloadKey?: number }> | undefined;
  const Refresh = pieces?.OpenParcelsRefresh as ComponentType<{ oldestCheckedAt?: number | null; nowMs?: number; hasOpenParcels?: boolean; onRefreshed?: () => void }> | undefined;
  const all = parcels ?? [];
  const delivered = (p: Parcel) => p.booking.track?.status === "DELIVERED";
  const unused = all.filter((p) => p.order["status"] !== "posted");
  const transit = all.filter((p) => p.order["status"] === "posted" && !delivered(p));
  const done = all.filter((p) => p.order["status"] === "posted" && delivered(p));
  const checks = transit.map((p) => p.booking.track?.checkedAt ?? null);
  const oldest = checks.length === 0 || checks.some((c) => c === null) ? null : Math.min(...(checks as number[]));

  const group = (title: string, rows: Parcel[]) =>
    rows.length === 0 ? null : (
      <div className="st-panel st-panel--pad">
        <h2 className="st-panel-title">{title}</h2>
        <ul className="st-shelf">
          {rows.map(({ order, booking }) => (
            <li key={booking.id} className="st-shelf-row">
              <button type="button" className="st-btn st-btn--link" onClick={() => open(order.id)}>
                {text(order["number"])}
              </button>
              <span className="st-shelf-name">{booking.carrierName ?? booking.carrier}</span>
              <span className="st-shelf-amt st-mono">{booking.test ? t("studio.ship.sample") : (booking.tracking ?? "")}</span>
            </li>
          ))}
        </ul>
      </div>
    );

  return (
    <section className="st-screen st-narrow" aria-labelledby="st-shipments-title">
      <div className="st-head st-head--tight">
        <h1 className="st-h1" id="st-shipments-title">
          {t("studio.ship.listTitle")}
        </h1>
      </div>
      <p className="st-lede">{t("studio.ship.listNote")}</p>
      {access === null || carrier === null ? (
        <div className="st-empty">{t("studio.ship.noCarrier")}</div>
      ) : (
        <>
          {Refresh !== undefined && <Refresh oldestCheckedAt={oldest} nowMs={door.now()} hasOpenParcels={transit.length > 0} onRefreshed={() => setRound((n) => n + 1)} />}
          {Attention !== undefined && <Attention onOpen={(source) => open(source.id)} reloadKey={round} />}
          {group(t("studio.ship.unused"), unused)}
          {group(t("studio.ship.transit"), transit)}
          {group(t("studio.ship.delivered"), done)}
          {parcels !== null && all.length === 0 && <div className="st-empty">{t("studio.ship.listEmpty")}</div>}
          {candidates.length > LIST_LIMIT && <p className="st-small">{t("studio.ship.listMore", { count: LIST_LIMIT })}</p>}
        </>
      )}
    </section>
  );
}

// ── Ship from ───────────────────────────────────────────────────────────────

/** Settings has a Ship from for whoever may change the studio's settings, once a carrier is attached and Adminium serves it. */
export function shipFromShown(door: { who(): { can(table: string, action: string): boolean }; shipping(): ShippingDoor | null }, attached: boolean): boolean {
  return attached && door.shipping() !== null && door.who().can("settings", "update");
}

type FormValues = { name: string; street: string; town: string; postcode: string; country: string; phone: string; email: string };

const CODE = /^[A-Za-z]{2}$/;

export function ShipFromPanel({ onSaved }: { onSaved?: () => void }) {
  const t = useT();
  const data = useData();
  const { door } = useEnv();
  const { run, busy } = useRun();
  const id = useId();
  const attached = useCarrierAttached();
  const ship = attached ? door.shipping() : null;
  const [status, setStatus] = useState<ShippingStatus | null | "loading">("loading");
  const [form, setForm] = useState<FormValues | null>(null);
  const [fault, setFault] = useState(false);
  const [said, setSaid] = useState("");

  useEffect(() => {
    if (ship === null) return;
    let live = true;
    void ship
      .status()
      .catch(() => null)
      .then((read) => {
        if (!live) return;
        setStatus(read);
        const held: ShipFrom = read?.shipFrom ?? {};
        const start = studioAddress(data.settings, text(data.settings?.["home_country"]) ?? "");
        setForm({
          name: held.name ?? start.name,
          street: (held.lines ?? start.lines).join(", "),
          town: held.city ?? start.city,
          postcode: held.postcode ?? start.postcode,
          country: held.country ?? start.country,
          phone: held.phone ?? text(data.settings?.["phone"]) ?? "",
          email: held.email ?? text(data.settings?.["email"]) ?? "",
        });
      });
    return () => {
      live = false;
    };
    // Read once when the panel opens: a save answers with what is stored.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ship]);

  if (ship === null || status === "loading" || form === null) return null;
  if (status === null) {
    return (
      <div className="st-panel st-panel--pad st-settings">
        <h2 className="st-panel-title">{t("studio.ship.from")}</h2>
        <p className="st-small">{t("studio.ship.ownerOnly")}</p>
      </div>
    );
  }

  const set = (field: keyof FormValues) => (event: { target: { value: string } }) => setForm({ ...form, [field]: event.target.value });
  const save = () => {
    const country = form.country.trim().toUpperCase();
    if (country !== "" && !CODE.test(country)) {
      setFault(true);
      return;
    }
    setFault(false);
    void run(async (d) => {
      const next = await ship.saveShipFrom({ name: form.name, lines: form.street.split(",").map((part) => part.trim()).filter(Boolean).slice(0, 3), city: form.town, postcode: form.postcode, country, phone: form.phone, email: form.email });
      setStatus(next);
      // A new order starts in the studio's own country, which is this one.
      if (country !== "" && data.settings !== null && text(data.settings["home_country"]) !== country) await d.saveSettings(data.settings, { home_country: country });
      setSaid(t("studio.settings.saved"));
      onSaved?.();
      return t("studio.settings.saved");
    });
  };
  const carrier = status.carriers.find((c) => c.key === status.activeCarrier)?.name ?? null;
  const field = (key: keyof FormValues, label: string, extra?: { line?: string; invalid?: boolean; mono?: boolean }) => (
    <label className="st-field">
      <span className="st-label">{label}</span>
      <input className={`st-input${extra?.mono === true ? " st-input--mono" : ""}`} value={form[key]} onChange={set(key)} aria-invalid={extra?.invalid === true} aria-describedby={extra?.line === undefined ? undefined : `${id}-${key}`} />
      {extra?.line !== undefined && (
        <span className="st-small" id={`${id}-${key}`}>
          {extra.line}
        </span>
      )}
    </label>
  );
  return (
    <div className="st-panel st-panel--pad st-settings">
      <h2 className="st-panel-title">{t("studio.ship.from")}</h2>
      <p className="st-small">{carrier === null ? t("studio.ship.noCarrier") : t("studio.ship.shipsWith", { name: carrier })}</p>
      {field("name", t("studio.ship.field.name"))}
      {field("street", t("studio.ship.field.street"))}
      {field("town", t("studio.ship.field.town"))}
      {field("postcode", t("studio.ship.field.postcode"))}
      {field("country", t("studio.ship.field.country"), { mono: true, invalid: fault, ...(fault ? { line: t("studio.ship.field.countryBad") } : {}) })}
      {field("phone", t("studio.ship.field.phone"), form.phone.trim() === "" ? { line: t("studio.ship.phoneLine") } : {})}
      {field("email", t("studio.ship.field.email"))}
      <p className="st-small">{t("studio.ship.privacy")}</p>
      <p className="st-small">{t("studio.ship.notAffiliated")}</p>
      <div className="st-actions">
        <button type="button" className="st-btn st-btn--accent" disabled={busy} onClick={save}>
          <RefreshCw size={15} aria-hidden="true" />
          {t("studio.ship.save")}
        </button>
      </div>
      <span className="st-visually-hidden" role="status">
        {said}
      </span>
    </div>
  );
}

// ── abroad ──────────────────────────────────────────────────────────────────

type AbroadPieces = typeof import("../../add-ons/countries.ts");

/** "Countries we deliver to" and the customs defaults, for someone who manages shipping and may keep the postage. */
export function AbroadPanels() {
  const { door } = useEnv();
  const { currency } = door.facts();
  const { locale } = useI18n();
  const attached = useCarrierAttached();
  const ship = attached ? door.shipping() : null;
  const abroad = door.abroad();
  const mayKeep = door.who().can("postage_services", "create") && door.who().can("postage_rates", "create");
  const [carrier, setCarrier] = useState<string | null>(null);
  const [pieces, setPieces] = useState<AbroadPieces | null>(null);
  const defaults = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (ship === null || abroad === null || !mayKeep) return;
    let live = true;
    void Promise.all([ship.status().catch(() => null), import("../../add-ons/countries.ts")]).then(([status, mod]) => {
      if (!live || status === null) return;
      const key = status.activeCarrier ?? status.carriers[0]?.key ?? "shipping-shippo";
      mod.connectCountries(ship.client(key));
      setCarrier(key);
      setPieces(mod);
    });
    return () => {
      live = false;
    };
    // Once for the panel: the panels read and save for themselves.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ship, mayKeep]);

  const wired = useMemo(() => {
    if (ship === null || abroad === null || carrier === null || pieces === null) return null;
    const names = new Intl.DisplayNames([locale], { type: "region" });
    return countryPrices(abroad, ship.client(carrier), (code) => names.of(code) ?? code, pieces.savedBody);
    // The door's objects are the same for the session; the language names a new country's row.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ship, carrier, locale, pieces]);

  if (pieces === null || wired === null) return null;
  const { CountriesPanel, CustomsDefaultsPanel } = pieces;
  return (
    <>
      <CountriesPanel
        client={wired.countriesClient}
        prices={wired.prices}
        currency={currency}
        onOpenCustoms={() => {
          defaults.current?.scrollIntoView({ block: "start" });
          defaults.current?.focus();
        }}
      />
      <div ref={defaults} tabIndex={-1}>
        <CustomsDefaultsPanel client={wired.defaultsClient} />
      </div>
    </>
  );
}

/** The same shape Adminium holds a phone column to. */
const PHONE = /^\+?\(?[0-9][0-9\s().-]{4,}$/;

/** The number a carrier is given for an order going abroad, where someone can put a wrong one right. */
export function OrderPhone({ order }: { order: Row }) {
  const t = useT();
  const { door } = useEnv();
  const { run, busy } = useRun();
  const id = useId();
  const held = text(order["phone"]) ?? "";
  const [value, setValue] = useState(held);
  const [bad, setBad] = useState(false);
  useEffect(() => {
    setValue(held);
    setBad(false);
  }, [held]);
  const open = order["status"] !== "posted" && order["status"] !== "cancelled";
  if (!open || !mayFixPhone(door.who())) {
    return held === "" ? null : (
      <p className="st-small">
        {t("studio.ship.field.phone")}: <span className="st-mono" dir="ltr">{held}</span>
      </p>
    );
  }
  const save = () => {
    const next = value.trim();
    if (!PHONE.test(next)) {
      setBad(true);
      return;
    }
    setBad(false);
    void run(async (d) => {
      await d.savePhone(order, next);
      return t("studio.settings.saved");
    });
  };
  return (
    <div className="st-settings" data-testid="order-phone">
      <label className="st-field">
        <span className="st-label">{t("studio.ship.customerPhone")}</span>
        <input className="st-input st-input--mono" dir="ltr" type="tel" value={value} onChange={(event) => { setValue(event.target.value); setBad(false); }} aria-invalid={bad} aria-describedby={`${id}-line`} />
        <span className="st-small" id={`${id}-line`}>
          {t(bad ? "studio.ship.customerPhoneBad" : "studio.ship.customerPhoneLine")}
        </span>
      </label>
      <div className="st-actions">
        <button type="button" className="st-btn" disabled={busy || value.trim() === held} onClick={save}>
          {t("studio.ship.customerPhoneSave")}
        </button>
      </div>
    </div>
  );
}
