import { usePathname } from "expo-router";
import { type ReactNode, useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";
import {
  BackHandler,
  Keyboard,
  Pressable,
  type ScrollViewInstance,
  useWindowDimensions,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Sheet, Text, XStack, YStack } from "tamagui";
import { headingFont } from "@/components/common/headingFont";
import { RevealContext } from "@/components/common/revealInSheet";
import { tamaguiRef } from "@/components/common/tamaguiRef";
import { useKeyboardHeight } from "@/components/common/useKeyboardHeight";
import { X } from "@/components/icons";
import { CONTENT_MAX_WIDTH } from "@/constants/layout";
import { useReducedMotion } from "@/hooks/useReducedMotion";

type Props = {
  open: boolean;
  title: string;
  /** Called on the X, the scrim, hardware back, and when the screen underneath changes. */
  onClose: () => void;
  children: ReactNode;
  /**
   * Pinned under the scrolling body, outside it: a button that must stay in reach while the form
   * above scrolls or the keyboard is up. Absent for the sheets that never needed one.
   */
  footer?: ReactNode;
  /** One field and then the action: scroll to the end when the keyboard rises, so both show. */
  endOnKeyboard?: boolean;
};

/**
 * A bottom sheet that asks for something typed: a password, a server. Built like
 * `OutingGoalSheet`, `disableDrag` included (with the drag on, the pane drifts off its snap point
 * and a close leaves the frame painted where it drifted, taps falling through), plus what a form
 * needs and those sheets did not:
 *
 * - `moveOnKeyboardChange`: the fields sit where the keyboard lands. Without it the second one is
 *   typed into blind, and a tap meant for it lands in the first (found on an emulator).
 * - a scroll view that lets taps through with the keyboard up (`keyboardShouldPersistTaps`), and
 *   that never claims a touch on a move (see below): either way the first tap on the button was
 *   lost and the hero pressed twice.
 * - closing when the route changes: a modal sheet is portalled above the navigator, and one left
 *   open while a row underneath navigated stayed painted over the next screen.
 */
export function FormSheet({ open, title, onClose, children, footer, endOnKeyboard }: Props) {
  const { t } = useTranslation();
  const reducedMotion = useReducedMotion();
  const insets = useSafeAreaInsets();
  const { height } = useWindowDimensions();
  const pathname = usePathname();
  const shownOn = useRef(pathname);
  const scroll = useRef<ScrollViewInstance>(null);
  const keyboardH = useKeyboardHeight(endOnKeyboard ? scroll : undefined);

  const reveal = (node: unknown) => {
    const target = node as { measureLayout?: (...args: unknown[]) => void } | null;
    const inner = (
      scroll.current as { getInnerViewRef?: () => unknown } | null
    )?.getInnerViewRef?.();
    if (!target?.measureLayout || !inner) return;
    // A frame later: the node has no layout yet in the commit that mounted it.
    requestAnimationFrame(() =>
      target.measureLayout?.(
        inner,
        (_x: number, y: number) => scroll.current?.scrollTo({ y: Math.max(0, y - 24) }),
        () => undefined, // not measurable: the field stays where it is
      ),
    );
  };

  const close = () => {
    Keyboard.dismiss();
    onClose();
  };

  // Hardware back closes the sheet first: a portalled modal is above the navigator, so without
  // this the router took the press and left the tab (past-session sheet sent the hero Home).
  useEffect(() => {
    if (!open) return;
    const sub = BackHandler.addEventListener("hardwareBackPress", () => {
      Keyboard.dismiss();
      onClose();
      return true;
    });
    return () => sub.remove();
  }, [open, onClose]);

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
        bg="sheetScrim"
        transition={reducedMotion ? undefined : "quick"}
        opacity="1 enter:0 exit:0"
      />
      <Sheet.Container
        overflow="hidden"
        borderTopLeftRadius="6"
        borderTopRightRadius="6"
        width="100%"
        maxW={CONTENT_MAX_WIDTH}
        self="center"
        // A full sheet would rise under the status bar; what does not fit scrolls.
        style={{ maxHeight: height - insets.top - 16 - keyboardH }}
      >
        <Sheet.Background bg="surface" borderTopLeftRadius="6" borderTopRightRadius="6" />
        {/* ponytail: `onMoveShouldSetResponder` overrides Tamagui 2.7.7's, which compares each
            touch to a `lastPageY` it never resets: the first move of any new touch reads as a
            >10px drag, the scroll view seizes the responder and the button's press is cancelled.
            The first tap did nothing, the second, landing near the first, worked (6/6 on an
            emulator with a 3 px finger drift). Drag is off here, so the hook has nothing to feed.
            Tamagui 3 resets it per touch (`onTouchStart` in `useSheetScrollViewGestures.native.ts`),
            so this is now redundant. It stays until the first tap is replayed on an emulator in
            release on 3.x; then drop it, here and in the other sheets, with the lint plugin. */}
        <Sheet.ScrollView
          px={0}
          ref={tamaguiRef(scroll)}
          keyboardShouldPersistTaps="handled"
          onMoveShouldSetResponder={() => false}
          // With a footer the body gives way to it instead of pushing it off the sheet.
          shrink={footer ? 1 : undefined}
        >
          <YStack px="4" pt="4" pb={footer ? 8 : insets.bottom + 16} gap="3">
            <XStack items="center" justify="space-between" gap="3">
              <Text
                flex={1}
                fontFamily={headingFont(title)}
                fontWeight="700"
                fontSize={20}
                color="text"
              >
                {title}
              </Text>
              <Pressable
                hitSlop={12}
                accessibilityRole="button"
                accessibilityLabel={t("common.close")}
                onPress={close}
              >
                <X size={20} color="textSecondary" />
              </Pressable>
            </XStack>
            <RevealContext.Provider value={reveal}>{children}</RevealContext.Provider>
          </YStack>
        </Sheet.ScrollView>
        {footer ? (
          <YStack px="4" pt="2" pb={insets.bottom + 16} gap="2" bg="surface">
            {footer}
          </YStack>
        ) : null}
      </Sheet.Container>
    </Sheet>
  );
}
