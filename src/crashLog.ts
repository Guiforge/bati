import { Platform } from "react-native";
import { getRawDb } from "@/db/client";
import { getPreference, setPreference } from "@/db/preferences";

/**
 * Crash capture that never phones home.
 *
 * Everything here stays in the app's own SQLite file. Nothing is uploaded, scheduled for
 * upload, or batched for a later flush — the app makes no network requests at all, and this
 * feature was built specifically so that stays true. The hero sends a report by tapping
 * "Report a bug" in Settings, which opens *their* mail client with the text filled in; they
 * can read it, edit it, or never send it.
 *
 * What this catches: uncaught JS errors (via `ErrorUtils`) and React render errors (via
 * `ErrorBoundary`'s `onError`). What it does not catch: native crashes — SIGSEGV, OOM, a bad
 * native module. Capturing those needs a native handler, and the one library that offers it
 * (`react-native-exception-handler`) has been unmaintained since 2022 and ships no Expo config
 * plugin, so it cannot be linked under CNG at all.
 *
 * ponytail: last N crashes in one preference row, no breadcrumbs, no device metadata beyond
 *           the app version. If reports start arriving without enough to act on, the next rung
 *           is threading `reportError`'s silenced failures in as breadcrumbs.
 */

const CRASH_LOG_KEY = "crashLog";

/** Enough to show a pattern, few enough that the row stays small and the mail stays readable. */
const MAX_ENTRIES = 5;

/** A stack trace is the useful part; anything past this is noise in an email body. */
const MAX_STACK_CHARS = 4000;

export type CrashReport = {
  /** ISO timestamp of the crash. */
  at: string;
  /** Where it came from, in the app's own words: "fatal", "render". */
  context: string;
  message: string;
  stack: string | null;
};

/**
 * Recording a crash must not be able to cause one. Every failure below is swallowed on
 * purpose, and this flag stops a write that itself throws from re-entering through the global
 * handler and looping.
 */
let recording = false;

function toReport(context: string, error: unknown): CrashReport {
  const err = error instanceof Error ? error : new Error(String(error));
  return {
    at: new Date().toISOString(),
    context,
    message: err.message || String(error),
    stack: err.stack ? err.stack.slice(0, MAX_STACK_CHARS) : null,
  };
}

function parse(raw: string | null): CrashReport[] {
  if (!raw) return [];
  try {
    const parsed: unknown = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as CrashReport[]) : [];
  } catch {
    return [];
  }
}

/**
 * Synchronous write, used when the app is already dying. Returns false when the raw handle
 * cannot do it — under Jest the client is mocked and there is no `runSync`.
 */
function writeSync(entries: CrashReport[]): boolean {
  try {
    const raw = getRawDb() as unknown as {
      runSync?: (sql: string, params: unknown[]) => unknown;
    };
    if (typeof raw?.runSync !== "function") return false;
    raw.runSync(
      `INSERT INTO user_preferences ("key", "value", "updatedAt") VALUES (?, ?, ?)
       ON CONFLICT("key") DO UPDATE SET "value" = excluded."value", "updatedAt" = excluded."updatedAt"`,
      [CRASH_LOG_KEY, JSON.stringify(entries), Math.floor(Date.now() / 1000)],
    );
    return true;
  } catch {
    return false;
  }
}

/**
 * Append a crash to the local log, newest first.
 *
 * `fatal` writes synchronously because an awaited insert would not survive the teardown that
 * follows. Everything else takes the normal async path.
 */
export async function recordCrash(context: string, error: unknown, fatal = false): Promise<void> {
  if (recording) return;
  recording = true;
  try {
    const entries = [toReport(context, error), ...parse(await getPreference(CRASH_LOG_KEY))].slice(
      0,
      MAX_ENTRIES,
    );

    if (fatal && writeSync(entries)) return;
    await setPreference(CRASH_LOG_KEY, JSON.stringify(entries));
  } catch {
    // A crash log that throws while logging a crash helps nobody.
  } finally {
    recording = false;
  }
}

export async function readCrashLog(): Promise<CrashReport[]> {
  try {
    return parse(await getPreference(CRASH_LOG_KEY));
  } catch {
    return [];
  }
}

/**
 * The one place the contact address is written in code. The same address appears in the
 * privacy text in `locales/*.json` and in `docs/legal/privacy.md`; change all three together.
 */
export const CONTACT_EMAIL = "feedback.bati@proton.me";

/**
 * A `mailto:` the hero's own mail app opens, pre-filled and fully editable.
 *
 * This is the entire transport: no HTTP client, no upload, no consent checkbox that quietly
 * means "later". Nothing has been sent until they press send in their own client, and the body
 * is plain text they can read and cut down first.
 */
/**
 * The wording of the draft, supplied by the caller.
 *
 * Kept out of this module so the mail can be written in the hero's language without dragging
 * i18n into a file the crash handler loads at startup. The screen has `t`; this has the data.
 */
export type BugReportStrings = {
  subject: string;
  /** What the hero is invited to write. Several lines is fine — an empty draft gets no reply. */
  prompt: string;
  technicalHeader: string;
  noCrash: string;
};

/**
 * What the phone is, in one line.
 *
 * Android exposes brand and model through `Platform.constants`; iOS does not expose a model at
 * all, so it gets the OS version it does give. No `expo-device` for this — a whole dependency
 * to add one word on one platform is not a trade worth making.
 */
function deviceLine(): string {
  const constants = Platform.constants as Record<string, unknown> | undefined;
  const model = [constants?.Brand, constants?.Model].filter(Boolean).join(" ");
  const os = `${Platform.OS} ${Platform.Version}`;
  return model ? `${model} — ${os}` : os;
}

export function buildBugReportMailto(
  reports: CrashReport[],
  appVersion: string,
  strings: BugReportStrings,
): string {
  const header = [
    "",
    "",
    `--- ${strings.technicalHeader} ---`,
    `App: Bati ${appVersion}`,
    // "It lags" is unactionable without knowing what it lagged on.
    `Device: ${deviceLine()}`,
  ];

  const body = [
    strings.prompt,
    ...header,
    ...(reports.length === 0
      ? [strings.noCrash]
      : reports.map(
          (r, i) => `\n[${i + 1}] ${r.at} (${r.context})\n${r.message}\n${r.stack ?? ""}`,
        )),
  ].join("\n");

  return `mailto:${CONTACT_EMAIL}?subject=${encodeURIComponent(strings.subject)}&body=${encodeURIComponent(body)}`;
}

export async function clearCrashLog(): Promise<void> {
  try {
    await setPreference(CRASH_LOG_KEY, "[]");
  } catch {
    // Nothing to do — the row is the only copy and it is not worth a second attempt.
  }
}

/**
 * Catch uncaught JS errors. `ErrorUtils` is a React Native global, not a dependency.
 *
 * The previous handler is always called: in development it is what draws the red box, and
 * swallowing it would trade a visible crash for a silent one.
 */
export function installCrashHandler(): void {
  const globalHandlers = globalThis as unknown as {
    ErrorUtils?: {
      getGlobalHandler: () => (error: unknown, isFatal?: boolean) => void;
      setGlobalHandler: (handler: (error: unknown, isFatal?: boolean) => void) => void;
    };
  };
  const utils = globalHandlers.ErrorUtils;
  if (!utils) return;

  const previous = utils.getGlobalHandler();
  utils.setGlobalHandler((error, isFatal) => {
    recordCrash("fatal", error, isFatal !== false).catch(() => {
      // Deliberate silence, and the only one here: this runs *inside* the global error handler,
      // so reporting a failure to record a crash would re-enter the same path. Losing one crash
      // row is better than a loop while the app is already dying.
    });
    previous(error, isFatal);
  });
}
