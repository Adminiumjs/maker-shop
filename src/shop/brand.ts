/**
 * The shop's own look, from its settings row: its logo, the line under its
 * name, its accent colour in each theme and its typeface. An owner reskins
 * the shop on the dashboard (Maker Shop › Settings), with no build of their
 * own; whatever they leave empty stays as the shop ships (the tree, the
 * tagline in each language, walnut, Manrope).
 *
 * THE ACCENT IS HELD TO AA IN BOTH THEMES, WHATEVER IS TYPED. The accent is a
 * fill behind white text in light (`--accent-fg` #ffffff) and behind
 * near-black text in dark (#0f0f14), and it is text itself on the pages'
 * surfaces and on its own soft fill (see `tokens.css`). So the light accent is
 * darkened until each of those reads at 4.5:1, and the dark one — the one the
 * owner entered, or else the light one — is lightened until it does on the
 * dark pages. A colour that already reads is kept as it is. The focus ring is
 * the accent at full strength, so it clears 3:1 with room to spare.
 */
import type { Studio } from "./port.ts";

type Rgb = readonly [number, number, number];

/** `#rgb`, `#rrggbb` or the same without `#`, as `#rrggbb` in lower case; anything else null. */
export function parseHex(value: string | null | undefined): string | null {
  if (typeof value !== "string") return null;
  const raw = value.trim().replace(/^#/, "").toLowerCase();
  if (/^[0-9a-f]{3}$/.test(raw)) return `#${[...raw].map((c) => c + c).join("")}`;
  return /^[0-9a-f]{6}$/.test(raw) ? `#${raw}` : null;
}

const rgb = (hex: string): Rgb => [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16)) as unknown as Rgb;
const hexOf = (c: Rgb): string => `#${c.map((v) => Math.round(Math.min(255, Math.max(0, v))).toString(16).padStart(2, "0")).join("")}`;
/** `a` over `b` at `share` of `a`, as `color-mix(in srgb, …)` mixes. */
const mix = (a: Rgb, b: Rgb, share: number): Rgb => [0, 1, 2].map((i) => a[i]! * share + b[i]! * (1 - share)) as unknown as Rgb;

function luminance(c: Rgb): number {
  const [r, g, b] = c.map((v) => {
    const s = v / 255;
    return s <= 0.04045 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  }) as [number, number, number];
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/** The WCAG contrast of two opaque colours. */
export function contrast(a: string, b: string): number {
  const [hi, lo] = [luminance(rgb(a)), luminance(rgb(b))].sort((x, y) => y - x) as [number, number];
  return (hi + 0.05) / (lo + 0.05);
}

/** AA for text of any size. */
export const AA = 4.5;

/** What the accent is read against in each theme: its text colour, the surfaces, and its own soft fill over the deepest one. */
const LIGHT = { fg: "#ffffff", surfaces: ["#ffffff", "#f6f6f8", "#fafafa", "#f1f1f4"], soft: 0.1 };
const DARK = { fg: "#0f0f14", surfaces: ["#0a0a0d", "#141419", "#1a1a20", "#24242c"], soft: 0.2 };

function worst(accent: string, theme: typeof LIGHT): number {
  const deepest = rgb(theme.surfaces[theme.surfaces.length - 1]!);
  const backdrops = [theme.fg, ...theme.surfaces, hexOf(mix(rgb(accent), deepest, theme.soft))];
  return Math.min(...backdrops.map((b) => contrast(accent, b)));
}

/** The colour moved toward `to` in small steps until it reads at AA in the theme. */
function untilItReads(hex: string, theme: typeof LIGHT, to: Rgb): string {
  let c = rgb(hex);
  for (let step = 0; step < 50 && worst(hexOf(c), theme) < AA; step++) c = mix(c, to, 0.94);
  return hexOf(c);
}

/** The accent pair from what the owner typed: null when the light one is no colour, so the shop keeps its own. */
export function accentPair(light: string | null | undefined, dark?: string | null): { light: string; dark: string } | null {
  const base = parseHex(light);
  if (base === null) return null;
  const own = parseHex(dark) ?? base;
  return { light: untilItReads(base, LIGHT, [0, 0, 0]), dark: untilItReads(own, DARK, [255, 255, 255]) };
}

/** The typefaces an owner may choose: stacks every device has, so nothing is fetched from anywhere. Manrope is the shop's own. */
export const FONTS: Record<string, string | null> = {
  manrope: null,
  system: 'ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, sans-serif',
  serif: 'ui-serif, "Iowan Old Style", "Palatino Linotype", Palatino, Georgia, Cambria, "Times New Roman", serif',
  rounded: 'ui-rounded, "Hiragino Maru Gothic ProN", Quicksand, Comfortaa, Manjari, "Arial Rounded MT", "Arial Rounded MT Bold", Calibri, sans-serif',
};

/** The CSS properties the studio's look sets on the page's root; empty when it has none of its own. */
export function brandVars(studio: Pick<Studio, "accent" | "accentDark" | "font"> | null): Record<string, string> {
  const out: Record<string, string> = {};
  const pair = accentPair(studio?.accent, studio?.accentDark);
  if (pair !== null) {
    out["--accent-light"] = pair.light;
    out["--accent-dark"] = pair.dark;
  }
  const font = studio?.font == null ? null : (FONTS[studio.font] ?? null);
  if (font !== null) out["--font-sans"] = font;
  return out;
}

/**
 * The look as one rule on the root, or null with nothing of its own. Every
 * value is a colour `accentPair` wrote or a stack from `FONTS`, never what
 * was typed, so nothing but these properties can reach the page.
 */
export function brandCss(studio: Pick<Studio, "accent" | "accentDark" | "font"> | null): string | null {
  const vars = Object.entries(brandVars(studio));
  // Doubled so it outweighs `tokens.css`'s own `:root` wherever the sheets land in the cascade.
  return vars.length === 0 ? null : `:root:root { ${vars.map(([name, value]) => `${name}: ${value};`).join(" ")} }`;
}

/** The rule on the page: a sheet of its own (no inline style, no style element) where the browser builds one. */
function putCss(css: string): () => void {
  const doc = document as Document & { adoptedStyleSheets?: CSSStyleSheet[] };
  try {
    if (Array.isArray(doc.adoptedStyleSheets) && typeof CSSStyleSheet === "function" && "replaceSync" in CSSStyleSheet.prototype) {
      const sheet = new CSSStyleSheet();
      sheet.replaceSync(css);
      doc.adoptedStyleSheets = [...doc.adoptedStyleSheets, sheet];
      return () => {
        doc.adoptedStyleSheets = (doc.adoptedStyleSheets ?? []).filter((s) => s !== sheet);
      };
    }
  } catch {
    // an older browser: the element below
  }
  const el = document.createElement("style");
  el.dataset["shopBrand"] = "";
  el.textContent = css;
  document.head.append(el);
  return () => el.remove();
}

/**
 * Put the studio's look on the page: its colours and typeface on the root,
 * and, when the shop has the tab to itself, its name as the tab's title and
 * its logo as the tab's icon. Gives back what puts the page as it was (the
 * demo draws the studio's own screens in the same page after the shop).
 */
export function applyBrand(studio: Studio | null, options: { tab: boolean }): () => void {
  if (typeof document === "undefined") return () => {};
  const css = brandCss(studio);
  const takeCss = css === null ? () => {} : putCss(css);

  const title = document.title;
  const icon = document.querySelector<HTMLLinkElement>('link[rel~="icon"]');
  const iconWas = icon === null ? null : { href: icon.getAttribute("href"), type: icon.getAttribute("type") };
  let added: HTMLLinkElement | null = null;
  if (options.tab && studio !== null) {
    if (studio.name.trim() !== "") document.title = studio.name;
    const logo = studio.logo ?? null;
    if (logo !== null) {
      if (icon === null) {
        added = document.createElement("link");
        added.rel = "icon";
        added.href = logo;
        document.head.append(added);
      } else {
        icon.href = logo;
        // Not the shipped SVG any more: the browser reads the picture's own type.
        icon.removeAttribute("type");
      }
    }
  }

  return () => {
    takeCss();
    if (!options.tab) return;
    document.title = title;
    added?.remove();
    if (icon !== null && iconWas !== null) {
      if (iconWas.href === null) icon.removeAttribute("href");
      else icon.setAttribute("href", iconWas.href);
      if (iconWas.type !== null) icon.setAttribute("type", iconWas.type);
    }
  };
}
