import * as Haptics from "expo-haptics";
import { create } from "zustand";
import { formatClock, formatDistance } from "@/constants/distanceFormat";
import { hasOutdoorSlot } from "@/db/expeditions";
import { appendPoints, pointsOf } from "@/db/gps";
import type { DistanceUnit } from "@/db/preferences";
import type { Quest } from "@/db/quests";
import {
  addListener,
  ensureNotificationPermission,
  isAvailable,
  type LocationFix,
  requestPermission,
  type StartOptions,
  setProgress,
  setReached,
  start as startNative,
  stop as stopNative,
} from "@/modules/bati-location";
import {
  accept,
  EMPTY,
  goalReached,
  METRES_PER_LEAGUE,
  type OutingGoal,
  type TrackState,
} from "@/src/gps/track";
import { reportError } from "@/src/reportError";
import { recordedDurationSeconds, useSessionStore } from "@/stores/session";

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

/**
 * How often the notification's line is rewritten from the clock rather than from a fix.
 *
 * The same half-minute as the flush, and for the same reason: a pocket nobody looks at should
 * cost one update every thirty seconds, not one a second. Without it the line only ever moved
 * when a fix landed, so the walk that most needs a readout - the one where no fix ever lands -
 * was the one that never got one.
 */
const PROGRESS_EVERY_MS = FLUSH_EVERY * 1000;

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

/**
 * The strings the service says on the hero's behalf, taken from the module rather than retyped.
 *
 * Written out by hand once, and the copy went stale the moment the notification learned a sixth
 * thing to say: the Finish action's label rode through here as an excess property, so forgetting
 * to pass it would have removed the button with nothing failing to compile. A type instead of a
 * test, which is the cheaper of the two and cannot rot.
 */
type Notification = NonNullable<StartOptions["notification"]>;

/** Whether anything in this quest happens outdoors, null-tolerant. The rule is in `db/expeditions`. */
export function isExpedition(quest: Quest | null): boolean {
  return quest ? hasOutdoorSlot(quest) : false;
}

/**
 * Everything that must not live in React state: the subscriptions, and the points not yet
 * written. Module scope rather than the store, because a re-render must never be able to drop a
 * fix on the floor.
 */
let subscriptions: { remove(): void }[] = [];
let buffer: LocationFix[] = [];
/** The wording the notification uses while no fix has landed, kept for `progressLine`. */
let acquiringWord = "";
/** The clock behind the notification's line, so it moves without a fix. Cleared by `end()`. */
let progressTimer: ReturnType<typeof setInterval> | null = null;
/**
 * Whole leagues already announced, a high-water mark rather than a count. Seeded by `begin()`.
 */
let leaguesCrossed = 0;

/** Whole leagues in a reading. The only place the counter and the recap agree by construction. */
function leaguesOf(track: TrackState): number {
  return Math.floor(track.distanceM / METRES_PER_LEAGUE);
}

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

/**
 * The notification's second line, and the only surface an outing in a pocket has.
 *
 * The time comes first, because it is the only fact that always exists. The line used to be the
 * distance alone, so a walk whose sky never opened repeated "Finding the sky" for its whole
 * length - the one screen readable without unlocking, saying nothing about a walk that was
 * happening.
 *
 * The seconds are `recordedDurationSeconds()`, the rule the panel and the journal already read,
 * so the notification cannot tell a third story about how long the hero has been out. That is
 * an import back into `stores/session`, which imports this store: a cycle on paper, never one at
 * runtime, since neither side touches the other while its module is evaluating.
 */
function progressLine(track: TrackState, unit: DistanceUnit): string {
  const elapsed = formatClock(recordedDurationSeconds() * 1000);
  // `startedAt` is set by the first fix the gate accepts, so null is exactly "no sky yet" - the
  // same test the panel's status line makes.
  const ground = track.startedAt === null ? acquiringWord : formatDistance(track.distanceM, unit);
  return `${elapsed} · ${ground}`;
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
  if (haptics) buzz("expedition.goalHaptic");
  setReached();
  setProgress(progressLine(track, unit));
}

/** The one haptic call in this file, so a walk cannot end up with two ways of buzzing. */
function buzz(context: string): void {
  Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch((e) =>
    reportError(context, e),
  );
}

/**
 * One buzz per league, the first time it is crossed and never again. Nothing on screen, no
 * string: the phone is in a pocket, and a buzz per kilometre is the whole message.
 *
 * A vibration rather than a cue from `src/sounds.ts`, which mixes under the hero's music on
 * purpose: a 70 ms tick is inaudible at running pace, and making it audible would reopen the
 * `expo-audio` configuration that already cost a microphone and three permissions.
 *
 * `leaguesCrossed` is a high-water mark because credited distance can go *down*: closing a pause
 * window takes back what it advanced (`RULES.pauseAfterMs`), so a hero who stops just past the
 * ninth league would otherwise be buzzed a second time for the same kilometre on the way back up.
 */
function announceLeague(track: TrackState, haptics: boolean): void {
  const leagues = leaguesOf(track);
  if (leagues <= leaguesCrossed) return;
  leaguesCrossed = leagues;
  if (haptics) buzz("expedition.leagueHaptic");
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
    leaguesCrossed = 0;
    acquiringWord = notification.acquiring;
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
    // Once per process, whichever door asked first. See `ensureNotificationPermission`.
    await ensureNotificationPermission();

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
    // The replayed ground is already behind the hero: seeding the mark from it is what keeps a
    // walk the OS killed at eight kilometres from buzzing eight times on the way back in.
    leaguesCrossed = leaguesOf(resumed);

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
        announceLeague(track, haptics);

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
      // The way out that only a locked screen takes. The service asks, the session store
      // concludes: the duration, the XP and the journal row are its business, and its alone.
      addListener("onFinishRequested", () => {
        useSessionStore.getState().completeOuting();
      }),
    ];

    const started = startNative({
      notification,
      maxSpeedMs: mounted ? SPEED_CAP_MS.mounted : SPEED_CAP_MS.onFoot,
    });
    // A refusal the service can explain arrives on `onError`; a bare `false` explained nothing,
    // and the panel sat on "Finding the sky" for the length of a walk nothing was measuring.
    if (!started) set({ error: "foreground-denied" });
    if (started) {
      progressTimer = setInterval(() => {
        setProgress(progressLine(get().track, unit));
      }, PROGRESS_EVERY_MS);
    }
    return started;
  },

  end: async () => {
    for (const subscription of subscriptions) subscription.remove();
    subscriptions = [];
    if (progressTimer !== null) clearInterval(progressTimer);
    progressTimer = null;
    stopNative();
    const { sessionUuid } = get();
    if (sessionUuid) await flush(sessionUuid);
    set({ sessionUuid: null });
  },
}));
