import { Text, XStack } from "tamagui";

/**
 * The poster's last line: how long and how many steps on the left, the reward on the right.
 *
 * It wraps rather than truncates. Length and steps are what a hero picks a route by, and at a
 * large font the old single row kept the XP at full width while "2 weeks" lost its ending.
 */
export function AdventureFooter({ meta, xp }: { meta: string; xp: string }) {
  return (
    <XStack
      testID="adventure-card-footer"
      items="center"
      justify="space-between"
      flexWrap="wrap"
      columnGap="$2"
      rowGap="$1"
    >
      <Text
        testID="adventure-card-meta"
        shrink={1}
        fontSize={12}
        fontWeight="700"
        color="$textSecondary"
      >
        {meta}
      </Text>
      {/* The reward reads in gold, the same resource colour as the quest gallery. */}
      <Text fontSize={14} fontWeight="700" color="$resourceGold">
        {xp}
      </Text>
    </XStack>
  );
}
