import { Image } from "expo-image";
import { Modal, Pressable } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Text, YStack } from "tamagui";
import { rawColors } from "@/constants/rawColors";
import { useReducedMotion } from "@/hooks/useReducedMotion";

/**
 * The painting, full screen, because a tap on the monster should give you the monster.
 *
 * The arena and the victory card both crop the art hard (`cover` into a wide slot), so this is
 * the only place the whole composition is ever visible. One tap anywhere closes it — it is a
 * look, not a screen, and it must never trap the session behind a hidden dismiss gesture.
 */
export function ImageViewer({
  source,
  name,
  visible,
  onClose,
}: {
  source: number;
  name: string;
  visible: boolean;
  onClose: () => void;
}) {
  const insets = useSafeAreaInsets();
  const reducedMotion = useReducedMotion();

  return (
    <Modal
      visible={visible}
      transparent
      animationType={reducedMotion ? "none" : "fade"}
      onRequestClose={onClose}
    >
      <Pressable
        style={{ flex: 1, backgroundColor: rawColors.bgDark }}
        onPress={onClose}
        accessibilityRole="button"
        accessibilityLabel={name}
      >
        <Image
          source={source}
          style={{ width: "100%", height: "100%" }}
          contentFit="contain"
          transition={reducedMotion ? 0 : 150}
        />
        <YStack position="absolute" b={insets.bottom + 24} l="$4" r="$4" items="center">
          <Text fontFamily="$heading" fontWeight="700" fontSize={24} color="$text">
            {name}
          </Text>
        </YStack>
      </Pressable>
    </Modal>
  );
}
