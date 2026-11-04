/**
 * The shop's door into a real Adminium: the public API through the shop's
 * browser keys, one client each. The shop's own key (`customer`) reads the
 * catalogue and places an order; the `order` key opens the one order a
 * placed order's link names; the Customiser's link key holds a saved design.
 *
 * Every figure is Adminium's. A price is a dry run of the order (`quote`); an
 * order is saved once, carrying the total the shopper was shown and a retry
 * key, and a save that would come to another total is refused with the
 * figures it came to. A retry of an order already made answers that order.
 */
import { createPublicClient, newClientKey, pictureUrl, PublicApiError, type PublicClient, type PublicConfig } from "@adminiumjs/public-client";

import { customiserApi, REFS as CUSTOMISER_REFS, type ClientLike, type CustomiserApi } from "../../vendor/customiser/index.js";
import { KEYS, shopRefs, type ShopRefs } from "./refs.ts";
import { ShopError, type Catalogue, type Figures, type Id, type Material, type Option, type OptionKind, type OrderBody, type Placed, type Product, type Refused, type Row, type Service, type ShopConfig, type ShopPort } from "./port.ts";

export interface ShopServed {
  baseUrl: string;
  publishableKey: string;
  tables?: Record<string, string>;
  publicKeys?: Record<string, string>;
}

export interface ShopDoorOptions {
  /** Test seam; `globalThis.fetch` otherwise. */
  fetch?: typeof fetch;
  /** Test seam: the human check, as the client takes it. */
  humanCheck?: boolean | { refs?: readonly string[]; claim?: boolean };
}

const PAGE = 200;

const text = (value: unknown): string | null => (value === null || value === undefined || value === "" ? null : String(value));
const num = (value: unknown): number | null => (value === null || value === undefined || value === "" || Number.isNaN(Number(value)) ? null : Number(value));
/** A yes/no as every engine answers it (SQLite and MySQL may say 0 and 1). */
const yes = (value: unknown): boolean => value === true || value === 1 || value === "1" || value === "true";
const id = (value: unknown): Id | null => (value === null || value === undefined || value === "" ? null : (value as Id));
const byPosition = (a: Row, b: Row) => Number(a["position"] ?? 0) - Number(b["position"] ?? 0) || Number(a["id"]) - Number(b["id"]);

/** The client's refusal as the pages read one. */
export function refusalOf(error: unknown): Refused | null {
  if (!(error instanceof PublicApiError)) return null;
  const params = error.params;
  const changed = error.priceChanged;
  return {
    code: error.code,
    status: error.status,
    column: typeof params["column"] === "string" ? params["column"] : null,
    child: typeof params["child"] === "string" ? params["child"] : null,
    index: typeof params["index"] === "number" ? params["index"] : null,
    reason: typeof params["reason"] === "string" ? params["reason"] : null,
    changed: changed === null ? null : { order: { total: changed.total }, lines: (changed.lines["order_lines"] ?? []).map((line) => line.data) },
    raw: error,
  };
}

async function answer<T>(run: () => Promise<T>): Promise<T> {
  try {
    return await run();
  } catch (error) {
    const refused = refusalOf(error);
    if (refused !== null) throw new ShopError(refused, (error as Error).message);
    throw error;
  }
}

function product(row: Row, photo: string | null): Product {
  return {
    id: row["id"] as Id,
    code: String(row["code"] ?? ""),
    name: String(row["name"] ?? ""),
    category: String(row["category"] ?? ""),
    unit: String(row["unit"] ?? ""),
    price: String(row["price"] ?? "0"),
    leadDays: num(row["lead_days"]) ?? 0,
    materialId: id(row["material_id"]),
    sizeText: text(row["size_text"]),
    finishLabel: text(row["finish_label"]),
    madeFrom: text(row["made_from"]),
    finishedWith: text(row["finished_with"]),
    care: text(row["care"]),
    icon: text(row["icon"]),
    photo,
    takesLettering: yes(row["takes_lettering"]),
    letteringLimit: num(row["lettering_limit"]),
    letteringPrompt: text(row["lettering_prompt"]),
    letteringHint: text(row["lettering_hint"]),
    baseId: id(row["base_id"]),
  };
}

function option(row: Row): Option {
  return {
    id: row["id"] as Id,
    productId: row["product_id"] as Id,
    kind: String(row["kind"]) as OptionKind,
    code: String(row["code"] ?? ""),
    name: String(row["name"] ?? ""),
    price: String(row["price"] ?? "0"),
    materialId: id(row["material_id"]),
    swatch: text(row["swatch"]),
    featureCode: text(row["feature_code"]),
    minQty: num(row["min_qty"]),
    percentOff: text(row["percent_off"]),
  };
}

const material = (row: Row): Material => ({ id: row["id"] as Id, code: String(row["code"] ?? ""), name: String(row["name"] ?? ""), family: String(row["family"] ?? row["name"] ?? ""), tint: text(row["tint"]) });
const service = (row: Row): Service => ({ id: row["id"] as Id, code: String(row["code"] ?? ""), name: String(row["name"] ?? ""), detail: text(row["detail"]), tracked: yes(row["tracked"]) });

export class AdminiumShop implements ShopPort {
  private readonly served: ShopServed;
  private readonly refs: ShopRefs;
  private readonly fetchImpl: typeof fetch | undefined;
  readonly client: PublicClient;
  /** The order key's client: the session a placed order's link opens is held here. */
  readonly orderClient: PublicClient | null;
  private config$: Promise<PublicConfig> | null = null;
  private api: CustomiserApi | null = null;

  constructor(served: ShopServed, options: ShopDoorOptions = {}) {
    this.served = served;
    this.refs = shopRefs(served.tables);
    this.fetchImpl = options.fetch;
    const make = (publishableKey: string, humanCheck: ShopDoorOptions["humanCheck"]) =>
      createPublicClient({ baseUrl: served.baseUrl, publishableKey, ...(options.fetch === undefined ? {} : { fetch: options.fetch }), ...(humanCheck === undefined ? {} : { humanCheck }) });
    // Placing an order and saving a design both ask the human check: solved before they are sent.
    const client = make(served.publishableKey, options.humanCheck ?? { refs: [this.refs.placeOrder, CUSTOMISER_REFS.designs] });
    if (client === null) throw new Error("The shop's key could not be used.");
    this.client = client;
    const orderKey = served.publicKeys?.[KEYS.order];
    this.orderClient = orderKey === undefined ? null : make(orderKey, false);
  }

  private clientConfig(): Promise<PublicConfig> {
    this.config$ ??= this.client.config().catch((error: unknown) => {
      this.config$ = null;
      throw error;
    });
    return this.config$;
  }

  private async list(ref: string): Promise<Row[]> {
    const rows: Row[] = [];
    for (let offset = 0; offset < 50 * PAGE; offset += PAGE) {
      const page = await this.client.list<Row>(ref, { limit: PAGE, offset });
      rows.push(...page.data);
      if (page.data.length < PAGE) break;
    }
    return rows.sort(byPosition);
  }

  config(): Promise<ShopConfig> {
    return answer(async () => {
      const config = await this.clientConfig();
      return { timezone: config.timezone, currency: config.currency };
    });
  }

  catalogue(): Promise<Catalogue> {
    return answer(async () => {
      const [products, options, materials, services, settings] = await Promise.all(
        [this.refs.products, this.refs.options, this.refs.materials, this.refs.postageServices, this.refs.settings].map((ref) => this.list(ref)),
      );
      const config = await this.clientConfig();
      const photo = (row: Row) => pictureUrl(this.served.baseUrl, config, this.refs.products, String(row["id"]), "photo", row["photo"]);
      const studio = settings![0] ?? {};
      return {
        products: products!.map((row) => product(row, photo(row))),
        options: options!.map(option),
        materials: materials!.map(material),
        services: services!.map(service),
        studio: { name: String(studio["studio_name"] ?? ""), address: text(studio["address"]), about: text(studio["about"]), takingOrders: studio["taking_orders"] === undefined ? true : yes(studio["taking_orders"]) },
      };
    });
  }

  quote(body: OrderBody): Promise<Figures> {
    return answer(async () => {
      const quote = await this.client.quote<Row>(this.refs.placeOrder, { values: body.values, children: body.children as never });
      return { order: quote.data, lines: (quote.children["order_lines"] ?? []).map((line) => line.data) };
    });
  }

  place(body: OrderBody, clientKey: string, expectTotal: string): Promise<Placed> {
    return answer(async () => {
      const made = await this.client.createTree<Row>(this.refs.placeOrder, {
        values: { ...body.values, client_key: clientKey },
        children: body.children as never,
        expect: { total: expectTotal },
      });
      // The order's own link, a session on it already open: the order's page needs no claim.
      if (made.link !== null && this.orderClient !== null && made.link.session !== null && made.link.expiresAt !== null) {
        this.orderClient.adoptSession({ token: made.link.session, expiresAt: made.link.expiresAt, level: "verified" });
      }
      return {
        order: made.data,
        lines: (made.children["order_lines"] ?? []).map((line) => line.data),
        replayed: made.replayed,
        link: made.link === null ? null : { token: made.link.token },
      };
    });
  }

  customiser(): CustomiserApi {
    if (this.api !== null) return this.api;
    const linkKey = this.served.publicKeys?.[KEYS.design];
    this.api = customiserApi({
      shop: this.client as unknown as ClientLike,
      link: () => {
        const made = createPublicClient({ baseUrl: this.served.baseUrl, publishableKey: linkKey ?? this.served.publishableKey, ...(this.fetchImpl === undefined ? {} : { fetch: this.fetchImpl }) });
        if (made === null) throw new Error("The design's own key could not be used.");
        return made as unknown as ClientLike;
      },
      baseUrl: this.served.baseUrl,
    });
    return this.api;
  }
}

/** A retry key for one basket, kept until its order is made. */
export const freshClientKey = (): string => newClientKey();
