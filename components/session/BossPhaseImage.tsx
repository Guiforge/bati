import { useEffect, useState } from "react";
import { Text, YStack } from "tamagui";

/**
 * Boss phase thresholds (HP percentage)
 * Each phase shows a different visual state
 */
const PHASE_THRESHOLDS = [
  { minPercent: 75, phase: 1, emoji: "👹", label: "Full Power" },
  { minPercent: 50, phase: 2, emoji: "😤", label: "Wounded" },
  { minPercent: 25, phase: 3, emoji: "😡", label: "Critical" },
  { minPercent: 0, phase: 4, emoji: "🔥", label: "Enraged" },
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
};

/**
 * Displays a boss image that changes based on HP phase.
 * Uses emoji placeholders - replace with actual images when available.
 *
 * Phases:
 * - Phase 1 (75-100%): Full power - confident boss
 * - Phase 2 (50-75%): Wounded - angrier
 * - Phase 3 (25-50%): Critical - desperate
 * - Phase 4 (0-25%): Enraged - final form
 */
export function BossPhaseImage({ currentHp, totalHp, size = 80 }: BossPhaseImageProps) {
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
    <YStack items="center" gap="$1">
      {/* Boss Image Container */}
      <YStack
        width={size}
        height={size}
        rounded={size / 2}
        bg={isEnraged ? "$pastelPink" : "$pastelPurple"}
        borderWidth={1}
        borderColor={isEnraged ? "$error" : "$color"}
        items="center"
        justify="center"
        animation={isEnraged ? "bouncy" : "quick"}
        scale={isTransitioning ? 1.2 : 1}
        rotate={isTransitioning ? "10deg" : "0deg"}
        opacity={isTransitioning ? 0.7 : 1}
        // Pulsing animation for enraged state
        {...(isEnraged && {
          animateOnly: ["scale", "opacity"],
          animation: "bouncy",
        })}
      >
        <Text
          fontSize={size * 0.5}
          animation="quick"
          scale={isTransitioning ? 0.5 : 1}
          opacity={isTransitioning ? 0 : 1}
        >
          {displayConfig.emoji}
        </Text>
      </YStack>

      {/* Phase indicator (small dots) */}
      <YStack flexDirection="row" gap="$1" items="center" animation="quick" opacity={0.7}>
        {[1, 2, 3, 4].map((phase) => (
          <YStack
            key={phase}
            width={6}
            height={6}
            rounded={3}
            bg={phase <= currentPhase ? "$color" : "$bgLight"}
            borderWidth={1}
            borderColor="$borderStrong"
            opacity={phase === currentPhase ? 1 : 0.4}
          />
        ))}
      </YStack>
    </YStack>
  );
}

/**
 * Get boss phase info for external use
 */
export function getBossPhaseInfo(hpPercent: number) {
  const phase = getPhaseFromHp(hpPercent);
  const config = getPhaseConfig(phase);
  return {
    phase,
    emoji: config.emoji,
    label: config.label,
    minPercent: config.minPercent,
    isEnraged: phase === 4,
    isCritical: phase >= 3,
  };
}
