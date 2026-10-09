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
import type { NewRecordResult } from "@/db/personalRecords";
import { useReducedMotion } from "@/hooks/useReducedMotion";
import type { AppLanguage } from "@/src/i18n/deviceLanguage";
import { useSettingsStore } from "@/stores/settings";
import { formatRecordValue, recordTitle } from "./recordText";

type Props = {
  records: NewRecordResult[];
};

function RecordIcon({ type }: { type: NewRecordResult["recordType"] }) {
  switch (type) {
    case "longest_session":
      return <Clock size={20} color="$resourceGold" />;
    case "most_xp":
      // Gold, the colour XP is written in everywhere else. `$pastelYellow` is not a pale yellow
      // but #33301A, a legacy safety-net tone: on the `$background` row right below, near black
      // on near black. The star was invisible, on the card whose own comment three lines up
      // works out a contrast ratio by hand.
      return <Star size={20} color="$resourceGold" />;
    case "exercise_max_reps":
      return <TrendingUp size={20} color="$resourceGold" />;
    case "exercise_max_time":
      return <Clock size={20} color="$resourceGold" />;
    case "longest_outing":
      return <Footprints size={20} color="$resourceGold" />;
    default:
      return <Award size={20} color="$resourceGold" />;
  }
}

function RecordLabel({ record, language }: { record: NewRecordResult; language: AppLanguage }) {
  const { t } = useTranslation();
  return recordTitle(t, record, language);
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
      <Card bg="$pastelYellow" borderColor="$gold700">
        <YStack gap="$3">
          <XStack items="center" gap="$2" justify="center">
            <Award size={22} color="$resourceGold" />
            {/* Gold on $pastelYellow (#2A2413) is 8.0:1: the title clears the 4.5:1 body floor
                (18px bold is 13.5pt, just under WCAG's "large"), not only the 3:1 an icon needs. */}
            <Text fontWeight="700" fontSize={18} color="$resourceGold">
              {t("session.new_records", { count: records.length })}
            </Text>
            <Award size={22} color="$resourceGold" />
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
                <Text fontWeight="700" fontSize={14} color="$resourceGold">
                  {formatRecordValue(record, distanceUnit, language)}
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
