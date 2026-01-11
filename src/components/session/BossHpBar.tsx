import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Progress, Text, XStack, YStack } from "tamagui";
import { BossPhaseImage } from "./BossPhaseImage";

type BossHpBarProps = {
  currentHp: number;
  totalHp: number;
  bossName?: string;
  lastDamage?: {
    damage: number;
    isCritical: boolean;
    weaknessBonus: boolean;
  } | null;
  showPhaseImage?: boolean;
};

// biome-ignore lint/complexity/noExcessiveCognitiveComplexity: Boss HP display with phase transitions and damage animations
export function BossHpBar({
  currentHp,
  totalHp,
  bossName,
  lastDamage,
  showPhaseImage = true,
}: BossHpBarProps) {
  const { t } = useTranslation();
  const [showDamage, setShowDamage] = useState(false);

  const hpPercent = Math.max(0, Math.min(100, (currentHp / totalHp) * 100));
  const isEnraged = hpPercent < 25;
  const isLow = hpPercent < 50;

  // Flash damage indicator
  useEffect(() => {
    if (!lastDamage) {
      return;
    }
    setShowDamage(true);
    const timer = setTimeout(() => setShowDamage(false), 1200);
    return () => clearTimeout(timer);
  }, [lastDamage]);

  // HP bar color based on remaining HP
  const hpColor = isEnraged ? "$error" : isLow ? "$warning" : "$success";

  return (
    <YStack
      bg="$glassBg"
      borderWidth={1}
      borderColor="$borderStrong"
      borderRadius="$5"
      px="$3"
      py="$2.5"
      gap="$2"
      shadowColor={isEnraged ? "$error" : "$primary"}
      shadowOpacity={isEnraged ? 0.4 : 0.2}
      shadowRadius={16}
      animation="quick"
    >
      {/* Boss Phase Image */}
      {showPhaseImage && (
        <YStack alignItems="center" py="$1.5">
          <BossPhaseImage currentHp={currentHp} totalHp={totalHp} size={56} />
        </YStack>
      )}

      {/* Boss Name & HP Text */}
      <XStack justifyContent="space-between" alignItems="center">
        <XStack alignItems="center" gap="$2">
          {!showPhaseImage && <Text fontSize={16}>👹</Text>}
          <Text
            fontWeight="900"
            fontSize={13}
            color="$text"
            textTransform="uppercase"
            letterSpacing={1}
          >
            {bossName || t("adventures.kind_boss")}
          </Text>
        </XStack>
        <XStack alignItems="center" gap="$1">
          <Text fontWeight="900" fontSize={18} color={hpColor} fontFamily="$body" animation="quick">
            {currentHp}
          </Text>
          <Text fontWeight="700" fontSize={12} color="$textSecondary">
            /{totalHp}
          </Text>
        </XStack>
      </XStack>

      {/* HP Bar - Enhanced animations */}
      <YStack position="relative">
        <Progress
          value={hpPercent}
          size="$3"
          bg="$bgOverlay"
          borderWidth={1}
          borderColor="$borderStrong"
          borderRadius="$3"
        >
          <Progress.Indicator animation={isEnraged ? "bouncy" : "quick"} bg={hpColor} />
        </Progress>

        {/* Damage Popup - Improved animation */}
        {showDamage && lastDamage && (
          <YStack
            position="absolute"
            top={-28}
            right={0}
            animation="bouncy"
            enterStyle={{ opacity: 0, y: 12, scale: 0.7 }}
            exitStyle={{ opacity: 0, y: -12, scale: 0.7 }}
            bg="$bgOverlay"
            px="$2.5"
            py="$1.5"
            borderRadius="$3"
            borderWidth={1}
            borderColor={lastDamage.isCritical ? "$error" : "$warning"}
          >
            <Text
              fontWeight="900"
              fontSize={lastDamage.isCritical ? 18 : 15}
              color={lastDamage.isCritical ? "$error" : "$warning"}
            >
              {lastDamage.isCritical ? "💥 CRIT " : "⚔️ "}-{lastDamage.damage}
              {lastDamage.weaknessBonus ? " 🎯" : ""}
            </Text>
          </YStack>
        )}
      </YStack>

      {/* Status Text */}
      {isEnraged && (
        <Text
          fontSize={11}
          fontWeight="900"
          color="$error"
          textTransform="uppercase"
          letterSpacing={1}
          textAlign="center"
          animation="bouncy"
        >
          🔥 {t("boss.enraged", "ENRAGED!")} 🔥
        </Text>
      )}
    </YStack>
  );
}
