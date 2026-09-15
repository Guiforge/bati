import { useRouter } from "expo-router";
import type { TFunction } from "i18next";
import { useTranslation } from "react-i18next";
import { XStack, YStack } from "tamagui";
import { Flame, Medal } from "@/components/icons";
import {
  ageOf,
  dayAfter,
  daysUntil,
  formatHold,
  formatWallValue,
  targetToBeat,
} from "@/components/journal/journalFormat";
import {
  NBar,
  NBlock,
  NButton,
  NImage,
  NKicker,
  NKickerQuiet,
  NMuted,
  NNum,
  NRule,
  NText,
} from "@/components/journal/nocturne";
import { getExerciseThumb } from "@/constants/assetMap";
import { getDateTimeFormat } from "@/constants/dateFormatters";
import { formatDistance } from "@/constants/distanceFormat";
import { dayKey } from "@/db/dates";
import type { DayActivity, WallEntry } from "@/db/journal";
import { MUSCLE_LABELS } from "@/db/muscles";
import { inSentence, localizedName, localizedTitle } from "@/src/i18n/localized";
import { type AppLanguage, useSettingsStore } from "@/stores/settings";
import type { JournalStats } from "./useJournalStats";

const DAY_MS = 24 * 60 * 60 * 1000;
/** A record older than this is an old debt, and the wall says so. */
const STALE_RECORD_DAYS = 60;

const fmt = (language: AppLanguage, options: Intl.DateTimeFormatOptions, date: Date) =>
  getDateTimeFormat(language, options).format(date);
const shortDate = (language: AppLanguage, date: Date) =>
  fmt(language, { day: "numeric", month: "short" }, date);
const monthName = (language: AppLanguage, date: Date) => fmt(language, { month: "long" }, date);
const number = (language: AppLanguage, value: number) =>
  new Intl.NumberFormat(language).format(Math.round(value));

type Mode = "firstDay" | "veteran" | "rest" | "regular";

/**
 * Which story the page tells. A first day has nothing; a veteran whose records have all aged has
 * old debts; a day with nothing logged yet is a rest day, and rest days cost nothing; anything
 * else is an ordinary day with something to beat tonight.
 */
function modeOf(stats: JournalStats): Mode {
  if (stats.isFirstDay) return "firstDay";
  const latest = stats.allTime.latestRecord?.at ?? null;
  const yearIn =
    stats.firstSessionAt != null &&
    stats.now.getTime() - stats.firstSessionAt.getTime() >= 365 * DAY_MS;
  if (
    yearIn &&
    (latest == null || stats.now.getTime() - latest.getTime() > STALE_RECORD_DAYS * DAY_MS)
  ) {
    return "veteran";
  }
  return stats.trainedToday ? "regular" : "rest";
}

function whenWord(t: TFunction, language: AppLanguage, at: Date, now: Date): string {
  const age = ageOf(at, now);
  if (age.kind === "today") return t("journal.when_today");
  if (age.kind === "yesterday") return t("journal.when_yesterday");
  return t("journal.when_on", { date: shortDate(language, at) });
}

type LeadText = { plain: string; accent: string };

function veteranLead(t: TFunction, language: AppLanguage, stats: JournalStats): LeadText {
  const { now, firstSessionAt, allTime } = stats;
  const years = firstSessionAt
    ? Math.floor((now.getTime() - firstSessionAt.getTime()) / (365 * DAY_MS))
    : 1;
  const latest = allTime.latestRecord?.at;
  return {
    plain: t("journal.lead_veteran", {
      count: years,
      quests: number(language, allTime.quests),
      reps: number(language, allTime.reps),
    }),
    accent: latest
      ? t("journal.lead_veteran_since", {
          month: `${monthName(language, latest)} ${latest.getFullYear()}`,
        })
      : "",
  };
}

function restLead(t: TFunction, language: AppLanguage, stats: JournalStats): LeadText {
  const { flame, now } = stats;
  if (flame.litUntil == null) {
    return { plain: t("journal.lead_rest_out", { count: flame.quota }), accent: "" };
  }
  const day = dayLabel(t, language, dayAfter(flame.litUntil), now);
  return {
    plain: day
      ? t("journal.lead_rest_lit", { day })
      : t("journal.lead_rest_lit_days", { count: daysUntil(flame.litUntil, now) + 1 }),
    accent: "",
  };
}

function regularLead(t: TFunction, language: AppLanguage, stats: JournalStats): LeadText {
  const { month, now } = stats;
  const monthLabel = monthName(language, now);
  const outings = month.current.outings;
  let plain: string;
  if (month.questDays === 0 && outings === 0) {
    plain = t("journal.lead_nothing_month", { month: monthLabel });
  } else if (outings > 0) {
    plain = t("journal.lead_month_outings", {
      count: month.questDays,
      month: monthLabel,
      outings: t("journal.lead_outings", { count: outings }),
    });
  } else {
    plain = t("journal.lead_month", { count: month.questDays, month: monthLabel });
  }
  const record = month.current.latestRecord;
  const name = record?.exerciseName;
  return {
    plain,
    accent:
      record && name
        ? t("journal.lead_record", {
            movement: inSentence(name[language] || name.en, language),
            when: whenWord(t, language, record.at, now),
          })
        : "",
  };
}

/**
 * The sentence at the top: a template with holes, filled from numbers already read. One story per
 * mode, so a rest day never reads like a regular day that forgot to train.
 */
function Lead({ stats, mode }: { stats: JournalStats; mode: Mode }) {
  const { t } = useTranslation();
  const language = useSettingsStore((s) => s.language);
  const { plain, accent } =
    mode === "firstDay"
      ? { plain: t("journal.lead_empty"), accent: "" }
      : mode === "veteran"
        ? veteranLead(t, language, stats)
        : mode === "rest"
          ? restLead(t, language, stats)
          : regularLead(t, language, stats);

  return (
    <NText testID="journal-lead" px={11} pb={11} fontSize={15} lineHeight={22}>
      {plain}
      {accent ? " " : ""}
      {accent ? (
        <NText fontWeight="600" color="$gold300">
          {accent}
        </NText>
      ) : null}
    </NText>
  );
}

/**
 * "tomorrow" or "Thursday" inside a week, null past it: a weekday a fortnight away names the wrong
 * one, and a date would need its own preposition in every language. The caller counts days then.
 */
function dayLabel(t: TFunction, language: AppLanguage, day: Date, now: Date): string | null {
  const inDays = daysUntil(day, now);
  if (inDays <= 1) return t("journal.when_tomorrow");
  if (inDays < 7)
    return t("journal.day_weekday", { weekday: fmt(language, { weekday: "long" }, day) });
  return null;
}

function wallSub(t: TFunction, language: AppLanguage, entry: WallEntry, now: Date): string {
  if (entry.best == null || entry.recordAt == null) return t("journal.wall_never");
  const best = formatWallValue(entry.best, entry.type);
  const age = ageOf(entry.recordAt, now);
  const when =
    age.kind === "today"
      ? t("journal.when_set_today")
      : age.kind === "yesterday"
        ? t("journal.when_set_yesterday")
        : age.kind === "months"
          ? t("journal.months_ago", { count: age.count })
          : age.kind === "years"
            ? t("journal.years_ago", { count: age.count })
            : shortDate(language, entry.recordAt);
  if (entry.firstEver) return t("journal.wall_sub_first", { best, when });
  if (entry.last != null && entry.last < entry.best) {
    return t("journal.wall_sub_last", {
      best,
      when,
      last: formatWallValue(entry.last, entry.type),
    });
  }
  return t("journal.wall_sub", { best, when });
}

function Wall({ stats, mode }: { stats: JournalStats; mode: Mode }) {
  const { t } = useTranslation();
  const router = useRouter();
  const language = useSettingsStore((s) => s.language);
  const title =
    mode === "firstDay"
      ? t("journal.wall_empty")
      : mode === "veteran"
        ? t("journal.wall_old")
        : mode === "rest"
          ? t("journal.wall_standing")
          : t("journal.wall_tonight");

  return (
    <YStack testID="journal-wall">
      <XStack px={11} items="baseline" justify="space-between" gap={11}>
        <NKicker>{title}</NKicker>
        <NMuted fontSize={11} style={{ textAlign: "right", flexShrink: 1 }}>
          {t("journal.wall_meta")}
        </NMuted>
      </XStack>
      <YStack px={11} pt={8} gap={6}>
        {stats.wall.map((entry) => {
          const age = entry.recordAt ? ageOf(entry.recordAt, stats.now).kind : null;
          // A record that fell today or yesterday is still news: ringed, and tagged.
          const fresh = age === "today" || age === "yesterday";
          const target = targetToBeat(entry.best);
          return (
            <XStack
              key={`${entry.exerciseId}:${entry.type}`}
              testID="journal-wall-row"
              onPress={() => router.push(`/exercises/${entry.exerciseId}` as never)}
              accessibilityRole="button"
              items="center"
              gap={11}
              p={8}
              minH={48}
              rounded={8}
              bg="$surface2"
              borderWidth={fresh ? 1 : 0}
              borderColor="$gold700"
              opacity={entry.best == null ? 0.8 : 1}
              pressStyle={{ opacity: 0.85 }}
            >
              <NImage source={getExerciseThumb(entry.imagePath)} size={44} />
              <YStack flex={1} minW={0}>
                <XStack items="center" gap={6}>
                  <NText fontWeight="500" fontSize={16} numberOfLines={1} style={{ flexShrink: 1 }}>
                    {localizedName(
                      {
                        enName: entry.name.en,
                        frName: entry.name.fr,
                        deName: entry.name.de,
                        esName: entry.name.es,
                      },
                      language,
                    )}
                  </NText>
                  {fresh ? (
                    <YStack bg="$gold800" rounded={6} px={7} py={1}>
                      <NText fontSize={9.5} lineHeight={14} letterSpacing={0.8} color="$gold100">
                        {t("journal.wall_new")}
                      </NText>
                    </YStack>
                  ) : null}
                </XStack>
                <NMuted numberOfLines={1}>{wallSub(t, language, entry, stats.now)}</NMuted>
              </YStack>
              <YStack items="flex-end">
                <NNum fontSize={24} lineHeight={26} color="$resourceGold">
                  {entry.type === "time" ? formatHold(target) : String(target)}
                </NNum>
                <NKickerQuiet fontSize={9.5}>
                  {entry.type === "time" ? t("journal.unit_hold") : t("journal.unit_reps")}
                </NKickerQuiet>
              </YStack>
            </XStack>
          );
        })}
      </YStack>
    </YStack>
  );
}

function FlameBlock({ stats }: { stats: JournalStats }) {
  const { t } = useTranslation();
  const language = useSettingsStore((s) => s.language);
  const { flame } = stats;

  // On a rest day the sentence above already says how long the flame holds; this says the rule.
  const note = !flame.litUntil
    ? t("journal.flame_out", { count: flame.quota })
    : `${t("journal.flame_keeps", { count: flame.quota })} ${
        flame.bestIsCurrent
          ? t("journal.flame_best_now")
          : flame.bestEndedOn && flame.best > 0
            ? t("journal.flame_best_ended", {
                count: flame.best,
                date: shortDate(language, flame.bestEndedOn),
              })
            : ""
      }`.trim();

  return (
    <NBlock testID="journal-flame" mx={11} mt={17}>
      <XStack items="center" gap={8}>
        <Flame size={18} color={flame.litUntil ? "$resourceGold" : "$muted"} strokeWidth={2.5} />
        <NNum fontSize={19} lineHeight={24}>
          {flame.current}
          <NMuted fontSize={12}> {t("journal.flame_lit", { count: flame.current })}</NMuted>
        </NNum>
        <XStack flex={1} gap={4} justify="flex-end" accessibilityElementsHidden>
          {stats.week.map((day, index) => {
            const today = index === stats.week.length - 1;
            return (
              <YStack
                // biome-ignore lint/suspicious/noArrayIndexKey: seven fixed days, oldest first
                key={index}
                width={9}
                height={9}
                rounded={5}
                bg={day ? "$resourceGold" : today ? undefined : "$ink800"}
                borderWidth={today ? 1.5 : 0}
                borderColor="$resourceGold"
              />
            );
          })}
        </XStack>
        <NNum fontSize={13} lineHeight={18}>
          {flame.inWindow}
          <NMuted fontSize={13}>/{flame.quota}</NMuted>
        </NNum>
      </XStack>
      <NMuted mt={8} lineHeight={17}>
        {note}
      </NMuted>
    </NBlock>
  );
}

/** Against the same days of last month, which the block's header already names. */
function Delta({ now, was }: { now: number; was: number }) {
  const { t } = useTranslation();
  const language = useSettingsStore((s) => s.language);
  const diff = Math.round(now - was);
  if (diff === 0) return <NMuted fontSize={11}>{t("journal.delta_same")}</NMuted>;
  return (
    <NText fontSize={11} lineHeight={15} color={diff > 0 ? "$gold300" : "$textSecondary"}>
      {t(diff > 0 ? "journal.delta_up" : "journal.delta_down", {
        value: number(language, Math.abs(diff)),
      })}
    </NText>
  );
}

function Figure({
  value,
  unit,
  children,
}: {
  value: string;
  unit?: string;
  children?: React.ReactNode;
}) {
  return (
    <YStack width="47%">
      <XStack items="baseline" gap={5}>
        <NNum fontSize={21} lineHeight={26}>
          {value}
        </NNum>
        {unit ? <NMuted fontSize={11.5}>{unit}</NMuted> : null}
      </XStack>
      {children}
    </YStack>
  );
}

/** "Pull-ups, Sep 14", or the date alone for a record saved before it kept its name (0051). */
function recordLine(
  t: TFunction,
  language: AppLanguage,
  record: JournalStats["month"]["current"]["latestRecord"],
): string {
  if (!record) return t("journal.fig_no_record");
  const date = shortDate(language, record.at);
  const name = record.exerciseName
    ? record.exerciseName[language] || record.exerciseName.en
    : t(`journal.record_${record.kind}`, { defaultValue: "" });
  return name ? t("journal.fig_record_latest", { name, date }) : date;
}

function hoursAndMinutes(seconds: number): string {
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return `${minutes} min`;
  return `${Math.floor(minutes / 60)} h ${String(minutes % 60).padStart(2, "0")}`;
}

function MonthBlock({ stats }: { stats: JournalStats }) {
  const { t } = useTranslation();
  const language = useSettingsStore((s) => s.language);
  const distanceUnit = useSettingsStore((s) => s.distanceUnit);
  const { month, now } = stats;
  const { current, previous } = month;
  const previousName = monthName(language, month.previousFrom);

  const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
  const todayKey = dayKey(now);

  return (
    <NBlock testID="journal-month" mx={11} mt={6}>
      <XStack items="baseline" justify="space-between" gap={8}>
        <NKickerQuiet>
          {t("journal.month_so_far", { month: monthName(language, now) })}
        </NKickerQuiet>
        <NMuted fontSize={11}>
          {t("journal.month_vs", { month: previousName, count: month.days })}
        </NMuted>
      </XStack>

      <XStack flexWrap="wrap" rowGap={11} columnGap="6%" mt={11}>
        <Figure
          value={number(language, current.quests)}
          unit={t("journal.fig_quests", { count: current.quests })}
        >
          <Delta now={current.quests} was={previous.quests} />
        </Figure>
        <Figure value={number(language, current.reps)} unit={t("journal.fig_reps")}>
          <Delta now={current.reps} was={previous.reps} />
        </Figure>
        <Figure value={hoursAndMinutes(current.questSeconds)}>
          <NMuted fontSize={11}>
            {current.quests > 0
              ? t("journal.fig_time_each", {
                  avg: hoursAndMinutes(current.questSeconds / current.quests),
                })
              : t("journal.fig_time")}
          </NMuted>
        </Figure>
        <Figure value={formatDistance(current.leaguesM, distanceUnit)}>
          <NMuted fontSize={11}>
            {current.outings > 0
              ? t("journal.fig_outings", { count: current.outings })
              : t("journal.fig_no_outings")}
          </NMuted>
        </Figure>
        <Figure value={number(language, current.xp)} unit={t("journal.fig_xp")}>
          <Delta now={current.xp} was={previous.xp} />
        </Figure>
        <Figure
          value={number(language, current.records)}
          unit={t("journal.fig_records", { count: current.records })}
        >
          <NMuted fontSize={11} numberOfLines={1}>
            {recordLine(t, language, current.latestRecord)}
          </NMuted>
        </Figure>
      </XStack>

      <NRule />

      <XStack flexWrap="wrap" gap={3} accessibilityElementsHidden>
        {Array.from({ length: daysInMonth }, (_, index) => {
          const day = new Date(now.getFullYear(), now.getMonth(), index + 1);
          const key = dayKey(day);
          return (
            <FriezeDay
              key={key}
              kind={month.activity.get(key)}
              today={key === todayKey}
              future={day.getTime() > now.getTime()}
            />
          );
        })}
      </XStack>
      <NMuted fontSize={11} mt={8} lineHeight={16}>
        {t("journal.frieze_legend")}
      </NMuted>
    </NBlock>
  );
}

/**
 * One square of the month: filled for a quest, hollow for an outing, ringed for today, dark for
 * what is still to come. Three shapes and one colour, so it reads without telling colours apart.
 */
function FriezeDay({
  kind,
  today,
  future,
}: {
  kind: DayActivity | undefined;
  today: boolean;
  future: boolean;
}) {
  // Today is ringed whatever it holds, so the ring is never lost inside a filled square.
  let bg: "$resourceGold" | "$gold900" | "$ink900" | "$ink800" | undefined = "$ink800";
  if (today) bg = "$gold900";
  else if (kind === "quest") bg = "$resourceGold";
  else if (kind === "outing") bg = undefined;
  else if (future) bg = "$ink900";
  return (
    <YStack
      width={9}
      height={9}
      rounded={2}
      bg={bg}
      borderWidth={kind === "outing" || today ? 1.5 : 0}
      borderColor={today ? "$resourceGold" : "$gold600"}
    />
  );
}

const WORK_FILLS = ["$resourceGold", "$gold600", "$gold700", "$gold800"] as const;

function WorkBlock({ stats }: { stats: JournalStats }) {
  const { t } = useTranslation();
  const router = useRouter();
  const language = useSettingsStore((s) => s.language);
  const { balance } = stats;
  if (balance.totalVolume === 0) return null;

  const shown = balance.muscles.filter((m) => m.percentage > 0);
  const behind = balance.weakAreas.length > 0 ? balance.muscles.at(-1) : null;
  const label = (code: keyof typeof MUSCLE_LABELS) => MUSCLE_LABELS[code][language];

  return (
    <NBlock testID="journal-work" mx={11} mt={6}>
      <XStack items="baseline" justify="space-between" gap={8}>
        <NKickerQuiet>{t("journal.work_title")}</NKickerQuiet>
        <NMuted fontSize={11}>
          {t("journal.work_meta", { reps: number(language, stats.reps30) })}
        </NMuted>
      </XStack>
      <XStack height={32} items="flex-end" gap={2} mt={11}>
        {shown.map((m, index) => {
          const weak = balance.weakAreas.includes(m.muscle);
          return (
            <YStack
              key={m.muscle}
              flex={m.percentage}
              height={`${Math.max(16, (m.percentage / (shown[0]?.percentage || 1)) * 100)}%`}
              bg={weak ? "$ink800" : (WORK_FILLS[index] ?? "$gold800")}
              borderWidth={weak ? 1 : 0}
              borderColor="$resourceGold"
              borderTopLeftRadius={2}
              borderTopRightRadius={2}
            />
          );
        })}
      </XStack>
      <XStack gap={2} mt={5}>
        {shown.map((m) => (
          <NMuted
            key={m.muscle}
            flex={m.percentage}
            fontSize={10}
            lineHeight={13}
            numberOfLines={1}
            color={balance.weakAreas.includes(m.muscle) ? "$gold300" : "$textSecondary"}
          >
            {/* A sliver has no room for a label; the verdict below names the one that matters. */}
            {m.percentage >= 12
              ? `${label(m.muscle)} ${Math.round(m.percentage)}%`
              : m.percentage >= 6
                ? `${Math.round(m.percentage)}%`
                : ""}
          </NMuted>
        ))}
      </XStack>
      <XStack mt={11} flexWrap="wrap" items="baseline" gap={6}>
        <NText fontSize={12.5} lineHeight={18}>
          {behind
            ? t("journal.work_behind", { muscle: label(behind.muscle) })
            : t("journal.work_balanced")}
        </NText>
        <NText
          testID="journal-work-link"
          fontSize={12.5}
          lineHeight={18}
          color="$resourceGold"
          onPress={() => router.push("/journal/balance" as never)}
          accessibilityRole="link"
        >
          {behind ? t("journal.work_fix") : t("journal.work_see")} →
        </NText>
      </XStack>
    </NBlock>
  );
}

function LevelBlock({ stats }: { stats: JournalStats }) {
  const { t } = useTranslation();
  const router = useRouter();
  const language = useSettingsStore((s) => s.language);
  const { level, shelf, xpPerSession } = stats;
  const span = level.currentLevelXp + level.xpToNextLevel;
  const quests = xpPerSession ? Math.max(1, Math.ceil(level.xpToNextLevel / xpPerSession)) : null;

  const next = shelf.next;
  const remaining = next ? next.targetValue - next.currentValue : 0;
  const nextTitle = next ? localizedTitle(next.definition, language) : "";
  const nextLine = !next
    ? t("journal.shelf_full")
    : next.definition.category === "streaks"
      ? t("journal.shelf_next_days", { title: nextTitle, count: remaining })
      : next.definition.category === "sessions"
        ? t("journal.shelf_next_quests", { title: nextTitle, count: remaining })
        : next.definition.category === "xp"
          ? t("journal.shelf_next_xp", { title: nextTitle, xp: number(language, remaining) })
          : t("journal.shelf_next_special", { title: nextTitle });

  return (
    <NBlock testID="journal-level" mx={11} mt={6}>
      <XStack items="baseline" justify="space-between" gap={8}>
        <NKickerQuiet>
          {t("journal.level_kicker", { title: level.title[language], level: level.level })}
        </NKickerQuiet>
        <NMuted fontSize={11}>
          {t("journal.level_meta", {
            current: number(language, level.currentLevelXp),
            total: number(language, span),
          })}
        </NMuted>
      </XStack>
      <YStack mt={8}>
        <NBar progress={level.xpProgress} />
      </YStack>
      <NMuted mt={8}>
        {quests
          ? t("journal.level_to_next_pace", {
              xp: number(language, level.xpToNextLevel),
              level: level.level + 1,
              count: quests,
            })
          : t("journal.level_to_next", {
              xp: number(language, level.xpToNextLevel),
              level: level.level + 1,
            })}
      </NMuted>
      <NRule />
      <XStack
        items="center"
        gap={11}
        onPress={() => router.push("/journal/achievements" as never)}
        accessibilityRole="button"
        pressStyle={{ opacity: 0.85 }}
      >
        <Medal size={20} color="$resourceGold" strokeWidth={2.5} />
        <YStack flex={1} minW={0}>
          <NText fontSize={13.5} lineHeight={19}>
            {t("journal.shelf_count", { unlocked: shelf.unlocked, total: shelf.total })}
          </NText>
          <NMuted fontSize={11.5} numberOfLines={1}>
            {nextLine}
          </NMuted>
        </YStack>
        <YStack width={56}>
          <NBar progress={shelf.total > 0 ? (shelf.unlocked / shelf.total) * 100 : 0} />
        </YStack>
      </XStack>
    </NBlock>
  );
}

/** The stats page: what to beat, the flame, the month, the work, the level. Detail is a tap away. */
export function StatsView({ stats }: { stats: JournalStats }) {
  const { t } = useTranslation();
  const router = useRouter();
  const mode = modeOf(stats);

  return (
    <YStack testID="journal-stats" pb={17}>
      <Lead stats={stats} mode={mode} />
      <Wall stats={stats} mode={mode} />
      <FlameBlock stats={stats} />
      {!stats.isFirstDay && <MonthBlock stats={stats} />}
      <WorkBlock stats={stats} />
      <LevelBlock stats={stats} />
      <XStack mx={11} mt={17} flexWrap="wrap" gap={6}>
        <NButton
          testID="journal-chip-lifetime"
          onPress={() => router.push("/journal/lifetime" as never)}
        >
          {t("journal.chip_lifetime")}
        </NButton>
        <NButton
          testID="journal-chip-achievements"
          onPress={() => router.push("/journal/achievements" as never)}
        >
          {t("journal.chip_achievements", {
            unlocked: stats.shelf.unlocked,
            total: stats.shelf.total,
          })}
        </NButton>
        {stats.bosses > 0 && (
          <NButton
            testID="journal-chip-bosses"
            onPress={() => router.push("/journal/bosses" as never)}
          >
            {t("journal.chip_bosses", { count: stats.bosses })}
          </NButton>
        )}
      </XStack>
    </YStack>
  );
}
