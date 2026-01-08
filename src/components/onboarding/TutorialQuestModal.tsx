import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Button, Dialog, Text, XStack, YStack } from "tamagui";
import { getPreference, setPreference } from "@/src/db/preferences";
import { useGameIcon } from "@/src/hooks/useGameIcon";

export function TutorialQuestModal() {
  const { t } = useTranslation();
  const router = useRouter();
  const { GameIcon } = useGameIcon();

  const [showModal, setShowModal] = useState(false);

  useEffect(() => {
    // Check if tutorial was completed or skipped
    getPreference("tutorial_completed").then((completed) => {
      getPreference("tutorial_skipped").then((skipped) => {
        if (!completed && !skipped) {
          // Show modal on first home load
          setTimeout(() => setShowModal(true), 1000);
        }
      });
    });
  }, []);

  const handleStartTutorial = () => {
    setShowModal(false);
    // Navigate to tutorial quest (ID 1 = tutorial quest)
    router.push("/(modals)/quests/1");
  };

  const handleSkip = async () => {
    setShowModal(false);
    // Mark as skipped so it doesn't show again
    await setPreference("tutorial_skipped", "true");
  };

  if (!showModal) return null;

  return (
    <Dialog open={showModal} onOpenChange={setShowModal}>
      <Dialog.Portal>
        <Dialog.Overlay
          key="overlay"
          animation="quick"
          opacity={0.5}
          enterStyle={{ opacity: 0 }}
          exitStyle={{ opacity: 0 }}
        />
        <Dialog.Content
          bordered
          elevate
          key="content"
          animation={[
            "quick",
            {
              opacity: {
                overshootClamping: true,
              },
            },
          ]}
          enterStyle={{ x: 0, y: -20, opacity: 0, scale: 0.9 }}
          exitStyle={{ x: 0, y: 10, opacity: 0, scale: 0.95 }}
          gap="$4"
          bg="$bgDark"
          p="$6"
          maxWidth={400}
        >
          <YStack alignItems="center" gap="$3">
            <YStack
              bg="$primary"
              width={80}
              height={80}
              alignItems="center"
              justifyContent="center"
              borderRadius={999}
              shadowColor="$primaryGlow"
              shadowOffset={{ width: 0, height: 4 }}
              shadowOpacity={0.6}
              shadowRadius={12}
            >
              <GameIcon name="lorc/open-book" size={40} tintColor="$text" />
            </YStack>

            <Dialog.Title fontSize={32} fontWeight="900" color="$text" textAlign="center">
              {t("onboarding.tutorial_title")}
            </Dialog.Title>

            <Dialog.Description
              fontSize="$4"
              color="$textSecondary"
              textAlign="center"
              lineHeight={24}
            >
              {t("onboarding.tutorial_description")}
            </Dialog.Description>

            <YStack
              bg="$glassBg"
              p="$3"
              borderRadius="$3"
              borderWidth={1}
              borderColor="$borderStrong"
              width="100%"
            >
              <XStack gap="$2" alignItems="center" mb="$2">
                <GameIcon name="lorc/checked-shield" size={16} tintColor="$success" />
                <Text color="$text" fontSize="$3">
                  {t("onboarding.tutorial_feature_1")}
                </Text>
              </XStack>
              <XStack gap="$2" alignItems="center" mb="$2">
                <GameIcon name="lorc/checked-shield" size={16} tintColor="$success" />
                <Text color="$text" fontSize="$3">
                  {t("onboarding.tutorial_feature_2")}
                </Text>
              </XStack>
              <XStack gap="$2" alignItems="center">
                <GameIcon name="lorc/checked-shield" size={16} tintColor="$success" />
                <Text color="$text" fontSize="$3">
                  {t("onboarding.tutorial_feature_3")}
                </Text>
              </XStack>
            </YStack>

            <Text color="$warning" fontSize="$3" fontWeight="600" textAlign="center">
              {t("onboarding.tutorial_reward")}
            </Text>
          </YStack>

          <YStack gap="$3" mt="$2">
            <Button
              size="$5"
              bg="$primary"
              color="$text"
              fontWeight="bold"
              onPress={handleStartTutorial}
              pressStyle={{ opacity: 0.8, scale: 0.98 }}
              shadowColor="$primaryGlow"
              shadowOffset={{ width: 0, height: 4 }}
              shadowOpacity={0.6}
              shadowRadius={12}
            >
              {t("onboarding.tutorial_start")}
            </Button>

            <Button
              size="$4"
              chromeless
              color="$textSecondary"
              onPress={handleSkip}
              pressStyle={{ opacity: 0.7 }}
            >
              {t("onboarding.tutorial_skip")}
            </Button>
          </YStack>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog>
  );
}
