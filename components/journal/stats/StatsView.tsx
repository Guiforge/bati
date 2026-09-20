import { useRouter } from "expo-router";
import type { TFunction } from "i18next";
import { useTranslation } from "react-i18next";
import { XStack, YStack } from "tamagui";
import { Flame, Medal } from "@/components/icons";
import {
  ageOf,
  dayAfter,
  daysUntil,
  formatHoursMinutes,
  formatShare,
  shortDate,
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
import { formatCount, formatTargetValue } from "@/db/targets";
import { inSentence, localizedName, localizedTitle } from "@/src/i18n/localized";
import { type AppLanguage, useSettingsStore } from "@/stores/settings";
import type { JournalStats } from "./useJournalStats";
import { STALE_RECORD_DAYS, wallSub, wallTarget } from "./wall";
import { workVerdict } from "./workVerdict";

const DAY_MS = 24 * 60 * 60 * 1000;

const fmt = (language: AppLanguage, options: Intl.DateTimeFormatOptions, date: Date) =>
  getDateTimeFormat(language, options).format(date);
const monthName = (language: AppLanguage, date: Date) => fmt(language, { month: "long" }, date);
const number = formatCount;

type Mode = "firstDay" | "veteran" | "rest" | "regular";

/**
 * Which story the page tells. A first day has nothing; a veteran whose records have all aged has
 * old debts; a day with nothing logged yet is a rest day, and rest days cost nothing; anything
 * else is an ordinary day with something to beat tonight.
 */
function modeOf(stats: JournalStats): Mode {
  if (stats.isFirstDay) return "firstDay";
  const latest = stats.latestRecord?.at ?? null;
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

/** What the sentence says, what it says in gold, and what it says after, in plain text again. */
type LeadText = { plain: string; accent: string; tail?: string };

/**
 * A veteran's month first, then the fact about the records, in plain text. Gold is for what went
 * right: the veteran audit found the only gold on the page spent on "nothing has fallen since 2024",
 * in place of the nine days this hero had trained that month.
 */
function veteranLead(t: TFunction, language: AppLanguage, stats: JournalStats): LeadText {
  const latest = stats.latestRecord?.at;
  return {
    plain: regularLead(t, language, stats).plain,
    accent: "",
    tail: latest
      ? t("journal.lead_veteran_since", {
          month: `${monthName(language, latest)} ${latest.getFullYear()}`,
        })
      : undefined,
  };
}

function restLead(t: TFunction, language: AppLanguage, stats: JournalStats): LeadText {
  const { flame, now } = stats;
  if (flame.litUntil == null) {
    return { plain: t("journal.lead_rest_out", { count: flame.quota }), accent: "" };
  }
  // Past a week a weekday names the wrong one, so the date says it, with the day it holds to.
  const day = dayLabel(t, language, dayAfter(flame.litUntil), now);
  return {
    plain: day
      ? t("journal.lead_rest_lit", { day })
      : t("journal.lead_rest_lit_date", { date: shortDate(language, flame.litUntil, now) }),
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
  const { plain, accent, tail } =
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
      {tail ? ` ${tail}` : ""}
    </NText>
  );
}

/**
 * "tomorrow" or "Thursday" inside a week, null past it: a weekday a fortnight away names the wrong
 * one. The caller writes the date then.
 */
function dayLabel(t: TFunction, language: AppLanguage, day: Date, now: Date): string | null {
  const inDays = daysUntil(day, now);
  if (inDays <= 1) return t("journal.when_tomorrow");
  if (inDays < 7)
    return t("journal.day_weekday", { weekday: fmt(language, { weekday: "long" }, day) });
  return null;
}

function WallRow({ entry, now }: { entry: WallEntry; now: Date }) {
  const { t } = useTranslation();
  const router = useRouter();
  const language = useSettingsStore((s) => s.language);
  const age = entry.recordAt ? ageOf(entry.recordAt, now).kind : null;
  // A record that fell today or yesterday is still news: ringed, and tagged.
  const fresh = age === "today" || age === "yesterday";
  const target = wallTarget(entry, now);
  const sub = wallSub(t, language, entry, now);
  const recordSession = entry.recordSessionId;
  return (
    <XStack
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
        <NMuted numberOfLines={1}>
          {sub.before}
          {/* The row opens the movement; the record's date opens the day it fell. A veteran's
              question about a record is "what did I do that day", and History is hundreds of rows
              away from it. A link inside the line, because the row's own tap is taken. */}
          {sub.when && recordSession != null ? (
            <NMuted
              testID="journal-wall-record-day"
              color="$resourceGold"
              accessibilityRole="link"
              onPress={() => router.push(`/journal/${recordSession}` as never)}
            >
              {sub.when}
            </NMuted>
          ) : (
            sub.when
          )}
          {sub.after}
        </NMuted>
      </YStack>
      {/* A movement never logged has nothing to beat: "1 reps" under "Never logged" read as a dare
          to do one rep. The first try sets the record, which the kicker says. */}
      {entry.best == null ? null : (
        <YStack items="flex-end">
          <NNum fontSize={24} lineHeight={26} color="$resourceGold">
            {formatTargetValue({ type: entry.type, value: target }, language)}
          </NNum>
          <NKickerQuiet fontSize={9.5}>
            {entry.type === "time" ? t("journal.unit_hold") : t("journal.unit_reps")}
          </NKickerQuiet>
        </YStack>
      )}
    </XStack>
  );
}

function Wall({ stats, mode }: { stats: JournalStats; mode: Mode }) {
  const { t } = useTranslation();
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
          {mode === "firstDay" ? t("journal.wall_meta_first") : t("journal.wall_meta")}
        </NMuted>
      </XStack>
      <YStack px={11} pt={8} gap={6}>
        {stats.wall.map((entry) => (
          <WallRow key={`${entry.exerciseId}:${entry.type}`} entry={entry} now={stats.now} />
        ))}
      </YStack>
    </YStack>
  );
}

function FlameBlock({ stats }: { stats: JournalStats }) {
  const { t } = useTranslation();
  const language = useSettingsStore((s) => s.language);
  const { flame, now } = stats;

  // Written out rather than "6/2": sessions and outings both keep the flame, and a walker who read
  // the fraction concluded that her walks did not count.
  const best = flame.bestIsCurrent
    ? t("journal.flame_best_now")
    : flame.bestEndedOn && flame.best > 0
      ? t("journal.flame_best_ended", {
          // Two readings of the same number, and neither does the other's job: `count` picks the
          // plural form, `days` is what the line prints. i18next resolves a plural from a number
          // and a formatted "1,822" is not one, so the figure has to arrive beside it.
          count: flame.best,
          days: number(language, flame.best),
          date: shortDate(language, flame.bestEndedOn, now),
        })
      : "";
  // Short of the quota, the note says how many are missing: "2 keep it lit" beside "0 days lit"
  // after a first session told a new hero she had failed, not that one more would do it.
  const note = [
    t("journal.flame_window", { count: flame.inWindow }),
    flame.inWindow < flame.quota
      ? t("journal.flame_more", { count: flame.quota - flame.inWindow })
      : t("journal.flame_quota", { count: flame.quota }),
    best,
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <NBlock testID="journal-flame" mx={11} mt={17}>
      <XStack items="center" gap={8}>
        <Flame size={18} color={flame.litUntil ? "$resourceGold" : "$muted"} strokeWidth={2.5} />
        {/* "0 days lit" beside today's gold dot told a hero with one session that nothing counted.
            Until the flame is lit, the dots and the note below say where she stands. */}
        {flame.current === 0 && flame.inWindow > 0 ? null : (
          <NNum fontSize={19} lineHeight={24}>
            {number(language, flame.current)}
            <NMuted fontSize={12}> {t("journal.flame_lit", { count: flame.current })}</NMuted>
          </NNum>
        )}
        <XStack flex={1} gap={4} justify="flex-end" accessibilityElementsHidden>
          {stats.week.map((day, index) => (
            <DayMark
              // biome-ignore lint/suspicious/noArrayIndexKey: seven fixed days, oldest first
              key={index}
              kind={day ?? undefined}
              today={index === stats.week.length - 1}
              future={false}
              round
            />
          ))}
        </XStack>
      </XStack>
      <NMuted mt={8} lineHeight={17}>
        {note}
      </NMuted>
    </NBlock>
  );
}

/**
 * Against the same days of last month, in words: "2 more than in August". A bare "-5" under a
 * count of reps was read as a percentage, and a drop is never painted as an alarm.
 */
function Delta({
  now,
  was,
  month,
  hidden,
}: {
  now: number;
  was: number;
  month: string;
  /** A hero who started after last month's window has nothing to be compared against. */
  hidden: boolean;
}) {
  const { t } = useTranslation();
  const language = useSettingsStore((s) => s.language);
  if (hidden) return null;
  const diff = Math.round(now - was);
  if (diff === 0) return <NMuted fontSize={11}>{t("journal.delta_same", { month })}</NMuted>;
  return (
    <NText fontSize={11} lineHeight={15} color={diff > 0 ? "$gold300" : "$textSecondary"}>
      {t(diff > 0 ? "journal.delta_up" : "journal.delta_down", {
        value: number(language, Math.abs(diff)),
        month,
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

function MonthBlock({ stats }: { stats: JournalStats }) {
  const { t } = useTranslation();
  const language = useSettingsStore((s) => s.language);
  const distanceUnit = useSettingsStore((s) => s.distanceUnit);
  const { month, now } = stats;
  const { current, previous } = month;
  const previousName = monthName(language, month.previousFrom);
  const newThisMonth =
    stats.firstSessionAt != null && stats.firstSessionAt.getTime() > month.previousTo.getTime();

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
          <Delta
            now={current.quests}
            was={previous.quests}
            month={previousName}
            hidden={newThisMonth}
          />
        </Figure>
        <Figure value={number(language, current.reps)} unit={t("journal.fig_reps")}>
          <Delta
            now={current.reps}
            was={previous.reps}
            month={previousName}
            hidden={newThisMonth}
          />
        </Figure>
        <Figure value={formatHoursMinutes(t, current.questSeconds)}>
          <NMuted fontSize={11}>
            {/* Over the quests that kept a duration: a row with none would pull the average down. */}
            {/* An average of one quest is that quest: "4 min each" beside a single run. */}
            {current.timedQuests > 1
              ? t("journal.fig_time_each", {
                  avg: formatHoursMinutes(t, current.questSeconds / current.timedQuests),
                })
              : t("journal.fig_time")}
          </NMuted>
        </Figure>
        <Figure
          value={
            current.leaguesM > 0
              ? formatDistance(current.leaguesM, distanceUnit, language)
              : distanceUnit === "imperial"
                ? "0 mi"
                : "0 km"
          }
        >
          <NMuted fontSize={11}>
            {current.outings > 0
              ? t("journal.fig_outings", { count: current.outings })
              : t("journal.fig_no_outings")}
          </NMuted>
        </Figure>
        <Figure value={number(language, current.xp)} unit={t("journal.fig_xp")}>
          <Delta now={current.xp} was={previous.xp} month={previousName} hidden={newThisMonth} />
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
            <DayMark
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
 * One day's mark: filled for a quest, hollow for an outing, pierced for both, dark for what is still
 * to come. Today wears a light frame, a colour no other mark uses: a gold ring read as an outing.
 */
function DayMark({
  kind,
  today,
  future,
  round,
}: {
  kind: DayActivity | undefined;
  today: boolean;
  future: boolean;
  round?: boolean;
}) {
  const filled = kind === "quest" || kind === "both";
  let bg: "$resourceGold" | "$ink900" | "$ink800" | undefined = "$ink800";
  if (filled) bg = "$resourceGold";
  else if (kind === "outing") bg = undefined;
  else if (future) bg = "$ink900";
  return (
    <YStack
      width={9}
      height={9}
      rounded={round ? 5 : 2}
      bg={bg}
      borderWidth={today || kind === "outing" ? 1.5 : 0}
      borderColor={today ? "$text" : "$gold600"}
      items="center"
      justify="center"
    >
      {kind === "both" ? <YStack width={3} height={3} rounded={1} bg="$surface2" /> : null}
    </YStack>
  );
}

const WORK_FILLS = ["$resourceGold", "$gold600", "$gold700", "$gold800"] as const;

function WorkBlock({ stats }: { stats: JournalStats }) {
  const { t } = useTranslation();
  const router = useRouter();
  const language = useSettingsStore((s) => s.language);
  const { balance } = stats;
  if (balance.totalVolume === 0) return null;
  const verdict = workVerdict(t, language, balance);
  const shown = balance.muscles.filter((m) => m.percentage > 0);
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
          >
            {/* Only a segment wide enough for its name is labelled; the verdict below names the
                ones that are behind, with their share. */}
            {m.percentage >= 12 ? `${label(m.muscle)} ${formatShare(language, m.percentage)}` : ""}
          </NMuted>
        ))}
      </XStack>
      <XStack mt={11} flexWrap="wrap" items="baseline" gap={6}>
        <NText fontSize={12.5} lineHeight={18}>
          {verdict.text}
        </NText>
        <NText
          testID="journal-work-link"
          fontSize={12.5}
          lineHeight={18}
          color="$resourceGold"
          onPress={() => router.push("/journal/balance" as never)}
          accessibilityRole="link"
        >
          {verdict.behind ? t("journal.work_fix") : t("journal.work_see")} →
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
        // Two lines of Nocturne type come to 37 dp, under the tap floor. Height rather than
        // `hitSlop`: this row sits inside a block with siblings above and below, and slop that
        // falls under a sibling is slop the sibling takes.
        minH={44}
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
      {stats.isFirstDay ? null : <MonthBlock stats={stats} />}
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
        {stats.bosses > 0 ? (
          <NButton
            testID="journal-chip-bosses"
            onPress={() => router.push("/journal/bosses" as never)}
          >
            {t("journal.chip_bosses", { count: stats.bosses })}
          </NButton>
        ) : null}
      </XStack>
    </YStack>
  );
}
