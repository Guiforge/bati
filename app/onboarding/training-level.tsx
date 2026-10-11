import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import { useCallback, useState } from "react";
import { useTranslation } from "react-i18next";
import { ScrollView } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { H1, Paragraph, Text, XStack, YStack } from "tamagui";
import { AppButton } from "@/components/common/AppButton";
import { ScreenBackButton } from "@/components/common/ScreenBackButton";
import { useToast } from "@/components/common/Toast";
import { ProgressDots } from "@/components/ProgressDots";
import { fade, rawColors } from "@/constants/rawColors";
import { preferences, type TrainingLevel } from "@/db";
import { useHaptics } from "@/hooks/useHaptics";
import { reportError } from "@/src/reportError";
import { useUserStore } from "@/stores/user";

const TOTAL_STEPS = 4;
const CURRENT_STEP = 3;

// Two answers, because the app only ever does two things with one: `advanced` and `regular` read
// the same everywhere (`startingDifficulty`, `getEligibleQuestIds`), and a third choice that
// changes nothing is a question the hero answers for no one.
const ANSWERS: { id: TrainingLevel; labelKey: string }[] = [
  { id: "beginner", labelKey: "onboarding.level_beginner" },
  { id: "regular", labelKey: "onboarding.level_regular" },
];

// Third onboarding step. Skippable: the answer sets where a quest starts (`startingDifficulty`)
// and which quests are offered, and no answer is treated like the gentler one.
// It hands over to the first-session offer (roadmap §14 H3).
export default function TrainingLevelStep() {
  const router = useRouter();
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const { selection, success } = useHaptics();
  const setHasFinishedOnboarding = useUserStore((s) => s.setHasFinishedOnboarding);

  const [selected, setSelected] = useState<TrainingLevel | null>(null);
  const { showError } = useToast();

  const complete = useCallback(
    (level: TrainingLevel | null) => {
      success();
      // Onboarding is done here, before the first-session offer: skipping it, backing out of it
      // or crashing during it must never drop the hero back into onboarding. Awaited so the
      // flag is durably persisted before we navigate, not just set in memory — and a failed
      // write must say so, or the hero replays onboarding on the next launch.
      // The answer is written first: the offer that follows reads it to set its dose.
      (level
        ? preferences.setTrainingLevel(level).catch((error) => {
            // Non-blocking: without it the first session starts at the gentler level.
            reportError("onboarding.trainingLevel", error);
          })
        : Promise.resolve()
      )
        .then(() => setHasFinishedOnboarding(true))
        .then(() => router.replace("/onboarding/first-session" as never))
        .catch((error) => {
          reportError("onboarding.finish", error);
          showError(t("onboarding.save_error", "Could not save. Try again"));
        });
    },
    [success, setHasFinishedOnboarding, router, showError, t],
  );

  return (
    <YStack flex={1} bg="$bgDark">
      <Image
        source={require("../../assets/onboardings/splash-bg1.webp")}
        style={{ position: "absolute", width: "100%", height: "100%" }}
        contentFit="cover"
      />
      <LinearGradient
        colors={[fade(rawColors.bgDark, 0.85), "transparent"]}
        style={{ position: "absolute", top: 0, left: 0, right: 0, height: "30%" }}
      />
      <LinearGradient
        colors={["transparent", fade(rawColors.bgDark, 0.95), rawColors.bgDark]}
        style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: "70%" }}
      />

      <YStack flex={1} pt={insets.top + 8} pb={insets.bottom + 20} px="$5" gap="$3">
        {/* The way back and the way past, where no font scale can push them off the screen. */}
        <XStack justify="space-between" items="center" mx="$-3">
          <ScreenBackButton />
          <ProgressDots current={CURRENT_STEP} total={TOTAL_STEPS} />
          <Text
            testID="onboarding-level-skip"
            color="$text"
            fontSize={15}
            fontWeight="700"
            px="$3"
            py="$3"
            textShadowColor={fade(rawColors.bgDark, 0.8)}
            textShadowRadius={6}
            pressStyle={{ opacity: 0.6 }}
            onPress={() => complete(null)}
            accessibilityRole="button"
          >
            {t("onboarding.skip", "Skip")}
          </Text>
        </XStack>

        {/* Scrolls when a large font needs it; the safety line and the button below never do. */}
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={{ flexGrow: 1, justifyContent: "space-between", gap: 16 }}
          showsVerticalScrollIndicator={false}
        >
          <YStack gap="$3" items="center">
            <H1
              text="center"
              color="$text"
              fontSize={30}
              fontWeight="700"
              textShadowColor={fade(rawColors.black, 0.5)}
              textShadowRadius={4}
            >
              {t("onboarding.level_title", "Where are you at?")}
            </H1>
            <Paragraph
              text="center"
              color="$textSecondary"
              fontSize={15}
              textShadowColor={fade(rawColors.black, 0.5)}
              textShadowRadius={4}
            >
              {t("onboarding.level_subtitle")}
            </Paragraph>
          </YStack>

          <YStack gap="$3">
            {ANSWERS.map(({ id, labelKey }) => {
              const isSelected = selected === id;
              return (
                <YStack
                  key={id}
                  testID={`onboarding-level-${id}`}
                  minH={56}
                  py="$2"
                  px="$3"
                  rounded="$3"
                  bg="$surface"
                  borderWidth={2}
                  borderColor={isSelected ? "$primary" : "$borderStrong"}
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
                  <Text
                    fontFamily="$heading"
                    color={isSelected ? "$primary" : "$text"}
                    fontSize={18}
                    fontWeight="700"
                    text="center"
                  >
                    {t(labelKey)}
                  </Text>
                </YStack>
              );
            })}
          </YStack>
        </ScrollView>

        <Paragraph
          testID="onboarding-safety-line"
          text="center"
          color="$textSecondary"
          fontSize={14}
          minH={48}
          verticalAlign="middle"
          textDecorationLine="underline"
          pressStyle={{ opacity: 0.6 }}
          onPress={() => router.push("/safety" as never)}
          accessibilityRole="button"
        >
          {t("onboarding.safety_line")}
        </Paragraph>

        <AppButton
          testID="onboarding-level-continue"
          onPress={() => complete(selected)}
          disabled={!selected}
        >
          {t("onboarding.next", "Continue")}
        </AppButton>
      </YStack>
    </YStack>
  );
}
