/**
 * @vitest-environment jsdom
 *
 * DHL'S DISPATCH FLOW ON THE POST OFFICE RUN: mounted per parcel only with
 * DHL attached, its code never imported without it, and opened with the
 * service the shopper chose already picked.
 */
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { I18nProvider } from "../i18n/index.tsx";
import { StudioProvider, type StudioEnv } from "./env.tsx";
import { StudioApp } from "./StudioApp.tsx";
import { useStudio } from "./store.ts";
import { FakeDoor } from "./testing/fakeDoor.ts";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

/** How many times the add-ons' chunk was imported. */
const loads = vi.hoisted(() => ({ count: 0 }));
vi.mock("../add-ons/registry.ts", async (importOriginal) => {
  loads.count += 1;
  return importOriginal();
});

let root: Root | null = null;
let host: HTMLElement;
const INITIAL = useStudio.getState();

beforeEach(() => {
  useStudio.setState({ ...INITIAL, toasts: [], overlay: null, data: null, failure: null });
  host = document.createElement("div");
  document.body.replaceChildren(host);
});

afterEach(() => {
  act(() => root?.unmount());
  root = null;
});

async function settle(): Promise<void> {
  for (let i = 0; i < 6; i += 1) await act(async () => new Promise((resolve) => setTimeout(resolve, 0)));
}

/** Wait, a while at most, for a selector a lazy chunk will draw. */
async function until(selector: string): Promise<HTMLElement> {
  for (let i = 0; i < 100; i += 1) {
    const found = document.querySelector<HTMLElement>(selector);
    if (found !== null) return found;
    await act(async () => new Promise((resolve) => setTimeout(resolve, 10)));
  }
  throw new Error(`never drawn: ${selector}\n${document.querySelector("[data-add-on-slot]")?.textContent ?? "(no slot)"}`);
}

async function mount(door: FakeDoor): Promise<void> {
  const env: StudioEnv = { door, draw: async () => null };
  useStudio.setState({ data: await door.load(), view: "post" });
  await act(async () => {
    root = createRoot(host);
    root.render(
      <I18nProvider>
        <StudioProvider env={env}>
          <StudioApp />
        </StudioProvider>
      </I18nProvider>,
    );
  });
  await settle();
}

async function type(el: Element | null, value: string): Promise<void> {
  if (el === null) throw new Error("nothing to type into");
  const input = el as HTMLInputElement;
  const setter = Object.getOwnPropertyDescriptor(Object.getPrototypeOf(input), "value")!.set!;
  await act(async () => {
    setter.call(input, value);
    input.dispatchEvent(new Event("input", { bubbles: true }));
  });
}

async function click(el: Element | null): Promise<void> {
  if (el === null) throw new Error("nothing to click");
  await act(async () => (el as HTMLElement).click());
  await settle();
}

/** The ready parcel, going to an address DHL can quote for, by a service. */
function withDhl(serviceId: number): FakeDoor {
  const door = new FakeDoor({ facts: { addOns: ["customiser", "shipping-dhl"], addOnSettings: { "shipping-dhl": { demo_transport: true } } } });
  const order = door.data.orders.find((o) => o.id === 14)!;
  Object.assign(order, { service_id: serviceId, address_line1: "4 Fellside", postcode: "LA9 4AA" });
  door.data.lines.find((l) => l.id === 141)!["grams"] = 285;
  return door;
}

const SLOT = "[data-add-on-slot='order.dispatch.actions']";

/** A button inside DHL's flow, by its words. */
const slotButton = (words: RegExp): HTMLButtonElement | null =>
  [...document.querySelectorAll<HTMLButtonElement>(`${SLOT} button`)].find((b) => words.test(b.textContent ?? "")) ?? null;

/** Open DHL's flow for the parcel and ask for its rates; the rate it opens on. */
async function quoted(): Promise<HTMLElement> {
  await until(`${SLOT} button`);
  await click(slotButton(/book a collection/i));
  await click(slotButton(/rates/i));
  return until(`${SLOT} button[aria-pressed='true']`);
}

describe("DHL's dispatch flow on the post office run", () => {
  it("is not there, and its code never loads, without DHL", async () => {
    await mount(new FakeDoor());
    expect(document.body.textContent).toContain("BR-2271");
    expect(document.body.textContent).toContain("Second class");
    expect(document.querySelector("[data-add-on-slot]")).toBeNull();
    await settle();
    expect(loads.count).toBe(0);
  });

  it("is mounted for each parcel with DHL attached, and opens on the shopper's service", async () => {
    await mount(withDhl(2));
    const picked = await quoted();
    expect(loads.count).toBe(1);
    expect(document.querySelectorAll(SLOT)).toHaveLength(1);
    // Tracked is DHL's next-working-day express, and that is the rate the flow opens on.
    expect(picked.textContent).toMatch(/next working day/i);
  });

  it("lets DHL pick when the shopper's service names no DHL product", async () => {
    await mount(withDhl(1));
    const picked = await quoted();
    expect(picked.textContent).not.toMatch(/next working day/i);
  });

  it("books the collection, and the number it gives is the one posted with the parcel", async () => {
    const door = withDhl(2);
    await mount(door);
    await quoted();
    await click(slotButton(/book/i));
    for (let i = 0; i < 100 && !/Tracking reference/.test(document.querySelector(SLOT)?.textContent ?? ""); i += 1) await settle();
    const said = document.querySelector(SLOT)!.textContent ?? "";
    const number = /Tracking reference([\d ]+\d)/.exec(said)?.[1];
    expect(number, said).toBeDefined();
    // The studio keeps its own field for the number: what it stores on the order when the run is posted.
    await type(document.querySelector("input.st-input--mono"), number!);
    await click(document.querySelector("[aria-label='Packed: BR-2271']"));
    await click([...document.querySelectorAll("button")].find((b) => b.textContent === "Mark the run posted") ?? null);
    expect(door.calls.at(-1)).toEqual({ method: "moveOrder", args: { id: 14, from: "ready", to: "posted", values: { tracking: number } } });
  });

  it("is not offered to someone who may not post", async () => {
    await mount(new FakeDoor({ roles: ["maker"], facts: { addOns: ["customiser", "shipping-dhl"] } }));
    await settle();
    expect(document.querySelector("[data-add-on-slot]")).toBeNull();
  });
});
