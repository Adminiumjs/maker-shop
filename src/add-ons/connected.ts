/**
 * THE ADD-ONS ADMINIUM HAS FOR THIS STUDIO, LOADED FROM ADMINIUM.
 *
 * On a real install the studio is served by Adminium (`build:surface:staff`)
 * and DHL Shipping's client half is too: this file asks Adminium which
 * add-ons are attached to Maker Shop and switched on, fetches each one's
 * client bundle from Adminium, checks its bytes, imports it and registers
 * it. Its dispatch flow then books with the carrier through the add-on's
 * SERVER half, where the account's credentials are. `registry.ts` is the
 * other source: the vendored client half the DEMO build compiles in, which
 * answers from its demo carrier in the page. The seam (`host.ts`'s
 * `createRegistry`) is the same for both; only where the add-ons come from
 * differs.
 *
 * ── THIS FILE SENDS, AND IT IS DECLARED ─────────────────────────────────────
 *
 * `sources.test.ts` bans naming `fetch` and an `import()` of anything but a
 * relative literal. Both bans are right, and both are lifted for this file
 * alone, by name, there: it asks the Adminium that served the page (the same
 * origin, the session's cookie riding along) and nothing else, and it imports
 * a bundle only from a URL on that origin under the add-on bundle path
 * (`bundleUrlIsSafe`). `connected.test.ts` drives the refusals, including the
 * URLs that look same-origin and are not.
 *
 * ── WHAT THE INTEGRITY CHECK IS WORTH ──────────────────────────────────────
 *
 * Each bundle arrives with a `sha256-…` the server recorded when it unpacked
 * the package. This fetches the bytes, hashes them and refuses a mismatch, then
 * imports the same URL (the HTTP cache makes the second read the first's bytes).
 * That proves the bytes match the reply that described them; it proves nothing
 * about a compromised server, which would describe its own bytes correctly.
 * The control against a bad package is the server's, at unpack and on every
 * read. It is not SRI: a dynamic `import()` cannot be held to an `integrity`.
 *
 * ── REACT FIRST ────────────────────────────────────────────────────────────
 *
 * A built add-on bundle imports no `react`: it reads the host's React from a
 * well-known global, when its module initialises. So `installAddOnRuntime`
 * runs before the first `import()`, once; two Reacts on one page would argue
 * over one DOM tree.
 *
 * ── THE KEY IS THE ONE THE SERVER NAMED ────────────────────────────────────
 *
 * The key an add-on registers under selects its settings and which fills are
 * attributed to it, so a bundle served as one add-on that registers as another
 * is dropped with a problem rather than registered.
 */
import * as React from "react";
import * as JsxRuntime from "react/jsx-runtime";

import type { AddOn } from "./host.ts";
import { installAddOnRuntime } from "./vendor/host/runtime/index.ts";

/** One add-on's client bundle, as `GET /api/v1/add-ons` describes it. */
export interface ConnectedBundle {
  path: string;
  url: string;
  integrity: string;
}

/** One installed add-on, as the server describes it. Narrowed to what is read. */
export interface ConnectedAddOnDto {
  key: string;
  name: string;
  version: string;
  attachments: readonly { attachedTo: string; enabled: boolean }[];
  bundles: readonly ConnectedBundle[];
}

/** Why one add-on did not make it. A list, not a throw: one broken add-on leaves its slot empty, never the studio. */
export interface ConnectedProblem {
  key: string;
  code: "LIST_UNAVAILABLE" | "NO_BUNDLE" | "UNSAFE_URL" | "BUNDLE_UNAVAILABLE" | "INTEGRITY_MISMATCH" | "NO_REGISTER" | "KEY_MISMATCH" | "NO_DISCLAIMER" | "MALFORMED";
  detail: string;
}

export interface ConnectedLoad {
  addOns: AddOn[];
  problems: ConnectedProblem[];
}

/** The path a bundle URL must sit under: a fence this file checks, never a route it builds. */
const BUNDLE_PREFIX = "/api/v1/add-ons/";

/** Where the list lives, relative to the origin serving this page. */
const LIST_PATH = "/api/v1/add-ons";

/**
 * Whether this is a URL this studio will import a script from: on the page's
 * own origin and under the bundle path, both compared on the RESOLVED URL, so
 * `//evil.test/…`, `/api/v1/add-ons/../../evil.js` and `https://own.test@evil.test/…`
 * are refused as well as a plain other origin.
 */
export function bundleUrlIsSafe(raw: string, pageOrigin: string): boolean {
  let url: URL;
  try {
    url = new URL(raw, pageOrigin);
  } catch {
    return false;
  }
  if (url.origin !== new URL(pageOrigin).origin) return false;
  return url.pathname.startsWith(BUNDLE_PREFIX);
}

/**
 * Whether an entry is the shape this file reads. The reply is untrusted for its
 * shape too: Adminium and this app are versioned apart, and one entry this
 * cannot read must not stop the others loading.
 */
function isConnectedDto(value: unknown): value is ConnectedAddOnDto {
  if (typeof value !== "object" || value === null) return false;
  const dto = value as Record<string, unknown>;
  if (typeof dto["key"] !== "string" || dto["key"] === "") return false;
  if (!Array.isArray(dto["attachments"])) return false;
  if (!Array.isArray(dto["bundles"])) return false;
  for (const a of dto["attachments"] as unknown[]) {
    if (typeof a !== "object" || a === null) return false;
    if (typeof (a as Record<string, unknown>)["attachedTo"] !== "string") return false;
  }
  for (const b of dto["bundles"] as unknown[]) {
    if (typeof b !== "object" || b === null) return false;
    const bundle = b as Record<string, unknown>;
    if (typeof bundle["url"] !== "string" || typeof bundle["integrity"] !== "string" || typeof bundle["path"] !== "string") return false;
  }
  return true;
}

/**
 * Whether an add-on that names a company carries its not-affiliated line
 * (`addon.<key>.notAffiliated`) in every language its messages have: a studio
 * read in Arabic with the line only in English would carry the company's name
 * undisclaimed for its actual readers. Defensive about the values, since they
 * come from a downloaded bundle.
 */
function hasDisclaimer(addOn: AddOn): boolean {
  const messages: unknown = addOn.messages;
  if (typeof messages !== "object" || messages === null) return false;
  const bundles = Object.values(messages as Record<string, unknown>);
  if (bundles.length === 0) return false;
  return bundles.every((bundle) => {
    if (typeof bundle !== "object" || bundle === null) return false;
    return Object.entries(bundle as Record<string, unknown>).some(([key, value]) => key.endsWith(".notAffiliated") && typeof value === "string" && value.trim() !== "");
  });
}

/** `sha256-<base64>` over these bytes, in the spelling the server sends. */
async function sha256Integrity(bytes: ArrayBuffer): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  let binary = "";
  for (const byte of new Uint8Array(digest)) binary += String.fromCharCode(byte);
  return `sha256-${btoa(binary)}`;
}

const sameIntegrity = (a: string, b: string): boolean => a === b && a.startsWith("sha256-");

export interface ConnectedOptions {
  /** This app's manifest key: only the add-ons attached to it, and on there, are loaded. */
  appKey: string;
  /** The origin serving this page. Injected so a suite can drive the fence. */
  origin: string;
  /** Injected for the suite; the default is why this file is declared in `sources.test.ts`. */
  request?: typeof fetch;
  /** Injected for the suite. Same. */
  importBundle?: (url: string) => Promise<unknown>;
}

interface BundleModule {
  register?: unknown;
}

/**
 * The list, the bundles of what is attached here and on, registered. NEVER
 * THROWS: every failure is a problem, the list being unreachable included, and
 * the studio's slots stay empty for what did not load.
 */
export async function loadConnectedAddOns(options: ConnectedOptions): Promise<ConnectedLoad> {
  const { appKey, origin } = options;
  const request = options.request ?? globalThis.fetch.bind(globalThis);
  const importBundle = options.importBundle ?? ((url: string): Promise<unknown> => import(/* @vite-ignore */ url));

  // Before any import (see the header). Idempotent.
  installAddOnRuntime({
    react: React as unknown as Readonly<Record<string, unknown>>,
    jsx: {
      jsx: (JsxRuntime as unknown as { jsx: unknown }).jsx,
      jsxs: (JsxRuntime as unknown as { jsxs: unknown }).jsxs,
      Fragment: (JsxRuntime as unknown as { Fragment: unknown }).Fragment,
    },
  });

  const problems: ConnectedProblem[] = [];
  let listed: readonly unknown[];
  try {
    // Same origin: the signed-in person's session cookie rides along, which is what the add-on routes ask.
    const res = await request(new URL(LIST_PATH, origin).toString(), { credentials: "same-origin", headers: { accept: "application/json" } });
    if (!res.ok) {
      problems.push({ key: "*", code: "LIST_UNAVAILABLE", detail: `GET ${LIST_PATH} answered ${String(res.status)}` });
      return { addOns: [], problems };
    }
    const body = (await res.json()) as { addOns?: unknown };
    listed = Array.isArray(body.addOns) ? (body.addOns as readonly unknown[]) : [];
  } catch (cause) {
    problems.push({ key: "*", code: "LIST_UNAVAILABLE", detail: cause instanceof Error ? cause.message : String(cause) });
    return { addOns: [], problems };
  }

  const wellFormed: ConnectedAddOnDto[] = [];
  for (const entry of listed) {
    if (isConnectedDto(entry)) {
      wellFormed.push(entry);
      continue;
    }
    const key = typeof (entry as { key?: unknown } | null)?.key === "string" ? String((entry as { key: string }).key) : "?";
    problems.push({ key, code: "MALFORMED", detail: "the server described this add-on in a shape this build does not read" });
  }

  // Attached to THIS app and switched on here: an add-on of another app, or one off here, is not this studio's.
  const mine = wellFormed.filter((dto) => dto.attachments.some((a) => a.attachedTo === appKey && a.enabled === true));

  const addOns: AddOn[] = [];
  for (const dto of mine) {
    const bundle = dto.bundles[0];
    // A data pack fills no slot and ships no client half: nothing to mount, and no failure.
    if (bundle === undefined) continue;
    if (!bundleUrlIsSafe(bundle.url, origin)) {
      problems.push({ key: dto.key, code: "UNSAFE_URL", detail: bundle.url });
      continue;
    }
    const absolute = new URL(bundle.url, origin).toString();
    let bytes: ArrayBuffer;
    try {
      const res = await request(absolute, { credentials: "same-origin" });
      if (!res.ok) {
        problems.push({ key: dto.key, code: "BUNDLE_UNAVAILABLE", detail: `${bundle.path} answered ${String(res.status)}` });
        continue;
      }
      bytes = await res.arrayBuffer();
    } catch (cause) {
      problems.push({ key: dto.key, code: "BUNDLE_UNAVAILABLE", detail: cause instanceof Error ? cause.message : String(cause) });
      continue;
    }
    const seen = await sha256Integrity(bytes);
    if (!sameIntegrity(seen, bundle.integrity)) {
      problems.push({ key: dto.key, code: "INTEGRITY_MISMATCH", detail: `${bundle.path}: expected ${bundle.integrity}, got ${seen}` });
      continue;
    }
    let module: BundleModule;
    try {
      module = (await importBundle(absolute)) as BundleModule;
    } catch (cause) {
      problems.push({ key: dto.key, code: "NO_REGISTER", detail: cause instanceof Error ? cause.message : String(cause) });
      continue;
    }
    if (typeof module.register !== "function") {
      problems.push({ key: dto.key, code: "NO_REGISTER", detail: `${bundle.path} exports no register()` });
      continue;
    }
    // Every read of what register() returns is in here: it is a downloaded bundle's object, typed only by a cast.
    let addOn: AddOn;
    let refusal: ConnectedProblem | null = null;
    try {
      addOn = (module.register as () => AddOn)();
      if (typeof addOn !== "object" || addOn === null || typeof addOn.key !== "string") throw new Error("register() returned something that is not an add-on");
      if (addOn.key !== dto.key) refusal = { key: dto.key, code: "KEY_MISMATCH", detail: `served as "${dto.key}", registered as "${String(addOn.key)}"` };
      else if (addOn.namesCompany === true && !hasDisclaimer(addOn)) refusal = { key: dto.key, code: "NO_DISCLAIMER", detail: "declares namesCompany and ships no notAffiliated line" };
    } catch (cause) {
      problems.push({ key: dto.key, code: "NO_REGISTER", detail: cause instanceof Error ? cause.message : String(cause) });
      continue;
    }
    if (refusal !== null) {
      problems.push(refusal);
      continue;
    }
    addOns.push(addOn);
  }
  return { addOns, problems };
}
