// @vitest-environment jsdom
/**
 * THE PAGES AFTER AN ORDER, AT THE DOOR: what each step asks of Adminium,
 * with the exact body of every write.
 *
 *   - finding an order: nothing is asked until the number and the e-mail
 *     look right; then a code is asked for that address (or, already signed
 *     in as it, the order looked for at once); a code is checked, and the
 *     order the number names is opened among the shopper's own;
 *   - a proof answered: approved, or a change asked for with the shopper's
 *     own words (never an empty one), through the session that opened it;
 *   - an order's own link opened, or said to open nothing;
 *   - Order again: each line back in the basket as it was ordered;
 *   - the two requests: their bodies, field for field;
 *   - the postage page's examples: one dry run of the quickest piece and
 *     the slowest.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { answerProof, askBody, checkCode, findOrder, loadAgain, loadExamples, lookupErrors, openChange, openOrderLink, problemBody, putBack, resendCode, resetAfter, sendAsk, sendProblem, typeAsk, typeChange, typeLookup, typeProblem, useAfter } from "./after.ts";
import { orderView } from "./after-view.ts";
import { resetShop, useShop } from "./store.ts";
import { fakePort, sampleCatalogue, type FakePort } from "./testing.ts";

vi.mock("../../vendor/customiser/index.js", () => ({
  heldDesign: () => null,
  hasSavedDesigns: () => false,
  openSavedLink: async () => "unknown",
  readDesigns: async (_api: unknown, codes: readonly string[]) => codes.map((code) => ({ id: 900, code, base_id: 101, ready_design_id: 5, values: { parts: { ring: { text: "Pinfold" } } }, state: "ordered", updatedAt: null, session: null, files: {} })),
}));

let port: FakePort;
const calls = (name: string) => port.afterFake.calls.filter((c) => c.call === name).map((c) => c.args);

beforeEach(() => {
  vi.useFakeTimers();
  sessionStorage.clear();
  document.documentElement.setAttribute("lang", "en-US");
  port = fakePort();
  resetShop(port);
  resetAfter(null);
  useShop.setState({ catalogue: sampleCatalogue(), config: { timezone: "Europe/London", currency: "GBP" }, loading: "ok", serviceId: 1 });
});
afterEach(() => {
  vi.useRealTimers();
});

describe("finding an order", () => {
  it("says what is wrong with the number and the e-mail before asking anything", async () => {
    expect(lookupErrors({ ref: "", email: "" })).toEqual({ ref: "empty", email: "empty" });
    expect(lookupErrors({ ref: "2276", email: "iris@" })).toEqual({ ref: "shape", email: "shape" });
    expect(lookupErrors({ ref: " br-2276 ", email: " Iris.P@Example.com " })).toEqual({});
    typeLookup("order", { ref: "2276", email: "iris" });
    expect(await findOrder("order")).toBe("fix");
    expect(port.afterFake.calls).toEqual([]);
  });

  it("asks for a code for the address typed, in the page's language, then opens the order the number names", async () => {
    typeLookup("order", { ref: " br-2276", email: " Iris.P@Example.com " });
    expect(await findOrder("order")).toBe("code");
    expect(calls("requestCode")).toEqual([["iris.p@example.com", "en-US"]]);
    expect(useAfter.getState().lookups.order.step).toBe("code");

    typeLookup("order", { digits: "1234" });
    expect(await checkCode("order")).toBe("fix");
    expect(useAfter.getState().lookups.order.codeErr).toBe("short");
    expect(calls("verifyCode")).toEqual([]);

    typeLookup("order", { digits: "111111" });
    expect(await checkCode("order")).toBe("fix");
    expect(useAfter.getState().lookups.order).toMatchObject({ codeErr: "wrong", triesLeft: 4, digits: "" });

    typeLookup("order", { digits: "123456" });
    expect(await checkCode("order")).toBe("open");
    expect(calls("verifyCode").at(-1)).toEqual(["iris.p@example.com", "123456"]);
    const opened = useAfter.getState().opened!;
    expect([opened.via, opened.state, opened.read?.order["number"]]).toEqual(["mine", "ok", "BR-2276"]);
    expect(opened.read!.lines.map((l) => l["id"])).toEqual([761]);
    expect(opened.read!.proofs.map((p) => p["id"])).toEqual([501, 502]);
  });

  it("says a code run out and a path locked for the day as Adminium answers them", async () => {
    typeLookup("order", { ref: "BR-2276", email: "iris.p@example.com" });
    await findOrder("order");
    typeLookup("order", { digits: "999999" });
    await checkCode("order");
    expect(useAfter.getState().lookups.order.codeErr).toBe("spent");
    typeLookup("order", { digits: "000000" });
    await checkCode("order");
    expect(useAfter.getState().lookups.order.codeErr).toBe("locked");
  });

  it("never says whether a number is somebody else's: the same mismatch for any order not the shopper's own", async () => {
    typeLookup("order", { ref: "BR-2288", email: "iris.p@example.com" });
    await findOrder("order");
    typeLookup("order", { digits: "123456" });
    expect(await checkCode("order")).toBe("fix");
    expect(useAfter.getState().lookups.order).toMatchObject({ step: "find", err: "mismatch" });
    expect(useAfter.getState().opened).toBeNull();
  });

  it("looks for the order at once when this tab is already signed in as that address", async () => {
    port.afterFake.session = "iris.p@example.com";
    typeLookup("order", { ref: "BR-2247", email: "iris.p@example.com" });
    expect(await findOrder("order")).toBe("open");
    expect(calls("requestCode")).toEqual([]);
    expect(useAfter.getState().opened?.read?.order["number"]).toBe("BR-2247");
  });

  it("sends a new code only thirty seconds after the last", async () => {
    typeLookup("order", { ref: "BR-2276", email: "iris.p@example.com" });
    await findOrder("order");
    expect(await resendCode("order")).toBe(false);
    await vi.advanceTimersByTimeAsync(30_000);
    expect(await resendCode("order")).toBe(true);
    expect(calls("requestCode")).toHaveLength(2);
    expect(await resendCode("order")).toBe(false);
  });
});

describe("answering a proof", () => {
  async function signedIn(): Promise<void> {
    port.afterFake.session = "iris.p@example.com";
    typeLookup("order", { ref: "BR-2276", email: "iris.p@example.com" });
    await findOrder("order");
  }

  it("keeps a picture as one to draw, and a proof the Customiser made as a PDF as one to open", async () => {
    vi.stubGlobal("URL", Object.assign(URL, { createObjectURL: (blob: Blob) => `blob:${blob.type}`, revokeObjectURL: () => undefined }));
    port.afterFake.picture = new Blob(["%PDF-1.7"], { type: "application/pdf" });
    await signedIn();
    await vi.runAllTimersAsync();
    expect(Object.values(useAfter.getState().pictures)).toEqual([{ url: "blob:application/pdf", pdf: true }]);
    resetAfter(null);
    port.afterFake.picture = new Blob([new Uint8Array([0x89, 0x50])], { type: "image/png" });
    await signedIn();
    await vi.runAllTimersAsync();
    expect(Object.values(useAfter.getState().pictures)).toEqual([{ url: "blob:image/png", pdf: false }]);
    vi.unstubAllGlobals();
  });

  it("approves it through the shopper's own session: the state, and nothing else", async () => {
    await signedIn();
    expect(await answerProof("502", "approved")).toBe("done");
    expect(calls("answerProof")).toEqual([["mine", "502", { state: "approved" }]]);
    expect(useAfter.getState().answered).toBe("approved");
    // Read again: the line's proof is Adminium's answer now.
    expect(useAfter.getState().opened?.read?.lines[0]?.["proof_state"]).toBe("approved");
  });

  it("asks for a change only with a note, and sends the note as the shopper wrote it", async () => {
    await signedIn();
    openChange("502");
    expect(await answerProof("502", "change_asked")).toBe("fix");
    expect(useAfter.getState().change.tried).toBe(true);
    expect(calls("answerProof")).toEqual([]);
    typeChange("  Could the words sit a little lower?  ");
    expect(await answerProof("502", "change_asked")).toBe("done");
    expect(calls("answerProof")).toEqual([["mine", "502", { state: "change_asked", change_note: "Could the words sit a little lower?" }]]);
    expect(useAfter.getState().answered).toBe("changed");
  });

  it("keeps the page as it was when the answer does not reach the studio", async () => {
    await signedIn();
    port.afterFake.refuseNext({ code: "PUBLIC_WRITE_REFUSED", column: "state" });
    expect(await answerProof("502", "approved")).toBe("failed");
    expect(useAfter.getState().answerFailed).toBe(true);
    expect(useAfter.getState().answered).toBeNull();
  });

  it("answers through the order's own link when that opened it", async () => {
    await openOrderLink("LINKCODE0000000A");
    expect(calls("openShared")).toEqual([["LINKCODE0000000A"]]);
    expect(useAfter.getState().opened?.via).toBe("link");
    await answerProof("502", "approved");
    expect(calls("answerProof")).toEqual([["link", "502", { state: "approved" }]]);
  });

  it("says a link that opens nothing, or has stopped, and opens nothing", async () => {
    await openOrderLink("NOSUCHLINK000000");
    expect([useAfter.getState().link, useAfter.getState().opened]).toEqual(["unknown", null]);
    await openOrderLink("STOPPEDLINK00000");
    expect(useAfter.getState().link).toBe("closed");
  });
});

describe("Order again", () => {
  it("puts each line back as it was ordered: the piece, its options, its words, its design and the features it paid for", async () => {
    port.afterFake.session = "iris.p@example.com";
    await loadAgain();
    expect(useAfter.getState().again.orders.map((o) => o["number"])).toEqual(["BR-2276", "BR-2247"]);
    expect(await putBack(76)).toBe(true);
    expect(await putBack(47)).toBe(true);
    const basket = useShop.getState().basket.map(({ id: _id, ...line }) => line);
    expect(basket).toEqual([
      { productId: 2, qty: 2, materialId: 30, sizeId: 31, finishId: 32, lettering: "The Old Mill", design: null, features: [] },
      {
        productId: 1,
        qty: 1,
        materialId: 10,
        sizeId: 12,
        finishId: 14,
        lettering: null,
        design: { id: 900, code: "DSGN-7Q2K-X4PA", base_id: 101, ready_design_id: 5, values: { parts: { ring: { text: "Pinfold" } } }, state: "ordered", updatedAt: null, session: null, files: {} },
        features: [20],
      },
    ]);
    expect(useShop.getState().view).toBe("basket");
  });

  it("refuses words over the piece's limit today, with the sheet, and adds nothing", async () => {
    port.afterFake.session = "iris.p@example.com";
    port.afterFake.rows.lines[0]!["lettering"] = "The Old Mill at Settle, est. 1820";
    await loadAgain();
    expect(await putBack(76)).toBe(false);
    expect(useShop.getState().limitWarn).toBe(true);
    expect(useShop.getState().basket).toEqual([]);
  });
});

describe("the two requests", () => {
  it("writes a request with what was typed, trimmed, and its retry key", async () => {
    expect(await sendAsk()).toBe("fix");
    expect(calls("ask")).toEqual([]);
    typeAsk({ idea: " A sign for the allotment gate ", name: " Bex Thorne ", email: " bex@example.com ", material: "Slate", when: " Before the show in August " });
    const key = useAfter.getState().ask.clientKey;
    expect(await sendAsk()).toBe("sent");
    expect(calls("ask")).toEqual([[{ name: "Bex Thorne", email: "bex@example.com", language: "en-US", idea: "A sign for the allotment gate", material: "Slate", wanted_when: "Before the show in August", client_key: key }]]);
    expect(useAfter.getState().ask.sent?.["ref"]).toBe("ASK-0001");
    expect(askBody({ idea: "x", material: "", when: "", name: "N", email: "n@e.co" }, "k")).toEqual({ name: "N", email: "n@e.co", language: "en-US", idea: "x", client_key: "k" });
  });

  it("names the field Adminium refused, and keeps the form", async () => {
    typeAsk({ idea: "Coasters", name: "Bex", email: "bex@example.com", when: "29/08/2026" });
    port.afterFake.refuseNext({ code: "PUBLIC_WRITE_REFUSED", column: "wanted_when", reason: "plain-text" });
    expect(await sendAsk()).toBe("fix");
    expect(useAfter.getState().ask).toMatchObject({ sent: null, refused: { column: "wanted_when", reason: "plain-text" } });
  });

  it("writes a problem with the order number as typed, for Adminium to find among the address's orders", async () => {
    typeProblem({ ref: " br-2276 ", email: "iris.p@example.com", name: "Iris P.", what: "damaged", details: " One coaster came cracked. " });
    const key = useAfter.getState().problem.clientKey;
    expect(await sendProblem()).toBe("sent");
    expect(calls("report")).toEqual([[{ order_ref: "BR-2276", name: "Iris P.", email: "iris.p@example.com", language: "en-US", what: "damaged", details: "One coaster came cracked.", client_key: key }]]);
    expect(problemBody({ ref: "BR-1", email: "a@b.co", name: "A", what: "mind", details: "d" }, "k")["what"]).toBe("mind");
  });

  it("says an order not found with that address on the number", async () => {
    typeProblem({ ref: "BR-2288", email: "iris.p@example.com", name: "Iris P.", what: "late", details: "Not here yet." });
    port.afterFake.refuseNext({ code: "PUBLIC_WRITE_REFUSED", column: "order_id", reason: "lookup" });
    expect(await sendProblem()).toBe("fix");
    expect(useAfter.getState().problem.refused?.column).toBe("order_id");
  });
});

describe("what Your order shows of an order", () => {
  it("lights each stage by its lines and dates it by its own stamp; a stage not reached has no date", () => {
    const rows = port.afterFake.rows;
    const read = (id: number) => ({ via: "mine" as const, order: rows.orders.find((o) => o["id"] === id)!, lines: rows.lines.filter((l) => l["order_id"] === id), features: [], proofs: rows.proofs.filter((p) => p["order_id"] === id) });
    const waiting = orderView(read(76), sampleCatalogue(), "2026-08-06");
    expect(waiting.stages.map((s) => [s.key, s.done, s.at, s.due])).toEqual([
      ["accepted", true, "2026-08-04T09:12:00Z", false],
      ["proof", false, null, false],
      ["making", false, null, false],
      ["finishing", false, null, false],
      ["posted", false, "2026-08-07", true],
    ]);
    expect(waiting.post).toBe("due");
    expect(waiting.waiting.map((p) => [p.id, p.version, p.productName, p.words])).toEqual([["502", 2, "Birch ply coasters", ["The Old Mill"]]]);
    expect(waiting.log.map((e) => [e.kind, e.version])).toEqual([
      ["sent", 1],
      ["change", 1],
      ["sent", 2],
    ]);
    expect(waiting.lines[0]).toMatchObject({ name: "Birch ply coasters", qty: 2, options: ["Birch ply", "95 mm square", "Left bare"], lettering: "The Old Mill" });
    // Its post-by gone by: overdue.
    expect(orderView(read(76), sampleCatalogue(), "2026-08-08").post).toBe("late");

    // A design's proof added before its picture: nothing to look at, so neither waiting nor said to be sent.
    const bare = { ...read(76), proofs: [...read(76).proofs, { id: 503, order_id: 76, line_id: 761, version: 3, kind: "design", picture: null, state: "sent", note: null, change_note: null, sent_at: "2026-08-06T11:00:00Z", answered_at: null }] };
    expect(orderView(bare, sampleCatalogue(), "2026-08-06").waiting.map((p) => p.id)).toEqual(["502"]);
    expect(orderView(bare, sampleCatalogue(), "2026-08-06").log.filter((e) => e.version === 3)).toEqual([]);
    // …and once it is given its picture, it is.
    const filed = { ...bare, proofs: bare.proofs.map((p) => (p["id"] === 503 ? { ...p, picture: "/api/v1/files/file_01J8Z6Q3M4N5P6R7S8T9V0W1X9/content" } : p)) };
    expect(orderView(filed, sampleCatalogue(), "2026-08-06").waiting.map((p) => p.id)).toEqual(["502", "503"]);

    const posted = orderView(read(47), sampleCatalogue(), "2026-08-06");
    expect(posted.stages.map((s) => [s.key, s.done, s.at])).toEqual([
      ["accepted", true, "2026-07-14T10:00:00Z"],
      ["proof", true, "2026-07-14T18:00:00Z"],
      ["making", true, "2026-07-15T08:00:00Z"],
      ["finishing", true, "2026-07-16T09:00:00Z"],
      ["posted", true, "2026-07-17T15:30:00Z"],
    ]);
    expect([posted.post, posted.dispatch, posted.serviceName]).toEqual(["posted", "posted", "Tracked"]);
  });
});

describe("the postage page's examples", () => {
  it("asks one dry run of the quickest piece and the slowest, each with its first options, on the chosen service", async () => {
    await loadExamples();
    const quote = port.calls.filter((c) => c.call === "quote").at(-1)!;
    expect(quote.body).toEqual({
      values: { service_id: 1, language: "en-US" },
      children: {
        order_lines: [
          { values: { product_id: 1, qty: 1, material_id: 10, size_id: 12, finish_id: 14 } },
          { values: { product_id: 3, qty: 1, material_id: 40, size_id: 41 } },
        ],
      },
    });
    expect(useAfter.getState().extras.examples?.map((l) => l["post_by"])).toEqual(["2026-08-11", "2026-08-13"]);
  });
});
