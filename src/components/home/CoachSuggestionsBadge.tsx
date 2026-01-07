import { useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Button, Dialog, Text, XStack, YStack } from "tamagui";
import { listCompletedSessions } from "@/src/db/completed";
import { getPreference, setPreference } from "@/src/db/preferences";
import { useGameIcon } from "@/src/hooks/useGameIcon";

export function CoachSuggestionsBadge() {
  const { t } = useTranslation();
  const { GameIcon } = useGameIcon();

  const [showBadge, setShowBadge] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [daysActive, setDaysActive] = useState(0);

  const checkCoachSuggestions = useCallback(async () => {
    // Check if user has viewed suggestions
    const viewed = await getPreference("coach_suggestions_viewed");
    if (viewed) {
      setShowBadge(false);
      return;
    }

    // Check if user has 7+ days of sessions
    const sessions = await listCompletedSessions(100);

    if (sessions.length === 0) {
      setShowBadge(false);
      return;
    }

    // Calculate days since first session
    const firstSession = sessions[sessions.length - 1];
    const daysSinceFirst = Math.floor(
      (Date.now() - new Date(firstSession.performedAt).getTime()) / (1000 * 60 * 60 * 24)
    );

    setDaysActive(daysSinceFirst);

    if (daysSinceFirst >= 7) {
      setShowBadge(true);
    }
  }, []);

  useEffect(() => {
    checkCoachSuggestions();
  }, [checkCoachSuggestions]);

  const handleOpenSuggestions = () => {
    setShowModal(true);
    setShowBadge(false);
  };

  const handleClose = async () => {
    setShowModal(false);
    // Mark as viewed
    await setPreference("coach_suggestions_viewed", "true");
  };

  if (!showBadge && !showModal) return null;

  return (
    <>
      {/* Badge indicator */}
      {showBadge && (
        <Button
          circular
          size="$4"
          bg="$primary"
          position="absolute"
          top={-4}
          right={-4}
          width={24}
          height={24}
          p={0}
          shadowColor="$primaryGlow"
          shadowRadius={8}
          shadowOpacity={0.8}
          onPress={handleOpenSuggestions}
        >
          <Text color="$text" fontSize="$1" fontWeight="900">
            1
          </Text>
        </Button>
      )}

      {/* Suggestions Modal */}
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
                bg="$warning"
                width={80}
                height={80}
                alignItems="center"
                justifyContent="center"
                borderRadius={999}
                shadowColor="$warning"
                shadowOffset={{ width: 0, height: 4 }}
                shadowOpacity={0.6}
                shadowRadius={12}
              >
                <GameIcon name="trophy" size={40} tintColor="$text" />
              </YStack>

              <Dialog.Title fontSize={32} fontWeight="900" color="$text" textAlign="center">
                {t("coach.suggestions_title")}
              </Dialog.Title>

              <Dialog.Description fontSize="$4" color="$textSecondary" textAlign="center">
                {t("coach.suggestions_intro", { days: daysActive })}
              </Dialog.Description>
            </YStack>

            <YStack gap="$3">
              <YStack
                bg="$glassBg"
                p="$4"
                borderRadius="$4"
                borderWidth={1}
                borderColor="$borderStrong"
              >
                <XStack gap="$3" alignItems="flex-start">
                  <GameIcon name="target" size={24} tintColor="$primary" />
                  <YStack flex={1}>
                    <Text color="$text" fontSize="$4" fontWeight="600" mb="$1">
                      {t("coach.suggestion_1_title")}
                    </Text>
                    <Text color="$textSecondary" fontSize="$3">
                      {t("coach.suggestion_1_desc")}
                    </Text>
                  </YStack>
                </XStack>
              </YStack>

              <YStack
                bg="$glassBg"
                p="$4"
                borderRadius="$4"
                borderWidth={1}
                borderColor="$borderStrong"
              >
                <XStack gap="$3" alignItems="flex-start">
                  <GameIcon name="flag" size={24} tintColor="$success" />
                  <YStack flex={1}>
                    <Text color="$text" fontSize="$4" fontWeight="600" mb="$1">
                      {t("coach.suggestion_2_title")}
                    </Text>
                    <Text color="$textSecondary" fontSize="$3">
                      {t("coach.suggestion_2_desc")}
                    </Text>
                  </YStack>
                </XStack>
              </YStack>

              <YStack
                bg="$glassBg"
                p="$4"
                borderRadius="$4"
                borderWidth={1}
                borderColor="$borderStrong"
              >
                <XStack gap="$3" alignItems="flex-start">
                  <GameIcon name="zap" size={24} tintColor="$warning" />
                  <YStack flex={1}>
                    <Text color="$text" fontSize="$4" fontWeight="600" mb="$1">
                      {t("coach.suggestion_3_title")}
                    </Text>
                    <Text color="$textSecondary" fontSize="$3">
                      {t("coach.suggestion_3_desc")}
                    </Text>
                  </YStack>
                </XStack>
              </YStack>
            </YStack>

            <Button
              size="$5"
              bg="$primary"
              color="$text"
              fontWeight="bold"
              onPress={handleClose}
              pressStyle={{ opacity: 0.8, scale: 0.98 }}
            >
              {t("coach.got_it")}
            </Button>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog>
    </>
  );
}
