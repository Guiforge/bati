import type { DifficultyCode, QuestTargetType } from "./schema";

export enum Difficulty {
  Easy = "easy",
  Medium = "medium",
  Hard = "hard",
}

export type UserLevel = Difficulty;

export type Target = {
  type: QuestTargetType;
  value: number;
};

const USER_LEVEL_MULTIPLIER: Record<DifficultyCode, number> = {
  easy: 0.75,
  medium: 1.0,
  hard: 1.25,
};

export function generateTarget(
  base: { type: QuestTargetType; min: number; max: number },
  userLevel: UserLevel
): Target {
  const min = Math.min(base.min, base.max);
  const max = Math.max(base.min, base.max);
  const m = USER_LEVEL_MULTIPLIER[userLevel];

  const scaledMin = Math.max(1, Math.round(min * m));
  const scaledMax = Math.max(1, Math.round(max * m));

  const value = Math.max(1, Math.round((scaledMin + scaledMax) / 2));
  return { type: base.type, value };
}
