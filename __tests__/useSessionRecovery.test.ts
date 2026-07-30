import { act, renderHook, waitFor } from "@testing-library/react-native";

import type { Quest } from "@/db/quests";
import {
  clearSavedSession,
  saveSessionState,
  useSessionRecovery,
} from "@/hooks/useSessionRecovery";
import { useSessionStore } from "@/stores/session";

/**
 * The app dying mid-session must not cost the hero their work. This covers the round trip:
 * save the live store, come back, restore it — plus the guards that decide when not to.
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
  rounds: 3,
  exercises: [{ id: 1 }, { id: 2 }, { id: 3 }, { id: 4 }, { id: 5 }],
} as unknown as Quest;

const NOW = 1_800_000_000_000;

/** A session in progress: round 2, exercise 3, started ten minutes ago. */
function liveSession(overrides: Record<string, unknown> = {}) {
  useSessionStore.setState({
    quest,
    userLevel: "medium",
    adventureRunStepId: null,
    bossFight: null,
    lastDamageResult: null,
    status: "running",
    prePauseStatus: null,
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

beforeEach(() => {
  mockSavedSlot = null;
  jest.spyOn(Date, "now").mockReturnValue(NOW);
  useSessionStore.setState({ quest: null, status: "idle", results: [] });
});

afterEach(() => {
  jest.restoreAllMocks();
});

describe("saveSessionState", () => {
  it("writes the live session so it can outlive the process", async () => {
    liveSession();
    await saveSessionState();

    expect(mockSavedSlot).toBeTruthy();
    const saved = JSON.parse(mockSavedSlot as string);
    expect(saved.quest.id).toBe(7);
    expect(saved.currentRoundIndex).toBe(1);
    expect(saved.currentExerciseIndex).toBe(2);
    expect(saved.savedAt).toBe(NOW);
  });

  it.each([
    ["there is no quest", { quest: null, status: "running" }],
    ["the session never started", { status: "idle" }],
    ["the session is already banked", { status: "finished" }],
  ])("saves nothing when %s", async (_case, overrides) => {
    liveSession(overrides);
    await saveSessionState();
    expect(mockSavedSlot).toBeNull();
  });
});

describe("useSessionRecovery", () => {
  it("offers nothing when no session was saved", async () => {
    const { result } = await renderHook(() => useSessionRecovery());

    await waitFor(() => expect(result.current.isChecking).toBe(false));
    expect(result.current.recoverableSession).toBeNull();
  });

  it("describes the interrupted session for the prompt", async () => {
    liveSession();
    await saveSessionState();

    const { result } = await renderHook(() => useSessionRecovery());
    await waitFor(() => expect(result.current.recoverableSession).not.toBeNull());

    const offer = result.current.recoverableSession;
    expect(offer?.questTitle).toBe("Ash Ridge");
    expect(offer?.questId).toBe(7);
    // 0-based indices become human counts.
    expect(offer?.progress).toBe("Round 2/3, Exercise 3/5");
    expect(offer?.elapsedTime).toBe(600);
  });

  it("drops a session left overnight instead of offering it", async () => {
    liveSession();
    await saveSessionState();

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
    liveSession();
    await saveSessionState();

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
    liveSession();
    await saveSessionState();

    const { result } = await renderHook(() => useSessionRecovery());
    await waitFor(() => expect(result.current.recoverableSession).not.toBeNull());

    await act(async () => {
      await result.current.discardSession();
    });

    expect(mockSavedSlot).toBeNull();
    expect(result.current.recoverableSession).toBeNull();
  });
});

/**
 * Nothing in the UI calls saveSessionState directly — a store subscriber does it. If it
 * stops firing, recovery silently has nothing to recover, so it gets its own coverage.
 */
describe("the auto-save subscriber", () => {
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

  it("throws the save away once the session ends", async () => {
    liveSession();
    await saveSessionState();
    expect(mockSavedSlot).not.toBeNull();

    useSessionStore.setState({ status: "finished" });

    await waitFor(() => expect(mockSavedSlot).toBeNull());
  });
});

describe("clearSavedSession", () => {
  it("empties the slot on completion or quit", async () => {
    liveSession();
    await saveSessionState();

    await clearSavedSession();

    expect(mockSavedSlot).toBeNull();
  });
});
