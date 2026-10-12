import { Image } from "expo-image";
import type { ReactNode } from "react";
import { YStack } from "tamagui";
import { ANIMAL_PORTRAITS } from "@/constants/animalPortraits";
import type { Animal, CrestStage } from "@/db/crestRules";
import type { FlameLevel } from "@/db/streaks";
import { usePortraitSlug } from "./usePortraitSlug";

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
  const slug = usePortraitSlug(animal, stage, longestFlame, coatKey);
  return (
    <PortraitImage animal={animal} stage={stage} slug={slug} size={size} fallback={fallback} />
  );
}

/** The square for a slug already read: a screen that needs the slug too reads it once and draws here. */
export function PortraitImage({
  animal,
  stage,
  slug,
  size,
  fallback = null,
}: Pick<Props, "animal" | "stage" | "size" | "fallback"> & { slug: string | null }) {
  if (!(`${animal}-${stage}` in ANIMAL_PORTRAITS)) return fallback;
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
