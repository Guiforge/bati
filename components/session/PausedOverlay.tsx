import { useRouter } from "expo-router";
import { useTranslation } from "react-i18next";
import { Button, Text, YStack } from "tamagui";
import { useSessionStore } from "@/stores/session";

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
      bg="rgba(0,0,0,0.85)"
      style={{ zIndex: 1000 }}
      items="center"
      justify="center"
      gap="$6"
      p="$6"
    >
      <Text
        color="white"
        fontSize={32}
        fontWeight="900"
        textTransform="uppercase"
        style={{ textAlign: "center" }}
      >
        {t("session.paused_title", "Game Paused")}
      </Text>

      <YStack width="100%" gap="$4" style={{ maxWidth: 300 }}>
        <Button
          size="$6"
          bg="$primary"
          pressStyle={{ bg: "$primary", opacity: 0.8 }}
          onPress={resumeSession}
          borderWidth={3}
          borderColor="white"
          rounded="$6"
        >
          <Text color="white" fontSize={20} fontWeight="900" textTransform="uppercase">
            {t("session.resume_button", "Resume")}
          </Text>
        </Button>

        <Button
          size="$5"
          bg="$error"
          pressStyle={{ bg: "$error", opacity: 0.8 }}
          onPress={handleQuit}
          borderWidth={3}
          borderColor="white"
          rounded="$6"
        >
          <Text color="white" fontSize={18} fontWeight="900" textTransform="uppercase">
            {t("session.quit_button", "Quit Quest")}
          </Text>
        </Button>
      </YStack>
    </YStack>
  );
}
