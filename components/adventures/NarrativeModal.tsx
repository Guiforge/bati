import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import type { ComponentProps } from "react";
import { useTranslation } from "react-i18next";
import { Modal } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Paragraph, ScrollView, YStack } from "tamagui";
import { AppButton } from "@/components/common/AppButton";
import { Recitatif } from "@/components/common/Recitatif";
import { fade, rawColors } from "@/constants/rawColors";
import { useReducedMotion } from "@/hooks/useReducedMotion";

interface NarrativeModalProps {
  visible: boolean;
  title: string;
  text: string;
  /** The painting of the quest speaking. Without one the panel is the caption on ink. */
  image?: ComponentProps<typeof Image>["source"];
  onClose: () => void;
  /** Real "back out" path, distinct from the confirm action. Falls back to onClose when omitted. */
  onDismiss?: () => void;
  type?: "intro" | "outro";
}

/**
 * The one moment the world speaks, as a page of its own.
 *
 * It was a gradient over the screen it interrupted, and that screen's own chrome (title, buttons,
 * tab bar) showed through behind the story. Now the modal owns its whole ground: the painting
 * full-bleed on top, its title in the same Recitatif the Victory plate uses, pinned to the art's
 * bottom-left edge, and the words on ink below. Same words, same two actions, same testIDs.
 */
export function NarrativeModal({
  visible,
  title,
  text,
  image,
  onClose,
  onDismiss,
  type = "intro",
}: NarrativeModalProps) {
  const { t } = useTranslation();
  const dismiss = onDismiss ?? onClose;
  const reducedMotion = useReducedMotion();
  const insets = useSafeAreaInsets();

  return (
    <Modal
      visible={visible}
      animationType={reducedMotion ? "none" : "fade"}
      onRequestClose={dismiss}
      statusBarTranslucent
      navigationBarTranslucent
    >
      <YStack flex={1} bg="$bgDark">
        {image ? (
          // 4:3 like a quest cover; the gradient melts the foot of the painting into the ground.
          <YStack width="100%" aspectRatio={4 / 3} bg="$surface2">
            <Image
              source={image}
              style={{ width: "100%", height: "100%" }}
              contentFit="cover"
              accessible={false}
            />
            <LinearGradient
              colors={["transparent", fade(rawColors.bgDark, 0.55), rawColors.bgDark]}
              locations={[0.5, 0.8, 1]}
              style={{ position: "absolute", left: 0, right: 0, top: 0, bottom: 0 }}
            />
            <YStack position="absolute" b={0} l={0} r={0} px="$5">
              <Recitatif>{title}</Recitatif>
            </YStack>
          </YStack>
        ) : (
          <YStack px="$5" pt={insets.top + 24}>
            <Recitatif>{title}</Recitatif>
          </YStack>
        )}

        <YStack flex={1} px="$5" pt="$4" pb={insets.bottom + 24} gap="$4">
          {/* Scrolls rather than pushing the action off the screen. */}
          <ScrollView flex={1}>
            <Paragraph fontFamily="$body" size="$5" lineHeight={30} color="$text">
              {text}
            </Paragraph>
          </ScrollView>

          <AppButton testID="narrative-confirm" onPress={onClose}>
            {type === "intro"
              ? t("common.begin_adventure", "Begin Adventure")
              : t("common.continue", "Continue")}
          </AppButton>

          {type === "intro" && onDismiss ? (
            <AppButton
              testID="narrative-dismiss"
              variant="outline"
              accessibilityLabel={t("common.not_now", "Not now")}
              onPress={onDismiss}
            >
              {t("common.not_now", "Not now")}
            </AppButton>
          ) : null}
        </YStack>
      </YStack>
    </Modal>
  );
}
