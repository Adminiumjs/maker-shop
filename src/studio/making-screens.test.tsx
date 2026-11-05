/**
 * @vitest-environment jsdom
 *
 * THE MAKING SCREENS, DRAWN AND USED: machine time, materials and machines,
 * the count, the "Batch these" strip on Today, the batch dialog, the batch
 * sheet and the cut list, in every state a person reaches, each swept by axe
 * (in English and in Arabic, mirrored); and the writes they make, against a
 * stand-in door that records them.
 */
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import axe from "axe-core";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { I18nProvider } from "../i18n/index.tsx";
import { StudioProvider, type StudioEnv } from "./env.tsx";
import { StudioApp } from "./StudioApp.tsx";
import { useStudio, type View } from "./store.ts";
import { FakeDoor } from "./testing/fakeDoor.ts";
import { ApiError } from "./wire.ts";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

let root: Root | null = null;
let host: HTMLElement;
const INITIAL = useStudio.getState();

beforeEach(() => {
  useStudio.setState({ ...INITIAL, toasts: [], overlay: null, data: null, failure: null, takenOff: {}, countDraft: {}, cutKey: null, sheetKey: null });
  host = document.createElement("div");
  document.body.replaceChildren(host);
  localStorage.clear();
});

afterEach(() => {
  act(() => root?.unmount());
  root = null;
});

const draw = async () => new Blob([new Uint8Array([0x89, 0x50, 0x4e, 0x47])], { type: "image/png" });

async function mount(door: FakeDoor, view: View = "today", more: Partial<ReturnType<typeof useStudio.getState>> = {}): Promise<void> {
  const env: StudioEnv = { door, draw };
  useStudio.setState({ data: await door.load(), view, ...more });
  await act(async () => {
    root = createRoot(host);
    root.render(
      <I18nProvider>
        <StudioProvider env={env}>
          <StudioApp />
        </StudioProvider>
      </I18nProvider>,
    );
  });
  await settle();
}

async function settle(): Promise<void> {
  for (let i = 0; i < 6; i += 1) await act(async () => new Promise((resolve) => setTimeout(resolve, 0)));
}

async function click(el: Element | null | undefined): Promise<void> {
  if (el === null || el === undefined) throw new Error("nothing to click");
  await act(async () => {
    (el as HTMLElement).dispatchEvent(new MouseEvent("click", { bubbles: true }));
  });
  await settle();
}

async function type(el: Element | null | undefined, value: string): Promise<void> {
  if (el === null || el === undefined) throw new Error("nothing to type into");
  const input = el as HTMLInputElement;
  const setter = Object.getOwnPropertyDescriptor(Object.getPrototypeOf(input), "value")!.set!;
  await act(async () => {
    setter.call(input, value);
    input.dispatchEvent(new Event("input", { bubbles: true }));
  });
  await settle();
}

const button = (name: string | RegExp): HTMLElement | undefined =>
  [...document.querySelectorAll<HTMLElement>("button, [role=button]")].find((b) => {
    const said = [(b.textContent ?? "").trim(), b.getAttribute("aria-label") ?? ""];
    return typeof name === "string" ? said.includes(name) : said.some((s) => name.test(s));
  });
const text = () => document.body.textContent ?? "";
const toasts = () => useStudio.getState().toasts.map((t) => t.text);

async function sweep(label: string): Promise<void> {
  const result = await axe.run(document.body, {
    runOnly: { type: "tag", values: ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"] },
    rules: { "color-contrast": { enabled: false } },
  });
  expect(result.violations.map((v) => `${label}: ${v.id} — ${v.nodes.map((n) => n.target.join(" ")).join(", ")}`)).toEqual([]);
}

describe("every making screen and state, swept by axe", () => {
  const states: [string, View, Partial<ReturnType<typeof useStudio.getState>>, string][] = [
    ["machine time", "machines", {}, "Machine time"],
    ["materials and machines", "materials", {}, "Committed means a queued piece already has its name on it."],
    ["the count", "stockcount", {}, "Count the shelf"],
    ["the count, typed", "stockcount", { countDraft: { "1": "12", "2": "5" } }, "1 line does not match the book."],
    ["today with sheets to batch", "today", {}, "Batch these"],
    ["the batch dialog", "today", { overlay: { kind: "batch", key: "1" } }, "Start the batch"],
    ["the batch dialog with a piece taken off", "today", { overlay: { kind: "batch", key: "1" }, takenOff: { "171/0": true } }, "Taken off"],
    ["the batch sheet", "batch", {}, "Change what's on the sheet"],
    ["the cut list", "cutlist", {}, "Print it for the bench"],
    ["the cut list of a batch started", "cutlist", { cutKey: "batch-1" }, "The Pughs"],
  ];
  for (const [label, view, more, expected] of states) {
    it(label, async () => {
      await mount(new FakeDoor(), view, more);
      expect(text()).toContain(expected);
      await sweep(label);
    });
  }

  it("the batch sheet and Today with nothing to batch", async () => {
    const door = new FakeDoor();
    for (const line of door.data.lines) if (line["stage"] === "make") line["proof_ok"] = 0;
    await mount(door, "batch");
    expect(text()).toContain("Nothing to batch");
    await sweep("batch sheet, empty");
    act(() => root?.unmount());
    root = null;
    await mount(door, "today");
    expect(text()).toContain("Nothing left to gang up");
    await sweep("today, nothing to batch");
  });

  it("the cut list with nothing queued", async () => {
    const door = new FakeDoor();
    for (const line of door.data.lines) if (line["stage"] === "make") line["proof_ok"] = 0;
    await mount(door, "cutlist");
    expect(text()).toContain("Nothing is queued for a sheet.");
    await sweep("cut list, empty");
  });

  it("in Arabic, mirrored, each screen", async () => {
    localStorage.setItem("maker-shop-locale", "ar-EG");
    for (const view of ["machines", "materials", "stockcount", "batch", "cutlist"] as View[]) {
      await mount(new FakeDoor(), view);
      expect(document.documentElement.getAttribute("dir")).toBe("rtl");
      await sweep(`${view} in Arabic`);
      act(() => root?.unmount());
      root = null;
    }
  });
});

describe("machine time", () => {
  it("draws today's bookings on each machine from nine to six, with the batch's orders and the moment now", async () => {
    await mount(new FakeDoor(), "machines");
    const laser = [...document.querySelectorAll("article")].find((a) => a.getAttribute("aria-label") === "The laser")!;
    const blocks = [...laser.querySelectorAll(".mk-block")];
    expect(blocks.map((b) => b.className)).toEqual(["mk-block mk-at-0 mk-span-92", "mk-block mk-at-92 mk-span-6 mk-block--upkeep"]);
    expect(blocks[0]!.textContent).toContain("09:00–16:40 BR-2268");
    expect(laser.querySelector(".mk-now")!.className).toContain("mk-at-92");
    expect(laser.textContent).toContain("7h 40m booked");
    // The printer has nothing on it today, and says so without the word the release sweep refuses.
    const printer = [...document.querySelectorAll("article")].find((a) => a.getAttribute("aria-label") === "Printer A")!;
    expect(printer.textContent).toContain("Nothing booked all day.");
    expect(text()).toContain("Thu, Aug 6 · 16h 40m booked");
  });
});

describe("materials and machines", () => {
  it("reads the shelf as Adminium keeps it, marks what is low, and says when it was last counted", async () => {
    await mount(new FakeDoor(), "materials");
    expect(text()).toContain("Counted Tue, Aug 4 · 2 lines, 1 different from the book");
    const ply = [...document.querySelectorAll(".mk-stock-row")].find((r) => r.textContent?.includes("Birch ply, 3 mm"))!;
    expect(ply.className).toContain("mk-stock-row--low");
    expect(ply.textContent).toContain("Below the reorder point of 6 sheets");
    const walnut = [...document.querySelectorAll(".mk-stock-row")].find((r) => r.textContent?.includes("Walnut, 6 mm"))!;
    expect(walnut.className).not.toContain("--low");
    // The kiln is firing until six; the laser's lens is being cleaned (upkeep), so it stands idle with nothing queued.
    const rows = [...document.querySelectorAll(".mk-mrow")].map((r) => r.textContent);
    expect(rows.find((r) => r?.includes("The kiln"))).toContain("firing");
    expect(rows.find((r) => r?.includes("The kiln"))).toContain("18:00 today");
    expect(rows.find((r) => r?.includes("The laser"))).toContain("idle");
    await click(button("Count the shelf"));
    expect(useStudio.getState().view).toBe("stockcount");
  });

  it("shows a maker no count button without the right to record one", async () => {
    const door = new FakeDoor({ roles: ["maker"] });
    door.who().can = (table, action) => !(table === "stock_movements" && action === "create");
    await mount(door, "materials");
    expect(button("Count the shelf")).toBeUndefined();
  });
});

describe("the count", () => {
  it("saves a count of each material typed, then shows the shelf", async () => {
    const door = new FakeDoor();
    await mount(door, "stockcount");
    await type(document.querySelector('input[aria-label="Counted, Walnut, 6 mm"]'), "13");
    await click(button("Same as the book, Birch ply, 3 mm"));
    expect(text()).toContain("1 line does not match the book.");
    expect(text()).toContain("-1");
    await click(button("Save the count"));
    expect(door.calls.filter((c) => c.method === "count").map((c) => c.args)).toEqual([
      { materialId: 1, counted: 13 },
      { materialId: 2, counted: 5 },
    ]);
    expect(toasts()).toContain("Count saved for 2 lines.");
    expect(useStudio.getState().view).toBe("materials");
  });

  it("asks for a count before saving one, and lets the count go", async () => {
    const door = new FakeDoor();
    await mount(door, "stockcount");
    await click(button("Save the count"));
    expect(toasts()).toContain("Put in at least one count first.");
    expect(door.calls).toEqual([]);
    await click(button("Leave it"));
    expect(useStudio.getState().view).toBe("materials");
  });
});

describe("batches", () => {
  it("lists the sheets to batch on Today and opens one", async () => {
    await mount(new FakeDoor());
    expect(text()).toContain("6 pieces · walnut, 6 mm · laser");
    expect(text()).toContain("2 orders · 400 × 300 mm sheet");
    await click(button(/6 pieces · walnut/));
    expect(useStudio.getState().overlay).toEqual({ kind: "batch", key: "1" });
    expect(text()).toContain("400 × 300 mm sheet · Walnut, 6 mm");
    expect(text()).toContain("1 sheet off the shelf · 12 to use");
  });

  it("takes a piece off the sheet and puts it back", async () => {
    await mount(new FakeDoor(), "today", { overlay: { kind: "batch", key: "1" } });
    expect(document.querySelectorAll(".mk-piece--drop")).toHaveLength(6);
    await click(button("Take BR-2282 off the sheet"));
    expect(document.querySelectorAll(".mk-piece--drop")).toHaveLength(5);
    expect(text()).toContain("Taken off");
    await click(button("Put BR-2282 back on the sheet"));
    expect(document.querySelectorAll(".mk-piece--drop")).toHaveLength(6);
  });

  it("starts the batch: the batch with its booking and its sheets, the lines to making", async () => {
    const door = new FakeDoor();
    await mount(door, "today", { overlay: { kind: "batch", key: "1" } });
    await click(button("Start the batch"));
    expect(door.trail()).toEqual(["createBatch 1", "moveBatch 5001 planned→running", "moveLine 121 make→making", "moveLine 171 make→making", "moveOrder 12 placed→making", "moveOrder 17 placed→making"]);
    expect(door.calls[0]!.args["label"]).toBe("Walnut sheet · 6 pieces");
    expect(toasts()).toContain("6 pieces from 2 orders are on the laser. 1 sheet of walnut, 6 mm off the shelf.");
    expect(useStudio.getState().overlay).toBeNull();
    // The sheet is on the machine: nothing is left to batch.
    expect(text()).toContain("Nothing left to gang up");
  });

  it("says the machine is booked then when Adminium refuses the time, and writes nothing else", async () => {
    const door = new FakeDoor();
    // As Adminium refuses the batch's whole write: the booking below it named.
    door.refuse("createBatch", new ApiError(409, "BOOKING_TAKEN", "Taken.", { relation: "machine_bookings", row: 0 }));
    await mount(door, "today", { overlay: { kind: "batch", key: "1" } });
    await click(button("Start the batch"));
    expect(door.trail()).toEqual(["createBatch 1"]);
    expect(toasts()).toContain("The laser is booked then. Look at its time, and start the batch after that booking.");
  });

  it("starts a sheet from the batch sheet page, and changes what is on it in the dialog", async () => {
    const door = new FakeDoor();
    await mount(door, "batch");
    expect(document.querySelector('[role="tab"][aria-selected="true"]')?.textContent).toContain("6 pieces · walnut, 6 mm · laser");
    await click(button("Change what's on the sheet"));
    expect(useStudio.getState().overlay).toEqual({ kind: "batch", key: "1" });
    await click(button("Take BR-2281 off the sheet"));
    await click(button("Close"));
    await click(button("Start the batch"));
    expect(door.calls[0]!.args["label"]).toBe("Walnut sheet · 5 pieces");
  });

  it("refuses a sheet with nothing on it before any write", async () => {
    const door = new FakeDoor();
    await mount(door, "today", { overlay: { kind: "batch", key: "1" }, takenOff: Object.fromEntries(["121/0", "121/1", "121/2", "121/3", "171/0", "171/1"].map((k) => [k, true])) });
    await click(button("Start the batch"));
    expect(door.calls).toEqual([]);
    expect(toasts()).toContain("Nothing is on the sheet yet.");
  });

  it("sends a piece too big for the sheet to the next one", async () => {
    const door = new FakeDoor();
    // The wedding sign, approved: 420 × 300 mm does not fit a 400 × 300 sheet.
    Object.assign(door.data.lines.find((l) => l.id === 101)!, { proof_state: "approved", proof_ok: 1 });
    await mount(door, "today", { overlay: { kind: "batch", key: "2" } });
    expect(text()).toContain("Next sheet");
    expect(text()).toContain("420 × 300 mm");
    await sweep("a sheet whose piece does not fit");
  });
});

describe("the cut list", () => {
  it("lists each order's pieces with their words, the machine's settings, and prints", async () => {
    await mount(new FakeDoor(), "cutlist");
    expect(text()).toContain("Thursday, August 6, 2026");
    expect(text()).toContain("400 × 300 mm · Walnut, 6 mm");
    expect(text()).toContain("Fern & Robin — 12.09.2026");
    expect(text()).toContain("Read slowly");
    expect(text()).toContain("The laser · 60 W");
    expect(text()).toContain("18 mm/s at 78% power, one pass");
    expect(text()).toContain("of the sheet · 6 of 6 pieces");
    await click(button("Back to the bench"));
    expect(useStudio.getState().view).toBe("today");
  });

  it("names a design's files for the machine, from the Customiser's version", async () => {
    const door = new FakeDoor();
    door.data.lines.find((l) => l.id === 161)!["batch_id"] = 1;
    await mount(door, "cutlist", { cutKey: "batch-1" });
    expect(text()).toContain("The Pinfold · 2019");
    const link = [...document.querySelectorAll("a")].find((a) => a.textContent === "BR-2290 coasters.svg")!;
    expect(link.getAttribute("href")).toBe("/api/v1/files/file_01J8Z6Q3M4N5P6R7S8T9V0W1XC/content");
  });

  it("prints the pieces' labels through Barcode labels, a sheet a line", async () => {
    const door = new FakeDoor({ facts: { addOns: ["customiser", "barcode-labels"] } });
    await mount(door, "cutlist");
    await click(button("Piece labels"));
    expect(door.calls.filter((c) => c.method === "render").map((c) => c.args)).toEqual([
      { kind: "label-sheet", ref: "order_lines", pk: 121 },
      { kind: "label-sheet", ref: "order_lines", pk: 171 },
    ]);
    expect([...document.querySelectorAll("a")].map((a) => a.textContent)).toEqual(expect.arrayContaining(["BR-2281", "BR-2282"]));
    await sweep("cut list with labels");
  });

  it("offers no labels without Barcode labels", async () => {
    await mount(new FakeDoor(), "cutlist");
    expect(button("Piece labels")).toBeUndefined();
  });

  it("lays the sheet out from the other edge in Arabic", async () => {
    localStorage.setItem("maker-shop-locale", "ar-EG");
    await mount(new FakeDoor(), "cutlist");
    const xs = [...document.querySelectorAll(".mk-sheet rect")].map((r) => Number(r.getAttribute("x")));
    // The first piece sits against the start edge, which in Arabic is the right: 400 − 5 − 95.
    expect(xs[0]).toBe(300);
  });
});
