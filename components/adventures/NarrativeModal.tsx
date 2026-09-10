import { LinearGradient } from "expo-linear-gradient";
import { useTranslation } from "react-i18next";
import { Modal, Pressable } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Button, H2, Paragraph, ScrollView, Text, YStack } from "tamagui";
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

/**
 * The one moment the world speaks, painted over the screen it interrupts.
 *
 * It used to be a dialog: a rounded card with a solid `$primary` title bar, a filled button and a
 * "Not now" link, floating over an 80-intensity blur. That is the widget Android uses to ask for
 * location access, and the UX audit of 2026-09-10 said so in those words — the step's own
 * painting was on screen and was being blurred out to make room for a box.
 *
 * So there is no box. A gradient darkens the lower half enough to read against, the art the hero
 * came for stays visible above it, and the words sit in that space with nothing drawn around
 * them. Same words, same two actions, same testIDs.
 */
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
  const insets = useSafeAreaInsets();

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={dismiss}>
      <YStack flex={1} justify="flex-end">
        {/* The same scrim VictoryView paints over its art, for the same reason: text has to be
            readable over a painting nobody chose for its contrast, and the painting has to
            survive it. */}
        <LinearGradient
          colors={["transparent", "rgba(11,15,25,0.55)", "rgba(11,15,25,0.97)"]}
          locations={[0, 0.35, 0.72]}
          style={{ position: "absolute", left: 0, right: 0, top: 0, bottom: 0 }}
        />

        <YStack
          px="$5"
          pt="$5"
          pb={insets.bottom + 24}
          gap="$4"
          transition={reducedMotion ? undefined : "quick"}
          enterStyle={reducedMotion ? undefined : { opacity: 0, y: 24 }}
        >
          <H2 color="$text" fontSize={28} lineHeight={34}>
            {title}
          </H2>

          {/* Capped, not sized: most beats are three lines and should sit right above the button,
              a long one scrolls rather than pushing the action off the screen. */}
          <ScrollView maxH="40%">
            <Paragraph size="$5" lineHeight={30} color="$text">
              {text}
            </Paragraph>
          </ScrollView>

          <Button
            testID="narrative-confirm"
            bg="$primary"
            fontSize={18}
            onPress={onClose}
            borderWidth={0}
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
      </YStack>
    </Modal>
  );
}
