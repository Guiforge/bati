import type { AppLanguage } from "@/stores/settings";

/**
 * The named routes up the variation ladder — a *path*, keyed by the movement it ends on.
 *
 * Everything else Bati does carries a name: a quest is "The Squire's Awakening", the village
 * climbs from *hameau* to *capitale éternelle*, the flame runs Spark → Eternal. The ladder alone
 * spoke in coordinates — "rung 3 of 6" — and a coordinate cannot be wanted or told to anyone.
 * The chain was already there (`prerequisiteExerciseId`, migration `0022`); only the noun was
 * missing.
 *
 * **Keyed by `enName`, like `OATH_PRESETS`** (`db/oaths.ts`): seed content references movements by
 * their English name because ids are seeding order and renames keep ids stable, not the reverse.
 * A path is identified by its summit because walking *down* a chain is unambiguous — one
 * prerequisite per movement — while branching only ever happens going up. So the movement a route
 * ends on names the whole route.
 *
 * Unnamed summits fall back to the movement's own localized name (`pathName` returns null), so
 * content never blocks code and a ladder edge added later leaves no hole on screen.
 */
export const PATH_NAMES: Record<string, { en: string; fr: string }> = {
  // Pull — the deepest route in the catalogue, and the canonical "get me a first pull-up".
  "Pull-ups": { en: "Path of the Pull", fr: "Voie de la Traction" },
  "Hanging Leg Raise": { en: "Path of the Hang", fr: "Voie de la Suspension" },

  // Push
  "Handstand Push-Up": { en: "Path of Balance", fr: "Voie de l'Équilibre" },
  Dip: { en: "Path of the Support", fr: "Voie de l'Appui" },
  "Diamond Push-Up": { en: "Path of the Diamond", fr: "Voie du Diamant" },

  // Legs
  "Jump Squat": { en: "Path of the Leap", fr: "Voie de l'Élan" },
  "Curtsy Squat": { en: "Path of the Curtsy", fr: "Voie de la Révérence" },
  "Single-Leg Deadlift": { en: "Path of the Hinge", fr: "Voie de la Charnière" },

  // Core. "Équerre" is the French gymnastics term for the L-sit, which is what the route is for.
  "L-Sit": { en: "Path of the L-Sit", fr: "Voie de l'Équerre" },
  "Side Plank": { en: "Path of the Flank", fr: "Voie du Flanc" },
  "Windshield Wipers": { en: "Path of Rotation", fr: "Voie de la Rotation" },
  "Flutter Kicks": { en: "Path of the Flutter", fr: "Voie du Battement" },
};

/** The path's name, or null when its summit has none — the caller falls back to the movement. */
export function pathName(summitEnName: string, language: AppLanguage): string | null {
  return PATH_NAMES[summitEnName]?.[language] ?? null;
}
