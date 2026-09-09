import { Text, YStack } from "tamagui";

/**
 * One measured number under its label, a third of a row wide.
 *
 * DESIGN.md's "label" recipe on top: short, uppercase, wide tracking, never body text. The number
 * under it is 22, where an XP reward beside it is 26: a figure reports what happened, it does not
 * out-shout the reward.
 *
 * Shared because the recap screen and the victory screen print the same three figures for the same
 * walk, two taps apart. They already once wore two different labels for one value; two copies of
 * the recipe is how they end up in two different type sizes next.
 */
export function Figure({ label, value, testID }: { label: string; value: string; testID: string }) {
  return (
    <YStack flex={1} gap="$1" items="center">
      <Text fontSize={11} letterSpacing={2} color="$textSecondary" textTransform="uppercase">
        {label}
      </Text>
      <Text testID={testID} fontSize={22} fontWeight="700" color="$text">
        {value}
      </Text>
    </YStack>
  );
}
