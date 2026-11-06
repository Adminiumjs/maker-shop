/**
 * The words both sides share: the brand, the shop's first four sections as
 * Adminium lists them, and the millimetre.
 *
 * English is the source of truth; the seven translations must carry every one
 * of its keys or `messages/index.ts` fails to compile.
 *
 * VOCABULARY, and this app trips the list in ways the others did not.
 * Nothing here may contain `pricing`, `plan`, `tier`, `billing`, `upgrade`,
 * `/mo` or `free` as a SUBSTRING, in any language — which rules out "free
 * postage", "explanation" and, in the translations, German "Zeitplan", Danish
 * "planen", French "entier" and "métier", and anything built on German "pro".
 * `messages.test.ts` enforces it over all eight locales at once.
 */

export const chrome = {
  "en-US": {
    /*
     * THE MILLIMETRE, AS A NOUN PER LANGUAGE: a size reads "٩٥ مم" in Arabic
     * and 毫米 / 公釐 in Chinese, never a Latin "mm" beside translated digits.
     */
    "common.mm": "{value} mm",

    "brand.name": "Birch Row",
    "brand.workshop": "WORKSHOP",

    "nav.shop": "Shop",
    "nav.order": "Your order",
    "nav.about": "About us",

    "header.basket": "Basket",

    "dock.short": "DEMO",
  },

  "de-DE": {
    "common.mm": "{value} mm",

    "brand.name": "Birch Row",
    "brand.workshop": "WERKSTATT",

    "nav.shop": "Laden",
    "nav.order": "Deine Bestellung",
    "nav.about": "Über uns",

    "header.basket": "Korb",

    "dock.short": "DEMO",
  },

  "fr-FR": {
    "common.mm": "{value} mm",

    "brand.name": "Birch Row",
    "brand.workshop": "ATELIER",

    "nav.shop": "Boutique",
    "nav.order": "Votre commande",
    "nav.about": "À propos",

    "header.basket": "Panier",

    "dock.short": "DÉMO",
  },

  "cs-CZ": {
    "common.mm": "{value} mm",

    "brand.name": "Birch Row",
    "brand.workshop": "DÍLNA",

    "nav.shop": "Obchod",
    "nav.order": "Vaše objednávka",
    "nav.about": "O nás",

    "header.basket": "Košík",

    "dock.short": "UKÁZKA",
  },

  "da-DK": {
    "common.mm": "{value} mm",

    "brand.name": "Birch Row",
    "brand.workshop": "VÆRKSTED",

    "nav.shop": "Butik",
    "nav.order": "Din ordre",
    "nav.about": "Om os",

    "header.basket": "Kurv",

    "dock.short": "DEMO",
  },

  "zh-CN": {
    "common.mm": "{value} 毫米",

    "brand.name": "Birch Row",
    "brand.workshop": "工坊",

    "nav.shop": "店铺",
    "nav.order": "你的订单",
    "nav.about": "关于我们",

    "header.basket": "购物篮",

    "dock.short": "演示",
  },

  "zh-TW": {
    "common.mm": "{value} 公釐",

    "brand.name": "Birch Row",
    "brand.workshop": "工坊",

    "nav.shop": "店鋪",
    "nav.order": "你的訂單",
    "nav.about": "關於我們",

    "header.basket": "購物籃",

    "dock.short": "示範",
  },

  "ar-EG": {
    "common.mm": "{value} مم",

    "brand.name": "Birch Row",
    "brand.workshop": "الورشة",

    "nav.shop": "المتجر",
    "nav.order": "طلبك",
    "nav.about": "من نحن",

    "header.basket": "السلة",

    "dock.short": "عرض",
  },
} as const;
