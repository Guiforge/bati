import type { HealthRecord } from "./record";

export type { HealthRecord };

/**
 * Health Connect as the export sees it. `modules/bati-health` is the real one; the tests use a fake
 * that keeps records by client id the way Health Connect does.
 */
export type HealthPort = {
  /** Health Connect is on this phone and ready. False hides the whole setting. */
  available(): boolean;
  /** Writing exercise sessions and distance, the two the main switch asks for together. */
  hasPermission(): Promise<boolean>;
  /** Shows Health Connect's own screen; true when both were granted. */
  requestPermission(): Promise<boolean>;
  /** Writing an outing's route, asked only when the hero turns "with the GPS route" on. */
  hasRoutePermission(): Promise<boolean>;
  requestRoutePermission(): Promise<boolean>;
  /**
   * Writes a batch of entries, each a session and its distance, replacing the records with the same
   * ids unless `version` is lower than what Health Connect holds; an outing without a distance takes
   * back the one it had. Answers per entry: null when written, or why Health Connect refused it for
   * what it holds. Rejects for anything else (permission, quota), and then nothing is known written.
   */
  upsertMany(records: HealthRecord[]): Promise<(string | null)[]>;
  /** Deletes by client id, sessions and distances alike. An id Health Connect lacks is fine. */
  remove(clientIds: string[]): Promise<void>;
  openSettings(): void;
};
