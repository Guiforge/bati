import { useEffect, useState } from "react";
import { Text, YStack } from "tamagui";
import { useReducedMotion } from "@/hooks/useReducedMotion";

interface FlameFlickerProps {
  /**
   * Size of the flame emoji
   */
  size?: number;
  /**
   * Whether to show the flicker animation
   */
  animate?: boolean;
}

/**
 * A flickering flame for the streak. Shared by the village scene and the home header.
 * Respects reduced motion preferences.
 */
export function FlameFlicker({ size = 48, animate = true }: FlameFlickerProps) {
  const reducedMotion = useReducedMotion();
  const [flicker, setFlicker] = useState(0);

  useEffect(() => {
    if (!animate || reducedMotion) return;

    const interval = setInterval(() => {
      setFlicker((prev) => (prev + 1) % 3);
    }, 400);

    return () => clearInterval(interval);
  }, [animate, reducedMotion]);

  // Different flame states for subtle animation
  const flames = ["🔥", "🔥", "🔥"];
  const scales = [1, 1.05, 0.98];
  const rotations = [0, 2, -2];

  return (
    <YStack
      animation={reducedMotion ? undefined : "quick"}
      scale={scales[flicker]}
      rotate={`${rotations[flicker]}deg`}
    >
      <Text fontSize={size}>{flames[flicker]}</Text>
    </YStack>
  );
}
