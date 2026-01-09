import type { Quest } from "@/src/db/quests";
import { useSessionStore } from "../src/stores/session";

// Mock DB client to prevent actual SQLite initialization
jest.mock("@/src/db/client", () => ({
  db: {},
  schema: {},
  runMigrations: jest.fn().mockResolvedValue(undefined),
}));

// Mock quests module
jest.mock("@/src/db/quests", () => ({
  isDailyQuest: jest.fn().mockReturnValue(false),
}));

// Mock DB calls
jest.mock("@/src/db/index", () => ({
  completeAdventureRunStep: jest.fn(),
}));
jest.mock("@/src/db/completed", () => ({
  createCompletedSession: jest.fn().mockResolvedValue(1),
  markSessionWithNewRecords: jest.fn().mockResolvedValue(undefined),
}));
jest.mock("@/src/db/xp", () => ({
  computeSessionXp: jest.fn().mockReturnValue(100),
}));
jest.mock("@/src/db/preferences", () => ({
  preferences: {
    getSavedSession: jest.fn().mockResolvedValue(null),
    setSavedSession: jest.fn().mockResolvedValue(undefined),
    clearSavedSession: jest.fn().mockResolvedValue(undefined),
  },
}));
jest.mock("@/src/db/bossFights", () => ({
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
jest.mock("@/src/db/resources", () => ({
  awardSessionResources: jest.fn().mockResolvedValue({
    gold: 10,
    wood: 5,
    stone: 0,
    fire: 0,
    water: 0,
    wind: 0,
    grain: 0,
  }),
}));
jest.mock("@/src/db/buildings", () => ({
  processSessionBuildings: jest.fn().mockResolvedValue({
    xpGained: [],
    levelUps: [],
    newUnlocks: [],
  }),
}));
jest.mock("@/src/db/goals", () => ({
  recordSessionForGoal: jest.fn().mockResolvedValue(undefined),
}));
jest.mock("@/src/db/personalRecords", () => ({
  checkForNewRecords: jest.fn().mockResolvedValue([]),
}));
jest.mock("@/src/db/streaks", () => ({
  updateStreakAfterSession: jest.fn().mockResolvedValue({
    current: 1,
    best: 1,
    isActive: true,
    lastWorkoutDate: null,
  }),
}));
jest.mock("@/src/db/achievements", () => ({
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

  test("startSession initializes state correctly", () => {
    store.getState().startSession(mockQuest, "medium");

    const state = store.getState();
    expect(state.status).toBe("countdown");
    expect(state.quest).toEqual(mockQuest);
    expect(state.currentRoundIndex).toBe(0);
    expect(state.currentExerciseIndex).toBe(0);
    expect(state.timerDuration).toBe(5); // Pre-start countdown
  });

  test("finishCountdown transitions to running", () => {
    store.getState().startSession(mockQuest, "medium");
    store.getState().finishCountdown();

    expect(store.getState().status).toBe("running");
  });

  test("completeExercise advances to next exercise", async () => {
    store.getState().startSession(mockQuest, "medium");
    store.getState().finishCountdown();
    await store.getState().completeExercise(10);

    const state = store.getState();
    expect(state.currentExerciseIndex).toBe(1);
    expect(state.results.length).toBe(1);
    expect(state.results[0].result.value).toBe(10);
  });

  test("completeExercise triggers rest between rounds", async () => {
    store.getState().startSession(mockQuest, "medium");
    store.getState().finishCountdown();
    await store.getState().completeExercise(10);
    await store.getState().completeExercise(60);

    const state = store.getState();
    expect(state.status).toBe("resting");
    expect(state.timerDuration).toBe(30); // Rest seconds
  });

  test("skipRest starts next round", async () => {
    store.getState().startSession(mockQuest, "medium");
    store.getState().finishCountdown();
    await store.getState().completeExercise(10);
    await store.getState().completeExercise(60);
    store.getState().skipRest();

    const state = store.getState();
    expect(state.status).toBe("running");
    expect(state.currentRoundIndex).toBe(1);
    expect(state.currentExerciseIndex).toBe(0);
  });

  test("pauseSession and resumeSession work", () => {
    store.getState().startSession(mockQuest, "medium");
    store.getState().finishCountdown();
    store.getState().pauseSession();

    expect(store.getState().status).toBe("paused");
    expect(store.getState().prePauseStatus).toBe("running");

    store.getState().resumeSession();

    expect(store.getState().status).toBe("running");
  });

  test("updateLastResult clamps values to be > 0", async () => {
    store.getState().startSession(mockQuest, "medium");
    store.getState().finishCountdown();
    await store.getState().completeExercise(10);
    store.getState().updateLastResult(0);

    let results = store.getState().results;
    expect(results[results.length - 1]?.result.value).toBe(1);

    store.getState().updateLastResult(-5);

    results = store.getState().results;
    expect(results[results.length - 1]?.result.value).toBe(1);
  });
});
