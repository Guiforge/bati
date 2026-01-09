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
import { useGameIcon } from "@/src/hooks/useGameIcon";
import { useSettingsStore } from "@/src/stores/settings";

type Props = {
  records: NewRecordResult[];
};

function RecordIcon({
  type,
  GameIcon,
}: {
  type: NewRecordResult["recordType"];
  GameIcon: ReturnType<typeof useGameIcon>["GameIcon"];
}) {
  switch (type) {
    case "longest_session":
      return <GameIcon name="lorc/stopwatch" size={20} tintColor="$primary" />;
    case "most_xp":
      return <GameIcon name="lorc/star-prominences" size={20} tintColor="$gold" />;
    case "exercise_max_reps":
      return <GameIcon name="lorc/lightning-branches" size={20} tintColor="$secondary" />;
    default:
      return <GameIcon name="lorc/trophy" size={20} tintColor="$primary" />;
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
  const { GameIcon } = useGameIcon();
  const scale = useSharedValue(1);

  useEffect(() => {
    // Pulse animation
    scale.value = withRepeat(
      withSequence(withTiming(1.03, { duration: 500 }), withTiming(1, { duration: 500 })),
      3,
      false
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
      <Card
        bg="$glassBg"
        borderColor="$gold"
        shadowColor="$goldGlow"
        shadowOpacity={0.5}
        shadowRadius={16}
      >
        <YStack gap="$3">
          <XStack items="center" gap="$2" justify="center">
            <GameIcon name="lorc/trophy" size={22} tintColor="$gold" />
            <Text fontWeight="900" fontSize={18} color="$gold">
              {t("session.new_records", { count: records.length })}
            </Text>
            <GameIcon name="lorc/trophy" size={22} tintColor="$gold" />
          </XStack>

          <YStack gap="$2">
            {records.slice(0, 3).map((record, idx) => (
              <XStack
                key={`${record.recordType}-${record.exerciseId ?? idx}`}
                bg="$bgOverlay"
                p="$2"
                px="$3"
                rounded="$3"
                borderWidth={1}
                borderColor="$borderStrong"
                items="center"
                gap="$2"
              >
                <RecordIcon type={record.recordType} GameIcon={GameIcon} />
                <Text flex={1} fontWeight="700" fontSize={13} color="$text">
                  <RecordLabel record={record} language={language} />
                </Text>
                <Text fontWeight="900" fontSize={14} color="$gold">
                  {record.newValue}
                </Text>
              </XStack>
            ))}
          </YStack>

          {records.length > 3 && (
            <Text
              fontSize={12}
              color="$textSecondary"
              opacity={0.7}
              style={{ textAlign: "center" }}
            >
              {t("session.pr_more", { count: records.length - 3 })}
            </Text>
          )}
        </YStack>
      </Card>
    </AnimatedView>
  );
}
