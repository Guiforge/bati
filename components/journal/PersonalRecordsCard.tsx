import { Clock, Flame, Star, Trophy, Zap } from "@tamagui/lucide-icons";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Text, XStack, YStack } from "tamagui";
import { Card } from "@/components/common/Card";
import { Skeleton, SkeletonCard } from "@/components/common/Skeleton";
import { formatDuration } from "@/db/estimate";
import { getPersonalRecordsSummary, type PersonalRecord } from "@/db/personalRecords";
import { getStreakInfo } from "@/db/streaks";

type RecordsSummary = {
  longestSession: PersonalRecord | null;
  mostXp: PersonalRecord | null;
  totalSessions: number;
  bestStreak: number;
};

function RecordItem({
  icon,
  label,
  value,
  subLabel,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  subLabel?: string;
}) {
  return (
    <YStack
      bg="$background"
      p="$3"
      rounded="$4"
      borderWidth={1}
      borderColor="$borderStrong"
      flex={1}
      items="center"
      gap="$1"
    >
      {icon}
      <Text fontSize={11} color="$text" opacity={0.6} style={{ textAlign: "center" }}>
        {label}
      </Text>
      <Text fontWeight="700" fontSize={18} color="$text" style={{ textAlign: "center" }}>
        {value}
      </Text>
      {!!subLabel && (
        <Text fontSize={10} color="$text" opacity={0.5} style={{ textAlign: "center" }}>
          {subLabel}
        </Text>
      )}
    </YStack>
  );
}

export function PersonalRecordsCard() {
  const { t } = useTranslation();
  const [summary, setSummary] = useState<RecordsSummary | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const [data, streakInfo] = await Promise.all([
          getPersonalRecordsSummary(),
          getStreakInfo(),
        ]);
        setSummary({
          ...data,
          bestStreak: streakInfo.best,
        });
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
    return (
      <SkeletonCard>
        <Skeleton height={132} />
      </SkeletonCard>
    );
  }

  if (!summary || summary.totalSessions === 0) {
    return null;
  }

  const longestDuration = summary.longestSession
    ? formatDuration(summary.longestSession.value)
    : "--";
  const mostXp = summary.mostXp ? `${summary.mostXp.value}` : "--";

  return (
    <Card bg="$bgLight">
      <YStack gap="$3">
        <XStack items="center" gap="$2">
          <Trophy size={18} color="$primary" />
          <Text fontWeight="700" fontSize={16} color="$text">
            {t("journal.personal_records")}
          </Text>
        </XStack>

        <XStack gap="$2">
          <RecordItem
            icon={<Flame size={20} color="$primary" />}
            label={t("journal.pr_total_sessions")}
            value={summary.totalSessions.toString()}
          />
          <RecordItem
            icon={<Clock size={20} color="$secondary" />}
            label={t("journal.pr_longest")}
            value={longestDuration}
          />
        </XStack>

        <XStack gap="$2">
          <RecordItem
            icon={<Star size={20} color="$pastelYellow" />}
            label={t("journal.pr_most_xp")}
            value={mostXp}
            subLabel={t("common.xp")}
          />
          <RecordItem
            icon={<Zap size={20} color="$success" />}
            label={t("journal.pr_best_streak")}
            value={summary.bestStreak.toString()}
            subLabel={t("journal.days")}
          />
        </XStack>
      </YStack>
    </Card>
  );
}
