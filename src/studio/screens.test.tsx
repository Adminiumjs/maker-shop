/**
 * @vitest-environment jsdom
 *
 * THE STUDIO'S SCREENS, DRAWN AND USED: every screen and every state a person
 * reaches (the board and a card's menu, an order, the proof sheet, a spoil,
 * the lists, a customer, a product and its refusals, the 404, the shell's
 * loading and failure), each swept by axe; and the writes the screens make,
 * against a stand-in door that records them.
 */
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import axe from "axe-core";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { I18nProvider } from "../i18n/index.tsx";
import { StudioProvider, type StudioEnv } from "./env.tsx";
import { StudioApp, screensFor } from "./StudioApp.tsx";
import { useStudio, type View } from "./store.ts";
import { FakeDoor } from "./testing/fakeDoor.ts";
import { ApiError } from "./wire.ts";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

let root: Root | null = null;
let host: HTMLElement;

const INITIAL = useStudio.getState();

beforeEach(() => {
  useStudio.setState({ ...INITIAL, toasts: [], overlay: null, data: null, failure: null });
  host = document.createElement("div");
  document.body.replaceChildren(host);
  localStorage.clear();
});

afterEach(() => {
  act(() => root?.unmount());
  root = null;
});

/** A drawn proof picture: what the browser's canvas would hand back. */
const draw = async () => new Blob([new Uint8Array([0x89, 0x50, 0x4e, 0x47])], { type: "image/png" });

async function mount(door: FakeDoor, view: View = "today", more: Partial<ReturnType<typeof useStudio.getState>> = {}): Promise<void> {
  const env: StudioEnv = { door, draw, recordHref: (page, id) => `/p/${page}/r/${String(id)}` };
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

/** Let effects, the door's promises and the reload after a write run. */
async function settle(): Promise<void> {
  for (let i = 0; i < 5; i += 1) await act(async () => new Promise((resolve) => setTimeout(resolve, 0)));
}

async function click(el: Element | null | undefined): Promise<void> {
  if (el === null || el === undefined) throw new Error("nothing to click");
  await act(async () => {
    (el as HTMLElement).click();
  });
  await settle();
}

async function type(el: Element | null, value: string): Promise<void> {
  if (el === null) throw new Error("nothing to type into");
  const input = el as HTMLInputElement;
  const setter = Object.getOwnPropertyDescriptor(Object.getPrototypeOf(input), "value")!.set!;
  await act(async () => {
    setter.call(input, value);
    input.dispatchEvent(new Event("input", { bubbles: true }));
  });
  await settle();
}

const button = (name: string | RegExp): HTMLButtonElement | undefined =>
  [...document.querySelectorAll("button")].find((b) => (typeof name === "string" ? (b.textContent ?? "").trim() === name || b.getAttribute("aria-label") === name : name.test(b.textContent ?? "") || name.test(b.getAttribute("aria-label") ?? ""))) as HTMLButtonElement | undefined;

const text = () => document.body.textContent ?? "";
const toasts = () => useStudio.getState().toasts.map((t) => t.text);

/** axe over the whole page: WCAG A and AA, the rules jsdom can judge (no layout, so no contrast). */
async function sweep(label: string): Promise<void> {
  const result = await axe.run(document.body, {
    runOnly: { type: "tag", values: ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"] },
    rules: { "color-contrast": { enabled: false } },
  });
  expect(result.violations.map((v) => `${label}: ${v.id} — ${v.nodes.map((n) => n.target.join(" ")).join(", ")}`)).toEqual([]);
}

describe("every screen and state, swept by axe", () => {
  const states: [string, View, Partial<ReturnType<typeof useStudio.getState>>, string][] = [
    ["today", "today", {}, "pieces due today"],
    ["an order waiting on its proof", "order", { orderId: 10 }, "BR-2276"],
    ["an order with a customer's design", "order", { orderId: 16 }, "Make the proof"],
    ["a posted order", "order", { orderId: 15 }, "Posted"],
    ["an order not there", "order", { orderId: 999 }, "That order isn't on the bench."],
    ["the orders", "orders", {}, "BR-2276"],
    ["the orders waiting on a customer", "orders", { orderFilter: "proof" }, "BR-2276"],
    ["the late orders", "orders", { orderFilter: "late" }, "BR-2268"],
    ["no order due today but one", "orders", { orderFilter: "today" }, "BR-2281"],
    ["the orders ready to post", "orders", { orderFilter: "ready" }, "BR-2271"],
    ["the proofs", "proofs", {}, "Sent, waiting on a reply"],
    ["the post office run", "post", {}, "BR-2271"],
    ["the customers", "customers", {}, "charged in all"],
    ["one customer", "customers", { customerId: 1 }, "iris.p@mail.example"],
    ["the products", "products", {}, "Engraved walnut coasters"],
    ["one product", "product", { productId: 2 }, "Personalization"],
    ["a product set up for the Customiser", "product", { productId: 1 }, "Set up for the Customiser"],
    ["a product not there", "product", { productId: 999 }, "That product isn't in the shop."],
    ["the 404", "notfound", {}, "Nothing on this bench"],
  ];
  for (const [label, view, more, expected] of states) {
    it(label, async () => {
      await mount(new FakeDoor(), view, more);
      expect(text()).toContain(expected);
      await sweep(label);
    });
  }

  it("a card's menu open", async () => {
    await mount(new FakeDoor());
    await click(button("More for BR-2281"));
    expect(document.querySelector('[role="menu"]')).not.toBeNull();
    await sweep("menu");
  });

  it("the proof sheet, a lettered piece drawn", async () => {
    await mount(new FakeDoor(), "order", { orderId: 11 });
    await click(button("Send a proof"));
    expect(document.querySelector('[role="dialog"]')?.textContent).toContain("The picture that goes to Bex T. for BR-2287.");
    await sweep("proof sheet");
  });

  it("the proof sheet, a design whose proof is not made", async () => {
    const door = new FakeDoor();
    door.data.versions[0]!["proof_file"] = null;
    await mount(door, "order", { orderId: 16 });
    await click(button("Send a proof"));
    expect(document.querySelector('[role="dialog"]')?.textContent).toContain("The proof of this design is not made yet.");
    await sweep("proof sheet, not made");
  });

  it("the spoil dialog, and its refusal of nothing", async () => {
    await mount(new FakeDoor(), "order", { orderId: 12 });
    await click(button("Spoiled — remake it"));
    await type(document.querySelector('[role="dialog"] input'), "");
    await click(button("Record it"));
    expect(text()).toContain("Put in how many, 1 or more.");
    expect(document.querySelector('[role="dialog"] input')?.getAttribute("aria-invalid")).toBe("true");
    await sweep("spoil");
  });

  it("the proofs, nobody waiting", async () => {
    const door = new FakeDoor();
    door.data.lines = door.data.lines.filter((l) => ![101, 111, 161].includes(Number(l.id)));
    await mount(door, "proofs");
    expect(text()).toContain("Nobody is waiting on us");
    await sweep("proofs clear");
  });

  it("the post office run, nothing ready", async () => {
    const door = new FakeDoor();
    door.data.orders = door.data.orders.filter((o) => o.id !== 14);
    await mount(door, "post");
    expect(text()).toContain("Nothing to post today");
    await sweep("post empty");
  });

  it("the search, with and without results", async () => {
    await mount(new FakeDoor());
    await type(document.querySelector('input[type="search"]'), "iris");
    expect(document.querySelector("#st-results")?.textContent).toContain("BR-2276 · Iris P.");
    await sweep("search");
    await type(document.querySelector('input[type="search"]'), "zzz");
    expect(text()).toContain("Nothing matches that.");
  });

  it("the shell while it reads, and when the read fails", async () => {
    const door = new FakeDoor();
    await mount(door);
    act(() => useStudio.setState({ data: null }));
    expect(document.querySelector("[aria-busy=\"true\"]")).not.toBeNull();
    await sweep("loading");
    act(() => useStudio.setState({ failure: "Adminium did not answer." }));
    expect(text()).toContain("The workshop could not be read: Adminium did not answer.");
    await sweep("failed");
  });

  it("says the studio's week from its own setting", async () => {
    await mount(new FakeDoor());
    expect(document.querySelector(".st-calendar-days")?.textContent).toBe("Tuesday to Saturday. Closed Sunday and Monday.");
  });

  it("the nav drawer on a narrow screen", async () => {
    await mount(new FakeDoor());
    await click(button("Menu"));
    expect(document.querySelector(".st-drawer")).not.toBeNull();
    await sweep("drawer");
  });
});

describe("the board", () => {
  it("holds a lettered line at make while its proof waits: says why, writes nothing", async () => {
    const door = new FakeDoor();
    await mount(door);
    await click(button("More for BR-2276"));
    await click(button("Move to making"));
    expect(door.calls).toEqual([]);
    expect(toasts()).toEqual(["Waiting on the customer's yes"]);
  });

  it("moves an approved line, and its order follows", async () => {
    const door = new FakeDoor();
    await mount(door);
    await click(button("More for BR-2281"));
    await click(button("Move to making"));
    expect(door.trail()).toEqual(["moveLine 121 make→making", "moveOrder 12 placed→making"]);
  });

  it("says Adminium's refusal of a move past the proof's gate as the gate", async () => {
    const door = new FakeDoor();
    door.refuse("moveLine", new ApiError(409, "STATE_MOVE_REFUSED", "A maker_order_lines row goes from make to making only when proof_ok is 1.", { column: "stage", from: "make", to: "making" }));
    await mount(door);
    await click(button("More for BR-2281"));
    await click(button("Move to making"));
    expect(toasts()).toEqual(["Waiting on the proof — send it first"]);
  });

  it("counts the pieces due today, the orders waiting, the pieces late and the machine time booked", async () => {
    await mount(new FakeDoor());
    const kpis = [...document.querySelectorAll(".st-kpi")].map((k) => k.textContent);
    expect(kpis).toEqual(["1pieces due today", "1order waiting on a customer", "2pieces late", "16h 40mmachine time booked"]);
  });
});

describe("the order", () => {
  it("sends the proof of a lettered piece: drawn, stored, sent", async () => {
    const door = new FakeDoor();
    await mount(door, "order", { orderId: 11 });
    await click(button("Send a proof"));
    await click(button("Send — we'll e-mail Bex T. the proof"));
    expect(door.calls).toEqual([{ method: "sendProof", args: { order: 11, line: 111, kind: "lettering", picture: { filename: "proof-line-111.png", type: "image/png" }, designVersionId: null, note: null } }]);
    expect(toasts()).toEqual(["Proof e-mailed to Bex T."]);
    expect(useStudio.getState().overlay).toBeNull();
  });

  it("sends a design's proof as the Customiser made it", async () => {
    const door = new FakeDoor();
    await mount(door, "order", { orderId: 16 });
    await click(button("Send a proof"));
    expect(document.querySelector('[role="dialog"] img')?.getAttribute("src")).toContain("file_01J8Z6Q3M4N5P6R7S8T9V0W1XA");
    await click(button("Send — we'll e-mail Tom H. the proof"));
    expect(door.calls[0]).toEqual({ method: "sendProof", args: { order: 16, line: 161, kind: "design", picture: { copyOf: "file_01J8Z6Q3M4N5P6R7S8T9V0W1XA" }, designVersionId: 30, note: null } });
  });

  it("links a designed piece to its line's page, where the Customiser's panel makes the proof and the files", async () => {
    await mount(new FakeDoor(), "order", { orderId: 16 });
    const links = [...document.querySelectorAll("a")].filter((a) => /Make the (proof|files)/.test(a.textContent ?? ""));
    expect(links.map((a) => [a.textContent, a.getAttribute("href"), a.getAttribute("target")])).toEqual([
      ["Make the proof", "/p/maker-lines/r/161", "_top"],
      ["Make the files", "/p/maker-lines/r/161", "_top"],
    ]);
  });

  it("marks the pieces made, and says so", async () => {
    const door = new FakeDoor();
    await mount(door, "order", { orderId: 12 });
    await click(button("Mark made"));
    expect(door.trail()).toEqual(["moveLine 121 make→making", "moveLine 121 making→finishing", "moveOrder 12 placed→making"]);
    expect(toasts()).toEqual(["Marked made. On to finishing."]);
  });

  it("records a spoil of two and queues the piece again", async () => {
    const door = new FakeDoor();
    await mount(door, "order", { orderId: 13 });
    const spoils = [...document.querySelectorAll("button")].filter((b) => b.textContent === "Spoiled — remake it");
    await click(spoils[1]);
    await type(document.querySelector('[role="dialog"] input'), "2");
    await click(button("Record it"));
    expect(door.trail()).toEqual(["spoil 132", "updateLine 132", "moveLine 132 ready→make"]);
    expect(toasts()).toEqual(["Recorded. 2 back on the sheet and the piece is queued again."]);
  });

  it("shows the order's stored money and weight, never its own sums", async () => {
    await mount(new FakeDoor(), "order", { orderId: 13 });
    expect(text()).toContain("charged £79.95");
    expect(text()).toContain("1.08 kg");
    expect(text()).toContain("£7.50");
  });
});

describe("the proofs", () => {
  it("sends a reminder of a proof still waiting", async () => {
    const door = new FakeDoor();
    await mount(door, "proofs");
    await click(button("Send a reminder"));
    expect(door.calls).toEqual([{ method: "remind", args: { id: 1001 } }]);
    expect(toasts()).toEqual(["Reminder e-mailed to Iris P."]);
    expect(text()).toContain("Reminder sent Thu, Aug 6");
  });
});

describe("the post office run", () => {
  it("asks for a tick first", async () => {
    const door = new FakeDoor();
    await mount(door, "post");
    await click(button("Mark the run posted"));
    expect(door.calls).toEqual([]);
    expect(toasts()).toEqual(["Tick the parcels you've packed first."]);
  });

  it("posts the ticked parcels and says how many customers were told", async () => {
    const door = new FakeDoor();
    await mount(door, "post");
    await click(button("Packed: BR-2271"));
    expect(text()).toContain("That's the lot. Take them down.");
    await click(button("Mark the run posted"));
    expect(door.trail()).toEqual(["moveLine 141 ready→posted", "moveOrder 14 ready→posted"]);
    expect(toasts()).toEqual(["Posted — we've e-mailed 1 customer"]);
  });

  it("takes a tracking number only when DHL is on", async () => {
    await mount(new FakeDoor(), "post");
    expect(document.querySelector('input[class*="st-input"]')).toBeNull();
    act(() => root?.unmount());
    root = null;
    const door = new FakeDoor({ facts: { addOns: ["customiser", "shipping-dhl"] } });
    await mount(door, "post");
    await type(document.querySelector('input[class*="st-input"]'), "00 3400 1234 5678 9012");
    await click(button("Packed: BR-2271"));
    await click(button("Mark the run posted"));
    expect(door.calls.at(-1)).toEqual({ method: "moveOrder", args: { id: 14, from: "ready", to: "posted", values: { tracking: "00 3400 1234 5678 9012" } } });
  });
});

describe("a product's lettering settings", () => {
  it("refuses an empty limit and a limit past 80, on their fields", async () => {
    const door = new FakeDoor();
    await mount(door, "product", { productId: 2 });
    const limit = document.querySelector("#st-mp-limit");
    await type(limit, "");
    await click(button("Save"));
    expect(text()).toContain("Put in a character limit.");
    expect(limit?.getAttribute("aria-invalid")).toBe("true");
    expect(limit?.getAttribute("aria-describedby")).toBe("st-mp-limit-err");
    await type(limit, "120");
    expect(text()).toContain("Use a number from 1 to 80.");
    expect(door.calls).toEqual([]);
  });

  it("saves the switch, the limit, the prompt and the hint", async () => {
    const door = new FakeDoor();
    await mount(door, "product", { productId: 2 });
    await type(document.querySelector("#st-mp-limit"), "30");
    await type(document.querySelector("#st-mp-prompt"), "Two lines, up to 30 characters");
    expect(text()).toContain("Not saved yet.");
    await click(button("Save"));
    expect(door.calls).toEqual([{ method: "saveProduct", args: { id: 2, values: { takes_lettering: true, lettering_limit: 30, lettering_prompt: "Two lines, up to 30 characters", lettering_hint: null } } }]);
    expect(toasts()).toEqual(["Saved. Wedding sign uses the new settings now."]);
  });
});

describe("what each role sees", () => {
  it("the owner: every screen", () => {
    expect(screensFor(new FakeDoor({ roles: ["owner"] }).who())).toEqual(["today", "orders", "proofs", "post", "customers", "products", "materials", "machines"]);
  });
  it("the maker: the bench, the orders, the proofs, the products and the workshop; never the customers or the post", () => {
    expect(screensFor(new FakeDoor({ roles: ["maker"] }).who())).toEqual(["today", "orders", "proofs", "products", "materials", "machines"]);
  });
  it("the packer: the orders and the post office run", () => {
    expect(screensFor(new FakeDoor({ roles: ["packer"] }).who())).toEqual(["orders", "post"]);
  });

  it("opens a packer on the orders, and shows them no proof, spoil or bench button on an order", async () => {
    const door = new FakeDoor({ roles: ["packer"] });
    door.data.proofs = [];
    door.data.customers = [];
    await mount(door);
    expect(useStudio.getState().view).toBe("orders");
    await click(button(/BR-2281/));
    expect(button("Send a proof")).toBeUndefined();
    expect(button("Mark made")).toBeUndefined();
    expect(button("Spoiled — remake it")).toBeUndefined();
    await sweep("packer's order");
  });

  it("shows a maker who opens the customers' address the 404", async () => {
    await mount(new FakeDoor({ roles: ["maker"] }), "customers");
    expect(text()).toContain("Nothing on this bench");
  });
});
