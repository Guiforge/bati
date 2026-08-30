import { Image } from "expo-image";
import { useTranslation } from "react-i18next";
import { Modal, ScrollView } from "react-native";
import { Button, Text, YStack } from "tamagui";
import { Card } from "@/components/common/Card";
import { getExerciseAsset } from "@/constants/assetMap";
import { useReducedMotion } from "@/hooks/useReducedMotion";
import type { SessionInstruction } from "@/hooks/useSessionInstructions";

/**
 * The movement, drawn and explained. One block, two frames.
 *
 * `PausedOverlay` had the only copy: art, name, a scrolling description. It was reachable only by
 * pausing, which is a strange price for "what is a dead bug?" — so the same block now also opens
 * from the running screen as a modal, and the accordion that used to show the text *without* the
 * picture is gone. The picture is half the explanation.
 */
export function ExerciseInstructionsBody({
  instruction,
  artSize,
}: {
  instruction: SessionInstruction;
  /**
   * The art's side, in dp. A *side*, not a height: the exercise illustrations are square
   * (1280x1280), and a full-width band 120 tall asked `cover` for an 8:1 slice out of the middle
   * of one — the figure cropped away and mostly dark ground left. The paused card gives it a
   * thumbnail's worth of room; the modal gives it more.
   */
  artSize: number;
}) {
  return (
    <YStack width="100%" gap="$2" items="center">
      <Image
        source={getExerciseAsset(instruction.imagePath)}
        style={{ width: artSize, height: artSize, borderRadius: 12 }}
        contentFit="cover"
      />
      <Text fontWeight="700" fontSize={16} color="$text" style={{ textAlign: "center" }}>
        {instruction.name}
      </Text>
      {/* Scrolls rather than grows: a long movement would otherwise push whatever sits below —
          "resume", or the modal's own close — off the bottom of a small screen. 160 is what the
          paused card can spare on a 640dp phone, and the modal has no reason to want more. */}
      <ScrollView style={{ maxHeight: 160, width: "100%" }} showsVerticalScrollIndicator={false}>
        <Text fontSize={14} color="$textSecondary" lineHeight={20}>
          {instruction.description}
        </Text>
      </ScrollView>
    </YStack>
  );
}

/** The same block, opened from the running screen without stopping the set. */
export function ExerciseInstructionsModal({
  instruction,
  visible,
  onClose,
}: {
  instruction: SessionInstruction | null;
  visible: boolean;
  onClose: () => void;
}) {
  const { t } = useTranslation();
  const reducedMotion = useReducedMotion();

  if (!instruction) return null;

  return (
    <Modal
      visible={visible}
      transparent
      animationType={reducedMotion ? "none" : "fade"}
      onRequestClose={onClose}
    >
      <YStack flex={1} bg="$bgOverlay" justify="center" items="center" p="$4">
        <Card testID="session-instructions" width="100%" maxW={420} bg="$surface" gap="$3">
          <ExerciseInstructionsBody instruction={instruction} artSize={220} />
          <Button
            testID="session-instructions-close"
            bg="$primary"
            rounded="$6"
            borderWidth={0}
            onPress={onClose}
            pressStyle={{ opacity: 0.9 }}
            accessibilityRole="button"
          >
            <Text color="$text" fontSize={18} fontWeight="700">
              {t("common.close")}
            </Text>
          </Button>
        </Card>
      </YStack>
    </Modal>
  );
}
