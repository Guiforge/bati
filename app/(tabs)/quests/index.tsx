import { Image } from "expo-image";
import { useRouter } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { FlatList } from "react-native";
import { Button, ScrollView, Text, XStack, YStack } from "tamagui";
import { FilterChip } from "@/src/components/common/FilterChip";
import { MuscleIcon } from "@/src/components/common/MuscleIcon";
import { SkeletonList } from "@/src/components/common/SkeletonLoader";
import { useToast } from "@/src/components/common/Toast";
import { useDatabase } from "@/src/components/DatabaseProvider";
import { resolveImageAsset } from "@/src/constants/assetMap";
import { MUSCLE_LABELS } from "@/src/db/muscles";
import { type MuscleCode, quests } from "@/src/db/schema";
import { useHaptics } from "@/src/hooks/useHaptics";
import { useTabBarPadding } from "@/src/hooks/useTabBarPadding";

type Quest = typeof quests.$inferSelect;

type MuscleFilter = MuscleCode | null;
type DurationFilter = "<15min" | "15-30min" | "30-45min" | "45min+" | null;
type DifficultyFilter = "Beginner" | "Intermediate" | "Advanced" | null;

export default function QuestsScreen() {
  const { t, i18n } = useTranslation();
  const router = useRouter();
  const { db } = useDatabase();
  const { paddingBottom } = useTabBarPadding();
  const { showError } = useToast();
  const { impact } = useHaptics();

  const [questsList, setQuestsList] = useState<Quest[]>([]);
  const [loading, setLoading] = useState(true);

  const [muscleFilter, setMuscleFilter] = useState<MuscleFilter>(null);
  const [durationFilter, setDurationFilter] = useState<DurationFilter>(null);
  const [difficultyFilter, setDifficultyFilter] = useState<DifficultyFilter>(null);
  const [showFilters, setShowFilters] = useState(false);

  useEffect(() => {
    if (!db) return;

    try {
      const data = db.select().from(quests).all();
      setQuestsList(data);
    } catch {
      // Error logged for debugging
      showError(t("errors.load_quests_failed", "Failed to load quests"));
      setQuestsList([]);
    } finally {
      setLoading(false);
    }
  }, [db, showError, t]);

  const filteredQuests = useMemo(() => {
    // biome-ignore lint/complexity/noExcessiveCognitiveComplexity: Multiple filter conditions required
    return questsList.filter((quest) => {
      if (muscleFilter && quest.primaryMuscle !== muscleFilter) return false;

      const duration = quest.estimatedMinutes || 0;
      if (durationFilter === "<15min" && duration >= 15) return false;
      if (durationFilter === "15-30min" && (duration < 15 || duration >= 30)) return false;
      if (durationFilter === "30-45min" && (duration < 30 || duration >= 45)) return false;
      if (durationFilter === "45min+" && duration < 45) return false;

      if (difficultyFilter && quest.difficulty !== difficultyFilter) return false;

      return true;
    });
  }, [questsList, muscleFilter, durationFilter, difficultyFilter]);

  const clearFilters = () => {
    setMuscleFilter(null);
    setDurationFilter(null);
    setDifficultyFilter(null);
  };

  const hasActiveFilters = muscleFilter || durationFilter || difficultyFilter;
  const activeFilterCount = [muscleFilter, durationFilter, difficultyFilter].filter(Boolean).length;

  const getFilterLabel = (filter: MuscleFilter | DurationFilter | DifficultyFilter) => {
    if (!filter) return "";

    if (muscleFilter === filter) {
      const lang = i18n.language as "en" | "fr";
      return MUSCLE_LABELS[filter as MuscleCode][lang];
    }
    // For muscle filters
    if (["Chest", "Back", "Legs", "Arms", "Core", "Full Body"].includes(filter as string)) {
      return t(`quests.muscle_${(filter as string).toLowerCase().replace(" ", "_")}`);
    }
    // For duration filters
    if (["<15min", "15-30min", "30-45min", "45min+"].includes(filter as string)) {
      const durationMap: Record<string, string> = {
        "<15min": "short",
        "15-30min": "medium",
        "30-45min": "long",
        "45min+": "xl",
      };
      return t(`quests.duration_${durationMap[filter as string]}`);
    }
    // For difficulty filters
    if (["Beginner", "Intermediate", "Advanced"].includes(filter as string)) {
      return t(`quests.difficulty_${(filter as string).toLowerCase()}`);
    }
    return filter as string;
  };

  const renderQuestCard = ({ item }: { item: Quest }) => {
    const title = i18n.language === "fr" ? item.frTitle : item.enTitle;
    const description = i18n.language === "fr" ? item.frDescription : item.enDescription;

    return (
      <Button
        unstyled
        mb="$3"
        onPress={() => {
          impact();
          router.push(`/(modals)/quest-details/${item.id}`);
        }}
        pressStyle={{ opacity: 0.8, scale: 0.98 }}
      >
        <YStack
          bg="$glassBg"
          borderColor="$borderStrong"
          borderWidth={1}
          borderRadius="$4"
          overflow="hidden"
        >
          <Image
            source={resolveImageAsset(item.imagePath)}
            style={{ width: "100%", height: 180 }}
            contentFit="cover"
          />

          <YStack p="$4">
            <Text color="$text" fontSize={24} fontWeight="bold" mb="$2">
              {title}
            </Text>

            <XStack gap="$2" mb="$2" flexWrap="wrap" alignItems="center">
              {item.primaryMuscle && (
                <XStack
                  bg="$primary"
                  px="$2"
                  py="$1"
                  borderRadius="$2"
                  gap="$1.5"
                  alignItems="center"
                >
                  <MuscleIcon
                    muscle={item.primaryMuscle as MuscleCode}
                    size={14}
                    tintColor="$text"
                  />
                  <Text color="$text" fontSize="$2" fontWeight="600">
                    {MUSCLE_LABELS[item.primaryMuscle as MuscleCode]?.[
                      i18n.language as "en" | "fr"
                    ] || item.primaryMuscle}
                  </Text>
                </XStack>
              )}

              {item.estimatedMinutes && (
                <YStack
                  bg="$glassBg"
                  borderColor="$borderStrong"
                  borderWidth={1}
                  px="$2"
                  py="$1"
                  borderRadius="$2"
                >
                  <Text color="$textSecondary" fontSize="$2">
                    {item.estimatedMinutes} min
                  </Text>
                </YStack>
              )}

              {item.difficulty && (
                <YStack
                  bg={
                    item.difficulty === "Beginner"
                      ? "$success"
                      : item.difficulty === "Intermediate"
                        ? "$warning"
                        : "$error"
                  }
                  px="$2"
                  py="$1"
                  borderRadius="$2"
                >
                  <Text color="$text" fontSize="$2" fontWeight="600">
                    {t(`quests.difficulty_${item.difficulty.toLowerCase()}`)}
                  </Text>
                </YStack>
              )}
            </XStack>

            <Text color="$textSecondary" fontSize="$3" numberOfLines={2}>
              {description}
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
          {t("quests.gallery_title")}
        </Text>

        {/* Active Filter Chips */}
        {hasActiveFilters && (
          <XStack gap="$2" flexWrap="wrap">
            {muscleFilter && (
              <FilterChip
                label={getFilterLabel(muscleFilter)}
                onRemove={() => setMuscleFilter(null)}
              />
            )}
            {durationFilter && (
              <FilterChip
                label={getFilterLabel(durationFilter)}
                onRemove={() => setDurationFilter(null)}
              />
            )}
            {difficultyFilter && (
              <FilterChip
                label={getFilterLabel(difficultyFilter)}
                onRemove={() => setDifficultyFilter(null)}
              />
            )}
          </XStack>
        )}

        {/* Filter Toggle Buttons */}
        <XStack gap="$2" alignItems="center" flexWrap="wrap">
          <Button
            size="$3"
            bg="$glassBg"
            borderColor="$borderStrong"
            borderWidth={1}
            color="$textSecondary"
            onPress={() => {
              impact();
              setShowFilters(!showFilters);
            }}
            pressStyle={{ opacity: 0.8 }}
          >
            {t("quests.filters", "Filters")}
            {activeFilterCount > 0 && ` (${activeFilterCount})`}
          </Button>

          {hasActiveFilters && (
            <Button
              size="$3"
              chromeless
              onPress={() => {
                impact();
                clearFilters();
              }}
              color="$primary"
              pressStyle={{ opacity: 0.7 }}
            >
              {t("quests.filters_clear")}
            </Button>
          )}
        </XStack>

        {showFilters && (
          <YStack gap="$3" pt="$2">
            <YStack gap="$2">
              <Text color="$textSecondary" fontSize="$3" fontWeight="600">
                {t("quests.filter_muscle")}
              </Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                <XStack gap="$2">
                  {(["arms", "back", "shoulder", "chest", "abs", "calf"] as const).map((muscle) => {
                    const lang = i18n.language as "en" | "fr";
                    const label = MUSCLE_LABELS[muscle][lang];
                    return (
                      <Button
                        key={muscle}
                        size="$3"
                        bg={muscleFilter === muscle ? "$primary" : "$glassBg"}
                        borderColor="$borderStrong"
                        borderWidth={1}
                        onPress={() => {
                          impact();
                          setMuscleFilter(muscleFilter === muscle ? null : muscle);
                        }}
                        iconAfter={
                          <MuscleIcon
                            muscle={muscle}
                            size={16}
                            tintColor={muscleFilter === muscle ? "$text" : "$textSecondary"}
                          />
                        }
                      >
                        {label}
                      </Button>
                    );
                  })}
                </XStack>
              </ScrollView>
            </YStack>

            <YStack gap="$2">
              <Text color="$textSecondary" fontSize="$3" fontWeight="600">
                {t("quests.filter_duration")}
              </Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                <XStack gap="$2">
                  {(["<15min", "15-30min", "30-45min", "45min+"] as const).map((duration) => (
                    <Button
                      key={duration}
                      size="$3"
                      bg={durationFilter === duration ? "$primary" : "$glassBg"}
                      borderColor="$borderStrong"
                      borderWidth={1}
                      onPress={() => {
                        impact();
                        setDurationFilter(durationFilter === duration ? null : duration);
                      }}
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
                {t("quests.filter_difficulty")}
              </Text>
              <XStack gap="$2">
                {(["Beginner", "Intermediate", "Advanced"] as const).map((difficulty) => (
                  <Button
                    key={difficulty}
                    size="$3"
                    bg={difficultyFilter === difficulty ? "$primary" : "$glassBg"}
                    borderColor="$borderStrong"
                    borderWidth={1}
                    onPress={() => {
                      impact();
                      setDifficultyFilter(difficultyFilter === difficulty ? null : difficulty);
                    }}
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
        <SkeletonList count={3} />
      ) : (
        <FlatList
          data={filteredQuests}
          renderItem={renderQuestCard}
          keyExtractor={(item) => item.id.toString()}
          contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 16, paddingBottom }}
          ListEmptyComponent={
            <YStack alignItems="center" justifyContent="center" py="$8">
              <Text color="$textSecondary" fontSize={20} textAlign="center">
                {hasActiveFilters ? t("quests.empty_filters_title") : t("quests.empty_title")}
              </Text>
              <Text color="$textSecondary" fontSize="$3" textAlign="center" mt="$2">
                {hasActiveFilters ? t("quests.empty_filters_subtitle") : t("quests.empty_subtitle")}
              </Text>
            </YStack>
          }
        />
      )}
    </YStack>
  );
}
