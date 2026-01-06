import { eq } from "drizzle-orm";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { ScrollView } from "react-native";
import { Button, Text, XStack, YStack } from "tamagui";
import { useDatabase } from "@/components/DatabaseProvider";
import { exercises, questExercises, quests } from "@/db/schema";
import { useGameIcon } from "@/hooks/useGameIcon";
import { useSessionStore } from "@/stores/session";

type Quest = typeof quests.$inferSelect;
type QuestExercise = typeof questExercises.$inferSelect & {
  exercise: typeof exercises.$inferSelect;
};

export default function QuestDetailsScreen() {
  const { id } = useLocalSearchParams();
  const { t, i18n } = useTranslation();
  const router = useRouter();
  const { db } = useDatabase();
  const { GameIcon } = useGameIcon();
  const startSession = useSessionStore((state) => state.startSession);

  const [quest, setQuest] = useState<Quest | null>(null);
  const [questExercisesList, setQuestExercisesList] = useState<QuestExercise[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!db || !id) return;

    const questId = Number.parseInt(id as string, 10);
    if (Number.isNaN(questId)) {
      setLoading(false);
      return;
    }

    Promise.all([
      db.select().from(quests).where(eq(quests.id, questId)).get(),
      db
        .select({
          id: questExercises.id,
          questId: questExercises.questId,
          exerciseId: questExercises.exerciseId,
          sortOrder: questExercises.sortOrder,
          targetType: questExercises.targetType,
          targetMin: questExercises.targetMin,
          targetMax: questExercises.targetMax,
          imagesJson: questExercises.imagesJson,
          exercise: exercises,
        })
        .from(questExercises)
        .innerJoin(exercises, eq(questExercises.exerciseId, exercises.id))
        .where(eq(questExercises.questId, questId))
        .orderBy(questExercises.sortOrder)
        .all(),
    ])
      .then(([questData, exercisesData]) => {
        setQuest(questData || null);
        setQuestExercisesList(exercisesData);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [db, id]);

  const handleStartQuest = () => {
    if (!quest) return;

    startSession(quest.id, quest.rounds);
    router.push("/session/countdown");
  };

  if (loading) {
    return (
      <YStack f={1} bg="$bgDark" ai="center" jc="center">
        <Text color="$textSecondary">{t("quests.loading")}</Text>
      </YStack>
    );
  }

  if (!quest) {
    return (
      <YStack f={1} bg="$bgDark" ai="center" jc="center" p="$4">
        <Text color="$text" fontSize="$6" fontWeight="bold" mb="$2">
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
    <YStack f={1} bg="$bgDark">
      <ScrollView contentContainerStyle={{ paddingBottom: 100 }}>
        <YStack p="$4" gap="$4">
          <Text color="$text" fontSize="$9" fontWeight="bold">
            {title}
          </Text>

          <XStack gap="$2" flexWrap="wrap">
            {quest.difficulty && (
              <YStack
                bg={
                  quest.difficulty === "Beginner"
                    ? "$success"
                    : quest.difficulty === "Intermediate"
                      ? "$warning"
                      : "$error"
                }
                px="$3"
                py="$2"
                borderRadius="$3"
              >
                <Text color="$text" fontSize="$3" fontWeight="600">
                  {t(`quests.difficulty_${quest.difficulty.toLowerCase()}`)}
                </Text>
              </YStack>
            )}

            {quest.estimatedMinutes && (
              <YStack
                bg="$glassBg"
                borderColor="$borderStrong"
                borderWidth={1}
                px="$3"
                py="$2"
                borderRadius="$3"
              >
                <Text color="$textSecondary" fontSize="$3">
                  {quest.estimatedMinutes} min
                </Text>
              </YStack>
            )}

            {quest.primaryMuscle && (
              <YStack bg="$primary" px="$3" py="$2" borderRadius="$3">
                <Text color="$text" fontSize="$3" fontWeight="600">
                  {quest.primaryMuscle}
                </Text>
              </YStack>
            )}

            {quest.secondaryMuscles && (
              <YStack
                bg="$glassBg"
                borderColor="$borderStrong"
                borderWidth={1}
                px="$3"
                py="$2"
                borderRadius="$3"
              >
                <Text color="$textSecondary" fontSize="$3">
                  {quest.secondaryMuscles}
                </Text>
              </YStack>
            )}
          </XStack>

          <Text color="$textSecondary" fontSize="$4" lineHeight="$5">
            {description}
          </Text>

          <YStack gap="$2" mt="$2">
            <Text color="$text" fontSize="$6" fontWeight="bold">
              {t("quests.exercises_list")}
            </Text>

            {questExercisesList.length === 0 ? (
              <Text color="$textSecondary" fontSize="$4">
                {t("quests.empty_title")}
              </Text>
            ) : (
              questExercisesList.map((qe, index) => {
                const exerciseName =
                  i18n.language === "fr" ? qe.exercise.frName : qe.exercise.enName;

                return (
                  <YStack
                    key={qe.id}
                    bg="$glassBg"
                    borderColor="$borderStrong"
                    borderWidth={1}
                    p="$3"
                    borderRadius="$3"
                  >
                    <XStack ai="center" gap="$3">
                      <YStack
                        bg="$primary"
                        w={32}
                        h={32}
                        ai="center"
                        jc="center"
                        borderRadius="$full"
                      >
                        <Text color="$text" fontSize="$4" fontWeight="bold">
                          {index + 1}
                        </Text>
                      </YStack>

                      <YStack f={1}>
                        <Text color="$text" fontSize="$4" fontWeight="600" mb="$1">
                          {exerciseName}
                        </Text>
                        <Text color="$textSecondary" fontSize="$3">
                          {qe.targetType === "reps"
                            ? `${qe.targetMin}-${qe.targetMax} reps`
                            : qe.targetType === "duration"
                              ? `${qe.targetMin}-${qe.targetMax}s`
                              : `${qe.targetMin}-${qe.targetMax}`}
                        </Text>
                      </YStack>
                    </XStack>
                  </YStack>
                );
              })
            )}
          </YStack>

          <YStack gap="$2" mt="$2">
            <XStack ai="center" gap="$2">
              <GameIcon name="repeat" size={20} color="$textSecondary" />
              <Text color="$textSecondary" fontSize="$4">
                {quest.rounds} {quest.rounds === 1 ? "round" : "rounds"}
              </Text>
            </XStack>

            <XStack ai="center" gap="$2">
              <GameIcon name="timer" size={20} color="$textSecondary" />
              <Text color="$textSecondary" fontSize="$4">
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
