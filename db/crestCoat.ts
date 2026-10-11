import { ANIMAL_PORTRAITS } from "@/constants/animalPortraits";
import type { Animal, CrestStage } from "./crestRules";

/** The coat the hero picked for their animals: `auto` shows the rare one once won, `usual` never. */
export type CrestCoat = "auto" | "usual";

/** The flame level (Eternal) whose longest run earns the rare coat. */
const RARE_COAT_FLAME = 5;

/** A fact about the hero, not about an animal: it follows the journal, so deleting sessions takes it back. */
export const hasRareCoat = (longestFlame: number): boolean => longestFlame >= RARE_COAT_FLAME;

/**
 * Every rare and winter portrait that ships, by slug (`bear-adult-rare`, `stag-venerable-winter`),
 * read off the portrait table. The portrait choice and the rare coat's announcement both read it,
 * so neither names a coat nobody can see. Bases are not listed, they are the fallback.
 */
export const DELIVERED_COATS: ReadonlySet<string> = new Set(
  Object.keys(ANIMAL_PORTRAITS).filter((slug) => /-(rare|winter)$/.test(slug)),
);

/**
 * Whether the hero can be offered the rare coat of this animal at this stage: they won it, the
 * animal is past its young stage and the rare portrait ships. The card that announces the coat and
 * the sheet's choice both ask this, so neither names a coat nobody can see.
 */
export const rareCoatShips = (
  animal: Animal,
  stage: CrestStage,
  longestFlame: number,
  delivered: ReadonlySet<string> = DELIVERED_COATS,
): boolean =>
  stage !== "young" && hasRareCoat(longestFlame) && delivered.has(`${animal}-${stage}-rare`);

/**
 * Where winter falls in June, July and August instead of December to February: the countries whose
 * majority lives south of the equator (Indonesia and Tanzania are split or near it, so they stay
 * on the northern calendar, like any region not listed).
 */
const SOUTHERN = new Set([
  ...["AO", "AR", "AU", "BO", "BR", "BW", "CL", "FJ", "FK", "LS", "MG", "MW", "MZ", "NA"],
  ...["NZ", "PE", "PY", "SZ", "UY", "ZA", "ZM", "ZW"],
]);

/** Whether `now` is winter where the device is. No region means the northern calendar. */
export function isWinter(now: Date, regionCode: string | null | undefined): boolean {
  const month = now.getMonth(); // 0 = January, local time like every calendar day here
  return regionCode && SOUTHERN.has(regionCode)
    ? month >= 5 && month <= 7
    : month >= 11 || month <= 1;
}

/**
 * The portrait slug an animal wears: `<animal>-<stage>[-rare|-winter]`. Pure: no clock, no device.
 * A young animal always wears its base. The rare coat, won and not switched off by `usual`, beats
 * winter; `usual` cuts the rare, not winter; the ermine has no winter (its base is already white).
 * A coat that is not in `delivered` falls back on the base of the same stage, never on another coat.
 */
export function portraitSlug(
  animal: Animal,
  stage: CrestStage,
  rareCoat: boolean,
  crestCoat: CrestCoat,
  now: Date,
  regionCode: string | null | undefined,
  delivered: ReadonlySet<string> = DELIVERED_COATS,
): string {
  const base = `${animal}-${stage}`;
  if (stage === "young") return base;
  const coat =
    rareCoat && crestCoat === "auto"
      ? "rare"
      : animal !== "ermine" && isWinter(now, regionCode)
        ? "winter"
        : null;
  const slug = coat && `${base}-${coat}`;
  return slug && delivered.has(slug) ? slug : base;
}
