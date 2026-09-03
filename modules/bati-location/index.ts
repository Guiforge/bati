// Via `expo` rather than `expo-modules-core`: the latter is a transitive dependency the SDK
// pins, and listing it in package.json to import one function would put a native module in the
// dependency list for the version checker to argue about. `expo` re-exports it.
import { type PermissionResponse, PermissionStatus, requireOptionalNativeModule } from "expo";
import { reportError } from "@/src/reportError";

/** One accepted fix. `distFromPrev` is `Location.distanceTo` against the previous accepted one. */
export type LocationFix = {
  /** Epoch ms from `Location.getTime()` — the system clock, so callers keep their own monotonic guard. */
  t: number;
  lat: number;
  lon: number;
  /** Metres, null when the fix carries no altitude. */
  ele: number | null;
  /** Metres. Never null: a fix without accuracy cannot be filtered and is dropped natively. */
  acc: number;
  speed: number | null;
  /** Metres, 0 for the first fix of a session. */
  distFromPrev: number;
};

export type LocationError = {
  code: "permission" | "provider-missing" | "foreground-denied" | "no-context";
  message: string;
};

type BatiLocationEvents = {
  onLocation: (fix: LocationFix) => void;
  onProviderEnabled: (event: { enabled: boolean }) => void;
  /** Only ever after a first fix: cold TTFF without SUPL or PSDS is minutes, not seconds. */
  onNoFixTimeout: (event: { sinceLastFixMs: number }) => void;
  /**
   * The hero pressed "Finish" on the notification, which is how a walk ends with the phone
   * locked in a pocket. No body: the service knows the button was pressed and nothing else, and
   * the duration is the session store's to read off the trace, never native's to measure.
   */
  onFinishRequested: () => void;
  onError: (error: LocationError) => void;
};

export type StartOptions = {
  /** Every word the notification can show, localized here — the native half owns no strings. */
  notification: {
    title: string;
    acquiring: string;
    tracking: string;
    paused: string;
    gpsOff: string;
    reached: string;
    /**
     * The word on the notification's one button. Absent means no button at all, which is what
     * the native half does with an empty string.
     *
     * ponytail: optional only because `stores/expedition.ts` retypes these six strings as its
     * own `Notification` and would stop compiling the day this became required. The label rides
     * through that store as an extra property. Make it required when that type names it.
     */
    finish: string;
  };
  /** Metres per second, default 8 (walking or running). 25 for riding. */
  maxSpeedMs?: number;
};

/** Structurally an expo `EventSubscription`, spelled out so nothing but `expo` is imported. */
type Subscription = { remove(): void };

/**
 * The JS half of the Google-free location module.
 *
 * Deliberately platform-neutral: iOS gets the same names when an iOS build exists (see
 * docs/designs/gps-without-google.md, premise P4). Until then, and in jest, the native module
 * is simply absent — `requireOptionalNativeModule` returns null rather than throwing, which is
 * what lets a GPS quest be hidden instead of crashing a screen.
 */
type BatiLocationNativeModule = {
  hasGpsProvider(): boolean;
  start(options: StartOptions): boolean;
  stop(): void;
  requestPermission(): Promise<PermissionResponse>;
  getPermissionStatus(): Promise<PermissionResponse>;
  requestNotificationPermission(): Promise<PermissionResponse>;
  setProgress(text: string): void;
  setReached(): void;
  // Every expo native module is an EventEmitter; spelling the one method used here beats
  // importing `NativeModule`, whose exported type is the constructor and carries no members.
  addListener<Event extends keyof BatiLocationEvents>(
    event: Event,
    listener: BatiLocationEvents[Event],
  ): Subscription;
};

const native = requireOptionalNativeModule<BatiLocationNativeModule>("BatiLocation");

/** The answer on a build with no native half, so every caller branches on one shape. */
const DENIED: PermissionResponse = {
  canAskAgain: false,
  expires: "never",
  granted: false,
  status: PermissionStatus.DENIED,
};

/** Whether the native module is linked into this build at all. */
export function isAvailable(): boolean {
  return native !== null;
}

/**
 * Whether this device exposes a real GPS provider. False on a build without the module, so a
 * caller never has to ask both questions.
 */
export function hasGpsProvider(): boolean {
  return native?.hasGpsProvider() ?? false;
}

/**
 * Asks for precise location, which on Android means asking for the coarse permission in the same
 * breath. Denied everywhere the native module is absent, so a caller can branch on one answer.
 */
export async function requestPermission(): Promise<PermissionResponse> {
  return (await native?.requestPermission()) ?? DENIED;
}

/**
 * What the location permission already is, without asking for it.
 *
 * Home says why the position is needed before Android's own dialog, and that sentence has two
 * ways of being a lie: in front of a hero who granted months ago it explains something already
 * settled, and in front of one who refused twice it announces a dialog that will never appear
 * again. Requesting cannot answer either question, since the answer arrives after the dialog.
 *
 * Denied and unaskable where the native module is absent: not knowing is a reason to explain
 * rather than a reason to stay quiet, and a caller branches on one shape either way.
 */
export async function getPermissionStatus(): Promise<PermissionResponse> {
  return (await native?.getPermissionStatus()) ?? DENIED;
}

/**
 * The notification grant, asked at most once in the life of the process.
 *
 * Two doors now lead outside and each wants the grant before the walk starts: Home asks while the
 * hero is still standing at the door, and `useExpeditionStore.begin` asks because the quest screen
 * never did. Without this, a hero who refused at the tile met the system dialog a second time,
 * over a chronometer already counting their walk.
 *
 * A module-level answer rather than a parameter threaded through two stores: there is nothing a
 * third door could forget to pass. It lives here rather than in the expedition store because Home
 * would otherwise import that store to reach it, and that store reaches the database: the band
 * would drag the whole `db` barrel into the first screen the app mounts.
 *
 * The answer itself is never kept and never read. A hero who refuses still gets their walk
 * measured, and the only reset that matters, a fresh process, is the one Android's own answer
 * survives anyway.
 */
let notificationAsked = false;

export async function ensureNotificationPermission(): Promise<void> {
  if (notificationAsked) return;
  notificationAsked = true;

  // Never silently: a grant that stops being asked for is a notification that stops appearing,
  // and the walk it was the only screen of would say nothing for an hour. Same context string
  // the expedition store used when it owned this call.
  await requestNotificationPermission().catch((e: unknown) =>
    reportError("expedition.notificationPermission", e),
  );
}

/**
 * Asks to be allowed to post the ongoing notification.
 *
 * Separate from the location prompt on purpose: from API 33 the foreground-service notification
 * is invisible without this grant, so on a phone that never asked, the whole promise the feature
 * makes — one tap on the way out, one on the way back, and the rest said through a notification —
 * silently did not exist. It is still only the *voice* of the feature, not the feature, so a
 * refusal must never stop a walk: callers fire this and ignore the answer.
 */
export async function requestNotificationPermission(): Promise<PermissionResponse> {
  return (await native?.requestNotificationPermission()) ?? DENIED;
}

/**
 * Starts the foreground service. False means it did not start, and an `onError` event says why —
 * a missing permission is an error to show, not an exception to catch.
 */
export function start(options: StartOptions): boolean {
  return native?.start(options) ?? false;
}

/**
 * Move the second half of the notification's line, e.g. "On the road · 2.40 km".
 *
 * A string rather than a number: the ground covered has to be phrased the way the hero's own
 * screen phrases it, in their unit and their language, and it has to be the reducer's distance
 * rather than a native sum of every accepted fix. Those two numbers differ on purpose, and the
 * notification is the one place the hero cannot check which they are reading.
 */
export function setProgress(text: string): void {
  native?.setProgress(text);
}

/**
 * Mark the goal reached, once. The state word the notification shows switches from "on the
 * road"/"paused"/etc. to the reached word given at `start()`, and stays there for the rest of
 * the outing — a hero who keeps walking or later pauses does not un-reach a goal they already
 * met, which is the same precedence `ExpeditionPanel` gives `goalReached` over moving or paused.
 */
export function setReached(): void {
  native?.setReached();
}

/** Stops the service, releases the wake lock and takes the notification down. */
export function stop(): void {
  native?.stop();
}

export function addListener<Event extends keyof BatiLocationEvents>(
  event: Event,
  listener: BatiLocationEvents[Event],
): Subscription {
  return (
    native?.addListener(event, listener) ?? {
      remove: () => {
        // Nothing was ever subscribed on a build with no native half, and a caller still gets
        // to clean up unconditionally.
      },
    }
  );
}
