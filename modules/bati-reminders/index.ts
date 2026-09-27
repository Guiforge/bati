// Via `expo` rather than `expo-modules-core`, for the reason given in modules/bati-location.
import { requireOptionalNativeModule } from "expo";
import type { ReminderLogEntry, ReminderPlan } from "@/db/reminders";

/**
 * The JS half of local reminders (docs/designs/rappels.md). The native half stores the plan, arms
 * it and posts it; `planReminders` in `db/reminders.ts` decides everything it is handed.
 *
 * Absent in jest and on any build without the module: `requireOptionalNativeModule` returns null,
 * every call below answers as if the reminders were off, and nothing throws.
 */
type BatiRemindersNativeModule = {
  setPlan(json: string): boolean;
  setEnabled(enabled: boolean): boolean;
  pause(resumeDate: string): boolean;
  resume(): boolean;
  getState(): string | null;
  areEnabled(): boolean;
};

const native = requireOptionalNativeModule<BatiRemindersNativeModule>("BatiReminders");

/** What the native side is handed: the plan, the numbers it keeps to, and the words it cannot know. */
export type NativePlan = ReminderPlan & {
  /** `REMINDER_HORIZON_DAYS`, `REMINDER_PAUSE_DAYS` and `REMINDER_LATE_MINUTES`: one home each. */
  horizonDays: number;
  pauseDays: number;
  lateMinutes: number;
  /** The notification channel's name in Android's settings, in the app's language. */
  channelName: string;
  /** The two buttons: "In 1 hour" and "Pause 7 days". */
  actionLabels: { snooze: string; pause: string };
};

/** What this phone kept. The switch, the pause and the journal never leave it. */
export type NativeReminderState = {
  enabled: boolean;
  resumeDate: string | null;
  log: ReminderLogEntry[];
};

const OFF: NativeReminderState = { enabled: false, resumeDate: null, log: [] };

export function isAvailable(): boolean {
  return native !== null;
}

export function setPlan(plan: NativePlan): void {
  native?.setPlan(JSON.stringify(plan));
}

export function setEnabled(enabled: boolean): void {
  native?.setEnabled(enabled);
}

/** Nothing rings before `resumeDate` (local `yyyy-MM-dd`), which rings as usual. */
export function pause(resumeDate: string): void {
  native?.pause(resumeDate);
}

export function resume(): void {
  native?.resume();
}

/** Also marks a reminder the app was just opened from, which the native half reads off the intent. */
export function getState(): NativeReminderState {
  const raw = native?.getState() ?? null;
  if (raw === null) return OFF;
  const parsed = JSON.parse(raw) as Partial<NativeReminderState>;
  return {
    enabled: parsed.enabled === true,
    resumeDate: parsed.resumeDate ?? null,
    log: (parsed.log ?? []).map((e) => ({
      date: e.date,
      variant: e.variant ?? null,
      snoozed: e.snoozed === true,
      opened: e.opened === true,
      paused: e.paused === true,
    })),
  };
}

/** The permission is granted and the reminders' channel is not switched off. */
export function areEnabled(): boolean {
  return native?.areEnabled() ?? false;
}
