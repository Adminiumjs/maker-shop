/**
 * THE WORKSHOP, AGAINST A REAL ADMINIUM.
 *
 * This repo's manifest and sample, installed with the built Customiser on a
 * BUILT Adminium (`ADMINIUM_REPO`, the release it asks for), at the comp's
 * pinned moment: Thursday 6 August 2026, 16:40 in Settle. The studio's own
 * door (the code the staff build runs) is booted on a maker's session, as
 * their screens boot it, and the maker:
 *
 *   - batches the walnut sheet (Fern's coasters and Tom's bookmarks, both
 *     approved): the batch, the laser's booking from when it is next free and
 *     the sheet it takes off the shelf, in one write; then started, the lines
 *     to making on it, their orders with them;
 *   - is refused a whole batch, by Adminium, when the machine's time was
 *     taken after the screen read it: no batch, no booking, no stock moved,
 *     no line moved;
 *   - is refused a second booking over the first, by Adminium;
 *   - counts the shelf: Adminium keeps the book's figure beside the count and
 *     moves the stock by the difference.
 *
 * It runs with `CONTRACT=1` where an Adminium checkout with its built server
 * and dashboard is (`ADMINIUM_REPO`) and a built add-ons checkout
 * (`ADD_ONS_REPO`), and says why it skipped otherwise. Its ports start at
 * `CONTRACT_PORT_BASE` (4940), three an engine.
 */
import { rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { AdminiumStudio } from "../studio/adminiumStudio.ts";
import { batchGroups, bookingsOf, nextFreeAt, packSheet } from "../studio/making.ts";
import { isTaken, saveCount, startBatch } from "../studio/making-actions.ts";
import { createSessionTransport } from "../studio/transport/sessionSource.ts";
import { loadStaffConfig } from "../studio/transport/staffConnection.ts";
import { ApiError, num, type Row } from "../studio/wire.ts";
import { MANIFEST_TEXT } from "./release.ts";
import { addOnBundle, addSample, appBundle, boot, Caller, ENGINES, missing, newPassword, ok, PORTS_PER_ENGINE, type Engine, type Server } from "./studio-harness.ts";

const why = missing();
if (why !== null && process.env["ADMINIUM_REQUIRE_CONTRACT"] === "1") throw new Error(`the contract must run here, and cannot: ${why}`);
const PORT_BASE = Number(process.env["CONTRACT_PORT_BASE"] ?? 4940);
const ADMIN = { email: process.env["E2E_ADMIN_EMAIL"] ?? "e2e@adminium.local", password: process.env["E2E_ADMIN_PASSWORD"] ?? "adminium-e2e-password" };
/** 16:40 on Thursday 6 August 2026 in Settle (British Summer Time). */
const THURSDAY = Date.parse("2026-08-06T15:40:00Z");
/** A booking below a staff create, judged inside the one write. */

describe.skipIf(why !== null)(`the workshop against a built Adminium${why === null ? "" : ` — skipped: ${why}`}`, () => {
  ENGINES.forEach(([engine, available], index) => {
    describe.skipIf(!available)(`on ${engine}`, () => {
      let server: Server;
      let owner: Caller;
      let connectionId = "";
      let maker: AdminiumStudio;
      let tables: Record<string, string> = {};

      const rows = async (table: string): Promise<Row[]> => {
        const real = tables[table] ?? `maker_${table}`;
        const out: Row[] = [];
        for (let offset = 0; ; offset += 200) {
          const page = ok(await owner.get<{ data: Row[] }>(`/api/v1/data/${connectionId}/${encodeURIComponent(real)}?limit=200&offset=${String(offset)}`)).data;
          out.push(...page);
          if (page.length < 200) return out;
        }
      };
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

      beforeAll(async () => {
        server = await boot(engine as Engine, PORT_BASE + index * PORTS_PER_ENGINE, THURSDAY - 60_000, `maker_making_contract_${engine}${process.env["CONTRACT_DB_SUFFIX"] ?? ""}`);
        owner = new Caller(server.base);
        await owner.signIn(ADMIN.email, ADMIN.password);
        // The studio's own empty database (see the studio contract: a bare `orders` table beside it is a core gap).
        if (engine === "sqlite") {
          const file = join(tmpdir(), `maker-making-contract-${String(PORT_BASE)}.db`);
          rmSync(file, { force: true });
          writeFileSync(file, "");
          connectionId = ok(await owner.post<{ id: string }>("/api/v1/connections", { name: "birch-row", engine: "sqlite", dsn: `sqlite:${file}` }), 201).id;
        } else {
          connectionId = ok(await owner.get<{ connections: { id: string; name: string }[] }>("/api/v1/connections")).connections.find((c) => c.name === "northwind")!.id;
        }
        const customiser = addOnBundle("customiser");
        const stagedAddOn = await owner.post(`/api/v1/add-ons/upload?expectedSha512=${encodeURIComponent(customiser.integrity)}`, customiser.buffer);
        expect([200, 201], JSON.stringify(stagedAddOn.body).slice(0, 800)).toContain(stagedAddOn.status);
        const app = appBundle({ manifest: MANIFEST_TEXT });
        const staged = await owner.post(`/api/v1/apps/upload?expectedSha512=${encodeURIComponent(app.integrity)}`, app.buffer);
        expect([200, 201], JSON.stringify(staged.body).slice(0, 800)).toContain(staged.status);
        const body = { key: app.key, version: app.version, connectionId };
        const plan = ok(await owner.post<{ plan: { installable: boolean; checksum: string } }>("/api/v1/apps/plan", { ...body, addOns: [customiser.key] })).plan;
        expect(plan.installable, JSON.stringify(plan).slice(0, 3000)).toBe(true);
        const install = await owner.post<{ rules: { skipped: unknown[] } }>("/api/v1/apps/install", { ...body, planChecksum: plan.checksum, addOns: [{ key: customiser.key, version: customiser.version }] });
        if (install.status !== 200) throw new Error(`install refused: ${JSON.stringify(install.body).slice(0, 3000)}`);
        expect(JSON.stringify(install.body.rules.skipped)).toBe("[]");
        ok(await owner.patch(`/api/v1/connections/${connectionId}`, { timezone: "Europe/London", currency: "GBP" }));

        await server.setClock(THURSDAY, true);
        await addSample(owner);
        await server.setClock(THURSDAY);

        // A maker, signed in to the studio's own screens.
        const roles = ok(await owner.get<{ roles: { id: string; name: string; slug?: string }[] }>("/api/v1/roles")).roles;
        const role = roles.find((r) => r.slug === "maker-maker") ?? roles.find((r) => r.name.toLowerCase() === "maker")!;
        const email = `maker.${engine}@birchrow.example`;
        const invited = ok(await owner.post<{ invite: { token: string } }>("/api/v1/users", { email, name: "Jo Marsh", roleIds: [role.id] }), 201);
        const password = newPassword();
        ok(await new Caller(server.base).post("/api/v1/auth/password/reset", { token: invited.invite.token, newPassword: password }));
        const caller = new Caller(server.base);
        await caller.signInToScreens(email, password);
        maker = await doorFor(caller);
      }, 420_000);

      afterAll(async () => {
        await server?.stop();
      });

      it("finds the sample's sheets to batch: walnut, ply and acrylic, from six orders", async () => {
        const data = await maker.load();
        const groups = batchGroups(data);
        expect(groups.map((g) => [String(g.material["code"]), g.pieces.length, g.refs])).toEqual([
          ["ply3", 9, ["BR-2283", "BR-2284"]],
          ["acr3", 7, ["BR-2285", "BR-2286"]],
          ["wal6", 6, ["BR-2281", "BR-2282"]],
        ]);
      });

      it("batches the walnut sheet: the batch, the laser's booking and its sheet in one write, the lines to making", async () => {
        let data = await maker.load();
        const group = batchGroups(data).find((g) => g["material"]["code"] === "wal6")!;
        const before = data.materials.find((m) => m["code"] === "wal6")!;
        expect([num(before["on_hand"]), num(before["committed"])]).toEqual([14, 2]);
        const started = await startBatch(maker, data, group, packSheet(group.pieces, group.sheet), "Walnut sheet · 6 pieces", maker.now());
        expect(started).toMatchObject({ pieces: 6, orders: 2, sheets: 1, stale: 0 });

        // The batch, started by the maker, with the sheet it took.
        const batch = (await rows("batches")).find((b) => String(b.id) === String(started.batch.id))!;
        expect([batch["state"], batch["started_by"], num(batch["sheets"]), num(batch["piece_count"])]).toEqual(["running", "Jo Marsh", 1, 2]);
        // The laser, booked once its 15:00 run is done (17:40 in Settle), for its 135 minutes.
        const booking = (await rows("machine_bookings")).find((b) => String(b["batch_id"]) === String(batch.id))!;
        expect([booking["label"], booking["kind"], booking["booked_by"]]).toEqual(["Walnut sheet · 6 pieces", "run", "Jo Marsh"]);
        data = await maker.load();
        const mine = data.bookings.find((b) => String(b.id) === String(booking.id))!;
        expect([mine["starts_at"], mine["ends_at"]]).toEqual(["2026-08-06T16:40:00.000Z", "2026-08-06T18:55:00.000Z"]);
        // The lines on it, making; their orders with them.
        const lines = data.lines.filter((l) => String(l["batch_id"]) === String(batch.id));
        expect(lines.map((l) => l["stage"])).toEqual(["making", "making"]);
        const numbers = (o: Row) => o["number"];
        expect(data.orders.filter((o) => ["BR-2281", "BR-2282"].includes(String(numbers(o)))).map((o) => o["status"])).toEqual(["making", "making"]);
        // The sheet off the shelf, as Adminium works it out from the movement below the batch.
        const after = data.materials.find((m) => m["code"] === "wal6")!;
        expect([num(after["on_hand"]), num(after["available"])]).toEqual([13, 11]);
        const used = data.movements.find((m) => String(m["batch_id"]) === String(batch.id))!;
        expect([used["kind"], num(used["qty"]), num(used["on_hand_change"]), num(used["taken"]), used["made_by"]]).toEqual(["used", 1, -1, 1, "Jo Marsh"]);
        // Nothing of walnut is left to batch.
        expect(batchGroups(data).some((g) => g.material["code"] === "wal6")).toBe(false);
      }, 120_000);

      it("is refused the whole batch, by Adminium, when the machine's time was taken after the screen read it", async () => {
        // The screen reads the studio; then someone else books the laser for the time the screen would pick.
        const seen = await maker.load();
        const group = batchGroups(seen).find((g) => g.material["code"] === "ply3")!;
        const machine = group.machine!;
        const minutes = (num(machine["run_minutes"]) ?? 60) * 1;
        const from = nextFreeAt(bookingsOf(seen, machine), maker.now(), minutes);
        const other = await maker.book({ machineId: machine.id, label: "Someone else's run", startsAt: new Date(from).toISOString(), endsAt: new Date(from + 15 * 60_000).toISOString() });
        const before = { batches: (await rows("batches")).length, bookings: (await rows("machine_bookings")).length, movements: (await rows("stock_movements")).length, lines: (await rows("order_lines")).map((l) => [l.id, l["stage"], l["batch_id"] ?? null]) };

        const refused = await startBatch(maker, seen, group, packSheet(group.pieces, group.sheet), "Ply sheet", maker.now()).catch((e: unknown) => e);
        expect(refused).toBeInstanceOf(ApiError);
        expect(refused).toMatchObject({ status: 409, code: "BOOKING_TAKEN" });
        expect(isTaken(refused)).toBe(true);
        // Adminium names the row below the batch that took the time.
        expect(String((refused as ApiError).params["relation"] ?? "")).not.toBe("");
        // Nothing of it was written.
        const after = { batches: (await rows("batches")).length, bookings: (await rows("machine_bookings")).length, movements: (await rows("stock_movements")).length, lines: (await rows("order_lines")).map((l) => [l.id, l["stage"], l["batch_id"] ?? null]) };
        expect(after).toEqual(before);
        await maker.unbook(other);
      });

      // Over the walnut sheet's booking, and from the shelf that sheet left: both stand on the batch above.
      it("is refused, by Adminium, a booking over another on the same machine", async () => {
        const data = await maker.load();
        const laser = data.machines.find((m) => m["code"] === "laser")!;
        const refused = await maker.book({ machineId: laser.id, label: "Over the walnut sheet", startsAt: "2026-08-06T17:00:00.000Z", endsAt: "2026-08-06T17:30:00.000Z" }).catch((e: unknown) => e);
        expect(refused).toBeInstanceOf(ApiError);
        expect(refused).toMatchObject({ status: 409 });
        expect(JSON.stringify(refused)).toContain("BOOKING_TAKEN");
        // On another machine the same time is taken: printer A, free from six, its desk tray done (printer B prints the keyrings till half six).
        const printer = data.machines.find((m) => m["code"] === "printer-a")!;
        const booked = await maker.book({ machineId: printer.id, label: "A test print", startsAt: "2026-08-06T17:00:00.000Z", endsAt: "2026-08-06T17:30:00.000Z" });
        await maker.unbook(booked);
        expect((await rows("machine_bookings")).some((b) => String(b.id) === String(booked.id))).toBe(false);
      });

      it("counts the shelf: the book's figure kept beside the count, the stock moved by the difference", async () => {
        let data = await maker.load();
        const walnut = data.materials.find((m) => m["code"] === "wal6")!;
        const ply = data.materials.find((m) => m["code"] === "ply3")!;
        expect(await saveCount(maker, [{ materialId: walnut.id, counted: 12 }, { materialId: ply.id, counted: num(ply["on_hand"])! }])).toBe(2);
        data = await maker.load();
        expect(num(data.materials.find((m) => m["code"] === "wal6")!["on_hand"])).toBe(12);
        const counts = data.movements.filter((m) => m["kind"] === "count");
        expect(counts.map((m) => [String(m["material_id"]), num(m["counted"]), num(m["on_hand_before"]), num(m["on_hand_change"])])).toEqual([
          [String(walnut.id), 12, 13, -1],
          [String(ply.id), num(ply["on_hand"]), num(ply["on_hand"]), 0],
        ]);
      });
    });
  });
});
