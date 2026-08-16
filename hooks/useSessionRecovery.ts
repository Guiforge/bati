import { useCallback, useEffect, useState } from "react";
import { preferences } from "@/db/preferences";
import { localizedTitle } from "@/src/i18n/localized";
import { reportError } from "@/src/reportError";
import { type SavedSessionState, useSessionStore } from "@/stores/session";
import { useSettingsStore } from "@/stores/settings";

/**
 * Session recovery info for UI
 */
export interface RecoverableSession {
  questTitle: string;
  questId: number;
  /**
   * Where the hero stopped, as numbers. This used to be a pre-formatted
   * `"Round 2/3, Exercise 3/5"` built right here — in English, unconditionally, inside a hook
   * that already receives `language` and uses it correctly one line below for the quest title.
   * The card then wrapped that English in `t()`, so half the sentence was translated and half
   * was not. A hook returns data; the screen does the words.
   */
  round: number;
  roundTotal: number;
  exercise: number;
  exerciseTotal: number;
  savedAt: Date;
  elapsedTime: number; // Seconds since session started
}

const SESSION_EXPIRY_MS = 4 * 60 * 60 * 1000; // 4 hours - session is stale after this

/**
 * Check if there's a recoverable session and provide recovery actions
 */
export function useSessionRecovery() {
  const [recoverableSession, setRecoverableSession] = useState<RecoverableSession | null>(null);
  const [isChecking, setIsChecking] = useState(true);
  const language = useSettingsStore((s) => s.language);

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

      // A snapshot without its quest is not resumable — it can only ever restore into a blank
      // session screen, so drop it rather than offer it.
      if (!saved.quest) {
        await preferences.clearSavedSession();
        setRecoverableSession(null);
        return;
      }

      // Session is valid and recoverable
      setRecoverableSession({
        questTitle: localizedTitle(saved.quest, language),
        questId: saved.quest.id,
        round: saved.currentRoundIndex + 1,
        roundTotal: saved.quest.rounds,
        exercise: saved.currentExerciseIndex + 1,
        exerciseTotal: saved.quest.exercises.length,
        savedAt: new Date(saved.savedAt),
        elapsedTime: Math.floor(
          (saved.savedAt - (saved.startTime ?? saved.savedAt) - saved.totalPausedTime) / 1000,
        ),
      });
    } catch (error) {
      // A corrupt snapshot means no recovery offer; the corruption itself must be visible.
      reportError("session.recoveryCheck", error);
      setRecoverableSession(null);
    } finally {
      setIsChecking(false);
    }
  }, [language]);

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
      const timerStartTimestamp = saved.timerStartTimestamp
        ? saved.timerStartTimestamp + pauseDuration
        : null;

      // Spread the snapshot rather than copy it field by field: every key of SavedSessionState is
      // a key of the store, so a field added to the snapshot is restored without touching this
      // function. Copying by hand is what lost `warmupSequence` and `bossStartHp`.
      const { savedAt: _savedAt, ...restored } = saved;

      useSessionStore.setState({
        ...restored,
        status: "paused", // Always resume in paused state
        prePauseStatus: saved.status === "paused" ? saved.prePauseStatus : saved.status,
        // ?? 0 covers snapshots written before warmupIndex was part of the payload.
        warmupIndex: saved.warmupIndex ?? 0,
        warmupSequence: saved.warmupSequence ?? [],
        pendingDamage: saved.pendingDamage ?? [],
        totalPausedTime: saved.totalPausedTime + pauseDuration,
        lastPauseTimestamp: now,
        timerStartTimestamp,
        // JSON has no Date, so every `performedAt` came back as a string.
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
      // "Resume did nothing" is this failing silently — report it so it stops being invisible.
      reportError("session.recover", error);
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

// `saveSessionState()` and `clearSavedSession()` used to live here. Nothing ever called them,
// and their payload had drifted from the one the store's own subscriber writes — which is how
// `warmupIndex` ended up required by the type and written by neither. The subscriber in
// stores/session.ts is the single writer now.
