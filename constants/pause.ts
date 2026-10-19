/**
 * The hero's pause: days they said they would not train, and which the flame skips as if they did
 * not exist. Pure on purpose: `db/streaks.ts` reads the stored list without importing `db/pause.ts`
 * (which imports it back), the way it already reads the oath's quota.
 */

/** The preference holding every pause, past and present. Never trimmed: the flame needs the past. */
export const PAUSE_KEY = "pause_goal";

/** The longest a pause may run, in days. */
export const PAUSE_MAX_DAYS = 56;

/** The longest a zone may be spared, in weeks, and how many groups at once. */
export const ZONE_MAX_WEEKS = 8;
export const ZONE_MAX_GROUPS = 2;

/** Local days `yyyy-MM-dd`. The pause covers `from` up to, not including, `until` (the return). */
export type PausePeriod = { from: string; until: string };

const DAY = /^\d{4}-\d{2}-\d{2}$/;

function isPeriod(value: unknown): value is PausePeriod {
  if (typeof value !== "object" || value === null) return false;
  const { from, until } = value as Record<string, unknown>;
  return typeof from === "string" && typeof until === "string" && DAY.test(from) && DAY.test(until);
}

/** A missing or corrupt value is no pause. */
export function parsePausePeriods(raw: string | null | undefined): PausePeriod[] {
  if (!raw) return [];
  try {
    const parsed: unknown = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter(isPeriod) : [];
  } catch {
    return [];
  }
}

export function isPausedOn(periods: readonly PausePeriod[], day: string): boolean {
  return periods.some((p) => day >= p.from && day < p.until);
}
