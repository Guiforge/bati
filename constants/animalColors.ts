import type { ColorTokens } from "tamagui";
import type { Animal } from "@/db/crestRules";

/**
 * The fill of each animal on the crest, as the Tamagui token (`rawColors.animal*`). The boar has
 * no entry: its quarters take the colours of the two leading practices, through `ANIMAL_OF`.
 */
export const ANIMAL_TOKEN: Record<Exclude<Animal, "boar">, ColorTokens> = {
  bear: "$animalBear",
  ermine: "$animalErmine",
  salmon: "$animalSalmon",
  stag: "$animalStag",
  horse: "$animalHorse",
};
