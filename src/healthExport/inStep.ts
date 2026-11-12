import { AppState } from "react-native";
import { nativeHealth } from "@/modules/bati-health";
import { reportError } from "@/src/reportError";
import { useSessionStore } from "@/stores/session";
import type { HealthPort } from "./port";
import { syncHealthConnect } from "./sync";

/**
 * How long the victory screen has to itself before the export runs. Nothing on it waits for the
 * export or shows it; this only keeps its first seconds free of the export's database reads.
 */
const AFTER_VICTORY_MS = 3000;

/**
 * After a failed run (Health Connect's call quota, mostly), one more a minute later: its quota
 * refills over minutes, and a history run should not wait for the hero to leave the app.
 */
export const RETRY_AFTER_MS = 60_000;
let retry: ReturnType<typeof setTimeout> | null = null;

/** One sync, silent: what failed stays owed and is said nowhere but the setting's counts. */
export function syncHealthConnectQuietly(port: HealthPort = nativeHealth): void {
  if (!port.available()) return;
  syncHealthConnect(port).catch((e: unknown) => {
    reportError("healthExport.sync", e);
    if (retry !== null) return;
    retry = setTimeout(() => {
      retry = null;
      syncHealthConnectQuietly(port);
    }, RETRY_AFTER_MS);
  });
}

/**
 * Keeps Health Connect in step with the journal, from the root layout: after a session is saved,
 * and whenever the app comes back or goes away. The cold start is the caller's, and covers what a
 * merge or a restore changed (both end in a reload). Going away catches a deletion or a correction
 * made while the app was open, before the hero opens the app that reads them.
 */
export function keepHealthExportInStep(port: HealthPort = nativeHealth): { remove(): void } {
  if (!port.available()) return { remove: () => undefined };
  let timer: ReturnType<typeof setTimeout> | null = null;
  const unsubscribe = useSessionStore.subscribe(
    (s) => s.savedResult,
    (saved) => {
      if (!saved) return;
      if (timer) clearTimeout(timer);
      timer = setTimeout(() => syncHealthConnectQuietly(port), AFTER_VICTORY_MS);
    },
  );
  const appState = AppState.addEventListener("change", (status) => {
    if (status === "active" || status === "background") syncHealthConnectQuietly(port);
  });
  return {
    remove() {
      unsubscribe();
      appState.remove();
      if (timer) clearTimeout(timer);
    },
  };
}
