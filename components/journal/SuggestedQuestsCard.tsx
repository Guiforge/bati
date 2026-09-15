import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { XStack, YStack } from "tamagui";
import { NBlock, NKickerQuiet, NMuted, NRule, NText } from "@/components/journal/nocturne";
import { getSuggestedQuestsForWeakAreas, type SuggestedQuest } from "@/db/muscleBalance";
import { MUSCLE_LABELS } from "@/db/muscles";
import { inSentence, localizedTitle } from "@/src/i18n/localized";
import { reportError } from "@/src/reportError";
import { useSettingsStore } from "@/stores/settings";

/**
 * The quests for what is behind, one line each: the title, and the muscles it works that are
 * behind. The muscles are words: six pastel tags on a dark page read as six states.
 */
export function SuggestedQuestsCard() {
  const { t } = useTranslation();
  const router = useRouter();
  const language = useSettingsStore((s) => s.language);
  const [quests, setQuests] = useState<SuggestedQuest[]>([]);

  useEffect(() => {
    getSuggestedQuestsForWeakAreas(3)
      .then(setQuests)
      // A card that failed to load looks exactly like a card with nothing to show.
      .catch((error) => reportError("journal.suggestedQuests", error));
  }, []);

  // Nothing to suggest, or not read yet: no header hanging over a blank space.
  if (quests.length === 0) return null;

  return (
    <NBlock>
      <NKickerQuiet>{t("journal.suggested_quests")}</NKickerQuiet>
      <YStack mt={6}>
        {quests.map((quest, index) => (
          <YStack key={quest.id}>
            <XStack
              items="center"
              gap={11}
              py={8}
              minH={48}
              onPress={() => router.push(`/quests/${quest.id}` as never, { withAnchor: true })}
              accessibilityRole="button"
              pressStyle={{ opacity: 0.8 }}
            >
              <YStack flex={1} minW={0}>
                <NText fontSize={14} lineHeight={20} numberOfLines={1}>
                  {localizedTitle(quest, language)}
                </NText>
                <NMuted numberOfLines={1}>
                  {quest.matchingMuscles
                    .map((muscle, i) =>
                      i === 0
                        ? MUSCLE_LABELS[muscle][language]
                        : inSentence(MUSCLE_LABELS[muscle][language], language),
                    )
                    .join(", ")}
                </NMuted>
              </YStack>
              <NText color="$resourceGold">→</NText>
            </XStack>
            {index < quests.length - 1 && <NRule my={0} />}
          </YStack>
        ))}
      </YStack>
    </NBlock>
  );
}
