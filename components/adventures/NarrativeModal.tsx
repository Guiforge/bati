import { BlurView } from "expo-blur";
import { useTranslation } from "react-i18next";
import { Modal, Pressable } from "react-native";
import { Button, Card, H3, Paragraph, ScrollView, Text, YStack } from "tamagui";
import { useReducedMotion } from "@/hooks/useReducedMotion";

interface NarrativeModalProps {
  visible: boolean;
  title: string;
  text: string;
  onClose: () => void;
  /** Real "back out" path, distinct from the confirm action. Falls back to onClose when omitted. */
  onDismiss?: () => void;
  type?: "intro" | "outro";
}

export function NarrativeModal({
  visible,
  title,
  text,
  onClose,
  onDismiss,
  type = "intro",
}: NarrativeModalProps) {
  const { t } = useTranslation();
  const dismiss = onDismiss ?? onClose;
  const reducedMotion = useReducedMotion();

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={dismiss}>
      <BlurView intensity={80} tint="dark" style={{ flex: 1 }}>
        <YStack flex={1} justify="center" items="center" p="$4">
          <Card
            width="100%"
            maxWidth={500}
            maxHeight="80%"
            bg="$bgLight"
            borderColor="$primary"
            borderWidth={1}
            shadowColor="$shadowColor"
            shadowRadius={8}
            shadowOffset={{ width: 0, height: 4 }}
            shadowOpacity={0.15}
            elevation={5}
            p="$0"
            overflow="hidden"
            transition={reducedMotion ? undefined : "bouncy"}
            enterStyle={{ opacity: 0, scale: 0.9 }}
          >
            {/* Header */}
            <YStack bg="$primary" p="$4" items="center">
              <H3 color="white" style={{ textAlign: "center" }}>
                {title}
              </H3>
            </YStack>

            {/* Content */}
            <ScrollView p="$5">
              <Paragraph size="$4" lineHeight={28} style={{ textAlign: "left" }} color="$text">
                {text}
              </Paragraph>
            </ScrollView>

            {/* Footer */}
            <YStack p="$4" pt="$2" gap="$3">
              <Button
                testID="narrative-confirm"
                bg="$primary"
                fontSize={18}
                onPress={onClose}
                borderWidth={1}
                borderColor="$borderStrong"
                transition={reducedMotion ? undefined : "quick"}
                pressStyle={{ opacity: 0.9, scale: 0.98 }}
              >
                <Button.Text color="white" fontWeight="bold" fontSize={18}>
                  {type === "intro"
                    ? t("common.begin_adventure", "Begin Adventure")
                    : t("common.continue", "Continue")}
                </Button.Text>
              </Button>

              {type === "intro" && onDismiss ? (
                <Pressable
                  testID="narrative-dismiss"
                  hitSlop={12}
                  accessibilityRole="button"
                  accessibilityLabel={t("common.not_now", "Not now")}
                  onPress={onDismiss}
                  style={({ pressed }) => ({ opacity: pressed ? 0.6 : 1 })}
                >
                  <Text
                    color="$textSecondary"
                    fontSize={14}
                    fontWeight="700"
                    style={{ textAlign: "center" }}
                  >
                    {t("common.not_now", "Not now")}
                  </Text>
                </Pressable>
              ) : null}
            </YStack>
          </Card>
        </YStack>
      </BlurView>
    </Modal>
  );
}
