import { LegendList } from "@legendapp/list";
import { BarChart2, List } from "@tamagui/lucide-icons";
import { useFocusEffect, useRouter } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { InteractionManager, ScrollView } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { H2, Paragraph, Text, XStack, YStack } from "tamagui";
import { AppButton } from "@/components/common/AppButton";
import { AchievementsCard } from "@/components/journal/AchievementsCard";
import { DifficultyProgressionCard } from "@/components/journal/DifficultyProgressionCard";
import { JournalStats } from "@/components/journal/JournalStats";
import { MonthlyCalendarCard } from "@/components/journal/MonthlyCalendarCard";
import { MuscleBalanceCard } from "@/components/journal/MuscleBalanceCard";
import { PersonalRecordsCard } from "@/components/journal/PersonalRecordsCard";
import { type JournalEntry, SessionCard } from "@/components/journal/SessionCard";
import { SuggestedQuestsCard } from "@/components/journal/SuggestedQuestsCard";
import { UserLevelCard } from "@/components/journal/UserLevelCard";
import { listCompletedSessions } from "@/db/completed";
import { listQuestTemplates } from "@/db/quests";
import { useSettingsStore } from "@/stores/settings";

type TabType = "history" | "stats";

// Hoisted so the list doesn't get a fresh function identity on every parent render.
const journalKey = (entry: JournalEntry) => String(entry.id);
const ListGap = () => <YStack height={12} />;

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
      fullWidth={false}
      flex={1}
      height={44}
      bg={isActive ? "$surface2" : "$surface"}
      borderColor={isActive ? "$primary" : "$borderStrong"}
      borderWidth={1}
      rounded="$5"
      onPress={() => onSelect(tab)}
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

export default function JournalScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { language } = useSettingsStore();

  const [history, setHistory] = useState<JournalEntry[]>([]);
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
    const task = InteractionManager.runAfterInteractions(() => setStatsReady(true));
    return () => task.cancel();
  }, [activeTab, history.length]);

  const loadHistory = useCallback(async () => {
    try {
      setLoading(true);
      // Fetch sessions and quest templates to resolve titles
      const [sessions, quests] = await Promise.all([
        listCompletedSessions(100),
        listQuestTemplates(),
      ]);

      const questMap = new Map(quests.map((q) => [q.id, q]));

      const entries: JournalEntry[] = sessions.map((s) => {
        const quest = s.questId ? questMap.get(s.questId) : null;
        const title = quest
          ? language === "fr"
            ? quest.frTitle
            : quest.enTitle
          : t("quests.not_found", "Unknown Quest");

        return {
          id: s.id,
          questTitle: title,
          performedAt: s.performedAt,
          durationSeconds: s.durationSeconds,
          userLevel: s.userLevel,
          hasNewRecords: s.hasNewRecords,
        };
      });

      setHistory(entries);
    } catch {
      // Error handled silently
    } finally {
      setLoading(false);
    }
  }, [language, t]);

  useFocusEffect(
    useCallback(() => {
      loadHistory();
    }, [loadHistory]),
  );

  const renderHistoryItem = useCallback(
    ({ item }: { item: JournalEntry }) => (
      <SessionCard entry={item} onPress={() => router.push(`/journal/${item.id}` as never)} />
    ),
    [router],
  );

  return (
    <YStack flex={1} bg="$background">
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
          estimatedItemSize={100}
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
        >
          {loading && history.length === 0 ? (
            <Text style={{ textAlign: "center" }} mt="$10" color="$textSecondary">
              {t("common.loading", "Loading...")}
            </Text>
          ) : history.length === 0 ? (
            <YStack items="center" justify="center" mt="$10" gap="$4">
              <Text fontSize={40}>📜</Text>
              <H2 fontSize={20} style={{ textAlign: "center" }} color="$text">
                {t("journal.empty_title", "No tales yet")}
              </H2>
              <Paragraph style={{ textAlign: "center" }} color="$textSecondary">
                {t("journal.empty_subtitle", "Complete quests to fill your journal.")}
              </Paragraph>
            </YStack>
          ) : !statsReady ? (
            <Text style={{ textAlign: "center" }} mt="$10" color="$textSecondary">
              {t("common.loading", "Loading...")}
            </Text>
          ) : (
            <>
              <UserLevelCard />
              <DifficultyProgressionCard />
              <PersonalRecordsCard />
              <AchievementsCard />
              <JournalStats sessions={history} />
              <MonthlyCalendarCard />
              <MuscleBalanceCard />
              <SuggestedQuestsCard />
            </>
          )}
        </ScrollView>
      )}
    </YStack>
  );
}
