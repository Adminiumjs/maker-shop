/**
 * An order as a delivery company's dispatch flow reads it
 * (`order.dispatch.actions`, `DispatchPayload`): the studio's own address it
 * goes from, the shopper's it goes to, each of its pieces as a line with what
 * one weighs (the line's stored `grams`), the parcel's packed weight (the
 * order's stored `weight_g`), the day it is to be posted by, what
 * it is worth, the studio's clock, and the service the shopper chose at
 * checkout, as that add-on names it (the postage service's `dhl_product`), so
 * the flow opens with it picked. Every figure is a stored column; the mapping
 * only reshapes them.
 */
import type { DispatchPayload, OutboundOrder, PostalAddress, ShopClock } from "../add-ons/payloads.ts";
import type { StudioData } from "./door.ts";
import { isLive, linesOf, serviceOf } from "./facts.ts";
import { countryOf } from "./holidays.ts";
import { dayIn } from "./time.ts";
import { dayOf, num, text, type Row } from "./wire.ts";

/** The add-on whose fill the post office run mounts. */
export const DHL = "shipping-dhl";

/** A postcode at the end of an address line: what a carrier checks the country against. */
const POSTCODE = /\s([A-Z]{1,2}\d[A-Z\d]?\s*\d[A-Z]{2})$/i;

/**
 * The studio's own address, as its settings keep it on one line ("Unit 4,
 * Station Yard, Settle BD24 9AA"): the street before the last comma, the town
 * and postcode after it.
 */
export function studioAddress(settings: Row | null, country: string): PostalAddress {
  const name = text(settings?.["studio_name"]) ?? "";
  const whole = (text(settings?.["address"]) ?? "").trim();
  const cut = whole.lastIndexOf(",");
  const street = cut < 0 ? "" : whole.slice(0, cut).trim();
  const tail = cut < 0 ? whole : whole.slice(cut + 1).trim();
  const post = POSTCODE.exec(` ${tail}`);
  const postcode = post === null ? "" : post[1]!.toUpperCase();
  const city = post === null ? tail : ` ${tail}`.slice(0, post.index).trim();
  return { name, lines: street === "" ? [] : street.split(",").map((l) => l.trim()), city, postcode, country };
}

export function outboundOrder(data: StudioData, order: Row, currency: string): OutboundOrder {
  const country = countryOf(currency);
  const line1 = text(order["address_line1"]);
  const total = num(order["total"]);
  const postBy = dayOf(order["post_by"]);
  // The parcel as the studio weighs it (pieces and packing, Adminium's stored `weight_g`): the one weight the order shows and DHL is sent.
  const weight = num(order["weight_g"]);
  return {
    ref: text(order["number"]) ?? String(order.id),
    recipient: { name: text(order["name"]) ?? "", key: String(order["customer_id"] ?? order.id) },
    items: linesOf(data, order)
      .filter(isLive)
      .map((line) => {
        const grams = num(line["grams"]);
        return {
          id: String(line.id),
          key: String(line["product_id"] ?? line.id),
          label: text(line["product_name"]) ?? "",
          quantity: num(line["qty"]) ?? 1,
          ...(grams === null ? {} : { unitWeightGrams: grams }),
        };
      }),
    origin: studioAddress(data.settings, country),
    ...(line1 === null
      ? {}
      : {
          destination: {
            name: text(order["name"]) ?? "",
            lines: [line1, text(order["address_line2"])].filter((l): l is string => l !== null),
            city: text(order["town"]) ?? "",
            postcode: text(order["postcode"]) ?? "",
            country,
          },
        }),
    ...(postBy === null ? {} : { promisedFor: postBy }),
    ...(total === null ? {} : { value: { amount: Math.round(total * 100), currency } }),
    ...(weight === null ? {} : { parcelWeightGrams: weight }),
  };
}

/** The studio's clock, as a carrier asks for it. */
export function shopClock(now: number, zone: string): ShopClock {
  const time = new Intl.DateTimeFormat("en-GB", { hour: "2-digit", minute: "2-digit", hourCycle: "h23", timeZone: zone }).formatToParts(new Date(now));
  const part = (type: string) => Number(time.find((p) => p.type === type)?.value ?? "0");
  return { iso: dayIn(now, zone), hour: part("hour") % 24, minute: part("minute") };
}

/** The service the shopper chose, as DHL names it: the order's postage service's `dhl_product`, or null when it has none. */
export function chosenService(data: StudioData, order: Row): DispatchPayload["chosen"] {
  const code = text(serviceOf(data, order)?.["dhl_product"]);
  return code === null ? null : { addOn: DHL, code };
}

/** Everything the dispatch flow is handed but the add-on's own settings. */
export function dispatchPayload(data: StudioData, order: Row, input: { currency: string; zone: string; now: number }): Omit<DispatchPayload, "settings"> {
  return { order: outboundOrder(data, order, input.currency), now: shopClock(input.now, input.zone), chosen: chosenService(data, order) };
}
