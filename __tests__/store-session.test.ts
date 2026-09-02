import assert from "node:assert/strict";
import { act, renderHook, waitFor } from "@testing-library/react-native";
import { WARMUP_SEQUENCE } from "@/constants/warmup";
import type { Exercise } from "@/db/exercises";
import { preferences } from "@/db/preferences";
import { saveQuestConfig } from "@/db/questConfig";
import type { Quest } from "@/db/quests";
import { computeSessionXp } from "@/db/xp";
import { useSessionRecovery } from "@/hooks/useSessionRecovery";
import { i18n } from "@/i18n";
import { EMPTY } from "@/src/gps/track";
import { useExpeditionStore } from "@/stores/expedition";
import { useSessionStore } from "../stores/session";

// Mock DB client to prevent actual SQLite initialization
jest.mock("@/db/client", () => ({
  db: {},
  schema: {},
  runMigrations: jest.fn().mockResolvedValue(undefined),
}));

// Mock quests module
jest.mock("@/db/quests", () => ({
  ...jest.requireActual("@/db/quests"),
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
jest.mock("@/db/questConfig", () => ({
  ...jest.requireActual("@/db/questConfig"),
  saveQuestConfig: jest.fn().mockResolvedValue(undefined),
}));
jest.mock("@/db/queryCache", () => ({
  ...jest.requireActual("@/db/queryCache"),
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
// Spread the real module, stub only the one function these tests want deterministic. A flat mock
// listing constants by hand made every symbol added to `db/xp.ts` arrive `undefined` with no error
// anywhere — `Math.min(undefined, xp)` is NaN, and the failure surfaces three asserts later.
// Same idiom as `@/db/bossFights` above.
jest.mock("@/db/xp", () => ({
  ...jest.requireActual("@/db/xp"),
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
    // Read by beginTrackingIfOuting, only exercised by the outing cases below.
    getDistanceUnit: jest.fn().mockResolvedValue("metric"),
    getHapticsEnabled: jest.fn().mockResolvedValue(true),
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
// Every half of the outing path reads this module: the store deletes an abandoned trace, the
// expedition store appends and replays points, the recovery hook sweeps orphans.
jest.mock("@/db/gps", () => ({
  deletePoints: jest.fn().mockResolvedValue(undefined),
  sweepOrphanedPoints: jest.fn().mockResolvedValue(0),
  appendPoints: jest.fn().mockResolvedValue(undefined),
  pointsOf: jest.fn().mockResolvedValue([]),
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
     * The session's name has to be the same one from its first second to the journal, because
     * an expedition files a GPS point every second under `gps_points.sessionId` and there is no
     * row to point at until the very end. A uuid minted at save time would leave every one of
     * those points belonging to a session that, as far as any query is concerned, never
     * happened — which is precisely how the first draft of this design described a resume it
     * could not have delivered.
     */
    test("the session carries one name from its first second into the journal", async () => {
      const completed = require("@/db/completed") as { createCompletedSession: jest.Mock };
      completed.createCompletedSession.mockClear();

      // Through the real door, not the fixture: the point is that starting a session is what
      // mints the name, and that the same one survives to the row.
      await store.getState().startSession(mockQuest, "medium");
      const atStart = store.getState().sessionUuid;
      expect(atStart).toEqual(expect.any(String));

      store.setState({
        results: [{ exerciseId: 1, sortOrder: 0, result: { type: "reps", value: 10 } }],
      });
      await store.getState().saveSession(null);

      expect(completed.createCompletedSession).toHaveBeenCalledWith(
        expect.objectContaining({ uuid: atStart }),
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

  /**
   * Issue #33's second half. `CHECK (resultValue > 0)` made "1" the only way past a movement out
   * of reach, and that 1 then fed muscle volume, the weak-area read and the targets generated
   * from them — the app teaching its own journal a lie.
   */
  describe("a set the hero could not do", () => {
    beforeEach(() => {
      store.setState({
        quest: mockQuest as unknown as Quest,
        status: "running",
        currentRoundIndex: 0,
        currentExerciseIndex: 0,
        results: [],
        lastSetSkipped: false,
        startTime: Date.now(),
      });
    });

    test("writes no result at all, rather than a 1", () => {
      store.getState().completeExercise(10);
      store.getState().skipExercise();

      const { results } = store.getState();
      expect(results).toHaveLength(1);
      expect(results[0]?.sortOrder).toBe(0);
      expect(store.getState().lastSetSkipped).toBe(true);
    });

    test("advances exactly like a completed set would", () => {
      store.getState().skipExercise();

      // Same landing as `completeExercise`: the second slot, with the rest screen in between.
      expect(store.getState().currentExerciseIndex).toBe(1);
      expect(store.getState().status).toBe("resting");
    });

    test("banks no boss damage", () => {
      store.setState({
        bossFight: { id: 1, totalHp: 100, currentHp: 100, defeatedAt: null } as never,
        pendingDamage: [],
      });

      store.getState().skipExercise();

      expect(store.getState().pendingDamage).toHaveLength(0);
      expect(store.getState().bossFight?.currentHp).toBe(100);
    });

    test("completing a set afterwards clears the flag the rest screen reads", () => {
      store.getState().skipExercise();
      expect(store.getState().lastSetSkipped).toBe(true);

      store.getState().completeExercise(8);
      expect(store.getState().lastSetSkipped).toBe(false);
    });

    /**
     * A session with nothing in it cannot be written, and the victory screen would sit on a retry
     * that can never succeed. Quit is the way out of a workout the hero cannot do.
     */
    test("the last remaining set is not skippable on an empty journal", () => {
      store.setState({
        currentRoundIndex: (mockQuest as unknown as Quest).rounds - 1,
        currentExerciseIndex: (mockQuest as unknown as Quest).exercises.length - 1,
        results: [],
      });

      store.getState().skipExercise();

      expect(store.getState().status).toBe("running");
      expect(store.getState().results).toHaveLength(0);
    });
  });

  describe("changing the movement mid-session", () => {
    const easier = {
      id: 99,
      enName: "Wall Push-Up",
      frName: "Pompe au mur",
      difficulty: "easy",
      secondsPerRep: 2,
      muscles: ["chest"],
    } as unknown as Exercise;

    beforeEach(() => {
      store.setState({
        quest: mockQuest as unknown as Quest,
        status: "running",
        currentRoundIndex: 0,
        currentExerciseIndex: 0,
        results: [],
        startTime: Date.now(),
      });
    });

    test("replaces the movement ahead and drops the art that belonged to the old one", () => {
      store.getState().swapCurrentExercise(easier);

      const slot = store.getState().quest?.exercises[0];
      expect(slot?.exercise.enName).toBe("Wall Push-Up");
      expect(slot?.images).toEqual([]);
    });

    test("leaves results already logged exactly as they were", () => {
      store.getState().completeExercise(10);
      const before = store.getState().results;

      store.setState({ currentExerciseIndex: 0, status: "running" });
      store.getState().swapCurrentExercise(easier);

      expect(store.getState().results).toEqual(before);
      expect(store.getState().results[0]?.exerciseId).toBe(before[0]?.exerciseId);
    });

    /**
     * The trap this whole field exists for. `toXpSets` used to re-read the movement off the slot
     * at save time, so swapping to a harder one on the last round re-priced every set already
     * logged. Two sets, a swap, and the first two must still cost what they cost.
     */
    test("does not re-price the sets already done", () => {
      store.getState().completeExercise(10);

      const pricedAtCompletion = store.getState().results[0]?.pricing;
      expect(pricedAtCompletion).toEqual({
        secondsPerRep: (mockQuest as unknown as Quest).exercises[0]?.exercise.secondsPerRep,
        difficulty: (mockQuest as unknown as Quest).exercises[0]?.exercise.difficulty,
      });

      store.setState({ currentExerciseIndex: 0, status: "running" });
      store.getState().swapCurrentExercise(easier);

      // The slot changed; the set's own price did not.
      expect(store.getState().quest?.exercises[0]?.exercise.difficulty).toBe("easy");
      expect(store.getState().results[0]?.pricing).toEqual(pricedAtCompletion);
    });

    /**
     * The mid-session copy of the bug: the first slot is 10 reps, Superman is a hold. The set
     * the hero logs next is what records, volume, XP and the ladder will trust, so it is the
     * written row that has to carry the right unit — not just the screen.
     */
    test("a hold swapped into a rep slot arms a timer and logs seconds", () => {
      const superman = { ...easier, id: 98, enName: "Superman", measure: "time" } as Exercise;

      store.getState().swapCurrentExercise(superman);

      const slot = store.getState().quest?.exercises[0];
      expect(slot?.target).toEqual({ type: "time", value: 30 });
      expect(store.getState().timerDuration).toBe(30);
      expect(store.getState().timerStartTimestamp).not.toBeNull();

      store.getState().completeExercise(30);
      expect(store.getState().results[0]?.result).toEqual({ type: "time", value: 30 });
    });

    /**
     * A swap moves neither the indexes nor the result count the snapshot subscriber watched, so
     * a crash right after one recovered the movement the hero had just refused.
     */
    test("is written to the recovery snapshot before the next set lands", async () => {
      (preferences.setSavedSession as jest.Mock).mockClear();

      store.getState().swapCurrentExercise(easier);

      await waitFor(() => expect(preferences.setSavedSession).toHaveBeenCalled());
      const saved = JSON.parse(
        (preferences.setSavedSession as jest.Mock).mock.calls.at(-1)?.[0] ?? "{}",
      );
      expect(saved.quest.exercises[0].exercise.id).toBe(easier.id);
    });

    test("resets the timer to the unit the new movement is measured in", () => {
      store.setState({ timerStartTimestamp: 123, timerDuration: 45 });

      store.getState().swapCurrentExercise(easier);

      // mockQuest's first slot is rep-based, so a hold timer must not be left running on it.
      const isTimeBased = (mockQuest as unknown as Quest).exercises[0]?.target.type === "time";
      expect(store.getState().timerStartTimestamp === null).toBe(!isTimeBased);
    });

    /**
     * The sheet on the quest screen writes `quest:<id>:config`; this one deliberately does not.
     * That is configuration, posted cold before starting; this is a correction for tonight, made
     * mid-set on a movement that turned out to be out of reach. Persisting it pins the slot —
     * `applyQuestConfig` swaps before `currentRungFor` runs — and the progression substitution
     * issue #33 exists for would stop applying to the one slot the hero struggled on.
     */
    test("does not pin the slot in the quest's saved config", () => {
      store.getState().swapCurrentExercise(easier);

      expect(saveQuestConfig).not.toHaveBeenCalled();
    });

    test("swapping to the movement already there is a no-op", () => {
      const same = (mockQuest as unknown as Quest).exercises[0]?.exercise;
      const before = store.getState().quest;

      store.getState().swapCurrentExercise(same as never);

      expect(store.getState().quest).toBe(before);
    });
  });

  // The one uncovered link in the whole outing feature: the door the hero came through decides
  // the goal, and `beginTrackingIfOuting` is what carries it to the `begin` that buzzes against
  // it. `begin` gained two positional params late (`goal`, then `haptics`), so the arguments are
  // asserted by position, not merely presence.
  describe("beginTrackingIfOuting", () => {
    const outingQuest = {
      id: 9,
      rounds: 1,
      restSeconds: 0,
      roundRestSeconds: null,
      enTitle: "The Long Walk",
      frTitle: "La longue marche",
      exercises: [
        {
          exercise: { id: 30, enName: "Warden's Walk", muscles: [], style: "expedition" },
          target: { type: "time", value: 900 },
        },
      ],
    } as unknown as Quest;

    afterEach(() => {
      jest.restoreAllMocks();
    });

    test("the goal reaches begin by position, exactly as the door handed it over", async () => {
      const beginSpy = jest.spyOn(useExpeditionStore.getState(), "begin").mockResolvedValue(true);

      await store
        .getState()
        .startSession(outingQuest, "medium", { goal: { type: "distance", metres: 3000 } });
      await waitFor(() => expect(beginSpy).toHaveBeenCalled());

      const call = beginSpy.mock.calls[0];
      assert(call);
      const [sessionUuid, notification, mounted, unit, goal, haptics] = call;
      expect(typeof sessionUuid).toBe("string");
      expect(notification.reached).toBe(i18n.t("session.expedition_reached"));
      // The quest, not the app. This notification is the only screen an hour of walking has.
      expect(notification.title).toBe("The Long Walk");
      expect(mounted).toBe(false);
      expect(unit).toBe("metric");
      expect(goal).toEqual({ type: "distance", metres: 3000 });
      expect(haptics).toBe(true);
    });

    test("a walk starts by walking, with its timer already running", async () => {
      const beginSpy = jest.spyOn(useExpeditionStore.getState(), "begin").mockResolvedValue(true);

      await store.getState().startSession(outingQuest, "medium", { goal: null });
      await waitFor(() => expect(beginSpy).toHaveBeenCalled());

      // No 3..2..1: getting into position before a set of squats is what that screen is for.
      expect(store.getState().status).toBe("running");
      // And the timer of the slot itself, not the countdown's. Without it `useSessionTimer`
      // returns its idle state and the view completes the walk with a single second.
      expect(store.getState().timerStartTimestamp).not.toBeNull();
      expect(store.getState().timerDuration).toBe(900);
    });

    /**
     * The snapshot of the first second.
     *
     * The subscriber refuses to write during a countdown and treated leaving one as the first
     * sign of progress, which is the only sign an outing ever gives: one round, one movement, no
     * rest, so nothing else it watches ever moves. A walk now goes from `idle` straight to
     * `running` and never passes through a countdown at all, so without this the snapshot would
     * never be written, and `useSessionRecovery` would sweep the trace as an orphan.
     */
    test("a walk is written down as soon as it starts, not at its first pause", async () => {
      const beginSpy = jest.spyOn(useExpeditionStore.getState(), "begin").mockResolvedValue(true);
      (preferences.setSavedSession as jest.Mock).mockClear();

      await store.getState().startSession(outingQuest, "medium", { goal: null });
      await waitFor(() => expect(beginSpy).toHaveBeenCalled());

      await waitFor(() => expect(preferences.setSavedSession).toHaveBeenCalled());
      const written = JSON.parse(
        (preferences.setSavedSession as jest.Mock).mock.calls[0]?.[0] as string,
      ) as { goal: unknown; sessionUuid: string };
      // With the goal it set out with, which for this door is none at all.
      expect(written.goal).toBeNull();
      // Filed under the name its points are already using.
      expect(written.sessionUuid).toBe(store.getState().sessionUuid);
    });

    test("a workout indoors still counts down", async () => {
      await store.getState().startSession(mockQuest, "medium");

      expect(["countdown", "warmup"]).toContain(store.getState().status);
    });

    /**
     * The walk with no number on it.
     *
     * The store used to build the goal itself, falling back to whatever the slots added up to, so
     * "no goal" was a sentence it could not say: a hero who tapped a tile to go out was handed
     * the fifteen minutes the seed happens to draw at medium, and buzzed at them. The fallback
     * now lives with the door that knows the hero's answer, and `null` reaches the service whole.
     */
    test("a walk with no number on it reaches begin as a null goal", async () => {
      const beginSpy = jest.spyOn(useExpeditionStore.getState(), "begin").mockResolvedValue(true);

      await store.getState().startSession(outingQuest, "medium", { goal: null });
      await waitFor(() => expect(beginSpy).toHaveBeenCalled());

      const call = beginSpy.mock.calls[0];
      assert(call);
      expect(call[4]).toBeNull();
      // And nothing rebuilt it on the way: the slot's own 900 seconds stayed a suggestion.
      expect(store.getState().goal).toBeNull();
    });

    test("the goal is held in state, where the snapshot can reach it", async () => {
      const beginSpy = jest.spyOn(useExpeditionStore.getState(), "begin").mockResolvedValue(true);

      await store
        .getState()
        .startSession(outingQuest, "medium", { goal: { type: "time", seconds: 1800 } });
      await waitFor(() => expect(beginSpy).toHaveBeenCalled());

      // `SavedSessionState` is a `Pick`, so a goal that stopped being persisted would be a
      // compile error rather than a walk that comes back buzzing at the wrong moment.
      expect(store.getState().goal).toEqual({ type: "time", seconds: 1800 });
    });
  });

  /**
   * What a long walk is worth.
   *
   * Two findings of the engineering review of 2026-09-02, both true on main before it. A set may
   * only ever record an hour (`clampResultValue` against `TIME_TARGET_MAX`), which is right for a
   * plank and wrong for a walk: a two-hour ride was written down as one, and XP is paid on what
   * is written down. And a walk the OS killed came back with a stopwatch reset to zero, because
   * recovery pushes `timerStartTimestamp` forward by the whole downtime, so the view handed
   * `completeExercise` the seconds since the resume and the hero was paid for those alone.
   *
   * Both are fixed in the same place: an outing's result is not the view's stopwatch, it is the
   * duration the journal is about to write, and its ceiling is a walk's, not a hold's.
   */
  describe("an outing is paid for the whole of it", () => {
    const outing = {
      id: 9,
      rounds: 1,
      restSeconds: 0,
      roundRestSeconds: null,
      enTitle: "The Long Walk",
      frTitle: "La longue marche",
      exercises: [
        {
          exercise: { id: 30, enName: "Warden's Walk", muscles: [], style: "expedition" },
          target: { type: "time", value: 900 },
        },
      ],
    } as unknown as Quest;

    /** On the road for `seconds`, all of it moving, as the reducer would read it back. */
    const walked = (seconds: number, startedAt = Date.now() - seconds * 1000) => {
      useExpeditionStore.setState({
        track: {
          ...EMPTY,
          startedAt,
          lastAt: startedAt + seconds * 1000,
          distanceM: seconds * 1.4,
          movingMs: seconds * 1000,
        },
      });
    };

    // Swapped in rather than spied on, for the reason the resumed-walk case below spells out:
    // these cases write to the expedition store, zustand hands `setState` a fresh state object,
    // and a spy `restoreAllMocks` puts back on the old one rides along on the new one. The next
    // case then sees a `begin` that was already called.
    let realBegin: ReturnType<typeof useExpeditionStore.getState>["begin"];

    beforeEach(() => {
      realBegin = useExpeditionStore.getState().begin;
      const begin = jest.fn<Promise<boolean>, unknown[]>().mockResolvedValue(true);
      useExpeditionStore.setState({ begin: begin as unknown as typeof realBegin });
    });

    afterEach(() => {
      useExpeditionStore.setState({ begin: realBegin, track: EMPTY });
    });

    test("two hours on a mount are recorded as two hours, not as the hour a hold stops at", async () => {
      await store.getState().startSession(outing, "medium", {});
      walked(7200);

      store.getState().completeExercise(7200);

      expect(store.getState().results[0]?.result.value).toBe(7200);
    });

    test("a walk the OS killed is recorded by its trace, not by the clock since the resume", async () => {
      await store.getState().startSession(outing, "medium", {});
      // What recovery leaves behind: the downtime banked as pause, so the session's own clock
      // reads the minute since the hero pressed resume.
      store.setState({ startTime: Date.now() - 60_000, totalPausedTime: 0 });
      walked(45 * 60);

      // The number the view's stopwatch would have handed over.
      store.getState().completeExercise(60);

      expect(store.getState().results[0]?.result.value).toBe(45 * 60);
    });

    test("with no fix at all it keeps what the clock measured", async () => {
      await store.getState().startSession(outing, "medium", {});
      store.setState({ startTime: Date.now() - 45 * 60_000, totalPausedTime: 0 });

      store.getState().completeExercise(45 * 60);

      // Not the 30 minutes twice the 15-minute slot would allow: a walk with no witness is
      // still a walk, and the hero is believed.
      expect(store.getState().results[0]?.result.value).toBe(45 * 60);
    });

    test("but a phone forgotten overnight does not record nine hours", async () => {
      await store.getState().startSession(outing, "medium", {});
      store.setState({ startTime: Date.now() - 9 * 3600_000, totalPausedTime: 0 });

      store.getState().completeExercise(9 * 3600);

      expect(store.getState().results[0]?.result.value).toBe(4 * 3600);
    });

    test("a walk with no number on it writes no target to compare itself to", async () => {
      const beginSpy = jest.spyOn(useExpeditionStore.getState(), "begin").mockResolvedValue(true);
      await store.getState().startSession(outing, "medium", { goal: null });
      await waitFor(() => expect(beginSpy).toHaveBeenCalled());
      walked(30 * 60);

      store.getState().completeExercise(30 * 60);

      // The slot's own 900 seconds are a suggestion the hero never saw. Written down, the
      // journal would tick it green as a target met.
      expect(store.getState().results[0]?.target).toBeUndefined();
      expect(store.getState().results[0]?.result.value).toBe(30 * 60);
    });

    test("a walk that had a goal keeps it, to be measured against", async () => {
      const beginSpy = jest.spyOn(useExpeditionStore.getState(), "begin").mockResolvedValue(true);
      await store
        .getState()
        .startSession(outing, "medium", { goal: { type: "time", seconds: 900 } });
      await waitFor(() => expect(beginSpy).toHaveBeenCalled());
      walked(30 * 60);

      store.getState().completeExercise(30 * 60);

      expect(store.getState().results[0]?.target).toEqual({ type: "time", value: 900 });
    });

    test("an indoor hold still stops at an hour", () => {
      store.setState({
        quest: mockQuest,
        status: "running",
        currentExerciseIndex: 1,
        startTime: Date.now() - 7200_000,
        results: [],
      });

      store.getState().completeExercise(7200);

      expect(store.getState().results[0]?.result.value).toBe(3600);
    });
  });

  /**
   * The interrupted walk.
   *
   * `startSession` was the only caller that ever started the tracking, so the OEM killing the app
   * at 2.4 km and the hero tapping resume gave a session whose panel said "Finding the sky" for
   * the rest of the way, whose reducer finished with no witness (`leaguesM: null`) and whose
   * recap still drew the kilometres already in `gps_points`. One outing, two lengths.
   */
  describe("resuming an interrupted session", () => {
    const outing = {
      id: 9,
      rounds: 1,
      restSeconds: 0,
      roundRestSeconds: null,
      enTitle: "The Long Walk",
      frTitle: "La longue marche",
      exercises: [
        {
          exercise: { id: 30, enName: "Warden's Walk", muscles: [], style: "expedition" },
          target: { type: "time", value: 900 },
        },
      ],
    } as unknown as Quest;

    const snapshot = (over: Record<string, unknown> = {}) =>
      JSON.stringify({
        quest: outing,
        userLevel: "medium",
        sessionUuid: "0192-walk",
        goal: { type: "distance", metres: 3000 },
        adventureRunStepId: null,
        bossFight: null,
        bossStartHp: null,
        pendingDamage: [],
        lastDamageResult: null,
        status: "running",
        prePauseStatus: null,
        warmupSequence: [],
        warmupIndex: 0,
        currentRoundIndex: 0,
        currentExerciseIndex: 0,
        startTime: Date.now() - 600_000,
        totalPausedTime: 0,
        restTakenSeconds: 0,
        timerStartTimestamp: null,
        timerDuration: 0,
        results: [],
        lastSetSkipped: false,
        savedAt: Date.now(),
        ...over,
      });

    afterEach(() => {
      (preferences.getSavedSession as jest.Mock).mockResolvedValue(null);
      jest.restoreAllMocks();
    });

    test("starts measuring again, on the name the points are already filed under", async () => {
      const beginSpy = jest.spyOn(useExpeditionStore.getState(), "begin").mockResolvedValue(true);
      (preferences.getSavedSession as jest.Mock).mockResolvedValue(snapshot());

      const { result } = await renderHook(() => useSessionRecovery());
      await act(async () => {
        await result.current.recoverSession();
      });

      const call = beginSpy.mock.calls[0];
      assert(call);
      // The same uuid: a second name would file the rest of the walk under a session nothing
      // ever reads, and the sweep would take it.
      expect(call[0]).toBe("0192-walk");
      expect(useSessionStore.getState().sessionUuid).toBe("0192-walk");
      // And the goal the hero set, which is in the snapshot for exactly this reason.
      expect(call[4]).toEqual({ type: "distance", metres: 3000 });
    });

    /**
     * The half-hour a resumed walk used to lose.
     *
     * An expedition is one round of one movement, so the subscriber writes its snapshot once, at
     * the countdown, and never again — `savedAt` is the *start* of the walk, not the moment it
     * died. Recovery banks everything since as pause, so the session clock of a walk killed at 45
     * minutes read the ten since the hero pressed resume, while the reducer, replaying the points
     * from `gps_points`, read the whole thing. The victory screen printed "Total 10:00" over
     * "Moving 45:xx" and the journal kept the ten.
     */
    test("times a resumed walk by its trace, not by the clock the downtime ate", async () => {
      const completed = require("@/db/completed") as { createCompletedSession: jest.Mock };
      // Swapped in rather than spied on: this case writes to the expedition store, and zustand
      // hands `setState` a fresh state object each time — a spy `restoreAllMocks` puts back on
      // the old one is still on the new one, and the next case sees a `begin` that was already
      // called. Put back by hand below, on whichever object is current by then.
      const realBegin = useExpeditionStore.getState().begin;
      const begin = jest.fn<Promise<boolean>, unknown[]>().mockResolvedValue(true);
      useExpeditionStore.setState({ begin: begin as unknown as typeof realBegin });
      const setOff = Date.now() - 55 * 60_000;
      (preferences.getSavedSession as jest.Mock).mockResolvedValue(
        snapshot({ startTime: setOff, savedAt: setOff + 3000 }),
      );

      const { result } = await renderHook(() => useSessionRecovery());
      await act(async () => {
        await result.current.recoverSession();
      });
      // Fire and forget in the hook, and it must land inside this case: the next one asserts
      // that a workout starts nothing, and a stray resume arriving late is that test failing.
      await waitFor(() => expect(begin).toHaveBeenCalled());
      // The whole walk landed in `totalPausedTime`, which is what made the two halves disagree.
      expect(useSessionStore.getState().totalPausedTime).toBeGreaterThan(54 * 60_000);

      // What the reducer reads back from the points: 55 minutes on the road, 50 of them moving.
      useExpeditionStore.setState({
        track: {
          ...EMPTY,
          startedAt: setOff,
          lastAt: setOff + 55 * 60_000,
          distanceM: 5000,
          movingMs: 50 * 60_000,
        },
      });
      completed.createCompletedSession.mockClear();

      await useSessionStore.getState().saveSession(null);

      const row = completed.createCompletedSession.mock.calls[0]?.[0];
      // The trace's own span, capped by moving time plus the stops it is allowed to hide.
      expect(row.durationSeconds).toBe(55 * 60);
      // And the two numbers the recap will print, both written here rather than replayed there.
      expect(row.leaguesM).toBe(5000);
      expect(row.movingSeconds).toBe(50 * 60);

      useExpeditionStore.setState({ begin: realBegin });
    });

    test("a workout indoors starts nothing", async () => {
      const beginSpy = jest.spyOn(useExpeditionStore.getState(), "begin").mockResolvedValue(true);
      (preferences.getSavedSession as jest.Mock).mockResolvedValue(snapshot({ quest: mockQuest }));

      const { result } = await renderHook(() => useSessionRecovery());
      await act(async () => {
        await result.current.recoverSession();
      });

      expect(beginSpy).not.toHaveBeenCalled();
    });
  });

  /**
   * The service, the wake lock and the 1 Hz GPS belong to the session, not to the victory
   * screen's question. `saveSession` was the only end of that road and it sits behind "was that
   * really a session?": a hero who quit after 30 s, tapped DONE and put the phone away without
   * answering kept a permanent notification and a live trace until the process died — and every
   * fix in between landed on the finished session, so "Keep" twenty minutes later credited the
   * walk home.
   */
  test("the measure stops when the session ends, not when the question is answered", async () => {
    const outing = {
      id: 9,
      rounds: 1,
      restSeconds: 0,
      roundRestSeconds: null,
      enTitle: "The Long Walk",
      frTitle: "La longue marche",
      exercises: [
        {
          exercise: { id: 30, enName: "Warden's Walk", muscles: [], style: "expedition" },
          target: { type: "time", value: 900 },
        },
      ],
    } as unknown as Quest;

    jest.spyOn(useExpeditionStore.getState(), "begin").mockResolvedValue(true);
    const endSpy = jest.spyOn(useExpeditionStore.getState(), "end").mockResolvedValue(undefined);

    await store.getState().startSession(outing, "medium", {});
    store.getState().finishCountdown();
    endSpy.mockClear();

    store.getState().completeExercise(900);

    expect(store.getState().status).toBe("finished");
    await waitFor(() => expect(endSpy).toHaveBeenCalled());
    jest.restoreAllMocks();
  });

  /**
   * "Walk 5 min + push-ups" is a quest the editor allows, and `isExpedition` calls it an outing
   * because one slot is. Measuring it is right; capping its effort at the walk's moving seconds
   * is not — `computeSessionXp` scaled the whole session down to five minutes and ~70 % of the
   * push-ups' XP vanished with nothing on screen to explain it. Two predicates, two questions.
   */
  test("a mixed quest is measured like an outing and paid like a workout", async () => {
    const mixed = {
      id: 12,
      rounds: 1,
      restSeconds: 0,
      roundRestSeconds: null,
      enTitle: "Walk and push",
      frTitle: "Marche et pompes",
      exercises: [
        {
          exercise: {
            id: 30,
            enName: "Warden's Walk",
            muscles: [],
            style: "expedition",
            secondsPerRep: 1,
          },
          target: { type: "time", value: 300 },
        },
        {
          exercise: {
            id: 31,
            enName: "Pushups",
            muscles: ["chest"],
            style: "strength",
            secondsPerRep: 3,
          },
          target: { type: "reps", value: 20 },
        },
      ],
    } as unknown as Quest;

    jest.spyOn(useExpeditionStore.getState(), "begin").mockResolvedValue(true);
    // Five minutes of walking inside ten on the road, witnessed. The ground is measured either
    // way: that half is right. `startedAt`/`lastAt` are the trace's own span, which is what
    // `sessionClock` times an outing by — a state with a reading and no span is not one the
    // reducer can produce.
    const outsideAt = Date.now() - 600_000;
    useExpeditionStore.setState({
      track: {
        ...EMPTY,
        startedAt: outsideAt,
        lastAt: outsideAt + 600_000,
        distanceM: 500,
        movingMs: 300_000,
      },
    });
    (computeSessionXp as jest.Mock).mockClear();

    await store.getState().startSession(mixed, "medium", {});
    store.setState({ startTime: Date.now() - 600_000, totalPausedTime: 0, restTakenSeconds: 0 });

    await store.getState().saveSession(null);

    const call = (computeSessionXp as jest.Mock).mock.calls[0];
    assert(call);
    // Ten minutes of session, not the walk's five: the push-ups happened in the other five.
    expect(call[0].effortCeilingSeconds).toBe(600);
    jest.restoreAllMocks();
  });
});
