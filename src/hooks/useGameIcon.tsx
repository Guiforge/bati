/**
 * Game icons from game-icons.net
 *
 * Usage (like lucide-react):
 *   import { GameIcon } from "@/src/hooks/useGameIcon";
 *   <GameIcon name="sword" size={24} tintColor="$primary" />
 *
 * Or use the hook for dynamic icon rendering:
 *   const { GameIcon } = useGameIcon();
 *   <GameIcon name="chest" size={32} />
 */

import { Image } from "expo-image";
import { memo, useMemo } from "react";
import { type ImageSourcePropType, Image as RNImage } from "react-native";

// Icon source registry
const ICON_SOURCES: Record<string, ImageSourcePropType> = {
  // Lorc icons - Core
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

  // UI/Meta icons
  clock: require("@/assets/game-icons.net.svg-foreground-white/icons/ffffff/transparent/1x1/lorc/sundial.svg"),
  "book-open": require("@/assets/game-icons.net.svg-foreground-white/icons/ffffff/transparent/1x1/lorc/open-book.svg"),
  "check-circle": require("@/assets/game-icons.net.svg-foreground-white/icons/ffffff/transparent/1x1/lorc/checked-shield.svg"),
  map: require("@/assets/game-icons.net.svg-foreground-white/icons/ffffff/transparent/1x1/lorc/treasure-map.svg"),
  zap: require("@/assets/game-icons.net.svg-foreground-white/icons/ffffff/transparent/1x1/lorc/lightning-branches.svg"),
  target: require("@/assets/game-icons.net.svg-foreground-white/icons/ffffff/transparent/1x1/lorc/archery-target.svg"),
  flag: require("@/assets/game-icons.net.svg-foreground-white/icons/ffffff/transparent/1x1/lorc/flying-flag.svg"),
  repeat: require("@/assets/game-icons.net.svg-foreground-white/icons/ffffff/transparent/1x1/lorc/cycle.svg"),
  timer: require("@/assets/game-icons.net.svg-foreground-white/icons/ffffff/transparent/1x1/lorc/stopwatch.svg"),
  unlock: require("@/assets/game-icons.net.svg-foreground-white/icons/ffffff/transparent/1x1/lorc/unlocking.svg"),
  dumbbell: require("@/assets/game-icons.net.svg-foreground-white/icons/ffffff/transparent/1x1/lorc/anvil.svg"),
};

// Type-safe icon names
export type GameIconName = keyof typeof ICON_SOURCES;

export interface GameIconProps {
  name: GameIconName;
  size?: number;
  tintColor?: string;
}

/**
 * GameIcon component - use like any icon library
 * Uses Image.resolveAssetSource to create a fresh source object,
 * avoiding the "property is not configurable" error from frozen require() results.
 */
export const GameIcon = memo(function GameIcon({ name, size = 24, tintColor }: GameIconProps) {
  const source = ICON_SOURCES[name];

  // Resolve the asset to get a fresh URI object that expo-image can modify
  const resolvedSource = useMemo(() => {
    if (!source) return null;
    const resolved = RNImage.resolveAssetSource(source);
    return { uri: resolved.uri };
  }, [source]);

  if (!resolvedSource) {
    return null;
  }

  return (
    <Image
      source={resolvedSource}
      style={{ width: size, height: size }}
      tintColor={tintColor}
      contentFit="contain"
    />
  );
});

/**
 * Hook for backwards compatibility - returns the same GameIcon component
 */
export function useGameIcon() {
  return { GameIcon };
}

/**
 * Hook to get multiple icon sources at once (for list rendering with Image component)
 */
export function useGameIcons<T extends GameIconName>(
  names: readonly T[]
): Record<T, ImageSourcePropType> {
  const result = {} as Record<T, ImageSourcePropType>;
  for (const name of names) {
    result[name] = ICON_SOURCES[name];
  }
  return result;
}

/**
 * Get icon source for direct Image usage
 */
export function getGameIconSource(name: GameIconName): ImageSourcePropType {
  return ICON_SOURCES[name];
}

/**
 * Get multiple icon sources at once (non-hook version)
 */
export function getGameIconSources<T extends GameIconName>(
  names: readonly T[]
): Record<T, ImageSourcePropType> {
  const result = {} as Record<T, ImageSourcePropType>;
  for (const name of names) {
    result[name] = ICON_SOURCES[name];
  }
  return result;
}

// Legacy export for backwards compatibility
export const GAME_ICONS = ICON_SOURCES;
