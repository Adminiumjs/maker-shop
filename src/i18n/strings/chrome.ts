/**
 * The chrome: both shells, the demo dock, the footer, the toasts, and the two
 * sentences the proof gate refuses a move with.
 *
 * English is the source of truth; the seven translations must carry every one
 * of its keys or `messages/index.ts` fails to compile.
 *
 * VOCABULARY, and this app trips the list in ways the others did not (24 D10b).
 * Nothing here may contain `pricing`, `plan`, `tier`, `billing`, `upgrade`,
 * `/mo` or `free` as a SUBSTRING, in any language — which rules out "free
 * postage", "explanation" and, in the translations, German "Zeitplan", Danish
 * "planen", French "entier" and "métier", and anything built on German "pro".
 * `messages.test.ts` enforces it over all eight locales at once.
 */

export const chrome = {
  "en-US": {
    "common.loading": "Loading",
    "common.close": "Close",
    "common.back": "Back",
    /*
     * THE MILLIMETRE, AS A NOUN PER LANGUAGE.
     *
     * `lib/format.ts`'s `mm()` used to append a literal " mm", so ar-EG read
     * "٩٥ × ٩٥ mm" — Arabic-Indic digits with a Latin unit — sitting beside the
     * personalizer's own "٧ مم" on the same screen, and Chinese read "mm" where
     * every other size on the page said 毫米. The add-on had the unit right and
     * the host did not, which is the wrong way round for the app that owns the
     * page. Same value for both Chinese scripts as the add-on uses, so the two
     * cannot look like different measurements.
     */
    "common.mm": "{value} mm",

    "brand.name": "Birch Row",
    "brand.tagline": "MADE TO ORDER · TUE–SAT",

    "nav.shop": "Shop",
    "nav.order": "Your order",
    "nav.about": "About us",
    "nav.today": "Today",
    "nav.orders": "Orders",
    "nav.pieces": "Pieces",
    "nav.materials": "Materials",

    "header.search": "Look for a piece",
    "header.basket": "Basket",

    "theme.toDark": "Switch to dark",
    "theme.toLight": "Switch to light",

    "dock.label": "Demo controls",
    "dock.shopper": "Shopper",
    "dock.maker": "Maker",
    "dock.clockTitle": "The studio clock is pinned. Press to put it back.",
    "dock.advance": "+1 studio day",
    "dock.language": "Language",

    "footer.line": "© 2026 Birch Row. A demo maker's shop shipped with Adminium.",
    "footer.postage": "Postage and the calendar",
    "footer.care": "Looking after it",
    "footer.reorder": "Order again",
    "footer.ask": "Ask us for something",
    "footer.wrong": "If something's wrong",

    "toast.dayAdvanced": "Studio clock moved to {day}.",
    "toast.clockReset": "Clock back to {day}.",
    "toast.addOnOn": "{name} is on. Watch the piece’s page.",
    "toast.addOnOff": "{name} is off. The plain note field is back.",
    "toast.added": "{piece} added. We'll send a picture before we make it.",
    "toast.removed": "Taken out of the basket.",
    "toast.approved": "Approved. It's in the queue — posted by {day}.",
    "toast.changeSent": "Sent. We'll redo the picture and send it back.",
    "toast.changeNeedsNote": "Write what you'd like changed and we'll pick it up.",
    "toast.askSent": "Sent. We read these ourselves, usually the same day.",
    "toast.askNeedsWhat": "Tell us what you're after and we'll take it from there.",
    "toast.wrongSent": "Sent. Ada or Nell will write back today.",
    "toast.wrongNeedsMore": "We need the reference and what went wrong.",
    "toast.reorderNone": "Nothing under that email. Try iris.p@example.com.",
    "toast.reorderAdded": "Put back in the basket. Change anything you like before you order.",
    "toast.overLimit": "That is longer than this piece takes. Shorten it, or ask us to set it smaller.",

    "gate.awaitingApproval": "Not yet — {customer} hasn't approved the picture.",
    "gate.noProofSent": "Not yet — the picture hasn't been sent to {customer}.",

    "bench.title": "The bench",

    "notFound.code": "404",
    "notFound.title": "Nothing on this bench",
    "notFound.body":
      "The page you were after isn't here. It may have been an old link, or a piece we no longer make.",
    "notFound.cta": "Back to the shop",
  },

  "de-DE": {
    "common.loading": "Wird geladen",
    "common.close": "Schließen",
    "common.back": "Zurück",
    "common.mm": "{value} mm",

    "brand.name": "Birch Row",
    "brand.tagline": "AUF BESTELLUNG · DI–SA",

    "nav.shop": "Laden",
    "nav.order": "Deine Bestellung",
    "nav.about": "Über uns",
    "nav.today": "Heute",
    "nav.orders": "Bestellungen",
    "nav.pieces": "Stücke",
    "nav.materials": "Material",

    "header.search": "Nach einem Stück suchen",
    "header.basket": "Korb",

    "theme.toDark": "Auf Dunkel umschalten",
    "theme.toLight": "Auf Hell umschalten",

    "dock.label": "Demo-Steuerung",
    "dock.shopper": "Kundin",
    "dock.maker": "Werkstatt",
    "dock.clockTitle": "Die Werkstattuhr steht fest. Drücken, um sie zurückzusetzen.",
    "dock.advance": "+1 Werkstatttag",
    "dock.language": "Sprache",

    "footer.line": "© 2026 Birch Row. Eine Demo-Werkstatt, geliefert mit Adminium.",
    "footer.postage": "Versand und der Kalender",
    "footer.care": "Pflege",
    "footer.reorder": "Noch einmal bestellen",
    "footer.ask": "Frag uns nach etwas",
    "footer.wrong": "Wenn etwas nicht stimmt",

    "toast.dayAdvanced": "Werkstattuhr steht jetzt auf {day}.",
    "toast.clockReset": "Uhr zurück auf {day}.",
    "toast.addOnOn": "{name} ist an. Sehen Sie sich die Seite des Stücks an.",
    "toast.addOnOff": "{name} ist aus. Das schlichte Notizfeld ist zurück.",
    "toast.added": "{piece} hinzugefügt. Wir schicken ein Bild, bevor wir es machen.",
    "toast.removed": "Aus dem Korb genommen.",
    "toast.approved": "Freigegeben. Es ist in der Reihe — Versand bis {day}.",
    "toast.changeSent": "Abgeschickt. Wir machen das Bild neu und schicken es zurück.",
    "toast.changeNeedsNote": "Schreib auf, was anders sein soll, dann kümmern wir uns darum.",
    "toast.askSent": "Abgeschickt. Wir lesen das selbst, meist noch am selben Tag.",
    "toast.askNeedsWhat": "Sag uns, worum es geht, dann sehen wir weiter.",
    "toast.wrongSent": "Abgeschickt. Ada oder Nell schreibt dir heute zurück.",
    "toast.wrongNeedsMore": "Wir brauchen die Nummer und das, was schiefgelaufen ist.",
    "toast.reorderNone": "Nichts unter dieser E-Mail. Versuch iris.p@example.com.",
    "toast.reorderAdded":
      "Zurück im Korb. Du kannst alles ändern, bevor du bestellst.",
    "toast.overLimit":
      "Das ist länger, als dieses Stück verträgt. Kürze es oder sag uns, wir sollen es kleiner setzen.",

    "gate.awaitingApproval": "Noch nicht — {customer} hat das Bild noch nicht freigegeben.",
    "gate.noProofSent": "Noch nicht — das Bild ist noch nicht an {customer} raus.",

    "bench.title": "Die Werkbank",

    "notFound.code": "404",
    "notFound.title": "Auf dieser Werkbank liegt nichts",
    "notFound.body":
      "Die Seite, die du gesucht hast, gibt es nicht. Vielleicht ein alter Link, vielleicht ein Stück, das wir nicht mehr machen.",
    "notFound.cta": "Zurück in den Laden",
  },

  "fr-FR": {
    "common.loading": "Chargement",
    "common.close": "Fermer",
    "common.back": "Retour",
    "common.mm": "{value} mm",

    "brand.name": "Birch Row",
    "brand.tagline": "FAIT SUR COMMANDE · MAR–SAM",

    "nav.shop": "Boutique",
    "nav.order": "Votre commande",
    "nav.about": "À propos",
    "nav.today": "Aujourd'hui",
    "nav.orders": "Commandes",
    "nav.pieces": "Pièces",
    "nav.materials": "Matières",

    "header.search": "Chercher une pièce",
    "header.basket": "Panier",

    "theme.toDark": "Passer en sombre",
    "theme.toLight": "Passer en clair",

    "dock.label": "Commandes de la démo",
    "dock.shopper": "Client",
    "dock.maker": "Atelier",
    "dock.clockTitle": "L'horloge de l'atelier est figée. Appuyez pour la remettre.",
    "dock.advance": "+1 jour d'atelier",
    "dock.language": "Langue",

    "footer.line": "© 2026 Birch Row. Une boutique d'atelier de démonstration livrée avec Adminium.",
    "footer.postage": "L'envoi et le calendrier",
    "footer.care": "L'entretien",
    "footer.reorder": "Commander à nouveau",
    "footer.ask": "Demandez-nous quelque chose",
    "footer.wrong": "Si quelque chose ne va pas",

    "toast.dayAdvanced": "L'horloge de l'atelier est passée au {day}.",
    "toast.clockReset": "Horloge remise au {day}.",
    "toast.addOnOn": "{name} est actif. Regardez la page de la pièce.",
    "toast.addOnOff": "{name} est coupé. Le simple champ de note est revenu.",
    "toast.added": "{piece} ajouté. Nous enverrons une image avant de le faire.",
    "toast.removed": "Retiré du panier.",
    "toast.approved": "Validé. C'est dans la file — envoi au plus tard le {day}.",
    "toast.changeSent": "Envoyé. Nous referons l'image et vous la renverrons.",
    "toast.changeNeedsNote": "Écrivez ce que vous voulez changer et nous nous en occupons.",
    "toast.askSent": "Envoyé. Nous les lisons nous-mêmes, souvent le jour même.",
    "toast.askNeedsWhat": "Dites-nous ce que vous cherchez et nous verrons ensemble.",
    "toast.wrongSent": "Envoyé. Ada ou Nell vous répondra aujourd'hui.",
    "toast.wrongNeedsMore": "Il nous faut la référence et ce qui s'est passé.",
    "toast.reorderNone": "Rien sous cette adresse. Essayez iris.p@example.com.",
    "toast.reorderAdded": "Remis au panier. Changez ce que vous voulez avant de commander.",
    "toast.overLimit":
      "C'est plus long que ce que cette pièce accepte. Raccourcissez, ou demandez-nous de graver plus petit.",

    "gate.awaitingApproval": "Pas encore — {customer} n'a pas validé l'image.",
    "gate.noProofSent": "Pas encore — l'image n'est pas partie chez {customer}.",

    "bench.title": "L'établi",

    "notFound.code": "404",
    "notFound.title": "Rien sur cet établi",
    "notFound.body":
      "La page que vous cherchiez n'est pas ici. C'était peut-être un vieux lien, ou une pièce que nous ne faisons plus.",
    "notFound.cta": "Retour à la boutique",
  },

  "cs-CZ": {
    "common.loading": "Načítá se",
    "common.close": "Zavřít",
    "common.back": "Zpět",
    "common.mm": "{value} mm",

    "brand.name": "Birch Row",
    "brand.tagline": "DĚLÁME NA OBJEDNÁVKU · ÚT–SO",

    "nav.shop": "Obchod",
    "nav.order": "Vaše objednávka",
    "nav.about": "O nás",
    "nav.today": "Dnešek",
    "nav.orders": "Objednávky",
    "nav.pieces": "Kousky",
    "nav.materials": "Materiál",

    "header.search": "Najít kousek",
    "header.basket": "Košík",

    "theme.toDark": "Přepnout na tmavý režim",
    "theme.toLight": "Přepnout na světlý režim",

    "dock.label": "Ovládání ukázky",
    "dock.shopper": "Zákazník",
    "dock.maker": "Dílna",
    "dock.clockTitle": "Dílenské hodiny stojí. Stiskem je vrátíte zpět.",
    "dock.advance": "+1 dílenský den",
    "dock.language": "Jazyk",

    "footer.line": "© 2026 Birch Row. Ukázková dílenská prodejna dodávaná s Adminiem.",
    "footer.postage": "Odesílání a kalendář",
    "footer.care": "Jak se o to starat",
    "footer.reorder": "Objednat znovu",
    "footer.ask": "Zeptejte se nás na něco",
    "footer.wrong": "Když něco nesedí",

    "toast.dayAdvanced": "Dílenské hodiny se posunuly na {day}.",
    "toast.clockReset": "Hodiny zpátky na {day}.",
    "toast.addOnOn": "{name} je zapnutý. Podívejte se na stránku kusu.",
    "toast.addOnOff": "{name} je vypnutý. Prosté pole na poznámku je zpátky.",
    "toast.added": "{piece} přidáno. Než to uděláme, pošleme obrázek.",
    "toast.removed": "Vyndáno z košíku.",
    "toast.approved": "Schváleno. Je to ve frontě — odesíláme do {day}.",
    "toast.changeSent": "Odesláno. Obrázek uděláme znovu a pošleme zpátky.",
    "toast.changeNeedsNote": "Napište, co chcete změnit, a my se toho chytneme.",
    "toast.askSent": "Odesláno. Čteme si to sami, obvykle týž den.",
    "toast.askNeedsWhat": "Řekněte nám, o co jde, a půjdeme dál.",
    "toast.wrongSent": "Odesláno. Ada nebo Nell dnes odepíše.",
    "toast.wrongNeedsMore": "Potřebujeme číslo objednávky a co se stalo.",
    "toast.reorderNone": "Pod tímto e-mailem nic není. Zkuste iris.p@example.com.",
    "toast.reorderAdded": "Zpátky v košíku. Před objednáním můžete cokoli změnit.",
    "toast.overLimit":
      "To je delší, než tenhle kousek unese. Zkraťte to, nebo nám řekněte, ať to vyryjeme menší.",

    "gate.awaitingApproval": "Ještě ne — {customer} obrázek zatím neschválil.",
    "gate.noProofSent": "Ještě ne — obrázek zatím nešel k zákazníkovi {customer}.",

    "bench.title": "Ponk",

    "notFound.code": "404",
    "notFound.title": "Na tomhle ponku nic není",
    "notFound.body":
      "Stránka, kterou jste hledali, tu není. Mohl to být starý odkaz, nebo kousek, který už neděláme.",
    "notFound.cta": "Zpátky do obchodu",
  },

  "da-DK": {
    "common.loading": "Indlæser",
    "common.close": "Luk",
    "common.back": "Tilbage",
    "common.mm": "{value} mm",

    "brand.name": "Birch Row",
    "brand.tagline": "LAVES PÅ BESTILLING · TIR–LØR",

    "nav.shop": "Butik",
    "nav.order": "Din ordre",
    "nav.about": "Om os",
    "nav.today": "I dag",
    "nav.orders": "Ordrer",
    "nav.pieces": "Stykker",
    "nav.materials": "Materialer",

    "header.search": "Søg efter et stykke",
    "header.basket": "Kurv",

    "theme.toDark": "Skift til mørk",
    "theme.toLight": "Skift til lys",

    "dock.label": "Demo-knapper",
    "dock.shopper": "Kunde",
    "dock.maker": "Værksted",
    "dock.clockTitle": "Værkstedsuret står fast. Tryk for at sætte det tilbage.",
    "dock.advance": "+1 værkstedsdag",
    "dock.language": "Sprog",

    "footer.line": "© 2026 Birch Row. En demo-værkstedsbutik leveret med Adminium.",
    "footer.postage": "Forsendelse og kalenderen",
    "footer.care": "Sådan passer du på det",
    "footer.reorder": "Bestil igen",
    "footer.ask": "Spørg os om noget",
    "footer.wrong": "Hvis noget er galt",

    "toast.dayAdvanced": "Værkstedsuret er rykket til {day}.",
    "toast.clockReset": "Uret tilbage til {day}.",
    "toast.addOnOn": "{name} er tændt. Se siden for stykket.",
    "toast.addOnOff": "{name} er slukket. Det enkle notefelt er tilbage.",
    "toast.added": "{piece} lagt i kurven. Vi sender et billede, før vi går i gang.",
    "toast.removed": "Taget ud af kurven.",
    "toast.approved": "Godkendt. Det er i køen — sendes senest {day}.",
    "toast.changeSent": "Sendt. Vi laver billedet om og sender det tilbage.",
    "toast.changeNeedsNote": "Skriv, hvad du gerne vil have lavet om, så tager vi den derfra.",
    "toast.askSent": "Sendt. Vi læser dem selv, som regel samme dag.",
    "toast.askNeedsWhat": "Fortæl os, hvad du er ude efter, så ser vi på det.",
    "toast.wrongSent": "Sendt. Ada eller Nell skriver tilbage i dag.",
    "toast.wrongNeedsMore": "Vi skal bruge ordrenummeret og hvad der gik galt.",
    "toast.reorderNone": "Ingenting under den mail. Prøv iris.p@example.com.",
    "toast.reorderAdded": "Tilbage i kurven. Du kan ændre alt, før du bestiller.",
    "toast.overLimit":
      "Det er længere, end dette stykke kan bære. Kort det ned, eller bed os om at sætte det mindre.",

    "gate.awaitingApproval": "Ikke endnu — {customer} har ikke godkendt billedet.",
    "gate.noProofSent": "Ikke endnu — billedet er ikke sendt til {customer}.",

    "bench.title": "Værkstedsbordet",

    "notFound.code": "404",
    "notFound.title": "Der ligger ingenting på dette bord",
    "notFound.body":
      "Siden, du ledte efter, er her ikke. Måske et gammelt link, måske et stykke vi ikke laver længere.",
    "notFound.cta": "Tilbage til butikken",
  },

  "zh-CN": {
    "common.loading": "加载中",
    "common.close": "关闭",
    "common.back": "返回",
    "common.mm": "{value} 毫米",

    "brand.name": "Birch Row",
    "brand.tagline": "接单后现做 · 周二至周六",

    "nav.shop": "店铺",
    "nav.order": "你的订单",
    "nav.about": "关于我们",
    "nav.today": "今天",
    "nav.orders": "订单",
    "nav.pieces": "作品",
    "nav.materials": "材料",

    "header.search": "找一件作品",
    "header.basket": "购物篮",

    "theme.toDark": "切换到深色",
    "theme.toLight": "切换到浅色",

    "dock.label": "演示控制",
    "dock.shopper": "顾客",
    "dock.maker": "工坊",
    "dock.clockTitle": "工坊时钟是固定的。按一下可以调回去。",
    "dock.advance": "+1 个工坊日",
    "dock.language": "语言",

    "footer.line": "© 2026 Birch Row。随 Adminium 一同交付的手作店演示。",
    "footer.postage": "寄件与工坊日历",
    "footer.care": "怎么保养",
    "footer.reorder": "再订一次",
    "footer.ask": "跟我们提个要求",
    "footer.wrong": "如果哪里不对",

    "toast.dayAdvanced": "工坊时钟已拨到 {day}。",
    "toast.clockReset": "时钟已调回 {day}。",
    "toast.addOnOn": "{name} 已开启。看看作品页面。",
    "toast.addOnOff": "{name} 已关闭。简单的备注栏回来了。",
    "toast.added": "已加入 {piece}。动手之前我们会先发一张图给你看。",
    "toast.removed": "已从购物篮里取出。",
    "toast.approved": "已确认。已经排进队里——{day} 前寄出。",
    "toast.changeSent": "已发送。我们会重新做图再发给你。",
    "toast.changeNeedsNote": "写下你想改的地方，我们照着做。",
    "toast.askSent": "已发送。这些我们自己看，通常当天就回。",
    "toast.askNeedsWhat": "告诉我们你想要什么，我们再往下聊。",
    "toast.wrongSent": "已发送。Ada 或 Nell 今天会回你。",
    "toast.wrongNeedsMore": "我们需要订单号和出了什么问题。",
    "toast.reorderNone": "这个邮箱下没有记录。试试 iris.p@example.com。",
    "toast.reorderAdded": "已放回购物篮。下单前你可以随便改。",
    "toast.overLimit": "这比这件作品能容纳的要长。缩短一点，或者让我们刻小一号。",

    "gate.awaitingApproval": "还不行——{customer} 还没确认那张图。",
    "gate.noProofSent": "还不行——那张图还没发给 {customer}。",

    "bench.title": "工作台",

    "notFound.code": "404",
    "notFound.title": "这张工作台上什么都没有",
    "notFound.body": "你要找的页面不在这里。也许是旧链接，也许是我们已经不做的东西。",
    "notFound.cta": "回到店铺",
  },

  "zh-TW": {
    "common.loading": "載入中",
    "common.close": "關閉",
    "common.back": "返回",
    "common.mm": "{value} 公釐",

    "brand.name": "Birch Row",
    "brand.tagline": "接單後現做 · 週二至週六",

    "nav.shop": "店鋪",
    "nav.order": "你的訂單",
    "nav.about": "關於我們",
    "nav.today": "今天",
    "nav.orders": "訂單",
    "nav.pieces": "作品",
    "nav.materials": "材料",

    "header.search": "找一件作品",
    "header.basket": "購物籃",

    "theme.toDark": "切換到深色",
    "theme.toLight": "切換到淺色",

    "dock.label": "示範控制",
    "dock.shopper": "顧客",
    "dock.maker": "工坊",
    "dock.clockTitle": "工坊時鐘是固定的。按一下可以調回去。",
    "dock.advance": "+1 個工坊日",
    "dock.language": "語言",

    "footer.line": "© 2026 Birch Row。隨 Adminium 一同交付的手作店示範。",
    "footer.postage": "寄件與工坊日曆",
    "footer.care": "怎麼保養",
    "footer.reorder": "再訂一次",
    "footer.ask": "跟我們提個要求",
    "footer.wrong": "如果哪裡不對",

    "toast.dayAdvanced": "工坊時鐘已撥到 {day}。",
    "toast.clockReset": "時鐘已調回 {day}。",
    "toast.addOnOn": "{name} 已開啟。看看作品頁面。",
    "toast.addOnOff": "{name} 已關閉。簡單的備註欄回來了。",
    "toast.added": "已加入 {piece}。動手之前我們會先發一張圖給你看。",
    "toast.removed": "已從購物籃裡取出。",
    "toast.approved": "已確認。已經排進隊裡——{day} 前寄出。",
    "toast.changeSent": "已送出。我們會重新做圖再發給你。",
    "toast.changeNeedsNote": "寫下你想改的地方，我們照著做。",
    "toast.askSent": "已送出。這些我們自己看，通常當天就回。",
    "toast.askNeedsWhat": "告訴我們你想要什麼，我們再往下聊。",
    "toast.wrongSent": "已送出。Ada 或 Nell 今天會回你。",
    "toast.wrongNeedsMore": "我們需要訂單編號和出了什麼問題。",
    "toast.reorderNone": "這個信箱下沒有紀錄。試試 iris.p@example.com。",
    "toast.reorderAdded": "已放回購物籃。下單前你可以隨意修改。",
    "toast.overLimit": "這比這件作品能容納的要長。縮短一點，或者讓我們刻小一號。",

    "gate.awaitingApproval": "還不行——{customer} 還沒確認那張圖。",
    "gate.noProofSent": "還不行——那張圖還沒發給 {customer}。",

    "bench.title": "工作檯",

    "notFound.code": "404",
    "notFound.title": "這張工作檯上什麼都沒有",
    "notFound.body": "你要找的頁面不在這裡。也許是舊連結，也許是我們已經不做的東西。",
    "notFound.cta": "回到店鋪",
  },

  "ar-EG": {
    "common.loading": "جاري التحميل",
    "common.close": "إغلاق",
    "common.back": "رجوع",
    "common.mm": "{value} مم",

    "brand.name": "Birch Row",
    "brand.tagline": "يُصنع بعد الطلب · الثلاثاء–السبت",

    "nav.shop": "المتجر",
    "nav.order": "طلبك",
    "nav.about": "من نحن",
    "nav.today": "اليوم",
    "nav.orders": "الطلبات",
    "nav.pieces": "القطع",
    "nav.materials": "الخامات",

    "header.search": "ابحث عن قطعة",
    "header.basket": "السلة",

    "theme.toDark": "التحويل إلى الداكن",
    "theme.toLight": "التحويل إلى الفاتح",

    "dock.label": "أدوات العرض",
    "dock.shopper": "المشتري",
    "dock.maker": "الورشة",
    "dock.clockTitle": "ساعة الورشة مثبتة. اضغط لإعادتها.",
    "dock.advance": "+ يوم عمل واحد",
    "dock.language": "اللغة",

    "footer.line": "© 2026 Birch Row. متجر ورشة تجريبي يأتي مع Adminium.",
    "footer.postage": "الإرسال وتقويم الورشة",
    "footer.care": "كيف تعتني بها",
    "footer.reorder": "اطلبها مرة أخرى",
    "footer.ask": "اطلب منا شيئًا",
    "footer.wrong": "إذا كان هناك خطأ",

    "toast.dayAdvanced": "انتقلت ساعة الورشة إلى {day}.",
    "toast.clockReset": "عادت الساعة إلى {day}.",
    "toast.addOnOn": "{name} مُفعّل. انظر إلى صفحة القطعة.",
    "toast.addOnOff": "{name} مُطفأ. عادت خانة الملاحظة البسيطة.",
    "toast.added": "أُضيفت {piece}. سنرسل لك صورة قبل أن نصنعها.",
    "toast.removed": "أُخرجت من السلة.",
    "toast.approved": "تمت الموافقة. دخلت الطابور — تُرسل بحلول {day}.",
    "toast.changeSent": "أُرسلت. سنعيد الصورة ونرسلها لك.",
    "toast.changeNeedsNote": "اكتب ما تريد تغييره وسنأخذه في الحسبان.",
    "toast.askSent": "أُرسلت. نقرأ هذه بأنفسنا، غالبًا في اليوم نفسه.",
    "toast.askNeedsWhat": "قل لنا ما تريده ونكمل من هناك.",
    "toast.wrongSent": "أُرسلت. سترد عليك آدا أو نيل اليوم.",
    "toast.wrongNeedsMore": "نحتاج رقم الطلب وما الذي حدث.",
    "toast.reorderNone": "لا شيء تحت هذا البريد. جرّب iris.p@example.com.",
    "toast.reorderAdded": "عادت إلى السلة. غيّر ما تشاء قبل أن تطلب.",
    "toast.overLimit": "هذا أطول مما تتحمله القطعة. اختصره، أو اطلب منا نقشه أصغر.",

    "gate.awaitingApproval": "ليس بعد — لم يوافق {customer} على الصورة.",
    "gate.noProofSent": "ليس بعد — لم تُرسل الصورة إلى {customer}.",

    "bench.title": "طاولة العمل",

    "notFound.code": "404",
    "notFound.title": "لا شيء على هذه الطاولة",
    "notFound.body":
      "الصفحة التي تبحث عنها ليست هنا. ربما كان رابطًا قديمًا، أو قطعة لم نعد نصنعها.",
    "notFound.cta": "العودة إلى المتجر",
  },
} as const;
