#!/usr/bin/env node
// Writes db/seed.sql from the TypeScript seed, so the two can never drift.
//
//   node db/generate-seed.mjs           rewrite db/seed.sql
//   node db/generate-seed.mjs --check   fail if it is out of date, write nothing
//
// Everything the SQL says is READ from `src/data/demo.ts`, `src/lib/*.ts` and
// the en-US strings — the studio's twelve live orders, its sixteen posted ones,
// its ten stock rows and its three machines, with every price put through
// `piecesTotalCents()` rather than typed in by hand and every shelf movement
// through `consumptionForLine()`. Change the fiction in `demo.ts`, run this, and
// the database the Docker stack seeds still shows the studio the app shows.
//
// Needs Node 22.18+ (it imports the app's `.ts` modules directly, which is also
// why it has no dependencies and no build step of its own).

import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { CUSTOMERS, MACHINES, ORDERS, PAST_ORDERS } from '../src/data/demo.ts';
import { data } from '../src/i18n/strings/data.ts';
import { MATERIAL_STOCK, PRODUCTS } from '../src/lib/catalogue.ts';
import { POSTAGE, consumptionForLine, piecesTotalCents } from '../src/lib/orders.ts';

const DB_DIR = dirname(fileURLToPath(import.meta.url));
const OUT = join(DB_DIR, 'seed.sql');
const EN = data['en-US'];

/**
 * Birch Row is one studio in one town, and every date in the fiction falls
 * between May and August 2026 — British Summer Time throughout. Writing the
 * offset rather than leaning on the container's TZ means the seed lands on the
 * same instant in a database that was set up somewhere else, which matters here
 * more than most: the studio's 17:00 cut-off is a moment, and a seed that moved
 * with the host would move the answer to "does this get on today's bench?".
 */
const OFFSET = '+01';

/** The studio's customers predate its oldest order (16 June 2026) by a season. */
const CUSTOMERS_OPENED = '2026-05-05';

/**
 * Every seeded order was posted second class — the studio's own standard, and
 * the option the checkout offers first.
 *
 * `demo.ts` records no postage choice per order, because the shopper picks it
 * at the checkout and the bench never asks again. Stating it once here is
 * honest; guessing per order would put a number in `orders.total` that nothing
 * in the app could reproduce.
 */
const POSTAGE_CENTS = POSTAGE.second;

// ── SQL literals ─────────────────────────────────────────────────────────────

const str = (value) =>
  value === undefined || value === null ? 'NULL' : `'${String(value).replaceAll("'", "''")}'`;
const num = (value) => (value === undefined || value === null ? 'NULL' : String(value));
/** Cents to a numeric(12, 2) literal — the engines' integers, divided once. */
const money = (cents) => (cents / 100).toFixed(2);
const stamp = (isoDate, time) => `'${isoDate} ${time}:00${OFFSET}'`;
const json = (value) => `${str(JSON.stringify(value))}::jsonb`;

const row = (values) => `  (${values.join(', ')})`;
const insert = (table, columns, rows) =>
  `INSERT INTO ${table} (${columns.join(', ')}) VALUES\n${rows.join(',\n')};`;

// ── the fiction, indexed ─────────────────────────────────────────────────────

const ALL_ORDERS = [...ORDERS, ...PAST_ORDERS];

const customerId = new Map(CUSTOMERS.map((c, i) => [c.key, i + 1]));
const productId = new Map(PRODUCTS.map((p, i) => [p.key, i + 1]));
const materialId = new Map(MATERIAL_STOCK.map((s, i) => [s.key, i + 1]));
const orderId = new Map(ALL_ORDERS.map((o, i) => [o.ref, i + 1]));

/** Line ids run across the whole seed, in the order the orders are declared. */
const lineId = new Map();
for (const order of ALL_ORDERS) {
  for (const line of order.lines) lineId.set(line.id, lineId.size + 1);
}

/** The day the picture was approved, or the day the order was taken if none. */
function settledOn(order) {
  return order.proofs.find((p) => p.kind === 'approved')?.at ?? order.placedIso;
}

/** The last thing the demo records about an order. */
function updatedOn(order) {
  return order.postedIso ?? order.proofs.at(-1)?.at ?? order.placedIso;
}

// ── the statements ───────────────────────────────────────────────────────────

const parts = [];

parts.push(
  insert(
    'customers',
    ['id', 'name', 'email', 'town', 'address_lines', 'postcode', 'country', 'created_at'],
    CUSTOMERS.map((c) =>
      row([
        num(customerId.get(c.key)),
        str(c.name),
        str(c.email),
        str(c.town),
        json(c.address.lines),
        str(c.address.postcode),
        str(c.address.country),
        stamp(CUSTOMERS_OPENED, '09:00'),
      ]),
    ),
  ),
);

parts.push(
  insert(
    'products',
    ['id', 'key', 'name', 'category', 'lead_kind', 'base_price', 'personalize_limit',
     'personalize_hint'],
    PRODUCTS.map((p) =>
      row([
        num(productId.get(p.key)),
        str(p.key),
        str(EN[`data.product.${p.key}.name`]),
        str(p.category),
        str(p.leadKind),
        money(p.basePriceCents),
        // Null together on a piece that takes no words: a desk tray is a shape,
        // not a message. The schema's CHECK says the same thing.
        num(p.personalize?.limitChars),
        str(p.personalize?.hintKey),
      ]),
    ),
  ),
);

parts.push(
  insert(
    'materials',
    ['id', 'key', 'unit', 'sheet_width_mm', 'sheet_height_mm', 'on_hand', 'reorder_at'],
    MATERIAL_STOCK.map((s) =>
      row([
        num(materialId.get(s.key)),
        str(s.key),
        str(s.unit),
        // Only a sheet has edges. A slate blank is one piece and filament is
        // sold by weight, so both columns are null on everything else.
        num(s.sheetWidthMm),
        num(s.sheetHeightMm),
        num(s.onHand),
        num(s.reorderAt),
      ]),
    ),
  ),
);

parts.push(
  insert(
    'machines',
    ['id', 'key', 'count'],
    MACHINES.map((m, i) => row([num(i + 1), str(m.key), num(m.count)])),
  ),
);

parts.push(
  insert(
    'orders',
    ['id', 'ref', 'customer_id', 'placed_on', 'posted_on', 'total', 'created_at', 'updated_at'],
    ALL_ORDERS.map((order) =>
      row([
        num(orderId.get(order.ref)),
        str(order.ref),
        num(customerId.get(order.customer)),
        str(order.placedIso),
        str(order.postedIso),
        money(piecesTotalCents(order.lines) + POSTAGE_CENTS),
        stamp(order.placedIso, '10:00'),
        stamp(updatedOn(order), '16:30'),
      ]),
    ),
  ),
);

parts.push(
  insert(
    'order_lines',
    ['id', 'order_id', 'product_id', 'material_key', 'size_key', 'finish_key', 'quantity', 'note',
     'stage', 'proof', 'spoiled'],
    ALL_ORDERS.flatMap((order) =>
      order.lines.map((line) =>
        row([
          num(lineId.get(line.id)),
          num(orderId.get(order.ref)),
          num(productId.get(line.productKey)),
          str(line.materialKey),
          str(line.sizeKey),
          str(line.finishKey),
          num(line.quantity),
          // The engine carries "they wrote nothing" as an empty string; the
          // database carries it as NULL, which is the same fact said in the
          // language the column is in — and the CHECK beside it reads a piece
          // with no words as a piece that needs no picture.
          line.note === '' ? 'NULL' : str(line.note),
          str(line.stage),
          str(line.proof),
          num(line.spoiled),
        ]),
      ),
    ),
  ),
);

let proofSeq = 0;
parts.push(
  insert(
    'proofs',
    ['id', 'order_id', 'kind', 'note', 'at'],
    ALL_ORDERS.flatMap((order) =>
      order.proofs.map((p) =>
        row([num(++proofSeq), num(orderId.get(order.ref)), str(p.kind), str(p.note), str(p.at)]),
      ),
    ),
  ),
);

/**
 * The shelf ledger.
 *
 * A piece only appears here once it has actually been cut, thrown or printed —
 * leaving *To make* is what does that, so a line still in the queue has taken
 * nothing off the shelf however settled its picture is. The date is the day its
 * picture was approved (or the day the order was taken, for a piece with no
 * words on it), because that is the day nothing was left stopping the maker.
 *
 * `consumptionForLine()` does the arithmetic, exactly as the materials screen
 * does it: sheet stock is blanks packed onto a 600 × 400 sheet with the clamps
 * and the edge waste off, slate is blanks, filament is grams and glaze is
 * fractions of a tub. That last one is why `quantity` is numeric — 0.15 of a tub
 * per mug rounded to a whole tub would have the studio ordering glaze it is
 * standing next to.
 *
 * TWO THINGS IN THIS FILE HAVE NO COUNTERPART IN `demo.ts`, and both are
 * derived here rather than invented in SQL:
 *
 *   • the four deliveries, without which the ledger would only ever run one way
 *     and `delivery` would be a third of an enum no row uses;
 *   • nothing else. In particular there is NO SPOILAGE ROW: every line in
 *     `demo.ts` has `spoiled: 0`, and a demo that opened with a board already
 *     ruined would be a different demo. Spoil-and-remake is a live action —
 *     `spoilAndRemake()` in src/lib/orders.ts — and it writes its own row.
 */
const ON_THE_SHELF_ALREADY = ['making', 'finishing', 'ready-to-post'];
const DELIVERIES = [
  { material: 'walnut-3mm', quantity: 12, on: '2026-07-21' },
  { material: 'acrylic-3mm', quantity: 10, on: '2026-07-28' },
  { material: 'slate-blank', quantity: 24, on: '2026-08-03' },
  { material: 'pla-sage', quantity: 1000, on: '2026-08-04' },
];

let movementSeq = 0;
const movements = [];

for (const order of ALL_ORDERS) {
  for (const line of order.lines) {
    if (!ON_THE_SHELF_ALREADY.includes(line.stage)) continue;
    const consumed = consumptionForLine(line);
    if (consumed === null) {
      throw new Error(`${order.ref} ${line.id}: ${line.productKey} takes nothing off any shelf`);
    }
    movements.push(
      row([
        num(++movementSeq),
        num(materialId.get(consumed.stockKey)),
        num(lineId.get(line.id)),
        str('consumed'),
        num(consumed.amount),
        stamp(settledOn(order), '08:30'),
      ]),
    );
  }
}

for (const delivery of DELIVERIES) {
  movements.push(
    row([
      num(++movementSeq),
      num(materialId.get(delivery.material)),
      'NULL',
      str('delivery'),
      num(delivery.quantity),
      stamp(delivery.on, '07:45'),
    ]),
  );
}

parts.push(
  insert(
    'stock_movements',
    ['id', 'material_id', 'order_line_id', 'kind', 'quantity', 'at'],
    movements,
  ),
);

// Every id above is written out, so each sequence has to be moved past what the
// seed laid down or the first row anybody adds collides with a demo row.
const TABLES = [
  'customers',
  'products',
  'materials',
  'machines',
  'orders',
  'order_lines',
  'proofs',
  'stock_movements',
];
parts.push(
  `DO $$
DECLARE
  seeded text;
BEGIN
  FOREACH seeded IN ARRAY ARRAY[${TABLES.map((t) => `'${t}'`).join(', ')}] LOOP
    EXECUTE format(
      'SELECT setval(pg_get_serial_sequence(%L, ''id''), (SELECT max(id) FROM %I))',
      seeded, seeded);
  END LOOP;
END $$;`,
);

// ── the file ─────────────────────────────────────────────────────────────────

const HEADER = `-- Maker Shop — seed data. GENERATED; do not edit by hand.
--
-- Mirrors src/data/demo.ts row for row: the same twelve customers, the same
-- twelve live orders BR-2276…BR-2287 and sixteen posted ones BR-2260…BR-2275,
-- the same fourteen pieces, the same ten stock rows with \`ply-4mm\` under its
-- reorder point, and the same three machines. Run the app and the generated
-- Adminium dashboard side by side and they show the same Thursday: the same
-- late BR-2276, the same three orders waiting on a picture, the same six sitting
-- in *To make* with nothing stopping them.
--
-- Every price here came out of \`piecesTotalCents()\` rather than a keyboard, and
-- every shelf movement out of \`consumptionForLine()\`. \`orders.total\` is what the
-- customer was charged, second-class postage included — see db/generate-seed.mjs,
-- where that choice is stated once rather than guessed per order.
--
-- Regenerate with:  node db/generate-seed.mjs
--
-- Three things here have no counterpart in demo.ts, because the manifest's
-- schema carries columns the TypeScript seed has no field for: the timestamps
-- (\`created_at\` is the day the order was taken; \`updated_at\` is the last thing
-- the demo records about it), the customers' opening date, and four stock
-- deliveries. All three are derived in db/generate-seed.mjs, where the rules are
-- written down.

BEGIN;
`;

const sql = `${HEADER}\n${parts.join('\n\n')}\n\nCOMMIT;\n`;

if (process.argv.includes('--check')) {
  const current = readFileSync(OUT, 'utf8');
  if (current !== sql) {
    console.error('✗ db/seed.sql is out of date. Regenerate it:  node db/generate-seed.mjs');
    process.exit(1);
  }
  console.log('✓ db/seed.sql matches src/data/demo.ts');
} else {
  writeFileSync(OUT, sql);
  const rows = sql.match(/^ {2}\(/gm)?.length ?? 0;
  console.log(`✓ wrote db/seed.sql — ${rows} rows across ${TABLES.length} tables`);
}
