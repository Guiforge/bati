/**
 * Game icons from game-icons.net
 *
 * Goals:
 * - Fast runtime (only a small allowlisted registry is bundled)
 * - Strong autocomplete (names are a string-literal union)
 * - Easy discovery (optional list of ALL available icons is generated too)
 *
 * Usage:
 *   import { GameIcon } from "@/src/hooks/useGameIcon";
 *   <GameIcon name="lorc/locked-chest" size={32} tintColor="$primary" />
 */

import { Image } from "expo-image";
import { memo, useMemo } from "react";
import { Image as RNImage } from "react-native";
import { useTheme } from "tamagui";

import { type GameIconName, getGameIconSource } from "@/src/icons/gameIcons.registry";

export type { AllGameIconName } from "@/src/icons/gameIcons.all";
export { ALL_GAME_ICON_NAMES } from "@/src/icons/gameIcons.all";
export type { GameIconName } from "@/src/icons/gameIcons.registry";
export { GAME_ICON_NAMES, isGameIconName } from "@/src/icons/gameIcons.registry";

export interface GameIconProps {
  name: GameIconName;
  size?: number;
  tintColor?: string;
}

/**
 * GameIcon component.
 *
 * We treat SVGs as assets (Metro default) and render them via `expo-image`.
 * That keeps runtime fast and allows `tintColor` to work consistently.
 */
export const GameIcon = memo(function GameIcon({ name, size = 24, tintColor }: GameIconProps) {
  const theme = useTheme();
  const source = getGameIconSource(name);

  const resolvedTintColor = useMemo(() => {
    if (!tintColor) return undefined;
    if (!tintColor.startsWith("$")) return tintColor;

    const record = theme as unknown as Record<string, { val?: string }>;
    return record[tintColor]?.val ?? tintColor;
  }, [theme, tintColor]);

  const resolvedSource = useMemo(() => {
    const resolved = RNImage.resolveAssetSource(source);
    return { uri: resolved.uri };
  }, [source]);

  return (
    <Image
      source={resolvedSource}
      style={{ width: size, height: size }}
      tintColor={resolvedTintColor}
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
 * Convenience exports for existing code.
 * Prefer importing from `@/src/icons/gameIcons.registry` if you only need sources/types.
 */
export { GAME_ICON_SOURCES as GAME_ICONS, getGameIconSource } from "@/src/icons/gameIcons.registry";
