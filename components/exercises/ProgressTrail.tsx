import { useRouter } from "expo-router";
import { useEffect, useId, useState } from "react";
import { useTranslation } from "react-i18next";
import { type LayoutChangeEvent, View } from "react-native";
import Svg, { Circle, Defs, Line, LinearGradient, Path, Stop } from "react-native-svg";
import { Text, XStack, YStack } from "tamagui";
import { shortDate } from "@/components/journal/journalFormat";
import { rawColors } from "@/constants/rawColors";
import { getExerciseSessionBests, type SessionBestPoint } from "@/db/personalRecords";
import type { QuestTargetType } from "@/db/schema";
import { formatSlotTarget } from "@/db/targets";
import { reportError } from "@/src/reportError";
import { useSettingsStore } from "@/stores/settings";

const LABELS = 18;
const CHART = 54;
/** Chart plus its end labels: the 72 the plain trail took. */
const HEIGHT = CHART + LABELS;
const PAD = 8;

/**
 * Where the points of a trail sit in a `width` x `CHART` box: oldest left, scaled between the
 * lowest and the highest of the window. A flat run is drawn mid-height, not at the floor.
 */
function trailPoints(values: readonly number[], width: number): { x: number; y: number }[] {
  const lo = Math.min(...values);
  const hi = Math.max(...values);
  const span = hi - lo;
  return values.map((v, i) => ({
    x: PAD + (values.length === 1 ? 0 : (i / (values.length - 1)) * (width - 2 * PAD)),
    y: span === 0 ? CHART / 2 : CHART - PAD - ((v - lo) / span) * (CHART - 2 * PAD),
  }));
}

/** A gentle curve through the points: cubic steps with horizontal handles never overshoot a point. */
function curve(xy: readonly { x: number; y: number }[]): string {
  return xy
    .map((p, i) => {
      const prev = xy[i - 1];
      if (!prev) return `M${p.x},${p.y}`;
      const mid = (prev.x + p.x) / 2;
      return `C${mid},${prev.y} ${mid},${p.y} ${p.x},${p.y}`;
    })
    .join(" ");
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
  const fillId = `trail${useId().replace(/\W/g, "")}`;

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
  const line = curve(xy);
  const area = `${line} L${xy[xy.length - 1]?.x ?? 0},${CHART - 1} L${xy[0]?.x ?? 0},${CHART - 1} Z`;
  const firstBest = points[0]?.best ?? 0;
  const lastBest = points[points.length - 1]?.best ?? 0;
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
        <YStack flex={1}>
          <View style={{ height: CHART }} onLayout={onLayout(setWidth)}>
            {width > 0 ? (
              <Svg width={width} height={CHART}>
                <Defs>
                  <LinearGradient id={fillId} x1="0" y1="0" x2="0" y2="1">
                    <Stop offset="0" stopColor={rawColors.primaryText} stopOpacity={0.32} />
                    <Stop offset="1" stopColor={rawColors.primaryText} stopOpacity={0} />
                  </LinearGradient>
                </Defs>
                <Line
                  x1={PAD}
                  x2={width - PAD}
                  y1={CHART - 1}
                  y2={CHART - 1}
                  stroke={rawColors.borderStrong}
                  strokeWidth={1}
                />
                <Path d={area} fill={`url(#${fillId})`} />
                <Path
                  d={line}
                  fill="none"
                  stroke={rawColors.primaryText}
                  strokeWidth={2.5}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                <Marks xy={xy} points={points} record={record} />
              </Svg>
            ) : null}
          </View>
          <XStack justify="space-between" px={PAD} minH={LABELS} items="flex-end">
            <Text
              testID="exercise-progress-first"
              fontSize={11}
              color="textSecondary"
              fontVariant={["tabular-nums"]}
            >
              {say(firstBest)}
            </Text>
            <Text
              testID="exercise-progress-last"
              fontSize={11}
              fontWeight="700"
              color={lastBest === record ? "resourceGold" : "text"}
              fontVariant={["tabular-nums"]}
            >
              {say(lastBest)}
            </Text>
          </XStack>
        </YStack>
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

/** The record as a gold ring and the latest session as a filled dot; the rest is the line's. */
function Marks({
  xy,
  points,
  record,
}: {
  xy: readonly { x: number; y: number }[];
  points: readonly SessionBestPoint[];
  record: number;
}) {
  return xy.map((p, i) => {
    const isRecord = points[i]?.best === record;
    if (!isRecord && i !== xy.length - 1) return null;
    return (
      <Circle
        // biome-ignore lint/suspicious/noArrayIndexKey: fixed window, never reordered
        key={i}
        cx={p.x}
        cy={p.y}
        r={isRecord ? 4 : 3.5}
        fill={isRecord ? rawColors.bgDark : rawColors.primaryText}
        stroke={isRecord ? rawColors.resourceGold : rawColors.bgDark}
        strokeWidth={isRecord ? 2.5 : 1.5}
      />
    );
  });
}

function onLayout(set: (w: number) => void) {
  return (e: LayoutChangeEvent) => set(Math.round(e.nativeEvent.layout.width));
}
