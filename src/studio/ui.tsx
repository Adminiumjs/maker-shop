/**
 * The small pieces every studio screen draws with: a material's tile, a
 * post-by chip, a customer's own words.
 */
import type { ReactNode } from "react";
import { Bone, Bookmark, Box, Cake, Coffee, Disc, Flower2, Heart, House, Image, Inbox, KeyRound, Sprout, UtensilsCrossed, Zap, type LucideIcon } from "lucide-react";

import type { StudioData } from "./door.ts";
import { isPale } from "./picture.ts";
import { lineMaterial, materialOf, postTone } from "./facts.ts";
import { useT } from "../i18n/index.tsx";
import { useFmt } from "./format.ts";
import { text, type Row } from "./wire.ts";

/** The icons a product's row may name (`products.icon`), by their lucide names. */
const ICONS: Readonly<Record<string, LucideIcon>> = {
  bone: Bone,
  bookmark: Bookmark,
  box: Box,
  cake: Cake,
  coffee: Coffee,
  disc: Disc,
  "flower-2": Flower2,
  heart: Heart,
  house: House,
  image: Image,
  inbox: Inbox,
  "key-round": KeyRound,
  sprout: Sprout,
  "utensils-crossed": UtensilsCrossed,
  zap: Zap,
};

/** A product's icon by the name its row gives; a box when the name is not one of them. */
export function Icon({ name, size = 16 }: { name: string | null | undefined; size?: number }) {
  const Found = ICONS[name ?? "box"] ?? Box;
  return <Found size={size} aria-hidden="true" focusable="false" />;
}

/** A material's colour as a tile, with the piece's icon on it. The tint is the material's own row. */
export function Tile({ tint, icon, size, iconSize = 16 }: { tint: string | null; icon?: string | null; size: 18 | 20 | 22 | 32 | 38 | 52 | 62; iconSize?: number }) {
  const fill = tint ?? "#8a8378";
  return (
    <span className={`st-tile st-tile--${String(size)}${isPale(fill) ? " st-tile--pale" : ""}`} aria-hidden="true">
      <svg viewBox="0 0 10 10" preserveAspectRatio="none" focusable="false">
        <rect width="10" height="10" fill={fill} />
      </svg>
      {icon === undefined ? null : <Icon name={icon} size={iconSize} />}
    </span>
  );
}

/** A line's tile: its material's tint and its product's icon. */
export function LineTile({ data, line, product, size, iconSize }: { data: StudioData; line: Row; product: Row | undefined; size: 18 | 20 | 22 | 32 | 38 | 52 | 62; iconSize?: number }) {
  return <Tile tint={text(lineMaterial(data, line)?.["tint"])} icon={text(product?.["icon"])} size={size} {...(iconSize === undefined ? {} : { iconSize })} />;
}

/** A product's tile: its own material's tint and its icon. */
export function ProductTile({ data, product, size, iconSize }: { data: StudioData; product: Row; size: 18 | 20 | 22 | 32 | 38 | 52 | 62; iconSize?: number }) {
  return <Tile tint={text(materialOf(data, product["material_id"])?.["tint"])} icon={text(product["icon"])} size={size} {...(iconSize === undefined ? {} : { iconSize })} />;
}

/** Words a customer typed, isolated so a name in another script reads the right way round. */
export function Typed({ children }: { children: ReactNode }) {
  return <bdi>{children}</bdi>;
}

/** A post-by as a chip: late, today or the next studio day, or later. */
export function ShipChip({ postBy, today, studioDays, closures, posted = false, className = "" }: { postBy: string | null; today: string; studioDays: readonly string[]; closures: readonly { from: string; to: string }[]; posted?: boolean; className?: string }) {
  const t = useT();
  const fmt = useFmt();
  if (posted) return <span className={`st-chip st-tone-posted ${className}`}>{t("studio.ship.posted")}</span>;
  const tone = postTone(postBy, today, studioDays, closures);
  return <span className={`st-chip st-tone-${tone} ${className}`}>{tone === "late" ? t("studio.ship.late", { day: fmt.day(postBy) }) : t("studio.ship.post", { day: fmt.day(postBy) })}</span>;
}
