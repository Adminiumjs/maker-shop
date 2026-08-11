/**
 * The icon table.
 *
 * `catalogue.ts` names a Lucide icon as a STRING because it is data and must
 * not import React. This is the one place those names become components, so a
 * new piece is a data change plus one line here rather than an import in every
 * screen that draws it.
 *
 * Named imports only — `lucide-react`'s dynamic map pulls the whole set into
 * the bundle, and this app ships about twenty icons.
 */

import {
  Bookmark,
  Box,
  Cake,
  CircleDot,
  Coffee,
  Dog,
  Flame,
  Flower2,
  Hammer,
  Heart,
  Home,
  Image,
  Inbox,
  KeyRound,
  Layers,
  Package,
  Sparkles,
  Sprout,
  Square,
  Trees,
  Utensils,
  Zap,
  type LucideProps,
} from "lucide-react";
import type { ComponentType } from "react";

const ICONS: Readonly<Record<string, ComponentType<LucideProps>>> = {
  bookmark: Bookmark,
  box: Box,
  cake: Cake,
  "circle-dot": CircleDot,
  coffee: Coffee,
  dog: Dog,
  flame: Flame,
  "flower-2": Flower2,
  hammer: Hammer,
  heart: Heart,
  home: Home,
  image: Image,
  inbox: Inbox,
  "key-round": KeyRound,
  layers: Layers,
  package: Package,
  sparkles: Sparkles,
  sprout: Sprout,
  square: Square,
  trees: Trees,
  utensils: Utensils,
  zap: Zap,
};

/** Draw a Lucide icon by the name the catalogue gave it. */
export function Icon({ name, size = 18 }: { name: string; size?: number }) {
  const Cmp = ICONS[name] ?? Package;
  return <Cmp size={size} aria-hidden="true" />;
}
