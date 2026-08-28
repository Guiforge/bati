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
import { Award, Clock, Star, TrendingUp } from "@/components/icons";
import type { NewRecordResult } from "@/db/personalRecords";
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
    case "exercise_max_reps":
    case "exercise_max_time": {
      const name = language === "fr" ? record.exerciseName?.fr : record.exerciseName?.en;
      return t("session.pr_exercise", { exercise: name });
    }
    default:
      return t("session.pr_new_record");
  }
}

const AnimatedView = Animated.View;

export function NewRecordsBadge({ records }: Props) {
  const { t } = useTranslation();
  const language = useSettingsStore((s) => s.language);
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
                  {record.recordType === "exercise_max_time"
                    ? `${record.newValue}s`
                    : record.newValue}
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
