/**
 * The studio's e-mails, one template per outbox kind.
 *
 * PLACEHOLDERS: each template is a heading and a few plain sentences in
 * English, enough for the outbox to send something true. The drawn e-mails
 * (`Birch Row Emails`), with their blocks and their eight languages, replace
 * them; nothing else reads these words.
 *
 * `{{…}}` are the outbox's variables, filled by Adminium when it sends:
 * `order.*`, `request.*` and `problem.*` through the message's links;
 * `practice.*` the studio's settings row; `recipient.first_name` the shopper;
 * `manage_url` the shop's order page.
 */
import { KIND_NAMES, type Kind } from "./outbox.ts";

interface Words {
  subject: string;
  preheader: string;
  heading: string;
  paras: string[];
  /** A button to the order's own page, with the order's link code. */
  button?: string;
}

const WORDS: Record<Kind, Words> = {
  "order-received": {
    subject: "Your order {{order.number}} is in",
    preheader: "We'll post it by {{order.post_by}}.",
    heading: "Thank you, {{recipient.first_name}}.",
    paras: ["We have your order {{order.number}}. It comes to {{order.total}}, and we'll post it by {{order.post_by}}.", "Anything with words on it gets a proof first: we'll e-mail you a picture to approve before we make it."],
    button: "See your order",
  },
  "proof-ready": {
    subject: "Your proof for {{order.number}} is ready",
    preheader: "Have a look, then approve it or ask for a change.",
    heading: "Your proof is ready.",
    paras: ["We've drawn what we're about to make for your order {{order.number}}. Have a look, then approve it or tell us what to change."],
    button: "See your proof",
  },
  "proof-reminder": {
    subject: "Your proof for {{order.number}} is still waiting",
    preheader: "We'll start as soon as you approve it.",
    heading: "Your proof is still waiting.",
    paras: ["We can't start on your order {{order.number}} until you've approved the proof, or told us what to change."],
    button: "See your proof",
  },
  "order-posted": {
    subject: "Your order {{order.number}} is in the post",
    preheader: "It went today.",
    heading: "It's on its way.",
    paras: ["Your order {{order.number}} went in the post today."],
    button: "See your order",
  },
  "request-received": {
    subject: "We have your request {{request.ref}}",
    preheader: "We'll reply within two studio days.",
    heading: "Thank you, {{recipient.first_name}}.",
    paras: ["Your request {{request.ref}} reached the studio. We'll reply within two studio days."],
  },
  "problem-received": {
    subject: "We're looking at {{problem.ref}}",
    preheader: "We'll reply within one studio day.",
    heading: "Sorry about that, {{recipient.first_name}}.",
    paras: ["We have your message {{problem.ref}} about order {{problem.order_ref}}. We'll reply within one studio day."],
  },
  "request-copy": {
    subject: "New request {{request.ref}}",
    preheader: "From {{request.name}}.",
    heading: "A new request.",
    paras: ["{{request.name}} ({{request.email}}) asked for something: {{request.idea}}"],
  },
  "problem-copy": {
    subject: "Problem with {{problem.order_ref}}: {{problem.ref}}",
    preheader: "From {{problem.name}}.",
    heading: "Something's wrong with an order.",
    paras: ["{{problem.name}} ({{problem.email}}) wrote about order {{problem.order_ref}}: {{problem.details}}"],
  },
};

function layout(kind: Kind) {
  const w = WORDS[kind];
  const blocks: Record<string, unknown>[] = [
    { block: "email.heading", id: "heading", data: { text: w.heading } },
    { block: "email.text", id: "body", data: { paras: w.paras } },
  ];
  if (w.button !== undefined) blocks.push({ block: "email.button", id: "follow", data: { label: w.button, url: "{{manage_url}}#{{order.link_token}}" } });
  return { subject: w.subject, preheader: w.preheader, blocks, footer: "{{practice.name}}" };
}

/** The variables each template reads, for the template editor's list. */
function varsOf(kind: Kind): string[] {
  const text = JSON.stringify(layout(kind));
  const found = new Set<string>();
  for (const [, name] of text.matchAll(/\{\{([A-Za-z_.]+)\}\}/g)) found.add(name!);
  return [...found].sort();
}

/** The manifest's `emailTemplates`: one per kind. */
export function emailTemplates(kinds: readonly Kind[]): unknown[] {
  return kinds.map((kind) => ({
    key: `maker-${kind}`,
    name: { "en-US": KIND_NAMES[kind] },
    vars: varsOf(kind),
    locales: { "en-US": layout(kind) },
  }));
}
