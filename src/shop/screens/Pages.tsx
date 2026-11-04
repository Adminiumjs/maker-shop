/**
 * The footer's pages and the rest: postage and the studio's calendar, About
 * us, looking after a piece, search, the page that isn't there, the sign-in
 * link's page, and Your designs.
 *
 * The calendar marks the studio's own days (its settings) and its closures
 * (a table); the "posted by" examples are a dry run's; postage is each
 * service's stored rate. About us and the care notes are the studio's own
 * words, as it typed them.
 */
import { CalendarDays, CircleAlert, FileText, Truck } from "lucide-react";
import { useEffect, useState } from "react";

import { YourDesigns } from "../../../vendor/customiser/index.js";
import "../../../vendor/customiser/editor.css";
import "../customiser-look.css";

import { useI18n, type MessageKey } from "../../i18n/index.tsx";
import { continueSignIn, loadExamples, loadExtras, openCodes, openDesignLink, peekSignIn, useAfter } from "../after.ts";
import { count, dayLong, dayShort, money } from "../format.ts";
import { Mono, PieceIcon, Tile } from "../parts.tsx";
import { goView, openDesign, openProduct, useShop } from "../store.ts";
import { categoryKey, rich } from "../words.tsx";

const WEEK = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"] as const;

/** The studio's week from its setting ("tue,wed,thu,fri,sat"), or null when it is not one. */
export function studioDays(setting: unknown): Set<string> | null {
  if (typeof setting !== "string") return null;
  const days = setting
    .split(",")
    .map((d) => d.trim().toLowerCase())
    .filter((d) => (WEEK as readonly string[]).includes(d));
  return days.length === 0 ? null : new Set(days);
}

/** `YYYY-MM-DD` and the n-th calendar day after it: laying a calendar out, not dating a promise. */
function plusDays(day: string, n: number): string {
  const [y, m, d] = day.split("-").map(Number);
  return new Date(Date.UTC(y!, m! - 1, d! + n)).toISOString().slice(0, 10);
}
const weekdayOf = (day: string) => WEEK[new Date(`${day}T12:00:00Z`).getUTCDay()]!;

/** The cut-off as the reader's clock writes it ("17:00", "5:00 PM"). */
function clock(cutoff: unknown, locale: string): string {
  const match = typeof cutoff === "string" ? /^(\d{1,2}):(\d{2})$/.exec(cutoff.trim()) : null;
  if (match === null) return "";
  return new Intl.DateTimeFormat(locale === "en-US" ? "en-GB" : locale, { hour: "numeric", minute: "2-digit", timeZone: "UTC" }).format(new Date(Date.UTC(2026, 0, 1, Number(match[1]), Number(match[2]))));
}

/** Days of the week by name, in the reader's language, as a list ("Tuesday to Saturday" is the studio's to say; this lists them). */
function dayNames(days: readonly string[], locale: string): string {
  const tag = locale === "en-US" ? "en-GB" : locale;
  const names = days.map((d) => new Intl.DateTimeFormat(tag, { weekday: "long", timeZone: "UTC" }).format(new Date(Date.UTC(2026, 7, 2 + WEEK.indexOf(d as (typeof WEEK)[number])))));
  try {
    return new Intl.ListFormat(tag, { type: "conjunction" }).format(names);
  } catch {
    return names.join(", ");
  }
}

function Loading() {
  const { t } = useI18n();
  return (
    <div className="sh-loading" aria-busy="true">
      <span className="sh-sr">{t("shop.loading")}</span>
      <div className="sh-skel sh-skel--title" />
    </div>
  );
}

export function PostageScreen() {
  const { t, locale } = useI18n();
  const extras = useAfter((s) => s.extras);
  const catalogue = useShop((s) => s.catalogue);
  const currency = useShop((s) => s.config.currency);
  const port = useShop((s) => s.port);
  useEffect(() => {
    void loadExtras();
    void loadExamples();
  }, [port, catalogue]);
  if (catalogue === null || port === null) return null;
  const settings = port.after().settings();
  const week = studioDays(settings["studio_days"]);
  const cutoff = clock(settings["cutoff"], locale);
  const working = WEEK.filter((d) => week?.has(d));
  const shut = WEEK.filter((d) => week !== null && !week.has(d));
  const closures = (extras.rows?.closures ?? []).filter((c) => c["from_date"] != null);
  const closureOn = (day: string) => closures.find((c) => String(c["from_date"]).slice(0, 10) <= day && day <= String(c["to_date"] ?? c["from_date"]).slice(0, 10)) ?? null;
  const today = extras.today;

  // How long each thing takes: the products' own lead, grouped, their categories named.
  const leads = [...new Set(catalogue.products.map((p) => p.leadDays))].sort((a, b) => a - b);
  const leadRows = leads.map((lead) => {
    const categories = [...new Set(catalogue.products.filter((p) => p.leadDays === lead).map((p) => p.category))];
    const names = categories.map((c) => t(categoryKey(c)));
    let list = names.join(", ");
    try {
      list = new Intl.ListFormat(locale, { type: "unit" }).format(names);
    } catch {
      // the plain join
    }
    return { lead, list };
  });

  // The two examples, as the dry run dated them: the quickest piece and the slowest, ordered now.
  const examples = extras.examples ?? [];
  const quick = examples[0] ?? null;
  const slow = examples.length > 1 ? examples[examples.length - 1]! : null;
  const workingToday = today !== null && week !== null && week.has(weekdayOf(today)) && closureOn(today) === null;

  return (
    <section className="sh-screen sa-page" aria-labelledby="sa-postage-title">
      <h1 id="sa-postage-title" className="sh-h1 sh-h1--page sa-h1">
        {t("after.postage.title")}
      </h1>
      <p className="sh-lede sa-intro">{week === null ? t("after.postage.introPlain") : t("after.postage.intro", { days: dayNames(working, locale), closed: dayNames(shut, locale), cutoff })}</p>

      <h2 className="sa-h2">{t("after.postage.next")}</h2>
      {today === null ? (
        extras.state === "failed" ? (
          <p className="sh-note sh-note--bad">
            <CircleAlert size={16} aria-hidden="true" />
            {t("after.err.unreachable")}
          </p>
        ) : (
          <Loading />
        )
      ) : (
        <ol className="sa-calendar">
          {Array.from({ length: 14 }, (_, i) => plusDays(today, i)).map((day, i) => {
            const closure = closureOn(day);
            const off = week !== null && !week.has(weekdayOf(day));
            const note = closure !== null ? String(closure["reason"] ?? t("after.postage.closure")) : off ? t("after.postage.off") : i === 0 ? t("after.postage.today") : "";
            const kind = closure !== null ? "sa-day sa-day--closed" : off ? "sa-day sa-day--off" : "sa-day";
            return (
              <li key={day} className={i === 0 ? `${kind} sa-day--today` : kind} title={note === "" ? dayLong(day, locale) : `${dayLong(day, locale)} — ${note}`}>
                <span className="sa-day-dow sh-mono">{new Intl.DateTimeFormat(locale, { weekday: "short", timeZone: "UTC" }).format(new Date(`${day}T12:00:00Z`))}</span>
                <span className="sa-day-date sh-mono">{new Intl.DateTimeFormat(locale === "en-US" ? "en-GB" : locale, { day: "numeric", month: "short", timeZone: "UTC" }).format(new Date(`${day}T12:00:00Z`))}</span>
                <span className="sa-day-note">{note}</span>
              </li>
            );
          })}
        </ol>
      )}

      <h2 className="sa-h2">{t("after.postage.leads")}</h2>
      <ul className="sa-table">
        {leadRows.map((row) => (
          <li key={row.lead} className="sa-table-row">
            <span>{row.list}</span>
            <Mono className="sa-strong">{t("after.postage.lead", { count: row.lead }, row.lead)}</Mono>
          </li>
        ))}
      </ul>
      {quick !== null && (
        <div className="sa-example">
          <CalendarDays size={17} aria-hidden="true" />
          <span className="sa-col">
            <Mono className="sa-example-main">
              {workingToday && cutoff !== ""
                ? t("after.postage.example", { cutoff, today: dayShort(today, locale), date: dayShort(quick["post_by"], locale) })
                : t("after.postage.exampleNow", { today: today === null ? "" : dayShort(today, locale), date: dayShort(quick["post_by"], locale) })}
            </Mono>
            <span className="sa-subtle">
              {slow === null
                ? t("after.postage.example2Plain", { piece: String(quick["product_name"] ?? "") })
                : t("after.postage.example2", { piece: String(quick["product_name"] ?? ""), other: String(slow["product_name"] ?? ""), date: dayShort(slow["post_by"], locale) })}
            </span>
          </span>
        </div>
      )}

      <h2 className="sa-h2">{t("after.postage.costs")}</h2>
      <ul className="sh-services">
        {catalogue.services.map((service) => {
          const rates = (extras.rows?.rates ?? []).filter((r) => String(r["service_id"]) === String(service.id)).sort((a, b) => Number(a["min_grams"] ?? 0) - Number(b["min_grams"] ?? 0));
          const first = rates[0];
          return (
            <li key={String(service.id)} className="sh-service sa-service">
              <Truck size={17} aria-hidden="true" />
              <span className="sh-service-text">
                <span className="sh-service-name">{service.name}</span>
                {service.detail !== null && <span className="sa-faint">{service.detail}</span>}
              </span>
              <Mono className="sh-service-price">{first === undefined ? "" : rates.length > 1 ? t("after.postage.from", { price: money(first["price"], currency, locale) }) : money(first["price"], currency, locale)}</Mono>
            </li>
          );
        })}
      </ul>
      <p className="sh-small sa-gap-t">{t("after.postage.counter")}</p>
    </section>
  );
}

export function AboutScreen() {
  const { t } = useI18n();
  const studio = useShop((s) => s.catalogue?.studio ?? null);
  const machines = useAfter((s) => s.extras.rows?.machines ?? []);
  const port = useShop((s) => s.port);
  useEffect(() => {
    void loadExtras();
  }, [port]);
  if (studio === null) return null;
  const paragraphs = (studio.aboutPage ?? studio.about ?? "").split(/\n\s*\n/).map((p) => p.trim()).filter((p) => p !== "");
  const shown = machines.filter((m) => typeof m["shop_note"] === "string" && m["shop_note"] !== "");
  return (
    <section className="sh-screen sa-page" aria-labelledby="sa-about-title">
      <h1 id="sa-about-title" className="sh-h1 sh-h1--page sa-h1">
        {t("after.about.title")}
      </h1>
      <div className="sa-about">
        {paragraphs.map((p, i) => (
          <p key={i}>{p}</p>
        ))}
      </div>
      {shown.length > 0 && (
        <>
          <h2 className="sa-h2">{t("after.about.unit")}</h2>
          <ul className="sa-machines">
            {shown.map((m) => (
              <li key={String(m["id"])} className="sh-card sa-machine">
                <span className="sa-icon">
                  <PieceIcon name={typeof m["icon"] === "string" ? m["icon"] : null} />
                </span>
                <span className="sa-strong">{String(m["name"] ?? "")}</span>
                <span className="sa-subtle">{String(m["shop_note"])}</span>
              </li>
            ))}
          </ul>
        </>
      )}
      {studio.materialsNote != null && studio.materialsNote !== "" && (
        <div className="sa-aside">
          <h2 className="sa-aside-title">{t("after.about.materials")}</h2>
          <p className="sh-small">{studio.materialsNote}</p>
        </div>
      )}
    </section>
  );
}

export function CareScreen() {
  const { t } = useI18n();
  const catalogue = useShop((s) => s.catalogue);
  if (catalogue === null) return null;
  const cards = careCards(catalogue.materials);
  return (
    <section className="sh-screen sa-page sa-page--wide" aria-labelledby="sa-care-title">
      <h1 id="sa-care-title" className="sh-h1 sh-h1--page sa-h1">
        {t("after.care.title")}
      </h1>
      <p className="sh-lede sa-intro">{t("after.care.intro")}</p>
      <ul className="sa-care">
        {cards.map((card) => (
          <li key={card.family} className="sh-card sa-care-card">
            <Tile tint={card.tint} className="sa-care-tile">
              <span className="sa-care-name">{card.family}</span>
            </Tile>
            <ul className="sa-care-lines">
              {card.lines.map((line, i) => (
                <li key={i}>{line}</li>
              ))}
            </ul>
          </li>
        ))}
      </ul>
    </section>
  );
}

/** Each material family's care notes, from its stock's own: the first that says something, a line each. */
export function careCards(materials: readonly { family: string; tint: string | null; care?: string | null }[]): { family: string; tint: string | null; lines: string[] }[] {
  const families = [...new Set(materials.map((m) => m.family))];
  return families
    .map((family) => {
      const own = materials.filter((m) => m.family === family);
      const care = own.find((m) => typeof m.care === "string" && m.care.trim() !== "")?.care ?? "";
      return { family, tint: own[0]?.tint ?? null, lines: care.split("\n").map((l) => l.trim()).filter((l) => l !== "") };
    })
    .filter((card) => card.lines.length > 0);
}

const PAGES: [string, MessageKey, MessageKey][] = [
  ["postage", "after.search.page.postage", "after.search.words.postage"],
  ["care", "after.search.page.care", "after.search.words.care"],
  ["ask", "after.search.page.ask", "after.search.words.ask"],
  ["problem", "after.search.page.wrong", "after.search.words.wrong"],
];

export function SearchScreen() {
  const { t, locale } = useI18n();
  const query = useAfter((s) => s.query);
  const catalogue = useShop((s) => s.catalogue);
  const currency = useShop((s) => s.config.currency);
  if (catalogue === null) return null;
  const q = query.toLocaleLowerCase(locale);
  const family = (id: unknown) => catalogue.materials.find((m) => String(m.id) === String(id));
  const hits =
    q === ""
      ? []
      : catalogue.products.filter((p) => [p.name, family(p.materialId)?.family ?? "", family(p.materialId)?.name ?? "", t(categoryKey(p.category)), p.madeFrom ?? ""].join(" ").toLocaleLowerCase(locale).includes(q));
  const pages = q === "" ? [] : PAGES.filter(([, label, words]) => `${t(label)} ${t(words)}`.toLocaleLowerCase(locale).includes(q));
  return (
    <section className="sh-screen" aria-labelledby="sa-search-title">
      <h1 id="sa-search-title" className="sh-h1 sh-h1--page sa-h1">
        {t("after.search.title", { query })}
      </h1>
      <p className="sa-count sh-mono">{hits.length === 0 ? t("after.search.none") : t("after.search.count", { count: hits.length }, hits.length)}</p>
      {pages.length > 0 && (
        <div className="sa-row sa-gap">
          {pages.map(([view, label]) => (
            <button key={view} type="button" className="sh-button" onClick={() => goView(view as never)}>
              <FileText size={15} aria-hidden="true" />
              {t(label)}
            </button>
          ))}
        </div>
      )}
      {hits.length > 0 && (
        <ul className="sh-grid">
          {hits.map((p) => (
            <li key={String(p.id)}>
              <button type="button" className="sh-piece" onClick={() => openProduct(p.code)}>
                <Tile tint={family(p.materialId)?.tint ?? null} photo={p.photo} className="sh-piece-tile">
                  {p.photo === null && (
                    <span className="sh-tile-icon">
                      <PieceIcon name={p.icon} size={48} />
                    </span>
                  )}
                  {p.sizeText !== null && <span className="sh-tile-chip sh-tile-chip--start sh-mono">{p.sizeText}</span>}
                </Tile>
                <span className="sh-piece-body">
                  <span className="sh-piece-head">
                    <span className="sh-piece-name">{p.name}</span>
                    <Mono className="sh-piece-price">{money(p.price, currency, locale)}</Mono>
                  </span>
                  <span className="sh-piece-material">{t("shop.home.tile.made", { material: family(p.materialId)?.name ?? "", unit: p.unit })}</span>
                  <span className="sh-piece-chips">
                    <span className="sh-pill">{rich(t, "shop.home.tile.lead", { days: <Mono>{count(p.leadDays, locale)}</Mono> })}</span>
                  </span>
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
      {hits.length === 0 && (
        <div className="sh-empty-card sa-empty-card">
          <p className="sh-empty-title">{t("after.search.emptyTitle")}</p>
          <p className="sh-small">{t("after.search.emptyBody")}</p>
          <button type="button" className="sh-button sh-button--accent" onClick={() => goView("ask")}>
            {t("after.search.page.ask")}
          </button>
        </div>
      )}
    </section>
  );
}

export function MissingScreen() {
  const { t, locale } = useI18n();
  return (
    <section className="sh-screen sa-missing" aria-labelledby="sa-missing-title">
      <span className="sa-missing-code sh-mono">{new Intl.NumberFormat(locale, { useGrouping: false }).format(404)}</span>
      <h1 id="sa-missing-title" className="sh-h1 sh-h1--confirm">
        {t("after.missing.title")}
      </h1>
      <p className="sh-small">{t("after.missing.body")}</p>
      <button type="button" className="sh-button sh-button--accent" onClick={() => goView("shop")}>
        {t("shop.back.shop")}
      </button>
    </section>
  );
}

/** The sign-in link's page (`/c#<code>`): who it is for, and Continue. Nothing is used before the press. */
export function SignInScreen() {
  const { t } = useI18n();
  const signIn = useAfter((s) => s.signIn);
  const port = useShop((s) => s.port);
  useEffect(() => {
    const token = window.location.hash.replace(/^#/, "").split("&")[0] ?? "";
    if (port !== null && /^[A-Za-z0-9_-]{8,128}$/.test(token)) void peekSignIn(token);
  }, [port]);
  const used = signIn.state === "used" || (signIn.token === null && port !== null);
  return (
    <section className="sh-screen sa-page sa-page--narrow" aria-labelledby="sa-signin-title">
      <h1 id="sa-signin-title" className="sh-h1 sh-h1--page sa-h1">
        {t("after.signin.title")}
      </h1>
      <div className="sh-card sa-lookup">
        {used ? (
          <>
            <p role="alert" className="sh-note sh-note--bad">
              <CircleAlert size={16} aria-hidden="true" />
              {t("after.signin.used")}
            </p>
            <button type="button" className="sh-button sh-button--accent sh-button--start" onClick={() => goView("order")}>
              {t("after.signin.toOrder")}
            </button>
          </>
        ) : (
          <>
            {signIn.name !== null && <p className="sa-strong">{t("after.signin.hello", { name: signIn.name })}</p>}
            <p className="sh-small">{t("after.signin.body")}</p>
            <button type="button" className="sh-button sh-button--accent sh-button--start" aria-busy={signIn.state === "opening" || signIn.state === "peeking" || undefined} onClick={() => void continueSignIn()}>
              {t("after.signin.continue")}
            </button>
          </>
        )}
      </div>
    </section>
  );
}

/**
 * Your designs: the designs this device holds a link for, and the ones the
 * order open on Your order names (read by their codes). The Customiser draws
 * the list; "Open" opens its editor on the piece, and "Order it" too, where
 * the design is priced with the features it uses before it goes in the basket.
 */
export function DesignsScreen() {
  const { t, locale } = useI18n();
  const port = useShop((s) => s.port);
  const held = useShop((s) => s.held);
  const shop = useShop((s) => s.catalogue?.studio.name ?? "");
  const link = useAfter((s) => s.opened?.read?.lines);
  const codes = link === undefined ? [] : openCodes();
  const state = useDesignLink(port !== null);
  if (port === null) return null;
  return (
    <section className="sh-screen sa-page" aria-label={t("after.designs.label")}>
      {state === "unknown" || state === "closed" ? (
        <p role="alert" className="sh-note sh-note--bad sa-gap">
          <CircleAlert size={16} aria-hidden="true" />
          {t(state === "unknown" ? "after.designs.unknown" : "after.designs.closed")}
        </p>
      ) : null}
      <YourDesigns
        api={port.customiser()}
        held={held}
        codes={codes}
        locale={locale}
        look="maker"
        shop={shop}
        onOpen={(design) => void openDesign(design)}
        onOrder={(design) => void openDesign(design)}
        onForget={(gone) => useShop.setState({ held: useShop.getState().held.filter((one) => String(one.id) !== String(gone.id)) })}
        onChoose={() => goView("shop")}
      />
    </section>
  );
}

/** A saved design's own link in the address bar (`/design#<code>`), opened once and taken off it. */
function useDesignLink(ready: boolean): "idle" | "opened" | "unknown" | "closed" {
  const [state, setState] = useState<"idle" | "opened" | "unknown" | "closed">("idle");
  useEffect(() => {
    if (!ready) return;
    const token = window.location.hash.replace(/^#/, "").split("&")[0] ?? "";
    if (!/^[A-Za-z0-9_-]{8,128}$/.test(token)) return;
    window.history.replaceState(window.history.state, "", `${window.location.pathname}${window.location.search}`);
    void openDesignLink(token).then(setState);
  }, [ready]);
  return state;
}
