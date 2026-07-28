import { act, renderHook } from "@testing-library/react-native";

import {
  formatOvertime,
  formatTime,
  readTimerState,
  useSessionTimer,
} from "@/hooks/useSessionTimer";
import { useSessionStore } from "@/stores/session";

/**
 * The timer is what the hero stares at for the whole session. Overtime must stay visible
 * (running past a target is allowed), rest must never count below zero, and a paused
 * session must freeze rather than drift.
 */

jest.mock("@/db/client", () => ({ db: {}, schema: {}, runMigrations: jest.fn() }));
jest.mock("@/db/quests", () => ({ isDailyQuest: () => false }));
jest.mock("@/db/preferences", () => ({
  preferences: {
    getSavedSession: jest.fn(async () => null),
    setSavedSession: jest.fn(async () => {}),
    clearSavedSession: jest.fn(async () => {}),
  },
}));

describe("formatTime", () => {
  it.each([
    [0, "0:00"],
    [5, "0:05"],
    [65, "1:05"],
    [600, "10:00"],
  ])("renders %ds as %s", (seconds, expected) => {
    expect(formatTime(seconds)).toBe(expected);
  });

  // Overtime arrives as a negative count; the sign belongs outside the digits.
  it.each([
    [-5, "-0:05"],
    [-65, "-1:05"],
  ])("renders %ds as %s", (seconds, expected) => {
    expect(formatTime(seconds)).toBe(expected);
  });
});

describe("formatOvertime", () => {
  it.each([
    [0, "+0:00"],
    [7, "+0:07"],
    [125, "+2:05"],
  ])("renders %ds as %s", (seconds, expected) => {
    expect(formatOvertime(seconds)).toBe(expected);
  });
});

const NOW = 1_800_000_000_000;

/** Put the store on a timer that started `elapsed` seconds ago. */
function timerRunning(status: string, elapsed: number, duration = 60, extra = {}) {
  useSessionStore.setState({
    status: status as never,
    timerStartTimestamp: NOW - elapsed * 1000,
    timerDuration: duration,
    lastPauseTimestamp: null,
    ...extra,
  });
}

describe("useSessionTimer", () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.setSystemTime(NOW);
    useSessionStore.setState({
      status: "idle",
      timerStartTimestamp: null,
      timerDuration: 0,
      lastPauseTimestamp: null,
    });
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it("reads zero when no timer is armed", async () => {
    const { result } = await renderHook(() => useSessionTimer());

    expect(result.current.remainingSeconds).toBe(0);
    expect(result.current.elapsedSeconds).toBe(0);
    expect(result.current.progress).toBe(0);
    expect(result.current.isOvertime).toBe(false);
  });

  // Regression: "warmup" was missing from the status guard, so remainingSeconds stayed
  // stuck at 0 for the whole warm-up and WarmupView skipped its first step immediately.
  it("counts down during warmup", async () => {
    timerRunning("warmup", 5, 20);
    const { result } = await renderHook(() => useSessionTimer());

    expect(result.current.remainingSeconds).toBe(15);
    expect(result.current.elapsedSeconds).toBe(5);
  });

  it("counts down a running exercise", async () => {
    timerRunning("running", 20, 60);
    const { result } = await renderHook(() => useSessionTimer());

    expect(result.current.remainingSeconds).toBe(40);
    expect(result.current.elapsedSeconds).toBe(20);
    expect(result.current.progress).toBeCloseTo(20 / 60, 5);
    expect(result.current.isOvertime).toBe(false);
  });

  it("goes negative past the target instead of stopping", async () => {
    timerRunning("running", 75, 60);
    const { result } = await renderHook(() => useSessionTimer());

    expect(result.current.remainingSeconds).toBe(-15);
    expect(result.current.isOvertime).toBe(true);
    expect(result.current.elapsedSeconds).toBe(75);
  });

  // Rest is a hard stop: showing "-0:12" of rest would read as a penalty.
  it("clamps rest at zero rather than showing overtime", async () => {
    timerRunning("resting", 75, 60);
    const { result } = await renderHook(() => useSessionTimer());

    expect(result.current.remainingSeconds).toBe(0);
    expect(result.current.isOvertime).toBe(false);
  });

  it("caps the progress bar at 200% so the fill cannot run off", async () => {
    timerRunning("running", 600, 60);
    const { result } = await renderHook(() => useSessionTimer());

    expect(result.current.progress).toBe(2);
  });

  it("keeps progress at zero for an untimed exercise", async () => {
    timerRunning("running", 30, 0);
    const { result } = await renderHook(() => useSessionTimer());

    expect(result.current.progress).toBe(0);
  });

  it("ticks forward while the session runs", async () => {
    timerRunning("running", 10, 60);
    const { result } = await renderHook(() => useSessionTimer());
    expect(result.current.remainingSeconds).toBe(50);

    await act(async () => {
      jest.advanceTimersByTime(5000);
    });

    expect(result.current.remainingSeconds).toBe(45);
    expect(result.current.elapsedSeconds).toBe(15);
  });

  it("freezes at the pause instant instead of drifting", async () => {
    timerRunning("paused", 20, 60, { lastPauseTimestamp: NOW });
    const { result } = await renderHook(() => useSessionTimer());
    expect(result.current.remainingSeconds).toBe(40);

    // Time passes while the hero is away; the frozen reading must not move.
    await act(async () => {
      jest.advanceTimersByTime(30_000);
    });

    expect(result.current.remainingSeconds).toBe(40);
    expect(result.current.elapsedSeconds).toBe(20);
  });
});

/**
 * The timer's *first render* used to report zero for everything, because the real value was
 * only computed inside an effect. `renderHook` flushes effects, so every test above passed
 * while consumers reading the first render got a lie: `WarmupView` treated it as "this step is
 * over" and skipped the first movement, `CountdownView` fired its success haptic on mount.
 *
 * These assert the pure read, which is what the initial state is now seeded from.
 */
describe("readTimerState", () => {
  const NEVER_PAUSED = { lastPauseTimestamp: null };

  beforeEach(() => {
    jest.useFakeTimers();
    jest.setSystemTime(NOW);
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it("reports the real remaining time, not zero, on the first read", () => {
    const state = readTimerState({
      timerStartTimestamp: NOW,
      timerDuration: 30,
      status: "warmup",
      ...NEVER_PAUSED,
    });

    expect(state).toEqual({
      remainingSeconds: 30,
      elapsedSeconds: 0,
      progress: 0,
      isOvertime: false,
    });
  });

  it("reads zero when no timer is armed", () => {
    expect(
      readTimerState({
        timerStartTimestamp: null,
        timerDuration: 30,
        status: "warmup",
        ...NEVER_PAUSED,
      }),
    ).toEqual({ remainingSeconds: 0, elapsedSeconds: 0, progress: 0, isOvertime: false });
  });

  // null means "leave whatever is on screen alone" — idle and finished have no timer to show.
  it.each(["idle", "finished"] as const)("returns null for %s", (status) => {
    expect(
      readTimerState({
        timerStartTimestamp: NOW,
        timerDuration: 30,
        status,
        ...NEVER_PAUSED,
      }),
    ).toBeNull();
  });
});
