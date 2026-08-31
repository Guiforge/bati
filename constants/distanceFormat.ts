import type { DistanceUnit } from "@/db/preferences";

/**
 * Stored metres, turned into what a hero reads. The only place that converts.
 *
 * **Metres are the storage unit and the only storage unit.** `distanceM` on a track, the
 * `<desc>` in a GPX, anything that ever reaches a column or a file: metres. A value that could
 * be one of two units is the bug `db/workUnits.ts` exists to correct one storey down, where
 * reps and seconds shared a column and nothing in the column said which — so this file converts
 * at render time and hands back a *string*, which is the one shape nobody can accidentally
 * persist as a number.
 *
 * The unit words are the same in both languages Bati speaks (m, km, ft, mi, and a pace written
 * `/km`), so there is nothing here for i18n to own. The day a third locale disagrees, this is
 * the one function that has to learn about it.
 */
const M_PER_MILE = 1609.344;
const M_PER_FOOT = 0.3048;
const FEET_PER_MILE = 5280;

/**
 * Rounding happens before the threshold, not after: 999.6 m is "1.00 km", never "1000 m".
 * The imperial cut-over is `5280 ft`, which is exactly one mile — the same comparison, done in
 * the unit that is about to be printed.
 */
export function formatDistance(metres: number, unit: DistanceUnit): string {
  if (!Number.isFinite(metres) || metres < 0) return "—";

  if (unit === "imperial") {
    const feet = Math.round(metres / M_PER_FOOT);
    return feet < FEET_PER_MILE ? `${feet} ft` : `${(metres / M_PER_MILE).toFixed(2)} mi`;
  }

  const rounded = Math.round(metres);
  return rounded < 1000 ? `${rounded} m` : `${(metres / 1000).toFixed(2)} km`;
}

/**
 * Pace, from the same two numbers a session already keeps: metres covered and moving time.
 *
 * Minutes are not clamped to 59 — an hour per kilometre is a real thing a stopped phone can
 * produce, and "1:03" would be a lie where "63:00" is merely surprising.
 */
export function formatPace(metres: number, movingMs: number, unit: DistanceUnit): string {
  if (!Number.isFinite(metres) || !Number.isFinite(movingMs) || metres <= 0 || movingMs <= 0) {
    return "—";
  }

  const perUnitM = unit === "imperial" ? M_PER_MILE : 1000;
  const total = Math.round((movingMs / 1000) * (perUnitM / metres));
  const suffix = unit === "imperial" ? "/mi" : "/km";
  return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, "0")} ${suffix}`;
}
