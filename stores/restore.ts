import { create } from "zustand";

/**
 * Where a restore is in its one irreversible moment.
 *
 * It is a store rather than local state because the two sides sit far apart in the tree: the
 * Settings screen and onboarding start it, and DatabaseProvider — which wraps everything — is
 * what has to take the screen over before the database file is touched.
 *
 * - `idle`: nothing happening, the app renders normally.
 * - `restoring`: validated, tree unmounted; the swap runs now.
 * - `restartRequired`: the database on disk is the restored one. Only a relaunch can open it.
 * - `failed`: the swap did not complete and rolled back, so the original database is on disk
 *   untouched — but the connection to it was closed to make room for the swap and nothing
 *   reopens it. A relaunch is the only way out, which is what the copy for this phase says.
 *
 * There is deliberately no way back to `idle`: it would render a tree whose every query throws.
 */
export type RestorePhase = "idle" | "restoring" | "restartRequired" | "failed";

interface RestoreState {
  phase: RestorePhase;
  commitClaimed: boolean;
  beginRestore: () => void;
  finishRestore: (outcome: "restartRequired" | "failed") => void;
  /**
   * True for the first caller only. The swap must run once per process, and a `useRef` in
   * DatabaseProvider cannot promise that: unmounting the root `<Stack>` for the notice makes
   * expo-router remount the whole root layout, provider included, with fresh refs. The second
   * commit found the restored database in place, parked it over the hero's `.bak`, and failed on
   * the consumed import, so every restore that worked said "nothing was replaced". This store
   * outlives the remount.
   */
  claimCommit: () => boolean;
}

export const useRestoreStore = create<RestoreState>((set, get) => ({
  phase: "idle",
  commitClaimed: false,
  beginRestore: () => set({ phase: "restoring" }),
  finishRestore: (outcome) => set({ phase: outcome }),
  claimCommit: () => {
    if (get().commitClaimed) return false;
    set({ commitClaimed: true });
    return true;
  },
}));
