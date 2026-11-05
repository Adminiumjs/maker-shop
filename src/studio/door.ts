/**
 * The studio's door into Adminium: what the staff screens read and the
 * writes they make, whichever Adminium answers (the real one over the signed-in
 * person's session, or a test's stand-in). Screens never reach past it.
 *
 * Every figure the screens show is a stored column Adminium worked out: a
 * line's price and post-by, an order's weight, postage and total, a
 * customer's orders and what they were charged in all. The door hands rows
 * back as the API answers them and never adds a figure of its own.
 */
import type { Id, Row } from "./wire.ts";

/** The app's tables, by the names the manifest gives them. */
export type Table =
  | "settings"
  | "machines"
  | "materials"
  | "products"
  | "options"
  | "postage_services"
  | "closures"
  | "customers"
  | "orders"
  | "order_lines"
  | "order_line_features"
  | "proofs"
  | "batches"
  | "machine_bookings"
  | "stock_movements";

/** The Customiser's tables the studio reads: the design a line names and its versions. */
export type AddOnTable = "designs" | "design_versions" | "version_files";

export type Action = "read" | "create" | "update" | "delete";

/** The person signed in: their name, and what the app's roles let them do. */
export interface Person {
  name: string;
  /** The app's roles they hold, by the manifest's key (`owner`, `maker`, `packer`). */
  roles: string[];
  /** Whether they may do this to the app's table; true when the server does not say. */
  can(table: Table, action: Action): boolean;
}

/** Everything the studio's screens read, at one moment. */
export interface StudioData {
  settings: Row | null;
  products: Row[];
  options: Row[];
  materials: Row[];
  machines: Row[];
  services: Row[];
  closures: Row[];
  customers: Row[];
  orders: Row[];
  lines: Row[];
  features: Row[];
  proofs: Row[];
  bookings: Row[];
  /** The batches started on the machines, and how the shelf moved (a delivery, a batch's sheets, a spoil, a count). */
  batches: Row[];
  movements: Row[];
  /** The Customiser's designs the lines name, and their versions (newest first per design). */
  designs: Row[];
  versions: Row[];
  /** The files the Customiser made of those versions for the machines (a laser's SVG, a printer's 3MF). */
  files: Row[];
}

/** The studio's facts that are not rows: its zone, money, working week, clock and add-ons. */
export interface StudioFacts {
  /** The studio's zone (its days and times are read in it). */
  zone: string;
  currency: string;
  /** The studio's days, Monday first: `tue,wed,thu,fri,sat`. */
  studioDays: string[];
  /** The add-ons attached and switched on, by key. */
  addOns: string[];
  /** The connection the app's tables are in: a record page's address names it. */
  connectionId: string | null;
}

/** A proof's picture: drawn in this browser, or a copy of a stored file (the Customiser's proof of a version). */
export type ProofPicture = { blob: Blob; filename: string } | { copyOf: string };

export interface StudioDoor {
  who(): Person;
  facts(): StudioFacts;
  /** The server's clock, as epoch ms. */
  now(): number;
  load(): Promise<StudioData>;

  /** A line along the bench; `from` is the stage the screen saw, so a line moved on since is refused. */
  moveLine(line: Row, to: string, values?: Record<string, unknown>): Promise<Row>;
  /** A line's own columns that are not its stage: how many were spoiled and remade. */
  updateLine(line: Row, values: Record<string, unknown>): Promise<Row>;
  /** An order along its states, from the one the screen saw. */
  moveOrder(order: Row, to: string, values?: Record<string, unknown>): Promise<Row>;
  /** A proof the studio sent before, answered by the one it sends now. */
  supersede(proof: Row): Promise<Row>;
  /** A proof of a line: its picture stored first, then the row that sends it (Adminium numbers it and e-mails it). */
  sendProof(input: { order: Row; line: Row; kind: "lettering" | "design"; picture: ProofPicture | null; designVersionId: Id | null; note: string | null }): Promise<Row>;
  /** A reminder of a proof still waiting: Adminium e-mails it when the moment is stamped. */
  remind(proof: Row): Promise<Row>;
  /** Pieces that went wrong: what they took off the shelf, as a spoil of so many units of the line. */
  spoil(input: { line: Row; materialId: Id; units: number; note: string | null }): Promise<Row>;
  /** A product's lettering settings. */
  saveProduct(product: Row, values: Record<string, unknown>): Promise<Row>;

  /** A machine booked for a time: Adminium refuses one that overlaps another booking of the machine (`BOOKING_TAKEN`). */
  book(input: { machineId: Id; label: string; startsAt: string; endsAt: string }): Promise<Row>;
  /** A booking let go. */
  unbook(booking: Row): Promise<void>;
  /**
   * A batch, in one write with the machine's booking for its run and what it
   * takes off the shelf: the batch row, its booking (the machine for that
   * time) and its stock movement (`used`, so many sheets), every row or none.
   * Adminium refuses the whole write when the time is taken (`BOOKING_TAKEN`).
   * It starts as planned; `moveBatch` starts it.
   */
  createBatch(input: { label: string; machineId: Id; materialId: Id; sheets: number; booking: { startsAt: string; endsAt: string } }): Promise<Row>;
  /** A batch along its states, from the one the screen saw. */
  moveBatch(batch: Row, to: string): Promise<Row>;
  /** What the shelf holds, counted: Adminium keeps the book's figure beside it and moves the stock by the difference. */
  count(input: { materialId: Id; counted: number }): Promise<Row>;
  /** A document of a row the app ships a profile for (a sheet of labels), drawn by the add-on that draws it. */
  render(input: { kind: string; ref: Table; pk: Id; values?: Record<string, unknown> }): Promise<{ contentUrl: string; printUrl: string | null }>;
}
