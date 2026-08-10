import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Button, H1, Paragraph, Text, YStack } from "tamagui";
import { AppButton } from "@/components/common/AppButton";
import { useToast } from "@/components/common/Toast";
import { ProgressDots } from "@/components/ProgressDots";
import { rawColors } from "@/constants/rawColors";
import { Difficulty, getQuestById, listQuestTemplates, type Quest } from "@/db/quests";
import { useHaptics } from "@/hooks/useHaptics";
import { reportError } from "@/src/reportError";
import { useSessionStore } from "@/stores/session";

const TOTAL_STEPS = 4;
const CURRENT_STEP = 4;

/**
 * The on-ramp quest authored for exactly this moment: 8 minutes, four movements, no equipment.
 * The title is the identifier on purpose: the quest is seeded by an immutable migration
 * (drizzle/0016_seed_new_quests.sql) that keys on this exact string. If it ever goes missing,
 * the load below reports it instead of silently killing the offer.
 */
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
  // The offer's quest failed to load (or the seed is gone). The primary CTA becomes the way
  // home instead of sitting disabled forever on the last screen of the funnel.
  const [offerDead, setOfferDead] = useState(false);
  const { showError } = useToast();

  useEffect(() => {
    let cancelled = false;

    listQuestTemplates()
      .then((templates) => {
        const match = templates.find((tpl) => tpl.enTitle === FIRST_QUEST_TITLE);
        if (!match) {
          reportError(
            "onboarding.firstQuest",
            new Error(`seed quest "${FIRST_QUEST_TITLE}" not found`),
          );
        }
        return match ? getQuestById(match.id, Difficulty.Easy) : null;
      })
      .then((loaded) => {
        if (cancelled) return;
        setQuest(loaded);
        if (!loaded) setOfferDead(true);
      })
      .catch((error) => {
        reportError("onboarding.firstQuest", error);
        if (!cancelled) setOfferDead(true);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const skip = useCallback(() => router.replace("/"), [router]);

  const start = useCallback(async () => {
    if (!quest) return skip();

    success();
    try {
      // Awaited: the store is only populated once the boss fight and warm-up preference resolve,
      // and the session screen redirects home if it mounts before that.
      await startSession(quest, Difficulty.Easy);
    } catch (error) {
      // The single highest-value tap of the funnel must not fail into silence.
      reportError("onboarding.firstSession", error);
      showError(t("onboarding.save_error", "Could not save — try again"));
      return;
    }
    router.replace("/session" as never);
  }, [quest, skip, startSession, success, router, showError, t]);

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
            onPress={() => {
              if (offerDead) {
                skip();
                return;
              }
              start().catch(() => {
                // Errors already surfaced via showError above
              });
            }}
            disabled={!quest && !offerDead}
            bg="$primary"
            borderWidth={0}
            rounded="$10"
          >
            <Text color="$text" fontSize={17} fontWeight="700">
              {offerDead
                ? t("onboarding.finish", "Start my training journey")
                : t("onboarding.first_session_start", "Start now")}
            </Text>
          </AppButton>

          {!offerDead && (
            <Button
              testID="onboarding-first-session-skip"
              chromeless
              size="$3"
              onPress={skip}
              hitSlop={8}
            >
              <Text color="$textSecondary" fontSize={15}>
                {t("onboarding.first_session_later", "Later")}
              </Text>
            </Button>
          )}
        </YStack>
      </YStack>
    </YStack>
  );
}
