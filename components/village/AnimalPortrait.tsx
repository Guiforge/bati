import { Image } from "expo-image";
import { type ReactNode, useEffect, useState } from "react";
import { YStack } from "tamagui";
import { ANIMAL_PORTRAITS } from "@/constants/animalPortraits";
import { portraitOf } from "@/db/crest";
import type { Animal, CrestStage } from "@/db/crestRules";
import type { FlameLevel } from "@/db/streaks";
import { reportError } from "@/src/reportError";

type Props = {
  animal: Animal;
  stage: CrestStage;
  /** The hero's longest flame: the rare coat is won at Eternal. */
  longestFlame: FlameLevel;
  /** Fixed, in dp: the box is there before the image, so nothing around it moves. */
  size: number;
  /** Changes when the hero switches coat, so the portrait is read again. */
  coatKey?: string;
  /** Drawn when the animal's base portrait has not shipped yet, never an empty frame. */
  fallback?: ReactNode;
};

/**
 * The animal's portrait tonight (`portraitOf`: rare coat, winter, the hero's choice). The coat is
 * read from the database, so the square is reserved first and the image mounts once it is known.
 */
export function AnimalPortrait({
  animal,
  stage,
  longestFlame,
  size,
  coatKey,
  fallback = null,
}: Props) {
  const base = `${animal}-${stage}`;
  const shipped = base in ANIMAL_PORTRAITS;
  const [slug, setSlug] = useState<string | null>(null);
  // biome-ignore lint/correctness/useExhaustiveDependencies: coatKey is the re-read trigger
  useEffect(() => {
    if (!shipped) return;
    let live = true;
    portraitOf({ longestFlame }, animal, stage)
      .then((s) => live && setSlug(s))
      .catch((error) => {
        reportError("crest.portrait", error);
        if (live) setSlug(base);
      });
    return () => {
      live = false;
    };
  }, [animal, stage, longestFlame, shipped, base, coatKey]);

  if (!shipped) return fallback;
  const source = slug === null ? undefined : ANIMAL_PORTRAITS[slug];
  return (
    <YStack testID="animal-portrait" width={size} height={size}>
      {source ? (
        <Image
          source={source}
          contentFit="contain"
          style={{ width: size, height: size }}
          accessible={false}
        />
      ) : null}
    </YStack>
  );
}
