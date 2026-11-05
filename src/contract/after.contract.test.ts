/**
 * AFTER THE ORDER, ON A BUILT ADMINIUM, THROUGH THE SHOP'S OWN DOOR.
 *
 * The app and the Customiser it requires are installed on a BUILT Adminium
 * (`ADMINIUM_REPO`) as an operator installs them (the manifest written for
 * the release it is: `release.ts`), the
 * sample added at the moment the comps pin the studio to (16:40 on Thursday
 * 6 August 2026 in Settle), and the shop opened the way its customer build
 * opens it. A shopper places an order with words on it; the studio sends a
 * proof; then, each through the door the shop's pages use (`after-port.ts`):
 *
 * - the lookup: a code asked for the address, read from the e-mail Adminium
 *   sent, typed back; the shopper's own orders read, nobody else's; the
 *   proof's picture read; the proof APPROVED by the shopper's own claimed
 *   write, and Adminium lets the line go to the bench;
 * - a wrong code is said as wrong, with the tries left;
 * - the order's own link (the one the save handed the confirmation, which
 *   its e-mail in the outbox carries) opens that one order, and a link that
 *   is nobody's opens nothing; a CHANGE is asked for through it, the
 *   shopper's words stored, the line held back;
 * - "Ask us for something" written behind the human check; "Something's
 *   wrong" refusing an order not the address's own, and taking one that is,
 *   found by the number the shopper typed;
 * - every e-mail of it sent and in the e2e server's sink, to the shopper and
 *   to the studio, under its template's subject (`mail.ts`): the order's,
 *   with its own link; the proof's; the studio's word that a change was
 *   asked; a request's and a problem's, and the studio's copy of each;
 * - the footer's pages read what they show: the closures, the rates, the
 *   machines, the app's settings; the postage page's dry run dates a coaster
 *   and a mug.
 *
 * It runs with `CONTRACT=1` where a built Adminium and a built add-ons checkout
 * are, and says why it skipped otherwise. On SQLite the studio's database is
 * a file it makes; on Postgres and MySQL it is the e2e server's Northwind,
 * whose own bare `products`, `orders` and `customers` the install keeps clear
 * of (Adminium 0.3.44 and later).
 */
import { rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { afterAll, beforeAll, describe, expect, it } from "vitest";

import type { AfterPort } from "../shop/after-port.ts";
import { AdminiumShop } from "../shop/door.ts";
import { isShopError, type Row } from "../shop/port.ts";
import { orderBody, useShop, type BasketLine } from "../shop/store.ts";
import { addOnBundle, addSample, appBundle, boot, Caller, ENGINES, missing, missingAddOn, ok, PORTS_PER_ENGINE, until, type Engine, type Server } from "./harness.ts";
import { delivered, sinkMail, type Mail } from "./mail.ts";
import { engineAtLeast, ENGINE_VERSION, MANIFEST_TEXT } from "./release.ts";

const why = missing() ?? missingAddOn("customiser");
if (why !== null && process.env["ADMINIUM_REQUIRE_CONTRACT"] === "1") throw new Error(`the contract must run here, and cannot: ${why}`);
const PORT_BASE = Number(process.env["CONTRACT_PORT_BASE"] ?? 4930);
const ADMIN = { email: process.env["E2E_ADMIN_EMAIL"] ?? "e2e@adminium.local", password: process.env["E2E_ADMIN_PASSWORD"] ?? "adminium-e2e-password" };
/** 16:40 on Thursday 6 August 2026 in Settle (British Summer Time), before the five o'clock cut-off. */
const THURSDAY = Date.parse("2026-08-06T15:40:00Z");
/*
 * Made-up addresses on a domain that is not kept for examples: the outbox sends to them (it skips
 * `example.com` and the like), so their e-mails reach the e2e server's sink.
 */
const SHOPPER = { name: "Priya Shah", email: "priya.shah@birch-row-shoppers.dev", address_line1: "12 Mill Lane", town: "Settle", postcode: "BD24 9AA", may_email: false, language: "en-US" };
const ASKER = "bex.thorne@birch-row-shoppers.dev";
/** The studio's own address, where its copy of a request or a problem goes (the sample's is one kept for examples). */
const STUDIO = "studio@birch-row-studio.dev";
/** Before 0.3.44 an order's number as typed stayed empty, so no problem could find its order by it. */
const NUMBER_AS_TYPED = engineAtLeast("0.3.44");
/** Before 0.3.44 an install beside bare tables of the same names took them for the app's own. */
const BESIDE_BARE_TABLES = engineAtLeast("0.3.44");
/** A one-pixel PNG: the proof's picture as the studio's browser stores it. */
const PNG = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==", "base64");

describe.skipIf(why !== null)(`after the order, on a built Adminium${why === null ? "" : ` — skipped: ${why}`}`, () => {
  ENGINES.forEach(([engine, available], index) => {
    const beside = engine !== "sqlite" && !BESIDE_BARE_TABLES;
    describe.skipIf(!available || beside)(`on ${engine}${beside ? ` — skipped: an install beside Northwind's bare tables needs Adminium 0.3.44 (this run has ${ENGINE_VERSION})` : ""}`, () => {
      let server: Server;
      let staff: Caller;
      let connectionId = "";
      let served: { publishableKey: string; publicKeys?: Record<string, string>; tables?: Record<string, string>; settings?: Record<string, unknown> };
      let shop: AdminiumShop;
      let catalogue: Awaited<ReturnType<AdminiumShop["catalogue"]>>;
      const tables = () => served.tables ?? {};
      const table = (ref: string) => encodeURIComponent(tables()[ref] ?? `maker_${ref}`);

      const originFetch: typeof fetch = (input, init) => {
        const headers = new Headers(init?.headers);
        headers.set("origin", server.base);
        return fetch(input, { ...init, headers });
      };
      /** A new browser: its own door, holding no session. */
      const browser = () =>
        new AdminiumShop({ baseUrl: server.base, publishableKey: served.publishableKey, ...(served.tables === undefined ? {} : { tables: served.tables }), ...(served.publicKeys === undefined ? {} : { publicKeys: served.publicKeys }), ...(served.settings === undefined ? {} : { settings: served.settings }) }, { fetch: originFetch });
      const rows = async (ref: string): Promise<Row[]> => ok(await staff.get<{ data: Row[] }>(`/api/v1/data/${connectionId}/${table(ref)}?limit=200`)).data;
      const mail = (): Promise<Mail[]> => sinkMail(server.sink);
      /** The outbox's row of one kind of e-mail about one row (`order_id`, `request_id`, `problem_id`). */
      const messageOf = (kind: string, link: string, id: unknown) => async () => (await rows("messages")).find((m) => m["kind"] === kind && String(m[link]) === String(id));
      /**
       * The newest e-mail to an address that says what `match` looks for, among those after the first
       * `after` the sink held (the sink stamps mail by the server's own pinned clock, so it is counted, not timed).
       */
      const mailTo = (address: string, match: RegExp, after = 0) =>
        until(async () => {
          const found = (await mail()).slice(after).filter((m) => m.to.includes(address) && match.test(`${m.text}\n${m.html}`));
          return found.at(-1);
        }, `an e-mail to ${address} matching ${String(match)}`, 60_000).catch(async (error: unknown) => {
          throw new Error(`${String(error)}; the sink holds: ${JSON.stringify((await mail()).map((m) => [m.to, m.subject]))}`);
        });
      /** What a refusal said, for an assertion's message. */
      const said = (error: unknown) => (isShopError(error) ? JSON.stringify({ code: error.refused.code, column: error.refused.column, reason: error.refused.reason, child: error.refused.child }) : String(error));

      beforeAll(async () => {
        server = await boot(engine as Engine, PORT_BASE + index * PORTS_PER_ENGINE, THURSDAY - 60_000, { database: `maker_after_${engine}${process.env["CONTRACT_DB_SUFFIX"] ?? ""}` });
        staff = new Caller(server.base, { origin: server.base });
        await staff.signIn(ADMIN.email, ADMIN.password);
        if (engine === "sqlite") {
          // The studio's own empty database.
          const file = join(tmpdir(), `maker-after-contract-${engine}-${String(PORT_BASE)}.db`);
          rmSync(file, { force: true });
          writeFileSync(file, "");
          connectionId = ok(await staff.post<{ id: string }>("/api/v1/connections", { name: "birch-row", engine: "sqlite", dsn: `sqlite:${file}` }), 201).id;
        } else {
          connectionId = ok(await staff.get<{ connections: { id: string; name: string }[] }>("/api/v1/connections")).connections.find((c) => c.name === "northwind")!.id;
        }
        const addOn = addOnBundle("customiser");
        const stagedAddOn = await staff.post(`/api/v1/add-ons/upload?expectedSha512=${encodeURIComponent(addOn.integrity)}`, addOn.buffer);
        if (![200, 201].includes(stagedAddOn.status)) throw new Error(`add-on upload: ${JSON.stringify(stagedAddOn.body).slice(0, 600)}`);
        const app = appBundle({ manifest: MANIFEST_TEXT });
        const staged = await staff.post(`/api/v1/apps/upload?expectedSha512=${encodeURIComponent(app.integrity)}`, app.buffer);
        if (![200, 201].includes(staged.status)) throw new Error(`upload: ${JSON.stringify(staged.body).slice(0, 600)}`);
        const body = { key: app.key, version: app.version, connectionId };
        const plan = ok(await staff.post<{ plan: { checksum: string; installable: boolean } }>("/api/v1/apps/plan", body)).plan;
        if (!plan.installable) {
          // Said without the tables it would make, which run to pages: what stops it is in the rest.
          const { create: _create, ...rest } = plan as Record<string, unknown>;
          throw new Error(`not installable: ${JSON.stringify(rest).slice(0, 4000)}`);
        }
        const installed = ok(await staff.post<{ rules: { skipped: unknown[] } }>("/api/v1/apps/install", { ...body, planChecksum: plan.checksum, addOns: [{ key: addOn.key, version: addOn.version }] }));
        if (installed.rules.skipped.length > 0) throw new Error(`the install skipped rules: ${JSON.stringify(installed.rules.skipped).slice(0, 1500)}`);
        ok(await staff.patch(`/api/v1/connections/${connectionId}`, { timezone: "Europe/London", currency: "GBP" }));
        await server.setClock(THURSDAY, true);
        await addSample(staff);
        await server.setClock(THURSDAY);
        ok(await staff.put("/api/v1/public-api", { enabled: true }));
        ok(await staff.put("/api/v1/settings/email", { publicOrigin: server.base }));

        served = ok(await new Caller(server.base).get<typeof served>("/apps/maker/customer/surface-config.json"));
        // The studio's own address, for its copies of a request and a problem.
        const settings = (await rows("settings"))[0]!;
        ok(await staff.patch(`/api/v1/data/${connectionId}/${table("settings")}/${String(settings["id"])}`, { values: { email: STUDIO } }));
        shop = browser();
        catalogue = await shop.catalogue();
        useShop.setState({ catalogue });
      }, 360_000);

      afterAll(async () => {
        await server?.stop();
      });

      const productOf = (code: string) => catalogue.products.find((p) => p.code === code)!;
      const first = (productId: unknown, kind: string) => catalogue.options.filter((o) => String(o.productId) === String(productId) && o.kind === kind)[0]?.id ?? null;
      const lineOf = (code: string, qty: number, more: Partial<BasketLine> = {}): BasketLine => {
        const p = productOf(code);
        return { id: "l1", productId: p.id, qty, materialId: first(p.id, "material"), sizeId: first(p.id, "size"), finishId: first(p.id, "finish"), lettering: null, design: null, features: [], ...more };
      };
      const second = () => catalogue.services.find((s) => s.code === "second")!.id;

      /** An order placed through the shop's door, as its checkout places it. */
      const place = async (door: AdminiumShop, line: BasketLine, key: string) => {
        const body = orderBody({ ...SHOPPER, service_id: second() }, [line]);
        const quoted = await door.quote(body);
        return door.place(body, key, String(quoted.order["total"]));
      };
      /** The studio sends a proof of a line: its picture stored through the files route, then the proof row. */
      const sendProof = async (order: Row, line: Row, note: string): Promise<Row> => {
        const stored = ok(await staff.send<{ ref: string }>("POST", `/api/v1/files?${new URLSearchParams({ filename: "proof.png", connectionId, table: tables()["proofs"] ?? "maker_proofs", column: "picture" }).toString()}`, PNG, { "content-type": "image/png" }), 201);
        return ok(await staff.post<{ data: Row }>(`/api/v1/data/${connectionId}/${table("proofs")}`, { values: { order_id: order["id"], line_id: line["id"], kind: "lettering", picture: stored.ref, note } }), 201).data;
      };

      let first1: Awaited<ReturnType<AdminiumShop["place"]>>;
      let proof1: Row;

      it("reads what the footer's pages show: the app's settings, the closures, the rates and the machines", async () => {
        expect(served.settings).toMatchObject({ studio_days: "tue,wed,thu,fri,sat", cutoff: "17:00" });
        const extras = await shop.after().extras();
        expect(extras.closures.map((c) => [String(c["from_date"]).slice(0, 10), c["reason"]])).toEqual([["2026-08-15", "Closed — we're at the Whitby craft fair"]]);
        expect(extras.rates.map((r) => Number(r["price"])).sort()).toEqual([3.95, 7.5]);
        expect(extras.machines.map((m) => m["name"])).toEqual(["The laser", "Printer A", "Printer B", "The kiln"]);
        expect(extras.machines.every((m) => typeof m["shop_note"] === "string")).toBe(true);
        expect(catalogue.studio).toMatchObject({ refPrefix: "BR-" });
        expect(catalogue.studio.aboutPage).toContain("Birch Row is Ada and Nell.");
        expect(catalogue.materials.find((m) => m.code === "wal6")?.care).toContain("No dishwasher");
      });

      it("dates the postage page's examples by a dry run: a coaster by Tue 11 Aug, a mug by Fri 21 Aug", async () => {
        const quick = productOf("coast-wal");
        const slow = [...catalogue.products].sort((a, b) => b.leadDays - a.leadDays)[0]!;
        const quoted = await shop.quote(orderBody({ service_id: second(), language: "en-US" }, [lineOf(quick.code, 1), lineOf(slow.code, 1)]));
        expect(quoted.lines.map((l) => [l["lead_days"], String(l["post_by"]).slice(0, 10)])).toEqual([
          [3, "2026-08-11"],
          [10, "2026-08-21"],
        ]);
      });

      it("finds the order by the e-mailed code, reads the proof's picture, and approves it by the shopper's own write", async () => {
        first1 = await place(shop, lineOf("coast-ply", 1, { lettering: "Mill Lane" }), `maker-after-${engine}-0000000001`);
        expect(first1.order["number"]).toBe("BR-2291");
        const line = (await rows("order_lines")).find((l) => String(l["order_id"]) === String(first1.order["id"]))!;
        proof1 = await sendProof(first1.order, line, "Set in Fenwick, 6 mm.");

        // A new browser: the number and the e-mail typed, a code asked for.
        const door = browser().after();
        const asked = (await mail()).length;
        await door.requestCode(SHOPPER.email, "en-US");
        const message = await mailTo(SHOPPER.email, /\b\d{6}\b/, asked);
        const code = /\b(\d{6})\b/.exec(message.text)![1]!;
        // A wrong code first: wrong, with the tries left.
        const wrong = await door.verifyCode(SHOPPER.email, code === "000001" ? "000002" : "000001");
        expect(wrong).toMatchObject({ ok: false, reason: "wrong" });
        expect(await door.verifyCode(SHOPPER.email, code)).toEqual({ ok: true });
        expect(door.signedIn()).toBe(true);

        // Their own orders, and nobody else's: the sample's BR-2288 is Iris's.
        const mine = await door.myOrders();
        expect(mine.map((o) => o["number"])).toEqual(["BR-2291"]);
        const read = await door.myRows();
        const theirs = read.lines.filter((l) => String(l["order_id"]) === String(first1.order["id"]));
        expect(theirs.map((l) => [l["lettering"], l["stage"], l["proof_state"], "design_code" in l])).toEqual([["Mill Lane", "make", "sent", true]]);
        expect(read.proofs.map((p) => [Number(p["version"]), p["state"], p["note"]])).toEqual([[1, "sent", "Set in Fenwick, 6 mm."]]);

        // The picture, as the studio stored it.
        const picture = await door.proofPicture("mine", proof1["id"] as number);
        expect(picture).not.toBeNull();
        expect([...new Uint8Array(await picture!.arrayBuffer()).slice(0, 4)]).toEqual([0x89, 0x50, 0x4e, 0x47]);

        // "Yes, make it": the shopper's own write.
        const answered = await door.answerProof("mine", proof1["id"] as number, { state: "approved" });
        expect(answered["state"]).toBe("approved");
        const after = (await rows("order_lines")).find((l) => String(l["id"]) === String(line["id"]))!;
        expect([after["proof_state"], Number(after["proof_ok"])]).toEqual(["approved", 1]);
        expect((await rows("proofs")).find((p) => String(p["id"]) === String(proof1["id"]))!["answered_at"]).not.toBeNull();

        // A proof answered is answered: a second answer is refused.
        const again = await door.answerProof("mine", proof1["id"] as number, { state: "change_asked", change_note: "Bigger" }).catch((e: unknown) => e);
        expect(isShopError(again)).toBe(true);

        // To the bench now: Adminium stamps when, and the shopper's page reads it.
        ok(await staff.patch(`/api/v1/data/${connectionId}/${table("order_lines")}/${String(line["id"])}`, { values: { stage: "making" }, from: "make" }));
        const bench = (await door.myRows()).lines.find((l) => String(l["id"]) === String(line["id"]))!;
        expect([bench["stage"], bench["started_at"] !== null]).toEqual(["making", true]);
      }, 180_000);

      it("opens an order by its own link and asks for a change through it, in the shopper's words", async () => {
        const made = await place(shop, lineOf("sign-house", 1, { lettering: "Mill House" }), `maker-after-${engine}-0000000002`);
        expect(made.order["number"]).toBe("BR-2292");
        const line = (await rows("order_lines")).find((l) => String(l["order_id"]) === String(made.order["id"]))!;
        const proof = await sendProof(made.order, line, "Slate, lettering 40 mm.");

        // The order's own link: the code the save handed the confirmation page, the one its e-mail carries.
        const token = made.link!.token;
        expect(token).toMatch(/^[0-9A-Za-z]{16}$/);
        // Its e-mail is sent, the order's own link in it; and the proof's.
        await delivered({ sink: server.sink, manifest: MANIFEST_TEXT, kind: "order-received", to: SHOPPER.email, known: { "order.number": "BR-2292" }, body: new RegExp(`/order#${token}\\b`), row: messageOf("order-received", "order_id", made.order["id"]) });
        await delivered({ sink: server.sink, manifest: MANIFEST_TEXT, kind: "proof-ready", to: SHOPPER.email, known: { "order.number": "BR-2292", "proof.version": "1" }, row: messageOf("proof-ready", "proof_id", proof["id"]) });

        const door: AfterPort = browser().after();
        expect(door.sharedHeld()).toBe(false);
        expect(await door.openShared("AAAAAAAAAAAAAAAA")).toBe("unknown");
        expect(await door.openShared(token)).toBe("opened");
        const read = (await door.readShared())!;
        expect([read.order["number"], read.lines.length, read.proofs.map((p) => p["state"])]).toEqual(["BR-2292", 1, ["sent"]]);
        // Only that order: the first is not reached by this link.
        expect(read.lines.every((l) => String(l["order_id"]) === String(made.order["id"]))).toBe(true);

        await door.answerProof("link", proof["id"] as number, { state: "change_asked", change_note: "Could the letters be a little larger?" });
        const stored = (await rows("proofs")).find((p) => String(p["id"]) === String(proof["id"]))!;
        expect([stored["state"], stored["change_note"]]).toEqual(["change_asked", "Could the letters be a little larger?"]);
        const held = (await rows("order_lines")).find((l) => String(l["id"]) === String(line["id"]))!;
        expect([held["proof_state"], Number(held["proof_ok"])]).toEqual(["change_asked", 0]);
        // The studio hears of it, at its own address.
        await delivered({ sink: server.sink, manifest: MANIFEST_TEXT, kind: "change-asked", to: STUDIO, known: { "order.number": "BR-2292", "proof.version": "1" }, row: messageOf("change-asked", "proof_id", proof["id"]) });
      }, 180_000);

      it("takes a request behind the human check, every field it was sent kept", async () => {
        const door = browser().after();
        const asked = await door.ask({ name: "Bex Thorne", email: ASKER, language: "en-US", idea: "A sign for the allotment gate", material: "Slate", wanted_when: "End of August", client_key: `maker-after-${engine}-ask-000001` }).catch((e: unknown) => {
          throw new Error(`the request was refused: ${said(e)}`);
        });
        expect(asked["ref"]).toMatch(/^ASK-\d{4}$/);
        const request = (await rows("commission_requests")).find((r) => r["ref"] === asked["ref"])!;
        expect([request["material"], request["wanted_when"], request["status"]]).toEqual(["Slate", "End of August", "new"]);
        // Its e-mail to the asker, and the studio's copy.
        const known = { "request.ref": String(asked["ref"]) };
        await delivered({ sink: server.sink, manifest: MANIFEST_TEXT, kind: "request-received", to: ASKER, known, row: messageOf("request-received", "request_id", request["id"]) });
        await delivered({ sink: server.sink, manifest: MANIFEST_TEXT, kind: "request-copy", to: STUDIO, known, row: messageOf("request-copy", "request_id", request["id"]) });
      }, 60_000);

      it("refuses a problem about an order that is not the address's own, and keeps nothing", async () => {
        const door = browser().after();
        const before = (await rows("problem_reports")).length;
        const refused = await door.report({ order_ref: "BR-2288", name: "Priya Shah", email: SHOPPER.email, language: "en-US", what: "late", details: "Not here yet.", client_key: `maker-after-${engine}-fix-000002` }).catch((e: unknown) => e);
        expect(isShopError(refused) && [refused.refused.code, refused.refused.column], JSON.stringify(refused)).toEqual(["PUBLIC_WRITE_REFUSED", "order_ref"]);
        expect((await rows("problem_reports")).length).toBe(before);
      }, 60_000);

      it.skipIf(!NUMBER_AS_TYPED)(`takes a problem about the address's own order by its number, links it to that order, and e-mails both${NUMBER_AS_TYPED ? "" : ` — skipped: an order's number as typed needs Adminium 0.3.44 (this run has ${ENGINE_VERSION})`}`, async () => {
        const own = (await rows("orders")).find((o) => o["number"] === "BR-2291")!;
        expect(own["number_code"]).toBe("BR2291");
        const door = browser().after();
        // Typed as a shopper types it: small letters, no dash.
        const reported = await door.report({ order_ref: "br 2291", name: "Priya Shah", email: SHOPPER.email, language: "en-US", what: "damaged", details: "One coaster came cracked.", client_key: `maker-after-${engine}-fix-000001` });
        expect(reported["ref"]).toMatch(/^FIX-\d{4}$/);
        const problem = (await rows("problem_reports")).find((r) => r["ref"] === reported["ref"])!;
        expect(String(problem["order_id"])).toBe(String(first1.order["id"]));
        const known = { "problem.ref": String(reported["ref"]), "order.number": "BR-2291" };
        await delivered({ sink: server.sink, manifest: MANIFEST_TEXT, kind: "problem-received", to: SHOPPER.email, known, row: messageOf("problem-received", "problem_id", problem["id"]) });
        await delivered({ sink: server.sink, manifest: MANIFEST_TEXT, kind: "problem-copy", to: STUDIO, known, row: messageOf("problem-copy", "problem_id", problem["id"]) });
      }, 180_000);
    });
  });
});
