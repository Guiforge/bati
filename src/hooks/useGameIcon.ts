/**
 * Game icon paths from game-icons.net
 * Icons are organized by author in the assets folder.
 *
 * NOTE: This file is intentionally kept as `.ts` so module resolution for
 * `@/src/hooks/useGameIcon` is stable (TypeScript resolves `.ts` before `.tsx`).
 * We avoid JSX here by using `React.createElement`.
 */

import { Image } from "expo-image";
import * as React from "react";

// Pre-require all commonly used icons
const ICONS = {
  // Lorc icons
  castle: require("@/assets/game-icons.net.svg-foreground-white/icons/ffffff/transparent/1x1/lorc/castle.svg"),
  flame: require("@/assets/game-icons.net.svg-foreground-white/icons/ffffff/transparent/1x1/lorc/fire-silhouette.svg"),
  sword: require("@/assets/game-icons.net.svg-foreground-white/icons/ffffff/transparent/1x1/lorc/crossed-swords.svg"),
  scroll: require("@/assets/game-icons.net.svg-foreground-white/icons/ffffff/transparent/1x1/lorc/scroll-unfurled.svg"),
  shield: require("@/assets/game-icons.net.svg-foreground-white/icons/ffffff/transparent/1x1/lorc/bordered-shield.svg"),
  trophy: require("@/assets/game-icons.net.svg-foreground-white/icons/ffffff/transparent/1x1/lorc/trophy.svg"),
  coins: require("@/assets/game-icons.net.svg-foreground-white/icons/ffffff/transparent/1x1/lorc/cash.svg"),
  crown: require("@/assets/game-icons.net.svg-foreground-white/icons/ffffff/transparent/1x1/lorc/crown.svg"),
  muscle: require("@/assets/game-icons.net.svg-foreground-white/icons/ffffff/transparent/1x1/lorc/muscle-up.svg"),
  lightning: require("@/assets/game-icons.net.svg-foreground-white/icons/ffffff/transparent/1x1/lorc/lightning-branches.svg"),
  heart: require("@/assets/game-icons.net.svg-foreground-white/icons/ffffff/transparent/1x1/lorc/heart-inside.svg"),
  star: require("@/assets/game-icons.net.svg-foreground-white/icons/ffffff/transparent/1x1/lorc/star-prominences.svg"),
  skull: require("@/assets/game-icons.net.svg-foreground-white/icons/ffffff/transparent/1x1/lorc/crowned-skull.svg"),

  // Resource icons
  wood: require("@/assets/game-icons.net.svg-foreground-white/icons/ffffff/transparent/1x1/lorc/wood-axe.svg"),
  stone: require("@/assets/game-icons.net.svg-foreground-white/icons/ffffff/transparent/1x1/lorc/stone-block.svg"),
  fire: require("@/assets/game-icons.net.svg-foreground-white/icons/ffffff/transparent/1x1/lorc/campfire.svg"),
  water: require("@/assets/game-icons.net.svg-foreground-white/icons/ffffff/transparent/1x1/lorc/drop.svg"),
  wind: require("@/assets/game-icons.net.svg-foreground-white/icons/ffffff/transparent/1x1/lorc/feather.svg"),
  grain: require("@/assets/game-icons.net.svg-foreground-white/icons/ffffff/transparent/1x1/lorc/wheat.svg"),
  chest: require("@/assets/game-icons.net.svg-foreground-white/icons/ffffff/transparent/1x1/lorc/locked-chest.svg"),
  gold: require("@/assets/game-icons.net.svg-foreground-white/icons/ffffff/transparent/1x1/lorc/crown-coin.svg"),

  // UI/Meta
  clock: require("@/assets/game-icons.net.svg-foreground-white/icons/ffffff/transparent/1x1/lorc/sundial.svg"),
  "book-open": require("@/assets/game-icons.net.svg-foreground-white/icons/ffffff/transparent/1x1/lorc/spell-book.svg"),
  "check-circle": require("@/assets/game-icons.net.svg-foreground-white/icons/ffffff/transparent/1x1/lorc/check-mark.svg"),
  map: require("@/assets/game-icons.net.svg-foreground-white/icons/ffffff/transparent/1x1/lorc/treasure-map.svg"),
  zap: require("@/assets/game-icons.net.svg-foreground-white/icons/ffffff/transparent/1x1/lorc/lightning-branches.svg"),
  target: require("@/assets/game-icons.net.svg-foreground-white/icons/ffffff/transparent/1x1/lorc/archery-target.svg"),
  flag: require("@/assets/game-icons.net.svg-foreground-white/icons/ffffff/transparent/1x1/lorc/flag.svg"),
  repeat: require("@/assets/game-icons.net.svg-foreground-white/icons/ffffff/transparent/1x1/lorc/cycle.svg"),
  timer: require("@/assets/game-icons.net.svg-foreground-white/icons/ffffff/transparent/1x1/lorc/stopwatch.svg"),
  unlock: require("@/assets/game-icons.net.svg-foreground-white/icons/ffffff/transparent/1x1/lorc/unlocked.svg"),
  dumbbell: require("@/assets/game-icons.net.svg-foreground-white/icons/ffffff/transparent/1x1/lorc/weight.svg"),
} as const;

export type GameIconName = keyof typeof ICONS;

export type GameIconProps = {
  name: GameIconName;
  size?: number;
  tintColor?: string;
};

/**
 * Hook that returns a GameIcon component for rendering game icons.
 */
export function useGameIcon() {
  const GameIcon = ({ name, size = 24, tintColor }: GameIconProps) =>
    React.createElement(Image, {
      source: ICONS[name],
      style: { width: size, height: size },
      tintColor,
    });

  return { GameIcon };
}

/**
 * Pre-load multiple icons at once (handy for list rendering).
 */
export function useGameIcons<T extends GameIconName>(iconNames: readonly T[]) {
  const result = {} as Record<T, (typeof ICONS)[T]>;
  for (const name of iconNames) {
    result[name] = ICONS[name];
  }
  return result;
}

/**
 * Get icon source without hook (for static contexts).
 */
export function getGameIconSource<T extends GameIconName>(iconName: T) {
  return ICONS[iconName];
}

export { ICONS as GAME_ICONS };
