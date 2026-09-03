import { useCallback, useEffect, useState } from "react";
import { isOutingSession } from "@/db/expeditions";
import { deletePoints, pointsOf, sweepOrphanedPoints } from "@/db/gps";
import { preferences } from "@/db/preferences";
import type { Quest } from "@/db/quests";
import { accept, credited, EMPTY, type TrackState } from "@/src/gps/track";
import { localizedTitle } from "@/src/i18n/localized";
import { reportError } from "@/src/reportError";
import { isExpedition, useExpeditionStore } from "@/stores/expedition";
import { beginTrackingIfOuting, type SavedSessionState, useSessionStore } from "@/stores/session";
import { useSettingsStore } from "@/stores/settings";

/**
 * Session recovery info for UI
 */
export interface RecoverableSession {
  questTitle: string;
  questId: number;
  /**
   * The name the interrupted session was already filing GPS points under. Carried so discarding
   * can take its ground with it, and so the orphan sweep knows the one trace it must not touch.
   * Null for a snapshot written before sessions had names.
   */
  sessionUuid: string | null;
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
  /**
   * Ground already covered, in metres, on an interrupted outing; null on a workout and on a walk
   * that never wrote a fix.
   *
   * The rounds and the elapsed clock above are a workout's numbers. A walk has one round of one
   * movement, so the card offered "Round 1/1, exercise 1/1" to a hero who had done 1.8 km — and
   * its clock read the seconds since the snapshot was written, which for an outing is written
   * once, at the start. Both true, neither about the walk. The trace is what the walk left
   * behind, so the trace is what the card counts.
   */
  leaguesM: number | null;
  /**
   * Whether the card may offer to *finish* this one, and not only to resume or throw it away.
   *
   * The strict predicate, deliberately: a walk left the trace that says what happened while the
   * app was dead, so it can be concluded without the hero. A set of squats has nothing but the
   * clock, and a mixed quest has a walk's witness for the push-ups it cannot see either — both
   * can only be resumed.
   */
  isOuting: boolean;
}

/**
 * What the interrupted outing had already filed, replayed through the reducer.
 *
 * The same fold the expedition store does on resume, and for the same reason: the reducer is
 * pure, so replaying the fixes *is* the reading — a raw sum of `distFromPrev` would offer the
 * hero a bigger number than the walk can ever be paid. Two readers now: the figure on the card,
 * and the reading `finishSession` hands to the journal.
 */
async function foldedTrace(sessionUuid: string): Promise<TrackState | null> {
  try {
    return (await pointsOf(sessionUuid)).reduce(accept, EMPTY);
  } catch (error) {
    // The offer stands without the figure: a card that cannot count is still a card that resumes.
    reportError("session.recoveryGround", error);
    return null;
  }
}

/**
 * The figure the card puts on an interrupted outing, in metres, or nothing it can honestly say.
 *
 * The generous predicate: any quest with outdoors in it covered ground, even one that also had
 * push-ups in it. Whether that quest may be *finished* from the card is the other question, and
 * `isOutingSession` answers it.
 */
async function groundCovered(quest: Quest, sessionUuid: string | null): Promise<number | null> {
  if (sessionUuid === null || !isExpedition(quest)) return null;
  return credited((await foldedTrace(sessionUuid)) ?? EMPTY)?.leaguesM ?? null;
}

/**
 * How long an offer stands, and why the two kinds of session get different answers.
 *
 * A workout's snapshot is only ever as good as the clock that wrote it: nothing witnessed the
 * hours in between, so past an afternoon the app would be offering to resume a session it can no
 * longer describe. Four hours.
 *
 * An outing has a witness. Its points are in `gps_points` with their own timestamps, so a walk
 * finished at nine in the evening still says exactly what it did when the phone is picked up the
 * next morning — the duration written comes from the trace, not from how long the snapshot sat
 * there. The clock only decides whether the hero still recognises the offer, which is why the
 * window is a day and not a week: past that, an unclaimed walk is a surprise, not a memory.
 */
const SESSION_EXPIRY_MS = 4 * 60 * 60 * 1000;
const OUTING_EXPIRY_MS = 24 * 60 * 60 * 1000;

/**
 * The snapshot, back in the session store.
 *
 * Shared by resume and finish, which differ only in what happens to the walk afterwards: one
 * starts measuring again, the other reads the trace and closes the session. Copying this into a
 * second caller is exactly how `warmupSequence` was lost the first time.
 */
function restoreSnapshot(saved: SavedSessionState): void {
  // Time elapsed since the snapshot, banked as pause.
  //
  // It is a workout's answer, and only a workout's: nothing happened while the process was
  // dead, so the hero was not training. An outing's is different — the walk may well have
  // gone on for another hour with the app already gone, and the snapshot cannot say, because
  // an expedition is one round of one movement and the subscriber writes it exactly once, at
  // the start. So an outing's clock does not read this at all: `sessionClock` in
  // `stores/session.ts` times a walk by its own trace, first fix to last. Left as it is on
  // purpose — the timer on screen and every strength quest still need it.
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
}

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

      // A snapshot without its quest is not resumable — it can only ever restore into a blank
      // session screen, so drop it rather than offer it. Asked before the clock, because the
      // quest is what says which clock applies.
      if (!saved.quest) {
        await preferences.clearSavedSession();
        setRecoverableSession(null);
        return;
      }

      const isOuting = isOutingSession(saved.quest);

      // Check if session is too old
      if (Date.now() - saved.savedAt > (isOuting ? OUTING_EXPIRY_MS : SESSION_EXPIRY_MS)) {
        await preferences.clearSavedSession();
        setRecoverableSession(null);
        return;
      }

      const uuid = saved.sessionUuid ?? null;
      const leaguesM = await groundCovered(saved.quest, uuid);

      // Session is valid and recoverable
      setRecoverableSession({
        questTitle: localizedTitle(saved.quest, language),
        questId: saved.quest.id,
        sessionUuid: uuid,
        round: saved.currentRoundIndex + 1,
        roundTotal: saved.quest.rounds,
        exercise: saved.currentExerciseIndex + 1,
        exerciseTotal: saved.quest.exercises.length,
        savedAt: new Date(saved.savedAt),
        leaguesM,
        isOuting,
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

  /**
   * Ground nothing will ever claim.
   *
   * An outing writes a point a second, so an app killed mid-run leaves a trace with no session
   * and, if the snapshot went with it, nothing that could ever resume. Those points reach no
   * screen and stay in the leagues that grow the High Road, which is a village built by a run
   * that never happened. Swept after the recovery check rather than before, so the one trace
   * the banner is about to offer is known and kept.
   *
   * The live session is kept as well as the offered one. The banner reads a snapshot from disk;
   * a run happening right now has no reason to be in it, and sweeping the ground out from under
   * a walk in progress is the same data loss by a shorter route.
   */
  useEffect(() => {
    if (isChecking) return;
    const keep = useSessionStore.getState().sessionUuid ?? recoverableSession?.sessionUuid ?? null;
    sweepOrphanedPoints(keep).catch((e) => reportError("session.sweepOrphanedPoints", e));
  }, [isChecking, recoverableSession]);

  // Check for saved session on mount
  useEffect(() => {
    checkForRecoverableSession().catch((e) => reportError("session.recoveryCheck", e));
  }, [checkForRecoverableSession]);

  const recoverSession = useCallback(async (): Promise<boolean> => {
    try {
      const savedJson = await preferences.getSavedSession();
      if (!savedJson) return false;

      const saved: SavedSessionState = JSON.parse(savedJson);

      restoreSnapshot(saved);

      // An outing that was interrupted is still an outing.
      //
      // Only `startSession` ever started the tracking, so a resumed walk measured nothing from
      // here on: the panel said "Finding the sky" for the rest of the way, and at DONE the
      // reducer had no witness at all — `leaguesM: null` on a session whose recap draws the
      // kilometres already in `gps_points`. Same uuid, so the points land on the same session,
      // and the store folds those points back into the reading rather than restarting at zero.
      if (saved.quest) {
        beginTrackingIfOuting(saved.quest, saved.sessionUuid ?? null, saved.goal ?? null);
      }

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

  /**
   * The walk is over and nothing was there to say so.
   *
   * The notification's own "Finish" needs a live JS runtime, and the case this exists for is the
   * one where the OS took the process and left the service: nobody concluded the session. So the
   * card does, at the next launch.
   *
   * It is not `recoverSession` plus a tap. Resuming *starts the tracker back up*, and a session
   * about to be filed has nothing left to measure — the service would be started only for
   * `saveSession`'s own `end()` to race it back down. What finishing needs from the walk is its
   * reading, which is the fold the expedition store would have done on resume, done here from
   * the same table.
   *
   * The duration is not decided here and must never be: `completeExercise` prices a timed outing
   * with `recordedDurationSeconds()`, which reads `sessionClock`, which reads that trace. The
   * session lands on "finished", the victory screen saves it exactly as it would have if the
   * hero had pressed DONE on the road, and the recap draws the kilometres.
   */
  const finishSession = useCallback(async (): Promise<boolean> => {
    try {
      const savedJson = await preferences.getSavedSession();
      if (!savedJson) return false;

      const saved: SavedSessionState = JSON.parse(savedJson);
      // Never for a workout: the hero's absence is the whole of what happened, and no witness of
      // it exists. The card does not offer this, and the guard says so twice on purpose.
      if (!saved.quest || !isOutingSession(saved.quest)) return false;

      restoreSnapshot(saved);

      const uuid = saved.sessionUuid ?? null;
      if (uuid !== null) {
        const trace = await foldedTrace(uuid);
        // Only the reading, never `sessionUuid`: nothing is being tracked, and a uuid here would
        // send `saveSession`'s `end()` looking for a buffer to flush that no one filled.
        if (trace) useExpeditionStore.setState({ track: trace });
      }

      // The same ending as the button on screen and the Finish action on the notification, and
      // deliberately not a third one: `completeOuting` is the store's one entry point for a walk
      // that no view is watching, and it reads the duration off the trace exactly as the journal
      // will. Handing `completeExercise` a floor of 1 here worked, and left two callers who both
      // had to remember that the number they pass is thrown away.
      useSessionStore.getState().completeOuting();

      await preferences.clearSavedSession();
      setRecoverableSession(null);

      return true;
    } catch (error) {
      reportError("session.finishOuting", error);
      return false;
    }
  }, []);

  const discardSession = useCallback(async () => {
    // The ground an abandoned outing covered goes with it. Points are written every second while
    // a session runs, so a discarded expedition leaves a trace belonging to nothing: it would
    // count toward the leagues that grow the High Road, for a session the hero just said never
    // happened.
    const uuid = recoverableSession?.sessionUuid;
    if (uuid) {
      await deletePoints(uuid).catch((e: unknown) => reportError("session.discardPoints", e));
    }
    await preferences.clearSavedSession();
    setRecoverableSession(null);
  }, [recoverableSession]);

  return {
    recoverableSession,
    isChecking,
    recoverSession,
    finishSession,
    discardSession,
    checkForRecoverableSession,
  };
}

// `saveSessionState()` and `clearSavedSession()` used to live here. Nothing ever called them,
// and their payload had drifted from the one the store's own subscriber writes — which is how
// `warmupIndex` ended up required by the type and written by neither. The subscriber in
// stores/session.ts is the single writer now.
