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
  "stag-young": require("@/assets/images/animals/stag-young.webp"),
  "stag-adult": require("@/assets/images/animals/stag-adult.webp"),
  "stag-venerable": require("@/assets/images/animals/stag-venerable.webp"),
  "stag-legendary": require("@/assets/images/animals/stag-legendary.webp"),
  "horse-young": require("@/assets/images/animals/horse-young.webp"),
  "horse-adult": require("@/assets/images/animals/horse-adult.webp"),
  "horse-venerable": require("@/assets/images/animals/horse-venerable.webp"),
  "horse-legendary": require("@/assets/images/animals/horse-legendary.webp"),
  "salmon-young": require("@/assets/images/animals/salmon-young.webp"),
  "salmon-adult": require("@/assets/images/animals/salmon-adult.webp"),
  "salmon-venerable": require("@/assets/images/animals/salmon-venerable.webp"),
  "salmon-legendary": require("@/assets/images/animals/salmon-legendary.webp"),
  "boar-young": require("@/assets/images/animals/boar-young.webp"),
  "boar-adult": require("@/assets/images/animals/boar-adult.webp"),
  "boar-venerable": require("@/assets/images/animals/boar-venerable.webp"),
  "boar-legendary": require("@/assets/images/animals/boar-legendary.webp"),
  "ermine-young": require("@/assets/images/animals/ermine-young.webp"),
  "ermine-venerable": require("@/assets/images/animals/ermine-venerable.webp"),
};
