import { WARMUP_SEQUENCE } from "@/constants/warmup";
import { preferences } from "@/db/preferences";
import type { Quest } from "@/db/quests";
import { saveSessionState } from "@/hooks/useSessionRecovery";
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
}));
jest.mock("@/db/completed", () => ({
  createCompletedSession: jest.fn().mockResolvedValue(1),
  markSessionWithNewRecords: jest.fn().mockResolvedValue(undefined),
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
jest.mock("@/db/bossFights", () => ({
  getOrCreateBossFight: jest.fn().mockResolvedValue(null),
  dealDamage: jest.fn().mockResolvedValue({
    damage: 10,
    isCritical: false,
    newHp: 90,
    defeated: false,
    weaknessBonus: false,
    resistancePenalty: false,
  }),
}));
jest.mock("@/db/personalRecords", () => ({
  checkForNewRecords: jest.fn().mockResolvedValue([]),
}));
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
    expect(state.results[0].result.value).toBe(10);
  });

  test("completeExercise triggers rest between rounds", async () => {
    await store.getState().startSession(mockQuest, "medium");
    store.getState().finishCountdown();
    await store.getState().completeExercise(10);
    await store.getState().completeExercise(60);

    const state = store.getState();
    expect(state.status).toBe("resting");
    expect(state.timerDuration).toBe(30); // Rest seconds
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

  test("saveSessionState preserves active timer start for recovery", async () => {
    store.setState({
      quest: mockQuest,
      status: "resting",
      startTime: 1000,
      totalPausedTime: 0,
      timerStartTimestamp: 2000,
      timerDuration: 30,
    });

    await saveSessionState();

    expect(preferences.setSavedSession).toHaveBeenCalled();
    const saved = JSON.parse(
      (preferences.setSavedSession as jest.Mock).mock.calls.at(-1)?.[0] ?? "{}",
    );
    expect(saved.timerStartTimestamp).toBe(2000);
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
});
