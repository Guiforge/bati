import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { useWindowDimensions } from "react-native";
import { BarChart } from "react-native-gifted-charts";
import { Paragraph, Text, XStack, YStack } from "tamagui";
import { Card } from "@/components/common/Card";
import type { SessionSummary } from "@/db";
import { getQuestSessionHistory, getRecentSessionHistory } from "@/db";
import { useSettingsStore } from "@/stores/settings";

type ChartMode = "quest" | "all";

interface ProgressionChartProps {
  /** If provided, shows history for this specific quest. Otherwise shows all recent sessions. */
  questId?: number | null;
  /** Maximum number of sessions to show */
  limit?: number;
  /** Title to display above the chart */
  title?: string;
}

type ChartDataPoint = {
  value: number;
  label: string;
  frontColor: string;
  topLabelComponent?: () => React.ReactNode;
};

export function ProgressionChart({ questId, limit = 10, title }: ProgressionChartProps) {
  const { t } = useTranslation();
  const { language } = useSettingsStore();
  const { width } = useWindowDimensions();

  const [sessions, setSessions] = useState<SessionSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const mode: ChartMode = questId ? "quest" : "all";

  useEffect(() => {
    let mounted = true;

    const loadData = async () => {
      setLoading(true);
      setError(null);

      try {
        const data = questId
          ? await getQuestSessionHistory(questId, limit)
          : await getRecentSessionHistory(limit);

        if (!mounted) return;
        setSessions(data);
      } catch (e) {
        if (!mounted) return;
        setError(e instanceof Error ? e.message : "Failed to load data");
      } finally {
        if (mounted) setLoading(false);
      }
    };

    loadData();

    return () => {
      mounted = false;
    };
  }, [questId, limit]);

  if (loading) {
    return (
      <Card>
        <XStack items="center" justify="center" gap="$3" py="$4">
          <Text fontSize={24}>📊</Text>
          <Text fontWeight="900" fontSize={14} color="$color">
            {t("chart.loading")}
          </Text>
        </XStack>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <YStack gap="$2" items="center" py="$2">
          <Text fontSize={24}>😵</Text>
          <Text fontWeight="900" fontSize={14} color="$color">
            {t("chart.error")}
          </Text>
          <Paragraph color="$color" opacity={0.6} size="$2">
            {error}
          </Paragraph>
        </YStack>
      </Card>
    );
  }

  if (sessions.length === 0) {
    return (
      <Card>
        <YStack gap="$2" items="center" py="$4">
          <Text fontSize={32}>📈</Text>
          <Text fontWeight="900" fontSize={14} color="$color">
            {t("chart.no_data")}
          </Text>
          <Paragraph color="$color" opacity={0.6} size="$2" style={{ textAlign: "center" }}>
            {t("chart.complete_more")}
          </Paragraph>
        </YStack>
      </Card>
    );
  }

  // Prepare chart data - show duration in minutes
  const chartData: ChartDataPoint[] = sessions.map((session) => {
    const durationMinutes = session.durationSeconds ? Math.round(session.durationSeconds / 60) : 0;

    const dateLabel = new Intl.DateTimeFormat(language, {
      day: "numeric",
      month: "short",
    }).format(new Date(session.performedAt));

    // Color based on difficulty level
    let barColor = "#6366F1"; // primary - medium
    if (session.userLevel === "easy") {
      barColor = "#22C55E"; // success - easy
    } else if (session.userLevel === "hard") {
      barColor = "#EF4444"; // error - hard
    }

    return {
      value: durationMinutes,
      label: dateLabel,
      frontColor: barColor,
    };
  });

  // Calculate stats
  const totalDuration = sessions.reduce((acc, s) => acc + (s.durationSeconds || 0), 0);
  const avgDuration = sessions.length > 0 ? totalDuration / sessions.length : 0;
  const avgMinutes = Math.round(avgDuration / 60);
  const totalMinutes = Math.round(totalDuration / 60);

  // Chart dimensions
  const chartWidth = Math.min(width - 80, 320);
  const barWidth = Math.max(16, Math.floor(chartWidth / (sessions.length * 2)));
  const spacing = Math.max(8, Math.floor(barWidth / 2));

  // Find max value for Y-axis
  const maxValue = Math.max(...chartData.map((d) => d.value), 1);
  const yAxisMax = Math.ceil(maxValue / 5) * 5 + 5; // Round up to nearest 5

  return (
    <Card>
      <YStack gap="$4">
        {/* Title */}
        <YStack gap="$1">
          <Text fontWeight="900" fontSize={16} color="$color">
            {title || t("chart.progression_title")}
          </Text>
          <Paragraph color="$color" opacity={0.6} size="$2">
            {mode === "quest" ? t("chart.quest_history") : t("chart.all_history")}
          </Paragraph>
        </YStack>

        {/* Stats Row */}
        <XStack gap="$4" justify="space-around">
          <YStack items="center">
            <Text fontWeight="900" fontSize={24} color="$primary">
              {sessions.length}
            </Text>
            <Text fontSize={12} color="$color" opacity={0.6}>
              {t("chart.workouts")}
            </Text>
          </YStack>
          <YStack items="center">
            <Text fontWeight="900" fontSize={24} color="$success">
              {totalMinutes}
            </Text>
            <Text fontSize={12} color="$color" opacity={0.6}>
              {t("chart.total_mins")}
            </Text>
          </YStack>
          <YStack items="center">
            <Text fontWeight="900" fontSize={24} color="$secondary">
              {avgMinutes}
            </Text>
            <Text fontSize={12} color="$color" opacity={0.6}>
              {t("chart.avg_mins")}
            </Text>
          </YStack>
        </XStack>

        {/* Chart */}
        <YStack items="center" py="$2">
          <BarChart
            data={chartData}
            width={chartWidth}
            height={160}
            barWidth={barWidth}
            spacing={spacing}
            barBorderRadius={4}
            noOfSections={4}
            maxValue={yAxisMax}
            yAxisThickness={0}
            xAxisThickness={1}
            xAxisColor="#E5E7EB"
            yAxisTextStyle={{
              color: "#9CA3AF",
              fontSize: 10,
            }}
            xAxisLabelTextStyle={{
              color: "#9CA3AF",
              fontSize: 9,
              transform: [{ rotate: "-45deg" }],
            }}
            hideRules
            isAnimated
            animationDuration={500}
          />
        </YStack>

        {/* Legend */}
        <XStack gap="$4" justify="center" flexWrap="wrap">
          <XStack items="center" gap="$2">
            <YStack width={12} height={12} rounded={6} bg="#22C55E" />
            <Text fontSize={11} color="$color" opacity={0.7}>
              {t("quests.level_easy")}
            </Text>
          </XStack>
          <XStack items="center" gap="$2">
            <YStack width={12} height={12} rounded={6} bg="#6366F1" />
            <Text fontSize={11} color="$color" opacity={0.7}>
              {t("quests.level_medium")}
            </Text>
          </XStack>
          <XStack items="center" gap="$2">
            <YStack width={12} height={12} rounded={6} bg="#EF4444" />
            <Text fontSize={11} color="$color" opacity={0.7}>
              {t("quests.level_hard")}
            </Text>
          </XStack>
        </XStack>
      </YStack>
    </Card>
  );
}
