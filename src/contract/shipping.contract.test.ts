/**
 * MAKER SHOP'S PARCELS, ON A BUILT ADMINIUM, AS EACH ROLE.
 *
 * No carrier is called and no label is bought: Adminium's own proofs cover the
 * purchase. This holds what the app declares against the real rights, writes
 * and outbox, on every engine:
 *
 *   - who may touch the app's labels, and who may set Ship from;
 *   - a new order starts in the studio's country;
 *   - a label's number stays off the shopper's columns until "Handed over";
 *   - that press moves the order and mails the real company and number;
 *   - a new number reaches the customer only when staff press for it.
 */
import { rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { ORDER_SELECT } from "../manifest/public.ts";
import { postOrders } from "../studio/actions.ts";
import { AdminiumStudio } from "../studio/adminiumStudio.ts";
import type { StudioData } from "../studio/door.ts";
import { createSessionTransport } from "../studio/transport/sessionSource.ts";
import { loadStaffConfig } from "../studio/transport/staffConnection.ts";
import type { Row } from "../studio/wire.ts";
import { delivered, mailCount, plain, subjectOf } from "./mail.ts";
import { MANIFEST_TEXT } from "./release.ts";
import { boot, ENGINES, installStudio, missing, ok, personWith, PORTS_PER_ENGINE, type Caller, type Engine, type Server } from "./studio-harness.ts";

const why = missing();
const PORT_BASE = Number(process.env["CONTRACT_PORT_BASE"] ?? 5030);
const THURSDAY = Date.parse("2026-08-06T15:40:00Z");
const SHOPPER = "parcel.p@birch-row-shoppers.dev";
const ACCESS = "/api/v1/apps/maker/shipping/access";

describe.skipIf(why !== null)(`Maker's parcels on a built Adminium${why === null ? "" : ` — skipped: ${why}`}`, () => {
  ENGINES.forEach(([engine, available], index) => {
    describe.skipIf(!available)(`on ${engine}`, () => {
      let server: Server;
      let admin: Caller;
      let connectionId = "";
      let packerCaller: Caller;
      let makerCaller: Caller;
      let ownerCaller: Caller;
      let packer: AdminiumStudio;
      let maker: AdminiumStudio;
      let tables: Record<string, string> = {};
      const dbFile = join(tmpdir(), `maker-shipping-${process.pid}-${engine}.db`);

      const doorFor = async (caller: Caller): Promise<AdminiumStudio> => {
        const cfg = (await loadStaffConfig({ hostedStaff: true, base: "/apps/maker/staff/", fetchImpl: caller.fetchAs() }))!;
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
      const rowsPath = (table: string) => `/api/v1/data/${connectionId}/${encodeURIComponent(tables[table] ?? `maker_${table}`)}`;
      const rows = async (table: string): Promise<Row[]> => ok(await admin.get<{ data: Row[] }>(`${rowsPath(table)}?limit=200`)).data;
      const patch = (caller: Caller, table: string, id: unknown, values: Record<string, unknown>) => caller.patch(`${rowsPath(table)}/${String(id)}`, { values });
      const readyOrder = async (data: StudioData): Promise<Row> => data.orders.find((o) => o["status"] === "ready")!;
      const messageFor = (kind: string, order: Row) => async () => (await rows("messages")).find((m) => m["kind"] === kind && String(m["order_id"]) === String(order.id));

      beforeAll(async () => {
        server = await boot(engine as Engine, PORT_BASE + index * PORTS_PER_ENGINE, THURSDAY, `maker_shipping_${engine}`);
        ({ owner: admin, connectionId } = await installStudio(server, engine as Engine, THURSDAY, MANIFEST_TEXT, dbFile));
        packerCaller = await personWith(admin, server, "packer", "packer@birch-row.dev", "Pat Packer");
        makerCaller = await personWith(admin, server, "maker", "maker@birch-row.dev", "Mo Maker");
        ownerCaller = await personWith(admin, server, "owner", "owner@birch-row.dev", "Olu Owner");
        packer = await doorFor(packerCaller);
        maker = await doorFor(makerCaller);
      }, 420_000);

      afterAll(async () => {
        await server?.stop();
        rmSync(dbFile, { force: true });
      });

      it("gives each role its own right on the app's labels", async () => {
        const of = async (caller: Caller) => ok(await caller.get<{ data: Record<string, unknown> }>(ACCESS)).data;
        expect(await of(packerCaller)).toMatchObject({ appUpdated: true, manages: false, mayBook: true, mayCancel: false, mayCustoms: false });
        expect(await of(ownerCaller)).toMatchObject({ appUpdated: true, manages: false, mayBook: true, mayCancel: true, mayCustoms: true });
        expect((await makerCaller.get(ACCESS)).status).toBe(403);
      });

      it("lets only someone who manages shipping save Ship from, half filled", async () => {
        const body = { name: "Birch Row", lines: ["Unit 4"], city: "Settle", postcode: "BD24 9AA", country: "gb" };
        for (const caller of [packerCaller, makerCaller, ownerCaller]) expect((await caller.send("PUT", "/api/v1/apps/maker/shipping/ship-from", body)).status).toBe(403);
        const saved = ok(await admin.send<{ data: { shipFrom: { country: string }; shipFromMissing: string[] } }>("PUT", "/api/v1/apps/maker/shipping/ship-from", body)).data;
        expect(saved.shipFrom.country).toBe("GB");
        expect(saved.shipFromMissing).toEqual(["phone"]);
      });

      it("starts a new order in the studio's country", async () => {
        const service = (await rows("postage_services"))[0]!;
        const made = ok(await admin.post<{ data: Row }>(rowsPath("orders"), { values: { name: "Ada W", email: "ada.c@birch-row-shoppers.dev", address_line1: "1 Mill Row", town: "Colne", postcode: "BB8 9ZZ", service_id: service.id } }), 201).data;
        expect(made["country"]).toBe("GB");
        expect(made["tracking"] ?? null).toBeNull();
      });

      it("keeps a label off the shopper's columns until it is handed over, then tells them", async () => {
        expect(ORDER_SELECT).not.toContain("label_tracking");
        expect(ORDER_SELECT).not.toContain("label_carrier");
        const data = await packer.load();
        const order = await readyOrder(data);
        ok(await patch(admin, "orders", order.id, { email: SHOPPER, language: "en-US", label_tracking: "TRK-1001", label_carrier: "Evri" }));
        const before = (await packer.load()).orders.find((o) => String(o.id) === String(order.id))!;
        expect(before["status"]).toBe("ready");
        expect(before["tracking"] ?? null).toBeNull();
        expect(await messageFor("order-posted", order)()).toBeUndefined();
        // Neither staff role writes the label's own columns.
        expect((await patch(packerCaller, "orders", order.id, { label_tracking: "FORGED" })).status).toBeGreaterThanOrEqual(400);
        expect((await patch(makerCaller, "orders", order.id, { tracking: "FORGED" })).status).toBeGreaterThanOrEqual(400);

        const fresh = await packer.load();
        const held = fresh.orders.find((o) => String(o.id) === String(order.id))!;
        await postOrders(packer, fresh, [held], {}, { [String(order.id)]: { tracking: "TRK-1001", carrier: "Evri" } });
        const after = (await packer.load()).orders.find((o) => String(o.id) === String(order.id))!;
        expect(after).toMatchObject({ status: "posted", tracking: "TRK-1001", carrier: "Evri" });
        const known = { "order.number": String(after["number"]) };
        const { mail } = await delivered({ sink: server.sink, manifest: MANIFEST_TEXT, kind: "order-posted", to: SHOPPER, known, row: messageFor("order-posted", order) });
        const words = plain(mail.html);
        expect(words).toContain("Evri");
        expect(words).toContain("TRK-1001");
        expect(mail.html).not.toMatch(/dhl\.com/i);
      }, 180_000);

      it("mails a new number only when staff press for it, and moves nothing", async () => {
        const data = await packer.load();
        const order = data.orders.find((o) => o["tracking"] === "TRK-1001")!;
        // The label's number changing mails nobody.
        ok(await patch(admin, "orders", order.id, { label_tracking: "TRK-2002" }));
        await new Promise((resolve) => setTimeout(resolve, 3_000));
        expect(await messageFor("order-new-number", order)()).toBeUndefined();

        await packer.tellNewNumber(order, { tracking: "TRK-2002", carrier: "Evri" });
        const after = (await packer.load()).orders.find((o) => String(o.id) === String(order.id))!;
        expect(after).toMatchObject({ status: "posted", tracking: "TRK-2002", carrier: "Evri" });
        const known = { "order.number": String(after["number"]), "order.tracking": "TRK-2002" };
        const { mail } = await delivered({ sink: server.sink, manifest: MANIFEST_TEXT, kind: "order-new-number", to: SHOPPER, known, row: messageFor("order-new-number", order) });
        expect(plain(mail.html)).toContain("TRK-2002");
        expect(await mailCount(server.sink, SHOPPER, subjectOf(MANIFEST_TEXT, "order-new-number", known))).toBe(1);
        expect(maker).toBeDefined();
      }, 180_000);
    });
  });
});
