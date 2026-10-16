import { reportError } from "@/src/reportError";
import { dayKey } from "./dates";
import { type Exercise, listExercises } from "./exercises";
import { isMuscleCode } from "./muscles";
import { getPreference, preferences } from "./preferences";
import type { MuscleCode } from "./schema";

/**
 * The zone a hero is sparing (M-04), apart from `db/pause.ts` because the quest readers ask about
 * it too and `pause.ts` imports the set-aside writer, which imports them.
 */
export const ZONE_KEY = "zone_goal";

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
export function touchesZone(exercise: Exercise, groups: readonly MuscleCode[]): boolean {
  return (
    exercise.muscles.some((m) => groups.includes(m)) ||
    (groups.includes("shoulder") && (exercise.pattern?.startsWith("push_") ?? false))
  );
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
 * The exercises a zone is sparing right now: whatever is set aside and works the zone, whoever set
 * it aside. A hand entry from before the zone counts, which is the point: a quest must not serve
 * the sore shoulder's push-up because the hero had also shelved it by hand.
 */
export async function sparedExerciseIds(now = new Date(Date.now())): Promise<Set<number>> {
  const zone = await getZone(now);
  if (!zone) return new Set();
  const aside = new Set((await preferences.getSetAsideExercises(now.getTime())).map((e) => e.id));
  const catalogue = await listExercises();
  return new Set(
    catalogue.filter((e) => aside.has(e.id) && touchesZone(e, zone.groups)).map((e) => e.id),
  );
}
