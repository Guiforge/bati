import { Minus, Plus } from "@tamagui/lucide-icons";
import { useTranslation } from "react-i18next";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Button, H1, H3, Text, XStack, YStack } from "tamagui";
import { formatTime, useSessionTimer } from "@/hooks/useSessionTimer";
import { useSessionStore } from "@/stores/session";
import { useSettingsStore } from "@/stores/settings";

export function RestView() {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const { language } = useSettingsStore();
  const { quest, currentExerciseIndex, skipRest, addRestTime, results, updateLastResult } =
    useSessionStore();
  const { remainingSeconds } = useSessionTimer();

  if (!quest) return null;

  // In 'resting' state, currentExerciseIndex points to the UPCOMING exercise
  const nextEx = quest.exercises[currentExerciseIndex];
  const nextExName = language === "fr" ? nextEx.exercise.frName : nextEx.exercise.enName;

  const lastResult = results[results.length - 1];
  const isLastRepBased = lastResult?.result.type === "reps";

  return (
    <YStack
      flex={1}
      bg="$pastelPurple"
      pt={insets.top + 16}
      pb={insets.bottom + 16}
      px="$4"
      gap="$6"
      justify="center"
    >
      {/* Header */}
      <YStack items="center" gap="$2">
        <Text fontSize={40}>🔥</Text>
        <H3 color="$color" fontWeight="900" textTransform="uppercase">
          {t("session.rest_title", "Rest & Recover")}
        </H3>
      </YStack>

      {/* Timer */}
      <YStack items="center" gap="$2">
        <H1 fontSize={90} fontWeight="900" fontFamily="$body" color="$color">
          {formatTime(remainingSeconds)}
        </H1>
        <XStack gap="$3">
          <Button
            size="$3"
            bg="transparent"
            borderWidth={2}
            borderColor="$color"
            onPress={() => addRestTime(10)}
          >
            <Text fontWeight="800">+10s</Text>
          </Button>
          <Button
            size="$3"
            bg="transparent"
            borderWidth={2}
            borderColor="$color"
            onPress={() => addRestTime(30)}
          >
            <Text fontWeight="800">+30s</Text>
          </Button>
        </XStack>
      </YStack>

      {/* Last Set Review (if reps) */}
      {isLastRepBased && (
        <YStack bg="$background" p="$4" rounded="$6" borderWidth={2} borderColor="$color" gap="$2">
          <XStack justify="space-between" items="center">
            <YStack>
              <Text
                color="$color"
                opacity={0.6}
                fontSize={12}
                fontWeight="800"
                textTransform="uppercase"
              >
                {t("session.adjust_reps_label", "Adjust Reps")}
              </Text>
              <Text fontSize={12} opacity={0.5}>
                {t("session.adjust_reps_hint", "Did you do more or less?")}
              </Text>
            </YStack>

            <XStack items="center" gap="$3">
              <Button
                size="$3"
                circular
                icon={<Minus size={16} />}
                onPress={() => updateLastResult(Math.max(0, lastResult.result.value - 1))}
              />
              <Text fontWeight="900" fontSize={20} style={{ minWidth: 30, textAlign: "center" }}>
                {lastResult.result.value}
              </Text>
              <Button
                size="$3"
                circular
                icon={<Plus size={16} />}
                onPress={() => updateLastResult(lastResult.result.value + 1)}
              />
            </XStack>
          </XStack>
        </YStack>
      )}

      {/* Up Next Card */}
      <YStack bg="$background" p="$4" rounded="$6" borderWidth={2} borderColor="$color" gap="$2">
        <Text color="$color" opacity={0.6} fontSize={12} fontWeight="800" textTransform="uppercase">
          {t("session.up_next", "Up Next")}
        </Text>
        <XStack gap="$3" items="center">
          <YStack width={50} height={50} bg="$bgLight" rounded="$3" items="center" justify="center">
            <Text fontSize={24}>🏋️</Text>
          </YStack>
          <YStack flex={1}>
            <Text fontWeight="900" fontSize={18} numberOfLines={1}>
              {nextExName}
            </Text>
            <Text opacity={0.7}>
              {nextEx.target.type === "time"
                ? `${nextEx.target.value}s`
                : `${nextEx.target.value} reps`}
            </Text>
          </YStack>
        </XStack>
      </YStack>

      {/* Skip Button */}
      <Button
        size="$6"
        bg="$primary"
        pressStyle={{ bg: "$primary", opacity: 0.8 }}
        onPress={skipRest}
        borderWidth={3}
        borderColor="$color"
        rounded="$6"
        mt="auto"
      >
        <Text color="white" fontSize={20} fontWeight="900" textTransform="uppercase">
          {t("session.skip_rest", "I'm Ready!")}
        </Text>
      </Button>
    </YStack>
  );
}
