import { create } from "zustand";
import { subscribeWithSelector } from "zustand/middleware";
import { buildWarmup, type WarmupStep } from "@/constants/warmup";
import { completeAdventureRunStep, getAdventureIdForRunStep } from "@/db";
import { checkForNewAchievements, type NewAchievementResult } from "@/db/achievements";
import {
  type BossFight,
  computeDamage,
  type DamageResult,
  getOrCreateBossFight,
  type PendingHit,
  persistSessionDamage,
} from "@/db/bossFights";
import {
  addBonusXpToSession,
  type CompletedExerciseInput,
  createCompletedSession,
  markSessionWithNewRecords,
} from "@/db/completed";
import { checkForNewRungs, type VariationStep } from "@/db/exercises";
import { checkOathFulfilled, OATH_XP_BONUS, type OathProgress } from "@/db/oaths";
import { checkForNewRecords, type NewRecordResult } from "@/db/personalRecords";
import { preferences } from "@/db/preferences";
import { clearShortLivedQueries } from "@/db/queryCache";
import { isDailyQuest, type Quest } from "@/db/quests";
import type { DifficultyCode, FeedbackCode, MuscleCode } from "@/db/schema";
import { updateStreakAfterSession } from "@/db/streaks";
import { calculateLevelFromXp, getTotalXp } from "@/db/userLevel";
import {
  diffVillageGrowth,
  diffVillageTier,
  getVillageBuildings,
  type VillageGrowth,
  type VillageTierUp,
} from "@/db/village";
import { computeSessionXp } from "@/db/xp";
import { rescheduleOathReminder } from "@/src/notifications";
import { reportError } from "@/src/reportError";
import { requestFlameWidgetUpdate } from "@/src/widget";

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
  /**
   * Hits landed this session, not yet in the database.
   *
   * Damage used to be written the instant an exercise was completed, which made the boss's HP
   * a fact before the session that caused it existed. Two things fell out of that: replaying a
   * round re-applied damage the hero had already dealt, and quitting before the victory screen
   * kept the damage with no session to account for it — a boss could be worn down by starting
   * and abandoning sessions. Hits are accumulated here and persisted once, in `saveSession`,
   * where they can also be tagged with the session that earned them.
   */
  pendingDamage: PendingHit[];
  /**
   * The boss's HP when this session began. A boss is a campaign-length pool — seeded so it falls
   * on the campaign's last step — so a single session takes off ~1/steps of it, and a bar drawn
   * against `totalHp` alone looks untouched for the whole workout. This is what the arena
   * measures today's damage against.
   */
  bossStartHp: number | null;

  // Dynamic State
  status: SessionStatus;
  prePauseStatus: SessionStatus | null;
  /**
   * The warm-up this quest gets, built once at `startSession` from what it is about to load
   * (`buildWarmup`). Held in state rather than recomputed per render so the sequence cannot
   * change under the hero mid-warm-up.
   */
  warmupSequence: WarmupStep[];
  /** Index into `warmupSequence` while `status === "warmup"`. */
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
  previousWarmupStep: () => void;
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
    newRungs: VariationStep[];
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
    tierUp: VillageTierUp | null;
    villageGrowth: VillageGrowth[];
  }>;
}

/**
 * The crash-recovery snapshot: every piece of session state that has to survive the app dying,
 * and nothing else.
 *
 * Derived from `SessionState` rather than written out a second time, because it was written out
 * a second time and the two copies drifted — the writer forgot `warmupIndex`, the reader's type
 * demanded it, and neither ever carried `warmupSequence`, which left a recovered warm-up
 * rendering an empty screen. Adding a field to `SessionState` and persisting it is now one list:
 * name it here and both sides fail to compile until they agree.
 */
export type SavedSessionState = Pick<
  SessionState,
  | "quest"
  | "userLevel"
  | "adventureRunStepId"
  | "bossFight"
  | "bossStartHp"
  | "pendingDamage"
  | "lastDamageResult"
  | "status"
  | "prePauseStatus"
  | "warmupSequence"
  | "warmupIndex"
  | "currentRoundIndex"
  | "currentExerciseIndex"
  | "startTime"
  | "totalPausedTime"
  | "timerStartTimestamp"
  | "timerDuration"
  | "results"
> & { savedAt: number };

/**
 * Write the hits a session banked, then drop them.
 *
 * Clearing is the point: the victory screen retries `saveSession` on failure, and hits that
 * survived a retry would land on the boss twice.
 */
async function commitPendingDamage(
  bossFight: BossFight | null,
  pendingDamage: PendingHit[],
  sessionId: number,
): Promise<void> {
  if (!bossFight || pendingDamage.length === 0) return;

  await persistSessionDamage(bossFight.id, pendingDamage, sessionId);
  useSessionStore.setState({ pendingDamage: [] });
}

export const useSessionStore = create<SessionState>()(
  subscribeWithSelector((set, get) => ({
    quest: null,
    userLevel: "medium",
    adventureRunStepId: null,
    bossFight: null,
    bossStartHp: null,
    pendingDamage: [],
    lastDamageResult: null,
    status: "idle",
    prePauseStatus: null,
    warmupSequence: [],
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
      // Load boss fight if this is a boss adventure. Callers only ever hold the run step id —
      // it is what the adventure screen puts in the URL and what the victory screen chains to —
      // so resolve the adventure here rather than threading a second param through three
      // screens that can drift apart. getOrCreateBossFight returns null unless kind === "boss".
      const adventureId =
        options?.adventureId ??
        (options?.adventureRunStepId != null
          ? await getAdventureIdForRunStep(options.adventureRunStepId).catch(() => null)
          : null);

      let bossFight: BossFight | null = null;
      if (adventureId) {
        bossFight = await getOrCreateBossFight(adventureId);
      }

      // The warm-up runs first unless the hero switched it off; skipping it is always one tap
      // away, so the preference only exists to save that tap for people who never want it.
      const warmupEnabled = await preferences.getWarmupEnabled().catch(() => true);
      const warmupSequence = buildWarmup(quest);
      const warmupFirst = warmupEnabled && warmupSequence.length > 0;

      set({
        quest,
        userLevel,
        adventureRunStepId: options?.adventureRunStepId ?? null,
        bossFight,
        bossStartHp: bossFight?.currentHp ?? null,
        pendingDamage: [],
        lastDamageResult: null,
        status: warmupFirst ? "warmup" : "countdown",
        prePauseStatus: null,
        warmupSequence,
        warmupIndex: 0,
        currentRoundIndex: 0,
        currentExerciseIndex: 0,
        startTime: Date.now(),
        totalPausedTime: 0,
        lastPauseTimestamp: null,
        // Warm-up step, or the full-screen 3..2..1. Exercise timers start after the countdown.
        timerStartTimestamp: Date.now(),
        timerDuration: warmupFirst ? warmupSequence[0].seconds : PRE_START_COUNTDOWN_SECONDS,
        results: [],
      });
    },

    nextWarmupStep: () => {
      const { status, warmupIndex, warmupSequence } = get();
      if (status !== "warmup") return;

      const next = warmupIndex + 1;
      if (next >= warmupSequence.length) {
        get().skipWarmup();
        return;
      }

      set({
        warmupIndex: next,
        timerStartTimestamp: Date.now(),
        timerDuration: warmupSequence[next].seconds,
      });
    },

    /** Step back one movement, timer full again. Stops at the first: there is nothing before it. */
    previousWarmupStep: () => {
      const { status, warmupIndex, warmupSequence } = get();
      if (status !== "warmup" || warmupIndex === 0) return;

      const prev = warmupIndex - 1;
      set({
        warmupIndex: prev,
        timerStartTimestamp: Date.now(),
        timerDuration: warmupSequence[prev].seconds,
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
      const { quest, currentRoundIndex, results, pendingDamage, bossFight } = get();
      if (!quest) return;

      // Remove results from the current round (keep only prior rounds)
      const resultsForPriorRounds = results.filter(
        (r) => r.roundIndex !== undefined && r.roundIndex < currentRoundIndex,
      );

      // Give the boss back what this round took off. The hits were never written, so undoing
      // them is just dropping them — but the fight held in memory has to be walked back too,
      // or the arena keeps showing damage the hero is about to deal a second time.
      const keptDamage = pendingDamage.filter((hit) => hit.roundIndex < currentRoundIndex);
      const refunded = pendingDamage
        .filter((hit) => hit.roundIndex >= currentRoundIndex)
        .reduce((sum, hit) => sum + hit.damage, 0);

      // `refunded > 0` also keeps a boss that was already dead when the session opened dead:
      // no hit was ever computed against it, so there is nothing to undo.
      const restoredFight =
        bossFight && refunded > 0
          ? {
              ...bossFight,
              currentHp: Math.min(bossFight.totalHp, bossFight.currentHp + refunded),
              defeatedAt: null,
            }
          : bossFight;

      // Get target duration for first exercise in round (if time-based)
      const firstExercise = quest.exercises[0];
      const isTimeBased = firstExercise?.target.type === "time";
      const targetDuration = isTimeBased ? firstExercise.target.value : 0;

      set({
        status: "running",
        prePauseStatus: null,
        currentExerciseIndex: 0,
        timerStartTimestamp: isTimeBased ? Date.now() : null,
        timerDuration: targetDuration,
        results: resultsForPriorRounds,
        pendingDamage: keptDamage,
        bossFight: restoredFight,
        lastDamageResult: null,
      });
    },

    quitSession: () => {
      set({
        quest: null,
        status: "idle",
        adventureRunStepId: null,
        bossFight: null,
        bossStartHp: null,
        // Abandoning a session takes its damage with it — none of it was ever written.
        pendingDamage: [],
        lastDamageResult: null,
        prePauseStatus: null,
        warmupSequence: [],
        warmupIndex: 0,
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

      // Land the hit on the fight we hold, and bank it. Nothing reaches the database until
      // saveSession: see `pendingDamage`. This is pure maths now, so there is no failure to
      // swallow and no await between the read and the write of `bossFight`.
      if (bossFight && !bossFight.defeatedAt) {
        const primaryMuscle = currentEx.exercise.muscles[0] as MuscleCode | undefined;

        const damageResult = computeDamage(bossFight, {
          resultValue: safeResultValue,
          targetValue: currentEx.target.value,
          muscle: primaryMuscle,
          targetType: currentEx.target.type,
        });

        set({
          bossFight: {
            ...bossFight,
            currentHp: damageResult.newHp,
            defeatedAt: damageResult.defeated ? new Date() : null,
          },
          lastDamageResult: damageResult,
          pendingDamage: [
            ...get().pendingDamage,
            {
              roundIndex: currentRoundIndex,
              exerciseId: currentEx.exercise.id,
              damage: damageResult.damage,
              isCritical: damageResult.isCritical,
              muscle: primaryMuscle ?? null,
            },
          ],
        });
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

    saveSession: async (feedback) => {
      const {
        quest,
        userLevel,
        startTime,
        totalPausedTime,
        results,
        adventureRunStepId,
        bossFight,
        pendingDamage,
      } = get();
      if (!quest || !startTime) throw new Error("No active session");

      const durationSeconds = Math.floor((Date.now() - startTime - totalPausedTime) / 1000);
      let xpEarned = computeSessionXp({ durationSeconds, userLevel });

      // Snapshot before this session's exercises land, so the village-growth diff at the
      // end reflects exactly what this save changed.
      const beforeBuildings = await getVillageBuildings();

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

      // The session exists now, so the hits it earned can be written and attributed to it. This
      // runs before the campaign step below, which reads the fight to decide whether the run is
      // over — the boss has to be at its true HP by then.
      await commitPendingDamage(bossFight, pendingDamage, sessionId);

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

      // The variations tonight's sets just unlocked. Same question as the records above — what
      // did *this* session change — so it is answered in the same place, from the journal.
      const newRungs = await checkForNewRungs(sessionId);

      // Update streak cache
      await updateStreakAfterSession();

      // The flame widget reads the streak straight from the DB, but only on an OS-driven
      // tick or a poke — a finished session is one of the two moments the number can move.
      requestFlameWidgetUpdate().catch(() => {
        // Non-blocking: never fail a logged session over a widget redraw.
      });

      // Check for new achievements (on the base session XP, before the oath bonus)
      const newAchievements = await checkForNewAchievements({
        durationSeconds,
        xpEarned,
        performedAt: new Date(),
        questId: quest?.id ?? null,
      });

      // Oath progress is derived; this only catches the moment it tips over. The bonus
      // credit runs inside checkOathFulfilled's own transaction, atomically with marking
      // the oath fulfilled — a crash between the two would otherwise lose the bonus for
      // good, since a fulfilled oath is a no-op on every later call.
      let oathBonusXp = 0;
      const fulfilledOath = await checkOathFulfilled(async (tx) => {
        oathBonusXp = OATH_XP_BONUS;
        await addBonusXpToSession(sessionId, OATH_XP_BONUS, tx);
      });

      // The idle clock just reset, and a fulfilled oath has nothing left to nag about.
      rescheduleOathReminder().catch(() => {
        // Non-blocking: never fail a logged session over a notification.
      });

      // A fulfilled oath pays a mini-boss-sized bonus. Added to the tip-over session row so
      // total XP (a SUM over sessions) and the level below pick it up with no extra state.
      if (oathBonusXp > 0) {
        xpEarned += oathBonusXp;
      }

      // Level after all XP (base + any oath bonus) is settled.
      const newTotalXp = oldTotalXp + xpEarned;
      const newLevel = calculateLevelFromXp(newTotalXp);
      const levelUp = newLevel > oldLevel ? { oldLevel, newLevel } : null;

      // The village's own "grand moment": crossing a tier is bigger than any one
      // building leveling up, but the per-building diff below can't see it.
      const tierUp = diffVillageTier(oldLevel, newLevel);

      // Everything that could move a building's level (volume, boss count, village tier)
      // is settled now, so this is the one honest "after" snapshot for the diff.
      //
      // The short-lived memos have to go first. They hold aggregates like the lifetime muscle
      // balance for 5 s on the assumption that nothing changes them faster than that — true
      // everywhere except right here, where a whole session lands between two reads seconds
      // apart. Without this, "after" replayed the pre-session volumes and no muscle-driven
      // building ever appeared to grow on the victory screen.
      clearShortLivedQueries();
      const afterBuildings = await getVillageBuildings();
      const villageGrowth = diffVillageGrowth(beforeBuildings, afterBuildings);

      return {
        sessionId,
        xpEarned,
        dailyBonusApplied,
        newRecords,
        newRungs,
        newAchievements,
        fulfilledOath,
        oathBonusXp,
        campaign,
        levelUp,
        tierUp,
        villageGrowth,
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
        } catch (error) {
          // A slot that will not clear offers the hero a session they already finished.
          reportError("session.clearSavedSession", error);
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
        // Typed, so a field added to SavedSessionState fails to compile until it is written here.
        const savedState: SavedSessionState = {
          quest: state.quest,
          userLevel: state.userLevel,
          adventureRunStepId: state.adventureRunStepId,
          bossFight: state.bossFight,
          bossStartHp: state.bossStartHp,
          pendingDamage: state.pendingDamage,
          lastDamageResult: state.lastDamageResult,
          status: state.status,
          prePauseStatus: state.prePauseStatus,
          warmupSequence: state.warmupSequence,
          warmupIndex: state.warmupIndex,
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
      } catch (error) {
        // This is the whole crash-recovery safety net. If it stops writing, nothing looks
        // wrong until the app dies mid-session and the workout is gone.
        reportError("session.saveSnapshot", error);
      }
    }
  },
  { equalityFn: (a, b) => JSON.stringify(a) === JSON.stringify(b) },
);
