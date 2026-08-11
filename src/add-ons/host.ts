/**
 * AddOnHost — the seam add-ons plug into (24 §5.9).
 *
 * COPIED FROM `print-shop`, NOT ABSTRACTED (18 D7's rule for the `DataSource`
 * seam, applied here). Two standalone template repos published to the
 * Adminiumjs org share no package, and a shared one would have to be published,
 * versioned and installed before either could be cloned and read — which is the
 * thing these repos exist to avoid. The file is meant to be recognisable line
 * for line in both, and the small differences are the app's own: Birch Row
 * hosts nine slots rather than five, and it hands a settings form its own
 * catalogue rather than the works' (`records.ts`).
 *
 * It mirrors the `DataSource` seam exactly. In DEMO MODE (what ships here) the
 * add-on bundles are built into the app and registered from a static list, and
 * the dock's toggles flip an `enabled` set so surfaces appear and disappear
 * live. In CONNECTED MODE (Phase B) the enabled list comes from
 * `GET /api/v1/add-ons` and the bundles are `import()`ed from the server with
 * their SRI hashes. The seam does not change; only its source does.
 *
 * THE HOST NAMES NO ADD-ON AND NO ADD-ON'S FIELDS. Everything an add-on is
 * particular about — its settings and their defaults, the words on its settings
 * form, the sentence the connect dialog opens with, what a disconnect takes and
 * keeps, its own strings in eight locales — arrives through the object
 * `register()` returns. The host knows there is an add-on with settings; it
 * never knows that one of them is a carrier with a collection cut-off, or that
 * another draws letters on a piece of walnut.
 */

import type { ReactNode } from "react";

import type { PayloadFor, ShopClock } from "./payloads.ts";
import { SLOT_FILL, type SlotId } from "./slots.ts";

/** Add-on categories — the closed vocabulary of 24 D2. */
export type AddOnCategory = "artwork" | "delivery" | "payments" | "email" | "data";

/** What the shop must supply to connect (24 §5.6). */
export type ConnectKind = "none" | "api-key" | "oauth2";

/** One ticked row in the connect dialog's permission list. */
export interface Permission {
  /** i18n key under `addon.*`. */
  key: string;
}

/**
 * ONE ALPHABET: `key` is the add-on's own MACHINE key — `demo_transport`,
 * `default_font` — the same identifier its manifest declares, the same one its
 * saved values are stored under, and the same one it reads back out of the
 * payload. It is never an i18n key. The words on the control are the add-on's
 * business and it renders them itself, which is why this declaration carries no
 * label: a host that translated a setting would be writing copy for a product
 * it does not own.
 */
export interface AddOnSetting {
  key: string;
  kind: "boolean" | "time" | "text" | "multi";
  /** Options for `multi`, in the add-on's own machine alphabet. */
  options?: readonly string[];
}

/** One add-on's saved values, under its own machine keys. Opaque to the host. */
export type AddOnSettingValues = Readonly<Record<string, unknown>>;

/*
 * `SlotPayload`, and every per-slot payload, MOVED TO `./payloads.ts`.
 *
 * They were here, next to the seam, and `SampleJob` in particular showed
 * why that was not enough: it declared `trimWidthMm`, `packagingKey`,
 * `productKey` and `materialKey` under a general-sounding name — one
 * app's record with the app's name filed off. A payload is a CONTRACT
 * BETWEEN HOSTS, not a member of this app's seam, so it lives in a file
 * of its own that says so in its header.
 */

/**
 * WHAT THIS STUDIO TELLS AN ADD-ON ABOUT ITS OWN PAST, so a seeded line can be
 * true in the shop that renders it.
 *
 * Both members are HOST FACTS and neither has an honest add-on-side answer.
 * `now` is the same `ShopClock` every dated surface already takes, for the same
 * reason (see `payloads.ts`). `refs` is the studio's OWN order references,
 * newest first — `BR-2288`, `BR-2284` — because a reference is the string BOTH
 * sides already use to find the same record, and an add-on that made one up
 * would be naming an order that does not exist.
 *
 * `refs` may be empty and that is ordinary: a host with no records to point at
 * seeds nothing, and an entry naming a reference it has not got is dropped
 * rather than rendered against a blank.
 */
export interface ActivityContext {
  now: ShopClock;
  /** The studio's own order references, newest first. May be empty. */
  refs: readonly string[];
}

/**
 * A SEEDED LINE, AS THE ADD-ON DECLARES IT — relative, and referring rather
 * than naming.
 *
 * [Amended 2026-08-10, wave 4b.] This used to be the shape `ActivityEntry`
 * below still is — `iso`, `hour`, `minute`, `ref` — AUTHORED BY THE ADD-ON.
 * That is precisely the defect `ShopClock` was added to kill, surviving in the
 * one place nothing had looked at: the members read like neutral data, and
 * every one of them is a fact about a HOST. An add-on picked an instant and an
 * order reference out of the air, the host printed both verbatim, and nothing
 * anywhere compared them with the shop doing the printing.
 *
 * It was not theoretical. The shipping add-on this studio hosts is the same
 * bundle Marlow Press hosts, and it shipped with `MP-4119` and `MP-4116`
 * written into it — the OTHER shop's job references, on Birch Row's screen, in
 * a studio that has never issued a reference beginning `MP`.
 *
 * So an add-on says WHEN RELATIVE TO NOW and WHICH OF YOUR REFERENCES, and the
 * host turns that into an instant and a string it can stand behind.
 */
export interface SeededActivityEntry {
  /** How long before this studio's `now` this happened. */
  minutesAgo: number;
  /**
   * Which of `ActivityContext.refs` this line names, newest first — 0 is the
   * most recent. Leave it undefined for a line about nothing in particular
   * ("areas drawn on a new piece"), and the resolved `ref` is empty.
   *
   * An index the host has no reference for DROPS the line. That is deliberate:
   * a studio with two orders should not be shown a third line pointing at a
   * blank, and an add-on cannot know how much history a host has.
   */
  refIndex?: number;
  /** i18n key in the add-on's own bundle, taking `{when}` and `{ref}`. */
  messageKey: string;
}

/**
 * A seeded line in the manage drawer's activity list, and the shelf's
 * "last used" — AS THIS HOST RENDERS IT, after `resolveActivity` has dated it
 * against the studio's own clock and paperwork.
 *
 * The words are still the add-on's: they are what THIS add-on did, phrased in
 * its own words (`messageKey` resolves in its own bundle). A real install reads
 * the same list out of `adminium_audit_log` (24 §5.7, category `add-on`) and
 * this demo has no server to read; what a host must never do is keep a
 * hand-written history of one particular add-on, because that is a host that
 * knows which add-ons exist.
 */
export interface ActivityEntry {
  iso: string;
  hour: number;
  minute: number;
  /** The order reference the line names, or empty where there is none. */
  ref: string;
  /** i18n key in the add-on's own bundle, taking `{when}` and `{ref}`. */
  messageKey: string;
}

/**
 * The declaration that lets the connect dialog offer "use the demo instead"
 * without knowing what a carrier is (24 D11).
 *
 * An add-on that reaches a third party says which of ITS settings means "do not
 * reach it", and supplies the words for the switch. The host shows the switch,
 * skips the credential fields while it is on, and never learns the setting's
 * meaning.
 */
export interface DemoSwitch {
  /** The machine key in this add-on's own settings. */
  key: string;
  labelKey: string;
  noteOnKey: string;
  noteOffKey: string;
}

/**
 * ONE REGISTERED FILL, AND ITS PAYLOAD IS DECIDED BY THE SLOT IT NAMES.
 *
 * This used to read `AddOnFill<P = unknown>` with `AddOn.fills` typed
 * `readonly AddOnFill<never>[]`, and that pair of declarations is the whole
 * architectural defect 24 D21 tripped over. `never` ERASED the payload: a fill
 * could declare `render: (p: anything) => …` and still be assignable, so
 * nothing anywhere compared what a SCREEN passes with what a FILL reads. The
 * seam type-checked perfectly and threw three times on the first screen of the
 * second host.
 *
 * Now the parameter is the slot id and the payload is derived from it. An
 * add-on may still NARROW what it reads — `render` is contravariant in its
 * parameter, so a component asking for fewer fields is assignable and one
 * asking for a field the payload does not carry is not — which is the guarantee
 * wanted in both directions:
 *
 *   a screen passes a shape the slot does not declare → red HERE
 *   an add-on reads a field no host promises          → red in the ADD-ON's repo
 */
export interface AddOnFill<S extends SlotId = SlotId> {
  slot: S;
  /** Ties are broken by `order` then by add-on key, so the result is stable. */
  order: number;
  render: (payload: PayloadFor<S>) => ReactNode;
}

/**
 * A fill for SOME slot — the union over the registry, never `AddOnFill<SlotId>`.
 *
 * The difference is the point. `AddOnFill<SlotId>` would type `render` as
 * taking the UNION of every payload, which no real component accepts, so every
 * add-on would have to cast and the guarantee would be back where it started.
 * The distributed union pairs each `slot` literal with its own payload.
 */
export type AnyAddOnFill = { [S in SlotId]: AddOnFill<S> }[SlotId];

export interface AddOn {
  key: string;
  /**
   * The product's name, as a proper noun. NOT an i18n key: an add-on's name is
   * the name of a thing, and a translated product name would be a different
   * product. Everything ABOUT an add-on — what it does, what it can see, what
   * disconnecting keeps — is a key and does translate.
   */
  name: string;
  /**
   * A key to render INSTEAD of `name`, for a shelf entry whose "name" is a
   * description rather than a proper noun. The described-but-not-built entries
   * in `shelf.ts` are the only users and are meant to be.
   */
  nameKey?: string;
  /** Two or three words for a toggle, where the full name will not fit. */
  shortName: string;
  /** i18n key under `addon.*` for the one-line description. */
  lineKey: string;
  /** i18n key for the plain sentence the connect dialog opens with. */
  whatKey: string;
  /**
   * Two or three letters, rendered in a neutral --surface-3 tile. NEVER a real
   * company logo, drawn, traced or approximated (24 D12) — a shelf of twenty
   * add-ons has to read as one system rather than twenty logos, and a redrawn
   * mark would be a legal problem rather than a taste problem.
   */
  monogram: string;
  category: AddOnCategory;
  connect: ConnectKind;
  /** What connecting lets it do — shown as ticked rows before the shop agrees. */
  permissions: readonly Permission[];
  /** Non-secret settings a manage panel exposes, in machine keys. */
  settings: readonly AddOnSetting[];
  /** The values a shop that has changed nothing has, under those same keys. */
  defaultSettings?: AddOnSettingValues;
  /** Push saved values into the add-on's own engines. */
  applySettings?: (values: AddOnSettingValues) => void;
  /**
   * This add-on's strings in all eight locales, merged into the host's bundle
   * at registration (see `i18n/messages/index.ts`).
   */
  messages?: Readonly<Record<string, Readonly<Record<string, string>>>>;
  /** i18n keys naming exactly what a disconnect removes and what it keeps (24 D16). */
  disconnect?: { goesKey: string; staysKey: string };
  /**
   * Seeded "what it last did", newest first — DECLARED relative and referring.
   * The host dates it with `resolveActivity` and its own clock and order refs;
   * an add-on never names a day or a reference. See `SeededActivityEntry`.
   */
  activity?: readonly SeededActivityEntry[];
  /** For a credentialled add-on: the setting that means "use the demo transport". */
  demoSwitch?: DemoSwitch;
  /** The account an `oauth2` add-on is signed in to, for the dialog's confirmation row. */
  account?: string;
  /** Which company, if any, this connects to — named nominatively only. */
  namesCompany: boolean;
  /**
   * What the detail surfaces say WHERE the not-affiliated line would go, for an
   * add-on that reports `namesCompany: false` (24 AC6, as amended).
   *
   * An add-on that names no company has no relationship to disclaim, and
   * rendering nothing there is indistinguishable from having forgotten the
   * notice — so it states the positive fact, that it connects to no outside
   * company and needs no account anywhere, in its own words and in all eight
   * locales. IT IS THE ADD-ON'S COPY, not the host's.
   */
  noCompanyKeys?: readonly string[];
  /**
   * Absent or `true` for an add-on that is actually built into this demo.
   * `false` marks a shelf entry that is described honestly but has nothing
   * behind it: the screen shows a muted "Not in this demo" chip where the
   * Connect button would be. A button that does nothing is worse than no
   * button.
   */
  inDemo?: boolean;
  fills: readonly AnyAddOnFill[];
}

/** Whether an add-on can actually be switched on here. */
export function isConnectable(addOn: AddOn): boolean {
  return addOn.inDemo !== false;
}

/**
 * WHAT THIS STUDIO IS HOLDING FOR AN ADD-ON, AS ONE ANSWER.
 *
 * ── THE SENTENCE THAT WAS WRONG ABOUT THE ONE REAL COMPANY ──────────────────
 *
 * [Added 2026-08-11, wave 4b round 4.] Two surfaces asked this question and
 * they asked it differently. The disconnect confirm branched on BOTH facts —
 * what the add-on asks for and what this studio gave it — and was right. The
 * shelf CARD branched on `credentialled` alone, so an add-on that asks for an
 * account and has not been given a key fell into the same arm as one that never
 * asks, and the card printed the wrong add-on's sentence: "This one needs no
 * account. Nothing about your pieces leaves the studio." — under the name of
 * the delivery company. Both routes a reader has (the dock toggle, and the
 * connect dialog's default "Use the demo carrier" path) leave `credentialled`
 * empty, so that was the sentence every reviewer saw.
 *
 * A claim about where a customer's address goes is the last thing in this app
 * allowed to be wrong, and it was wrong because two screens each derived it.
 * So the derivation is HERE, once, and every surface maps the answer to its own
 * words:
 *
 *   "never-asks"      — `connect: "none"`. An unchanging fact about the ADD-ON,
 *                       and the only state in which "nothing leaves the studio"
 *                       is a thing anyone may say.
 *   "key-held"        — it asks, and this studio has handed one over.
 *   "asks-none-given" — it asks, and this studio has not. The state every
 *                       reviewer is in, because the demo transport (D11) is
 *                       what the dialog offers first.
 *
 * THE ARGUMENT IS DELIBERATELY THE SET AND NOT THE STORE. A pure function of
 * (add-on, what is held) is testable without a store and cannot be tempted into
 * reading a second piece of session state later.
 */
export type CredentialState = "never-asks" | "key-held" | "asks-none-given";

export function credentialState(
  addOn: AddOn,
  credentialled: ReadonlySet<string>,
): CredentialState {
  if (addOn.connect === "none") return "never-asks";
  return credentialled.has(addOn.key) ? "key-held" : "asks-none-given";
}

/**
 * A fill with the key of the add-on that supplied it, so a caller can scope.
 *
 * Parameterised by the slot it was resolved FOR, so a mount site gets a
 * `render` it can call with that slot's payload rather than a union it would
 * have to cast its way out of.
 */
export interface ResolvedFill<S extends SlotId = SlotId> {
  addOn: string;
  fill: AddOnFill<S>;
}

export interface AddOnRegistry {
  all: readonly AddOn[];
  byKey: (key: string) => AddOn | undefined;
  /**
   * Every fill for a slot from the currently-enabled add-ons, ordered. Empty
   * when nothing is enabled — the CALLER decides whether that means an honest
   * empty state in words or nothing at all (see `SLOT_EMPTY_BEHAVIOUR`),
   * because only the caller knows whether there is anything to explain.
   */
  fillsFor: <S extends SlotId>(
    slot: S,
    enabled: ReadonlySet<string>,
    forAddOn?: string,
  ) => ResolvedFill<S>[];
}

/**
 * Build a registry over a static list. Add-ons are sorted by key so the shelf
 * and every multi-fill slot have a stable order that does not depend on the
 * sequence they happened to be registered in.
 */
export function createRegistry(addOns: readonly AddOn[]): AddOnRegistry {
  const all = [...addOns].sort((a, b) => a.key.localeCompare(b.key));
  const index = new Map(all.map((a) => [a.key, a]));

  return {
    all,
    byKey: (key) => index.get(key),
    fillsFor<S extends SlotId>(slot: S, enabled: ReadonlySet<string>, forAddOn?: string) {
      const fills = all
        .filter((addOn) => enabled.has(addOn.key))
        .filter((addOn) => forAddOn === undefined || addOn.key === forAddOn)
        .flatMap((addOn) =>
          addOn.fills.filter((f) => f.slot === slot)
            /*
             * THE ONE CAST IN THE SEAM, and the runtime check on the line
             * above is what earns it: a `.filter()` predicate does not
             * narrow a generic `S` for the compiler however obvious it is
             * to a reader. Both ends stay checked — the add-on declared
             * `slot` and `render` together, and the caller asked for one
             * id and gets that id's payload type back.
             */
            .map((f) => ({ addOn: addOn.key, fill: f as unknown as AddOnFill<S> })),
        )
        .sort((a, b) => a.fill.order - b.fill.order || a.addOn.localeCompare(b.addOn));

      // A single-fill slot takes the lowest order. The one that lost is not
      // silently overridden — the Add-ons screen surfaces the conflict. Neither
      // add-on this build vendors fills the same `single` slot as the other, so
      // the demo cannot produce a conflict to show; the rule is the registry's
      // rather than this build's, which is why it is implemented anyway.
      return SLOT_FILL[slot] === "single" ? fills.slice(0, 1) : fills;
    },
  };
}

/**
 * The values every registered add-on starts from, keyed by add-on key.
 *
 * `Record<string, …>` and not a hand-written interface: the host holds these,
 * it never reads inside one, and the moment it declared the shape of an
 * add-on's settings it would have to be edited to add a second one.
 */
export type AddOnSettings = Readonly<Record<string, AddOnSettingValues>>;

export function defaultSettingsFor(addOns: readonly AddOn[]): AddOnSettings {
  return Object.fromEntries(addOns.map((a) => [a.key, { ...(a.defaultSettings ?? {}) }]));
}

/**
 * Push the saved values into whichever add-ons asked to be told.
 *
 * On startup and on every change — an add-on that keeps its own copy must not
 * have to poll.
 */
export function applyAddOnSettings(addOns: readonly AddOn[], settings: AddOnSettings): void {
  for (const addOn of addOns) addOn.applySettings?.(settings[addOn.key] ?? {});
}

/** An empty registry — what a build with no add-ons compiled in gets. */
export const EMPTY_REGISTRY: AddOnRegistry = createRegistry([]);
// ── seeded activity, dated by the host ──────────────────────────────────────

/*
 * CIVIL DATES WITHOUT A `Date`.
 *
 * The monorepo's `purity.test.ts` bans `new Date(` in everything the add-ons
 * ship, and it is right to: a bare `new Date('2026-08-05')` is UTC midnight,
 * the same literal with a time is LOCAL, and a seeded line that slid a day
 * depending on which side of Greenwich the shop's laptop was standing would be
 * the same class of bug this whole section exists to close. So the two
 * conversions are the days-from-civil pair — integer arithmetic, no timezone
 * anywhere near it. This copy holds itself to the same rule.
 */

function daysFromCivil(y: number, m: number, d: number): number {
  const shifted = y - (m <= 2 ? 1 : 0);
  const era = Math.floor(shifted / 400);
  const yearOfEra = shifted - era * 400;
  const dayOfYear = Math.floor((153 * (m + (m > 2 ? -3 : 9)) + 2) / 5) + d - 1;
  const dayOfEra =
    yearOfEra * 365 + Math.floor(yearOfEra / 4) - Math.floor(yearOfEra / 100) + dayOfYear;
  return era * 146097 + dayOfEra - 719468;
}

function civilFromDays(days: number): { y: number; m: number; d: number } {
  const shifted = days + 719468;
  const era = Math.floor(shifted / 146097);
  const dayOfEra = shifted - era * 146097;
  const yearOfEra = Math.floor(
    (dayOfEra -
      Math.floor(dayOfEra / 1460) +
      Math.floor(dayOfEra / 36524) -
      Math.floor(dayOfEra / 146096)) /
      365,
  );
  const year = yearOfEra + era * 400;
  const dayOfYear =
    dayOfEra - (365 * yearOfEra + Math.floor(yearOfEra / 4) - Math.floor(yearOfEra / 100));
  const mp = Math.floor((5 * dayOfYear + 2) / 153);
  const d = dayOfYear - Math.floor((153 * mp + 2) / 5) + 1;
  const m = mp + (mp < 10 ? 3 : -9);
  return { y: year + (m <= 2 ? 1 : 0), m, d };
}

const pad = (n: number): string => String(n).padStart(2, "0");

/** `2026-08-05` shifted by whole days, both directions. */
function shiftIso(iso: string, days: number): string {
  const [y, m, d] = iso.split("-").map((part) => Number.parseInt(part, 10));
  const { y: yy, m: mm, d: dd } = civilFromDays(daysFromCivil(y!, m!, d!) + days);
  return `${String(yy).padStart(4, '0')}-${pad(mm)}-${pad(dd)}`;
}

/**
 * TURN AN ADD-ON'S "FORTY MINUTES AGO" INTO A DAY AND A TIME THIS SHOP AGREES
 * WITH.
 *
 * The host calls this everywhere it used to read `entry.iso` — the manage
 * drawer's list and the shelf's "last used" are the two — passing its own
 * pinned clock and its own recent references. It is the mirror of what
 * `<AddOnSlot>` already does with `now`: the add-on says what it wants
 * expressed, the host says what it is true of.
 *
 * PURE, and deterministic to the minute: no clock is read here either. A demo
 * whose seeded history moved would be a demo nobody can screenshot, which is
 * the whole reason `ShopClock` crosses the seam rather than being sampled.
 *
 * Entries naming a reference the host has not got are DROPPED (see
 * `SeededActivityEntry.refIndex`), so the resolved list can be shorter than the
 * declared one and callers must read its length rather than the add-on's.
 */
export function resolveActivity(
  entries: readonly SeededActivityEntry[] | undefined,
  context: ActivityContext,
): readonly ActivityEntry[] {
  if (entries === undefined) return [];
  const dayMinutes = 1440;
  const out: ActivityEntry[] = [];

  for (const entry of entries) {
    let ref = '';
    if (entry.refIndex !== undefined) {
      const found = context.refs[entry.refIndex];
      // The host has fewer records than this add-on assumed. A line pointing at
      // a blank is worse than no line.
      if (found === undefined) continue;
      ref = found;
    }

    const total = context.now.hour * 60 + context.now.minute - entry.minutesAgo;
    // `Math.floor` and not a truncation: going back past midnight has to move
    // the date to the day BEFORE, and `-1 / 1440 | 0` is zero.
    const dayShift = Math.floor(total / dayMinutes);
    const inDay = total - dayShift * dayMinutes;

    out.push({
      iso: shiftIso(context.now.iso, dayShift),
      hour: Math.floor(inDay / 60),
      minute: inDay % 60,
      ref,
      messageKey: entry.messageKey,
    });
  }

  return out;
}
