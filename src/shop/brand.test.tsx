// @vitest-environment jsdom
/**
 * THE STUDIO'S OWN LOOK, FROM ITS SETTINGS ROW.
 *
 * An owner reskins the shop on the dashboard: a logo, a tagline, an accent
 * colour (and its dark-theme pair), a typeface. Held here: what the settings
 * row becomes in the catalogue; that any accent typed comes out AA in both
 * themes, and a colour that already reads is kept; that nothing typed but a
 * colour reaches the page's CSS; that the header shows the logo and the
 * tagline, falling back to the tree and the shipped line; and that the tab
 * takes the studio's name and logo, and is given back as it was.
 */
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { I18nProvider } from "../i18n/index.tsx";
import { AA, accentPair, applyBrand, brandCss, contrast, FONTS, parseHex } from "./brand.ts";
import { catalogueFrom } from "./door.ts";
import type { Studio } from "./port.ts";
import ShopApp from "./ShopApp.tsx";
import { resetShop } from "./store.ts";
import { fakePort, sampleCatalogue } from "./testing.ts";

vi.mock("../../vendor/customiser/index.js", () => ({
  CustomiserEditor: () => null,
  designRefusal: () => null,
  heldDesign: () => null,
  hasSavedDesigns: (held: readonly unknown[]) => held.length > 0,
  openSavedLink: async () => "unknown",
  readDesigns: async () => [],
  YourDesigns: () => null,
}));
vi.mock("../../vendor/customiser/editor.css", () => ({}));

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const LIGHT_BACKDROPS = ["#ffffff", "#f6f6f8", "#fafafa", "#f1f1f4"];
const DARK_BACKDROPS = ["#0f0f14", "#0a0a0d", "#141419", "#1a1a20", "#24242c"];

describe("a colour as an owner types it", () => {
  it("reads #rgb, #rrggbb and either without the hash; nothing else", () => {
    expect(parseHex("#1F6F5C")).toBe("#1f6f5c");
    expect(parseHex(" 1f6f5c ")).toBe("#1f6f5c");
    expect(parseHex("#abc")).toBe("#aabbcc");
    for (const bad of ["", "red", "#12345", "#1234567", "rgb(1,2,3)", "#ggg", null, undefined]) expect(parseHex(bad)).toBeNull();
  });
});

describe("the accent pair", () => {
  it("keeps the shop's own walnut pair as it is, which already reads", () => {
    expect(accentPair("#78350f", "#e0b08a")).toEqual({ light: "#78350f", dark: "#e0b08a" });
  });

  it("is no pair without a colour, so the shop keeps walnut", () => {
    expect(accentPair(null)).toBeNull();
    expect(accentPair("blue", "#e0b08a")).toBeNull();
  });

  // Pale, loud, mid and dark colours, each as the light accent and as the dark one.
  const COLOURS = ["#ffffff", "#ffeb3b", "#00ff00", "#1f6f5c", "#e91e63", "#3f51b5", "#808080", "#000000", "#0a0a0d", "#ff8800", "#00bcd4"];

  it.each(COLOURS)("comes out AA in both themes from %s", (typed) => {
    for (const pair of [accentPair(typed)!, accentPair("#1f6f5c", typed)!]) {
      for (const b of LIGHT_BACKDROPS) expect(contrast(pair.light, b), `light ${pair.light} on ${b}`).toBeGreaterThanOrEqual(AA);
      for (const b of DARK_BACKDROPS) expect(contrast(pair.dark, b), `dark ${pair.dark} on ${b}`).toBeGreaterThanOrEqual(AA);
    }
  });

  it("works the dark one out from the light one when none is entered, keeping its hue", () => {
    const pair = accentPair("#1f6f5c")!;
    expect(pair.light).toBe("#1f6f5c");
    expect(pair.dark).not.toBe(pair.light);
    const [r, g, b] = [1, 3, 5].map((i) => parseInt(pair.dark.slice(i, i + 2), 16));
    // Still a green: its green the strongest of the three.
    expect(g!).toBeGreaterThan(r!);
    expect(g!).toBeGreaterThan(b!);
  });
});

describe("the CSS the look puts on the page", () => {
  it("is nothing when the studio keeps the shop's look", () => {
    expect(brandCss(null)).toBeNull();
    expect(brandCss({ accent: null, accentDark: null, font: null })).toBeNull();
    expect(brandCss({ accent: null, font: "manrope" })).toBeNull();
  });

  it("sets the accent pair and the typeface, and only those", () => {
    const css = brandCss({ accent: "#1f6f5c", accentDark: "#7fd1b9", font: "serif" })!;
    expect(css).toMatch(/^:root:root \{ --accent-light: #[0-9a-f]{6}; --accent-dark: #[0-9a-f]{6}; --font-sans: [^;{}]+; \}$/);
    expect(css).toContain(FONTS["serif"]!);
  });

  it("never carries what was typed when it is no colour or no typeface of the list", () => {
    expect(brandCss({ accent: "red; } body { display: none", accentDark: "#fff", font: "Comic Sans; } *{" })).toBeNull();
  });
});

describe("the settings row in the catalogue", () => {
  const rows = (settings: Record<string, unknown>) => ({ products: [], options: [], materials: [], services: [], settings: [settings] as never[] });

  it("carries the logo's address, the tagline, the accent pair and the typeface", () => {
    const studio = catalogueFrom(rows({ id: 1, studio_name: "Fernlight", logo: "f1", tagline: "  Small batch, big heart ", accent: "#1F6F5C", accent_dark: "", font: "rounded" }), () => null, (row) => `https://x.test/p/${String(row["logo"])}`).studio;
    expect(studio).toMatchObject({ name: "Fernlight", logo: "https://x.test/p/f1", tagline: "Small batch, big heart", accent: "#1F6F5C", accentDark: null, font: "rounded" });
  });

  it("leaves each empty as null, so the shop keeps its own", () => {
    const studio = catalogueFrom(rows({ id: 1, studio_name: "Birch Row", tagline: " " }), () => null).studio;
    expect(studio).toMatchObject({ logo: null, tagline: null, accent: null, accentDark: null, font: null });
  });
});

describe("the tab", () => {
  const studio = (more: Partial<Studio> = {}): Studio => ({ name: "Fernlight", address: null, about: null, takingOrders: true, ...more });

  beforeEach(() => {
    document.head.innerHTML = '<link rel="icon" type="image/svg+xml" href="/favicon.svg" />';
    document.title = "Maker Shop";
  });

  it("takes the studio's name and logo, and is given back as it was", () => {
    const undo = applyBrand(studio({ logo: "https://x.test/logo.png" }), { tab: true });
    const icon = document.querySelector<HTMLLinkElement>('link[rel~="icon"]')!;
    expect(document.title).toBe("Fernlight");
    expect(icon.getAttribute("href")).toBe("https://x.test/logo.png");
    expect(icon.hasAttribute("type")).toBe(false);
    undo();
    expect(document.title).toBe("Maker Shop");
    expect(icon.getAttribute("href")).toBe("/favicon.svg");
    expect(icon.getAttribute("type")).toBe("image/svg+xml");
  });

  it("keeps the shipped icon with no logo, and the page's title in the demo", () => {
    applyBrand(studio(), { tab: true })();
    const undo = applyBrand(studio({ logo: "https://x.test/logo.png" }), { tab: false });
    expect(document.title).toBe("Maker Shop");
    expect(document.querySelector('link[rel~="icon"]')!.getAttribute("href")).toBe("/favicon.svg");
    undo();
  });

  it("puts the colours on the page and takes them away again", () => {
    const sheets = () => [...((document as Document & { adoptedStyleSheets?: CSSStyleSheet[] }).adoptedStyleSheets ?? [])].length + document.querySelectorAll("style[data-shop-brand]").length;
    const before = sheets();
    const undo = applyBrand(studio({ accent: "#1f6f5c" }), { tab: true });
    expect(sheets()).toBe(before + 1);
    undo();
    expect(sheets()).toBe(before);
    applyBrand(studio(), { tab: true })();
    expect(sheets()).toBe(before);
  });
});

describe("the header", () => {
  let root: Root | null = null;

  async function mount(studio: Partial<Studio>): Promise<HTMLElement> {
    const catalogue = sampleCatalogue();
    catalogue.studio = { ...catalogue.studio, ...studio };
    resetShop(fakePort(catalogue));
    localStorage.setItem("maker-shop-locale", "en-US");
    const host = document.createElement("div");
    document.body.append(host);
    root = createRoot(host);
    await act(async () => {
      root!.render(
        <I18nProvider>
          <ShopApp />
        </I18nProvider>,
      );
    });
    for (let i = 0; i < 4; i++) await act(async () => new Promise((r) => setTimeout(r, 0)));
    return host.querySelector<HTMLElement>(".sh-brand")!;
  }

  beforeEach(() => {
    window.scrollTo = () => {};
  });

  afterEach(() => {
    act(() => root?.unmount());
    root = null;
    document.body.innerHTML = "";
    localStorage.clear();
  });

  it("shows the tree and the shipped line while the studio has its own of neither", async () => {
    const brand = await mount({});
    expect(brand.querySelector("img")).toBeNull();
    expect(brand.querySelector(".sh-brand-mark svg")).not.toBeNull();
    expect(brand.querySelector(".sh-brand-name")!.textContent).toBe("Birch Row");
    expect(brand.querySelector(".sh-brand-tag")!.textContent).toBe("MADE TO ORDER · TUE–SAT");
  });

  it("shows the studio's logo in the tree's place and its own tagline", async () => {
    const brand = await mount({ name: "Fernlight", logo: "https://x.test/logo.png", tagline: "Small batch, big heart" });
    const logo = brand.querySelector("img")!;
    expect(logo.getAttribute("src")).toBe("https://x.test/logo.png");
    // The name beside it says who it is.
    expect(logo.getAttribute("alt")).toBe("");
    expect(brand.querySelector(".sh-brand-mark")).toBeNull();
    expect(brand.querySelector(".sh-brand-name")!.textContent).toBe("Fernlight");
    expect(brand.querySelector(".sh-brand-tag")!.textContent).toBe("Small batch, big heart");
    expect(document.title).toBe("Fernlight");
  });
});
