/**
 * The shop's address bar: which path shows which screen, both ways.
 *
 * Paths are relative to where the shop is served (`/apps/maker/customer/`
 * hosted, `/` on its own domain or standalone), so the same bundle reads
 * the same paths wherever it is placed. A piece's page carries its code
 * (`piece/coast-wal`), and its Customise screen one more step
 * (`piece/coast-wal/customise`).
 */
import type { ShopView } from "./store.ts";

/** The screens other parts of the shop draw, by their path, with the manifest's route keys. */
export const ELSEWHERE = {
  order: "order",
  find: "find",
  ask: "ask",
  problem: "something-wrong",
  postage: "postage",
  care: "care",
  about: "about",
  design: "design",
  search: "search",
} as const;
export type Elsewhere = keyof typeof ELSEWHERE;

export interface Place {
  view: ShopView | Elsewhere;
  code: string | null;
}

/** The part of a page's path the shop reads: what follows its own mount. */
export function relativePath(pathname: string, base: string): string {
  const clean = (base.endsWith("/") ? base : `${base}/`).replace(/^\/*/, "/");
  if (pathname.startsWith(clean)) return pathname.slice(clean.length);
  // Mounted for one of several databases, a name before the side: `/apps/maker/<name>/customer/…`.
  const side = /^\/apps\/[^/]+\/(?:[^/]+\/)?customer\/(.*)$/.exec(pathname);
  if (side !== null) return side[1] ?? "";
  return pathname.replace(/^\/+/, "");
}

export function placeOf(relative: string): Place {
  const parts = relative.split("/").filter((p) => p !== "").map((p) => decodeURIComponent(p));
  if (parts.length === 0) return { view: "shop", code: null };
  const [first, code, more] = parts;
  if (first === "piece" && code !== undefined) {
    if (more === undefined) return { view: "product", code };
    if (more === "customise" && parts.length === 3) return { view: "customise", code };
  }
  if (parts.length === 1) {
    if (first === "basket") return { view: "basket", code: null };
    if (first === "checkout") return { view: "checkout", code: null };
    const elsewhere = (Object.entries(ELSEWHERE) as [Elsewhere, string][]).find(([, path]) => path === first);
    if (elsewhere !== undefined) return { view: elsewhere[0], code: null };
  }
  return { view: "missing", code: null };
}

export function pathOf(place: Place): string {
  switch (place.view) {
    case "shop":
      return "";
    case "product":
      return `piece/${encodeURIComponent(place.code ?? "")}`;
    case "customise":
      return `piece/${encodeURIComponent(place.code ?? "")}/customise`;
    case "basket":
      return "basket";
    // The confirmation is the checkout's last step, at its address.
    case "checkout":
    case "confirm":
      return "checkout";
    case "missing":
      return "";
    default:
      return ELSEWHERE[place.view];
  }
}

/** The mount the shop is served at: Vite's base, as built. */
export function mountBase(): string {
  return import.meta.env.BASE_URL ?? "/";
}

/** The page's mount as the address bar shows it (a mount for one database keeps its name). */
function liveBase(pathname: string, base: string): string {
  const clean = base.endsWith("/") ? base : `${base}/`;
  if (pathname.startsWith(clean)) return clean;
  const side = /^(\/apps\/[^/]+\/(?:[^/]+\/)?customer\/)/.exec(pathname);
  return side?.[1] ?? clean;
}

/**
 * Keep the address and the screen together: a move writes the path, the
 * back button reads it. `go` opens the screen a path names.
 */
export function attachShopUrl(go: (place: Place) => void): { push: (place: Place) => void; current: () => Place; detach: () => void } {
  const base = () => liveBase(window.location.pathname, mountBase());
  const current = () => placeOf(relativePath(window.location.pathname, mountBase()));
  const onPop = () => go(current());
  window.addEventListener("popstate", onPop);
  return {
    current,
    push(place) {
      const path = `${base()}${pathOf(place)}`;
      if (path === window.location.pathname) return;
      window.history.pushState(window.history.state, "", path);
    },
    detach: () => window.removeEventListener("popstate", onPop),
  };
}
