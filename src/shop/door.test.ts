/**
 * The shop's door, on the wire: the refs it calls by, the one write that
 * places an order exactly as it goes over HTTP, its dry run, and a refusal
 * read back with the field it names.
 */
import { describe, expect, it } from "vitest";

import { PUBLIC_REFS } from "../manifest/public.ts";
import { AdminiumShop } from "./door.ts";
import { shopRefs } from "./refs.ts";
import { isShopError, type OrderBody } from "./port.ts";

interface Sent {
  method: string;
  path: string;
  body: unknown;
}

function wire(answers: Record<string, { status?: number; body: unknown }>): { fetch: typeof fetch; sent: Sent[] } {
  const sent: Sent[] = [];
  const fetchImpl = (async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = new URL(String(input));
    const method = init?.method ?? "GET";
    sent.push({ method, path: url.pathname, body: init?.body === undefined ? null : JSON.parse(String(init.body)) });
    const answer = answers[`${method} ${url.pathname}`] ?? { status: 404, body: { error: { code: "PUBLIC_REF_NOT_FOUND", message: "no" } } };
    return new Response(JSON.stringify(answer.body), { status: answer.status ?? 200, headers: { "content-type": "application/json" } });
  }) as typeof fetch;
  return { fetch: fetchImpl, sent };
}

const BODY: OrderBody = {
  values: { name: "Priya Shah", email: "priya@example.com", address_line1: "12 Mill Lane", town: "Settle", postcode: "BD24 9AA", may_email: true, service_id: 1, language: "en-US" },
  children: { order_lines: [{ values: { product_id: 1, qty: 1, material_id: 10, size_id: 12, finish_id: 14, design_code: "DSGN-7Q2K-X4PA" }, children: { order_line_features: [{ values: { option_id: 20 } }] } }] },
};

describe("the shop's refs", () => {
  it("are the manifest's, named as Adminium names them", () => {
    const refs = shopRefs();
    for (const [name, ref] of Object.entries(refs)) expect(Object.values(PUBLIC_REFS), name).toContain(ref);
    expect(refs.placeOrder).toBe(PUBLIC_REFS.placeOrder);
    expect(shopRefs({ orders: "shop_orders" }).placeOrder).toBe("shop_orders_verified_2");
  });
});

describe("placing an order through the door", () => {
  it("sends the order, its lines, their features, the retry key and the total shown in one write", async () => {
    const { fetch, sent } = wire({
      "POST /api/v1/public/records/maker_orders_verified_2": {
        status: 201,
        body: { data: { number: "BR-2291", total: "37.95", post_by: "2026-08-11" }, children: { order_lines: [{ data: { product_name: "Engraved walnut coasters", line_total: "34.00" } }] }, link: { key: "order", token: "LINKCODE0000000A", session: "S1", expiresAt: 4102444800000 } },
      },
    });
    const door = new AdminiumShop({ baseUrl: "https://studio.example", publishableKey: "adm_pub_shop", publicKeys: { order: "adm_pub_order" } }, { fetch, humanCheck: false });
    const placed = await door.place(BODY, "basket-key-0123456789abcdef", "37.95");
    expect(sent).toEqual([
      {
        method: "POST",
        path: "/api/v1/public/records/maker_orders_verified_2",
        body: { values: { ...BODY.values, client_key: "basket-key-0123456789abcdef" }, children: BODY.children, expect: { total: "37.95" } },
      },
    ]);
    expect(placed.order["number"]).toBe("BR-2291");
    expect(placed.lines[0]?.["line_total"]).toBe("34.00");
    expect(placed.link).toEqual({ token: "LINKCODE0000000A" });
    // The order's own key now holds the session the save opened: its page needs no claim.
    expect(door.orderClient?.session()?.token).toBe("S1");
  });

  it("dry-runs the same body without the retry key or the total", async () => {
    const { fetch, sent } = wire({
      "POST /api/v1/public/records/maker_orders_verified_2/dry-run": { body: { data: { total: "37.95" }, children: { order_lines: [{ data: { each: "34.00" } }] } } },
    });
    const door = new AdminiumShop({ baseUrl: "https://studio.example", publishableKey: "adm_pub_shop" }, { fetch, humanCheck: false });
    const quoted = await door.quote(BODY);
    expect(sent[0]).toEqual({ method: "POST", path: "/api/v1/public/records/maker_orders_verified_2/dry-run", body: { values: BODY.values, children: BODY.children } });
    expect(quoted).toEqual({ order: { total: "37.95" }, lines: [{ each: "34.00" }] });
  });

  it("reads a refusal with the row and column it names", async () => {
    const { fetch } = wire({
      "POST /api/v1/public/records/maker_orders_verified_2": {
        status: 400,
        body: { error: { code: "PUBLIC_WRITE_REFUSED", message: "refused", params: { child: "order_lines", index: 0, column: "design_code", reason: "too-long", part: "words" } } },
      },
    });
    const door = new AdminiumShop({ baseUrl: "https://studio.example", publishableKey: "adm_pub_shop" }, { fetch, humanCheck: false });
    const error = await door.place(BODY, "basket-key-0123456789abcdef", "37.95").catch((e: unknown) => e);
    expect(isShopError(error)).toBe(true);
    if (!isShopError(error)) return;
    expect(error.refused).toMatchObject({ code: "PUBLIC_WRITE_REFUSED", child: "order_lines", index: 0, column: "design_code", reason: "too-long" });
  });

  it("reads a changed price with the figures the save came to", async () => {
    const { fetch } = wire({
      "POST /api/v1/public/records/maker_orders_verified_2": {
        status: 409,
        body: { error: { code: "PUBLIC_PRICE_CHANGED", message: "moved", params: { total: "39.95", lines: { order_lines: [{ data: { each: "36.00" } }] } } } },
      },
    });
    const door = new AdminiumShop({ baseUrl: "https://studio.example", publishableKey: "adm_pub_shop" }, { fetch, humanCheck: false });
    const error = await door.place(BODY, "basket-key-0123456789abcdef", "37.95").catch((e: unknown) => e);
    expect(isShopError(error) && error.refused.changed).toEqual({ order: { total: "39.95" }, lines: [{ each: "36.00" }] });
  });
});
