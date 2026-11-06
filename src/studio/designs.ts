/**
 * What the studio reads of a customer's design in the Customiser: the words
 * its parts carry, for a card's summary and a proof's caption. The design
 * itself is the Customiser's; its proof and files are made on its panel.
 */
import type { StudioData } from "./door.ts";
import { same, type Row } from "./wire.ts";

/** A design's values as its row keeps them (parsed, or as text). */
function valuesOf(raw: unknown): Record<string, unknown> | null {
  let value = raw;
  if (typeof value === "string") {
    try {
      value = JSON.parse(value) as unknown;
    } catch {
      return null;
    }
  }
  return typeof value === "object" && value !== null && !Array.isArray(value) ? (value as Record<string, unknown>) : null;
}

/** The words on a line's design, a part at a time, as the customer typed them. */
export function wordsOfDesign(data: StudioData, line: Row): string[] {
  const design = data.designs.find((d) => same(d.id, line["design_id"]));
  const parts = valuesOf(design?.["values"])?.["parts"];
  if (typeof parts !== "object" || parts === null) return [];
  return Object.values(parts as Record<string, unknown>).flatMap((part) => {
    const words = typeof part === "object" && part !== null ? (part as { text?: unknown }).text : undefined;
    return typeof words === "string" && words.trim() !== "" ? [words.trim()] : [];
  });
}
