# Changelog

## 0.2.5 (11 November 2026)

Needs Adminium **0.3.54** and asks for the add-ons at **1.0.26**.

- **A shopper can order a ready-made design again.** With the Customiser 1.0.24
  and 1.0.25 the shop's editor refused every ready-made design ("This design
  can't be made as it is"); 1.0.26 takes them. Plain pieces were not affected.
- **What 0.2.4 said about numbering order lines, put right.** 0.2.4 said its
  update numbers the order lines already there. It did not: a line added to an
  order on the dashboard before 0.2.4 kept no place on its order, so its label
  code read the order's number alone ("BR-2291") and its proof "BR-2291 #1".
  Adminium **0.3.54** numbers them at every update: each order's lines with no
  number take the next numbers after the ones it has, in the order they were
  added ("BR-2291/3"), the numbers already there stay, and their proofs follow
  ("BR-2291/3 #1"). This update does it for a studio already on 0.2.4 too.
- **A line moved to another order keeps its number.** Its label code takes the
  new order's number with the line's old place ("BR-2287/4" on an order of
  one line), and a move into an order that already has a line in that place is
  refused. 0.2.4 said only that a proof follows its line when the line moves.
- **Each proof e-mail names its piece.** Two pieces of one order proofed
  together gave two identical "Proof 1 for BR-2291 is ready" e-mails. The
  proof, reminder and change e-mails now name the piece by its label code in
  the subject ("Proof 1 for BR-2291/1 is ready") and by its code and what it is
  in the e-mail, in all eight languages. The studio's Proofs page and an
  order's proofs name each piece the same way.
- **The sample's parcels go on days the studio is open.** Posted orders were
  dated back from the day the sample was added, so BR-2252 and BR-2260 could
  be posted on a Sunday. A posted order's dates now keep their weekdays, as
  the planned days do, and stay in the past whatever day the sample is added.
- **"Send a proof" looks unavailable while it is.** With no proof made yet its
  button was drawn in the accent colour, dimmed; it is now drawn plain.
- The demo's "A proof waiting for you" sends its proof with a picture, as the
  studio does.

## 0.2.4 (10 November 2026)

Needs Adminium **0.3.53** and asks for the add-ons at **1.0.25**. The update
numbers the order lines already there.

- **The Customiser's panel draws on the studio's screens again.** With the
  Customiser 1.0.24 a line's panel stayed on "Loading"; 1.0.25 draws it.
- **Two customised pieces in one order.** With the Customiser 1.0.24, an order
  that holds two pieces a shopper made their own is taken: each design's
  version is labelled by its design, where two were refused as the same.
- **A proof is made with its picture.** A proof added on the dashboard without
  a picture replaced the one the customer had at once, so their order page lost
  its answer buttons until the picture came. A proof made on the dashboard or
  in the studio now needs its picture, and the Proofs form marks it as needed;
  imported proofs and the sample's are kept as they come. A proof's "Sent" is now when it
  really went.
- **A piece made but not yet posted counts as late.** Studio Today said
  "0 pieces late" beside a card marked late in Ready to post; a piece counts as
  late until it is posted.
- **Machine time booked counts a run past midnight.** A batch or a firing that
  runs on past midnight now counts its hours on each day it runs, so Today and
  Machines no longer say "0h 0m" while it runs.
- **Order lines are named by their label code.** Pickers and links name a line
  "BR-2291/1", with what it is under it in the Proofs and stock forms, so two
  orders' coasters read apart. Adminium numbers each line's place on its order,
  a line added on the dashboard too. A proof is named by its line and number,
  "BR-2291/1 #3", not by how it was drawn, and follows its line if the line
  moves to another order.
- **The sample posts every order by its post-by.** BR-2241, BR-2247 and BR-2258
  came in after the five o'clock cut-off, so they are posted on their post-by
  day, not a day after it.
- **The New Proof form offers only the chosen order's lines** in its line
  picker (Adminium 0.3.53).
- **The pages import only the add-on code that fills a slot.** From Adminium
  0.3.53 the add-ons list also names add-on pages and record panels, and their
  code is never taken for a slot's.

## 0.2.3 (10 November 2026)

Needs Adminium **0.3.52** and the add-ons **1.0.23**.

- **The maker's proofs use the shop's own one-colour line.** The **Maker**
  role now reads the Customiser's settings, so a one-colour logo on a proof is
  cut at the line the shopper saw, not at 50 %.
- **The owner sets the Customiser's settings.** The set-up page's new "Shop
  settings" keeps the one-colour line, the bleed, the safe line, the smallest
  line and the lowest picture quality, and **Owner** changes them there. They
  are one set for the whole Adminium: with Print Shop installed too, both
  shops share them, and a change by either owner applies to both.
- **Each shop keeps to its own Customiser rows.** With another shop app on the
  same Adminium, **Owner** no longer lists, changes or removes its bases and
  designs, and gives every new set-up row Birch Row's name. The Customiser's
  starter fonts stay the owner's to use and upload, never to remove, and no
  font of the shop's is made a starter. **Owner** and **Maker** read, proof and
  make files for Birch Row's own customers' designs only.
- **A proof is e-mailed only once it has its picture.** A proof added on the
  dashboard without one was e-mailed with nothing to look at; it is now
  e-mailed when its picture is added, and until then the customer's order page
  doesn't offer a design's proof for an answer.
- **A proof sent again reads as replaced on the studio's order page.** The
  order's Proofs card said an earlier proof was still "waiting on a reply"
  after the next one went; it now says which proof replaced it.
- The dashboard's Proofs form shows each order by its number, the customer's
  name under it. A proof added from an order's own page uses the same form,
  its picture field included (Adminium 0.3.52).
- **No sample date lands in the future.** Added early in the week, the sample
  said an order was placed "in 19h" and a proof sent on a day still to come.
  Orders, proofs, answers and stock now count back from the day the sample is
  added, and so do a posted order's post-by and the running batch's booking;
  the other post-by dates, bookings and the closure keep their weekdays.
- **The sample holds one proof out per piece.** BR-2262's and BR-2288's first
  proofs, a change asked on each, now read "Sent again" by their second, as
  Adminium moves them when a proof is made; the change asked stays on them.
- The Customiser's "Make the proof" waits until the design has loaded, and
  every card on "Choose a design" shows its own design (Customiser 1.0.23).

## 0.2.2 (8 November 2026)

Needs Adminium **0.3.51** and the add-ons **1.0.22**.

- **The sample shows the shop's own photos, models and cut files.** Birch Row's
  pieces carry a photo each, the 3D-printed ones their models and the laser-cut
  ones their cut files, and the sample adds a box kit, a layered sign, three
  prints and a batch. The website's demo shows them too.
- **The owner sets the shop up with no Customiser role beside Owner.** The
  Customiser's set-up page (`/add-ons/customiser/customiser`) reads and saves
  for **Owner** alone: the bases, pieces, areas, ready-made designs and their
  parts, fonts, palettes, colours and priced features. The Customiser's own
  settings are read there and stay with its **Customiser designer** role.
  Upgrading from 0.2.1, an owner who was given that role only to set up may
  have it taken away.
- **A proof sent again answers the one before it, wherever it is made.** A
  proof added on the dashboard's Proofs page now marks the line's proof still
  out "Sent again" in the same save, as one sent from the studio's screens
  does; an approved proof stays approved. The studio's screens no longer make
  that move themselves, and the maker's role no longer changes a proof's
  answer.
- **Erasing a customer takes every proof picture.** A proof made again leaves
  the picture it replaced in the bin; erasing the customer now takes that one
  too, and Adminium's privacy page counts the same files to find as erasing
  takes.
- The Customiser's 3D models are seen from above, a printed piece's preview in
  the plastic the shopper picked (Customiser 1.0.22).

Earlier releases are described in the git history and the tags.
