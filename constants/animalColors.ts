import type { ColorTokens } from "tamagui";
import type { Animal } from "@/db/crestRules";

/**
 * The fill of each animal on the crest, as the Tamagui token (`rawColors.animal*`). The boar has
 * no entry: its quarters take the colours of the two leading practices, through `ANIMAL_OF`.
 */
export const ANIMAL_TOKEN: {
  // Each value is the one token named after its own animal, so a wrong row does not compile.
  [A in Exclude<Animal, "boar">]: Extract<ColorTokens, `$animal${Capitalize<A>}`>;
} = {
  bear: "$animalBear",
  ermine: "$animalErmine",
  salmon: "$animalSalmon",
  stag: "$animalStag",
  horse: "$animalHorse",
};
