import { addDays } from "date-fns";
import * as Linking from "expo-linking";
import { useFocusEffect } from "expo-router";
import { useCallback, useState } from "react";
import { useTranslation } from "react-i18next";
import { Button, Text, XStack, YStack } from "tamagui";
import { Chip } from "@/components/common/Chip";
import { Bell, Clock, Pause } from "@/components/icons";
import { SettingRow } from "@/components/settings/SettingRow";
import { getDateTimeFormat, getWeekStart } from "@/constants/dateFormatters";
import { dayKey } from "@/db/dates";
import { DEFAULT_WEEKLY_TARGET, getOath } from "@/db/oaths";
import {
  dayOf,
  describeDay,
  getReminderDays,
  getReminderSessions,
  missedReminder,
  type PlanInput,
  planReminders,
  type ReminderDays,
  type ReminderLogEntry,
  type ReminderSession,
  reminderPrefs,
  setReminderDays,
  suggestDays,
  suggestTime,
  WEEKDAYS,
  type Weekday,
} from "@/db/reminders";
import { getWeeklyQuota } from "@/db/streaks";
import { useHaptics } from "@/hooks/useHaptics";
import { requestNotificationPermission } from "@/modules/bati-location";
import * as Reminders from "@/modules/bati-reminders";
import { syncAccount } from "@/src/deviceSync";
import type { AppLanguage } from "@/src/i18n/deviceLanguage";
import { replanRemindersNow } from "@/src/reminders";
import { reportError } from "@/src/reportError";
import { useSettingsStore } from "@/stores/settings";

/** What the section shows, read on every focus: the switch and journal are the phone's, the days the hero's. */
type ReminderView = {
  enabled: boolean;
  days: ReminderDays;
  resumeDate: string | null;
  log: ReminderLogEntry[];
  sessions: ReminderSession[];
  streakFrom: string | null;
  /** The weekly oath's count, or null without a weekly oath still being kept. */
  weeklyOath: number | null;
  /** The flame's weekly count, the one `db/streaks.ts` counts with. */
  flameQuota: number;
  plannedOn: string | null;
  synced: boolean;
};

type Note = "denied" | "withdrawn" | "keep_one_day" | null;

const DONT_KILL_MY_APP = "https://dontkillmyapp.com";

async function readView(): Promise<{ view: ReminderView; withdrawn: boolean }> {
  const state = Reminders.getState();
  // The switch is on here but Android says no: the permission was taken back, or the channel set
  // to none. The switch follows Android, and Settings says why.
  const withdrawn = state.enabled && !Reminders.areEnabled();
  if (withdrawn) Reminders.setEnabled(false);
  const [days, sessions, streakFrom, oath, flameQuota, account] = await Promise.all([
    getReminderDays(),
    getReminderSessions(new Date()),
    reminderPrefs.streakFrom(),
    getOath(),
    getWeeklyQuota(),
    syncAccount().catch((e: unknown) => {
      reportError("reminders.syncAccount", e);
      return null;
    }),
  ]);
  return {
    withdrawn,
    view: {
      enabled: state.enabled && !withdrawn,
      days,
      resumeDate: state.resumeDate,
      log: state.log,
      sessions,
      streakFrom,
      weeklyOath:
        oath?.metric === "weekly_sessions" && oath.fulfilledAt === null
          ? (oath.weeklyTarget ?? DEFAULT_WEEKLY_TARGET)
          : null,
      flameQuota,
      plannedOn: state.plannedOn,
      synced: account !== null,
    },
  };
}

function hourLabel(time: string, language: AppLanguage): string {
  const [h, m] = time.split(":").map(Number);
  return getDateTimeFormat(language, {
    hour: "numeric",
    minute: "2-digit",
    hour12: !Reminders.is24Hour(),
  }).format(new Date(2026, 0, 1, h ?? 0, m ?? 0));
}

/** French and Spanish write weekdays in lower case; a label starts with a capital. */
function capitalized(text: string): string {
  return text.charAt(0).toLocaleUpperCase() + text.slice(1);
}

/** "Saturday", or "Saturday 17" once it is more than a week out, after a pause. */
function weekdayLabel(key: string, language: AppLanguage): string {
  const far = dayOf(key).getTime() - Date.now() > 6 * 24 * 60 * 60 * 1000;
  const options: Intl.DateTimeFormatOptions = far
    ? { weekday: "long", day: "numeric" }
    : { weekday: "long" };
  return capitalized(getDateTimeFormat(language, options).format(dayOf(key)));
}

/** The seven weekdays in the order the hero's calendar starts them, Sunday first in English. */
function orderedWeekdays(language: AppLanguage): Weekday[] {
  const start = getWeekStart(language);
  return [...WEEKDAYS.slice(start), ...WEEKDAYS.slice(0, start)];
}

/** One hour for every day: the hour of the first day chosen, or the one the history suggests. */
function hourOf(days: ReminderDays, sessions: ReminderSession[]): string {
  return Object.values(days)[0] ?? suggestTime(sessions);
}

/**
 * Settings > Reminder (docs/designs/rappels.md, "Réglages"). The switch first, the one-sentence
 * rule under it, then the days, the hour, the pause and a preview that always says why.
 *
 * Absent on a build without the native module (jest, iOS): there would be nothing behind it.
 */
export function ReminderSection() {
  const { t } = useTranslation();
  const language = useSettingsStore((s) => s.language);
  const haptics = useHaptics();
  const [view, setView] = useState<ReminderView | null>(null);
  const [note, setNote] = useState<Note>(null);
  // One write at a time: a second tap before the first is saved would read the days it replaced.
  const [busy, setBusy] = useState(false);

  const refresh = useCallback(() => {
    readView()
      .then(({ view: next, withdrawn }) => {
        setView(next);
        if (withdrawn) setNote("withdrawn");
      })
      .catch((error: unknown) => reportError("reminders.settingsRead", error));
  }, []);

  useFocusEffect(refresh);

  if (!Reminders.isAvailable() || view === null) return null;

  const today = dayKey(new Date());
  const time = hourOf(view.days, view.sessions);
  const chosen = orderedWeekdays(language).filter((d) => view.days[d] !== undefined);

  /**
   * Every change to the settings: shown at once, saved, counted from for ignored days, planned
   * again. Pausing and resuming count as a change too: days before them were never due.
   */
  const commit = async (days?: ReminderDays) => {
    if (days) {
      setView({ ...view, days });
      await setReminderDays(days);
    }
    await reminderPrefs.setStreakFrom(today);
    await replanRemindersNow();
    refresh();
  };
  const run = (context: string, work: () => Promise<void>) => {
    if (busy) return;
    setBusy(true);
    work()
      .catch((error: unknown) => reportError(context, error))
      .finally(() => setBusy(false));
  };

  const turnOn = async () => {
    const answer = await requestNotificationPermission();
    if (!answer.granted) {
      haptics.warning();
      setNote("denied");
      return;
    }
    setNote(null);
    // The first time, the days the journal says the hero trains on, at half an hour before the
    // usual hour. Days already chosen (on another device, or before) are kept as they are.
    const days =
      Object.keys(view.days).length > 0
        ? view.days
        : Object.fromEntries(
            suggestDays(view.sessions, new Date(), view.weeklyOath).map((d) => [
              d,
              suggestTime(view.sessions),
            ]),
          );
    Reminders.setEnabled(true);
    await commit(days);
  };

  const turnOff = async () => {
    Reminders.setEnabled(false);
    setNote(null);
    await commit();
  };

  const toggleDay = (day: Weekday) => {
    haptics.selection();
    const next = { ...view.days };
    if (next[day] !== undefined) {
      // The last day never unticks while the switch is on: an empty week is the switch's job.
      if (view.enabled && chosen.length === 1) {
        haptics.warning();
        setNote("keep_one_day");
        return;
      }
      delete next[day];
    } else {
      next[day] = time;
    }
    setNote(null);
    run("reminders.days", () => commit(next));
  };

  const pickHour = () => {
    haptics.selection();
    run("reminders.hour", async () => {
      const picked = await Reminders.pickTime(time);
      if (picked === null) return;
      await commit(Object.fromEntries(chosen.map((d) => [d, picked])));
    });
  };

  const pauseFor = (weeks: number) => {
    haptics.selection();
    run("reminders.pause", async () => {
      Reminders.pause(dayKey(addDays(new Date(), weeks * 7)));
      await commit();
    });
  };

  const resume = () => {
    haptics.selection();
    run("reminders.resume", async () => {
      Reminders.resume();
      await commit();
    });
  };

  return (
    <YStack gap="$3" testID="settings-reminder">
      <Text fontSize="$3" fontWeight="bold" color="$textSecondary" px="$1" mt="$2">
        {t("reminders.section")}
      </Text>

      <SettingRow
        testID="settings-reminder-switch"
        icon={<Bell size={22} color="$text" />}
        label={t("reminders.switch")}
        value={view.enabled ? t("common.on", "On") : t("common.off", "Off")}
        onPress={() => {
          haptics.selection();
          run("reminders.switch", view.enabled ? turnOff : turnOn);
        }}
      />

      <Text fontSize="$2" color="$textSecondary" px="$3">
        {t("reminders.rule")}
      </Text>

      <NoteLine note={note} />

      <DaysRow view={view} language={language} onToggle={toggleDay} disabled={!view.enabled} />

      <GapLine view={view} chosen={chosen.length} />

      <SettingRow
        testID="settings-reminder-hour"
        icon={<Clock size={22} color="$text" />}
        label={t("reminders.hour")}
        value={hourLabel(time, language)}
        disabled={!view.enabled}
        onPress={pickHour}
      />

      {view.enabled ? (
        <PauseRow
          resumeDate={view.resumeDate}
          today={today}
          language={language}
          onPause={pauseFor}
          onResume={resume}
        />
      ) : null}

      <Preview view={view} language={language} time={time} />

      {view.synced ? (
        <Text fontSize="$2" color="$textSecondary" px="$3">
          {t("reminders.one_device")}
        </Text>
      ) : null}

      <Text
        testID="settings-reminder-sound"
        fontSize="$2"
        color="$primaryText"
        px="$3"
        accessibilityRole="link"
        onPress={() => Reminders.openChannelSettings(t("reminders.channel"))}
      >
        {t("reminders.sound")}
      </Text>
    </YStack>
  );
}

function NoteLine({ note }: { note: Note }) {
  const { t } = useTranslation();
  if (note === null) return null;
  return (
    <YStack px="$3" gap="$1" testID={`settings-reminder-note-${note}`}>
      <Text fontSize="$2" color="$warning">
        {t(`reminders.${note}`)}
      </Text>
      {note === "keep_one_day" ? null : (
        <Text
          fontSize="$2"
          color="$primaryText"
          accessibilityRole="link"
          onPress={() => {
            Linking.openSettings().catch((e: unknown) => reportError("reminders.openSettings", e));
          }}
        >
          {t("reminders.open_settings")}
        </Text>
      )}
    </YStack>
  );
}

function DaysRow({
  view,
  language,
  onToggle,
  disabled,
}: {
  view: ReminderView;
  language: AppLanguage;
  onToggle: (day: Weekday) => void;
  disabled: boolean;
}) {
  const { t } = useTranslation();
  const narrow = getDateTimeFormat(language, { weekday: "narrow" });
  const long = getDateTimeFormat(language, { weekday: "long" });
  return (
    <YStack gap="$2" px="$1" opacity={disabled ? 0.5 : 1}>
      <Text fontSize="$3" color="$text" px="$2">
        {t("reminders.days")}
      </Text>
      <XStack gap="$1" justify="space-between">
        {orderedWeekdays(language).map((day) => {
          // 4 January 2026 is a Sunday: the weekday's own name, in the hero's language.
          const date = new Date(2026, 0, 4 + WEEKDAYS.indexOf(day));
          const on = view.days[day] !== undefined;
          const name = capitalized(long.format(date));
          return (
            <Button
              key={day}
              testID={`settings-reminder-day-${day}`}
              size="$4"
              circular
              disabled={disabled}
              bg={on ? "$primary" : "$surface"}
              borderColor="$borderStrong"
              borderWidth={1}
              onPress={() => onToggle(day)}
              // `role`, not only `accessibilityRole`: Tamagui's Button sets role="button", and in
              // React Native `role` wins, so TalkBack read a button with no state.
              role="checkbox"
              accessibilityRole="checkbox"
              accessibilityState={{ checked: on, disabled }}
              // The name alone: TalkBack adds "checked" from the state, "Tuesday, checked".
              accessibilityLabel={name}
            >
              <Text fontWeight="700" color="$text">
                {narrow.format(date)}
              </Text>
            </Button>
          );
        })}
      </XStack>
    </YStack>
  );
}

/**
 * Grey, never a popup, gone the moment it stops being true: fewer days than the oath asks for, or,
 * without a weekly oath, fewer than the flame feeds on. With a weekly oath the flame takes its count
 * (`getWeeklyQuota`), so one line says it.
 */
function GapLine({ view, chosen }: { view: ReminderView; chosen: number }) {
  const { t } = useTranslation();
  if (!view.enabled) return null;
  let text: string | null = null;
  if (view.weeklyOath !== null && chosen < view.weeklyOath) {
    text = t("reminders.oath_gap", {
      count: view.weeklyOath,
      days: t("reminders.days_count", { count: chosen }),
    });
  } else if (view.weeklyOath === null && chosen < view.flameQuota) {
    text = t("reminders.flame_gap", { count: view.flameQuota });
  }
  if (text === null) return null;
  return (
    <Text testID="settings-reminder-gap" fontSize="$2" color="$textSecondary" px="$3">
      {text}
    </Text>
  );
}

function PauseRow({
  resumeDate,
  today,
  language,
  onPause,
  onResume,
}: {
  resumeDate: string | null;
  today: string;
  language: AppLanguage;
  onPause: (weeks: number) => void;
  onResume: () => void;
}) {
  const { t } = useTranslation();
  if (resumeDate !== null && resumeDate > today) {
    const date = getDateTimeFormat(language, { weekday: "long", day: "numeric" }).format(
      dayOf(resumeDate),
    );
    return (
      <XStack px="$3" items="center" gap="$3">
        <Text flex={1} fontSize="$3" color="$text" testID="settings-reminder-paused">
          {t("reminders.paused", { date })}
        </Text>
        <Chip testID="settings-reminder-resume" label={t("reminders.resume")} onPress={onResume} />
      </XStack>
    );
  }
  return (
    <XStack px="$3" items="center" gap="$2">
      <Pause size={18} color="$textSecondary" />
      <Text flex={1} fontSize="$3" color="$text">
        {t("reminders.pause_row")}
      </Text>
      {[1, 2].map((weeks) => (
        <Chip
          key={weeks}
          testID={`settings-reminder-pause-${weeks}`}
          label={t("reminders.pause_weeks", { count: weeks })}
          onPress={() => onPause(weeks)}
        />
      ))}
    </XStack>
  );
}

/**
 * The preview always says why: the next reminder, or why today or tomorrow stays quiet, and the
 * last one that rang, which is the proof it works. When one that should have rung is missing from
 * the journal, the phone probably killed it, and the only fix is in its settings.
 */
function Preview({
  view,
  language,
  time,
}: {
  view: ReminderView;
  language: AppLanguage;
  time: string;
}) {
  const { t } = useTranslation();
  if (!view.enabled) {
    return (
      <Text testID="settings-reminder-preview" fontSize="$3" color="$textSecondary" px="$3">
        {t("reminders.off")}
      </Text>
    );
  }

  const now = new Date();
  const input: PlanInput = {
    days: view.days,
    now,
    sessions: view.sessions,
    // Settings is never open during a session.
    sessionActive: false,
    state: { resumeDate: view.resumeDate, log: view.log },
    // The words do not matter here, only the days.
    offer: { kind: "gallery" },
    oath: null,
    language,
    t: (key) => key,
  };
  const next = planReminders(input).entries[0];
  const day = describeDay(input);
  const last = [...view.log].reverse().find((e) => e.postedAt);
  const missed = missedReminder(
    view.days,
    view.log,
    view.sessions,
    now,
    view.streakFrom,
    view.resumeDate,
    view.plannedOn,
  );

  return (
    <YStack px="$3" gap="$1" testID="settings-reminder-preview">
      {day.today ? (
        <Text fontSize="$3" color="$textSecondary">
          {t(`reminders.today_${day.today}`)}
        </Text>
      ) : null}
      {day.restTomorrow ? (
        <Text fontSize="$3" color="$textSecondary">
          {t("reminders.tomorrow_rest")}
        </Text>
      ) : null}
      <Text fontSize="$3" color="$text">
        {next
          ? t("reminders.next", {
              day: weekdayLabel(next.date, language),
              time: hourLabel(next.time || time, language),
            })
          : t("reminders.none")}
      </Text>
      {last?.postedAt ? (
        <Text fontSize="$3" color="$textSecondary">
          {t("reminders.last", {
            day: weekdayLabel(last.date, language),
            time: hourLabel(last.postedAt, language),
          })}
        </Text>
      ) : null}
      {missed ? <MissedLine day={weekdayLabel(missed, language)} /> : null}
    </YStack>
  );
}

function MissedLine({ day }: { day: string }) {
  const { t } = useTranslation();
  return (
    <YStack gap="$1" testID="settings-reminder-missed">
      <Text fontSize="$3" color="$warning">
        {t("reminders.blocked", { day })}
      </Text>
      <XStack gap="$3">
        <Text
          fontSize="$2"
          color="$primaryText"
          accessibilityRole="link"
          onPress={() => {
            Linking.openSettings().catch((e: unknown) => reportError("reminders.openSettings", e));
          }}
        >
          {t("reminders.battery")}
        </Text>
        <Text
          fontSize="$2"
          color="$primaryText"
          accessibilityRole="link"
          onPress={() => {
            Linking.openURL(DONT_KILL_MY_APP).catch((e: unknown) =>
              reportError("reminders.dontKillMyApp", e),
            );
          }}
        >
          {t("reminders.battery_help")}
        </Text>
      </XStack>
    </YStack>
  );
}
