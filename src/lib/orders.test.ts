/**
 * The order machine's suite (24 D5b, D9, and acceptance criterion 14).
 *
 * Four things are load-bearing and each has its own block below: the lead times
 * by kind in STUDIO days, the basket taking its longest line, THE PROOF GATE
 * refusing a move with a reason that names what is missing, and the absence of
 * finished-goods stock anywhere in the app.
 *
 * The seed is asserted too, because prompt K's fiction is a promise the demo
 * makes to a reviewer: twelve live orders, three waiting on a picture, one
 * late, six ready to batch, references BR-2260 … BR-2287.
 */

import { describe, expect, it } from "vitest";

import { NEXT_REF, NOW, ORDERS, PAST_ORDERS } from "../data/demo.ts";
import { addDays, dayOfWeek, isStudioDay, postDay, studioDaysBetween } from "./calendar.ts";
import {
  LEAD_STUDIO_DAYS,
  MATERIAL_STOCK,
  PRODUCTS,
  PRODUCT_BY_KEY,
  QUANTITY_BREAKS,
  type StockUnit,
} from "./catalogue.ts";
import {
  BENCH_COLUMNS,
  ORDER_STAGES,
  approveProof,
  askForChange,
  benchKpis,
  breakFor,
  consumptionForLine,
  consumptionForOrder,
  eachPriceCents,
  isLocked,
  leadDaysFor,
  lineTotalCents,
  longestLeadDays,
  markPosted,
  moveLine,
  orderStage,
  sendProof,
  shipByFor,
  shipByForOrder,
  shipState,
  shopperStageDates,
  shopperStageIndex,
  spoilAndRemake,
  stockLines,
  unitPriceCents,
  type Order,
  type OrderLine,
} from "./orders.ts";

const byRef = (ref: string): Order => {
  const hit = [...ORDERS, ...PAST_ORDERS].find((o) => o.ref === ref);
  if (hit === undefined) throw new Error(`No such order in the seed: ${ref}`);
  return { ...hit, lines: hit.lines.map((l) => ({ ...l })), proofs: [...hit.proofs] };
};

const lineOf = (order: Order): OrderLine => order.lines[0]!;

// ── lead times ───────────────────────────────────────────────────────────────

describe("lead times are counted in studio days, by kind", () => {
  it("is 3 for coasters and keyrings, 4 for printed pieces, 5 for slate signs, 10 for glazed", () => {
    // The table 24 D5b writes, asserted through the products that use it rather
    // than by reading the constant back to itself.
    expect(leadDaysFor("walnut-coasters")).toBe(3);
    expect(leadDaysFor("ply-coasters")).toBe(3);
    expect(leadDaysFor("keyring")).toBe(3);
    expect(leadDaysFor("pet-tag")).toBe(3);
    expect(leadDaysFor("desk-tray")).toBe(4);
    expect(leadDaysFor("herb-pot")).toBe(4);
    expect(leadDaysFor("photo-block")).toBe(4);
    expect(leadDaysFor("house-sign")).toBe(5);
    expect(leadDaysFor("garden-markers")).toBe(5);
    expect(leadDaysFor("stoneware-mug")).toBe(10);
  });

  it("gives every one of the fourteen pieces a lead time", () => {
    expect(PRODUCTS).toHaveLength(14);
    for (const product of PRODUCTS) {
      expect({ key: product.key, days: leadDaysFor(product.key) }).toEqual({
        key: product.key,
        days: LEAD_STUDIO_DAYS[product.leadKind],
      });
    }
  });

  it("fires the mugs twice, which is why they are the slow one", () => {
    const longest = Math.max(...PRODUCTS.map((p) => leadDaysFor(p.key)));
    expect(longest).toBe(10);
    expect(PRODUCTS.filter((p) => leadDaysFor(p.key) === 10).map((p) => p.key)).toEqual([
      "stoneware-mug",
    ]);
  });
});

describe("a basket's ship-by takes its LONGEST line", () => {
  const coasters = { productKey: "walnut-coasters" };
  const mug = { productKey: "stoneware-mug" };

  it("is the slowest piece in the box, not the first or the average", () => {
    expect(longestLeadDays([coasters])).toBe(3);
    expect(longestLeadDays([coasters, mug])).toBe(10);
    expect(longestLeadDays([mug, coasters])).toBe(10);
  });

  it("posts a lone set of coasters on Tuesday 11 August", () => {
    expect(shipByFor([coasters], NOW)).toBe("2026-08-11");
  });

  it("makes one mug turn the whole parcel into a ten-day parcel", () => {
    // Aug 6 + 10 studio days finishes Wed 19 August; it posts the next studio
    // day. The coasters are done a week earlier and wait in the box.
    expect(shipByFor([coasters, mug], NOW)).toBe("2026-08-20");
  });

  it("has nothing to promise for an empty basket", () => {
    expect(shipByFor([], NOW)).toBeNull();
  });
});

// ── every date this app shows anybody is a day the bench runs ────────────────

describe("NO DATE THE SHOP PROMISES LANDS ON A SHUT DAY (criterion 13)", () => {
  /*
   * THE GUARD THAT WAS MISSING, AND WHAT IT COST.
   *
   * Every lead time in this app is counted in STUDIO days and the bench is shut
   * on Sunday and Monday. `calendar.test.ts` proves the arithmetic; nothing
   * proved that the app USES it. Swapping one `addStudioDays` for `addDays`
   * where the order view built its stage strip printed "Sun, 9 Aug" under a
   * step, on a shop page that spends a whole screen explaining the shop is shut
   * that day — and the entire suite stayed green, because the only tests that
   * knew about the studio week were testing the calendar module directly.
   *
   * So the rule is asserted where the rule is: over the dates the app hands to
   * a screen, for every order the demo ships and for a fortnight of synthetic
   * ones that deliberately start on the shut days.
   */

  const EVERY_ORDER = [...ORDERS, ...PAST_ORDERS];

  it("has orders to check, including some that finish across a weekend", () => {
    expect(EVERY_ORDER.length).toBeGreaterThan(12);
  });

  it("puts every step of every shopper's stage strip on an open day", () => {
    const shut: string[] = [];
    for (const order of EVERY_ORDER) {
      const dates = shopperStageDates(order);
      expect({ ref: order.ref, steps: dates.length }).toEqual({ ref: order.ref, steps: 5 });
      for (const [i, iso] of dates.entries()) {
        if (!isStudioDay(iso)) shut.push(`${order.ref} step ${i} · ${iso} · ${dayOfWeek(iso)}`);
      }
    }
    expect(shut).toEqual([]);
  });

  it("never moves a step backwards past the day the order was placed", () => {
    // A strip whose dates run downhill is the other way this arithmetic breaks.
    for (const order of EVERY_ORDER) {
      const dates = shopperStageDates(order);
      expect({ ref: order.ref, ok: dates.every((d) => d >= dates[0]!) }).toEqual({
        ref: order.ref,
        ok: true,
      });
    }
  });

  it("holds for an order placed on every day of a fortnight, shut days included", () => {
    /*
     * The seed only ever places orders on days the studio was open, so the seed
     * alone cannot show what happens to a date that starts on a Sunday. These
     * fourteen do, and two of them are the Sunday and the Monday.
     */
    const base = ORDERS[0]!;
    const shut: string[] = [];
    let sawAClosedStart = 0;

    for (let i = 0; i < 14; i += 1) {
      const placedIso = addDays("2026-08-02", i); // a Sunday
      if (!isStudioDay(placedIso)) sawAClosedStart += 1;
      const order = { ...base, placedIso, postedIso: undefined, proofs: [] };
      for (const [step, iso] of shopperStageDates(order).entries()) {
        if (!isStudioDay(iso)) shut.push(`placed ${placedIso} step ${step} · ${iso}`);
      }
    }

    expect(sawAClosedStart).toBe(4); // two Sundays, two Mondays
    expect(shut).toEqual([]);
  });

  it("promises a ship-by on an open day from any clock in the fortnight", () => {
    const shut: string[] = [];
    for (let i = 0; i < 14; i += 1) {
      for (const hour of [9, 16, 17, 21]) {
        const now = { iso: addDays("2026-08-02", i), hour, minute: 40 };
        for (const lead of Object.values(LEAD_STUDIO_DAYS)) {
          const iso = shipByFor([{ productKey: "walnut-coasters" }], now);
          const at = postDay(now, lead);
          if (iso !== null && !isStudioDay(iso)) shut.push(`shipBy ${JSON.stringify(now)} ${iso}`);
          if (!isStudioDay(at)) shut.push(`postDay ${JSON.stringify(now)} ${lead} ${at}`);
        }
      }
    }
    expect(shut).toEqual([]);
  });
});

// ── prices ───────────────────────────────────────────────────────────────────

describe("what a piece costs", () => {
  const coasters = PRODUCT_BY_KEY["walnut-coasters"]!;

  it("applies the material and the size as deltas on the base price", () => {
    expect(unitPriceCents(coasters, "walnut", "standard")).toBe(3400);
    expect(unitPriceCents(coasters, "ply", "standard")).toBe(2200); // −$12 in ply
    expect(unitPriceCents(coasters, "walnut", "large")).toBe(4000); // +$6 large
  });

  it("breaks at 4, 8 and 12 and nowhere else", () => {
    expect([...QUANTITY_BREAKS]).toEqual([1, 4, 8, 12]);
    expect(breakFor(1)).toBe(1);
    expect(breakFor(3)).toBe(1);
    expect(breakFor(4)).toBe(4);
    expect(breakFor(7)).toBe(4);
    expect(breakFor(8)).toBe(8);
    expect(breakFor(12)).toBe(12);
    expect(breakFor(20)).toBe(12); // the curve stops at twelve
  });

  it("prices eleven at the eight break rather than at the one-off price", () => {
    // Somebody ordering eleven has done most of the work of ordering eight,
    // and dropping them back to the single price would be a punishment.
    expect(eachPriceCents(3400, 11)).toBe(eachPriceCents(3400, 8));
    expect(eachPriceCents(3400, 11)).toBe(2924);
  });

  it("reproduces the worked figures a shopper sees on the product page", () => {
    expect(eachPriceCents(3400, 1)).toBe(3400); // $34.00 each
    expect(eachPriceCents(3400, 4)).toBe(3128); // $31.28 each
    expect(eachPriceCents(3400, 8)).toBe(2924); // $29.24 each
    expect(eachPriceCents(3400, 12)).toBe(2788); // $27.88 each

    expect(
      lineTotalCents({
        productKey: "walnut-coasters",
        materialKey: "walnut",
        sizeKey: "standard",
        quantity: 12,
      }),
    ).toBe(33456); // $334.56
  });

  it("keeps every price inside prompt K's $9–$68 range", () => {
    for (const product of PRODUCTS) {
      expect({ key: product.key, price: product.basePriceCents }).toEqual({
        key: product.key,
        price: expect.any(Number),
      });
      expect(product.basePriceCents).toBeGreaterThanOrEqual(900);
      expect(product.basePriceCents).toBeLessThanOrEqual(6800);
    }
  });
});

// ── the proof gate ───────────────────────────────────────────────────────────

describe("THE PROOF GATE", () => {
  it("will not let a piece leave To make until the picture is approved", () => {
    const waiting = lineOf(byRef("BR-2278"));
    expect(isLocked(waiting)).toBe(true);

    const result = moveLine(waiting, "making");
    expect(result.ok).toBe(false);
  });

  it("NAMES what is missing, and the two refusals are different sentences", () => {
    // Sent and waiting on a reply is a different problem from never sent, and
    // it needs a different action from the maker, so one message for both
    // would not be good enough.
    const waiting = moveLine(lineOf(byRef("BR-2278")), "making");
    const notSent = moveLine(lineOf(byRef("BR-2280")), "making");

    expect(waiting).toEqual({
      ok: false,
      missing: "proof-not-approved",
      reasonKey: "gate.awaitingApproval",
    });
    expect(notSent).toEqual({
      ok: false,
      missing: "proof-not-sent",
      reasonKey: "gate.noProofSent",
    });
    expect(waiting).not.toEqual(notSent);
  });

  it("never refuses silently — every refusal carries a reason key", () => {
    for (const order of ORDERS) {
      for (const line of order.lines) {
        for (const column of BENCH_COLUMNS) {
          const result = moveLine(line, column);
          if (!result.ok) {
            expect(result.reasonKey.startsWith("gate.")).toBe(true);
            expect(result.missing).toBeTruthy();
          }
        }
      }
    }
  });

  it("lets a piece with nothing written on it straight through", () => {
    // A bare herb pot needs no picture; `not-needed` is not the same fact as
    // "the picture has not been sent yet", and only one of them is a gate.
    const pot = lineOf(byRef("BR-2287"));
    expect(pot.proof).toBe("not-needed");
    expect(isLocked(pot)).toBe(false);
    expect(moveLine({ ...pot, stage: "to-make" }, "making")).toEqual({
      ok: true,
      stage: "making",
    });
  });

  it("opens the moment the customer approves", () => {
    const before = byRef("BR-2278");
    expect(moveLine(lineOf(before), "making").ok).toBe(false);

    const after = approveProof(before, "2026-08-06");
    expect(moveLine(lineOf(after), "making")).toEqual({ ok: true, stage: "making" });
    expect(after.proofs.at(-1)).toEqual({ kind: "approved", at: "2026-08-06" });
  });

  it("moves nothing when a change is asked for with no words in it", () => {
    const before = byRef("BR-2278");
    expect(askForChange(before, "   ", "2026-08-06")).toBe(before);
    const asked = askForChange(before, "  Make the date smaller  ", "2026-08-06");
    expect(asked.proofs.at(-1)).toEqual({
      kind: "change-asked",
      at: "2026-08-06",
      note: "Make the date smaller",
    });
  });

  it("puts a piece into waiting when the maker sends the picture", () => {
    const sent = sendProof(byRef("BR-2280"), "2026-08-06");
    expect(lineOf(sent).proof).toBe("waiting");
    expect(moveLine(lineOf(sent), "making")).toEqual({
      ok: false,
      missing: "proof-not-approved",
      reasonKey: "gate.awaitingApproval",
    });
  });
});

// ── the stage machine ────────────────────────────────────────────────────────

describe("placed → proof_sent → approved → making → finishing → posted", () => {
  it("names the six stages 24 D5b names", () => {
    expect([...ORDER_STAGES]).toEqual([
      "placed",
      "proof_sent",
      "approved",
      "making",
      "finishing",
      "posted",
    ]);
  });

  it("derives the order's stage from its pieces rather than storing it twice", () => {
    expect(orderStage(byRef("BR-2280"))).toBe("placed"); // picture not sent
    expect(orderStage(byRef("BR-2278"))).toBe("proof_sent"); // waiting on a reply
    expect(orderStage(byRef("BR-2281"))).toBe("approved"); // in the queue
    expect(orderStage(byRef("BR-2276"))).toBe("making");
    expect(orderStage(byRef("BR-2277"))).toBe("finishing");
    expect(orderStage(byRef("BR-2260"))).toBe("posted");
  });

  it("walks one order the whole way and posts it", () => {
    let order = byRef("BR-2280");
    expect(orderStage(order)).toBe("placed");

    order = sendProof(order, "2026-08-06");
    expect(orderStage(order)).toBe("proof_sent");

    order = approveProof(order, "2026-08-06");
    expect(orderStage(order)).toBe("approved");

    order = { ...order, lines: order.lines.map((l) => ({ ...l, stage: "making" as const })) };
    expect(orderStage(order)).toBe("making");

    order = { ...order, lines: order.lines.map((l) => ({ ...l, stage: "finishing" as const })) };
    expect(orderStage(order)).toBe("finishing");

    order = markPosted(order, "2026-08-11");
    expect(orderStage(order)).toBe("posted");
    expect(order.postedIso).toBe("2026-08-11");
  });

  it("maps the six stages onto the shopper's five-step strip", () => {
    expect(shopperStageIndex(byRef("BR-2280"))).toBe(0);
    expect(shopperStageIndex(byRef("BR-2278"))).toBe(0);
    expect(shopperStageIndex(byRef("BR-2281"))).toBe(1);
    expect(shopperStageIndex(byRef("BR-2276"))).toBe(2);
    expect(shopperStageIndex(byRef("BR-2277"))).toBe(3);
    expect(shopperStageIndex(byRef("BR-2260"))).toBe(4);
  });
});

describe("spoil and remake", () => {
  const slate: Order = {
    ref: "BR-9001",
    customer: "Test",
    email: "test@example.com",
    placedIso: "2026-08-04",
    lines: [
      {
        id: "L1",
        productKey: "garden-markers",
        materialKey: "slate",
        sizeKey: "standard",
        finishKey: "plain-edge",
        quantity: 1,
        note: "Herbs",
        stage: "making",
        proof: "approved",
        spoiled: 0,
      },
    ],
    proofs: [],
  };

  it("puts the piece back at the start of the queue", () => {
    const after = spoilAndRemake(slate, "L1", 3);
    expect(after.lines[0]!.stage).toBe("to-make");
    expect(after.lines[0]!.spoiled).toBe(3);
  });

  it("takes the material off the shelf a SECOND time", () => {
    // A set of six garden markers is six blanks. Spoil three and the shelf
    // loses nine, because the three that were cut wrong do not come back.
    expect(consumptionForLine(slate.lines[0]!)).toEqual({
      stockKey: "slate-blank",
      unit: "blank",
      amount: 6,
    });
    const after = spoilAndRemake(slate, "L1", 3);
    expect(consumptionForLine(after.lines[0]!)).toEqual({
      stockKey: "slate-blank",
      unit: "blank",
      amount: 9,
    });
  });

  it("leaves the price alone — Birch Row cut it wrong, so Birch Row pays", () => {
    const before = lineTotalCents(slate.lines[0]!);
    const after = spoilAndRemake(slate, "L1", 3);
    expect(lineTotalCents(after.lines[0]!)).toBe(before);
  });

  it("takes another sheet when the spoilage pushes past one", () => {
    const coasters: Order = {
      ...slate,
      lines: [
        {
          ...slate.lines[0]!,
          productKey: "walnut-coasters",
          materialKey: "walnut",
          quantity: 2,
        },
      ],
    };
    expect(consumptionForLine(coasters.lines[0]!)?.amount).toBe(1);
    expect(consumptionForLine(spoilAndRemake(coasters, "L1", 12).lines[0]!)?.amount).toBe(2);
  });

  it("ignores a nonsense number rather than pretending something happened", () => {
    expect(spoilAndRemake(slate, "L1", 0)).toBe(slate);
    expect(spoilAndRemake(slate, "L1", -2)).toBe(slate);
    expect(spoilAndRemake(slate, "L1", Number.NaN)).toBe(slate);
  });
});

// ── materials, and the absence of anything else ──────────────────────────────

describe("THERE IS NO FINISHED-GOODS STOCK ANYWHERE IN THIS APP (criterion 14)", () => {
  /** Anything that would let a screen print "3 left". */
  const FORBIDDEN = [
    "stock",
    "onhand",
    "instock",
    "available",
    "availability",
    "inventory",
    "remaining",
    "left",
    "quantityonhand",
  ];

  it("gives a product no field that could hold a count of finished pieces", () => {
    for (const product of PRODUCTS) {
      const fields = Object.keys(product).map((k) => k.toLowerCase());
      // `footprint.stockKey` is deliberately not a product field — it is what
      // the piece CONSUMES, and it lives one level down for that reason.
      expect({ key: product.key, hits: fields.filter((f) => FORBIDDEN.includes(f)) }).toEqual({
        key: product.key,
        hits: [],
      });
    }
  });

  it("counts every shelf row in a unit of RAW MATERIAL and nothing else", () => {
    const units: StockUnit[] = ["sheet", "blank", "grams", "tub"];
    expect(MATERIAL_STOCK.length).toBeGreaterThan(0);
    for (const row of MATERIAL_STOCK) {
      expect({ key: row.key, ok: units.includes(row.unit) }).toEqual({ key: row.key, ok: true });
    }
    // Prompt K's shelf: four sheet stocks, slate blanks, two filaments, three glazes.
    expect(MATERIAL_STOCK.filter((r) => r.unit === "sheet")).toHaveLength(4);
    expect(MATERIAL_STOCK.filter((r) => r.unit === "blank")).toHaveLength(1);
    expect(MATERIAL_STOCK.filter((r) => r.unit === "grams")).toHaveLength(2);
    expect(MATERIAL_STOCK.filter((r) => r.unit === "tub")).toHaveLength(3);
  });

  it("has no shelf row that names a product, because a shelf row is a material", () => {
    const productKeys = new Set(PRODUCTS.map((p) => p.key));
    for (const row of MATERIAL_STOCK) expect(productKeys.has(row.key)).toBe(false);
  });
});

describe("materials: on hand, committed to the queue, spare", () => {
  const lines = stockLines(MATERIAL_STOCK, ORDERS);
  const row = (key: string) => lines.find((l) => l.key === key)!;

  it("commits only what is still on the bench", () => {
    const committedByOpen = stockLines(MATERIAL_STOCK, ORDERS);
    const committedByPosted = stockLines(MATERIAL_STOCK, PAST_ORDERS);
    // Everything in PAST_ORDERS has gone, so it commits nothing at all: the
    // board it was cut from left the building with the parcel.
    expect(committedByPosted.every((l) => l.committed === 0)).toBe(true);
    expect(committedByOpen.some((l) => l.committed > 0)).toBe(true);
  });

  it("has exactly ONE sheet stock below its reorder point (prompt K)", () => {
    const low = lines.filter((l) => l.unit === "sheet" && l.belowReorder);
    expect(low.map((l) => l.key)).toEqual(["ply-4mm"]);
  });

  it("shows the three numbers the materials screen prints", () => {
    const ply = row("ply-4mm");
    expect(ply.onHand).toBe(7);
    expect(ply.committed).toBe(3); // two coaster orders and a photo block
    expect(ply.spare).toBe(4);
    expect(ply.belowReorder).toBe(true);

    const walnut = row("walnut-3mm");
    expect(walnut.onHand).toBe(18);
    // Seven since BR-2282 became eight sets of coasters rather than one — the
    // change that makes the batch sheet's overflow list reachable in the
    // running demo (`batch.test.ts`). The committed figure moves with the
    // queue, which is the whole point of it.
    expect(walnut.committed).toBe(7);
    expect(walnut.spare).toBe(11);
    expect(walnut.belowReorder).toBe(false);
  });

  it("lets spare go negative and says so rather than clamping to zero", () => {
    const thin = [{ key: "ply-4mm" as const, unit: "sheet" as const, sheetWidthMm: 600, sheetHeightMm: 400, onHand: 1, reorderAt: 8 }];
    expect(stockLines(thin, ORDERS)[0]!.spare).toBe(-2);
  });

  it("adds an order's rows up once per stock rather than once per line", () => {
    const rows = consumptionForOrder(byRef("BR-2279"));
    // Coasters off the walnut sheet, keyrings off the acrylic sheet.
    expect(rows.map((r) => r.stockKey).sort()).toEqual(["acrylic-3mm", "walnut-3mm"]);
  });
});

// ── the bench's counters, and the seed they are counted over ─────────────────

describe("the seeded fiction (prompt K)", () => {
  it("has twelve live orders and sixteen already posted", () => {
    expect(ORDERS).toHaveLength(12);
    expect(PAST_ORDERS).toHaveLength(16);
  });

  it("runs BR-2260 … BR-2287 with the next order taking BR-2288", () => {
    const refs = [...PAST_ORDERS, ...ORDERS].map((o) => o.ref).sort();
    expect(refs[0]).toBe("BR-2260");
    expect(refs.at(-1)).toBe("BR-2287");
    expect(new Set(refs).size).toBe(28);
    expect(NEXT_REF).toBe("BR-2288");
  });

  it("has three orders waiting on a picture, and one of them not sent yet", () => {
    const waiting = ORDERS.filter((o) => o.lines.some(isLocked));
    expect(waiting.map((o) => o.ref)).toEqual(["BR-2278", "BR-2279", "BR-2280"]);
    expect(ORDERS.filter((o) => o.lines.some((l) => l.proof === "not-sent")).map((o) => o.ref)).toEqual([
      "BR-2280",
    ]);
  });

  it("has exactly one late order, and it is late by one studio day", () => {
    const late = ORDERS.filter((o) => shipState(shipByForOrder(o), NOW.iso) === "late");
    expect(late.map((o) => o.ref)).toEqual(["BR-2276"]);
    expect(shipByForOrder(late[0]!)).toBe("2026-08-05");
    expect(studioDaysBetween(NOW.iso, "2026-08-05")).toBe(-1);
  });

  it("has one order due today", () => {
    const due = ORDERS.filter((o) => shipByForOrder(o) === NOW.iso);
    expect(due.map((o) => o.ref)).toEqual(["BR-2277"]);
  });

  it("has six pieces sitting in To make with nothing stopping them", () => {
    const ready = ORDERS.filter((o) =>
      o.lines.some((l) => l.stage === "to-make" && !isLocked(l)),
    );
    expect(ready.map((o) => o.ref)).toEqual([
      "BR-2281",
      "BR-2282",
      "BR-2283",
      "BR-2284",
      "BR-2285",
      "BR-2286",
    ]);
  });

  it("fills all four bench columns", () => {
    const occupied = new Set(ORDERS.flatMap((o) => o.lines.map((l) => l.stage)));
    expect([...occupied].sort()).toEqual(["finishing", "making", "ready-to-post", "to-make"]);
  });

  it("carries two notes long enough to show the counter doing real work", () => {
    const atTheEdge = ORDERS.flatMap((o) => o.lines).filter((l) => {
      const limit = PRODUCT_BY_KEY[l.productKey]?.personalize?.limitChars ?? 0;
      return limit > 0 && limit - l.note.length <= 3;
    });
    expect(atTheEdge.length).toBeGreaterThanOrEqual(2);
  });

  it("never writes a note longer than the piece can take", () => {
    for (const order of [...ORDERS, ...PAST_ORDERS]) {
      for (const line of order.lines) {
        const limit = PRODUCT_BY_KEY[line.productKey]?.personalize?.limitChars ?? 0;
        if (line.note === "") continue;
        expect({ ref: order.ref, over: line.note.length - limit <= 0 }).toEqual({
          ref: order.ref,
          over: true,
        });
      }
    }
  });
});

describe("the bench's counters", () => {
  const kpis = benchKpis(ORDERS, NOW.iso);

  it("counts one due today, one late and three waiting on a customer", () => {
    expect(kpis.dueToday).toBe(1);
    expect(kpis.late).toBe(1);
    expect(kpis.waitingOnCustomer).toBe(3);
  });

  it("counts twelve pieces still in the queue", () => {
    expect(kpis.inQueue).toBe(12);
  });

  it("reads a ship-by chip as ahead, due soon or late", () => {
    expect(shipState("2026-08-20", NOW.iso)).toBe("ahead");
    expect(shipState("2026-08-07", NOW.iso)).toBe("due-soon");
    expect(shipState(NOW.iso, NOW.iso)).toBe("due-soon");
    expect(shipState("2026-08-05", NOW.iso)).toBe("late");
  });
});
