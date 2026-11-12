import type { HealthRecord } from "./record";

export type { HealthRecord };

/**
 * Health Connect as the export sees it. `modules/bati-health` is the real one; the tests use a fake
 * that keeps records by client id the way Health Connect does.
 */
export type HealthPort = {
  /** Health Connect is on this phone and ready. False hides the whole setting. */
  available(): boolean;
  hasPermission(): Promise<boolean>;
  /** Shows Health Connect's own screen; true when the write permission was granted. */
  requestPermission(): Promise<boolean>;
  /** Inserts, or replaces the record with the same id when `version` is higher. */
  upsert(record: HealthRecord): Promise<void>;
  remove(clientIds: string[]): Promise<void>;
  openSettings(): void;
};
