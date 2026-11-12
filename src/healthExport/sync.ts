import { forgetHealthExported, healthExportWork, markHealthExported } from "@/db/healthExport";
import {
  deletePreference,
  getDeviceId,
  getPreference,
  preferences,
  setPreference,
} from "@/db/preferences";
import { i18n } from "@/i18n";
import { resolveAppLanguage } from "@/src/i18n/deviceLanguage";
import type { HealthPort } from "./port";
import { healthRecordId, type NotesFormat, toHealthRecord } from "./record";

/**
 * When the switch was turned on, epoch ms; absent while it is off. Device-local
 * (`DEVICE_LOCAL_PREFERENCES`): the switch describes this phone's Health Connect.
 */
export const HEALTH_EXPORT_SINCE = "healthExportSince";

export type HealthExportState =
  | { kind: "unavailable" }
  | { kind: "off" }
  | { kind: "on"; pending: number }
  /** On in Bati, taken back in Android: nothing is written, nothing owed is dropped. */
  | { kind: "withdrawn"; pending: number };

async function exportSince(): Promise<Date | null> {
  const value = await getPreference(HEALTH_EXPORT_SINCE);
  return value === null ? null : new Date(Number(value));
}

async function owedWork(since: Date) {
  const language = resolveAppLanguage(await preferences.getLanguage());
  const t = (key: string, options?: Record<string, unknown>) =>
    i18n.t(key, { ...options, lng: language });
  const format: NotesFormat = {
    figure: (type, value) =>
      type === "time" ? t("healthExport.notes_seconds", { count: value }) : `${value}`,
    line: (name, figures) => t("healthExport.notes_line", { name, figures: figures.join(", ") }),
  };
  const work = await healthExportWork(
    await getDeviceId(),
    since,
    language,
    t("healthExport.fallback_title"),
  );
  return { ...work, format };
}

/** What the setting shows. Never asks Health Connect anything when it is absent. */
export async function readHealthExportState(port: HealthPort): Promise<HealthExportState> {
  if (!port.available()) return { kind: "unavailable" };
  const since = await exportSince();
  if (since === null) return { kind: "off" };
  const { write, remove } = await owedWork(since);
  const pending = write.length + remove.length;
  return (await port.hasPermission()) ? { kind: "on", pending } : { kind: "withdrawn", pending };
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

/** Stops writing. What Health Connect already holds stays there: it is the hero's, in their app. */
export function turnHealthExportOff(): Promise<void> {
  return deletePreference(HEALTH_EXPORT_SINCE);
}

let running: Promise<void> | null = null;
let again = false;

/**
 * Brings Health Connect in line with the journal: writes what is owed, takes back what was deleted.
 * One run at a time; a call during a run asks for one more after it. Throws on the first refusal,
 * which leaves the rest owed for the next run, and says nothing to the hero.
 */
export function syncHealthConnect(port: HealthPort): Promise<void> {
  if (running) {
    again = true;
    return running;
  }
  running = (async () => {
    do {
      again = false;
      await syncOnce(port);
    } while (again);
  })().finally(() => {
    running = null;
  });
  return running;
}

async function syncOnce(port: HealthPort): Promise<void> {
  if (!port.available()) return;
  const since = await exportSince();
  if (since === null || !(await port.hasPermission())) return;

  const { write, remove, format } = await owedWork(since);
  for (const session of write) {
    await port.upsert(toHealthRecord(session, format));
    await markHealthExported(session.uuid, session.version);
  }
  if (remove.length > 0) {
    await port.remove(remove.map(healthRecordId));
    await forgetHealthExported(remove);
  }
}
