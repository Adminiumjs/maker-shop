/**
 * PAYING FOR AN ORDER ONLINE, ON A BUILT ADMINIUM.
 *
 * The app and the Customiser installed as an operator installs them, the
 * sample added at Thursday 6 August 2026, 16:40, and the shop opened through
 * its own door. Then:
 *
 * - the orders are payable, and the payable arrives switched off: listed in
 *   Studio → Payments → Apps for someone who manages payments to switch on;
 * - with payments off, the shop is told it takes no payments online: the
 *   order is placed as it always was, gets today's e-mail at once, "Pay now"
 *   is refused, and the entry that asks to pay online is closed;
 * - with payments on (someone who manages payments rehearsing the checkout,
 *   Adminium's test mode): the order is placed asking to pay online, by the
 *   entry's own value, its pay link answered; no e-mail at once, the unpaid
 *   one an hour later and the reminder the studio day after at five; paid
 *   with the demo service on the pay page, its payment lands once in the
 *   app's own table and its e-mail (the receipt) is queued; an order taken
 *   before making holds its pieces until it is paid and counts its post-by
 *   from the payment; an order the studio places itself gets today's e-mail;
 * - no role writes a payment, and the staff config tells the owner it may
 *   give money back.
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
import { addOnBundle, addSample, appBundle, boot, Caller, ENGINES, missing, missingAddOn, ok, PORTS_PER_ENGINE, solve, until, type Engine, type Server } from "./harness.ts";
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
      let shopKey = "";
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
        shopKey = served.publishableKey;
        door = new AdminiumShop({ baseUrl: server.base, publishableKey: served.publishableKey, ...(served.tables === undefined ? {} : { tables: served.tables }), ...(served.publicKeys === undefined ? {} : { publicKeys: served.publicKeys }) }, { fetch: originFetch });
        useShop.setState({ catalogue: await door.catalogue() });
      }, 360_000);

      afterAll(async () => {
        await server?.stop();
      });

      /** One plain piece (nothing to proof), Second class, placed through a door as the checkout places it. */
      async function place(through: AdminiumShop = door): Promise<{ order: Row; payUrl: string | null }> {
        const catalogue = useShop.getState().catalogue!;
        const product = catalogue.products.find((p) => !p.takesLettering && p.baseId === null) ?? catalogue.products[0]!;
        const first = (kind: string) => catalogue.options.find((o) => String(o.productId) === String(product.id) && o.kind === kind)?.id ?? null;
        const line: BasketLine = { id: "l1", productId: product.id, qty: 1, materialId: first("material"), sizeId: first("size"), finishId: first("finish"), lettering: null, design: null, features: [] };
        const service = catalogue.services[0]!;
        // The page never says it asks to pay online: Adminium places it through the entry open now.
        const body = orderBody({ ...SHOPPER, service_id: service.id }, [line]);
        const quoted = await through.quote(body);
        const placed = await through.place(body, `pay-contract-${engine}-${String(Math.random()).slice(2)}`, String(quoted.order["total"]));
        return { order: placed.order, payUrl: placed.payUrl };
      }
      const messagesOf = async (order: Row) => (await rows("messages")).filter((m) => String(m["order_id"]) === String(order["id"]));
      const yes = (value: unknown) => value === true || value === 1 || value === "1";

      /**
       * Payments on, as someone who manages payments rehearses the checkout: the shop opened on the staff
       * address with their session, its writes carrying their token. Adminium treats the app as taking payments
       * for them alone, in test mode, and the rows they make are sample rows whose mail comes to them.
       */
      async function rehearsing(): Promise<AdminiumShop> {
        ok(await staff.put("/api/v1/payments/rehearsal", { on: true }));
        const served = ok(await staff.get<{ publishableKey: string; publicKeys?: Record<string, string>; tables?: Record<string, string>; rehearsal?: { csrfToken: string } }>("/apps/maker/customer/surface-config.json"));
        expect(served.rehearsal?.csrfToken).toBeTruthy();
        return new AdminiumShop(
          { baseUrl: server.base, publishableKey: served.publishableKey, rehearsalToken: served.rehearsal!.csrfToken, ...(served.tables === undefined ? {} : { tables: served.tables }), ...(served.publicKeys === undefined ? {} : { publicKeys: served.publicKeys }) },
          { fetch: staff.fetchAs() },
        );
      }

      /** The shopper pays on the pay page with the demo service (a test link, driven by the person rehearsing). */
      async function payDemo(payUrl: string): Promise<void> {
        const token = new URL(payUrl, server.base).pathname.split("/").pop()!;
        const challenge = ok(await staff.get<{ id: string; salt: string; difficulty: number }>(`/pay/api/${token}/challenge`));
        const started = ok(await staff.post<{ url?: string; state?: string }>(`/pay/api/${token}/checkout`, { source: "demo" }, { "x-adminium-proof": `${challenge.id}.${solve(challenge.salt, challenge.difficulty)}` }));
        expect(started.url, JSON.stringify(started)).toBeTruthy();
        const attempt = new URL(started.url!, server.base).pathname.split("/").pop()!;
        const done = ok(await staff.post<{ back: string }>(`/pay/api/demo/${attempt}`, { action: "succeeds" }));
        const nonce = done.back.split("/").pop()!.split("?")[0]!;
        ok(await staff.get(`/pay/api/back/${nonce}`));
      }

      it("makes the orders payable, switched off, for someone who manages payments to switch on", async () => {
        const apps = ok(await staff.get<{ data: { apps: { appKey: string; connectionId: string; enabled: boolean; tables: { tableName: string; valid: boolean }[] }[] } }>("/api/v1/payments/apps")).data.apps;
        const maker = apps.find((a) => a.appKey === "maker" && a.connectionId === connectionId)!;
        expect(maker.enabled).toBe(false);
        expect(maker.tables).toEqual([expect.objectContaining({ tableName: expect.stringMatching(/orders$/), valid: true })]);
      });

      describe("with payments off", () => {
        it("tells the shop it takes no payments online, places the order as before, and refuses Pay now", async () => {
          expect(await door.payments()!.available()).toEqual({ online: false, test: false });
          const { order, payUrl } = await place();
          expect(payUrl).toBeNull();
          const held = await row("orders", order["id"]);
          expect([yes(held["pay_online"]), num(held["pay_mode"]), num(held["pay_hold"])]).toEqual([false, 0, 0]);
          const refused = await door
            .payments()!
            .start("link", order["id"] as string)
            .catch((error: unknown) => error);
          expect(isShopError(refused)).toBe(true);
          // Coming back, the shop asks how the order's payment stands: none was started.
          expect(await door.payments()!.state!("link", order["id"] as string)).toBe("none");
        });

        it("e-mails today's order-received at once, and nothing of paying", async () => {
          const { order } = await place();
          expect((await messagesOf(order)).map((m) => m["kind"])).toEqual(["order-received"]);
        });

        it("places nothing through the entry that asks to pay online", async () => {
          const body = { values: { ...SHOPPER, service_id: useShop.getState().catalogue!.services[0]!.id }, children: { order_lines: [] } };
          const refused = await new Caller(server.base, { origin: server.base, authorization: `Bearer ${shopKey}` }).post(`/api/v1/public/records/${real("orders")}_verified_3/dry-run`, body);
          expect([refused.status, refused.code]).toEqual([403, "PUBLIC_SWITCHED_OFF"]);
        });
      });

      describe("with payments on (someone who manages payments rehearsing)", () => {
        let shop: AdminiumShop;
        beforeAll(async () => {
          shop = await rehearsing();
        }, 60_000);
        afterAll(async () => {
          await staff.put("/api/v1/payments/rehearsal", { on: false });
        });

        it("places the order asking to pay online, by the entry's own value, and answers its pay link", async () => {
          expect(await shop.payments()!.available()).toEqual({ online: true, test: true });
          const { order, payUrl } = await place(shop);
          expect(payUrl).toMatch(/\/pay\//);
          const held = await row("orders", order["id"]);
          expect([yes(held["pay_online"]), num(held["pay_mode"]), num(held["pay_hold"])]).toEqual([true, 1, 0]);
          expect(num(held["pay_due"])).toBe(num(held["total"]));
          expect(held["paid_post_by"]).toBeNull();
          // The studio day after it came in (Thursday, before five): Friday.
          expect(String(held["remind_on"]).slice(0, 10)).toBe("2026-08-07");
        });

        it("e-mails nothing at once: the unpaid one waits an hour, the one reminder the studio day after at five", async () => {
          const { order } = await place(shop);
          const messages = await messagesOf(order);
          expect(messages.map((m) => m["kind"]).sort()).toEqual(["order-unpaid", "pay-reminder"]);
          const unpaid = messages.find((m) => m["kind"] === "order-unpaid")!;
          expect(Math.abs(Date.parse(String(unpaid["due"])) - (THURSDAY + 3_600_000))).toBeLessThan(5 * 60_000);
          expect(Date.parse(String(messages.find((m) => m["kind"] === "pay-reminder")!["due"]))).toBe(Date.parse("2026-08-07T16:00:00Z"));
          for (const m of messages) expect(m["status"]).toBe("queued");
        });

        it("e-mails the order when the money comes in, which is its receipt, and tells the shop it is paid", async () => {
          const { order, payUrl } = await place(shop);
          await payDemo(payUrl!);
          const paid = await until(async () => {
            const held = await row("orders", order["id"]);
            return num(held["pay_due"]) === 0 ? held : undefined;
          }, "the order paid", 60_000);
          expect(num(paid["paid"])).toBe(num(paid["total"]));
          const payments = (await rows("payments")).filter((p) => String(p["order_id"]) === String(order["id"]));
          expect(payments).toHaveLength(1);
          // The service as Adminium names it ("Demo" for its pretend one, in test mode), and the payment's reference, once.
          expect([payments[0]!["method"], payments[0]!["provider"], typeof payments[0]!["payment_ref"]]).toEqual(["online", "Demo", "string"]);
          expect((await messagesOf(order)).map((m) => m["kind"]).sort()).toEqual(["order-paid", "order-unpaid", "pay-reminder"]);
          expect(await shop.payments()!.state!("link", order["id"] as string)).toBe("paid");
        });

        it("holds a piece of an order taken before making until it is paid, and counts its post-by from the payment", async () => {
          const settings = (await rows("settings"))[0]!;
          ok(await staff.patch(`/api/v1/data/${connectionId}/${encodeURIComponent(real("settings"))}/${String(settings["id"])}`, { values: { pay_first: true } }));
          try {
            const { order, payUrl } = await place(shop);
            const held = await row("orders", order["id"]);
            expect(yes(held["waits_pay"])).toBe(true);
            expect([num(held["pay_mode"]), num(held["pay_hold"])]).toEqual([2, 1]);
            const line = (await rows("order_lines")).find((l) => String(l["order_id"]) === String(order["id"]))!;
            expect(num(line["proof_ok"])).toBe(1);
            const moved = await staff.patch(`/api/v1/data/${connectionId}/${encodeURIComponent(real("order_lines"))}/${String(line["id"])}`, { values: { stage: "making" }, from: "make" });
            expect(moved.status).toBe(409);
            await payDemo(payUrl!);
            const paid = await until(async () => {
              const now = await row("orders", order["id"]);
              return num(now["pay_hold"]) === 0 ? now : undefined;
            }, "the order paid", 60_000);
            // Counted from the payment: never before the post-by counted from placing (paid the same Thursday afternoon).
            expect(paid["paid_post_by"]).not.toBeNull();
            expect(String(paid["paid_post_by"]).slice(0, 10) >= String(paid["post_by"]).slice(0, 10)).toBe(true);
            ok(await staff.patch(`/api/v1/data/${connectionId}/${encodeURIComponent(real("order_lines"))}/${String(line["id"])}`, { values: { stage: "making" }, from: "make" }));
          } finally {
            ok(await staff.patch(`/api/v1/data/${connectionId}/${encodeURIComponent(real("settings"))}/${String(settings["id"])}`, { values: { pay_first: false } }));
          }
        });

        it("e-mails today's order-received at once for an order the studio placed itself", async () => {
          const service = useShop.getState().catalogue!.services[0]!;
          const made = ok(await staff.post<{ data: Row }>(`/api/v1/data/${connectionId}/${encodeURIComponent(real("orders"))}`, { values: { ...SHOPPER, service_id: service.id } }), 201).data;
          // Nobody was asked to pay it, whether payments count as on or off for it: today's e-mail, at once.
          expect((await messagesOf(made)).map((m) => m["kind"])).toEqual(["order-received"]);
        });
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
