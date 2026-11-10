/**
 * The studio's e-mails, one template per outbox kind, in the eight languages
 * the app ships.
 *
 * Each e-mail's words are a small record of sentences (`Words`), and the
 * layout that holds them is written once below, so a translation is only the
 * words: nobody builds a block list per language, and no language can lose a
 * block the others have. The other seven languages are in `emails-i18n.ts`.
 *
 * `{{…}}` are the outbox's variables, filled by Adminium when it sends:
 * `order.*`, `proof.*`, `request.*` and `problem.*` through the message's
 * links (and one link further: `order.service.name` is the order's postage
 * service); `row.*` each line of an order; `practice.*` the studio's settings
 * row; `appName` the studio's name; `recipient.first_name` the shopper;
 * `manage_url` the shop's order page, which the order's own code opens.
 * Adminium writes each date, amount and choice in the e-mail's language.
 *
 * What the e-mails never read: a shopper's personal columns on a linked row
 * (Adminium keeps those out of every e-mail; the shopper is greeted by the
 * recipient's own name), and anything the studio did not store. Catalogue
 * values (a piece's name, its material, the lettering) print as the studio and
 * the shopper wrote them, in every language. Every e-mail is service mail: no
 * unsubscribe line, no tracking of any kind, and a reply reaches the studio.
 */
import type { Tag } from "./labels.ts";
import { TO_STUDIO, type Kind } from "./outbox.ts";
import { EMAIL_TRANSLATIONS } from "./emails-i18n.ts";

/** One e-mail's sentences. */
export interface Words {
  /** What the e-mail is called on the E-mails page. */
  name: string;
  subject: string;
  preheader: string;
  heading: string;
  paras: string[];
  /** Said after the buttons, when there are any. */
  after?: string[];
}

export type EmailWords = Record<Kind, Words> & {
  /** The rows under an order's lines. */
  postage: string;
  total: string;
  postBy: string;
  follow: string;
  /** Under every button that carries the order's own link. */
  justForYou: string;
  /** A proof's two answers: both open the order's page, where the shopper gives one. */
  yes: string;
  change: string;
  /** The posted e-mail's rows and button. */
  service: string;
  tracking: string;
  trackIt: string;
  /** The rows of a copy of what was sent. */
  what: string;
  material: string;
  when: string;
  from: string;
  orderNumber: string;
  wentWrong: string;
  happened: string;
  proof: string;
  sent: string;
  /** What a proof's picture says to a reader who sees no pictures. */
  proofPicture: string;
  /** The row naming the piece a proof is of: its label code and what it is. */
  piece: string;
  /** The footer of a shopper's e-mail, and of the studio's own. */
  foot: string;
  staffFoot: string;
};

export const EMAIL_EN: EmailWords = {
  postage: "Postage · {{order.service.name}}",
  total: "Total",
  postBy: "Post by",
  follow: "Follow your order",
  justForYou: "This link is just for you — don't forward it.",
  yes: "Yes, make it",
  change: "Ask for a change",
  service: "Sent by",
  tracking: "Tracking number",
  trackIt: "Track it",
  what: "What",
  material: "Material",
  when: "When",
  from: "From",
  orderNumber: "Order number",
  wentWrong: "What went wrong",
  happened: "What happened",
  proof: "Proof",
  sent: "Sent",
  proofPicture: "Your proof",
  piece: "Piece",
  foot: "{{appName}} · {{practice.address|}}. Reply to this e-mail and it reaches the studio.",
  staffFoot: "Sent by the shop to the studio.",
  "order-received": {
    name: "Order received",
    subject: "We've got your order {{order.number}}",
    preheader: "{{order.total}} · post by {{order.post_by}}",
    heading: "Thanks, {{recipient.first_name}} — we've got your order {{order.number}}.",
    paras: ["Here's what you ordered. Anything with words on it gets a proof first: we'll e-mail you a picture to say yes to before we make it."],
  },
  "proof-ready": {
    name: "Proof ready",
    subject: "Proof {{proof.version}} for {{proof.line_code}} is ready",
    preheader: "Say yes, or tell us what to change.",
    heading: "{{recipient.first_name}}, your proof is ready",
    paras: ["Proof {{proof.version}} of your order {{order.number}} shows what we're about to make. Have a look on your order's page, then say yes or tell us what to change."],
    after: ["We won't cut anything until you say yes."],
  },
  "proof-reminder": {
    name: "Proof reminder",
    subject: "Your proof for {{proof.line_code}} is still waiting",
    preheader: "We'll start as soon as you say yes.",
    heading: "Your proof is still waiting, {{recipient.first_name}}",
    paras: ["We sent proof {{proof.version}} for your order {{order.number}} on {{proof.sent_at.date}}."],
    after: ["We won't start until you say yes. This is the only reminder we'll send."],
  },
  "order-posted": {
    name: "Order posted",
    subject: "Your order {{order.number}} is on its way",
    preheader: "Posted {{order.posted_at.date}} · {{order.service.name}}",
    heading: "Your order {{order.number}} is on its way",
    paras: ["We posted it on {{order.posted_at.date}}.", "If anything's wrong when it arrives, reply to this e-mail and tell us."],
  },
  "request-received": {
    name: "Request received",
    subject: "We got your request, {{request.ref}}",
    preheader: "We'll reply within two studio days.",
    heading: "We got your request, {{recipient.first_name}}",
    paras: ["Here's a copy of what you sent. We'll reply within two studio days."],
    after: ["We talk it through with you before we make anything. To add something, reply to this e-mail."],
  },
  "problem-received": {
    name: "Problem received",
    subject: "We got your message about {{problem.order_ref}}",
    preheader: "We'll reply within one studio day.",
    heading: "We got your message about {{problem.order_ref}}",
    paras: ["Thanks, {{recipient.first_name}}. We made it ourselves, so it comes straight to us. Here's a copy of what you sent. We'll reply within one studio day."],
    after: ["A photo helps if you have one. Reply to this e-mail with it."],
  },
  "request-copy": {
    name: "Request: studio copy",
    subject: "New request {{request.ref}} from {{request.name}}",
    preheader: "{{request.idea}}",
    heading: "{{request.name}} has asked for something",
    paras: ["Request {{request.ref}}. Reply from the request in the studio."],
  },
  "problem-copy": {
    name: "Problem: studio copy",
    subject: "{{problem.name}}: {{problem.order_ref}}, {{problem.what.label}}",
    preheader: "{{problem.ref}} · {{problem.details}}",
    heading: "{{problem.name}} says something is wrong with {{problem.order_ref}}",
    paras: ["Message {{problem.ref}}. Open it in the studio to reply."],
  },
  "change-asked": {
    name: "Change asked to a proof",
    subject: "A change asked to proof {{proof.version}} of {{proof.line_code}}",
    preheader: "{{proof.change_note}}",
    heading: "A change asked to proof {{proof.version}} of {{proof.line_code}}",
    paras: ["The proof goes back to the bench: send a new one from the order in the studio."],
  },
};

type Block = { block: string; id: string; data: Record<string, unknown> };
const text = (id: string, ...paras: string[]): Block => ({ block: "email.text", id, data: { paras } });
/** Facts as label and value rows; `onlyWith` leaves the block out when its value is empty. */
const facts = (id: string, lines: { label: string; amount: string }[], onlyWith?: string): Block => ({
  block: "email.tax-breakdown",
  id,
  data: { lines, ...(onlyWith === undefined ? {} : { onlyWith }) },
});
/** The order's own page, opened by the order's code in the fragment. */
const ORDER_LINK = "{{manage_url}}#{{order.link_token}}";
const button = (id: string, label: string, url = ORDER_LINK, onlyWith?: string): Block => ({ block: "email.button", id, data: { label, url, ...(onlyWith === undefined ? {} : { onlyWith }) } });
/** DHL's own page for a parcel, by its tracking number: public, so the link goes out as it is. */
const DHL_TRACKING = "https://www.dhl.com/gb-en/home/tracking.html?tracking-id={{order.tracking}}";

/** An order's lines: the piece and how many, its options and lettering, its customising features, what the line comes to. */
const LINES: Block = {
  block: "email.rows",
  id: "lines",
  data: {
    from: { link: "order", table: "order_lines", via: "order_id", orderBy: "position", limit: 20 },
    joins: { features: { table: "order_line_features", via: "line_id", column: "name", orderBy: "id", separator: " · " } },
    row: { title: "{{row.product_name}} × {{row.qty}}", meta: "{{row.summary}}", amount: "{{row.line_total}}", note: "{{row.features}}" },
  },
};

/** The piece a proof is of: its label code ("BR-2291/1") and what it is, as the catalogue names it. */
const PIECE = (all: EmailWords) => ({ label: all.piece, amount: "{{proof.line_code}} · {{proof.line.product_name}}" });

function layout(kind: Kind, all: EmailWords) {
  const w = all[kind];
  const blocks: Block[] = [{ block: "email.heading", id: "heading", data: { text: w.heading } }, text("body", ...w.paras)];
  switch (kind) {
    case "order-received":
      blocks.push(LINES);
      blocks.push(facts("totals", [
        { label: all.postage, amount: "{{order.postage}}" },
        { label: all.total, amount: "{{order.total}}" },
        { label: all.postBy, amount: "{{order.post_by}}" },
      ]));
      blocks.push(button("follow", all.follow));
      break;
    case "proof-ready":
    case "proof-reminder":
      // The piece it is of, by its label code and what it is: two lines of one order each have a proof 1.
      blocks.push(facts("piece", [PIECE(all)]));
      // The proof's own picture; a proof sent as a PDF is no picture, and is left out: the buttons open it.
      blocks.push({ block: "email.image", id: "picture", data: { fileId: "{{proof.picture}}", alt: all.proofPicture } });
      blocks.push({ block: "email.quote", id: "note", data: { text: "{{proof.note}}", onlyWith: "proof.note" } });
      blocks.push(button("yes", all.yes), button("change", all.change));
      break;
    case "order-posted":
      blocks.push(facts("service", [{ label: all.service, amount: "{{order.service.name}}" }]));
      blocks.push({ block: "email.text", id: "detail", data: { paras: ["{{order.service.detail}}"], onlyWith: "order.service.detail" } });
      // A tracking number comes only through DHL: without one the e-mail says the service and nothing more.
      blocks.push({ block: "email.box", id: "tracking", data: { label: all.tracking, value: "{{order.tracking}}", onlyWith: "order.tracking" } });
      blocks.push(button("track", all.trackIt, DHL_TRACKING, "order.tracking"));
      break;
    case "request-received":
    case "request-copy":
      blocks.push(facts("what", [{ label: all.what, amount: "{{request.idea}}" }]));
      blocks.push(facts("material", [{ label: all.material, amount: "{{request.material}}" }], "request.material"));
      blocks.push(facts("when", [{ label: all.when, amount: "{{request.wanted_when}}" }], "request.wanted_when"));
      if (kind === "request-copy") blocks.push(facts("from", [{ label: all.from, amount: "{{request.name}}" }]));
      break;
    case "problem-received":
    case "problem-copy":
      blocks.push(facts("problem", [
        { label: all.orderNumber, amount: "{{problem.order_ref}}" },
        { label: all.wentWrong, amount: "{{problem.what.label}}" },
        { label: all.happened, amount: "{{problem.details}}" },
      ]));
      break;
    case "change-asked":
      blocks.push({ block: "email.quote", id: "asked", data: { text: "{{proof.change_note}}", onlyWith: "proof.change_note" } });
      blocks.push(facts("proof", [PIECE(all), { label: all.proof, amount: "{{proof.version}}" }, { label: all.sent, amount: "{{proof.sent_at}}" }]));
      break;
  }
  if (w.after !== undefined) blocks.push(text("after", ...w.after));
  // Every e-mail that carries the order's own code says whose it is.
  if (JSON.stringify(blocks).includes("{{order.link_token}}")) blocks.push(text("just-for-you", all.justForYou));
  return { subject: w.subject, preheader: w.preheader, blocks, footer: TO_STUDIO.has(kind) ? all.staffFoot : all.foot };
}

/** Every language's words: English here, the others in `emails-i18n.ts`. */
export function emailWords(): Record<Tag, EmailWords> {
  return { "en-US": EMAIL_EN, ...EMAIL_TRANSLATIONS };
}

/** The variables each template reads, for the template editor's list. */
function varsOf(kind: Kind): string[] {
  const text = JSON.stringify(layout(kind, EMAIL_EN));
  const found = new Set<string>();
  for (const [, name] of text.matchAll(/\{\{([A-Za-z_.]+)[|}]/g)) found.add(name!);
  return [...found].filter((name) => !name.startsWith("row.")).sort();
}

/** The manifest's `emailTemplates`: one per kind, in every language the words are in. */
export function emailTemplates(kinds: readonly Kind[]): unknown[] {
  const words = emailWords();
  return kinds.map((kind) => ({
    key: `maker-${kind}`,
    name: Object.fromEntries(Object.entries(words).map(([tag, w]) => [tag, w[kind].name])),
    vars: varsOf(kind),
    locales: Object.fromEntries(Object.entries(words).map(([tag, w]) => [tag, layout(kind, w)])),
  }));
}
