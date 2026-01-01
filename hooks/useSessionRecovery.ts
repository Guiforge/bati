import type { BossFight, DamageResult } from "@/db/bossFights";
import type { CompletedExerciseInput } from "@/db/completed";
import { preferences } from "@/db/preferences";
import type { Quest } from "@/db/quests";
import type { DifficultyCode } from "@/db/schema";
import { type SessionStatus, useSessionStore } from "@/stores/session";
import { useCallback, useEffect, useState } from "react";

/**
 * Serializable session state for recovery
 */
interface SavedSessionState {
  quest: Quest;
  userLevel: DifficultyCode;
  adventureRunStepId: number | null;
  bossFight: BossFight | null;
  lastDamageResult: DamageResult | null;
  status: SessionStatus;
  prePauseStatus: SessionStatus | null;
  currentRoundIndex: number;
  currentExerciseIndex: number;
  startTime: number;
  totalPausedTime: number;
  timerDuration: number;
  results: CompletedExerciseInput[];
  savedAt: number; // Timestamp when state was saved
}

/**
 * Session recovery info for UI
 */
export interface RecoverableSession {
  questTitle: string;
  questId: number;
  progress: string; // e.g., "Round 2/3, Exercise 3/5"
  savedAt: Date;
  elapsedTime: number; // Seconds since session started
}

const SESSION_EXPIRY_MS = 4 * 60 * 60 * 1000; // 4 hours - session is stale after this

/**
 * Check if there's a recoverable session and provide recovery actions
 */
export function useSessionRecovery() {
  const [recoverableSession, setRecoverableSession] =
    useState<RecoverableSession | null>(null);
  const [isChecking, setIsChecking] = useState(true);

  const checkForRecoverableSession = useCallback(async () => {
    setIsChecking(true);
    try {
      const savedJson = await preferences.getSavedSession();
      if (!savedJson) {
        setRecoverableSession(null);
        return;
      }

      const saved: SavedSessionState = JSON.parse(savedJson);

      // Check if session is too old
      const now = Date.now();
      if (now - saved.savedAt > SESSION_EXPIRY_MS) {
        await preferences.clearSavedSession();
        setRecoverableSession(null);
        return;
      }

      // Session is valid and recoverable
      const rounds = saved.quest.rounds;
      const exercises = saved.quest.exercises.length;
      const progress = `Round ${
        saved.currentRoundIndex + 1
      }/${rounds}, Exercise ${saved.currentExerciseIndex + 1}/${exercises}`;

      setRecoverableSession({
        questTitle: saved.quest.enTitle,
        questId: saved.quest.id,
        progress,
        savedAt: new Date(saved.savedAt),
        elapsedTime: Math.floor(
          (saved.savedAt - saved.startTime - saved.totalPausedTime) / 1000
        ),
      });
    } catch (error) {
      console.error("Failed to check for recoverable session:", error);
      setRecoverableSession(null);
    } finally {
      setIsChecking(false);
    }
  }, []);

  // Check for saved session on mount
  useEffect(() => {
    checkForRecoverableSession();
  }, [checkForRecoverableSession]);

  const recoverSession = useCallback(async (): Promise<boolean> => {
    try {
      const savedJson = await preferences.getSavedSession();
      if (!savedJson) return false;

      const saved: SavedSessionState = JSON.parse(savedJson);

      // Calculate time elapsed since saved (we were "paused")
      const now = Date.now();
      const pauseDuration = now - saved.savedAt;

      // Restore session state with adjusted pause time
      useSessionStore.setState({
        quest: saved.quest,
        userLevel: saved.userLevel,
        adventureRunStepId: saved.adventureRunStepId,
        bossFight: saved.bossFight,
        lastDamageResult: saved.lastDamageResult,
        status: "paused", // Always resume in paused state
        prePauseStatus:
          saved.status === "paused" ? saved.prePauseStatus : saved.status,
        currentRoundIndex: saved.currentRoundIndex,
        currentExerciseIndex: saved.currentExerciseIndex,
        startTime: saved.startTime,
        totalPausedTime: saved.totalPausedTime + pauseDuration,
        lastPauseTimestamp: now,
        timerStartTimestamp: null, // Will be recalculated on resume
        timerDuration: saved.timerDuration,
        results: saved.results.map((r) => ({
          ...r,
          performedAt: r.performedAt ? new Date(r.performedAt) : new Date(),
        })),
      });

      // Clear saved session after recovery
      await preferences.clearSavedSession();
      setRecoverableSession(null);

      return true;
    } catch (error) {
      console.error("Failed to recover session:", error);
      return false;
    }
  }, []);

  const discardSession = useCallback(async () => {
    await preferences.clearSavedSession();
    setRecoverableSession(null);
  }, []);

  return {
    recoverableSession,
    isChecking,
    recoverSession,
    discardSession,
    checkForRecoverableSession,
  };
}

/**
 * Save session state for recovery (call this periodically during session)
 */
export async function saveSessionState(): Promise<void> {
  const state = useSessionStore.getState();

  // Only save if there's an active session
  if (!state.quest || state.status === "idle" || state.status === "finished") {
    return;
  }

  const savedState: SavedSessionState = {
    quest: state.quest,
    userLevel: state.userLevel,
    adventureRunStepId: state.adventureRunStepId,
    bossFight: state.bossFight,
    lastDamageResult: state.lastDamageResult,
    status: state.status,
    prePauseStatus: state.prePauseStatus,
    currentRoundIndex: state.currentRoundIndex,
    currentExerciseIndex: state.currentExerciseIndex,
    startTime: state.startTime!,
    totalPausedTime: state.totalPausedTime,
    timerDuration: state.timerDuration,
    results: state.results,
    savedAt: Date.now(),
  };

  try {
    await preferences.setSavedSession(JSON.stringify(savedState));
  } catch (error) {
    console.error("Failed to save session state:", error);
  }
}

/**
 * Clear saved session state (call on successful completion or quit)
 */
export async function clearSavedSession(): Promise<void> {
  try {
    await preferences.clearSavedSession();
  } catch (error) {
    console.error("Failed to clear saved session:", error);
  }
}
