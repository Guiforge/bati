import type { ImageSource } from "expo-image";

/**
 * Every animal portrait that ships, by slug (`<animal>-<stage>[-rare|-winter]`). The one list
 * written by hand: the coats the crest announces (`DELIVERED_COATS`) and the portraits a screen
 * draws both derive from it, and `__tests__/animal-portraits.test.ts` fails when a row has no file
 * or a file has no row. Metro needs a literal `require` per file, hence a table and not a glob.
 * Delivering a portrait is its file plus its row, in the same commit.
 */
export const ANIMAL_PORTRAITS: Readonly<Record<string, ImageSource>> = {
  "bear-young": require("@/assets/images/animals/bear-young.webp"),
  "bear-adult": require("@/assets/images/animals/bear-adult.webp"),
  "bear-venerable": require("@/assets/images/animals/bear-venerable.webp"),
  "bear-legendary": require("@/assets/images/animals/bear-legendary.webp"),
};
