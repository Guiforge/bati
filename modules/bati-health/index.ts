// Via `expo` rather than `expo-modules-core`, for the reason given in modules/bati-location.
import { requireOptionalNativeModule } from "expo";
import { AppState } from "react-native";
import { type HealthPort, type HealthRecord, HealthRefused } from "@/src/healthExport/port";

/**
 * The native half of the Health Connect export (W-04): `modules/bati-health/android`.
 *
 * Absent in jest and on any build without the module: `requireOptionalNativeModule` returns null and
 * Health Connect reads as unavailable, so nothing is shown and nothing is called.
 */
type BatiHealthNativeModule = {
  sdkStatus(): number;
  /** Writing exercise sessions and distance, both. */
  hasWritePermission(): Promise<boolean>;
  hasRoutePermission(): Promise<boolean>;
  /** `route` asks for the route permission alone; otherwise exercise and distance together. */
  launchPermissionRequest(route: boolean): boolean;
  upsertSession(json: string): Promise<void>;
  deleteSessions(clientIds: string[]): Promise<void>;
  openSettings(): boolean;
};

const native = requireOptionalNativeModule<BatiHealthNativeModule>("BatiHealth");

/** `HealthConnectClient.SDK_AVAILABLE`. 2, a provider to install or update, is unavailable too. */
const SDK_AVAILABLE = 3;

/**
 * How long Health Connect has to put its screen up. It answers without one once the hero has
 * refused twice, and then the app never leaves the foreground: waiting for a return would hang.
 */
const SCREEN_GRACE_MS = 2000;

/** Resolves when the app has left for Health Connect's screen and come back, or never left. */
function backFromHealthConnect(): Promise<void> {
  return new Promise((resolve) => {
    let left = false;
    const subscription = AppState.addEventListener("change", (status) => {
      if (status !== "active") {
        left = true;
        return;
      }
      if (!left) return;
      subscription.remove();
      resolve();
    });
    setTimeout(() => {
      if (left) return;
      subscription.remove();
      resolve();
    }, SCREEN_GRACE_MS);
  });
}

/** Shows Health Connect's permission screen, then reads what the hero answered. */
async function requestPermission(route: boolean): Promise<boolean> {
  if (!native) return false;
  const back = backFromHealthConnect();
  if (!native.launchPermissionRequest(route)) return false;
  await back;
  return route ? native.hasRoutePermission() : native.hasWritePermission();
}

/** What the module rejects with when Health Connect refuses the record itself (BatiHealthModule.kt). */
const REFUSED = "ERR_HEALTH_REFUSED";

async function upsert(record: HealthRecord): Promise<void> {
  try {
    await native?.upsertSession(JSON.stringify(record));
  } catch (e) {
    if ((e as { code?: unknown } | null)?.code === REFUSED) {
      throw new HealthRefused(e instanceof Error ? e.message : REFUSED);
    }
    throw e;
  }
}

export const nativeHealth: HealthPort = {
  available: () => native?.sdkStatus() === SDK_AVAILABLE,
  hasPermission: async () => (native ? native.hasWritePermission() : false),
  requestPermission: () => requestPermission(false),
  hasRoutePermission: async () => (native ? native.hasRoutePermission() : false),
  requestRoutePermission: () => requestPermission(true),
  upsert,
  remove: async (clientIds: string[]) => native?.deleteSessions(clientIds),
  openSettings: () => {
    native?.openSettings();
  },
};
