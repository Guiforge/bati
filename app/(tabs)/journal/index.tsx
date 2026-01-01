import { BarChart2, ChevronLeft, List } from "@tamagui/lucide-icons";
import { useFocusEffect, useRouter } from "expo-router";
import { useCallback, useState } from "react";
import { useTranslation } from "react-i18next";
import { ScrollView } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { H2, Paragraph, Text, XStack, YStack } from "tamagui";
import { AppButton, AppIconButton } from "@/components/common/AppButton";
import { AchievementsCard } from "@/components/journal/AchievementsCard";
import { JournalStats } from "@/components/journal/JournalStats";
import { MonthlyCalendarCard } from "@/components/journal/MonthlyCalendarCard";
import { MuscleBalanceCard } from "@/components/journal/MuscleBalanceCard";
import { PersonalRecordsCard } from "@/components/journal/PersonalRecordsCard";
import { RestSuggestionCard } from "@/components/journal/RestSuggestionCard";
import { type JournalEntry, SessionCard } from "@/components/journal/SessionCard";
import { SuggestedQuestsCard } from "@/components/journal/SuggestedQuestsCard";
import { UserLevelCard } from "@/components/journal/UserLevelCard";
import { listCompletedSessions } from "@/db/completed";
import { listQuestTemplates } from "@/db/quests";
import { useSettingsStore } from "@/stores/settings";

type TabType = "history" | "stats";

export default function JournalScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { language } = useSettingsStore();

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
    } catch (e) {
      console.error("Failed to load journal", e);
    } finally {
      setLoading(false);
    }
  }, [language, t]);

  useFocusEffect(
    useCallback(() => {
      loadHistory();
    }, [loadHistory]),
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
      <AppButton
        fullWidth={false}
        flex={1}
        height={44}
        bg={isActive ? "$pastelBlue" : "$bgLight"}
        borderColor={isActive ? "$primary" : "$color"}
        borderWidth={3}
        rounded="$5"
        onPress={() => setActiveTab(tab)}
        pressStyle={{ opacity: 0.9 }}
      >
        <XStack items="center" gap="$2">
          {icon}
          <Text color="$color" fontWeight={isActive ? "900" : "800"} fontSize={14}>
            {label}
          </Text>
        </XStack>
      </AppButton>
    );
  };

  return (
    <YStack flex={1} bg="$background">
      <YStack pt={insets.top + 12} px="$4" pb="$3" gap="$4">
        <YStack gap="$4" items="flex-start">
          <AppIconButton onPress={() => router.back()}>
            <ChevronLeft size={22} color="$color" strokeWidth={2.5} />
          </AppIconButton>
          <YStack>
            <H2 fontWeight="900" fontSize={32} color="$color">
              {t("journal.title", "Quest Journal")}
            </H2>
            <Paragraph opacity={0.6} fontWeight="600" color="$color">
              {t("journal.subtitle", "Your heroic history")}
            </Paragraph>
          </YStack>
        </YStack>

        {/* Tab Navigation */}
        {history.length > 0 && (
          <XStack gap="$2">
            <TabButton
              tab="stats"
              icon={
                <BarChart2 size={16} color="$color" opacity={activeTab === "stats" ? 1 : 0.7} />
              }
              label={t("journal.tab_stats", "Stats")}
            />
            <TabButton
              tab="history"
              icon={<List size={16} color="$color" opacity={activeTab === "history" ? 1 : 0.7} />}
              label={t("journal.tab_history", "History")}
            />
          </XStack>
        )}
      </YStack>

      <ScrollView
        contentContainerStyle={{
          paddingHorizontal: 16,
          paddingBottom: insets.bottom + 20,
          gap: 12,
        }}
        showsVerticalScrollIndicator={false}
      >
        {loading && history.length === 0 ? (
          <Text style={{ textAlign: "center" }} mt="$10" opacity={0.5} color="$color">
            {t("common.loading", "Loading...")}
          </Text>
        ) : history.length === 0 ? (
          <YStack items="center" justify="center" mt="$10" gap="$4">
            <Text fontSize={40}>📜</Text>
            <H2 fontSize={20} style={{ textAlign: "center" }} color="$color">
              {t("journal.empty_title", "No tales yet")}
            </H2>
            <Paragraph style={{ textAlign: "center" }} opacity={0.6} color="$color">
              {t("journal.empty_subtitle", "Complete quests to fill your journal.")}
            </Paragraph>
          </YStack>
        ) : activeTab === "stats" ? (
          <>
            <UserLevelCard />
            <RestSuggestionCard />
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
