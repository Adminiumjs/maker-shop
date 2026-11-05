/**
 * THE CUSTOMISER'S PANELS ON THE STUDIO'S SCREENS, AGAINST A REAL ADMINIUM.
 *
 * This repo's manifest and sample, installed with the built Customiser on a
 * BUILT Adminium (`ADMINIUM_REPO`), on every engine this run reaches. The
 * studio's own door is booted on an owner's, a maker's and a packer's
 * sessions, as their screens boot it, and the Customiser's panels are asked
 * for as the staff screens ask for them:
 *
 *   - the line's panel is served to the maker (whose role opens only the
 *     studio's screens) and to the owner, and refused to the packer;
 *   - the REAL panel code Adminium serves is imported and drawn here with the
 *     studio's host (`studio/panels/host.tsx`), and draws the design from the
 *     Customiser's rows, read as the maker;
 *   - what the panel saves when it makes a proof and the machine's files is
 *     saved as the maker and as the owner, through the same door calls the
 *     host's `useWrite` and `useUpload` make (the drawing itself needs a
 *     browser's canvas, which this suite has not), and the studio's proof
 *     sheet then sends that proof;
 *   - the product's panel is served to the owner.
 *
 * The panel is drawn in a page of jsdom's, made for the drawing only: the
 * suite itself runs in Node, as the other contracts do, so its harness reads
 * its own files where they are.
 *
 * It runs with `CONTRACT=1` where an Adminium checkout with its built server
 * and dashboard is (`ADMINIUM_REPO`) and a built add-ons checkout
 * (`ADD_ONS_REPO`), and says why it skipped otherwise.
 */
import { createHash } from "node:crypto";
import { writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import { Blob as NodeBlob } from "node:buffer";

import { JSDOM } from "jsdom";
import { act } from "react";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { PanelRefused } from "../add-ons/connected.ts";
import { sendProofs } from "../studio/actions.ts";
import { AdminiumStudio } from "../studio/adminiumStudio.ts";
import type { PanelDoor, StudioData } from "../studio/door.ts";
import { fileIdOf, linesOf } from "../studio/facts.ts";
import { PanelScopeProvider } from "../studio/panels/host.tsx";
import { createSessionTransport } from "../studio/transport/sessionSource.ts";
import { loadStaffConfig } from "../studio/transport/staffConnection.ts";
import type { Row } from "../studio/wire.ts";
import { MANIFEST_TEXT } from "./release.ts";
import { boot, Caller, ENGINES, installStudio, missing, personWith, png, PORTS_PER_ENGINE, type Engine, type Server } from "./studio-harness.ts";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

/** The names a page gives React and the panel, put on this process for the drawing and taken away after. */
const PAGE_NAMES = ["window", "document", "navigator", "Node", "Element", "HTMLElement", "SVGElement", "HTMLCanvasElement", "HTMLIFrameElement", "Text", "Event", "CustomEvent", "MutationObserver", "getComputedStyle", "requestAnimationFrame", "cancelAnimationFrame", "Image"] as const;

/** Draw something in a page of its own, at the server's address (the panel reads its files from there). */
async function inAPage<T>(base: string, work: (page: Document) => Promise<T>): Promise<T> {
  const dom = new JSDOM("<!doctype html><html><body></body></html>", { url: base, pretendToBeVisual: true });
  const held = globalThis as unknown as Record<string, unknown>;
  const before = new Map(PAGE_NAMES.map((name) => [name, Object.getOwnPropertyDescriptor(held, name)]));
  for (const name of PAGE_NAMES) Object.defineProperty(held, name, { value: (dom.window as unknown as Record<string, unknown>)[name], configurable: true, writable: true });
  try {
    return await work(dom.window.document);
  } finally {
    for (const [name, descriptor] of before) {
      if (descriptor === undefined) delete held[name];
      else Object.defineProperty(held, name, descriptor);
    }
    dom.window.close();
  }
}

const why = missing();
if (why !== null && process.env["ADMINIUM_REQUIRE_CONTRACT"] === "1") throw new Error(`the contract must run here, and cannot: ${why}`);
const PORT_BASE = Number(process.env["CONTRACT_PORT_BASE"] ?? 4950);
/** 16:40 on Thursday 6 August 2026 in Settle. */
const THURSDAY = Date.parse("2026-08-06T15:40:00Z");

/** A file as the browser hands one over, in the bytes this process's `fetch` sends. */
const pngFile = () => new NodeBlob([new Uint8Array(png())], { type: "image/png" }) as unknown as Blob;
const svgFile = () => new NodeBlob(['<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 10 10"><path d="M0 0H10V10H0Z" fill="none" stroke="#000"/></svg>'], { type: "image/svg+xml" }) as unknown as Blob;

describe.skipIf(why !== null)(`the Customiser's panels on the studio's screens, against a built Adminium${why === null ? "" : ` — skipped: ${why}`}`, () => {
  ENGINES.forEach(([engine, available], index) => {
    describe.skipIf(!available)(`on ${engine}`, () => {
      let server: Server;
      let owner: Caller;
      const callers: Record<string, Caller> = {};
      const doors: Record<string, AdminiumStudio> = {};

      /** A door booted as the staff build boots it, on a person's own session; a panel's code imported as the browser imports it. */
      const doorFor = async (caller: Caller): Promise<AdminiumStudio> => {
        const cfg = (await loadStaffConfig({ hostedStaff: true, base: "/apps/maker/staff/", fetchImpl: caller.fetchAs() }))!;
        const transport = createSessionTransport({
          tableOfRef: cfg.tables,
          connectionId: cfg.connectionId ?? undefined,
          staff: { csrfToken: cfg.csrfToken, timezone: cfg.timezone, timezoneSource: cfg.timezoneSource, serverTimezone: cfg.serverTimezone, currency: cfg.currency },
          fetchImpl: caller.fetchAs(),
        });
        const importBundle = async (url: string) => {
          const code = await (await caller.fetchAs()(url)).text();
          const file = join(tmpdir(), `maker-panel-${createHash("sha256").update(code).digest("hex").slice(0, 16)}.mjs`);
          writeFileSync(file, code);
          return import(/* @vite-ignore */ pathToFileURL(file).href);
        };
        return new AdminiumStudio(transport, cfg, { fetchImpl: caller.fetchAs(), origin: server.base, importBundle });
      };
      const designedLine = (data: StudioData): Row => {
        const order = data.orders.find((o) => o["number"] === "BR-2288")!;
        return linesOf(data, order).find((l) => l["design_id"] !== null && l["design_id"] !== undefined)!;
      };
      const panelsOf = (who: string): PanelDoor => doors[who]!.panels();

      beforeAll(async () => {
        server = await boot(engine as Engine, PORT_BASE + index * PORTS_PER_ENGINE, THURSDAY - 60_000, `maker_panel_contract_${engine}${process.env["CONTRACT_DB_SUFFIX"] ?? ""}`);
        ({ owner } = await installStudio(server, engine as Engine, THURSDAY, MANIFEST_TEXT, join(tmpdir(), `maker-panel-contract-${String(PORT_BASE)}.db`)));
        for (const [slug, name] of [["owner", "Nell Birch"], ["maker", "Jo Marsh"], ["packer", "Ade Pack"]] as const) {
          callers[slug] = await personWith(owner, server, slug, `${slug}.panel.${engine}@birchrow.example`, name);
          doors[slug] = await doorFor(callers[slug]!);
        }
      }, 420_000);

      afterAll(async () => {
        await server?.stop();
      });

      it("serves the line's panel to the maker and the owner, and refuses it to the packer", async () => {
        const line = designedLine(await doors["maker"]!.load());
        for (const who of ["maker", "owner"]) {
          const loaded = await panelsOf(who).load({ id: "customiser-line", table: "order_lines", row: line.id });
          expect(typeof loaded, who).toBe("function");
        }
        const refused = await doors["packer"]!.panels().load({ id: "customiser-line", table: "order_lines", row: line.id }).catch((e: unknown) => e);
        expect(refused).toBeInstanceOf(PanelRefused);
        expect((refused as PanelRefused).status).toBe(403);
      });

      it("serves the product's panel to the owner, and refuses it to the maker", async () => {
        const data = await doors["owner"]!.load();
        const product = data.products.find((p) => p["base_id"] !== null && p["base_id"] !== undefined)!;
        expect(typeof (await panelsOf("owner").load({ id: "customiser-product", table: "products", row: product.id }))).toBe("function");
        expect(await panelsOf("maker").load({ id: "customiser-product", table: "products", row: product.id }).catch((e: unknown) => (e as PanelRefused).status)).toBe(403);
      });

      /** The Customiser's own line panel, drawn here with the studio's host as this role: what it says. */
      const drawnFor = async (who: string, line: Row): Promise<string> => {
        const Panel = (await panelsOf(who).load({ id: "customiser-line", table: "order_lines", row: line.id })) as (props: Record<string, unknown>) => null;
        return inAPage(server.base, async (page) => {
          // React's page half, imported once there is a page for it.
          const { createRoot } = await import("react-dom/client");
          const host = page.createElement("div");
          page.body.append(host);
          const root = createRoot(host);
          await act(async () =>
            root.render(
              <PanelScopeProvider scope={{ door: panelsOf(who), addOn: "customiser", locale: "en-US" }}>
                <Panel connectionId={doors[who]!.facts().connectionId} table="order_lines" row={String(line.id)} linked={String(line["design_id"])} />
              </PanelScopeProvider>,
            ),
          );
          const deadline = Date.now() + 30_000;
          while (!(host.textContent ?? "").includes("Make the proof") && Date.now() < deadline) await act(async () => new Promise((resolve) => setTimeout(resolve, 200)));
          const said = host.textContent ?? "";
          act(() => root.unmount());
          return said;
        });
      };
      /** The shopper's own words on the line's design, as the operator reads them. */
      const wordsOf = async (line: Row): Promise<string[]> => {
        const design = (await owner.get<{ data: Row }>(`/api/v1/data/${doors["owner"]!.facts().connectionId ?? ""}/customiser_designs/${String(line["design_id"])}`)).body.data;
        const values = typeof design["values"] === "string" ? (JSON.parse(design["values"]) as { parts?: Record<string, { text?: string }> }) : ((design["values"] ?? {}) as { parts?: Record<string, { text?: string }> });
        return Object.values(values.parts ?? {}).map((part) => part.text).filter((text): text is string => typeof text === "string" && text !== "");
      };

      for (const who of ["maker", "owner"] as const) {
        it(`draws the Customiser's own panel on a line for the ${who}, from the rows of the design that role reads`, async () => {
          const drawn = await drawnFor(who, designedLine(await doors[who]!.load()));
          // Past "Loading": the design, its ready-made design and base, the parts, fonts, palettes and versions all read as this role.
          expect(drawn, drawn.slice(0, 600)).toContain("Make the proof");
          expect(drawn).toContain("Design");
          expect(drawn).not.toContain("No design on this line");
        }, 60_000);

        /*
         * The shopper's words are a design's personal column (`values`): an
         * app's role is given read, create and update of an add-on's table
         * (`ROLE_ADD_ON_ACTIONS`), never its personal columns in clear, so the
         * panel draws the design with them masked.
         */
        it.fails(`shows the ${who} the shopper's own words in the panel (gap: an app role cannot read the Customiser's personal columns)`, async () => {
          const line = designedLine(await doors[who]!.load());
          const words = await wordsOf(line);
          expect(words.length).toBeGreaterThan(0);
          expect(await drawnFor(who, line)).toContain(words[0]!);
        }, 60_000);

        it(`stores the machine's files the panel makes as the ${who}: a row of the design's version, then its file`, async () => {
          const line = designedLine(await doors[who]!.load());
          const panels = panelsOf(who);
          const version = (await panels.list("customiser", "design_versions", { where: { column: "design_id", op: "eq", value: line["design_id"] }, order: "version.desc", limit: 51, offset: 0 }))[0]!;
          const made = await panels.create("customiser", "version_files", { app: version["app"], version_id: version.id, kind: "machine", name: `piece-${who}.svg`, about: "Shop sign · 120 × 80 mm", position: 1 });
          const file = await panels.upload("customiser", "version_files", "file", made.data.id, svgFile(), `piece-${who}.svg`);
          expect(fileIdOf(file.row["file"])).toMatch(/^file_[0-9A-Z]{26}$/);
          expect((await panels.get("customiser", "version_files", made.data.id))?.["file"]).toBe(file.row["file"]);
        }, 60_000);

        /*
         * The Customiser's `designs` ledger writes `design_versions` (an order
         * snapshots one), and an app's role is held to read on a table a
         * ledger writes, whatever it asks: the proof the panel makes is
         * refused (`You need create or update on …design_versions`).
         */
        it.fails(`stores the proof the panel makes as the ${who}, and the proof sheet sends it (gap: an app role cannot write design_versions)`, async () => {
          const door = doors[who]!;
          let data = await door.load();
          const line = designedLine(data);
          const panels = panelsOf(who);
          const version = (await panels.list("customiser", "design_versions", { where: { column: "design_id", op: "eq", value: line["design_id"] }, order: "version.desc", limit: 51, offset: 0 }))[0]!;
          const proof = await panels.upload("customiser", "design_versions", "proof_file", version.id, pngFile(), `${String(line["design_id"])}-v${String(version["version"])}-proof-${who}.png`);
          expect(fileIdOf(proof.row["proof_file"])).toMatch(/^file_[0-9A-Z]{26}$/);
          data = await door.load();
          const { sent } = await sendProofs(door, data, data.orders.find((o) => o["number"] === "BR-2288")!, async () => null);
          expect(sent.length).toBeGreaterThan(0);
        }, 60_000);
      }

      /*
       * "Make the files again" takes the version's old files away first (the
       * panel's `remove`): an app's role may read, add and change an add-on's
       * rows, never delete them (`ROLE_ADD_ON_ACTIONS`), so this is refused
       * until Adminium or the Customiser gives an app's role that one delete.
       */
      it.fails("lets the maker make the files again: the version's old files taken away (gap: an app role cannot delete version_files)", async () => {
        const panels = panelsOf("maker");
        const files = await panels.list("customiser", "version_files", { where: { column: "name", op: "eq", value: "piece-maker.svg" }, limit: 2, offset: 0 });
        expect(files.length).toBe(1);
        await panels.remove("customiser", "version_files", files[0]!.id);
      });
    });
  });
});
