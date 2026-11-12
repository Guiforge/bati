// Via `expo` rather than `expo-modules-core`, for the reason given in modules/bati-location.
import { requireOptionalNativeModule } from "expo";
import type { HealthPort, HealthRecord } from "@/src/healthExport/port";

/**
 * The native half of the Health Connect export (W-04): `modules/bati-health/android`.
 *
 * Absent in jest and on any build without the module: `requireOptionalNativeModule` returns null and
 * Health Connect reads as unavailable, so nothing is shown and nothing is called.
 */
type BatiHealthNativeModule = {
  sdkStatus(): number;
  hasWritePermission(): Promise<boolean>;
  requestWritePermission(): Promise<boolean>;
  upsertSession(json: string): Promise<void>;
  deleteSessions(clientIds: string[]): Promise<void>;
  openSettings(): boolean;
};

const native = requireOptionalNativeModule<BatiHealthNativeModule>("BatiHealth");

/** `HealthConnectClient.SDK_AVAILABLE`. 2, a provider to install or update, is unavailable too. */
const SDK_AVAILABLE = 3;

export const nativeHealth: HealthPort = {
  available: () => native?.sdkStatus() === SDK_AVAILABLE,
  hasPermission: async () => (native ? native.hasWritePermission() : false),
  requestPermission: async () => (native ? native.requestWritePermission() : false),
  upsert: async (record: HealthRecord) => native?.upsertSession(JSON.stringify(record)),
  remove: async (clientIds: string[]) => native?.deleteSessions(clientIds),
  openSettings: () => {
    native?.openSettings();
  },
};
