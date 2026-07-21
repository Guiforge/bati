import { Sparkles } from "@tamagui/lucide-icons";
import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { type ColorTokens, Text, XStack, YStack } from "tamagui";
import { AppButton } from "@/components/common/AppButton";
import { Card } from "@/components/common/Card";
import { getSuggestedQuestsForWeakAreas, type SuggestedQuest } from "@/db/muscleBalance";
import { MUSCLE_LABELS } from "@/db/muscles";
import { useSettingsStore } from "@/stores/settings";

const MUSCLE_COLORS: Record<string, ColorTokens> = {
  arms: "$pastelPink",
  back: "$pastelBlue",
  chest: "$pastelYellow",
  abs: "$pastelGreen",
  shoulder: "$pastelPurple",
  calf: "$pastelOrange",
};

export function SuggestedQuestsCard() {
  const { t } = useTranslation();
  const router = useRouter();
  const { language } = useSettingsStore();
  const [quests, setQuests] = useState<SuggestedQuest[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const data = await getSuggestedQuestsForWeakAreas(3);
        setQuests(data);
      } catch (_e) {
      } finally {
        setIsLoading(false);
      }
    }
    load().catch(() => {
      // Error already handled
    });
  }, []);

  if (isLoading) {
    return null; // Don't show loading state, just hide until ready
  }

  if (quests.length === 0) {
    return null; // No suggestions available
  }

  return (
    <Card bg="$bgLight">
      <YStack gap="$3">
        <XStack items="center" gap="$2">
          <Sparkles size={18} color="$primary" />
          <Text fontWeight="700" fontSize={16} color="$text">
            {t("journal.suggested_quests")}
          </Text>
        </XStack>

        <Text fontSize={12} color="$text" opacity={0.7}>
          {t("journal.suggested_quests_desc")}
        </Text>

        <YStack gap="$2">
          {quests.map((quest) => {
            const title = language === "fr" ? quest.frTitle : quest.enTitle;

            return (
              <AppButton
                key={quest.id}
                fullWidth
                bg="$background"
                height="auto"
                py="$2"
                px="$3"
                onPress={() => router.push(`/quests/${quest.id}` as never)}
              >
                <YStack flex={1} gap="$1">
                  <Text fontWeight="700" fontSize={14} color="$text" numberOfLines={1}>
                    {title}
                  </Text>
                  <XStack gap="$1" flexWrap="wrap">
                    {quest.matchingMuscles.map((muscle) => (
                      <XStack
                        key={muscle}
                        bg={MUSCLE_COLORS[muscle] ?? "$bgLight"}
                        px="$2"
                        py="$1"
                        rounded="$3"
                        borderWidth={1}
                        borderColor="$borderStrong"
                      >
                        <Text fontSize={10} fontWeight="700" color="$text">
                          {language === "fr" ? MUSCLE_LABELS[muscle].fr : MUSCLE_LABELS[muscle].en}
                        </Text>
                      </XStack>
                    ))}
                  </XStack>
                </YStack>
              </AppButton>
            );
          })}
        </YStack>
      </YStack>
    </Card>
  );
}
