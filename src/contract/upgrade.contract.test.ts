/**
 * A STUDIO ON 0.2.3 TAKES THE NEXT RELEASE, AND A LINE ADDED BY HAND GETS ITS NUMBER.
 *
 * The released 0.2.3 manifest (kept in `released/`, held to its tag)
 * installed with the Customiser on a BUILT Adminium, on SQLite, Postgres and
 * MySQL, and its sample added. On 0.2.3 a line's place on its order is a plain
 * column: a line the owner adds to an order on the dashboard has none, so its
 * label code is the order's number alone ("BR-2287"), and so is the name of
 * its proof. Then this checkout's manifest, packed as the next release, staged
 * and the app updated in place, as the operator allows it.
 *
 * The update numbers a line's place on its order from then on. The line added
 * by hand takes the next number after the order's own ("BR-2287/2"), the
 * sample's lines keep theirs, and its proof is named by it ("BR-2287/2 #1").
 * Numbering the lines already there is Adminium 0.3.54's: on an older
 * Adminium those checks are expected to fail, and say so.
 *
 * It runs with `CONTRACT=1` where a built Adminium and a built add-ons
 * checkout are, and says why it skipped otherwise. Its ports start at
 * `CONTRACT_PORT_BASE` (4950), three an engine.
 */
import { execFileSync } from "node:child_process";
import { readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { addOnBundle, addSample, appBundle, boot, Caller, ENGINES, missing, missingAddOn, ok, PORTS_PER_ENGINE, type Engine, type Server } from "./harness.ts";
import { engineAtLeast, MANIFEST_TEXT } from "./release.ts";

const why = missing() ?? missingAddOn("customiser");
if (why !== null && process.env["ADMINIUM_REQUIRE_CONTRACT"] === "1") throw new Error(`the upgrade contract must run here, and cannot: ${why}`);
const PORT_BASE = Number(process.env["CONTRACT_PORT_BASE"] ?? 4950);
const ADMIN = { email: process.env["E2E_ADMIN_EMAIL"] ?? "e2e@adminium.local", password: process.env["E2E_ADMIN_PASSWORD"] ?? "adminium-e2e-password" };
/** 16:40 on Thursday 6 August 2026 in Settle (British Summer Time), the sample's moment. */
const THURSDAY = Date.parse("2026-08-06T15:40:00Z");
const REPO = fileURLToPath(new URL("../..", import.meta.url));
const FROM = "0.2.3";
/**
 * The released 0.2.3's own manifest, kept beside this test
 * (`released/maker-0.2.3.manifest.json`): read the same in a shallow CI
 * checkout with no tags, and held to the release's tag where there is one.
 */
const FROM_MANIFEST = readFileSync(join(REPO, "src", "contract", "released", `maker-${FROM}.manifest.json`), "utf8");
/** The tag's manifest, or null in a checkout with no tags (CI's). */
const TAGGED = (() => {
  try {
    return execFileSync("git", ["-C", REPO, "show", `v${FROM}:manifest.json`], { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"], maxBuffer: 16 * 1024 * 1024 });
  } catch {
    return null;
  }
})();

describe(`the released ${FROM} manifest kept beside the upgrade contract`, () => {
  it.skipIf(TAGGED === null)(`is the one tagged v${FROM}${TAGGED === null ? " — skipped: this checkout has no tags" : ""}`, () => {
    expect(FROM_MANIFEST === TAGGED).toBe(true);
  });
  it(`says it is ${FROM}`, () => {
    expect((JSON.parse(FROM_MANIFEST) as { version: string }).version).toBe(FROM);
  });
});

/** This checkout's manifest, as the release after 0.2.3 (the release stamps its number). */
const TO_MANIFEST = (() => {
  const manifest = JSON.parse(MANIFEST_TEXT) as { version: string };
  return manifest.version === FROM ? JSON.stringify({ ...manifest, version: "0.2.4" }, null, 2) : MANIFEST_TEXT;
})();
/** Numbering the lines already there at an update is Adminium 0.3.54's; on an older one these checks fail, as said. */
const NUMBERED = engineAtLeast("0.3.54");
const numbers = NUMBERED ? it : it.fails;
const NEEDS = NUMBERED ? "" : " — expected to fail: needs Adminium 0.3.54's update numbering";

type Row = Record<string, unknown> & { id: number | string };

describe.skipIf(why !== null)(`a studio on ${FROM} updated, a line added by hand numbered${why === null ? "" : ` — skipped: ${why}`}`, () => {
  ENGINES.forEach(([engine, available], index) => {
    describe.skipIf(!available)(`on ${engine}`, () => {
      let server: Server;
      let staff: Caller;
      let connectionId = "";
      const rows = async (ref: string): Promise<Row[]> => {
        const out: Row[] = [];
        for (let offset = 0; ; offset += 200) {
          const page = ok(await staff.get<{ data: Row[] }>(`/api/v1/data/${connectionId}/maker_${ref}?limit=200&offset=${String(offset)}`)).data;
          out.push(...page);
          if (page.length < 200) return out;
        }
      };
      const stage = async (manifest: string) => {
        const app = appBundle({ manifest });
        const staged = await staff.post(`/api/v1/apps/upload?expectedSha512=${encodeURIComponent(app.integrity)}`, app.buffer);
        if (![200, 201].includes(staged.status)) throw new Error(`upload: ${JSON.stringify(staged.body).slice(0, 600)}`);
        return app;
      };

      /** BR-2287: one sample line, its slate house sign, numbered 1. */
      let order: Row;
      let byHand: Row;
      let proof: Row;

      beforeAll(async () => {
        server = await boot(engine as Engine, PORT_BASE + index * PORTS_PER_ENGINE, THURSDAY - 60_000, { database: `maker_upgrade_${engine}${process.env["CONTRACT_DB_SUFFIX"] ?? ""}` });
        staff = new Caller(server.base, { origin: server.base });
        await staff.signIn(ADMIN.email, ADMIN.password);
        if (engine === "sqlite") {
          const file = join(tmpdir(), `maker-upgrade-contract-${String(PORT_BASE)}.db`);
          rmSync(file, { force: true });
          writeFileSync(file, "");
          connectionId = ok(await staff.post<{ id: string }>("/api/v1/connections", { name: "birch-row", engine: "sqlite", dsn: `sqlite:${file}` }), 201).id;
        } else {
          connectionId = ok(await staff.get<{ connections: { id: string; name: string }[] }>("/api/v1/connections")).connections.find((c) => c.name === "northwind")!.id;
        }
        const addOn = addOnBundle("customiser");
        const stagedAddOn = await staff.post(`/api/v1/add-ons/upload?expectedSha512=${encodeURIComponent(addOn.integrity)}`, addOn.buffer);
        if (![200, 201].includes(stagedAddOn.status)) throw new Error(`add-on upload: ${JSON.stringify(stagedAddOn.body).slice(0, 600)}`);
        const app = await stage(FROM_MANIFEST);
        expect(app.version).toBe(FROM);
        const body = { key: app.key, version: app.version, connectionId };
        const plan = ok(await staff.post<{ plan: { checksum: string; installable: boolean } }>("/api/v1/apps/plan", { ...body, addOns: [addOn.key] })).plan;
        if (!plan.installable) throw new Error(`not installable: ${JSON.stringify(plan).slice(0, 3000)}`);
        ok(await staff.post("/api/v1/apps/install", { ...body, planChecksum: plan.checksum, addOns: [{ key: addOn.key, version: addOn.version }] }));
        ok(await staff.patch(`/api/v1/connections/${connectionId}`, { timezone: "Europe/London", currency: "GBP" }));
        await server.setClock(THURSDAY, true);
        await addSample(staff);
        await server.setClock(THURSDAY);

        // On 0.2.3: the owner adds a walnut bookmark to BR-2287 on the dashboard, and sends its proof from there.
        order = (await rows("orders")).find((o) => o["number"] === "BR-2287")!;
        const bookmark = (await rows("products")).find((p) => p["code"] === "book-wal")!;
        byHand = ok(await staff.post<{ data: Row }>(`/api/v1/data/${connectionId}/maker_order_lines`, { values: { order_id: order.id, product_id: bookmark.id, qty: 1, lettering: "Old Dairy" } }), 201).data;
        proof = ok(await staff.post<{ data: Row }>(`/api/v1/data/${connectionId}/maker_proofs`, { values: { line_id: byHand.id, kind: "lettering", note: "The bookmark, lettered to match." } }), 201).data;
      }, 600_000);

      afterAll(async () => {
        await server?.stop();
      });

      it(`leaves a line added by hand on ${FROM} without a place on its order, named by the order's number alone`, async () => {
        const line = (await rows("order_lines")).find((l) => String(l.id) === String(byHand.id))!;
        expect([line["position"] ?? null, line["label_code"]]).toEqual([null, "BR-2287"]);
        const sample = (await rows("order_lines")).filter((l) => String(l["order_id"]) === String(order.id) && String(l.id) !== String(byHand.id));
        expect(sample.map((l) => [Number(l["position"]), l["label_code"]])).toEqual([[1, "BR-2287/1"]]);
        expect(Number((await rows("proofs")).find((p) => String(p.id) === String(proof.id))!["version"])).toBe(1);
      });

      it(`updates in place from ${FROM}`, async () => {
        const app = await stage(TO_MANIFEST);
        const plan = ok(await staff.post<{ plan: { checksum: string; installable: boolean; problems: unknown[] } }>("/api/v1/apps/plan", { key: app.key, version: app.version, connectionId })).plan;
        expect([plan.installable, plan.problems]).toEqual([true, []]);
        const reply = await staff.post<{ from: string; to: string }>("/api/v1/apps/maker/update", { planChecksum: plan.checksum, publicAccess: true, roleTables: true });
        expect(reply.status, JSON.stringify(reply.body).slice(0, 1500)).toBe(200);
        expect([reply.body.from, reply.body.to]).toEqual([FROM, app.version]);
      }, 300_000);

      numbers(`gives the line added by hand the next place on its order, and its proof the name that follows${NEEDS}`, async () => {
        const lines = (await rows("order_lines")).filter((l) => String(l["order_id"]) === String(order.id));
        expect(lines.map((l) => [String(l.id) === String(byHand.id) ? "by hand" : "sample", Number(l["position"]), l["label_code"]])).toEqual([
          ["sample", 1, "BR-2287/1"],
          ["by hand", 2, "BR-2287/2"],
        ]);
        const named = (await rows("proofs")).find((p) => String(p.id) === String(proof.id))!;
        expect([named["line_code"], named["title"]]).toEqual(["BR-2287/2", "BR-2287/2 #1"]);
      });

      numbers(`names every proof by its line's label code and its number${NEEDS}`, async () => {
        expect((await rows("proofs")).filter((p) => !/^BR-\d+\/\d+ #\d+$/.test(String(p["title"] ?? ""))).map((p) => p["title"] ?? null)).toEqual([]);
      });

      numbers(`numbers a line added after the update after them${NEEDS}`, async () => {
        const bookmark = (await rows("products")).find((p) => p["code"] === "book-wal")!;
        const added = ok(await staff.post<{ data: Row }>(`/api/v1/data/${connectionId}/maker_order_lines`, { values: { order_id: order.id, product_id: bookmark.id, qty: 1, lettering: "Spare" } }), 201).data;
        const line = (await rows("order_lines")).find((l) => String(l.id) === String(added.id))!;
        expect([Number(line["position"]), line["label_code"]]).toEqual([3, "BR-2287/3"]);
      });
    });
  });
});
