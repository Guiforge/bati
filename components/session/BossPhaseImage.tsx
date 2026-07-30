import { Image } from "expo-image";
import { useEffect, useState } from "react";
import { YStack } from "tamagui";
import { getAdventureAsset } from "@/constants/assetMap";

/**
 * Boss phase thresholds (HP percentage). Each phase is a color-tint treatment layered on the
 * boss's own cover image (getAdventureAsset already falls back to the placeholder — no null
 * handling needed here) — not 4 separate paintings per boss. See missing-image.md §1c.
 */
const PHASE_THRESHOLDS = [
  { minPercent: 75, phase: 1, label: "Full Power", tint: null },
  { minPercent: 50, phase: 2, label: "Wounded", tint: "rgba(219, 39, 119, 0.15)" },
  { minPercent: 25, phase: 3, label: "Critical", tint: "rgba(255, 23, 68, 0.3)" },
  { minPercent: 0, phase: 4, label: "Enraged", tint: "rgba(255, 23, 68, 0.5)" },
] as const;

type BossPhase = 1 | 2 | 3 | 4;

function getPhaseFromHp(hpPercent: number): BossPhase {
  for (const threshold of PHASE_THRESHOLDS) {
    if (hpPercent >= threshold.minPercent) {
      return threshold.phase;
    }
  }
  return 4;
}

function getPhaseConfig(phase: BossPhase) {
  return PHASE_THRESHOLDS.find((t) => t.phase === phase) ?? PHASE_THRESHOLDS[0];
}

type BossPhaseImageProps = {
  currentHp: number;
  totalHp: number;
  size?: number;
  /** Adventure cover reused as boss art (BossFight.imagePath — always a real or placeholder path). */
  bossImagePath: string;
};

/**
 * Displays a boss image that changes based on HP phase: the boss's own cover art with an
 * increasingly aggressive color tint as HP drops.
 *
 * Phases:
 * - Phase 1 (75-100%): Full power - no tint
 * - Phase 2 (50-75%): Wounded - light tint
 * - Phase 3 (25-50%): Critical - stronger tint
 * - Phase 4 (0-25%): Enraged - heaviest tint + red rim
 *
 * Phase is also readable from the HP bar this sits next to, so the image carries no separate
 * phase indicator of its own.
 */
export function BossPhaseImage({
  currentHp,
  totalHp,
  size = 80,
  bossImagePath,
}: BossPhaseImageProps) {
  const hpPercent = totalHp > 0 ? (currentHp / totalHp) * 100 : 100;
  const currentPhase = getPhaseFromHp(hpPercent);

  const [isTransitioning, setIsTransitioning] = useState(false);
  const [displayPhase, setDisplayPhase] = useState(currentPhase);
  const [prevPhase, setPrevPhase] = useState(currentPhase);

  // Handle phase transitions with animation
  useEffect(() => {
    if (currentPhase === prevPhase) {
      return;
    }
    setIsTransitioning(true);
    const timer = setTimeout(() => {
      setDisplayPhase(currentPhase);
      setIsTransitioning(false);
      setPrevPhase(currentPhase);
    }, 300);
    return () => clearTimeout(timer);
  }, [currentPhase, prevPhase]);

  const displayConfig = getPhaseConfig(displayPhase);
  const isEnraged = currentPhase === 4;

  return (
    <YStack
      width={size}
      height={size}
      rounded={size / 2}
      overflow="hidden"
      bg="$surface2"
      borderWidth={1}
      borderColor={isEnraged ? "$error" : "$borderStrong"}
      items="center"
      justify="center"
      transition={isEnraged ? "bouncy" : "quick"}
      scale={isTransitioning ? 1.2 : 1}
      rotate={isTransitioning ? "10deg" : "0deg"}
      opacity={isTransitioning ? 0.7 : 1}
    >
      <Image
        source={getAdventureAsset(bossImagePath)}
        style={{ width: "100%", height: "100%" }}
        contentFit="cover"
      />
      {!!displayConfig.tint && <YStack position="absolute" fullscreen bg={displayConfig.tint} />}
    </YStack>
  );
}

/**
 * Get boss phase info for external use
 */
// biome-ignore lint/style/useComponentExportOnlyModules: phase helper colocated with the image it drives
export function getBossPhaseInfo(hpPercent: number) {
  const phase = getPhaseFromHp(hpPercent);
  const config = getPhaseConfig(phase);
  return {
    phase,
    label: config.label,
    minPercent: config.minPercent,
    isEnraged: phase === 4,
    isCritical: phase >= 3,
  };
}
