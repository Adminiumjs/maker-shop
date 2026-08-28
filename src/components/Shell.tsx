/**
 * The two shells, switched by the dock's persona segment.
 *
 * Shopper: a warm little shop — a wordmark, a search over the pieces, a basket
 * button with a count, a short nav and a centred column with no sidebar.
 * Maker: workshop chrome with a sidebar and a topbar. They are deliberately
 * different products wearing the same tokens; a shopper should never feel they
 * have wandered onto the bench.
 *
 * SESSION 2 fills the maker shell with Today, the batch sheet, the order, the
 * pieces and the materials. What is here now is the chrome those screens hang
 * in, so that adding them is a routing change and not a rebuild.
 */

import {
  Blocks,
  Eye,
  Hammer,
  Layers,
  LayoutGrid,
  Menu,
  Package,
  Search,
  ShoppingBag,
  Trees,
  Truck,
  Users,
  Zap,
} from "lucide-react";
import type { ReactNode } from "react";

import { useT } from "../i18n/index.tsx";
import { STUDIO } from "../data/demo.ts";
import { PRODUCTS } from "../lib/catalogue.ts";
import { useStore, type MakerView, type ShopperView } from "../state/store.ts";
import { LocalePicker, ThemeToggle } from "./DemoDock.tsx";
import { Icon } from "./Icon.tsx";
import { Mono } from "./Primitives.tsx";

const SHOP_NAV: { view: ShopperView; key: string }[] = [
  { view: "shop", key: "nav.shop" },
  { view: "order", key: "nav.order" },
  { view: "about", key: "nav.about" },
];

const FOOTER_LINKS: { view: ShopperView; key: string }[] = [
  { view: "postage", key: "footer.postage" },
  { view: "care", key: "footer.care" },
  { view: "reorder", key: "footer.reorder" },
  { view: "ask", key: "footer.ask" },
  { view: "wrong", key: "footer.wrong" },
];

/**
 * The bench's nav.
 *
 * Nine entries rather than four, because the comp's workshop has nine places to
 * be. `makerorder`, `makerpiece`, `batch`, `cutlist` and `stockcount` are
 * reached FROM these rather than listed beside them — a sidebar that named
 * every view would name five screens nobody navigates to directly.
 */
const MAKER_NAV: { view: MakerView; icon: ReactNode; key: string }[] = [
  { view: "today", icon: <LayoutGrid size={16} aria-hidden="true" />, key: "nav.today" },
  { view: "orders", icon: <Package size={16} aria-hidden="true" />, key: "nav.orders" },
  { view: "proofs", icon: <Eye size={16} aria-hidden="true" />, key: "bench.nav.proofs" },
  { view: "post", icon: <Truck size={16} aria-hidden="true" />, key: "bench.nav.post" },
  { view: "customers", icon: <Users size={16} aria-hidden="true" />, key: "bench.nav.customers" },
  { view: "pieces", icon: <Hammer size={16} aria-hidden="true" />, key: "nav.pieces" },
  { view: "materials", icon: <Layers size={16} aria-hidden="true" />, key: "nav.materials" },
  { view: "machines", icon: <Zap size={16} aria-hidden="true" />, key: "bench.nav.machines" },
  { view: "addons", icon: <Blocks size={16} aria-hidden="true" />, key: "bench.nav.addons" },
];

/**
 * Which nav entry a view belongs under.
 *
 * A maker who opened an order from the board should still see *Orders* lit,
 * because that is where the back link goes.
 */
const NAV_HOME: Partial<Record<MakerView, MakerView>> = {
  batch: "today",
  cutlist: "today",
  makerorder: "orders",
  makerpiece: "pieces",
  stockcount: "materials",
  // The add-on's own page belongs under the shelf it was opened from.
  addonroute: "addons",
};

function Brand({ onClick, small = false }: { onClick: () => void; small?: boolean }) {
  const t = useT();
  return (
    <button type="button" className="br-brand" onClick={onClick}>
      <span className="br-brand-mark">
        <Trees size={small ? 16 : 18} aria-hidden="true" />
      </span>
      <span style={{ display: "flex", flexDirection: "column" }}>
        <span className="br-brand-name" style={small ? { fontSize: 14.5 } : undefined}>
          {t("brand.name")}
        </span>
        {/* Two shells, two second lines. The shop tells a shopper what kind of
            shop it is; the bench says which half of the app they are on, which
            is the only thing a maker needs from a wordmark. */}
        <span className="br-brand-tag">{small ? t("brand.workshop") : t("brand.tagline")}</span>
      </span>
    </button>
  );
}

export function ShopperShell({ children }: { children: ReactNode }) {
  const t = useT();
  const view = useStore((s) => s.view);
  const go = useStore((s) => s.go);
  const query = useStore((s) => s.query);
  const setQuery = useStore((s) => s.setQuery);
  const runSearch = useStore((s) => s.runSearch);
  const basket = useStore((s) => s.basket);

  const count = basket.reduce((sum, l) => sum + l.quantity, 0);

  return (
    <>
      <header className="br-cust-header">
        <div className="br-wrap br-shopbar">
          <Brand onClick={() => go("shop")} />

          <div className="br-searchbox">
            <Search size={15} aria-hidden="true" className="br-searchbox-icon" />
            <input
              className="br-input br-fld"
              value={query}
              placeholder={t("header.search")}
              aria-label={t("header.search")}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") runSearch();
              }}
            />
          </div>

          <div className="br-shopbar-actions">
            <button type="button" className="br-button br-button--ghost" onClick={() => go("basket")}>
              <ShoppingBag size={16} aria-hidden="true" />
              {t("header.basket")}
              <Mono className="br-basket-count">{count}</Mono>
            </button>
            <ThemeToggle />
          </div>

          <nav className="br-cust-nav" aria-label={t("brand.name")}>
            {SHOP_NAV.map((item) => (
              <button
                key={item.view}
                type="button"
                className="br-navlink"
                aria-current={view === item.view ? "page" : undefined}
                onClick={() => go(item.view)}
              >
                {t(item.key as never)}
              </button>
            ))}
            <LocalePicker />
          </nav>
        </div>
      </header>

      <main className="br-main">
        <div className="br-wrap">{children}</div>
      </main>

      <ShopperFooter />
    </>
  );
}

function ShopperFooter() {
  const t = useT();
  const view = useStore((s) => s.view);
  const go = useStore((s) => s.go);

  return (
    <footer className="br-footer">
      <div className="br-wrap br-footer-row">
        <nav className="br-footer-links" aria-label={t("footer.postage")}>
          {FOOTER_LINKS.map((link) => (
            <button
              key={link.view}
              type="button"
              className="br-footer-link"
              aria-current={view === link.view ? "page" : undefined}
              onClick={() => go(link.view)}
            >
              {t(link.key as never)}
            </button>
          ))}
          {/* A dead link on purpose: last year's catalogue is gone, and this is
              the one route in the shop that reaches the 404 the way a shopper
              actually would — from an old link rather than a typed URL. */}
          <button
            type="button"
            className="br-footer-link"
            aria-current={view === "404" ? "page" : undefined}
            onClick={() => go("404")}
          >
            {t("footer.oldList")}
          </button>
        </nav>
        <span className="br-footer-note">{t("footer.line")}</span>
        {/* Not a translated string: it is a URL, and it is the same one in
            every language. */}
        <Mono className="br-footer-path">adminium.dev/demo/maker-shop</Mono>
      </div>
    </footer>
  );
}

export function MakerShell({ children }: { children: ReactNode }) {
  const t = useT();
  const view = useStore((s) => s.view);
  const go = useStore((s) => s.go);
  const openOverlay = useStore((s) => s.openOverlay);
  const active = NAV_HOME[view as MakerView] ?? view;

  return (
    <div className="br-shop">
      <aside className="br-sidebar">
        <div className="br-sidebar-head">
          <Brand onClick={() => go("today")} small />
        </div>
        <nav className="br-sidebar-nav" aria-label={t("bench.title")}>
          {MAKER_NAV.map((item) => (
            <button
              key={item.view}
              type="button"
              className="br-sidebar-item"
              aria-current={active === item.view ? "page" : undefined}
              onClick={() => go(item.view)}
            >
              {item.icon}
              {t(item.key as never)}
            </button>
          ))}
        </nav>
        {/* The studio week, stated where a maker looks for it. Every ship-by
            chip on every screen is counted against these two shut days, so the
            calendar belongs in the chrome rather than on one screen. */}
        <div className="br-sidebar-note">
          <span className="br-sidebar-note-title">{t("bench.calendar.title")}</span>
          <span>{t("bench.calendar.body")}</span>
        </div>
      </aside>

      <div className="br-shop-body">
        <header className="br-topbar">
          <button
            type="button"
            className="br-iconbtn br-narrow-only"
            aria-label={t("bench.title")}
            onClick={() => openOverlay({ kind: "nav" })}
          >
            <Menu size={18} aria-hidden="true" />
          </button>
          <span style={{ fontWeight: 800, fontSize: 15 }}>{t("bench.title")}</span>
          <BenchSearch />
          <div style={{ marginInlineStart: "auto", display: "flex", alignItems: "center", gap: 9 }}>
            <LocalePicker />
            <ThemeToggle />
            <MakerChip />
          </div>
        </header>
        <main className="br-shop-main">{children}</main>
      </div>
    </div>
  );
}

/**
 * Who is at the bench.
 *
 * A name and an initial, and nothing behind it — there is no sign-in in this
 * app and inventing a menu that logs nobody out would be worse than the plain
 * chip the comp draws. `STUDIO.makers[0]` rather than a message key because a
 * person's name is the same in eight languages.
 */
function MakerChip() {
  const name = STUDIO.makers[0] ?? "";
  return (
    <span className="br-makerchip">
      <span className="br-makerchip-mark" aria-hidden="true">
        {name.slice(0, 1)}
      </span>
      <span className="br-makerchip-name">{name}</span>
    </span>
  );
}

/**
 * The workshop's search: order references, customers and pieces, in one box.
 *
 * It searches what a maker shouts across the room — "who was the Pinfold one?"
 * — rather than offering a filter builder. Results are capped at eight because
 * a tenth result is never the one, and the list is built from the same store
 * the screens read, so a piece renamed in the seed is renamed here too.
 */
function BenchSearch() {
  const t = useT();
  const query = useStore((s) => s.makerQuery);
  const setMakerQuery = useStore((s) => s.setMakerQuery);
  const orders = useStore((s) => s.orders);
  const openMakerOrder = useStore((s) => s.openMakerOrder);
  const openPiece = useStore((s) => s.openPiece);

  const term = query.trim().toLocaleLowerCase();
  const orderHits =
    term === ""
      ? []
      : orders
          .filter(
            (o) =>
              o.ref.toLocaleLowerCase().includes(term) ||
              o.customer.toLocaleLowerCase().includes(term) ||
              o.lines.some((l) =>
                t(`data.product.${l.productKey}.name` as never)
                  .toLocaleLowerCase()
                  .includes(term),
              ),
          )
          .slice(0, 5);
  const pieceHits =
    term === ""
      ? []
      : PRODUCTS.filter((p) =>
          t(`data.product.${p.key}.name` as never).toLocaleLowerCase().includes(term),
        ).slice(0, 3);

  return (
    <div className="br-benchsearch">
      <Search size={15} aria-hidden="true" className="br-searchbox-icon" />
      <input
        className="br-input br-fld"
        value={query}
        placeholder={t("bench.search.placeholder")}
        aria-label={t("bench.search.placeholder")}
        onChange={(e) => setMakerQuery(e.target.value)}
      />
      {term !== "" && (
        <div className="br-benchresults">
          {orderHits.length === 0 && pieceHits.length === 0 && (
            <div className="br-benchresult-empty">{t("bench.search.none")}</div>
          )}
          {orderHits.map((order) => (
            <button
              key={order.ref}
              type="button"
              className="br-benchresult br-btn"
              onClick={() => openMakerOrder(order.ref)}
            >
              <Package size={15} aria-hidden="true" />
              <span>
                <Mono>{order.ref}</Mono> · {order.customer}
              </span>
            </button>
          ))}
          {pieceHits.map((product) => (
            <button
              key={product.key}
              type="button"
              className="br-benchresult br-btn"
              onClick={() => openPiece(product.key)}
            >
              <Icon name={product.icon} size={15} />
              <span>{t(`data.product.${product.key}.name` as never)}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
