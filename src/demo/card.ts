/**
 * What the website's demo card offers for Birch Row — the shopper's screens
 * and the studio's, the shortcuts that make something happen on them, the
 * two people, the studio clock and the add-ons a studio may switch on — and
 * the card's words in its eight languages. `vite.config.ts` writes
 * `demo.json` from it in the demo build; the bridge answers to its ids.
 *
 * A screen is labelled with the app's own words where the app has them (its
 * section names, already translated and reviewed); the card's own words —
 * a shortcut, the clock, a person — are below, one row a key.
 *
 * DEMO ONLY — no surface bundle imports it.
 */
import type { DemoEmitOptions } from "../../demo-emit.ts";
import { MESSAGES } from "../i18n/messages/index.ts";

type Locale = "en-US" | "de-DE" | "fr-FR" | "da-DK" | "cs-CZ" | "ar-EG" | "zh-CN" | "zh-TW";
const LOCALES: Locale[] = ["en-US", "de-DE", "fr-FR", "da-DK", "cs-CZ", "ar-EG", "zh-CN", "zh-TW"];

/** Each label in the eight languages, in the order of `LOCALES`. */
const WORDS: Record<string, [string, string, string, string, string, string, string, string]> = {
  "screen.product": ["Product", "Produkt", "Produit", "Produkt", "Produkt", "المنتج", "商品", "商品"],
  "screen.confirm": ["Confirmation", "Bestätigung", "Confirmation", "Bekræftelse", "Potvrzení", "التأكيد", "确认", "確認"],
  "screen.search": ["Search", "Suche", "Recherche", "Søgning", "Hledání", "البحث", "搜索", "搜尋"],
  "screen.404": ["404", "404", "404", "404", "404", "404", "404", "404"],

  "do.ply-lettering": ["Ply coasters with lettering", "Sperrholz-Untersetzer mit Schrift", "Sous-verres en contreplaqué gravés", "Krydsfinér-bordskånere med tekst", "Překližkové podtácky s nápisem", "قواعد أكواب من الخشب الرقائقي مع كتابة", "刻字桦木胶合板杯垫", "刻字樺木合板杯墊"],
  "do.too-long": ["Lettering too long", "Schrift zu lang", "Texte trop long", "Teksten er for lang", "Příliš dlouhý nápis", "الكتابة أطول من اللازم", "刻字太长", "刻字太長"],
  "do.fill-priya": ["Fill Priya's details", "Priyas Angaben eintragen", "Remplir pour Priya", "Udfyld Priyas oplysninger", "Vyplnit údaje Priyi", "املأ بيانات Priya", "填入 Priya 的信息", "填入 Priya 的資料"],
  "do.price-up": ["A price goes up while you shop", "Ein Preis steigt beim Einkaufen", "Un prix augmente pendant vos achats", "En pris stiger, mens du handler", "Cena během nákupu stoupne", "يرتفع سعر أثناء التسوق", "购物时价格上涨", "購物時價格上漲"],
  "do.fill-iris-order": ["Fill Iris's order and e-mail", "Iris' Bestellung und E-Mail eintragen", "Remplir la commande et l'e-mail d'Iris", "Udfyld Iris' ordre og e-mail", "Vyplnit objednávku a e-mail Iris", "املأ طلب Iris وبريدها", "填入 Iris 的订单和邮箱", "填入 Iris 的訂單和電郵"],
  "do.fill-order-code": ["Fill the code", "Code eintragen", "Saisir le code", "Udfyld koden", "Vyplnit kód", "املأ الرمز", "填入验证码", "填入驗證碼"],
  "do.proof-waiting": ["A proof waiting for you", "Eine Ansicht wartet auf dich", "Un aperçu vous attend", "En godkendelse venter på dig", "Čeká na vás náhled", "معاينة بانتظارك", "有一份样稿等你确认", "有一份樣稿等你確認"],
  "do.fill-iris-again": ["Fill Iris's details", "Iris' Angaben eintragen", "Remplir pour Iris", "Udfyld Iris' oplysninger", "Vyplnit údaje Iris", "املأ بيانات Iris", "填入 Iris 的信息", "填入 Iris 的資料"],
  "do.fill-again-code": ["Fill the code", "Code eintragen", "Saisir le code", "Udfyld koden", "Vyplnit kód", "املأ الرمز", "填入验证码", "填入驗證碼"],
  "do.sample-ask": ["Fill a sample request", "Beispielanfrage ausfüllen", "Remplir une demande type", "Udfyld en prøveforespørgsel", "Vyplnit ukázkový požadavek", "املأ طلبًا نموذجيًا", "填写示例请求", "填寫範例請求"],
  "do.sample-wrong": ["Fill a sample request", "Beispielanfrage ausfüllen", "Remplir une demande type", "Udfyld en prøveforespørgsel", "Vyplnit ukázkový požadavek", "املأ طلبًا نموذجيًا", "填写示例请求", "填寫範例請求"],
  "do.proof-approved": ["A proof comes back approved", "Eine Ansicht kommt freigegeben zurück", "Un aperçu revient approuvé", "En godkendelse kommer retur med et ja", "Náhled se vrátí schválený", "تعود معاينة بالموافقة", "一份样稿获得确认", "一份樣稿獲得確認"],
  "do.tomorrow-run": ["Jump to tomorrow's run", "Zum nächsten Gang zur Post", "Passer à la tournée de demain", "Hop til morgendagens tur", "Přejít na zítřejší cestu na poštu", "انتقل إلى جولة البريد غدًا", "跳到明天的寄件", "跳到明天的寄件"],

  "persona.shopper": ["Shopper", "Kundin", "Client", "Kunde", "Zákazník", "المشتري", "顾客", "顧客"],
  "persona.maker": ["Maker", "Werkstatt", "Atelier", "Værksted", "Dílna", "الورشة", "工坊", "工坊"],
  "clock.day": ["+1 studio day", "+1 Werkstatttag", "+1 jour d'atelier", "+1 værkstedsdag", "+1 dílenský den", "+ يوم عمل واحد", "+1 个工坊日", "+1 個工坊日"],
  "clock.reset": ["Back to Thursday afternoon", "Zurück zum Donnerstagnachmittag", "Retour à jeudi après-midi", "Tilbage til torsdag eftermiddag", "Zpět na čtvrteční odpoledne", "العودة إلى عصر الخميس", "回到周四下午", "回到週四下午"],

  "addon.shipping-dhl": ["DHL Shipping", "DHL-Versand", "Expédition DHL", "DHL-forsendelse", "Doprava DHL", "الشحن عبر DHL", "DHL 发货", "DHL 寄送"],
  "addon.barcode-labels": ["Barcode Labels", "Barcode-Etiketten", "Étiquettes code-barres", "Stregkodeetiketter", "Štítky s čárovým kódem", "ملصقات الباركود", "条形码标签", "條碼標籤"],
  "addon.inventory": ["Inventory", "Lagerbestand", "Inventaire", "Lager", "Sklad", "المخزون", "库存", "庫存"],
  "addon.invoices": ["Invoices & Receipts", "Rechnungen & Belege", "Factures et reçus", "Fakturaer og kvitteringer", "Faktury a účtenky", "الفواتير والإيصالات", "发票与收据", "發票與收據"],
  "addon.holiday-calendars": ["Holiday Calendars", "Feiertagskalender", "Calendriers des jours fériés", "Helligdagskalendere", "Kalendáře svátků", "تقويمات العطلات", "节假日日历", "假日日曆"],

  // What a shortcut says in the studio when nothing else on the screen does.
  "toast.approved": ["{name} said yes to the proof for {ref}.", "{name} hat die Ansicht für {ref} freigegeben.", "{name} a approuvé l'aperçu de {ref}.", "{name} har godkendt {ref}.", "{name} schválil náhled k {ref}.", "وافق {name} على معاينة {ref}.", "{name} 已确认 {ref} 的样稿。", "{name} 已確認 {ref} 的樣稿。"],
  "toast.no-proof": ["No proof is waiting on a reply.", "Keine Ansicht wartet auf Antwort.", "Aucun aperçu n'attend de réponse.", "Ingen godkendelse venter på svar.", "Žádný náhled nečeká na odpověď.", "لا توجد معاينة بانتظار رد.", "没有等待回复的样稿。", "沒有等待回覆的樣稿。"],
};

/** The app's own section names the card borrows, by the app's keys. */
const APP_KEYS = [
  "shop.nav.shop",
  "shop.nav.basket",
  "shop.checkout.title",
  "after.order.title",
  "shop.nav.about",
  "after.postage.title",
  "after.care.title",
  "shop.footer.ask",
  "shop.footer.again",
  "shop.footer.wrong",
  "bench.today.title",
  "bench.orders.title",
  "bench.proofs.title",
  "bench.post.title",
  "bench.customers.title",
  "bench.pieces.title",
  "bench.materials.title",
  "studio.nav.machines",
  "bench.cut.title",
  "bench.count.title",
  "bench.batch.screenTitle",
] as const;

export const CARD_MESSAGES: Record<Locale, Record<string, string>> = Object.fromEntries(
  LOCALES.map((locale, i) => [
    locale,
    {
      ...Object.fromEntries(APP_KEYS.map((key) => [key, MESSAGES[locale][key] ?? ""])),
      ...Object.fromEntries(Object.entries(WORDS).map(([key, words]) => [key, words[i]!])),
    },
  ]),
) as Record<Locale, Record<string, string>>;

/** A card string in the page's language. */
export function cardWord(locale: string, key: string, params: Record<string, string> = {}): string {
  const raw = CARD_MESSAGES[(LOCALES as string[]).includes(locale) ? (locale as Locale) : "en-US"][key] ?? key;
  return raw.replace(/\{(\w+)\}/g, (m, name: string) => params[name] ?? m);
}

type Screen = DemoEmitOptions["screens"][number];
type Shortcut = [id: string, icon: string];
const shopper = (id: string, view: string, icon: string, labelKey: string, shortcuts?: Shortcut[]): Screen => ({
  id,
  view,
  icon,
  side: "customer",
  persona: "shopper",
  labelKey,
  ...(shortcuts === undefined ? {} : { shortcuts: shortcuts.map(([sid, sicon]) => ({ id: sid, icon: sicon, labelKey: `do.${sid}` })) }),
});
const maker = (id: string, view: string, icon: string, labelKey: string, shortcuts?: Shortcut[]): Screen => ({ ...shopper(id, `studio:${view}`, icon, labelKey, shortcuts), side: "staff", persona: "maker" });

/** The card's declaration; `messages` is added where it is emitted. */
export const DEMO_CARD: Omit<DemoEmitOptions, "messages"> = {
  appKey: "maker",
  dir: "maker-shop",
  frames: ["desktop", "phone"],
  personas: [
    { id: "shopper", icon: "shopping-bag", labelKey: "persona.shopper" },
    { id: "maker", icon: "hammer", labelKey: "persona.maker" },
  ],
  screens: [
    shopper("shop", "shop", "store", "shop.nav.shop"),
    shopper("product", "product", "package", "screen.product", [
      ["ply-lettering", "wand-sparkles"],
      ["too-long", "ruler"],
    ]),
    shopper("basket", "basket", "shopping-basket", "shop.nav.basket"),
    shopper("checkout", "checkout", "clipboard-check", "shop.checkout.title", [
      ["fill-priya", "wand-sparkles"],
      ["price-up", "trending-up"],
    ]),
    shopper("confirm", "confirm", "party-popper", "screen.confirm"),
    shopper("order", "order", "package-search", "after.order.title", [
      ["fill-iris-order", "wand-sparkles"],
      ["fill-order-code", "key-round"],
      ["proof-waiting", "image"],
    ]),
    shopper("about", "about", "info", "shop.nav.about"),
    shopper("search", "search", "search", "screen.search"),
    shopper("postage", "postage", "calendar-days", "after.postage.title"),
    shopper("care", "care", "heart-handshake", "after.care.title"),
    shopper("ask", "ask", "message-square-plus", "shop.footer.ask", [["sample-ask", "wand-sparkles"]]),
    shopper("again", "find", "repeat", "shop.footer.again", [
      ["fill-iris-again", "wand-sparkles"],
      ["fill-again-code", "key-round"],
    ]),
    shopper("wrong", "problem", "life-buoy", "shop.footer.wrong", [["sample-wrong", "wand-sparkles"]]),
    shopper("missing", "missing", "file-x", "screen.404"),
    maker("today", "today", "house", "bench.today.title", [
      ["proof-approved", "badge-check"],
      ["tomorrow-run", "truck"],
    ]),
    maker("orders", "orders", "receipt-text", "bench.orders.title"),
    maker("proofs", "proofs", "image", "bench.proofs.title"),
    maker("post", "post", "mailbox", "bench.post.title"),
    maker("customers", "customers", "users", "bench.customers.title"),
    maker("products", "products", "boxes", "bench.pieces.title"),
    maker("materials", "materials", "layers", "bench.materials.title"),
    maker("machines", "machines", "cog", "studio.nav.machines"),
    maker("cutlist", "cutlist", "scissors", "bench.cut.title"),
    maker("stockcount", "stockcount", "clipboard-list", "bench.count.title"),
    maker("batch", "batch", "layout-grid", "bench.batch.screenTitle"),
    maker("studio-missing", "notfound", "file-x", "screen.404"),
  ],
  clock: { advance: [{ id: "day", labelKey: "clock.day" }], reset: { labelKey: "clock.reset" } },
  addOns: [
    { key: "shipping-dhl", labelKey: "addon.shipping-dhl" },
    { key: "barcode-labels", labelKey: "addon.barcode-labels" },
    { key: "inventory", labelKey: "addon.inventory" },
    { key: "invoices", labelKey: "addon.invoices" },
    { key: "holiday-calendars", labelKey: "addon.holiday-calendars" },
  ],
};
