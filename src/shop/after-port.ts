/**
 * What the shop's pages after an order ask of Adminium, and the door that
 * asks it.
 *
 * Two ways reach an order, and only these (never a number alone, never an
 * address alone):
 *
 *   - the shopper signs in: Adminium e-mails a link and a six-digit code to
 *     the address typed, the code typed back proves the mailbox, and the
 *     session reads that person's own orders, their lines and their proofs;
 *   - the order's own link (the one its confirmation e-mail carries) opens
 *     that one order, and only it.
 *
 * Either way a proof is answered through the same session: approved, or a
 * change asked for in the shopper's own words, while it waits. "Ask us for
 * something" and "Something's wrong" are guest writes behind the human
 * check. Nothing here works out a figure or a date: each is a stored column
 * or a dry run's.
 */
import { PublicApiError, type PublicClient } from "@adminiumjs/public-client";

import { refusalOf } from "./door.ts";
import { ShopError, type Id, type Row } from "./port.ts";

/** The entries these pages call: the table, and its suffix (Adminium's naming, held by `PUBLIC_REFS`). */
export const AFTER_REFS = {
  myOrders: ["orders", "_verified"],
  myLines: ["order_lines", "_verified"],
  myFeatures: ["order_line_features", "_verified"],
  myProofs: ["proofs", "_verified"],
  linkOrder: ["orders", "_claimed"],
  linkLines: ["order_lines", "_verified_2"],
  linkFeatures: ["order_line_features", "_verified_2"],
  linkProofs: ["proofs", "_verified_2"],
  closures: ["closures", ""],
  rates: ["postage_rates", ""],
  machines: ["machines", ""],
  askUs: ["commission_requests", ""],
  somethingWrong: ["problem_reports", ""],
} as const satisfies Record<string, readonly [string, string]>;

export type AfterRefName = keyof typeof AFTER_REFS;
export type AfterRefs = Record<AfterRefName, string>;

export function afterRefs(tables: Readonly<Record<string, string>> = {}): AfterRefs {
  const out = {} as AfterRefs;
  for (const [name, [table, suffix]] of Object.entries(AFTER_REFS) as [AfterRefName, readonly [string, string]][]) {
    out[name] = `${tables[table] ?? `maker_${table}`}${suffix}`;
  }
  return out;
}

/** Which session reads the order: the shopper's own sign-in, or the order's own link. */
export type Via = "mine" | "link";

/** One order as its page shows it: the order, its lines, their features and the proofs. */
export interface OrderRead {
  via: Via;
  order: Row;
  lines: Row[];
  features: Row[];
  proofs: Row[];
}

/** The answer to a typed-back code, as the page says it. */
export type CodeAnswer = { ok: true } | { ok: false; reason: "wrong"; triesLeft: number } | { ok: false; reason: "spent" | "locked" };

/** A proof's answer, as the page sends it: approved, or a change asked for in the shopper's words. */
export type ProofAnswer = { state: "approved" } | { state: "change_asked"; change_note: string };

/** The rows the footer's pages read: the studio's closures, its postage rates and its machines. */
export interface Extras {
  closures: Row[];
  rates: Row[];
  machines: Row[];
}

export interface AfterPort {
  /** E-mail a sign-in link, with a code for this page, to the address typed (the same answer for any address). */
  requestCode(email: string, language: string): Promise<void>;
  verifyCode(email: string, code: string): Promise<CodeAnswer>;
  /** The sign-in link from the e-mail, used once: true when it opened a session. */
  openSignInLink(token: string): Promise<boolean>;
  /** The first name the link greets its person by, spending nothing. */
  peekSignInLink(token: string): Promise<string | null>;
  signedIn(): boolean;
  /** The signed-in shopper's orders, newest first. */
  myOrders(): Promise<Row[]>;
  /** Every line, feature and proof of the signed-in shopper's orders. */
  myRows(): Promise<{ lines: Row[]; features: Row[]; proofs: Row[] }>;
  /** Open the order the link names: `opened`, `unknown` (opens nothing) or `closed` (stopped or expired). */
  openShared(token: string): Promise<"opened" | "unknown" | "closed">;
  /** Whether a session on an order's own link is held. */
  sharedHeld(): boolean;
  /** The order the held link opens, or null when it opens nothing now. */
  readShared(): Promise<OrderRead | null>;
  answerProof(via: Via, proofId: Id, answer: ProofAnswer): Promise<Row>;
  /** A proof's picture, as the session reads it. */
  proofPicture(via: Via, proofId: Id): Promise<Blob | null>;
  /** "Ask us for something": a guest's request. */
  ask(values: Row): Promise<Row>;
  /** "Something's wrong": a guest's report about one of their orders. */
  report(values: Row): Promise<Row>;
  extras(): Promise<Extras>;
  /** The app's own settings as Adminium serves them to the shop (its studio days, its cut-off). */
  settings(): Readonly<Record<string, unknown>>;
  /** The server's clock now. */
  now(): Promise<Date>;
}

const PAGE = 200;

async function all(client: PublicClient, ref: string, where?: Parameters<PublicClient["list"]>[1]): Promise<Row[]> {
  const rows: Row[] = [];
  for (let offset = 0; offset < 50 * PAGE; offset += PAGE) {
    const page = await client.list<Row>(ref, { ...where, limit: PAGE, offset });
    rows.push(...page.data);
    if (page.data.length < PAGE) break;
  }
  return rows;
}

async function answer<T>(run: () => Promise<T>): Promise<T> {
  try {
    return await run();
  } catch (error) {
    const refused = refusalOf(error);
    if (refused !== null) throw new ShopError(refused, (error as Error).message);
    throw error;
  }
}

const newestFirst = (a: Row, b: Row) => String(b["placed_at"] ?? "").localeCompare(String(a["placed_at"] ?? "")) || Number(b["id"]) - Number(a["id"]);

export class AdminiumAfter implements AfterPort {
  private readonly client: PublicClient;
  private readonly orderClient: PublicClient | null;
  private readonly refs: AfterRefs;
  private readonly served: Readonly<Record<string, unknown>>;

  constructor(clients: { client: PublicClient; orderClient: PublicClient | null }, tables: Readonly<Record<string, string>> = {}, settings: Readonly<Record<string, unknown>> = {}) {
    this.client = clients.client;
    this.orderClient = clients.orderClient;
    this.refs = afterRefs(tables);
    this.served = settings;
  }

  private on(via: Via): PublicClient {
    if (via === "mine") return this.client;
    if (this.orderClient === null) throw new Error("This shop has no key for an order's own link.");
    return this.orderClient;
  }

  requestCode(email: string, language: string): Promise<void> {
    return answer(async () => {
      await this.client.requestLink({ email: email.trim(), lang: language });
    });
  }

  verifyCode(email: string, code: string): Promise<CodeAnswer> {
    return answer(async () => {
      try {
        const out = await this.client.verifyLinkCode({ email: email.trim(), code: code.trim() });
        return out.ok ? { ok: true } : out.triesLeft > 0 ? { ok: false, reason: "wrong", triesLeft: out.triesLeft } : { ok: false, reason: "spent" };
      } catch (error) {
        if (error instanceof PublicApiError && error.code === "PUBLIC_CODE_EXPIRED") return { ok: false, reason: "spent" };
        if (error instanceof PublicApiError && error.code === "PUBLIC_CLAIM_LOCKED") return { ok: false, reason: "locked" };
        throw error;
      }
    });
  }

  openSignInLink(token: string): Promise<boolean> {
    return answer(() => this.client.openLink(token));
  }

  peekSignInLink(token: string): Promise<string | null> {
    return answer(() => this.client.peekLink(token));
  }

  signedIn(): boolean {
    return this.client.session()?.level === "verified";
  }

  myOrders(): Promise<Row[]> {
    return answer(async () => (await all(this.client, this.refs.myOrders)).sort(newestFirst));
  }

  myRows(): Promise<{ lines: Row[]; features: Row[]; proofs: Row[] }> {
    return answer(async () => {
      const [lines, features, proofs] = await Promise.all([all(this.client, this.refs.myLines), all(this.client, this.refs.myFeatures), all(this.client, this.refs.myProofs)]);
      return { lines, features, proofs };
    });
  }

  openShared(token: string): Promise<"opened" | "unknown" | "closed"> {
    return answer(() => this.on("link").openShared(token));
  }

  sharedHeld(): boolean {
    return this.orderClient?.session() != null;
  }

  readShared(): Promise<OrderRead | null> {
    return answer(async () => {
      const client = this.on("link");
      if (client.session() === null) return null;
      const orders = await all(client, this.refs.linkOrder);
      const order = orders[0];
      if (order === undefined) return null;
      const [lines, features, proofs] = await Promise.all([all(client, this.refs.linkLines), all(client, this.refs.linkFeatures), all(client, this.refs.linkProofs)]);
      return { via: "link", order, lines, features, proofs };
    });
  }

  answerProof(via: Via, proofId: Id, answerTo: ProofAnswer): Promise<Row> {
    const ref = via === "mine" ? this.refs.myProofs : this.refs.linkProofs;
    return answer(() => this.on(via).update<Row>(ref, String(proofId), { ...answerTo }));
  }

  proofPicture(via: Via, proofId: Id): Promise<Blob | null> {
    const ref = via === "mine" ? this.refs.myProofs : this.refs.linkProofs;
    return answer(async () => {
      try {
        const file = await this.on(via).file(ref, proofId, "picture");
        return file.inline ? file.blob : null;
      } catch (error) {
        // No picture kept for it (a proof sent without one): the page draws the words instead.
        if (error instanceof PublicApiError && error.status === 404) return null;
        throw error;
      }
    });
  }

  ask(values: Row): Promise<Row> {
    return answer(() => this.client.create<Row>(this.refs.askUs, values));
  }

  report(values: Row): Promise<Row> {
    return answer(() => this.client.create<Row>(this.refs.somethingWrong, values));
  }

  extras(): Promise<Extras> {
    return answer(async () => {
      const [closures, rates, machines] = await Promise.all([all(this.client, this.refs.closures), all(this.client, this.refs.rates), all(this.client, this.refs.machines)]);
      const byPosition = (a: Row, b: Row) => Number(a["position"] ?? 0) - Number(b["position"] ?? 0) || Number(a["id"]) - Number(b["id"]);
      return { closures, rates, machines: machines.sort(byPosition) };
    });
  }

  settings(): Readonly<Record<string, unknown>> {
    return this.served;
  }

  now(): Promise<Date> {
    return this.client.now();
  }
}
