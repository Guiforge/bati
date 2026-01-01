import { create } from "zustand";

import { completeAdventureRunStep } from "@/db";
import {
  type BossFight,
  type DamageResult,
  dealDamage,
  getOrCreateBossFight,
} from "@/db/bossFights";
import { processSessionBuildings, type SessionBuildingResult } from "@/db/buildings";
import { type CompletedExerciseInput, createCompletedSession } from "@/db/completed";
import { recordSessionForGoal } from "@/db/goals";
import { checkForNewRecords, type NewRecordResult } from "@/db/personalRecords";
import type { Quest } from "@/db/quests";
import {
  awardSessionResources,
  type ExerciseResultForResources,
  type ResourceLoot,
} from "@/db/resources";
import type { DifficultyCode, FeedbackCode, MuscleCode } from "@/db/schema";
import { computeSessionXp } from "@/db/xp";

export type SessionStatus = "idle" | "countdown" | "running" | "resting" | "paused" | "finished";

const PRE_START_COUNTDOWN_SECONDS = 3;

interface SessionState {
  // Static Data
  quest: Quest | null;
  userLevel: DifficultyCode;
  adventureRunStepId: number | null;

  // Boss Fight Data
  bossFight: BossFight | null;
  lastDamageResult: DamageResult | null;

  // Dynamic State
  status: SessionStatus;
  prePauseStatus: SessionStatus | null;
  currentRoundIndex: number; // 0-based
  currentExerciseIndex: number; // 0-based

  // Timing
  startTime: number | null; // Date.now() when session started
  totalPausedTime: number; // Accumulator for pause duration
  lastPauseTimestamp: number | null; // Date.now() when pause started

  // Active Timer (for Time-based exercises or Rest)
  timerStartTimestamp: number | null; // Date.now() when current timer started
  timerDuration: number; // Target duration in seconds

  // Results Accumulator
  results: CompletedExerciseInput[];

  // Actions
  startSession: (
    quest: Quest,
    userLevel: DifficultyCode,
    options?: {
      adventureRunStepId?: number | null;
      adventureId?: number | null;
    },
  ) => Promise<void>;
  finishCountdown: () => void;
  pauseSession: () => void;
  resumeSession: () => void;
  quitSession: () => void;

  // Progression
  completeExercise: (resultValue: number) => Promise<void>;
  updateLastResult: (resultValue: number) => void;
  skipRest: () => void;
  addRestTime: (seconds: number) => void;

  // DB
  saveSession: (feedback?: FeedbackCode | null) => Promise<{
    sessionId: number;
    loot: ResourceLoot;
    buildings: SessionBuildingResult;
    newRecords: NewRecordResult[];
    campaign: {
      adventureId: number;
      runId: number;
      isFinished: boolean;
      nextRunStepId: number | null;
      nextQuestId: number | null;
    } | null;
  }>;
}

export const useSessionStore = create<SessionState>((set, get) => ({
  quest: null,
  userLevel: "medium",
  adventureRunStepId: null,
  bossFight: null,
  lastDamageResult: null,
  status: "idle",
  prePauseStatus: null,
  currentRoundIndex: 0,
  currentExerciseIndex: 0,
  startTime: null,
  totalPausedTime: 0,
  lastPauseTimestamp: null,
  timerStartTimestamp: null,
  timerDuration: 0,
  results: [],

  startSession: async (quest, userLevel, options) => {
    // Load boss fight if this is a boss adventure
    let bossFight: BossFight | null = null;
    if (options?.adventureId) {
      bossFight = await getOrCreateBossFight(options.adventureId);
    }

    set({
      quest,
      userLevel,
      adventureRunStepId: options?.adventureRunStepId ?? null,
      bossFight,
      lastDamageResult: null,
      status: "countdown",
      prePauseStatus: null,
      currentRoundIndex: 0,
      currentExerciseIndex: 0,
      startTime: Date.now(),
      totalPausedTime: 0,
      lastPauseTimestamp: null,
      // Countdown timer (full-screen 3..2..1). Exercise timers start AFTER the countdown.
      timerStartTimestamp: Date.now(),
      timerDuration: PRE_START_COUNTDOWN_SECONDS,
      results: [],
    });
  },

  finishCountdown: () => {
    const { quest, currentExerciseIndex } = get();
    if (!quest) return;

    const firstEx = quest.exercises[currentExerciseIndex];
    const isTimeBased = firstEx?.target.type === "time";

    set({
      status: "running",
      timerStartTimestamp: isTimeBased ? Date.now() : null,
      timerDuration: isTimeBased ? firstEx.target.value : 0,
    });
  },

  pauseSession: () => {
    const { status } = get();
    if (status === "paused" || status === "idle" || status === "finished") return;

    set({
      status: "paused",
      prePauseStatus: status,
      lastPauseTimestamp: Date.now(),
    });
  },

  resumeSession: () => {
    const { status, lastPauseTimestamp, totalPausedTime, timerStartTimestamp, prePauseStatus } =
      get();
    if (status !== "paused") return;

    const now = Date.now();
    const pauseDuration = lastPauseTimestamp ? now - lastPauseTimestamp : 0;
    const newTimerStart = timerStartTimestamp ? timerStartTimestamp + pauseDuration : null;

    set({
      status: prePauseStatus || "running",
      prePauseStatus: null,
      totalPausedTime: totalPausedTime + pauseDuration,
      lastPauseTimestamp: null,
      timerStartTimestamp: newTimerStart,
    });
  },

  quitSession: () => {
    set({
      quest: null,
      status: "idle",
      adventureRunStepId: null,
      bossFight: null,
      lastDamageResult: null,
      prePauseStatus: null,
      currentRoundIndex: 0,
      currentExerciseIndex: 0,
      startTime: null,
      totalPausedTime: 0,
      lastPauseTimestamp: null,
      timerStartTimestamp: null,
      timerDuration: 0,
      results: [],
    });
  },

  completeExercise: async (resultValue) => {
    const { quest, currentRoundIndex, currentExerciseIndex, results, bossFight } = get();
    if (!quest) return;

    // DB constraints (see migrations) require: resultValue > 0, roundIndex >= 0, sortOrder >= 0.
    // Guard against accidental 0/NaN when users tap "DONE" immediately on time-based exercises.
    const safeResultValue = Number.isFinite(resultValue) ? Math.max(1, Math.floor(resultValue)) : 1;

    const currentEx = quest.exercises[currentExerciseIndex];

    // Deal damage to boss if in boss fight
    let damageResult: DamageResult | null = null;
    if (bossFight && !bossFight.defeatedAt) {
      // Get primary muscle for the exercise
      const primaryMuscle = currentEx.exercise.muscles[0] as MuscleCode | undefined;

      try {
        damageResult = await dealDamage(bossFight.id, {
          exerciseId: currentEx.exercise.id,
          resultValue: safeResultValue,
          targetValue: currentEx.target.value,
          muscle: primaryMuscle,
        });

        // Update boss fight state
        set({
          bossFight: {
            ...bossFight,
            currentHp: damageResult.newHp,
            defeatedAt: damageResult.defeated ? new Date() : null,
          },
          lastDamageResult: damageResult,
        });
      } catch (e) {
        console.error("Failed to deal boss damage:", e);
      }
    }

    // Record result
    const newResult: CompletedExerciseInput = {
      exerciseId: currentEx.exercise.id,
      roundIndex: currentRoundIndex,
      sortOrder: currentExerciseIndex,
      result: { type: currentEx.target.type, value: safeResultValue },
      target: { type: currentEx.target.type, value: currentEx.target.value },
      performedAt: new Date(),
    };

    const nextResults = [...results, newResult];

    // Determine next step
    const isLastExerciseInRound = currentExerciseIndex === quest.exercises.length - 1;
    const isLastRound = currentRoundIndex === quest.rounds - 1;

    if (isLastExerciseInRound && isLastRound) {
      // FINISHED
      set({
        status: "finished",
        results: nextResults,
        timerStartTimestamp: null,
        timerDuration: 0,
      });
      return;
    }

    // Not finished, so we are either moving to next exercise or next round
    let nextRound = currentRoundIndex;
    let nextExercise = currentExerciseIndex + 1;

    if (isLastExerciseInRound) {
      nextRound = currentRoundIndex + 1;
      nextExercise = 0;
    }

    // Handle Rest
    const restSeconds = quest.restSeconds;

    // If we have rest, we go to resting state.
    // The indices (round/exercise) will point to the NEXT exercise,
    // so the UI can show "Up Next: [Next Exercise]".
    if (restSeconds > 0) {
      set({
        status: "resting",
        results: nextResults,
        currentRoundIndex: nextRound,
        currentExerciseIndex: nextExercise,
        timerStartTimestamp: Date.now(),
        timerDuration: restSeconds,
      });
    } else {
      // No rest, jump straight to next
      const nextExDef = quest.exercises[nextExercise];
      const isNextTimeBased = nextExDef.target.type === "time";

      set({
        status: "running",
        results: nextResults,
        currentRoundIndex: nextRound,
        currentExerciseIndex: nextExercise,
        timerStartTimestamp: isNextTimeBased ? Date.now() : null,
        timerDuration: isNextTimeBased ? nextExDef.target.value : 0,
      });
    }
  },

  skipRest: () => {
    const { status, quest, currentExerciseIndex } = get();
    if (status !== "resting" || !quest) return;

    const nextExDef = quest.exercises[currentExerciseIndex];
    const isNextTimeBased = nextExDef.target.type === "time";

    set({
      status: "running",
      timerStartTimestamp: isNextTimeBased ? Date.now() : null,
      timerDuration: isNextTimeBased ? nextExDef.target.value : 0,
    });
  },

  addRestTime: (seconds) => {
    const { status, timerDuration } = get();
    if (status !== "resting") return;
    set({ timerDuration: timerDuration + seconds });
  },

  updateLastResult: (resultValue) => {
    const { results } = get();
    if (results.length === 0) return;

    const last = results[results.length - 1];

    // DB constraints require resultValue > 0.
    const safeResultValue = Number.isFinite(resultValue) ? Math.max(1, Math.floor(resultValue)) : 1;
    const updated = {
      ...last,
      result: { ...last.result, value: safeResultValue },
    };

    set({
      results: [...results.slice(0, -1), updated],
    });
  },

  saveSession: async (feedback) => {
    const { quest, userLevel, startTime, totalPausedTime, results, adventureRunStepId } = get();
    if (!quest || !startTime) throw new Error("No active session");

    const durationSeconds = Math.floor((Date.now() - startTime - totalPausedTime) / 1000);
    const xpEarned = computeSessionXp({ durationSeconds, userLevel });

    const sessionId = await createCompletedSession({
      questId: quest.id,
      userLevel,
      durationSeconds,
      xpEarned,
      feedback,
      exercises: results,
      performedAt: new Date(startTime),
    });

    // Build exercise results with muscles for resource calculation
    const exerciseResults: ExerciseResultForResources[] = results.map((r) => {
      const questExercise = quest.exercises.find((qe) => qe.exercise.id === r.exerciseId);
      return {
        exerciseId: r.exerciseId,
        muscles: questExercise?.exercise.muscles ?? [],
        result: { type: r.result.type, value: r.result.value },
      };
    });

    // Award resources
    const loot = await awardSessionResources({
      durationSeconds,
      userLevel,
      completedSessionId: sessionId,
      exerciseResults,
    });

    // Collect muscles worked with counts for building XP
    const exercisesByMuscle = new Map<MuscleCode, number>();
    for (const r of exerciseResults) {
      for (const m of r.muscles) {
        const current = exercisesByMuscle.get(m) ?? 0;
        // Add the result value (reps or seconds) as XP contribution
        exercisesByMuscle.set(m, current + r.result.value);
      }
    }

    // Process building XP and unlocks
    const buildings = await processSessionBuildings({ exercisesByMuscle });

    const campaign =
      adventureRunStepId != null
        ? await completeAdventureRunStep({
            runStepId: adventureRunStepId,
            completedSessionId: sessionId,
          })
        : null;

    // Record session for active goal (if any)
    await recordSessionForGoal({
      durationMinutes: Math.ceil(durationSeconds / 60),
      xpEarned,
    });

    // Check for personal records
    const newRecords = await checkForNewRecords(sessionId);

    return { sessionId, loot, buildings, newRecords, campaign };
  },
}));
