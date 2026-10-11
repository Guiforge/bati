import { localized } from "@/src/i18n/copy";
import type { Localized } from "@/src/i18n/deviceLanguage";

/**
 * One line of weather under the village name, redrawn once a day.
 *
 * The village is a reward surface you visit between sessions, and between sessions nothing about
 * it changes — same art, same tiles, same numbers. A sentence that turns over at midnight is the
 * cheapest thing that makes coming back feel like arriving somewhere rather than reopening a
 * screen. It says nothing about your training on purpose: the tiles already do that, and a second
 * voice repeating them would just be noise dressed as atmosphere.
 *
 * Eighteen each rather than five: the seed is `day:tier`, so with five a hero who opened the app
 * daily saw the same sentence back within a week and the trick showed. Eighteen puts the repeat
 * far enough out that it reads as weather rather than as a rotation.
 *
 * Two rules for adding more. Nothing may name a number, a muscle or a streak — the moment one
 * does, it is a stat in disguise and it will contradict the tiles beside it. And nothing may
 * assume a size: the same line is drawn over a two-cabin clearing and an eternal capital, so
 * "the forges" and "the walls" work while "the harbour" does not.
 *
 * A pool drawn by the day with `pickDailyVariant()`, like the rest note of the Home.
 */
export const VILLAGE_FLAVOUR: Localized<string[]> = localized((l) => l.village.flavour);
