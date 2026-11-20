import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { type LayoutChangeEvent, View } from "react-native";
import Svg, { Circle, Polyline } from "react-native-svg";
import { Text, XStack, YStack } from "tamagui";
import { shortDate } from "@/components/journal/journalFormat";
import { rawColors } from "@/constants/rawColors";
import { getExerciseSessionBests, type SessionBestPoint } from "@/db/personalRecords";
import type { QuestTargetType } from "@/db/schema";
import { formatSlotTarget } from "@/db/targets";
import { reportError } from "@/src/reportError";
import { useSettingsStore } from "@/stores/settings";

const HEIGHT = 72;
const PAD = 8;

/**
 * Where the points of a trail sit in a `width` x `HEIGHT` box: oldest left, scaled between the
 * lowest and the highest of the window. A flat run is drawn mid-height, not at the floor.
 */
function trailPoints(values: readonly number[], width: number): { x: number; y: number }[] {
  const lo = Math.min(...values);
  const hi = Math.max(...values);
  const span = hi - lo;
  return values.map((v, i) => ({
    x: PAD + (values.length === 1 ? 0 : (i / (values.length - 1)) * (width - 2 * PAD)),
    y: span === 0 ? HEIGHT / 2 : HEIGHT - PAD - ((v - lo) / span) * (HEIGHT - 2 * PAD),
  }));
}

/**
 * The hero's last 12 sessions of one movement, best set of each, the record marked in gold. Under
 * two sessions it renders nothing at all: one point is no trend, and a chart with a lone dot reads
 * as a verdict. A tap opens the sessions behind the points, each one a link to its night.
 */
export function ProgressTrail({
  exercise,
  type,
  record,
}: {
  exercise: { id: number; perSide: boolean };
  type: QuestTargetType;
  /** The standing best, so the mark means the same number the line above prints. */
  record: number;
}) {
  const { t } = useTranslation();
  const router = useRouter();
  const language = useSettingsStore((s) => s.language);
  const [points, setPoints] = useState<SessionBestPoint[] | null>(null);
  const [open, setOpen] = useState(false);
  const [width, setWidth] = useState(0);

  useEffect(() => {
    let cancelled = false;
    getExerciseSessionBests(exercise.id, type)
      .then((rows) => {
        if (!cancelled) setPoints(rows);
      })
      .catch((error) => reportError("exercise.progress", error));
    return () => {
      cancelled = true;
    };
  }, [exercise.id, type]);

  if (!points || points.length < 2) return null;

  const xy = trailPoints(
    points.map((p) => p.best),
    width,
  );
  const say = (value: number) => formatSlotTarget({ target: { type, value }, exercise }, language);

  return (
    <YStack testID={`exercise-progress-${type}`} gap="2">
      <XStack
        testID={`exercise-progress-${type}-toggle`}
        onPress={() => setOpen((o) => !o)}
        accessibilityRole="button"
        accessibilityState={{ expanded: open }}
        accessibilityLabel={t("exercises.progress_open")}
        opacity="1 press:0.8"
        minH={HEIGHT}
      >
        <View style={{ flex: 1, height: HEIGHT }} onLayout={onLayout(setWidth)}>
          {width > 0 ? (
            <Svg width={width} height={HEIGHT}>
              <Polyline
                points={xy.map((p) => `${p.x},${p.y}`).join(" ")}
                fill="none"
                stroke={rawColors.textSecondary}
                strokeWidth={1.5}
                strokeLinejoin="round"
              />
              {xy.map((p, i) => {
                const best = points[i]?.best;
                const isRecord = best === record;
                return (
                  <Circle
                    // biome-ignore lint/suspicious/noArrayIndexKey: fixed window, never reordered
                    key={i}
                    cx={p.x}
                    cy={p.y}
                    r={isRecord ? 4.5 : 2.5}
                    fill={isRecord ? rawColors.resourceGold : rawColors.textSecondary}
                  />
                );
              })}
            </Svg>
          ) : null}
        </View>
      </XStack>
      <Text fontSize={11} color="textSecondary">
        {t("exercises.progress_caption")}
      </Text>
      {open ? (
        <YStack gap="1" testID={`exercise-progress-${type}-sessions`}>
          {[...points].reverse().map((p) => (
            <XStack
              key={p.sessionId}
              testID="exercise-progress-session"
              onPress={() => router.push(`/journal/${p.sessionId}` as never)}
              accessibilityRole="link"
              items="center"
              justify="space-between"
              minH={44}
              opacity="1 press:0.8"
            >
              <Text fontSize={13} color="textSecondary">
                {shortDate(language, p.at, new Date())}
              </Text>
              <Text
                fontSize={15}
                fontWeight="700"
                color={p.best === record ? "resourceGold" : "text"}
              >
                {say(p.best)}
              </Text>
            </XStack>
          ))}
        </YStack>
      ) : null}
    </YStack>
  );
}

function onLayout(set: (w: number) => void) {
  return (e: LayoutChangeEvent) => set(Math.round(e.nativeEvent.layout.width));
}
