/**
 * The demo's Adminium, whole: Birch Row's world in the page, the shop's door
 * into it and the studio's, one of each for the page. The demo card's
 * persona, theme and language sit beside it (`useDemo`), since the card, not
 * the app, chooses them.
 *
 * DEMO BUILD ONLY — nothing in a real build imports it.
 */
import { create } from "zustand";

import { DemoShop, type DemoAfter } from "./shop.ts";
import { DemoStudio } from "./studio.ts";
import { DemoWorld } from "./world.ts";

export interface DemoAdminium {
  world: DemoWorld;
  shop: DemoShop;
  after: DemoAfter;
  studio: DemoStudio;
}

export function makeDemo(start?: number): DemoAdminium {
  const world = new DemoWorld(start);
  const shop = new DemoShop(world);
  return { world, shop, after: shop.afterDoor, studio: new DemoStudio(world) };
}

let demo: DemoAdminium | null = null;

/** The one demo Adminium of this page. */
export function demoAdminium(): DemoAdminium {
  demo ??= makeDemo();
  return demo;
}

/** A fresh Birch Row in the same page: the card's "Back to Thursday afternoon". Who is using it, the theme and the language stay. */
export function renewDemo(): DemoAdminium {
  demo = makeDemo();
  useDemo.setState((s) => ({ generation: s.generation + 1 }));
  return demo;
}

/** For tests: a fresh Birch Row, as a new page would have. */
export function resetDemo(): DemoAdminium {
  demo = makeDemo();
  useDemo.setState((s) => ({ persona: "shopper", theme: "light", locale: null, generation: s.generation + 1 }));
  return demo;
}

export type Persona = "shopper" | "maker";

export interface DemoState {
  persona: Persona;
  theme: "light" | "dark";
  /** The language the card asked for, or null until it asks. */
  locale: string | null;
  /** Counts the fresh worlds this page has had: the studio's door is the newest one's. */
  generation: number;
}

export const useDemo = create<DemoState>(() => ({ persona: "shopper", theme: "light", locale: null, generation: 0 }));
