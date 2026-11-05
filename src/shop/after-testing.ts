/**
 * A stand-in for Adminium behind the after-order door, for the screens'
 * tests: one shopper's orders (one with a proof waiting, one posted), the
 * code Adminium would e-mail, an order's own link, the studio's closures,
 * rates and machines. It records every call with its body, so a test can
 * hold each write to the exact body the page sends. It is not Adminium: the
 * contract test (`src/contract/after.contract.test.ts`) walks a real one.
 *
 * Tests only; nothing that ships imports it.
 */
import type { AfterPort, CodeAnswer, Extras, OrderRead, ProofAnswer, Via } from "./after-port.ts";
import { ShopError, type Id, type Refused, type Row } from "./port.ts";

export interface AfterCall {
  call: string;
  args: unknown[];
}

export interface FakeAfter extends AfterPort {
  calls: AfterCall[];
  /** The code the next e-mail carries. */
  code: string;
  /** Refuse the next write with this refusal. */
  refuseNext: (refused: Partial<Refused> & { code: string }) => void;
  /** The link the order's e-mail carries. */
  linkToken: string;
  rows: { orders: Row[]; lines: Row[]; features: Row[]; proofs: Row[] };
  /** Who is signed in, by address, or nobody. */
  session: string | null;
  linkOpen: boolean;
  /** What a waiting proof's picture reads as: none, unless a test gives one. */
  picture: Blob | null;
}

const SHOPPER = "iris.p@example.com";

export function sampleAfterRows(): FakeAfter["rows"] {
  return {
    orders: [
      { id: 76, number: "BR-2276", status: "placed", name: "Iris P.", email: SHOPPER, service_id: 1, total: "65.50", placed_at: "2026-08-04T09:12:00Z", post_by: "2026-08-07", posted_at: null, tracking: null },
      { id: 47, number: "BR-2247", status: "posted", name: "Iris P.", email: SHOPPER, service_id: 2, total: "68.62", placed_at: "2026-07-14T10:00:00Z", post_by: "2026-07-17", posted_at: "2026-07-17T15:30:00Z", tracking: null },
    ],
    lines: [
      { id: 761, order_id: 76, position: 1, product_id: 2, product_name: "Birch ply coasters", qty: 2, material_id: 30, size_id: 31, finish_id: 32, lettering: "The Old Mill", design_code: null, design_id: null, stage: "make", proof_state: "sent", proof_ok: 0, started_at: null, finishing_at: null, made_at: null },
      { id: 471, order_id: 47, position: 1, product_id: 1, product_name: "Engraved walnut coasters", qty: 1, material_id: 10, size_id: 12, finish_id: 14, lettering: null, design_code: "DSGN-7Q2K-X4PA", design_id: 900, stage: "posted", proof_state: "approved", proof_ok: 1, started_at: "2026-07-15T08:00:00Z", finishing_at: "2026-07-16T09:00:00Z", made_at: "2026-07-16T16:00:00Z" },
    ],
    features: [{ id: 4711, line_id: 471, option_id: 20, feature: "logo", name: "Your own logo", price: "1.50" }],
    proofs: [
      { id: 501, order_id: 76, line_id: 761, version: 1, kind: "lettering", state: "change_asked", note: "Set in Fenwick, 6 mm.", change_note: "Could the words be a little bigger?", sent_at: "2026-08-05T10:00:00Z", answered_at: "2026-08-05T15:20:00Z" },
      { id: 502, order_id: 76, line_id: 761, version: 2, kind: "lettering", state: "sent", note: "Set in Fenwick, 8 mm.", change_note: null, sent_at: "2026-08-06T10:05:00Z", answered_at: null },
      { id: 401, order_id: 47, line_id: 471, version: 1, kind: "design", state: "approved", note: null, change_note: null, sent_at: "2026-07-14T14:00:00Z", answered_at: "2026-07-14T18:00:00Z" },
    ],
  };
}

export function fakeAfter(settings: Record<string, unknown> = { studio_days: "tue,wed,thu,fri,sat", cutoff: "17:00" }): FakeAfter {
  const calls: AfterCall[] = [];
  let refusal: Refused | null = null;
  let number = 0;
  const record = (call: string, ...args: unknown[]) => calls.push({ call, args });
  const refuse = () => {
    if (refusal === null) return;
    const r = refusal;
    refusal = null;
    throw new ShopError(r, r.code);
  };
  const fake: FakeAfter = {
    calls,
    code: "123456",
    linkToken: "LINKCODE0000000A",
    rows: sampleAfterRows(),
    session: null,
    linkOpen: false,
    picture: null,
    refuseNext: (r) => {
      refusal = { status: 400, column: null, child: null, index: null, reason: null, changed: null, raw: null, ...r };
    },
    async requestCode(email, language) {
      record("requestCode", email, language);
    },
    async verifyCode(email, code): Promise<CodeAnswer> {
      record("verifyCode", email, code);
      if (code === "999999") return { ok: false, reason: "spent" };
      if (code === "000000") return { ok: false, reason: "locked" };
      if (code !== fake.code) return { ok: false, reason: "wrong", triesLeft: 4 };
      fake.session = email;
      return { ok: true };
    },
    async openSignInLink(token) {
      record("openSignInLink", token);
      if (token !== "SIGNINLINK000000") return false;
      fake.session = SHOPPER;
      return true;
    },
    async peekSignInLink(token) {
      record("peekSignInLink", token);
      return token === "SIGNINLINK000000" ? "Iris" : null;
    },
    signedIn: () => fake.session !== null,
    async myOrders() {
      record("myOrders");
      return fake.rows.orders.filter((o) => o["email"] === fake.session);
    },
    async myRows() {
      record("myRows");
      const mine = new Set(fake.rows.orders.filter((o) => o["email"] === fake.session).map((o) => String(o["id"])));
      const lines = fake.rows.lines.filter((l) => mine.has(String(l["order_id"])));
      const ids = new Set(lines.map((l) => String(l["id"])));
      return { lines, features: fake.rows.features.filter((f) => ids.has(String(f["line_id"]))), proofs: fake.rows.proofs.filter((p) => mine.has(String(p["order_id"]))) };
    },
    async openShared(token) {
      record("openShared", token);
      if (token === "STOPPEDLINK00000") return "closed";
      if (token !== fake.linkToken) return "unknown";
      fake.linkOpen = true;
      return "opened";
    },
    sharedHeld: () => fake.linkOpen,
    async readShared(): Promise<OrderRead | null> {
      record("readShared");
      if (!fake.linkOpen) return null;
      const order = fake.rows.orders[0]!;
      const lines = fake.rows.lines.filter((l) => l["order_id"] === order["id"]);
      return { via: "link", order, lines, features: [], proofs: fake.rows.proofs.filter((p) => p["order_id"] === order["id"]) };
    },
    async answerProof(via: Via, proofId: Id, answer: ProofAnswer) {
      record("answerProof", via, proofId, answer);
      refuse();
      const proof = fake.rows.proofs.find((p) => String(p["id"]) === String(proofId))!;
      Object.assign(proof, answer, { answered_at: "2026-08-06T16:41:00Z" });
      const line = fake.rows.lines.find((l) => l["id"] === proof["line_id"])!;
      Object.assign(line, { proof_state: answer.state, proof_ok: answer.state === "approved" ? 1 : 0 });
      return proof;
    },
    async proofPicture(via, proofId) {
      record("proofPicture", via, proofId);
      return fake.picture;
    },
    async ask(values) {
      record("ask", values);
      refuse();
      number += 1;
      return { id: number, ref: `ASK-${String(number).padStart(4, "0")}`, status: "new" };
    },
    async report(values) {
      record("report", values);
      refuse();
      number += 1;
      return { id: number, ref: `FIX-${String(number).padStart(4, "0")}`, status: "new" };
    },
    async extras(): Promise<Extras> {
      record("extras");
      return {
        closures: [{ id: 1, from_date: "2026-08-15", to_date: "2026-08-15", reason: "Closed — we're at the Whitby craft fair" }],
        rates: [
          { id: 1, service_id: 1, min_grams: 0, max_grams: null, price: "3.95" },
          { id: 2, service_id: 2, min_grams: 0, max_grams: null, price: "7.50" },
        ],
        machines: [
          { id: 1, name: "The laser", kind: "laser", icon: "zap", shop_note: "Cuts and engraves the wood, ply, acrylic and slate. It runs most of the day.", position: 1 },
          { id: 2, name: "The kiln", kind: "kiln", icon: "flame", shop_note: "Fires the mugs twice — bisque first, then glaze at 1240°C.", position: 2 },
          { id: 3, name: "Spare printer", kind: "printer", icon: "box", shop_note: null, position: 3 },
        ],
      };
    },
    settings: () => settings,
    // 16:40 on Thursday 6 August 2026 in Settle.
    now: async () => new Date("2026-08-06T15:40:00Z"),
  };
  return fake;
}
