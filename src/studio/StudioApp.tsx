/**
 * The studio's shell (comp "maker shell"): the sidebar with the workshop's
 * screens and its calendar, the header with search, the person signed in,
 * and the screen; the nav drawer on a narrow screen; the overlays and toasts.
 *
 * A screen shows only to a person whose roles reach it: Customers to the
 * owner, the post office run to the owner and the packer, the bench to the
 * owner and the maker. What their roles cannot do, Adminium refuses anyway.
 */
import { useEffect, useMemo, type ReactNode } from "react";
import { Eye, LayoutGrid, Layers, Menu, Moon, Package, ReceiptText, Search, Sun, Trees, Truck, Users, X, Zap } from "lucide-react";

import { useData, useEnv } from "./env.tsx";
import { productOf } from "./facts.ts";
import { useFmt } from "./format.ts";
import { navOf, STUDIO_NAV } from "./nav.ts";
import { mayMake, mayPost, mayReadCustomers } from "./roles.ts";
import { go, useStudio, type View } from "./store.ts";
import { TodayScreen } from "./screens/Today.tsx";
import { OrderScreen } from "./screens/Order.tsx";
import { OrdersScreen, PostScreen, ProofsScreen } from "./screens/Lists.tsx";
import { CustomersScreen, NotFoundScreen, ProductScreen, ProductsScreen } from "./screens/People.tsx";
import { Overlays } from "./screens/Overlays.tsx";
import { MachinesScreen, MaterialsScreen, StockCountScreen } from "./screens/Making.tsx";
import { BatchPageScreen, CutListScreen } from "./screens/Batches.tsx";
import { useI18n, useT } from "../i18n/index.tsx";
import { text } from "./wire.ts";
import type { Person } from "./door.ts";

const ICON: Record<string, ReactNode> = {
  "layout-grid": <LayoutGrid size={17} aria-hidden="true" />,
  "receipt-text": <ReceiptText size={17} aria-hidden="true" />,
  eye: <Eye size={17} aria-hidden="true" />,
  truck: <Truck size={17} aria-hidden="true" />,
  users: <Users size={17} aria-hidden="true" />,
  package: <Package size={17} aria-hidden="true" />,
  layers: <Layers size={17} aria-hidden="true" />,
  zap: <Zap size={17} aria-hidden="true" />,
};

/** Which of the studio's screens a person's roles reach. */
export function screensFor(who: Person): string[] {
  return STUDIO_NAV.filter((entry) => {
    switch (entry.view) {
      case "today":
        return mayMake(who);
      case "proofs":
        return who.can("proofs", "read");
      case "post":
        return mayPost(who);
      case "customers":
        return mayReadCustomers(who);
      case "products":
        return who.can("products", "update");
      case "materials":
        return who.can("materials", "read");
      case "machines":
        return who.can("machine_bookings", "read");
      default:
        return who.can("orders", "read");
    }
  }).map((entry) => entry.id);
}

export function StudioApp() {
  const t = useT();
  const data = useStudio((s) => s.data);
  const failure = useStudio((s) => s.failure);
  const theme = useStudio((s) => s.theme);
  const { door } = useEnv();

  useEffect(() => {
    const root = document.documentElement;
    if (theme === null) root.removeAttribute("data-theme");
    else root.setAttribute("data-theme", theme);
  }, [theme]);

  // A person who may not work the bench opens on the first screen they may.
  useEffect(() => {
    const reach = screensFor(door.who());
    const view = useStudio.getState().view;
    if (view === "today" && !reach.includes("today") && reach[0] !== undefined) go(STUDIO_NAV.find((e) => e.id === reach[0])!.view);
  }, [door]);

  if (data === null) {
    return (
      <div className="st-app">
        <main className="st-main">
          {failure === null ? (
            <div role="status" aria-busy="true">
              <span className="st-visually-hidden">{t("studio.loading")}</span>
              <div className="st-skel" />
              <div className="st-skel" />
            </div>
          ) : (
            <div className="st-failed" role="alert">
              <span>{t("studio.failed", { why: failure })}</span>
              <button type="button" className="st-btn" onClick={() => window.location.reload()}>
                {t("studio.retry")}
              </button>
            </div>
          )}
        </main>
      </div>
    );
  }
  return <Shell />;
}

function Shell() {
  const t = useT();
  const fmt = useFmt();
  const data = useData();
  const { door } = useEnv();
  const view = useStudio((s) => s.view);
  const navOpen = useStudio((s) => s.navOpen);
  const toasts = useStudio((s) => s.toasts);
  const who = door.who();
  const reach = screensFor(who);
  const studio = text(data.settings?.["studio_name"]) ?? "";
  const address = text(data.settings?.["address"]) ?? "";

  return (
    <div className="st-app">
      <aside className="st-sidebar">
        <Brand name={studio} />
        <Nav view={view} reach={reach} />
        <Calendar />
      </aside>
      <div className="st-column">
        <header className="st-header">
          <button type="button" className="st-iconbtn st-menu-btn" aria-label={t("studio.menu")} aria-expanded={navOpen} onClick={() => useStudio.setState({ navOpen: true })}>
            <Menu size={17} aria-hidden="true" />
          </button>
          <SearchBox />
          <ThemeButton />
          <span className="st-user">
            <span className="st-user-initials" aria-hidden="true">
              {who.name
                .split(/\s+/)
                .filter(Boolean)
                .slice(0, 2)
                .map((w) => w[0]!.toLocaleUpperCase())
                .join("")}
            </span>
            <span className="st-user-name">{who.name}</span>
          </span>
        </header>
        <main className="st-main" id="st-main">
          <Screen view={view} reach={reach} />
        </main>
        <footer className="st-footer">{t("studio.footer", { year: fmt.year(door.now()), studio, address })}</footer>
      </div>
      {navOpen && (
        <div className="st-drawer-scrim" onClick={() => useStudio.setState({ navOpen: false })} onKeyDown={(e) => e.key === "Escape" && useStudio.setState({ navOpen: false })}>
          <aside className="st-drawer" onClick={(e) => e.stopPropagation()} aria-label={t("studio.menu")}>
            <div className="st-brand">
              <Brand name={studio} />
              <button type="button" className="st-close" aria-label={t("studio.close")} onClick={() => useStudio.setState({ navOpen: false })}>
                <X size={16} aria-hidden="true" />
              </button>
            </div>
            <Nav view={view} reach={reach} />
          </aside>
        </div>
      )}
      <Overlays />
      <div className="st-toasts" role="status" aria-live="polite">
        {toasts.map((toast) => (
          <div key={toast.id} className={`st-toast st-toast--${toast.tone}`}>
            {toast.text}
          </div>
        ))}
      </div>
    </div>
  );
}

function Screen({ view, reach }: { view: View; reach: string[] }) {
  const lit = navOf(view);
  if (view !== "notfound" && STUDIO_NAV.some((e) => e.id === lit) && !reach.includes(lit)) return <NotFoundScreen />;
  switch (view) {
    case "today":
      return <TodayScreen />;
    case "order":
      return <OrderScreen />;
    case "orders":
      return <OrdersScreen />;
    case "proofs":
      return <ProofsScreen />;
    case "post":
      return <PostScreen />;
    case "customers":
      return <CustomersScreen />;
    case "products":
      return <ProductsScreen />;
    case "product":
      return <ProductScreen />;
    case "materials":
      return <MaterialsScreen />;
    case "machines":
      return <MachinesScreen />;
    case "stockcount":
      return <StockCountScreen />;
    case "batch":
      return <BatchPageScreen />;
    case "cutlist":
      return <CutListScreen />;
    default:
      return <NotFoundScreen />;
  }
}

function Brand({ name }: { name: string }) {
  const t = useT();
  return (
    <span className="st-brand">
      <span className="st-brand-mark" aria-hidden="true">
        <Trees size={17} />
      </span>
      <span className="st-brand-text">
        <span className="st-brand-name">{name}</span>
        <span className="st-brand-tag">{t("brand.workshop")}</span>
      </span>
    </span>
  );
}

function Nav({ view, reach }: { view: View; reach: string[] }) {
  const t = useT();
  const lit = navOf(view);
  return (
    <nav className="st-nav" aria-label={t("studio.menu")}>
      {STUDIO_NAV.filter((entry) => reach.includes(entry.id)).map((entry) => (
        <button key={entry.id} type="button" className="st-nav-item" aria-current={lit === entry.id ? "page" : undefined} onClick={() => go(entry.view)}>
          {ICON[entry.icon]}
          {t(entry.labelKey)}
        </button>
      ))}
    </nav>
  );
}

/** The studio's week, from its own setting: "Tuesday to Saturday. Closed Sunday and Monday." */
function Calendar() {
  const t = useT();
  const { locale } = useI18n();
  const { door } = useEnv();
  const days = door.facts().studioDays;
  const words = useMemo(() => {
    const order = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"];
    // 5 January 2026 is a Monday.
    const name = (i: number) => new Intl.DateTimeFormat(locale, { weekday: "long", timeZone: "UTC" }).format(new Date(Date.UTC(2026, 0, 5 + i)));
    const open = order.map((d, i) => ({ d, i })).filter(({ d }) => days.includes(d));
    // The days it is shut, in the order they come after its last working day: "Sunday and Monday".
    const after = (open[open.length - 1]?.i ?? 6) + 1;
    const shut = [...order.slice(after), ...order.slice(0, after)].map((d) => ({ d, i: order.indexOf(d) })).filter(({ d }) => !days.includes(d));
    if (shut.length === 0 || open.length === 0) return t("studio.calendar.open");
    const list = new Intl.ListFormat(locale, { type: "conjunction" });
    return t("studio.calendar.week", { from: name(open[0]!.i), to: name(open[open.length - 1]!.i), closed: list.format(shut.map(({ i }) => name(i))) });
  }, [days, locale, t]);
  return (
    <div className="st-calendar">
      <span className="st-calendar-title">{t("studio.calendar.title")}</span>
      <span className="st-calendar-days">{words}</span>
    </div>
  );
}

function ThemeButton() {
  const t = useT();
  const theme = useStudio((s) => s.theme);
  const dark = theme === "dark" || (theme === null && typeof window !== "undefined" && window.matchMedia?.("(prefers-color-scheme: dark)").matches === true);
  return (
    <button type="button" className="st-iconbtn st-theme" aria-label={t("studio.theme")} onClick={() => useStudio.setState({ theme: dark ? "light" : "dark" })}>
      {dark ? <Sun size={16} aria-hidden="true" /> : <Moon size={16} aria-hidden="true" />}
    </button>
  );
}

/** Find an order by its number, its customer or a piece on it; a product by its name. */
function SearchBox() {
  const t = useT();
  const fmt = useFmt();
  const data = useData();
  const query = useStudio((s) => s.query);
  const q = query.trim().toLocaleLowerCase();
  const results: { key: string; title: string; sub: string; tag: string; open: () => void }[] = [];
  if (q !== "") {
    for (const order of data.orders) {
      const lines = data.lines.filter((l) => String(l["order_id"]) === String(order.id));
      const names = lines.map((l) => text(l["product_name"]) ?? text(productOf(data, l)?.["name"]) ?? "");
      const hit = [text(order["number"]), text(order["name"]), ...names].some((v) => v !== null && v.toLocaleLowerCase().includes(q));
      if (hit) results.push({ key: `o${String(order.id)}`, title: `${text(order["number"]) ?? ""} · ${text(order["name"]) ?? ""}`, sub: names.join(", "), tag: fmt.moment(order["placed_at"]), open: () => go("order", { orderId: order.id }) });
    }
    for (const product of data.products) {
      if ((text(product["name"]) ?? "").toLocaleLowerCase().includes(q)) results.push({ key: `p${String(product.id)}`, title: text(product["name"]) ?? "", sub: text(product["size_text"]) ?? "", tag: fmt.money(product["price"]), open: () => go("product", { productId: product.id }) });
    }
  }
  const shown = results.slice(0, 8);
  return (
    <div className="st-search">
      <span className="st-search-icon">
        <Search size={15} aria-hidden="true" />
      </span>
      <input
        type="search"
        value={query}
        aria-label={t("studio.search.label")}
        placeholder={t("studio.search.placeholder")}
        aria-controls={q === "" ? undefined : "st-results"}
        onChange={(e) => useStudio.setState({ query: e.target.value })}
        onKeyDown={(e) => e.key === "Escape" && useStudio.setState({ query: "" })}
      />
      {q !== "" && (
        <ul className="st-results" id="st-results">
          {shown.map((r) => (
            <li key={r.key}>
              <button type="button" className="st-result" onClick={r.open}>
                <span className="st-result-text">
                  <span className="st-result-title">{r.title}</span>
                  <span className="st-result-sub">{r.sub}</span>
                </span>
                <span className="st-result-tag">{r.tag}</span>
              </button>
            </li>
          ))}
          {shown.length === 0 && <li className="st-noresults">{t("bench.search.none")}</li>}
        </ul>
      )}
    </div>
  );
}
