import { useRouter } from "expo-router";
import { useTranslation } from "react-i18next";
import { Paragraph, Text, YStack } from "tamagui";
import { AppButton } from "@/components/common/AppButton";
import { Card } from "@/components/common/Card";
import { useHaptics } from "@/hooks/useHaptics";
import { useSessionStore } from "@/stores/session";

export function PausedOverlay() {
  const { t } = useTranslation();
  const router = useRouter();
  const { mediumImpact, warning } = useHaptics();
  const status = useSessionStore((s) => s.status);
  const resumeSession = useSessionStore((s) => s.resumeSession);
  const restartRound = useSessionStore((s) => s.restartRound);
  const quitSession = useSessionStore((s) => s.quitSession);

  if (status !== "paused") return null;

  const handleResume = () => {
    mediumImpact();
    resumeSession();
  };

  const handleRestartRound = () => {
    mediumImpact();
    restartRound();
  };

  const handleQuit = () => {
    warning();
    quitSession();
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace("/");
    }
  };

  return (
    <YStack
      fullscreen
      bg="rgba(0,0,0,0.72)"
      style={{ zIndex: 1000 }}
      items="center"
      justify="center"
      gap="$6"
      p="$6"
    >
      <Card width="100%" maxW={360} bg="$surface">
        <YStack gap="$3" items="center">
          <Text fontWeight="700" fontSize={28} color="$text" style={{ textAlign: "center" }}>
            {t("session.paused_title")}
          </Text>
          <Paragraph color="$textSecondary" size="$3" style={{ textAlign: "center" }}>
            {t("session.paused_subtitle")}
          </Paragraph>

          <YStack width="100%" gap="$3" pt="$2">
            <AppButton
              onPress={handleResume}
              variant="primary"
              accessibilityLabel={t("session.resume_button")}
              accessibilityRole="button"
            >
              {t("session.resume_button")}
            </AppButton>

            <AppButton
              onPress={handleRestartRound}
              variant="outline"
              backgroundColor="$surface2"
              pressStyle={{ opacity: 0.9 }}
              accessibilityLabel={t("session.restart_round_button")}
              accessibilityRole="button"
            >
              {t("session.restart_round_button")}
            </AppButton>

            <AppButton
              onPress={handleQuit}
              variant="outline"
              backgroundColor="$surface2"
              pressStyle={{ opacity: 0.9 }}
              accessibilityLabel={t("session.quit_button")}
              accessibilityRole="button"
            >
              {t("session.quit_button")}
            </AppButton>
          </YStack>
        </YStack>
      </Card>
    </YStack>
  );
}
