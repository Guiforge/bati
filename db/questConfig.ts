import { deletePreference, getPreference, setPreference } from "./preferences";
import type { Quest } from "./quests";
import { Difficulty, type UserLevel } from "./targets";

/**
 * What the hero changed on a quest and wants back next time: the level they train it at, plus
 * optional overrides of the template's rounds, rest and per-exercise targets.
 *
 * Stored as JSON in `user_preferences` rather than in the quest row, because the template is
 * shared content: an override must survive a content update, and must not leak into anyone
 * else's copy of the same quest.
 */
export type QuestConfig = {
  level: UserLevel;
  rounds?: number;
  restSeconds?: number;
  /**
   * quest_exercises row id -> target value. Editing a quest rewrites those rows, so stale keys
   * are possible; `applyQuestConfig` simply ignores ids the quest no longer has.
   */
  targets?: Record<string, number>;
};

export const ROUNDS_RANGE = { min: 1, max: 10 };
export const REST_RANGE = { min: 0, max: 300 };
export const TARGET_RANGE = { min: 1, max: 999 };

const configKey = (questId: number) => `quest:${questId}:config`;

function clamp(value: number, range: { min: number; max: number }): number {
  return Math.min(range.max, Math.max(range.min, Math.round(value)));
}

function isLevel(value: unknown): value is UserLevel {
  return value === Difficulty.Easy || value === Difficulty.Medium || value === Difficulty.Hard;
}

function readNumber(value: unknown, range: { min: number; max: number }): number | undefined {
  return typeof value === "number" && Number.isFinite(value) ? clamp(value, range) : undefined;
}

function readTargets(value: unknown): Record<string, number> | undefined {
  if (typeof value !== "object" || value === null) return undefined;

  const targets: Record<string, number> = {};
  for (const [key, raw] of Object.entries(value)) {
    const target = readNumber(raw, TARGET_RANGE);
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

  const targets = readTargets(record.targets);
  if (targets !== undefined) config.targets = targets;

  return config;
}

export async function getQuestConfig(questId: number): Promise<QuestConfig | null> {
  return parseQuestConfig(await getPreference(configKey(questId)));
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
    Object.keys(config.targets ?? {}).length > 0
  );
}

/**
 * The quest as this hero configured it. Pure so the estimate, the XP preview and the session all
 * read the same numbers: apply once, then everything downstream keeps working untouched.
 */
export function applyQuestConfig(quest: Quest, config: QuestConfig | null): Quest {
  if (!hasQuestOverrides(config) || !config) return quest;

  const targets = config.targets ?? {};

  return {
    ...quest,
    rounds: config.rounds ?? quest.rounds,
    restSeconds: config.restSeconds ?? quest.restSeconds,
    exercises: quest.exercises.map((qex) => {
      const value = targets[String(qex.id)];
      return value === undefined ? qex : { ...qex, target: { ...qex.target, value } };
    }),
  };
}
