/**
 * The studio's customers, as Adminium is told of them (`people`), and the
 * tick a shopper gives at checkout ("News from the workshop").
 *
 * A customer is made by their first order from the address they type, and
 * signs in to follow their orders by a link or code e-mailed to it. Their
 * language is the one that order was placed in. `may_email` is the
 * newsletter's consent, kept in step with Adminium's consent log.
 *
 * A customer is also copied onto every order of theirs (the name and address
 * the parcel goes to, the address the e-mails went to), onto a request or a
 * problem they sent, and onto the designs they made in the Customiser (the
 * address the design's link went to, and the words and choices in it). Each
 * copy is declared, so finding, exporting and erasing a person reaches it.
 * An order and its lines are the studio's record of a sale, which the law
 * keeps, so an erasure leaves those as they are.
 */
import { CUSTOMISER } from "./postings.ts";

/** The sentence shown beside the tick at checkout, and its version. */
export const NEWS_TICK = {
  column: "may_email",
  purpose: "newsletter",
  wording: {
    version: 1,
    // The checkout shows this sentence beside the box, in the shopper's language: the consent log keeps which.
    text: {
      "en-US": "Send me news from the studio now and then",
      "de-DE": "Schickt mir ab und zu Neuigkeiten aus der Werkstatt",
      "fr-FR": "Envoyez-moi de temps en temps des nouvelles de l'atelier",
      "cs-CZ": "Občas mi pošlete novinky z dílny",
      "da-DK": "Send mig nyheder fra værkstedet en gang imellem",
      "ar-EG": "أرسلوا لي أخبار الورشة من حين لآخر",
      "zh-CN": "偶尔给我发送工作室的消息",
      "zh-TW": "偶爾寄給我工作室的消息",
    },
  },
};

export const PEOPLE = [
  {
    table: "customers",
    kind: "people",
    email: "email",
    name: "name",
    firstName: "firstWordOfName",
    language: "language",
    consent: { column: "may_email", purpose: "newsletter" },
    copies: [
      { table: "orders", column: "name", holds: "name", via: "customer_id" },
      { table: "orders", column: "email", holds: "email", via: "customer_id" },
      { table: "orders", column: "address_line1", holds: "details", via: "customer_id" },
      { table: "orders", column: "address_line2", holds: "details", via: "customer_id" },
      { table: "orders", column: "town", holds: "details", via: "customer_id" },
      { table: "orders", column: "postcode", holds: "details", via: "customer_id" },
      // A request or a problem is nobody's account: found by the address it holds.
      { table: "commission_requests", column: "name", holds: "name" },
      { table: "commission_requests", column: "email", holds: "email" },
      { table: "problem_reports", column: "name", holds: "name" },
      { table: "problem_reports", column: "email", holds: "email" },
      // The designs their order lines name: the address its link went to, and what they put on it.
      { addOn: CUSTOMISER, table: "designs", column: "email", holds: "email", via: "order_lines.design_id" },
      { addOn: CUSTOMISER, table: "designs", column: "values", holds: "details", via: "order_lines.design_id" },
    ],
  },
];
