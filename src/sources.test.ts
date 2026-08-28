/**
 * Assertions about the SOURCE ITSELF, which no unit test can make.
 *
 * Each of these is a property of the tree rather than of any function's return
 * value, and each is the kind of thing a well-meaning edit reintroduces:
 *
 *   - THE CLOCK IS ALWAYS PASSED IN. No engine, screen or store may read
 *     `Date.now()`, `new Date()` with no argument, or `Math.random()`. A demo
 *     whose dates move on their own cannot be asserted or reproduced.
 *   - THERE IS NO FINISHED-GOODS STOCK (24 acceptance criterion 14, which asks
 *     for this to be "verifiable by grep"). Three rules about meaning, spelt in
 *     all eight languages, over every file that renders — see the block itself
 *     for what the seven-English-regex version of it let through.
 *   - NO VIEW COUNTS PLAIN WEEKDAYS (criterion 13). The bench runs Tuesday to
 *     Saturday and `lib/calendar.ts` is the only module allowed to know what
 *     that means; a screen asks for a named day and never computes one.
 *   - THE TEST LEXICON NEVER SHIPS. `testing/lexicon.ts` spells every banned
 *     word, so a bundle that imported it would fail the very grep it defines.
 *   - CSS LOGICAL PROPERTIES ONLY, because Arabic renders RTL with no RTL
 *     stylesheet and one `margin-left` is all it takes.
 */

import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

import { LOCALE_TAGS } from "./i18n/locales.ts";
import { IMPURITIES, impuritiesIn, restatementsIn } from "./testing/purity.ts";
import {
  connectedBackend,
  foreignImportsIn,
  foreignModulesIn,
  offendingAddresses,
  sendersIn,
  withoutComments,
  type AllowedModule,
  type InertOrigin,
} from "./testing/egress.ts";
import { MESSAGES } from "./i18n/messages/index.ts";
import {
  RAW_CONTROL_EXPLANATION,
  rawControlOffences,
  rawControlsIn,
} from "./testing/encoding.ts";

const SRC = fileURLToPath(new URL(".", import.meta.url));

function walk(dir: string): string[] {
  const out: string[] = [];
  for (const entry of readdirSync(dir)) {
    const path = join(dir, entry);
    if (statSync(path).isDirectory()) out.push(...walk(path));
    else if (/\.(ts|tsx|css)$/.test(entry)) out.push(path);
  }
  return out;
}

const ALL = walk(SRC).map((path) => {
  const text = readFileSync(path, "utf8");
  return {
    path,
    rel: path.slice(SRC.length),
    text,
    /**
     * The same file with its comments removed.
     *
     * Load-bearing rather than tidy: this repo's engines document the rule in
     * the words `no Date.now()`, and a check that read the comments would
     * report every file that promises to obey it as a file that breaks it.
     */
    code: withoutComments(text),
  };
});

/** Everything that actually ships — no suites, no fixtures. */
const SHIPPED = ALL.filter((f) => !/\.test\.tsx?$/.test(f.rel) && !f.rel.startsWith("testing/"));

/**
 * ── EVERY SOURCE FILE IS TEXT, OR THE TOOLS STOP READING IT ─────────────────
 *
 * [Added 2026-08-12, with the three files it found.]
 *
 * The rule and the argument for it are in `testing/encoding.ts`, which is the
 * add-on monorepo's `testing/encoding.ts` byte for byte — the same arrangement
 * `testing/purity.ts` and `testing/egress.ts` are under, and for the reason
 * those two give at length: a scanner kept one-per-repo is not one rule, it is
 * N rules that agree until the day one of them is repaired.
 *
 * What is decided HERE is only which files it is pointed at: everything this
 * suite already walks — `.ts`, `.tsx` and `.css` under `src/`, the vendored
 * add-ons included, which is where a re-sync would bring a raw byte back in.
 */
describe("every source file is text a tool will read", () => {
  it("writes control characters as escapes, never as raw bytes", () => {
    const offenders = ALL.flatMap(({ rel, text }) => rawControlOffences(rel, text));
    expect(offenders, `\n${RAW_CONTROL_EXPLANATION}\n${offenders.join("\n")}\n`).toEqual([]);
  });

  it("would report one, which is what makes the absence worth reading", () => {
    // Driven over the scanner rather than over `src/`, so this stays true on a
    // day every file is clean — which is every day until somebody pastes one.
    const planted = `const k = \`a${String.fromCharCode(0)}b\`;\nconst j = "x${String.fromCharCode(1)}y";`;
    expect(rawControlsIn(planted).map((hit) => hit.label)).toEqual(["U+0000", "U+0001"]);
    expect(rawControlsIn(planted).map((hit) => hit.line)).toEqual([1, 2]);
    // And the escaped spelling of the same two strings is not a finding.
    expect(rawControlsIn(String.raw`const k = "a\x00b", j = "x\x01y";`)).toEqual([]);
    // Tabs and newlines are text, not findings.
    expect(rawControlsIn("a\tb\r\nc")).toEqual([]);
  });
});

describe("the clock is always passed in", () => {
  /*
   * THE RULE IS `testing/purity.ts` NOW — one file, byte for byte in this repo,
   * the maker studio and the add-ons monorepo, with the mirror guard there
   * failing on any difference. There were three separate regular expressions
   * before, they had drifted, and the drift was invisible: this app never
   * checked `crypto.randomUUID` and the studio checked neither that nor
   * `performance.now`, so appending
   *
   *     export const zzSeed = { at: performance.now(), id: crypto.randomUUID() };
   *
   * to a shipped module left both suites green.
   */
  it("reads no real clock and no random number anywhere that ships", () => {
    // `new Date(Date.UTC(...))` and `new Date(ms)` stay fine — they are pure
    // arithmetic over a value that came from somewhere the caller controls.
    const hits = SHIPPED.flatMap((f) =>
      impuritiesIn(f.code)
        .filter((means) => !(f.rel === CONNECTED_SOURCE && CLOCKS.includes(means)))
        .map((means) => `${f.rel} → ${means}`),
    );
    expect(hits).toEqual([]);
  });

  it("still refuses a die in the connected source, and a clock anywhere else", () => {
    // The exemption above is two MEANS in one FILE, not a file that may do as
    // it likes. Driven over the rule rather than over `src/`, so it stays true
    // on a day this studio has no connected source at all.
    expect(impuritiesIn("const id = crypto.randomUUID();").filter((m) => !CLOCKS.includes(m)))
      .toHaveLength(1);
    // …and every name in the allow-list is a means `purity.ts` actually emits,
    // so renaming one there fails here instead of quietly widening the net.
    const known = IMPURITIES.map((impurity) => impurity.means);
    expect(CLOCKS.filter((means) => !known.includes(means))).toEqual([]);
  });

  it("would say so if one arrived, in every spelling the three repos disagreed on", () => {
    // The mutant that proved the drift, driven through the shared rule rather
    // than through a restatement of it.
    expect(
      impuritiesIn("export const zzSeed = { at: performance.now(), id: crypto.randomUUID() };")
        .length,
    ).toBe(2);
    expect(impuritiesIn("const t = Date.now();").length).toBe(1);
    expect(impuritiesIn("const d = new Date();").length).toBe(1);
    expect(impuritiesIn("const r = Math.random();").length).toBe(1);
    expect(impuritiesIn("crypto.getRandomValues(new Uint8Array(8))").length).toBe(1);
    // …and pure arithmetic over a value passed in stays quiet.
    expect(impuritiesIn("const d = new Date(Date.UTC(2026, 7, 5));")).toEqual([]);
    expect(impuritiesIn("const d = new Date(iso);")).toEqual([]);
    expect(impuritiesIn("const at = clock.now();")).toEqual([]);
  });

  /**
   * AND NOBODY HERE MAY STATE THE RULE A SECOND TIME.
   *
   * The byte-for-byte mirror guard in the add-ons repo can only see a copy of
   * `testing/purity.ts` that DIFFERS. It is blind to the commoner shape, which
   * is a file that never imported it and is running its own regex beside it —
   * and that is precisely what all four add-on packages were doing while every
   * suite in this wave was green. This repo is where that would show up as an
   * app shipping a die, so the check runs here too rather than only in the
   * monorepo, which a published clone of this app does not have beside it.
   *
   * `testing/purity.ts` is excluded because it IS the rule and has to spell
   * every pattern out. Nothing else may.
   */
  it("states that rule in exactly one file, and this is not it", () => {
    const offenders = ALL.filter((f) => f.rel !== join("testing", "purity.ts")).flatMap((f) =>
      restatementsIn(f.code).map((means) => `${f.rel} → ${means}`),
    );
    expect(
      offenders,
      "a pattern of its own beside the shared rule is two rules, and only one of them gets " +
        "repaired next time — see testing/purity.ts",
    ).toEqual([]);
  });
});

/**
 * THE ADDRESSES THIS BUNDLE IS ALLOWED TO NAME, AND WHY EACH IS INERT.
 *
 * Anything not declared is reported. The comparison is on the ORIGIN and it is
 * exact, so a host that merely starts with an allowed one inherits nothing.
 */
/**
 * ── AN ADDRESS AN ADD-ON NAMES IS THE ADD-ON'S FACT, NOT THIS APP'S ─────────
 *
 * What stood here was a list of origins this app allows, and two of the entries
 * were Canva's — declared by an app that merely RECEIVES the add-on that names
 * them. That is AC20/D21 broken in both directions, and it was demonstrated in
 * both: vendoring the personalizer into this app unchanged, registration only,
 * turned this suite red on
 * `add-ons/vendor/personalizer/template.ts → http://www.w3.org/2000/svg`, and
 * vendoring Canva Import into the studio turned ITS suite red the same way.
 * Making a portable add-on pass required an edit to an exemption list inside
 * the host — the exact thing a closed slot registry exists to make unnecessary.
 *
 * This is the FOURTH host-local list found holding an add-on's fact, after
 * `HOSTED_SLOTS`, the Czech "pro" carve-out and the ar-EG numeral allowances.
 * Round 5 built the mechanism for the third; this is that mechanism, applied.
 * Every add-on exports `INERT_ORIGINS` from its own `add-on-facts.ts`, the
 * sync vendors it, and `addOnOrigins()` reads whatever THIS app has vendored.
 * Vendor an add-on and its declarations arrive; drop it and they leave; nothing
 * in this file changes either way.
 *
 * `import.meta.glob` is resolved by the bundler, so by the time this runs it is
 * a static list of modules — no filesystem read, no dynamic import.
 */
const VENDORED_ORIGINS = import.meta.glob<{
  INERT_ORIGINS?: readonly { origin: string; why: string }[];
  NEVER_IN_A_BROWSER?: readonly { text: string; why: string }[];
}>("./add-ons/vendor/*/add-on-facts.ts", { eager: true });

function addOnOrigins(): InertOrigin[] {
  return Object.values(VENDORED_ORIGINS).flatMap((module) => [...(module.INERT_ORIGINS ?? [])]);
}

/**
 * What every add-on this app vendors declares must never reach a browser.
 *
 * The same discovery the inert origins use, off the same file. See
 * `builtOutput.test.ts` for why these are the add-on's facts and not this
 * app's, and what shipped green while they were this app's.
 */
function addOnNeedles(): { text: string; why: string }[] {
  return Object.values(VENDORED_ORIGINS).flatMap((module) => [
    ...(module.NEVER_IN_A_BROWSER ?? []),
  ]);
}


/**
 * THIS STUDIO'S OWN, WHICH IS NONE.
 *
 * The one entry that used to stand here was the SVG XML namespace the
 * PERSONALIZER writes into every picture it draws — an add-on's fact, in a
 * host's list. It is declared where it belongs now, and this app names no
 * address of its own at all.
 */
/*
 * ── AND CONNECTED MODE DOES NOT RELAX THIS LIST, ON PURPOSE (28-T26) ───────
 *
 * `builtOutput.test.ts` declares the Adminium instance a connected build was
 * pointed at, because Vite inlines that origin into the shipped bytes and it
 * has to be allowed there. This list stays empty, and the asymmetry is the
 * rule: THE BACKEND ADDRESS COMES FROM CONFIGURATION, NEVER FROM A SOURCE
 * LITERAL. A source that hardcodes the instance is still a finding here, which
 * is what stops one tenant's URL from being baked into an app the marketplace
 * serves to everybody.
 */
/**
 * ── AND THE PACKAGES A SHIPPED SOURCE MAY IMPORT (28-T26 follow-up) ────────
 *
 * Net two banned the APIs that send and the dynamic `import()` of anything but
 * a relative literal, and read as though it covered "reaching outside this
 * repo". A STATIC import was in neither half: `import { track } from
 * "some-analytics-sdk"` matched nothing, because the `fetch` is in the SDK and
 * not in our file. This is the closed set that makes the default a refusal.
 *
 * Each entry is a package this studio already declares in its own package.json,
 * and the `why` is what a reviewer reads. None of them is claimed to be
 * AUDITED — `react` is here because a React app imports React. What the list
 * buys is that a name nobody agreed to cannot appear in a shipped source.
 */
const ALLOWED_MODULES: readonly AllowedModule[] = [
  { name: "react", why: "the renderer; this is a React app and every screen imports it" },
  {
    name: "react-dom",
    why: "the renderer\u2019s DOM half \u2014 `react-dom/client` mounts the root, once",
  },
  {
    name: "lucide-react",
    why: "icons, which compile to inline `<svg>` elements. It fetches nothing: an icon that named an address would be reported by net one over the built output",
  },
  { name: "zustand", why: "the in-memory store. It holds state and makes no request" },
  {
    name: "@adminiumjs/public-client",
    why: "the connected mode\u2019s client for this studio\u2019s own Adminium instance (28-T28). It DOES issue requests, which is what it is for, and the address it may reach is not forgiven here \u2014 it is `connectedBackend`\u2019s single declared origin, checked over every file and over the built output",
  },
];

const OURS: readonly InertOrigin[] = [];

/*
 * Ours, plus whatever the add-ons this studio vendors declare for themselves,
 * plus the backend a CONNECTED build was pointed at (28-T26, 28-T28).
 *
 * Empty in every demo build, which is every build the marketplace serves and
 * every build CI makes. When `VITE_ADMINIUM_API_BASE_URL` is set, Vite inlines
 * it into `data/adminiumSource.ts` as a literal and this is the declaration
 * that says so — one host, forgiven in EVERY file, rather than every host
 * forgiven in one file. `builtOutput.test.ts` carries the same line for the
 * shipped bytes.
 */
const INERT: readonly InertOrigin[] = [
  ...OURS,
  ...addOnOrigins(),
  ...connectedBackend(process.env["VITE_ADMINIUM_API_BASE_URL"]),
];

/**
 * ── THE ONE FILE THAT MAY READ THE REAL CLOCK (28-T28) ─────────────────────
 *
 * `purity.ts`'s rule is about the DEMO's reproducibility: every date derives
 * from a pinned instant so that a test can assert a promise date and a
 * screenshot taken in a year still matches the running app. A CONNECTED build
 * is the case that rule was never about — its job is to show what the studio is
 * doing NOW, and the tenant's real clock is the input it is missing.
 *
 * So this is not "`adminiumSource.ts` is exempt", which is the shape this file
 * argues against for egress and would forgive a die as readily as a clock. It
 * is TWO MEANS, in ONE FILE. A `Math.random()` in the connected source is still
 * a finding, a clock in any other file is still a finding, and the test below
 * drives both of those rather than asserting them in prose.
 */
const CONNECTED_SOURCE = "data/adminiumSource.ts";

/** The clock half of `IMPURITIES`, by the exact words that file emits. */
const CLOCKS: readonly string[] = [
  "Date.now() \u2014 the real clock",
  "new Date() with no argument \u2014 the real clock",
  "performance.now() \u2014 a clock under another name",
];

describe("nothing here can reach a host we do not control (24 D11)", () => {
  /*
   * D11 AS A RULE, NOT A WORD LIST.
   *
   * This was `\bfetch\(|XMLHttpRequest|WebSocket` — three spellings — and a
   * verifier beat the sibling host's copy of it by writing
   *
   *     const img = new Image();
   *     img.src = "https://tracking.example-analytics.net/p?c=" + …
   *
   * into a vendored add-on component. An image beacon is a request and holds
   * none of the three words; neither does a `<script>` tag, a
   * `<link rel=preconnect>`, a form `action`, a CSS `url()`, an `<iframe>`, a
   * `Worker`, a dynamic `import()` or `sendBeacon` under an alias.
   *
   * `testing/egress.ts` states the category in three nets. Two are static and
   * are below — an ADDRESS nobody declared inert, and an API whose only purpose
   * is to issue a request. The third watches the running page
   * (`add-ons/egress.test.tsx`), because whether `img.src = x` is a defect
   * depends on x, and that is not a property of the text.
   */
  it("names no address outside the ones declared inert", () => {
    const offenders = SHIPPED.flatMap((f) =>
      offendingAddresses(f.code, INERT).map((url) => `${f.rel} → ${url}`),
    );
    expect(offenders).toEqual([]);
  });

  it("carries nothing that can issue a request", () => {
    const offenders = SHIPPED.flatMap((f) => [
      ...sendersIn(f.code).map((means) => `${f.rel} → ${means}`),
      ...foreignImportsIn(f.code).map((spec) => `${f.rel} → ${spec}`),
      // The static half, which neither of the two above ever looked at.
      ...foreignModulesIn(f.code, ALLOWED_MODULES).map(
        (spec) => `${f.rel} → imports ${spec}, which nobody declared`,
      ),
    ]);
    expect(offenders).toEqual([]);
  });

  /*
   * ── THE STATIC-IMPORT RULE, DRIVEN AT ITS EDGES ──────────────────────────
   *
   * Over the rule rather than over `src/`, so these stay true on the day this
   * studio's dependency list changes. The two that matter most are the
   * side-effect import — no symbol in the file to notice — and the lookalike,
   * because a `startsWith` would forgive it.
   */
  it("sees a static import, in the spellings the old net two could not", () => {
    const allowed = [{ name: "react", why: "test" }];
    const seen = (code: string): string[] => foreignModulesIn(code, allowed);

    expect(seen('import { track } from "some-analytics-sdk";')).toEqual(["some-analytics-sdk"]);
    // No bindings at all: it imports nothing and runs everything in the module.
    expect(seen('import "some-analytics-sdk";')).toEqual(["some-analytics-sdk"]);
    expect(seen('export { z } from "exfil-pkg";')).toEqual(["exfil-pkg"]);
    expect(seen('import {\n  a,\n} from "beacon-pkg";')).toEqual(["beacon-pkg"]);
    expect(seen('import type { T } from "types-pkg";')).toEqual(["types-pkg"]);
    expect(seen('export * from "@evil/scope-pkg/deep";')).toEqual(["@evil/scope-pkg/deep"]);
  });


  /*
   * ── THE FIVE WAYS AN ADVERSARIAL PASS BEAT THIS, ALL DRIVEN ──────────────
   *
   * Every one of these was confirmed end to end on 2026-08-20 — planted in a
   * shipped source, built, and found in `dist/` — against the first draft,
   * which anchored the pattern to the start of a line instead of lexing. They
   * are here so no repair quietly drops one.
   */
  it("is not blinded by two string literals carrying the comment tokens", () => {
    // THE WORST OF THEM, because it defeated every static net at once: the
    // opener inside the first string began a comment that ran to the closer
    // inside the third, and the harness deleted the import before any scanner
    // ran. `withoutComments` is string-aware, so nothing is deleted.
    const open = "/" + "*";
    const close = "*" + "/";
    const source = [
      'const openTok = "x ' + open + '";',
      'import { track } from "some-analytics-sdk";',
      'const closeTok = "z ' + close + '";',
    ].join("\n");
    expect(foreignModulesIn(source, [])).toEqual(["some-analytics-sdk"]);
    expect(withoutComments(source)).toContain("some-analytics-sdk");
  });

  it("sees an import that does not begin its line", () => {
    // Legal top-level ES that Vite bundles. The line-start anchor missed it.
    expect(foreignModulesIn('const a = 1; import { t } from "sdk";', [])).toEqual(["sdk"]);
  });

  it("sees an import behind any ES whitespace, not just tab and space", () => {
    // The anchor allowed tab and space only. The WhiteSpace production also
    // admits these, and every one was silent while the bundler resolved it.
    for (const code of [0x00a0, 0x000b, 0x000c, 0x2000, 0xfeff]) {
      const source = String.fromCharCode(code) + 'import "sdk";';
      expect(foreignModulesIn(source, []), "U+" + code.toString(16)).toEqual(["sdk"]);
    }
  });

  it("does not read a docs snippet inside a template literal as an import", () => {
    // The other half of the same defect: a README, an install block or an i18n
    // message held in a template is prose. Reporting it names a package that
    // does not exist and blocks the build, which is how gates earn exemptions.
    const help = "const help = `\nimport { Button } from \"@acme/ui\";\n`;";
    expect(foreignModulesIn(help, [])).toEqual([]);
  });

  it("does not let a traversal segment inherit a declared package", () => {
    // `react/../evil` does not resolve inside react, so it must not borrow
    // react's allowance. Resolvers mostly refuse it, but that is the package's
    // exports map protecting us, not this gate.
    expect(
      foreignModulesIn('import x from "react/../evil";', [{ name: "react", why: "t" }]),
    ).toEqual(["react/../evil"]);
  });

  it("forgives that package and no other, subpaths included", () => {
    const allowed = [{ name: "react-dom", why: "test" }];
    expect(foreignModulesIn('import { createRoot } from "react-dom/client";', allowed)).toEqual([]);
    expect(foreignModulesIn('import x from "react-dom-tracker";', allowed)).toEqual([
      "react-dom-tracker",
    ]);
    expect(foreignModulesIn('import x from "./local.ts";', allowed)).toEqual([]);
  });

  it("does not mistake the word `import` inside a string for one", () => {
    // The works really does have `setStep('import')`, and the first draft of
    // the scanner read the closing quote as an opening one and reported a
    // paragraph of JSX as a package. A gate that cries wolf gets an exemption
    // list, and an exemption list is where the last nine defects came from.
    expect(foreignModulesIn('const step = "import";\nsetStep("import");', [])).toEqual([]);
  });

  /*
   * ── THE CONNECTED-BUILD RELAXATION, DRIVEN AT ITS EDGES (28-T26) ─────────
   *
   * `connectedBackend` is the only thing that can widen NET ONE, so it is the
   * only thing worth trying to beat. These run over the rule itself rather than
   * over `src/`, so they stay true on a day this studio has no connected build
   * -- which is every day until the rollout reaches it.
   */
  it("declares nothing in a demo build, which is what the marketplace ships", () => {
    expect(connectedBackend(undefined)).toEqual([]);
    expect(connectedBackend("")).toEqual([]);
    expect(connectedBackend("   ")).toEqual([]);
  });

  it("declares exactly the configured origin, port and all", () => {
    expect(connectedBackend("https://api.tenant.example.test").map((e) => e.origin)).toEqual([
      "https://api.tenant.example.test",
    ]);
    // A path is normal for a base URL and is not part of the origin. A default
    // port is NOT dropped, because the inlined literal would still carry it and
    // both sides of the comparison have to spell the host the same way.
    expect(
      connectedBackend("https://api.tenant.example.test:8443/api/v1/public").map((e) => e.origin),
    ).toEqual(["https://api.tenant.example.test:8443"]);
  });

  it("forgives that host and no other, so a lookalike is still a finding", () => {
    const inert = connectedBackend("https://api.tenant.example.test");
    expect(offendingAddresses('const a = "https://api.tenant.example.test/x";', inert)).toEqual([]);
    expect(
      offendingAddresses('const a = "https://api.tenant.example.test.attacker.test/x";', inert),
    ).toEqual(["https://api.tenant.example.test.attacker.test/x"]);
    // The whole point of an origin and not a file: the declared backend does
    // not forgive a beacon that happens to sit in the same source.
    expect(
      offendingAddresses('img.src = "https://tracking.example-analytics.net/p";', inert),
    ).toEqual(["https://tracking.example-analytics.net/p"]);
  });

  it("declares nothing when the value is not exactly one address, so it fails closed", () => {
    // A half-written value must not quietly widen the net. Each of these leaves
    // the inlined literal to be reported, which is the loud outcome.
    for (const bad of ["not a url", "/api/v1/public", "https://a.test https://b.test", "https://"]) {
      expect(connectedBackend(bad), bad).toEqual([]);
    }
  });

  it("read something, so an empty result is never a pass", () => {
    expect(SHIPPED.length).toBeGreaterThan(20);
  });
});

describe("no finished-goods stock, verifiable by grep (criterion 14)", () => {
  /**
   * ── WHAT WAS WRONG WITH THE OLD VERSION OF THIS BLOCK ─────────────────────
   *
   * It was seven English regexes run over two directories, and both halves of
   * that leaked.
   *
   * THE PHRASE LIST WAS A FINGERPRINT, NOT A RULE. It knew "only 3 left" and
   * "in stock". It did not know "Just 2 left", "1 remaining" or "Selling fast",
   * so a badge reading all three passed INSIDE `screens/` — proven by pasting
   * it there and watching the suite stay green. A list of the sentences
   * somebody already thought of cannot catch the next one.
   *
   * IT WAS ENGLISH ONLY. Seven of the eight locales could say anything at all.
   *
   * AND IT SAW TWO DIRECTORIES. `components/`, `data/`, `state/` and the
   * vendored add-on halves were invisible, so a `StockBadge` component — the
   * single most likely place for this defect to appear — shipped unseen.
   *
   * ── WHAT IT IS NOW ────────────────────────────────────────────────────────
   *
   * Three rules about MEANING, each spelt in all eight languages, over
   * everything that ships:
   *
   *   1. STOCK OF FINISHED PIECES. Any phrase that says a made thing is or is
   *      not held on a shelf. Absolute — no number needed.
   *   2. A COUNT NEXT TO A WORD OF REMAINDER. "left", "übrig", "剩", "متبق" and
   *      their kin are ordinary words on their own ("Left bare", "Tilbage til
   *      butikken", "let the rest be what it is" all ship today and all are
   *      fine); what a shop with no shelf can never honestly write is one of
   *      them with a QUANTITY beside it.
   *   3. HURRYING THE READER. "Selling fast", "last chance", "almost gone" —
   *      the scarcity idea with the count left out, which is how it comes back
   *      after a rule about counts is written.
   *
   * Rules 1 and 2 are asserted over SHOPPER-facing copy. The maker's shelf is
   * the one inventory this shop has and it genuinely counts: "4 sheets left" is
   * on the bench because it is TRUE there, of walnut and not of coasters. That
   * carve-out is drawn by KEY PREFIX rather than by file, and it does not
   * extend to rule 3 — nothing in this app hurries anybody.
   */

  /**
   * A QUANTITY OF THINGS — which is narrower than "a number", on purpose.
   *
   * Three exclusions, each one a false positive this rule actually produced
   * before they were added:
   *
   *   - A MEASUREMENT IS NOT A COUNT. "Birch ply, 4mm, with the pale face left
   *     showing" is a description of a material, and it read as "4 … left".
   *   - A PLACEHOLDER IS ONLY A COUNT IF IT COUNTS. `{day}` is a date, and
   *     "Uret tilbage til {day}" — Danish for "clock back to Thursday" — read
   *     as a quantity beside a word of remainder. The names below are the ones
   *     that hold numbers of things.
   *   - CJK NUMERALS ARE NOT COUNTS HERE. 一 and 十 are ordinary syllables in
   *     ordinary sentences ("那一周" is "that week"), and this app formats every
   *     number it renders in Chinese as a digit anyway, so including them
   *     bought nothing and matched everything.
   */
  const COUNTING_NAME =
    "count|n|qty|quantity|num|number|total|pieces|blanks|items|lines|sheets|units|remaining|left";
  const COUNT =
    String.raw`(?:\{(?:${COUNTING_NAME})\}` +
    String.raw`|(?<![\p{L}\p{N}])[0-9٠-٩۰-۹]+(?![\p{L}\p{N}]|\s*(?:mm|cm|kg|g\b|%|°)))`;

  /**
   * Words meaning "how many of this are still to be had", per language.
   *
   * Substrings, not words, so an inflection cannot walk around them: Czech
   * "zbýv" covers zbývá/zbývají/zbývající, Arabic "متبق" covers متبقي/متبقية.
   */
  const REMAINDER: Record<string, string[]> = {
    "en-US": ["left", "remain", "to go", "in stock", "available", "on the shelf", "up for grabs"],
    "de-DE": ["übrig", "verbleib", "verfügbar", "auf lager", "vorrätig", "rest"],
    "fr-FR": ["restant", "reste", "disponible", "en stock", "il n'en"],
    "cs-CZ": ["zbýv", "skladem", "dostupn", "poslední"],
    "da-DK": ["tilbage", "på lager", "resterende", "tilovers"],
    "zh-CN": ["剩", "仅存", "库存", "还有", "现货"],
    "zh-TW": ["剩", "僅存", "庫存", "還有", "現貨"],
    "ar-EG": ["متبق", "باقي", "باقٍ", "متوفر", "المخزون"],
  };

  /** Saying a MADE PIECE is or is not on a shelf. Absolute — no count needed. */
  const ON_A_SHELF: Record<string, RegExp[]> = {
    "en-US": [/in stock/i, /out of stock/i, /sold out/i, /low stock/i, /stock count/i],
    "de-DE": [/auf lager/i, /ausverkauft/i, /lagerbestand/i],
    "fr-FR": [/en stock/i, /épuisé/i, /rupture de stock/i],
    "cs-CZ": [/skladem/i, /vyprodán/i, /zásob/i],
    "da-DK": [/på lager/i, /udsolgt/i, /lagerbeholdning/i],
    "zh-CN": [/有货/, /售罄/, /缺货/, /库存/],
    "zh-TW": [/有貨/, /售罄/, /缺貨/, /庫存/],
    "ar-EG": [/نفدت/, /نفد المخزون/, /المخزون/],
  };

  /** The scarcity idea with the count left out. Nothing here hurries anybody. */
  const HURRY: Record<string, RegExp[]> = {
    "en-US": [
      /selling fast/i,
      /going fast/i,
      /almost gone/i,
      /last chance/i,
      /hurry/i,
      /while stocks last/i,
      /don'?t miss/i,
      /act now/i,
      /before (it|they)'?s? gone/i,
    ],
    "de-DE": [/schnell weg/i, /fast ausverkauft/i, /letzte chance/i, /beeil/i, /nur noch kurz/i],
    "fr-FR": [/part vite/i, /dernière chance/i, /dépêche/i, /plus que quelques/i],
    "cs-CZ": [/rychle mizí/i, /poslední šance/i, /pospěš/i, /už jen pár/i],
    "da-DK": [/går hurtigt/i, /sidste chance/i, /skynd/i, /kun få tilbage/i],
    "zh-CN": [/手慢无/, /抓紧/, /最后机会/, /售完为止/],
    "zh-TW": [/手慢無/, /抓緊/, /最後機會/, /售完為止/],
    "ar-EG": [/تنفد بسرعة/, /آخر فرصة/, /أسرع/, /حتى نفاد/],
  };

  /**
   * A count within a short reach of a word of remainder, in either order.
   *
   * Either order because the languages disagree: English puts the count first
   * ("2 left"), Arabic and Chinese can put it second (متبقٍ ٢ / 还有 2 件). The
   * window stops at sentence punctuation so two unrelated clauses cannot be
   * read as one claim.
   */
  const countedRemainder = (text: string, locale: string): string | null => {
    for (const word of REMAINDER[locale] ?? []) {
      const w = word.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      const near = String.raw`[^.!?;\n|]{0,24}`;
      for (const source of [`${COUNT}${near}${w}`, `${w}${near}${COUNT}`]) {
        const hit = new RegExp(source, "iu").exec(text);
        if (hit !== null) return hit[0];
      }
    }
    return null;
  };

  const matched = (text: string, patterns: RegExp[] = []): string | null => {
    for (const pattern of patterns) {
      const hit = pattern.exec(text);
      if (hit !== null) return hit[0];
    }
    return null;
  };

  /**
   * The maker's own copy, which is the one place a count of things on a shelf
   * is TRUE — and it is about sheets, blanks, filament and glaze, never about a
   * finished piece. Named by key prefix so the carve-out is a property of what
   * the string says rather than of which file somebody put it in.
   */
  const MAKER_KEY = /^(bench\.|data\.stock\.|addon\.)/;

  /**
   * The same three rules over the SOURCE of everything that renders.
   *
   * A badge whose copy is hardcoded in a component never reaches the bundle, so
   * the checks above cannot see it — which is exactly the case the widening was
   * for. English rules, because copy that skipped the bundle is by definition
   * untranslated. Comments stripped, because this repo's prose legitimately
   * discusses the rule it is obeying.
   */
  const SHOPPER_SOURCES = SHIPPED.filter(
    (f) =>
      f.rel.startsWith("screens/") ||
      f.rel.startsWith("components/") ||
      f.rel.startsWith("data/") ||
      f.rel.startsWith("state/") ||
      f.rel.startsWith("i18n/strings/") ||
      f.rel.startsWith("add-ons/"),
  );

  /**
   * The sentences inside a source file, as against its code.
   *
   * All three rules run over this rather than over the raw text, and the third
   * one is why. `countedRemainder` looks for a number near a word of
   * remainder, and a `.tsx` file is full of both: `<ChevronLeft size={14} />`
   * is "Left" with a 14 beside it and means nothing at all. So the check reads
   * what a person would read — JSX text and prose-shaped string literals —
   * which is also where the defect would actually be written.
   */
  /**
   * Replace each top-level `{…}` in a JSX text run with what it means to a
   * reader: nothing, if it carries a translated string (that string has its own
   * entry in the bundle and is checked there), or a stand-in count otherwise.
   *
   * Depth-aware rather than a regex, because `{t("…leftover", { count })}` has
   * a brace inside a brace: a flat `\{[^{}]*\}` collapsed only the INNER one
   * and left `leftover", {count}` behind as if a screen had written it.
   */
  const collapseExpressions = (text: string): string => {
    let out = "";
    let inner = "";
    let depth = 0;
    for (const ch of text) {
      if (ch === "{") {
        depth += 1;
        if (depth === 1) {
          inner = "";
          continue;
        }
      } else if (ch === "}") {
        depth -= 1;
        if (depth === 0) {
          out += /["'`]/.test(inner) ? " " : "{count}";
          continue;
        }
      }
      if (depth === 0) out += ch;
      else inner += ch;
    }
    return out;
  };

  const visibleCopy = (rel: string, code: string): string[] => {
    const prose = (s: string) => /\s/.test(s.trim()) && (s.match(/\p{L}/gu) ?? []).length > 3;
    /*
     * A JSX text run is read WITH its interpolations in place, because that is
     * how the reader sees it: `Only {n} left in stock` is one sentence, and an
     * extractor that stopped at the brace saw "Only" and "left in stock" as two
     * unrelated fragments and missed a `StockBadge` sitting in `components/`.
     * An interpolation that carries a translated string is dropped (it has its
     * own entry in the bundle and is checked there); anything else stands in as
     * a count, which is what a bare value in the middle of a sentence is.
     */
    /*
     * Only in a `.tsx` file, and never after an `=`. `(x) => t("…leftover", …)`
     * and `available(p: ProductRef): boolean` both put a `>` and a `<` around a
     * run of code that is not text at all, and both were reported as copy the
     * first time this ran.
     */
    const jsxText = rel.endsWith(".tsx")
      ? [...code.matchAll(/(?<![=<>!+-])>([^<>]*)</g)].map((m) => collapseExpressions(m[1]!))
      : [];
    const literals = [...code.matchAll(/(["'`])([^"'`\n]{4,})\1/g)].map((m) => m[2]!);
    return [...jsxText, ...literals].filter(prose);
  };

  it("has the whole bundle and every shipped file to check", () => {
    expect(LOCALE_TAGS).toHaveLength(8);
    expect(Object.keys(MESSAGES["en-US"]).length).toBeGreaterThan(300);
    expect(SHOPPER_SOURCES.length).toBeGreaterThan(20);
  });

  it("never says a made piece is on a shelf, in any of the eight languages", () => {
    const hits: string[] = [];
    for (const locale of LOCALE_TAGS) {
      for (const [key, value] of Object.entries(MESSAGES[locale])) {
        if (MAKER_KEY.test(key)) continue;
        const hit = matched(value, ON_A_SHELF[locale]);
        if (hit !== null) hits.push(`${locale} ${key} · ${hit} · ${value}`);
      }
    }
    expect(hits).toEqual([]);
  });

  it("never puts a count beside a word of remainder, in any of the eight", () => {
    const hits: string[] = [];
    for (const locale of LOCALE_TAGS) {
      for (const [key, value] of Object.entries(MESSAGES[locale])) {
        if (MAKER_KEY.test(key)) continue;
        const hit = countedRemainder(value, locale);
        if (hit !== null) hits.push(`${locale} ${key} · ${hit} · ${value}`);
      }
    }
    expect(hits).toEqual([]);
  });

  it("hurries nobody — not even on the maker's own screens", () => {
    const hits: string[] = [];
    for (const locale of LOCALE_TAGS) {
      for (const [key, value] of Object.entries(MESSAGES[locale])) {
        const hit = matched(value, HURRY[locale]);
        if (hit !== null) hits.push(`${locale} ${key} · ${hit} · ${value}`);
      }
    }
    expect(hits).toEqual([]);
  });

  it("carries no hardcoded scarcity copy in any file that renders", () => {
    const hits: string[] = [];
    for (const file of SHOPPER_SOURCES) {
      for (const line of visibleCopy(file.rel, file.code)) {
        const hit =
          matched(line, ON_A_SHELF["en-US"]) ??
          matched(line, HURRY["en-US"]) ??
          countedRemainder(line, "en-US");
        if (hit !== null) hits.push(`${file.rel} · ${hit}`);
      }
    }
    expect(hits).toEqual([]);
  });

  it("would catch every shape of the defect, including the ones a list missed", () => {
    /*
     * The proof the rules bite, and half of these are the sentences the old
     * seven-regex version let through.
     */
    const bites = (s: string, locale = "en-US") =>
      matched(s, ON_A_SHELF[locale]) !== null ||
      matched(s, HURRY[locale]) !== null ||
      countedRemainder(s, locale) !== null;

    // The three the old list knew.
    expect(bites("Only 3 left in stock")).toBe(true);
    expect(bites("Sold out")).toBe(true);
    expect(bites("Low stock — order soon")).toBe(true);
    // The three it did not, which is the whole reason this was rewritten.
    expect(bites("Just 2 left")).toBe(true);
    expect(bites("1 remaining")).toBe(true);
    expect(bites("Selling fast")).toBe(true);
    // Nor a count that arrives as a placeholder, which is how it would ship.
    expect(bites("{count} left")).toBe(true);
    expect(bites("Hurry — almost gone")).toBe(true);

    // And the other seven languages, which had no rule at all before.
    expect(bites("Nur noch 2 übrig", "de-DE")).toBe(true);
    expect(bites("Il ne reste que 3 pièces", "fr-FR")).toBe(true);
    expect(bites("Zbývají poslední 2 kusy", "cs-CZ")).toBe(true);
    expect(bites("Kun 2 tilbage", "da-DK")).toBe(true);
    expect(bites("仅剩 2 件", "zh-CN")).toBe(true);
    expect(bites("僅剩 2 件", "zh-TW")).toBe(true);
    expect(bites("متبقي ٢ فقط", "ar-EG")).toBe(true);

    // What the shop DOES say, in each language, and none of it is a hit.
    expect(bites("Made in small batches while the walnut lasts.")).toBe(false);
    expect(bites("Left bare")).toBe(false); // a finish, not a count
    expect(bites("Tilbage til butikken", "da-DK")).toBe(false); // "back to the shop"
    expect(bites("lassen den Rest, wie er ist", "de-DE")).toBe(false);
    expect(bites("laissons le reste tel quel", "fr-FR")).toBe(false);
  });

  it("keeps the one inventory it has out of every rendering file but the bench's", () => {
    /*
     * `MATERIAL_STOCK` may be named in the catalogue, the engine and the store.
     * Nothing that renders may reach for it — widened from `screens/` to every
     * component and every vendored add-on half, because a badge in a shared
     * primitive is drawn on the shopper's side too.
     */
    const reaching = SHIPPED.filter(
      (f) =>
        (f.rel.startsWith("screens/") ||
          f.rel.startsWith("components/") ||
          f.rel.startsWith("add-ons/")) &&
        /MATERIAL_STOCK/.test(f.text),
    ).map((f) => f.rel);
    expect(reaching).toEqual([]);
  });
});

describe("NO VIEW COUNTS PLAIN WEEKDAYS (criterion 13)", () => {
  /**
   * The bench runs Tuesday to Saturday, and `lib/calendar.ts` is the only place
   * in this repo allowed to know what that means.
   *
   * A screen that does its own day arithmetic can count the wrong kind of day,
   * and one did: the order view's stage strip added a plain calendar day to the
   * date an order was placed. Swapping `addStudioDays` for `addDays` there left
   * every test in the repo green while printing a Sunday under a step, three
   * clicks from the page that explains the shop is shut on Sundays.
   *
   * The behavioural half of this guard is in `orders.test.ts`, over the dates
   * themselves. This half is the reason it cannot come back: no view computes a
   * date at all. Screens ask for a NAMED day — `postDay`, `finishDay`,
   * `fortnight`, `shopperStageDates` — and the arithmetic behind those names is
   * tested where it lives.
   *
   * There is NO exception list, and there deliberately isn't one: the postage
   * calendar was the last holdout and its grid moved into `fortnight()` rather
   * than being named here. An exception in this rule is a place the next defect
   * fits.
   */
  const ARITHMETIC = /\b(addDays|addStudioDays|nextStudioDay|daysBetween|snapForward)\s*\(/;
  const RAW_DATE = /Date\.UTC|getUTC(Date|Day|Month|FullYear)|86[_,]?400[_,]?000/;

  const VIEWS = SHIPPED.filter(
    (f) => f.rel.startsWith("screens/") || f.rel.startsWith("components/"),
  );

  it("has views to check", () => {
    expect(VIEWS.length).toBeGreaterThan(8);
  });

  it("does no day arithmetic in any screen or component", () => {
    const hits: string[] = [];
    for (const file of VIEWS) {
      const a = ARITHMETIC.exec(file.code);
      if (a !== null) hits.push(`${file.rel} · ${a[0]}`);
      const d = RAW_DATE.exec(file.code);
      if (d !== null) hits.push(`${file.rel} · ${d[0]}`);
    }
    expect(hits).toEqual([]);
  });

  it("would catch the exact swap that got through before", () => {
    const bites = (s: string) => ARITHMETIC.test(s) || RAW_DATE.test(s);
    expect(bites("const finish = addDays(order.placedIso, 1);")).toBe(true);
    expect(bites("const finish = addStudioDays(order.placedIso, 1);")).toBe(true);
    expect(bites("const d = new Date(Date.UTC(2026, 7, 6));")).toBe(true);
    // What a screen is supposed to do instead.
    expect(bites("const stageDates = shopperStageDates(order);")).toBe(false);
    expect(bites("const days = fortnight(iso);")).toBe(false);
    expect(bites("day(postDay(clock, 3))")).toBe(false);
  });
});

describe("the test lexicon never ships", () => {
  it("is imported by suites only", () => {
    const importers = ALL.filter(
      (f) => /from "\.\.?\/.*testing\//.test(f.text) && !/\.test\.tsx?$/.test(f.rel),
    ).map((f) => f.rel);
    expect(importers).toEqual([]);
  });
});

describe("CSS logical properties only", () => {
  /**
   * The app renders RTL for Arabic with NO RTL stylesheet, which only works
   * while every positional rule is logical. One `margin-left` is all it takes
   * to put a stage strip's dates on the wrong side in exactly one of eight
   * languages, which is the failure mode nobody reviewing in English sees.
   */
  const PHYSICAL =
    /(?:^|[\s;{])(margin|padding|border)-(left|right)\s*:|(?:^|[\s;{])(left|right)\s*:/;

  it("uses no physical left/right rule in any stylesheet", () => {
    const hits: string[] = [];
    for (const file of ALL.filter((f) => f.rel.endsWith(".css"))) {
      for (const line of file.text.split("\n")) {
        if (PHYSICAL.test(line)) hits.push(`${file.rel} · ${line.trim()}`);
      }
    }
    expect(hits).toEqual([]);
  });

  it("uses no physical left/right in an inline style either", () => {
    const hits: string[] = [];
    for (const file of SHIPPED.filter((f) => f.rel.endsWith(".tsx"))) {
      for (const match of file.text.matchAll(/\b(marginLeft|marginRight|paddingLeft|paddingRight|left|right):/g)) {
        hits.push(`${file.rel} · ${match[1]}`);
      }
    }
    expect(hits).toEqual([]);
  });
});

/**
 * THE DOCUMENTED COMMAND IS THE ONE THAT HAS TO PASS.
 *
 * `npm test` shipped RED on a clean tree for a whole round. Three suites take
 * 7–19 s — they mount the app and crawl it — and nothing configured a timeout,
 * so vitest's 5 s default failed all three. Every one of them passed for the
 * round that wrote them, because that round ran `npx vitest run --testTimeout=…`
 * with its own flags and never ran the command the README gives a reader.
 *
 * The repair is in `vite.config.ts`. This is the part that keeps it there: a
 * config line has no other test, it reads as boilerplate in a diff, and the only
 * person who notices its absence is whoever next runs the documented command.
 */
describe("the test command a reader is given is the one that is configured", () => {
  const config = readFileSync(join(process.cwd(), "vite.config.ts"), "utf8");

  it("gives the suites long enough to finish", () => {
    const declared = /testTimeout:\s*([\d_]+)/.exec(config);
    expect(declared, "vite.config.ts sets no test.testTimeout — see the block there").not.toBe(
      null,
    );
    /*
     * The slowest suite measured about 17 s. Anything under 30 s is a gate that
     * goes red on a loaded CI box, which is the same defect one machine later.
     */
    expect(Number((declared?.[1] ?? "0").replace(/_/g, ""))).toBeGreaterThanOrEqual(30_000);
  });

  it("runs the whole suite, with no flag a reader would have to know", () => {
    // `vitest run` and nothing else. A `--testTimeout` here would be the same
    // defect wearing the fix's clothes: the flag would live in one repo's
    // package.json and the reason for it nowhere.
    const scripts = JSON.parse(readFileSync(join(process.cwd(), "package.json"), "utf8")) as {
      scripts: Record<string, string>;
    };
    expect(scripts.scripts.test).toBe("vitest run");
    expect(readFileSync(join(process.cwd(), "README.md"), "utf8")).toContain("npm test");
  });
});

/**
 * AND THE DISCOVERY ITSELF IS GUARDED, because it is only as honest as what it
 * finds.
 *
 * A vendored package that exported nothing would contribute nothing and read
 * exactly like a package with nothing to declare. A renamed export, or a sync
 * that dropped the file, would leave this studio quietly allowing no origin at all
 * — which fails loudly here rather than silently on the day an add-on that
 * really does name an address is vendored.
 */
describe("an add-on brings its own inert origins with it (24 AC20, D21)", () => {
  it("reads a declaration off every add-on this studio vendors", () => {
    const declared = Object.entries(VENDORED_ORIGINS);
    expect(declared.length, "no vendored inert-origin declarations were found").toBeGreaterThan(0);
    const silent = declared
      .filter(([, module]) => module.INERT_ORIGINS === undefined)
      .map(([file]) => file);
    expect(silent, "these vendored packages export no INERT_ORIGINS").toEqual([]);
  });

  it("keeps no origin of its own that belongs to an add-on", () => {
    // The ratchet on the repair. Re-adding an add-on"s address to this studio"s
    // own list would work, and would put the defect straight back: every entry
    // here has to be an address THIS app names, and this studio names none.
    expect(OURS).toEqual([]);
  });

  it("says why, for every origin it allows, wherever it came from", () => {
    expect(INERT.length, "nothing was discovered at all").toBeGreaterThan(0);
    for (const entry of INERT) {
      expect(
        { origin: entry.origin, explained: entry.why.length > 30 },
        `${entry.origin} is allowed with no reason a reviewer can read`,
      ).toEqual({ origin: entry.origin, explained: true });
    }
  });

  it("forgives the declared origin and nothing that merely starts the same", () => {
    // The comparison is exact, and this is the case that says so: an add-on
    // declaring `api.canva.com` does not hand a look-alike host an allowance.
    const declared = INERT[0]!.origin;
    expect(offendingAddresses(`const a = "${declared}/x";`, INERT)).toEqual([]);
    expect(offendingAddresses(`const a = "${declared}.attacker.test/x";`, INERT)).not.toEqual([]);
  });
});

describe("secrets are server-only (24 D15)", () => {
  /**
   * ── THE SAME NEEDLES, ONE BUILD EARLIER, AND THEY ARE THE ADD-ON"S ────────
   *
   * `builtOutput.test.ts` greps the artefact; this catches a leak at the import
   * that would have caused one. Both used to spell the needles out — the
   * credentialled add-on"s two `secret: true` setting keys and the type its
   * server half reads them into — inside an app that merely receives it, so a
   * THIRD credentialled add-on would have been checked for nothing at all.
   * They come off each vendored add-on"s own `add-on-facts.ts` now; see the
   * block in `builtOutput.test.ts` for the argument.
   *
   * `apiKey` in camelCase is deliberately not among them, and that stays true
   * whoever declares it: the connect dialog holds one in component state while
   * the shop types it and drops it on submit, and `shop.connect.apiKey` is the
   * LABEL on that field. Banning the words a credential form has to say would
   * be banning the form, not the leak. What must never appear is the key a
   * value would be SAVED under.
   *
   * THE DECLARATION FILES THEMSELVES ARE NOT A LEAK. `add-on-facts.ts` exists
   * to NAME these strings, so it names them; it is data, it is imported by no
   * screen, and every other gate in this file — senders, clocks, the ban on
   * reaching `testing/` — still applies to it exactly as to any other vendored
   * module. Nothing else is excused.
   */
  it("keeps every secret setting out of the client half", () => {
    const needles = addOnNeedles();
    expect(needles.length, "no add-on declared anything server-only").toBeGreaterThan(0);
    const offenders = ALL.filter(
      (file) =>
        !/\.test\.tsx?$/.test(file.rel) &&
        !file.rel.endsWith("add-on-facts.ts") &&
        needles.some((needle) => file.code.includes(needle.text)),
    );
    expect(offenders.map((file) => file.rel)).toEqual([]);
  });

  /*
   * ── AND NEITHER DID IT GATE `testing/` ITSELF, WHICH IS THE SAME SHAPE ────
   *
   * [Added 2026-08-20 with the vendored manifest validator.] The works has held
   * this rule since round 1 and this studio never had it. It only started to
   * MATTER when `src/testing/manifest/` arrived here: that directory imports
   * `zod`, which is a devDependency and a runtime dependency the host does not
   * carry (24 D7), so one import from a screen would put a validator — and a
   * package the customer's browser never loads — into the shipped bundle.
   *
   * The vendored barrel's own header claims this test exists. It is asserted
   * here so that claim is true rather than aspirational, which is the whole
   * argument the block above makes about porting a gate instead of assuming it.
   */
  it("never lets shipped code reach the test-only directory, or zod", () => {
    const offenders = SHIPPED.filter((file) =>
      /from ['"][^'"]*\/testing\/|from ['"]zod['"]/.test(file.code),
    );
    expect(offenders.map((file) => file.rel)).toEqual([]);
  });

  /*
   * AND THIS STUDIO HAD NO SUCH GATE AT ALL, which is failure mode two in one
   * line: it vendors the same credentialled delivery add-on the works does, the
   * works has checked its own sources since round 1, and nobody ever asked this
   * one. The needles are declared by the add-on, so porting the gate is this
   * block and nothing else.
   */
  it("bites on a leak, so the absence above means something", () => {
    const needles = addOnNeedles();
    const leaked = `const saved = { ${needles[0]!.text}: value };`;
    expect(needles.some((needle) => leaked.includes(needle.text))).toBe(true);
  });
});
