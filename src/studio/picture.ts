/**
 * The picture a lettering proof shows: the piece's material as a plain field
 * of its tint, the customer's words set on it in the ink that material takes
 * (dark on pale ply and stoneware, white on walnut, slate and acrylic), and
 * the finished size in a corner. Drawn in the studio's browser, at 1200 × 800,
 * and stored as the proof's picture: what the customer approves.
 *
 * A design of the Customiser's is never drawn here: its proof is the one the
 * Customiser's panel makes from the design's version.
 */
import type { StudioData } from "./door.ts";
import { lineMaterial, productOf } from "./facts.ts";
import { text, type Row } from "./wire.ts";

const W = 1200;
const H = 800;

/** Whether a tint is pale enough to take dark ink. */
export function isPale(hex: string): boolean {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex.trim());
  if (m === null) return false;
  const n = parseInt(m[1]!, 16);
  const [r, g, b] = [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  return 0.2126 * r + 0.7152 * g + 0.0722 * b > 150;
}

/** The words of a line, a line of text each: the customer's own line breaks, and "·" and "/" as they wrote them. */
export const wordsOf = (line: Row): string[] => (text(line["lettering"]) ?? "").split(/\n/).map((w) => w.trim()).filter((w) => w !== "");

/** Draw a line's lettering proof; null where the browser has no canvas to draw on. */
export async function drawLettering(line: Row, data: StudioData): Promise<Blob | null> {
  if (typeof document === "undefined") return null;
  const canvas = document.createElement("canvas");
  canvas.width = W;
  canvas.height = H;
  let ctx: CanvasRenderingContext2D | null = null;
  try {
    ctx = canvas.getContext("2d");
  } catch {
    ctx = null;
  }
  if (ctx === null) return null;
  const tint = text(lineMaterial(data, line)?.["tint"]) ?? "#c2a175";
  const ink = isPale(tint) ? "rgba(48,30,14,0.92)" : "#ffffff";
  ctx.fillStyle = tint;
  ctx.fillRect(0, 0, W, H);
  ctx.strokeStyle = isPale(tint) ? "rgba(48,30,14,0.25)" : "rgba(255,255,255,0.3)";
  ctx.lineWidth = 4;
  ctx.strokeRect(40, 40, W - 80, H - 80);
  const words = wordsOf(line);
  ctx.fillStyle = ink;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  const size = Math.max(36, Math.min(96, Math.floor(1700 / Math.max(10, ...words.map((w) => w.length)))));
  ctx.font = `800 ${String(size)}px Manrope, system-ui, sans-serif`;
  const gap = size * 1.3;
  words.forEach((w, i) => ctx.fillText(w, W / 2, H / 2 + (i - (words.length - 1) / 2) * gap, W - 160));
  const sizeText = text(productOf(data, line)?.["size_text"]);
  if (sizeText !== null) {
    ctx.font = "600 28px 'JetBrains Mono', ui-monospace, monospace";
    ctx.textAlign = "start";
    ctx.fillStyle = "rgba(10,10,15,0.55)";
    const label = sizeText;
    const width = ctx.measureText(label).width + 28;
    ctx.fillRect(48, H - 96, width, 48);
    ctx.fillStyle = "#ffffff";
    ctx.fillText(label, 62, H - 72);
  }
  return await new Promise<Blob | null>((resolve) => canvas.toBlob((blob) => resolve(blob), "image/png"));
}
