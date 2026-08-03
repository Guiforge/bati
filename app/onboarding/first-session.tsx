import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Button, H1, Paragraph, Text, YStack } from "tamagui";
import { AppButton } from "@/components/common/AppButton";
import { ProgressDots } from "@/components/ProgressDots";
import { rawColors } from "@/constants/rawColors";
import { Difficulty, getQuestById, listQuestTemplates, type Quest } from "@/db/quests";
import { useHaptics } from "@/hooks/useHaptics";
import { useSessionStore } from "@/stores/session";

const TOTAL_STEPS = 4;
const CURRENT_STEP = 4;

/** The on-ramp quest authored for exactly this moment: 8 minutes, four movements, no equipment. */
const FIRST_QUEST_TITLE = "The Squire's Awakening";

/**
 * The last onboarding step, and the only one that matters to retention: completing a first real
 * session on day one is the strongest predictor of still being here on day thirty
 * (docs/raw/bodyweight-app-research.md §5). Until now onboarding ended on the home screen with
 * the hero having done nothing.
 *
 * It is an offer, never a gate. Onboarding is already marked finished by the previous step, so
 * skipping, backing out or crashing mid-session all land the hero in the app, not back here.
 */
export default function FirstSessionStep() {
  const router = useRouter();
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const { success } = useHaptics();
  const startSession = useSessionStore((s) => s.startSession);

  const [quest, setQuest] = useState<Quest | null>(null);

  useEffect(() => {
    let cancelled = false;

    listQuestTemplates()
      .then((templates) => {
        const match = templates.find((tpl) => tpl.enTitle === FIRST_QUEST_TITLE);
        return match ? getQuestById(match.id, Difficulty.Easy) : null;
      })
      .then((loaded) => {
        if (!cancelled) setQuest(loaded);
      })
      .catch(() => {
        // The offer simply does not appear; the skip button still gets the hero home.
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const skip = useCallback(() => router.replace("/"), [router]);

  const start = useCallback(async () => {
    if (!quest) return skip();

    success();
    // Awaited: the store is only populated once the boss fight and warm-up preference resolve,
    // and the session screen redirects home if it mounts before that.
    await startSession(quest, Difficulty.Easy);
    router.replace("/session" as never);
  }, [quest, skip, startSession, success, router]);

  return (
    <YStack flex={1} bg="$bgDark">
      <Image
        source={require("../../assets/splash-bg3.webp")}
        style={{ position: "absolute", width: "100%", height: "100%" }}
        contentFit="cover"
      />
      <LinearGradient
        colors={["rgba(11, 15, 25, 0.85)", "transparent"]}
        style={{ position: "absolute", top: 0, left: 0, right: 0, height: "30%" }}
      />
      <LinearGradient
        colors={["transparent", "rgba(11, 15, 25, 0.95)", rawColors.bgDark]}
        style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: "60%" }}
      />

      <YStack flex={1} justify="space-between" pt={insets.top + 20} pb={insets.bottom + 20} px="$5">
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
            {t("onboarding.first_session_title", "Your first march")}
          </H1>
          <Paragraph
            text="center"
            color="$textSecondary"
            fontSize={15}
            textShadowColor="rgba(0,0,0,0.5)"
            textShadowRadius={4}
          >
            {t(
              "onboarding.first_session_subtitle",
              "Eight minutes, four movements, no equipment. A squire has to start somewhere.",
            )}
          </Paragraph>
        </YStack>

        <YStack gap="$3">
          <AppButton
            testID="onboarding-first-session-start"
            onPress={start}
            disabled={!quest}
            bg="$primary"
            borderWidth={0}
            rounded="$10"
          >
            <Text color="$text" fontSize={17} fontWeight="700">
              {t("onboarding.first_session_start", "Start now")}
            </Text>
          </AppButton>

          <Button testID="onboarding-first-session-skip" chromeless size="$3" onPress={skip}>
            <Text color="$textSecondary" fontSize={15}>
              {t("onboarding.first_session_later", "Later")}
            </Text>
          </Button>
        </YStack>
      </YStack>
    </YStack>
  );
}
