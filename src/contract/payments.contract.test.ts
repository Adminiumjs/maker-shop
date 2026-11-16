/**
 * PAYING FOR AN ORDER ONLINE, ON A BUILT ADMINIUM.
 *
 * The app and the Customiser installed as an operator installs them, the
 * sample added at Thursday 6 August 2026, 16:40, and the shop opened through
 * its own door. Then:
 *
 * - the orders are payable, and the payable arrives switched off: listed in
 *   Studio → Payments → Apps for someone who manages payments to switch on;
 * - while no payment service is ready the shop is told it takes no payments
 *   online, and "Pay now" is refused, as the shop reads it;
 * - an order placed asking to pay online reads what it comes to and what is
 *   left (the server's figures), asks nothing of the bench, and gets no
 *   order-received e-mail at once: the unpaid one waits an hour, the one
 *   reminder the studio day after, at five;
 * - an order placed as before (payments off) gets today's e-mail at once;
 * - with "Take payment before making" on, an order placed online keeps it,
 *   and its pieces are held at "make" by Adminium until it is paid;
 * - no role writes a payment, and the staff config tells the owner it may
 *   give money back.
 *
 * A payment itself landing (the provider's page, its webhook, the paid
 * e-mail, the post-by worked out again from it) needs a payment service: it
 * is proven by the engine's own suite against its recorder, not here.
 *
 * It runs with `CONTRACT=1` where a built Adminium and a built add-ons checkout
 * are, and says why it skipped otherwise. Its ports start at
 * `CONTRACT_PORT_BASE` (4970), three an engine.
 */
import { rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { AdminiumShop } from "../shop/door.ts";
import { isShopError, type Row } from "../shop/port.ts";
import { orderBody, useShop, type BasketLine } from "../shop/store.ts";
import { addOnBundle, addSample, appBundle, boot, Caller, ENGINES, missing, missingAddOn, ok, PORTS_PER_ENGINE, type Engine, type Server } from "./harness.ts";
import { MANIFEST_TEXT } from "./release.ts";

const why = missing() ?? missingAddOn("customiser");
if (why !== null && process.env["ADMINIUM_REQUIRE_CONTRACT"] === "1") throw new Error(`the payments contract must run here, and cannot: ${why}`);
const PORT_BASE = Number(process.env["CONTRACT_PORT_BASE"] ?? 4970);
const ADMIN = { email: process.env["E2E_ADMIN_EMAIL"] ?? "e2e@adminium.local", password: process.env["E2E_ADMIN_PASSWORD"] ?? "adminium-e2e-password" };
/** 16:40 on Thursday 6 August 2026 in Settle (British Summer Time), before the five o'clock cut-off. */
const THURSDAY = Date.parse("2026-08-06T15:40:00Z");
const SHOPPER = { name: "Priya Shah", email: "priya.shah@birch-row-shoppers.dev", address_line1: "12 Mill Lane", town: "Settle", postcode: "BD24 9AA", may_email: false, language: "en-US" };
const num = (value: unknown) => Number(value);

describe.skipIf(why !== null)(`paying online on a built Adminium${why === null ? "" : ` — skipped: ${why}`}`, () => {
  ENGINES.forEach(([engine, available], index) => {
    describe.skipIf(!available)(`on ${engine}`, () => {
      let server: Server;
      let staff: Caller;
      let connectionId = "";
      let tables: Record<string, string> = {};
      let door: AdminiumShop;
      const real = (ref: string) => tables[ref] ?? `maker_${ref}`;
      const rows = async (ref: string, where = ""): Promise<Row[]> => ok(await staff.get<{ data: Row[] }>(`/api/v1/data/${connectionId}/${encodeURIComponent(real(ref))}?limit=200${where}`)).data;
      const row = async (ref: string, id: unknown): Promise<Row> => ok(await staff.get<{ data: Row }>(`/api/v1/data/${connectionId}/${encodeURIComponent(real(ref))}/${encodeURIComponent(String(id))}`)).data;

      beforeAll(async () => {
        server = await boot(engine as Engine, PORT_BASE + index * PORTS_PER_ENGINE, THURSDAY - 60_000, { database: `maker_pay_${engine}${process.env["CONTRACT_DB_SUFFIX"] ?? ""}` });
        staff = new Caller(server.base, { origin: server.base });
        await staff.signIn(ADMIN.email, ADMIN.password);
        if (engine === "sqlite") {
          const file = join(tmpdir(), `maker-shop-pay-contract-${String(PORT_BASE)}.db`);
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
        if (!plan.installable) throw new Error(`not installable: ${JSON.stringify(plan).slice(0, 2000)}`);
        const installed = ok(await staff.post<{ rules: { skipped: unknown[] } }>("/api/v1/apps/install", { ...body, planChecksum: plan.checksum, addOns: [{ key: addOn.key, version: addOn.version }] }));
        if (installed.rules.skipped.length > 0) throw new Error(`the install skipped rules: ${JSON.stringify(installed.rules.skipped).slice(0, 1500)}`);
        ok(await staff.patch(`/api/v1/connections/${connectionId}`, { timezone: "Europe/London", currency: "GBP" }));
        await server.setClock(THURSDAY, true);
        await addSample(staff);
        await server.setClock(THURSDAY);
        ok(await staff.put("/api/v1/public-api", { enabled: true }));
        ok(await staff.put("/api/v1/settings/email", { publicOrigin: server.base }));
        const served = ok(await new Caller(server.base).get<{ publishableKey: string; publicKeys?: Record<string, string>; tables?: Record<string, string> }>("/apps/maker/customer/surface-config.json"));
        const originFetch: typeof fetch = (input, init) => {
          const headers = new Headers(init?.headers);
          headers.set("origin", server.base);
          return fetch(input, { ...init, headers });
        };
        tables = served.tables ?? {};
        door = new AdminiumShop({ baseUrl: server.base, publishableKey: served.publishableKey, ...(served.tables === undefined ? {} : { tables: served.tables }), ...(served.publicKeys === undefined ? {} : { publicKeys: served.publicKeys }) }, { fetch: originFetch });
        useShop.setState({ catalogue: await door.catalogue() });
      }, 360_000);

      afterAll(async () => {
        await server?.stop();
      });

      /** One plain piece (nothing to proof), Second class, placed as the checkout places it. */
      async function place(online: boolean): Promise<{ order: Row; payUrl: string | null }> {
        const catalogue = useShop.getState().catalogue!;
        const product = catalogue.products.find((p) => !p.takesLettering && p.baseId === null) ?? catalogue.products[0]!;
        const first = (kind: string) => catalogue.options.find((o) => String(o.productId) === String(product.id) && o.kind === kind)?.id ?? null;
        const line: BasketLine = { id: "l1", productId: product.id, qty: 1, materialId: first("material"), sizeId: first("size"), finishId: first("finish"), lettering: null, design: null, features: [] };
        const service = catalogue.services[0]!;
        const body = orderBody({ ...SHOPPER, service_id: service.id, ...(online ? { pay_online: true } : {}) }, [line]);
        const quoted = await door.quote(body);
        const placed = await door.place(body, `pay-contract-${engine}-${String(Math.random()).slice(2)}`, String(quoted.order["total"]));
        return { order: placed.order, payUrl: placed.payUrl };
      }

      it("makes the orders payable, switched off, for someone who manages payments to switch on", async () => {
        const apps = ok(await staff.get<{ data: { apps: { appKey: string; connectionId: string; enabled: boolean; tables: { tableName: string; valid: boolean }[] }[] } }>("/api/v1/payments/apps")).data.apps;
        const maker = apps.find((a) => a.appKey === "maker" && a.connectionId === connectionId)!;
        expect(maker.enabled).toBe(false);
        expect(maker.tables).toEqual([expect.objectContaining({ tableName: expect.stringMatching(/orders$/), valid: true })]);
      });

      it("tells the shop it takes no payments online while none can be taken, and refuses Pay now", async () => {
        expect(await door.payments()!.available()).toEqual({ online: false, test: false });
        const { order, payUrl } = await place(true);
        expect(payUrl).toBeNull();
        const refused = await door
          .payments()!
          .start("link", order["id"] as string)
          .catch((error: unknown) => error);
        expect(isShopError(refused)).toBe(true);
        // Coming back, the shop asks how the order's payment stands: none was started.
        expect(await door.payments()!.state!("link", order["id"] as string)).toBe("none");
      });

      it("reads an order placed to pay online, what it comes to and what is left, and asks nothing of the bench", async () => {
        const { order } = await place(true);
        const held = await row("orders", order["id"]);
        expect(held["pay_online"] === true || held["pay_online"] === 1).toBe(true);
        expect(num(held["pay_mode"])).toBe(1);
        expect(num(held["paid"])).toBe(0);
        expect(num(held["pay_due"])).toBe(num(held["total"]));
        expect(num(held["pay_hold"])).toBe(0);
        expect(held["paid_post_by"]).toBeNull();
        expect(num(held["lead_max"])).toBeGreaterThan(0);
        // The studio day after it came in (Thursday, before five): Friday.
        expect(String(held["remind_on"]).slice(0, 10)).toBe("2026-08-07");
        // The shopper reads the same through the order's own link.
        const read = await door.after().readShared();
        expect(read?.order["number"]).toBe(held["number"]);
        expect(num(read?.order["pay_due"])).toBe(num(held["total"]));
      });

      it("e-mails an order placed online when it is paid, or an hour later unpaid, and reminds once the studio day after", async () => {
        const { order } = await place(true);
        const messages = (await rows("messages")).filter((m) => String(m["order_id"]) === String(order["id"]));
        expect(messages.map((m) => m["kind"]).sort()).toEqual(["order-unpaid", "pay-reminder"]);
        const unpaid = messages.find((m) => m["kind"] === "order-unpaid")!;
        expect(Math.abs(Date.parse(String(unpaid["due"])) - (THURSDAY + 3_600_000))).toBeLessThan(5 * 60_000);
        const reminder = messages.find((m) => m["kind"] === "pay-reminder")!;
        // Friday 7 August at five in Settle.
        expect(Date.parse(String(reminder["due"]))).toBe(Date.parse("2026-08-07T16:00:00Z"));
        for (const m of messages) expect(m["status"]).toBe("queued");
      });

      it("e-mails an order placed as before at once, its words as they were", async () => {
        const { order } = await place(false);
        const messages = (await rows("messages")).filter((m) => String(m["order_id"]) === String(order["id"]));
        expect(messages.map((m) => m["kind"])).toEqual(["order-received"]);
        const held = await row("orders", order["id"]);
        expect(num(held["pay_mode"])).toBe(0);
      });

      it("holds the pieces of an order taken before making at make until it is paid", async () => {
        const settings = (await rows("settings"))[0]!;
        ok(await staff.patch(`/api/v1/data/${connectionId}/${encodeURIComponent(real("settings"))}/${String(settings["id"])}`, { values: { pay_first: true } }));
        const { order } = await place(true);
        const held = await row("orders", order["id"]);
        expect(held["waits_pay"] === true || held["waits_pay"] === 1).toBe(true);
        expect([num(held["pay_mode"]), num(held["pay_hold"])]).toEqual([2, 1]);
        const line = (await rows("order_lines")).find((l) => String(l["order_id"]) === String(order["id"]))!;
        expect(num(line["proof_ok"])).toBe(1);
        const moved = await staff.patch(`/api/v1/data/${connectionId}/${encodeURIComponent(real("order_lines"))}/${String(line["id"])}`, { values: { stage: "making" }, from: "make" });
        expect(moved.status).toBe(409);
        // An order placed as before still goes on the bench.
        const { order: plain } = await place(false);
        const other = (await rows("order_lines")).find((l) => String(l["order_id"]) === String(plain["id"]))!;
        ok(await staff.patch(`/api/v1/data/${connectionId}/${encodeURIComponent(real("order_lines"))}/${String(other["id"])}`, { values: { stage: "making" }, from: "make" }));
        ok(await staff.patch(`/api/v1/data/${connectionId}/${encodeURIComponent(real("settings"))}/${String(settings["id"])}`, { values: { pay_first: false } }));
      });

      it("lets no role write a payment, and tells the owner it may give money back", async () => {
        const [order] = await rows("orders");
        const written = await staff.post(`/api/v1/data/${connectionId}/${encodeURIComponent(real("payments"))}`, { values: { order_id: order!["id"], amount: "1.00", method: "online", payment_ref: "made_up_1", paid_at: new Date(THURSDAY).toISOString() } });
        expect(written.status).toBe(403);
        const config = ok(await staff.get<{ payments?: { on: boolean; refund: boolean } }>("/apps/maker/staff/surface-config.json"));
        expect(config.payments).toMatchObject({ on: false });
      });
    });
  });
});
