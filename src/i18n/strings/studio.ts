/**
 * The studio's words that the bench's strings (`bench.ts`) do not already
 * carry: the screens the studio reads its orders, proofs and post on, as the
 * reworked app draws them. Where `bench.ts` already says the comp's words, the
 * screens use its key and its translations.
 *
 * English only for now: each is marked `en()`, so the other seven locales
 * fall back to it until they are translated (the deferred keys are counted in
 * `untranslated.json`).
 *
 * The vocabulary ban in `bench.ts` holds here too: no `pricing`, `plan`,
 * `tier`, `billing`, `upgrade`, `/mo` or `free`, in any language.
 */
import { en } from "../untranslated.ts";

export const studio = {
  "en-US": {
    // ── the shell ───────────────────────────────────────────────────────────
    "studio.menu": en("Menu"),
    "studio.close": en("Close"),
    "studio.cancel": en("Cancel"),
    "studio.search.placeholder": en("A reference, a name, a piece"),
    "studio.search.label": en("Find an order or a product"),
    "studio.theme": en("Switch light or dark"),
    "studio.calendar.title": en("STUDIO CALENDAR"),
    "studio.calendar.week": en("{from} to {to}. Closed {closed}."),
    "studio.calendar.open": en("Open every day."),
    "studio.footer": en("© {year} {studio} · {address}"),
    "studio.loading": en("Opening the workshop"),
    "studio.failed": en("The workshop could not be read: {why}"),
    "studio.retry": en("Try again"),
    "studio.refused": en("Adminium did not take that: {why}"),
    "studio.moved": en("That changed while you were looking. Here it is as it is now."),
    "studio.notAllowed": en("Your role does not let you do that."),

    // ── today ───────────────────────────────────────────────────────────────
    "studio.today.closed": en("{day} · the studio is closed today"),
    "studio.kpi.waiting": en("order waiting on a customer|orders waiting on a customer"),
    "studio.kpi.hm": en("{hours}h {minutes}m"),
    "studio.board.label": en("The bench"),
    "studio.lock.waiting": en("Waiting on the customer's yes"),
    "studio.lock.unsent": en("Waiting on the proof — send it first"),
    "studio.ship.post": en("post {day}"),
    "studio.ship.late": en("late · {day}"),
    "studio.ship.posted": en("posted"),
    "studio.card.open": en("Open"),
    "studio.card.more": en("More for {ref}"),
    "studio.card.design": en("Customised"),
    "studio.card.plain": en("plain"),

    // ── one order ───────────────────────────────────────────────────────────
    "studio.order.meta": en("{customer} · {town} · ordered {day} · charged {total}"),
    "studio.stage.posted": en("Posted"),
    "studio.stage.cancelled": en("Cancelled"),
    "studio.chip.waiting": en("waiting on the customer's yes"),
    "studio.chip.unsent": en("proof not sent"),
    "studio.order.designed": en("Designed by the customer · {layout}"),
    "studio.order.designedPlain": en("Designed by the customer"),
    "studio.order.makeProof": en("Make the proof"),
    "studio.order.makeFiles": en("Make the files"),
    "studio.order.spoiled": en("{count} spoiled and remade"),
    "studio.order.held": en("{count} piece waits on its proof.|{count} pieces wait on their proof."),
    "studio.order.nothingToMove": en("Nothing on this order can move there now."),
    "studio.log.sent": en("Proof {version} sent"),
    "studio.log.sentDetail": en("E-mailed to {customer} — waiting on a reply."),
    "studio.log.approved": en("Approved"),
    "studio.log.approvedDetail": en("Said yes to the proof."),
    "studio.log.changeAsked": en("Change asked"),
    "studio.log.superseded": en("Sent again"),
    "studio.log.reminded": en("Reminder sent {day}"),
    "studio.log.none": en("No proof has gone yet."),
    "studio.order.left": en("{amount} left"),
    "studio.order.service": en("The service {customer} chose at checkout. Postage is done at the counter."),
    "studio.order.posted": en("Posted {day} with {service}."),
    "studio.order.tracking": en("Tracking number {number}"),

    // ── the proof sheet ─────────────────────────────────────────────────────
    "studio.proof.for": en("The picture that goes to {customer} for {ref}."),
    "studio.proof.none": en("Nothing on this order is waiting for a proof."),
    "studio.proof.version": en("Version {version}"),
    "studio.proof.notMade": en("The proof of this design is not made yet. Make it on the line's page, then send it from here."),
    "studio.proof.alt": en("The proof of {name} for {customer}"),
    "studio.proof.cannotDraw": en("This browser could not draw the picture of the words."),
    "studio.proof.explain": en("They see this and either approve it or ask for a change. Nothing goes on the machine until they say yes."),
    "studio.proof.send": en("Send — we'll e-mail {customer} the proof"),
    "studio.proof.sent": en("Proof e-mailed to {customer}.|Proofs e-mailed to {customer}."),
    "studio.proof.missing": en("{count} design has no proof made yet.|{count} designs have no proof made yet."),

    // ── spoil and remake ────────────────────────────────────────────────────
    "studio.spoil.body": en("How many of the {name} went wrong? They come off the shelf and the piece goes back in the queue."),
    "studio.spoil.howMany": en("How many"),
    "studio.spoil.record": en("Record it"),
    "studio.spoil.invalid": en("Put in how many, 1 or more."),
    "studio.spoil.done": en("Recorded. {count} back on the sheet and the piece is queued again."),

    // ── products ────────────────────────────────────────────────────────────
    "studio.products.lead": en("LEAD"),
    "studio.products.days": en("{days} d"),
    "studio.machine.laser": en("The laser"),
    "studio.machine.printer": en("The printers"),
    "studio.machine.kiln": en("The kiln"),
    "studio.product.customiser": en("Set up for the Customiser — shoppers design it there."),
    "studio.product.customiserLink": en("Its designs, in the Customiser"),
    "studio.product.limitMissing": en("Put in a character limit."),
    "studio.product.limitRange": en("Use a number from 1 to 80."),
    "studio.product.promptMissing": en("Tell the shopper what to write."),
    "studio.product.save": en("Save"),
    "studio.product.unsaved": en("Not saved yet."),
    "studio.product.saved": en("Saved. The product page uses these."),
    "studio.product.savedToast": en("Saved. {name} uses the new settings now."),
    "studio.product.none": en("That product isn't in the shop."),

    // ── orders list ─────────────────────────────────────────────────────────
    "studio.orders.ref": en("REF"),
    "studio.orders.who": en("WHO"),
    "studio.orders.what": en("WHAT"),
    "studio.orders.charged": en("CHARGED"),

    // ── proofs ──────────────────────────────────────────────────────────────
    "studio.proofs.for": en("for {customer}"),
    "studio.proofs.remind": en("Send a reminder"),
    "studio.proofs.reminded": en("Reminder sent {day}"),
    "studio.proofs.remindedToast": en("Reminder e-mailed to {customer}."),

    // ── the post office run ─────────────────────────────────────────────────
    "studio.post.packed": en("Packed: {ref}"),
    "studio.post.tracking": en("DHL tracking number for {ref}"),
    "studio.post.done": en("Posted — we've e-mailed {count} customer|Posted — we've e-mailed {count} customers"),

    // ── customers ───────────────────────────────────────────────────────────
    "studio.customers.charged": en("charged in all"),
    "studio.customers.chargedOne": en("Charged"),
    "studio.customers.closed": en("Customers are the owner's to read."),

    // ── not here ────────────────────────────────────────────────────────────
    "studio.notFound.title": en("Nothing on this bench"),
    "studio.notFound.body": en("That page isn't in the workshop. It may have been an old link."),
    "studio.notFound.back": en("Back to today"),
  },
  "de-DE": {},
  "fr-FR": {},
  "cs-CZ": {},
  "da-DK": {},
  "zh-CN": {},
  "zh-TW": {},
  "ar-EG": {},
};
