/**
 * Paying for an order online, as the manifest asks Adminium for it: the
 * order is payable at checkout, each payment is a row only Adminium writes,
 * the bench waits for the payment where the studio asks it to, the e-mails
 * go when the money comes in (or an hour without it), and nothing changes
 * for an order placed while the studio takes no payments online.
 */
import { describe, expect, it } from "vitest";

import { validateManifest } from "../testing/manifest/index.ts";
import { buildManifest } from "./build.ts";
import { EMAIL_EN, emailTemplates } from "./emails.ts";
import { KINDS, OUTBOX } from "./outbox.ts";
import { PAYMENTS, RETURN_TO } from "./payments.ts";
import { ORDER_SELECT, PUBLIC_REFS } from "./public.ts";

type Json = Record<string, unknown>;
const manifest = buildManifest() as Json & {
  requiredSchema: { tables: (Json & { ref: string; columns: (Json & { ref: string; rules?: Json })[]; states?: Json })[] };
  publicAccess: (Json & { table: string; methods: string[]; writable?: string[]; select?: string[] })[];
  roles: (Json & { key: string; permissions: string[]; limits?: Record<string, Json> })[];
};
const table = (ref: string) => manifest.requiredSchema.tables.find((t) => t.ref === ref)!;
const column = (t: string, c: string) => table(t).columns.find((col) => col.ref === c)!;
const rules = (t: string, c: string) => (column(t, c).rules ?? {}) as Json;
const role = (key: string) => manifest.roles.find((r) => r.key === key)!;
const producers = OUTBOX.producers as (Json & { kind: string })[];
const producer = (kind: string) => producers.filter((p) => p.kind === kind);
const template = (kind: string) => (emailTemplates(KINDS) as { key: string; locales: Record<string, { blocks: { id: string; block: string; data: Json }[] }> }[]).find((t) => t.key === `maker-${kind}`)!;

describe("an order is payable online at checkout", () => {
  const payable = PAYMENTS.payables[0]!;

  it("passes the 0.3.62 validator, and an older floor refuses it", () => {
    const result = validateManifest(manifest);
    expect(result.ok ? [] : result.issues).toEqual([]);
    const older = validateManifest({ ...manifest, compatibility: { ...(manifest["compatibility"] as Json), minAdminiumVersion: "0.3.61" } });
    expect(older.ok).toBe(false);
  });

  it("asks the order's own total, what is left of it, and the connection's money", () => {
    expect(payable).toMatchObject({ table: "orders", label: "number", amount: { column: "total" }, due: { column: "pay_due" }, currency: { connection: true }, customerEmail: "email" });
    expect(rules("orders", "pay_due")["formula"]).toEqual({ max: [0, { sub: [{ coalesce: ["total", 0] }, { coalesce: ["paid", 0] }] }] });
    // A refund is kept on the payment and gives money back; it never asks for the money again.
    expect(rules("orders", "paid")["rollup"]).toEqual({ from: "payments", via: "order_id", sum: "amount" });
    expect(rules("orders", "refunded")["rollup"]).toEqual({ from: "payments", via: "order_id", sum: "refunded" });
    expect(payable.refunds).toEqual({ model: "column" });
  });

  it("is payable only when the shopper was asked to pay online, while the order is on its way and something is left", () => {
    expect(payable.payableWhen).toEqual([
      { column: "pay_online", eq: true },
      { column: "status", in: ["placed", "making", "ready"] },
      { column: "pay_due", gt: 0 },
    ]);
  });

  it("brings the shopper back to the shop's order page, sends the app's own receipt, and offers no way to pay by hand", () => {
    expect(RETURN_TO).toBe("/order");
    expect(payable).toMatchObject({ returnTo: "/order", receipt: "app", onlyOnline: true });
    // Not held to the ways that settle at once: an order is placed before it is paid, and a bank may take days.
    expect("instantOnly" in payable).toBe(false);
    // Paying moves no order along: the order is placed, and the bench decides the rest.
    expect("status" in payable).toBe(false);
  });

  it("keeps each payment in the app's own table, its reference unique and written by Adminium alone", () => {
    expect(payable.payments).toEqual({
      kind: "table",
      table: "payments",
      link: "order_id",
      amount: "amount",
      paidAt: "paid_at",
      method: { column: "method", values: { "*": "online" } },
      note: "note",
      reference: "payment_ref",
      refunded: "refunded",
      provider: "provider",
      currency: "currency",
    });
    expect(column("payments", "payment_ref")).toMatchObject({ type: "text", maxLength: 64, unique: true });
    expect(column("payments", "method")).toMatchObject({ type: "enum", enum: ["online"] });
    expect(table("payments")["keep"]).toEqual({ law: "tax" });
    // No public entry opens the payments, and no role writes them.
    expect(manifest.publicAccess.filter((e) => e.table === "payments")).toEqual([]);
    for (const r of manifest.roles) {
      expect(r.permissions.filter((p) => p.startsWith("table:@payments:")), r.key).toEqual(["table:@payments:read"]);
    }
  });

  it("gives the owner the refund of what was paid online for the studio's orders, and nobody else", () => {
    expect(role("owner").permissions).toContain("payments:@:refund");
    expect(role("maker").permissions).not.toContain("payments:@:refund");
    expect(role("packer").permissions).not.toContain("payments:@:refund");
  });

  it("places an order by whether the studio takes payments online, Adminium judging it, never the page", () => {
    const places = manifest.publicAccess.filter((e) => e.table === "orders" && e.methods.includes("POST"));
    expect(places.map((e) => e["requirePayments"])).toEqual(["off", "on"]);
    const [off, on] = places as (Json & { writable: string[] })[];
    // While it does not: as it always was, no pay link, nothing of paying.
    expect([off!["pay"], off!["defaults"]]).toEqual([undefined, undefined]);
    // While it does: the order asks to be paid online by the entry's own value, and its pay link comes back with it.
    expect([on!["pay"], on!["defaults"], on!["humanCheck"]]).toEqual([true, { pay_online: true }, true]);
    for (const entry of [off!, on!]) {
      expect(entry.writable).not.toContain("pay_online");
      for (const decided of ["paid", "refunded", "pay_due", "paid_at", "waits_pay", "pay_hold"]) expect(entry.writable).not.toContain(decided);
    }
    // The same order either way: only paying differs.
    const { requirePayments: _a, pay: _b, defaults: _c, ...plainOff } = off!;
    const { requirePayments: _d, pay: _e, defaults: _f, ...plainOn } = on!;
    expect(plainOn).toEqual(plainOff);
    expect([PUBLIC_REFS.placeOrder, PUBLIC_REFS.placeOrderPaying]).toEqual(["maker_orders_verified_2", "maker_orders_verified_3"]);
  });

  it("shows the shopper whether their order is paid, what is left, and the post-by counted from the payment", () => {
    for (const c of ["pay_online", "waits_pay", "pay_mode", "paid", "refunded", "pay_due", "paid_at", "pay_hold", "lead_max", "paid_post_by"]) expect(ORDER_SELECT).toContain(c);
  });
});

describe("Take payment before making", () => {
  it("is the studio's own setting, off until its admin turns it on", () => {
    expect(column("settings", "pay_first")).toMatchObject({ type: "bool", default: false });
    // An order keeps the setting as it stood when it was placed; the owner may untick it on one order.
    expect(rules("orders", "waits_pay")).toEqual({ default: { from: { table: "settings", column: "pay_first" } } });
    expect(role("owner").limits!["orders"]!["writable"]).toEqual(expect.arrayContaining(["waits_pay", "pay_online"]));
  });

  it("holds a line at make until its order is paid, beside the proof", () => {
    const moves = (table("order_lines").states as { moves: Record<string, unknown[]> }).moves;
    expect(moves["make"]![0]).toEqual({
      to: "making",
      requires: { where: [{ column: "proof_ok", eq: 1 }], linked: [{ via: "order_id", where: [{ column: "pay_hold", eq: 0 }] }] },
    });
    expect(rules("orders", "pay_mode")["formula"]).toEqual({ if: [{ eq: ["pay_online", true] }, { if: [{ eq: ["waits_pay", true] }, 2, 1] }, 0] });
    expect(rules("orders", "pay_hold")["formula"]).toEqual({ if: [{ and: [{ eq: ["pay_mode", 2] }, { gt: ["pay_due", 0] }] }, 1, 0] });
  });

  it("counts such an order's post-by from its payment, worked out again when the payment lands", () => {
    const stamp = rules("orders", "paid_post_by")["stamp"] as Json;
    expect(stamp["on"]).toEqual({ columns: ["paid_at", "lead_max"] });
    expect((stamp["set"] as Json)["addWorkingDays"]).toMatchObject({ from: "paid_at", days: "lead_max", weekdays: "studio_days", cutoff: "cutoff" });
    expect(rules("orders", "lead_max")["rollup"]).toEqual({ from: "order_lines", via: "order_id", latest: { of: "lead_days", by: "lead_days" } });
  });
});

describe("the e-mails of an order paid online", () => {
  it("sends today's order-received e-mail at once while the studio takes no payments online, and for an order it placed itself", () => {
    expect(producer("order-received")).toEqual([
      { kind: "order-received", link: "order_id", onCreate: { table: "orders" }, payments: "off" },
      { kind: "order-received", link: "order_id", onCreate: { table: "orders", where: { column: "pay_online", eq: false } }, payments: "on" },
    ]);
  });

  it("sends the order's e-mail when the money comes in: the receipt", () => {
    expect(producer("order-paid")).toEqual([{ kind: "order-paid", link: "order_id", onCreate: { table: "payments", via: "order_id" } }]);
  });

  it("sends the unpaid one an hour after placing, and the reminder the studio day after, each only while unpaid", () => {
    const until = [
      { column: "pay_due", lte: 0, reason: "paid" },
      { column: "status", eq: "cancelled", reason: "void" },
    ];
    expect(producer("order-unpaid")).toEqual([{ kind: "order-unpaid", link: "order_id", onCreate: { table: "orders", where: { column: "pay_online", eq: true } }, payments: "on", holdSeconds: 3600, dropWhen: until }]);
    expect(producer("pay-reminder")).toEqual([{ kind: "pay-reminder", link: "order_id", onCreate: { table: "orders", where: { column: "pay_online", eq: true } }, payments: "on", due: { date: "remind_on", days: 0, at: "17:00" }, dropWhen: until }]);
    expect((rules("orders", "remind_on")["stamp"] as Json)["set"]).toMatchObject({ addWorkingDays: { from: "now", days: 1 } });
  });

  it("puts the pay link behind a button that is left out when the order cannot be paid online now", () => {
    for (const kind of ["order-unpaid", "pay-reminder"]) {
      for (const [tag, doc] of Object.entries(template(kind).locales)) {
        const pay = doc.blocks.find((b) => b.id === "pay")!;
        expect(pay.data, `${kind} ${tag}`).toMatchObject({ url: "{{pay_url}}", onlyWith: "pay_url" });
        expect(doc.blocks.find((b) => b.id === "start")!.data["onlyWith"], `${kind} ${tag}`).toBe("order.mode_hold");
      }
    }
    // The paid e-mail carries no pay link; it says what was paid, and its post-by follows how the order is made.
    const paid = template("order-paid").locales["en-US"]!.blocks;
    expect(JSON.stringify(paid)).not.toContain("pay_url");
    expect(paid.find((b) => b.id === "post-by")!.data["onlyWith"]).toBe("order.mode_free");
    expect(paid.find((b) => b.id === "post-by-paid")!.data).toMatchObject({ onlyWith: "order.mode_hold", lines: [{ label: "Post by", amount: "{{order.paid_post_by}}" }] });
  });

  it("leaves the order-received e-mail's words as they were", () => {
    expect(EMAIL_EN["order-received"]).toEqual({
      name: "Order received",
      subject: "We've got your order {{order.number}}",
      preheader: "{{order.total}} · post by {{order.post_by}}",
      heading: "Thanks, {{recipient.first_name}} — we've got your order {{order.number}}.",
      paras: ["Here's what you ordered. Anything with words on it gets a proof first: we'll e-mail you a picture to say yes to before we make it."],
    });
    expect(JSON.stringify(template("order-received"))).not.toMatch(/pay_url|mode_hold|mode_free/);
  });

  it("says Stripe and PayPal plainly, never as an owner of anything", () => {
    for (const kind of ["order-unpaid", "order-paid", "pay-reminder"]) expect(JSON.stringify(template(kind))).not.toMatch(/Stripe's|PayPal's|Stripe’s|PayPal’s/);
  });
});
