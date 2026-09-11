import { XStack, YStack } from "tamagui";

import { MAX_BUILDING_LEVEL } from "@/constants/buildingLevels";

/**
 * Level as filled pips, on the ceiling the building can really reach — a number would compete
 * with the scene, a row of dots doesn't. `max` is the building's own ceiling (`buildingCeiling()`):
 * the six upgrades stop at 3, and drawing five dots under them promised two rungs that never come.
 *
 * Gold, because gold is what progression wears everywhere else in the app.
 */
export function LevelPips({ level, max = MAX_BUILDING_LEVEL }: { level: number; max?: number }) {
  return (
    <XStack gap={3} items="center">
      {Array.from({ length: max }, (_, i) => i + 1).map((slot) => (
        <YStack
          key={slot}
          width={5}
          height={5}
          rounded={3}
          bg={slot <= level ? "$resourceGold" : "$borderStrong"}
        />
      ))}
    </XStack>
  );
}
