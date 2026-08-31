// Via `expo` rather than `expo-modules-core`: the latter is a transitive dependency the SDK
// pins, and listing it in package.json to import one function would put a native module in the
// dependency list for the version checker to argue about. `expo` re-exports it.
import { type PermissionResponse, PermissionStatus, requireOptionalNativeModule } from "expo";

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
  bearing: number | null;
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
  };
  /** Metres, default 50. Fixes worse than this never reach JS and never anchor a distance. */
  maxAccuracyM?: number;
  /** Metres per second, default 8 (walking or running). 25 for riding. */
  maxSpeedMs?: number;
  /** Milliseconds, default 30000. */
  noFixTimeoutMs?: number;
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
  // Every expo native module is an EventEmitter; spelling the one method used here beats
  // importing `NativeModule`, whose exported type is the constructor and carries no members.
  addListener<Event extends keyof BatiLocationEvents>(
    event: Event,
    listener: BatiLocationEvents[Event],
  ): Subscription;
};

const native = requireOptionalNativeModule<BatiLocationNativeModule>("BatiLocation");

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
  return (
    (await native?.requestPermission()) ?? {
      canAskAgain: false,
      expires: "never",
      granted: false,
      status: PermissionStatus.DENIED,
    }
  );
}

/**
 * Starts the foreground service. False means it did not start, and an `onError` event says why —
 * a missing permission is an error to show, not an exception to catch.
 */
export function start(options: StartOptions): boolean {
  return native?.start(options) ?? false;
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
