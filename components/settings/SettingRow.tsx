import type { ReactNode } from "react";
import { Text, XStack, YStack } from "tamagui";
import { Button } from "@/components/common/Button";
import { ChevronRight } from "@/components/icons";

type SettingRowProps = {
  testID?: string;
  icon: ReactNode;
  label: string;
  value?: string;
  onPress: () => void;
  disabled?: boolean;
  /** Set for a row that is an on/off switch: TalkBack then reads it as one, with its state, and the
   * row draws a switch instead of the words "On" / "Off". */
  checked?: boolean;
  /** Set for a row that opens a screen or a sheet: it draws a chevron. A row that changes a value in
   * place draws none, so a hero can tell the two apart before tapping (audit 2026-11-20, F5). */
  opens?: boolean;
};

/** One row of Settings: an icon, a label, and on the right what a tap does: the value it changes,
 * a switch, or a chevron to what it opens. */
export function SettingRow({
  testID,
  icon,
  label,
  value,
  onPress,
  disabled,
  checked,
  opens,
}: SettingRowProps) {
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
      // Spread, not `role={undefined}`: that would erase the button role every other row needs.
      {...(checked === undefined ? {} : { role: "switch" as const, "aria-checked": checked })}
      onPress={onPress}
    >
      <XStack flex={1} items="center" gap="3">
        {icon}
        <Text flex={1} fontSize="4" fontWeight="bold" color="text">
          {label}
        </Text>
        {checked === undefined && value ? (
          // Capped at just over half the row, and truncated rather than wrapped. `label` holds
          // the `flex={1}`, so it is the half that gives way: an unbounded value — a folder
          // path, a long count — takes the space the label needed and squeezes it off the
          // screen. `flexShrink` is not a prop Tamagui's `Text` accepts; `maxW` is.
          <Text fontSize="3" color="textSecondary" numberOfLines={1} maxW="55%">
            {value}
          </Text>
        ) : null}
        {checked === undefined ? null : <SwitchMark on={checked} />}
        {opens ? <ChevronRight size={18} color="textSecondary" /> : null}
      </XStack>
    </Button>
  );
}

/** The look of a switch, not a control: the whole row is the target, and it says `role="switch"`. */
function SwitchMark({ on }: { on: boolean }) {
  return (
    <XStack
      width={40}
      height={24}
      rounded={12}
      p={3}
      bg={on ? "primary" : "surface2"}
      borderWidth={1}
      borderColor={on ? "primary" : "borderStrong"}
      justify={on ? "flex-end" : "flex-start"}
    >
      <YStack width={16} height={16} rounded={8} bg={on ? "onPrimary" : "textSecondary"} />
    </XStack>
  );
}
