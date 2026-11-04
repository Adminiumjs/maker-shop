/**
 * THE STUDIO, AGAINST A REAL ADMINIUM.
 *
 * This repo's manifest and sample, installed with the built Customiser on a
 * BUILT Adminium (`ADMINIUM_REPO`, the release it asks for), on every engine
 * this run reaches, at the comp's pinned moment: Thursday 6 August 2026,
 * 16:40 in Settle. The studio's own door (the code the staff build runs) is
 * booted on a maker's and a packer's sessions, as their screens boot it, and
 * walks one lettered piece from its proof to the post:
 *
 *   - Adminium refuses to take the piece past "make" while its proof waits;
 *   - the maker sends a proof: the picture stored through the files route,
 *     the proof before it superseded, the new one numbered by Adminium and
 *     e-mailed (an outbox row);
 *   - the shopper approves it by their own write: the order's link from its
 *     e-mail opened by the shop's door, the proof answered through it;
 *   - the piece goes to making (its order with it), is made, is ready;
 *   - the packer posts it, and Adminium stamps it and e-mails the customer.
 *
 * Beside it: a reminder e-mailed; a design's proof sent as the Customiser's
 * own picture of its version; a spoil taking its share of a walnut sheet off
 * the shelf as Adminium works it out; and the customers' totals from their
 * orders.
 *
 * It runs with `CONTRACT=1` where an Adminium checkout with its built server
 * and dashboard is (`ADMINIUM_REPO`) and a built add-ons checkout
 * (`ADD_ONS_REPO`), and says why it skipped otherwise. Postgres and MySQL run
 * with `TEST_POSTGRES_URL` / `TEST_MYSQL_URL`.
 */
import { rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { AdminiumShop } from "../shop/door.ts";
import { moveLine, moveOrderLines, postOrders, sendProofs, spoil } from "../studio/actions.ts";
import { AdminiumStudio } from "../studio/adminiumStudio.ts";
import type { StudioData } from "../studio/door.ts";
import { fileIdOf, fileSrc, linesOf, proofsOf } from "../studio/facts.ts";
import { createSessionTransport } from "../studio/transport/sessionSource.ts";
import { loadStaffConfig } from "../studio/transport/staffConnection.ts";
import { ApiError, num, type Row } from "../studio/wire.ts";
import { addOnBundle, appBundle, boot, Caller, ENGINES, missing, newPassword, ok, png, PORTS_PER_ENGINE, until, type Engine, type Server } from "./studio-harness.ts";

const why = missing();
if (why !== null && process.env["ADMINIUM_REQUIRE_CONTRACT"] === "1") throw new Error(`the contract must run here, and cannot: ${why}`);
const PORT_BASE = Number(process.env["CONTRACT_PORT_BASE"] ?? 4970);
const ADMIN = { email: process.env["E2E_ADMIN_EMAIL"] ?? "e2e@adminium.local", password: process.env["E2E_ADMIN_PASSWORD"] ?? "adminium-e2e-password" };
/** 16:40 on Thursday 6 August 2026 in Settle (British Summer Time). */
const THURSDAY = Date.parse("2026-08-06T15:40:00Z");

describe.skipIf(why !== null)(`the studio against a built Adminium${why === null ? "" : ` — skipped: ${why}`}`, () => {
  ENGINES.forEach(([engine, available], index) => {
    describe.skipIf(!available)(`on ${engine}`, () => {
      let server: Server;
      let owner: Caller;
      let connectionId = "";
      let maker: AdminiumStudio;
      let packer: AdminiumStudio;
      let tables: Record<string, string> = {};

      /** Every row of one of the app's tables, as the owner reads it. */
      const rows = async (table: string): Promise<Row[]> => {
        const real = tables[table] ?? `maker_${table}`;
        const out: Row[] = [];
        for (let offset = 0; ; offset += 200) {
          const page = ok(await owner.get<{ data: Row[] }>(`/api/v1/data/${connectionId}/${encodeURIComponent(real)}?limit=200&offset=${String(offset)}`)).data;
          out.push(...page);
          if (page.length < 200) return out;
        }
      };
      const orderOf = (data: StudioData, number: string) => data.orders.find((o) => o["number"] === number)!;
      /** A door booted as the staff build boots it, on a person's own session. */
      const doorFor = async (caller: Caller): Promise<AdminiumStudio> => {
        const cfg = (await loadStaffConfig({ hostedStaff: true, base: "/apps/maker/staff/", fetchImpl: caller.fetchAs() }))!;
        expect(cfg.user).not.toBeNull();
        tables = { ...tables, ...cfg.tables };
        const transport = createSessionTransport({
          tableOfRef: cfg.tables,
          connectionId: cfg.connectionId ?? undefined,
          staff: { csrfToken: cfg.csrfToken, timezone: cfg.timezone, timezoneSource: cfg.timezoneSource, serverTimezone: cfg.serverTimezone, currency: cfg.currency },
          fetchImpl: caller.fetchAs(),
        });
        const said = Date.parse(String(cfg.now));
        return new AdminiumStudio(transport, cfg, { fetchImpl: caller.fetchAs(), skew: Number.isNaN(said) ? 0 : said - Date.now() });
      };
      /** Someone holding one of the app's roles and no other, signed in to the studio's own screens. */
      const person = async (slug: string): Promise<Caller> => {
        const roles = ok(await owner.get<{ roles: { id: string; name: string; slug?: string }[] }>("/api/v1/roles")).roles;
        const role = roles.find((r) => r.slug === `maker-${slug}`) ?? roles.find((r) => r.name.toLowerCase() === slug)!;
        const email = `${slug}.${engine}@birchrow.example`;
        const invited = ok(await owner.post<{ invite: { token: string } }>("/api/v1/users", { email, name: slug === "maker" ? "Jo Marsh" : "Ade Pack", roleIds: [role.id] }), 201);
        const password = newPassword();
        ok(await new Caller(server.base).post("/api/v1/auth/password/reset", { token: invited.invite.token, newPassword: password }));
        const caller = new Caller(server.base);
        await caller.signInToScreens(email, password);
        return caller;
      };

      beforeAll(async () => {
        server = await boot(engine as Engine, PORT_BASE + index * PORTS_PER_ENGINE, THURSDAY - 60_000, `maker_studio_contract_${engine}`);
        owner = new Caller(server.base);
        await owner.signIn(ADMIN.email, ADMIN.password);
        /*
         * The studio's own empty database, not the e2e server's Northwind: Northwind holds a
         * plain `orders` table, and an install that brings an add-on plans its tables a second
         * time after the add-on's step, then as if the app were already installed, and takes
         * that `orders` for its own (a core gap, named in the report). On SQLite the database
         * is a file of its own; Postgres and MySQL keep the e2e server's database.
         */
        if (engine === "sqlite") {
          const file = join(tmpdir(), `maker-studio-contract-${String(PORT_BASE)}.db`);
          rmSync(file, { force: true });
          writeFileSync(file, "");
          connectionId = ok(await owner.post<{ id: string }>("/api/v1/connections", { name: "birch-row", engine: "sqlite", dsn: `sqlite:${file}` }), 201).id;
        } else {
          connectionId = ok(await owner.get<{ connections: { id: string; name: string }[] }>("/api/v1/connections")).connections.find((c) => c.name === "northwind")!.id;
        }

        // The Customiser first, then the app that requires it, installed together.
        const customiser = addOnBundle("customiser");
        const stagedAddOn = await owner.post(`/api/v1/add-ons/upload?expectedSha512=${encodeURIComponent(customiser.integrity)}`, customiser.buffer);
        expect([200, 201], JSON.stringify(stagedAddOn.body).slice(0, 800)).toContain(stagedAddOn.status);
        const app = appBundle();
        const staged = await owner.post(`/api/v1/apps/upload?expectedSha512=${encodeURIComponent(app.integrity)}`, app.buffer);
        expect([200, 201], JSON.stringify(staged.body).slice(0, 800)).toContain(staged.status);
        const body = { key: app.key, version: app.version, connectionId };
        const plan = ok(await owner.post<{ plan: { installable: boolean; checksum: string } }>("/api/v1/apps/plan", { ...body, addOns: [customiser.key] })).plan;
        expect(plan.installable, JSON.stringify(plan).slice(0, 3000)).toBe(true);
        const install = await owner.post<{ rules: { skipped: unknown[] } }>("/api/v1/apps/install", { ...body, planChecksum: plan.checksum, addOns: [{ key: customiser.key, version: customiser.version }] });
        if (install.status !== 200) {
          // Said in full: what the plan the install stopped on found.
          const again = await owner.post<{ plan: { problems?: unknown } }>("/api/v1/apps/plan", body);
          const retried = await owner.post("/api/v1/apps/install", { ...body, planChecksum: (again.body as { plan?: { checksum?: string } }).plan?.checksum });
          throw new Error(`install refused: ${JSON.stringify(install.body).slice(0, 800)}\nplan again: ${JSON.stringify(again.body).slice(0, 4000)}\ninstall again: ${JSON.stringify(retried.body).slice(0, 4000)}`);
        }
        const installed = install.body;
        expect(JSON.stringify(installed.rules.skipped)).toBe("[]");
        ok(await owner.patch(`/api/v1/connections/${connectionId}`, { timezone: "Europe/London", currency: "GBP" }));

        // The sample is written for 16:40 on the dot: the clock stands there while it goes in, then runs on.
        await server.setClock(THURSDAY, true);
        ok(await owner.post("/api/v1/apps/maker/sample-data"));
        await until(async () => (ok(await owner.get<{ loaded: boolean }>("/api/v1/apps/maker/sample-data")).loaded ? true : undefined), "the sample to be added");
        await server.setClock(THURSDAY);
        // The shop's side is open, and an e-mail's links name this server: the shopper answers a proof there.
        ok(await owner.put("/api/v1/public-api", { enabled: true }));
        ok(await owner.put("/api/v1/settings/email", { publicOrigin: server.base }));

        maker = await doorFor(await person("maker"));
        packer = await doorFor(await person("packer"));
      }, 420_000);

      afterAll(async () => {
        await server?.stop();
      });

      it("boots the maker's and the packer's screens with the roles they hold", () => {
        expect(maker.who().roles).toEqual(["maker"]);
        expect(packer.who().roles).toEqual(["packer"]);
        expect(maker.facts()).toMatchObject({ zone: "Europe/London", currency: "GBP", studioDays: ["tue", "wed", "thu", "fri", "sat"] });
        expect(maker.who().can("customers", "read")).toBe(false);
        expect(packer.who().can("proofs", "read")).toBe(false);
      });

      it("walks a lettered piece from its proof to the post", async () => {
        // A real order (a sample's rows send no e-mail, Adminium's rule): a slate house sign with words on it,
        // placed through the shop's own door as its checkout places it, so the shopper holds the order's link.
        let data = await maker.load();
        const sign = data.products.find((p) => p["code"] === "sign-house")!;
        const option = (kind: string) => data.options.find((o) => String(o["product_id"]) === String(sign.id) && o["kind"] === kind)!.id;
        const second = data.services.find((s) => s["code"] === "second")!.id;
        const served = ok(await new Caller(server.base).get<{ publishableKey: string; publicKeys?: Record<string, string>; tables?: Record<string, string> }>("/apps/maker/customer/surface-config.json"));
        const originFetch: typeof fetch = (input, init) => {
          const headers = new Headers(init?.headers);
          headers.set("origin", server.base);
          return fetch(input, { ...init, headers });
        };
        const shop = new AdminiumShop({ ...served, baseUrl: server.base }, { fetch: originFetch });
        const body = {
          values: { name: "Ada W.", email: "ada.w@example.com", address_line1: "3 Mill Lane", town: "Settle", postcode: "BD24 0AA", service_id: second, language: "en-US" },
          children: { order_lines: [{ values: { product_id: sign.id, qty: 1, material_id: option("material"), size_id: option("size"), finish_id: option("finish"), lettering: "Mill House" } }] },
        };
        const placed = await shop.place(body, `maker-studio-${engine}-0000000001`, String((await shop.quote(body)).order["total"]));
        const made = placed.order;
        data = await maker.load();
        const mine = () => data.orders.find((o) => String(o.id) === String(made.id))!;
        expect(mine()["number"]).toBe("BR-2291");
        const line = linesOf(data, mine())[0]!;
        expect([line["lettering"], line["stage"], line["proof_state"] ?? null, num(line["proof_ok"])]).toEqual(["Mill House", "make", null, 0]);

        // Adminium holds it at make while no proof is approved, whatever a screen sends.
        const held = await maker.moveLine(line, "making").catch((e: unknown) => e);
        expect(held).toBeInstanceOf(ApiError);
        expect(held).toMatchObject({ status: 409, code: "STATE_MOVE_REFUSED", params: { from: "make", to: "making" } });

        // The maker sends a proof, then a second one: the first is superseded, the second numbered 2.
        const draw = async () => new Blob([new Uint8Array(png())], { type: "image/png" });
        expect((await sendProofs(maker, data, mine(), draw)).sent).toHaveLength(1);
        data = await maker.load();
        const { sent, missing: notMade } = await sendProofs(maker, data, mine(), draw);
        expect([sent.length, notMade.length]).toEqual([1, 0]);
        const proofs = (await rows("proofs")).filter((p) => String(p["line_id"]) === String(line.id)).sort((a, b) => Number(a["version"]) - Number(b["version"]));
        expect(proofs.map((p) => [Number(p["version"]), p["state"], p["kind"]])).toEqual([
          [1, "superseded", "lettering"],
          [2, "sent", "lettering"],
        ]);
        expect(fileIdOf(proofs[1]!["picture"])).toMatch(/^file_[0-9A-Z]{26}$/);
        expect(proofs[1]!["sent_by"]).toBe("Jo Marsh");
        // Its picture is the bytes the maker's browser drew.
        const picture = await owner.fetchAs()(fileSrc(proofs[1]!["picture"])!);
        expect(picture.status).toBe(200);
        expect([...new Uint8Array(await picture.arrayBuffer()).slice(0, 4)]).toEqual([0x89, 0x50, 0x4e, 0x47]);
        // Adminium e-mails the proof, and the reminder: outbox rows for the order, to the shopper (one proof
        // e-mail an order: a later proof takes the earlier one's place).
        const ready = await until(async () => ((await rows("messages")).filter((m) => m["kind"] === "proof-ready" && String(m["order_id"]) === String(made.id)).length >= 1 ? true : undefined), "the proof's e-mail", 45_000).catch(async (error: unknown) => {
          throw new Error(`${String(error)}: ${JSON.stringify((await rows("messages")).map((m) => [m["kind"], m["order_id"], m["status"], m["skip_reason"], m["error"]]))}`);
        });
        expect(ready).toBe(true);
        await maker.remind(proofs[1]!);
        const reminder = await until(async () => (await rows("messages")).find((m) => m["kind"] === "proof-reminder" && String(m["order_id"]) === String(made.id)), "the reminder's e-mail", 45_000);
        expect(reminder["to_address"]).toBe("ada.w@example.com");

        // The shopper approves it, their own write: the order's own link (the one its confirmation holds and its
        // e-mail carries), opened by the shop's door in another browser.
        const token = placed.link!.token;
        const shopper = new AdminiumShop({ ...served, baseUrl: server.base }, { fetch: originFetch }).after();
        expect(await shopper.openShared(token)).toBe("opened");
        expect((await shopper.readShared())?.proofs.find((p) => String(p["id"]) === String(proofs[1]!.id))?.["state"]).toBe("sent");
        expect((await shopper.answerProof("link", proofs[1]!.id as number, { state: "approved" }))["state"]).toBe("approved");
        data = await maker.load();
        const approved = data.lines.find((l) => String(l.id) === String(line.id))!;
        expect([approved["proof_state"], num(approved["proof_ok"])]).toEqual(["approved", 1]);

        // On the bench: to making (the order with it), made, ready.
        await moveLine(maker, data, approved, "making");
        data = await maker.load();
        expect(mine()["status"]).toBe("making");
        expect(await moveOrderLines(maker, data, mine(), "finishing", ["make", "making"])).toEqual({ moved: 1, held: 0 });
        data = await maker.load();
        expect(await moveOrderLines(maker, data, mine(), "ready", ["make", "making", "finishing"])).toEqual({ moved: 1, held: 0 });
        data = await maker.load();
        expect(mine()["status"]).toBe("ready");
        const done = data.lines.find((l) => String(l.id) === String(line.id))!;
        expect([done["stage"], done["made_by"]]).toEqual(["ready", "Jo Marsh"]);

        // The packer posts it; Adminium stamps it and e-mails the customer.
        const packed = await packer.load();
        expect(await postOrders(packer, packed, [packed.orders.find((o) => String(o.id) === String(made.id))!])).toBe(1);
        const posted = (await rows("orders")).find((o) => String(o.id) === String(made.id))!;
        expect([posted["status"], posted["posted_by"], posted["tracking"] ?? null]).toEqual(["posted", "Ade Pack", null]);
        expect(posted["posted_at"]).not.toBeNull();
        expect((await rows("order_lines")).find((l) => String(l.id) === String(line.id))!["stage"]).toBe("posted");
        await until(async () => (await rows("messages")).find((m) => m["kind"] === "order-posted" && String(m["order_id"]) === String(made.id)), "the posted e-mail", 45_000);
      }, 300_000);

      it("refuses a packer anything but the post", async () => {
        const data = await packer.load();
        const line = linesOf(data, orderOf(data, "BR-2281"))[0]!;
        const refused = await packer.moveLine(line, "making").catch((e: unknown) => e);
        expect(refused).toBeInstanceOf(ApiError);
        expect((refused as ApiError).status).toBeGreaterThanOrEqual(400);
      });

      it("stamps a reminder of a sample's proof still waiting (a sample's rows send no e-mail)", async () => {
        const data = await maker.load();
        const line = linesOf(data, orderOf(data, "BR-2280"))[0]!;
        const waiting = proofsOf(data, line)[0]!;
        expect(waiting["state"]).toBe("sent");
        await maker.remind(waiting);
        expect((await rows("proofs")).find((p) => String(p.id) === String(waiting.id))!["reminded_at"]).not.toBeNull();
      });

      it("sends a design's proof as the Customiser made it from the design's version", async () => {
        let data = await maker.load();
        // Iris's book nook: its design ordered (versions snapshotted), its proof waiting.
        const order = orderOf(data, "BR-2288");
        // No proof made yet: nothing goes, and the line is named.
        const first = await sendProofs(maker, data, order, async () => null);
        expect([first.sent.length, first.missing.length]).toEqual([0, 1]);
        // The Customiser's panel makes the picture of the version (here, as the panel stores it: the version's proof file).
        const line = linesOf(data, order)[0]!;
        const schema = ok(await owner.get<{ model: { tables: { name: string }[] } }>(`/api/v1/connections/${connectionId}/schema`)).model.tables.map((t) => t.name).filter((n) => n.startsWith("customiser"));
        const version = data.versions.find((v) => String(v["design_id"]) === String(line["design_id"]));
        expect(version, `${JSON.stringify(schema)} ${JSON.stringify(data.designs.length)} ${JSON.stringify(line)}`).toBeDefined();
        if (version === undefined) return;
        const stored = ok(await owner.send<{ ref: string }>("POST", `/api/v1/files?${new URLSearchParams({ filename: "design-proof.png", connectionId, table: "customiser_design_versions", column: "proof_file" }).toString()}`, png(), { "content-type": "image/png" }), 201);
        ok(await owner.patch(`/api/v1/data/${connectionId}/customiser_design_versions/${String(version.id)}`, { values: { proof_file: stored.ref } }));
        data = await maker.load();
        const { sent } = await sendProofs(maker, data, orderOf(data, "BR-2288"), async () => null);
        expect(sent).toHaveLength(1);
        const proof = (await rows("proofs")).filter((p) => String(p["line_id"]) === String(line.id)).sort((x, y) => Number(y["version"]) - Number(x["version"]))[0]!;
        expect([proof["kind"], String(proof["design_version_id"]), proof["state"]]).toEqual(["design", String(version.id), "sent"]);
        // A copy, its own file: never the Customiser's file itself.
        expect(fileIdOf(proof["picture"])).toMatch(/^file_[0-9A-Z]{26}$/);
        expect(fileIdOf(proof["picture"])).not.toBe(fileIdOf(stored.ref));
      });

      it("takes a spoil's share of its material off the shelf, as Adminium works it out", async () => {
        const before = (await rows("materials")).find((m) => m["code"] === "wal6")!;
        let data = await maker.load();
        const order = orderOf(data, "BR-2268");
        const coasters = linesOf(data, order).find((l) => l["stage"] === "ready")!;
        const perUnit = num(coasters["stock_per_unit"])!;
        expect(perUnit).toBeGreaterThan(0);
        await spoil(maker, data, coasters, 1);
        data = await maker.load();
        const again = data.lines.find((l) => String(l.id) === String(coasters.id))!;
        expect([again["stage"], num(again["spoiled"])]).toEqual(["make", 1]);
        const after = (await rows("materials")).find((m) => m["code"] === "wal6")!;
        // On hand is kept to two places: the share of a sheet comes off as Adminium rounds it.
        expect(Number(before["on_hand"]) - Number(after["on_hand"])).toBeCloseTo(perUnit, 2);
        const movement = (await rows("stock_movements")).find((m) => m["kind"] === "spoiled" && String(m["line_id"]) === String(coasters.id))!;
        expect([Number(movement["units"]), Number(movement["per_unit"]), movement["made_by"]]).toEqual([1, perUnit, "Jo Marsh"]);
      });

      it("keeps each customer's orders and what they were charged in all from their orders", async () => {
        const [customers, orders] = await Promise.all([rows("customers"), rows("orders")]);
        for (const customer of customers) {
          const theirs = orders.filter((o) => String(o["customer_id"]) === String(customer.id));
          expect(Number(customer["order_count"] ?? 0), String(customer["email"])).toBe(theirs.length);
          const total = theirs.reduce((sum, o) => sum + Math.round(Number(o["total"]) * 100), 0) / 100;
          expect(Number(customer["spent"] ?? 0), String(customer["email"])).toBeCloseTo(total, 2);
        }
      });
    });
  });
});
