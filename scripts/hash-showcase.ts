/**
 * `npm run sample`, first step: the hash of every file the sample adds
 * (`seeds/showcase/`), written to `src/sample/showcase/assets.json`, which the
 * sample's `assets` carry. `src/sample/sample-bundle.test.ts` fails when a
 * file and its hash disagree.
 */
import { createHash } from "node:crypto";
import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

import { ASSET_FILES } from "../src/sample/showcase.ts";

const ROOT = join(import.meta.dirname, "..");
export const HASH_FILE = join(ROOT, "src", "sample", "showcase", "assets.json");

/** Each file's sha256, by its path in the package, in a stable order. */
export function hashes(): Record<string, string> {
  const files = [...new Set(Object.values(ASSET_FILES))].sort();
  return Object.fromEntries(files.map((file) => [file, createHash("sha256").update(readFileSync(join(ROOT, file))).digest("hex")]));
}

export const hashText = (): string => `${JSON.stringify(hashes(), null, 2)}\n`;

if (process.env["VITEST"] === undefined) {
  writeFileSync(HASH_FILE, hashText());
  console.info(`[sample] ${String(Object.keys(hashes()).length)} files hashed`);
}
