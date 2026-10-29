import { bossLocalizedName } from "@/constants/bosses";
import type { Monster } from "@/db/heroAdventures";
import type { AppLanguage } from "@/src/i18n/deviceLanguage";

const NO_NAME = { en: "", fr: "", de: "", es: "", ru: "", zh: "" };

/** The monster's name in the hero's language, from its painting, as the arena says it. */
export function monsterName(monster: Monster, language: AppLanguage): string {
  return bossLocalizedName(monster.bossImagePath, 0, NO_NAME)[language];
}
