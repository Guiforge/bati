import { TrendingDown, TrendingUp } from "@tamagui/lucide-icons";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { memo, useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Button, H3, Text, XStack, YStack } from "tamagui";
import { Card } from "@/components/common/Card";
import {
  getTrendSummary,
  type MonthlyTrend,
  type TrendAnalysis,
  type WeeklyTrend,
} from "@/db/completed";
import { useSettingsStore } from "@/stores/settings";

type ViewMode = "weekly" | "monthly";

function TrendsCardComponent() {
  const { t } = useTranslation();
  const { language } = useSettingsStore();

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
    } catch (e) {
      console.error("Failed to load trends:", e);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const currentData = viewMode === "weekly" ? weeklyTrends : monthlyTrends;
  const hasData = currentData.length > 0;

  // Get max values for scaling the bars
  const maxSessions = Math.max(1, ...currentData.map((d) => d.sessionCount));
  const maxMinutes = Math.max(1, ...currentData.map((d) => d.totalMinutes));

  const formatPeriodLabel = (item: WeeklyTrend | MonthlyTrend) => {
    if ("weekKey" in item) {
      // Weekly - show short date range
      return format(item.weekStart, "d MMM", { locale: language === "fr" ? fr : undefined });
    }
    // Monthly
    return format(item.monthStart, "MMM", { locale: language === "fr" ? fr : undefined });
  };

  const renderTrendBadge = (analysis: TrendAnalysis | null) => {
    if (!analysis) return null;

    const color =
      analysis.trend === "up"
        ? "$pastelGreen"
        : analysis.trend === "down"
          ? "$pastelPink"
          : "$bgLight";
    const textColor =
      analysis.trend === "up" ? "green" : analysis.trend === "down" ? "red" : "$color";
    const Icon = analysis.trend === "up" ? TrendingUp : TrendingDown;

    return (
      <XStack
        bg={color}
        px="$2"
        py="$1"
        rounded="$3"
        items="center"
        gap="$1"
        borderWidth={1}
        borderColor="$color"
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
    return (
      <Card bg="$bgLight" width="100%">
        <YStack items="center" py="$4">
          <Text color="$color" opacity={0.6}>
            {t("common.loading")}
          </Text>
        </YStack>
      </Card>
    );
  }

  return (
    <Card bg="$bgLight" width="100%">
      <YStack gap="$3">
        {/* Header */}
        <XStack items="center" justify="space-between">
          <H3 fontWeight="900" color="$color" fontSize={18}>
            {t("journal.trends_title")}
          </H3>
          <XStack gap="$2">
            <Button
              size="$2"
              bg={viewMode === "weekly" ? "$primary" : "$background"}
              borderWidth={2}
              borderColor="$color"
              onPress={() => setViewMode("weekly")}
              rounded="$3"
              px="$2"
            >
              <Text
                fontWeight="700"
                fontSize={12}
                color={viewMode === "weekly" ? "white" : "$color"}
              >
                {t("journal.trends_weekly")}
              </Text>
            </Button>
            <Button
              size="$2"
              bg={viewMode === "monthly" ? "$primary" : "$background"}
              borderWidth={2}
              borderColor="$color"
              onPress={() => setViewMode("monthly")}
              rounded="$3"
              px="$2"
            >
              <Text
                fontWeight="700"
                fontSize={12}
                color={viewMode === "monthly" ? "white" : "$color"}
              >
                {t("journal.trends_monthly")}
              </Text>
            </Button>
          </XStack>
        </XStack>

        {!hasData ? (
          <YStack items="center" py="$4">
            <Text color="$color" opacity={0.6}>
              {t("journal.trends_no_data")}
            </Text>
          </YStack>
        ) : (
          <>
            {/* Trend Badges */}
            {viewMode === "weekly" && (sessionsAnalysis || minutesAnalysis) && (
              <XStack gap="$2" flexWrap="wrap">
                {sessionsAnalysis && (
                  <XStack items="center" gap="$1">
                    <Text fontSize={12} color="$color" opacity={0.6}>
                      {t("journal.trends_sessions")}:
                    </Text>
                    {renderTrendBadge(sessionsAnalysis)}
                  </XStack>
                )}
                {minutesAnalysis && (
                  <XStack items="center" gap="$1">
                    <Text fontSize={12} color="$color" opacity={0.6}>
                      {t("journal.trends_minutes")}:
                    </Text>
                    {renderTrendBadge(minutesAnalysis)}
                  </XStack>
                )}
              </XStack>
            )}

            {/* Sessions Bar Chart */}
            <YStack gap="$2">
              <Text fontSize={12} fontWeight="700" color="$color" opacity={0.7}>
                {t("journal.trends_sessions")}
              </Text>
              <XStack gap="$1" items="flex-end" height={60}>
                {currentData.slice(-8).map((item) => {
                  const height = (item.sessionCount / maxSessions) * 100;
                  return (
                    <YStack
                      key={"weekKey" in item ? item.weekKey : item.monthKey}
                      flex={1}
                      items="center"
                      gap="$1"
                    >
                      <YStack
                        width="100%"
                        height={`${Math.max(4, height)}%`}
                        bg="$primary"
                        rounded="$2"
                        borderWidth={1}
                        borderColor="$color"
                      />
                      <Text fontSize={9} color="$color" opacity={0.5}>
                        {formatPeriodLabel(item)}
                      </Text>
                    </YStack>
                  );
                })}
              </XStack>
            </YStack>

            {/* Minutes Bar Chart */}
            <YStack gap="$2">
              <Text fontSize={12} fontWeight="700" color="$color" opacity={0.7}>
                {t("journal.trends_minutes")}
              </Text>
              <XStack gap="$1" items="flex-end" height={60}>
                {currentData.slice(-8).map((item) => {
                  const height = (item.totalMinutes / maxMinutes) * 100;
                  return (
                    <YStack
                      key={"weekKey" in item ? item.weekKey : item.monthKey}
                      flex={1}
                      items="center"
                      gap="$1"
                    >
                      <YStack
                        width="100%"
                        height={`${Math.max(4, height)}%`}
                        bg="$secondary"
                        rounded="$2"
                        borderWidth={1}
                        borderColor="$color"
                      />
                      <Text fontSize={9} color="$color" opacity={0.5}>
                        {formatPeriodLabel(item)}
                      </Text>
                    </YStack>
                  );
                })}
              </XStack>
            </YStack>
          </>
        )}
      </YStack>
    </Card>
  );
}

export const TrendsCard = memo(TrendsCardComponent);
