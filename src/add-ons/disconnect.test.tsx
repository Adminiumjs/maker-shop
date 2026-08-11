/**
 * D16, DRIVEN: what a disconnect takes, what it keeps, and what the studio is
 * told before it happens.
 *
 * @vitest-environment jsdom
 *
 * ── WHAT THIS EXISTS TO STOP, WHICH WAS SHIPPING ────────────────────────────
 *
 * `toggleAddOn` flipped a Set and nothing else. There was no confirm — the
 * overlay union ran `none | nav | limit | proof | spoil` — and no credential
 * state existed anywhere in the repo, so "disconnecting deletes the
 * credentials and keeps the data" was a sentence in a decision document with
 * nothing behind it. Driven live, the carrier's card disconnected in ONE CLICK
 * with nothing said: a studio watching its postage rows disappear had no way to
 * know whether the parcels it had already booked went with them.
 *
 * They do not, and neither do the words a shopper typed on a piece — those live
 * in this studio's OWN order, which is why `payload.setNote` writes to the host
 * rather than to the add-on. That is the thing the confirm has to say, and the
 * thing this file asserts by rendering the shelf and pressing the button.
 *
 * ── WHY IT IS A RENDER AND NOT A STORE TEST ─────────────────────────────────
 *
 * Half the rule is about words on a screen. A store test can prove the key is
 * deleted; only a render can prove the studio was told, and only a render can
 * prove that the shelf's button opens the confirm rather than acting — which is
 * exactly the defect, and which no assertion about `disconnectAddOn` could see,
 * because `disconnectAddOn` was never the problem.
 */

import { act, type ReactNode } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeAll, beforeEach, describe, expect, it } from "vitest";

import type { DeliveryChoice } from "./vendor/host/delivery.ts";
import { I18nProvider } from "../i18n/index.tsx";
import { Overlays } from "../components/Overlays.tsx";
import { AddOnsScreen } from "../screens/AddOns.tsx";
import { useStore } from "../state/store.ts";

const CARRIER = "shipping-dhl"; // `connect: "api-key"` — it holds a key
const ARTWORK = "personalizer"; //  `connect: "none"`   — it never asks for one

let host: HTMLElement;
let root: Root;

beforeAll(() => {
  (globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
  localStorage.setItem("maker-shop-locale", "en-US");
  window.scrollTo = () => {};
});

/** The shelf and the overlays together, because the shelf's button opens one. */
function mount(node: ReactNode): void {
  host = document.createElement("div");
  document.body.appendChild(host);
  root = createRoot(host);
  act(() => {
    root.render(<I18nProvider>{node}</I18nProvider>);
  });
}

function click(label: string): void {
  const button = [...host.querySelectorAll("button")].find(
    (b) => (b.textContent ?? "").trim() === label,
  );
  if (button === undefined) {
    throw new Error(
      `no button reading "${label}". On screen: ${[...host.querySelectorAll("button")]
        .map((b) => `"${(b.textContent ?? "").trim()}"`)
        .join(", ")}`,
    );
  }
  act(() => {
    button.click();
  });
}

const words = () => (host.textContent ?? "").replace(/\s+/g, " ");

/**
 * The paragraph that sits UNDER one of the confirm's two headings.
 *
 * `words()` flattens the card into one run, which is exactly the reading that
 * cannot tell a promise from its opposite: "what stays … the account details
 * are deleted" contains both halves and so does any sentence, on any side. The
 * side is the whole of D16, so the assertion has to read the DOM's structure.
 */
function underHeading(heading: string): string {
  const eyebrow = [...host.querySelectorAll(".br-eyebrow")].find(
    (node) => (node.textContent ?? "").trim() === heading,
  );
  if (eyebrow === undefined) {
    throw new Error(
      `no heading reading "${heading}". On screen: ${[...host.querySelectorAll(".br-eyebrow")]
        .map((n) => `"${(n.textContent ?? "").trim()}"`)
        .join(", ")}`,
    );
  }
  const paragraph = eyebrow.parentElement?.querySelector("p");
  if (paragraph === null || paragraph === undefined) {
    throw new Error(`"${heading}" has no paragraph under it`);
  }
  return (paragraph.textContent ?? "").replace(/\s+/g, " ").trim();
}

/** A quote as a `checkout.delivery.methods` fill would hand one over. */
const quote = (addOn: string): DeliveryChoice => ({
  addOn,
  code: "std",
  label: "Standard",
  amount: 495,
  currency: "GBP",
  estimatedDelivery: "2026-08-11",
});

/**
 * Drive the store the way the app does, INSIDE `act`, so React has repainted
 * before anything is asserted. Outside it the shelf is still drawing the state
 * before the change and every button reads "Connect".
 */
function drive(change: () => void): void {
  act(change);
}

beforeEach(() => {
  useStore.setState({
    enabled: new Set(),
    credentialled: new Set(),
    overlay: { kind: "none" },
    basket: [],
    deliveryChoice: null,
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

describe("the studio is asked before an add-on is switched off (24 D16)", () => {
  it("opens a confirm rather than disconnecting on the click", () => {
    drive(() => useStore.getState().connectAddOn(CARRIER, { keyGiven: true }));

    click("Disconnect");

    // THE DEFECT, INVERTED: the click must not have done it.
    expect(useStore.getState().enabled.has(CARRIER)).toBe(true);
    expect(useStore.getState().overlay).toEqual({ kind: "disconnect", addOn: CARRIER });
  });

  it("names what goes and what stays, in the add-on's own words", () => {
    drive(() => useStore.getState().connectAddOn(CARRIER, { keyGiven: true }));
    click("Disconnect");

    const on = words();
    expect(on).toContain("What goes");
    expect(on).toContain("What stays");
    // The two blocks are the ADD-ON's sentences, resolved from the keys it
    // declared — the host holds neither and could not write them.
    const addOn = useStore.getState().registry.byKey(CARRIER)!;
    expect(addOn.disconnect).toBeDefined();
    // Something a person can read sits under each heading, rather than a key.
    expect(on).not.toContain("addon.shipping-dhl.disconnect");
    // Block elements run together in `textContent`, so there is no space to
    // match on: what matters is that real words follow each heading rather than
    // an empty block or an unresolved key.
    expect(/What goes\s*\S.{20,}/.test(on)).toBe(true);
    expect(/What stays\s*\S.{20,}/.test(on)).toBe(true);
  });

  /**
   * THE SENTENCE THAT WAS FILED UNDER THE WRONG HEADING.
   *
   * The carrier's "what stays" read "Collections already booked keep their
   * labels and tracking numbers. The account details are deleted." — a
   * DELETION, printed under the heading that promises survival, in all eight
   * locales. D16 is exactly the distinction those two headings draw, so a card
   * that puts a deletion under "What stays" is not a wording problem: it is the
   * rule, stated backwards, on the one screen written to state it.
   */
  it("keeps the deletion out of what survives, and says it under what goes", () => {
    drive(() => useStore.getState().connectAddOn(CARRIER, { keyGiven: true }));
    click("Disconnect");

    const goes = underHeading("What goes");
    const stays = underHeading("What stays");

    // WHAT GOES has to be where the credential is spoken about.
    expect(goes, "the credential's fate is not stated under “What goes”").toMatch(
      /account details are deleted/i,
    );
    // WHAT STAYS names the work, and nothing that is destroyed.
    expect(stays).toMatch(/keep their labels and tracking numbers/i);
    expect(stays, "a deletion is printed under “What stays”").not.toMatch(
      /\bdelete[ds]?\b|\brevoked\b/i,
    );
  });

  it("says the key is deleted for one that holds a key", () => {
    drive(() => useStore.getState().connectAddOn(CARRIER, { keyGiven: true }));
    expect(words()).toContain("This studio is holding a key for it");

    click("Disconnect");
    expect(words()).toContain("The key you gave it is deleted here");
  });

  it("does not claim to delete a key from one that never asked for an account", () => {
    /*
     * The half a single sentence would have got wrong. The personalizer's
     * `connect` is `none`: telling a studio its key had been deleted would be
     * describing a credential that never existed, which is the same class of
     * untruth as the dashed placeholder D19 bans.
     */
    drive(() => useStore.getState().connectAddOn(ARTWORK));
    expect(useStore.getState().credentialled.has(ARTWORK)).toBe(false);

    click("Disconnect");
    const on = words();
    expect(on).toContain("no key to delete");
    expect(on).not.toContain("The key you gave it is deleted here");
  });

  /**
   * AND IT DOES NOT SAY THAT ABOUT ONE THAT DID ASK.
   *
   * The dock's toggle — how every reviewer switches an add-on on — calls
   * `connectAddOn` with no `keyGiven`, so `credentialled` stays empty. The
   * card keyed its third sentence off that Set alone and therefore told a
   * studio that the carrier "never asked for an account", two paragraphs under
   * the carrier's own "This one needs an account". Whether an add-on ASKS is
   * `addOn.connect`; whether this studio GAVE is `credentialled`; the card has
   * to read both.
   */
  it("does not tell a credentialled add-on it never asked for an account", () => {
    drive(() => useStore.getState().toggleAddOn(CARRIER));
    expect(useStore.getState().enabled.has(CARRIER)).toBe(true);
    expect(useStore.getState().credentialled.has(CARRIER)).toBe(false);
    expect(useStore.getState().registry.byKey(CARRIER)!.connect).not.toBe("none");

    click("Disconnect");
    const on = words();
    expect(on, "a card that needs an account claims it never asked for one").not.toContain(
      "It never asked for an account",
    );
    // Nor does it claim to delete a key this studio never handed over.
    expect(on).not.toContain("The key you gave it is deleted here");
    expect(on).toContain("It does ask for an account, but this studio never gave it a key");
  });

  it("leaves it connected when the studio backs out", () => {
    drive(() => useStore.getState().connectAddOn(CARRIER, { keyGiven: true }));
    click("Disconnect");
    click("Leave it connected");

    expect(useStore.getState().enabled.has(CARRIER)).toBe(true);
    expect(useStore.getState().credentialled.has(CARRIER)).toBe(true);
    expect(useStore.getState().overlay).toEqual({ kind: "none" });
  });
});

describe("and then it deletes the key and keeps the work", () => {
  it("takes the surfaces and the key, and nothing else", () => {
    const before = useStore.getState();
    const orders = before.orders;

    drive(() => useStore.getState().connectAddOn(CARRIER, { keyGiven: true }));
    expect(useStore.getState().credentialled.has(CARRIER)).toBe(true);

    click("Disconnect");
    // The confirm's own button, not the shelf's — both read "Disconnect", and
    // the overlay's is the last one in the document.
    const buttons = [...host.querySelectorAll("button")].filter(
      (b) => (b.textContent ?? "").trim() === "Disconnect",
    );
    act(() => {
      buttons[buttons.length - 1]!.click();
    });

    const after = useStore.getState();
    // WHAT GOES: the fills, and the key.
    expect(after.enabled.has(CARRIER)).toBe(false);
    expect(after.credentialled.has(CARRIER)).toBe(false);
    // WHAT STAYS: every order the studio has taken, byte for byte — including
    // the words a shopper typed on a piece, which are in the ORDER's own note
    // column and were never the add-on's to hold.
    expect(after.orders).toBe(orders);
    // And the settings the studio chose, so reconnecting does not start over.
    expect(after.addOnSettings[CARRIER]).toEqual(before.addOnSettings[CARRIER]);
  });

  it("drops only the delivery THAT add-on quoted", () => {
    /*
     * A quote is a SURFACE, not data: it is what the add-on was showing, and
     * leaving it on the till would charge for a service from a company that is
     * no longer connected with no row on the screen to explain the amount.
     */
    useStore.getState().connectAddOn(CARRIER, { keyGiven: true });
    useStore.setState({
      deliveryChoice: quote(CARRIER),
    });
    useStore.getState().disconnectAddOn(CARRIER);
    expect(useStore.getState().deliveryChoice).toBeNull();

    // Somebody else's quote survives a disconnect that is not about them.
    const other = quote("another-carrier");
    useStore.setState({ deliveryChoice: other, enabled: new Set([CARRIER]) });
    useStore.getState().disconnectAddOn(CARRIER);
    expect(useStore.getState().deliveryChoice).toBe(other);
  });
});
