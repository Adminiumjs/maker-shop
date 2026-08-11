/**
 * The small shared pieces. Nothing here holds state; everything takes props and
 * renders, so a screen can be read top to bottom without chasing a component.
 */

import type { CSSProperties, ReactNode } from "react";

import { number as ambientNumber } from "../i18n/ambient.ts";
import { useT } from "../i18n/index.tsx";
import type { MaterialKey } from "../lib/catalogue.ts";
import { materialSurface } from "../lib/format.ts";

/**
 * A run of digits — a price, a millimetre, a reference, a date.
 *
 * Always tabular and always isolated LTR. Arabic reads right to left but its
 * numbers do not, and without the isolation the bidi algorithm cheerfully turns
 * `95 × 110` into `110 × 95` in exactly one of the eight locales.
 *
 * AND A NUMBER HANDED TO IT IS FORMATTED, WHICH IS THE OTHER HALF OF THAT.
 * `<Mono>{cards.length}</Mono>` and `<Mono>×{line.quantity}</Mono>` put a raw
 * JavaScript number into the DOM, and a raw number is Latin digits in every
 * locale — so the basket chip counted ٠ items as "0" and a column header sat a
 * Latin 6 beside an Arabic heading. Everything that was already formatted
 * arrives here as a STRING (`cents()`, `mm()`, `day()`) and is untouched; what
 * is caught is exactly the value nobody remembered to format.
 */
function localizeDigits(node: ReactNode): ReactNode {
  if (typeof node === "number") return ambientNumber(node);
  if (Array.isArray(node)) return node.map(localizeDigits);
  return node;
}

export function Mono({
  children,
  className,
  style,
}: {
  children: ReactNode;
  className?: string;
  style?: CSSProperties;
}) {
  return (
    <span className={className ? `br-mono ${className}` : "br-mono"} style={style}>
      {localizeDigits(children)}
    </span>
  );
}

/**
 * SOMEBODY ELSE'S WORDS, IN SOMEBODY ELSE'S DIRECTION.
 *
 * A customer types "The Pinfold · 2019" into the box on a coaster and the shop
 * prints it back on six screens. On an Arabic page that run is a LATIN island
 * inside RTL prose, and two things follow from that which the app was getting
 * wrong:
 *
 *   1. TYPOGRAPHY. Without a direction of its own the bidi algorithm reorders
 *      the run's punctuation against the paragraph — the quotes and the middle
 *      dot end up on the wrong sides of words the customer wrote.
 *   2. NUMERALS. `numerals.arabic.test.tsx` bans a Latin quantity on an Arabic
 *      page, and "2019" here is not a quantity this shop worked out — it is a
 *      year a customer wants engraved, and transliterating it would engrave the
 *      wrong thing.
 *
 * `dir="auto"` says exactly what is true: the direction is whatever the text
 * itself is, decided per value, so Arabic wording written by an Arabic customer
 * still reads RTL. It is the marker the guard reads and the fix the typography
 * needed, and it is one component rather than a `dir` remembered at fourteen
 * call sites.
 */
export function Typed({ children }: { children: ReactNode }) {
  return <span dir="auto">{children}</span>;
}

/**
 * A CODE, WHICH IS ALWAYS READ LEFT TO RIGHT.
 *
 * A card number, a reference stripped to its digits, a postcode: written in
 * Latin script in every language, and meaningless in any other order. Same
 * mechanism as `Typed` and a different promise — this one is not the reader's
 * text and not the shop's prose, it is a string off a card or a docket.
 */
export function Code({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <span dir="ltr" className={className}>
      {children}
    </span>
  );
}

export function Tag({
  tone = "neutral",
  children,
}: {
  tone?: "neutral" | "pos" | "warn" | "danger" | "info";
  children: ReactNode;
}) {
  return (
    <span className={tone === "neutral" ? "br-tag" : `br-tag br-tag--${tone}`}>{children}</span>
  );
}

/** An option chip — material, size, finish, quantity break. */
export function Chip({
  selected = false,
  label,
  sub,
  foot,
  swatch,
  tile,
  onClick,
}: {
  selected?: boolean;
  label: ReactNode;
  sub?: ReactNode;
  foot?: ReactNode;
  /** A flat colour, for a finish or a glaze. */
  swatch?: string;
  /** A material, which gets its own tinted and textured square instead. */
  tile?: MaterialKey;
  onClick?: () => void;
}) {
  return (
    <button type="button" className="br-chip br-btn" aria-pressed={selected} onClick={onClick}>
      {tile !== undefined && (
        <span className="br-chip-tile" style={{ backgroundImage: materialSurface(tile) }} />
      )}
      {swatch !== undefined && <span className="br-chip-swatch" style={{ background: swatch }} />}
      <span className="br-chip-text">
        <span>{label}</span>
        {sub !== undefined && <span className="br-chip-sub">{sub}</span>}
        {foot !== undefined && <span className="br-chip-foot">{foot}</span>}
      </span>
    </button>
  );
}

export function Field({ label, children }: { label: ReactNode; children: ReactNode }) {
  return (
    <label className="br-field">
      <span className="br-label">{label}</span>
      {children}
    </label>
  );
}

/**
 * The material tile that stands in for a photograph.
 *
 * NO PHOTOGRAPHY ANYWHERE IN THIS APP, and this shop leans on that harder than
 * any before it because it sells objects. Each tile is a tint plus a CSS
 * TEXTURE for the material — wood grain as repeating gradients, slate as a
 * mottled radial, ceramic as a soft sheen, resin as a flat matte — under an
 * oversized Lucide icon and a mono size chip. A stock photo pretending to be a
 * real piece would be a worse lie than an honest tinted panel.
 *
 * `angle` shifts the icon rather than swapping the picture: a piece shown from
 * four sides is the same tile with the light moved, which is exactly what the
 * comp asks for and exactly what an honest demo can promise.
 */
export function Tile({
  material,
  icon,
  chip,
  badge,
  angle = 0,
  className,
  style,
}: {
  material: MaterialKey;
  icon: ReactNode;
  chip?: ReactNode;
  badge?: ReactNode;
  angle?: number;
  className?: string;
  style?: CSSProperties;
}) {
  const transforms = ["none", "rotate(-9deg) scale(.92)", "scale(1.14)", "rotate(6deg) scale(1.5)"];
  return (
    <div
      className={className ? `br-tile ${className}` : "br-tile"}
      style={{ ...style, backgroundImage: materialSurface(material) }}
    >
      <span className="br-tile-icon" style={{ transform: transforms[angle] ?? "none" }}>
        {icon}
      </span>
      {chip !== undefined && <span className="br-tile-chip">{chip}</span>}
      {badge !== undefined && <span className="br-tile-badge">{badge}</span>}
    </div>
  );
}

/*
 * THERE IS NO `SlotEmpty` HERE, AND ITS ABSENCE IS THE POINT (24 D19).
 *
 * A `SlotEmpty({ title, body })` used to sit at this line: a dashed, muted box
 * with a heading and a sentence, exported and imported by nothing. Six of this
 * app's nine slots must render NOTHING when they are empty, and the three that
 * speak each say something specific enough to be written where it is said — the
 * note field with its counter, the till's "these are the studio's own postage
 * options", the order's "we walk everything to the post office ourselves". None
 * of them wanted a generic box.
 *
 * So what was left was a ready-made dashed placeholder, in the shared
 * primitives file, one import away from every slot that must not have one. It
 * was also the exact shape of the mutant that proved the D19 guard blind. The
 * component is gone, `.br-slot-empty` is gone from `components.css`, and
 * `slotRender.test.tsx` now fails if a silent slot renders so much as a space.
 */

export function Skeleton({ height = 44, width }: { height?: number; width?: number | string }) {
  return <div className="br-skel" style={{ height, width }} aria-hidden="true" />;
}

/** The loading shimmer a view switch shows for a beat. */
export function ScreenSkeleton() {
  const t = useT();
  return (
    <div className="br-stack" aria-busy="true" aria-label={t("common.loading")}>
      <Skeleton height={34} width="min(340px, 60%)" />
      <div className="br-grid">
        <Skeleton height={250} />
        <Skeleton height={250} />
        <Skeleton height={250} />
        <Skeleton height={250} />
      </div>
    </div>
  );
}

export function EmptyState({
  title,
  body,
  children,
}: {
  title: ReactNode;
  body?: ReactNode;
  children?: ReactNode;
}) {
  return (
    <div className="br-empty">
      <div className="br-empty-title">{title}</div>
      {body !== undefined && <p className="br-empty-body">{body}</p>}
      {children}
    </div>
  );
}
