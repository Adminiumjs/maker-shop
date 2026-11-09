# Maker Shop

A made-to-order shop and its studio, installed into [Adminium](https://adminium.dev).
Shoppers choose a piece, its material, size and finish, make it their own in the
Customiser (their words, their logo, a ready-made design), and see the day it will
be posted; the studio proofs every piece with words on it, batches pieces from
different orders onto one sheet of a machine, and posts them. Adminium decides
every price, quantity break, postage rate, post-by date, order number and status —
the pages only ask.

**Nothing is held in stock.** Every order is made after it is placed. The only
stock is the studio's materials: sheets, blanks, filament and glaze.

The demo is dressed as **Birch Row**, a fictional two-person studio in Settle that
sells laser-engraved coasters, slate house signs, 3D-printed pieces and stoneware
mugs. Its clock stands at **Thursday 6 August 2026, 16:40** — twenty minutes before
the five o'clock cut-off — and the studio works Tuesday to Saturday.

**Live demo → [adminium.dev/demo/maker-shop](https://adminium.dev/demo/maker-shop)**

## What it needs

- Adminium **0.3.51** or later, on SQLite, Postgres or MySQL.
- The **Customiser** add-on (1.0.22 or later): it is where a shopper makes a piece
  their own, and the order line names the design they made. Adminium installs it
  with the app.
- Nothing else. Five add-ons are offered at install, and the app is whole without
  any of them:
  - **DHL shipping** — book a collection for a parcel from the post office run,
    with the service the shopper chose already picked, print its label, and send
    the shopper the tracking number. Without it, the "on its way" e-mail names the
    service and has no tracking number.
  - **Barcode labels** — a label for each piece on the cut list, and one for each
    parcel.
  - **Inventory** — the sheets, blanks, filament and glaze each batch takes, kept
    as stock.
  - **Invoices & Receipts** — a receipt for an order, e-mailed and printed.
  - **Holiday calendars** — the coming public holidays on the studio's Machines
    screen, each added as a closure in a tap.

## What it does

**For shoppers** (the app's customer side):
- The shop and a piece's page: its options, its quantity breaks, the price for
  each quantity and the post-by date, all worked out by Adminium before anything
  is placed.
- "Customise" opens the Customiser's editor on the page: the shopper's words, a
  logo or a ready-made design, checked for what the machine can make.
- The basket and the checkout: name, e-mail, address and a postage service. One
  write places the order, its lines, their designs and the shopper, checked
  against the total the shopper saw.
- An e-mail with the order's own link; the order's page with its timeline and its
  proofs, each answered there ("Yes, make it" or "Ask for a change"); finding an
  order by its number and a code e-mailed to the shopper; their designs; ordering
  again.
- Asking for something made, and telling the studio something went wrong with an
  order — each copied back to the shopper by e-mail.
- Postage and the studio's calendar, looking after a piece, About us, search.

**For the studio** (the app's staff side): Today's board with the proof gate (a
piece with words goes to the bench only once its proof is approved), one order,
proofs, the post office run, customers, products and their lettering settings,
batches and the cut list, machine time, materials and the stock count. The
Customiser's own panel opens on these screens in a sheet: a line's design as it
will be made, where the proof and the machine's files are made, and a product's
base. A proof can also be a PDF or a picture made elsewhere, sent as it is. The
name chip signs out. Roles: **owner** (everything, including setting up what
shoppers customise on the Customiser's set-up page, finding and erasing a
customer on Adminium's privacy page and choosing the studio's closed days in
Holiday calendars), **maker** (the bench, proofs and the Customiser's panel,
batches, stock; never a price or a customer's details beyond the order) and
**packer** (posting what is ready; no panel).

**In the dashboard** (the Maker Shop section): orders, proofs, requests, problems,
the catalogue (products, options, postage), the workshop (materials, stock,
machines, bookings, batches, closures), customers, the e-mails sent, and the
studio's settings. A proof added on the Proofs page answers the line's proof
still out, as one sent from the studio's screens does: Adminium marks the
earlier one "Sent again" in the same save, and an approved proof stays approved.

**E-mails.** Order received, proof ready and the one proof reminder (each with
the proof's picture, unless the proof is a PDF), order posted, and the copies of
a request or a problem go to the shopper, in the language the order was placed
in (eight languages); a request, a problem and a change asked to a proof are
copied to the studio's own address. All of them are service mail:
the do-not-email list never stops them, none has an unsubscribe line, and a reply
reaches the studio's e-mail.

## Installing it

Install Maker Shop from Adminium's app catalog and pick the database it should
use. Adminium creates the app's tables (each named `maker_…`), installs the
Customiser, and makes the dashboard pages, the three roles, the shop's browser
keys and the e-mails. Tick sample data at the install step to start with Birch
Row's Thursday, or add it later from the app's settings.

Give the studio's people their roles under Staff. **Owner** also sets up what
shoppers customise (the bases, ready-made designs, fonts, finishes and priced
features) on the Customiser's set-up page, `/add-ons/customiser/customiser`,
with no Customiser role beside it: Birch Row's own set-up only, so with another
shop app on the same Adminium its bases and designs are read there, never
changed. The Customiser's own settings are read there (and by **Maker**, whose
proofs cut a one-colour logo at the shop's own line), and changed by its
**Customiser designer** role.

Once installed, the studio's screens are served at `/apps/maker/staff/` and the
shop at `/apps/maker/customer/`. A studio can also give the shop a domain of its
own.

**Coming from 0.1.x?** The 0.1 Maker Shop was an example with its own database,
and the Live personalizer add-on in place of the Customiser. 0.2 is a different
app on new tables:

1. **Detach and remove Live personalizer** from the app on its Add-ons page. It is
   retired; the Customiser does what it did, and more.
2. **Then install Maker Shop 0.2** on the same database. Its tables are all named
   `maker_…`, so the old `products`, `orders`, `customers` and the rest stay
   exactly as they are, row for row, and nothing is carried over from them.
   Drop them yourself once you no longer need them.

## Local development

```bash
npm install
npm run dev        # the demo: the shop and the studio on Birch Row's sample, in the browser
```

| Script | What it does |
| --- | --- |
| `npm run dev` | Start the Vite dev server on the in-browser demo. |
| `npm run dev:staff` | The dev server on the studio's hosted side (it reads its session from the Adminium that serves it). |
| `npm run build` | Type-check and build to `dist/` (the demo). |
| `npm run build:demo` | Build the website's demo, at base `/demo/maker-shop/app/`, with its `demo.json`. |
| `npm run build:surface` | Build the two sides Adminium serves (`dist-surface/maker/`). |
| `npm run manifest` | Write `manifest.json` from `src/manifest/`. A test fails when the two disagree. |
| `npm run manifest:check` | Validate `manifest.json` with the vendored validator. |
| `npm run sample` | Write the sample bundle (`seeds/`) from `src/sample/`. |
| `npm run sync:customiser` | Vendor the Customiser's editor from its release (`vendor/customiser/`). |
| `npm test` | Run the suite. |
| `npm run contract` | Run the contract against a built Adminium (`ADMINIUM_REPO`) and add-ons (`ADD_ONS_REPO`) checkout, on SQLite and, with `TEST_POSTGRES_URL` / `TEST_MYSQL_URL`, Postgres and MySQL. |

## Project structure

```
manifest.json  what Adminium installs (written from src/manifest/)
seeds/         the sample bundle, the app's rows and the Customiser's (written from src/sample/)
src/
  manifest/    the tables and their rules, the pages, the roles, the shop's doors,
               the e-mails in eight languages, the people, the add-ons
  shop/        the shopper's side: its screens and its door (the public API)
  studio/      the studio's side: its screens and its door (the staff session)
  add-ons/     the host the studio mounts DHL's dispatch flow with: the client half
               Adminium serves for the app (`connected.ts`), or in the demo a
               vendored copy that answers from its demo carrier
  demo/        the in-browser demo for the website's card (never in a hosted build)
  sample/      Birch Row's Thursday, which both the bundle and the demo are made from
  contract/    the contract with a built Adminium (`npm run contract`)
  i18n/        the 8-locale runtime and the keyed strings
  styles/      design tokens and base styles
  testing/     the product's manifest validator, vendored for the tests
vendor/        the Customiser's editor, as its release ships it
```

## License

[AGPL-3.0](LICENSE) © 2026 Maker Shop. An example app for Adminium.

## Building on this app with a coding agent

The Adminium skills teach Claude Code, Codex and other agents to build and change an app:
`npx skills add Adminiumjs/skills` — https://github.com/Adminiumjs/skills
