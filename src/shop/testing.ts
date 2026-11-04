/**
 * A stand-in for Adminium behind the shop's door, for the screens' tests: a
 * few of Birch Row's pieces, and a dry run that answers each line's figures
 * the way the manifest's rules work them out. It is not Adminium: the
 * contract test (`src/contract/`) places the order on a real one.
 *
 * Tests only; nothing that ships imports it.
 */
import type { CustomiserApi } from "../../vendor/customiser/index.js";
import { ShopError, type Catalogue, type Figures, type Id, type Option, type OrderBody, type Placed, type Product, type Refused, type Row, type ShopConfig, type ShopPort } from "./port.ts";

const product = (p: Partial<Product> & Pick<Product, "id" | "code" | "name" | "category" | "unit" | "price" | "leadDays">): Product => ({
  materialId: null,
  sizeText: null,
  finishLabel: null,
  madeFrom: null,
  finishedWith: null,
  care: null,
  icon: null,
  photo: null,
  takesLettering: false,
  letteringLimit: null,
  letteringPrompt: null,
  letteringHint: null,
  baseId: null,
  ...p,
});

const option = (o: Partial<Option> & Pick<Option, "id" | "productId" | "kind" | "code" | "name">): Option => ({ price: "0", materialId: null, swatch: null, featureCode: null, minQty: null, percentOff: null, ...o });

const breaks = (productId: Id, from: number, steps: [number, number][]): Option[] =>
  steps.map(([qty, off], i) => option({ id: from + i, productId, kind: "break", code: `from-${qty}`, name: `${qty} or more`, minQty: qty, percentOff: `${off}.00` }));

export function sampleCatalogue(): Catalogue {
  return {
    products: [
      product({ id: 1, code: "coast-wal", name: "Engraved walnut coasters", category: "coasters", unit: "set of 4", price: "34.00", leadDays: 3, materialId: 1, sizeText: "95 × 95 × 6 mm", madeFrom: "American black walnut, 6 mm, cut and engraved on the laser.", finishedWith: "Sanded, then two coats of Danish oil.", care: "Wipe with a damp cloth.", icon: "disc", takesLettering: true, letteringLimit: 24, baseId: 101 }),
      product({ id: 2, code: "coast-ply", name: "Birch ply coasters", category: "coasters", unit: "set of 4", price: "24.00", leadDays: 3, materialId: 2, sizeText: "95 × 95 × 3 mm", icon: "disc", takesLettering: true, letteringLimit: 24, letteringPrompt: "One line, up to 24 characters", letteringHint: "Tell us the name and the date." }),
      product({ id: 3, code: "sign-house", name: "Slate house sign", category: "signs", unit: "each", price: "48.00", leadDays: 5, materialId: 3, sizeText: "300 × 200 mm", icon: "house" }),
    ],
    options: [
      option({ id: 10, productId: 1, kind: "material", code: "walnut", name: "Walnut", materialId: 1 }),
      option({ id: 11, productId: 1, kind: "material", code: "ply", name: "Birch ply", price: "-10.00", materialId: 2 }),
      option({ id: 12, productId: 1, kind: "size", code: "s95", name: "95 mm square" }),
      option({ id: 13, productId: 1, kind: "size", code: "s110", name: "110 mm square", price: "6.00" }),
      option({ id: 14, productId: 1, kind: "finish", code: "oil", name: "Danish oil", swatch: "#6b4423" }),
      option({ id: 15, productId: 1, kind: "finish", code: "wax", name: "Beeswax", swatch: "#a3763f" }),
      ...breaks(1, 16, [
        [1, 0],
        [4, 8],
        [8, 14],
        [12, 18],
      ]),
      option({ id: 20, productId: 1, kind: "feature", code: "logo", name: "Your own logo", price: "1.50", featureCode: "logo" }),
      option({ id: 30, productId: 2, kind: "material", code: "ply", name: "Birch ply", materialId: 2 }),
      option({ id: 31, productId: 2, kind: "size", code: "s95", name: "95 mm square" }),
      option({ id: 32, productId: 2, kind: "finish", code: "bare", name: "Left bare", swatch: "#e0c69e" }),
      ...breaks(2, 33, [
        [1, 0],
        [4, 8],
      ]),
      option({ id: 40, productId: 3, kind: "material", code: "slate", name: "Slate", materialId: 3 }),
      option({ id: 41, productId: 3, kind: "size", code: "s300", name: "300 × 200 mm" }),
      ...breaks(3, 42, [[1, 0]]),
    ],
    materials: [
      { id: 1, code: "wal6", name: "Walnut, 6 mm", family: "Walnut", tint: "#6b4423" },
      { id: 2, code: "ply3", name: "Birch ply, 3 mm", family: "Birch ply", tint: "#c2a175" },
      { id: 3, code: "slate5", name: "Slate, 5 mm", family: "Slate", tint: "#3d4348" },
    ],
    services: [
      { id: 1, code: "second", name: "Second class", detail: "2–3 days once it's posted", tracked: false },
      { id: 2, code: "tracked", name: "Tracked", detail: "Next day once it's posted, with a tracking number", tracked: true },
    ],
    studio: { name: "Birch Row", address: "Unit 4, Station Yard, Settle BD24 9AA", about: "Two of us, a laser, two printers and a kiln.", takingOrders: true },
  };
}

const POSTAGE: Record<string, number> = { "1": 3.95, "2": 7.5 };
const cents = (n: number) => Math.round(n * 100);
const fixed = (c: number) => (c / 100).toFixed(2);

export interface FakeCall {
  call: "quote" | "place";
  body: OrderBody;
  clientKey?: string;
  expect?: string;
}

export interface FakePort extends ShopPort {
  calls: FakeCall[];
  /** Raise a product's price by this much (the price the next dry run says). */
  raise: (productId: Id, by: number) => void;
  /** Refuse the next call with this refusal. */
  refuseNext: (refused: Partial<Refused> & { code: string }) => void;
  /** Hold the next answers until let go. */
  hold: () => () => void;
  customiserApi: CustomiserApi;
}

export function fakePort(catalogue: Catalogue = sampleCatalogue()): FakePort {
  const calls: FakeCall[] = [];
  const bump = new Map<string, number>();
  let refusal: Refused | null = null;
  let held: Promise<void> | null = null;
  let number = 2291;

  const figures = (body: OrderBody): Figures => {
    const lines = body.children.order_lines.map(({ values, children }) => {
      const p = catalogue.products.find((one) => String(one.id) === String(values.product_id))!;
      const delta = (id: Id | undefined) => (id === undefined ? 0 : Number(catalogue.options.find((o) => String(o.id) === String(id))?.price ?? 0));
      const base = cents(Number(p.price) + (bump.get(String(p.id)) ?? 0) + delta(values.material_id) + delta(values.size_id));
      const band = catalogue.options.filter((o) => String(o.productId) === String(p.id) && o.kind === "break" && (o.minQty ?? 1) <= values.qty).sort((a, b) => (b.minQty ?? 0) - (a.minQty ?? 0))[0];
      const off = Number(band?.percentOff ?? 0);
      const each = Math.round((base * (100 - off)) / 100);
      const pieces = values.qty * (p.unit === "set of 4" ? 4 : 1);
      const features = (children?.order_line_features ?? []).reduce((sum, f) => sum + cents(delta(f.values.option_id)), 0);
      return {
        product_id: p.id,
        product_name: p.name,
        qty: values.qty,
        lettering: values.lettering ?? null,
        design_id: values.design_code === undefined ? null : 900,
        base_each: fixed(base),
        percent_off: off.toFixed(2),
        each: fixed(each),
        features_total: fixed(features * pieces),
        line_total: fixed(each * values.qty + features * pieces),
        lead_days: p.leadDays,
        post_by: p.leadDays >= 5 ? "2026-08-13" : "2026-08-11",
      };
    });
    const pieces = lines.reduce((sum, l) => sum + cents(Number(l.line_total)), 0);
    const postage = cents(POSTAGE[String(body.values["service_id"] ?? "1")] ?? 3.95);
    const postBy = lines.map((l) => l.post_by).sort().pop() ?? null;
    return { order: { service_id: body.values["service_id"] ?? 1, pieces_total: fixed(pieces), postage: fixed(postage), total: fixed(pieces + postage), post_by: postBy }, lines };
  };

  const answer = async <T>(run: () => T): Promise<T> => {
    if (held !== null) await held;
    if (refusal !== null) {
      const r = refusal;
      refusal = null;
      throw new ShopError(r, r.code);
    }
    return run();
  };

  const api = {} as CustomiserApi;
  return {
    calls,
    customiserApi: api,
    raise: (productId, by) => bump.set(String(productId), (bump.get(String(productId)) ?? 0) + by),
    refuseNext: (r) => {
      refusal = { status: 400, column: null, child: null, index: null, reason: null, changed: null, raw: { code: r.code, params: {} }, ...r };
    },
    hold: () => {
      let release = () => {};
      held = new Promise<void>((resolve) => {
        release = () => {
          held = null;
          resolve();
        };
      });
      return release;
    },
    config: async (): Promise<ShopConfig> => ({ timezone: "Europe/London", currency: "GBP" }),
    catalogue: async () => catalogue,
    quote: (body) => {
      calls.push({ call: "quote", body });
      return answer(() => figures(body));
    },
    place: (body, clientKey, expect) => {
      calls.push({ call: "place", body, clientKey, expect });
      return answer((): Placed => {
        const made = figures(body);
        if (made.order["total"] !== expect) {
          throw new ShopError({ code: "PUBLIC_PRICE_CHANGED", status: 409, column: null, child: null, index: null, reason: null, changed: made, raw: null }, "changed");
        }
        const order: Row = { ...made.order, number: `BR-${number}` };
        number += 1;
        return { order, lines: made.lines, replayed: false, link: { token: "LINKCODE0000000A" } };
      });
    },
    customiser: () => api,
  };
}
