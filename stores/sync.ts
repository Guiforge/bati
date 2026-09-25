import { create } from "zustand";

import { type SyncResult, syncAccount, syncNow } from "@/src/deviceSync";
import { reportError } from "@/src/reportError";

/**
 * Device sync's last answer, for the two places that read it: the prompt that offers another
 * device's version (components/SyncPrompt.tsx) and the Settings row.
 *
 * A store rather than component state for the reason `stores/restore.ts` gives: the root layout
 * remounts (a restore unmounts the root `<Stack>`), and a `useRef` guard there runs the launch sync
 * twice. `claimLaunch` is true once per process.
 */
interface SyncState {
  running: boolean;
  result: SyncResult | null;
  /** The last run failed: no network, a server that said no. Shown only when asked for. */
  failed: boolean;
  launchClaimed: boolean;
  /** `name@etag` of every offer already put to the hero in this process. */
  offered: string[];
  claimLaunch: () => boolean;
  /** Never throws. `snapshotFirst` for a manual run; launch already sealed its snapshot. */
  run: (options: { snapshotFirst: boolean }) => Promise<void>;
  markOffered: (key: string) => void;
}

export const useSyncStore = create<SyncState>((set, get) => ({
  running: false,
  result: null,
  failed: false,
  launchClaimed: false,
  offered: [],
  claimLaunch: () => {
    if (get().launchClaimed) return false;
    set({ launchClaimed: true });
    return true;
  },
  run: async (options) => {
    // The flag goes up before the first await, or two calls in the same tick both pass the check.
    if (get().running) return;
    set({ running: true });
    // Every launch calls this; a device that never connected has nothing to do and nothing to
    // report. Found on an emulator, where it logged "Sync is not connected" at every start.
    if ((await syncAccount().catch(() => null)) === null) {
      set({ running: false });
      return;
    }
    const outcome = await syncNow(options).then(
      (result) => ({ result, failed: false }),
      (error: unknown) => {
        reportError("sync.run", error);
        return { result: get().result, failed: true };
      },
    );
    set({ running: false, ...outcome });
  },
  markOffered: (key) => set({ offered: [...get().offered, key] }),
}));
