import * as Network from "expo-network";
import { create } from "zustand";

import { failureOf, type SyncFailure } from "@/src/cloudSync";
import {
  recordSyncOutcome,
  type SyncResult,
  syncAccount,
  syncNow,
  syncWifiOnly,
} from "@/src/deviceSync";
import { reportError } from "@/src/reportError";

/**
 * Device sync's last answer, for the places that read it: the prompt that merges or asks
 * (components/SyncPrompt.tsx), the Home card and the Settings sheet.
 *
 * A store rather than component state for the reason `stores/restore.ts` gives: the root layout
 * remounts (a restore unmounts the root `<Stack>`), and a `useRef` guard there runs the launch sync
 * twice. `claimLaunch` is true once per process.
 */
interface SyncState {
  running: boolean;
  result: SyncResult | null;
  /** Why the last run failed, by layer; `null` after a success or before any run. */
  failure: SyncFailure | null;
  /** The last run did not start: sync is set to Wi-Fi only and this is not Wi-Fi. */
  waitingWifi: boolean;
  /** Epoch ms of the last run that reached the server, for "last synced" in Settings. */
  lastSyncAt: number | null;
  launchClaimed: boolean;
  /** Offers already put to the hero in this process (see `offerKey` in SyncPrompt). */
  offered: string[];
  claimLaunch: () => boolean;
  /**
   * Never throws. `snapshotFirst` for a manual run; launch already sealed its snapshot. `force`
   * runs over mobile data even when sync waits for Wi-Fi: the hero pressed "Sync now".
   */
  run: (options: { snapshotFirst: boolean; force?: boolean }) => Promise<void>;
  markOffered: (key: string) => void;
}

async function onMeteredNetwork(): Promise<boolean> {
  const state = await Network.getNetworkStateAsync();
  return (
    state.type !== Network.NetworkStateType.WIFI && state.type !== Network.NetworkStateType.ETHERNET
  );
}

function failureFrom(error: unknown): SyncFailure {
  return error instanceof Error && error.message === "Sync needs encryption on"
    ? { kind: "encryption" }
    : failureOf(error);
}

export const useSyncStore = create<SyncState>((set, get) => ({
  running: false,
  result: null,
  failure: null,
  waitingWifi: false,
  lastSyncAt: null,
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
    // report. A SecureStore that cannot be read is something to report, and still stops here.
    const account = await syncAccount().catch((error: unknown) => {
      reportError("sync.account", error);
      return null;
    });
    if (account === null) {
      set({ running: false });
      return;
    }
    const waitForWifi =
      !options.force &&
      (await syncWifiOnly().catch(() => false)) &&
      (await onMeteredNetwork().catch(() => false));
    if (waitForWifi) {
      set({ running: false, waitingWifi: true });
      return;
    }
    const outcome = await syncNow(options).then(
      (result) => ({ result, failure: null }),
      (error: unknown) => {
        reportError("sync.run", error);
        return { result: get().result, failure: failureFrom(error) };
      },
    );
    const health = await recordSyncOutcome(outcome.failure).catch((error: unknown) => {
      reportError("sync.health", error);
      return null;
    });
    set({
      running: false,
      waitingWifi: false,
      ...outcome,
      lastSyncAt: health?.lastSuccessAt ?? get().lastSyncAt,
    });
  },
  markOffered: (key) => set({ offered: [...get().offered, key] }),
}));
