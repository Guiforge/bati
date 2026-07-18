import { Target } from "@tamagui/lucide-icons";
import { useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { useWindowDimensions } from "react-native";
import { RadarChart } from "react-native-gifted-charts";
import { Text, XStack, YStack } from "tamagui";
import { Card } from "@/components/common/Card";
import { getBalanceRecommendation, getMuscleBalance, type MuscleBalance } from "@/db/muscleBalance";
import { useSettingsStore } from "@/stores/settings";

// Chart-library colors must be literal hex (RadarChart can't consume Tamagui tokens);
// these match the app's actual dark-theme tokens ($primary/$primaryHover/$borderStrong/
// $textSecondary from tamagui.config.ts) instead of the generic light-mode palette this
// previously carried, which put ~1.8:1 contrast labels on the dark surface.
const RADAR_COLORS = {
  polygon: "#0D33F2",
  polygonGradient: "#2E5CFF",
  grid: "#2A3360",
  labels: "#909ACB",
};

function MuscleBalanceRadarComponent() {
  const { t } = useTranslation();
  const { language } = useSettingsStore();
  const { width } = useWindowDimensions();
  const [balance, setBalance] = useState<MuscleBalance | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const loadData = useCallback(async () => {
    try {
      const data = await getMuscleBalance("30d");
      setBalance(data);
    } catch (_e) {
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData().catch(() => {
      // Error already handled
    });
  }, [loadData]);

  if (isLoading) {
    return (
      <Card bg="$bgLight">
        <Text color="$color" opacity={0.6}>
          {t("common.loading")}
        </Text>
      </Card>
    );
  }

  if (!balance || balance.totalVolume === 0) {
    return (
      <Card bg="$bgLight">
        <YStack gap="$2">
          <XStack items="center" gap="$2">
            <Target size={18} color="$color" />
            <Text fontWeight="700" fontSize={16} color="$color">
              {t("journal.muscle_balance")}
            </Text>
          </XStack>
          <Text color="$color" opacity={0.6} fontSize={13}>
            {t("chart.complete_more")}
          </Text>
        </YStack>
      </Card>
    );
  }

  const recommendation = getBalanceRecommendation(balance);

  // Prepare radar chart data
  // Normalize to 0-100 scale based on percentage
  const radarData = balance.muscles.map((m) => m.percentage);
  const labels = balance.muscles.map((m) => (language === "fr" ? m.label.fr : m.label.en));

  // Calculate chart size based on screen width
  const chartSize = Math.min(width - 100, 280);

  return (
    <Card bg="$bgLight">
      <YStack gap="$3">
        <XStack items="center" justify="space-between">
          <XStack items="center" gap="$2">
            <Target size={18} color="$color" />
            <Text fontWeight="700" fontSize={16} color="$color">
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

        {/* Radar Chart */}
        <YStack items="center" py="$2">
          <RadarChart
            data={radarData}
            labels={labels}
            chartSize={chartSize}
            maxValue={100}
            noOfSections={4}
            labelConfig={{
              fontSize: 11,
              stroke: RADAR_COLORS.labels,
              fontWeight: "600",
            }}
            polygonConfig={{
              stroke: RADAR_COLORS.polygon,
              strokeWidth: 2,
              fill: RADAR_COLORS.polygon,
              opacity: 0.3,
              showGradient: true,
              gradientColor: RADAR_COLORS.polygonGradient,
              gradientOpacity: 0.5,
            }}
            gridConfig={{
              stroke: RADAR_COLORS.grid,
              strokeWidth: 1,
            }}
            asterLinesConfig={{
              stroke: RADAR_COLORS.grid,
              strokeWidth: 1,
            }}
          />
        </YStack>

        {/* Weak areas callout */}
        {balance.weakAreas.length > 0 && (
          <XStack flexWrap="wrap" gap="$2">
            <Text fontSize={12} color="$color" opacity={0.7}>
              {t("journal.focus_on")}
            </Text>
            {balance.weakAreas.map((muscle) => {
              const muscleData = balance.muscles.find((m) => m.muscle === muscle);
              const label = muscleData
                ? language === "fr"
                  ? muscleData.label.fr
                  : muscleData.label.en
                : muscle;
              return (
                <Text key={muscle} fontSize={12} color="$primary" fontWeight="700">
                  {label}
                </Text>
              );
            })}
          </XStack>
        )}

        {recommendation.status === "needs_attention" && (
          <Text fontSize={12} color="$color" opacity={0.7}>
            {language === "fr" ? recommendation.message.fr : recommendation.message.en}
          </Text>
        )}
      </YStack>
    </Card>
  );
}

export const MuscleBalanceRadar = MuscleBalanceRadarComponent;
