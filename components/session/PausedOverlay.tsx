import { AppButton } from "@/components/common/AppButton";
import { Card } from "@/components/common/Card";
import { useSessionStore } from "@/stores/session";
import { useRouter } from "expo-router";
import { useTranslation } from "react-i18next";
import { Paragraph, Text, YStack } from "tamagui";

export function PausedOverlay() {
  const { t } = useTranslation();
  const router = useRouter();
  const { status, resumeSession, quitSession } = useSessionStore();

  if (status !== "paused") return null;

  const handleQuit = () => {
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
      bg="rgba(0,0,0,0.6)"
      style={{ zIndex: 1000 }}
      items="center"
      justify="center"
      gap="$6"
      p="$6"
    >
      <Card width="100%" maxW={360} bg="$background">
        <YStack gap="$3" items="center">
          <Text fontWeight="900" fontSize={28} color="$color" style={{ textAlign: "center" }}>
            {t("session.paused_title")}
          </Text>
          <Paragraph color="$color" opacity={0.65} size="$3" style={{ textAlign: "center" }}>
            {t("session.paused_subtitle")}
          </Paragraph>

          <YStack width="100%" gap="$3" pt="$2">
            <AppButton onPress={resumeSession} variant="primary">
              {t("session.resume_button")}
            </AppButton>

            <AppButton
              onPress={handleQuit}
              variant="outline"
              backgroundColor="$pastelPink"
              pressStyle={{ opacity: 0.9 }}
            >
              {t("session.quit_button")}
            </AppButton>
          </YStack>
        </YStack>
      </Card>
    </YStack>
  );
}
