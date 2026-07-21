import { useEffect, useState } from "react";
import { Text, YStack } from "tamagui";
import { useReducedMotion } from "@/hooks/useReducedMotion";

interface SparkleParticle {
  id: number;
  x: number;
  y: number;
  delay: number;
  size: number;
}

interface LevelUpSparkleProps {
  /**
   * Whether the sparkle animation is active
   */
  isActive: boolean;
  /**
   * Duration of the animation in ms
   */
  duration?: number;
  /**
   * Called when animation completes
   */
  onComplete?: () => void;
  /**
   * Number of sparkle particles
   */
  particleCount?: number;
}

/**
 * A celebratory sparkle animation overlay for level-ups
 * Respects reduced motion preferences
 */
export function LevelUpSparkle({
  isActive,
  duration = 1500,
  onComplete,
  particleCount = 8,
}: LevelUpSparkleProps) {
  const reducedMotion = useReducedMotion();
  const [particles, setParticles] = useState<SparkleParticle[]>([]);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!isActive) {
      setVisible(false);
      setParticles([]);
      return;
    }

    // Generate random particles
    const newParticles: SparkleParticle[] = [];
    for (let i = 0; i < particleCount; i++) {
      newParticles.push({
        id: i,
        x: Math.random() * 100, // % position
        y: Math.random() * 100,
        delay: Math.random() * 300,
        size: 8 + Math.random() * 8,
      });
    }
    setParticles(newParticles);
    setVisible(true);

    const timer = setTimeout(() => {
      setVisible(false);
      setParticles([]);
      onComplete?.();
    }, duration);

    return () => clearTimeout(timer);
  }, [isActive, duration, onComplete, particleCount]);

  if (!visible || reducedMotion) {
    return null;
  }

  return (
    <YStack position="absolute" t={0} l={0} r={0} b={0} pointerEvents="none" overflow="hidden">
      {particles.map((particle) => (
        <YStack
          key={particle.id}
          position="absolute"
          l={`${particle.x}%` as unknown as number}
          t={`${particle.y}%` as unknown as number}
          animation="bouncy"
          animateOnly={["opacity", "transform"]}
          enterStyle={{
            opacity: 0,
            scale: 0,
          }}
          opacity={1}
          scale={1}
        >
          <Text fontSize={particle.size}>✨</Text>
        </YStack>
      ))}
    </YStack>
  );
}

interface ConstructionAnimationProps {
  /**
   * Whether construction animation is active
   */
  isActive: boolean;
  /**
   * Building emoji to show during construction
   */
  emoji: string;
}

/**
 * A simple construction animation showing the building being built
 * Respects reduced motion preferences
 */
export function ConstructionAnimation({ isActive, emoji }: ConstructionAnimationProps) {
  const reducedMotion = useReducedMotion();

  if (!isActive || reducedMotion) {
    return null;
  }

  return (
    <YStack
      position="absolute"
      t={0}
      l={0}
      r={0}
      b={0}
      items="center"
      justify="center"
      bg="rgba(0,0,0,0.3)"
      animation="quick"
      enterStyle={{ opacity: 0 }}
    >
      <YStack
        animation="bouncy"
        animateOnly={["transform"]}
        enterStyle={{ scale: 0, y: 20 }}
        scale={1}
        y={0}
      >
        <Text fontSize={48}>{emoji}</Text>
      </YStack>
      <Text color="white" fontWeight="bold" mt="$2">
        🔨
      </Text>
    </YStack>
  );
}
