import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import { useCallback, useState } from "react";
import { useTranslation } from "react-i18next";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { H1, Paragraph, Text, YStack } from "tamagui";
import { AppButton } from "@/components/common/AppButton";
import { ProgressDots } from "@/components/ProgressDots";
import { preferences, type TrainingLevel } from "@/db";
import { useHaptics } from "@/hooks/useHaptics";
import { useUserStore } from "@/stores/user";

const TOTAL_STEPS = 3;
const CURRENT_STEP = 3;

const LEVELS: { id: TrainingLevel; labelKey: string }[] = [
  { id: "beginner", labelKey: "onboarding.level_beginner" },
  { id: "regular", labelKey: "onboarding.level_regular" },
  { id: "advanced", labelKey: "onboarding.level_advanced" },
];

// Final onboarding step. Skippable — the training level is a starting signal for the
// coach/suggestion layer, not a gate. See docs/planning/screen-redesign-proposals.md §2.
export default function TrainingLevelStep() {
  const router = useRouter();
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const { selection, success } = useHaptics();
  const { setHasFinishedOnboarding } = useUserStore();

  const [selected, setSelected] = useState<TrainingLevel | null>(null);

  const complete = useCallback(
    (level: TrainingLevel | null) => {
      if (level) {
        preferences.setTrainingLevel(level).catch(() => {
          // Non-blocking: level is a soft signal, onboarding still completes
        });
      }
      success();
      setHasFinishedOnboarding(true);
      router.replace("/");
    },
    [success, setHasFinishedOnboarding, router],
  );

  return (
    <YStack flex={1} bg="$bgDark">
      <Image
        source={require("../../assets/onboardings/splash-bg1.jpg")}
        style={{ position: "absolute", width: "100%", height: "100%" }}
        contentFit="cover"
      />
      <LinearGradient
        colors={["rgba(11, 15, 25, 0.85)", "transparent"]}
        style={{ position: "absolute", top: 0, left: 0, right: 0, height: "30%" }}
      />
      <LinearGradient
        colors={["transparent", "rgba(11, 15, 25, 0.95)", "#0B0F19"]}
        style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: "60%" }}
      />

      <YStack flex={1} justify="space-between" pt={insets.top + 20} pb={insets.bottom + 20} px="$5">
        {/* Header */}
        <YStack gap="$3" items="center">
          <ProgressDots current={CURRENT_STEP} total={TOTAL_STEPS} />
          <H1
            text="center"
            color="$text"
            fontSize={30}
            fontWeight="700"
            textShadowColor="rgba(0,0,0,0.5)"
            textShadowRadius={4}
          >
            {t("onboarding.level_title", "What's your level?")}
          </H1>
          <Paragraph
            text="center"
            color="$textSecondary"
            fontSize={15}
            textShadowColor="rgba(0,0,0,0.5)"
            textShadowRadius={4}
          >
            {t(
              "onboarding.level_subtitle",
              "So we can suggest the right workouts. You can change this later.",
            )}
          </Paragraph>
        </YStack>

        {/* Chips + actions */}
        <YStack gap="$4">
          <YStack gap="$3">
            {LEVELS.map(({ id, labelKey }) => {
              const isSelected = selected === id;
              return (
                <YStack
                  key={id}
                  height={56}
                  rounded="$8"
                  bg={isSelected ? "$secondary" : "$surface"}
                  borderWidth={1}
                  borderColor={isSelected ? "$secondary" : "$borderStrong"}
                  items="center"
                  justify="center"
                  pressStyle={{ scale: 0.98, opacity: 0.9 }}
                  onPress={() => {
                    selection();
                    setSelected(id);
                  }}
                  accessibilityRole="button"
                  accessibilityLabel={t(labelKey)}
                  accessibilityState={{ selected: isSelected }}
                >
                  <Text color="$text" fontSize={18} fontWeight="700">
                    {t(labelKey)}
                  </Text>
                </YStack>
              );
            })}
          </YStack>

          <AppButton
            onPress={() => complete(selected)}
            disabled={!selected}
            bg={selected ? "$primary" : "$surface"}
            borderWidth={0}
            rounded="$10"
            opacity={selected ? 1 : 0.5}
          >
            <Paragraph color={selected ? "white" : "$textSecondary"} fontWeight="700" fontSize={18}>
              {t("onboarding.finish", "Start my training journey")}
            </Paragraph>
          </AppButton>

          <Text
            text="center"
            color="$textSecondary"
            fontSize={15}
            fontWeight="700"
            py="$2"
            pressStyle={{ opacity: 0.6 }}
            onPress={() => complete(null)}
            accessibilityRole="button"
          >
            {t("onboarding.skip", "Skip")}
          </Text>
        </YStack>
      </YStack>
    </YStack>
  );
}
