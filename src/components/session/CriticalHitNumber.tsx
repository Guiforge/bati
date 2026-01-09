import { useMemo } from "react";
import { Text, YStack } from "tamagui";
import type { DamageNumberProps } from "@/src/types/boss-battle";

type ThemeColor = "$error" | "$text";

/**
 * CriticalHitNumber Component
 *
 * Displays floating damage numbers with animation.
 * Regular hits: white/gold text, moves up
 * Critical hits: large red/gold text with glow, dramatic scale animation
 *
 * Usage:
 * <CriticalHitNumber
 *   damage={50}
 *   isCritical={true}
 *   x={200}
 *   y={400}
 *   duration={1500}
 * />
 */
export function CriticalHitNumber({
  damage,
  isCritical,
  x,
  y,
  duration: _duration,
}: Omit<DamageNumberProps, "key">) {
  const { fontSize, color, opacity } = useMemo(() => {
    if (isCritical) {
      return {
        fontSize: 52,
        color: "$error" as ThemeColor,
        opacity: 1,
      };
    }
    return {
      fontSize: 36,
      color: "$text" as ThemeColor,
      opacity: 0.9,
    };
  }, [isCritical]);

  const animationStyle = useMemo(() => {
    const exitScaleAnimation = isCritical ? 0.8 : 0.95;

    return {
      enterStyle: {
        opacity: 0,
        scale: isCritical ? 0.5 : 0.8,
        y: 0,
      },
      exitStyle: {
        opacity: 0,
        scale: exitScaleAnimation,
        y: -100,
      },
    };
  }, [isCritical]);

  return (
    <YStack
      position="absolute"
      left={x - 30}
      top={y}
      width={60}
      alignItems="center"
      pointerEvents="none"
      {...animationStyle}
      animation="quick"
    >
      <Text
        fontSize={fontSize}
        fontWeight="900"
        color={color}
        opacity={opacity}
        textAlign="center"
        lineHeight={fontSize + 2}
        shadowColor={isCritical ? "$error" : undefined}
        shadowRadius={isCritical ? 12 : 0}
        shadowOpacity={isCritical ? 0.8 : 0}
      >
        {isCritical ? "⚡" : ""}
        {damage}
        {isCritical ? "⚡" : ""}
      </Text>
    </YStack>
  );
}
