// Via `expo` rather than `expo-modules-core`: the latter is a transitive dependency the SDK
// pins, and listing it in package.json to import one function would put a native module in the
// dependency list for the version checker to argue about. `expo` re-exports it.
import { requireOptionalNativeModule } from "expo";

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
