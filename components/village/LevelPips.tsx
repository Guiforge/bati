import { XStack, YStack } from "tamagui";

const PIP_SLOTS = [1, 2, 3, 4, 5] as const;

/** Level 1..5 as filled pips — a number would compete with the scene, five dots don't. */
export function LevelPips({ level }: { level: number }) {
  return (
    <XStack gap={3} items="center">
      {PIP_SLOTS.map((slot) => (
        <YStack
          key={slot}
          width={5}
          height={5}
          rounded={3}
          bg={slot <= level ? "$primary" : "$borderStrong"}
        />
      ))}
    </XStack>
  );
}
