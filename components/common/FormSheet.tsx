import { usePathname } from "expo-router";
import { type ReactNode, useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";
import { Keyboard, Pressable } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Sheet, Text, XStack, YStack } from "tamagui";
import { X } from "@/components/icons";
import { useReducedMotion } from "@/hooks/useReducedMotion";

type Props = {
  open: boolean;
  title: string;
  /** Called on the X, the scrim, hardware back, and when the screen underneath changes. */
  onClose: () => void;
  children: ReactNode;
};

/**
 * A bottom sheet that asks for something typed: a password, a server. Built like
 * `OutingGoalSheet`, `disableDrag` included (with the drag on, the pane drifts off its snap point
 * and a close leaves the frame painted where it drifted, taps falling through), plus what a form
 * needs and those sheets did not:
 *
 * - `moveOnKeyboardChange`: the fields sit where the keyboard lands. Without it the second one is
 *   typed into blind, and a tap meant for it lands in the first (found on an emulator).
 * - a scroll view that lets taps through with the keyboard up (`keyboardShouldPersistTaps`), or
 *   the first tap on the button only dismissed the keyboard and the hero pressed twice.
 * - closing when the route changes: a modal sheet is portalled above the navigator, and one left
 *   open while a row underneath navigated stayed painted over the next screen.
 */
export function FormSheet({ open, title, onClose, children }: Props) {
  const { t } = useTranslation();
  const reducedMotion = useReducedMotion();
  const insets = useSafeAreaInsets();
  const pathname = usePathname();
  const shownOn = useRef(pathname);

  const close = () => {
    Keyboard.dismiss();
    onClose();
  };

  useEffect(() => {
    if (!open) {
      shownOn.current = pathname;
      return;
    }
    if (pathname !== shownOn.current) onClose();
  }, [open, pathname, onClose]);

  return (
    <Sheet
      modal
      open={open}
      // Tamagui reports a change of the `open` prop through here too: a sheet the caller closed
      // (a join that succeeded) came back as a dismissal, and the settings rows disconnected sync
      // on it. Only a sheet still open can be dismissed by the hero.
      onOpenChange={(next: boolean) => (next || !open ? undefined : close())}
      snapPointsMode="fit"
      disableDrag
      moveOnKeyboardChange
      transition={reducedMotion ? undefined : "quick"}
      zIndex={100_000}
    >
      <Sheet.Overlay
        bg="$sheetScrim"
        transition={reducedMotion ? undefined : "quick"}
        enterStyle={{ opacity: 0 }}
        exitStyle={{ opacity: 0 }}
      />
      <Sheet.Frame bg="$surface">
        <Sheet.ScrollView keyboardShouldPersistTaps="handled">
          <YStack px="$4" pt="$4" pb={insets.bottom + 16} gap="$3">
            <XStack items="center" justify="space-between" gap="$3">
              <Text flex={1} fontWeight="700" fontSize={18} color="$text">
                {title}
              </Text>
              <Pressable
                hitSlop={12}
                accessibilityRole="button"
                accessibilityLabel={t("common.close", "Close")}
                onPress={close}
              >
                <X size={20} color="$textSecondary" />
              </Pressable>
            </XStack>
            {children}
          </YStack>
        </Sheet.ScrollView>
      </Sheet.Frame>
    </Sheet>
  );
}
