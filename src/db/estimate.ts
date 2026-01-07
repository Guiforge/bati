import type { Exercise } from "./exercises";
import type { Target } from "./targets";

export function estimateExerciseSeconds(exercise: Pick<Exercise, "secondsPerRep">, target: Target) {
  if (target.type === "time") return Math.max(1, target.value);

  const secondsPerRep = Math.max(1, Math.round(exercise.secondsPerRep));
  return Math.max(1, target.value * secondsPerRep);
}

export type EstimateQuestInput = {
  rounds: number;
  restSeconds: number;
  exercises: Array<{
    exercise: Pick<Exercise, "secondsPerRep">;
    target: Target;
  }>;
};

export function estimateQuestSeconds(quest: EstimateQuestInput) {
  const rounds = Math.max(1, Math.round(quest.rounds));
  const restSeconds = Math.max(0, Math.round(quest.restSeconds));

  const workPerRound = quest.exercises.reduce(
    (sum, qex) => sum + estimateExerciseSeconds(qex.exercise, qex.target),
    0
  );

  const setCount = rounds * quest.exercises.length;
  const restCount = Math.max(0, setCount - 1);

  return rounds * workPerRound + restCount * restSeconds;
}

export function formatDuration(seconds: number, lang: "en" | "fr" = "en") {
  const s = Math.max(0, Math.round(seconds));
  const m = Math.floor(s / 60);
  const r = s % 60;

  if (m <= 0) return lang === "fr" ? `${r}s` : `${r}s`;
  if (r === 0) return lang === "fr" ? `${m} min` : `${m} min`;
  return lang === "fr" ? `${m} min ${r}s` : `${m} min ${r}s`;
}
