import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { ScrollView } from "react-native";
import { Button, Text, XStack, YStack } from "tamagui";
import { Difficulty, getQuestById, type Quest } from "@/src/db/quests";
import { useGameIcon } from "@/src/hooks/useGameIcon";
import { useSessionStore } from "@/src/stores/session";

export default function QuestDetailsScreen() {
  const { id } = useLocalSearchParams();
  const { t, i18n } = useTranslation();
  const router = useRouter();
  const { GameIcon } = useGameIcon();
  const startSession = useSessionStore((state) => state.startSession);

  const [quest, setQuest] = useState<Quest | null>(null);
  const [userLevel] = useState<Difficulty>(Difficulty.Medium);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;

    const questId = Number.parseInt(id as string, 10);
    if (Number.isNaN(questId)) {
      setLoading(false);
      return;
    }

    // Load quest with exercises using proper API
    getQuestById(questId, Difficulty.Medium)
      .then((questData) => {
        setQuest(questData);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [id]);

  const handleStartQuest = async () => {
    if (!quest) return;

    await startSession(quest, userLevel);
    router.push("/session/countdown");
  };

  if (loading) {
    return (
      <YStack flex={1} bg="$bgDark" alignItems="center" justifyContent="center">
        <Text color="$textSecondary">{t("quests.loading")}</Text>
      </YStack>
    );
  }

  if (!quest) {
    return (
      <YStack flex={1} bg="$bgDark" alignItems="center" justifyContent="center" p="$4">
        <Text color="$text" fontSize={24} fontWeight="bold" mb="$2">
          {t("quests.not_found")}
        </Text>
        <Text color="$textSecondary" fontSize="$4" mb="$4">
          {t("quests.invalid_id")}
        </Text>
        <Button onPress={() => router.back()} bg="$primary">
          {t("quests.go_back")}
        </Button>
      </YStack>
    );
  }

  const title = i18n.language === "fr" ? quest.frTitle : quest.enTitle;
  const description = i18n.language === "fr" ? quest.frDescription : quest.enDescription;

  return (
    <YStack flex={1} bg="$bgDark">
      <ScrollView contentContainerStyle={{ paddingBottom: 100 }}>
        <YStack p="$4" gap="$4">
          <Text color="$text" fontSize={36} fontWeight="bold">
            {title}
          </Text>

          <Text color="$textSecondary" fontSize={16} lineHeight={24}>
            {description}
          </Text>

          <YStack gap="$2" mt="$2">
            <Text color="$text" fontSize={24} fontWeight="bold">
              {t("quests.exercises_list")}
            </Text>

            {quest.exercises.length === 0 ? (
              <Text color="$textSecondary" fontSize={16}>
                {t("quests.empty_title")}
              </Text>
            ) : (
              quest.exercises.map((qe, index) => {
                const exerciseName =
                  i18n.language === "fr" ? qe.exercise.frName : qe.exercise.enName;

                return (
                  <YStack
                    key={qe.exercise.id}
                    bg="$glassBg"
                    borderColor="$borderStrong"
                    borderWidth={1}
                    p="$3"
                    borderRadius="$3"
                  >
                    <XStack alignItems="center" gap="$3">
                      <YStack
                        bg="$primary"
                        width={32}
                        height={32}
                        alignItems="center"
                        justifyContent="center"
                        borderRadius={999}
                      >
                        <Text color="$text" fontSize={16} fontWeight="bold">
                          {index + 1}
                        </Text>
                      </YStack>

                      <YStack flex={1}>
                        <Text color="$text" fontSize={16} fontWeight="600" mb="$1">
                          {exerciseName}
                        </Text>
                        <Text color="$textSecondary" fontSize={14}>
                          {qe.target.type === "reps"
                            ? `${qe.target.value} reps`
                            : `${qe.target.value}s`}
                        </Text>
                      </YStack>
                    </XStack>
                  </YStack>
                );
              })
            )}
          </YStack>

          <YStack gap="$2" mt="$2">
            <XStack alignItems="center" gap="$2">
              <GameIcon name="repeat" size={20} tintColor="$textSecondary" />
              <Text color="$textSecondary" fontSize={16}>
                {quest.rounds} {quest.rounds === 1 ? "round" : "rounds"}
              </Text>
            </XStack>

            <XStack alignItems="center" gap="$2">
              <GameIcon name="timer" size={20} tintColor="$textSecondary" />
              <Text color="$textSecondary" fontSize={16}>
                {quest.restSeconds}s {t("quests.rest", { count: quest.restSeconds })}
              </Text>
            </XStack>
          </YStack>
        </YStack>
      </ScrollView>

      <YStack
        position="absolute"
        bottom={0}
        left={0}
        right={0}
        p="$4"
        bg="$bgDark"
        borderTopWidth={1}
        borderTopColor="$borderStrong"
      >
        <Button
          size="$5"
          bg="$primary"
          color="$text"
          fontWeight="bold"
          onPress={handleStartQuest}
          pressStyle={{ opacity: 0.8, scale: 0.98 }}
          shadowColor="$primaryGlow"
          shadowOffset={{ width: 0, height: 4 }}
          shadowOpacity={0.6}
          shadowRadius={12}
        >
          {t("quests.start_button")}
        </Button>
      </YStack>
    </YStack>
  );
}
