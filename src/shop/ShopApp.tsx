/**
 * The shop's side: its header and footer, the screen the address names, the
 * toasts and the one sheet a piece's page opens.
 *
 * The screens of the order after it is placed (Your order, About us, the
 * footer's pages, search) are routed here and drawn by their own modules
 * (`ELSEWHERE` in `route.ts`).
 */
import { CircleCheck, Info, Moon, Search, ShoppingBag, Sun, TreePine, TriangleAlert } from "lucide-react";
import { useEffect, useRef, useState, type ReactNode } from "react";

import "./shop.css";

import { useI18n, type MessageKey } from "../i18n/index.tsx";
import { count } from "./format.ts";
import { attachShopUrl, type Place } from "./route.ts";
import { goView, loadShop, onShopNavigate, openProduct, useShop, type ShopView } from "./store.ts";
import { BasketScreen } from "./screens/Basket.tsx";
import { CheckoutScreen } from "./screens/Checkout.tsx";
import { ConfirmScreen } from "./screens/Confirm.tsx";
import { CustomiseScreen } from "./screens/Customise.tsx";
import { ProductScreen } from "./screens/Product.tsx";
import { ShopScreen } from "./screens/Shop.tsx";

const NAV: [ShopView, MessageKey][] = [
  ["shop", "shop.nav.shop"],
  ["order", "shop.nav.order"],
  ["about", "shop.nav.about"],
];

const FOOTER: [ShopView, MessageKey][] = [
  ["postage", "shop.footer.postage"],
  ["care", "shop.footer.care"],
  ["find", "shop.footer.again"],
  ["ask", "shop.footer.ask"],
  ["problem", "shop.footer.wrong"],
];

const THEME_SLOT = "maker-shop-theme";

function initialTheme(): "light" | "dark" {
  try {
    const kept = localStorage.getItem(THEME_SLOT);
    if (kept === "light" || kept === "dark") return kept;
  } catch {
    // no storage: follow the device
  }
  return typeof matchMedia === "function" && matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

/** Open the screen a place names. */
export function openPlace(place: Place): void {
  if (place.view === "product" || place.view === "customise") openProduct(place.code, place.view);
  else if (place.view === "confirm") goView("checkout");
  else goView(place.view);
}

function Screen({ view }: { view: ShopView }): ReactNode {
  switch (view) {
    case "shop":
      return <ShopScreen />;
    case "product":
      return <ProductScreen />;
    case "customise":
      return <CustomiseScreen />;
    case "basket":
      return <BasketScreen />;
    case "checkout":
      return <CheckoutScreen />;
    case "confirm":
      return <ConfirmScreen />;
    default:
      return <Elsewhere />;
  }
}

/** A screen the shop's other parts draw, not in this build. */
function Elsewhere() {
  const { t } = useI18n();
  return (
    <section className="sh-screen sh-empty" aria-labelledby="sh-elsewhere-title">
      <h1 id="sh-elsewhere-title" className="sh-empty-title">
        {t("shop.elsewhere.title")}
      </h1>
      <button type="button" className="sh-button sh-button--accent" onClick={() => goView("shop")}>
        {t("shop.back.shop")}
      </button>
    </section>
  );
}

function Loading() {
  const { t } = useI18n();
  return (
    <div className="sh-loading" aria-busy="true">
      <span className="sh-sr">{t("shop.loading")}</span>
      <div className="sh-skel sh-skel--title" />
      <div className="sh-grid">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="sh-skel sh-skel--tile" />
        ))}
      </div>
    </div>
  );
}

function Failed() {
  const { t } = useI18n();
  return (
    <section className="sh-screen sh-empty" aria-labelledby="sh-failed-title">
      <h1 id="sh-failed-title" className="sh-empty-title">
        {t("shop.failed.title")}
      </h1>
      <p>{t("shop.failed.body")}</p>
      <button type="button" className="sh-button sh-button--accent" onClick={() => void loadShop()}>
        {t("shop.retry")}
      </button>
    </section>
  );
}

/** "That line is too long to cut": the words are over the piece's limit, so nothing went in the basket. */
function LimitSheet() {
  const { t } = useI18n();
  const open = useShop((s) => s.limitWarn);
  const button = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    if (open) button.current?.focus();
  }, [open]);
  if (!open) return null;
  const close = () => {
    useShop.setState({ limitWarn: false });
    document.getElementById("sh-words")?.focus();
  };
  return (
    <div className="sh-scrim" onClick={close} onKeyDown={(e) => e.key === "Escape" && close()}>
      <div role="dialog" aria-modal="true" aria-labelledby="sh-limit-title" aria-describedby="sh-limit-body" className="sh-dialog" onClick={(e) => e.stopPropagation()}>
        <span className="sh-dialog-icon">
          <TriangleAlert size={19} aria-hidden="true" />
        </span>
        <h2 id="sh-limit-title" className="sh-dialog-title">
          {t("shop.limit.title")}
        </h2>
        <p id="sh-limit-body" className="sh-small">
          {t("shop.limit.body")}
        </p>
        <button ref={button} type="button" className="sh-button sh-button--ink" onClick={close}>
          {t("shop.limit.shorten")}
        </button>
      </div>
    </div>
  );
}

function Toasts() {
  const { t } = useI18n();
  const toasts = useShop((s) => s.toasts);
  return (
    <div className="sh-toasts" role="status" aria-live="polite">
      {toasts.map((one) => (
        <div key={one.id} className={one.tone === "ok" ? "sh-toast sh-toast--ok" : "sh-toast"}>
          {one.tone === "ok" ? <CircleCheck size={16} aria-hidden="true" /> : <Info size={16} aria-hidden="true" />}
          <span>{t(one.key, one.params)}</span>
        </div>
      ))}
    </div>
  );
}

export default function ShopApp() {
  const { t, locale } = useI18n();
  const view = useShop((s) => s.view);
  const loading = useShop((s) => s.loading);
  const studio = useShop((s) => s.catalogue?.studio ?? null);
  const pieces = useShop((s) => s.basket.length);
  const [theme, setTheme] = useState(initialTheme);
  const [query, setQuery] = useState("");
  const main = useRef<HTMLElement>(null);

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
    try {
      localStorage.setItem(THEME_SLOT, theme);
    } catch {
      // not remembered, still shown
    }
  }, [theme]);

  useEffect(() => {
    const url = attachShopUrl(openPlace);
    openPlace(url.current());
    onShopNavigate((next, code) => url.push({ view: next, code }));
    void loadShop();
    return () => {
      onShopNavigate(null);
      url.detach();
    };
  }, []);

  // A new screen starts at its top, with the reader's place at its heading.
  useEffect(() => {
    window.scrollTo?.(0, 0);
  }, [view]);

  return (
    <div className="sh-app">
      <header className="sh-header">
        <div className="sh-header-row">
          <button type="button" className="sh-brand" onClick={() => goView("shop")}>
            <span className="sh-brand-mark">
              <TreePine size={18} aria-hidden="true" />
            </span>
            <span className="sh-brand-text">
              <span className="sh-brand-name">{studio?.name ?? t("shop.brand")}</span>
              <span className="sh-brand-tag">{t("shop.brand.tag")}</span>
            </span>
          </button>
          <form
            className="sh-search"
            role="search"
            onSubmit={(e) => {
              e.preventDefault();
              if (query.trim() !== "") goView("search");
            }}
          >
            <Search size={15} aria-hidden="true" className="sh-search-icon" />
            <input className="sh-search-input" type="search" value={query} onChange={(e) => setQuery(e.target.value)} placeholder={t("shop.search")} aria-label={t("shop.search")} />
          </form>
          <div className="sh-header-tools">
            <button type="button" className="sh-basket-button" onClick={() => goView("basket")}>
              <ShoppingBag size={16} aria-hidden="true" />
              {t("shop.nav.basket")}
              <span className={pieces > 0 ? "sh-count sh-count--full" : "sh-count"}>
                <span className="sh-sr">{t("shop.nav.basketCount")} </span>
                {count(pieces, locale)}
              </span>
            </button>
            <button type="button" className="sh-icon-button" aria-label={t("shop.theme")} title={theme === "dark" ? t("shop.theme.toLight") : t("shop.theme.toDark")} onClick={() => setTheme(theme === "dark" ? "light" : "dark")}>
              {theme === "dark" ? <Sun size={16} aria-hidden="true" /> : <Moon size={16} aria-hidden="true" />}
            </button>
          </div>
          <nav className="sh-nav" aria-label={t("shop.nav.label")}>
            {NAV.map(([target, key]) => (
              <button key={target} type="button" className="sh-nav-item" aria-current={view === target ? "page" : undefined} onClick={() => goView(target)}>
                {t(key)}
              </button>
            ))}
          </nav>
        </div>
      </header>

      <main ref={main} className="sh-main">
        <div className="sh-page">{loading === "loading" ? <Loading /> : loading === "failed" ? <Failed /> : <Screen view={view} />}</div>
      </main>

      <footer className="sh-footer">
        <nav className="sh-footer-links" aria-label={t("shop.footer.label")}>
          {FOOTER.map(([target, key]) => (
            <button key={target} type="button" className="sh-footer-link" aria-current={view === target ? "page" : undefined} onClick={() => goView(target)}>
              {t(key)}
            </button>
          ))}
        </nav>
        {studio !== null && <span className="sh-footer-line">{t("shop.footer.line", { studio: studio.name, address: studio.address ?? "" })}</span>}
      </footer>

      <LimitSheet />
      <Toasts />
    </div>
  );
}
