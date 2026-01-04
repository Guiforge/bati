import { useTheme } from "tamagui";

/**
 * Game icon paths from game-icons.net
 * Icons are organized by author in the assets folder
 */

// Pre-require all commonly used icons for both themes
const ICONS = {
  // Lorc icons
  castle: {
    light: require("@/assets/game-icons.net.svg-foreground-black/icons/000000/transparent/1x1/lorc/castle.svg"),
    dark: require("@/assets/game-icons.net.svg-foreground-white/icons/ffffff/transparent/1x1/lorc/castle.svg"),
  },
  flame: {
    light: require("@/assets/game-icons.net.svg-foreground-black/icons/000000/transparent/1x1/lorc/fire-silhouette.svg"),
    dark: require("@/assets/game-icons.net.svg-foreground-white/icons/ffffff/transparent/1x1/lorc/fire-silhouette.svg"),
  },
  sword: {
    light: require("@/assets/game-icons.net.svg-foreground-black/icons/000000/transparent/1x1/lorc/crossed-swords.svg"),
    dark: require("@/assets/game-icons.net.svg-foreground-white/icons/ffffff/transparent/1x1/lorc/crossed-swords.svg"),
  },
  scroll: {
    light: require("@/assets/game-icons.net.svg-foreground-black/icons/000000/transparent/1x1/lorc/scroll-unfurled.svg"),
    dark: require("@/assets/game-icons.net.svg-foreground-white/icons/ffffff/transparent/1x1/lorc/scroll-unfurled.svg"),
  },
  shield: {
    light: require("@/assets/game-icons.net.svg-foreground-black/icons/000000/transparent/1x1/lorc/bordered-shield.svg"),
    dark: require("@/assets/game-icons.net.svg-foreground-white/icons/ffffff/transparent/1x1/lorc/bordered-shield.svg"),
  },
  trophy: {
    light: require("@/assets/game-icons.net.svg-foreground-black/icons/000000/transparent/1x1/lorc/trophy.svg"),
    dark: require("@/assets/game-icons.net.svg-foreground-white/icons/ffffff/transparent/1x1/lorc/trophy.svg"),
  },
  coins: {
    light: require("@/assets/game-icons.net.svg-foreground-black/icons/000000/transparent/1x1/lorc/cash.svg"),
    dark: require("@/assets/game-icons.net.svg-foreground-white/icons/ffffff/transparent/1x1/lorc/cash.svg"),
  },
  crown: {
    light: require("@/assets/game-icons.net.svg-foreground-black/icons/000000/transparent/1x1/lorc/crown.svg"),
    dark: require("@/assets/game-icons.net.svg-foreground-white/icons/ffffff/transparent/1x1/lorc/crown.svg"),
  },
  muscle: {
    light: require("@/assets/game-icons.net.svg-foreground-black/icons/000000/transparent/1x1/lorc/muscle-up.svg"),
    dark: require("@/assets/game-icons.net.svg-foreground-white/icons/ffffff/transparent/1x1/lorc/muscle-up.svg"),
  },
  lightning: {
    light: require("@/assets/game-icons.net.svg-foreground-black/icons/000000/transparent/1x1/lorc/lightning-branches.svg"),
    dark: require("@/assets/game-icons.net.svg-foreground-white/icons/ffffff/transparent/1x1/lorc/lightning-branches.svg"),
  },
  heart: {
    light: require("@/assets/game-icons.net.svg-foreground-black/icons/000000/transparent/1x1/lorc/heart-inside.svg"),
    dark: require("@/assets/game-icons.net.svg-foreground-white/icons/ffffff/transparent/1x1/lorc/heart-inside.svg"),
  },
  star: {
    light: require("@/assets/game-icons.net.svg-foreground-black/icons/000000/transparent/1x1/lorc/star-prominences.svg"),
    dark: require("@/assets/game-icons.net.svg-foreground-white/icons/ffffff/transparent/1x1/lorc/star-prominences.svg"),
  },
  // Resource icons
  wood: {
    light: require("@/assets/game-icons.net.svg-foreground-black/icons/000000/transparent/1x1/lorc/wood-axe.svg"),
    dark: require("@/assets/game-icons.net.svg-foreground-white/icons/ffffff/transparent/1x1/lorc/wood-axe.svg"),
  },
  stone: {
    light: require("@/assets/game-icons.net.svg-foreground-black/icons/000000/transparent/1x1/lorc/stone-block.svg"),
    dark: require("@/assets/game-icons.net.svg-foreground-white/icons/ffffff/transparent/1x1/lorc/stone-block.svg"),
  },
  fire: {
    light: require("@/assets/game-icons.net.svg-foreground-black/icons/000000/transparent/1x1/lorc/campfire.svg"),
    dark: require("@/assets/game-icons.net.svg-foreground-white/icons/ffffff/transparent/1x1/lorc/campfire.svg"),
  },
  water: {
    light: require("@/assets/game-icons.net.svg-foreground-black/icons/000000/transparent/1x1/lorc/drop.svg"),
    dark: require("@/assets/game-icons.net.svg-foreground-white/icons/ffffff/transparent/1x1/lorc/drop.svg"),
  },
  wind: {
    light: require("@/assets/game-icons.net.svg-foreground-black/icons/000000/transparent/1x1/lorc/feather.svg"),
    dark: require("@/assets/game-icons.net.svg-foreground-white/icons/ffffff/transparent/1x1/lorc/feather.svg"),
  },
  grain: {
    light: require("@/assets/game-icons.net.svg-foreground-black/icons/000000/transparent/1x1/lorc/wheat.svg"),
    dark: require("@/assets/game-icons.net.svg-foreground-white/icons/ffffff/transparent/1x1/lorc/wheat.svg"),
  },
  chest: {
    light: require("@/assets/game-icons.net.svg-foreground-black/icons/000000/transparent/1x1/lorc/locked-chest.svg"),
    dark: require("@/assets/game-icons.net.svg-foreground-white/icons/ffffff/transparent/1x1/lorc/locked-chest.svg"),
  },
  gold: {
    light: require("@/assets/game-icons.net.svg-foreground-black/icons/000000/transparent/1x1/lorc/crown-coin.svg"),
    dark: require("@/assets/game-icons.net.svg-foreground-white/icons/ffffff/transparent/1x1/lorc/crown-coin.svg"),
  },
} as const;

export type GameIconName = keyof typeof ICONS;

/**
 * Hook to get a game icon source based on current theme
 * @param iconName - The name of the icon to load
 * @returns The image source for the icon
 */
export function useGameIcon(iconName: GameIconName) {
  const theme = useTheme();
  const themeName = typeof theme.name === "string" ? theme.name : String(theme.name?.val ?? "");
  const isDark = themeName.includes("dark");

  return ICONS[iconName][isDark ? "dark" : "light"];
}

/**
 * Get multiple game icons at once
 * @param iconNames - Array of icon names to load
 * @returns Object with icon sources keyed by name
 */
export function useGameIcons<T extends GameIconName>(iconNames: T[]) {
  const theme = useTheme();
  const themeName = typeof theme.name === "string" ? theme.name : String(theme.name?.val ?? "");
  const isDark = themeName.includes("dark");

  const result = {} as Record<T, (typeof ICONS)[T][typeof isDark extends true ? "dark" : "light"]>;

  for (const name of iconNames) {
    result[name] = ICONS[name][isDark ? "dark" : "light"];
  }

  return result;
}

/**
 * Get icon source without hook (for static contexts)
 * @param iconName - The name of the icon
 * @param isDark - Whether dark theme is active
 */
export function getGameIconSource(iconName: GameIconName, isDark: boolean) {
  return ICONS[iconName][isDark ? "dark" : "light"];
}

export { ICONS as GAME_ICONS };
