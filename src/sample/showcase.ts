/**
 * What Birch Row's sample adds to the Customiser's own rows: everything the
 * app can make, shown the way a shop would set it up.
 *
 * The Customiser ships a small Birch Row (`customiser-rows.json`, copied from
 * its `seeds/maker.sample.json`). The shop adds to it here:
 *
 *   - the files a shop uploads: a photo of every piece, the book nook and the
 *     keepsake box as 3D models with a cut file for each piece, the printed
 *     pieces as a model to print and a lighter one to show, the layered
 *     sign's outline;
 *   - the faces marked on those models, where a customer's words go;
 *   - four more bases (the keepsake box, the name pot, the phone stand, the
 *     layered sign), their pieces, areas and ready-made designs.
 *
 * It also moves two of the Customiser's areas: the book nook's sign and left
 * window sat on the shop front's sheet, and are drawn here on their own
 * pieces, where the marked faces put them.
 *
 * Every file is in `seeds/showcase/`, and `showcase/assets.json` holds each
 * one's hash (`npm run sample` writes it).
 */
import ASSETS from "./showcase/assets.json" with { type: "json" };
import BOX_FACES from "./showcase/box.faces.json" with { type: "json" };
import KEYRING_FACES from "./showcase/keyring.faces.json" with { type: "json" };
import NOOK_FACES from "./showcase/nook.faces.json" with { type: "json" };
import POT_FACES from "./showcase/pot.faces.json" with { type: "json" };
import STAND_FACES from "./showcase/stand.faces.json" with { type: "json" };

type Row = Record<string, unknown>;
interface Table {
  ref: string;
  rows: Row[];
}

/** The files the sample adds, by label: where each one is in the package. */
export const ASSET_FILES: Readonly<Record<string, string>> = {
  ...Object.fromEntries(
    [
      "coast-wal", "coast-ply", "sign-house", "mark-slate", "key-acr", "tag-pet", "tray-3d", "pot-3d", "mug-stone", "cake-top", "board-cut",
      "sign-wed", "book-wal", "block-photo", "nook", "key-name", "box-keep", "sign-layer", "pot-hex", "stand-phone", "fox-flexi",
    ].map((code) => [`photo:${code}`, `seeds/showcase/photos/${code}.jpg`]),
  ),
  "model:nook": "seeds/showcase/3d/nook.glb",
  "model:box": "seeds/showcase/3d/box.glb",
  "model:keyring": "seeds/showcase/3d/keyring.glb",
  "print:keyring": "seeds/showcase/3d/keyring.stl",
  "model:pot": "seeds/showcase/3d/pot.glb",
  "print:pot": "seeds/showcase/3d/pot.stl",
  "model:stand": "seeds/showcase/3d/stand.glb",
  "print:stand": "seeds/showcase/3d/stand.stl",
  "outline:layered": "seeds/showcase/3d/layered-sign.svg",
  ...Object.fromEntries(Array.from({ length: 14 }, (_, i) => String(i + 1).padStart(2, "0")).map((n) => [`cut:nook-${n}`, `seeds/showcase/pieces/nook-${n}.svg`])),
  ...Object.fromEntries(Array.from({ length: 7 }, (_, i) => String(i + 1).padStart(2, "0")).map((n) => [`cut:box-${n}`, `seeds/showcase/pieces/box-${n}.svg`])),
};

/** The bundle's `assets`: each file with its hash. */
export function showcaseAssets(): Record<string, { file: string; sha256: string }> {
  const hashes = ASSETS as Record<string, string>;
  return Object.fromEntries(
    Object.entries(ASSET_FILES).map(([label, file]) => {
      const sha256 = hashes[file];
      if (sha256 === undefined) throw new Error(`${file} has no hash in showcase/assets.json — run npm run sample`);
      return [label, { file, sha256 }];
    }),
  );
}

const asset = (label: string): Row => ({ "@asset": label });
const ref = (label: string): Row => ({ "@ref": label });

/**
 * A model's faces as the base keeps them. A face names no kit piece: the
 * bases are written before their pieces, so no piece has an id yet. Each kit
 * face is its whole piece, at the piece's size, and the areas on it name the
 * piece themselves, which is what the laser's files are made from.
 */
function facesOf(faces: readonly Row[], relief?: Row): Row[] {
  return faces.map((face) => ({ ...face, piece: null, ...(relief === undefined ? {} : { relief }) }));
}

const RAISED = { mode: "raised", depth: 1, smallest: 4 };
const SERIF = ["Cormorant Garamond", "Manrope", "Caveat", "Zilla Slab", "Oswald"];
const PRINTED_FONTS = ["Manrope", "Oswald", "Zilla Slab"];
const LASER_FINISHES = ["engraved", "paint-white", "paint-black"];

/** The keepsake box's pieces: walnut 6 mm, finger-jointed, the lid engraved round its edge. */
const BOX_PIECES: [string, string, number, number, string[]][] = [
  ["01", "Base", 160, 110, ["CUT"]],
  ["02", "Lid", 160, 110, ["CUT", "ENGRAVE"]],
  ["03", "Lid liner", 147, 97, ["CUT"]],
  ["04", "Front", 160, 64, ["CUT"]],
  ["05", "Back", 160, 64, ["CUT"]],
  ["06", "Left end", 110, 64, ["CUT"]],
  ["07", "Right end", 110, 64, ["CUT"]],
];

const LID_RULES = { chars: 24, grows: true, unit: "mm", size: 12, min: 7, max: 16, fonts: ["Cormorant Garamond", "Caveat", "Zilla Slab"], font: "Cormorant Garamond", finishes: ["engraved"], placeholder: "Little Treasures" };
const LOGO_TOO = { picture: "logo", fit: "inside", colour: "one", file: "logo_file" };
const POT_RULES = { chars: 8, grows: true, unit: "mm", size: 10, min: 6, max: 14, fonts: PRINTED_FONTS, font: "Oswald", upper: true, raisedMm: 1, placeholder: "BASIL", mode: "raised", depthMm: 1, smallestLetterMm: 4 };
const STAND_RULES = { chars: 12, grows: true, unit: "mm", size: 8, min: 5, max: 11, fonts: PRINTED_FONTS, font: "Manrope", upper: true, raisedMm: 1, placeholder: "SAM'S DESK", mode: "raised", depthMm: 1, smallestLetterMm: 4 };
const SIGN_NAME_RULES = { chars: 18, grows: true, unit: "mm", size: 40, min: 24, max: 52, fonts: ["Caveat", "Cormorant Garamond", "Zilla Slab"], font: "Caveat", finishes: ["paint-white", "paint-black", "engraved"], placeholder: "The Okafors" };
const SIGN_LINE_RULES = { chars: 30, grows: true, unit: "mm", size: 9, min: 6, max: 12, fonts: ["Manrope", "Cormorant Garamond"], font: "Manrope", finishes: ["engraved", "paint-white"], placeholder: "Home since 2021" };

/** The rows added to each Customiser table, in its order. */
function added(): Record<string, Row[]> {
  return {
    bases: [
      { "@label": "base:box", app: "maker", offered: { fonts: SERIF, finishes: LASER_FINISHES }, name: "Keepsake box", kind: "kit", width_mm: 160, height_mm: 110, depth_mm: 70, material: "Walnut", thickness_mm: 6,
        model_file: asset("model:box"), faces: facesOf(BOX_FACES as Row[]), state: "published", position: 6 },
      { "@label": "base:pot", app: "maker", offered: { fonts: PRINTED_FONTS, finishes: [] }, name: "Hexagonal name pot", kind: "printed", width_mm: 110, height_mm: 110, material: "PLA", thickness_mm: 105,
        model_file: asset("model:pot"), print_file: asset("print:pot"), faces: facesOf(POT_FACES as Row[]), state: "published", position: 7 },
      { "@label": "base:stand", app: "maker", offered: { fonts: PRINTED_FONTS, finishes: [] }, name: "Phone stand", kind: "printed", width_mm: 80, height_mm: 75, material: "PLA", thickness_mm: 95,
        model_file: asset("model:stand"), print_file: asset("print:stand"), faces: facesOf(STAND_FACES as Row[], RAISED), state: "published", position: 8 },
      { "@label": "base:layered", app: "maker", offered: { fonts: SERIF, finishes: LASER_FINISHES }, name: "Layered name sign", kind: "piece", width_mm: 300, height_mm: 140, corner_mm: 12, material: "Birch ply", thickness_mm: 9,
        outline_file: asset("outline:layered"), state: "published", position: 9 },
    ],
    base_pieces: BOX_PIECES.map(([code, name, w, h, layers], i) => ({
      "@label": `piece:box-${code}`, app: "maker", base_id: ref("base:box"), code, name, width_mm: w, height_mm: h, layers, file: asset(`cut:box-${code}`), position: i + 1,
    })),
    base_areas: [
      { "@label": "area:box-lid", app: "maker", base_id: ref("base:box"), code: "lid", name: "The lid", piece_id: ref("piece:box-02"), face: "lid", shape: "rect", x_mm: 20, y_mm: 25, w_mm: 120, h_mm: 60, takes: "both", required: true,
        rules: { ...LID_RULES, alsoLogo: LOGO_TOO }, feature_id: ref("feature:maker-logo"), position: 7 },
      { "@label": "area:box-front", app: "maker", base_id: ref("base:box"), code: "front", name: "The front", piece_id: ref("piece:box-04"), face: "front", shape: "rect", x_mm: 20, y_mm: 17, w_mm: 120, h_mm: 30, takes: "words", required: false,
        rules: { chars: 20, grows: true, unit: "mm", size: 7, min: 5, max: 10, fonts: ["Cormorant Garamond", "Manrope", "Caveat"], font: "Manrope", finishes: ["engraved"], placeholder: "est. 2026" }, position: 8 },
      { "@label": "area:pot-front", app: "maker", base_id: ref("base:pot"), code: "front", name: "The front", face: "front", shape: "rect", x_mm: 7.8, y_mm: 25.1, w_mm: 48, h_mm: 55, takes: "words", required: true, rules: POT_RULES, position: 9 },
      { "@label": "area:stand-front", app: "maker", base_id: ref("base:stand"), code: "front", name: "The front", face: "front", shape: "rect", x_mm: 5, y_mm: 2.5, w_mm: 70, h_mm: 11, takes: "words", required: true, rules: STAND_RULES, position: 10 },
      { "@label": "area:layered-name", app: "maker", base_id: ref("base:layered"), code: "name", name: "The name", shape: "rect", x_mm: 30, y_mm: 38, w_mm: 240, h_mm: 56, takes: "words", required: true, rules: SIGN_NAME_RULES, position: 11 },
      { "@label": "area:layered-line", app: "maker", base_id: ref("base:layered"), code: "line", name: "The small line", shape: "rect", x_mm: 60, y_mm: 100, w_mm: 180, h_mm: 18, takes: "words", required: false, rules: SIGN_LINE_RULES, position: 12 },
    ],
    ready_designs: [
      { "@label": "ready:box-name-date", app: "maker", base_id: ref("base:box"), name: "Name and date", tags: ["words"], state: "published", position: 12 },
      { "@label": "ready:box-initials", app: "maker", base_id: ref("base:box"), name: "Initials", tags: ["words", "logo"], state: "published", position: 13 },
      { "@label": "ready:pot-herb", app: "maker", base_id: ref("base:pot"), name: "Herb name", tags: ["words"], state: "published", position: 14 },
      { "@label": "ready:stand-name", app: "maker", base_id: ref("base:stand"), name: "Name", tags: ["words"], state: "published", position: 15 },
      { "@label": "ready:layered-family", app: "maker", base_id: ref("base:layered"), name: "Family name", tags: ["words"], state: "published", position: 16 },
    ],
    ready_parts: [
      part("ready:box-name-date", "lid", "The lid", true, "area:box-lid", "piece:box-02", [20, 25, 120, 34], LID_RULES, 31),
      part("ready:box-name-date", "date", "The date", false, "area:box-lid", "piece:box-02", [40, 62, 80, 14], { ...LID_RULES, chars: 16, size: 6, min: 4, max: 8, font: "Manrope", placeholder: "est. 2026" }, 32),
      part("ready:box-initials", "lid", "The initials", true, "area:box-lid", "piece:box-02", [40, 30, 80, 50], { ...LID_RULES, chars: 8, size: 22, max: 30, placeholder: "A & J", alsoLogo: LOGO_TOO }, 33),
      part("ready:pot-herb", "name", "The name", true, "area:pot-front", null, [7.8, 42, 48, 20], POT_RULES, 34),
      part("ready:stand-name", "name", "The name", true, "area:stand-front", null, [5, 2.5, 70, 11], STAND_RULES, 35),
      part("ready:layered-family", "name", "The name", true, "area:layered-name", null, [30, 38, 240, 56], SIGN_NAME_RULES, 36),
      part("ready:layered-family", "line", "The small line", false, "area:layered-line", null, [60, 100, 180, 18], SIGN_LINE_RULES, 37),
    ],
  };
}

function part(design: string, code: string, name: string, required: boolean, area: string, piece: string | null, [x, y, w, h]: number[], rules: Row, position: number): Row {
  return { app: "maker", ready_design_id: ref(design), code, name, kind: "text", locked: false, required, ...(piece === null ? {} : { piece_id: ref(piece) }), x_mm: x, y_mm: y, w_mm: w, h_mm: h, area_id: ref(area), rules, position };
}

/** Changes to the Customiser's own rows, by label: the files and faces of the nook and the keyring, and where the nook's two areas sit. */
const CHANGED: Readonly<Record<string, Row>> = {
  "base:nook": { model_file: asset("model:nook"), faces: facesOf(NOOK_FACES as Row[]) },
  "base:keyring": { model_file: asset("model:keyring"), print_file: asset("print:keyring"), faces: facesOf(KEYRING_FACES as Row[]) },
  "area:nook-sign": { face: "sign", x_mm: 5, y_mm: 4, w_mm: 82, h_mm: 14 },
  "area:nook-lwin": { face: "lwin", x_mm: 5, y_mm: 6, w_mm: 32, h_mm: 42 },
  "area:keyring-front": { x_mm: 14, y_mm: 4, w_mm: 38, h_mm: 16 },
};
/** Each nook piece's own cut file. */
const PIECE_FILES = (label: unknown): Row => (typeof label === "string" && label.startsWith("piece:nook-") ? { file: asset(`cut:${label.slice("piece:".length)}`) } : {});
/** A ready-made part on a moved area follows it. */
const PART_MOVES: Readonly<Record<string, Row>> = {
  "area:nook-sign": { x_mm: 5, y_mm: 4, w_mm: 82, h_mm: 14 },
  "area:nook-lwin": { x_mm: 5, y_mm: 6, w_mm: 32, h_mm: 42 },
};

/** The Customiser's rows with the shop's own added and changed. The box's face pieces are named by the box's own labels. */
export function withShowcase(tables: Table[]): Table[] {
  const extra = added();
  return tables.map((table) => {
    const rows = table.rows.map((row) => {
      const label = row["@label"];
      const changed = typeof label === "string" ? CHANGED[label] : undefined;
      const area = (row["area_id"] as { "@ref"?: string } | undefined)?.["@ref"];
      const moved = table.ref === "ready_parts" && area !== undefined ? PART_MOVES[area] : undefined;
      return { ...row, ...(table.ref === "base_pieces" ? PIECE_FILES(label) : {}), ...changed, ...moved };
    });
    return { ...table, rows: [...rows, ...(extra[table.ref] ?? [])] };
  });
}
