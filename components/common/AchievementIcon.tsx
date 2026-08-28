import type { ColorTokens } from "tamagui";
import { GameIcon } from "@/components/common/GameIcon";
import {
  Award,
  Drama,
  Dumbbell,
  Footprints,
  Gem,
  Leaf,
  Medal,
  Moon,
  Mountain,
  Sparkles,
  Sprout,
  Sunrise,
  Target,
  Timer,
  TreePine,
} from "@/components/icons";
import { isGameIconName } from "@/hooks/useGameIcon";

// Achievement/trophy icon codes (db/achievements.ts) that have no game-icons.net match. Named
// literally so `db/achievements.ts` reads as intent, not an opaque enum. Typed off `typeof Target`
// — every @tamagui/lucide-icons component shares that signature — rather than importing
// @tamagui/helpers-icon directly, which isn't a listed dependency.
const LUCIDE_ACHIEVEMENT_ICONS: Record<string, typeof Target> = {
  Target,
  Footprints,
  Sprout,
  Leaf,
  TreePine,
  Sparkles,
  Gem,
  Medal,
  Award,
  Timer,
  Dumbbell,
  Sunrise,
  Moon,
  Mountain,
  Drama,
};

/**
 * Resolves an achievement's `icon` code (a `GameIconName` or one of the lucide names above) to
 * the actual glyph. One resolver for every place a trophy renders — the achievements shelf and
 * both village trophy views — so the icon table in `db/achievements.ts` is read the same way
 * everywhere instead of three components each guessing at the string.
 */
export function AchievementIcon({
  icon,
  size = 24,
  color = "$text",
}: {
  icon: string;
  size?: number;
  color?: ColorTokens;
}) {
  if (isGameIconName(icon)) {
    return <GameIcon name={icon} size={size} color={color} />;
  }
  const Icon = LUCIDE_ACHIEVEMENT_ICONS[icon] ?? Award;
  return <Icon size={size} color={color} />;
}
