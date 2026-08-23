import { waitFor } from "@testing-library/react-native";
import { WARMUP_SEQUENCE } from "@/constants/warmup";
import { preferences } from "@/db/preferences";
import type { Quest } from "@/db/quests";
import { useSessionStore } from "../stores/session";

// Mock DB client to prevent actual SQLite initialization
jest.mock("@/db/client", () => ({
  db: {},
  schema: {},
  runMigrations: jest.fn().mockResolvedValue(undefined),
}));

// Mock quests module
jest.mock("@/db/quests", () => ({
  isDailyQuest: jest.fn().mockReturnValue(false),
}));

// Mock DB calls
jest.mock("@/db", () => ({
  completeAdventureRunStep: jest.fn(),
  getAdventureIdForRunStep: jest.fn().mockResolvedValue(null),
}));
jest.mock("@/db/completed", () => ({
  createCompletedSession: jest.fn().mockResolvedValue(1),
  markSessionWithNewRecords: jest.fn().mockResolvedValue(undefined),
  addBonusXpToSession: jest.fn().mockResolvedValue(undefined),
  // Only the warm-up reads this, to rotate which movement fills each phase. Pinned to 0 so the
  // sequence these cases walk is stable.
  getSessionAggregates: jest.fn().mockResolvedValue({ totalSessions: 0 }),
}));
// The rest of what saveSession touches on its way through. Stubbed so the store's own
// behaviour — what it banks, commits and clears — is what these cases actually measure.
jest.mock("@/db/exercises", () => ({
  checkForNewRungs: jest.fn().mockResolvedValue([]),
}));
jest.mock("@/db/oaths", () => ({
  checkOathFulfilled: jest.fn().mockResolvedValue(null),
  OATH_XP_BONUS: 50,
}));
jest.mock("@/db/queryCache", () => ({
  clearShortLivedQueries: jest.fn(),
}));
jest.mock("@/db/userLevel", () => ({
  getTotalXp: jest.fn().mockResolvedValue(0),
  calculateLevelFromXp: jest.fn().mockReturnValue(1),
}));
jest.mock("@/db/village", () => ({
  getVillageBuildings: jest.fn().mockResolvedValue([]),
  diffVillageGrowth: jest.fn().mockReturnValue([]),
  diffVillageTier: jest.fn().mockReturnValue(null),
}));
jest.mock("@/src/widget", () => ({
  requestWidgetsUpdate: jest.fn().mockResolvedValue(undefined),
}));
jest.mock("@/db/xp", () => ({
  computeSessionXp: jest.fn().mockReturnValue(100),
}));
jest.mock("@/db/preferences", () => ({
  preferences: {
    getSavedSession: jest.fn().mockResolvedValue(null),
    setSavedSession: jest.fn().mockResolvedValue(undefined),
    clearSavedSession: jest.fn().mockResolvedValue(undefined),
    // Off by default here so the existing cases start on the countdown; the warm-up has its
    // own cases below.
    getWarmupEnabled: jest.fn().mockResolvedValue(false),
  },
}));
// `computeDamage` stays real — it is pure maths and the store's damage behaviour is only
// meaningful if the numbers are the ones the app actually uses. Only the two functions that
// touch the database are stubbed.
jest.mock("@/db/bossFights", () => ({
  ...jest.requireActual("@/db/bossFights"),
  getOrCreateBossFight: jest.fn().mockResolvedValue(null),
  persistSessionDamage: jest.fn().mockResolvedValue(true),
  finishBossFight: jest.fn().mockResolvedValue(true),
}));
jest.mock("@/db/personalRecords", () => ({
  checkForNewRecords: jest.fn().mockResolvedValue([]),
}));
jest.mock("@/src/reportError", () => ({ reportError: jest.fn() }));
jest.mock("@/db/streaks", () => ({
  updateStreakAfterSession: jest.fn().mockResolvedValue({
    current: 1,
    best: 1,
    isActive: true,
    lastWorkoutDate: null,
  }),
}));
jest.mock("@/db/achievements", () => ({
  checkForNewAchievements: jest.fn().mockResolvedValue([]),
}));

describe("useSessionStore", () => {
  const store = useSessionStore;

  const mockQuest = {
    id: 1,
    rounds: 2,
    restSeconds: 30,
    roundRestSeconds: 90,
    exercises: [
      {
        exercise: { id: 1, enName: "Pushups", muscles: [] },
        target: { type: "reps", value: 10 },
      },
      {
        exercise: { id: 2, enName: "Plank", muscles: [] },
        target: { type: "time", value: 60 },
      },
    ],
  } as unknown as Quest;

  beforeEach(() => {
    store.setState({
      quest: null,
      status: "idle",
      currentRoundIndex: 0,
      currentExerciseIndex: 0,
      results: [],
      startTime: null,
      totalPausedTime: 0,
      lastPauseTimestamp: null,
      timerStartTimestamp: null,
      timerDuration: undefined,
      prePauseStatus: null,
      bossFight: null,
      lastDamageResult: null,
      adventureRunStepId: null,
      userLevel: "medium",
    });
  });

  test("startSession initializes state correctly", async () => {
    await store.getState().startSession(mockQuest, "medium");

    const state = store.getState();
    expect(state.status).toBe("countdown");
    expect(state.quest).toEqual(mockQuest);
    expect(state.currentRoundIndex).toBe(0);
    expect(state.currentExerciseIndex).toBe(0);
    expect(state.timerDuration).toBe(3); // Pre-start countdown
  });

  test("finishCountdown transitions to running", async () => {
    await store.getState().startSession(mockQuest, "medium");
    store.getState().finishCountdown();

    expect(store.getState().status).toBe("running");
  });

  test("completeExercise advances to next exercise", async () => {
    await store.getState().startSession(mockQuest, "medium");
    store.getState().finishCountdown();
    await store.getState().completeExercise(10);

    const state = store.getState();
    expect(state.currentExerciseIndex).toBe(1);
    expect(state.results.length).toBe(1);
    expect(state.results[0]?.result.value).toBe(10);
  });

  // Both guards below were added when noUncheckedIndexedAccess showed the store indexing
  // `quest.exercises` and `results` without checking. They are reachable: a saved session
  // restored against a quest that has since been edited lands exactly here. Doing nothing is
  // the right answer — banking a result against an exercise that no longer exists would write
  // a row pointing at nothing — but "does nothing" has to be asserted or it is indistinguishable
  // from a crash that was swallowed.
  test("completeExercise does nothing when the index is past the quest's exercises", async () => {
    await store.getState().startSession(mockQuest, "medium");
    store.getState().finishCountdown();
    store.setState({ currentExerciseIndex: 99 });

    await store.getState().completeExercise(10);

    expect(store.getState().results).toHaveLength(0);
    expect(store.getState().currentExerciseIndex).toBe(99);
  });

  test("updateLastResult does nothing when there is no last result", async () => {
    await store.getState().startSession(mockQuest, "medium");
    store.getState().finishCountdown();

    store.getState().updateLastResult(42);

    expect(store.getState().results).toHaveLength(0);
  });

  test("completeExercise triggers rest between rounds", async () => {
    await store.getState().startSession(mockQuest, "medium");
    store.getState().finishCountdown();
    await store.getState().completeExercise(10);
    await store.getState().completeExercise(60);

    const state = store.getState();
    expect(state.status).toBe("resting");
    expect(state.timerDuration).toBe(90); // The longer round rest
  });

  test("a rest inside a round is the short one", async () => {
    await store.getState().startSession(mockQuest, "medium");
    store.getState().finishCountdown();
    await store.getState().completeExercise(10);

    const state = store.getState();
    expect(state.status).toBe("resting");
    expect(state.timerDuration).toBe(30);
    expect(state.currentRoundIndex).toBe(0);
  });

  test("a round rest of zero skips the rest screen, it does not fall back", async () => {
    await store
      .getState()
      .startSession({ ...mockQuest, roundRestSeconds: 0 } as unknown as Quest, "medium");
    store.getState().finishCountdown();
    await store.getState().completeExercise(10);
    expect(store.getState().timerDuration).toBe(30); // still rests between exercises
    await store.getState().completeExercise(60);

    const state = store.getState();
    expect(state.status).toBe("running");
    expect(state.currentRoundIndex).toBe(1);
    expect(state.currentExerciseIndex).toBe(0);
  });

  test("skipRest starts next round", async () => {
    await store.getState().startSession(mockQuest, "medium");
    store.getState().finishCountdown();
    await store.getState().completeExercise(10);
    await store.getState().completeExercise(60);
    store.getState().skipRest();

    const state = store.getState();
    expect(state.status).toBe("running");
    expect(state.currentRoundIndex).toBe(1);
    expect(state.currentExerciseIndex).toBe(0);
  });

  test("pauseSession and resumeSession work", async () => {
    await store.getState().startSession(mockQuest, "medium");
    store.getState().finishCountdown();
    store.getState().pauseSession();

    expect(store.getState().status).toBe("paused");
    expect(store.getState().prePauseStatus).toBe("running");

    store.getState().resumeSession();

    expect(store.getState().status).toBe("running");
  });

  test("updateLastResult clamps values to be > 0", async () => {
    await store.getState().startSession(mockQuest, "medium");
    store.getState().finishCountdown();
    await store.getState().completeExercise(10);
    store.getState().updateLastResult(0);

    let results = store.getState().results;
    expect(results[results.length - 1]?.result.value).toBe(1);

    store.getState().updateLastResult(-5);

    results = store.getState().results;
    expect(results[results.length - 1]?.result.value).toBe(1);
  });

  test("the recovery snapshot preserves the active timer start", async () => {
    store.setState({
      quest: mockQuest,
      status: "resting",
      startTime: 1000,
      totalPausedTime: 0,
      timerStartTimestamp: 2000,
      timerDuration: 30,
    });

    // The store's subscriber is the only writer of the slot; a result landing is the
    // progress change it saves on.
    store.setState((s) => ({ results: [...s.results, s.results[0] ?? ({} as never)] }));

    await waitFor(() => expect(preferences.setSavedSession).toHaveBeenCalled());
    const saved = JSON.parse(
      (preferences.setSavedSession as jest.Mock).mock.calls.at(-1)?.[0] ?? "{}",
    );
    expect(saved.timerStartTimestamp).toBe(2000);
  });

  /**
   * Regression: `startSession` only loaded a boss when handed an `adventureId`, and no caller
   * ever had one — an adventure step carries its run step id and nothing else. The whole boss
   * system (HP bar, damage, taunts, defeat, village banners) was unreachable in the app while
   * its own tests passed.
   */
  describe("boss fights", () => {
    const dbMock = require("@/db") as { getAdventureIdForRunStep: jest.Mock };
    const bossMock = require("@/db/bossFights") as { getOrCreateBossFight: jest.Mock };

    const boss = {
      id: 7,
      adventureId: 42,
      totalHp: 100,
      currentHp: 100,
      weaknessMuscle: null,
      resistanceMuscle: null,
      defeatedAt: null,
      createdAt: new Date(),
      updatedAt: new Date(),
      imagePath: "assets/placeholder.jpg",
    };

    beforeEach(() => {
      dbMock.getAdventureIdForRunStep.mockClear().mockResolvedValue(42);
      bossMock.getOrCreateBossFight.mockClear().mockResolvedValue(boss);
    });

    afterEach(() => {
      dbMock.getAdventureIdForRunStep.mockResolvedValue(null);
      bossMock.getOrCreateBossFight.mockResolvedValue(null);
    });

    test("resolves the adventure from the run step alone", async () => {
      await store.getState().startSession(mockQuest, "medium", { adventureRunStepId: 5 });

      expect(dbMock.getAdventureIdForRunStep).toHaveBeenCalledWith(5);
      expect(bossMock.getOrCreateBossFight).toHaveBeenCalledWith(42, "medium");
      expect(store.getState().bossFight).toEqual(boss);
    });

    test("takes an explicit adventureId without a lookup", async () => {
      await store.getState().startSession(mockQuest, "medium", { adventureId: 42 });

      expect(dbMock.getAdventureIdForRunStep).not.toHaveBeenCalled();
      // The run's difficulty travels with it: the HP pool is scaled by it at creation.
      expect(bossMock.getOrCreateBossFight).toHaveBeenCalledWith(42, "medium");
    });

    /**
     * A boss killed on an earlier step stays killed: the remaining sessions of the campaign are
     * ordinary training. Carrying the dead fight in put a 0-HP arena (taunts included) on every
     * one of those screens.
     */
    test("a session against an already-dead boss carries no fight at all", async () => {
      bossMock.getOrCreateBossFight.mockResolvedValue({
        ...boss,
        currentHp: 0,
        defeatedAt: new Date(),
      });

      await store.getState().startSession(mockQuest, "medium", { adventureId: 42 });

      expect(store.getState().bossFight).toBeNull();
      expect(store.getState().bossStartHp).toBeNull();
    });

    // The journal records the corrected reps; the boss must take damage for the same number.
    test("correcting the last result re-lands the banked hit", async () => {
      const rand = jest.spyOn(Math, "random").mockReturnValue(0.99); // never a crit
      await store.getState().startSession(mockQuest, "medium", { adventureId: 42 });

      store.getState().completeExercise(8);
      expect(store.getState().pendingDamage).toHaveLength(1);
      expect(store.getState().pendingDamage[0]?.damage).toBe(8);
      expect(store.getState().bossFight?.currentHp).toBe(92);

      store.getState().updateLastResult(15);
      const state = store.getState();
      expect(state.results.at(-1)?.result.value).toBe(15);
      expect(state.pendingDamage).toHaveLength(1);
      expect(state.pendingDamage[0]?.damage).toBe(15);
      expect(state.bossFight?.currentHp).toBe(85);

      rand.mockRestore();
    });

    test("starts a plain quest with no boss and no lookup", async () => {
      await store.getState().startSession(mockQuest, "medium");

      expect(dbMock.getAdventureIdForRunStep).not.toHaveBeenCalled();
      expect(store.getState().bossFight).toBeNull();
    });

    // A failed lookup must not take the session down with it.
    test("still starts the session when the lookup throws", async () => {
      dbMock.getAdventureIdForRunStep.mockRejectedValue(new Error("no db"));

      await store.getState().startSession(mockQuest, "medium", { adventureRunStepId: 5 });

      expect(store.getState().status).toBe("countdown");
      expect(store.getState().bossFight).toBeNull();
    });
  });

  describe("warm-up", () => {
    const prefs = require("@/db/preferences").preferences as {
      getWarmupEnabled: jest.Mock;
    };

    afterEach(() => {
      prefs.getWarmupEnabled.mockResolvedValue(false);
    });

    test("a session opens on the warm-up when it is enabled", async () => {
      prefs.getWarmupEnabled.mockResolvedValue(true);

      await store.getState().startSession(mockQuest, "medium");

      expect(store.getState().status).toBe("warmup");
      expect(store.getState().warmupIndex).toBe(0);
      expect(store.getState().timerDuration).toBe(WARMUP_SEQUENCE[0].seconds);
    });

    test("it walks the sequence, then hands over to the countdown", async () => {
      prefs.getWarmupEnabled.mockResolvedValue(true);
      await store.getState().startSession(mockQuest, "medium");

      for (let i = 1; i < WARMUP_SEQUENCE.length; i++) {
        store.getState().nextWarmupStep();
        expect(store.getState().status).toBe("warmup");
        expect(store.getState().warmupIndex).toBe(i);
      }

      store.getState().nextWarmupStep();
      expect(store.getState().status).toBe("countdown");
    });

    test("skipping goes straight to the countdown and journals nothing", async () => {
      prefs.getWarmupEnabled.mockResolvedValue(true);
      await store.getState().startSession(mockQuest, "medium");

      store.getState().skipWarmup();

      expect(store.getState().status).toBe("countdown");
      // A warm-up is preparation, not work: no result may reach the journal from it.
      expect(store.getState().results).toEqual([]);
    });

    test("stepping back returns to the previous movement with its timer full", async () => {
      prefs.getWarmupEnabled.mockResolvedValue(true);
      await store.getState().startSession(mockQuest, "medium");

      store.getState().nextWarmupStep();
      store.getState().previousWarmupStep();

      expect(store.getState().status).toBe("warmup");
      expect(store.getState().warmupIndex).toBe(0);
      expect(store.getState().timerDuration).toBe(WARMUP_SEQUENCE[0].seconds);
    });

    test("stepping back on the first movement does nothing", async () => {
      prefs.getWarmupEnabled.mockResolvedValue(true);
      await store.getState().startSession(mockQuest, "medium");

      store.getState().previousWarmupStep();

      expect(store.getState().status).toBe("warmup");
      expect(store.getState().warmupIndex).toBe(0);
    });

    test("quitting resets the warm-up position", async () => {
      prefs.getWarmupEnabled.mockResolvedValue(true);
      await store.getState().startSession(mockQuest, "medium");
      store.getState().nextWarmupStep();

      store.getState().quitSession();

      expect(store.getState().warmupIndex).toBe(0);
    });

    test("turning it off starts on the countdown, as before", async () => {
      prefs.getWarmupEnabled.mockResolvedValue(false);

      await store.getState().startSession(mockQuest, "medium");

      expect(store.getState().status).toBe("countdown");
    });
  });

  /**
   * Damage used to be written to the database the instant an exercise was completed, which made
   * the boss's HP a fact before the session that caused it existed. Two ways to exploit that:
   * replay a round and its damage counted twice, or quit before the victory screen and the
   * damage stuck with no session to account for it. Hits are now banked in memory and committed
   * once, in `saveSession`.
   */
  describe("boss damage is only owed until the session is saved", () => {
    const bossMock = require("@/db/bossFights") as { persistSessionDamage: jest.Mock };

    const boss = {
      id: 3,
      adventureId: 42,
      totalHp: 1000,
      currentHp: 1000,
      weaknessMuscle: null,
      resistanceMuscle: null,
      defeatedAt: null,
    };

    beforeEach(() => {
      bossMock.persistSessionDamage.mockClear();
      store.setState({
        quest: mockQuest,
        status: "running",
        startTime: 1000,
        bossFight: { ...boss } as never,
        bossStartHp: 1000,
        felledByFinalBlow: false,
        pendingDamage: [],
        currentRoundIndex: 0,
        currentExerciseIndex: 0,
        results: [],
        savedSessionId: null,
      });
    });

    test("a hit lands on screen without reaching the database", async () => {
      await store.getState().completeExercise(10);

      const state = store.getState();
      expect(state.pendingDamage).toHaveLength(1);
      expect(state.bossFight?.currentHp).toBeLessThan(1000);
      expect(bossMock.persistSessionDamage).not.toHaveBeenCalled();
    });

    test("restarting a round gives back exactly the HP that round took off", async () => {
      // Round 1, both exercises.
      await store.getState().completeExercise(10);
      await store.getState().completeExercise(60);
      const afterRoundOne = store.getState().bossFight?.currentHp ?? 0;
      expect(store.getState().currentRoundIndex).toBe(1);

      // Round 2, one exercise in — then the hero restarts it.
      await store.getState().completeExercise(10);
      expect(store.getState().bossFight?.currentHp).toBeLessThan(afterRoundOne);

      store.getState().restartRound();

      const state = store.getState();
      // Back to where round 2 began, not lower.
      expect(state.bossFight?.currentHp).toBe(afterRoundOne);
      // Only round 1's hits survive.
      expect(state.pendingDamage.every((hit) => hit.roundIndex === 0)).toBe(true);
    });

    test("quitting takes the damage with it", async () => {
      await store.getState().completeExercise(10);
      expect(store.getState().pendingDamage).toHaveLength(1);

      store.getState().quitSession();

      expect(store.getState().pendingDamage).toEqual([]);
      expect(store.getState().bossFight).toBeNull();
      expect(bossMock.persistSessionDamage).not.toHaveBeenCalled();
    });

    test("saving commits the banked hits once, against the session that earned them", async () => {
      await store.getState().completeExercise(10);
      await store.getState().completeExercise(60);

      await store.getState().saveSession(null);

      expect(bossMock.persistSessionDamage).toHaveBeenCalledTimes(1);
      const [fightId, hits, sessionId] = bossMock.persistSessionDamage.mock.calls[0];
      expect(fightId).toBe(3);
      expect(hits).toHaveLength(2);
      expect(sessionId).toBe(1);
      // Emptied, so the victory screen's retry cannot land them a second time.
      expect(store.getState().pendingDamage).toEqual([]);
    });

    /**
     * persistSessionDamage drops hits without throwing when the fight row is gone or the boss is
     * already dead. Clearing on that answer is how a session's work disappears with no log row and
     * no error to find weeks later — so the hits stay, and the drop is reported.
     */
    test("hits the database refused are kept, not silently dropped", async () => {
      const reporter = require("@/src/reportError") as { reportError: jest.Mock };
      reporter.reportError.mockClear();
      bossMock.persistSessionDamage.mockResolvedValueOnce(false);

      await store.getState().completeExercise(10);
      await store.getState().saveSession(null);

      expect(store.getState().pendingDamage).toHaveLength(1);
      expect(reporter.reportError).toHaveBeenCalledWith(
        "session.commitPendingDamage",
        expect.any(Error),
      );
    });

    /**
     * saveSession is a dozen awaits long and is not one transaction, so a failure halfway
     * through leaves the session row written — and the victory screen offers a retry button for
     * exactly that case. Without this, the retry banks the workout a second time.
     */
    test("a retry after a partial failure resumes the session, it does not bank a second one", async () => {
      const completed = require("@/db/completed") as { createCompletedSession: jest.Mock };
      const records = require("@/db/personalRecords") as { checkForNewRecords: jest.Mock };
      completed.createCompletedSession.mockClear();

      // First attempt dies after the session row is in.
      records.checkForNewRecords.mockRejectedValueOnce(new Error("db went away"));
      await expect(store.getState().saveSession(null)).rejects.toThrow("db went away");
      expect(completed.createCompletedSession).toHaveBeenCalledTimes(1);

      const result = await store.getState().saveSession(null);

      // Still one row: the retry reused it.
      expect(completed.createCompletedSession).toHaveBeenCalledTimes(1);
      expect(result.sessionId).toBe(1);
    });

    test("a boss already dead when the session opened takes no further hits", async () => {
      store.setState({
        bossFight: { ...boss, currentHp: 0, defeatedAt: new Date() } as never,
      });

      await store.getState().completeExercise(10);

      expect(store.getState().pendingDamage).toEqual([]);
    });

    /**
     * The final blow: finishing the campaign IS the kill. Without this, a hero who trained under
     * target finished every step to a victory screen and a live boss that no remaining step could
     * ever kill — the exact bug the pacing was supposed to make impossible.
     */
    test("finishing the campaign's last step fells whatever is left of the boss", async () => {
      const dbMock = require("@/db") as { completeAdventureRunStep: jest.Mock };
      const finishMock = require("@/db/bossFights") as { finishBossFight: jest.Mock };
      finishMock.finishBossFight.mockClear();
      dbMock.completeAdventureRunStep.mockResolvedValueOnce({
        adventureId: 42,
        runId: 9,
        isFinished: true,
        nextRunStepId: null,
        nextQuestId: null,
      });
      store.setState({ adventureRunStepId: 5 });

      await store.getState().completeExercise(10);
      await store.getState().saveSession(null);

      expect(finishMock.finishBossFight).toHaveBeenCalledWith(3, 1);
      const state = store.getState();
      expect(state.bossFight?.currentHp).toBe(0);
      expect(state.bossFight?.defeatedAt).toBeInstanceOf(Date);
    });

    /**
     * The Triumph is what HP are for: empty the pool with your own damage and the killing session
     * pays a bonus. The final blow still guarantees the kill for everyone else — reward for
     * pushing, never punishment for training under target.
     */
    test("emptying the pool yourself is a Triumph and pays its bonus", async () => {
      const completed = require("@/db/completed") as { addBonusXpToSession: jest.Mock };
      const bossFights = require("@/db/bossFights") as {
        finishBossFight: jest.Mock;
        TRIUMPH_XP_BONUS: number;
      };
      const dbMock = require("@/db") as { completeAdventureRunStep: jest.Mock };
      completed.addBonusXpToSession.mockClear();
      bossFights.finishBossFight.mockClear();
      // The store's own damage brings the boss to zero: 10 HP left, one 10-rep set.
      store.setState({
        adventureRunStepId: 5,
        bossFight: { ...boss, currentHp: 10 } as never,
        bossStartHp: 10,
      });
      dbMock.completeAdventureRunStep.mockResolvedValueOnce({
        adventureId: 42,
        runId: 9,
        isFinished: true,
        nextRunStepId: null,
        nextQuestId: null,
      });
      // The stored row is already dead when the final blow checks it — nothing left to fell.
      bossFights.finishBossFight.mockResolvedValueOnce(false);

      await store.getState().completeExercise(10);
      expect(store.getState().bossFight?.currentHp).toBe(0);

      const result = await store.getState().saveSession(null);

      expect(completed.addBonusXpToSession).toHaveBeenCalledWith(1, bossFights.TRIUMPH_XP_BONUS);
      expect(result.xpEarned).toBeGreaterThanOrEqual(bossFights.TRIUMPH_XP_BONUS);
      expect(store.getState().felledByFinalBlow).toBe(false);
    });

    test("a final-blow kill is not a Triumph and pays no bonus", async () => {
      const completed = require("@/db/completed") as { addBonusXpToSession: jest.Mock };
      const dbMock = require("@/db") as { completeAdventureRunStep: jest.Mock };
      completed.addBonusXpToSession.mockClear();
      store.setState({ adventureRunStepId: 5 });
      dbMock.completeAdventureRunStep.mockResolvedValueOnce({
        adventureId: 42,
        runId: 9,
        isFinished: true,
        nextRunStepId: null,
        nextQuestId: null,
      });

      await store.getState().completeExercise(10);
      await store.getState().saveSession(null);

      expect(completed.addBonusXpToSession).not.toHaveBeenCalled();
      expect(store.getState().felledByFinalBlow).toBe(true);
    });

    test("a mid-campaign step deals no final blow", async () => {
      const dbMock = require("@/db") as { completeAdventureRunStep: jest.Mock };
      const finishMock = require("@/db/bossFights") as { finishBossFight: jest.Mock };
      finishMock.finishBossFight.mockClear();
      dbMock.completeAdventureRunStep.mockResolvedValueOnce({
        adventureId: 42,
        runId: 9,
        isFinished: false,
        nextRunStepId: 6,
        nextQuestId: 2,
      });
      store.setState({ adventureRunStepId: 5 });

      await store.getState().completeExercise(10);
      await store.getState().saveSession(null);

      expect(finishMock.finishBossFight).not.toHaveBeenCalled();
      expect(store.getState().bossFight?.currentHp).toBeGreaterThan(0);
    });
  });
});
