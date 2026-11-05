/**
 * @vitest-environment jsdom
 *
 * THE VENDORED DHL CLIENT REACHES NOTHING BUT ADMINIUM.
 *
 * The studio compiles DHL Shipping's client half in (`./vendor/shipping-dhl/`)
 * and mounts its dispatch flow on the post office run. The add-on's carrier
 * calls happen in its SERVER half, where the credentials are; its client half,
 * with no carrier injected (this app injects none), answers from its demo
 * carrier in the page. So nothing it draws or does may ask for anything off
 * the origin serving the studio, which is Adminium's.
 *
 * Two nets, because each sees what the other cannot:
 *
 *   THE TEXT of every vendored file, comments stripped: no sender (`fetch`,
 *   `XMLHttpRequest`, a beacon, a navigation), no `import()` of anything but a
 *   relative file, and no address but the ones the add-on itself declares
 *   inert (`add-on-facts.ts`'s `INERT_ORIGINS`, empty today).
 *
 *   THE RUNNING FLOW, under `testing/egress.ts`'s watcher, which hooks every
 *   request-issuing global and every URL-bearing property and attribute: the
 *   whole booking (open, rates, book, the label and the tracking), with every
 *   address the page was handed checked against this origin.
 */
import { readFileSync, readdirSync, statSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, describe, expect, it } from "vitest";

import { foreignImportsIn, offendingAddresses, sendersIn, watchEgress, withoutComments } from "../testing/egress.ts";
import { I18nProvider } from "../i18n/index.tsx";
import { StudioProvider, type StudioEnv } from "../studio/env.tsx";
import { StudioApp } from "../studio/StudioApp.tsx";
import { useStudio } from "../studio/store.ts";
import { FakeDoor } from "../studio/testing/fakeDoor.ts";
import { INERT_ORIGINS } from "./vendor/shipping-dhl/add-on-facts.ts";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const VENDOR = join(dirname(fileURLToPath(import.meta.url)), "vendor/");

function walk(dir: string): string[] {
  return readdirSync(dir).flatMap((entry) => {
    const path = join(dir, entry);
    return statSync(path).isDirectory() ? walk(path) : /\.(ts|tsx|css)$/.test(entry) ? [path] : [];
  });
}

const FILES = walk(VENDOR).map((path) => ({ rel: path.slice(VENDOR.length), code: withoutComments(readFileSync(path, "utf8")) }));

describe("the vendored DHL client, as text", () => {
  it("is there to be read: the contract and the client half", () => {
    expect(FILES.filter((f) => f.rel.startsWith("shipping-dhl/")).length).toBeGreaterThan(10);
    expect(FILES.some((f) => f.rel === "shipping-dhl/ui/DispatchAction.tsx")).toBe(true);
  });

  it("names no way of sending anything", () => {
    expect(FILES.flatMap((f) => sendersIn(f.code).map((means) => `${f.rel}: ${means}`))).toEqual([]);
  });

  it("imports no script but its own files", () => {
    expect(FILES.flatMap((f) => foreignImportsIn(f.code).map((call) => `${f.rel}: ${call}`))).toEqual([]);
  });

  it("writes no address but the ones the add-on declares inert", () => {
    expect(FILES.flatMap((f) => offendingAddresses(f.code, INERT_ORIGINS).map((address) => `${f.rel}: ${address}`))).toEqual([]);
  });

  it("carries none of the server half, where the credentials live", () => {
    for (const server of ["carrier.ts", "http.ts", "server.ts"]) expect(FILES.some((f) => f.rel === `shipping-dhl/${server}`), server).toBe(false);
  });
});

// ── the running flow ────────────────────────────────────────────────────────

let root: Root | null = null;
afterEach(() => {
  act(() => root?.unmount());
  root = null;
});

async function settle(): Promise<void> {
  for (let i = 0; i < 6; i += 1) await act(async () => new Promise((resolve) => setTimeout(resolve, 0)));
}

const SLOT = "[data-add-on-slot='order.dispatch.actions']";

async function until(found: () => boolean, what: string): Promise<void> {
  for (let i = 0; i < 100 && !found(); i += 1) await act(async () => new Promise((resolve) => setTimeout(resolve, 10)));
  if (!found()) throw new Error(`never drawn: ${what}`);
}

async function press(words: RegExp): Promise<void> {
  const button = [...document.querySelectorAll<HTMLButtonElement>(`${SLOT} button`)].find((b) => words.test(b.textContent ?? ""));
  if (button === undefined) throw new Error(`no ${String(words)} in DHL's flow`);
  await act(async () => button.click());
  await settle();
}

describe("the vendored DHL client, running", () => {
  it("asks for nothing off this origin through a whole booking", async () => {
    // jsdom has no object URLs; the label's Download and Print hand the page a `blob:` one, which stays here.
    const urls = URL as unknown as { createObjectURL?: (blob: Blob) => string; revokeObjectURL?: (url: string) => void };
    const had = { create: urls.createObjectURL, revoke: urls.revokeObjectURL };
    urls.createObjectURL = () => `blob:${window.location.origin}/label`;
    urls.revokeObjectURL = () => {};
    const watch = watchEgress(window);
    const attempts: string[] = [];
    const host = document.createElement("div");
    document.body.replaceChildren(host);
    try {
      const door = new FakeDoor({ facts: { addOns: ["customiser", "shipping-dhl"], addOnSettings: { "shipping-dhl": { demo_transport: true } } } });
      Object.assign(door.data.orders.find((o) => o.id === 14)!, { service_id: 2, address_line1: "4 Fellside", postcode: "LA9 4AA" });
      const env: StudioEnv = { door, draw: async () => null, recordHref: () => "#" };
      useStudio.setState({ data: await door.load(), view: "post", toasts: [], overlay: null });
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
      const step = (name: string) => {
        watch.sweep(document.body);
        for (const attempt of watch.attempts.splice(0)) attempts.push(`${name} — ${attempt.via} → ${attempt.url}`);
      };
      await until(() => document.querySelector(`${SLOT} button`) !== null, "DHL's flow");
      step("closed");
      await press(/book a collection/i);
      step("open");
      await press(/rates/i);
      step("rates");
      await press(/book/i);
      await until(() => /Tracking reference/.test(document.querySelector(SLOT)?.textContent ?? ""), "the booking");
      step("booked, with its label and tracking");
      for (const button of document.querySelectorAll<HTMLButtonElement>(`${SLOT} button`)) {
        if (/download|print/i.test(button.textContent ?? "")) {
          await act(async () => button.click());
          await settle();
          step(`after ${button.textContent ?? ""}`);
        }
      }
    } finally {
      watch.stop();
      urls.createObjectURL = had.create;
      urls.revokeObjectURL = had.revoke;
    }
    expect(attempts, `\n${attempts.join("\n")}\n`).toEqual([]);
  });
});
