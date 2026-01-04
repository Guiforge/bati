import { useEffect, useState } from "react";
import { useSessionStore } from "@/stores/session";

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

export function useSessionTimer() {
  const { timerStartTimestamp, timerDuration, status, lastPauseTimestamp } = useSessionStore();

  // remainingSeconds: positive = time left, negative = overtime
  const [remainingSeconds, setRemainingSeconds] = useState(0);
  // elapsedSeconds: total time spent on this exercise/rest
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  // progress: 0 (start) to 1 (target reached), can exceed 1 for overtime
  const [progress, setProgress] = useState(0);
  // isOvertime: true when user has exceeded the target time
  const [isOvertime, setIsOvertime] = useState(false);

  useEffect(() => {
    if (!timerStartTimestamp) {
      setRemainingSeconds(0);
      setElapsedSeconds(0);
      setProgress(0);
      setIsOvertime(false);
      return;
    }

    const calculate = (now: number) => {
      const elapsed = (now - timerStartTimestamp) / 1000;
      const elapsedInt = Math.floor(elapsed);
      const remaining = timerDuration - elapsed;

      setElapsedSeconds(elapsedInt);

      // For time-based exercises in "running" status, allow negative remaining (overtime)
      // For rest/countdown periods, clamp at 0
      if (status === "running") {
        // Allow overtime - remaining can go negative
        setRemainingSeconds(Math.ceil(remaining));
        setIsOvertime(remaining < 0);
      } else {
        // For resting/countdown, clamp at 0
        setRemainingSeconds(Math.max(0, Math.ceil(remaining)));
        setIsOvertime(false);
      }

      if (timerDuration > 0) {
        setProgress(Math.min(2, elapsed / timerDuration)); // Cap at 200% for display
      } else {
        setProgress(0);
      }
    };

    if (status === "paused" && lastPauseTimestamp) {
      calculate(lastPauseTimestamp);
      return;
    }

    if (status !== "running" && status !== "resting" && status !== "countdown") {
      return;
    }

    const tick = () => calculate(Date.now());
    tick(); // Immediate update
    const interval = setInterval(tick, 100);
    return () => clearInterval(interval);
  }, [timerStartTimestamp, timerDuration, status, lastPauseTimestamp]);

  return {
    remainingSeconds,
    elapsedSeconds,
    progress,
    isOvertime,
  };
}
