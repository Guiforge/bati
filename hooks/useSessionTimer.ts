import { useEffect, useState } from "react";
import { type SessionStatus, useSessionStore } from "@/stores/session";

export function formatTime(seconds: number) {
  const absSeconds = Math.abs(seconds);
  const m = Math.floor(absSeconds / 60);
  const s = absSeconds % 60;
  const formatted = `${m}:${s.toString().padStart(2, "0")}`;
  return seconds < 0 ? `-${formatted}` : formatted;
}

export function formatOvertime(seconds: number) {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `+${m}:${s.toString().padStart(2, "0")}`;
}

export type SessionTimerState = {
  /** Positive = time left, negative = overtime. */
  remainingSeconds: number;
  /** Total time spent on this exercise/rest. */
  elapsedSeconds: number;
  /** 0 (start) to 1 (target reached), can exceed 1 for overtime. */
  progress: number;
  isOvertime: boolean;
};

const IDLE_TIMER: SessionTimerState = {
  remainingSeconds: 0,
  elapsedSeconds: 0,
  progress: 0,
  isOvertime: false,
};

type TimerInputs = {
  timerStartTimestamp: number | null;
  timerDuration: number;
  status: SessionStatus;
  lastPauseTimestamp: number | null;
};

function computeAt(now: number, timerStartTimestamp: number, inputs: TimerInputs) {
  const { timerDuration, status } = inputs;
  const elapsed = (now - timerStartTimestamp) / 1000;
  const remaining = timerDuration - elapsed;

  // Time-based exercises keep counting past the target ("running" allows overtime); rest and
  // countdown clamp at zero, they have nothing to reward for going over.
  const overtimeAllowed = status === "running";

  return {
    elapsedSeconds: Math.floor(elapsed),
    remainingSeconds: overtimeAllowed ? Math.ceil(remaining) : Math.max(0, Math.ceil(remaining)),
    isOvertime: overtimeAllowed && remaining < 0,
    // Cap at 200% for display.
    progress: timerDuration > 0 ? Math.min(2, elapsed / timerDuration) : 0,
  };
}

/**
 * What the timer reads right now, or `null` for "leave the last value alone" — a status that
 * neither ticks nor is frozen on a pause (idle, finished) keeps whatever was on screen.
 *
 * Exported so the initial state and every tick go through the same math. It used to live
 * inside the effect, which meant the first render always returned a zeroed timer: `WarmupView`
 * read that zero as "this step is over" and skipped the first movement outright, and
 * `CountdownView` fired its success haptic before the countdown had started.
 */
export function readTimerState(inputs: TimerInputs): SessionTimerState | null {
  const { timerStartTimestamp, status, lastPauseTimestamp } = inputs;

  if (!timerStartTimestamp) return IDLE_TIMER;
  if (status === "paused") {
    return lastPauseTimestamp ? computeAt(lastPauseTimestamp, timerStartTimestamp, inputs) : null;
  }
  if (status !== "running" && status !== "resting" && status !== "countdown" && status !== "warmup")
    return null;

  return computeAt(Date.now(), timerStartTimestamp, inputs);
}

function isSameTimerState(a: SessionTimerState, b: SessionTimerState): boolean {
  return (
    a.remainingSeconds === b.remainingSeconds &&
    a.elapsedSeconds === b.elapsedSeconds &&
    a.isOvertime === b.isOvertime &&
    a.progress === b.progress
  );
}

export function useSessionTimer(): SessionTimerState {
  const timerStartTimestamp = useSessionStore((s) => s.timerStartTimestamp);
  const timerDuration = useSessionStore((s) => s.timerDuration);
  const status = useSessionStore((s) => s.status);
  const lastPauseTimestamp = useSessionStore((s) => s.lastPauseTimestamp);

  const [state, setState] = useState<SessionTimerState>(
    () =>
      readTimerState({ timerStartTimestamp, timerDuration, status, lastPauseTimestamp }) ??
      IDLE_TIMER,
  );

  useEffect(() => {
    const inputs = { timerStartTimestamp, timerDuration, status, lastPauseTimestamp };

    const tick = () => {
      const next = readTimerState(inputs);
      // Ticks 10x a second but the values only move once a second: bail on an unchanged read,
      // or every session screen re-renders ten times per second for nothing.
      if (next) setState((prev) => (isSameTimerState(prev, next) ? prev : next));
    };

    tick(); // Immediate update

    // A paused or idle timer has nothing to count: one read is the whole story.
    if (status === "paused" || !timerStartTimestamp) return;
    if (
      status !== "running" &&
      status !== "resting" &&
      status !== "countdown" &&
      status !== "warmup"
    )
      return;

    const interval = setInterval(tick, 100);
    return () => clearInterval(interval);
  }, [timerStartTimestamp, timerDuration, status, lastPauseTimestamp]);

  return state;
}
