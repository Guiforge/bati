import { BlurView } from "expo-blur";
import { useTranslation } from "react-i18next";
import { Modal } from "react-native";
import { Button, Card, H3, Paragraph, ScrollView, YStack } from "tamagui";

interface NarrativeModalProps {
  visible: boolean;
  title: string;
  text: string;
  onClose: () => void;
  type?: "intro" | "outro";
}

export function NarrativeModal({
  visible,
  title,
  text,
  onClose,
  type = "intro",
}: NarrativeModalProps) {
  const { t } = useTranslation();

  return (
    <Modal visible={visible} transparent animationType="fade">
      <BlurView intensity={80} tint="dark" style={{ flex: 1 }}>
        <YStack flex={1} justify="center" items="center" p="$4">
          <Card
            bordered
            elevate
            width="100%"
            maxWidth={500}
            maxHeight="80%"
            bg="$bgLight"
            borderColor="$primary"
            borderWidth={3}
            p="$0"
            overflow="hidden"
          >
            {/* Header */}
            <YStack bg="$primary" p="$4" items="center">
              <H3 color="white" style={{ textAlign: "center" }}>
                {title}
              </H3>
            </YStack>

            {/* Content */}
            <ScrollView p="$5">
              <Paragraph size="$5" lineHeight={28} style={{ textAlign: "left" }} color="$color">
                {text}
              </Paragraph>
            </ScrollView>

            {/* Footer */}
            <YStack p="$4" pt="$2">
              <Button
                bg="$primary"
                size="$5"
                onPress={onClose}
                borderWidth={3}
                borderColor="$color"
                pressStyle={{ opacity: 0.9, scale: 0.98 }}
              >
                <Button.Text color="white" fontWeight="bold" fontSize="$5">
                  {type === "intro"
                    ? t("common.begin_adventure", "Begin Adventure")
                    : t("common.continue", "Continue")}
                </Button.Text>
              </Button>
            </YStack>
          </Card>
        </YStack>
      </BlurView>
    </Modal>
  );
}
