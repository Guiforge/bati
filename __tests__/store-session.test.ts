import { act, renderHook } from "@testing-library/react-hooks";
import { useSessionStore } from "../stores/session";

// Mock DB calls
jest.mock("@/db", () => ({
  completeAdventureRunStep: jest.fn(),
}));
jest.mock("@/db/completed", () => ({
  createCompletedSession: jest.fn().mockResolvedValue(1),
}));
jest.mock("@/db/xp", () => ({
  computeSessionXp: jest.fn().mockReturnValue(100),
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

describe("useSessionStore", () => {
  beforeEach(() => {
    useSessionStore.setState({
      quest: null,
      status: "idle",
      currentRoundIndex: 0,
      currentExerciseIndex: 0,
      results: [],
    });
  });

  const mockQuest: any = {
    id: 1,
    rounds: 2,
    restSeconds: 30,
    exercises: [
      {
        exercise: { id: 1, enName: "Pushups" },
        target: { type: "reps", value: 10 },
      },
      {
        exercise: { id: 2, enName: "Plank" },
        target: { type: "time", value: 60 },
      },
    ],
  };

  test("startSession initializes state correctly", () => {
    const { result } = renderHook(() => useSessionStore());

    act(() => {
      result.current.startSession(mockQuest, "medium");
    });

    expect(result.current.status).toBe("countdown");
    expect(result.current.quest).toEqual(mockQuest);
    expect(result.current.currentRoundIndex).toBe(0);
    expect(result.current.currentExerciseIndex).toBe(0);
    expect(result.current.timerDuration).toBe(3); // Pre-start countdown
  });

  test("finishCountdown transitions to running", () => {
    const { result } = renderHook(() => useSessionStore());

    act(() => {
      result.current.startSession(mockQuest, "medium");
      result.current.finishCountdown();
    });

    expect(result.current.status).toBe("running");
  });

  test("completeExercise advances to next exercise", () => {
    const { result } = renderHook(() => useSessionStore());

    act(() => {
      result.current.startSession(mockQuest, "medium");
      result.current.finishCountdown();
      result.current.completeExercise(10);
    });

    // Not finished, so we are either moving to next exercise or next round
    // The store updates indices immediately for the next exercise
    expect(result.current.currentExerciseIndex).toBe(1);
    expect(result.current.results.length).toBe(1);
    expect(result.current.results[0].result.value).toBe(10);
  });

  test("completeExercise triggers rest between rounds", () => {
    const { result } = renderHook(() => useSessionStore());

    act(() => {
      result.current.startSession(mockQuest, "medium");
      result.current.finishCountdown();
      // Complete Ex 1
      result.current.completeExercise(10);
      // Complete Ex 2 (End of Round 1)
      result.current.completeExercise(60);
    });

    expect(result.current.status).toBe("resting");
    expect(result.current.timerDuration).toBe(30); // Rest seconds
  });

  test("skipRest starts next round", () => {
    const { result } = renderHook(() => useSessionStore());

    act(() => {
      result.current.startSession(mockQuest, "medium");
      result.current.finishCountdown();
      result.current.completeExercise(10);
      result.current.completeExercise(60);
      // Now resting...
      result.current.skipRest();
    });

    expect(result.current.status).toBe("running");
    expect(result.current.currentRoundIndex).toBe(1);
    expect(result.current.currentExerciseIndex).toBe(0);
  });

  test("pauseSession and resumeSession work", () => {
    const { result } = renderHook(() => useSessionStore());

    act(() => {
      result.current.startSession(mockQuest, "medium");
      result.current.finishCountdown();
      result.current.pauseSession();
    });

    expect(result.current.status).toBe("paused");
    expect(result.current.prePauseStatus).toBe("running");

    act(() => {
      result.current.resumeSession();
    });

    expect(result.current.status).toBe("running");
  });

  test("updateLastResult clamps values to be > 0", () => {
    const { result } = renderHook(() => useSessionStore());

    act(() => {
      result.current.startSession(mockQuest, "medium");
      result.current.finishCountdown();
      result.current.completeExercise(10);
      result.current.updateLastResult(0);
    });

    expect(
      result.current.results[result.current.results.length - 1]?.result.value
    ).toBe(1);

    act(() => {
      result.current.updateLastResult(-5);
    });

    expect(
      result.current.results[result.current.results.length - 1]?.result.value
    ).toBe(1);
  });
});
