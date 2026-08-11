/**
 * A BOOKING AN ADD-ON MADE OUTLIVES THE SCREEN THAT MADE IT — AND OUTLIVES
 * THE DISCONNECT (24 D16).
 *
 * @vitest-environment jsdom
 *
 * ── WHAT THIS EXISTS TO STOP, WHICH WAS SHIPPING ────────────────────────────
 *
 * Driven live: book a collection on a maker order, get a tracking number, a
 * label and three scans; navigate to any other view and back; and the panel
 * offers "Book a collection" again, with nothing on it to say the parcel is
 * already booked. `booked` was component state in the add-on's dispatch fill
 * and a route change threw it away. On the demo transport a second press
 * returns the same shipment — it is idempotent per order reference — but the
 * SCREEN was telling the studio it had nothing, and no real carrier owes
 * anybody that idempotence.
 *
 * It also made D16 untestable in the only place it matters. "A disconnect
 * KEEPS THE DATA and deletes the credentials" is a claim about data that
 * survives; there was no data, only a React state, so there was nothing for
 * the promise to be true of. `disconnect.test.tsx` could assert the orders
 * object was untouched and the key gone, and could not assert the thing a
 * studio actually worries about: the parcel it booked this morning.
 *
 * ── SO THIS DRIVES THE WHOLE ROUND TRIP ─────────────────────────────────────
 *
 * Book · leave · come back · disconnect · look again. The add-on is the
 * VENDORED copy, mounted through the host's own `AddOnSlot` on the host's own
 * screen, because a suite inside the add-on could only ever prove the fill
 * behaves — not that the booking survives a host navigating away from it.
 */

import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeAll, beforeEach, describe, expect, it } from "vitest";

import { findShipment, resetRuntime } from "./vendor/shipping-dhl/runtime.ts";
import { I18nProvider } from "../i18n/index.tsx";
import { MakerOrderScreen } from "../screens/MakerOrder.tsx";
import { useStore } from "../state/store.ts";

const CARRIER = "shipping-dhl";
/** An order the studio has made and not yet sent — the one the panel is for. */
const REF = "BR-2287";

let host: HTMLElement;
let root: Root;

beforeAll(() => {
  (globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
  localStorage.setItem("maker-shop-locale", "en-US");
  window.scrollTo = () => {};
  // The label download hands bytes to the OS through a blob; jsdom has neither.
  URL.createObjectURL = () => "blob:none";
  URL.revokeObjectURL = () => {};
});

/** Mount the maker's own order view, which is where the slot is. */
function open(): void {
  host = document.createElement("div");
  document.body.appendChild(host);
  root = createRoot(host);
  act(() => {
    root.render(
      <I18nProvider>
        <MakerOrderScreen />
      </I18nProvider>,
    );
  });
}

/** Navigate away, in the only sense that matters here: the tree is gone. */
function leave(): void {
  act(() => {
    root.unmount();
  });
  host.remove();
}

const words = () => (host.textContent ?? "").replace(/\s+/g, " ");

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

/**
 * Press a button and let the add-on's promises settle.
 *
 * The carrier is asynchronous by contract — `quote`, `book`, `label`, `track`
 * are all promises even on the demo transport, because the connected build
 * calls a server — so a click is not finished when `click` returns.
 */
async function press(label: string): Promise<void> {
  click(label);
  await act(async () => {
    await Promise.resolve();
    await Promise.resolve();
  });
}

/** Everything before the booking exists, so each case can start from one. */
async function bookACollection(): Promise<void> {
  await press("Book a collection");
  await press("Get rates");
  await press("Book the collection");
}

beforeEach(() => {
  resetRuntime();
  useStore.setState({ enabled: new Set([CARRIER]), credentialled: new Set([CARRIER]) });
  useStore.getState().openMakerOrder(REF);
  open();
});

afterEach(() => {
  if (host.isConnected) leave();
  resetRuntime();
});

describe("a collection booked on an order stays booked", () => {
  it("comes back to the same order and finds it still there", async () => {
    await bookACollection();

    // It happened: a tracking reference, on this order.
    expect(words()).toContain("Collection booked");
    const shipment = findShipment(REF);
    expect(shipment, "nothing was booked at all").toBeDefined();
    expect(words()).toContain(shipment!.tracking);

    // Away, and back — which is what a route change is.
    leave();
    open();

    await act(async () => {
      await Promise.resolve();
      await Promise.resolve();
    });

    /*
     * THE DEFECT, INVERTED. The panel used to come up collapsed, offering to
     * book a parcel that was already booked, with nothing on screen to say so.
     */
    expect(words(), "the booking vanished with the component").toContain("Collection booked");
    expect(words()).toContain(shipment!.tracking);
    expect(
      [...host.querySelectorAll("button")].map((b) => (b.textContent ?? "").trim()),
      "the studio is invited to book the same parcel a second time",
    ).not.toContain("Book a collection");
  });

  it("keeps it through a disconnect, and takes the key (D16)", async () => {
    await bookACollection();
    const shipment = findShipment(REF)!;

    leave();
    act(() => {
      useStore.getState().disconnectAddOn(CARRIER);
    });

    // WHAT GOES: the surfaces and the credential.
    expect(useStore.getState().enabled.has(CARRIER)).toBe(false);
    expect(useStore.getState().credentialled.has(CARRIER)).toBe(false);
    open();
    expect(words(), "the carrier's panel is still on the page").not.toContain(
      "Collection booked",
    );

    // WHAT STAYS: the collection itself, with its label and its scans. This is
    // the half of D16 that had nothing behind it before this round.
    expect(findShipment(REF)).toEqual(shipment);

    // And connecting again shows it, rather than offering to book it twice.
    leave();
    act(() => {
      useStore.getState().connectAddOn(CARRIER, { keyGiven: true });
    });
    open();
    await act(async () => {
      await Promise.resolve();
      await Promise.resolve();
    });
    expect(words()).toContain("Collection booked");
    expect(words()).toContain(shipment.tracking);
  });
});
