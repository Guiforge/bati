import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import type { TFunction } from "i18next";
import { useTranslation } from "react-i18next";
import { StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { XStack, YStack } from "tamagui";
import { Trophy } from "@/components/icons";
import {
  foldRounds,
  formatShare,
  shortDate,
  targetToBeat,
  whenLabel,
} from "@/components/journal/journalFormat";
import {
  NBackButton,
  NBar,
  NBlock,
  NButton,
  NFact,
  NImage,
  NKicker,
  NKickerQuiet,
  NMuted,
  NNum,
  NPanel,
  NRule,
  NText,
} from "@/components/journal/nocturne";
import { TraceThumb } from "@/components/journal/TraceThumb";
import { getExerciseThumb, getQuestAsset } from "@/constants/assetMap";
import { formatDistance, formatElevation, formatPace } from "@/constants/distanceFormat";
import { rawColors } from "@/constants/rawColors";
import { formatDuration } from "@/db";
import { type CompletedSession, OUTING_COUNTS_AFTER_SECONDS } from "@/db/completed";
import type { VariationStep } from "@/db/exercises";
import { type FallenRecord, type MuscleShift, type QuestStanding, sessionReps } from "@/db/journal";
import { MUSCLE_LABELS } from "@/db/muscles";
import { formatCount, formatTargetValue } from "@/db/targets";
import type { UserLevelInfo } from "@/db/userLevel";
import type { LngLat } from "@/src/gps/trace";
import { localizedName } from "@/src/i18n/localized";
import { type AppLanguage, useSettingsStore } from "@/stores/settings";

export type QuestLogData = {
  session: CompletedSession;
  questTitle: string;
  questImage: string | null;
  trace: readonly (readonly LngLat[])[];
  standing: QuestStanding | null;
  records: FallenRecord[];
  shift: MuscleShift | null;
  rung: VariationStep | null;
  latest: boolean;
  level: UserLevelInfo;
};

const MAX_BARS = 24;

/** The painting the page leads with, fading into the ground, with the title written on it. */
export function ReportHero({
  source,
  height,
  children,
}: {
  source: number | { uri: string } | null;
  height: number;
  children: React.ReactNode;
}) {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();
  return (
    <View style={{ height: height + insets.top }}>
      {source != null && (
        <View style={[StyleSheet.absoluteFill, { top: insets.top }]}>
          <NImage source={source} width="100%" height={height} radius={0} />
        </View>
      )}
      <LinearGradient
        colors={[rawColors.bgDarkClear, rawColors.bgOverlaySoft, rawColors.bgDark]}
        locations={[0, 0.55, 0.96]}
        style={StyleSheet.absoluteFill}
      />
      <View style={{ position: "absolute", top: insets.top + 11, left: 11 }}>
        <NBackButton onPress={() => router.back()} label={t("common.go_back")} veiled />
      </View>
      <YStack position="absolute" l={11} r={11} b={11}>
        {children}
      </YStack>
    </View>
  );
}

function recordName(t: TFunction, language: AppLanguage, record: FallenRecord): string {
  if (record.name) return record.name[language] || record.name.en;
  return t(`journal.record_${record.kind}`, { defaultValue: "" });
}

function recordValue(
  record: FallenRecord,
  distanceUnit: "metric" | "imperial",
  language: AppLanguage,
): string {
  if (record.kind === "longest_outing") return formatDistance(record.value, distanceUnit, language);
  if (record.kind === "longest_session") return formatDuration(record.value, language);
  return formatTargetValue(record, language);
}

function RecordPanel({ records }: { records: FallenRecord[] }) {
  const { t } = useTranslation();
  const language = useSettingsStore((s) => s.language);
  const distanceUnit = useSettingsStore((s) => s.distanceUnit);
  // A movement first: it names something to beat next time, a session record does not.
  const record = records.find((r) => r.exerciseId != null) ?? records[0];
  if (!record) return null;
  // The panel names one record; the others this session broke are counted, so the page agrees
  // with the victory screen that announced them.
  const others = records.filter((r) => r !== record && r.exerciseId != null).length;

  const next =
    record.exerciseId != null
      ? formatTargetValue({ type: record.type, value: targetToBeat(record.value) }, language)
      : null;
  const context =
    record.previous == null
      ? next
        ? t("journal.record_first_ever", { target: next })
        : t("journal.record_first")
      : next
        ? t("journal.record_up", {
            previous: formatTargetValue({ type: record.type, value: record.previous }, language),
            target: next,
          })
        : t("journal.record_beat", {
            previous: recordValue({ ...record, value: record.previous }, distanceUnit, language),
          });

  return (
    <NPanel center>
      <Trophy size={28} color="$resourceGold" strokeWidth={2.5} />
      {/* "A record fell" over a first attempt promised a fall there was nothing to fall from. */}
      <NKicker mt={8}>
        {record.previous == null ? t("journal.record_set_first") : t("journal.record_fell")}
      </NKicker>
      <NNum
        testID="journal-record-fell"
        fontSize={32}
        lineHeight={36}
        mt={6}
        style={{ textAlign: "center" }}
      >
        {recordName(t, language, record)}, {recordValue(record, distanceUnit, language)}
      </NNum>
      <NMuted fontSize={12.5} lineHeight={19} mt={6} style={{ textAlign: "center" }}>
        {context}
      </NMuted>
      {others > 0 ? (
        <NText fontSize={12.5} lineHeight={19} mt={6} color="$gold300">
          {t("journal.record_more", { count: others })}
        </NText>
      ) : null}
    </NPanel>
  );
}

function WhereItSits({ standing }: { standing: QuestStanding }) {
  const { t } = useTranslation();
  const language = useSettingsStore((s) => s.language);
  const distanceUnit = useSettingsStore((s) => s.distanceUnit);
  const index = standing.rank - 1;
  const shown = standing.values.slice(0, MAX_BARS);
  // Past the window, the last bar is this run, so it is always on the chart.
  if (index >= MAX_BARS) shown[MAX_BARS - 1] = standing.mine;
  const highlight = Math.min(index, MAX_BARS - 1);
  const max = standing.values[0] ?? 0;
  const min = Math.min(...shown);
  const outing = standing.unit === "metres";
  const show = (v: number) =>
    outing ? formatDistance(v, distanceUnit, language) : formatCount(language, v);
  // From the lowest run shown to the best, not from zero: runs of 94 to 102 reps drawn from zero
  // were five bars of one height, and the two reps between this run and the best were invisible.
  const height = (v: number) =>
    max > min ? `${Math.round(20 + ((v - min) / (max - min)) * 80)}%` : "100%";

  return (
    <NBlock testID="journal-sits" mt={6}>
      <NKickerQuiet>{t("journal.sits_title")}</NKickerQuiet>
      <XStack items="baseline" gap={7} mt={8}>
        <NNum fontSize={26} lineHeight={30}>
          {standing.rank === 1
            ? t("journal.sits_best")
            : t("journal.sits_rank", { rank: standing.rank })}
        </NNum>
        <NText fontSize={13} lineHeight={18} style={{ flexShrink: 1 }}>
          {t(outing ? "journal.sits_of_outings" : "journal.sits_of_runs", {
            count: standing.outOf,
          })}
        </NText>
      </XStack>
      <XStack height={26} items="flex-end" gap={3} mt={11} accessibilityElementsHidden>
        {shown.map((v, i) => (
          <YStack
            // biome-ignore lint/suspicious/noArrayIndexKey: bars in rank order, no identity of their own
            key={i}
            flex={1}
            height={height(v) as `${number}%`}
            bg={i === highlight ? "$resourceGold" : i === 0 ? "$textSecondary" : "$muted"}
            borderTopLeftRadius={2}
            borderTopRightRadius={2}
          />
        ))}
      </XStack>
      <XStack justify="space-between" flexWrap="wrap" columnGap={11} mt={6}>
        <NMuted fontSize={10.5}>
          {t("journal.sits_best_on", {
            value: show(max),
            date: shortDate(language, standing.bestAt),
          })}
        </NMuted>
        {/* Below the best, the gap: "#6 of 6" with two numbers to subtract said where the run
            sat and never by how much. */}
        <NMuted fontSize={10.5}>
          {standing.rank > 1 && max > standing.mine
            ? t("journal.sits_this_run_gap", {
                value: show(standing.mine),
                gap: show(max - standing.mine),
              })
            : t("journal.sits_this_run", { value: show(standing.mine) })}
        </NMuted>
      </XStack>
    </NBlock>
  );
}

/** The rung the session is climbing, and once it is earned, every movement that rung opens. */
function RungFact({ rung }: { rung: VariationStep }) {
  const { t } = useTranslation();
  const language = useSettingsStore((s) => s.language);
  return (
    <NFact tone="quiet">
      <NMuted fontSize={13.5} lineHeight={19}>
        {rung.isEarned
          ? t("journal.moved_rung_earned", {
              movement: localizedName(rung.from, language),
              next: localizedName(rung.next, language),
            })
          : t("journal.moved_rung_left", {
              movement: localizedName(rung.from, language),
              met: rung.metTarget,
              required: rung.required,
              count: rung.required - rung.metTarget,
            })}
      </NMuted>
      {/* The fork, only once it is earned: below the bar the line counts sessions and names
          no movement at all, so there is nothing yet for the other branches to hang off. */}
      {rung.isEarned && rung.alsoNext.length > 0 ? (
        <NMuted fontSize={12.5} lineHeight={18} mt={2}>
          {t("progression.rung_also_leads_to", {
            names: rung.alsoNext.map((m) => localizedName(m, language)).join(", "),
          })}
        </NMuted>
      ) : null}
    </NFact>
  );
}

function WhatItMoved({ data }: { data: QuestLogData }) {
  const { t } = useTranslation();
  const language = useSettingsStore((s) => s.language);
  const distanceUnit = useSettingsStore((s) => s.distanceUnit);
  const { session, level, latest, shift, rung } = data;
  const reps = sessionReps(session);
  const holds = session.exercises.some((ex) => ex.result.type === "time");
  const outing = session.outing != null;
  // The same rule the flame reads (`countsAsSession`). Said first on an outing: a walker who read
  // only what an outing does not pay concluded that her walks did not count at all.
  const keepsFlame =
    outing &&
    (session.movingSeconds ?? session.durationSeconds ?? 0) >= OUTING_COUNTS_AFTER_SECONDS;

  return (
    <NBlock testID="journal-moved" mt={6} gap={11}>
      <NKickerQuiet>{t("journal.moved_title")}</NKickerQuiet>
      {keepsFlame ? (
        <NFact>
          <NText fontSize={13.5} lineHeight={19}>
            {t("journal.moved_flame")}
          </NText>
        </NFact>
      ) : null}
      {session.xpEarned > 0 && (
        <YStack gap={6}>
          <NFact>
            <NText fontSize={13.5} lineHeight={19}>
              {t("journal.moved_xp", { xp: formatCount(language, session.xpEarned) })}
              {latest ? (
                <NMuted fontSize={13.5}>
                  {" · "}
                  {t("journal.moved_xp_level", {
                    current: formatCount(language, level.currentLevelXp),
                    total: formatCount(language, level.currentLevelXp + level.xpToNextLevel),
                    level: level.level + 1,
                  })}
                </NMuted>
              ) : null}
            </NText>
          </NFact>
          {latest ? (
            <YStack ml={17}>
              <NBar progress={level.xpProgress} height={3} />
            </YStack>
          ) : null}
        </YStack>
      )}
      {outing ? (
        <>
          {session.leaguesM != null && session.leaguesM > 0 && (
            <NFact>
              <NText fontSize={13.5} lineHeight={19}>
                {t("journal.moved_ground", {
                  distance: formatDistance(session.leaguesM, distanceUnit, language),
                })}
              </NText>
            </NFact>
          )}
          <NFact tone="quiet">
            <NMuted fontSize={13.5} lineHeight={19}>
              {t("journal.moved_outing_note")}
            </NMuted>
          </NFact>
        </>
      ) : (
        reps > 0 && (
          <NFact>
            <NText fontSize={13.5} lineHeight={19}>
              {t("journal.moved_reps", { count: reps, formatted: formatCount(language, reps) })}
              {/* A plank's minute is 20 of these reps, a rule Lifetime wrote and this line used
                  without saying. */}
              {holds ? <NMuted fontSize={13.5}> ({t("journal.row_reps_note")})</NMuted> : null}
            </NText>
          </NFact>
        )
      )}
      {shift ? (
        <NFact tone="soft">
          <NText fontSize={13.5} lineHeight={19}>
            {t("journal.moved_muscle", {
              muscle: MUSCLE_LABELS[shift.muscle][language],
              before: formatShare(language, shift.before),
              after: formatShare(language, shift.after),
            })}
          </NText>
        </NFact>
      ) : null}
      {rung ? <RungFact rung={rung} /> : null}
    </NBlock>
  );
}

function Rounds({ session }: { session: CompletedSession }) {
  const { t } = useTranslation();
  const router = useRouter();
  const language = useSettingsStore((s) => s.language);
  const rows = foldRounds(session.exercises);
  if (rows.length === 0) return null;
  const rounds = new Set(session.exercises.map((ex) => ex.roundIndex)).size;

  return (
    <NBlock testID="journal-rounds" mt={6}>
      <XStack justify="space-between" items="baseline">
        <NKickerQuiet>{t("journal.rounds_title", { count: rounds })}</NKickerQuiet>
        <NMuted fontSize={11}>{t("journal.rounds_meta")}</NMuted>
      </XStack>
      <YStack mt={6}>
        {rows.map((row, index) => (
          <YStack key={row.exercise.id}>
            <XStack
              items="center"
              gap={11}
              py={8}
              minH={44}
              onPress={() => router.push(`/exercises/${row.exercise.id}` as never)}
              accessibilityRole="button"
              pressStyle={{ opacity: 0.8 }}
            >
              <NImage source={getExerciseThumb(row.exercise.imagePath)} size={28} />
              <NText flex={1} fontSize={13.5} lineHeight={19} numberOfLines={1}>
                {localizedName(row.exercise, language)}
              </NText>
              <NNum fontSize={13} lineHeight={18}>
                {row.sets.map((set, i) => (
                  <NNum
                    // biome-ignore lint/suspicious/noArrayIndexKey: sets in round order
                    key={i}
                    fontSize={13}
                    // Each set carries its own colour: a nested text re-applies its own, so a
                    // colour on the line alone never reached the numbers.
                    color={
                      set.met === false ? "$textSecondary" : row.cleared ? "$gold300" : "$text"
                    }
                  >
                    {i > 0 ? " · " : ""}
                    {formatTargetValue(set, language)}
                  </NNum>
                ))}
              </NNum>
              <NMuted width={44} fontSize={11} style={{ textAlign: "right" }}>
                {row.target
                  ? t("journal.target_of", {
                      target: formatTargetValue(row.target, language),
                    })
                  : ""}
              </NMuted>
            </XStack>
            {index < rows.length - 1 && <NRule my={0} />}
          </YStack>
        ))}
      </YStack>
    </NBlock>
  );
}

function Ground({ data }: { data: QuestLogData }) {
  const { t } = useTranslation();
  const router = useRouter();
  const language = useSettingsStore((s) => s.language);
  const distanceUnit = useSettingsStore((s) => s.distanceUnit);
  const { session, trace } = data;
  const moving = session.movingSeconds ?? session.durationSeconds ?? 0;

  return (
    <NBlock
      testID="journal-ground"
      mt={6}
      onPress={
        trace.length > 0 && session.uuid
          ? () => router.push(`/recap?session=${encodeURIComponent(session.uuid ?? "")}` as never)
          : undefined
      }
    >
      <NKickerQuiet>{t("journal.ground_title")}</NKickerQuiet>
      {trace.length > 0 && (
        <YStack mt={11} items="center" py={8} rounded={8} bg="$bgDark">
          <TraceThumb segments={trace} size={160} />
        </YStack>
      )}
      <XStack gap={17} mt={11}>
        <YStack>
          <NNum fontSize={17}>{formatDuration(moving, language)}</NNum>
          <NMuted fontSize={10.5}>{t("journal.ground_moving")}</NMuted>
        </YStack>
        {session.ascentM != null && (
          <YStack>
            <NNum fontSize={17}>{formatElevation(session.ascentM, distanceUnit)}</NNum>
            <NMuted fontSize={10.5}>{t("journal.ground_climbed")}</NMuted>
          </YStack>
        )}
        {session.leaguesM != null && session.leaguesM > 0 && moving > 0 && (
          <YStack>
            <NNum fontSize={17}>{formatPace(session.leaguesM, moving * 1000, distanceUnit)}</NNum>
            <NMuted fontSize={10.5}>{t("journal.ground_pace")}</NMuted>
          </YStack>
        )}
      </XStack>
      {trace.length > 0 && (
        <NText mt={11} fontSize={12.5} color="$resourceGold">
          {t("recap.open")} →
        </NText>
      )}
    </NBlock>
  );
}

/** The quest log: one session, told as where it sits, what it moved, and what was done. */
export function QuestLog({ data }: { data: QuestLogData }) {
  const { t } = useTranslation();
  const router = useRouter();
  const language = useSettingsStore((s) => s.language);
  const { session } = data;
  const outing = session.outing != null;
  const rounds = new Set(session.exercises.map((ex) => ex.roundIndex)).size;

  const meta = [
    whenLabel(t, language, session.performedAt),
    // A difficulty means nothing on a walk.
    outing ? null : t(`quests.level_${session.userLevel}`),
    rounds > 0 && !outing ? t("journal.rounds_completed", { count: rounds }) : null,
    session.durationSeconds ? formatDuration(session.durationSeconds, language) : null,
  ]
    .filter(Boolean)
    .join(" · ");

  return (
    <YStack testID="session-details-screen">
      <ReportHero source={data.questImage ? getQuestAsset(data.questImage) : null} height={150}>
        <NText fontWeight="500" fontSize={22} lineHeight={28}>
          {data.questTitle}
        </NText>
        <NMuted mt={2}>{meta}</NMuted>
      </ReportHero>

      <YStack px={11} pt={11}>
        <RecordPanel records={data.records} />
        {data.standing ? <WhereItSits standing={data.standing} /> : null}
        <WhatItMoved data={data} />
        {outing ? <Ground data={data} /> : <Rounds session={session} />}
        {!!session.notes && (
          <NBlock mt={6}>
            <NKickerQuiet>{t("journal.notes")}</NKickerQuiet>
            <NText mt={6} fontSize={13.5} lineHeight={20}>
              {session.notes}
            </NText>
          </NBlock>
        )}
        {session.questId != null && (
          <YStack py={17} gap={8}>
            <NButton
              testID="journal-cta-quest"
              variant="primary"
              block
              minH={48}
              onPress={() =>
                router.push(`/quests/${session.questId}` as never, { withAnchor: true })
              }
            >
              {t(outing ? "journal.cta_outing" : "journal.cta_quest")}
            </NButton>
            <NMuted fontSize={11} style={{ textAlign: "center" }}>
              {t(outing ? "journal.cta_outing_note" : "journal.cta_quest_note")}
            </NMuted>
          </YStack>
        )}
      </YStack>
    </YStack>
  );
}
