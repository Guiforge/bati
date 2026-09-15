import { LegendList } from "@legendapp/list/react-native";
import { useFocusEffect, useRouter } from "expo-router";
import type { TFunction } from "i18next";
import { useCallback, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { RefreshControl, ScrollView } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { XStack, YStack } from "tamagui";
import { useAmbientVisit, useScreenGuide } from "@/components/chorus/screenCues";
import { Skeleton } from "@/components/common/Skeleton";
import { NMuted, NSeg, NText, NTitle } from "@/components/journal/nocturne";
import { type JournalEntry, SessionCard } from "@/components/journal/SessionCard";
import { StatsView } from "@/components/journal/stats/StatsView";
import { useJournalStats } from "@/components/journal/stats/useJournalStats";
import { getQuestThumb } from "@/constants/assetMap";
import { rawColors } from "@/constants/rawColors";
import type { StoredRecord } from "@/db/completed";
import { listCompletedSessions } from "@/db/completed";
import { listExercises } from "@/db/exercises";
import { previewPathsFor } from "@/db/gps";
import { getJournalVersion } from "@/db/journal";
import { listQuestTemplates } from "@/db/quests";
import { localizedName, localizedTitle } from "@/src/i18n/localized";
import { reportError } from "@/src/reportError";
import { useSettingsStore } from "@/stores/settings";

type TabType = "history" | "stats";

// Hoisted so the list doesn't get a fresh function identity on every parent render.
const journalKey = (entry: JournalEntry) => String(entry.id);
/** Sessions read per page of history. */
const HISTORY_PAGE = 100;
const ListGap = () => <YStack height={8} />;

/** Reserves the wall's first screen, so the swap to real content does not shuffle. */
const StatsSkeleton = () => (
  <YStack px={11} gap={6}>
    <Skeleton height={44} bg="$surface2" />
    {[0, 1, 2, 3].map((i) => (
      <Skeleton key={i} height={60} bg="$surface2" />
    ))}
    <Skeleton height={70} bg="$surface2" />
  </YStack>
);

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
  // A movement first: a first session also sets "longest", and the badge said so instead of naming
  // the push-ups it had just beaten.
  const first = records.find((record) => record.e != null) ?? records[0];
  if (!first) return null;
  if (first.e != null) return names.get(first.e) ?? null;
  return t(`journal.record_${first.t}`, { defaultValue: "" }) || null;
}

/**
 * The Journal: a two-segment switch and the page under it.
 *
 * Redrawn on 2026-09-15 (design project "Journal Bati", option 3c: Nocturne's structure, Bati's
 * colours). The header is a word
 * and a pill, where it used to be a 32 px title, a subtitle and two framed buttons before the first
 * number. The stats page is `StatsView`; History keeps its list.
 */
export default function JournalScreen() {
  useScreenGuide("guide_journal");
  useAmbientVisit("menu_visit");

  const { t } = useTranslation();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const language = useSettingsStore((s) => s.language);

  const [history, setHistory] = useState<JournalEntry[]>([]);
  const [historyLoaded, setHistoryLoaded] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const loadingMore = useRef(false);
  /** The Journal version and language the list was last read under. */
  const shownVersion = useRef<string | null>(null);
  const [activeTab, setActiveTab] = useState<TabType>("stats");
  const { stats, reload: reloadStats } = useJournalStats();

  /** One page of history, ready to draw. */
  const readPage = useCallback(
    async (offset: number, limit = HISTORY_PAGE): Promise<JournalEntry[]> => {
      // `listExercises` is promise-cached, so the catalogue is free after the first read anywhere
      // in the app. It is here to name the movement a record belongs to, which is the difference
      // between a badge that says "PR" and one that says "Wall Push-Up".
      const [sessions, quests, exercises] = await Promise.all([
        listCompletedSessions(limit, offset),
        listQuestTemplates(),
        listExercises(),
      ]);
      const exerciseNames = new Map(exercises.map((e) => [e.id, localizedName(e, language)]));

      // One read for the page's runs, not one per row. Only the outings are asked for: every
      // workout in the journal has no points, and `previewPathsFor` would scan for them.
      const traces = await previewPathsFor(
        sessions.flatMap((s) => (s.outing !== null && s.uuid ? [s.uuid] : [])),
      );

      const questMap = new Map(quests.map((q) => [q.id, q]));

      return sessions.map((s) => {
        const quest = s.questId ? questMap.get(s.questId) : null;
        return {
          id: s.id,
          // A deleted quest is not the hero's mistake, so it is never "not found" here.
          questTitle: quest ? localizedTitle(quest, language) : t("journal.own_quest"),
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
    },
    [language, t],
  );

  /**
   * The list, re-read only when the Journal changed or `force` says so. Everything already scrolled
   * through is read back in one go, so a return from a session keeps the hero's place.
   */
  const loadHistory = useCallback(
    async (force = false) => {
      try {
        const version = `${await getJournalVersion()}|${language}`;
        if (!force && version === shownVersion.current) return;
        const limit = Math.max(history.length, HISTORY_PAGE);
        const page = await readPage(0, limit);
        shownVersion.current = version;
        setHistory(page);
        setHasMore(page.length === limit);
      } catch (error) {
        reportError("journal.loadHistory", error);
      } finally {
        setHistoryLoaded(true);
      }
    },
    [history.length, language, readPage],
  );

  /**
   * The next page, when the list reaches its end. The history used to stop at the hundredth session,
   * and a veteran could not reach the session a two-year-old record fell in.
   */
  const loadMore = useCallback(async () => {
    if (!hasMore || loadingMore.current) return;
    loadingMore.current = true;
    try {
      const page = await readPage(history.length);
      setHistory((previous) => [...previous, ...page]);
      setHasMore(page.length === HISTORY_PAGE);
    } catch (error) {
      reportError("journal.loadMoreHistory", error);
    } finally {
      loadingMore.current = false;
    }
  }, [hasMore, history.length, readPage]);

  // Only once History is shown: the tab opens on Stats, and reading a page of sessions it does not
  // draw doubled the JS work of the Journal's first paint (perf audit, 2026-09-15).
  useFocusEffect(
    useCallback(() => {
      if (activeTab !== "history") return;
      loadHistory().catch((e) => reportError("journal.history", e));
    }, [activeTab, loadHistory]),
  );

  const [refreshing, setRefreshing] = useState(false);
  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await Promise.all([loadHistory(true), reloadStats()]);
    setRefreshing(false);
  }, [loadHistory, reloadStats]);

  const refreshControl = (
    <RefreshControl
      refreshing={refreshing}
      onRefresh={onRefresh}
      tintColor={rawColors.textSecondary}
      colors={[rawColors.resourceGold]}
      progressBackgroundColor={rawColors.surface2}
    />
  );

  const openSession = useCallback((id: number) => router.push(`/journal/${id}` as never), [router]);

  const renderHistoryItem = useCallback(
    ({ item }: { item: JournalEntry }) => <SessionCard entry={item} onPressEntry={openSession} />,
    [openSession],
  );

  return (
    <YStack testID="journal-screen" flex={1} bg="$bgDark">
      <XStack pt={insets.top + 11} px={11} pb={11} items="center" justify="space-between">
        <NTitle>{t("journal.title")}</NTitle>
        <NSeg
          value={activeTab}
          onChange={setActiveTab}
          options={[
            { value: "stats", label: t("journal.tab_stats"), testID: "journal-tab-stats" },
            { value: "history", label: t("journal.tab_history"), testID: "journal-tab-history" },
          ]}
        />
      </XStack>

      {activeTab === "history" ? (
        history.length > 0 ? (
          <LegendList
            data={history}
            renderItem={renderHistoryItem}
            keyExtractor={journalKey}
            ItemSeparatorComponent={ListGap}
            recycleItems
            estimatedItemSize={100}
            refreshControl={refreshControl}
            onEndReached={() => {
              loadMore().catch((e) => reportError("journal.loadMoreHistory", e));
            }}
            onEndReachedThreshold={0.5}
            style={{ flex: 1 }}
            contentContainerStyle={{ paddingHorizontal: 11, paddingBottom: insets.bottom + 20 }}
            showsVerticalScrollIndicator={false}
          />
        ) : historyLoaded ? (
          <YStack
            testID="journal-history-empty"
            mx={11}
            mt={17}
            p={17}
            rounded={8}
            borderWidth={1}
            borderStyle="dashed"
            borderColor="$glassBorder"
            items="center"
            gap={8}
          >
            <NText fontWeight="500" fontSize={16}>
              {t("journal.history_empty_title")}
            </NText>
            <NMuted fontSize={13} lineHeight={20} style={{ textAlign: "center" }}>
              {t("journal.history_empty_body")}
            </NMuted>
          </YStack>
        ) : null
      ) : (
        <ScrollView
          contentContainerStyle={{ paddingBottom: insets.bottom + 20 }}
          showsVerticalScrollIndicator={false}
          refreshControl={refreshControl}
        >
          {stats ? <StatsView stats={stats} /> : <StatsSkeleton />}
        </ScrollView>
      )}
    </YStack>
  );
}
