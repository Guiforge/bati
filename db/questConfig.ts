import { type Exercise, listExercises } from "./exercises";
import { deletePreference, getAllPreferences, getPreference, setPreference } from "./preferences";
import { getQuestById, type Quest, type QuestExercise } from "./quests";
import {
  clampToRange,
  DISTANCE_GOAL_RANGE,
  Difficulty,
  REST_RANGE,
  ROUNDS_RANGE,
  retargetForMovement,
  TARGET_RANGE,
  TIME_TARGET_MAX,
  targetRangeFor,
  type UserLevel,
} from "./targets";

/**
 * What the hero changed on a quest and wants back next time: the level they train it at, plus
 * optional overrides of the template's rounds, both rests and per-exercise targets.
 *
 * Stored as JSON in `user_preferences` rather than in the quest row, because the template is
 * shared content: an override must survive a content update, and must not leak into anyone
 * else's copy of the same quest.
 */
export type QuestConfig = {
  level: UserLevel;
  rounds?: number;
  restSeconds?: number;
  roundRestSeconds?: number;
  /**
   * A distance goal for an outing, in metres. Only read when every slot is an expedition; a
   * workout ignores it. Outranks the slot's duration as the goal, never replaces the target: the
   * session still records seconds, and the ground goes on `completed_sessions.leaguesM`.
   */
  distanceM?: number;
  /**
   * quest_exercises row id -> target value. Editing a quest rewrites those rows, so stale keys
   * are possible; `applyQuestConfig` simply ignores ids the quest no longer has.
   */
  targets?: Record<string, number>;
  /**
   * quest_exercises row id -> the exercise the hero put in that slot instead. Same stale-key rule
   * as `targets`, and the same reason it lives here rather than on the quest row: a substitution
   * is this hero's, and the template is shared content.
   */
  swaps?: Record<string, number>;
};

/** The private alias the readers below use; the clamp itself lives with the ranges. */
function clamp(value: number, range: { min: number; max: number }): number {
  return clampToRange(value, range);
}

const configKey = (questId: number) => `quest:${questId}:config`;

function isLevel(value: unknown): value is UserLevel {
  return value === Difficulty.Easy || value === Difficulty.Medium || value === Difficulty.Hard;
}

function readNumber(value: unknown, range: { min: number; max: number }): number | undefined {
  return typeof value === "number" && Number.isFinite(value) ? clamp(value, range) : undefined;
}

/**
 * Not `readNumber`: its `clamp` would round a corrupt `3.7` into exercise id 4, which exists. An
 * id is either an id or nothing — whether it still *names* an exercise is `applyQuestConfig`'s
 * problem, exactly as with a stale `targets` key.
 */
function readSwaps(value: unknown): Record<string, number> | undefined {
  if (typeof value !== "object" || value === null) return undefined;

  const swaps: Record<string, number> = {};
  for (const [key, raw] of Object.entries(value)) {
    if (typeof raw === "number" && Number.isInteger(raw) && raw > 0) swaps[key] = raw;
  }

  return Object.keys(swaps).length > 0 ? swaps : undefined;
}

function readTargets(value: unknown): Record<string, number> | undefined {
  if (typeof value !== "object" || value === null) return undefined;

  const targets: Record<string, number> = {};
  for (const [key, raw] of Object.entries(value)) {
    // The slot's unit is not in the config, so the permissive ceiling here and the real
    // per-type one in `applyQuestConfig`, which has the quest.
    const target = readNumber(raw, { min: TARGET_RANGE.min, max: TIME_TARGET_MAX });
    if (target !== undefined) targets[key] = target;
  }

  return Object.keys(targets).length > 0 ? targets : undefined;
}

/** Exported for the test: everything here comes back from SQLite as untrusted text. */
export function parseQuestConfig(raw: string | null): QuestConfig | null {
  if (raw === null) return null;

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return null;
  }
  if (typeof parsed !== "object" || parsed === null) return null;

  const record = parsed as Record<string, unknown>;
  const config: QuestConfig = {
    level: isLevel(record.level) ? record.level : Difficulty.Medium,
  };

  const rounds = readNumber(record.rounds, ROUNDS_RANGE);
  if (rounds !== undefined) config.rounds = rounds;

  const restSeconds = readNumber(record.restSeconds, REST_RANGE);
  if (restSeconds !== undefined) config.restSeconds = restSeconds;

  const roundRestSeconds = readNumber(record.roundRestSeconds, REST_RANGE);
  if (roundRestSeconds !== undefined) config.roundRestSeconds = roundRestSeconds;

  const distanceM = readNumber(record.distanceM, DISTANCE_GOAL_RANGE);
  if (distanceM !== undefined) config.distanceM = distanceM;

  const targets = readTargets(record.targets);
  if (targets !== undefined) config.targets = targets;

  const swaps = readSwaps(record.swaps);
  if (swaps !== undefined) config.swaps = swaps;

  return config;
}

export async function getQuestConfig(questId: number): Promise<QuestConfig | null> {
  return parseQuestConfig(await getPreference(configKey(questId)));
}

/** Every saved per-quest config in one read — the gallery prices 34 cards per render. */
export async function getAllQuestConfigs(): Promise<Map<number, QuestConfig>> {
  const prefs = await getAllPreferences();
  const configs = new Map<number, QuestConfig>();
  for (const [key, value] of Object.entries(prefs)) {
    const match = key.match(/^quest:(\d+):config$/);
    if (!match?.[1]) continue;
    const parsed = parseQuestConfig(value);
    if (parsed) configs.set(Number(match[1]), parsed);
  }
  return configs;
}

export async function saveQuestConfig(questId: number, config: QuestConfig): Promise<void> {
  await setPreference(configKey(questId), JSON.stringify(config));
}

export async function clearQuestConfig(questId: number): Promise<void> {
  await deletePreference(configKey(questId));
}

/** True when the config changes anything beyond the remembered level. */
export function hasQuestOverrides(config: QuestConfig | null): boolean {
  if (!config) return false;
  return (
    config.rounds !== undefined ||
    config.restSeconds !== undefined ||
    config.roundRestSeconds !== undefined ||
    config.distanceM !== undefined ||
    Object.keys(config.targets ?? {}).length > 0 ||
    Object.keys(config.swaps ?? {}).length > 0
  );
}

/**
 * The catalogue keyed by id, the shape `applyQuestConfig` wants. Exported so the quest screen
 * builds it the same way Home does — the two must agree on what "this quest" means.
 */
export function indexExercises(exercises: Exercise[]): Record<number, Exercise> {
  return Object.fromEntries(exercises.map((e) => [e.id, e] as const));
}

/** The three structural fields a saved config can override, on either a `Quest` or a `QuestTemplate`. */
type TemplateOverrides = {
  rounds: number;
  restSeconds: number;
  roundRestSeconds: number | null;
};

/**
 * The precedence a saved config's structural overrides take over the pristine template: a saved
 * `rounds`/`restSeconds`/`roundRestSeconds` wins, an absent one falls back to the template's own.
 * Both quest galleries estimate duration/XP off this, and `applyQuestConfig` below builds the
 * actual session off the same precedence — one seam instead of three copies drifting apart.
 */
export function resolveTemplateOverrides(
  template: TemplateOverrides,
  config: QuestConfig | null,
): TemplateOverrides {
  return {
    rounds: config?.rounds ?? template.rounds,
    restSeconds: config?.restSeconds ?? template.restSeconds,
    roundRestSeconds: config?.roundRestSeconds ?? template.roundRestSeconds,
  };
}

/**
 * The quest as this hero configured it. Pure so the estimate, the XP preview and the session all
 * read the same numbers: apply once, then everything downstream keeps working untouched.
 *
 * `exercisesById` is **required**, not optional, and that is the whole point. A substitution needs
 * the replacement's full row, which this function has no way to fetch without going async and
 * losing its purity — so the catalogue is threaded in. Optional, `loadConfiguredQuest` would keep
 * compiling while silently ignoring every swap, and Home would start push-ups while the quest
 * screen started dips. Required, that divergence is a compile error at every call site.
 */
export function applyQuestConfig(
  quest: Quest,
  config: QuestConfig | null,
  exercisesById: Record<number, Exercise>,
): Quest {
  if (!hasQuestOverrides(config) || !config) return quest;

  return {
    ...quest,
    ...resolveTemplateOverrides(quest, config),
    exercises: applyConfigToSlots(quest.exercises, config, exercisesById),
  };
}

/**
 * The hero's per-slot overrides, applied to slots that are already resolved for their level.
 *
 * Split out of `applyQuestConfig` so the gallery's synchronous preview reads the saved config
 * through the same projection the session runs on, rather than through a second copy of it: two
 * readers of one config is how the same quest came to advertise "≈ 12 min, up to +140 XP" on its
 * card and "≈ 10 min, up to +70 XP" on its own detail screen.
 */
export function applyConfigToSlots(
  slots: readonly QuestExercise[],
  config: QuestConfig | null,
  exercisesById: Record<number, Exercise>,
): QuestExercise[] {
  if (!hasQuestOverrides(config) || !config) return [...slots];

  const targets = config.targets ?? {};
  const swaps = config.swaps ?? {};

  return slots.map((qex) => {
    const key = String(qex.id);
    const swappedId = swaps[key];
    const substitute = swappedId === undefined ? undefined : exercisesById[swappedId];
    // The unit is resolved first, then the hero's number lands in it. `applySwap` drops the
    // override when the movement changes, so `targets[id]` is only ever a value for the movement
    // standing in the slot now — after a swap that flipped the unit, a value in the *new* unit.
    // Retargeting second discarded exactly those: a slot swapped from a hold onto a counted
    // movement showed the level's default reps and every step of the field was thrown away on
    // the next render, which read as a frozen control. The clamp follows the resolved unit too;
    // on the old order it measured reps against the range for seconds.
    const base =
      substitute === undefined
        ? qex.target
        : retargetForMovement(qex.target, substitute, config.level);
    const raw = targets[key];
    // The style follows the resolved unit, for the same reason the unit follows the swap: an
    // hour is a hold's ceiling and a walk is not a hold, so a slot standing on an expedition
    // may be set past it.
    const movement = substitute ?? qex.exercise;
    const value =
      raw === undefined ? undefined : clamp(raw, targetRangeFor(base.type, movement.style));

    if (substitute === undefined && value === undefined) return qex;

    return {
      ...qex,
      target: value === undefined ? base : { ...base, value },
      ...(substitute === undefined
        ? {}
        : {
            exercise: substitute,
            // `images` is the quest's own art *of the movement that used to be here*, off
            // `quest_exercises.imagesJson`. Kept, the card illustrates the wrong exercise.
            images: [],
            // The ghost belongs to the slot's old movement too, and the substitute's own
            // history is not in this object — better silent than wrong.
            ghost: undefined,
            // An explicit swap outranks the rung substitution `getQuestById` may have made, so
            // the "we served you an easier rung" caption has to go with it. Left behind, the
            // screen would explain a substitution that is no longer on the slot.
            substitutedFor: undefined,
          }),
    };
  });
}

/**
 * A quest ready to run, for a caller that only has its id: the saved level, the template at that
 * level, and the hero's overrides applied.
 *
 * Home starts a session without opening the quest screen, so the two paths have to agree on what
 * "this quest" means. They agree by reading the same saved config — the quest screen composes these
 * same three calls in React state instead, because there the hero can still change them before
 * pressing start.
 *
 * `level` outranks the saved one, for the quick door on Home: an outing has no level the hero ever
 * chose, so it always leaves at `medium` however the quest screen was left. It is threaded into the
 * config rather than only into `getQuestById`, because `applyQuestConfig` reads `config.level` of
 * its own to retarget a swapped movement — generated at one level and retargeted at another, a
 * swapped slot came out asking for a length nothing on screen had ever said.
 */
export async function loadConfiguredQuest(
  questId: number,
  level?: UserLevel,
): Promise<{ quest: Quest; level: UserLevel; config: QuestConfig | null } | null> {
  // `listExercises()` is promise-cached, so the catalogue is free after the first read anywhere
  // in the app — and it is what lets a swap resolve without this function knowing about screens.
  const [saved, exercises] = await Promise.all([getQuestConfig(questId), listExercises()]);
  const effective = level ?? saved?.level ?? Difficulty.Medium;
  const config = saved === null ? null : { ...saved, level: effective };
  const quest = await getQuestById(questId, effective);
  if (!quest) return null;

  return {
    quest: applyQuestConfig(quest, config, indexExercises(exercises)),
    level: effective,
    // The config itself, not only the quest it shaped. `applyQuestConfig` folds the hero's
    // choices into the slots, and a distance goal is the one choice that is *not* a slot: it
    // lives beside them, and it was read here and dropped on the floor. So the tile on Home
    // started every walk with `goal: null` while the screen that saved the distance said, in its
    // own hint, "Saved for this quest. It comes back next time."
    config,
  };
}
