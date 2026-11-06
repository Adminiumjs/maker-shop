/**
 * "Make it yours": the Customiser's editor on a piece made on one of its
 * bases. The editor lays the shopper's words and logo out on the piece and
 * saves the design; the shop prices the line (a dry run with the priced
 * features the design uses, each the product's own option row) and puts the
 * design's code on the basket line. Opened from a basket line, it changes
 * that line's design in place.
 */
import { useEffect } from "react";

import { CustomiserEditor, designRefusal } from "../../../vendor/customiser/index.js";
import "../../../vendor/customiser/editor.css";
import "../customiser-look.css";

import { useI18n } from "../../i18n/index.tsx";
import { dayShort, money, percent } from "../format.ts";
import { addDesignToBasket, breaksOf, choose, figuresFor, goView, keepHeld, openProduct, optionsOf, productOf, setUsedFeatures, toast, useShop } from "../store.ts";

export function CustomiseScreen() {
  const { t, locale } = useI18n();
  const code = useShop((s) => s.productCode);
  const port = useShop((s) => s.port);
  const catalogue = useShop((s) => s.catalogue);
  const currency = useShop((s) => s.config.currency);
  const choice = useShop((s) => s.choice);
  const quote = useShop((s) => s.productQuote);
  const editing = useShop((s) => s.editing);
  const basket = useShop((s) => s.basket);
  const refusedLine = useShop((s) => s.refusedLine);
  const email = useShop((s) => s.details.email);
  const opened = useShop((s) => s.opened);
  const product = productOf(code);
  const plain = catalogue !== null && (product === null || product.baseId === null);
  // A piece the Customiser does not make: its own page instead.
  useEffect(() => {
    if (plain) openProduct(code);
  }, [plain, code]);
  if (catalogue === null || port === null || product === null || product.baseId === null) return null;

  const m = (value: unknown) => money(value, currency, locale);
  const line = figuresFor(choice.qty);
  const at = editing === null ? -1 : basket.findIndex((b) => b.id === editing);
  const design = at === -1 ? (opened ?? undefined) : (basket[at]!.design ?? undefined);
  const refused = refusedLine !== null && refusedLine.index === at ? designRefusal(refusedLine.raw) : null;
  const breaks = breaksOf(product.id).filter((b) => (b.minQty ?? 1) > 1);
  const featurePrices = Object.fromEntries(
    optionsOf(product.id, "feature")
      .filter((f) => f.featureCode !== null)
      .map((f) => [f.featureCode!, t("shop.customise.featurePrice", { price: m(f.price) })]),
  );

  return (
    <section className="sh-screen sh-customise" aria-label={t("shop.customise.title", { piece: product.name })}>
      <CustomiserEditor
        api={port.customiser()}
        base={product.baseId}
        product={{ name: product.name, price: m(product.price), unit: product.unit }}
        {...(design === undefined ? {} : { design })}
        shop={catalogue.studio.name}
        locale={locale}
        look="maker"
        price={{
          total: line === null ? "…" : m(line["line_total"]),
          ...(line === null ? {} : { each: m(line["each"]), note: t("shop.customise.postBy", { day: dayShort(line["post_by"], locale) }) }),
          pending: quote?.state === "busy",
        }}
        quantity={{
          value: choice.qty,
          min: 1,
          max: 50,
          ...(breaks.length === 0 ? {} : { breaks: breaks.map((b) => ({ qty: b.minQty ?? 1, label: `−${percent(b.percentOff, locale)}` })) }),
          onChange: (qty) => choose({ qty }),
        }}
        featurePrices={featurePrices}
        refused={refused}
        email={email.trim() === "" ? null : email.trim()}
        {...(editing === null ? {} : { addLabel: t("shop.customise.update") })}
        onDesignChange={({ used }) => setUsedFeatures(used)}
        onAddToBasket={(made) => {
          const done = addDesignToBasket(made);
          toast(done === "updated" ? "shop.toast.designUpdated" : "shop.toast.designAdded");
          goView("basket");
        }}
        onSaved={(saved, to) => keepHeld(saved, to)}
        onBack={() => openProduct(product.code)}
      />
    </section>
  );
}
