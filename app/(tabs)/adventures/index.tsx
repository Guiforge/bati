import { useDatabase } from "@/src/components/DatabaseProvider";
import { resolveImageAsset } from "@/src/constants/assetMap";
import { adventures, quests } from "@/src/db/schema";
import { useGameIcon } from "@/src/hooks/useGameIcon";
import { eq } from "drizzle-orm";
import { Image } from "expo-image";
import { useRouter } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { FlatList } from "react-native";
import { Button, ScrollView, Text, XStack, YStack } from "tamagui";

type Adventure = typeof adventures.$inferSelect & {
  quest: typeof quests.$inferSelect | null;
};

type MuscleFilter = "Chest" | "Back" | "Legs" | "Arms" | "Core" | "Full Body" | null;
type DurationFilter = "<15min" | "15-30min" | "30-45min" | "45min+" | null;
type DifficultyFilter = "Beginner" | "Intermediate" | "Advanced" | null;

export default function AdventuresScreen() {
  const { t, i18n } = useTranslation();
  const router = useRouter();
  const { db } = useDatabase();
  const { GameIcon } = useGameIcon();

  const [adventuresList, setAdventuresList] = useState<Adventure[]>([]);
  const [loading, setLoading] = useState(true);

  const [muscleFilter, setMuscleFilter] = useState<MuscleFilter>(null);
  const [durationFilter, setDurationFilter] = useState<DurationFilter>(null);
  const [difficultyFilter, setDifficultyFilter] = useState<DifficultyFilter>(null);
  const [showFilters, setShowFilters] = useState(false);

  useEffect(() => {
    if (!db) return;

    try {
      const data = db
        .select({
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
        .where(eq(adventures.isActive, 1))
        .orderBy(adventures.sortOrder)
        .all();

      setAdventuresList(data);
    } catch {
      // noop
    } finally {
      setLoading(false);
    }
  }, [db]);

  const filteredAdventures = useMemo(() => {
    // biome-ignore lint/complexity/noExcessiveCognitiveComplexity: Multiple filter conditions required
    return adventuresList.filter((adventure) => {
      const quest = adventure.quest;
      const hasAnyFilter = muscleFilter || durationFilter || difficultyFilter;
      if (hasAnyFilter && !quest) return false;

      if (muscleFilter && quest?.primaryMuscle !== muscleFilter) return false;

      const duration = quest?.estimatedMinutes || 0;
      if (durationFilter === "<15min" && duration >= 15) return false;
      if (durationFilter === "15-30min" && (duration < 15 || duration >= 30)) return false;
      if (durationFilter === "30-45min" && (duration < 30 || duration >= 45)) return false;
      if (durationFilter === "45min+" && duration < 45) return false;

      if (difficultyFilter && quest?.difficulty !== difficultyFilter) return false;

      return true;
    });
  }, [adventuresList, muscleFilter, durationFilter, difficultyFilter]);

  const clearFilters = () => {
    setMuscleFilter(null);
    setDurationFilter(null);
    setDifficultyFilter(null);
  };

  const hasActiveFilters = muscleFilter || durationFilter || difficultyFilter;

  // biome-ignore lint/complexity/noExcessiveCognitiveComplexity: Card rendering requires multiple conditions
  const renderAdventureCard = ({ item }: { item: Adventure }) => {
    const title = i18n.language === "fr" ? item.frTitle : item.enTitle;
    const description = i18n.language === "fr" ? item.frDescription : item.enDescription;
    const isBoss = item.kind === "boss";

    return (
      <Button
        unstyled
        onPress={() =>
          router.push({
            pathname: "/adventures/[id]",
            params: { id: String(item.id) },
          })
        }
        mb="$3"
        pressStyle={{ opacity: 0.8, scale: 0.98 }}
      >
        <YStack
          bg="$glassBg"
          borderColor={isBoss ? "$error" : "$borderStrong"}
          borderWidth={isBoss ? 2 : 1}
          borderRadius="$4"
          overflow="hidden"
        >
          <Image
            source={resolveImageAsset(item.imagePath)}
            style={{ width: "100%", height: 200 }}
            contentFit="cover"
            pointerEvents="none"
          />

          <YStack p="$4">
            {isBoss && (
              <XStack
                alignItems="center"
                gap="$2"
                mb="$2"
                bg="$error"
                px="$2"
                py="$1"
                borderRadius="$2"
                alignSelf="flex-start"
              >
                <GameIcon name="lorc/crowned-skull" size={16} tintColor="$text" />
                <Text color="$text" fontSize="$2" fontWeight="bold">
                  {t("adventures.epic_battle")}
                </Text>
              </XStack>
            )}

            <Text color="$text" fontSize={24} fontWeight="bold" mb="$2">
              {title || t("adventures.untitled")}
            </Text>

            {item.quest && (
              <XStack gap="$2" mb="$2" flexWrap="wrap">
                {item.quest.estimatedMinutes && (
                  <YStack
                    bg="$glassBg"
                    borderColor="$borderStrong"
                    borderWidth={1}
                    px="$2"
                    py="$1"
                    borderRadius="$2"
                  >
                    <Text color="$textSecondary" fontSize="$2">
                      {item.quest.estimatedMinutes} min
                    </Text>
                  </YStack>
                )}

                {item.quest.difficulty && (
                  <YStack
                    bg={
                      item.quest.difficulty === "Beginner"
                        ? "$success"
                        : item.quest.difficulty === "Intermediate"
                          ? "$warning"
                          : "$error"
                    }
                    px="$2"
                    py="$1"
                    borderRadius="$2"
                  >
                    <Text color="$text" fontSize="$2" fontWeight="600">
                      {t(`quests.difficulty_${item.quest.difficulty.toLowerCase()}`)}
                    </Text>
                  </YStack>
                )}

                {isBoss && item.bossTotalHp && (
                  <YStack bg="$error" px="$2" py="$1" borderRadius="$2">
                    <Text color="$text" fontSize="$2" fontWeight="600">
                      {item.bossTotalHp} HP
                    </Text>
                  </YStack>
                )}
              </XStack>
            )}

            <Text color="$textSecondary" fontSize="$3" numberOfLines={3}>
              {description || t("adventures.no_description")}
            </Text>
          </YStack>
        </YStack>
      </Button>
    );
  };

  return (
    <YStack flex={1} bg="$bgDark">
      <YStack p="$4" gap="$3" borderBottomWidth={1} borderBottomColor="$borderStrong">
        <Text color="$text" fontSize={32} fontWeight="bold">
          {t("adventures.title")}
        </Text>
        <Text color="$textSecondary" fontSize="$4">
          {t("adventures.subtitle")}
        </Text>

        <XStack gap="$2" alignItems="center">
          <Button
            size="$3"
            bg={muscleFilter ? "$primary" : "$glassBg"}
            borderColor="$borderStrong"
            borderWidth={1}
            color={muscleFilter ? "$text" : "$textSecondary"}
            onPress={() => setShowFilters(!showFilters)}
            pressStyle={{ opacity: 0.8 }}
          >
            {t("adventures.filter_muscle")}
          </Button>

          <Button
            size="$3"
            bg={durationFilter ? "$primary" : "$glassBg"}
            borderColor="$borderStrong"
            borderWidth={1}
            color={durationFilter ? "$text" : "$textSecondary"}
            onPress={() => setShowFilters(!showFilters)}
            pressStyle={{ opacity: 0.8 }}
          >
            {t("adventures.filter_duration")}
          </Button>

          <Button
            size="$3"
            bg={difficultyFilter ? "$primary" : "$glassBg"}
            borderColor="$borderStrong"
            borderWidth={1}
            color={difficultyFilter ? "$text" : "$textSecondary"}
            onPress={() => setShowFilters(!showFilters)}
            pressStyle={{ opacity: 0.8 }}
          >
            {t("adventures.filter_difficulty")}
          </Button>

          {hasActiveFilters && (
            <Button
              size="$3"
              chromeless
              onPress={clearFilters}
              color="$primary"
              pressStyle={{ opacity: 0.7 }}
            >
              {t("adventures.filters_clear")}
            </Button>
          )}
        </XStack>

        {showFilters && (
          <YStack gap="$3" pt="$2">
            <YStack gap="$2">
              <Text color="$textSecondary" fontSize="$3" fontWeight="600">
                {t("adventures.filter_muscle")}
              </Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                <XStack gap="$2">
                  {(["Chest", "Back", "Legs", "Arms", "Core", "Full Body"] as const).map(
                    (muscle) => (
                      <Button
                        key={muscle}
                        size="$2"
                        bg={muscleFilter === muscle ? "$primary" : "$glassBg"}
                        borderColor="$borderStrong"
                        borderWidth={1}
                        onPress={() => setMuscleFilter(muscleFilter === muscle ? null : muscle)}
                      >
                        {t(`quests.muscle_${muscle.toLowerCase().replace(" ", "_")}`)}
                      </Button>
                    )
                  )}
                </XStack>
              </ScrollView>
            </YStack>

            <YStack gap="$2">
              <Text color="$textSecondary" fontSize="$3" fontWeight="600">
                {t("adventures.filter_duration")}
              </Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                <XStack gap="$2">
                  {(["<15min", "15-30min", "30-45min", "45min+"] as const).map((duration) => (
                    <Button
                      key={duration}
                      size="$2"
                      bg={durationFilter === duration ? "$primary" : "$glassBg"}
                      borderColor="$borderStrong"
                      borderWidth={1}
                      onPress={() =>
                        setDurationFilter(durationFilter === duration ? null : duration)
                      }
                    >
                      {t(
                        `quests.duration_${duration === "<15min" ? "short" : duration === "15-30min" ? "medium" : duration === "30-45min" ? "long" : "xl"}`
                      )}
                    </Button>
                  ))}
                </XStack>
              </ScrollView>
            </YStack>

            <YStack gap="$2">
              <Text color="$textSecondary" fontSize="$3" fontWeight="600">
                {t("adventures.filter_difficulty")}
              </Text>
              <XStack gap="$2">
                {(["Beginner", "Intermediate", "Advanced"] as const).map((difficulty) => (
                  <Button
                    key={difficulty}
                    size="$2"
                    bg={difficultyFilter === difficulty ? "$primary" : "$glassBg"}
                    borderColor="$borderStrong"
                    borderWidth={1}
                    onPress={() =>
                      setDifficultyFilter(difficultyFilter === difficulty ? null : difficulty)
                    }
                  >
                    {t(`quests.difficulty_${difficulty.toLowerCase()}`)}
                  </Button>
                ))}
              </XStack>
            </YStack>
          </YStack>
        )}
      </YStack>

      {loading ? (
        <YStack flex={1} alignItems="center" justifyContent="center">
          <Text color="$textSecondary">{t("common.loading")}</Text>
        </YStack>
      ) : (
        <FlatList
          data={filteredAdventures}
          renderItem={renderAdventureCard}
          keyExtractor={(item) => item.id.toString()}
          contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 16, paddingBottom: 32 }}
          ListEmptyComponent={
            <YStack alignItems="center" justifyContent="center" py="$8">
              <GameIcon name="lorc/treasure-map" size={64} tintColor="$textSecondary" />
              <Text color="$textSecondary" fontSize={20} textAlign="center" mt="$4">
                {hasActiveFilters
                  ? t("adventures.empty_filters_title")
                  : t("adventures.empty_title")}
              </Text>
              <Text color="$textSecondary" fontSize="$3" textAlign="center" mt="$2">
                {hasActiveFilters
                  ? t("adventures.empty_filters_subtitle")
                  : t("adventures.empty_subtitle")}
              </Text>
            </YStack>
          }
        />
      )}
    </YStack>
  );
}
