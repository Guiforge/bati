import {
  type ExportKey,
  exportSessions,
  forgetHealthExported,
  healthExportPlan,
  healthExportStatusOf,
  markHealthExported,
  markHealthFailed,
  markHealthWriting,
} from "@/db/healthExport";
import {
  deletePreference,
  getDeviceId,
  getPreference,
  preferences,
  setPreference,
} from "@/db/preferences";
import { i18n } from "@/i18n";
import { resolveAppLanguage } from "@/src/i18n/deviceLanguage";
import { reportError } from "@/src/reportError";
import { type HealthPort, isHealthRefused } from "./port";
import { healthRecordIds, type NotesFormat, toHealthRecord } from "./record";

/**
 * Device-local preferences (`DEVICE_LOCAL_PREFERENCES`): the switch, its options and the history
 * run describe this phone's Health Connect.
 *
 * - since: when the switch was turned on, epoch ms; absent while it is off.
 * - route: "1" while "with the GPS route" is on.
 * - historyAsked: "1" once "send your past sessions too?" was asked. Never asked again.
 * - historyRunning: "1" while past sessions are being sent. The only state a run keeps: what is
 *   left is recomputed from the journal, so a kill resumes and nothing is sent twice.
 */
export const HEALTH_EXPORT_SINCE = "healthExportSince";
export const HEALTH_EXPORT_ROUTE = "healthExportRoute";
export const HEALTH_HISTORY_ASKED = "healthHistoryAsked";
export const HEALTH_HISTORY_RUNNING = "healthHistoryRunning";

/**
 * Entries written between two yields to the UI. Each entry is its own Health Connect call (one
 * session, plus its distance), so one refused record never refuses its neighbours and a long route
 * never meets another in the same request; twenty calls keep a frame budget's worth of JS between
 * yields. Health Connect asks for at most 1,000 records per write request and publishes no figure
 * for its call quotas, only that foreground is the looser one: a rate-limited call leaves the entry
 * owed and the next run picks it up.
 */
export const HEALTH_EXPORT_BATCH = 20;

export type HealthHistory = {
  /** Past sessions are being sent, or paused by a missing permission. */
  running: boolean;
  /** Eligible entries, and how many of them this phone has sent or tried. */
  done: number;
  total: number;
  /** What a history run would still send. */
  left: number;
};

type Details = {
  pending: number;
  failed: number;
  /** "With the GPS route": on, and Android still allows it. */
  route: boolean;
  history: HealthHistory;
};

export type HealthExportState =
  | { kind: "unavailable" }
  | { kind: "off" }
  | ({ kind: "on" } & Details)
  /** On in Bati, taken back in Android: nothing is written, nothing owed is dropped. */
  | ({ kind: "withdrawn" } & Details);

async function exportSince(): Promise<Date | null> {
  const value = await getPreference(HEALTH_EXPORT_SINCE);
  return value === null ? null : new Date(Number(value));
}

async function flag(key: string): Promise<boolean> {
  return (await getPreference(key)) === "1";
}

/**
 * Whether outings sent now carry their route: the option is on and Android still allows it. A
 * permission taken back in Android turns the option off, so the screen says what is true.
 */
async function routeOption(port: HealthPort): Promise<boolean> {
  if (!(await flag(HEALTH_EXPORT_ROUTE))) return false;
  if (await port.hasRoutePermission()) return true;
  await deletePreference(HEALTH_EXPORT_ROUTE);
  return false;
}

/** The hero's language, the notes format and the fallback title, as the next write uses them. */
export async function healthExportWording() {
  const language = resolveAppLanguage(await preferences.getLanguage());
  const t = (key: string, options?: Record<string, unknown>) =>
    i18n.t(key, { ...options, lng: language });
  const format: NotesFormat = {
    figure: (type, value) =>
      type === "time" ? t("healthExport.notes_seconds", { seconds: value }) : `${value}`,
    line: (name, figures) => t("healthExport.notes_line", { name, figures: figures.join(", ") }),
  };
  return { language, format, fallbackTitle: t("healthExport.fallback_title") };
}

/** What the setting shows. Never asks Health Connect anything when it is absent. */
export async function readHealthExportState(port: HealthPort): Promise<HealthExportState> {
  if (!port.available()) return { kind: "unavailable" };
  const since = await exportSince();
  if (since === null) return { kind: "off" };
  const plan = await healthExportPlan(await getDeviceId(), since);
  const details: Details = {
    pending: plan.owed.length + plan.remove.length,
    failed: plan.failed,
    route: await routeOption(port),
    history: {
      running: await flag(HEALTH_HISTORY_RUNNING),
      done: plan.done,
      total: plan.total,
      left: plan.history.length,
    },
  };
  return (await port.hasPermission())
    ? { kind: "on", ...details }
    : { kind: "withdrawn", ...details };
}

/** The session detail's line: only where Health Connect is, the switch is on, and this phone owes or wrote it. */
export async function healthExportStatus(
  port: HealthPort,
  sessionUuid: string,
): Promise<"sent" | "waiting" | null> {
  if (!port.available()) return null;
  const since = await exportSince();
  if (since === null) return null;
  return healthExportStatusOf(
    sessionUuid,
    await getDeviceId(),
    since,
    await flag(HEALTH_HISTORY_RUNNING),
  );
}

/**
 * Asks Health Connect for the permission and turns the switch on if it was given. A switch already
 * on (the permission taken back in Android) keeps its date, so what waited is still sent.
 */
export async function turnHealthExportOn(port: HealthPort): Promise<boolean> {
  if (!(await port.requestPermission())) return false;
  if ((await exportSince()) === null) await setPreference(HEALTH_EXPORT_SINCE, String(Date.now()));
  return true;
}

/**
 * Stops writing, and with it the route option and a history run. What Health Connect already holds
 * stays there: it is the hero's, in their app. Whether past sessions were asked about stays too.
 */
export async function turnHealthExportOff(): Promise<void> {
  await deletePreference(HEALTH_EXPORT_SINCE);
  await deletePreference(HEALTH_EXPORT_ROUTE);
  await deletePreference(HEALTH_HISTORY_RUNNING);
}

/**
 * "With the GPS route": asks Android for the route permission, only now. Applies to outings sent
 * from now on; nothing already sent is rewritten. False when it was refused, and the option stays off.
 */
export async function turnHealthRouteOn(port: HealthPort): Promise<boolean> {
  if (!(await port.requestRoutePermission())) return false;
  await setPreference(HEALTH_EXPORT_ROUTE, "1");
  return true;
}

/** Outings sent from now on go without their route. Routes already sent stay. */
export function turnHealthRouteOff(): Promise<void> {
  return deletePreference(HEALTH_EXPORT_ROUTE);
}

/**
 * Whether to ask "send your past sessions too?" now: once, the first time the switch is on, and
 * only when there is something to send. Asking is recorded here, so it never comes back by itself.
 */
export async function takeHistoryQuestion(): Promise<boolean> {
  if ((await exportSince()) === null || (await flag(HEALTH_HISTORY_ASKED))) return false;
  await setPreference(HEALTH_HISTORY_ASKED, "1");
  const plan = await healthExportPlan(await getDeviceId(), new Date());
  return plan.history.length > 0;
}

/** Sends past sessions: the same pipeline, run over the whole journal. */
export async function startHealthHistory(): Promise<void> {
  await setPreference(HEALTH_HISTORY_ASKED, "1");
  await setPreference(HEALTH_HISTORY_RUNNING, "1");
}

/** Stops before the next batch. What was sent stays; starting again continues. */
export function stopHealthHistory(): Promise<void> {
  return deletePreference(HEALTH_HISTORY_RUNNING);
}

let running: Promise<void> | null = null;
let again = false;

/**
 * Brings Health Connect in line with the journal: writes what is owed (and past sessions while a
 * history run is on), takes back what was deleted. One run at a time; a call during a run asks for
 * one more after it. Rejects with the first error that left something owed, after writing the rest;
 * says nothing to the hero.
 */
export function syncHealthConnect(port: HealthPort): Promise<void> {
  if (running) {
    again = true;
    return running;
  }
  running = (async () => {
    try {
      do {
        again = false;
        try {
          await syncOnce(port);
        } catch (e) {
          // A call that came during a failed run still gets its run.
          if (!again) throw e;
        }
      } while (again);
    } finally {
      running = null;
    }
  })();
  return running;
}

const yieldToUi = () => new Promise<void>((resolve) => setTimeout(resolve, 0));

type Run = {
  port: HealthPort;
  since: Date;
  deviceId: string;
  wording: Awaited<ReturnType<typeof healthExportWording>>;
  /**
   * Each entry is tried once per run. One that failed for the moment (not refused) stays owed for
   * the next run, and nothing can make the loop spin on it.
   */
  tried: Set<string>;
  /** The first error that left something owed; thrown once the rest is written. */
  failure: unknown;
};

async function syncOnce(port: HealthPort): Promise<void> {
  if (!port.available()) return;
  const since = await exportSince();
  if (since === null || !(await port.hasPermission())) return;

  const run: Run = {
    port,
    since,
    deviceId: await getDeviceId(),
    wording: await healthExportWording(),
    tried: new Set(),
    failure: null,
  };
  for (;;) {
    const step = await nextBatch(run);
    // Switched off, or the permission taken back: a pause, not an error. Nothing is lost.
    if (step === "stopped") return;
    if (step === "done") break;
    await yieldToUi();
  }
  if (run.failure !== null) throw run.failure;
}

/** One batch. Recomputed from the journal each time: a session finished meanwhile goes first. */
async function nextBatch(run: Run): Promise<"more" | "done" | "stopped"> {
  // The hero can switch off while a backlog is being written: stop before the next batch.
  if ((await exportSince()) === null) return "stopped";
  const plan = await healthExportPlan(run.deviceId, run.since);
  const history = await flag(HEALTH_HISTORY_RUNNING);
  const next = [...plan.owed, ...(history ? plan.history : [])]
    .filter((key) => !run.tried.has(key.uuid))
    .slice(0, HEALTH_EXPORT_BATCH);
  for (const key of next) run.tried.add(key.uuid);

  if (next.length > 0) return writeBatch(run, next);

  if (plan.remove.length > 0) {
    try {
      await run.port.remove(plan.remove.flatMap(healthRecordIds));
      await forgetHealthExported(plan.remove);
    } catch (e) {
      run.failure ??= e;
    }
  }
  // Everything is sent or refused: the run is over. One that failed for the moment keeps it on.
  if (history && plan.history.length === 0) await deletePreference(HEALTH_HISTORY_RUNNING);
  return "done";
}

async function writeBatch(run: Run, keys: ExportKey[]): Promise<"more" | "stopped"> {
  const { port } = run;
  const { language, format, fallbackTitle } = run.wording;
  const routeAllowed = await port.hasRoutePermission();
  const routeOn = routeAllowed && (await routeOption(port));
  // A record keeps the route choice of its first write; a new one takes the option's.
  const withRoute = (key: ExportKey) => routeAllowed && (key.route ?? routeOn);
  const firstWrite = new Set(keys.filter((key) => key.route === null).map((key) => key.uuid));
  for (const session of await exportSessions(keys, language, fallbackTitle, withRoute)) {
    if ((await exportSince()) === null) return "stopped";
    const record = toHealthRecord(session, format);
    try {
      if (firstWrite.has(session.uuid))
        await markHealthWriting(session.uuid, record.route !== null);
      await port.upsert(record);
      await markHealthExported(session.uuid, session.version, record.route !== null);
    } catch (e) {
      if (isHealthRefused(e)) {
        await markHealthFailed(session.uuid, session.version, e.message);
        reportError("healthExport.refused", e);
        continue;
      }
      run.failure ??= e;
      // Permission taken back mid-run: pause. Nothing is lost, the next run resumes.
      if (!(await port.hasPermission())) return "stopped";
    }
  }
  return "more";
}
