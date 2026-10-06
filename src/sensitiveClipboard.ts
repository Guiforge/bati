import * as Clipboard from "expo-clipboard";
import { AppState, type NativeEventSubscription } from "react-native";
import { batiSave } from "@/modules/bati-save";
import { reportError } from "@/src/reportError";

/** How long what is copied stays on the clipboard. */
export const KEEP_MS = 60_000;

let pending: { value: string; dueAt: number } | null = null;
let timer: ReturnType<typeof setTimeout> | null = null;
let listener: NativeEventSubscription | null = null;

function forget(): void {
  if (timer !== null) clearTimeout(timer);
  timer = null;
  listener?.remove();
  listener = null;
}

/**
 * Takes the copy off the clipboard when its minute is up, unless something else was copied since. Runs from the timer
 * and from the app coming back to the foreground: a timer does not fire while Android has the app suspended, and the
 * clipboard may only be read by the app in front.
 */
export async function clearIfDue(now = Date.now()): Promise<void> {
  if (pending === null || now < pending.dueAt) return;
  const { value } = pending;
  pending = null;
  forget();
  try {
    if ((await Clipboard.getStringAsync()) === value) await Clipboard.setStringAsync("");
  } catch (error) {
    reportError("backup.recoveryClear", error);
  }
}

/** `clearIfDue` for a timer or an event, which have nobody to hand a promise to. */
function clearSoon(): void {
  clearIfDue().catch((error: unknown) => reportError("backup.recoveryClear", error));
}

/**
 * Copies a secret (the twelve words) marked sensitive where Android knows the flag, and takes it off the clipboard a
 * minute later or at the next return to the foreground after that, whichever comes first.
 */
export async function copySensitive(value: string): Promise<void> {
  try {
    await batiSave().copySensitive(value);
  } catch {
    // A build without the native module, or a phone that refuses it: a plain copy still clears the same way.
    await Clipboard.setStringAsync(value);
  }
  forget();
  pending = { value, dueAt: Date.now() + KEEP_MS };
  timer = setTimeout(clearSoon, KEEP_MS);
  listener = AppState.addEventListener("change", (state) => {
    if (state === "active") clearSoon();
  });
}
