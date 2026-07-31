/**
 * Game icon paths from game-icons.net
 * Icons are organized by author in the assets folder
 */

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
  // Resource icons
  wood: require("@/assets/game-icons.net.svg-foreground-white/icons/ffffff/transparent/1x1/lorc/wood-axe.svg"),
  stone: require("@/assets/game-icons.net.svg-foreground-white/icons/ffffff/transparent/1x1/lorc/stone-block.svg"),
  fire: require("@/assets/game-icons.net.svg-foreground-white/icons/ffffff/transparent/1x1/lorc/campfire.svg"),
  water: require("@/assets/game-icons.net.svg-foreground-white/icons/ffffff/transparent/1x1/lorc/drop.svg"),
  wind: require("@/assets/game-icons.net.svg-foreground-white/icons/ffffff/transparent/1x1/lorc/feather.svg"),
  grain: require("@/assets/game-icons.net.svg-foreground-white/icons/ffffff/transparent/1x1/lorc/wheat.svg"),
  chest: require("@/assets/game-icons.net.svg-foreground-white/icons/ffffff/transparent/1x1/lorc/locked-chest.svg"),
  gold: require("@/assets/game-icons.net.svg-foreground-white/icons/ffffff/transparent/1x1/lorc/crown-coin.svg"),
} as const;

export type GameIconName = keyof typeof ICONS;

/**
 * Hook to get a game icon source
 * @param iconName - The name of the icon to load
 * @returns The image source for the icon
 */
export function useGameIcon(iconName: GameIconName) {
  return ICONS[iconName];
}

/**
 * Get multiple game icons at once
 * @param iconNames - Array of icon names to load
 * @returns Object with icon sources keyed by name
 */
export function useGameIcons<T extends GameIconName>(iconNames: T[]) {
  const result = {} as Record<T, (typeof ICONS)[T]>;

  for (const name of iconNames) {
    result[name] = ICONS[name];
  }

  return result;
}
