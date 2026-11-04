/**
 * The studio's screen state: which screen is open and on what, the overlay
 * over it, the toasts, and the rows last read. The rows are Adminium's, read
 * again after every write; nothing here keeps a figure of its own.
 */
import { create } from "zustand";

import type { StudioData } from "./door.ts";
import type { Id } from "./wire.ts";

export type View = "today" | "order" | "orders" | "proofs" | "post" | "customers" | "products" | "product" | "notfound";

export type Overlay = { kind: "proof"; orderId: Id } | { kind: "spoil"; lineId: Id } | null;

export type OrderFilter = "all" | "proof" | "late" | "today" | "ready";

export interface Toast {
  id: number;
  tone: "pos" | "warn" | "danger";
  text: string;
}

export interface StudioState {
  view: View;
  orderId: Id | null;
  productId: Id | null;
  customerId: Id | null;
  orderFilter: OrderFilter;
  query: string;
  navOpen: boolean;
  overlay: Overlay;
  toasts: Toast[];
  data: StudioData | null;
  /** The last read failed: what it said. */
  failure: string | null;
  theme: "light" | "dark" | null;
}

export const useStudio = create<StudioState>(() => ({
  view: "today",
  orderId: null,
  productId: null,
  customerId: null,
  orderFilter: "all",
  query: "",
  navOpen: false,
  overlay: null,
  toasts: [],
  data: null,
  failure: null,
  theme: null,
}));

/** Open a screen, closing whatever lay over the last one. */
export function go(view: View, more: Partial<Pick<StudioState, "orderId" | "productId" | "customerId">> = {}): void {
  useStudio.setState({ view, ...more, overlay: null, navOpen: false, query: "" });
}

export const currentView = (): View => useStudio.getState().view;

let toastId = 0;

/** A sentence whose last word ends in its own full stop ("… to Iris P.") keeps one, not two. */
const tidy = (text: string): string => text.replace(/\.\.$/, ".");

/** A toast that goes by itself after a few seconds. */
export function toast(said: string, tone: Toast["tone"] = "pos"): void {
  const text = tidy(said);
  toastId += 1;
  const id = toastId;
  useStudio.setState((s) => ({ toasts: [...s.toasts, { id, tone, text }] }));
  setTimeout(() => useStudio.setState((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })), 4_000);
}
