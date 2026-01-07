import { eq } from "drizzle-orm";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { ScrollView } from "react-native";
import { Button, Text, XStack, YStack } from "tamagui";
import { useDatabase } from "@/src/components/DatabaseProvider";
import { adventures, exercises, questExercises, quests } from "@/src/db/schema";
import { useGameIcon } from "@/src/hooks/useGameIcon";
import { useSessionStore } from "@/src/stores/session";

type Adventure = typeof adventures.$inferSelect & {
  quest: typeof quests.$inferSelect | null;
};

type QuestExercise = typeof questExercises.$inferSelect & {
  exercise: typeof exercises.$inferSelect;
};

// biome-ignore lint/complexity/noExcessiveCognitiveComplexity: Complex component requires multiple checks
export default function AdventureDetailsScreen() {
  const { id } = useLocalSearchParams();
  const { t, i18n } = useTranslation();
  const router = useRouter();
  const { db } = useDatabase();
  const { GameIcon } = useGameIcon();
  const startSession = useSessionStore((state) => state.startSession);

  const [adventure, setAdventure] = useState<Adventure | null>(null);
  const [questExercisesList, setQuestExercisesList] = useState<QuestExercise[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!db || !id) return;

    const adventureId = Number.parseInt(id as string, 10);
    if (Number.isNaN(adventureId)) {
      setLoading(false);
      return;
    }

    db.select({
      id: adventures.id,
      questId: adventures.questId,
      enTitle: adventures.enTitle,
      frTitle: adventures.frTitle,
      enDescription: adventures.enDescription,
      frDescription: adventures.frDescription,
      author: adventures.author,
      sortOrder: adventures.sortOrder,
      kind: adventures.kind,
      isActive: adventures.isActive,
      imagePath: adventures.imagePath,
      bossTotalHp: adventures.bossTotalHp,
      bossWeaknessMuscle: adventures.bossWeaknessMuscle,
      bossResistanceMuscle: adventures.bossResistanceMuscle,
      createdAt: adventures.createdAt,
      updatedAt: adventures.updatedAt,
      quest: quests,
    })
      .from(adventures)
      .leftJoin(quests, eq(adventures.questId, quests.id))
      .where(eq(adventures.id, adventureId))
      .get()
      .then((adventureData) => {
        setAdventure(adventureData || null);

        if (adventureData?.questId) {
          return db
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
            .where(eq(questExercises.questId, adventureData.questId))
            .orderBy(questExercises.sortOrder)
            .all();
        }
        return [];
      })
      .then((exercisesData) => {
        setQuestExercisesList(exercisesData);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [db, id]);

  const handleStartAdventure = () => {
    if (!adventure?.quest) return;

    startSession(adventure.quest.id, adventure.quest.rounds);
    router.push("/session/countdown");
  };

  if (loading) {
    return (
      <YStack flex={1} bg="$bgDark" alignItems="center" justifyContent="center">
        <Text color="$textSecondary">{t("common.loading")}</Text>
      </YStack>
    );
  }

  if (!adventure) {
    return (
      <YStack flex={1} bg="$bgDark" alignItems="center" justifyContent="center" p="$4">
        <Text color="$text" fontSize="$6" fontWeight="bold" mb="$2">
          {t("adventures.not_found")}
        </Text>
        <Text color="$textSecondary" fontSize="$4" mb="$4">
          {t("adventures.invalid_id")}
        </Text>
        <Button onPress={() => router.back()} bg="$primary">
          {t("common.go_back")}
        </Button>
      </YStack>
    );
  }

  const title = i18n.language === "fr" ? adventure.frTitle : adventure.enTitle;
  const description = i18n.language === "fr" ? adventure.frDescription : adventure.enDescription;
  const isBoss = adventure.kind === "boss";

  return (
    <YStack flex={1} bg="$bgDark">
      <ScrollView contentContainerStyle={{ paddingBottom: 100 }}>
        <YStack p="$4" gap="$4">
          {isBoss && (
            <XStack
              alignItems="center"
              gap="$3"
              bg="$error"
              p="$3"
              borderRadius="$4"
              shadowColor="$error"
              shadowOffset={{ width: 0, height: 4 }}
              shadowOpacity={0.4}
              shadowRadius={12}
            >
              <GameIcon name="skull" size={32} color="$text" />
              <YStack flex={1}>
                <Text color="$text" fontSize="$4" fontWeight="bold">
                  {t("adventures.epic_battle")}
                </Text>
                {adventure.bossTotalHp && (
                  <Text color="$text" fontSize="$3">
                    {t("adventures.boss_hp", { hp: adventure.bossTotalHp })}
                  </Text>
                )}
              </YStack>
            </XStack>
          )}

          <Text color="$text" fontSize="$9" fontWeight="bold">
            {title || t("adventures.untitled")}
          </Text>

          {adventure.quest && (
            <XStack gap="$2" flexWrap="wrap">
              {adventure.quest.difficulty && (
                <YStack
                  bg={
                    adventure.quest.difficulty === "Beginner"
                      ? "$success"
                      : adventure.quest.difficulty === "Intermediate"
                        ? "$warning"
                        : "$error"
                  }
                  px="$3"
                  py="$2"
                  borderRadius="$3"
                >
                  <Text color="$text" fontSize="$3" fontWeight="600">
                    {t(`quests.difficulty_${adventure.quest.difficulty.toLowerCase()}`)}
                  </Text>
                </YStack>
              )}

              {adventure.quest.estimatedMinutes && (
                <YStack
                  bg="$glassBg"
                  borderColor="$borderStrong"
                  borderWidth={1}
                  px="$3"
                  py="$2"
                  borderRadius="$3"
                >
                  <Text color="$textSecondary" fontSize="$3">
                    {adventure.quest.estimatedMinutes} min
                  </Text>
                </YStack>
              )}

              {adventure.quest.primaryMuscle && (
                <YStack bg="$primary" px="$3" py="$2" borderRadius="$3">
                  <Text color="$text" fontSize="$3" fontWeight="600">
                    {adventure.quest.primaryMuscle}
                  </Text>
                </YStack>
              )}
            </XStack>
          )}

          <Text color="$textSecondary" fontSize="$4" lineHeight="$5">
            {description || t("adventures.no_description")}
          </Text>

          {adventure.quest && (
            <>
              <YStack gap="$2" mt="$2">
                <Text color="$text" fontSize="$6" fontWeight="bold">
                  {t("adventures.quest_sequence")}
                </Text>

                <YStack
                  bg="$glassBg"
                  borderColor="$borderStrong"
                  borderWidth={1}
                  p="$3"
                  borderRadius="$3"
                >
                  <XStack alignItems="center" gap="$3">
                    <YStack
                      bg="$primary"
                      w={40}
                      h={40}
                      alignItems="center"
                      justifyContent="center"
                      borderRadius="$full"
                    >
                      <Text color="$text" fontSize="$5" fontWeight="bold">
                        1
                      </Text>
                    </YStack>

                    <YStack flex={1}>
                      <Text color="$text" fontSize="$5" fontWeight="600" mb="$1">
                        {i18n.language === "fr" ? adventure.quest.frTitle : adventure.quest.enTitle}
                      </Text>
                      <Text color="$textSecondary" fontSize="$3">
                        {questExercisesList.length} exercises
                      </Text>
                    </YStack>

                    <GameIcon name="unlock" size={24} color="$success" />
                  </XStack>
                </YStack>

                {isBoss && (
                  <YStack
                    bg="$glassBg"
                    borderColor="$error"
                    borderWidth={2}
                    p="$3"
                    borderRadius="$3"
                  >
                    <XStack alignItems="center" gap="$3">
                      <YStack
                        bg="$error"
                        w={40}
                        h={40}
                        alignItems="center"
                        justifyContent="center"
                        borderRadius="$full"
                      >
                        <GameIcon name="skull" size={24} color="$text" />
                      </YStack>

                      <YStack flex={1}>
                        <Text color="$text" fontSize="$5" fontWeight="600" mb="$1">
                          {t("adventures.boss_fight")}
                        </Text>
                        <Text color="$textSecondary" fontSize="$3">
                          {adventure.bossTotalHp} HP
                        </Text>
                      </YStack>
                    </XStack>
                  </YStack>
                )}
              </YStack>

              <YStack gap="$2" mt="$4">
                <Text color="$text" fontSize="$6" fontWeight="bold">
                  {t("quests.exercises_list")}
                </Text>

                {questExercisesList.map((qe, index) => {
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
                      <XStack alignItems="center" gap="$3">
                        <YStack
                          bg="$primary"
                          w={32}
                          h={32}
                          alignItems="center"
                          justifyContent="center"
                          borderRadius="$full"
                        >
                          <Text color="$text" fontSize="$4" fontWeight="bold">
                            {index + 1}
                          </Text>
                        </YStack>

                        <YStack flex={1}>
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
                })}
              </YStack>
            </>
          )}
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
          bg={isBoss ? "$error" : "$primary"}
          color="$text"
          fontWeight="bold"
          onPress={handleStartAdventure}
          pressStyle={{ opacity: 0.8, scale: 0.98 }}
          shadowColor={isBoss ? "$error" : "$primaryGlow"}
          shadowOffset={{ width: 0, height: 4 }}
          shadowOpacity={0.6}
          shadowRadius={12}
        >
          {t("adventures.start_button")}
        </Button>
      </YStack>
    </YStack>
  );
}
