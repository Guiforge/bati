import { Award, Lock } from "@tamagui/lucide-icons";
import { useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Progress, Text, XStack, YStack } from "tamagui";
import { Card } from "@/components/common/Card";
import {
  type AchievementProgress,
  getAchievementStats,
  getAllAchievementsWithProgress,
} from "@/db/achievements";
import { useSettingsStore } from "@/stores/settings";

type CategoryFilter = "all" | "sessions" | "streaks" | "xp" | "special";

export function AchievementsCard() {
  const { t } = useTranslation();
  const { language } = useSettingsStore();
  const [achievements, setAchievements] = useState<AchievementProgress[]>([]);
  const [stats, setStats] = useState({ total: 0, unlocked: 0, percentage: 0 });
  const [filter, setFilter] = useState<CategoryFilter>("all");
  const [loading, setLoading] = useState(true);

  const loadAchievements = useCallback(async () => {
    try {
      setLoading(true);
      const [allAchievements, achievementStats] = await Promise.all([
        getAllAchievementsWithProgress(),
        getAchievementStats(),
      ]);
      setAchievements(allAchievements);
      setStats(achievementStats);
    } catch (e) {
      console.error("Failed to load achievements", e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadAchievements();
  }, [loadAchievements]);

  const filteredAchievements =
    filter === "all" ? achievements : achievements.filter((a) => a.definition.category === filter);

  // Sort: unlocked first, then by progress
  const sortedAchievements = [...filteredAchievements].sort((a, b) => {
    if (a.isUnlocked && !b.isUnlocked) return -1;
    if (!a.isUnlocked && b.isUnlocked) return 1;
    return b.progress - a.progress;
  });

  const categories: { key: CategoryFilter; label: string }[] = [
    { key: "all", label: t("achievements.filter_all") },
    { key: "sessions", label: t("achievements.filter_sessions") },
    { key: "streaks", label: t("achievements.filter_streaks") },
    { key: "xp", label: t("achievements.filter_xp") },
    { key: "special", label: t("achievements.filter_special") },
  ];

  if (loading) {
    return (
      <Card>
        <YStack items="center" py="$4">
          <Text color="$color" opacity={0.6}>
            {t("common.loading")}
          </Text>
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
          borderWidth={2}
          borderColor="$color"
          items="center"
          justify="center"
        >
          <Award size={24} color="$color" />
        </YStack>
        <YStack flex={1}>
          <Text fontWeight="900" fontSize={18} color="$color">
            {t("achievements.title")}
          </Text>
          <Text fontSize={12} color="$color" opacity={0.6}>
            {t("achievements.progress", {
              unlocked: stats.unlocked,
              total: stats.total,
            })}
          </Text>
        </YStack>
        <YStack items="center">
          <Text fontWeight="900" fontSize={24} color="$primary">
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
        borderColor="$color"
        rounded="$4"
      >
        <Progress.Indicator animation="bouncy" bg="$primary" />
      </Progress>

      {/* Category Filters */}
      <XStack gap="$2" flexWrap="wrap">
        {categories.map(({ key, label }) => (
          <YStack
            key={key}
            px="$2"
            py="$1"
            bg={filter === key ? "$primary" : "$bgLight"}
            borderWidth={2}
            borderColor={filter === key ? "$primary" : "$color"}
            rounded="$3"
            pressStyle={{ opacity: 0.8 }}
            onPress={() => setFilter(key)}
          >
            <Text fontSize={12} fontWeight="700" color={filter === key ? "white" : "$color"}>
              {label}
            </Text>
          </YStack>
        ))}
      </XStack>

      {/* Achievements Grid */}
      <YStack gap="$3">
        {sortedAchievements.slice(0, 8).map((achievement) => (
          <AchievementRow key={achievement.code} achievement={achievement} language={language} />
        ))}
      </YStack>

      {sortedAchievements.length > 8 && (
        <Text fontSize={12} color="$color" opacity={0.6} style={{ textAlign: "center" }}>
          {t("achievements.more_count", { count: sortedAchievements.length - 8 })}
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
  language: string;
}) {
  const { definition, isUnlocked, progress, currentValue, targetValue } = achievement;

  const title = language === "fr" ? definition.frTitle : definition.enTitle;
  const description = language === "fr" ? definition.frDescription : definition.enDescription;

  return (
    <XStack
      gap="$3"
      items="center"
      bg={isUnlocked ? "$pastelGreen" : "$bgLight"}
      p="$3"
      rounded="$4"
      borderWidth={2}
      borderColor={isUnlocked ? "$success" : "$color"}
      opacity={isUnlocked ? 1 : 0.7}
      animation="quick"
      enterStyle={{ opacity: 0, x: 20 }}
    >
      {/* Icon */}
      <YStack
        width={44}
        height={44}
        bg={isUnlocked ? "$background" : "$bgLight"}
        rounded="$3"
        borderWidth={2}
        borderColor="$color"
        items="center"
        justify="center"
      >
        {isUnlocked ? (
          <Text fontSize={24}>{definition.icon}</Text>
        ) : (
          <Lock size={20} color="$color" opacity={0.5} />
        )}
      </YStack>

      {/* Content */}
      <YStack flex={1} gap="$1">
        <XStack items="center" gap="$2">
          <Text fontWeight="900" fontSize={14} color="$color" numberOfLines={1} flex={1}>
            {title}
          </Text>
          {!isUnlocked && (
            <Text fontSize={10} color="$color" opacity={0.6}>
              {currentValue}/{targetValue}
            </Text>
          )}
        </XStack>

        <Text fontSize={11} color="$color" opacity={0.6} numberOfLines={1}>
          {description}
        </Text>

        {!isUnlocked && targetValue > 1 && (
          <Progress
            value={progress}
            size="$1"
            bg="$background"
            borderWidth={1}
            borderColor="$color"
            rounded="$2"
            mt="$1"
          >
            <Progress.Indicator animation="bouncy" bg="$primary" opacity={0.8} />
          </Progress>
        )}
      </YStack>

      {/* Unlocked checkmark */}
      {isUnlocked && <Text fontSize={20}>✓</Text>}
    </XStack>
  );
}
