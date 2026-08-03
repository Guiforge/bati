import type { ColorTokens } from "tamagui";
import { rawColors } from "@/constants/rawColors";
import { estimateExerciseSeconds } from "@/db/estimate";
import type { Exercise } from "@/db/exercises";
import type { Quest, QuestTemplate } from "@/db/quests";
import type { MuscleCode, QuestTargetType } from "@/db/schema";

export type ExerciseColorKey = MuscleCode | QuestTargetType | "mixed" | "default";

export type ExerciseColorTokens = {
  bg: ColorTokens;
  accent: ColorTokens;
  text: ColorTokens;
};

const MUSCLE_BG: Record<MuscleCode, ColorTokens> = {
  arms: "$pastelPink",
  back: "$pastelBlue",
  shoulder: "$pastelPurple",
  chest: "$pastelYellow",
  abs: "$pastelGreen",
  // No dedicated "pastelOrange" in the theme for now.
  legs: "$pastelYellow",
};

const TARGET_BG: Record<QuestTargetType, ColorTokens> = {
  time: "$pastelBlue",
  reps: "$pastelYellow",
};

export function getExerciseColorKey(input: {
  muscles?: readonly MuscleCode[];
  targetType?: QuestTargetType;
}): ExerciseColorKey {
  const muscles = input.muscles ?? [];
  if (muscles.length > 0) return muscles[0];
  if (input.targetType) return input.targetType;
  return "default";
}

export function getExerciseColorTokens(key: ExerciseColorKey): ExerciseColorTokens {
  if (key === "mixed") {
    return {
      bg: "$pastelPurple",
      accent: "$primary",
      text: "$color",
    };
  }

  if (key === "default") {
    return {
      bg: "$bgLight",
      accent: "$primary",
      text: "$color",
    };
  }

  if (key === "time" || key === "reps") {
    return {
      bg: TARGET_BG[key],
      accent: "$primary",
      text: "$color",
    };
  }

  return {
    bg: MUSCLE_BG[key],
    accent: "$primary",
    text: "$color",
  };
}

export function getQuestColorKeyFromQuest(quest: Pick<Quest, "exercises">): ExerciseColorKey {
  if (quest.exercises.length === 0) return "default";

  const weights = new Map<ExerciseColorKey, number>();

  for (const qex of quest.exercises) {
    const key = getExerciseColorKey({
      muscles: qex.exercise.muscles,
      targetType: qex.target.type,
    });

    const w = estimateExerciseSeconds(
      { secondsPerRep: qex.exercise.secondsPerRep },
      { type: qex.target.type, value: qex.target.value },
    );

    weights.set(key, (weights.get(key) ?? 0) + w);
  }

  // Pick the most dominant color. If nothing is clearly dominant, use "mixed".
  let total = 0;
  let bestKey: ExerciseColorKey = "default";
  let best = -1;

  for (const [k, v] of weights) {
    total += v;
    if (v > best) {
      best = v;
      bestKey = k;
    }
  }

  if (total > 0 && best / total < 0.45) return "mixed";
  return bestKey;
}

export function getQuestColorTokensFromQuest(quest: Pick<Quest, "exercises">): ExerciseColorTokens {
  return getExerciseColorTokens(getQuestColorKeyFromQuest(quest));
}

export function getQuestColorKeyFromTemplateWithExercises(input: {
  quest: Pick<QuestTemplate, "exercises">;
  exercisesById: Record<number, Pick<Exercise, "muscles" | "secondsPerRep">>;
}): ExerciseColorKey {
  const { quest, exercisesById } = input;
  if (quest.exercises.length === 0) return "default";

  const weights = new Map<ExerciseColorKey, number>();

  for (const qex of quest.exercises) {
    const ex = exercisesById[qex.exerciseId];
    if (!ex) continue;

    const key = getExerciseColorKey({
      muscles: ex.muscles,
      targetType: qex.baseTarget.type,
    });

    const avgTarget = Math.max(
      1,
      Math.round(
        (Math.min(qex.baseTarget.min, qex.baseTarget.max) +
          Math.max(qex.baseTarget.min, qex.baseTarget.max)) /
          2,
      ),
    );

    const w = estimateExerciseSeconds(
      { secondsPerRep: ex.secondsPerRep },
      { type: qex.baseTarget.type, value: avgTarget },
    );

    weights.set(key, (weights.get(key) ?? 0) + w);
  }

  let total = 0;
  let bestKey: ExerciseColorKey = "default";
  let best = -1;

  for (const [k, v] of weights) {
    total += v;
    if (v > best) {
      best = v;
      bestKey = k;
    }
  }

  if (total > 0 && best / total < 0.45) return "mixed";
  return bestKey;
}

export function getQuestColorTokensFromTemplateWithExercises(input: {
  quest: Pick<QuestTemplate, "exercises">;
  exercisesById: Record<number, Pick<Exercise, "muscles" | "secondsPerRep">>;
}): ExerciseColorTokens {
  return getExerciseColorTokens(getQuestColorKeyFromTemplateWithExercises(input));
}

export function getExerciseBgForSessionStep(input: {
  exercise: Pick<Exercise, "muscles" | "secondsPerRep">;
  targetType: QuestTargetType;
}): ColorTokens {
  return getExerciseColorTokens(
    getExerciseColorKey({
      muscles: input.exercise.muscles,
      targetType: input.targetType,
    }),
  ).bg;
}

/**
 * The same background as a plain string, for the one consumer that cannot take a token:
 * `expo-linear-gradient`, which the session hero uses to fade its artwork into the screen.
 *
 * It reads the token back out of `rawColors` rather than keeping a second table, so the fade
 * cannot end on a different colour than the screen it fades into.
 */
export function getExerciseBgRawForSessionStep(input: {
  exercise: Pick<Exercise, "muscles" | "secondsPerRep">;
  targetType: QuestTargetType;
}): string {
  const token = getExerciseBgForSessionStep(input);
  return rawColors[token.slice(1) as keyof typeof rawColors];
}
