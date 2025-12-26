import { useEffect, useState } from "react";
import { useSessionStore } from "@/stores/session";

export function formatTime(seconds: number) {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

export function useSessionTimer() {
  const { timerStartTimestamp, timerDuration, status, lastPauseTimestamp } =
    useSessionStore();
  const [remainingSeconds, setRemainingSeconds] = useState(0);
  const [progress, setProgress] = useState(0); // 0 (start) to 1 (end)

  useEffect(() => {
    if (!timerStartTimestamp) {
      setRemainingSeconds(0);
      setProgress(0);
      return;
    }

    const calculate = (now: number) => {
      const elapsed = (now - timerStartTimestamp) / 1000;
      const left = Math.max(0, timerDuration - elapsed);

      setRemainingSeconds(Math.ceil(left));

      if (timerDuration > 0) {
        setProgress(Math.min(1, elapsed / timerDuration));
      } else {
        setProgress(0);
      }
    };

    if (status === "paused" && lastPauseTimestamp) {
      calculate(lastPauseTimestamp);
      return;
    }

    if (status === "running" || status === "resting") {
      const tick = () => calculate(Date.now());
      tick(); // Immediate update
      const interval = setInterval(tick, 100);
      return () => clearInterval(interval);
    }
  }, [timerStartTimestamp, timerDuration, status, lastPauseTimestamp]);

  return { remainingSeconds, progress };
}
