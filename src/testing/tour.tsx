/**
 * EVERY VIEW THIS APP CAN SHOW, RENDERED, IN WHATEVER LANGUAGE YOU ASK FOR.
 *
 * @vitest-environment jsdom
 *
 * Two suites need the same thing and neither should own it: the Arabic-digit
 * guard (`i18n/numerals.arabic.test.tsx`) and the accessible-name sweep
 * (`a11y.test.tsx`). Both state a rule about WHAT IS ON A SCREEN, and a rule
 * about what is on a screen can only be held by rendering the screens.
 *
 * ── WHY THE WHOLE `<App>` AND NOT THE SCREENS ───────────────────────────────
 *
 * `add-ons/slotRender.test.tsx` renders eight screen components directly, which
 * is right for what it asks (which slots a screen mounts). It is wrong for
 * these two: the shell, the dock, the overlays and the toasts are all things a
 * reader reads, and the dock is where the Latin clock face was. So this mounts
 * the real root and drives the store's own `view`, which is the switch the app
 * itself uses.
 *
 * ── AND WHY THE ADD-ONS ARE SWITCHED ON ─────────────────────────────────────
 *
 * The vendored fills draw inside these pages. An add-on's own repo can render
 * its components, but it cannot render them where a shopper meets them — beside
 * the host's prices, inside the host's basket line, under the host's `lang`.
 * Both defects these suites exist for were found there: the personalizer's
 * "8.5 مم" sat beside the host's own "٣ مم" on one row, and the preview SVG's
 * missing name is only a defect because it appears five times on pages the host
 * draws. So the tour visits every view twice — nothing connected, then
 * everything connected — and the add-on surfaces are checked as part of the
 * page rather than in isolation.
 *
 * The view list comes off `ALL_VIEWS` in the store, which is the same array the
 * union type is derived from: a screen added tomorrow is toured tomorrow,
 * without an edit here.
 */

import { act, type ReactNode } from "react";
import { createRoot, type Root } from "react-dom/client";

import App from "../app/App.tsx";
import { DEMO_KEYS } from "../add-ons/registry.ts";
import { ORDERS } from "../data/demo.ts";
import { I18nProvider } from "../i18n/index.tsx";
import type { LocaleTag } from "../i18n/locales.ts";
import { batchGroups } from "../lib/batch.ts";
import { ALL_VIEWS, useStore, type Overlay, type View } from "../state/store.ts";

export interface Visit {
  view: View;
  /**
   * WHAT IS ON TOP OF THE VIEW, and the reason this field exists.
   *
   * `""` is the plain page. `overlay:proof` is a sheet the store opened.
   * `click:Design it here` is a surface a reader reached by pressing something
   * — the add-on's own editor, wizard or setup form, which no store field names
   * and which nothing but a press can produce.
   */
  surface: string;
  /** Whether the add-ons were switched on for this pass. */
  connected: boolean;
  locale: LocaleTag;
  /** The live element, readable only inside the visitor callback. */
  host: HTMLElement;
}

/**
 * The state that makes every view show its CONTENT rather than its empty state.
 *
 * Driven through the store's own actions, never by writing state in by hand: a
 * screen that quietly stopped reaching its content would then render the empty
 * page here too, and a guard reading an empty page finds nothing wrong with it.
 */
function seedTheTour(): void {
  const store = () => useStore.getState();
  const order = ORDERS[0]!;

  // A piece that takes engraving, so the personalization surfaces are on the
  // page rather than the "nothing to personalise here" arm.
  store().openProduct("walnut-coasters");
  store().addToBasket();

  store().setLookup({ ref: order.ref, email: order.email });
  store().doLookup();

  store().openMakerOrder(order.ref);
  store().openPiece("walnut-coasters");

  const group = batchGroups(store().orders)[0];
  if (group !== undefined) store().openBatch(group.key);
}

/**
 * The browser APIs jsdom does not implement, stubbed so a PRESS does not throw.
 *
 * None of this is pretending an app behaves; it is the price of driving real
 * controls instead of setting state. Pressing "download the picture" calls
 * `URL.createObjectURL`, pressing "print the label" opens an iframe and calls
 * `print()` on it, and jsdom has neither — so before the crawl existed these
 * lines were unnecessary, and the surfaces behind those buttons were unseen.
 *
 * They are stubs rather than mocks: they return something inert and record
 * nothing, because no assertion in either suite is about them. What the suites
 * read is the markup that appears once the press has gone through.
 */
function stubWhatJsdomHasNot(): void {
  const url = URL as unknown as Record<string, unknown>;
  url["createObjectURL"] ??= () => "blob:jsdom/0";
  url["revokeObjectURL"] ??= () => {};
  window.print = window.print ?? (() => {});
  window.alert = window.alert ?? (() => {});
  const frame = HTMLIFrameElement.prototype as unknown as Record<string, unknown>;
  frame["print"] ??= () => {};
}

/** Mount, hand the live page to `visit`, unmount. */
async function withApp(visit: (host: HTMLElement) => void | Promise<void>): Promise<void> {
  const host = document.createElement("div");
  document.body.appendChild(host);
  let root: Root | undefined;
  act(() => {
    root = createRoot(host);
    root.render(
      <I18nProvider>
        <App />
      </I18nProvider> as ReactNode,
    );
  });
  await visit(host);
  act(() => {
    root?.unmount();
  });
  host.remove();
}

/**
 * ── WHY A VIEW LIST WAS NEVER THE SET OF SURFACES ───────────────────────────
 *
 * This function used to be, in its entirety, `for (const view of ALL_VIEWS)
 * useStore.setState({ view })`. That is a census of the store's `view` field,
 * and the store's `view` field is not what a reader can reach:
 *
 *   AN OVERLAY IS NOT A VIEW. The proof sheet, the character-limit dialog, the
 *   spoilage form, the connect and disconnect confirmations and the nav sheet
 *   all render over whatever view is underneath, from a DIFFERENT store field,
 *   and none of them were ever rendered by either suite that depends on this.
 *
 *   AN ADD-ON'S OWN SURFACE IS BEHIND A PRESS. The Live Personalizer's setup
 *   form, its editor and its wizard exist only after somebody
 *   clicks the thing that opens them. No store field names them. Round 4 found
 *   unformatted numbers on exactly those surfaces BY HAND, which is the whole
 *   argument: what the tour cannot reach, the guards cannot see.
 *
 * So the tour is three passes over each state, and the third is a CRAWL rather
 * than a list — press what an add-on drew, look at what appears, press what
 * THAT drew. A surface added tomorrow behind a new button is toured tomorrow
 * with no edit here, which a list could never promise.
 *
 * `tour.test.tsx` is the other half: it reads the `Overlay` union out of the
 * store and fails if the tour opens fewer kinds than the app declares, so
 * adding an overlay and not touring it is red rather than invisible.
 */

/**
 * Every overlay this app can open, with a real subject, in the store's order.
 *
 * ── EVERY STRING IN A PAYLOAD IS ONE THE APP ITSELF PRODUCES ────────────────
 *
 * [Repaired 2026-08-11, round 6, in both hosts at once. The print works had the
 * worse case — two whole English sentences this suite invented for its
 * finish-reason overlay — and this one had the quieter one.]
 *
 * The last two entries named their add-ons as LITERALS: `"personalizer"` and
 * `"shipping-dhl"`. Both keys happen to be real today, which is exactly why it
 * would not have stayed noticed: rename an add-on, or vendor a different pair
 * into this studio, and `useAddOn` returns null, the dialog renders NOTHING, and
 * the tour goes on reporting that it opened the connect and disconnect overlays
 * in eight locales. A guard that reports an empty page as a visited surface is
 * the shape this wave keeps finding.
 *
 * They come off `DEMO_KEYS` now — the registry's own list, in the registry's own
 * order — which is the same source the print works has used since round 4.
 * `tour.test.tsx` holds the general rule: no string in any payload here may be
 * a literal this file made up.
 */
export function overlaysToTour(): { view: View; overlay: Overlay }[] {
  const order = useStore.getState().orders[0];
  const ref = order?.ref ?? "";
  const lineId = order?.lines[0]?.id ?? "";
  const first = DEMO_KEYS[0] ?? "";
  const second = DEMO_KEYS[1] ?? first;
  return [
    { view: "basket", overlay: { kind: "nav" } },
    { view: "product", overlay: { kind: "limit" } },
    { view: "makerorder", overlay: { kind: "proof", ref } },
    { view: "makerorder", overlay: { kind: "spoil", ref, lineId } },
    { view: "addons", overlay: { kind: "connect", addOn: first } },
    { view: "addons", overlay: { kind: "disconnect", addOn: second } },
  ];
}

/** A control a reader could press. Disabled ones are not surfaces. */
const PRESSABLE = "button:not([disabled]), [role='button']:not([aria-disabled='true'])";

/**
 * How a control is recognised across two renders of the same page.
 *
 * By what it SAYS plus which slot it sits in, because React rebuilds the nodes
 * on every state change and object identity does not survive that. Two controls
 * with the same words in the same slot are the same control to a reader too.
 */
function signatureOf(el: Element): string {
  const words = (el.textContent ?? "").replace(/\s+/g, " ").trim().slice(0, 40);
  const label = el.getAttribute("aria-label") ?? "";
  const mount = el.closest("[data-add-on-slot]")?.getAttribute("data-add-on-slot") ?? "";
  return `${mount}|${label}|${words}`;
}

/**
 * Press everything an add-on drew, and everything that appears when you do.
 *
 * SCOPED TO THE ADD-ON MOUNTS, deliberately. A crawl over the whole app would
 * be a different and much slower thing, and this shop's own surfaces are
 * already views the tour visits; what has no other way in is what an add-on
 * draws. Once a press has opened a surface the scope follows it — the editor a
 * fill opens is inside that fill's mount, and its controls are crawled next.
 *
 * ── IT REPLAYS THE PATH THAT REVEALED A CONTROL, WHICH IS ROUND 5's REPAIR ──
 *
 * The crawl used to gather a BATCH of controls, press the whole batch, then
 * gather again, five times. Three things followed and all three hid surfaces:
 *
 *   A surface opened mid-batch waits for the next gather, and everything else
 *   in the batch is pressed first — including whatever closes what the earlier
 *   press opened.
 *
 *   Five rounds was a DEPTH bound wearing a batch's clothes: three presses into
 *   a wizard is three rounds gone, and there were five.
 *
 *   AND ONE WALK IS NOT THE GRAPH — the one that actually cost this wave. A
 *   dialog puts its way OUT above its way ON, so a crawl that walks a page in
 *   order and never goes back presses the button that shuts a wizard before the
 *   one that opens its next screen. In the print works, which vendors this same
 *   crawl, that hid the Canva importer's design picker and its import check
 *   entirely — three and five presses in, with hard-coded English on them.
 *   Nothing reported it either: after the shutting press the button is not on
 *   the page, so it does not read as unpressed. THE COVERAGE LOOKED PERFECT.
 *
 * So this is a breadth-first search over PATHS, and each path is replayed from a
 * fresh render. Take a path off the queue, mount the app, press its signatures
 * in order, and you are standing on the state that path describes; read it,
 * then enqueue `path + [c]` for every control `c` on it that no path has pressed
 * yet. Reaching `[tile, Authorize, Allow]` costs three presses on a clean page
 * rather than three lucky guesses, and a control found four presses deep is
 * reached by construction rather than by ordering.
 *
 * The work is bounded by the number of DISTINCT controls, not by the number of
 * paths: a control is enqueued once, ever, so the queue cannot branch. There is
 * no vocabulary of "back" or "cancel" anywhere in this, and there must never be
 * — the reason the picker was missed is precisely that somebody would have had
 * to already know it was there.
 *
 * Bounded by a render budget so a suite cannot grind on a control that redraws
 * itself. The budget is REPORTED rather than swallowed — see `tour.test.tsx`.
 *
 * ── AND IT PRESSES ASYNCHRONOUSLY, WHICH IS THE WHOLE OF ROUND 5's REPAIR ───
 *
 * [2026-08-11.] The crawl used to be `act(() => control.click())` — SYNCHRONOUS
 * — and then read the page. Every surface it was written against opened
 * synchronously, from a `setState` in an `onClick`, so it worked and it was
 * believed.
 *
 * An `onClick` that AWAITS opens nothing by the time a synchronous `act`
 * returns. An add-on whose handler fetches before it draws — the Canva importer
 * in the print works is one, and nothing stops the next one here being another
 * — lands its state two microtask ticks after the press. The crawl clicked,
 * looked, saw the same page, and moved on, and three screens were outside every
 * tour in that repo while four rounds of hunting looked for exactly the kind of
 * defect they were hiding. Both were found by hand, which is the tell.
 *
 * So the press is awaited, and the microtask queue is drained inside the act
 * scope before anything reads the DOM. `tour.test.tsx` holds the line from the
 * other side: it fails if the crawl never reaches a named add-on surface.
 */
/** Every control an add-on drew, in DOM order, on the page as it stands now. */
function addOnControlsIn(host: HTMLElement): Element[] {
  const out: Element[] = [];
  for (const mount of host.querySelectorAll("[data-add-on-slot]")) {
    out.push(...mount.querySelectorAll(PRESSABLE));
  }
  return out;
}

/**
 * The controls on the page, each with the name a PATH calls it by.
 *
 * A signature plus which occurrence of that signature it is. The occurrence is
 * not decoration: a card and the panel that opens over it commonly reuse one
 * label, so the screen holds two controls with one signature and the one that
 * matters is the second. Replaying by signature alone resolves both to the
 * first, so the crawl presses the card's button again, reopens the panel it is
 * already looking at, and reports that it pressed the thing. In the print works
 * that made everything past a consent panel unreachable, and no budget and no
 * unpressed-control count said so.
 */
function stepsIn(host: HTMLElement): { el: Element; step: string }[] {
  const seen = new Map<string, number>();
  return addOnControlsIn(host).map((el) => {
    const signature = signatureOf(el);
    const nth = seen.get(signature) ?? 0;
    seen.set(signature, nth + 1);
    return { el, step: `${signature}#${nth}` };
  });
}

/** Press it, and let a handler that awaits its transport finish awaiting. */
async function press(control: Element): Promise<void> {
  await act(async () => {
    (control as HTMLElement).click();
    /*
     * `await act(async …)` is the part that matters — it is what lets a handler
     * that awaits its transport finish awaiting before anything reads the page.
     * Driven both ways: making this callback synchronous again drops the crawl
     * from five presses deep to four and `tour.test.tsx` goes red.
     *
     * The drain below is insurance rather than the fix, and removing it alone
     * changes nothing today. It is here for a handler with a longer chain of
     * awaits than React's own flushing happens to cover. A fixed number of ticks
     * and never a clock: nothing in this repo's demo transports uses a timer, and
     * a crawl that waited on one would be a crawl that could hang.
     */
    for (let tick = 0; tick < 8; tick += 1) await Promise.resolve();
  });
}

/**
 * WHICH SCREEN THIS IS, for the purpose of not walking it twice.
 *
 * The set of controls an add-on is currently showing. Two routes that arrive at
 * the same screen are one node and it is expanded once; two screens that happen
 * to share a button are still two nodes.
 *
 * A SIGNATURE ALONE WAS NOT ENOUGH, and finding that out cost two screens. The
 * print works' Canva connect card and the consent panel behind it both label
 * their button with one key — the same words, in the same slot, so the same
 * signature. A crawl that remembered signatures alone had already "pressed
 * Authorize" by the time the consent panel drew its own, skipped it, and never
 * learnt what lay behind it. Nothing looked wrong: every distinct signature had
 * been pressed, so the coverage read clean and the budget read unspent. That is
 * one more guard that was complete over the wrong set.
 */
function screenKeyOf(host: HTMLElement): string {
  return stepsIn(host)
    .map(({ step }) => step)
    .sort()
    .join("␟");
}

async function crawlAddOnSurfaces(
  mount: (visit: (host: HTMLElement) => Promise<void>) => Promise<void>,
  report: (surface: string, host: HTMLElement, depth: number) => void,
  left: (signature: string) => void,
): Promise<number> {
  /**
   * Paths still to walk, in two tiers.
   *
   * A path is the steps pressed to reach a state, and the tier is whether its
   * LAST step is a control this crawl has never pressed anywhere. That ordering
   * is what makes a bounded search find things: the budget is spent almost
   * entirely on edges that lead back to a screen already seen — pressing "Ink"
   * from six different screens is six renders and one screen — while a genuinely
   * new control sits in the queue behind them. Canva's consent panel is four
   * presses in and was not reached at a budget of 500 without this; with it, it
   * is reached in the first dozen.
   *
   * `stale` is walked, not dropped. Reaching the same screen by another route
   * can still reveal something, and the point of round 5 is that no ordering is
   * trusted to be the right one.
   */
  const fresh: string[][] = [[]];
  const stale: string[][] = [];
  /** Every step this crawl has ever queued, which is what makes a tier. */
  const everQueued = new Set<string>();
  /** Screens already expanded, and the presses already taken out of them. */
  const expanded = new Set<string>();
  const taken = new Set<string>();
  let renders = 0;
  let spent = false;
  /** How many presses in the crawl got, counting only paths it really walked. */
  let deepest = 0;

  while (fresh.length > 0 || stale.length > 0) {
    const path = (fresh.length > 0 ? fresh : stale).shift()!;
    if (path.length > MAX_DEPTH) continue;
    if (renders >= RENDER_BUDGET) {
      if (!spent) left(`${path.join(" › ")} (render budget spent)`);
      spent = true;
      continue;
    }
    renders += 1;

    await mount(async (host) => {
      // Replay. A path whose controls are no longer where they were is a path
      // into a state this app can no longer produce, and is dropped rather than
      // half-walked.
      for (const step of path) {
        const control = stepsIn(host).find((candidate) => candidate.step === step)?.el;
        if (control === undefined) return;
        await press(control);
      }
      /*
       * COUNTED HERE, on every path the crawl really walked to the end — not
       * only on the ones that turned out to show a screen it had not seen. A
       * flow's last press often lands somewhere familiar, and a depth counted
       * only on novelty would read as shallow while the crawl was going deep.
       */
      deepest = Math.max(deepest, path.length);
      /*
       * READ EACH SCREEN ONCE. Most paths land somewhere the crawl has already
       * stood — pressing "cancel" from six different places reaches one screen —
       * and handing the same DOM to the numerals and a11y visitors again finds
       * the same nothing at ten times the cost. The novelty test is the screen's
       * own control set, which is the same identity the search uses.
       */
      const screen = screenKeyOf(host);
      if (screen === "" || expanded.has(screen)) return;
      expanded.add(screen);
      if (path.length > 0) report(`click:${path[path.length - 1]!}`, host, path.length);

      for (const { step } of stepsIn(host)) {
        const edge = `${screen}⇒${step}`;
        if (taken.has(edge)) continue;
        taken.add(edge);
        (everQueued.has(step) ? stale : fresh).push([...path, step]);
        everQueued.add(step);
      }
    });
  }

  return deepest;
}

/**
 * THE TWO BOUNDS ON THE SEARCH, AND WHY THEY EXIST RATHER THAN NOT.
 *
 * A state-graph crawl over a real editor does not terminate in any useful time:
 * A drawing editor alone can put a hundred controls on a canvas and every colour,
 * every layer selection and every alignment is a different set of them, so the
 * screen count is combinatorial. Run unbounded, this crawl was still going after
 * ten minutes.
 *
 * So it is breadth-first and bounded, and BFS is the half that matters: every
 * screen five presses in is expanded before any screen six presses in. The
 * deepest add-on flow across the two shops costs five presses, and
 * `tour.test.tsx` asserts the crawl still reaches that far rather than trusting
 * these numbers to stay big enough on their own.
 *
 * Both bounds are REPORTED when they bind. A crawl that stopped because it was
 * told to is a crawl whose coverage is unknown, and it must not read the same as
 * one that finished.
 */
const RENDER_BUDGET = 400;
const MAX_DEPTH = 6;

export interface TourReport {
  /** Every view the tour rendered on its own. */
  views: View[];
  /** Every overlay kind the tour opened. */
  overlays: string[];
  /** Every surface a press opened, `click:<signature>`. */
  clicks: string[];
  /** Controls the crawl found and never pressed. Empty, or the crawl is a lie. */
  unpressed: string[];
  /**
   * THE DEEPEST PATH THE CRAWL ACTUALLY WALKED, in presses.
   *
   * The one number that says whether the crawl can still get INSIDE an add-on.
   * Both defects round 5 repaired in this file — a press that was not awaited,
   * and two buttons sharing a signature — showed up as nothing at all in the
   * counts above: every view toured, every overlay opened, no control left
   * unpressed, and the crawl had never gone more than two presses in. This is
   * what `tour.test.tsx` ratchets on.
   */
  deepest: number;
}

export async function tourEveryView(
  locale: LocaleTag,
  visit: (v: Visit) => void,
): Promise<TourReport> {
  (globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
  localStorage.setItem("maker-shop-locale", locale);
  // `go()` scrolls a real window back to the top; jsdom has no viewport and
  // says so, loudly, once per view change.
  window.scrollTo = () => {};
  stubWhatJsdomHasNot();

  const report: TourReport = { views: [], overlays: [], clicks: [], unpressed: [], deepest: 0 };

  for (const connected of [false, true]) {
    const reset = (): void => {
      useStore.setState({ enabled: new Set(), basket: [], overlay: { kind: "none" } });
      seedTheTour();
      /*
       * EVERY REGISTERED ADD-ON, off the registry's own list. These were two
       * literals — the same two keys the overlay list hard-coded — so a third
       * add-on vendored into this studio would have been switched OFF through
       * the whole "everything connected" pass while the report went on saying
       * it had toured it.
       */
      if (connected) {
        for (const key of DEMO_KEYS) useStore.getState().toggleAddOn(key);
      }
    };
    reset();

    for (const view of ALL_VIEWS) {
      act(() => {
        useStore.setState({ view, overlay: { kind: "none" }, loading: false });
      });
      await withApp((host) => {
        report.views.push(view);
        visit({ view, surface: "", connected, locale, host });
      });
    }

    /*
     * THE OVERLAYS. Set through the store's own field rather than by pressing
     * whatever opens each one: a sheet has to be visited whether or not the
     * button that opens it is on a page this pass reaches, and the subjects
     * come from the demo's own data so the sheets have something to render.
     */
    for (const { view, overlay } of overlaysToTour()) {
      act(() => {
        useStore.setState({ view, overlay, loading: false });
      });
      await withApp((host) => {
        report.overlays.push(overlay.kind);
        visit({ view, surface: `overlay:${overlay.kind}`, connected, locale, host });
      });
    }

    /*
     * AND WHAT A PRESS OPENS. Only worth doing with the add-ons on: with them
     * off there is nothing mounted to press, which the budget discovers in one
     * pass and no time at all.
     */
    for (const view of ALL_VIEWS) {
      const reached = await crawlAddOnSurfaces(
        async (walk) => {
          /*
           * A press may have switched an add-on off, emptied the basket or moved
           * a piece along. Every path is replayed onto the SAME shop, or the
           * state a path describes is not the state it reaches.
           */
          reset();
          act(() => {
            useStore.setState({ view, overlay: { kind: "none" }, loading: false });
          });
          await withApp(walk);
        },
        (surface, live) => {
          report.clicks.push(`${view} · ${surface}`);
          visit({ view, surface, connected, locale, host: live });
        },
        (signature) => report.unpressed.push(`${view} · ${signature}`),
      );
      report.deepest = Math.max(report.deepest, reached);
      reset();
    }
  }

  return report;
}
