/**
 * The shop's small drawn parts: a piece's tile in its material's colour,
 * its icon, a swatch. The colours are the catalogue's (a material's tint, a
 * finish's swatch), so they are drawn as SVG paint, never as a style.
 */
import {
  Bone,
  Bookmark,
  Box,
  Cake,
  Coffee,
  Disc,
  Flame,
  Flower2,
  Heart,
  House,
  Image,
  Inbox,
  KeyRound,
  Layers,
  Package,
  Sprout,
  Square,
  Trees,
  UtensilsCrossed,
  Zap,
  type LucideProps,
} from "lucide-react";
import { useId, type ComponentType, type ReactNode } from "react";

/** Named imports only: the icon set's dynamic map would pull every icon into the bundle. */
const ICONS: Readonly<Record<string, ComponentType<LucideProps>>> = {
  bone: Bone,
  bookmark: Bookmark,
  box: Box,
  cake: Cake,
  coffee: Coffee,
  disc: Disc,
  flame: Flame,
  "flower-2": Flower2,
  heart: Heart,
  house: House,
  home: House,
  image: Image,
  inbox: Inbox,
  "key-round": KeyRound,
  layers: Layers,
  sprout: Sprout,
  square: Square,
  trees: Trees,
  "utensils-crossed": UtensilsCrossed,
  zap: Zap,
};

export function PieceIcon({ name, size = 18 }: { name: string | null; size?: number }) {
  const Icon = (name === null ? undefined : ICONS[name]) ?? Package;
  return <Icon size={size} aria-hidden="true" />;
}

const HEX = /^#?([0-9a-f]{6})$/i;

/** A tint mixed toward white (amount > 0) or black (< 0). */
function shade(tint: string, amount: number): string {
  const match = HEX.exec(tint.trim());
  if (match === null) return tint;
  const n = Number.parseInt(match[1]!, 16);
  const mix = (c: number) => Math.round(amount >= 0 ? c + (255 - c) * amount : c * (1 + amount));
  const [r, g, b] = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map(mix);
  return `#${[r, g, b].map((c) => c!.toString(16).padStart(2, "0")).join("")}`;
}

/** Where the light falls, for each of the four angles a piece is shown from. */
const LIGHT: readonly [number, number][] = [
  [0.28, 0.2],
  [0.72, 0.18],
  [0.5, 0.5],
  [0.22, 0.78],
];

/**
 * A piece's tile: its material's colour with the light on it, and what lies
 * on top (the icon, the size and the badges), or the shop's own photo of it.
 */
export function Tile({ tint, angle = 0, photo = null, className = "", children }: { tint: string | null; angle?: number; photo?: string | null; className?: string; children?: ReactNode }) {
  const id = useId().replace(/[^a-zA-Z0-9]/g, "");
  const base = tint ?? "#8a7a68";
  const [x, y] = LIGHT[angle % 4]!;
  return (
    <span className={`sh-tile ${className}`}>
      {photo === null ? (
        <svg className="sh-tile-paint" aria-hidden="true" focusable="false" preserveAspectRatio="none" viewBox="0 0 100 100">
          <defs>
            <linearGradient id={`b${id}`} x1="0" y1="0" x2="1" y2="1">
              <stop offset="0" stopColor={shade(base, 0.18)} />
              <stop offset="1" stopColor={shade(base, -0.38)} />
            </linearGradient>
            <radialGradient id={`h${id}`} cx={x} cy={y} r="0.62">
              <stop offset="0" stopColor="#ffffff" stopOpacity="0.32" />
              <stop offset="1" stopColor="#ffffff" stopOpacity="0" />
            </radialGradient>
          </defs>
          <rect width="100" height="100" fill={`url(#b${id})`} />
          <rect width="100" height="100" fill={`url(#h${id})`} />
        </svg>
      ) : (
        <img className="sh-tile-photo" src={photo} alt="" />
      )}
      {children}
    </span>
  );
}

/** A finish's or a material's colour, as a small round or square chip. */
export function Swatch({ colour, shape = "round", size = 18 }: { colour: string | null; shape?: "round" | "square"; size?: number }) {
  const fill = colour ?? "#c9c9cf";
  return (
    <svg className="sh-swatch" width={size} height={size} viewBox="0 0 18 18" aria-hidden="true" focusable="false">
      {shape === "round" ? <circle cx="9" cy="9" r="8.5" fill={fill} stroke="rgba(0,0,0,.12)" /> : <rect x="0.5" y="0.5" width="17" height="17" rx="4" fill={fill} />}
    </svg>
  );
}

export function Mono({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <span className={`sh-mono ${className}`}>{children}</span>;
}
