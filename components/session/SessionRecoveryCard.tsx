import { useRouter } from "expo-router";
import { useTranslation } from "react-i18next";
import { Button, Text, XStack, YStack } from "tamagui";
import { AppButton } from "@/components/common/AppButton";
import { Card } from "@/components/common/Card";
import { AlertTriangle, Check, Play, X } from "@/components/icons";
import { formatDistance } from "@/constants/distanceFormat";
import { useHaptics } from "@/hooks/useHaptics";
import { useReducedMotion } from "@/hooks/useReducedMotion";
import { type RecoverableSession, useSessionRecovery } from "@/hooks/useSessionRecovery";
import { formatTime } from "@/hooks/useSessionTimer";
import { useSettingsStore } from "@/stores/settings";

interface SessionRecoveryCardProps {
  session: RecoverableSession;
  onRecover: () => Promise<boolean | undefined>;
  /**
   * Close the walk from here, without resuming it. Offered only for an outing — see
   * `RecoverableSession.isOuting` — because only an outing left a witness of the hours the app
   * was not there for.
   */
  onFinish: () => Promise<boolean>;
  onDiscard: () => Promise<void>;
}

/**
 * Card displayed on home screen when there's a recoverable session
 */
export function SessionRecoveryCard({
  session,
  onRecover,
  onFinish,
  onDiscard,
}: SessionRecoveryCardProps) {
  const { t } = useTranslation();
  const router = useRouter();
  const haptics = useHaptics();
  const reducedMotion = useReducedMotion();
  const unit = useSettingsStore((s) => s.distanceUnit);

  const handleResume = async () => {
    haptics.mediumImpact();
    // Only leave Home if the session actually came back. `recoverSession` returns false on a
    // corrupt or already-consumed slot, and pushing anyway meant the session screen's own
    // no-quest guard bounced straight back — a navigation round trip the hero sees as a flicker.
    const recovered = await onRecover();
    if (recovered) router.push("/session");
  };

  const handleFinish = async () => {
    haptics.mediumImpact();
    // Same rule as resuming: the session screen is only worth reaching if the session came back.
    // It lands there on "finished", which is the victory view — the walk is written from there,
    // by the one function that writes a session.
    const finished = await onFinish();
    if (finished) router.push("/session");
  };

  const handleDiscard = async () => {
    haptics.lightImpact();
    await onDiscard();
  };

  return (
    <Card
      bg="$pastelOrange"
      rounded="$6"
      transition={reducedMotion ? undefined : "quick"}
      enterStyle={reducedMotion ? undefined : { opacity: 0, y: -10 }}
    >
      <YStack gap="$3">
        <XStack gap="$2" items="center">
          <AlertTriangle size={20} color="$primaryText" />
          <Text fontSize={18} fontWeight="bold" color="$text">
            {t(session.isOuting ? "recovery.finish_outing_title" : "recovery.title")}
          </Text>
        </XStack>

        {/* A walk that was killed is not a walk that was abandoned: the trace covers the hours
            the app missed, and the card says so rather than asking the hero to guess what
            "unfinished" means for a hike they already came home from. */}
        <Text color="$text" opacity={0.8}>
          {t(session.isOuting ? "recovery.finish_outing_description" : "recovery.description")}
        </Text>

        <YStack gap="$1" bg="$background" p="$2" rounded="$3">
          <Text fontSize="$4" fontWeight="700" color="$text">
            {session.questTitle}
          </Text>
          {/* A walk is one round of one movement, so "Round 1/1, exercise 1/1" is the whole of
              what the workout line could ever say about it, and the elapsed clock reads the
              seconds since a snapshot an outing writes once, at the start: 0:04 for an hour on
              the road. The ground already covered is the only figure a walker recognises, and
              it is in `gps_points` whether or not the app was there to see the rest. */}
          {session.leaguesM === null ? (
            <>
              <Text fontSize="$3" color="$text" opacity={0.7}>
                {t("recovery.progress", {
                  round: session.round,
                  roundTotal: session.roundTotal,
                  exercise: session.exercise,
                  exerciseTotal: session.exerciseTotal,
                })}
              </Text>
              <Text fontSize="$3" color="$text" opacity={0.7}>
                {t("recovery.elapsed", { time: formatTime(session.elapsedTime) })}
              </Text>
            </>
          ) : (
            <Text fontSize="$3" color="$text" opacity={0.7}>
              {t("recovery.ground", { distance: formatDistance(session.leaguesM, unit) })}
            </Text>
          )}
        </YStack>

        {/* Three actions on an outing, and the walk's own ending is the one the hero came back
            for: it gets the width and the colour, and resuming drops to the same weight as
            throwing the walk away. A workout has two, unchanged. */}
        {session.isOuting ? (
          <AppButton height={44} icon={<Check size={18} />} onPress={handleFinish}>
            {t("recovery.finish_outing")}
          </AppButton>
        ) : null}

        <XStack gap="$3" justify="flex-end">
          <Button
            size="$3"
            height={44}
            hitSlop={8}
            bg="$bgLight"
            borderWidth={1}
            borderColor="$borderStrong"
            rounded="$6"
            icon={<X size={16} />}
            onPress={handleDiscard}
            pressStyle={{ opacity: 0.8, scale: 0.98 }}
          >
            <Button.Text fontWeight="700">{t("recovery.discard")}</Button.Text>
          </Button>
          <Button
            size="$3"
            height={44}
            hitSlop={8}
            bg={session.isOuting ? "$bgLight" : "$primary"}
            borderWidth={1}
            borderColor="$borderStrong"
            rounded="$6"
            icon={<Play size={16} />}
            onPress={handleResume}
            pressStyle={{ opacity: 0.9, scale: 0.98 }}
          >
            <Button.Text color={session.isOuting ? "$text" : "white"} fontWeight="700">
              {t("recovery.resume")}
            </Button.Text>
          </Button>
        </XStack>
      </YStack>
    </Card>
  );
}

/**
 * Wrapper that handles the recovery logic internally
 */
export function SessionRecoveryBanner() {
  const { recoverableSession, isChecking, recoverSession, finishSession, discardSession } =
    useSessionRecovery();

  if (isChecking || !recoverableSession) {
    return null;
  }

  return (
    <SessionRecoveryCard
      session={recoverableSession}
      onRecover={recoverSession}
      onFinish={finishSession}
      onDiscard={discardSession}
    />
  );
}
