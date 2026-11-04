/**
 * A modal's frame, shared by the studio's overlays: the proof sheet, the
 * spoil dialog and the batch dialog.
 */
import { useEffect, useRef, type ReactNode } from "react";

import { useStudio } from "../store.ts";

export const close = () => useStudio.setState({ overlay: null });

/** A modal's frame: Escape and the scrim close it, focus starts inside it and goes back where it was. */
export function Modal({ side = false, labelledBy, className, children }: { side?: boolean; labelledBy: string; className?: string; children: ReactNode }) {
  const box = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const before = document.activeElement as HTMLElement | null;
    box.current?.querySelector<HTMLElement>("input, button")?.focus();
    return () => before?.focus?.();
  }, []);
  return (
    <div className={`st-scrim${side ? " st-scrim--side" : ""}`} onClick={close} onKeyDown={(e) => e.key === "Escape" && close()}>
      <div ref={box} role="dialog" aria-modal="true" aria-labelledby={labelledBy} className={className ?? (side ? "st-sheet" : "st-dialog st-pop")} onClick={(e) => e.stopPropagation()}>
        {children}
      </div>
    </div>
  );
}

