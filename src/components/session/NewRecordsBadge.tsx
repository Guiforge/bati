import { Award, Clock, Star, TrendingUp } from "@tamagui/lucide-icons";
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
import { Card } from "@/src/components/common/Card";
import type { NewRecordResult } from "@/src/db/personalRecords";
import { useSettingsStore } from "@/src/stores/settings";

type Props = {
  records: NewRecordResult[];
};

function RecordIcon({ type }: { type: NewRecordResult["recordType"] }) {
  switch (type) {
    case "longest_session":
      return <Clock size={20} color="$primary" />;
    case "most_xp":
      return <Star size={20} color="$pastelYellow" />;
    case "exercise_max_reps":
      return <TrendingUp size={20} color="$secondary" />;
    default:
      return <Award size={20} color="$primary" />;
  }
}

function RecordLabel({ record, language }: { record: NewRecordResult; language: string }) {
  const { t } = useTranslation();

  switch (record.recordType) {
    case "longest_session":
      return t("session.pr_longest_session");
    case "most_xp":
      return t("session.pr_most_xp");
    case "exercise_max_reps": {
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
  const { language } = useSettingsStore();
  const scale = useSharedValue(1);

  useEffect(() => {
    // Pulse animation
    scale.value = withRepeat(
      withSequence(withTiming(1.03, { duration: 500 }), withTiming(1, { duration: 500 })),
      3,
      false,
    );
  }, [scale]);

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
            <Award size={22} color="$primary" />
            <Text fontWeight="900" fontSize={18} color="$primary">
              {t("session.new_records", { count: records.length })}
            </Text>
            <Award size={22} color="$primary" />
          </XStack>

          <YStack gap="$2">
            {records.slice(0, 3).map((record, idx) => (
              <XStack
                key={`${record.recordType}-${record.exerciseId ?? idx}`}
                bg="$background"
                p="$2"
                px="$3"
                rounded="$3"
                borderWidth={2}
                borderColor="$color"
                items="center"
                gap="$2"
              >
                <RecordIcon type={record.recordType} />
                <Text flex={1} fontWeight="700" fontSize={13} color="$color">
                  <RecordLabel record={record} language={language} />
                </Text>
                <Text fontWeight="900" fontSize={14} color="$primary">
                  {record.newValue}
                </Text>
              </XStack>
            ))}
          </YStack>

          {records.length > 3 && (
            <Text fontSize={12} color="$color" opacity={0.7} style={{ textAlign: "center" }}>
              {t("session.pr_more", { count: records.length - 3 })}
            </Text>
          )}
        </YStack>
      </Card>
    </AnimatedView>
  );
}
