import { useMemo } from "react";
import { Text, YStack } from "tamagui";
import type { ComboMeterProps } from "@/src/types/boss-battle";

type ThemeColor = "$primary" | "$warning" | "$error";

/**
 * ComboMeter Component
 *
 * Displays the current combo streak with visual intensity feedback.
 * Shows "COMBO x12 🔥" with pulsing animation as combo increases.
 *
 * Design:
 * - Appears in center-top of screen
 * - Scales and pulses with combo count
 * - Disappears when combo ends
 */
export function ComboMeter({ combo, isVisible }: ComboMeterProps) {
  // Determine visual style based on combo count
  const { fontSize, borderColor, textColor } = useMemo(() => {
    if (combo.current < 5)
      return {
        fontSize: 18,
        borderColor: "$primary" as ThemeColor,
        textColor: "$primary" as ThemeColor,
      };
    if (combo.current < 10)
      return {
        fontSize: 22,
        borderColor: "$warning" as ThemeColor,
        textColor: "$warning" as ThemeColor,
      };
    if (combo.current < 20)
      return {
        fontSize: 26,
        borderColor: "$error" as ThemeColor,
        textColor: "$error" as ThemeColor,
      };
    return {
      fontSize: 32,
      borderColor: "$error" as ThemeColor,
      textColor: "$error" as ThemeColor,
    };
  }, [combo.current]);

  // Determine flame intensity based on combo
  const flameEmoji = useMemo(() => {
    if (combo.current < 5) return "🔥";
    if (combo.current < 10) return "🔥🔥";
    if (combo.current < 20) return "🔥🔥🔥";
    return "⚡💥";
  }, [combo.current]);

  // Return nothing if not visible or combo is empty
  if (!isVisible || combo.current === 0) return null;

  return (
    <YStack
      position="absolute"
      top={80}
      right={16}
      zIndex={50}
      animation="bouncy"
      enterStyle={{ scale: 0.5, opacity: 0, x: 20 }}
      exitStyle={{ scale: 0.5, opacity: 0, x: 20 }}
    >
      <YStack
        px="$3"
        py="$2"
        borderRadius="$3"
        bg="$glassBg"
        borderWidth={2}
        borderColor={borderColor}
        alignItems="center"
        shadowColor={borderColor}
        shadowOpacity={0.6}
        shadowRadius={12}
      >
        <Text
          fontSize={fontSize}
          fontWeight="900"
          color={textColor}
          textAlign="center"
          lineHeight={fontSize + 4}
        >
          {combo.current}x {flameEmoji}
        </Text>

        {combo.multiplier > 1 && (
          <Text fontSize={10} color={textColor} opacity={0.8} fontWeight="700" marginTop="$1">
            {combo.multiplier}x
          </Text>
        )}
      </YStack>
    </YStack>
  );
}
