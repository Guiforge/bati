import { useEffect } from "react";
import { useTranslation } from "react-i18next";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from "react-native-reanimated";
import { Text, XStack, YStack } from "tamagui";
import { Card } from "@/components/common/Card";
import { Award, Clock, Footprints, Star, TrendingUp } from "@/components/icons";
import { formatDistance } from "@/constants/distanceFormat";
import { formatDuration } from "@/db/estimate";
import type { NewRecordResult } from "@/db/personalRecords";
import type { DistanceUnit } from "@/db/preferences";
import { useReducedMotion } from "@/hooks/useReducedMotion";
import { useSettingsStore } from "@/stores/settings";

type Props = {
  records: NewRecordResult[];
};

function RecordIcon({ type }: { type: NewRecordResult["recordType"] }) {
  switch (type) {
    case "longest_session":
      return <Clock size={20} color="$primaryText" />;
    case "most_xp":
      return <Star size={20} color="$pastelYellow" />;
    case "exercise_max_reps":
      return <TrendingUp size={20} color="$secondary" />;
    case "exercise_max_time":
      return <Clock size={20} color="$secondary" />;
    case "longest_outing":
      return <Footprints size={20} color="$primaryText" />;
    default:
      return <Award size={20} color="$primaryText" />;
  }
}

function RecordLabel({ record, language }: { record: NewRecordResult; language: string }) {
  const { t } = useTranslation();

  switch (record.recordType) {
    case "longest_session":
      return t("session.pr_longest_session");
    case "most_xp":
      return t("session.pr_most_xp");
    case "longest_outing":
      return t("session.pr_longest_outing");
    case "exercise_max_reps":
    case "exercise_max_time": {
      const name = language === "fr" ? record.exerciseName?.fr : record.exerciseName?.en;
      return t("session.pr_exercise", { exercise: name });
    }
    default:
      return t("session.pr_new_record");
  }
}

/**
 * The figure beside each record, in the unit the rest of the app already shows it in — never a
 * bare number, which for `longest_outing` said the same 603 whether the hero reads metres or
 * feet, and for `longest_session` printed raw seconds (283 for 4 min 43 s).
 */
function formatRecordValue(record: NewRecordResult, unit: DistanceUnit): string {
  switch (record.recordType) {
    // Unchanged: this is how a hold's target already reads everywhere else (`formatTarget` in
    // db/targets.ts), so it stays raw seconds with an "s" rather than switching to
    // `formatDuration`'s "4 min 43s" shape.
    case "exercise_max_time":
      return `${record.newValue}s`;
    case "longest_session":
      return formatDuration(record.newValue);
    case "longest_outing":
      return formatDistance(record.newValue, unit);
    default:
      return `${record.newValue}`;
  }
}

const AnimatedView = Animated.View;

export function NewRecordsBadge({ records }: Props) {
  const { t } = useTranslation();
  const language = useSettingsStore((s) => s.language);
  const distanceUnit = useSettingsStore((s) => s.distanceUnit);
  const reducedMotion = useReducedMotion();
  const scale = useSharedValue(1);

  useEffect(() => {
    if (reducedMotion) return;
    // Pulse animation
    scale.value = withRepeat(
      withSequence(withTiming(1.03, { duration: 500 }), withTiming(1, { duration: 500 })),
      3,
      false,
    );
  }, [scale, reducedMotion]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  if (records.length === 0) {
    return null;
  }

  return (
    <AnimatedView style={[animatedStyle, { width: "100%", maxWidth: 520 }]}>
      <Card bg="$pastelYellow" borderColor="$primary">
        <YStack gap="$3">
          <XStack items="center" gap="$2" justify="center">
            <Award size={22} color="$primaryText" />
            {/* $text, not $primaryText: 18px bold is 13.5pt, just under WCAG's 14pt "large"
                threshold, so it needs 4.5:1 — and $primaryText on $pastelYellow is 3.65. The
                icons either side keep it: a meaningful icon only needs 3:1. */}
            <Text fontWeight="700" fontSize={18} color="$text">
              {t("session.new_records", { count: records.length })}
            </Text>
            <Award size={22} color="$primaryText" />
          </XStack>

          <YStack gap="$2">
            {records.slice(0, 3).map((record, idx) => (
              <XStack
                key={`${record.recordType}-${record.exerciseId ?? idx}`}
                bg="$background"
                p="$2"
                px="$3"
                rounded="$3"
                borderWidth={1}
                borderColor="$borderStrong"
                items="center"
                gap="$2"
              >
                <RecordIcon type={record.recordType} />
                <Text flex={1} fontWeight="700" fontSize={13} color="$text">
                  <RecordLabel record={record} language={language} />
                </Text>
                <Text fontWeight="700" fontSize={14} color="$primaryText">
                  {formatRecordValue(record, distanceUnit)}
                </Text>
              </XStack>
            ))}
          </YStack>

          {records.length > 3 && (
            <Text fontSize={12} color="$text" opacity={0.7} style={{ textAlign: "center" }}>
              {t("session.pr_more", { count: records.length - 3 })}
            </Text>
          )}
        </YStack>
      </Card>
    </AnimatedView>
  );
}
