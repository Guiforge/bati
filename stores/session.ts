import {
  type CompletedExerciseInput,
  createCompletedSession,
} from "@/db/completed";
import type { Quest } from "@/db/quests";
import type { DifficultyCode } from "@/db/schema";
import { create } from "zustand";

export type SessionStatus =
  | "idle"
  | "countdown"
  | "running"
  | "resting"
  | "paused"
  | "finished";

const PRE_START_COUNTDOWN_SECONDS = 3;

interface SessionState {
  // Static Data
  quest: Quest | null;
  userLevel: DifficultyCode;

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
  startSession: (quest: Quest, userLevel: DifficultyCode) => void;
  finishCountdown: () => void;
  pauseSession: () => void;
  resumeSession: () => void;
  quitSession: () => void;

  // Progression
  completeExercise: (resultValue: number) => void;
  updateLastResult: (resultValue: number) => void;
  skipRest: () => void;
  addRestTime: (seconds: number) => void;

  // DB
  saveSession: () => Promise<number>;
}

export const useSessionStore = create<SessionState>((set, get) => ({
  quest: null,
  userLevel: "medium",
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

  startSession: (quest, userLevel) => {
    set({
      quest,
      userLevel,
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
    if (status === "paused" || status === "idle" || status === "finished")
      return;

    set({
      status: "paused",
      prePauseStatus: status,
      lastPauseTimestamp: Date.now(),
    });
  },

  resumeSession: () => {
    const {
      status,
      lastPauseTimestamp,
      totalPausedTime,
      timerStartTimestamp,
      prePauseStatus,
    } = get();
    if (status !== "paused") return;

    const now = Date.now();
    const pauseDuration = lastPauseTimestamp ? now - lastPauseTimestamp : 0;
    const newTimerStart = timerStartTimestamp
      ? timerStartTimestamp + pauseDuration
      : null;

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

  completeExercise: (resultValue) => {
    const { quest, currentRoundIndex, currentExerciseIndex, results } = get();
    if (!quest) return;

    const currentEx = quest.exercises[currentExerciseIndex];

    // Record result
    const newResult: CompletedExerciseInput = {
      exerciseId: currentEx.exercise.id,
      roundIndex: currentRoundIndex,
      sortOrder: currentExerciseIndex,
      result: { type: currentEx.target.type, value: resultValue },
      target: { type: currentEx.target.type, value: currentEx.target.value },
      performedAt: new Date(),
    };

    const nextResults = [...results, newResult];

    // Determine next step
    const isLastExerciseInRound =
      currentExerciseIndex === quest.exercises.length - 1;
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
    const updated = {
      ...last,
      result: { ...last.result, value: resultValue },
    };

    set({
      results: [...results.slice(0, -1), updated],
    });
  },

  saveSession: async () => {
    const { quest, userLevel, startTime, totalPausedTime, results } = get();
    if (!quest || !startTime) throw new Error("No active session");

    const durationSeconds = Math.floor(
      (Date.now() - startTime - totalPausedTime) / 1000
    );

    const sessionId = await createCompletedSession({
      questId: quest.id,
      userLevel,
      durationSeconds,
      exercises: results,
      performedAt: new Date(startTime),
    });

    return sessionId;
  },
}));
