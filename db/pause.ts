import { addDays, addWeeks, startOfDay } from "date-fns";
import {
  PAUSE_KEY,
  PAUSE_MAX_DAYS,
  type PausePeriod,
  ZONE_MAX_GROUPS,
  ZONE_MAX_WEEKS,
} from "@/constants/pause";
import { reportError } from "@/src/reportError";
import { dayKey } from "./dates";
import { type Exercise, listExercises } from "./exercises";
import { isMuscleCode } from "./muscles";
import { getPreference, preferences, setPreference } from "./preferences";
import { clearCached } from "./queryCache";
import type { MuscleCode } from "./schema";
import { putExerciseBack, setExerciseAside } from "./setAside";
import { getPausePeriods, invalidateStreakInfo } from "./streaks";

/**
 * M-04: the two things a hero can say when their body, or their life, asks for room. Nothing here
 * is a migration: a pause is a list of days in a preference (`pause_goal`, which the flame reads
 * through `db/streaks.ts`), a zone is a preference plus entries in the set-aside list.
 *
 * ponytail: both live on this device only, like the set-aside list, and are not in
 * `MERGED_PREFERENCES`. Two devices keep two pauses. Merge the list by period the day someone
 * syncs a phone and a tablet and notices the flame differs.
 */
const ZONE_KEY = "zone_goal";

/** A zone being spared: which groups, from when, until the day the exercises come back. */
export type Zone = { groups: MuscleCode[]; from: string; until: string };

function isZone(value: unknown): value is Zone {
  if (typeof value !== "object" || value === null) return false;
  const { groups, from, until } = value as Record<string, unknown>;
  return (
    Array.isArray(groups) &&
    groups.every(isMuscleCode) &&
    typeof from === "string" &&
    typeof until === "string"
  );
}

/**
 * Whether an exercise loads a spared zone. The muscle tags decide, with one addition: a press
 * loads the shoulder whatever its tags say (a Dip is tagged arms and chest, a Knee Push-Up the
 * same), and a hero sparing a shoulder who is served a dip has not been spared.
 *
 * ponytail: shoulders only, by movement pattern. Ceiling: the joints (wrist, elbow, knee, lower
 * back) are the second phase of M-04 and need the 65 exercises labelled; do it there, not here.
 */
function touchesZone(exercise: Exercise, groups: readonly MuscleCode[]): boolean {
  return (
    exercise.muscles.some((m) => groups.includes(m)) ||
    (groups.includes("shoulder") && (exercise.pattern?.startsWith("push_") ?? false))
  );
}

/** The pause the hero is in today, or null. */
export async function getActivePause(now = new Date()): Promise<PausePeriod | null> {
  const today = dayKey(now);
  return (await getPausePeriods()).find((p) => p.from <= today && today < p.until) ?? null;
}

/**
 * Pause from today until `returnOn` (a local `yyyy-MM-dd`), the day the hero trains again. Never
 * further than 56 days, never today or before. Replaces a pause already running: its days so far
 * stay paused, which is what "skipped entirely" means for a flame that already skipped them.
 */
export async function startPause(returnOn: string, now = new Date()): Promise<void> {
  const today = dayKey(now);
  if (returnOn <= today || returnOn > dayKey(addDays(now, PAUSE_MAX_DAYS))) {
    throw new Error("A pause ends after today and within 8 weeks");
  }
  const past = (await getPausePeriods())
    .filter((p) => p.until <= today)
    .concat(keptOfActive(await getActivePause(now), today));
  await write([...past, { from: today, until: returnOn }]);
}

/** What the hero already lived of a pause that is replaced or ended today. */
function keptOfActive(active: PausePeriod | null, today: string): PausePeriod[] {
  return active && active.from < today ? [{ from: active.from, until: today }] : [];
}

/** Back today. The days already paused stay paused. */
export async function endPause(now = new Date()): Promise<void> {
  const today = dayKey(now);
  const active = await getActivePause(now);
  if (!active) return;
  const rest = (await getPausePeriods()).filter((p) => p.from !== active.from);
  await write([...rest, ...keptOfActive(active, today)]);
}

async function write(periods: PausePeriod[]): Promise<void> {
  await setPreference(PAUSE_KEY, JSON.stringify(periods));
  // The flame is memoised for the day: a pause begun now must show now.
  invalidateStreakInfo();
}

/** The zone being spared today, or null. */
export async function getZone(now = new Date()): Promise<Zone | null> {
  const raw = await getPreference(ZONE_KEY);
  if (!raw) return null;
  try {
    const parsed: unknown = JSON.parse(raw);
    return isZone(parsed) && parsed.until > dayKey(now) ? parsed : null;
  } catch (error) {
    reportError("pause.zoneParse", error);
    return null;
  }
}

/**
 * Spare 1 or 2 muscle groups for 1 to 8 weeks: every exercise that works one of them is set aside
 * until the end date, through the same writer as a hand set-aside, with the reason `zone`. Quests
 * serve a replacement and the warm-up skips them, because that is what a set-aside exercise is.
 * Nothing about the flame changes. A zone already running is replaced.
 */
export async function startZone(
  groups: readonly MuscleCode[],
  weeks: number,
  now = new Date(),
): Promise<Zone> {
  const chosen = [...new Set(groups)];
  if (chosen.length < 1 || chosen.length > ZONE_MAX_GROUPS || !chosen.every(isMuscleCode)) {
    throw new Error("A zone is one or two of the six muscle groups");
  }
  if (!Number.isInteger(weeks) || weeks < 1 || weeks > ZONE_MAX_WEEKS) {
    throw new Error("A zone lasts 1 to 8 weeks");
  }
  await endZone(now);

  const end = startOfDay(addWeeks(now, weeks));
  const zone: Zone = { groups: chosen, from: dayKey(now), until: dayKey(end) };
  await setPreference(ZONE_KEY, JSON.stringify(zone));
  // One after the other: each call reads the list it then appends to.
  for (const exercise of await listExercises()) {
    if (touchesZone(exercise, chosen)) {
      await setExerciseAside(exercise.id, now.getTime(), end.getTime());
    }
  }
  return zone;
}

/** Done early: what the zone set aside comes back, what the hero's hand set aside stays. */
export async function endZone(now = new Date()): Promise<void> {
  if (!(await getZone(now))) return;
  await setPreference(ZONE_KEY, "");
  const mine = (await preferences.getSetAsideExercises(now.getTime())).filter(
    (e) => e.reason === "zone",
  );
  for (const e of mine) await putExerciseBack(e.id);
  clearCached("quest:");
}

/**
 * Whether an oath on `exerciseId` (null for one that names none) stands still: during any pause,
 * and during a zone only if that exercise works it. `db/oaths.ts` is the reader.
 */
export async function isFrozenFor(exerciseId: number | null, now = new Date()): Promise<boolean> {
  if (await getActivePause(now)) return true;
  const zone = exerciseId === null ? null : await getZone(now);
  if (!zone) return false;
  const exercise = (await listExercises()).find((e) => e.id === exerciseId);
  return exercise ? touchesZone(exercise, zone.groups) : false;
}
