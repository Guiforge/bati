import { AlertTriangle, Play, X } from "@tamagui/lucide-icons";
import { useRouter } from "expo-router";
import { useTranslation } from "react-i18next";
import { Button, Card, Text, XStack, YStack } from "tamagui";
import { useHaptics } from "@/src/hooks/useHaptics";
import { type RecoverableSession, useSessionRecovery } from "@/src/hooks/useSessionRecovery";

/**
 * Format seconds as mm:ss
 */
function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, "0")}`;
}

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

  const handleResume = async () => {
    haptics.impact();
    await onRecover();
    router.push("/session");
  };

  const handleDiscard = async () => {
    await onDiscard();
  };

  return (
    <Card
      bg="$pastelOrange"
      p="$4"
      borderWidth={3}
      borderColor="$color"
      rounded="$6"
      animation="quick"
      enterStyle={{ opacity: 0, y: -10 }}
    >
      <YStack gap="$3">
        <XStack gap="$2" items="center">
          <AlertTriangle size={20} color="$primary" />
          <Text fontSize={18} fontWeight="bold" color="$color">
            {t("recovery.title")}
          </Text>
        </XStack>

        <Text color="$color" opacity={0.8}>
          {t("recovery.description")}
        </Text>

        <YStack gap="$1" bg="$background" p="$2" rounded="$3">
          <Text fontSize="$4" fontWeight="600" color="$color">
            {session.questTitle}
          </Text>
          <Text fontSize="$3" color="$color" opacity={0.7}>
            {t("recovery.progress", { progress: session.progress })}
          </Text>
          <Text fontSize="$3" color="$color" opacity={0.7}>
            {t("recovery.elapsed", { time: formatTime(session.elapsedTime) })}
          </Text>
        </YStack>

        <XStack gap="$3" justify="flex-end">
          <Button
            size="$3"
            bg="$bgLight"
            borderWidth={3}
            borderColor="$color"
            rounded="$6"
            icon={<X size={16} />}
            onPress={handleDiscard}
            pressStyle={{ opacity: 0.8, scale: 0.98 }}
          >
            <Button.Text fontWeight="800">{t("recovery.discard")}</Button.Text>
          </Button>
          <Button
            size="$3"
            bg="$primary"
            borderWidth={3}
            borderColor="$color"
            rounded="$6"
            icon={<Play size={16} />}
            onPress={handleResume}
            pressStyle={{ opacity: 0.9, scale: 0.98 }}
          >
            <Button.Text color="white" fontWeight="800">
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
