import { LegendList } from "@legendapp/list/react-native";
import { useFocusEffect, useRouter } from "expo-router";
import type { TFunction } from "i18next";
import { Fragment, useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { RefreshControl, ScrollView } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { H2, Paragraph, Text, XStack, YStack } from "tamagui";
import { useAmbientVisit, useScreenGuide } from "@/components/chorus/screenCues";
import { AppButton } from "@/components/common/AppButton";
import { Skeleton, SkeletonCard } from "@/components/common/Skeleton";
import { BarChart2, List } from "@/components/icons";
import { AchievementsCard } from "@/components/journal/AchievementsCard";
import { JournalStats } from "@/components/journal/JournalStats";
import { MonthlyCalendarCard } from "@/components/journal/MonthlyCalendarCard";
import { MuscleBalanceCard } from "@/components/journal/MuscleBalanceCard";
import { PersonalRecordsCard } from "@/components/journal/PersonalRecordsCard";
import { ProgressionCard } from "@/components/journal/ProgressionCard";
import { type JournalEntry, SessionCard } from "@/components/journal/SessionCard";
import { SuggestedQuestsCard } from "@/components/journal/SuggestedQuestsCard";
import { getQuestThumb } from "@/constants/assetMap";
import { getWeekStart } from "@/constants/dateFormatters";
import { rawColors } from "@/constants/rawColors";
import type { StoredRecord } from "@/db/completed";
import { getJournalStats, type JournalStatsSummary, listCompletedSessions } from "@/db/completed";
import { listExercises } from "@/db/exercises";
import { previewPathsFor } from "@/db/gps";
import { listQuestTemplates } from "@/db/quests";
import { localizedName, localizedTitle } from "@/src/i18n/localized";
import { reportError } from "@/src/reportError";
import { useSettingsStore } from "@/stores/settings";

type TabType = "history" | "stats";

// Hoisted so the list doesn't get a fresh function identity on every parent render.
const journalKey = (entry: JournalEntry) => String(entry.id);
const ListGap = () => <YStack height={12} />;

// Mirrors the first cards' reserved heights so the swap to real content doesn't shuffle.
const StatsSkeleton = () => (
  <>
    <SkeletonCard>
      <Skeleton height={104} />
    </SkeletonCard>
    <SkeletonCard>
      <Skeleton height={104} />
    </SkeletonCard>
    <SkeletonCard>
      <Skeleton height={296} />
    </SkeletonCard>
  </>
);

function TabButton({
  tab,
  icon,
  label,
  activeTab,
  onSelect,
}: {
  tab: TabType;
  icon: React.ReactNode;
  label: string;
  activeTab: TabType;
  onSelect: (tab: TabType) => void;
}) {
  const isActive = activeTab === tab;
  return (
    <AppButton
      testID={`journal-tab-${tab}`}
      fullWidth={false}
      flex={1}
      height={48}
      bg={isActive ? "$surface2" : "$surface"}
      borderColor={isActive ? "$primary" : "$borderStrong"}
      borderWidth={1}
      rounded="$5"
      onPress={() => onSelect(tab)}
      accessibilityState={{ selected: isActive }}
      pressStyle={{ opacity: 0.9 }}
    >
      <XStack items="center" gap="$2">
        {icon}
        <Text color="$text" fontWeight="700" fontSize={14}>
          {label}
        </Text>
      </XStack>
    </AppButton>
  );
}

/**
 * What the badge says it broke, or nothing.
 *
 * A movement's record is named by the movement, because "Wall Push-Up" is what the hero wants to
 * beat next time; a session record is named by its own word. Only the first is shown: the chip
 * shares a row with the quest's title, and a session that set three records is a session whose
 * title would disappear to say so.
 *
 * Null when the row predates `0051` and kept no detail, which is what the plain "PR" is for.
 */
function recordLabel(
  records: readonly StoredRecord[],
  names: ReadonlyMap<number, string>,
  t: TFunction,
): string | null {
  const first = records[0];
  if (!first) return null;
  if (first.e != null) return names.get(first.e) ?? null;
  return t(`journal.record_${first.t}`, { defaultValue: "" }) || null;
}

export default function JournalScreen() {
  useScreenGuide("guide_journal");
  useAmbientVisit("menu_visit");

  const { t } = useTranslation();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const language = useSettingsStore((s) => s.language);

  const [history, setHistory] = useState<JournalEntry[]>([]);
  // Read apart from the list, and over the whole table: every tile on the stats tab says
  // "Total", and the list is one page of a history that can be years long.
  const [stats, setStats] = useState<JournalStatsSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<TabType>("stats");
  // The stats tab mounts 8 cards that each fire their own DB query. Defer that burst until after
  // the tab-switch/navigation interaction settles so it doesn't jank the tap frame.
  const [statsReady, setStatsReady] = useState(false);

  useEffect(() => {
    if (activeTab !== "stats" || history.length === 0) {
      setStatsReady(false);
      return;
    }
    // ponytail: defers one frame, not until every animation settles like the
    // deprecated InteractionManager did. If the stats tab janks on switch,
    // upgrade to requestIdleCallback (untyped in RN 0.86, needs a cast).
    const frame = requestAnimationFrame(() => setStatsReady(true));
    return () => cancelAnimationFrame(frame);
  }, [activeTab, history.length]);

  const loadHistory = useCallback(async () => {
    try {
      setLoading(true);
      // Fetch sessions and quest templates to resolve titles
      // `listExercises` is promise-cached, so the catalogue is free after the first read anywhere
      // in the app. It is here to name the movement a record belongs to, which is the difference
      // between a badge that says "PR" and one that says "Wall Push-Up".
      const [sessions, quests, totals, exercises] = await Promise.all([
        listCompletedSessions(100),
        listQuestTemplates(),
        getJournalStats(getWeekStart(language)),
        listExercises(),
      ]);
      const exerciseNames = new Map(exercises.map((e) => [e.id, localizedName(e, language)]));
      setStats(totals);

      // One read for the whole page's runs, not one per card. Only the outings are asked for:
      // every workout in the journal has no points, and `previewPathsFor` would scan for them.
      const traces = await previewPathsFor(
        sessions.flatMap((s) => (s.outing !== null && s.uuid ? [s.uuid] : [])),
      );

      const questMap = new Map(quests.map((q) => [q.id, q]));

      const entries: JournalEntry[] = sessions.map((s) => {
        const quest = s.questId ? questMap.get(s.questId) : null;
        const title = quest
          ? localizedTitle(quest, language)
          : t("quests.not_found", "Unknown Quest");

        return {
          id: s.id,
          questTitle: title,
          cover: getQuestThumb(quest?.imagePath),
          performedAt: s.performedAt,
          durationSeconds: s.durationSeconds,
          xpEarned: s.xpEarned,
          leaguesM: s.leaguesM,
          movingSeconds: s.movingSeconds,
          outing: s.outing,
          tracePoints: (s.uuid && traces.get(s.uuid)) || [],
          userLevel: s.userLevel,
          hasNewRecords: s.hasNewRecords,
          recordLabel: recordLabel(s.records, exerciseNames, t),
        };
      });

      setHistory(entries);
    } catch (error) {
      // The journal renders its empty state either way; without this, a read that keeps
      // failing is indistinguishable from a hero who has not trained yet.
      reportError("journal.loadHistory", error);
    } finally {
      setLoading(false);
    }
  }, [language, t]);

  useFocusEffect(
    useCallback(() => {
      loadHistory().catch((e) => reportError("journal.history", e));
    }, [loadHistory]),
  );

  const [refreshing, setRefreshing] = useState(false);
  // The stats cards each own their fetch; bumping this key remounts them so a pull refreshes
  // everything, not just the session list.
  const [refreshKey, setRefreshKey] = useState(0);
  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    setRefreshKey((k) => k + 1);
    await loadHistory();
    setRefreshing(false);
  }, [loadHistory]);

  const refreshControl = (
    <RefreshControl
      refreshing={refreshing}
      onRefresh={onRefresh}
      tintColor={rawColors.textSecondary}
      colors={[rawColors.primary]}
      progressBackgroundColor={rawColors.surface2}
    />
  );

  const openSession = useCallback((id: number) => router.push(`/journal/${id}` as never), [router]);

  const renderHistoryItem = useCallback(
    ({ item }: { item: JournalEntry }) => <SessionCard entry={item} onPressEntry={openSession} />,
    [openSession],
  );

  return (
    <YStack testID="journal-screen" flex={1} bg="$background">
      <YStack pt={insets.top + 12} px="$4" pb="$3" gap="$4">
        <YStack>
          <H2 fontWeight="700" fontSize={32} color="$text">
            {t("journal.title", "Quest Journal")}
          </H2>
          <Paragraph color="$textSecondary" fontWeight="700">
            {t("journal.subtitle", "Your heroic history")}
          </Paragraph>
        </YStack>

        {/* Tab Navigation */}
        {history.length > 0 && (
          <XStack gap="$2">
            <TabButton
              tab="stats"
              icon={<BarChart2 size={16} color="$text" opacity={activeTab === "stats" ? 1 : 0.7} />}
              label={t("journal.tab_stats", "Stats")}
              activeTab={activeTab}
              onSelect={setActiveTab}
            />
            <TabButton
              tab="history"
              icon={<List size={16} color="$text" opacity={activeTab === "history" ? 1 : 0.7} />}
              label={t("journal.tab_history", "History")}
              activeTab={activeTab}
              onSelect={setActiveTab}
            />
          </XStack>
        )}
      </YStack>

      {activeTab === "history" && history.length > 0 ? (
        <LegendList
          data={history}
          renderItem={renderHistoryItem}
          keyExtractor={journalKey}
          ItemSeparatorComponent={ListGap}
          recycleItems
          estimatedItemSize={100}
          refreshControl={refreshControl}
          style={{ flex: 1 }}
          contentContainerStyle={{
            paddingHorizontal: 16,
            paddingBottom: insets.bottom + 20,
          }}
          showsVerticalScrollIndicator={false}
        />
      ) : (
        <ScrollView
          contentContainerStyle={{
            paddingHorizontal: 16,
            paddingBottom: insets.bottom + 20,
            gap: 12,
          }}
          showsVerticalScrollIndicator={false}
          refreshControl={refreshControl}
        >
          {loading && history.length === 0 ? (
            <StatsSkeleton />
          ) : history.length === 0 ? (
            <YStack items="center" justify="center" mt="$10" gap="$4">
              <Text fontSize={40}>📜</Text>
              <H2 fontSize={20} style={{ textAlign: "center" }} color="$text">
                {t("journal.empty_title", "No tales yet")}
              </H2>
              <Paragraph style={{ textAlign: "center" }} color="$textSecondary">
                {t("journal.empty_subtitle", "Complete quests to fill your journal.")}
              </Paragraph>
              <AppButton
                testID="journal-empty-cta"
                fullWidth={false}
                onPress={() => router.push("/(tabs)/quests" as never)}
              >
                {t("journal.empty_cta", "Browse quests")}
              </AppButton>
            </YStack>
          ) : !statsReady ? (
            <StatsSkeleton />
          ) : (
            /**
             * Ordered so that something about getting *better* is inside the first screen.
             *
             * It used to open with six blocks that all answered "did I show up": the streak, the
             * lifetime tiles, Recent Activity, Workout Days, the level bar, the difficulty split.
             * The only one that said whether the hero had improved was the next rung, eleventh of
             * thirteen and five screens down. The design audit of 2026-09-10 counted them.
             *
             * Four are gone rather than moved. Recent Activity restated the calendar and the
             * trend badges, and disagreed with the calendar about the week. Workout Days is flat
             * by construction for anyone consistent. UserLevelCard was Home's own header drawn a
             * second time. The difficulty split was three years in one bar with no time axis, so
             * the one thing it could prove, that the hero moved up, was the one it could not show.
             */
            <Fragment key={refreshKey}>
              <JournalStats sessions={history} stats={stats} />
              <PersonalRecordsCard />
              <MonthlyCalendarCard />
              <ProgressionCard />
              <AchievementsCard />
              <MuscleBalanceCard />
              <SuggestedQuestsCard />
            </Fragment>
          )}
        </ScrollView>
      )}
    </YStack>
  );
}
