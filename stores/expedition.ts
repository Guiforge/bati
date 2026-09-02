import * as Haptics from "expo-haptics";
import { create } from "zustand";
import { formatDistance } from "@/constants/distanceFormat";
import { appendPoints, pointsOf } from "@/db/gps";
import type { DistanceUnit } from "@/db/preferences";
import type { Quest } from "@/db/quests";
import { NON_REP_STYLE } from "@/db/workUnits";
import {
  addListener,
  isAvailable,
  type LocationFix,
  requestNotificationPermission,
  requestPermission,
  setProgress,
  setReached,
  start as startNative,
  stop as stopNative,
} from "@/modules/bati-location";
import { accept, EMPTY, goalReached, type OutingGoal, type TrackState } from "@/src/gps/track";
import { reportError } from "@/src/reportError";

/**
 * The live half of an expedition: the fixes arriving while the hero is out.
 *
 * A store rather than a hook, because tracking has to outlive the screen. The hero can leave the
 * session view, lock the phone, take a call; a subscription mounted by a component would be torn
 * down by the first of those and the trace would end without a word.
 *
 * It owns two things that must not drift apart: the reducer's reading of the run, and the raw
 * points on their way to `gps_points`. The reading is what the screen shows; the points are what
 * survives. Writing the reading instead would mean a rule tuned against real data could never be
 * re-tuned, which is the whole reason this table stores raw fixes.
 */

/** Fixes buffered before a write. Thirty seconds at 1 Hz, so a kill costs half a minute. */
const FLUSH_EVERY = 30;

/** Metres per second above which a fix is implausible, by how the hero is moving. */
const SPEED_CAP_MS = { onFoot: 8, mounted: 25 } as const;

type ExpeditionState = {
  /** The session these fixes belong to, or null when nothing is being tracked. */
  sessionUuid: string | null;
  /** The reducer's reading: distance, moving time, whether the hero has stopped. */
  track: TrackState;
  /** The most recent accepted fix, for an accuracy readout. */
  lastFix: LocationFix | null;
  /**
   * Why the readout is not moving, in a code the panel turns into words: the service refused to
   * start, the hero denied the prompt, or the trace went quiet mid-walk (`gps-off`, `no-fix`).
   * The last two are transient and clear themselves the moment fixes come back.
   */
  error: string | null;
  /** Flipped once, the moment the goal was met. Read by the panel's status line. */
  goalReached: boolean;
  begin: (
    sessionUuid: string,
    notification: Notification,
    mounted: boolean,
    unit: DistanceUnit,
    goal?: OutingGoal | null,
    haptics?: boolean,
  ) => Promise<boolean>;
  end: () => Promise<void>;
};

type Notification = {
  title: string;
  acquiring: string;
  tracking: string;
  paused: string;
  gpsOff: string;
  reached: string;
};

/** Whether this quest is an outing rather than a workout. */
export function isExpedition(quest: Quest | null): boolean {
  return quest?.exercises.some((slot) => slot.exercise.style === NON_REP_STYLE) ?? false;
}

/**
 * Everything that must not live in React state: the subscriptions, and the points not yet
 * written. Module scope rather than the store, because a re-render must never be able to drop a
 * fix on the floor.
 */
let subscriptions: { remove(): void }[] = [];
let buffer: LocationFix[] = [];

async function flush(sessionUuid: string): Promise<void> {
  if (buffer.length === 0) return;
  const batch = buffer;
  buffer = [];
  try {
    await appendPoints(sessionUuid, batch);
  } catch (error) {
    // Losing the ground covered is the one failure this whole path exists to prevent, so it is
    // never swallowed. The batch is gone either way: putting it back would mean an unbounded
    // buffer on a database that is already refusing writes.
    reportError("expedition.flush", error);
  }
}

/**
 * The two errors that are only about silence: a fix arriving, or the provider coming back, ends
 * them. A permission refusal or a service that would not start is not undone by a fix.
 */
function clearedTransient(error: string | null): string | null {
  return error === "gps-off" || error === "no-fix" ? null : error;
}

/** The notification's second line: the ground covered, in the hero's own unit. */
function progressLine(track: TrackState, unit: DistanceUnit): string {
  return formatDistance(track.distanceM, unit);
}

/**
 * The moment the goal flips from unmet to met, once. The phone is in a pocket right now, so the
 * buzz is the whole message and the notification is what explains it when the hero looks.
 * Haptics off is respected: a hero who turned them off for buttons did not ask for a walk to be
 * silent, but the setting has one meaning in this app and this is not the place to give it a
 * second.
 *
 * The state word ("Goal reached") is native's to own from here on, via `setReached` — see
 * `BatiLocationService.notification()`. This only ever pushes the figure.
 */
function announceGoalReached(track: TrackState, unit: DistanceUnit, haptics: boolean): void {
  if (haptics) {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch((e) =>
      reportError("expedition.goalHaptic", e),
    );
  }
  setReached();
  setProgress(progressLine(track, unit));
}

export const useExpeditionStore = create<ExpeditionState>()((set, get) => ({
  sessionUuid: null,
  track: EMPTY,
  lastFix: null,
  error: null,
  goalReached: false,

  begin: async (sessionUuid, notification, mounted, unit, goal = null, haptics = true) => {
    // The previous run is closed before this one can be refused. Both early exits below used to
    // return with the last outing's reading still in state: permission revoked between two
    // sorties in the same process, and DONE credited the first walk's kilometres a second time,
    // with its pace on the victory screen. Never hold game state a session has not earned.
    await get()
      .end()
      .catch((e) => reportError("expedition.restart", e));
    buffer = [];
    set({ track: EMPTY, lastFix: null, error: null, goalReached: false });

    if (!isAvailable()) {
      // No native half: iOS today, and jest. The quest still runs, it just measures nothing.
      set({ error: "unavailable" });
      return false;
    }

    /**
     * Ask before starting, because Android will not.
     *
     * This was missing and the whole feature was dead on a real install: the service refuses
     * without the grant, returns `permission`, and the hero walks an hour while nothing is
     * written. It went unnoticed because the only caller of `requestPermission` was the
     * `__DEV__` harness, where the grant had already been given by hand — a control that works
     * everywhere except where it ships.
     *
     * Asked here rather than on the quest screen so there is exactly one place that decides an
     * outing may begin. If the hero refuses, the session still runs and still counts as a
     * workout; it simply measures no ground, and the panel says so instead of showing a zero
     * that means nothing.
     */
    const permission = await requestPermission();
    if (!permission.granted) {
      set({ error: "permission" });
      return false;
    }
    // Asked after location and never bundled with it: from API 33 the ongoing notification is
    // invisible without this grant, so the promise the feature makes — one tap out, one tap back,
    // the rest said through a notification — silently did not exist on any recent phone. The
    // answer is deliberately ignored. A hero who refuses the notification still gets their walk
    // measured; bundling the two would have let one refusal veto the other.
    await requestNotificationPermission().catch((e: unknown) =>
      reportError("expedition.notificationPermission", e),
    );

    /**
     * The ground already filed under this name.
     *
     * A session the OS killed mid-walk resumes with the same uuid and its points still in
     * `gps_points`, so the reading restarts from the terrain rather than from zero — otherwise
     * the recap draws 2.4 km the tracker says never happened, and the road is never paid. The
     * reducer is pure, so replaying the points *is* the state: no second rule to keep in step.
     * Empty, and one cheap query, for a uuid minted a second ago.
     */
    const priorFixes = await pointsOf(sessionUuid).catch((e: unknown) => {
      reportError("expedition.resumeTrack", e);
      return [] as LocationFix[];
    });
    const resumed = priorFixes.reduce(accept, EMPTY);

    set({
      sessionUuid,
      track: resumed,
      lastFix: priorFixes[priorFixes.length - 1] ?? null,
      error: null,
      goalReached: goalReached(goal, resumed),
    });

    subscriptions = [
      addListener("onLocation", (fix) => {
        buffer.push(fix);
        const track = accept(get().track, fix);
        const wasReached = get().goalReached;
        const reached = wasReached || goalReached(goal, track);
        set({ track, lastFix: fix, goalReached: reached, error: clearedTransient(get().error) });

        if (reached && !wasReached) announceGoalReached(track, unit, haptics);

        // Same cadence as the write, so a pocket that is never looked at costs one notification
        // update every thirty seconds rather than one a second.
        if (buffer.length >= FLUSH_EVERY) {
          setProgress(progressLine(track, unit));
          flush(sessionUuid).catch((e) => reportError("expedition.flush", e));
        }
      }),
      addListener("onError", (error) => {
        set({ error: error.code });
        reportError("expedition.native", new Error(`${error.code}: ${error.message}`));
      }),
      // Both of these mean "the trace is broken, the hero may still be walking". They reach the
      // panel as well as the log: the figures freeze either way, and a hero who switched
      // location off mid-walk was left reading "On the road" over numbers that had stopped
      // moving, while the notification two swipes away said the GPS was off.
      addListener("onProviderEnabled", (event) => {
        if (event.enabled) {
          set({ error: clearedTransient(get().error) });
          return;
        }
        set({ error: "gps-off" });
        reportError("expedition.providerOff", new Error("provider disabled"));
      }),
      addListener("onNoFixTimeout", (event) => {
        set({ error: "no-fix" });
        reportError("expedition.noFix", new Error(`no fix for ${event.sinceLastFixMs} ms`));
      }),
    ];

    const started = startNative({
      notification,
      maxSpeedMs: mounted ? SPEED_CAP_MS.mounted : SPEED_CAP_MS.onFoot,
    });
    // A refusal the service can explain arrives on `onError`; a bare `false` explained nothing,
    // and the panel sat on "Finding the sky" for the length of a walk nothing was measuring.
    if (!started) set({ error: "foreground-denied" });
    return started;
  },

  end: async () => {
    for (const subscription of subscriptions) subscription.remove();
    subscriptions = [];
    stopNative();
    const { sessionUuid } = get();
    if (sessionUuid) await flush(sessionUuid);
    set({ sessionUuid: null });
  },
}));
