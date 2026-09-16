import type { AppLanguage } from "@/src/i18n/deviceLanguage";
import type { Exercise } from "./exercises";
import { MINUTES_WORD, SECONDS_SUFFIX, type Target } from "./targets";

export function estimateExerciseSeconds(exercise: Pick<Exercise, "secondsPerRep">, target: Target) {
  if (target.type === "time") return Math.max(1, target.value);

  const secondsPerRep = Math.max(1, Math.round(exercise.secondsPerRep));
  return Math.max(1, target.value * secondsPerRep);
}

export type EstimateQuestInput = {
  rounds: number;
  restSeconds: number;
  roundRestSeconds: number | null;
  exercises: Array<{
    exercise: Pick<Exercise, "secondsPerRep">;
    target: Target;
  }>;
};

export function estimateQuestSeconds(quest: EstimateQuestInput) {
  const rounds = Math.max(1, Math.round(quest.rounds));
  const restSeconds = Math.max(0, Math.round(quest.restSeconds));
  // Null is not "zero rest between rounds", it is "no separate round rest" — the shape every
  // quest had before the column existed.
  const roundRest = Math.max(0, Math.round(quest.roundRestSeconds ?? restSeconds));

  const workPerRound = quest.exercises.reduce(
    (sum, qex) => sum + estimateExerciseSeconds(qex.exercise, qex.target),
    0,
  );

  const setCount = rounds * quest.exercises.length;
  // The round rest replaces the set rest at every round boundary but the last, which has neither.
  const roundRestCount = setCount === 0 ? 0 : rounds - 1;
  const restCount = Math.max(0, setCount - 1 - roundRestCount);

  return rounds * workPerRound + restCount * restSeconds + roundRestCount * roundRest;
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
 * The language is back, and this time it changes the string: German writes "Min.". It once
 * branched on `lang` with two identical arms, six call sites threading the live language into a
 * ternary that could not change anything, so the parameter was dropped. One word in one table
 * (`MINUTES_WORD`) is what the arms should have been.
 */
export function formatDurationEstimate(seconds: number, language: AppLanguage) {
  const m = Math.max(1, Math.round(Math.max(0, seconds) / 60));
  return `${m} ${MINUTES_WORD[language]}`;
}

/**
 * A measured length of time: "45s", "12 min", "12 min 17s". The seconds wear `formatTarget`'s
 * suffix, so French reads "12 min 17 s" like its holds do. A hold itself is `formatTarget`'s job,
 * this is for sessions and outings, where minutes are the unit people think in.
 *
 * The minute wears `MINUTES_WORD` like the second wears `SECONDS_SUFFIX`, so German reads
 * "12 Min. 17 s" here and in the Journal, which has said `duration_m` since the locales existed.
 */
export function formatDuration(seconds: number, language: AppLanguage) {
  const s = Math.max(0, Math.round(seconds));
  const m = Math.floor(s / 60);
  const r = s % 60;
  const sec = `${r}${SECONDS_SUFFIX[language]}`;
  const min = `${m} ${MINUTES_WORD[language]}`;

  if (m <= 0) return sec;
  if (r === 0) return min;
  return `${min} ${sec}`;
}
