import type { Localized } from "@/src/i18n/deviceLanguage";
import { localizedName } from "@/src/i18n/localized";
import type { AppLanguage } from "@/stores/settings";
import type { Chain } from "./exercises";

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
export const PATH_NAMES: Record<string, Localized> = {
  // Pull — the deepest route in the catalogue, and the canonical "get me a first pull-up". The
  // pull-up is no longer its top (`0033` put the muscle-up above it), but it is the same route and
  // it keeps the same name: what moved is the key, not the identity.
  "Muscle-Up": {
    en: "Path of the Pull",
    fr: "Voie de la Traction",
    de: "Pfad des Ziehens",
    es: "Senda del tirón",
  },
  "Toes to Bar": {
    en: "Path of the Hang",
    fr: "Voie de la Suspension",
    de: "Pfad des Hängens",
    es: "Senda de la suspensión",
  },

  // Push
  "Handstand Push-Up": {
    en: "Path of Balance",
    fr: "Voie de l'Équilibre",
    de: "Pfad des Gleichgewichts",
    es: "Senda del equilibrio",
  },
  Dip: {
    en: "Path of the Support",
    fr: "Voie de l'Appui",
    de: "Pfad der Stütze",
    es: "Senda del apoyo",
  },
  "Archer Push-Up": {
    en: "Path of the Archer",
    fr: "Voie de l'Archer",
    de: "Pfad des Bogenschützen",
    es: "Senda del arquero",
  },
  // The word the floor hold was occupying until `0031` renamed it « Gainage ventral ».
  "Tuck Planche": {
    en: "Path of the Planche",
    fr: "Voie de la Planche",
    de: "Pfad der Planche",
    es: "Senda de la planche",
  },

  // Legs
  "Jump Squat": {
    en: "Path of the Leap",
    fr: "Voie de l'Élan",
    de: "Pfad des Sprungs",
    es: "Senda del salto",
  },
  "Pistol Squat": {
    en: "Path of the Pistol",
    fr: "Voie du Pistolet",
    de: "Pfad der Pistole",
    es: "Senda de la pistola",
  },
  "Single-Leg Deadlift": {
    en: "Path of the Hinge",
    fr: "Voie de la Charnière",
    de: "Pfad der Hüftbeuge",
    es: "Senda de la bisagra",
  },

  // Core
  "Dragon Flag": {
    en: "Path of the Dragon",
    fr: "Voie du Dragon",
    de: "Pfad des Drachen",
    es: "Senda del dragón",
  },
  "Side Plank": {
    en: "Path of the Flank",
    fr: "Voie du Flanc",
    de: "Pfad der Flanke",
    es: "Senda del flanco",
  },
  "Windshield Wipers": {
    en: "Path of Rotation",
    fr: "Voie de la Rotation",
    de: "Pfad der Rotation",
    es: "Senda de la rotación",
  },
  "Flutter Kicks": {
    en: "Path of the Flutter",
    fr: "Voie du Battement",
    de: "Pfad des Flatterns",
    es: "Senda del aleteo",
  },
};

/** The path's name, or null when its summit has none — the caller falls back to the movement. */
export function pathName(summitEnName: string, language: AppLanguage): string | null {
  return PATH_NAMES[summitEnName]?.[language] ?? null;
}

/**
 * What a chain says about the hero, read once so no two screens can disagree about it.
 *
 * `getChainTo` always ends its chain on the movement asked for, so the last rung is the summit —
 * and the summit is what names the path.
 */
export function readPath(chain: Chain, language: AppLanguage) {
  const total = chain.rungs.length;
  const summit = chain.rungs[total - 1]?.exercise;
  const here = chain.rungs[chain.position - 1]?.exercise;

  return {
    total,
    here,
    // Behind the hero, not the summit's `isEarned`: that one is windowed, and "climbed" would
    // blink out eight weeks after the hero stopped repeating a summit they own (`rungsBehind`).
    isClimbed: chain.climbed,
    name: summit ? (pathName(summit.enName, language) ?? localizedName(summit, language)) : null,
  };
}
