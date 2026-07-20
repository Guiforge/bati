import { Swords, Target, Zap } from "@tamagui/lucide-icons";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Progress, Text, XStack, YStack } from "tamagui";
import { BossPhaseImage } from "./BossPhaseImage";

type BossHpBarProps = {
  currentHp: number;
  totalHp: number;
  bossName?: string;
  /** Adventure cover reused as boss phase art (BossFight.imagePath). */
  bossImagePath: string;
  lastDamage?: {
    damage: number;
    isCritical: boolean;
    weaknessBonus: boolean;
  } | null;
  showPhaseImage?: boolean;
};

export function BossHpBar({
  currentHp,
  totalHp,
  bossName,
  bossImagePath,
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
    const timer = setTimeout(() => setShowDamage(false), 1500);
    return () => clearTimeout(timer);
  }, [lastDamage]);

  // HP bar color based on remaining HP
  const hpColor = isEnraged ? "$error" : isLow ? "$secondary" : "$success";

  return (
    <YStack
      bg="$bgLight"
      borderWidth={1}
      borderColor="$borderStrong"
      rounded="$6"
      px="$3"
      py="$2"
      gap="$2"
      shadowColor="$color"
      shadowRadius={0}
      shadowOffset={{ width: 0, height: 3 }}
    >
      {/* Boss Phase Image */}
      {showPhaseImage && (
        <YStack items="center" py="$2">
          <BossPhaseImage
            currentHp={currentHp}
            totalHp={totalHp}
            bossImagePath={bossImagePath}
            size={64}
          />
        </YStack>
      )}

      {/* Boss Name & HP Text */}
      <XStack justify="space-between" items="center">
        <XStack items="center" gap="$2">
          {!showPhaseImage && <Text fontSize={18}>👹</Text>}
          <Text fontWeight="700" fontSize={14} color="$color" textTransform="uppercase">
            {bossName || t("adventures.kind_boss")}
          </Text>
        </XStack>
        <XStack items="center" gap="$1">
          <Text fontWeight="700" fontSize={16} color={hpColor} fontFamily="$body" animation="quick">
            {currentHp}
          </Text>
          <Text fontWeight="700" fontSize={12} color="$color" opacity={0.5}>
            /{totalHp}
          </Text>
        </XStack>
      </XStack>

      {/* HP Bar */}
      <YStack position="relative">
        <Progress
          value={hpPercent}
          size="$4"
          bg="$pastelPink"
          borderWidth={1}
          borderColor="$borderStrong"
          rounded="$4"
        >
          <Progress.Indicator animation={isEnraged ? "bouncy" : "quick"} bg={hpColor} />
        </Progress>

        {/* Damage Popup */}
        {showDamage && lastDamage && (
          <XStack
            position="absolute"
            t={-24}
            r={0}
            items="center"
            gap="$1"
            animation="bouncy"
            enterStyle={{ opacity: 0, y: 10, scale: 0.8 }}
            exitStyle={{ opacity: 0, y: -10 }}
          >
            {lastDamage.isCritical ? (
              <Zap size={18} color="$error" />
            ) : (
              <Swords size={14} color="$secondary" />
            )}
            <Text
              fontWeight="700"
              fontSize={lastDamage.isCritical ? 20 : 16}
              color={lastDamage.isCritical ? "$error" : "$secondary"}
            >
              {lastDamage.isCritical ? `${t("common.crit")} ` : ""}-{lastDamage.damage}
            </Text>
            {lastDamage.weaknessBonus && <Target size={14} color="$secondary" />}
          </XStack>
        )}
      </YStack>

      {/* Status Text */}
      {isEnraged && (
        <Text
          fontSize={11}
          fontWeight="700"
          color="$error"
          textTransform="uppercase"
          style={{ textAlign: "center" }}
          animation="bouncy"
        >
          🔥 {t("boss.enraged", "ENRAGED!")} 🔥
        </Text>
      )}
    </YStack>
  );
}
