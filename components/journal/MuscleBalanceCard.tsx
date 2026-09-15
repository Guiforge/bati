import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Progress, Text, XStack, YStack } from "tamagui";
import { Card } from "@/components/common/Card";
import { Skeleton, SkeletonCard } from "@/components/common/Skeleton";
import { Target } from "@/components/icons";
import { formatShare } from "@/components/journal/journalFormat";
import {
  getBalanceRecommendation,
  getMuscleBalance,
  getPatternBalance,
  getPullDeficit,
  type MuscleBalance,
  type PatternBalance,
} from "@/db/muscleBalance";
import { formatCount } from "@/db/targets";
import { reportError } from "@/src/reportError";
import { useSettingsStore } from "@/stores/settings";

export function MuscleBalanceCard() {
  const { t } = useTranslation();
  const language = useSettingsStore((s) => s.language);
  const [balance, setBalance] = useState<MuscleBalance | null>(null);
  const [patterns, setPatterns] = useState<PatternBalance | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        // Two views of the same 30 days: muscles say *what* was worked, patterns say what the
        // body was *doing*, and only the second can see a pull deficit.
        const [muscles, byPattern] = await Promise.all([
          getMuscleBalance("30d"),
          getPatternBalance("30d"),
        ]);
        setBalance(muscles);
        setPatterns(byPattern);
      } catch (error) {
        // Same trap as the journal's history: a card that fails to load looks exactly like a
        // card with nothing to show.
        reportError("journal.muscleBalance", error);
      } finally {
        setIsLoading(false);
      }
    }
    load().catch(() => {
      // Error already handled
    });
  }, []);

  if (isLoading) {
    // Six muscle rows plus header: reserve roughly that height, like the sibling cards do.
    return (
      <SkeletonCard>
        <Skeleton height={180} />
      </SkeletonCard>
    );
  }

  // Three sessions before a verdict, the rule the stats page applies: "Needs Work" after one quest
  // judges a single quest's shape.
  if (!balance || balance.totalVolume === 0 || balance.totalSessions < 3) {
    return (
      <Card bg="$bgLight">
        <YStack gap="$2">
          <XStack items="center" gap="$2">
            <Target size={18} color="$text" />
            <Text fontWeight="700" fontSize={16} color="$text">
              {t("journal.muscle_balance")}
            </Text>
          </XStack>
          <Text color="$text" opacity={0.6} fontSize={13}>
            {t("chart.complete_more")}
          </Text>
        </YStack>
      </Card>
    );
  }

  const recommendation = getBalanceRecommendation(balance);
  const maxVolume = Math.max(...balance.muscles.map((m) => m.volume));
  const pullDeficit = patterns ? getPullDeficit(patterns) : null;

  return (
    <Card bg="$bgLight">
      <YStack gap="$3">
        <XStack items="center" justify="space-between">
          <XStack items="center" gap="$2">
            <Target size={18} color="$text" />
            <Text fontWeight="700" fontSize={16} color="$text">
              {t("journal.muscle_balance")}
            </Text>
          </XStack>
          <Text
            fontSize={12}
            fontWeight="700"
            color={recommendation.status === "balanced" ? "$success" : "$primary"}
          >
            {recommendation.status === "balanced"
              ? t("journal.balance_good")
              : t("journal.balance_needs_work")}
          </Text>
        </XStack>

        <YStack gap="$2">
          {balance.muscles.map((m) => {
            const percentage = maxVolume > 0 ? (m.volume / maxVolume) * 100 : 0;
            const isWeak = balance.weakAreas.includes(m.muscle);
            const label = m.label[language];

            return (
              <XStack key={m.muscle} items="center" gap="$2">
                <Text
                  fontSize={12}
                  color={isWeak ? "$primary" : "$text"}
                  fontWeight={isWeak ? "700" : "400"}
                  width={70}
                  numberOfLines={1}
                >
                  {label}
                </Text>
                <YStack flex={1}>
                  <Progress size="$2" value={percentage} bg="$background" rounded="$2">
                    <Progress.Indicator
                      // One accent on the Journal: the muscles behind take it, the rest stay
                      // quiet. Six pastels on a dark card read as six states.
                      bg={isWeak ? "$primary" : "$muted"}
                    />
                  </Progress>
                </YStack>
                <Text fontSize={11} color="$text" opacity={0.6} width={35}>
                  {formatShare(language, m.percentage)}
                </Text>
              </XStack>
            );
          })}
        </YStack>

        {recommendation.status === "needs_attention" && (
          <Text fontSize={12} color="$text" opacity={0.7}>
            {recommendation.message[language]}
          </Text>
        )}

        {/* The bars cannot show these either, for a blunter reason: an exercise with no muscle
            tags joins to nothing. Reporting the smaller total in silence is the same lie a
            loading state tells when it renders a zero. */}
        {balance.unclassifiedResults > 0 ? (
          <Text fontSize={12} color="$text" opacity={0.7}>
            {t("journal.unclassified_volume", { count: balance.unclassifiedResults })}
          </Text>
        ) : null}

        {/* The muscle bars above cannot show this: a row and a push-up both count as "arms".
            Pulling is the first thing to vanish when you train without a bar. */}
        {pullDeficit ? (
          <YStack gap="$1" borderTopWidth={1} borderColor="$borderStrong" pt="$2">
            <Text fontSize={12} fontWeight="700" color="$primaryText">
              {t("journal.pull_deficit_title")}
            </Text>
            <Text fontSize={12} color="$text" opacity={0.7}>
              {t("journal.pull_deficit_body", {
                pull: formatCount(language, pullDeficit.pullVolume),
                push: formatCount(language, pullDeficit.pushVolume),
              })}
            </Text>
          </YStack>
        ) : null}
      </YStack>
    </Card>
  );
}
