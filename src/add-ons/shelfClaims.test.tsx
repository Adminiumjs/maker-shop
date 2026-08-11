/**
 * WHAT THE SHELF CARD CLAIMS ABOUT A COMPANY AND A KEY, RENDERED.
 *
 * @vitest-environment jsdom
 *
 * ── THE TWO THINGS THAT WERE WRONG, AND WHY ONLY A RENDER FINDS THEM ────────
 *
 * [Added 2026-08-11, wave 4b round 4.] The Add-ons shelf carried the only two
 * sentences in this app that are about SOMEONE ELSE'S data and someone else's
 * name, and both were wrong on the one card that names a real company.
 *
 * 1. THE PRIVACY CLAIM. The card's credential line branched on `credentialled`
 *    alone — two arms where there are three states — so an add-on that asks for
 *    an account and has not been given a key landed in the arm written for one
 *    that never asks, and printed "This one needs no account. Nothing about
 *    your pieces leaves the studio." under the delivery company's name. Both
 *    routes a reader has put the app in exactly that state: the dock's toggle
 *    calls `connectAddOn` with nothing, and the Connect dialog's own default is
 *    the demo transport, which skips the key. The confirm dialog one file over
 *    had the three arms and was right, which is what made the card's version
 *    survive three rounds of review — the repair was in the repo and the screen
 *    disagreed with it.
 *
 * 2. THE NOT-AFFILIATED LINE (AC6). The card rendered `noCompanyKeys` and
 *    nothing else, so every add-on that names NO company disclaimed a
 *    relationship it does not have, and the one that names a real one said
 *    nothing at all. A grep for "affiliat" outside `vendor/` came back empty in
 *    the whole repo.
 *
 * Neither is visible from the store, and neither is visible from a source-level
 * check: the first is a branch that resolves the wrong way, and the second is a
 * component that was never called. The screen is where both live, so this
 * mounts the screen and reads the card.
 *
 * ── SCOPED TO ONE CARD ──────────────────────────────────────────────────────
 *
 * `textContent` over the whole shelf is the reading that cannot fail: the
 * personalizer's card legitimately says "needs no account" three cards away
 * from the carrier's, so a page-wide `toContain` is satisfied by the very
 * arrangement that was broken. Every assertion below is scoped to the card of
 * the add-on it is about.
 */

import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";

import { act, type ReactNode } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeAll, beforeEach, describe, expect, it } from "vitest";

import { I18nProvider } from "../i18n/index.tsx";
import { Overlays } from "../components/Overlays.tsx";
import { AddOnsScreen } from "../screens/AddOns.tsx";
import { useStore } from "../state/store.ts";

const CARRIER = "shipping-dhl"; // `connect: "api-key"`, `namesCompany: true`
const ARTWORK = "personalizer"; // `connect: "none"`,    `namesCompany: false`

/** The sentence that may only ever appear under `connect: "none"`. */
const NOTHING_LEAVES = "Nothing about your pieces leaves the studio";
const DISCLAIMER = "Adminium is not affiliated with this company.";

let host: HTMLElement;
let root: Root;

beforeAll(() => {
  (globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
  localStorage.setItem("maker-shop-locale", "en-US");
  window.scrollTo = () => {};
});

function mount(node: ReactNode): void {
  host = document.createElement("div");
  document.body.appendChild(host);
  root = createRoot(host);
  act(() => {
    root.render(<I18nProvider>{node}</I18nProvider>);
  });
}

/** One add-on's card, found by the title the shelf prints on it. */
function card(title: string): HTMLElement {
  const panel = [...host.querySelectorAll(".br-panel")].find(
    (node) => (node.querySelector(".br-panel-title")?.textContent ?? "").trim() === title,
  );
  if (panel === undefined) {
    throw new Error(
      `no card titled "${title}". On screen: ${[...host.querySelectorAll(".br-panel-title")]
        .map((n) => `"${(n.textContent ?? "").trim()}"`)
        .join(", ")}`,
    );
  }
  return panel as HTMLElement;
}

const wordsOn = (title: string) => (card(title).textContent ?? "").replace(/\s+/g, " ");

function clickIn(scope: HTMLElement, label: string): void {
  const button = [...scope.querySelectorAll("button")].find(
    (b) => (b.textContent ?? "").trim() === label,
  );
  if (button === undefined) {
    throw new Error(
      `no button reading "${label}". On screen: ${[...scope.querySelectorAll("button")]
        .map((b) => `"${(b.textContent ?? "").trim()}"`)
        .join(", ")}`,
    );
  }
  act(() => {
    button.click();
  });
}

beforeEach(() => {
  useStore.setState({
    enabled: new Set(),
    credentialled: new Set(),
    overlay: { kind: "none" },
  });
  mount(
    <>
      <AddOnsScreen />
      <Overlays />
    </>,
  );
});

afterEach(() => {
  act(() => {
    root.unmount();
  });
  host.remove();
});

describe("the card never tells a studio its work stays in when it does not", () => {
  /**
   * ROUTE ONE: THE DOCK. `toggleAddOn` is how a reviewer switches an add-on on
   * and it passes no `keyGiven`, so `credentialled` stays empty — the state the
   * broken branch read as "never asks for an account".
   */
  it("says the carrier asks for an account after the dock switches it on", () => {
    act(() => {
      useStore.getState().toggleAddOn(CARRIER);
    });
    expect(useStore.getState().credentialled.has(CARRIER)).toBe(false);

    const on = wordsOn("DHL Shipping");
    expect(on, "the carrier's card claims nothing about a piece leaves the studio").not.toContain(
      NOTHING_LEAVES,
    );
    expect(on).toContain("It asks for an account. This studio has not given it a key.");
  });

  /**
   * ROUTE TWO: THE CONNECT DIALOG, on its own default. "Use the demo carrier"
   * starts ON (D11), so `needsKey` is false and Connect reports `keyGiven:
   * false`. This is the path a reader who never opens the dock takes, and it
   * lands in the same state.
   */
  it("says the same after the Connect dialog's default demo path", () => {
    clickIn(card("DHL Shipping"), "Connect");
    // The dialog's own Connect, which is the last one in the document.
    const buttons = [...host.querySelectorAll("button")].filter(
      (b) => (b.textContent ?? "").trim() === "Connect",
    );
    act(() => {
      buttons[buttons.length - 1]!.click();
    });

    expect(useStore.getState().enabled.has(CARRIER)).toBe(true);
    expect(useStore.getState().credentialled.has(CARRIER)).toBe(false);
    expect(wordsOn("DHL Shipping")).not.toContain(NOTHING_LEAVES);
  });

  it("says a key is held once the studio has actually given one", () => {
    act(() => {
      useStore.getState().connectAddOn(CARRIER, { keyGiven: true });
    });

    const on = wordsOn("DHL Shipping");
    expect(on).toContain("This studio is holding a key for it");
    expect(on).not.toContain(NOTHING_LEAVES);
  });

  /**
   * AND THE POSITIVE CLAIM SURVIVES, which is the half a narrower fix would
   * have broken. The personalizer really does need no account and really does
   * keep everything in the studio, and it must go on saying so.
   */
  it("still says it about the add-on it is true of", () => {
    act(() => {
      useStore.getState().toggleAddOn(ARTWORK);
    });
    expect(wordsOn("Live Personalizer")).toContain(NOTHING_LEAVES);
  });

  /**
   * THE RULE, RATHER THAN THE THREE CASES. Whatever this build vendors, the
   * strongest sentence on the screen may only appear on a card whose add-on
   * declares it needs no account. Registering a fourth add-on that asks for one
   * fails here rather than shipping the sentence under its name.
   */
  it("prints that sentence only on cards whose add-on asks for no account", () => {
    const registry = useStore.getState().registry;
    act(() => {
      for (const addOn of registry.all) useStore.getState().connectAddOn(addOn.key);
    });

    for (const addOn of registry.all) {
      const title = addOn.nameKey === undefined ? addOn.name : null;
      if (title === null) continue; // a described-only shelf entry, titled from a key
      if (wordsOn(title).includes(NOTHING_LEAVES)) {
        expect(addOn.connect, `${addOn.key} claims nothing leaves the studio`).toBe("none");
      }
    }
  });
});

describe("wherever a company is named, the card says what that is not (AC6)", () => {
  it("carries the disclaimer on the card that names a real company", () => {
    expect(wordsOn("DHL Shipping")).toContain(DISCLAIMER);
  });

  it("keeps carrying it once the add-on is connected", () => {
    act(() => {
      useStore.getState().toggleAddOn(CARRIER);
    });
    expect(wordsOn("DHL Shipping")).toContain(DISCLAIMER);
  });

  it("says the positive fact, in the add-on's own words, where none is named", () => {
    const on = wordsOn("Live Personalizer");
    expect(on, "the host disclaims a relationship this add-on does not have").not.toContain(
      DISCLAIMER,
    );
    // The add-on's own sentence, from its own bundle — not a key, not a blank.
    expect(on).toContain("no outside company");
  });

  /**
   * THE RULE OVER THE WHOLE SHELF. Every card either names a company and
   * disclaims it, or says it names none. Neither is optional, because an absent
   * line is indistinguishable from a forgotten one.
   */
  it("leaves no card silent about who else is involved", () => {
    const registry = useStore.getState().registry;
    for (const addOn of registry.all) {
      if (addOn.nameKey !== undefined) continue;
      const on = wordsOn(addOn.name);
      if (addOn.namesCompany) {
        expect(on, `${addOn.key} names a company with no disclaimer on its card`).toContain(
          DISCLAIMER,
        );
      } else {
        expect(
          (addOn.noCompanyKeys ?? []).length,
          `${addOn.key} names no company and says nothing about it`,
        ).toBeGreaterThan(0);
      }
    }
  });

  /**
   * THE DIALOGS TOO. A reader who opens Connect straight from the dock never
   * saw the shelf, and the dialog puts the company's monogram in its own title
   * bar.
   */
  it("carries it in the connect dialog", () => {
    clickIn(card("DHL Shipping"), "Connect");
    const modal = host.querySelector(".br-modal")!;
    expect((modal.textContent ?? "").replace(/\s+/g, " ")).toContain(DISCLAIMER);
  });

  it("carries it in the disconnect confirm", () => {
    act(() => {
      useStore.getState().toggleAddOn(CARRIER);
    });
    clickIn(card("DHL Shipping"), "Disconnect");
    const modal = host.querySelector(".br-modal")!;
    expect((modal.textContent ?? "").replace(/\s+/g, " ")).toContain(DISCLAIMER);
  });
});

/**
 * ── THE RULE, OVER THE SOURCES, SO A SURFACE ADDED TOMORROW IS COVERED ──────
 *
 * Every case above names a surface, and a rule held by naming surfaces cannot
 * see the surface nobody thought of — which is precisely how the shelf card was
 * missed while three dialogs were right.
 *
 * So: any of this app's own components that RENDERS an add-on's name or its
 * monogram must also render `Affiliation`. Two files are exempt and both are
 * named, with the reason, rather than being quietly skipped.
 */
describe("no host surface names an add-on without the line", () => {
  const SRC = join(process.cwd(), "src");

  /**
   * The exemptions, each with its reason. An exemption list is where holes come
   * from, so this one is TWO entries long and each is a place a sentence cannot
   * physically go rather than a place somebody decided not to put one.
   */
  const EXEMPT: Readonly<Record<string, string>> = {
    "src/components/DemoDock.tsx":
      "the reviewer's control strip, not the studio's chrome: a row of toggle chips and " +
      "the transient toasts they raise. It is the one surface that is not part of the " +
      "product, and a paragraph inside a chip is not a surface either.",
    "src/components/Affiliation.tsx": "is the line",
  };

  function sources(dir: string): string[] {
    return readdirSync(dir).flatMap((entry) => {
      const full = join(dir, entry);
      if (statSync(full).isDirectory()) {
        return entry === "vendor" ? [] : sources(full);
      }
      return full.endsWith(".tsx") && !full.includes(".test.") ? [full] : [];
    });
  }

  it("renders Affiliation wherever it renders an add-on's name or monogram", () => {
    const offenders: string[] = [];
    for (const file of sources(SRC)) {
      const rel = file.slice(process.cwd().length + 1);
      if (rel in EXEMPT) continue;
      const code = readFileSync(file, "utf8");
      const names = /addOn\.(name|shortName|monogram)\b/.test(code);
      if (!names) continue;
      if (!code.includes("Affiliation")) offenders.push(rel);
    }
    expect(
      offenders,
      "\nThese surfaces print an add-on's name or its monogram and carry nothing about " +
        "who else is involved (24 AC6). Mount `Affiliation`, or add the file to EXEMPT " +
        "with the reason it cannot:\n" +
        offenders.join("\n") +
        "\n",
    ).toEqual([]);
  });

  it("keeps the exemptions real", () => {
    // A file that no longer exists, or that no longer names an add-on, is an
    // exemption doing nothing but widening the rule.
    for (const [rel, why] of Object.entries(EXEMPT)) {
      const code = readFileSync(join(process.cwd(), rel), "utf8");
      expect(why.length, `${rel} is exempt with no reason given`).toBeGreaterThan(10);
      expect(
        /addOn\.(name|shortName|monogram)\b|Affiliation/.test(code),
        `${rel} is exempt from a rule it is not subject to`,
      ).toBe(true);
    }
  });
});
