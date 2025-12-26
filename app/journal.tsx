import { ChevronLeft } from "@tamagui/lucide-icons";
import { useFocusEffect, useRouter } from "expo-router";
import { useCallback, useState } from "react";
import { useTranslation } from "react-i18next";
import { ScrollView } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { H2, Paragraph, Text, YStack } from "tamagui";
import { AppIconButton } from "@/components/common/AppButton";
import { type JournalEntry, SessionCard } from "@/components/journal/SessionCard";
import { listCompletedSessions } from "@/db/completed";
import { listQuestTemplates } from "@/db/quests";
import { useSettingsStore } from "@/stores/settings";

export default function JournalScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { language } = useSettingsStore();

  const [history, setHistory] = useState<JournalEntry[]>([]);
  const [loading, setLoading] = useState(true);

  const loadHistory = useCallback(async () => {
    try {
      setLoading(true);
      // Fetch sessions and quest templates to resolve titles
      const [sessions, quests] = await Promise.all([
        listCompletedSessions(50),
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

  return (
    <YStack flex={1} bg="$background">
      <YStack pt={insets.top + 12} px="$4" pb="$4" gap="$4">
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
      </YStack>

      <ScrollView
        contentContainerStyle={{
          paddingHorizontal: 16,
          paddingBottom: insets.bottom + 20,
          gap: 12,
        }}
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
        ) : (
          history.map((entry) => <SessionCard key={entry.id} entry={entry} />)
        )}
      </ScrollView>
    </YStack>
  );
}
