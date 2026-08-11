# Maker Shop — Birch Row

An open-source example app for [Adminium](https://adminium.dev): a made-to-order
shop and workshop for **Birch Row**, a fictional two-person maker studio that
sells laser-engraved coasters, slate house signs, keyrings and pet tags,
3D-printed desk pieces and pots, and a few hand-glazed stoneware mugs.

Nothing is held in stock. Every order is made after it is placed, which is the
one fact the whole app is built around.

```bash
npm install
npm run dev        # http://localhost:5173
npm test           # the engines, the bundle, the source scan, and a DOM render
npm run build      # tsc -b && vite build
npm run build:demo # the same, served from /demo/maker-shop/
```

## The studio calendar

**Birch Row works Tuesday to Saturday.** Sunday and Monday the bench is shut,
and that is not decoration: every lead time, ship-by date and queue chip in this
app counts **studio days**, so

- a piece finished on Saturday is posted on **Tuesday**;
- the dock's **"+1 studio day"** chip skips two nights when it lands on a
  Saturday, which is how the studio week becomes visible without a paragraph
  explaining it;
- an order placed before **17:00** starts the same studio day.

The clock is pinned to **Thursday 6 August 2026, 16:40** — twenty minutes before
the cut-off, so "does this get on today's bench?" is the live question when you
open the demo. **Nothing anywhere reads a real clock**, which is what lets every
date be asserted in a test and reproduced on the droplet.

Worked example, asserted in `src/lib/calendar.test.ts`: a set of coasters
ordered at the pinned moment takes three studio days (Thursday, Friday,
Saturday), comes off the bench on Saturday, and is **posted by Tuesday 11
August**. The running demo says the same sentence on the product page.

## The engines

Both are pure and deterministic: no `Date.now()`, no `Math.random()`, no DOM, no
network. The clock is always passed in, and `src/sources.test.ts` enforces that
over the tree rather than trusting a comment.

| Module | What it owns |
|---|---|
| `src/lib/calendar.ts` | The studio week, the 17:00 cut-off, and studio-day arithmetic. Three engines and two views read it. |
| `src/lib/orders.ts` | Lead times by kind, the basket's ship-by (its **longest** line), the order machine, **the proof gate**, spoil-and-remake, and materials. |
| `src/lib/catalogue.ts` | The option graph — fourteen pieces, six materials, the quantity breaks — as data with no display strings in it. |

Lead times, in studio days: coasters and keyrings **3**, printed pieces **4**,
slate signs **5**, glazed ceramics **10** (they are fired twice).

### The proof gate

A piece cannot leave *To make* until its picture is approved, and **the refusal
names what is missing** — whether the picture has not been sent yet or has been
sent and is waiting on a reply. Those need different actions from the maker, so
they are different sentences. A silent bounce is the worst thing a
drag-and-drop board can do.

### There is no finished-goods stock

The only inventory in this app is **materials** — sheets of walnut and birch
ply, slate blanks, filament, glaze — and it belongs to the maker. No
shopper-facing surface anywhere shows a stock count or a scarcity badge. Where a
material is running short, the shop says *"made in small batches, while we still
have walnut"* — naming the shelf it actually looked at, so a stoneware mug says
*glaze* and a printed pot says *filament* — because inventing urgency is not
this shop's voice.

Both halves of that are asserted. `orders.test.ts` checks the data shape, and
`sources.test.ts` holds the copy — as a **rule rather than a phrase list**, in
all eight languages, over every file that renders. Three rules: nothing may say
a made piece is on a shelf; nothing may put a **count** beside a word of
remainder (*left*, *übrig*, *剩*, *متبق*, each of which is an ordinary word on
its own); and nothing anywhere may hurry the reader. The list it replaced was
seven English regexes over two directories, and *"Just 2 left · 1 remaining ·
Selling fast"* passed it.

## Personalization, and the hole left for it

Many pieces are personalized. In this build the shop handles that the plain way,
which is also the honest way most small shops really work: a **"Make it yours"**
note field with a character limit, a live counter, the maker's own instructions,
and a picture sent for approval before anything is cut.

That is a **designed, finished screen**, not a placeholder. The Live Personalizer
add-on replaces the whole block with a live visual preview later — so its
arrival is a visible increase in capability rather than the repair of a broken
page. Underneath it sits one muted line — *"This is the only part of this page
an add-on changes."* — and that is the entire empty state: no dashed box, no
upsell. The line belongs to the **page**, not to the slot, so it reads the same
whichever of the two the slot happens to be drawing. The bench's own piece
settings carry no such line, because the slot there has nothing to explain.

## What is in this build

**The shopper's side is complete**: the shop with its material-textured tiles
and filters, a piece's page, the basket, the checkout, the confirmation, looking
an order up with the proof approve / ask-for-a-change action, About us, and the
five pages the footer links to — postage and the calendar, looking after it,
order again, ask us for something, and if something's wrong.

**The maker's side is complete too**: Today (the four-column board, with drag
*and* a "…" menu on every card, the proof gate refusing a locked move by name,
KPI chips and the "Batch these" strip), the batch sheet, the cut list, one
order, the orders list, proofs, the post office run, customers, the pieces and
their personalization settings, materials, machines, the stocktake, and the
add-on shelf.

## Cross-order batching

**This is the thing that makes it a workshop rather than a task list.** A print
works imposes one job onto N sheets; Birch Row packs pieces from **different
orders** onto **one sheet**. `src/lib/batch.ts` groups the queue by machine and
material, packs a sheet of a stated size with a kerf gap, and returns the
placements, the sheet-use percentage and the **overflow list for the next
sheet**. "Start the batch" then moves every included piece to *Making* in one
action and books the machine.

The demo shows it: nine pieces from **three different orders** — Priya's
bookmarks, Sam's coasters and Theo's cake topper — on one 600 × 400 sheet at
33.3% use, and one press puts all three on the laser.

## The nine add-on slots

Nine places in this shop are open to an add-on, and **three of them speak when
they are empty**:

| Slot | When nothing fills it |
|---|---|
| `product.options.personalize` | the "Make it yours" note field, with its counter |
| `checkout.delivery.methods` | "These are the studio's own postage options." |
| `order.dispatch.panel` | "We post everything ourselves — you'll get a note when it goes." |
| `cart.line.preview` | **nothing at all** |
| `order.dispatch.actions` | **nothing at all** |
| `order.line.actions` | **nothing at all** |
| `product.admin.panel` | **nothing at all** |
| `settings.add-on.panel` | **nothing at all** |
| `nav.add-on.routes` | **nothing at all** |

A dashed placeholder drawn for one of the silent six would be the defect —
their absence is not. There is no `SlotEmpty` component in this repo at all:
a ready-made dashed box sitting in the shared primitives is one import away
from every slot that must not have one, so it was deleted rather than left
unused, and the three that speak say something specific enough to be written
where it is said.

**Both halves of that are asserted by RENDERING the app.**
`src/add-ons/slotRender.test.tsx` mounts every host surface in a DOM, twice —
with nothing connected and with both add-ons on — and collects the slots React
actually reached. A silent slot that renders so much as one byte fails; a
speaking slot that stops saying anything fails; and a slot that is declared and
never drawn fails, because a slot is only counted when it is drawn. That last
one used to be a grep for `slot="…"` over the sources, which a mount inside a
**comment** satisfied. A slot a host declares and never draws is worse than an
absent one, because an add-on author reads the list and writes code against it.

`order.dispatch.actions` was missing for a release, and the suite had written the
omission down as an invariant — `isHosted(…) === false` — which is how a gap
survives a review. It is mounted now, and hosting it is what lets an add-on
written for another shop run here at all.

Both add-ons this build vendors arrive switched **off**. Every screen a reviewer
opens first is the screen a maker with nothing connected sees.

## Running it on a real database

The SPA above runs on the seeded fiction with nothing behind it. `docker-compose.yml`
brings up the whole product instead — the shop, Postgres and the **generated
Adminium dashboard**, which is the back office nothing in the SPA tries to be:

```bash
cp .env.example .env      # then set ADMINIUM_SECRET — openssl rand -hex 32
docker compose up
```

- the shop → <http://localhost:8080>
- Adminium admin → <http://localhost:4600>, auto-generated from the schema

Both halves run the same studio: a piece moved across the bench on `:8080` is
the row an administrator opens on `:4600`, and the catalogue the shop prices
from is edited there rather than in the SPA. `Dockerfile` and `Caddyfile` build
and serve the static SPA on their own if that is all you want, and
`.do/deploy.template.yaml` deploys exactly that as a static site.

### The database, and the demo rows

`db/schema.sql` is the **eight tables `manifest.json` asks for**, table for
table and column for column: `customers`, `products`, `materials`, `machines`,
`orders`, `order_lines`, `proofs`, `stock_movements`. There is no
finished-goods column anywhere in it, because there is no such thing in this
app.

Demo rows load on first boot unless you set `DEMO_DATA=0`, and that choice is
not permanent in either direction:

```bash
npm run demo:status    # what is loaded, table by table
npm run demo:import    # load the demo rows
npm run demo:wipe      # remove them — your own rows and the schema stay
npm run demo:reset     # wipe, then import a fresh copy
```

`db/seed.sql` is **generated, not written**: every row is read out of
`src/data/demo.ts` and the engines beside it, so the database and the SPA cannot
drift into showing two different studios. The same twelve customers, the same
twelve live orders and sixteen posted ones, the same ten stock rows with
`ply-4mm` under its reorder point — with every total put through
`piecesTotalCents()` and every shelf movement through `consumptionForLine()`
rather than typed in by hand.

```bash
node db/generate-seed.mjs           # rewrite db/seed.sql
node db/generate-seed.mjs --check   # fail if it is stale, write nothing
```

`db/README.md` has the rest, including how a wipe knows which rows are the demo's.

## House conventions

- **Eight locales, full parity, real translations**: `en-US`, `de-DE`, `fr-FR`,
  `cs-CZ`, `da-DK`, `zh-CN`, `zh-TW`, `ar-EG`. A missing translation is a
  **compile error**, not a runtime fallback to English.
- **CSS logical properties only.** The app renders RTL for Arabic with no RTL
  stylesheet; `sources.test.ts` fails on a single `margin-left`.
- **A number in a sentence is formatted, never `String()`d.** `t()` runs every
  numeric placeholder — including a plural's own `{count}` — through the
  reader's `Intl.NumberFormat`, and `<Mono>` does the same for a bare numeric
  child, so Arabic reads *"جاهزة خلال ٣ أيام عمل"* rather than a Latin 3 beside
  Arabic-Indic prices. Both seams are asserted in `src/i18n/numerals.test.tsx`.
- **No screen counts days.** All calendar arithmetic lives in `lib/`; a view
  asks for a *named* day (`postDay`, `fortnight`, `shopperStageDates`) and never
  computes one. `sources.test.ts` holds that with no exception list, because the
  one exception it used to have is where a plain weekday got counted.
- **No photography.** Every piece is a CSS tint plus a material texture — wood
  grain as repeating gradients, slate as a mottled radial, ceramic as a soft
  sheen, resin as flat matte — under an oversized Lucide icon and a mono size
  chip.
- **The `DataSource` seam** (`src/data/source.ts`) is the one file to change to
  point this app at a real Adminium deployment.

## The manifest

`manifest.json` is the marketplace's document about this app: `kind: "app"`, key
`maker`, publisher `adminium`, the eight tables it needs, the dashboard pages it
installs, and the three capabilities it declares (`payments`, `file-storage`,
`email-delivery` — and deliberately not `realtime`, because a queue two people
watch from the same room does not need it). `src/manifest.test.ts` puts it
through the real validator and fails the build if the bench machine, the
catalogue's vocabularies or the two tables the Live Personalizer mounts on ever
stop matching `src/lib/`.

## Licence

AGPL-3.0-only — see [`LICENSE`](LICENSE). The people, the orders and the studio
are invented.

## Add-ons

The shop hosts **nine** of the eleven slots in the closed registry (24 §5.4)
and vendors **two** add-ons from the
[`add-ons`](https://github.com/Adminiumjs/add-ons) monorepo: the **Live
Personalizer** and **DHL Shipping**.

Both arrive switched OFF, independently, and that is the demo device rather than
an oversight: every screen a reviewer opens first is the screen a maker with
nothing connected sees — a plain note field with a live counter, the maker's
instructions and a proof promise, which is a *finished* screen and not a gap
(24 D19) — and one toggle in the dock turns the same block into a live preview
of the piece with the customer's own words cut into it. Toggling either back
leaves no orphan control behind, which `addOns.test.ts` and a browser walk both
check.

**DHL Shipping is the cross-app proof (24 D21, AC20).** It was written for the
Print Shop months before this app existed and is vendored here with not one byte
changed in its package: registration was the whole integration. It fills four
slots and this shop mounts all four; the fill it does NOT ship — `artwork.sources`
— is a print works' surface this shop has no use for, and an add-on filling a
slot its host does not mount is dropped in silence, which is what makes "the same
add-on, unchanged" possible at all.

Its `manifest.json` names both apps. It did not, for a release: the add-on ran
here, was demonstrated here and went on declaring `attaches: [{ app: "printing" }]`,
so the one artefact an installer reads said the thing the demo disproved. Adding
this app turned out to need one more repair, because the manifest also asked for
`records:jobs:read` — a table only the print works has, and one this add-on never
reads: a host hands it the parcel, the two addresses and its own order reference
across the slot payload. The scope is gone and the claim is checkable, on every
run, by the add-on monorepo's `packages/host/src/manifest-schema.test.ts`.

**The Live Personalizer names only this app**, for the mirror-image reason. It
would run in the print works and the print works mounts none of the surfaces it
draws on, so an install there would give a shop a settings form for a feature with
nowhere to happen. An attach claim that resolves to no working surface is a promise
to an installer, not a fill that harmlessly does not render, and the same suite
gates it.

```
scripts/sync-add-ons.sh status   what is vendored, and whether it has drifted
scripts/sync-add-ons.sh sync     re-copy from ../add-ons
scripts/sync-add-ons.sh list     the file list each package contributes
```

The monorepo is the source of truth; a hand-edit under `src/add-ons/vendor/` is
invisible until it is a bug in two places at once, which is what `status` is for.
