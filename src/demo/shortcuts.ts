/**
 * What the demo card's screens and shortcuts do: each one is what a person
 * would do on the page (pick a piece, type into a form, ask for a code), or
 * what would happen in the world meanwhile (a price goes up, a shopper
 * answers a proof), never a state the screens could not reach themselves.
 *
 * The comp's two lettering shortcuts open the plain lettered piece (Birch ply
 * coasters): the walnut coasters are made in the Customiser and take no
 * lettering box. The price shortcut's line is the same piece.
 *
 * DEMO BUILD ONLY — nothing in a real build imports it.
 */
import { backToFind, findOrder, openMine, resetAfter, searchFor, typeAsk, typeLookup, typeProblem, useAfter, type LookupKey } from "../shop/after.ts";
import { addChoiceToBasket, addLinesToBasket, choose, goView, loadShop, openProduct, optionsOf, placeOrder, productOf, requoteBasket, requoteProduct, resetShop, setDetails, useShop, type ShopView } from "../shop/store.ts";
import { reload } from "../studio/env.tsx";
import { batchGroups } from "../studio/making.ts";
import { drawLettering } from "../studio/picture.ts";
import { go, toast as studioToast, useStudio, type View } from "../studio/store.ts";
import { cardWord } from "./card.ts";
import { demoAdminium, renewDemo, useDemo, type Persona } from "./adminium.ts";

const IRIS = "iris.p@mail.example";
const PRIYA = { name: "Priya S.", email: "priya.s@mail.example", line1: "14 Wick Lane", town: "Hove", postcode: "BN3 1AA" };
const PLY = "coast-ply";
const PLY_WORDS = "Ruth & Sam · June 2026";

const locale = (): string => document.documentElement.lang || "en-US";

/** The studio's screen state as a new page has it, kept for "Back to Thursday afternoon". */
const STUDIO_START = { ...useStudio.getState() };
const demo = () => demoAdminium();

/** Wait, a little at a time and not for ever, until the page's answer is in. */
async function until(done: () => boolean, tries = 60): Promise<void> {
  for (let i = 0; i < tries && !done(); i += 1) await new Promise((resolve) => setTimeout(resolve, 50));
}

// ── the screens ─────────────────────────────────────────────────────────────

/** The card's shopper screens, by the shop's own view. */
const SHOP_SCREENS: Record<string, ShopView> = {
  shop: "shop",
  product: "product",
  basket: "basket",
  checkout: "checkout",
  confirm: "confirm",
  order: "order",
  about: "about",
  search: "search",
  postage: "postage",
  care: "care",
  ask: "ask",
  again: "find",
  wrong: "problem",
  missing: "missing",
};

/** The card's studio screens, by the studio's own view. */
const STUDIO_SCREENS: Record<string, View> = {
  today: "today",
  orders: "orders",
  proofs: "proofs",
  post: "post",
  customers: "customers",
  products: "products",
  materials: "materials",
  machines: "machines",
  cutlist: "cutlist",
  stockcount: "stockcount",
  batch: "batch",
  "studio-missing": "notfound",
};

export const SCREEN_IDS = [...Object.keys(SHOP_SCREENS), ...Object.keys(STUDIO_SCREENS)];

/** Switch who is using it; the studio reads its rows again as it opens. */
export async function setPersona(persona: Persona): Promise<void> {
  if (useDemo.getState().persona === persona) return;
  useDemo.setState({ persona });
  if (persona === "maker") await reload(demo().studio);
}

/** A plain ply line in the basket, for the shortcuts that need one there. */
function plyLine(): boolean {
  const product = productOf(PLY);
  if (product === null) return false;
  const first = (kind: "material" | "size" | "finish") => optionsOf(product.id, kind)[0]?.id ?? null;
  return addLinesToBasket([{ productId: product.id, qty: 1, materialId: first("material"), sizeId: first("size"), finishId: first("finish"), lettering: PLY_WORDS, design: null, features: [] }]);
}

/** The basket's figures, once its dry run is in. */
const quoted = () => useShop.getState().basketQuote?.state === "ok" && useShop.getState().shownTotal !== null;

/**
 * The confirmation is the end of an order, so reaching it places one: the
 * shopper's basket (a ply line when it is empty) to Priya, at the total shown.
 */
async function placeForConfirmation(): Promise<void> {
  if (useShop.getState().basket.length === 0) plyLine();
  const details = useShop.getState().details;
  if (details.name === "" && details.email === "") setDetails(PRIYA);
  goView("checkout");
  requoteBasket();
  await until(quoted);
  await placeOrder();
}

export async function goScreen(screen: string): Promise<void> {
  const view = SHOP_SCREENS[screen];
  if (view !== undefined) {
    await setPersona("shopper");
    if (view === "product") openProduct(useShop.getState().productCode ?? "coast-wal");
    else if (view === "search") searchFor("walnut");
    else if (view === "confirm") {
      if (useShop.getState().confirmed !== null) goView("confirm");
      else await placeForConfirmation();
    } else goView(view);
    return;
  }
  const studio = STUDIO_SCREENS[screen];
  if (studio === undefined) return;
  await setPersona("maker");
  const data = useStudio.getState().data;
  if (studio === "cutlist") go("cutlist", { cutKey: data === null ? null : (batchGroups(data)[0]?.key ?? null) });
  else go(studio);
}

/** Which of the card's screens the page is on. */
export function currentScreen(): string {
  if (useDemo.getState().persona === "maker") {
    const view = useStudio.getState().view;
    if (view === "order") return "orders";
    if (view === "product") return "products";
    return Object.entries(STUDIO_SCREENS).find(([, v]) => v === view)?.[0] ?? "today";
  }
  const view = useShop.getState().view;
  if (view === "customise") return "product";
  return Object.entries(SHOP_SCREENS).find(([, v]) => v === view)?.[0] ?? "shop";
}

// ── the shortcuts ───────────────────────────────────────────────────────────

/** "Fill the code": the code the demo's Adminium last "e-mailed", typed in; asked for first when it was not yet. */
async function fillCode(key: LookupKey, ref: string): Promise<void> {
  const lookup = () => useAfter.getState().lookups[key];
  if (lookup().step !== "code") {
    if (lookup().ref.trim() === "" || lookup().email.trim() === "") typeLookup(key, { ref, email: IRIS });
    await findOrder(key);
  }
  const code = demo().after.codeFor(lookup().email);
  if (code !== null) typeLookup(key, { digits: code });
}

/** A picture of a line's words where the browser has no canvas to draw the studio's on. */
const wordsPicture = (line: Record<string, unknown>): Blob =>
  new Blob([`<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="800" viewBox="0 0 1200 800"><rect width="1200" height="800" fill="#e8d9bd"/><text x="600" y="400" text-anchor="middle" font-family="sans-serif" font-size="64">${String(line["lettering"] ?? "").replace(/[<>&]/g, "")}</text></svg>`], { type: "image/svg+xml" });

/** Iris's sign on BR-2276 has a proof waiting; she opens her order, signed in. */
async function proofWaiting(): Promise<void> {
  const w = demo().world;
  const order = w.all("orders").find((o) => o["number"] === "BR-2276");
  if (order === undefined) return;
  for (const line of w.all("order_lines").filter((l) => l["order_id"] === order.id && l["lettering"] !== null)) {
    const proofs = w.all("proofs").filter((p) => p["line_id"] === line.id);
    const latest = proofs.reduce((top, p) => Math.max(top, Number(p["version"])), 0);
    if (proofs.some((p) => Number(p["version"]) === latest && p["state"] === "sent")) continue;
    // Sent as the studio sends one, with its picture: Adminium makes no proof without one.
    const blob = (await drawLettering(line, await demo().studio.load())) ?? wordsPicture(line);
    await demo().studio.sendProof({ order, line, kind: "lettering", designVersionId: null, note: "A new layout on the 420 mm sign.", picture: { blob, filename: `proof-line-${String(line.id)}.png` } });
  }
  w.changed();
  demo().after.signInAs(IRIS);
  backToFind("order");
  typeLookup("order", { ref: "BR-2276", email: IRIS });
  useAfter.setState({ lookups: { ...useAfter.getState().lookups, order: { ...useAfter.getState().lookups.order, step: "open" } } });
  goView("order");
  const mine = await demo().after.myOrders();
  const found = mine.find((o) => o["number"] === "BR-2276");
  if (found !== undefined) await openMine(found);
}

/** The oldest proof still waiting is answered yes by its shopper, and the bench sees it. */
async function proofApproved(): Promise<void> {
  const w = demo().world;
  const waiting = w
    .all("proofs")
    .filter((p) => p["state"] === "sent")
    .sort((a, b) => String(a["sent_at"]).localeCompare(String(b["sent_at"])) || a.id - b.id)[0];
  if (waiting === undefined) {
    studioToast(cardWord(locale(), "toast.no-proof"), "warn");
    return;
  }
  w.update("proofs", waiting.id, { state: "approved", answered_at: w.nowIso() });
  w.changed();
  await reload(demo().studio);
  const order = w.get("orders", waiting["order_id"]);
  studioToast(cardWord(locale(), "toast.approved", { name: String(order?.["name"] ?? ""), ref: String(order?.["number"] ?? "") }), "pos");
}

const SHORTCUTS: Record<string, () => void | Promise<void>> = {
  "ply-lettering": () => {
    openProduct(PLY);
    choose({ lettering: PLY_WORDS });
  },
  "too-long": () => {
    openProduct(PLY);
    choose({ lettering: "The Okonkwo-Hartley family, est. 2026" });
    addChoiceToBasket();
  },
  "fill-priya": () => setDetails(PRIYA),
  "price-up": async () => {
    if (useShop.getState().basket.length === 0) plyLine();
    requoteBasket();
    await until(quoted);
    const first = useShop.getState().basket[0];
    if (first === undefined) return;
    const w = demo().world;
    const product = w.get("products", first.productId);
    if (product === undefined) return;
    // Adminium's price moves; the page finds out when the shopper places the order.
    w.update("products", product.id, { price: (Number(product["price"]) + 2).toFixed(2) });
    w.changed();
  },
  "fill-iris-order": () => {
    backToFind("order");
    typeLookup("order", { ref: "BR-2276", email: IRIS });
  },
  "fill-order-code": () => fillCode("order", "BR-2276"),
  "proof-waiting": proofWaiting,
  "fill-iris-again": () => {
    backToFind("again");
    typeLookup("again", { ref: "BR-2247", email: IRIS });
  },
  "fill-again-code": () => fillCode("again", "BR-2247"),
  "sample-ask": () =>
    typeAsk({ idea: "A walnut serving board, about 40 cm long, with our farm's name across one end. It's a leaving present.", material: "Walnut", when: "Before Sat 29 Aug", name: PRIYA.name, email: PRIYA.email }),
  "sample-wrong": () => typeProblem({ ref: "BR-2268", email: IRIS, name: "Iris P.", what: "damaged", details: "One of the coasters arrived with a chip out of the edge." }),
  "proof-approved": proofApproved,
  "tomorrow-run": async () => {
    advanceDay();
    await reload(demo().studio);
    go("post");
  },
};

export const SHORTCUT_IDS = Object.keys(SHORTCUTS);

export async function runShortcut(id: string): Promise<void> {
  await SHORTCUTS[id]?.();
}

// ── the clock ───────────────────────────────────────────────────────────────

/**
 * "+1 studio day": the world's clock to the next day the studio works, and
 * every figure counted from today asked for again (a piece's post-by, the
 * calendar's today).
 */
export function advanceDay(): void {
  demo().world.advanceStudioDay();
  useShop.setState({ productQuote: null, basketQuote: null, shownTotal: null });
  if (useShop.getState().view === "product") requoteProduct();
  requoteBasket();
  useAfter.setState({ extras: { ...useAfter.getState().extras, state: "idle", today: null, examples: null } });
}

/**
 * "Back to Thursday afternoon": a fresh Birch Row in the same page — the
 * sample as it was added, the clock at 16:40, an empty basket, nobody signed
 * in — on the first screen of whoever is using it.
 */
export async function resetWorld(): Promise<void> {
  const fresh = renewDemo();
  resetShop(fresh.shop);
  resetAfter(null);
  useStudio.setState({ ...STUDIO_START, theme: useStudio.getState().theme, toasts: [] }, true);
  await loadShop();
  if (useDemo.getState().persona === "maker") await reload(fresh.studio);
}
