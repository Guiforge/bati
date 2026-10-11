import type { TFunction } from "i18next";
import { localizedTable } from "@/src/i18n/copy";
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
 *
 * The names are the `paths` block of `locales/*.json`, whose keys are those summits. A key
 * follows its route, not its movement: the pull path is keyed "Muscle-Up" since `0033` put the
 * muscle-up above the pull-up, and it is still the Path of the Pull. What moved is the key, not
 * the identity.
 */
export const PATH_NAMES: Record<string, Localized> = localizedTable((l) => l.paths);

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
  const named = summit ? pathName(summit.enName, language) : null;

  return {
    total,
    here,
    // Behind the hero, not the summit's `isEarned`: that one is windowed, and "climbed" would
    // blink out eight weeks after the hero stopped repeating a summit they own (`rungsBehind`).
    isClimbed: chain.climbed,
    /**
     * Whether `name` is a path's own name. When it is not, it is the movement's, and "Plank · Rung
     * 1/2" read as "the plank is rung 1": the caption has to say the hero is working up to it.
     */
    named: named !== null,
    name: summit ? (named ?? localizedName(summit, language)) : null,
  };
}

/**
 * The one line a path is told in, on the exercise screen and on the Home oath strip alike.
 *
 * A named path says its name ("Path of the Flank · Rung 1/3"). An unnamed one falls back to the
 * movement the chain ends on, so it says where it is going instead, with the words a substituted
 * quest slot already uses ("Working up to"). Null when the chain has no rungs to name.
 */
export function pathCaption(chain: Chain, language: AppLanguage, t: TFunction): string | null {
  const { total, isClimbed, named, name } = readPath(chain, language);
  if (name === null) return null;
  if (isClimbed) return t("exercises.path_climbed", { path: name });
  return named
    ? t("exercises.path_rung", { path: name, position: chain.position, total })
    : t("exercises.path_working_up", { name, position: chain.position, total });
}
