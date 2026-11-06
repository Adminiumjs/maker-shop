/**
 * Words the shop's screens share: a category's name, and a sentence with a
 * figure set in mono inside it.
 */
import { Fragment, type ReactNode } from "react";

import type { MessageKey, TFunction } from "../i18n/index.tsx";

const CATEGORIES = ["coasters", "signs", "keyrings", "pots", "desk", "mugs"] as const;

/** A product's category, as the shop's filter names it. */
export function categoryKey(category: string): MessageKey {
  return ((CATEGORIES as readonly string[]).includes(category) ? `shop.category.${category}` : "shop.category.other") as MessageKey;
}

/**
 * A sentence with parts that are not plain words: the template is the
 * message itself, and each `{name}` in it is replaced by the node given, so
 * a translation may put the figure anywhere in its own sentence.
 */
export function rich(t: TFunction, key: MessageKey, nodes: Record<string, ReactNode>): ReactNode {
  const template = t(key);
  const parts = template.split(/(\{\w+\})/g);
  return parts.map((part, i) => {
    const name = /^\{(\w+)\}$/.exec(part)?.[1];
    return <Fragment key={i}>{name !== undefined && name in nodes ? nodes[name] : part}</Fragment>;
  });
}
