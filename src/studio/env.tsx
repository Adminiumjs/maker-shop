/**
 * What every studio screen reaches through React: the door into Adminium,
 * how a proof's picture is drawn in this browser, and the hooks that read
 * the rows and run a write.
 *
 * A write is run the same way everywhere: while it is on, the screen says so;
 * when it is done, the rows are read again (Adminium's figures, never the
 * screen's guess); when it is refused, the refusal is said in a toast in the
 * reader's words, and the rows are read again too, so the screen shows what
 * is true now.
 */
import { createContext, useCallback, useContext, useState, type ReactNode } from "react";

import type { StudioData, StudioDoor } from "./door.ts";
import { HeldByProof } from "./actions.ts";
import { toast, useStudio } from "./store.ts";
import { isApiError, type Row } from "./wire.ts";
import { useT } from "../i18n/index.tsx";

export interface StudioEnv {
  door: StudioDoor;
  /** A picture of a line's words, as its proof shows them; null where this browser cannot draw. */
  draw: (line: Row, data: StudioData) => Promise<Blob | null>;
}

const Ctx = createContext<StudioEnv | null>(null);

export function StudioProvider({ env, children }: { env: StudioEnv; children: ReactNode }) {
  return <Ctx.Provider value={env}>{children}</Ctx.Provider>;
}

export function useEnv(): StudioEnv {
  const env = useContext(Ctx);
  if (env === null) throw new Error("useEnv() outside <StudioProvider>");
  return env;
}

/** The rows last read. The shell renders the screens only once there are some. */
export function useData(): StudioData {
  const data = useStudio((s) => s.data);
  if (data === null) throw new Error("useData() before the first read");
  return data;
}

/** Read every row again, and keep them. */
export async function reload(door: StudioDoor): Promise<void> {
  try {
    const data = await door.load();
    useStudio.setState({ data, failure: null });
  } catch (error) {
    useStudio.setState({ failure: error instanceof Error ? error.message : String(error) });
  }
}

/**
 * A write as a screen runs it: `busy` while it is on, the rows read again
 * after, a refusal said in a toast. The work returns the toast to say when it
 * went (or nothing).
 */
export function useRun(): { busy: boolean; run: (work: (door: StudioDoor, data: StudioData) => Promise<string | null | undefined | void>) => Promise<boolean> } {
  const { door } = useEnv();
  const t = useT();
  const [busy, setBusy] = useState(false);
  const run = useCallback(
    async (work: (door: StudioDoor, data: StudioData) => Promise<string | null | undefined | void>) => {
      const data = useStudio.getState().data;
      if (data === null) return false;
      setBusy(true);
      try {
        const said = await work(door, data);
        if (typeof said === "string") toast(said, "pos");
        return true;
      } catch (error) {
        if (error instanceof HeldByProof) toast(t(error.lock === "waiting" ? "studio.lock.waiting" : "studio.lock.unsent"), "warn");
        // Adminium held the line at "make": its proof is not approved (the move's `requires`).
        else if (isApiError(error) && error.code === "STATE_MOVE_REFUSED" && error.params["from"] === "make" && error.params["to"] === "making" && error.params["named"] === undefined) toast(t("studio.lock.unsent"), "warn");
        // The row moved on since the screen read it.
        else if (isApiError(error) && (error.code === "ROW_CHANGED" || error.code === "WRITE_CONFLICT" || (error.code === "STATE_MOVE_REFUSED" && error.params["named"] !== undefined))) toast(t("studio.moved"), "warn");
        else if (isApiError(error) && error.status === 403) toast(t("studio.notAllowed"), "danger");
        else toast(t("studio.refused", { why: error instanceof Error ? error.message : String(error) }), "danger");
        return false;
      } finally {
        await reload(door);
        setBusy(false);
      }
    },
    [door, t],
  );
  return { busy, run };
}
