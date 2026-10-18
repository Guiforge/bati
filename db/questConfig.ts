import { eq, isNotNull, sql } from "drizzle-orm";
import { db, schema } from "./client";
import { workoutsBeforeToday } from "./completed";
import { type Exercise, listExercises } from "./exercises";
import { isOutingSession } from "./expeditions";
import { isLightWeekRunning, lightenRounds, lightWeekSince } from "./lightWeek";
import { getExerciseHistory, ghostKey } from "./personalRecords";
import {
  deletePreference,
  getAllPreferences,
  getPreference,
  isStartingOut,
  preferences,
  setPreference,
  type TrainingLevel,
} from "./preferences";
import {
  getQuestById,
  listQuestTemplates,
  movementRef,
  progressiveSlot,
  type Quest,
  type QuestExercise,
  type SlotJournal,
  USER_QUEST_AUTHOR,
} from "./quests";
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
import { NON_REP_STYLE } from "./workUnits";
import { sparedExerciseIds } from "./zone";

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

/**
 * Where a quest the hero never touched starts, from their answer to "Tu en es où ?". The written
 * rule is in docs/gameplay/progression.md. Hard is never a first default: it is the hero's own
 * choice, or what they last lived on that quest.
 */
export function startingDifficulty(answer: TrainingLevel | null, sessions: number): UserLevel {
  return isStartingOut(answer, sessions) ? Difficulty.Easy : Difficulty.Medium;
}

/**
 * The level a quest with no saved config starts at: the one the hero last played it at, else
 * `startingDifficulty`. Every door reads this (Home, onboarding, the quest screen, the galleries,
 * the adventures' base), because two doors with two defaults started the same first quest at 8
 * reps and at 10. The journal comes first so that a level change in Settings, or an update,
 * never moves a quest the hero already knows; sessions sync between devices, configs do not.
 *
 * A quest the hero wrote, or was sent, starts as written: its numbers are theirs, and Easy would
 * hand back three quarters of them.
 *
 * A handful of reads for a whole gallery, hence a resolver rather than one call per quest.
 */
export async function loadDefaultLevels(): Promise<(questId: number) => UserLevel> {
  const { completedQuest, quests } = schema;
  const [answer, sessions, written, rows] = await Promise.all([
    preferences.getTrainingLevel(),
    // Before today, like `startsGently`'s count: the answer must not change in the middle of a day.
    workoutsBeforeToday(),
    db.select({ id: quests.id }).from(quests).where(eq(quests.author, USER_QUEST_AUTHOR)),
    // SQLite hands back the bare columns of the row that holds the max().
    db
      .select({
        questId: completedQuest.questId,
        level: completedQuest.userLevel,
        lastAt: sql<number>`max(${completedQuest.performedAt})`,
      })
      .from(completedQuest)
      .where(isNotNull(completedQuest.questId))
      .groupBy(completedQuest.questId),
  ]);
  const played = new Map(rows.map((r) => [r.questId, r.level] as const));
  const asWritten = new Set(written.map((q) => q.id));
  const fallback = startingDifficulty(answer, sessions);
  return (questId) =>
    played.get(questId) ?? (asWritten.has(questId) ? Difficulty.Medium : fallback);
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

export async function getQuestConfig(
  questId: number,
  options?: { raw?: boolean },
): Promise<QuestConfig | null> {
  const config = parseQuestConfig(await getPreference(configKey(questId)));
  if (!config || options?.raw) return config;
  const hide = await zoneHiding();
  return hide ? partition(config, hide).shown : config;
}

/**
 * M-04: what a zone is sparing, and which slot names what. While it lasts, a saved swap onto a
 * spared exercise and a target set for a spared exercise are hidden from every reader, instead of
 * being dropped the way a hand set-aside drops them: a zone ends by itself, and the hero's
 * configuration has to be there when it does. Null when nothing is spared, which is nearly always.
 */
async function zoneHiding() {
  const spared = await sparedExerciseIds();
  if (spared.size === 0) return null;
  const writtenBy = new Map(
    (await listQuestTemplates()).flatMap((q) =>
      q.exercises.map((s) => [String(s.id), s.exerciseId] as const),
    ),
  );
  return { spared, writtenBy };
}

type Hiding = NonNullable<Awaited<ReturnType<typeof zoneHiding>>>;

/** Whether a zone hides this slot: its swap is spared, or it has none and what it writes is. */
function slotHidden(
  swaps: Record<string, number> | undefined,
  { spared, writtenBy }: Hiding,
  slot: string,
) {
  const swapped = swaps?.[slot];
  return swapped === undefined ? spared.has(writtenBy.get(slot) ?? -1) : spared.has(swapped);
}

function partition(config: QuestConfig, hiding: Hiding) {
  const { spared } = hiding;
  const swaps = config.swaps ?? {};
  const hiddenSlot = (slot: string) => slotHidden(swaps, hiding, slot);
  const pick = (entries: Record<string, number> | undefined, hide: (key: string) => boolean) => {
    const shown: Record<string, number> = {};
    const hidden: Record<string, number> = {};
    for (const [key, value] of Object.entries(entries ?? {}))
      (hide(key) ? hidden : shown)[key] = value;
    return { shown, hidden };
  };
  const s = pick(config.swaps, (slot) => spared.has(swaps[slot] ?? -1));
  const t = pick(config.targets, hiddenSlot);
  const orUndefined = (r: Record<string, number>) => (Object.keys(r).length > 0 ? r : undefined);
  return {
    shown: { ...config, swaps: orUndefined(s.shown), targets: orUndefined(t.shown) },
    hidden: { swaps: s.hidden, targets: t.hidden },
  };
}

/** Every saved per-quest config in one read — the gallery prices 34 cards per render. */
export async function getAllQuestConfigs(options?: {
  raw?: boolean;
}): Promise<Map<number, QuestConfig>> {
  const prefs = await getAllPreferences();
  const configs = new Map<number, QuestConfig>();
  for (const [key, value] of Object.entries(prefs)) {
    const match = key.match(/^quest:(\d+):config$/);
    if (!match?.[1]) continue;
    const parsed = parseQuestConfig(value);
    if (parsed) configs.set(Number(match[1]), parsed);
  }
  const hide = options?.raw ? null : await zoneHiding();
  if (hide) for (const [id, config] of configs) configs.set(id, partition(config, hide).shown);
  return configs;
}

/**
 * Saves what the reader saw. During a zone that is a view with entries hidden, so the hidden ones
 * are put back under what is saved (`raw` writes exactly what it is given, for the set-aside
 * writer, which reads raw too). A hidden target comes back only while its slot is not swapped
 * elsewhere in what is saved, or it would land on the new movement. `replace` is for the writers
 * that start over on purpose: "targets" lets the hidden targets go too (a level change), "all"
 * the hidden swaps as well (a reset, the editor).
 */
export async function saveQuestConfig(
  questId: number,
  config: QuestConfig,
  options?: { raw?: boolean; replace?: "targets" | "all" },
): Promise<void> {
  const hide = options?.raw ? null : await zoneHiding();
  const stored = hide ? await getQuestConfig(questId, { raw: true }) : null;
  const { hidden } = stored && hide ? partition(stored, hide) : { hidden: null };
  // One rule: once the swaps are merged, a slot the zone hides takes its hidden target and none
  // from what was saved, since the target on screen was set for the movement served, not the one
  // hidden. Every other slot takes what was saved. `replace` lets the hidden targets go.
  // ponytail: a target tuned during a zone on the served movement of a hidden slot does not
  // survive the reload (the reader hides it); keeping it would need a second store.
  const next =
    hidden && hide
      ? (() => {
          const swaps =
            options?.replace === "all" ? config.swaps : { ...hidden.swaps, ...config.swaps };
          const kept = (slot: string) => slotHidden(swaps, hide, slot);
          const own = Object.entries(config.targets ?? {}).filter(([slot]) => !kept(slot));
          const back = options?.replace
            ? []
            : Object.entries(hidden.targets).filter(([slot]) => kept(slot));
          return { ...config, swaps, targets: Object.fromEntries([...back, ...own]) };
        })()
      : config;
  await setPreference(configKey(questId), JSON.stringify(next));
}

/**
 * Give up a saved swap on one slot, from a session: the hero pinned a movement above their rung
 * ("I can already do this"), then skipped it or swapped away from it mid-set. Left in place, the
 * quest would serve the same movement next time, and the only way back is a button on a screen
 * they are not on. The target tuned for that movement goes with it, as in `applySwap`.
 */
export async function dropSlotSwap(questId: number, questExerciseId: number): Promise<void> {
  const config = await getQuestConfig(questId);
  if (!config || config.swaps?.[String(questExerciseId)] === undefined) return;
  await saveQuestConfig(questId, withoutSlotSwap(config, questExerciseId));
}

/**
 * A config with one slot's swap gone, and the target tuned for that movement with it: the pair
 * `applySwap` keeps together. The one place that says what "this slot's swap" is made of, for
 * the session above and for the quest screen's "Back to X".
 */
export function withoutSlotSwap(config: QuestConfig, questExerciseId: number): QuestConfig {
  const key = String(questExerciseId);
  const without = (entries: Record<string, number> | undefined) =>
    Object.fromEntries(Object.entries(entries ?? {}).filter(([id]) => id !== key));
  return { ...config, swaps: without(config.swaps), targets: without(config.targets) };
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
  journal: SwapJournal,
): Quest {
  if (!hasQuestOverrides(config) || !config) return quest;

  return {
    ...quest,
    ...resolveTemplateOverrides(quest, config),
    exercises: applyConfigToSlots(quest.exercises, config, exercisesById, journal),
  };
}

/**
 * What a swapped-in movement is progressed on: its own history, which the quest's journal does not
 * hold (it was read for the movements the quest writes). **Required** by `applyConfigToSlots`, for
 * the reason `exercisesById` is: optional, a caller would compile and silently skip the
 * progression on every swapped slot.
 */
export type SwapJournal = Pick<SlotJournal, "history" | "readAt" | "freezeAt">;

/** The swapped-in movements' history, free when the quest has no swap. */
export async function loadSwapJournal(
  config: Pick<QuestConfig, "swaps"> | null,
): Promise<SwapJournal> {
  const freezeAt = await lightWeekSince(new Date());
  return {
    history: await getExerciseHistory(Object.values(config?.swaps ?? {})),
    readAt: Date.now(),
    ...(freezeAt == null ? {} : { freezeAt }),
  };
}

/**
 * A slot's target once the hero's own number is on it, and what the app had prescribed there
 * (`0070`): rung credit, crit odds and the damage cap keep reading the app's value.
 */
function ownTarget(
  base: QuestExercise["target"],
  value: number | undefined,
): Pick<QuestExercise, "target" | "prescribed"> {
  if (value === undefined || value === base.value) return { target: base };
  return { target: { ...base, value }, prescribed: base.value };
}

/**
 * "I can already do this": the hero swapped in the very movement the ladder stepped down from.
 * Not a swap to something else, and not a set-aside slot, where the written movement is the one
 * thing they asked never to be handed. Names the rung it overrides, which is the way back.
 */
function pinOver(
  qex: QuestExercise,
  substitute: Exercise | undefined,
): Pick<QuestExercise, "pinnedOver"> {
  const written = qex.substitutedFor;
  const pinned = substitute && written && !written.setAside && written.id === substitute.id;
  return pinned ? { pinnedOver: movementRef(qex.exercise) } : {};
}

/**
 * A swapped-in movement is progressed on its own history, from the bottom of the band when it has
 * none ("on repart en bas de la fourchette"). A pin already carries the written movement's
 * progressive target, an outing has no progression, and a hero's own quest has no band
 * (`substitute` was false when it was built).
 */
function swappedProgress(input: {
  qex: QuestExercise;
  substitute: Exercise | undefined;
  pin: Pick<QuestExercise, "pinnedOver">;
  retargeted: QuestExercise["target"];
  config: QuestConfig;
  journal: SwapJournal;
}) {
  const { qex, substitute, pin, retargeted, config, journal } = input;
  if (!substitute || pin.pinnedOver || !qex.band || substitute.style === NON_REP_STYLE) {
    return undefined;
  }
  return progressiveSlot({
    base: qex.band,
    fallback: retargeted,
    exercise: substitute,
    level: config.level,
    journal,
    start: "floor",
  });
}

function resolveBase(
  qex: QuestExercise,
  substitute: Exercise | undefined,
  config: QuestConfig,
  journal: SwapJournal,
) {
  // The unit is resolved first, then the hero's number lands in it. `applySwap` drops the
  // override when the movement changes, so `targets[id]` is only ever a value for the movement
  // standing in the slot now (after a swap that flipped the unit, a value in the *new* unit).
  // Retargeting second discarded exactly those: a slot swapped from a hold onto a counted
  // movement showed the level's default reps and every step of the field was thrown away on
  // the next render, which read as a frozen control. The clamp follows the resolved unit too;
  // on the old order it measured reps against the range for seconds.
  // A pin has a better answer than a retarget: the target the quest wrote for that movement.
  const pin = pinOver(qex, substitute);
  const retargeted =
    substitute === undefined
      ? qex.target
      : (pin.pinnedOver && qex.substitutedFor?.target) ||
        retargetForMovement(qex.target, qex.exercise, substitute, config.level);
  const swapped = swappedProgress({ qex, substitute, pin, retargeted, config, journal });
  return { pin, swapped, base: swapped?.target ?? retargeted };
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
  journal: SwapJournal,
): QuestExercise[] {
  if (!hasQuestOverrides(config) || !config) return [...slots];

  const targets = config.targets ?? {};
  const swaps = config.swaps ?? {};

  return slots.map((qex) => {
    const key = String(qex.id);
    const swappedId = swaps[key];
    // Swapped back onto the movement already in the slot is no swap: it keeps its art too.
    const substitute =
      swappedId === undefined || swappedId === qex.exercise.id
        ? undefined
        : exercisesById[swappedId];
    const { pin, swapped, base } = resolveBase(qex, substitute, config, journal);
    const raw = targets[key];
    // The style follows the resolved unit, for the same reason the unit follows the swap: an
    // hour is a hold's ceiling and a walk is not a hold, so a slot standing on an expedition
    // may be set past it.
    const movement = substitute ?? qex.exercise;
    const value =
      raw === undefined ? undefined : clamp(raw, targetRangeFor(base.type, movement.style));

    if (substitute === undefined && value === undefined) return qex;

    const own = ownTarget(base, value);
    // The swap's own "why", or the slot's when nothing was swapped; the hero's number has none.
    const why = substitute === undefined ? qex.targetWhy : swapped?.why;
    return {
      ...qex,
      ...own,
      targetWhy: own.prescribed === undefined ? why : undefined,
      ...pin,
      ...(substitute === undefined ? {} : swapFields(substitute, journal, base.type)),
    };
  });
}

/** What a slot loses and gains when another movement stands in it. */
function swapFields(
  substitute: Exercise,
  journal: SwapJournal,
  type: QuestExercise["target"]["type"],
) {
  return {
    exercise: substitute,
    // `images` is the quest's own art *of the movement that used to be here*, off
    // `quest_exercises.imagesJson`. Kept, the card illustrates the wrong exercise.
    images: [],
    // The ghost belongs to the slot's old movement: the substitute's own, in the unit it now
    // runs in, is read from the swap journal.
    ghost: journal.history.get(ghostKey(substitute.id, type)),
    // An explicit swap outranks the rung substitution `getQuestById` may have made, so the "we
    // served you an easier rung" caption has to go with it. Left behind, the screen would explain
    // a substitution that is no longer on the slot.
    substitutedFor: undefined,
    // Same for "set aside, served anyway": the swap runs something else.
    setAsideServed: undefined,
  };
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
  const [saved, exercises, lightWeek] = await Promise.all([
    getQuestConfig(questId),
    listExercises(),
    isLightWeekRunning(new Date()),
  ]);
  const chosen = level ?? saved?.level;
  const wanted = chosen ?? (await loadDefaultLevels())(questId);
  const quest = await getQuestById(questId, wanted);
  if (!quest) return null;
  const swapJournal = await loadSwapJournal(saved);
  // An outing has no level (`resolveSlot`): the default must not hand it one.
  const effective = chosen === undefined && isOutingSession(quest) ? Difficulty.Medium : wanted;
  const config = saved === null ? null : { ...saved, level: effective };

  return {
    // A light week takes a round off; the quest screen does the same through `lightenRounds`.
    quest: lightenRounds(
      applyQuestConfig(quest, config, indexExercises(exercises), swapJournal),
      config,
      lightWeek,
    ),
    level: effective,
    // The config itself, not only the quest it shaped. `applyQuestConfig` folds the hero's
    // choices into the slots, and a distance goal is the one choice that is *not* a slot: it
    // lives beside them, and it was read here and dropped on the floor. So the tile on Home
    // started every walk with `goal: null` while the screen that saved the distance said, in its
    // own hint, "Saved for this quest. It comes back next time."
    config,
  };
}
