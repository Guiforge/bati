import { ChevronLeft } from "@tamagui/lucide-icons";
import type { ReactNode } from "react";
import type { GestureResponderEvent } from "react-native";
import { Button, Text, XStack } from "tamagui";

export type HeaderNavProps = {
  title: string;
  onBack?: ((event: GestureResponderEvent) => void) | undefined;
  /**
   * Accessibility label for the back button.
   * Screens should pass a translated string.
   */
  backLabel?: string;
  /**
   * Optional trailing slot (level pill, gold counter, action icon...).
   */
  right?: ReactNode;
};

/**
 * NEW_STYLE top navigation bar: optional back button + centered uppercase title
 * + optional trailing slot. UI-only.
 */
export function HeaderNav({ title, onBack, backLabel = "Back", right }: HeaderNavProps) {
  return (
    <XStack height={44} items="center" justify="space-between" gap="$2">
      {onBack ? (
        <Button
          width={40}
          height={40}
          rounded={20}
          p={0}
          bg="$surface"
          borderWidth={1}
          borderColor="$borderStrong"
          pressStyle={{ opacity: 0.9, scale: 0.96 }}
          onPress={onBack}
          accessibilityLabel={backLabel}
        >
          <ChevronLeft size={22} color="$color" />
        </Button>
      ) : (
        <XStack width={40} />
      )}

      <Text
        flex={1}
        fontSize={16}
        fontWeight="800"
        color="$color"
        numberOfLines={1}
        style={{ textAlign: "center", textTransform: "uppercase", letterSpacing: 1 }}
      >
        {title}
      </Text>

      <XStack items="center" justify="flex-end" style={{ minWidth: 40 }}>
        {right}
      </XStack>
    </XStack>
  );
}
