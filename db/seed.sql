-- Maker Shop — seed data. GENERATED; do not edit by hand.
--
-- Mirrors src/data/demo.ts row for row: the same twelve customers, the same
-- twelve live orders BR-2276…BR-2287 and sixteen posted ones BR-2260…BR-2275,
-- the same fourteen pieces, the same ten stock rows with `ply-4mm` under its
-- reorder point, and the same three machines. Run the app and the generated
-- Adminium dashboard side by side and they show the same Thursday: the same
-- late BR-2276, the same three orders waiting on a picture, the same six sitting
-- in *To make* with nothing stopping them.
--
-- Every price here came out of `piecesTotalCents()` rather than a keyboard, and
-- every shelf movement out of `consumptionForLine()`. `orders.total` is what the
-- customer was charged, second-class postage included — see db/generate-seed.mjs,
-- where that choice is stated once rather than guessed per order.
--
-- Regenerate with:  node db/generate-seed.mjs
--
-- Three things here have no counterpart in demo.ts, because the manifest's
-- schema carries columns the TypeScript seed has no field for: the timestamps
-- (`created_at` is the day the order was taken; `updated_at` is the last thing
-- the demo records about it), the customers' opening date, and four stock
-- deliveries. All three are derived in db/generate-seed.mjs, where the rules are
-- written down.

BEGIN;

INSERT INTO customers (id, name, email, town, address_lines, postcode, country, created_at) VALUES
  (1, 'Bex T.', 'bex.t@example.com', 'Saltburn', '["14 Milton Street"]'::jsonb, 'TS12 1DP', 'GB', '2026-05-05 09:00:00+01'),
  (2, 'Hana W.', 'hana.w@example.com', 'Whitby', '["3 Flowergate"]'::jsonb, 'YO21 3BA', 'GB', '2026-05-05 09:00:00+01'),
  (3, 'Iris P.', 'iris.p@example.com', 'Guisborough', '["21 Westgate"]'::jsonb, 'TS14 6AH', 'GB', '2026-05-05 09:00:00+01'),
  (4, 'Dara M.', 'dara.m@example.com', 'Redcar', '["8 Newcomen Terrace"]'::jsonb, 'TS10 1DB', 'GB', '2026-05-05 09:00:00+01'),
  (5, 'Otto L.', 'otto.l@example.com', 'Stokesley', '["5 College Square"]'::jsonb, 'TS9 5DL', 'GB', '2026-05-05 09:00:00+01'),
  (6, 'Priya N.', 'priya.n@example.com', 'Yarm', '["17 High Street"]'::jsonb, 'TS15 9AE', 'GB', '2026-05-05 09:00:00+01'),
  (7, 'Sam K.', 'sam.k@example.com', 'Loftus', '["2 Zetland Road"]'::jsonb, 'TS13 4PW', 'GB', '2026-05-05 09:00:00+01'),
  (8, 'Elin R.', 'elin.r@example.com', 'Marske', '["9 Windsor Road"]'::jsonb, 'TS11 6AA', 'GB', '2026-05-05 09:00:00+01'),
  (9, 'Joss B.', 'joss.b@example.com', 'Skelton', '["12 Boosbeck Road"]'::jsonb, 'TS12 2AF', 'GB', '2026-05-05 09:00:00+01'),
  (10, 'Mira C.', 'mira.c@example.com', 'Great Ayton', '["4 Station Road"]'::jsonb, 'TS9 6BA', 'GB', '2026-05-05 09:00:00+01'),
  (11, 'Theo A.', 'theo.a@example.com', 'Danby', '["6 Briar Hill"]'::jsonb, 'YO21 2NH', 'GB', '2026-05-05 09:00:00+01'),
  (12, 'Rosa V.', 'rosa.v@example.com', 'Castleton', '["11 High Street"]'::jsonb, 'YO21 2DA', 'GB', '2026-05-05 09:00:00+01');

INSERT INTO products (id, key, name, category, lead_kind, base_price, personalize_limit, personalize_hint) VALUES
  (1, 'walnut-coasters', 'Engraved walnut coasters', 'coasters', 'engraved-wood', 34.00, 24, 'engraved-wood'),
  (2, 'ply-coasters', 'Birch ply coasters', 'coasters', 'engraved-wood', 22.00, 24, 'engraved-wood'),
  (3, 'house-sign', 'Slate house sign', 'signs', 'slate', 48.00, 28, 'engraved-slate'),
  (4, 'garden-markers', 'Slate garden markers', 'signs', 'slate', 18.00, 16, 'markers'),
  (5, 'keyring', 'Acrylic keyring', 'keyrings', 'keyrings', 9.00, 18, 'engraved-acrylic'),
  (6, 'pet-tag', 'Engraved pet tag', 'keyrings', 'keyrings', 12.00, 20, 'engraved-acrylic'),
  (7, 'desk-tray', 'Printed desk tray', 'desk', 'printed', 26.00, NULL, NULL),
  (8, 'herb-pot', 'Printed herb pot', 'pots', 'printed', 19.00, NULL, NULL),
  (9, 'stoneware-mug', 'Hand-glazed mug', 'mugs', 'glazed', 28.00, 14, 'painted-glaze'),
  (10, 'cake-topper', 'Two-layer cake topper', 'signs', 'engraved-wood', 24.00, 22, 'engraved-wood'),
  (11, 'cutting-board', 'Walnut cutting board', 'desk', 'engraved-wood', 68.00, 26, 'engraved-wood'),
  (12, 'wedding-sign', 'Standing wedding sign', 'signs', 'engraved-wood', 56.00, 30, 'engraved-wood'),
  (13, 'bookmark', 'Walnut bookmark', 'desk', 'engraved-wood', 11.00, 20, 'engraved-wood'),
  (14, 'photo-block', 'Photo block', 'desk', 'printed', 16.00, 18, 'engraved-wood');

INSERT INTO materials (id, key, unit, sheet_width_mm, sheet_height_mm, on_hand, reorder_at) VALUES
  (1, 'walnut-3mm', 'sheet', 600, 400, 18, 6),
  (2, 'walnut-6mm', 'sheet', 600, 400, 9, 4),
  (3, 'ply-4mm', 'sheet', 600, 400, 7, 8),
  (4, 'acrylic-3mm', 'sheet', 600, 400, 12, 5),
  (5, 'slate-blank', 'blank', NULL, NULL, 34, 12),
  (6, 'pla-natural', 'grams', NULL, NULL, 2400, 800),
  (7, 'pla-sage', 'grams', NULL, NULL, 1150, 800),
  (8, 'glaze-oatmeal', 'tub', NULL, NULL, 4, 2),
  (9, 'glaze-seafoam', 'tub', NULL, NULL, 3, 2),
  (10, 'glaze-ink', 'tub', NULL, NULL, 2, 2);

INSERT INTO machines (id, key, count) VALUES
  (1, 'laser', 1),
  (2, 'printers', 2),
  (3, 'kiln', 1);

INSERT INTO orders (id, ref, customer_id, placed_on, posted_on, total, created_at, updated_at) VALUES
  (1, 'BR-2276', 3, '2026-07-31', NULL, 71.95, '2026-07-31 10:00:00+01', '2026-08-01 16:30:00+01'),
  (2, 'BR-2277', 4, '2026-08-01', NULL, 25.95, '2026-08-01 10:00:00+01', '2026-08-04 16:30:00+01'),
  (3, 'BR-2278', 2, '2026-08-04', NULL, 59.95, '2026-08-04 10:00:00+01', '2026-08-05 16:30:00+01'),
  (4, 'BR-2279', 1, '2026-08-05', NULL, 59.95, '2026-08-05 10:00:00+01', '2026-08-05 16:30:00+01'),
  (5, 'BR-2280', 5, '2026-08-05', NULL, 27.95, '2026-08-05 10:00:00+01', '2026-08-05 16:30:00+01'),
  (6, 'BR-2281', 6, '2026-08-05', NULL, 44.43, '2026-08-05 10:00:00+01', '2026-08-05 16:30:00+01'),
  (7, 'BR-2282', 7, '2026-08-05', NULL, 237.87, '2026-08-05 10:00:00+01', '2026-08-06 16:30:00+01'),
  (8, 'BR-2283', 8, '2026-08-06', NULL, 37.07, '2026-08-06 10:00:00+01', '2026-08-06 16:30:00+01'),
  (9, 'BR-2284', 9, '2026-08-06', NULL, 47.95, '2026-08-06 10:00:00+01', '2026-08-06 16:30:00+01'),
  (10, 'BR-2285', 10, '2026-08-06', NULL, 23.95, '2026-08-06 10:00:00+01', '2026-08-06 16:30:00+01'),
  (11, 'BR-2286', 11, '2026-08-06', NULL, 32.95, '2026-08-06 10:00:00+01', '2026-08-06 16:30:00+01'),
  (12, 'BR-2287', 12, '2026-08-04', NULL, 51.95, '2026-08-04 10:00:00+01', '2026-08-04 16:30:00+01'),
  (13, 'BR-2260', 3, '2026-06-16', '2026-06-20', 37.95, '2026-06-16 10:00:00+01', '2026-06-20 16:30:00+01'),
  (14, 'BR-2261', 1, '2026-06-18', '2026-06-23', 25.95, '2026-06-18 10:00:00+01', '2026-06-23 16:30:00+01'),
  (15, 'BR-2262', 2, '2026-06-20', '2026-07-04', 31.95, '2026-06-20 10:00:00+01', '2026-07-04 16:30:00+01'),
  (16, 'BR-2263', 4, '2026-06-23', '2026-06-27', 60.95, '2026-06-23 10:00:00+01', '2026-06-27 16:30:00+01'),
  (17, 'BR-2264', 3, '2026-06-25', '2026-07-02', 21.95, '2026-06-25 10:00:00+01', '2026-07-02 16:30:00+01'),
  (18, 'BR-2265', 5, '2026-06-27', '2026-07-02', 44.43, '2026-06-27 10:00:00+01', '2026-07-02 16:30:00+01'),
  (19, 'BR-2266', 6, '2026-06-30', '2026-07-04', 71.95, '2026-06-30 10:00:00+01', '2026-07-04 16:30:00+01'),
  (20, 'BR-2267', 7, '2026-07-02', '2026-07-08', 27.95, '2026-07-02 10:00:00+01', '2026-07-08 16:30:00+01'),
  (21, 'BR-2268', 8, '2026-07-04', '2026-07-11', 35.95, '2026-07-04 10:00:00+01', '2026-07-11 16:30:00+01'),
  (22, 'BR-2269', 9, '2026-07-07', '2026-07-14', 59.95, '2026-07-07 10:00:00+01', '2026-07-14 16:30:00+01'),
  (23, 'BR-2270', 10, '2026-07-09', '2026-07-15', 47.95, '2026-07-09 10:00:00+01', '2026-07-15 16:30:00+01'),
  (24, 'BR-2271', 11, '2026-07-11', '2026-07-18', 29.95, '2026-07-11 10:00:00+01', '2026-07-18 16:30:00+01'),
  (25, 'BR-2272', 12, '2026-07-14', '2026-07-22', 51.95, '2026-07-14 10:00:00+01', '2026-07-22 16:30:00+01'),
  (26, 'BR-2273', 3, '2026-07-17', '2026-07-23', 100.27, '2026-07-17 10:00:00+01', '2026-07-23 16:30:00+01'),
  (27, 'BR-2274', 1, '2026-07-21', '2026-07-25', 23.95, '2026-07-21 10:00:00+01', '2026-07-25 16:30:00+01'),
  (28, 'BR-2275', 2, '2026-07-24', '2026-08-05', 67.95, '2026-07-24 10:00:00+01', '2026-08-05 16:30:00+01');

INSERT INTO order_lines (id, order_id, product_id, material_key, size_key, finish_key, quantity, note, stage, proof, spoiled) VALUES
  (1, 1, 1, 'walnut', 'standard', 'oiled', 2, 'The Pinfold · 2019', 'making', 'approved', 0),
  (2, 2, 2, 'ply', 'standard', 'bare', 1, 'Quarry Cottage', 'finishing', 'approved', 0),
  (3, 3, 9, 'stoneware', 'standard', 'seafoam', 2, 'Hana · Whitby', 'to-make', 'waiting', 0),
  (4, 4, 1, 'walnut', 'standard', 'waxed', 1, 'Bex & Sam · 2026', 'to-make', 'waiting', 0),
  (5, 4, 5, 'acrylic', 'standard', 'amber', 2, 'Ollie', 'to-make', 'waiting', 0),
  (6, 5, 10, 'walnut', 'standard', 'oiled', 1, 'Fifty, and still cross', 'to-make', 'not-sent', 0),
  (7, 6, 13, 'walnut', 'standard', 'oiled', 4, 'For Ada', 'to-make', 'approved', 0),
  (8, 7, 1, 'walnut', 'standard', 'oiled', 8, 'Kestrel House · 1908', 'to-make', 'approved', 0),
  (9, 8, 5, 'acrylic', 'small', 'ink', 4, 'Elin', 'to-make', 'approved', 0),
  (10, 9, 2, 'ply', 'standard', 'bare', 2, 'Joss & Ruth', 'to-make', 'approved', 0),
  (11, 10, 14, 'ply', 'standard', 'bare', 1, 'Mira · 2026', 'to-make', 'approved', 0),
  (12, 11, 10, 'walnut', 'large', 'waxed', 1, 'Theo is thirty', 'to-make', 'approved', 0),
  (13, 12, 8, 'resin', 'tall', 'matte-sage', 2, NULL, 'ready-to-post', 'not-needed', 0),
  (14, 13, 1, 'walnut', 'standard', 'oiled', 1, 'The Pinfold', 'ready-to-post', 'approved', 0),
  (15, 14, 13, 'walnut', 'standard', 'oiled', 2, 'Bex', 'ready-to-post', 'approved', 0),
  (16, 15, 9, 'stoneware', 'standard', 'oatmeal', 1, 'Hana', 'ready-to-post', 'approved', 0),
  (17, 16, 8, 'resin', 'small', 'matte-bone', 3, NULL, 'ready-to-post', 'not-needed', 0),
  (18, 17, 4, 'slate', 'standard', 'plain-edge', 1, 'Herbs', 'ready-to-post', 'approved', 0),
  (19, 18, 5, 'acrylic', 'standard', 'clear', 4, 'Otto', 'ready-to-post', 'approved', 0),
  (20, 19, 11, 'walnut', 'standard', 'oiled', 1, 'For the Nolans', 'ready-to-post', 'approved', 0),
  (21, 20, 6, 'acrylic', 'small', 'amber', 2, 'Biscuit', 'ready-to-post', 'approved', 0),
  (22, 21, 14, 'ply', 'small', 'bare', 2, 'Elin · 2025', 'ready-to-post', 'approved', 0),
  (23, 22, 12, 'walnut', 'standard', 'oiled', 1, 'Joss & Ruth · 12 September', 'ready-to-post', 'approved', 0),
  (24, 23, 2, 'ply', 'standard', 'bare', 2, 'Mira', 'ready-to-post', 'approved', 0),
  (25, 24, 7, 'resin', 'standard', 'matte-clay', 1, NULL, 'ready-to-post', 'not-needed', 0),
  (26, 25, 3, 'slate', 'standard', 'bevelled', 1, 'Rowan Cottage', 'ready-to-post', 'approved', 0),
  (27, 26, 5, 'walnut', 'standard', 'oiled', 8, 'The Pinfold', 'ready-to-post', 'approved', 0),
  (28, 27, 10, 'acrylic', 'standard', 'clear', 1, 'Sam is forty', 'ready-to-post', 'approved', 0),
  (29, 28, 9, 'stoneware', 'large', 'ink-glaze', 2, 'Whitby', 'ready-to-post', 'approved', 0);

INSERT INTO proofs (id, order_id, kind, note, at) VALUES
  (1, 1, 'accepted', NULL, '2026-07-31'),
  (2, 1, 'sent', NULL, '2026-07-31'),
  (3, 1, 'approved', NULL, '2026-08-01'),
  (4, 2, 'accepted', NULL, '2026-08-01'),
  (5, 2, 'sent', NULL, '2026-08-01'),
  (6, 2, 'approved', NULL, '2026-08-04'),
  (7, 3, 'accepted', NULL, '2026-08-04'),
  (8, 3, 'sent', NULL, '2026-08-05'),
  (9, 4, 'accepted', NULL, '2026-08-05'),
  (10, 4, 'sent', NULL, '2026-08-05'),
  (11, 5, 'accepted', NULL, '2026-08-05'),
  (12, 6, 'accepted', NULL, '2026-08-05'),
  (13, 6, 'sent', NULL, '2026-08-05'),
  (14, 6, 'approved', NULL, '2026-08-05'),
  (15, 7, 'accepted', NULL, '2026-08-05'),
  (16, 7, 'sent', NULL, '2026-08-05'),
  (17, 7, 'approved', NULL, '2026-08-06'),
  (18, 8, 'accepted', NULL, '2026-08-06'),
  (19, 8, 'sent', NULL, '2026-08-06'),
  (20, 8, 'approved', NULL, '2026-08-06'),
  (21, 9, 'accepted', NULL, '2026-08-06'),
  (22, 9, 'sent', NULL, '2026-08-06'),
  (23, 9, 'approved', NULL, '2026-08-06'),
  (24, 10, 'accepted', NULL, '2026-08-06'),
  (25, 10, 'sent', NULL, '2026-08-06'),
  (26, 10, 'approved', NULL, '2026-08-06'),
  (27, 11, 'accepted', NULL, '2026-08-06'),
  (28, 11, 'sent', NULL, '2026-08-06'),
  (29, 11, 'approved', NULL, '2026-08-06'),
  (30, 12, 'accepted', NULL, '2026-08-04'),
  (31, 13, 'accepted', NULL, '2026-06-16'),
  (32, 13, 'approved', NULL, '2026-06-17'),
  (33, 14, 'accepted', NULL, '2026-06-18'),
  (34, 14, 'approved', NULL, '2026-06-19'),
  (35, 15, 'accepted', NULL, '2026-06-20'),
  (36, 15, 'approved', NULL, '2026-06-23'),
  (37, 16, 'accepted', NULL, '2026-06-23'),
  (38, 17, 'accepted', NULL, '2026-06-25'),
  (39, 17, 'approved', NULL, '2026-06-26'),
  (40, 18, 'accepted', NULL, '2026-06-27'),
  (41, 18, 'approved', NULL, '2026-06-27'),
  (42, 19, 'accepted', NULL, '2026-06-30'),
  (43, 19, 'approved', NULL, '2026-07-01'),
  (44, 20, 'accepted', NULL, '2026-07-02'),
  (45, 20, 'approved', NULL, '2026-07-02'),
  (46, 21, 'accepted', NULL, '2026-07-04'),
  (47, 21, 'approved', NULL, '2026-07-06'),
  (48, 22, 'accepted', NULL, '2026-07-07'),
  (49, 22, 'approved', NULL, '2026-07-09'),
  (50, 23, 'accepted', NULL, '2026-07-09'),
  (51, 23, 'approved', NULL, '2026-07-10'),
  (52, 24, 'accepted', NULL, '2026-07-11'),
  (53, 25, 'accepted', NULL, '2026-07-14'),
  (54, 25, 'approved', NULL, '2026-07-16'),
  (55, 26, 'accepted', NULL, '2026-07-17'),
  (56, 26, 'approved', NULL, '2026-07-18'),
  (57, 27, 'accepted', NULL, '2026-07-21'),
  (58, 27, 'approved', NULL, '2026-07-22'),
  (59, 28, 'accepted', NULL, '2026-07-24'),
  (60, 28, 'approved', NULL, '2026-07-25');

INSERT INTO stock_movements (id, material_id, order_line_id, kind, quantity, at) VALUES
  (1, 1, 1, 'consumed', 1, '2026-08-01 08:30:00+01'),
  (2, 3, 2, 'consumed', 1, '2026-08-04 08:30:00+01'),
  (3, 7, 13, 'consumed', 330, '2026-08-04 08:30:00+01'),
  (4, 1, 14, 'consumed', 1, '2026-06-17 08:30:00+01'),
  (5, 1, 15, 'consumed', 1, '2026-06-19 08:30:00+01'),
  (6, 8, 16, 'consumed', 0.15, '2026-06-23 08:30:00+01'),
  (7, 7, 17, 'consumed', 495, '2026-06-23 08:30:00+01'),
  (8, 5, 18, 'consumed', 6, '2026-06-26 08:30:00+01'),
  (9, 4, 19, 'consumed', 1, '2026-06-27 08:30:00+01'),
  (10, 2, 20, 'consumed', 1, '2026-07-01 08:30:00+01'),
  (11, 4, 21, 'consumed', 1, '2026-07-02 08:30:00+01'),
  (12, 3, 22, 'consumed', 1, '2026-07-06 08:30:00+01'),
  (13, 2, 23, 'consumed', 2, '2026-07-09 08:30:00+01'),
  (14, 3, 24, 'consumed', 1, '2026-07-10 08:30:00+01'),
  (15, 6, 25, 'consumed', 240, '2026-07-11 08:30:00+01'),
  (16, 5, 26, 'consumed', 1, '2026-07-16 08:30:00+01'),
  (17, 4, 27, 'consumed', 1, '2026-07-18 08:30:00+01'),
  (18, 1, 28, 'consumed', 1, '2026-07-22 08:30:00+01'),
  (19, 8, 29, 'consumed', 0.3, '2026-07-25 08:30:00+01'),
  (20, 1, NULL, 'delivery', 12, '2026-07-21 07:45:00+01'),
  (21, 4, NULL, 'delivery', 10, '2026-07-28 07:45:00+01'),
  (22, 5, NULL, 'delivery', 24, '2026-08-03 07:45:00+01'),
  (23, 7, NULL, 'delivery', 1000, '2026-08-04 07:45:00+01');

DO $$
DECLARE
  seeded text;
BEGIN
  FOREACH seeded IN ARRAY ARRAY['customers', 'products', 'materials', 'machines', 'orders', 'order_lines', 'proofs', 'stock_movements'] LOOP
    EXECUTE format(
      'SELECT setval(pg_get_serial_sequence(%L, ''id''), (SELECT max(id) FROM %I))',
      seeded, seeded);
  END LOOP;
END $$;

COMMIT;
