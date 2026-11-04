/**
 * A small Birch Row for the studio's tests, as Adminium would answer it at
 * the comp's pinned moment (Thursday 6 August 2026, 16:40 in Settle): the
 * stored figures (a line's post-by and proof state, an order's weight,
 * postage and total, a customer's orders and spend) are written in as the
 * server keeps them, because the screens only read them.
 *
 * Tests only; nothing that ships imports it.
 */
import type { Action, Person, StudioData, StudioFacts, Table } from "../door.ts";
import type { Row } from "../wire.ts";

/** 16:40 on Thursday 6 August 2026 in Settle (British Summer Time). */
export const THURSDAY = Date.parse("2026-08-06T15:40:00Z");

export const FACTS: StudioFacts = { zone: "Europe/London", currency: "GBP", studioDays: ["tue", "wed", "thu", "fri", "sat"], addOns: ["customiser"], connectionId: "conn-1" };

const r = (row: Record<string, unknown> & { id: number }): Row => row;

/** A proof's stored picture, as the files route's `url` reference spells it. */
export const PICTURE = "/api/v1/files/file_01J8Z6Q3M4N5P6R7S8T9V0W1X2/content";
export const DESIGN_PROOF = "/api/v1/files/file_01J8Z6Q3M4N5P6R7S8T9V0W1XA/content";

export function fixture(): StudioData {
  return {
    settings: r({ id: 1, studio_name: "Birch Row", address: "Unit 4, Station Yard, Settle BD24 9AA", email: "studio@birchrow.example", taking_orders: true }),
    materials: [
      r({ id: 1, code: "wal6", name: "Walnut, 6 mm", tint: "#6b4423", unit: "sheets", on_hand: 14, committed: 2, available: 12, active: true }),
      r({ id: 2, code: "ply3", name: "Birch ply, 3 mm", tint: "#c2a175", unit: "sheets", on_hand: 5, committed: 3, available: 2, active: true }),
      r({ id: 3, code: "glaze-oat", name: "Oatmeal glaze", tint: "#cbb9a1", unit: "tubs", on_hand: 4, committed: 1, available: 3, active: true }),
      r({ id: 4, code: "pla-chalk", name: "PLA, chalk", tint: "#e8e4dc", unit: "g", on_hand: 2400, committed: 330, available: 2070, active: true }),
    ],
    machines: [r({ id: 1, code: "laser", name: "The laser", kind: "laser", active: true })],
    products: [
      r({ id: 1, code: "coast-wal", name: "Engraved walnut coasters", unit: "set of 4", price: "34.00", lead_days: 3, machine_kind: "laser", material_id: 1, size_text: "95 × 95 × 6 mm", icon: "disc", made_from: "American black walnut, 6 mm.", takes_lettering: true, lettering_limit: 24, lettering_prompt: "One line, up to 24 characters", lettering_hint: "Tell us the name and the date.", base_id: 7, published: true, position: 1 }),
      r({ id: 2, code: "sign-wed", name: "Wedding sign", unit: "each", price: "58.00", lead_days: 3, machine_kind: "laser", material_id: 2, size_text: "420 × 300 × 3 mm", icon: "heart", takes_lettering: true, lettering_limit: 40, lettering_prompt: "Up to 40 characters across two lines", lettering_hint: null, base_id: null, published: true, position: 2 }),
      r({ id: 3, code: "mug-stone", name: "Stoneware mug", unit: "each", price: "32.00", lead_days: 10, machine_kind: "kiln", material_id: 3, size_text: "85 × 95 mm · 350 ml", icon: "coffee", takes_lettering: true, lettering_limit: 18, lettering_prompt: "One line, up to 18 characters", lettering_hint: null, base_id: null, published: true, position: 3 }),
      r({ id: 4, code: "tray-3d", name: "3D-printed desk tray", unit: "each", price: "38.00", lead_days: 4, machine_kind: "printer", material_id: 4, size_text: "220 × 120 × 30 mm", icon: "inbox", takes_lettering: false, lettering_limit: null, lettering_prompt: null, lettering_hint: null, base_id: null, published: true, position: 4 }),
    ],
    options: [
      r({ id: 11, product_id: 1, kind: "material", code: "walnut", name: "Walnut", material_id: 1, active: true }),
      r({ id: 12, product_id: 1, kind: "finish", code: "oil", name: "Danish oil", active: true }),
      r({ id: 13, product_id: 1, kind: "size", code: "s95", name: "95 mm square", active: true }),
      r({ id: 21, product_id: 2, kind: "material", code: "ply", name: "Birch ply", material_id: 2, active: true }),
      r({ id: 22, product_id: 2, kind: "finish", code: "bare", name: "Left bare", active: true }),
      r({ id: 31, product_id: 3, kind: "material", code: "stoneware", name: "Stoneware", material_id: 3, active: true }),
      r({ id: 32, product_id: 3, kind: "finish", code: "oat", name: "Oatmeal", active: true }),
      r({ id: 41, product_id: 4, kind: "material", code: "resin", name: "PLA", material_id: 4, active: true }),
    ],
    services: [
      r({ id: 1, code: "second", name: "Second class", detail: "2–3 days once it's posted", tracked: false, active: true }),
      r({ id: 2, code: "tracked", name: "Tracked", detail: "Next day once it's posted, with a tracking number", tracked: true, active: true }),
    ],
    closures: [r({ id: 1, from_date: "2026-08-15", to_date: "2026-08-15", reason: "Closed — we're at the Whitby craft fair", active: true })],
    customers: [
      r({ id: 1, name: "Iris P.", email: "iris.p@mail.example", order_count: 2, spent: "99.90", created_at: "2026-06-16T09:00:00.000Z" }),
      r({ id: 2, name: "Sam & Robin", email: "sam.robin@mail.example", order_count: 1, spent: "41.95", created_at: "2026-08-04T09:00:00.000Z" }),
      r({ id: 3, name: "Fern A.", email: "fern@mail.example", order_count: 1, spent: "37.95", created_at: "2026-08-06T09:00:00.000Z" }),
      r({ id: 4, name: "The Pughs", email: "pughs@mail.example", order_count: 1, spent: "79.95", created_at: "2026-07-23T09:00:00.000Z" }),
      r({ id: 5, name: "Bex T.", email: "bex.t@mail.example", order_count: 1, spent: "35.95", created_at: "2026-08-06T09:00:00.000Z" }),
      r({ id: 6, name: "Tom H.", email: "tom.h@mail.example", order_count: 1, spent: "83.95", created_at: "2026-08-06T09:00:00.000Z" }),
    ],
    orders: [
      r({ id: 10, number: "BR-2276", status: "placed", name: "Iris P.", email: "iris.p@mail.example", town: "Leeds", customer_id: 1, service_id: 1, weight_g: 900, postage: "3.95", pieces_total: "58.00", total: "61.95", placed_at: "2026-08-04T09:00:00.000Z", post_by: "2026-08-07" }),
      r({ id: 11, number: "BR-2287", status: "placed", name: "Bex T.", email: "bex.t@mail.example", town: "Hebden Bridge", customer_id: 5, service_id: 1, weight_g: 520, postage: "3.95", pieces_total: "32.00", total: "35.95", placed_at: "2026-08-06T09:00:00.000Z", post_by: "2026-08-20" }),
      r({ id: 12, number: "BR-2281", status: "placed", name: "Fern A.", email: "fern@mail.example", town: "Skipton", customer_id: 3, service_id: 1, weight_g: 160, postage: "3.95", pieces_total: "34.00", total: "37.95", placed_at: "2026-08-03T09:00:00.000Z", post_by: "2026-08-06" }),
      r({ id: 13, number: "BR-2268", status: "making", name: "The Pughs", email: "pughs@mail.example", town: "Ilkley", customer_id: 4, service_id: 2, weight_g: 1080, postage: "7.50", pieces_total: "72.45", total: "79.95", placed_at: "2026-07-23T09:00:00.000Z", post_by: "2026-08-05" }),
      r({ id: 14, number: "BR-2271", status: "ready", name: "Sam & Robin", email: "sam.robin@mail.example", town: "Kendal", customer_id: 2, service_id: 1, weight_g: 285, postage: "3.95", pieces_total: "38.00", total: "41.95", placed_at: "2026-08-04T09:00:00.000Z", post_by: "2026-08-10" }),
      r({ id: 15, number: "BR-2241", status: "posted", name: "Iris P.", email: "iris.p@mail.example", town: "Leeds", customer_id: 1, service_id: 1, weight_g: 160, postage: "3.95", pieces_total: "34.00", total: "37.95", placed_at: "2026-06-16T09:00:00.000Z", posted_at: "2026-06-20T15:00:00.000Z", post_by: "2026-06-19" }),
      r({ id: 16, number: "BR-2290", status: "placed", name: "Tom H.", email: "tom.h@mail.example", town: "York", customer_id: 6, service_id: 1, weight_g: 440, postage: "3.95", pieces_total: "80.00", total: "83.95", placed_at: "2026-08-06T09:00:00.000Z", post_by: "2026-08-11" }),
    ],
    lines: [
      r({ id: 101, order_id: 10, position: 1, product_id: 2, product_name: "Wedding sign", qty: 1, material_id: 21, finish_id: 22, lettering: "Iris & Tom · 5 September 2026", design_id: null, stage: "make", proof_state: "sent", proof_ok: 0, post_by: "2026-08-07", spoiled: 0, stock_use: "0.729" }),
      r({ id: 111, order_id: 11, position: 1, product_id: 3, product_name: "Stoneware mug", qty: 1, material_id: 31, finish_id: 32, lettering: "Morning, then", design_id: null, stage: "make", proof_state: null, proof_ok: 0, post_by: "2026-08-20", spoiled: 0, stock_use: "0.150" }),
      r({ id: 121, order_id: 12, position: 1, product_id: 1, product_name: "Engraved walnut coasters", qty: 1, material_id: 11, finish_id: 12, size_id: 13, lettering: "Fern & Robin — 12.09.2026", design_id: null, stage: "make", proof_state: "approved", proof_ok: 1, post_by: "2026-08-06", spoiled: 0, stock_use: "0.167" }),
      r({ id: 131, order_id: 13, position: 1, product_id: 3, product_name: "Stoneware mug", qty: 2, material_id: 31, finish_id: 32, lettering: "Morning, then", design_id: null, stage: "finishing", proof_state: "approved", proof_ok: 1, post_by: "2026-08-05", spoiled: 0, stock_use: "0.300" }),
      r({ id: 132, order_id: 13, position: 2, product_id: 1, product_name: "Engraved walnut coasters", qty: 1, material_id: 11, finish_id: 12, lettering: "The Pughs", design_id: null, stage: "ready", proof_state: "approved", proof_ok: 1, post_by: "2026-08-05", spoiled: 0, stock_use: "0.167" }),
      r({ id: 141, order_id: 14, position: 1, product_id: 4, product_name: "3D-printed desk tray", qty: 1, material_id: 41, lettering: null, design_id: null, stage: "ready", proof_state: null, proof_ok: 1, post_by: "2026-08-10", spoiled: 0, stock_use: "165.000" }),
      r({ id: 151, order_id: 15, position: 1, product_id: 1, product_name: "Engraved walnut coasters", qty: 1, material_id: 11, lettering: "Wren Cottage", design_id: null, stage: "posted", proof_state: "approved", proof_ok: 1, post_by: "2026-06-19", spoiled: 0, stock_use: "0.167" }),
      r({ id: 161, order_id: 16, position: 1, product_id: 1, product_name: "Engraved walnut coasters", qty: 2, material_id: 11, lettering: null, design_code: "BR2290H5F3P9V8YA", design_id: 3, stage: "make", proof_state: null, proof_ok: 0, post_by: "2026-08-11", spoiled: 0, stock_use: "0.334" }),
    ],
    features: [],
    proofs: [
      r({ id: 1001, order_id: 10, line_id: 101, version: 1, kind: "lettering", picture: PICTURE, state: "sent", sent_at: "2026-08-04T10:00:00.000Z", answered_at: null, reminded_at: null, change_note: null }),
      r({ id: 1002, order_id: 12, line_id: 121, version: 1, kind: "lettering", picture: null, state: "approved", sent_at: "2026-08-04T10:00:00.000Z", answered_at: "2026-08-05T10:00:00.000Z", reminded_at: null, change_note: null }),
      r({ id: 1003, order_id: 15, line_id: 151, version: 1, kind: "lettering", picture: null, state: "approved", sent_at: "2026-06-16T10:00:00.000Z", answered_at: "2026-06-16T14:00:00.000Z", reminded_at: null, change_note: null }),
    ],
    bookings: [
      r({ id: 1, machine_id: 1, kind: "run", label: "Coasters", starts_at: "2026-08-06T08:00:00.000Z", ends_at: "2026-08-06T15:40:00.000Z" }),
      r({ id: 2, machine_id: 1, kind: "run", label: "Yesterday", starts_at: "2026-08-05T08:00:00.000Z", ends_at: "2026-08-05T10:00:00.000Z" }),
    ],
    designs: [r({ id: 3, code: "BR2290H5F3P9V8YA", values: JSON.stringify({ parts: { words: { text: "The Pinfold · 2019" }, logo: { file: "logo_file" } } }), state: "ordered" })],
    versions: [r({ id: 30, design_id: 3, version: 1, proof_file: DESIGN_PROOF })],
  };
}

/** Someone whose roles are named, and who may do what those roles may (owner: everything). */
export function person(roles: string[] = ["owner"], name = "Jo Marsh"): Person {
  const grants: Record<string, Partial<Record<Table, Action[]>>> = {
    owner: {},
    maker: {
      settings: ["read"], machines: ["read"], materials: ["read"], products: ["read", "update"], options: ["read"], postage_services: ["read"], closures: ["read"],
      orders: ["read", "update"], order_lines: ["read", "update"], order_line_features: ["read"], proofs: ["read", "create", "update"], machine_bookings: ["read", "create", "update", "delete"], stock_movements: ["read", "create"],
    },
    packer: { settings: ["read"], products: ["read"], options: ["read"], postage_services: ["read"], orders: ["read", "update"], order_lines: ["read", "update"], order_line_features: ["read"] },
  };
  return {
    name,
    roles,
    can: (table, action) => roles.includes("owner") || roles.some((role) => grants[role]?.[table]?.includes(action) === true),
  };
}
