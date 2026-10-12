import { Text, XStack, YStack } from "tamagui";

import { BUILDING_STAGE_LEVEL, MAX_BUILDING_LEVEL } from "@/constants/buildingLevels";

/**
 * Level as filled pips, on the ceiling the building can really reach — a number would compete
 * with the scene, a row of dots doesn't. `max` is the building's own ceiling (`buildingCeiling()`):
 * the six upgrades stop at 3, and drawing five dots under them promised two rungs that never come.
 *
 * At most five dots: a building that goes on to rank 10 keeps its five full dots from rank 5 and
 * writes the rank in gold after them from rank 6 on ("5 pips, then the number"). A ceiling of 3
 * or 5 draws exactly that many dots and never a number.
 *
 * Gold, because gold is what progression wears everywhere else in the app.
 */
export function LevelPips({ level, max = MAX_BUILDING_LEVEL }: { level: number; max?: number }) {
  return (
    <XStack gap={3} items="center">
      {Array.from({ length: Math.min(max, BUILDING_STAGE_LEVEL) }, (_, i) => i + 1).map((slot) => (
        <YStack
          key={slot}
          testID={slot <= level ? "level-pip-full" : "level-pip-empty"}
          width={5}
          height={5}
          rounded={3}
          bg={slot <= level ? "$resourceGold" : "$borderStrong"}
        />
      ))}
      {level > BUILDING_STAGE_LEVEL ? (
        <Text fontSize={11} fontWeight="700" color="$resourceGold">
          {level}
        </Text>
      ) : null}
    </XStack>
  );
}
