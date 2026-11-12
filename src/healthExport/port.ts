import type { HealthRecord } from "./record";

export type { HealthRecord };

/**
 * Health Connect turned this one record down for what it holds (bad data), not for the moment it
 * was asked in. Retrying the same version would be refused again: the entry is marked failed and
 * the run goes on. Any other error (permission, rate limit, Health Connect busy) leaves it owed.
 */
export class HealthRefused extends Error {
  override name = "HealthRefused";
}

/** By name, not `instanceof`: one class per module registry, and jest makes several. */
export function isHealthRefused(e: unknown): e is HealthRefused {
  return e instanceof Error && e.name === "HealthRefused";
}

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
   * Inserts the session (and its distance), or replaces the records with the same ids when
   * `version` is higher. An outing without a distance takes back the distance it had. Rejects with
   * `HealthRefused` when Health Connect refuses the record itself.
   */
  upsert(record: HealthRecord): Promise<void>;
  /** Deletes by client id, sessions and distances alike. An id Health Connect lacks is fine. */
  remove(clientIds: string[]): Promise<void>;
  openSettings(): void;
};
