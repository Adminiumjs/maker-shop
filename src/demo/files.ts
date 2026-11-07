/**
 * The sample's files in the demo: each photo, model and cut file the sample
 * adds (`seeds/showcase/`), at the address the demo build serves it from.
 * Adminium would add them to its Files library; the demo hands the shop and
 * the Customiser their addresses instead.
 *
 * DEMO BUILD ONLY — nothing in a real build imports it.
 */
import CUSTOMISER_BUNDLE from "../../seeds/maker.customiser.sample.json" with { type: "json" };

const URLS = import.meta.glob("../../seeds/showcase/**/*", { query: "?url", import: "default", eager: true }) as Record<string, string>;

const ASSETS = (CUSTOMISER_BUNDLE as unknown as { assets?: Record<string, { file: string }> }).assets ?? {};

/** The address of the sample's file with this label. */
export function assetUrl(label: string): string {
  const file = ASSETS[label]?.file;
  const url = file === undefined ? undefined : URLS[`../../${file}`];
  if (url === undefined) throw new Error(`the sample names the file "${label}", which the demo does not carry`);
  return url;
}

/** A file column's value as the demo holds it: the file's address, or nothing. */
export const fileUrl = (value: unknown): string | null => (typeof value === "string" && value !== "" ? value : null);
