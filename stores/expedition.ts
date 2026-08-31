import { create } from "zustand";
import { appendPoints } from "@/db/gps";
import type { Quest } from "@/db/quests";
import { NON_REP_STYLE } from "@/db/workUnits";
import {
  addListener,
  isAvailable,
  type LocationFix,
  requestPermission,
  start as startNative,
  stop as stopNative,
} from "@/modules/bati-location";
import { accept, EMPTY, type TrackState } from "@/src/gps/track";
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
  /** Set when the service refused to start, so a screen can say why rather than sit blank. */
  error: string | null;
  begin: (sessionUuid: string, notification: Notification, mounted: boolean) => Promise<boolean>;
  end: () => Promise<void>;
};

type Notification = {
  title: string;
  acquiring: string;
  tracking: string;
  paused: string;
  gpsOff: string;
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

export const useExpeditionStore = create<ExpeditionState>()((set, get) => ({
  sessionUuid: null,
  track: EMPTY,
  lastFix: null,
  error: null,

  begin: async (sessionUuid, notification, mounted) => {
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
    await get()
      .end()
      .catch((e) => reportError("expedition.restart", e));

    buffer = [];
    set({ sessionUuid, track: EMPTY, lastFix: null, error: null });

    subscriptions = [
      addListener("onLocation", (fix) => {
        buffer.push(fix);
        set((state) => ({ track: accept(state.track, fix), lastFix: fix }));
        if (buffer.length >= FLUSH_EVERY) {
          flush(sessionUuid).catch((e) => reportError("expedition.flush", e));
        }
      }),
      addListener("onError", (error) => {
        set({ error: error.code });
        reportError("expedition.native", new Error(`${error.code}: ${error.message}`));
      }),
      // Both of these mean "the trace is broken, the hero may still be walking". The reducer
      // decides what that costs; here they are only worth a breadcrumb, because a GPS that
      // drops out on a de-Googled ROM is exactly the field report nobody can reproduce at a desk.
      addListener("onProviderEnabled", (event) => {
        if (!event.enabled) reportError("expedition.providerOff", new Error("provider disabled"));
      }),
      addListener("onNoFixTimeout", (event) => {
        reportError("expedition.noFix", new Error(`no fix for ${event.sinceLastFixMs} ms`));
      }),
    ];

    return startNative({
      notification,
      maxSpeedMs: mounted ? SPEED_CAP_MS.mounted : SPEED_CAP_MS.onFoot,
    });
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
