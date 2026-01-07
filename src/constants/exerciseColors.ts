import type { ColorTokens } from "tamagui";
import { estimateExerciseSeconds } from "@/src/db/estimate";
import type { Exercise } from "@/src/db/exercises";
import type { Quest, QuestTemplate } from "@/src/db/quests";
import type { MuscleCode, QuestTargetType } from "@/src/db/schema";

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
  calf: "$pastelYellow",
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

export function getQuestColorKeyFromTemplate(
  quest: Pick<QuestTemplate, "exercises">,
): ExerciseColorKey {
  if (quest.exercises.length === 0) return "default";

  // Quest templates don't include muscle info; fall back to target types.
  let reps = 0;
  let time = 0;
  for (const qex of quest.exercises) {
    if (qex.baseTarget.type === "time") time += 1;
    else reps += 1;
  }

  if (reps === time) return "mixed";
  return reps > time ? "reps" : "time";
}

export function getQuestColorTokensFromQuest(quest: Pick<Quest, "exercises">): ExerciseColorTokens {
  return getExerciseColorTokens(getQuestColorKeyFromQuest(quest));
}

export function getQuestColorTokensFromTemplate(
  quest: Pick<QuestTemplate, "exercises">,
): ExerciseColorTokens {
  return getExerciseColorTokens(getQuestColorKeyFromTemplate(quest));
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
