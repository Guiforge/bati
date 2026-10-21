import { type ReactNode, useState } from "react";
import { Pressable } from "react-native";
import { Text, XStack, YStack } from "tamagui";
import { ChevronDown, ChevronUp } from "@/components/icons";

/**
 * A heading that opens what is under it, for the optional part of a long form. Closed until the
 * hero asks: a boss needs a name and a picture, and the rest is a flourish. What is typed lives in
 * the form's draft, so folding loses nothing.
 */
export function Fold({
  title,
  testID,
  children,
}: {
  title: string;
  /** The toggle's test id. */
  testID: string;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const Chevron = open ? ChevronUp : ChevronDown;
  return (
    <YStack gap="$3">
      <Pressable
        testID={testID}
        accessibilityRole="button"
        accessibilityState={{ expanded: open }}
        style={{ minHeight: 44, justifyContent: "center" }}
        onPress={() => setOpen((v) => !v)}
      >
        <XStack gap="$2" items="center">
          <Text flex={1} fontWeight="700" fontSize={18} color="$text">
            {title}
          </Text>
          <Chevron size={18} color="$textSecondary" />
        </XStack>
      </Pressable>
      {open ? <YStack gap="$3">{children}</YStack> : null}
    </YStack>
  );
}
