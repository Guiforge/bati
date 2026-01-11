import { BarChart2, List } from "@tamagui/lucide-icons";
import { useFocusEffect, useRouter } from "expo-router";
import { useCallback, useState } from "react";
import { useTranslation } from "react-i18next";
import { Pressable, ScrollView } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { H2, Paragraph, Text, XStack, YStack } from "tamagui";
import { SkeletonHeader, SkeletonList } from "@/src/components/common/SkeletonLoader";
import { useToast } from "@/src/components/common/Toast";
import { AchievementsCard } from "@/src/components/journal/AchievementsCard";
import { DifficultyProgressionCard } from "@/src/components/journal/DifficultyProgressionCard";
import { JournalStats } from "@/src/components/journal/JournalStats";
import { MonthlyCalendarCard } from "@/src/components/journal/MonthlyCalendarCard";
import { MuscleBalanceCard } from "@/src/components/journal/MuscleBalanceCard";
import { PersonalRecordsCard } from "@/src/components/journal/PersonalRecordsCard";
import { RestSuggestionCard } from "@/src/components/journal/RestSuggestionCard";
import { type JournalEntry, SessionCard } from "@/src/components/journal/SessionCard";
import { SuggestedQuestsCard } from "@/src/components/journal/SuggestedQuestsCard";
import { UserLevelCard } from "@/src/components/journal/UserLevelCard";
import { listCompletedSessions } from "@/src/db/completed";
import { listQuestTemplates } from "@/src/db/quests";
import { useHaptics } from "@/src/hooks/useHaptics";
import { useTabBarPadding } from "@/src/hooks/useTabBarPadding";
import { useSettingsStore } from "@/src/stores/settings";

type TabType = "history" | "stats";

export default function JournalScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { language } = useSettingsStore();
  const { paddingBottom } = useTabBarPadding();
  const { showError } = useToast();
  const { impact } = useHaptics();

  const [history, setHistory] = useState<JournalEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<TabType>("stats");

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
      // Error logged for debugging
      showError(t("errors.load_journal_failed", "Failed to load journal"));
      setHistory([]);
    } finally {
      setLoading(false);
    }
  }, [language, t, showError]);

  useFocusEffect(
    useCallback(() => {
      loadHistory();
    }, [loadHistory])
  );

  const TabButton = ({
    tab,
    icon,
    label,
  }: {
    tab: TabType;
    icon: React.ReactNode;
    label: string;
  }) => {
    const isActive = activeTab === tab;
    return (
      <YStack
        flex={1}
        bg="$glassBg"
        borderWidth={1}
        borderColor={isActive ? "$primary" : "$borderStrong"}
        borderRadius="$4"
        onPress={() => {
          impact();
          setActiveTab(tab);
        }}
        pressStyle={{ opacity: 0.8 }}
        style={{
          backgroundColor: isActive ? "rgba(13, 51, 242, 0.15)" : undefined,
        }}
      >
        <Pressable
          onPress={() => {
            impact();
            setActiveTab(tab);
          }}
        >
          <XStack items="center" justify="center" gap="$2" py="$2.5">
            {icon}
            <Text
              color={isActive ? "$primary" : "$textSecondary"}
              fontWeight={isActive ? "900" : "700"}
              fontSize={14}
            >
              {label}
            </Text>
          </XStack>
        </Pressable>
      </YStack>
    );
  };

  return (
    <YStack flex={1} bg="$bgDark">
      <YStack pt={insets.top + 12} px="$4" pb="$3" gap="$4">
        <YStack gap="$2">
          <H2 fontWeight="900" fontSize={32} color="$text">
            {t("journal.title", "Quest Journal")}
          </H2>
          <Paragraph opacity={0.7} fontWeight="600" color="$textSecondary">
            {t("journal.subtitle", "Your heroic history")}
          </Paragraph>
        </YStack>

        {/* Tab Navigation */}
        {history.length > 0 && (
          <XStack gap="$3">
            <TabButton
              tab="stats"
              icon={
                <BarChart2
                  size={18}
                  color={activeTab === "stats" ? "$primary" : "$textSecondary"}
                />
              }
              label={t("journal.tab_stats", "Stats")}
            />
            <TabButton
              tab="history"
              icon={
                <List size={18} color={activeTab === "history" ? "$primary" : "$textSecondary"} />
              }
              label={t("journal.tab_history", "History")}
            />
          </XStack>
        )}
      </YStack>

      <ScrollView
        contentContainerStyle={{
          paddingHorizontal: 16,
          paddingBottom,
          gap: 12,
        }}
        showsVerticalScrollIndicator={false}
      >
        {loading && history.length === 0 ? (
          <>
            <SkeletonHeader />
            <SkeletonList count={2} />
          </>
        ) : history.length === 0 ? (
          <YStack items="center" justify="center" mt="$10" gap="$4">
            <Text fontSize={40}>📜</Text>
            <H2 fontSize={20} style={{ textAlign: "center" }} color="$text">
              {t("journal.empty_title", "No tales yet")}
            </H2>
            <Paragraph style={{ textAlign: "center" }} opacity={0.7} color="$textSecondary">
              {t("journal.empty_subtitle", "Complete quests to fill your journal.")}
            </Paragraph>
          </YStack>
        ) : activeTab === "stats" ? (
          <>
            <UserLevelCard />
            <RestSuggestionCard />
            <DifficultyProgressionCard />
            <PersonalRecordsCard />
            <AchievementsCard />
            <JournalStats sessions={history} />
            <MonthlyCalendarCard />
            <MuscleBalanceCard />
            <SuggestedQuestsCard />
          </>
        ) : (
          history.map((entry) => (
            <SessionCard
              key={entry.id}
              entry={entry}
              onPress={() => router.push(`/journal/${entry.id}` as never)}
            />
          ))
        )}
      </ScrollView>
    </YStack>
  );
}
