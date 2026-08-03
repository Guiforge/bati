import { XStack, YStack } from "tamagui";

import { MAX_BUILDING_LEVEL } from "@/constants/buildingLevels";

// Derived from the cap the levels are clamped to, so the dots and the ceiling cannot drift:
// adding a sixth level without a sixth dot is what let a tier-8 campfire render as "5/5 and
// still climbing".
const PIP_SLOTS = Array.from({ length: MAX_BUILDING_LEVEL }, (_, i) => i + 1);

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
