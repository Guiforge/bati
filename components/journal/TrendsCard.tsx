import { memo, useCallback, useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { Button, H3, Text, XStack, YStack } from "tamagui";
import { Card } from "@/components/common/Card";
import { Skeleton, SkeletonCard } from "@/components/common/Skeleton";
import { TrendingDown, TrendingUp } from "@/components/icons";
import { getDateTimeFormat } from "@/constants/dateFormatters";
import {
  getTrendSummary,
  type MonthlyTrend,
  type TrendAnalysis,
  type WeeklyTrend,
} from "@/db/completed";
import { reportError } from "@/src/reportError";
import { useSettingsStore } from "@/stores/settings";

type ViewMode = "weekly" | "monthly";

function TrendsCardComponent() {
  const { t } = useTranslation();
  const language = useSettingsStore((s) => s.language);

  const [viewMode, setViewMode] = useState<ViewMode>("weekly");
  const [weeklyTrends, setWeeklyTrends] = useState<WeeklyTrend[]>([]);
  const [monthlyTrends, setMonthlyTrends] = useState<MonthlyTrend[]>([]);
  const [sessionsAnalysis, setSessionsAnalysis] = useState<TrendAnalysis | null>(null);
  const [minutesAnalysis, setMinutesAnalysis] = useState<TrendAnalysis | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const loadData = useCallback(async () => {
    try {
      const summary = await getTrendSummary();
      setWeeklyTrends(summary.weeklyTrends);
      setMonthlyTrends(summary.monthlyTrends);
      setSessionsAnalysis(summary.sessionsAnalysis);
      setMinutesAnalysis(summary.minutesAnalysis);
    } catch (error) {
      // A card that failed to load looks exactly like a card with nothing to show.
      reportError("journal.trends", error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData().catch(() => {
      // Error already handled
    });
  }, [loadData]);

  const currentData = viewMode === "weekly" ? weeklyTrends : monthlyTrends;
  // The window always comes back full now, empty periods included — a hero who has never
  // trained would otherwise be shown eight blank bars instead of "no data yet".
  const hasData = currentData.some((d) => d.sessionCount > 0);

  // Bars precomputed once per data/language change — date-fns format() ran 16× per render
  // and the slice was rebuilt twice.
  const bars = useMemo(() => {
    const formatPeriodLabel = (item: WeeklyTrend | MonthlyTrend) => {
      if ("weekKey" in item) {
        // Weekly - show short date range
        return getDateTimeFormat(language, { day: "numeric", month: "short" }).format(
          item.weekStart,
        );
      }
      // Monthly
      return getDateTimeFormat(language, { month: "short" }).format(item.monthStart);
    };
    const maxSessions = Math.max(1, ...currentData.map((d) => d.sessionCount));
    const maxMinutes = Math.max(1, ...currentData.map((d) => d.totalMinutes));
    return currentData.slice(-8).map((item) => ({
      key: "weekKey" in item ? item.weekKey : item.monthKey,
      label: formatPeriodLabel(item),
      sessionCount: item.sessionCount,
      totalMinutes: item.totalMinutes,
      sessionHeight: (item.sessionCount / maxSessions) * 100,
      minutesHeight: (item.totalMinutes / maxMinutes) * 100,
    }));
  }, [currentData, language]);

  const renderTrendBadge = (analysis: TrendAnalysis | null) => {
    if (!analysis) return null;

    const textColor =
      analysis.trend === "up" ? "$success" : analysis.trend === "down" ? "$error" : "$text";
    const Icon = analysis.trend === "up" ? TrendingUp : TrendingDown;

    return (
      <XStack
        bg="$surface2"
        px="$2"
        py="$1"
        rounded="$3"
        items="center"
        gap="$1"
        borderWidth={1}
        borderColor="$borderStrong"
      >
        {analysis.trend !== "stable" && <Icon size={12} color={textColor} />}
        <Text fontSize={11} fontWeight="700" color={textColor}>
          {analysis.trend === "up"
            ? t("journal.trends_up", { change: Math.abs(analysis.change) })
            : analysis.trend === "down"
              ? t("journal.trends_down", { change: Math.abs(analysis.change) })
              : t("journal.trends_stable")}
        </Text>
      </XStack>
    );
  };

  if (isLoading) {
    // Header + two 60-high charts: reserve the height, like the sibling cards do.
    return (
      <SkeletonCard>
        <Skeleton height={180} />
      </SkeletonCard>
    );
  }

  return (
    <Card bg="$bgLight" width="100%">
      <YStack gap="$3">
        {/* Header */}
        <XStack items="center" justify="space-between">
          <H3 fontWeight="700" color="$text" fontSize={18}>
            {t("journal.trends_title")}
          </H3>
          <XStack gap="$2">
            <Button
              size="$2"
              bg={viewMode === "weekly" ? "$primary" : "$background"}
              borderWidth={1}
              borderColor="$borderStrong"
              onPress={() => setViewMode("weekly")}
              accessibilityState={{ selected: viewMode === "weekly" }}
              rounded="$3"
              px="$2"
            >
              <Text
                fontWeight="700"
                fontSize={12}
                color={viewMode === "weekly" ? "$white" : "$text"}
              >
                {t("journal.trends_weekly")}
              </Text>
            </Button>
            <Button
              size="$2"
              bg={viewMode === "monthly" ? "$primary" : "$background"}
              borderWidth={1}
              borderColor="$borderStrong"
              onPress={() => setViewMode("monthly")}
              accessibilityState={{ selected: viewMode === "monthly" }}
              rounded="$3"
              px="$2"
            >
              <Text
                fontWeight="700"
                fontSize={12}
                color={viewMode === "monthly" ? "$white" : "$text"}
              >
                {t("journal.trends_monthly")}
              </Text>
            </Button>
          </XStack>
        </XStack>

        {!hasData ? (
          <YStack items="center" py="$4">
            <Text color="$text" opacity={0.6}>
              {t("journal.trends_no_data")}
            </Text>
          </YStack>
        ) : (
          <>
            {/* Trend Badges */}
            {viewMode === "weekly" && (sessionsAnalysis || minutesAnalysis) && (
              <XStack gap="$2" flexWrap="wrap">
                {!!sessionsAnalysis && (
                  <XStack items="center" gap="$1">
                    <Text fontSize={12} color="$text" opacity={0.6}>
                      {t("journal.trends_sessions")}:
                    </Text>
                    {renderTrendBadge(sessionsAnalysis)}
                  </XStack>
                )}
                {!!minutesAnalysis && (
                  <XStack items="center" gap="$1">
                    <Text fontSize={12} color="$text" opacity={0.6}>
                      {t("journal.trends_minutes")}:
                    </Text>
                    {renderTrendBadge(minutesAnalysis)}
                  </XStack>
                )}
              </XStack>
            )}

            {/* Sessions Bar Chart */}
            <YStack gap="$2">
              <Text fontSize={12} fontWeight="700" color="$text" opacity={0.7}>
                {t("journal.trends_sessions")}
              </Text>
              <XStack
                gap="$1"
                items="flex-end"
                height={60}
                accessible
                accessibilityLabel={`${t("journal.trends_sessions")}: ${bars
                  .map((b) => `${b.label} ${b.sessionCount}`)
                  .join(", ")}`}
              >
                {bars.map((bar) => (
                  <YStack key={bar.key} flex={1} items="center" gap="$1">
                    <YStack
                      width="100%"
                      height={`${Math.max(4, bar.sessionHeight)}%`}
                      bg="$primary"
                      rounded="$2"
                      borderWidth={1}
                      borderColor="$borderStrong"
                    />
                    <Text fontSize={9} color="$text" opacity={0.5}>
                      {bar.label}
                    </Text>
                  </YStack>
                ))}
              </XStack>
            </YStack>

            {/* Minutes Bar Chart */}
            <YStack gap="$2">
              <Text fontSize={12} fontWeight="700" color="$text" opacity={0.7}>
                {t("journal.trends_minutes")}
              </Text>
              <XStack
                gap="$1"
                items="flex-end"
                height={60}
                accessible
                accessibilityLabel={`${t("journal.trends_minutes")}: ${bars
                  .map((b) => `${b.label} ${b.totalMinutes}`)
                  .join(", ")}`}
              >
                {bars.map((bar) => (
                  <YStack key={bar.key} flex={1} items="center" gap="$1">
                    <YStack
                      width="100%"
                      height={`${Math.max(4, bar.minutesHeight)}%`}
                      bg="$secondary"
                      rounded="$2"
                      borderWidth={1}
                      borderColor="$borderStrong"
                    />
                    <Text fontSize={9} color="$text" opacity={0.5}>
                      {bar.label}
                    </Text>
                  </YStack>
                ))}
              </XStack>
            </YStack>
          </>
        )}
      </YStack>
    </Card>
  );
}

export const TrendsCard = memo(TrendsCardComponent);
