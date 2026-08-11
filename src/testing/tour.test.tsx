/**
 * THE TOUR IS COMPLETE, OR THIS IS RED.
 *
 * @vitest-environment jsdom
 *
 * ── WHY A SUITE ABOUT A TEST HELPER ─────────────────────────────────────────
 *
 * `tour.tsx` is what the Arabic-digit guard and the accessible-name sweep both
 * see the app THROUGH. Whatever it cannot reach, neither of them can report —
 * so the tour's coverage is not a detail of a helper, it is the scope of two
 * rules, and it needs a gate of its own.
 *
 * It had none, and it was a pinned census: `for (const view of ALL_VIEWS)
 * useStore.setState({ view })`, and nothing else. Every overlay this app can
 * open and every surface an add-on opens on a press were outside both suites in
 * both hosts, which is why round 4 found unformatted numbers on them BY HAND.
 *
 * ── WHAT THIS FILE ASSERTS, AND WHY EACH ONE FAILS ON A NEW SURFACE ─────────
 *
 *   1. EVERY VIEW. Read from `ALL_VIEWS`, which the `View` union is derived
 *      from, so a screen added tomorrow is required tomorrow.
 *
 *   2. EVERY OVERLAY. Read from the `Overlay` union IN THE STORE'S SOURCE, not
 *      from a list kept here. Adding a `kind` to that union and not touring it
 *      is a failure, which is the property a hand-kept list can never have.
 *
 *   3. EVERY CONTROL AN ADD-ON DREW WAS PRESSED. The crawl is bounded — it has
 *      to be, or a control that redraws itself would hang the run — and the
 *      bounds are REPORTED rather than swallowed. A budget that runs out leaves
 *      the controls it skipped in `unpressed`, and this fails on any.
 *
 *   4. AND IT REALLY REACHED THE ADD-ONS' OWN SURFACES. The crawl could be
 *      perfectly exhaustive over an empty set — no mounts, nothing to press,
 *      zero unpressed — which is the shape every guard in this wave has failed
 *      as. So the surfaces a press opened are named.
 */

import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import { LOCALE_TAGS } from "../i18n/locales.ts";
import { MESSAGES } from "../i18n/messages/index.ts";
import { ALL_VIEWS, useStore } from "../state/store.ts";
import { overlaysToTour, tourEveryView } from "./tour.tsx";

/**
 * The `kind` of every arm of the store's `Overlay` union, read out of the file.
 *
 * A TypeScript union is erased before anything runs, so there is no value to
 * enumerate — and enumerating it by hand here would put the census back one
 * file over. The declaration is a literal union of object types each opening
 * `{ kind: "…" }`, which is exactly as much shape as this needs.
 */
function declaredOverlayKinds(): string[] {
  /*
   * Resolved from the project root, not from `import.meta.url`. Under jsdom
   * that URL is `http://localhost/…`, so both `fileURLToPath` and `.pathname`
   * give something that is not this file's place on disk — and a guard that
   * cannot find the source it reads must say so rather than pass.
   */
  const source = readFileSync(join(process.cwd(), "src/state/store.ts"), "utf8");
  const start = source.indexOf("export type Overlay =");
  expect(start, "the Overlay union is not declared where this guard looks").toBeGreaterThan(0);
  const body = source.slice(start, source.indexOf("\n\n", start));
  return [...body.matchAll(/\{\s*kind:\s*"([^"]+)"/g)].map((m) => m[1]!);
}

/*
 * ONE TOUR, READ BY EVERY CASE. It renders the whole app a few hundred times;
 * running it once per assertion would quadruple the suite for no more truth.
 */
const report = await tourEveryView("en-US", () => {});

describe("the tour reaches every surface a reader can reach", () => {
  it("renders every view the store declares", () => {
    expect([...new Set(report.views)].sort()).toEqual([...ALL_VIEWS].sort());
  });

  it("opens every overlay the store declares, and knows if one is added", () => {
    const declared = declaredOverlayKinds().filter((kind) => kind !== "none");
    expect(declared.length, "no overlay kinds were parsed out of the store at all").toBeGreaterThan(
      3,
    );
    // `overlaysToTour` is the list the tour walks; the union is the truth.
    expect([...new Set(overlaysToTour().map((o) => o.overlay.kind))].sort()).toEqual(
      [...declared].sort(),
    );
    expect([...new Set(report.overlays)].sort()).toEqual([...declared].sort());
  });

  /**
   * ── AND IT OPENS THEM WITH WHAT THE APP WOULD OPEN THEM WITH ───────────────
   *
   * [Added 2026-08-11, round 6, in both hosts at once.] The print works toured
   * its finish-reason overlay with two English sentences the suite had invented
   * — so that surface was rendered in eight locales showing copy the app never
   * produces, and the a11y and Arabic-numerals sweeps never saw the real
   * strings. This studio's version was quieter: the connect and disconnect
   * entries named their add-ons as literals, which are real keys today and
   * would render an EMPTY DIALOG the day either is renamed, with the tour still
   * reporting both overlays as visited.
   *
   * The rule, not the fix: EVERY string in EVERY overlay payload must be one
   * the app itself can produce — a message this locale actually holds, or an
   * identifier out of the demo's own records. A literal a test author typed is
   * neither.
   *
   * Run in every locale, because an English literal that happens to equal an
   * English message is the one way this could pass while being wrong.
   */
  it("opens them with strings the app itself produces, never invented copy", () => {
    for (const locale of LOCALE_TAGS) {
      const copy = new Set(Object.values(MESSAGES[locale]));
      const state = useStore.getState();
      const identifiers = new Set<string>([
        ...state.orders.map((order) => order.ref),
        ...state.orders.flatMap((order) => order.lines.map((line) => line.id)),
        ...state.registry.all.map((addOn) => addOn.key),
      ]);
      for (const { overlay } of overlaysToTour()) {
        for (const [field, value] of Object.entries(overlay)) {
          if (field === "kind" || typeof value !== "string" || value === "") continue;
          expect(
            copy.has(value) || identifiers.has(value),
            `${locale} · ${overlay.kind}.${field} is "${value}", which this app never ` +
              "produces: it is neither a message in this locale nor a reference in the " +
              "studio's own records. See `overlaysToTour`.",
          ).toBe(true);
        }
      }
    }
  });

  /**
   * ── THE CRAWL STOPPED ONLY WHERE IT SAID IT WOULD ──────────────────────────
   *
   * This case used to read `expect(report.unpressed).toEqual([])` and it was
   * true, and it meant nothing. A crawl that could not get past the first press
   * leaves nothing unpressed either — there is nothing on the page to leave.
   *
   * What can honestly be asserted is that every stop is a DECLARED one. The
   * search is over a state graph an editor makes combinatorial, so it is
   * bounded; a bound that binds says so, in words, with the path it was standing
   * on. Anything else in this list is a control the crawl found, did not press,
   * and did not account for.
   */
  it("stops only where it declares a bound, never quietly", () => {
    const undeclared = report.unpressed.filter((entry) => !entry.endsWith("(render budget spent)"));
    expect(undeclared, `\n${undeclared.join("\n")}\n`).toEqual([]);
  });

  /**
   * ── AND IT GOT INSIDE, WHICH IS THE PART THAT KEPT BREAKING ────────────────
   *
   * The number that both of round 5's crawl defects would have shown up as, and
   * that nothing else here can see.
   *
   * A press that was not AWAITED opened nothing, so an add-on whose handler is
   * `async` was never entered at all. Two controls sharing a SIGNATURE meant a
   * replay resolved both to the first, so a panel could never be got past and
   * the screens behind it did not exist as far as any guard was concerned. In
   * both cases every other case in this file passed: every view toured, every
   * overlay opened, no control unaccounted for, mounts pressed. The crawl was
   * two presses deep and reported like it was finished.
   *
   * Four is what this shop's own deepest add-on flow costs. It is a RATCHET
   * rather than a description: if a bound stops binding where it used to, or a
   * press stops opening what it opened, this is what goes red.
   */
  it("gets inside an add-on's own flow, not just onto its first screen", () => {
    expect(report.deepest).toBeGreaterThanOrEqual(4);
  });

  it("actually opened surfaces behind a press, in the add-ons' own panels", () => {
    // The guard-the-guard case. Everything above would pass over an app with no
    // add-on mounted anywhere; this is what says the crawl had something to do.
    expect(report.clicks.length).toBeGreaterThan(5);
    const mounts = new Set(
      report.clicks.map((click) => click.split("click:")[1]?.split("|")[0] ?? ""),
    );
    mounts.delete("");
    expect([...mounts].length, `pressed nothing inside a slot mount`).toBeGreaterThan(1);
  });
});
