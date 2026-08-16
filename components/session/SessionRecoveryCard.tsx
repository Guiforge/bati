import { AlertTriangle, Play, X } from "@tamagui/lucide-icons";
import { useRouter } from "expo-router";
import { useTranslation } from "react-i18next";
import { Button, Text, XStack, YStack } from "tamagui";
import { Card } from "@/components/common/Card";
import { useHaptics } from "@/hooks/useHaptics";
import { useReducedMotion } from "@/hooks/useReducedMotion";
import { type RecoverableSession, useSessionRecovery } from "@/hooks/useSessionRecovery";
import { formatTime } from "@/hooks/useSessionTimer";

interface SessionRecoveryCardProps {
  session: RecoverableSession;
  onRecover: () => Promise<boolean | undefined>;
  onDiscard: () => Promise<void>;
}

/**
 * Card displayed on home screen when there's a recoverable session
 */
export function SessionRecoveryCard({ session, onRecover, onDiscard }: SessionRecoveryCardProps) {
  const { t } = useTranslation();
  const router = useRouter();
  const haptics = useHaptics();
  const reducedMotion = useReducedMotion();

  const handleResume = async () => {
    haptics.mediumImpact();
    // Only leave Home if the session actually came back. `recoverSession` returns false on a
    // corrupt or already-consumed slot, and pushing anyway meant the session screen's own
    // no-quest guard bounced straight back — a navigation round trip the hero sees as a flicker.
    const recovered = await onRecover();
    if (recovered) router.push("/session");
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
            {t("recovery.title")}
          </Text>
        </XStack>

        <Text color="$text" opacity={0.8}>
          {t("recovery.description")}
        </Text>

        <YStack gap="$1" bg="$background" p="$2" rounded="$3">
          <Text fontSize="$4" fontWeight="700" color="$text">
            {session.questTitle}
          </Text>
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
        </YStack>

        <XStack gap="$3" justify="flex-end">
          <Button
            size="$3"
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
            hitSlop={8}
            bg="$primary"
            borderWidth={1}
            borderColor="$borderStrong"
            rounded="$6"
            icon={<Play size={16} />}
            onPress={handleResume}
            pressStyle={{ opacity: 0.9, scale: 0.98 }}
          >
            <Button.Text color="white" fontWeight="700">
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
  const { recoverableSession, isChecking, recoverSession, discardSession } = useSessionRecovery();

  if (isChecking || !recoverableSession) {
    return null;
  }

  return (
    <SessionRecoveryCard
      session={recoverableSession}
      onRecover={recoverSession}
      onDiscard={discardSession}
    />
  );
}
