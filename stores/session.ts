import { create } from "zustand";
import { subscribeWithSelector } from "zustand/middleware";
import { WARMUP_SEQUENCE } from "@/constants/warmup";
import { completeAdventureRunStep } from "@/db";
import { checkForNewAchievements, type NewAchievementResult } from "@/db/achievements";
import {
  type BossFight,
  type DamageResult,
  dealDamage,
  getOrCreateBossFight,
} from "@/db/bossFights";
import {
  addBonusXpToSession,
  type CompletedExerciseInput,
  createCompletedSession,
  markSessionWithNewRecords,
} from "@/db/completed";
import { checkOathFulfilled, OATH_XP_BONUS, type OathProgress } from "@/db/oaths";
import { checkForNewRecords, type NewRecordResult } from "@/db/personalRecords";
import { preferences } from "@/db/preferences";
import { isDailyQuest, type Quest } from "@/db/quests";
import type { DifficultyCode, FeedbackCode, MuscleCode } from "@/db/schema";
import { updateStreakAfterSession } from "@/db/streaks";
import { calculateLevelFromXp, getTotalXp } from "@/db/userLevel";
import { computeSessionXp } from "@/db/xp";
import { rescheduleOathReminder } from "@/src/notifications";

export type SessionStatus =
  | "idle"
  | "warmup"
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
  adventureRunStepId: number | null;

  // Boss Fight Data
  bossFight: BossFight | null;
  lastDamageResult: DamageResult | null;

  // Dynamic State
  status: SessionStatus;
  prePauseStatus: SessionStatus | null;
  /** Index into WARMUP_SEQUENCE while `status === "warmup"`. */
  warmupIndex: number;
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
  nextWarmupStep: () => void;
  skipWarmup: () => void;
  finishCountdown: () => void;
  pauseSession: () => void;
  resumeSession: () => void;
  restartRound: () => void;
  quitSession: () => void;

  // Progression
  completeExercise: (resultValue: number) => Promise<void>;
  updateLastResult: (resultValue: number) => void;
  skipRest: () => void;
  addRestTime: (seconds: number) => void;

  // DB
  saveSession: (feedback?: FeedbackCode | null) => Promise<{
    sessionId: number;
    xpEarned: number;
    dailyBonusApplied: boolean;
    newRecords: NewRecordResult[];
    newAchievements: NewAchievementResult[];
    fulfilledOath: OathProgress | null;
    oathBonusXp: number;
    campaign: {
      adventureId: number;
      runId: number;
      isFinished: boolean;
      nextRunStepId: number | null;
      nextQuestId: number | null;
    } | null;
    levelUp: { oldLevel: number; newLevel: number } | null;
  }>;
}

export const useSessionStore = create<SessionState>()(
  subscribeWithSelector((set, get) => ({
    quest: null,
    userLevel: "medium",
    adventureRunStepId: null,
    bossFight: null,
    lastDamageResult: null,
    status: "idle",
    prePauseStatus: null,
    warmupIndex: 0,
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

      // The warm-up runs first unless the hero switched it off; skipping it is always one tap
      // away, so the preference only exists to save that tap for people who never want it.
      const warmupEnabled = await preferences.getWarmupEnabled().catch(() => true);
      const warmupFirst = warmupEnabled && WARMUP_SEQUENCE.length > 0;

      set({
        quest,
        userLevel,
        adventureRunStepId: options?.adventureRunStepId ?? null,
        bossFight,
        lastDamageResult: null,
        status: warmupFirst ? "warmup" : "countdown",
        prePauseStatus: null,
        warmupIndex: 0,
        currentRoundIndex: 0,
        currentExerciseIndex: 0,
        startTime: Date.now(),
        totalPausedTime: 0,
        lastPauseTimestamp: null,
        // Warm-up step, or the full-screen 3..2..1. Exercise timers start after the countdown.
        timerStartTimestamp: Date.now(),
        timerDuration: warmupFirst ? WARMUP_SEQUENCE[0].seconds : PRE_START_COUNTDOWN_SECONDS,
        results: [],
      });
    },

    nextWarmupStep: () => {
      const { status, warmupIndex } = get();
      if (status !== "warmup") return;

      const next = warmupIndex + 1;
      if (next >= WARMUP_SEQUENCE.length) {
        get().skipWarmup();
        return;
      }

      set({
        warmupIndex: next,
        timerStartTimestamp: Date.now(),
        timerDuration: WARMUP_SEQUENCE[next].seconds,
      });
    },

    /** Leave the warm-up for the countdown. Nothing is journaled: a warm-up is not work. */
    skipWarmup: () => {
      if (get().status !== "warmup") return;

      set({
        status: "countdown",
        timerStartTimestamp: Date.now(),
        timerDuration: PRE_START_COUNTDOWN_SECONDS,
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

    restartRound: () => {
      const { quest, currentRoundIndex, results } = get();
      if (!quest) return;

      // Remove results from the current round (keep only prior rounds)
      const resultsForPriorRounds = results.filter(
        (r) => r.roundIndex !== undefined && r.roundIndex < currentRoundIndex,
      );

      // Get target duration for first exercise in round (if time-based)
      const firstExercise = quest.exercises[0];
      const isTimeBased = firstExercise.target.type === "time";
      const targetDuration = isTimeBased ? firstExercise.target.value : 0;

      set({
        status: "running",
        prePauseStatus: null,
        currentExerciseIndex: 0,
        timerStartTimestamp: isTimeBased ? Date.now() : null,
        timerDuration: targetDuration,
        results: resultsForPriorRounds,
        lastDamageResult: null,
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

    // biome-ignore lint/complexity/noExcessiveCognitiveComplexity: Complex exercise completion logic, refactor planned
    completeExercise: async (resultValue) => {
      const { quest, currentRoundIndex, currentExerciseIndex, results, bossFight } = get();
      if (!quest) return;

      // DB constraints (see migrations) require: resultValue > 0, roundIndex >= 0, sortOrder >= 0.
      // Guard against accidental 0/NaN when users tap "DONE" immediately on time-based exercises.
      const safeResultValue = Number.isFinite(resultValue)
        ? Math.max(1, Math.floor(resultValue))
        : 1;

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
            targetType: currentEx.target.type,
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
        } catch {
          // Error handled silently
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
      const safeResultValue = Number.isFinite(resultValue)
        ? Math.max(1, Math.floor(resultValue))
        : 1;
      const updated = {
        ...last,
        result: { ...last.result, value: safeResultValue },
      };

      set({
        results: [...results.slice(0, -1), updated],
      });
    },

    // biome-ignore lint/complexity/noExcessiveCognitiveComplexity: Linear reward pipeline (save → records → streak → achievements → oath bonus → level), reads top-to-bottom
    saveSession: async (feedback) => {
      const { quest, userLevel, startTime, totalPausedTime, results, adventureRunStepId } = get();
      if (!quest || !startTime) throw new Error("No active session");

      const durationSeconds = Math.floor((Date.now() - startTime - totalPausedTime) / 1000);
      let xpEarned = computeSessionXp({ durationSeconds, userLevel });

      const dailyBonusApplied = await isDailyQuest(quest.id);
      if (dailyBonusApplied) {
        xpEarned = Math.round(xpEarned * 1.5);
      }

      // Calculate level before saving (current state)
      const oldTotalXp = await getTotalXp();
      const oldLevel = calculateLevelFromXp(oldTotalXp);

      const sessionId = await createCompletedSession({
        questId: quest.id,
        userLevel,
        durationSeconds,
        xpEarned,
        feedback,
        exercises: results,
        performedAt: new Date(startTime),
      });

      const campaign =
        adventureRunStepId != null
          ? await completeAdventureRunStep({
              runStepId: adventureRunStepId,
              completedSessionId: sessionId,
            })
          : null;

      // Check for personal records
      const newRecords = await checkForNewRecords(sessionId);

      // Mark session as having new records if any were set
      if (newRecords.length > 0) {
        await markSessionWithNewRecords(sessionId);
      }

      // Update streak cache
      await updateStreakAfterSession();

      // Check for new achievements (on the base session XP, before the oath bonus)
      const newAchievements = await checkForNewAchievements({
        durationSeconds,
        xpEarned,
        performedAt: new Date(),
        questId: quest?.id ?? null,
      });

      // Oath progress is derived; this only catches the moment it tips over.
      const fulfilledOath = await checkOathFulfilled();

      // The idle clock just reset, and a fulfilled oath has nothing left to nag about.
      rescheduleOathReminder().catch(() => {
        // Non-blocking: never fail a logged session over a notification.
      });

      // A fulfilled oath pays a mini-boss-sized bonus. Add it to the tip-over session row so
      // total XP (a SUM over sessions) and the level below pick it up with no extra state.
      const oathBonusXp = fulfilledOath ? OATH_XP_BONUS : 0;
      if (oathBonusXp > 0) {
        xpEarned += oathBonusXp;
        await addBonusXpToSession(sessionId, oathBonusXp);
      }

      // Level after all XP (base + any oath bonus) is settled.
      const newTotalXp = oldTotalXp + xpEarned;
      const newLevel = calculateLevelFromXp(newTotalXp);
      const levelUp = newLevel > oldLevel ? { oldLevel, newLevel } : null;

      return {
        sessionId,
        xpEarned,
        dailyBonusApplied,
        newRecords,
        newAchievements,
        fulfilledOath,
        oathBonusXp,
        campaign,
        levelUp,
      };
    },
  })),
);

// Subscribe to session state changes and auto-save for crash recovery
useSessionStore.subscribe(
  (state) => ({
    status: state.status,
    currentRoundIndex: state.currentRoundIndex,
    currentExerciseIndex: state.currentExerciseIndex,
    resultsCount: state.results.length,
  }),
  async (curr, prev) => {
    const state = useSessionStore.getState();

    // Clear saved session when session ends or is idle
    if (curr.status === "idle" || curr.status === "finished") {
      if (prev.status !== "idle" && prev.status !== "finished") {
        try {
          await preferences.clearSavedSession();
        } catch {
          // Error handled silently
        }
      }
      return;
    }

    // Save session state on meaningful changes
    if (
      !state.quest ||
      !state.startTime ||
      curr.status === "countdown" // Don't save during countdown
    ) {
      return;
    }

    // Debounce saves - only save when exercise/round changes or on pause
    const hasProgressed =
      curr.currentRoundIndex !== prev.currentRoundIndex ||
      curr.currentExerciseIndex !== prev.currentExerciseIndex ||
      curr.resultsCount !== prev.resultsCount ||
      curr.status === "paused";

    if (hasProgressed) {
      try {
        const savedState = {
          quest: state.quest,
          userLevel: state.userLevel,
          adventureRunStepId: state.adventureRunStepId,
          bossFight: state.bossFight,
          lastDamageResult: state.lastDamageResult,
          status: state.status,
          prePauseStatus: state.prePauseStatus,
          currentRoundIndex: state.currentRoundIndex,
          currentExerciseIndex: state.currentExerciseIndex,
          startTime: state.startTime,
          totalPausedTime: state.totalPausedTime,
          timerStartTimestamp: state.timerStartTimestamp,
          timerDuration: state.timerDuration,
          results: state.results,
          savedAt: Date.now(),
        };
        await preferences.setSavedSession(JSON.stringify(savedState));
      } catch {
        // Error handled silently
      }
    }
  },
  { equalityFn: (a, b) => JSON.stringify(a) === JSON.stringify(b) },
);
