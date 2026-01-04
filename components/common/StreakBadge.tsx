import { Flame } from "@tamagui/lucide-icons";
import { useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Text, XStack, YStack } from "tamagui";
import { listCompletedSessions } from "@/db/completed";

type StreakInfo = {
  current: number;
  best: number;
  isActive: boolean;
};

// biome-ignore lint/complexity/noExcessiveCognitiveComplexity: Streak calculation requires multiple date comparisons
function calculateStreak(sessions: { performedAt: Date }[]): StreakInfo {
  if (sessions.length === 0) {
    return { current: 0, best: 0, isActive: false };
  }

  // Sort by date descending (most recent first)
  const sorted = [...sessions].sort(
    (a, b) => new Date(b.performedAt).getTime() - new Date(a.performedAt).getTime(),
  );

  // Get unique days
  const uniqueDays = new Set<string>();
  sorted.forEach((s) => {
    const date = new Date(s.performedAt);
    uniqueDays.add(date.toISOString().split("T")[0]);
  });

  const sortedDays = Array.from(uniqueDays).sort().reverse();

  if (sortedDays.length === 0) {
    return { current: 0, best: 0, isActive: false };
  }

  // Check if streak is active (worked out today or yesterday)
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  const lastWorkoutDate = new Date(sortedDays[0]);
  lastWorkoutDate.setHours(0, 0, 0, 0);

  const isActive =
    lastWorkoutDate.getTime() === today.getTime() ||
    lastWorkoutDate.getTime() === yesterday.getTime();

  // Calculate current streak
  let currentStreak = 0;
  if (isActive) {
    const checkDate = new Date(lastWorkoutDate);
    for (const dayStr of sortedDays) {
      const day = new Date(dayStr);
      day.setHours(0, 0, 0, 0);

      if (day.getTime() === checkDate.getTime()) {
        currentStreak++;
        checkDate.setDate(checkDate.getDate() - 1);
      } else if (day.getTime() < checkDate.getTime()) {
        break;
      }
    }
  }

  // Calculate best streak
  let bestStreak = 0;
  const allDays = Array.from(uniqueDays).sort();
  let tempStreak = 1;
  for (let i = 1; i < allDays.length; i++) {
    const prev = new Date(allDays[i - 1]);
    const curr = new Date(allDays[i]);
    const diffDays = (curr.getTime() - prev.getTime()) / (1000 * 60 * 60 * 24);

    if (diffDays === 1) {
      tempStreak++;
    } else {
      bestStreak = Math.max(bestStreak, tempStreak);
      tempStreak = 1;
    }
  }
  bestStreak = Math.max(bestStreak, tempStreak);

  return {
    current: currentStreak,
    best: bestStreak,
    isActive,
  };
}

// Streak milestone definitions
type StreakMilestone = {
  minDays: number;
  name: { en: string; fr: string };
  color: string;
  emoji: string;
};

const streakMilestones: StreakMilestone[] = [
  { minDays: 100, name: { en: "Eternal", fr: "Éternel" }, color: "#FFD700", emoji: "🌟" },
  { minDays: 30, name: { en: "Inferno", fr: "Inferno" }, color: "#FF4500", emoji: "🔥" },
  { minDays: 14, name: { en: "Blaze", fr: "Brasier" }, color: "#FF6347", emoji: "🔥" },
  { minDays: 7, name: { en: "Ember", fr: "Braise" }, color: "#FF8C00", emoji: "✨" },
  { minDays: 3, name: { en: "Spark", fr: "Étincelle" }, color: "#FFA500", emoji: "⚡" },
];

function getStreakMilestone(days: number): StreakMilestone | null {
  for (const milestone of streakMilestones) {
    if (days >= milestone.minDays) {
      return milestone;
    }
  }
  return null;
}

export function StreakBadge() {
  const { t, i18n } = useTranslation();
  const language = i18n.language;
  const [streak, setStreak] = useState<StreakInfo | null>(null);

  const loadStreak = useCallback(async () => {
    try {
      const sessions = await listCompletedSessions(365); // Last year of sessions
      const info = calculateStreak(sessions);
      setStreak(info);
    } catch {
      // Silently fail
    }
  }, []);

  useEffect(() => {
    loadStreak().catch(() => {
      // Error already handled
    });
  }, [loadStreak]);

  if (!streak || streak.current === 0) {
    return null;
  }

  const milestone = getStreakMilestone(streak.current);
  const flameColor = streak.isActive ? "$error" : "$color";
  const flameSize = Math.min(28, 20 + streak.current * 2);

  return (
    <XStack
      bg={streak.isActive ? "$pastelPink" : "$bgLight"}
      borderWidth={2}
      borderColor="$color"
      rounded="$6"
      px="$3"
      py="$2"
      items="center"
      gap="$2"
      shadowColor="$color"
      shadowRadius={0}
      shadowOffset={{ width: 0, height: 3 }}
    >
      <Flame
        size={flameSize}
        color={flameColor}
        fill={streak.isActive ? (milestone?.color ?? "#FF6B35") : "transparent"}
      />
      <YStack>
        <XStack items="center" gap="$1">
          <Text fontWeight="900" fontSize={18} color="$color">
            {streak.current} {t("journal.days")}
          </Text>
          {milestone && <Text fontSize={14}>{milestone.emoji}</Text>}
        </XStack>
        <Text fontSize={10} color="$color" opacity={0.6} fontWeight="700">
          {milestone
            ? milestone.name[language === "fr" ? "fr" : "en"]
            : streak.isActive
              ? t("journal.streak_active")
              : t("journal.streak_inactive")}
        </Text>
      </YStack>
    </XStack>
  );
}
