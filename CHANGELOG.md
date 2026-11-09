# Changelog

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
