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
 * the parcel goes to, the address the e-mails went to), onto its lines (the
 * words they asked for on a piece), onto the proofs the studio sent them (what
 * they asked to change, and, from 0.3.44, the proof's picture), onto a request
 * or a problem they sent, and onto the designs they made in the Customiser
 * (the address the design's link went to, and the words and choices in it).
 * Each copy is declared, so finding, exporting and erasing a person reaches
 * it. An order and its lines are the studio's record of a sale, which the law
 * keeps, so an erasure finds and exports the words on a line and leaves them
 * there; a proof is not that record, so its words and its picture go.
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
      // The words on a piece, and the line in a few words that repeats them.
      { table: "order_lines", column: "lettering", holds: "details", via: "customer_id" },
      { table: "order_lines", column: "summary", holds: "details", via: "customer_id" },
      // What they asked the studio to change on a proof, in their words.
      { table: "proofs", column: "change_note", holds: "details", via: "customer_id" },
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

/**
 * The picture of a proof the studio sent them; the logo and photo a shopper
 * put on their design, the versions of it the Customiser keeps as it was
 * ordered, and their files: the person's because their proof or their design
 * is, so erasing them deletes the proof's picture, the logo and photo, blanks
 * the words in each version and deletes its proof picture and production
 * files. Adminium empties a copy that holds files, and follows one that far
 * into an add-on, from 0.3.44.
 */
export const VERSION_COPIES = [
  { table: "proofs", column: "picture", holds: "details", via: "customer_id" },
  { addOn: CUSTOMISER, table: "designs", column: "logo_file", holds: "details", via: "order_lines.design_id" },
  { addOn: CUSTOMISER, table: "designs", column: "photo_file", holds: "details", via: "order_lines.design_id" },
  { addOn: CUSTOMISER, table: "design_versions", column: "values", holds: "details", via: "order_lines.design_id", from: ["design_id"] },
  { addOn: CUSTOMISER, table: "design_versions", column: "proof_file", holds: "details", via: "order_lines.design_id", from: ["design_id"] },
  { addOn: CUSTOMISER, table: "version_files", column: "file", holds: "details", via: "order_lines.design_id", from: ["version_id", "design_id"] },
];

/** The people declaration as a manifest at a floor that reads `from` writes it. */
export function peopleFor(versions: boolean): typeof PEOPLE {
  if (!versions) return PEOPLE;
  return PEOPLE.map((person) => ({ ...person, copies: [...person.copies, ...VERSION_COPIES] })) as typeof PEOPLE;
}
