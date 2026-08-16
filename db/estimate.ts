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
    0,
  );

  const setCount = rounds * quest.exercises.length;
  const restCount = Math.max(0, setCount - 1);

  return rounds * workPerRound + restCount * restSeconds;
}

/**
 * An adventure is a multi-session campaign — "≈ 32 min" describes one step, not the journey.
 * Weeks read like a training plan: steps spread over the hero's weekly rhythm.
 */
export function adventureWeeks(stepsCount: number, sessionsPerWeek = 3) {
  return Math.max(1, Math.ceil(Math.max(0, stepsCount) / Math.max(1, sessionsPerWeek)));
}

/**
 * For *estimates* only: "≈ 11 min 6s" wears second-level precision the number doesn't have
 * (the real duration depends on actual rest taken). Journal durations are measured, so they
 * keep formatDuration's exact form.
 *
 * Neither takes a language. "min" and "s" are the same abbreviations in both locales, and both
 * functions used to branch on `lang` with two identical arms — six call sites threading the live
 * language into a ternary that could not change anything. If a third locale ever abbreviates
 * differently, that is the moment to give these an argument again, not before.
 */
export function formatDurationEstimate(seconds: number) {
  const m = Math.max(1, Math.round(Math.max(0, seconds) / 60));
  return `${m} min`;
}

export function formatDuration(seconds: number) {
  const s = Math.max(0, Math.round(seconds));
  const m = Math.floor(s / 60);
  const r = s % 60;

  if (m <= 0) return `${r}s`;
  if (r === 0) return `${m} min`;
  return `${m} min ${r}s`;
}
