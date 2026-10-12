import { useEffect, useState } from "react";
import { ANIMAL_PORTRAITS } from "@/constants/animalPortraits";
import { portraitOf } from "@/db/crest";
import type { Animal, CrestStage } from "@/db/crestRules";
import type { FlameLevel } from "@/db/streaks";
import { reportError } from "@/src/reportError";

/** The slug the animal wears tonight, null while it is read or when its base has not shipped. */
export function usePortraitSlug(
  animal: Animal,
  stage: CrestStage,
  longestFlame: FlameLevel,
  coatKey?: string,
): string | null {
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
  return slug;
}
