/**
 * A SHOPPER BUYS FROM BIRCH ROW ON A BUILT ADMINIUM, THROUGH THE SHOP'S OWN DOOR.
 *
 * The app and the Customiser it requires are installed on a BUILT Adminium
 * (`ADMINIUM_REPO`) as an operator installs them (the manifest written for
 * the release it is: `release.ts`), the
 * sample added at the moment the comps pin the studio to (16:40 on Thursday
 * 6 August 2026 in Settle), and the shop is opened the way its customer build
 * opens it: the surface config Adminium serves, the shop's door
 * (`src/shop/door.ts`), the bodies the shop's state writes (`orderBody`).
 * Then:
 *
 * - the catalogue reads as the shop shows it;
 * - a piece's page is priced by one dry run: walnut coasters £34.00 one set,
 *   £31.28 each for four, £29.24 for eight, £27.88 for twelve, posted by
 *   Tue 11 Aug;
 * - the shopper lays their words out on the coasters' Ring in the Customiser
 *   (a design saved through the shop's key, behind the human check);
 * - the order goes in as one write, held to the total the shopper saw:
 *   BR-2291, £34.00 + Second class £3.95 = £37.95, post by Tue 11 Aug, the
 *   line naming the design; a retry answers the same order; the order's own
 *   link is open at once, and its e-mail, which carries that link, is sent,
 *   listing the line (the piece × its quantity, what it is made of, its
 *   total) and the postage, the total and the post-by date;
 * - a total that moved is refused with the figures it came to, and a field
 *   Adminium refuses is named;
 * - words longer than the piece takes are refused, by the dry run and by the
 *   order alike; words that just fit go in (Adminium 0.3.44 and later).
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

import { AdminiumShop } from "../shop/door.ts";
import { isShopError, type Row } from "../shop/port.ts";
import { orderBody, productQuantities, useShop, type BasketLine } from "../shop/store.ts";
import { addOnBundle, addSample, appBundle, boot, Caller, ENGINES, missing, missingAddOn, ok, PORTS_PER_ENGINE, type Engine, type Server } from "./harness.ts";
import { delivered, plain } from "./mail.ts";
import { engineAtLeast, ENGINE_VERSION, MANIFEST_TEXT, NEEDS_PANELS_AND_LIMITS, READS_PANELS_AND_LIMITS } from "./release.ts";

const why = missing() ?? missingAddOn("customiser");
if (why !== null && process.env["ADMINIUM_REQUIRE_CONTRACT"] === "1") throw new Error(`the contract must run here, and cannot: ${why}`);
const PORT_BASE = Number(process.env["CONTRACT_PORT_BASE"] ?? 4960);
const ADMIN = { email: process.env["E2E_ADMIN_EMAIL"] ?? "e2e@adminium.local", password: process.env["E2E_ADMIN_PASSWORD"] ?? "adminium-e2e-password" };
/** 16:40 on Thursday 6 August 2026 in Settle (British Summer Time), before the five o'clock cut-off. */
const THURSDAY = Date.parse("2026-08-06T15:40:00Z");
/** A made-up address on a domain the outbox sends to (it skips those kept for examples): its e-mail reaches the e2e server's sink. */
const SHOPPER = { name: "Priya Shah", email: "priya.shah@birch-row-shoppers.dev", address_line1: "12 Mill Lane", town: "Settle", postcode: "BD24 9AA", may_email: true, language: "en-US" };

describe.skipIf(why !== null)(`a shopper buys on a built Adminium${why === null ? "" : ` — skipped: ${why}`}`, () => {
  ENGINES.forEach(([engine, available], index) => {
    const beside = engine !== "sqlite" && !engineAtLeast("0.3.44");
    describe.skipIf(!available || beside)(`on ${engine}${beside ? ` — skipped: an install beside Northwind's bare tables needs Adminium 0.3.44 (this run has ${ENGINE_VERSION})` : ""}`, () => {
      let server: Server;
      let staff: Caller;
      let connectionId = "";
      let tables: Record<string, string> = {};
      const rows = async (ref: string): Promise<Row[]> => ok(await staff.get<{ data: Row[] }>(`/api/v1/data/${connectionId}/${encodeURIComponent(tables[ref] ?? `maker_${ref}`)}?limit=200`)).data;
      let door: AdminiumShop;
      let catalogue: Awaited<ReturnType<AdminiumShop["catalogue"]>>;

      beforeAll(async () => {
        server = await boot(engine as Engine, PORT_BASE + index * PORTS_PER_ENGINE, THURSDAY - 60_000, { database: `maker_shop_${engine}${process.env["CONTRACT_DB_SUFFIX"] ?? ""}` });
        staff = new Caller(server.base, { origin: server.base });
        await staff.signIn(ADMIN.email, ADMIN.password);
        if (engine === "sqlite") {
          // The studio's own empty database.
          const file = join(tmpdir(), `maker-shop-contract-${engine}-${String(PORT_BASE)}.db`);
          rmSync(file, { force: true });
          writeFileSync(file, "");
          connectionId = ok(await staff.post<{ id: string }>("/api/v1/connections", { name: "birch-row", engine: "sqlite", dsn: `sqlite:${file}` }), 201).id;
        } else {
          // Northwind, with its own bare `products`, `orders` and `customers`: the app's tables go in beside them, prefixed.
          connectionId = ok(await staff.get<{ connections: { id: string; name: string }[] }>("/api/v1/connections")).connections.find((c) => c.name === "northwind")!.id;
        }

        // The Customiser first, staged at the release the app asks for; then the app, with it ticked.
        const addOn = addOnBundle("customiser");
        const stagedAddOn = await staff.post(`/api/v1/add-ons/upload?expectedSha512=${encodeURIComponent(addOn.integrity)}`, addOn.buffer);
        if (![200, 201].includes(stagedAddOn.status)) throw new Error(`add-on upload: ${JSON.stringify(stagedAddOn.body).slice(0, 600)}`);
        const app = appBundle({ manifest: MANIFEST_TEXT });
        const staged = await staff.post(`/api/v1/apps/upload?expectedSha512=${encodeURIComponent(app.integrity)}`, app.buffer);
        if (![200, 201].includes(staged.status)) throw new Error(`upload: ${JSON.stringify(staged.body).slice(0, 600)}`);
        const body = { key: app.key, version: app.version, connectionId };
        const plan = ok(await staff.post<{ plan: { checksum: string; installable: boolean } }>("/api/v1/apps/plan", body)).plan;
        if (!plan.installable) throw new Error(`not installable: ${JSON.stringify(plan).slice(0, 2000)}`);
        const installed = ok(await staff.post<{ rules: { skipped: unknown[] } }>("/api/v1/apps/install", { ...body, planChecksum: plan.checksum, addOns: [{ key: addOn.key, version: addOn.version }] }));
        if (installed.rules.skipped.length > 0) throw new Error(`the install skipped rules: ${JSON.stringify(installed.rules.skipped).slice(0, 1500)}`);
        // The studio's zone decides its five o'clock cut-off; its money is pounds.
        ok(await staff.patch(`/api/v1/connections/${connectionId}`, { timezone: "Europe/London", currency: "GBP" }));

        // The sample is written for 16:40 on the dot: the clock stands there while it goes in, then runs on.
        await server.setClock(THURSDAY, true);
        await addSample(staff);
        await server.setClock(THURSDAY);
        ok(await staff.put("/api/v1/public-api", { enabled: true }));
        ok(await staff.put("/api/v1/settings/email", { publicOrigin: server.base }));

        // The shop, opened as its customer build opens it.
        const served = ok(await new Caller(server.base).get<{ publishableKey: string; publicKeys?: Record<string, string>; tables?: Record<string, string> }>("/apps/maker/customer/surface-config.json"));
        const originFetch: typeof fetch = (input, init) => {
          const headers = new Headers(init?.headers);
          headers.set("origin", server.base);
          return fetch(input, { ...init, headers });
        };
        tables = served.tables ?? {};
        door = new AdminiumShop({ baseUrl: server.base, publishableKey: served.publishableKey, ...(served.tables === undefined ? {} : { tables: served.tables }), ...(served.publicKeys === undefined ? {} : { publicKeys: served.publicKeys }) }, { fetch: originFetch });
        catalogue = await door.catalogue();
        // The shop's state holds the catalogue it read, as the page does.
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

      it("reads the catalogue as the shop shows it", () => {
        expect(catalogue.studio).toMatchObject({ name: "Birch Row", takingOrders: true });
        const coasters = productOf("coast-wal");
        expect([coasters.name, Number(coasters.price), coasters.unit, coasters.baseId !== null]).toEqual(["Engraved walnut coasters", 34, "set of 4", true]);
        expect(catalogue.services.map((s) => s.name)).toEqual(["Second class", "Tracked"]);
        expect(catalogue.options.filter((o) => String(o.productId) === String(coasters.id) && o.kind === "break").map((o) => o.minQty)).toEqual([1, 4, 8, 12]);
      });

      it("prices a piece's page in one dry run: the quantity chosen and each break, and the post-by date", async () => {
        const coasters = productOf("coast-wal");
        const quantities = productQuantities(coasters.id, 1);
        expect(quantities).toEqual([1, 4, 8, 12]);
        const quoted = await door.quote(orderBody({ service_id: second(), language: "en-US" }, quantities.map((qty) => lineOf("coast-wal", qty))));
        expect(quoted.lines.map((l) => [Number(l["each"]), Number(l["line_total"]), String(l["post_by"]).slice(0, 10)])).toEqual([
          [34, 34, "2026-08-11"],
          [31.28, 125.12, "2026-08-11"],
          [29.24, 233.92, "2026-08-11"],
          [27.88, 334.56, "2026-08-11"],
        ]);
      });

      let code = "";
      it("saves the shopper's design on the coasters' Ring through the shop's key", async () => {
        const api = door.customiser();
        const base = productOf("coast-wal").baseId!;
        const rows = await api.catalogue(base);
        const ring = rows.ready.find((r) => r["name"] === "Ring")!;
        expect(ring).toBeDefined();
        const saved = await api.create({ base_id: base, ready_design_id: ring["id"] as number, values: { finish: "engraved", parts: { words: { text: "Mill Lane Kitchen" } } } }, SHOPPER.email);
        expect(saved.code).toMatch(/^[0-9A-Z]{8,}$/);
        expect(saved.session).not.toBeNull();
        code = saved.code!;
      });

      let placed: Awaited<ReturnType<AdminiumShop["place"]>>;
      const clientKey = `maker-contract-${engine}-0123456789`;
      const basket = () => [lineOf("coast-wal", 1, { design: { id: 0, code, base_id: 0, ready_design_id: null, values: { parts: {} }, state: "draft", updatedAt: null, session: null, files: {} } })];

      it("places BR-2291 with the customised coasters at the comp's total, held to the total shown", async () => {
        const body = orderBody({ ...SHOPPER, service_id: second() }, basket());
        expect(body.children.order_lines[0]!.values.design_code).toBe(code);
        const quoted = await door.quote(body);
        expect(Number(quoted.order["total"])).toBe(37.95);
        placed = await door.place(body, clientKey, String(quoted.order["total"]));
        expect(placed.replayed).toBe(false);
        const order = placed.order;
        expect([order["number"], Number(order["pieces_total"]), Number(order["postage"]), Number(order["total"]), String(order["post_by"]).slice(0, 10)]).toEqual(["BR-2291", 34, 3.95, 37.95, "2026-08-11"]);
        // The shopper's own details are never answered back.
        expect(order["email"]).toBeUndefined();
        const line: Row = placed.lines[0]!;
        expect([line["product_name"], line["qty"], Number(line["line_total"]), line["design_id"] === null]).toEqual(["Engraved walnut coasters", 1, 34, false]);
        // The order's own link: its code for the page, a session on it already held.
        expect(placed.link?.token).toMatch(/^[0-9A-Za-z]{16}$/);
        expect(door.orderClient?.session()).not.toBeNull();
        const own = await door.orderClient!.list<Row>("maker_orders_claimed");
        expect(own.data.map((o) => [o["number"], Number(o["total"])])).toEqual([["BR-2291", 37.95]]);
        // Its e-mail is sent, and carries the same link.
        const { mail } = await delivered({
          sink: server.sink,
          manifest: MANIFEST_TEXT,
          kind: "order-received",
          to: SHOPPER.email,
          known: { "order.number": "BR-2291" },
          body: new RegExp(`/order#${placed.link!.token}\\b`),
          row: async () => (await rows("messages")).find((m) => m["kind"] === "order-received" && String(m["order_id"]) === String(order["id"])),
        });
        // It lists what was ordered: each line's piece and quantity, what it is made of, and its total; then the postage, the total and the post-by date.
        const words = plain(mail.html);
        const stored = (await rows("order_lines")).filter((l) => String(l["order_id"]) === String(order["id"]));
        expect(stored).toHaveLength(1);
        for (const l of stored) {
          expect(words).toContain(`${String(l["product_name"])} × ${String(l["qty"])}`);
          expect(String(l["summary"] ?? "")).not.toBe("");
          expect(words).toContain(String(l["summary"]));
          expect(words).toContain("£34.00");
        }
        expect(words).toMatch(/Postage · Second class £3\.95/);
        expect(words).toMatch(/Total £37\.95/);
        expect(words).toMatch(/Post by \S.*11/);
      }, 120_000);

      it("answers a retry with the order already made", async () => {
        const again = await door.place(orderBody({ ...SHOPPER, service_id: second() }, basket()), clientKey, "37.95");
        expect([again.replayed, again.order["number"]]).toEqual([true, "BR-2291"]);
      });

      it("refuses a total that moved, with the figures the save came to, and keeps nothing", async () => {
        const error = await door.place(orderBody({ ...SHOPPER, service_id: second() }, [lineOf("coast-ply", 1, { lettering: "Mill Lane" })]), `maker-contract-${engine}-moved-0001`, "20.00").catch((e: unknown) => e);
        expect(isShopError(error)).toBe(true);
        if (!isShopError(error)) return;
        expect(error.refused.code).toBe("PUBLIC_PRICE_CHANGED");
        expect(Number(error.refused.changed?.order["total"])).toBe(27.95);
        expect(Number(error.refused.changed?.lines[0]?.["each"])).toBe(24);
      });

      it("names the field Adminium refuses", async () => {
        const error = await door.quote(orderBody({ ...SHOPPER, name: "Priya 5551234", service_id: second() }, [lineOf("coast-ply", 1)])).catch((e: unknown) => e);
        expect(isShopError(error)).toBe(true);
        if (!isShopError(error)) return;
        expect([error.refused.code, error.refused.column]).toEqual(["PUBLIC_WRITE_REFUSED", "name"]);
      });

      it.skipIf(!READS_PANELS_AND_LIMITS)(`refuses words longer than the piece takes, by the dry run and by the order, and takes words that just fit${READS_PANELS_AND_LIMITS ? "" : ` — skipped: ${NEEDS_PANELS_AND_LIMITS}`}`, async () => {
        const ply = productOf("coast-ply");
        const limit = ply.letteringLimit!;
        expect(limit).toBeGreaterThan(0);
        const words = (n: number) => "Mill Lane Kitchen, Settle and the dale".repeat(4).slice(0, n);
        const over = orderBody({ ...SHOPPER, service_id: second() }, [lineOf("coast-ply", 1, { lettering: words(limit + 1) })]);
        const refusal = (error: unknown) => (isShopError(error) ? { column: error.refused.column, reason: error.refused.reason } : String(error));
        const quoted = await door.quote(over).catch((e: unknown) => e);
        expect(refusal(quoted)).toEqual({ column: "lettering", reason: "too-long" });
        const before = (await rows("orders")).length;
        const placedOver = await door.place(over, `maker-contract-${engine}-long-0001`, "27.95").catch((e: unknown) => e);
        expect(refusal(placedOver)).toEqual({ column: "lettering", reason: "too-long" });
        expect((await rows("orders")).length).toBe(before);
        // At the limit, the order goes in with the words as they were typed.
        const fits = orderBody({ ...SHOPPER, service_id: second() }, [lineOf("coast-ply", 1, { lettering: words(limit) })]);
        const priced = await door.quote(fits);
        const made = await door.place(fits, `maker-contract-${engine}-fits-0001`, String(priced.order["total"]));
        expect(made.lines.map((l) => l["lettering"])).toEqual([words(limit)]);
      });
    });
  });
});
