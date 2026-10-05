import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { useWindowDimensions } from "react-native";
import { BarChart } from "react-native-gifted-charts";
import { Paragraph, Text, XStack, YStack } from "tamagui";
import { Card } from "@/components/common/Card";
import { Skeleton } from "@/components/common/Skeleton";
import { getDateTimeFormat } from "@/constants/dateFormatters";
import { DIFFICULTY_COLORS, rawColors } from "@/constants/rawColors";
import type { SessionSummary } from "@/db";
import { getQuestSessionHistory, getRecentSessionHistory } from "@/db";
import { reportError } from "@/src/reportError";
import { useSettingsStore } from "@/stores/settings";

const Y_LABELS_WIDTH = 35;
const LEAD_IN = 4;
const LEGEND = ["easy", "medium", "hard"] as const;

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
  const language = useSettingsStore((s) => s.language);
  const { width } = useWindowDimensions();

  const [sessions, setSessions] = useState<SessionSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const mode: ChartMode = questId ? "quest" : "all";

  useEffect(() => {
    let mounted = true;

    // ponytail: load + transform + error state in one effect. Ceiling: fine at one data
    //           source; split the transform out if a second chart mode appears.
    // A promise chain rather than `try ... finally`, which the React Compiler cannot lower.
    setLoading(true);
    setError(null);
    (questId ? getQuestSessionHistory(questId, limit) : getRecentSessionHistory(limit))
      .then(
        (data) => {
          if (mounted) setSessions(data);
        },
        (e: unknown) => {
          if (mounted) setError(e instanceof Error ? e.message : "Failed to load data");
        },
      )
      .then(() => {
        if (mounted) setLoading(false);
      })
      .catch((e) => reportError("session.progressionChart", e));

    return () => {
      mounted = false;
    };
  }, [questId, limit]);

  if (loading) {
    return (
      <Card>
        <YStack gap="$3">
          <Skeleton height={16} width="40%" />
          <XStack gap="$2" items="flex-end" justify="center" pt="$4">
            <Skeleton width={24} height={60} radius={4} />
            <Skeleton width={24} height={90} radius={4} />
            <Skeleton width={24} height={45} radius={4} />
            <Skeleton width={24} height={75} radius={4} />
            <Skeleton width={24} height={100} radius={4} />
            <Skeleton width={24} height={55} radius={4} />
          </XStack>
        </YStack>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <YStack gap="$2" items="center" py="$2">
          <Text fontSize={24}>😵</Text>
          <Text fontWeight="700" fontSize={14} color="$text">
            {t("chart.error")}
          </Text>
          <Paragraph color="$text" opacity={0.6} size="$2">
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
          <Text fontWeight="700" fontSize={14} color="$text">
            {t("chart.no_data")}
          </Text>
          <Paragraph color="$text" opacity={0.6} size="$2" style={{ textAlign: "center" }}>
            {t("chart.complete_more")}
          </Paragraph>
        </YStack>
      </Card>
    );
  }

  // Ten month labels do not fit unrotated: every other one, wide enough not to truncate.
  const thin = sessions.length > 6;

  // Prepare chart data - show duration in minutes
  const chartData: ChartDataPoint[] = sessions.map((session, index) => {
    const durationMinutes = session.durationSeconds ? Math.round(session.durationSeconds / 60) : 0;

    const dateLabel = getDateTimeFormat(language, { day: "numeric", month: "short" }).format(
      new Date(session.performedAt),
    );

    // gifted-charts cannot consume Tamagui tokens, so the difficulty palette lives in
    // constants/rawColors.ts and is shared with the journal's stats — which used to draw the
    // same three levels in a different green and a different red.
    const barColor = DIFFICULTY_COLORS[session.userLevel];

    return {
      value: durationMinutes,
      label: thin && index % 2 === 1 ? "" : dateLabel,
      frontColor: barColor,
    };
  });

  // Calculate stats
  const totalDuration = sessions.reduce((acc, s) => acc + (s.durationSeconds || 0), 0);
  const avgDuration = sessions.length > 0 ? totalDuration / sessions.length : 0;
  const avgMinutes = Math.round(avgDuration / 60);
  const totalMinutes = Math.round(totalDuration / 60);

  // Chart dimensions. gifted-charts' `width` is the plot alone: the y labels sit to its left, so
  // the footprint is Y_LABELS_WIDTH + plotWidth and `chartWidth` is what the card can hold. The
  // bars share the plot in equal slots (a bar and its gap), after a fixed lead-in.
  const chartWidth = Math.min(width - 80, 320);
  const plotWidth = chartWidth - Y_LABELS_WIDTH;
  const slot = Math.floor((plotWidth - LEAD_IN) / sessions.length);
  const barWidth = Math.max(10, Math.floor(slot * 0.6));
  const spacing = slot - barWidth;
  // A label's box is `labelWidth + spacing` wide, shifted left by `spacing / 2`, so its centre is
  // the bar's centre only when labelWidth == barWidth. Wider text (thin mode: a label every other
  // bar) is widened on the Text itself and pulled back by half the extra, which keeps the centre.
  const labelTextWidth = thin ? slot * 2 : slot;

  // Find max value for Y-axis
  const maxValue = Math.max(...chartData.map((d) => d.value), 1);
  const yAxisMax = Math.ceil(maxValue / 5) * 5 + 5; // Round up to nearest 5

  return (
    <Card>
      <YStack gap="$4">
        {/* Title */}
        <YStack gap="$1">
          <Text fontFamily="$heading" fontWeight="700" fontSize={16} color="$text">
            {title || t("chart.progression_title")}
          </Text>
          <Paragraph color="$text" opacity={0.6} size="$2">
            {mode === "quest" ? t("chart.quest_history") : t("chart.all_history")}
          </Paragraph>
        </YStack>

        {/* Stats Row */}
        <XStack gap="$4" justify="space-around">
          <YStack items="center">
            <Text fontWeight="700" fontSize={24} color="$text">
              {sessions.length}
            </Text>
            <Text fontSize={12} color="$text" opacity={0.6}>
              {t("chart.workouts")}
            </Text>
          </YStack>
          <YStack items="center">
            <Text fontWeight="700" fontSize={24} color="$text">
              {totalMinutes}
            </Text>
            <Text fontSize={12} color="$text" opacity={0.6}>
              {t("chart.total_mins")}
            </Text>
          </YStack>
          <YStack items="center">
            <Text fontWeight="700" fontSize={24} color="$text">
              {avgMinutes}
            </Text>
            <Text fontSize={12} color="$text" opacity={0.6}>
              {t("chart.avg_mins")}
            </Text>
          </YStack>
        </XStack>

        {/* Chart */}
        <YStack items="center" py="$2">
          <BarChart
            data={chartData}
            width={plotWidth}
            height={160}
            barWidth={barWidth}
            spacing={spacing}
            barBorderRadius={4}
            noOfSections={4}
            maxValue={yAxisMax}
            yAxisThickness={0}
            xAxisThickness={1}
            xAxisColor={rawColors.borderStrong}
            yAxisTextStyle={{
              color: rawColors.textSecondary,
              fontSize: 10,
            }}
            xAxisLabelTextStyle={{
              color: rawColors.textSecondary,
              fontSize: 9,
              width: labelTextWidth,
              marginLeft: (slot - labelTextWidth) / 2,
            }}
            labelWidth={barWidth}
            yAxisLabelWidth={Y_LABELS_WIDTH}
            initialSpacing={LEAD_IN}
            endSpacing={0}
            hideRules
          />
        </YStack>

        {/* Legend: the fills mean difficulty, in the same three colours the bars use. */}
        <XStack gap="$4" justify="center" flexWrap="wrap">
          {LEGEND.map((level) => (
            <XStack key={level} items="center" gap="$2" testID={`chart-legend-${level}`}>
              <YStack
                width={12}
                height={12}
                rounded={6}
                style={{ backgroundColor: DIFFICULTY_COLORS[level] }}
              />
              <Text fontSize={11} color="$text" opacity={0.7}>
                {t(`quests.level_${level}`)}
              </Text>
            </XStack>
          ))}
        </XStack>
      </YStack>
    </Card>
  );
}
