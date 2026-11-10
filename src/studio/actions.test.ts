/**
 * THE STUDIO'S WRITES AS A PERSON MAKES THEM: the steps a line takes along
 * the bench, its order following it, the proof's gate refusing a move before
 * any write, a proof sent (the one before superseded), a spoil, the post.
 */
import { describe, expect, it } from "vitest";

import { HeldByProof, moveLine, moveOrderLines, postOrders, sendProofs, spoil } from "./actions.ts";
import { lockOf, pathOf, postRun, proofQueue, kpis, fileIdOf } from "./facts.ts";
import { FakeDoor } from "./testing/fakeDoor.ts";
import { DESIGN_PROOF } from "./testing/fixture.ts";
import { ApiError, dayOf, type Row } from "./wire.ts";

const png = async () => new Blob([new Uint8Array([0x89, 0x50, 0x4e, 0x47])], { type: "image/png" });
const line = (door: FakeDoor, id: number): Row => door.data.lines.find((l) => l.id === id)!;
const order = (door: FakeDoor, id: number): Row => door.data.orders.find((o) => o.id === id)!;

describe("a line along the bench", () => {
  it("takes the steps the stages allow, and its order starts making with it", async () => {
    const door = new FakeDoor();
    await moveLine(door, door.data, line(door, 121), "finishing");
    expect(door.trail()).toEqual(["moveLine 121 make→making", "moveLine 121 making→finishing", "moveOrder 12 placed→making"]);
  });

  it("refuses to take a line past make while its proof waits, and writes nothing", async () => {
    const door = new FakeDoor();
    const error = await moveLine(door, door.data, line(door, 101), "making").catch((e: unknown) => e);
    expect(error).toBeInstanceOf(HeldByProof);
    expect((error as HeldByProof).lock).toBe("waiting");
    expect(door.calls).toEqual([]);
    const unsent = await moveLine(door, door.data, line(door, 111), "ready").catch((e: unknown) => e);
    expect((unsent as HeldByProof).lock).toBe("unsent");
    expect(door.calls).toEqual([]);
  });

  it("readies the order when its last live line is ready, through making", async () => {
    const door = new FakeDoor();
    await moveLine(door, door.data, line(door, 131), "ready");
    expect(door.trail()).toEqual(["moveLine 131 finishing→ready", "moveOrder 13 making→ready"]);
  });

  it("takes a ready order back to making when one of its lines goes back to make", async () => {
    const door = new FakeDoor();
    await moveLine(door, door.data, line(door, 141), "make");
    expect(door.trail()).toEqual(["moveLine 141 ready→make", "moveOrder 14 ready→making"]);
  });

  it("goes back through make to reach making from finishing", () => {
    expect(pathOf("finishing", "making")).toEqual(["make", "making"]);
    expect(pathOf("make", "ready")).toEqual(["making", "ready"]);
    expect(pathOf("posted", "make")).toBeNull();
  });
});

describe("an order's pieces marked made or ready", () => {
  it("moves each piece that can go, counts the ones their proof holds, and the order follows", async () => {
    const door = new FakeDoor();
    // BR-2268: the mug finishing, the coasters ready.
    const ready = await moveOrderLines(door, door.data, order(door, 13), "ready", ["make", "making", "finishing"]);
    expect(ready).toEqual({ moved: 1, held: 0 });
    expect(door.trail()).toEqual(["moveLine 131 finishing→ready", "moveOrder 13 making→ready"]);
  });

  it("holds a piece whose proof waits and moves nothing", async () => {
    const door = new FakeDoor();
    expect(await moveOrderLines(door, door.data, order(door, 10), "finishing", ["make", "making"])).toEqual({ moved: 0, held: 1 });
    expect(door.calls).toEqual([]);
  });
});

describe("a proof sent", () => {
  it("draws the words of a lettered line, sends it, and leaves the order's other lines", async () => {
    const door = new FakeDoor();
    const { sent, missing } = await sendProofs(door, door.data, order(door, 11), png);
    expect(missing).toEqual([]);
    expect(sent).toHaveLength(1);
    expect(door.calls).toEqual([{ method: "sendProof", args: { order: 11, line: 111, kind: "lettering", picture: { filename: "proof-line-111.png", type: "image/png" }, designVersionId: null, note: null } }]);
  });

  // Adminium answers the proof still out in the proof's own write (`states.supersedes`): the screen moves nothing.
  it("sends the next proof and moves no proof itself: the one still waiting is Adminium's to answer", async () => {
    const door = new FakeDoor();
    await sendProofs(door, door.data, order(door, 10), png);
    expect(door.trail()).toEqual(["sendProof 101"]);
    expect(door.data.proofs.find((p) => p.id === 1001)!["state"]).toBe("superseded");
  });

  it("leaves the proof still waiting as it was when the next is refused", async () => {
    const door = new FakeDoor();
    door.refuse("sendProof", new ApiError(415, "UNSUPPORTED_MEDIA_TYPE", "Not a picture."));
    await expect(sendProofs(door, door.data, order(door, 10), png)).rejects.toMatchObject({ code: "UNSUPPORTED_MEDIA_TYPE" });
    expect(door.trail()).toEqual(["sendProof 101"]);
    expect(door.data.proofs.find((p) => p.id === 1001)!["state"]).toBe("sent");
  });

  it("sends a design's proof as the Customiser made it, a copy of its version's file", async () => {
    const door = new FakeDoor();
    expect(fileIdOf(DESIGN_PROOF)).toBe("file_01J8Z6Q3M4N5P6R7S8T9V0W1XA");
    await sendProofs(door, door.data, order(door, 16), png);
    expect(door.calls).toEqual([{ method: "sendProof", args: { order: 16, line: 161, kind: "design", picture: { copyOf: "file_01J8Z6Q3M4N5P6R7S8T9V0W1XA" }, designVersionId: 30, note: null } }]);
  });

  it("sends a PDF the maker chose as it is, for a lettered line and for a design whose proof is not made", async () => {
    const door = new FakeDoor();
    door.data.versions[0]!["proof_file"] = null;
    const pdf = { blob: new Blob(["%PDF-1.7"], { type: "application/pdf" }), filename: "mill-house-proof.pdf" };
    const { sent, missing } = await sendProofs(door, door.data, order(door, 16), png, null, (l) => (l.id === 161 ? pdf : null));
    expect([sent.length, missing.length]).toEqual([1, 0]);
    expect(door.calls).toEqual([{ method: "sendProof", args: { order: 16, line: 161, kind: "design", picture: { filename: "mill-house-proof.pdf", type: "application/pdf" }, designVersionId: 30, note: null } }]);
    const lettered = new FakeDoor();
    await sendProofs(lettered, lettered.data, order(lettered, 11), png, null, () => pdf);
    expect(lettered.calls[0]).toEqual({ method: "sendProof", args: { order: 11, line: 111, kind: "lettering", picture: { filename: "mill-house-proof.pdf", type: "application/pdf" }, designVersionId: null, note: null } });
  });

  it("names a design whose proof is not made yet, and sends nothing for it", async () => {
    const door = new FakeDoor();
    door.data.versions[0]!["proof_file"] = null;
    const { sent, missing } = await sendProofs(door, door.data, order(door, 16), png);
    expect(sent).toEqual([]);
    expect(missing.map((l) => l.id)).toEqual([161]);
    expect(door.calls).toEqual([]);
  });
});

describe("a spoil", () => {
  it("takes the spoiled units off the line's own material, counts them, and queues the piece again", async () => {
    const door = new FakeDoor();
    await spoil(door, door.data, line(door, 132), 1);
    expect(door.calls.map((c) => [c.method, c.args])).toEqual([
      ["spoil", { line: 132, materialId: 1, units: 1, note: null }],
      ["updateLine", { id: 132, values: { spoiled: 1 } }],
      ["moveLine", { id: 132, from: "ready", to: "make", values: {} }],
    ]);
  });

  it("counts a spoil on a piece still to make without moving it", async () => {
    const door = new FakeDoor();
    await spoil(door, door.data, line(door, 121), 2);
    expect(door.trail()).toEqual(["spoil 121", "updateLine 121"]);
  });
});

describe("the post office run", () => {
  it("lists the orders whose live lines are all ready", () => {
    const door = new FakeDoor();
    expect(postRun(door.data).map((o) => o["number"])).toEqual(["BR-2271"]);
  });

  it("posts each ready line, then the order with its tracking number when DHL carried it", async () => {
    const door = new FakeDoor();
    await postOrders(door, door.data, [order(door, 14)], { "14": " 00 3400 1234 5678 9012 " });
    expect(door.calls.map((c) => [c.method, c.args])).toEqual([
      ["moveLine", { id: 141, from: "ready", to: "posted", values: {} }],
      ["moveOrder", { id: 14, from: "ready", to: "posted", values: { tracking: "00 3400 1234 5678 9012" } }],
    ]);
  });

  it("posts with no tracking number when none was given", async () => {
    const door = new FakeDoor();
    await postOrders(door, door.data, [order(door, 14)]);
    expect(door.calls.at(-1)).toEqual({ method: "moveOrder", args: { id: 14, from: "ready", to: "posted", values: {} } });
  });
});

describe("what the screens read off the rows", () => {
  it("holds a lettered line by its proof as Adminium says it", () => {
    const door = new FakeDoor();
    expect([101, 111, 121, 141, 161].map((id) => lockOf(line(door, id)))).toEqual(["waiting", "unsent", null, null, "unsent"]);
  });

  it("sorts proofs into waiting on a customer and still to send", () => {
    const door = new FakeDoor();
    const { waiting, unsent } = proofQueue(door.data);
    expect(waiting.map((i) => i.order["number"])).toEqual(["BR-2276"]);
    expect(unsent.map((i) => i.order["number"])).toEqual(["BR-2287", "BR-2290"]);
  });

  it("counts today's pieces due and late, orders waiting, and today's machine time", () => {
    const door = new FakeDoor();
    // Late: the two mugs still finishing and the coasters made and waiting by the door, all past Wednesday's post-by.
    expect(kpis(door.data, "2026-08-06", "Europe/London")).toEqual({ due: 1, waiting: 1, late: 3, bookedMinutes: 1000 });
  });

  it("counts a piece made but not posted by its post-by as late, as its card says", () => {
    const door = new FakeDoor();
    const ready = line(door, 132);
    expect([ready["stage"], dayOf(ready["post_by"])]).toEqual(["ready", "2026-08-05"]);
    expect(kpis(door.data, "2026-08-06", "Europe/London").late).toBe(3);
    // Posted, it is late no more.
    door.data.lines = door.data.lines.map((l) => (l.id === 132 ? { ...l, stage: "posted" } : l));
    expect(kpis(door.data, "2026-08-06", "Europe/London").late).toBe(2);
  });

  it("books today the part of a run that falls in it, a firing past midnight on both days", () => {
    const door = new FakeDoor();
    door.data.bookings = [
      // 22:00 on Wednesday to 02:30 on Thursday, in Settle (British Summer Time).
      { id: 9, machine_id: 3, kind: "run", label: "Overnight firing", batch_id: null, starts_at: "2026-08-05T21:00:00.000Z", ends_at: "2026-08-06T01:30:00.000Z" },
      // 23:00 on Thursday to 01:00 on Friday.
      { id: 10, machine_id: 3, kind: "run", label: "Late firing", batch_id: null, starts_at: "2026-08-06T22:00:00.000Z", ends_at: "2026-08-07T00:00:00.000Z" },
    ];
    expect(kpis(door.data, "2026-08-05", "Europe/London").bookedMinutes).toBe(120);
    expect(kpis(door.data, "2026-08-06", "Europe/London").bookedMinutes).toBe(150 + 60);
    expect(kpis(door.data, "2026-08-07", "Europe/London").bookedMinutes).toBe(60);
  });
});
