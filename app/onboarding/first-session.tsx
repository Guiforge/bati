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
import { getQuestAsset } from "@/constants/assetMap";
import { FIRST_QUEST_TITLE } from "@/constants/onboarding";
import { fade, rawColors } from "@/constants/rawColors";
import { estimateQuestSeconds, formatDurationEstimate } from "@/db/estimate";
import { loadConfiguredQuest } from "@/db/questConfig";
import { listQuestTemplates } from "@/db/quests";
import { useHaptics } from "@/hooks/useHaptics";
import { localizedName } from "@/src/i18n/localized";
import { reportError } from "@/src/reportError";
import { useSessionStore } from "@/stores/session";
import { useSettingsStore } from "@/stores/settings";

const TOTAL_STEPS = 4;
const CURRENT_STEP = 4;

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

  const language = useSettingsStore((s) => s.language);

  // The quest and its level as every other door loads them (`loadConfiguredQuest`): this screen
  // used to hard-code Easy while Home's day-one card started the same quest at Medium.
  const [offer, setOffer] = useState<Awaited<ReturnType<typeof loadConfiguredQuest>>>(null);
  const quest = offer?.quest ?? null;
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
        return match ? loadConfiguredQuest(match.id) : null;
      })
      .then((loaded) => {
        if (cancelled) return;
        setOffer(loaded);
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
    if (!offer) return skip();

    success();
    try {
      // Awaited: the store is only populated once the boss fight and warm-up preference resolve,
      // and the session screen redirects home if it mounts before that.
      await startSession(offer.quest, offer.level);
    } catch (error) {
      // The single highest-value tap of the funnel must not fail into silence.
      reportError("onboarding.firstSession", error);
      showError(t("onboarding.save_error", "Could not save. Try again"));
      return;
    }
    router.replace("/session" as never);
  }, [offer, skip, startSession, success, router, showError, t]);

  // Named once each, in the order of the round: a movement met here is not a surprise later.
  const movements = quest
    ? [...new Set(quest.exercises.map((qex) => localizedName(qex.exercise, language)))]
    : [];

  return (
    <YStack flex={1} bg="$bgDark">
      {/* The quest's own cover: the victory screen shows it again eight minutes later, and closes
          the panel this one opens. Ink while it loads, the old sky if the quest never does. */}
      {quest?.imagePath || offerDead ? (
        <Image
          source={
            quest?.imagePath
              ? getQuestAsset(quest.imagePath)
              : require("../../assets/splash-bg3.webp")
          }
          style={{ position: "absolute", width: "100%", height: "100%" }}
          contentFit="cover"
          transition={200}
        />
      ) : null}
      <LinearGradient
        colors={[fade(rawColors.bgDark, 0.85), "transparent"]}
        style={{ position: "absolute", top: 0, left: 0, right: 0, height: "30%" }}
      />
      <LinearGradient
        colors={["transparent", fade(rawColors.bgDark, 0.95), rawColors.bgDark]}
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
            textShadowColor={fade(rawColors.bgDark, 0.8)}
            textShadowRadius={6}
          >
            {t("onboarding.first_session_title", "Your first session")}
          </H1>
        </YStack>

        <YStack gap="$3">
          {/* What the hero is about to do, on a plate: the clouds above are the brightest thing
              on the page and no halo made a sentence readable there. Every figure comes from the
              quest as loaded, so it is the session that starts. */}
          {quest ? (
            <YStack
              testID="onboarding-first-session-plate"
              bg="$surface"
              borderWidth={1}
              borderColor="$borderStrong"
              rounded="$3"
              p="$3"
              gap="$2"
            >
              <Text text="center" color="$text" fontSize={16} fontWeight="700">
                {movements.join(" · ")}
              </Text>
              <Paragraph text="center" color="$textSecondary" fontSize={14}>
                {[
                  t("quests.rounds", { count: quest.rounds }),
                  t("quests.estimate", {
                    duration: formatDurationEstimate(estimateQuestSeconds(quest), language),
                  }),
                  t("onboarding.first_session_subtitle"),
                ].join(" · ")}
              </Paragraph>
            </YStack>
          ) : null}

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
            borderWidth={0}
          >
            {offerDead
              ? t("onboarding.finish", "Start my training adventure")
              : t("onboarding.first_session_start", "Start now")}
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
