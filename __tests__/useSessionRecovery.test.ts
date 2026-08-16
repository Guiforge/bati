import { act, renderHook, waitFor } from "@testing-library/react-native";

import type { CompletedExerciseInput } from "@/db/completed";
import type { Quest } from "@/db/quests";
import { useSessionRecovery } from "@/hooks/useSessionRecovery";
import { useSessionStore } from "@/stores/session";

/**
 * The app dying mid-session must not cost the hero their work. This covers the round trip:
 * save the live store, come back, restore it — plus the guards that decide when not to.
 *
 * Everything here goes through the store's own subscriber, because that is the only thing that
 * writes the slot in the app. An earlier version of this file drove a `saveSessionState()` helper
 * that nothing in the app called, and whose payload had drifted from the subscriber's — so these
 * tests passed while recovery was quietly losing fields.
 */

jest.mock("@/db/client", () => ({ db: {}, schema: {}, runMigrations: jest.fn() }));
jest.mock("@/db/quests", () => ({ isDailyQuest: () => false }));

// One in-memory slot standing in for the preferences row.
let mockSavedSlot: string | null = null;
jest.mock("@/db/preferences", () => ({
  preferences: {
    getSavedSession: jest.fn(async () => mockSavedSlot),
    // biome-ignore lint/suspicious/useAwait: mirrors preferences' real Promise<void> signature
    setSavedSession: jest.fn(async (v: string) => {
      mockSavedSlot = v;
    }),
    // biome-ignore lint/suspicious/useAwait: mirrors preferences' real Promise<void> signature
    clearSavedSession: jest.fn(async () => {
      mockSavedSlot = null;
    }),
  },
}));

const quest = {
  id: 7,
  enTitle: "Ash Ridge",
  frTitle: "Crête de Cendre",
  rounds: 3,
  exercises: [{ id: 1 }, { id: 2 }, { id: 3 }, { id: 4 }, { id: 5 }],
} as unknown as Quest;

const NOW = 1_800_000_000_000;

const aResult = { exerciseId: 1, roundIndex: 0, sortOrder: 0 } as unknown as CompletedExerciseInput;

/** A session in progress: round 2, exercise 3, started ten minutes ago. */
function liveSession(overrides: Record<string, unknown> = {}) {
  useSessionStore.setState({
    quest,
    userLevel: "medium",
    adventureRunStepId: null,
    bossFight: null,
    bossStartHp: null,
    pendingDamage: [],
    lastDamageResult: null,
    status: "running",
    prePauseStatus: null,
    warmupSequence: [],
    warmupIndex: 0,
    currentRoundIndex: 1,
    currentExerciseIndex: 2,
    startTime: NOW - 600_000,
    totalPausedTime: 0,
    lastPauseTimestamp: null,
    timerStartTimestamp: NOW - 30_000,
    timerDuration: 60,
    results: [],
    ...overrides,
  });
}

/**
 * Bank the live session the way the app does: through the subscriber. A result landing is a
 * progress change, which is what it listens for.
 */
async function bankLiveSession(overrides: Record<string, unknown> = {}) {
  liveSession(overrides);
  await act(async () => {
    useSessionStore.setState((s) => ({ results: [...s.results, aResult] }));
  });
  await waitFor(() => expect(mockSavedSlot).not.toBeNull());
}

beforeEach(() => {
  mockSavedSlot = null;
  jest.spyOn(Date, "now").mockReturnValue(NOW);
  useSessionStore.setState({ quest: null, status: "idle", results: [] });
});

afterEach(() => {
  jest.restoreAllMocks();
});

describe("the auto-save subscriber", () => {
  it("writes the live session so it can outlive the process", async () => {
    await bankLiveSession();

    const saved = JSON.parse(mockSavedSlot as string);
    expect(saved.quest.id).toBe(7);
    expect(saved.currentRoundIndex).toBe(1);
    expect(saved.currentExerciseIndex).toBe(2);
    expect(saved.savedAt).toBe(NOW);
  });

  it("banks progress when the hero moves to the next exercise", async () => {
    liveSession();
    expect(mockSavedSlot).toBeNull();

    useSessionStore.setState({ currentExerciseIndex: 3 });

    await waitFor(() => expect(mockSavedSlot).not.toBeNull());
    expect(JSON.parse(mockSavedSlot as string).currentExerciseIndex).toBe(3);
  });

  it("banks progress on pause", async () => {
    liveSession();
    useSessionStore.setState({ status: "paused", prePauseStatus: "running" });

    await waitFor(() => expect(mockSavedSlot).not.toBeNull());
  });

  it("holds off during the pre-start countdown", async () => {
    liveSession({ status: "countdown" });
    useSessionStore.setState({ status: "countdown", currentExerciseIndex: 3 });

    await new Promise((r) => setTimeout(r, 50));
    expect(mockSavedSlot).toBeNull();
  });

  it("saves nothing when there is no quest to save", async () => {
    liveSession({ quest: null });
    useSessionStore.setState({ currentExerciseIndex: 3 });

    await new Promise((r) => setTimeout(r, 50));
    expect(mockSavedSlot).toBeNull();
  });

  it("throws the save away once the session ends", async () => {
    await bankLiveSession();

    useSessionStore.setState({ status: "finished" });

    await waitFor(() => expect(mockSavedSlot).toBeNull());
  });
});

describe("useSessionRecovery", () => {
  it("offers nothing when no session was saved", async () => {
    const { result } = await renderHook(() => useSessionRecovery());

    await waitFor(() => expect(result.current.isChecking).toBe(false));
    expect(result.current.recoverableSession).toBeNull();
  });

  it("describes the interrupted session for the prompt", async () => {
    await bankLiveSession();

    const { result } = await renderHook(() => useSessionRecovery());
    await waitFor(() => expect(result.current.recoverableSession).not.toBeNull());

    const offer = result.current.recoverableSession;
    expect(offer?.questTitle).toBe("Ash Ridge");
    expect(offer?.questId).toBe(7);
    // 0-based indices become human counts — as numbers, not as a sentence. The hook used to
    // build "Round 2/3, Exercise 3/5" in English here whatever the hero's language, and this
    // assertion is what held it in place.
    expect(offer).toMatchObject({ round: 2, roundTotal: 3, exercise: 3, exerciseTotal: 5 });
    expect(offer?.elapsedTime).toBe(600);
  });

  it("drops a session left overnight instead of offering it", async () => {
    await bankLiveSession();

    // Five hours later — past the four-hour expiry.
    jest.spyOn(Date, "now").mockReturnValue(NOW + 5 * 60 * 60 * 1000);

    const { result } = await renderHook(() => useSessionRecovery());
    await waitFor(() => expect(result.current.isChecking).toBe(false));

    expect(result.current.recoverableSession).toBeNull();
    expect(mockSavedSlot).toBeNull();
  });

  it("survives a corrupted slot without offering anything", async () => {
    mockSavedSlot = "{not json";

    const { result } = await renderHook(() => useSessionRecovery());
    await waitFor(() => expect(result.current.isChecking).toBe(false));

    expect(result.current.recoverableSession).toBeNull();
  });

  it("restores the store paused, counting the downtime as pause", async () => {
    await bankLiveSession();

    // Away for two minutes. The store is left as-is: a crash never walks the session
    // back to "idle", and doing so here would trip the auto-clear subscriber.
    const away = 120_000;
    jest.spyOn(Date, "now").mockReturnValue(NOW + away);

    const { result } = await renderHook(() => useSessionRecovery());
    await waitFor(() => expect(result.current.recoverableSession).not.toBeNull());

    let recovered: boolean | undefined;
    await act(async () => {
      recovered = await result.current.recoverSession();
    });

    expect(recovered).toBe(true);
    const state = useSessionStore.getState();
    expect(state.quest?.id).toBe(7);
    expect(state.currentRoundIndex).toBe(1);
    // Always comes back paused, whatever it was doing when it died.
    expect(state.status).toBe("paused");
    expect(state.prePauseStatus).toBe("running");
    // The time away is pause time, and the timer is pushed forward by the same amount
    // so the hero does not lose the seconds they had already run.
    expect(state.totalPausedTime).toBe(away);
    expect(state.timerStartTimestamp).toBe(NOW - 30_000 + away);
    // Consumed: recovering twice would double-count the downtime.
    expect(mockSavedSlot).toBeNull();
    expect(result.current.recoverableSession).toBeNull();
  });

  /**
   * The bug this pair exists for: the snapshot carried neither the warm-up sequence nor the
   * boss's opening HP, so a recovered warm-up rendered an empty screen and a recovered boss
   * arena had nothing to measure the day's damage against.
   */
  it("brings the warm-up sequence back, not just its index", async () => {
    await bankLiveSession({
      status: "warmup",
      warmupSequence: [
        { exerciseName: "Arm Circles", seconds: 30 },
        { exerciseName: "Leg Swings", seconds: 30 },
      ],
      warmupIndex: 1,
    });

    const { result } = await renderHook(() => useSessionRecovery());
    await waitFor(() => expect(result.current.recoverableSession).not.toBeNull());
    await act(async () => {
      await result.current.recoverSession();
    });

    const state = useSessionStore.getState();
    expect(state.warmupSequence).toHaveLength(2);
    expect(state.warmupIndex).toBe(1);
    expect(state.prePauseStatus).toBe("warmup");
  });

  it("brings back the boss fight, its opening HP and the hits not yet banked", async () => {
    await bankLiveSession({
      bossFight: { id: 3, totalHp: 900, currentHp: 700 } as never,
      bossStartHp: 800,
      pendingDamage: [
        { roundIndex: 0, exerciseId: 1, damage: 60, isCritical: false, muscle: null },
        { roundIndex: 1, exerciseId: 2, damage: 40, isCritical: true, muscle: null },
      ],
    });

    const { result } = await renderHook(() => useSessionRecovery());
    await waitFor(() => expect(result.current.recoverableSession).not.toBeNull());
    await act(async () => {
      await result.current.recoverSession();
    });

    const state = useSessionStore.getState();
    expect(state.bossFight?.id).toBe(3);
    expect(state.bossStartHp).toBe(800);
    // Still owed to the boss — they are written when the session is saved, not before.
    expect(state.pendingDamage).toHaveLength(2);
    expect(state.pendingDamage.reduce((sum, h) => sum + h.damage, 0)).toBe(100);
  });

  it("reports failure when there is nothing to recover", async () => {
    const { result } = await renderHook(() => useSessionRecovery());
    await waitFor(() => expect(result.current.isChecking).toBe(false));

    let recovered: boolean | undefined;
    await act(async () => {
      recovered = await result.current.recoverSession();
    });

    expect(recovered).toBe(false);
  });

  it("discards the offer when the hero declines", async () => {
    await bankLiveSession();

    const { result } = await renderHook(() => useSessionRecovery());
    await waitFor(() => expect(result.current.recoverableSession).not.toBeNull());

    await act(async () => {
      await result.current.discardSession();
    });

    expect(mockSavedSlot).toBeNull();
    expect(result.current.recoverableSession).toBeNull();
  });
});
