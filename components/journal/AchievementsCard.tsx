import { Award, Lock } from "@tamagui/lucide-icons";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { Progress, Text, XStack, YStack } from "tamagui";
import { Card } from "@/components/common/Card";
import { Skeleton } from "@/components/common/Skeleton";
import { type AchievementProgress, getAllAchievementsWithProgress } from "@/db/achievements";
import { useReducedMotion } from "@/hooks/useReducedMotion";
import { localizedTitle } from "@/src/i18n/localized";
import { reportError } from "@/src/reportError";
import { type AppLanguage, useSettingsStore } from "@/stores/settings";

type CategoryFilter = "all" | "sessions" | "streaks" | "xp" | "special";

/** Enough to show the shelf without the card swallowing the stats tab. */
const COLLAPSED_ROWS = 8;

export function AchievementsCard() {
  const { t } = useTranslation();
  const language = useSettingsStore((s) => s.language);
  const [achievements, setAchievements] = useState<AchievementProgress[]>([]);
  const [stats, setStats] = useState({ total: 0, unlocked: 0, percentage: 0 });
  const [filter, setFilter] = useState<CategoryFilter>("all");
  const [expanded, setExpanded] = useState(false);
  const [loading, setLoading] = useState(true);

  const loadAchievements = useCallback(async () => {
    try {
      setLoading(true);
      // One pipeline: the stats are derivable from the progress list, no second round
      // of queries needed.
      const allAchievements = await getAllAchievementsWithProgress();
      const total = allAchievements.length;
      const unlocked = allAchievements.filter((a) => a.isUnlocked).length;
      setAchievements(allAchievements);
      setStats({
        total,
        unlocked,
        percentage: total > 0 ? Math.round((unlocked / total) * 100) : 0,
      });
    } catch (error) {
      // A card that failed to load looks exactly like a card with nothing to show.
      reportError("journal.achievements", error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadAchievements();
  }, [loadAchievements]);

  // Sort: unlocked first, then by progress
  const sortedAchievements = useMemo(() => {
    const filtered =
      filter === "all"
        ? achievements
        : achievements.filter((a) => a.definition.category === filter);
    return [...filtered].sort((a, b) => {
      if (a.isUnlocked && !b.isUnlocked) return -1;
      if (!a.isUnlocked && b.isUnlocked) return 1;
      return b.progress - a.progress;
    });
  }, [achievements, filter]);

  const categories: { key: CategoryFilter; label: string }[] = useMemo(
    () => [
      { key: "all", label: t("achievements.filter_all") },
      { key: "sessions", label: t("achievements.filter_sessions") },
      { key: "streaks", label: t("achievements.filter_streaks") },
      { key: "xp", label: t("achievements.filter_xp") },
      { key: "special", label: t("achievements.filter_special") },
    ],
    [t],
  );

  if (loading) {
    return (
      <Card gap="$4">
        <XStack items="center" gap="$3">
          <Skeleton width={44} height={44} radius={22} />
          <YStack flex={1} gap="$2">
            <Skeleton height={18} width="50%" />
            <Skeleton height={8} width="100%" />
          </YStack>
        </XStack>
        <XStack gap="$2">
          <Skeleton height={28} width={50} radius={14} />
          <Skeleton height={28} width={70} radius={14} />
          <Skeleton height={28} width={60} radius={14} />
        </XStack>
        <YStack gap="$3">
          <Skeleton height={60} width="100%" radius={12} />
          <Skeleton height={60} width="100%" radius={12} />
        </YStack>
      </Card>
    );
  }

  return (
    <Card gap="$4">
      {/* Header */}
      <XStack items="center" gap="$3">
        <YStack
          width={44}
          height={44}
          bg="$pastelYellow"
          rounded="$4"
          borderWidth={1}
          borderColor="$borderStrong"
          items="center"
          justify="center"
        >
          <Award size={24} color="$text" />
        </YStack>
        <YStack flex={1}>
          <Text fontWeight="700" fontSize={18} color="$text">
            {t("achievements.title")}
          </Text>
          <Text fontSize={12} color="$text" opacity={0.6}>
            {t("achievements.progress", {
              unlocked: stats.unlocked,
              total: stats.total,
            })}
          </Text>
        </YStack>
        <YStack items="center">
          <Text fontWeight="700" fontSize={24} color="$primaryText">
            {stats.percentage}%
          </Text>
        </YStack>
      </XStack>

      {/* Overall Progress Bar */}
      <Progress
        value={stats.percentage}
        size="$2"
        bg="$bgLight"
        borderWidth={1}
        borderColor="$borderStrong"
        rounded="$4"
      >
        <Progress.Indicator transition="bouncy" bg="$primary" />
      </Progress>

      {/* Category Filters */}
      <XStack gap="$2" flexWrap="wrap">
        {categories.map(({ key, label }) => (
          <YStack
            key={key}
            px="$2"
            py="$1"
            bg={filter === key ? "$primary" : "$bgLight"}
            borderWidth={1}
            borderColor={filter === key ? "$primary" : "$text"}
            rounded="$3"
            pressStyle={{ opacity: 0.8 }}
            onPress={() => setFilter(key)}
          >
            <Text fontSize={12} fontWeight="700" color={filter === key ? "white" : "$text"}>
              {label}
            </Text>
          </YStack>
        ))}
      </XStack>

      {/* Achievements Grid */}
      <YStack gap="$3">
        {(expanded ? sortedAchievements : sortedAchievements.slice(0, COLLAPSED_ROWS)).map(
          (achievement) => (
            <AchievementRow key={achievement.code} achievement={achievement} language={language} />
          ),
        )}
      </YStack>

      {/* The count was a dead end: it named the rest of the shelf without a way to reach it. */}
      {sortedAchievements.length > COLLAPSED_ROWS && (
        <Text
          fontSize={12}
          color="$text"
          opacity={0.6}
          style={{ textAlign: "center" }}
          pressStyle={{ opacity: 1 }}
          accessibilityRole="button"
          onPress={() => setExpanded((value) => !value)}
        >
          {expanded
            ? t("achievements.show_less", "Show less")
            : t("achievements.more_count", {
                count: sortedAchievements.length - COLLAPSED_ROWS,
              })}
        </Text>
      )}
    </Card>
  );
}

function AchievementRow({
  achievement,
  language,
}: {
  achievement: AchievementProgress;
  language: AppLanguage;
}) {
  const { definition, isUnlocked, progress, currentValue, targetValue } = achievement;
  const reducedMotion = useReducedMotion();

  const title = localizedTitle(definition, language);
  const description = language === "fr" ? definition.frDescription : definition.enDescription;

  return (
    <XStack
      gap="$3"
      items="center"
      bg={isUnlocked ? "$pastelGreen" : "$bgLight"}
      p="$3"
      rounded="$4"
      borderWidth={1}
      borderColor={isUnlocked ? "$success" : "$text"}
      opacity={isUnlocked ? 1 : 0.7}
      transition={reducedMotion ? undefined : "quick"}
      enterStyle={reducedMotion ? undefined : { opacity: 0, x: 20 }}
    >
      {/* Icon */}
      <YStack
        width={44}
        height={44}
        bg={isUnlocked ? "$background" : "$bgLight"}
        rounded="$3"
        borderWidth={1}
        borderColor="$borderStrong"
        items="center"
        justify="center"
      >
        {isUnlocked ? (
          <Text fontSize={24}>{definition.icon}</Text>
        ) : (
          <Lock size={20} color="$text" opacity={0.5} />
        )}
      </YStack>

      {/* Content */}
      <YStack flex={1} gap="$1">
        <XStack items="center" gap="$2">
          <Text fontWeight="700" fontSize={14} color="$text" numberOfLines={1} flex={1}>
            {title}
          </Text>
          {!isUnlocked && (
            <Text fontSize={10} color="$text" opacity={0.6}>
              {currentValue}/{targetValue}
            </Text>
          )}
        </XStack>

        <Text fontSize={11} color="$text" opacity={0.6} numberOfLines={1}>
          {description}
        </Text>

        {!isUnlocked && targetValue > 1 && (
          <Progress
            value={progress}
            size="$1"
            bg="$background"
            borderWidth={1}
            borderColor="$borderStrong"
            rounded="$2"
            mt="$1"
          >
            <Progress.Indicator transition="bouncy" bg="$primary" opacity={0.8} />
          </Progress>
        )}
      </YStack>

      {/* Unlocked checkmark */}
      {!!isUnlocked && <Text fontSize={20}>✓</Text>}
    </XStack>
  );
}
