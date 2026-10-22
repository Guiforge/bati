import type { ReactNode } from "react";
import { Text, XStack } from "tamagui";
import { Button } from "@/components/common/Button";

type SettingRowProps = {
  testID?: string;
  icon: ReactNode;
  label: string;
  value?: string;
  onPress: () => void;
  disabled?: boolean;
};

/** One row of Settings: an icon, a label, and the current value on the right. */
export function SettingRow({ testID, icon, label, value, onPress, disabled }: SettingRowProps) {
  return (
    <Button
      testID={testID}
      bg="surface"
      borderColor="borderStrong"
      borderWidth={1}
      rounded="4"
      p="3"
      height="auto"
      scale="press:0.98"
      opacity="press:0.9"
      disabled={disabled}
      // Always said: Tamagui sends it only while true, and Android keeps a re-enabled view disabled.
      aria-disabled={disabled === true}
      onPress={onPress}
    >
      <XStack flex={1} items="center" gap="3">
        {icon}
        <Text flex={1} fontSize="4" fontWeight="bold" color="text">
          {label}
        </Text>
        {value ? (
          // Capped at just over half the row, and truncated rather than wrapped. `label` holds
          // the `flex={1}`, so it is the half that gives way: an unbounded value — a folder
          // path, a long count — takes the space the label needed and squeezes it off the
          // screen. `flexShrink` is not a prop Tamagui's `Text` accepts; `maxW` is.
          <Text fontSize="3" color="textSecondary" numberOfLines={1} maxW="55%">
            {value}
          </Text>
        ) : null}
      </XStack>
    </Button>
  );
}
