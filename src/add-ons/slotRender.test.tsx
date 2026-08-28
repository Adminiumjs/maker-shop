/**
 * D19, ASSERTED BY RENDERING THE APP.
 *
 * @vitest-environment jsdom
 *
 * ── WHY THIS FILE HAD TO EXIST ────────────────────────────────────────────────
 *
 * `addOns.test.ts` said it held D19 and did not. Two holes, both proven with a
 * mutant before this suite was written:
 *
 *   1. THE EMPTY-STATE GUARD WAS A TABLE READ BACK TO ITSELF. It asserted that
 *      `SLOT_EMPTY_BEHAVIOUR` lists three slots as `speaks` and six as
 *      `silent` — which is a fact about a constant, not about the app. Adding
 *      `fallback={<SlotEmpty title="MUTANT" />}` to a SILENT slot in a real
 *      screen left the whole suite green. The rule D19 states is about what a
 *      person sees, and nothing in this repo had ever rendered a screen.
 *
 *   2. "MOUNTS EVERY ID IT HOSTS" WAS A GREP FOR `slot="…"` OVER THE SOURCES.
 *      A mount inside a comment satisfied it — also proven. The check existed
 *      because `printing` once declared a slot nothing drew; a grep a comment
 *      can satisfy would not have caught that either.
 *
 * ── HOW IT IS ASSERTED NOW ────────────────────────────────────────────────────
 *
 * Every host screen that mounts a slot is RENDERED INTO A DOM, twice: once with
 * nothing connected (the state a reviewer meets) and once with both add-ons
 * switched on. `AddOnSlot` is replaced with a recorder, so what is collected is
 * the mounts React actually reached — a mount in a comment, behind a condition
 * that is never true, or in a file nobody renders records nothing and fails.
 *
 * For each mount the recorder keeps the `fallback` NODE, and the assertions
 * then RENDER it: a silent slot whose empty state produces so much as one byte
 * of markup is a failure. That is the mutant, caught by the thing it broke.
 *
 * ── AND WHAT THAT STILL COULD NOT SEE (MUTANT B) ─────────────────────────────
 *
 * [Amended 2026-08-11, wave 4b round 2.] Everything above inspects ONE PROP.
 * A verifier put the original defect back verbatim as a SIBLING of the silent
 * `product.admin.panel` mount in `Pieces.tsx` —
 *
 *     <div className="br-slot-line">Nothing else is connected yet.</div>
 *
 * — and the whole suite stayed green, because a sibling is not a `fallback` and
 * nothing here had ever looked at the page. D19 is a rule about WHAT A PERSON
 * SEES where a slot is, not about an argument passed to a component.
 *
 * So the recorder now renders a marker into the page as well as recording, the
 * assertions below find that marker in the real DOM, and the rule they state is
 * the one the original defect broke: WITH NOTHING CONNECTED, NOTHING THE HOST
 * DRAWS MAY FOLLOW A SILENT SLOT'S MOUNT INSIDE ITS CONTAINER unless it is a
 * control the maker can use.
 *
 * Why "follows", and why that is a real rule rather than a rule shaped to the
 * mutant: a mount is where an add-on's panel APPEARS. Words the host prints
 * underneath it sit beneath whatever the add-on drew the moment one is switched
 * on, captioning something the host cannot see — which is exactly how the
 * removed line went wrong (`Pieces.tsx` records it). A control below it is a
 * thing to press rather than a caption, so it is not banned.
 *
 * ── AND THE HOLE THAT ADMISSION LEFT (MUTANT C) ─────────────────────────────
 *
 * [Amended 2026-08-11, wave 4b round 3.] This header used to end by saying,
 * plainly, that a placeholder written ABOVE a mount would pass, on the grounds
 * that words above a mount read as the section's own heading. A verifier wrote
 * `<div className="br-slot-line">No add-ons here yet.</div>` above the
 * `nav.add-on.routes` mount and the suite stayed green — a documented hole
 * exactly the size of the defect being guarded, which is a note about a guard
 * rather than a guard.
 *
 * The old reasoning was right about headings and wrong about everything else,
 * so the rule now says what the reasoning actually supports: the sibling
 * IMMEDIATELY BEFORE a silent mount may be a HEADING (a heading tag, or the
 * classes this app's stylesheet gives one) or a control, and may not be a bare
 * paragraph of prose. Only the immediate neighbour, because content further up
 * a container is the section's own body and reading it would ban a panel from
 * having one — which is what made the original author leave this alone.
 *
 * WHAT IT STILL DOES NOT CATCH, said plainly: a placeholder that is a button,
 * and a placeholder disguised as a heading. Neither is a shape this app has got
 * wrong, and banning either would fail on content that is simply content.
 *
 * WHY A DOM AND NOT `renderToStaticMarkup`. Server rendering was tried first
 * and is quietly useless here: zustand v5 serves `getInitialState()` as its
 * server snapshot, so every screen rendered the state the store was BORN in and
 * no amount of driving the store had any effect. Eight of the nine mounts
 * simply never appeared. `jsdom` is a devDependency, it does not ship, and the
 * alternative was a suite that passed by rendering the wrong app.
 */

import { readFileSync } from "node:fs";
import { join } from "node:path";

import { act, type ReactNode } from "react";
import { createRoot } from "react-dom/client";
import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

import { HOSTED_SLOTS, SLOT_EMPTY_BEHAVIOUR, type HostedSlotId } from "./slots.ts";
import { ORDERS } from "../data/demo.ts";
import { I18nProvider } from "../i18n/index.tsx";
import { AddOnRouteScreen } from "../screens/AddOnRoute.tsx";
import { AddOnsScreen } from "../screens/AddOns.tsx";
import { BasketScreen, CheckoutScreen } from "../screens/Basket.tsx";
import { MakerOrderScreen } from "../screens/MakerOrder.tsx";
import { OrderScreen } from "../screens/Order.tsx";
import { PieceScreen } from "../screens/Pieces.tsx";
import { ProductScreen } from "../screens/Shop.tsx";
import { useStore } from "../state/store.ts";

/**
 * The recorder, hoisted so `vi.mock` — which runs before the imports — can
 * close over it.
 */
const { mounts } = vi.hoisted(() => ({
  mounts: [] as { slot: string; fallback: ReactNode | undefined; payload: unknown }[],
}));

/**
 * The one component every fill reaches the page through, replaced by a spy.
 *
 * It renders NOTHING and records instead. Rendering nothing is deliberate: this
 * suite is about the mount sites a screen offers and the empty states it hands
 * them, not about what an add-on draws — the fills have their own suites in
 * their own packages, and letting them render here would make a screen's D19
 * behaviour depend on which add-ons happened to be vendored.
 */
vi.mock("../components/AddOnSlot.tsx", () => ({
  AddOnSlot: (props: { slot: string; fallback?: ReactNode; payload?: unknown }) => {
    mounts.push({ slot: props.slot, fallback: props.fallback, payload: props.payload });
    /*
     * A MARKER, not nothing. It draws no words and takes no space (`hidden`),
     * so it cannot be mistaken for what an add-on would have drawn — its whole
     * job is to be findable in the page, so the assertions below can ask what
     * the host put NEXT TO the mount rather than only what it passed to it.
     * That is the difference between reading a prop and reading the screen.
     */
    return <div hidden data-slot-mount={props.slot} />;
  },
}));

beforeAll(() => {
  (globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
  // Pinned so the suite reads one language rather than the machine's.
  localStorage.setItem("maker-shop-locale", "en-US");
  // `go()` scrolls a real window back to the top. jsdom has no viewport to
  // scroll and says so, loudly, once per view change.
  window.scrollTo = () => {};
});

/**
 * Mount, read what the browser would have, unmount.
 *
 * `inspect` runs while the tree is still ON THE PAGE, which is the only moment
 * a question about the markup AROUND a mount can be asked: `innerHTML` is a
 * string and knows nothing about siblings.
 */
function render(node: ReactNode, inspect?: (host: HTMLElement) => void): string {
  const host = document.createElement("div");
  document.body.appendChild(host);
  const root = createRoot(host);
  act(() => {
    root.render(<I18nProvider>{node}</I18nProvider>);
  });
  const html = host.innerHTML;
  inspect?.(host);
  act(() => {
    root.unmount();
  });
  host.remove();
  return html;
}

/**
 * Every screen in this app that mounts a slot, with whatever state it takes to
 * reach the mount — an open piece, a basket with something in it, an order
 * looked up. Each one is driven through the store's OWN actions rather than by
 * writing state in by hand, so a screen that quietly started rendering its
 * "nothing here yet" state instead would stop recording and fail.
 */
function renderEveryHostSurface(inspect?: (host: HTMLElement) => void): void {
  const order = ORDERS[0]!;
  const store = () => useStore.getState();

  // A piece that takes engraving, so the personalization block is on the page.
  store().openProduct("walnut-coasters");
  render(<ProductScreen />, inspect);

  store().addToBasket();
  render(<BasketScreen />, inspect);
  render(<CheckoutScreen />, inspect);

  store().setLookup({ ref: order.ref, email: order.email });
  store().doLookup();
  render(<OrderScreen />, inspect);

  store().openMakerOrder(order.ref);
  render(<MakerOrderScreen />, inspect);

  store().openPiece("walnut-coasters");
  render(<PieceScreen />, inspect);

  render(<AddOnsScreen />, inspect);
  render(<AddOnRouteScreen />, inspect);
}

/** Both passes a reviewer can be in: nothing connected, then everything. */
function renderBothStates(): void {
  useStore.setState({ enabled: new Set() });
  renderEveryHostSurface();
  useStore.getState().toggleAddOn("personalizer");
  useStore.getState().toggleAddOn("shipping-dhl");
  renderEveryHostSurface();
}

const seen = (slot: string) => mounts.filter((m) => m.slot === slot);
const emptyStateOf = (mount: { fallback: ReactNode | undefined }) =>
  mount.fallback === undefined ? "" : render(<>{mount.fallback}</>);

beforeEach(() => {
  mounts.length = 0;
  useStore.setState({ enabled: new Set(), basket: [] });
});

describe("every slot this app hosts is really mounted (24 §5.4, D19)", () => {
  it("reaches all ten mounts across the two states a reviewer can be in", () => {
    /*
     * Two passes, because one of the ten is only reachable in the second.
     * `settings.add-on.panel` lives inside the manage drawer of a CONNECTED
     * add-on, so a shop with nothing switched on never draws it — which is
     * correct behaviour, and would have made a one-pass check demand a mount
     * the app is right not to render.
     *
     * [Amended 2026-08-28, 31-T11.] Nine became ten with `record.actions`, at
     * the foot of a piece's own screen. `PieceScreen` was already in the tour
     * below for `product.admin.panel`, so the new mount arrived under a check
     * that was already looking at that page — which is the reason a render is
     * worth more than a grep: the count moved on its own the moment the mount
     * was real, and would have stayed at nine for a mount in a comment.
     */
    renderEveryHostSurface();
    const withNothingOn = new Set(mounts.map((m) => m.slot));

    useStore.getState().toggleAddOn("personalizer");
    useStore.getState().toggleAddOn("shipping-dhl");
    renderEveryHostSurface();

    expect([...new Set(mounts.map((m) => m.slot))].sort()).toEqual([...HOSTED_SLOTS].sort());
    // And nine of the ten are there before anybody connects anything.
    expect([...withNothingOn].sort()).toEqual(
      [...HOSTED_SLOTS].filter((s) => s !== "settings.add-on.panel").sort(),
    );
  });

  it("would not accept a mount that only exists in a comment", () => {
    /*
     * The proof this is a render and not a grep. The old guard searched the
     * sources for `slot="…"`, so a commented-out mount satisfied it; nothing
     * here can be satisfied by text, because a slot is recorded only when React
     * calls the component.
     *
     * These two ids appear in `slots.ts`, in this app's prose and in its
     * suites, and are drawn nowhere.
     */
    renderBothStates();
    const rendered = new Set(mounts.map((m) => m.slot));
    expect(rendered.has("record.editor.panel")).toBe(false);
    expect(rendered.has("artwork.sources")).toBe(false);
  });
});

describe("A SILENT SLOT RENDERS NOTHING AT ALL (24 D19)", () => {
  beforeEach(() => {
    renderBothStates();
  });

  /*
   * WHAT THIS REACHES, SAID PLAINLY. `cart.line.preview` is mounted three times
   * and only the BASKET's mount is on a screen this suite drives; the shopper's
   * order page and the maker's send-a-proof dialog pass the material TILE as a
   * fallback — the picture this app has always drawn there — and would fail the
   * check below if they were reached. That is a table with two values against
   * three behaviours rather than a defect on a screen; `slots.ts` records the
   * decision beside the entry.
   */
  it("draws not one byte where a slot is declared silent", () => {
    const noisy: string[] = [];
    for (const mount of mounts) {
      if (SLOT_EMPTY_BEHAVIOUR[mount.slot as HostedSlotId] !== "silent") continue;
      const markup = emptyStateOf(mount);
      if (markup !== "") noisy.push(`${mount.slot} · ${markup.slice(0, 120)}`);
    }
    expect(noisy).toEqual([]);
  });

  it("gives every slot declared speaking a real empty state in words", () => {
    /*
     * The other half of the rule, and not symmetry for its own sake: a `speaks`
     * slot that quietly stopped passing a fallback would leave a hole where the
     * till used to say whose postage those options are, and the silent check
     * above would be perfectly happy about it.
     */
    const mute: string[] = [];
    for (const slot of HOSTED_SLOTS) {
      if (SLOT_EMPTY_BEHAVIOUR[slot] !== "speaks") continue;
      const found = seen(slot);
      expect({ slot, mounted: found.length > 0 }).toEqual({ slot, mounted: true });
      for (const mount of found) {
        // Words, not a box: something a person can read has to come back.
        const words = emptyStateOf(mount).replace(/<[^>]*>/g, "");
        if (!/\p{L}{4}/u.test(words)) mute.push(`${slot} · ${words}`);
      }
    }
    expect(mute).toEqual([]);
  });

  it("says the same thing whether or not an add-on is connected", () => {
    /*
     * A slot's empty state is a property of the SCREEN, not of what happens to
     * be plugged in. Both passes are in `mounts`, so a fallback that appeared
     * or vanished when the dock was toggled shows up here as two different
     * renderings of the same slot.
     */
    const drifted: string[] = [];
    for (const slot of new Set(mounts.map((m) => m.slot))) {
      const renderings = new Set(seen(slot).map(emptyStateOf));
      if (renderings.size > 1) drifted.push(`${slot} · ${renderings.size} different empty states`);
    }
    expect(drifted).toEqual([]);
  });
});

/**
 * The words a control carries are a thing to press, not a caption. Anything
 * whose subtree holds one is content in its own right.
 */
const CONTROLS = "button, a, input, select, textarea, label, [role='button'], [role='link']";

/**
 * WHAT A CAPTION WOULD BE PRESSED AGAINST — the mount, or the wrapper that
 * stands for it.
 *
 * ── THE ASYMMETRY THE ABOVE/BELOW REPAIR DID NOT CLOSE ──────────────────────
 *
 * This file already tells prose above a mount from prose below it. Both halves
 * asked about the mount's OWN siblings, and a mount wrapped in a `<div>` of its
 * own has none: `mount.nextSibling` and `mount.previousSibling` are both
 * `null`, so a caption pressed against the WRAPPER was invisible from both
 * directions at once. Wrapping a mount for layout is an ordinary thing to do,
 * which is what makes it worth closing — a stylesheet change could reopen the
 * defect with nobody touching a sentence.
 *
 * So the anchor climbs while the parent holds nothing else that speaks. A
 * wrapper around one silent thing IS that thing, positionally, and what sits
 * beside it sits beside the mount. It stops the moment the parent has content
 * of its own, because that is the panel the mount lives in and not a wrapper.
 */
function anchorOf(mount: Element): Element {
  let node = mount;
  for (let up = 0; up < 5; up += 1) {
    const parent = node.parentElement;
    if (parent === null || parent.hasAttribute("data-slot-mount")) return node;
    const speaksOtherwise = [...parent.childNodes].some(
      (child) => child !== node && (child.textContent ?? "").trim() !== "",
    );
    if (speaksOtherwise) return node;
    node = parent;
  }
  return node;
}

/**
 * Everything the host draws AFTER a mount, inside the mount's own container,
 * that is a bare run of words.
 *
 * Text nodes count as well as elements: `{" "}` between two blocks is nothing,
 * but a sentence typed straight into the JSX is the same defect without a
 * wrapper, and reading only elements would miss it.
 */
function captionsUnder(mount: Element): string[] {
  const out: string[] = [];
  for (let node = anchorOf(mount).nextSibling; node !== null; node = node.nextSibling) {
    if (node.nodeType === Node.TEXT_NODE) {
      const words = (node.textContent ?? "").trim();
      if (words !== "") out.push(words);
      continue;
    }
    if (node.nodeType !== Node.ELEMENT_NODE) continue;
    const el = node as Element;
    if (el.hasAttribute("hidden")) continue; // another mount's marker
    const words = (el.textContent ?? "").replace(/\s+/g, " ").trim();
    if (words === "") continue;
    if (el.matches(CONTROLS) || el.querySelector(CONTROLS) !== null) continue;
    out.push(`<${el.tagName.toLowerCase()} class="${el.getAttribute("class") ?? ""}"> ${words}`);
  }
  return out;
}

/**
 * What this app's own markup uses to say "this is a heading".
 *
 * Real tags, plus the two classes the stylesheet gives the small capitalised
 * label above a block. A heading is the one kind of prose that legitimately
 * sits above a mount, so it has to be recognisable to a machine — and it is,
 * because a heading is a styled thing rather than a sentence in a `<div>`.
 */
const HEADINGS = "h1, h2, h3, h4, h5, h6, .br-eyebrow, .br-section-title, .br-panel-title, legend";

/**
 * Is this element ONE RUN OF WORDS, rather than a block of structured content?
 *
 * The distinction the "above" rule turns on, and it is a structural one rather
 * than a judgement about tone. A placeholder is a sentence: its words live in a
 * single text run, however many wrappers are around it. A panel's real content
 * — the chips reading "Walnut · Standard · Oiled", the rate table, the facts
 * grid — spreads its words across SIBLING elements, because it is a list of
 * separate things and is marked up as one.
 *
 * So: two or more element children carrying text means content, and this
 * returns false. One means a wrapper, and it looks inside. None means the words
 * are the element's own, which is a line of prose.
 */
function isBareProse(el: Element): boolean {
  const speaking = [...el.children].filter((child) => (child.textContent ?? "").trim() !== "");
  if (speaking.length >= 2) return false;
  if (speaking.length === 1) return isBareProse(speaking[0]!);
  return true;
}

/**
 * ── THE HOLE THE SIBLING GUARD DOCUMENTED, NOW CLOSED ───────────────────────
 *
 * This file used to say, honestly, that a placeholder written ABOVE a silent
 * mount would pass, and gave a defensible reason: words above a mount read as
 * the section's heading, so banning them would fail on content that is simply
 * content. A verifier then wrote
 *
 *     <div className="br-slot-line">No add-ons here yet.</div>
 *
 * immediately before the `nav.add-on.routes` mount and the suite stayed green.
 * A documented hole exactly the size of the defect being guarded is not a
 * guard; it is a note about one.
 *
 * The reason the hole was left open was right about HEADINGS and wrong about
 * everything else. So the rule is narrowed to what the reason actually
 * supports: the sibling IMMEDIATELY BEFORE a silent mount may be a heading, a
 * control, or a block of structured content — but a bare line of prose pressed
 * against the mount is a caption that happens to be on the other side of it,
 * and it is caught here.
 *
 * Three exemptions, each of which a real screen in this app needs:
 *
 *   A HEADING is what the mounted thing is CALLED. That was the original
 *   argument for leaving "above" alone and it is still right.
 *
 *   A CONTROL is a thing to press, exactly as it is below the mount.
 *
 *   STRUCTURED CONTENT is a panel's own body, and the mount is simply the next
 *   thing in the panel. `br-line-chips` ("Walnut · Standard · Oiled"), the rate
 *   table above the dispatch actions and the facts grid above the piece's
 *   admin panel are all real screens doing this, and all three spread their
 *   words across sibling elements — see `isBareProse`, which is where the line
 *   between the two is drawn.
 *
 * Only the immediate neighbour, deliberately. Content further up the container
 * is the section's own body and has nothing to do with the slot; reading all of
 * it would ban a panel from having one, which is what made the original author
 * leave this alone. The defect shape — and every plausible version of it — is a
 * line touching the mount.
 */
function nearestProse(mount: Element, step: (node: Node) => Node | null): string[] {
  for (let node = step(anchorOf(mount)); node !== null; node = step(node)) {
    if (node.nodeType === Node.TEXT_NODE) {
      const words = (node.textContent ?? "").trim();
      if (words === "") continue;
      return [words];
    }
    if (node.nodeType !== Node.ELEMENT_NODE) continue;
    const el = node as Element;
    if (el.hasAttribute("hidden")) continue; // another mount's marker
    const words = (el.textContent ?? "").replace(/\s+/g, " ").trim();
    if (words === "") continue;
    if (el.matches(HEADINGS) || el.querySelector(HEADINGS) !== null) return [];
    if (el.matches(CONTROLS) || el.querySelector(CONTROLS) !== null) return [];
    if (!isBareProse(el)) return [];
    return [`<${el.tagName.toLowerCase()} class="${el.getAttribute("class") ?? ""}"> ${words}`];
  }
  return [];
}

const captionAbove = (mount: Element): string[] =>
  nearestProse(mount, (node) => node.previousSibling);

/**
 * A bare line of words TOUCHING a mount on either side.
 *
 * The rule that holds for every slot, silent or speaking. `captionsUnder`
 * above is stricter and stays that way for the silent ones — a silent mount
 * with nothing connected leaves a container that should hold nothing at all,
 * so structured content below it is a defect there too. A speaking slot sits in
 * the middle of a page that has plenty else to say, and the only thing wrong
 * next to it is a sentence about the slot.
 */
function captionsTouching(mount: Element): string[] {
  return [
    ...captionAbove(mount).map((line) => `above · ${line}`),
    ...nearestProse(mount, (node) => node.nextSibling).map((line) => `below · ${line}`),
  ];
}

/** Both sides of a silent mount: a caption above, and anything at all below. */
function captionsAround(mount: Element): string[] {
  return [...captionAbove(mount).map((line) => `above · ${line}`), ...captionsUnder(mount)];
}

describe("NOTHING THE HOST DRAWS SITS UNDER A SILENT SLOT (24 D19, mutant B)", () => {
  it("finds every silent mount on the page and nothing captioning it", () => {
    /*
     * THE STATE THE RULE IS ABOUT: nothing connected. That is the shop a
     * reviewer opens, and the one D19 promises is a finished thing rather than
     * a set of gaps waiting to be filled.
     *
     * It also happens to be the state in which the rule is clean. Connect an
     * add-on and the manage drawer prints, under its settings panel, the
     * sentence naming what a disconnect takes and keeps (D16) — words under a
     * mount, correctly, because they are about the add-on that is there. A rule
     * scoped to the empty shop needs no carve-out for it, and a carve-out list
     * is the thing that makes a gate stop being one.
     */
    useStore.setState({ enabled: new Set(), basket: [] });

    const found: string[] = [];
    const captioned: string[] = [];

    renderEveryHostSurface((host) => {
      for (const mount of host.querySelectorAll("[data-slot-mount]")) {
        const slot = mount.getAttribute("data-slot-mount") as HostedSlotId;
        if (SLOT_EMPTY_BEHAVIOUR[slot] !== "silent") continue;
        found.push(slot);
        for (const caption of captionsAround(mount)) captioned.push(`${slot} · ${caption}`);
      }
    });

    // The guard has to have SEEN something, or an empty result reads as a pass.
    // Every silent slot but the drawer's own panel is on a page here.
    expect([...new Set(found)].sort()).toEqual(
      [...HOSTED_SLOTS].filter(
        (slot) => SLOT_EMPTY_BEHAVIOUR[slot] === "silent" && slot !== "settings.add-on.panel",
      ).sort(),
    );

    expect(captioned).toEqual([]);
  });

  /**
   * AND THE SAME RULE FOR A SLOT THAT SPEAKS, because the defect does not care
   * which kind it is standing next to.
   *
   * `product.options.personalize` is declared `speaks`, and the shopper's
   * product page carried, directly under its mount and unconditionally:
   *
   *     <div className="br-slot-line">This is the only part of this page an
   *     add-on changes.</div>
   *
   * Byte for byte the markup of mutant B, on a customer-facing page, escaping
   * the check above only because that check was scoped to silent slots. That
   * scope was never part of the reasoning: the argument for the rule is that
   * words touching a mount caption whatever the ADD-ON drew there once one is
   * connected, and an add-on's panel replaces a speaking slot's empty state
   * just as completely as it fills a silent one.
   *
   * So the sibling rule is stated over EVERY mount. The state is still the
   * empty shop — see the case above on why connecting one legitimately puts
   * D16's sentence under the manage drawer's own panel.
   */
  it("holds for every mount on the page, speaking ones included", () => {
    useStore.setState({ enabled: new Set(), basket: [] });

    const found = new Set<string>();
    const captioned: string[] = [];

    renderEveryHostSurface((host) => {
      for (const mount of host.querySelectorAll("[data-slot-mount]")) {
        const slot = mount.getAttribute("data-slot-mount")!;
        found.add(slot);
        for (const caption of captionsTouching(mount)) captioned.push(`${slot} · ${caption}`);
      }
    });

    // Nine of the ten; the drawer's own panel needs a connected add-on.
    expect([...found].sort()).toEqual(
      [...HOSTED_SLOTS].filter((slot) => slot !== "settings.add-on.panel").sort(),
    );
    expect(captioned).toEqual([]);
  });

  /**
   * THE MUTANT, KEPT.
   *
   * A verifier re-added the removed placeholder as a sibling of the silent
   * `product.admin.panel` mount in `Pieces.tsx` and the suite stayed green,
   * because every assertion in this file read the `fallback` prop. This case
   * drives the detector over that exact markup so a reader can see the check
   * separating the two rather than take the claim on trust — and so that
   * loosening `captionsUnder` fails here immediately.
   */
  it("separates a caption under the mount from the content around it", () => {
    const host = document.createElement("div");
    host.innerHTML = [
      '<div class="br-panel">',
      '  <div class="br-facts"><span>Character limit</span><span>18</span></div>',
      '  <div hidden data-slot-mount="product.admin.panel"></div>',
      "</div>",
    ].join("");
    const clean = host.querySelector("[data-slot-mount]")!;
    expect(captionsUnder(clean)).toEqual([]);

    // The mutant, verbatim.
    const line = document.createElement("div");
    line.className = "br-slot-line";
    line.textContent = "Nothing else is connected yet.";
    clean.parentElement!.appendChild(line);
    expect(captionsUnder(clean)).toEqual([
      '<div class="br-slot-line"> Nothing else is connected yet.',
    ]);

    // And a control underneath is content, not a caption.
    line.remove();
    const action = document.createElement("div");
    action.innerHTML = "<button>Book a collection</button>";
    clean.parentElement!.appendChild(action);
    expect(captionsUnder(clean)).toEqual([]);
  });

  /**
   * THE SECOND MUTANT, THE ONE THIS FILE USED TO ADMIT IT COULD NOT SEE.
   *
   * A verifier put the placeholder ABOVE the `nav.add-on.routes` mount instead
   * of below it and the suite stayed green. `captionAbove` is the answer, and
   * this case drives it over the three shapes that matter so the distinction it
   * draws is visible rather than asserted: a heading above a mount is a
   * heading, a control is a control, and a bare line of prose pressed against
   * the mount is the defect wherever it is written.
   */
  it("separates a heading above the mount from a placeholder above it", () => {
    const host = document.createElement("div");
    host.innerHTML = [
      '<div class="br-panel">',
      '  <div class="br-eyebrow">Where it is going</div>',
      '  <div hidden data-slot-mount="nav.add-on.routes"></div>',
      "</div>",
    ].join("");
    const mount = host.querySelector("[data-slot-mount]")!;
    // A heading is what the mounted thing is called, not a caption for it.
    expect(captionAbove(mount)).toEqual([]);

    // The mutant, verbatim.
    const line = document.createElement("div");
    line.className = "br-slot-line";
    line.textContent = "No add-ons here yet.";
    mount.parentElement!.insertBefore(line, mount);
    expect(captionAbove(mount)).toEqual(['<div class="br-slot-line"> No add-ons here yet.']);
    expect(captionsAround(mount)).toEqual([
      'above · <div class="br-slot-line"> No add-ons here yet.',
    ]);

    // A control immediately above is a thing to press, not a caption.
    line.remove();
    const action = document.createElement("div");
    action.innerHTML = "<button>Connect one</button>";
    mount.parentElement!.insertBefore(action, mount);
    expect(captionAbove(mount)).toEqual([]);
  });

  /**
   * THE THIRD MUTANT, AND THE DIRECTION NEITHER HOST HAD CLOSED.
   *
   * The above/below repair fixed the side the sentence was on and left the
   * NESTING alone. A mount wrapped in a `<div>` of its own has no siblings, so
   * a caption pressed against that wrapper was invisible from both directions
   * — the same defect, one level out, in both apps at once. `anchorOf` is the
   * answer and this drives it.
   */
  it("sees a caption pressed against a wrapper that holds only the mount", () => {
    const host = document.createElement("div");
    host.innerHTML = [
      '<div class="br-panel">',
      '  <div class="br-slot-line">No add-ons here yet.</div>',
      '  <div class="br-routes"><div hidden data-slot-mount="nav.add-on.routes"></div></div>',
      "</div>",
    ].join("");
    const mount = host.querySelector("[data-slot-mount]")!;
    // The mount itself has no siblings at all — which is the whole hole.
    expect(mount.previousSibling).toBeNull();
    expect(captionAbove(mount)).toEqual([
      '<div class="br-slot-line"> No add-ons here yet.',
    ]);

    // …and a container that holds the mount AND content of its own is a panel,
    // not a wrapper: the mount's own neighbours are what count again.
    const panel = document.createElement("div");
    panel.innerHTML = [
      '<div class="br-slot-line">A caption on the panel.</div>',
      '<div class="br-routes"><div class="br-eyebrow">Where it is going</div>',
      '<div hidden data-slot-mount="nav.add-on.routes"></div></div>',
    ].join("");
    const nested = panel.querySelector("[data-slot-mount]")!;
    expect(captionAbove(nested)).toEqual([]);
  });
});


/**
 * WHAT A SINGLE SLOT TAKES AWAY WHEN IT IS FILLED, AND WHAT IT MUST HAND OVER.
 *
 * `product.options.personalize` is `single`: a mounted fill replaces this app's
 * own block wholesale. That block is three parts — the note field, the maker's
 * instructions for the piece, and the promise that a picture comes back before
 * anything is made — and the Live Personalizer's no-template fallback was
 * rendering a field and one sentence of its own, so connecting the add-on took
 * the studio's own words off ten of its twelve personalizable pieces.
 *
 * An add-on cannot write those sentences: they are this shop's copy about this
 * shop's process. So the payload carries them (`hostSays`), and this is the
 * half of that repair that lives HERE — the screen still has to hand them over.
 * The add-on's own suite asserts they come out the other side.
 */
describe("a single slot hands over what it is replacing", () => {
  it("passes the maker's instructions and the proof promise with the payload", () => {
    useStore.setState({ enabled: new Set() });
    useStore.getState().openProduct("walnut-coasters");
    render(<ProductScreen />);

    const mount = mounts.find((m) => m.slot === "product.options.personalize");
    expect(mount, "the personalize slot was never mounted").toBeDefined();

    const says = (mount!.payload as { hostSays?: readonly string[] }).hostSays;
    expect(says, "the screen hands an add-on nothing of what it is replacing").toBeDefined();
    expect(says!.length).toBe(2);
    // Real sentences in the reader's language, not keys and not empties.
    for (const line of says!) expect(line).toMatch(/\p{L}{4}[\s\S]{20,}/u);
    // The block's own two, so a fill that renders them renders what was there.
    const fallback = render(<>{mount!.fallback}</>).replace(/<[^>]*>/g, " ");
    for (const line of says!) {
      expect(fallback.replace(/\s+/g, " ")).toContain(line.replace(/\s+/g, " "));
    }
  });
});

describe("the component that decides it", () => {
  it("keeps the host's own content when a fill has nothing to draw", async () => {
    /*
     * "NOTHING FILLS THIS SLOT" AND "THE FILL HAD NOTHING TO DRAW" ARE TWO
     * THINGS, and treating them as one put an empty box on a real screen.
     *
     * The personalizer registers a `cart.line.preview` fill and correctly draws
     * nothing for a piece it has no areas for — ten of this studio's twelve
     * personalizable pieces. `AddOnSlot` used to return the fallback only when
     * `fills.length === 0`, so the maker's send-a-proof dialog went from a
     * material tile to a nought-by-nought div the moment the add-on was
     * connected: CONNECTING AN ADD-ON TOOK A PICTURE AWAY.
     *
     * The host cannot ask an add-on whether it has anything for a record, so
     * the fallback is rendered anyway and the stylesheet decides. This asserts
     * the two halves that make that work: the fallback is IN the tree, and it
     * is LAST — the sibling rule reaches it no other way.
     */
    const actual = await vi.importActual<typeof import("../components/AddOnSlot.tsx")>(
      "../components/AddOnSlot.tsx",
    );
    const Slot = actual.AddOnSlot as (props: {
      slot: HostedSlotId;
      payload: unknown;
      fallback?: ReactNode;
    }) => ReactNode;

    useStore.getState().toggleAddOn("personalizer");

    const host = document.createElement("div");
    document.body.appendChild(host);
    const root = createRoot(host);
    act(() => {
      root.render(
        <I18nProvider>
          <Slot
            slot="cart.line.preview"
            // A herb pot: the studio does not personalize it, so the fill has
            // nothing to draw and renders null.
            payload={{ line: { id: "x", key: "herb-pot", label: "Printed herb pot", quantity: 1, note: "" } }}
            fallback={<span data-host-tile>the studio's own picture</span>}
          />
        </I18nProvider>,
      );
    });

    const fill = host.querySelector(".br-slot-fill");
    const spare = host.querySelector(".br-slot-spare");
    expect(fill, "the add-on's fill is mounted").not.toBeNull();
    expect(fill!.innerHTML, "and it drew nothing for this piece").toBe("");
    expect(spare, "the host's own content is still in the tree").not.toBeNull();
    expect(spare!.querySelector("[data-host-tile]")).not.toBeNull();
    // LAST, because `.br-slot-fill:not(:empty) ~ .br-slot-spare` is a sibling
    // rule: put the spare first and it stops being reachable and the picture
    // doubles up wherever a fill DOES draw.
    expect(host.firstElementChild!.lastElementChild ?? spare!.parentElement!.lastElementChild).toBe(
      spare,
    );

    act(() => {
      root.unmount();
    });
    host.remove();
  });

  /**
   * ── AND THE SAME THING FOR A FILL THAT DREW NOTHING WITHOUT RETURNING NULL ──
   *
   * [Added 2026-08-11, round 6, in both hosts at once.] The case above is the
   * one shape `:empty` gets right. This is the shape it gets WRONG, and it is
   * the reported defect: a fill that returns a wrapper — a bare `<div/>`, or one
   * whose only child is `display: none` — has child nodes, so
   * `.br-slot-fill:not(:empty)` matched and the studio's own picture was hidden
   * on its behalf. Connecting an add-on still took the picture away, one level
   * down from where round 2 stopped.
   *
   * `SlotFill` marks the wrapper `data-drew="none"` and the stylesheet's second
   * condition reads it. jsdom applies no stylesheet, so what is asserted here is
   * the ATTRIBUTE — and the case below asserts the selector that consumes it.
   */
  it.each([
    { what: "a bare wrapper", render: () => <div /> },
    {
      what: "a wrapper whose only child is hidden",
      render: () => (
        <div>
          <span style={{ display: "none" }}>a preview it has nothing for</span>
        </div>
      ),
    },
  ])("keeps it when the fill drew nothing but emitted $what", async ({ render }) => {
    const actual = await vi.importActual<typeof import("../components/AddOnSlot.tsx")>(
      "../components/AddOnSlot.tsx",
    );
    const Slot = actual.AddOnSlot as (props: {
      slot: HostedSlotId;
      payload: unknown;
      fallback?: ReactNode;
    }) => ReactNode;

    const registry = useStore.getState().registry;
    useStore.setState({
      registry: { ...registry, fillsFor: () => [{ addOn: "silent", fill: { slot: "cart.line.preview", render } }] } as never,
    });

    const host = document.createElement("div");
    document.body.appendChild(host);
    const root = createRoot(host);
    act(() => {
      root.render(
        <I18nProvider>
          <Slot
            slot="cart.line.preview"
            payload={{
              line: { id: "x", key: "herb-pot", label: "Printed herb pot", quantity: 1, note: "" },
            }}
            fallback={<span data-host-tile>the studio's own picture</span>}
          />
        </I18nProvider>,
      );
    });

    const fill = host.querySelector(".br-slot-fill")!;
    expect(fill.matches(":empty"), "this is exactly the shape `:empty` gets wrong").toBe(false);
    expect(
      fill.getAttribute("data-drew"),
      "the fill drew nothing, and nothing marked it as such — so the sibling rule " +
        "hides the studio's own picture and the reader gets a blank box",
    ).toBe("none");
    expect(host.querySelector("[data-host-tile]")).not.toBeNull();

    act(() => {
      root.unmount();
    });
    host.remove();
    // The registry this case swapped out is shared state; leaving the stub in
    // place makes the NEXT case render a fill on a slot that has none.
    useStore.setState({ registry });
  });

  it("takes the mark straight back off when the fill does draw", async () => {
    // The other direction, because a rule that always says "nothing" would pass
    // every case above and double the picture on every slot that is filled.
    const actual = await vi.importActual<typeof import("../components/AddOnSlot.tsx")>(
      "../components/AddOnSlot.tsx",
    );
    const Slot = actual.AddOnSlot as (props: {
      slot: HostedSlotId;
      payload: unknown;
      fallback?: ReactNode;
    }) => ReactNode;

    const registry = useStore.getState().registry;
    useStore.setState({
      registry: {
        ...registry,
        fillsFor: () => [
          { addOn: "loud", fill: { slot: "cart.line.preview", render: () => <div>A preview</div> } },
        ],
      } as never,
    });

    const host = document.createElement("div");
    document.body.appendChild(host);
    const root = createRoot(host);
    act(() => {
      root.render(
        <I18nProvider>
          <Slot
            slot="cart.line.preview"
            payload={{
              line: { id: "x", key: "herb-pot", label: "Printed herb pot", quantity: 1, note: "" },
            }}
            fallback={<span data-host-tile>the studio's own picture</span>}
          />
        </I18nProvider>,
      );
    });
    expect(host.querySelector(".br-slot-fill")!.getAttribute("data-drew")).toBeNull();
    act(() => {
      root.unmount();
    });
    host.remove();
    useStore.setState({ registry });
  });

  it("carries the stylesheet rule the component depends on", () => {
    /*
     * The half of the repair that lives in CSS, asserted where the other half
     * is. Delete either rule and the component above is drawing two pictures on
     * top of each other, or none — and no DOM assertion would notice, because
     * jsdom applies no stylesheet.
     */
    // `process.cwd()` and not `import.meta.url`: under jsdom the module URL is
    // an http one and `fileURLToPath` refuses it. Vitest runs from the repo
    // root, which is what every other file-reading suite here relies on.
    const css = readFileSync(join(process.cwd(), "src/styles/screens.css"), "utf8").replace(
      /\s+/g,
      " ",
    );
    expect(css).toContain(".br-slot-spare { display: contents; }");
    // BOTH conditions. `:empty` alone is the round-6 defect; the `data-drew`
    // half alone would lose the correct first paint before the measurement runs.
    expect(css).toContain(
      '.br-slot-fill:not(:empty):not([data-drew="none"]) ~ .br-slot-spare { display: none; }',
    );
  });

  it("renders literally nothing when a slot has no fills and no fallback", async () => {
    /*
     * The real `AddOnSlot`, not the recorder — imported through `importActual`
     * because this file has mocked it for everything else. With nothing
     * enabled it must produce the empty string: not a wrapper, not a whitespace
     * node, not an empty div a stylesheet could later give a border to.
     */
    const actual = await vi.importActual<typeof import("../components/AddOnSlot.tsx")>(
      "../components/AddOnSlot.tsx",
    );
    const Slot = actual.AddOnSlot as (props: {
      slot: HostedSlotId;
      payload: unknown;
    }) => ReactNode;

    for (const slot of HOSTED_SLOTS) {
      // The payload is untouched on this path — with no fills there is nobody
      // to hand it to — which is why an empty one is honest here.
      const markup = render(<Slot slot={slot} payload={{}} />);
      expect({ slot, markup }).toEqual({ slot, markup: "" });
    }
  });
});
