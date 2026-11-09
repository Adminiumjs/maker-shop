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
 *   - the product's panel is served to the owner;
 *   - the owner keeps Holiday calendars' closed days (its settings grant),
 *     and finds a customer to erase (`privacy:@:people`);
 *   - the Customiser's set-up page reads and saves for the app's owner alone
 *     (Customiser 1.0.21: no designer role beside it), Birch Row's own rows
 *     only: another shop app's set-up on the same Adminium is read, never
 *     changed, and no new row is given its name nor any font made a starter;
 *     the owner and the maker reach Birch Row's own customers' designs,
 *     versions and files alone; the maker reads the
 *     Customiser's settings, so a proof uses the shop's one-colour line;
 *   - a packer's session is handed the workspace's name and logo;
 *   - the customer whose design was proofed is erased, the proof pictures
 *     with them, the one a remade proof replaced included, and the search
 *     counts what the erase takes.
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
import { readFileSync, writeFileSync } from "node:fs";
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
import { dueForProof, fileIdOf, linesOf } from "../studio/facts.ts";
import { PanelScopeProvider } from "../studio/panels/host.tsx";
import { createSessionTransport } from "../studio/transport/sessionSource.ts";
import { loadStaffConfig } from "../studio/transport/staffConnection.ts";
import type { Row } from "../studio/wire.ts";
import { MANIFEST_TEXT } from "./release.ts";
import { ADD_ONS_REPO, boot, Caller, ENGINES, installStudio, missing, ok, personWith, png, PORTS_PER_ENGINE, type Engine, type Server } from "./studio-harness.ts";

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

/**
 * Whether the Customiser installed here lets an app's role change its settings (1.0.23 and later: the shop's
 * settings on the set-up page). An older one cuts the owner's change at install, leaving the read.
 */
function settingsChangeOffered(): boolean {
  try {
    const manifest = JSON.parse(readFileSync(join(ADD_ONS_REPO, "packages", "customiser", "manifest.json"), "utf8")) as { requiredSchema: { tables: { ref: string; appGrants?: { actions: string[] } }[] } };
    return manifest.requiredSchema.tables.find((t) => t.ref === "settings")?.appGrants?.actions.includes("update") === true;
  } catch {
    return false;
  }
}

const why = missing();
if (why !== null && process.env["ADMINIUM_REQUIRE_CONTRACT"] === "1") throw new Error(`the contract must run here, and cannot: ${why}`);
const PORT_BASE = Number(process.env["CONTRACT_PORT_BASE"] ?? 4950);
/** 16:40 on Thursday 6 August 2026 in Settle. */
const THURSDAY = Date.parse("2026-08-06T15:40:00Z");

/** A file as the browser hands one over, in the bytes this process's `fetch` sends. */
const pngFile = () => new NodeBlob([new Uint8Array(png())], { type: "image/png" }) as unknown as Blob;
/** The smallest PDF a reader opens: one empty page. */
const MINIMAL_PDF = "%PDF-1.4\n1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj\n2 0 obj<</Type/Pages/Kids[3 0 R]/Count 1>>endobj\n3 0 obj<</Type/Page/Parent 2 0 R/MediaBox[0 0 200 200]>>endobj\ntrailer<</Root 1 0 R>>\n%%EOF\n";
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
      /** The proof file each role's panel made on the design's newest version, the maker's first, then the owner's over it. */
      const proofFiles: Record<string, string> = {};

      beforeAll(async () => {
        server = await boot(engine as Engine, PORT_BASE + index * PORTS_PER_ENGINE, THURSDAY - 60_000, `maker_panel_contract_${engine}${process.env["CONTRACT_DB_SUFFIX"] ?? ""}`);
        ({ owner } = await installStudio(server, engine as Engine, THURSDAY, MANIFEST_TEXT, join(tmpdir(), `maker-panel-contract-${String(PORT_BASE)}.db`), ["customiser", "holiday-calendars"]));
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

      it("tells the panel what each role may do with the Customiser's tables, as Adminium says it", () => {
        for (const who of ["maker", "owner"]) {
          const panels = panelsOf(who);
          for (const table of ["designs", "bases", "ready_designs", "ready_parts", "base_areas", "base_pieces", "palettes", "palette_colours", "fonts"]) expect(panels.access("customiser", table), `${who} reads ${table}`).toContain("read");
          expect(panels.access("customiser", "version_files"), who).toEqual(expect.arrayContaining(["read", "create", "update"]));
        }
        expect(panelsOf("packer").access("customiser", "design_versions")).toEqual([]);
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

        // The shopper's words are a design's personal column (`values`), held in clear by the role's `read_pii`.
        it(`shows the ${who} the shopper's own words in the panel, read in clear (read_pii)`, async () => {
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

        // `design_versions` is a table the Customiser's designs ledger writes; the add-on's `appGrants` open it to an app's role.
        it(`stores the proof the panel makes as the ${who}, and the proof sheet sends it`, async () => {
          const door = doors[who]!;
          let data = await door.load();
          const line = designedLine(data);
          const panels = panelsOf(who);
          const version = (await panels.list("customiser", "design_versions", { where: { column: "design_id", op: "eq", value: line["design_id"] }, order: "version.desc", limit: 51, offset: 0 }))[0]!;
          const proof = await panels.upload("customiser", "design_versions", "proof_file", version.id, pngFile(), `${String(line["design_id"])}-v${String(version["version"])}-proof-${who}.png`);
          expect(fileIdOf(proof.row["proof_file"])).toMatch(/^file_[0-9A-Z]{26}$/);
          proofFiles[who] = fileIdOf(proof.row["proof_file"])!;
          data = await door.load();
          const { sent } = await sendProofs(door, data, data.orders.find((o) => o["number"] === "BR-2288")!, async () => null);
          expect(sent.length).toBeGreaterThan(0);
        }, 60_000);
      }

      it("sends a PDF the maker chose as a lettered piece's proof, stored as the proof's own file", async () => {
        const door = doors["maker"]!;
        const data = await door.load();
        const order = data.orders.find((o) => dueForProof(data, o).some((l) => l["design_id"] === null || l["design_id"] === undefined))!;
        const line = dueForProof(data, order).find((l) => l["design_id"] === null || l["design_id"] === undefined)!;
        const pdf = { blob: new NodeBlob([MINIMAL_PDF], { type: "application/pdf" }) as unknown as Blob, filename: "proof-from-the-bench.pdf" };
        const { sent } = await sendProofs(door, data, order, async () => null, null, (l) => (String(l.id) === String(line.id) ? pdf : null));
        const proof = sent.find((p) => String(p["line_id"]) === String(line.id))!;
        expect(proof["kind"]).toBe("lettering");
        const stored = await callers["owner"]!.fetchAs()(`/api/v1/files/${fileIdOf(proof["picture"])!}/content`);
        expect(stored.status).toBe(200);
        expect(new TextDecoder().decode(new Uint8Array(await stored.arrayBuffer()).slice(0, 5))).toBe("%PDF-");
      });

      // ── the owner's own: Holiday calendars' closed days, and a customer erased ──

      it("lets the owner keep Holiday calendars' closed days, and refuses the maker", async () => {
        const days = [{ day: "2026-12-28", name: "Bank holiday", from: { country: "GB", region: "england-and-wales", year: 2026 } }];
        const kept = await callers["owner"]!.send<{ values: Record<string, unknown> }>("PUT", "/api/v1/add-ons/holiday-calendars/settings", { values: { days } });
        expect(kept.status, JSON.stringify(kept.body).slice(0, 400)).toBe(200);
        // The studio's screens read them back from the staff config, as the add-on's public setting.
        const cfg = (await loadStaffConfig({ hostedStaff: true, base: "/apps/maker/staff/", fetchImpl: callers["owner"]!.fetchAs() }))!;
        expect(cfg.addOns["holiday-calendars"]?.settings["days"]).toEqual(days);
        expect((await callers["maker"]!.send("PUT", "/api/v1/add-ons/holiday-calendars/settings", { values: { days: [] } })).status).toBe(403);
      });

      // Finding a person and erasing them: the owner's `privacy:@:people`, which no screens-only role may hold.
      it("lets the owner find a customer to erase them, and refuses the maker", async () => {
        const found = await callers["owner"]!.post("/api/v1/privacy/find", { address: "iris.p@example.com" });
        expect(found.status, JSON.stringify(found.body).slice(0, 400)).toBe(200);
        expect((await callers["maker"]!.post("/api/v1/privacy/find", { address: "iris.p@example.com" })).status).toBe(403);
      });

      // The packer's screens read what the role reads, and ask for nothing Adminium would refuse it.
      it("loads the packer's screens with no read Adminium refuses", async () => {
        const refused: string[] = [];
        const seen = callers["packer"]!.fetchAs();
        const recording = (async (input: RequestInfo | URL, init?: RequestInit) => {
          const res = await seen(input, init);
          if (res.status === 403) refused.push(String(input));
          return res;
        }) as typeof fetch;
        const cfg = (await loadStaffConfig({ hostedStaff: true, base: "/apps/maker/staff/", fetchImpl: recording }))!;
        const transport = createSessionTransport({
          tableOfRef: cfg.tables,
          connectionId: cfg.connectionId ?? undefined,
          staff: { csrfToken: cfg.csrfToken, timezone: cfg.timezone, timezoneSource: cfg.timezoneSource, serverTimezone: cfg.serverTimezone, currency: cfg.currency },
          fetchImpl: recording,
        });
        const data = await new AdminiumStudio(transport, cfg, { fetchImpl: recording, origin: server.base }).load();
        expect(data.lines.some((l) => l["design_id"] !== null && l["design_id"] !== undefined)).toBe(true);
        expect(refused).toEqual([]);
      });

      // Adminium 0.3.50: a screens-only session may read the workspace's branding and its logo.
      it("hands a packer's session the workspace's public name and logo", async () => {
        expect((await callers["packer"]!.get("/api/v1/branding")).status).toBe(200);
      });

      it("signs the packer out from the studio's screens: the session ends", async () => {
        await doors["packer"]!.signOut();
        const cfg = await loadStaffConfig({ hostedStaff: true, base: "/apps/maker/staff/", fetchImpl: callers["packer"]!.fetchAs() });
        expect(cfg?.user ?? null).toBeNull();
      });

      // A starter font nobody uploaded is read from the file the Customiser ships beside its set-up page (`page:@customiser:view`).
      for (const who of ["maker", "owner"] as const) {
        it(`hands the ${who} a starter font's file to make the files with`, async () => {
          const font = await callers[who]!.fetchAs()("/api/v1/add-ons/customiser/pages/customiser/files/fonts/Archivo.woff2");
          expect(font.status).toBe(200);
        });
      }

      // "Make the files again" takes the version's old files away first: the role's `delete` on `version_files`.
      it("lets the maker make the files again: the version's old files taken away", async () => {
        const panels = panelsOf("maker");
        const files = await panels.list("customiser", "version_files", { where: { column: "name", op: "eq", value: "piece-maker.svg" }, limit: 2, offset: 0 });
        expect(files.length).toBe(1);
        await panels.remove("customiser", "version_files", files[0]!.id);
      });

      // ── the Customiser's set-up page, for the owner ──

      /** Every table the set-up page reads (`pages/setup/data.ts`, `SetupPage.tsx`, `KitBase.tsx`), its settings among them. */
      const SETUP_READS = ["bases", "base_pieces", "base_areas", "ready_designs", "ready_parts", "fonts", "palettes", "palette_colours", "features", "settings"];
      const setUpRead = async (caller: Caller, table: string): Promise<number> => {
        const cfg = (await loadStaffConfig({ hostedStaff: true, base: "/apps/maker/staff/", fetchImpl: callers["owner"]!.fetchAs() }))!;
        const real = cfg.addOns["customiser"]?.tables?.[table] ?? `customiser_${table}`;
        return (await caller.get(`/api/v1/data/${doors["owner"]!.facts().connectionId ?? ""}/${real}?limit=1`)).status;
      };

      // Customiser 1.0.21: its appGrants let an app's role hold what the set-up page reads and writes, so the app's
      // owner sets the shop up with no Customiser role beside Owner (the README, "Installing it").
      it("opens the Customiser's set-up page to the app's owner alone: every read, and its writes", async () => {
        const setUp = callers["owner"]!;
        for (const table of SETUP_READS) expect(await setUpRead(setUp, table), table).toBe(200);
        const cfg = (await loadStaffConfig({ hostedStaff: true, base: "/apps/maker/staff/", fetchImpl: setUp.fetchAs() }))!;
        const real = (table: string) => cfg.addOns["customiser"]?.tables?.[table] ?? `customiser_${table}`;
        const connection = doors["owner"]!.facts().connectionId ?? "";
        // A priced feature added, renamed and taken away, as the set-up page does.
        const added = await setUp.post<{ data: Row }>(`/api/v1/data/${connection}/${real("features")}`, { values: { app: "maker", code: `gilt-${engine}`, name: "Gilt edge", active: true } });
        expect(added.status, JSON.stringify(added.body).slice(0, 400)).toBe(201);
        const renamed = await setUp.patch(`/api/v1/data/${connection}/${real("features")}/${String(added.body.data.id)}`, { values: { name: "A gilt edge" } });
        expect(renamed.status, JSON.stringify(renamed.body).slice(0, 400)).toBe(200);
        expect([200, 204]).toContain((await setUp.send("DELETE", `/api/v1/data/${connection}/${real("features")}/${String(added.body.data.id)}`)).status);
        // A base changed, never taken away.
        const base = ok(await setUp.get<{ data: Row[] }>(`/api/v1/data/${connection}/${real("bases")}?limit=1`)).data[0]!;
        const moved = await setUp.patch(`/api/v1/data/${connection}/${real("bases")}/${String(base.id)}`, { values: { position: Number(base["position"] ?? 0) } });
        expect(moved.status, JSON.stringify(moved.body).slice(0, 400)).toBe(200);
        expect((await setUp.send("DELETE", `/api/v1/data/${connection}/${real("bases")}/${String(base.id)}`)).status).toBe(403);
        // The shop's settings: changed on the set-up page from Customiser 1.0.23, the one-colour line among them; an
        // older Customiser cuts that change at install and leaves the owner the read.
        const row = ok(await setUp.get<{ data: Row[] }>(`/api/v1/data/${connection}/${real("settings")}?limit=1`)).data[0]!;
        const line = await setUp.patch(`/api/v1/data/${connection}/${real("settings")}/${String(row.id)}`, { values: { one_colour_threshold: Number(row["one_colour_threshold"] ?? 50) } });
        expect(line.status, JSON.stringify(line.body).slice(0, 400)).toBe(settingsChangeOffered() ? 200 : 403);
        // The maker, who makes the files, writes none of the set-up.
        expect((await callers["maker"]!.post(`/api/v1/data/${connection}/${real("features")}`, { values: { app: "maker", code: `foil-${engine}`, name: "Foil", active: true } })).status).toBe(403);
      }, 120_000);

      // Another shop app's customers on the same Adminium: their designs, versions and files are none of Birch Row's.
      it("keeps the maker and the owner to Birch Row's own customers' designs, versions and files", async () => {
        const cfg = (await loadStaffConfig({ hostedStaff: true, base: "/apps/maker/staff/", fetchImpl: callers["owner"]!.fetchAs() }))!;
        const real = (table: string) => cfg.addOns["customiser"]?.tables?.[table] ?? `customiser_${table}`;
        const connection = doors["owner"]!.facts().connectionId ?? "";
        const api = (table: string) => `/api/v1/data/${connection}/${real(table)}`;
        const values = JSON.stringify({ format: 1, parts: { name: { text: "Marta Kovac" } } });
        // Another shop's customer's design, its version and a file of it (here the workspace's administrator writes them).
        const design = ok(await owner.post<{ data: Row }>(api("designs"), { values: { app: "printing", code: `PRNT${engine.toUpperCase().padEnd(12, "X").slice(0, 12)}`, values } }), 201).data;
        const version = ok(await owner.post<{ data: Row }>(api("design_versions"), { values: { app: "printing", design_id: design.id, version: 1, values } }), 201).data;
        const file = ok(await owner.post<{ data: Row }>(api("version_files"), { values: { app: "printing", version_id: version.id, kind: "print", name: "design-v1-front.pdf", position: 1 } }), 201).data;
        for (const who of ["maker", "owner"]) {
          const caller = callers[who]!;
          for (const [table, row] of [["designs", design], ["design_versions", version], ["version_files", file]] as const) {
            expect((await caller.get(`${api(table)}/${String(row.id)}`)).status, `${who} reads ${table}`).toBe(404);
            expect(ok(await caller.get<{ data: Row[] }>(`${api(table)}?limit=200`)).data.filter((r) => r["app"] === "printing"), `${who} lists ${table}`).toEqual([]);
          }
          expect((await caller.patch(`${api("design_versions")}/${String(version.id)}`, { values: { proof_file: null } })).status, `${who} changes the version`).toBe(404);
          expect((await caller.patch(`${api("version_files")}/${String(file.id)}`, { values: { file: null } })).status, `${who} changes the file`).toBe(404);
          expect((await caller.send("DELETE", `${api("version_files")}/${String(file.id)}`)).status, `${who} removes the file`).toBe(404);
          // No version named for another app, of its design or of Birch Row's.
          const tagged = await caller.post(api("design_versions"), { values: { app: "printing", design_id: design.id, version: 2, values } });
          expect(tagged.status, `${who}: ${JSON.stringify(tagged.body).slice(0, 300)}`).toBe(403);
        }
        // Birch Row's own customer's design is still the maker's to read.
        const ours = designedLine(await doors["maker"]!.load());
        expect((await callers["maker"]!.get(`${api("designs")}/${String(ours["design_id"])}`)).status).toBe(200);
        expect((await owner.get(`${api("version_files")}/${String(file.id)}`)).status).toBe(200);
      }, 120_000);

      // The panel draws a one-colour logo at the shop's own line (`one_colour_threshold`), as the shopper saw it.
      it("lets the owner and the maker read the Customiser's settings", async () => {
        expect(await setUpRead(callers["owner"]!, "settings")).toBe(200);
        expect(await setUpRead(callers["maker"]!, "settings")).toBe(200);
        expect(panelsOf("maker").access("customiser", "settings")).toEqual(["read"]);
      });

      // Maker Shop and Print Shop on one Adminium share the Customiser's tables, each row named by its `app`.
      it("shows and lets the owner change Birch Row's own set-up rows and a starter font (never removed), and hides another shop app's", async () => {
        const setUp = callers["owner"]!;
        const cfg = (await loadStaffConfig({ hostedStaff: true, base: "/apps/maker/staff/", fetchImpl: setUp.fetchAs() }))!;
        const real = (table: string) => cfg.addOns["customiser"]?.tables?.[table] ?? `customiser_${table}`;
        const connection = doors["owner"]!.facts().connectionId ?? "";
        const api = (table: string) => `/api/v1/data/${connection}/${real(table)}`;
        // Another shop's base and its priced feature, as its own set-up adds them (here the workspace's administrator).
        const theirBase = ok(await owner.post<{ data: Row }>(api("bases"), { values: { app: "printing", name: `Business cards ${engine}`, kind: "page", width_mm: 85, height_mm: 55, state: "draft", position: 90 } }), 201).data;
        const theirFeature = ok(await owner.post<{ data: Row }>(api("features"), { values: { app: "printing", code: `spot-uv-${engine}`, name: "Spot UV", active: true } }), 201).data;
        // Out of the owner's sight: never listed, read, changed or removed (a row a limit hides is one Adminium does not find).
        const bases = ok(await setUp.get<{ data: Row[] }>(`${api("bases")}?limit=200`)).data;
        expect(bases.length).toBeGreaterThan(0);
        expect(bases.filter((b) => b["app"] !== "maker")).toEqual([]);
        expect((await setUp.get(`${api("bases")}/${String(theirBase.id)}`)).status).toBe(404);
        const changed = await setUp.patch(`${api("bases")}/${String(theirBase.id)}`, { values: { name: "Ours now" } });
        expect(changed.status, JSON.stringify(changed.body).slice(0, 400)).toBe(404);
        expect((await setUp.patch(`${api("features")}/${String(theirFeature.id)}`, { values: { name: "Ours now" } })).status).toBe(404);
        expect((await setUp.send("DELETE", `${api("features")}/${String(theirFeature.id)}`)).status).toBe(404);
        expect(ok(await owner.get<{ data: Row }>(`${api("features")}/${String(theirFeature.id)}`)).data["name"]).toBe("Spot UV");
        // No new row named for another app.
        const tagged = await setUp.post(api("features"), { values: { app: "printing", code: `foil-${engine}`, name: "Foil", active: true } });
        expect(tagged.status, JSON.stringify(tagged.body).slice(0, 400)).toBe(403);
        // Its own rows are the owner's to change.
        const ours = bases.find((b) => b["app"] === "maker")!;
        expect((await setUp.patch(`${api("bases")}/${String(ours.id)}`, { values: { position: Number(ours["position"] ?? 0) } })).status).toBe(200);
        // A starter font no app names: read, given its file (changed), never removed.
        const starter = ok(await setUp.get<{ data: Row[] }>(`${api("fonts")}?limit=200`)).data.find((f) => f["app"] === null && f["starter"] === true)!;
        expect(starter, "a starter font in the owner's list").toBeDefined();
        expect((await setUp.get(`${api("fonts")}/${String(starter.id)}`)).status).toBe(200);
        expect((await setUp.patch(`${api("fonts")}/${String(starter.id)}`, { values: { active: true } })).status).toBe(200);
        expect((await setUp.send("DELETE", `${api("fonts")}/${String(starter.id)}`)).status).toBe(404);
        expect((await owner.get(`${api("fonts")}/${String(starter.id)}`)).status).toBe(200);
        // No font of the shop's is made a starter: neither a new one, nor one changed.
        const sneaky = await setUp.post(api("fonts"), { values: { app: "maker", family: `Sneaky ${engine}`, name: "Sneaky", licence: "own", starter: true, active: true } });
        expect(sneaky.status, JSON.stringify(sneaky.body).slice(0, 400)).toBe(403);
        const mine = ok(await setUp.post<{ data: Row }>(api("fonts"), { values: { app: "maker", family: `Birch ${engine}`, name: "Birch", licence: "own", starter: false, active: true } }), 201).data;
        expect((await setUp.patch(`${api("fonts")}/${String(mine.id)}`, { values: { starter: true } })).status).toBe(403);
        expect((await setUp.patch(`${api("fonts")}/${String(starter.id)}`, { values: { starter: false } })).status).toBe(403);
        expect(ok(await owner.get<{ data: Row }>(`${api("fonts")}/${String(mine.id)}`)).data["starter"]).toBe(false);
        // Nothing of the other shop's moved.
        expect(ok(await owner.get<{ data: Row }>(`${api("bases")}/${String(theirBase.id)}`)).data["name"]).toBe(`Business cards ${engine}`);
      }, 120_000);

      // ── a customer erased: the design's proof pictures, the first one made again included ──

      const shopperOf = async (): Promise<string> => String((await doors["owner"]!.load()).orders.find((o) => o["number"] === "BR-2288")!["email"]);
      const fileStatus = async (id: string): Promise<number> => (await owner.get(`/api/v1/files/${id}`)).status;

      // The person's data lists the proof the owner's replaced, binned but kept, among the files on their rows: the
      // one more the search counts than the erase takes.
      it("finds the proof picture the owner's replaced among the customer's files, as the owner", async () => {
        const address = await shopperOf();
        const found = ok(await callers["owner"]!.post<{ data: { sources: { kind: string; keys: string[] }[] } }>("/api/v1/privacy/find", { address })).data.sources;
        expect(found.filter((s) => s.kind === "files").flatMap((s) => s.keys)).toContain(proofFiles["maker"]);
      });

      // Adminium 0.3.50: the search, the preview and the erase count a copy row's binned files alike.
      it("counts the same files in a person's data as erasing them takes", async () => {
        const address = await shopperOf();
        type Counted = { kind: string; count: number };
        const found = ok(await callers["owner"]!.post<{ data: { sources: Counted[] } }>("/api/v1/privacy/find", { address })).data.sources.filter((s) => s.kind === "files");
        const goes = ok(await callers["owner"]!.post<{ data: { goes: Counted[] } }>("/api/v1/privacy/erase/preview", { address })).data.goes.filter((s) => s.kind === "files");
        expect(goes.reduce((n, s) => n + s.count, 0)).toBe(found.reduce((n, s) => n + s.count, 0));
      });

      it("erases the design's proof picture with its customer, as the owner", async () => {
        // The owner's proof was made over the maker's on the same version: the maker's is in the bin, still kept.
        expect(proofFiles["maker"]).not.toBe(proofFiles["owner"]);
        expect(await fileStatus(proofFiles["maker"]!)).toBe(200);
        expect(await fileStatus(proofFiles["owner"]!)).toBe(200);
        const address = await shopperOf();
        const erased = await callers["owner"]!.post("/api/v1/privacy/erase", { address, confirm: address });
        expect(erased.status, JSON.stringify(erased.body).slice(0, 400)).toBe(200);
        expect(await fileStatus(proofFiles["owner"]!)).toBe(404);
      }, 120_000);

      // Adminium 0.3.50: the erase takes a copy row's binned files, the proof picture a remade proof replaced.
      it("erases a proof picture made again with its customer: the one it replaced too", async () => {
        expect(await fileStatus(proofFiles["maker"]!)).toBe(404);
      });
    });
  });
});
