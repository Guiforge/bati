import { Swords, Target, Zap } from "@tamagui/lucide-icons";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Progress, Text, XStack, YStack } from "tamagui";
import type { MuscleCode } from "@/db/schema";
import { BossPhaseImage } from "./BossPhaseImage";

type BossHpBarProps = {
  currentHp: number;
  totalHp: number;
  bossName?: string;
  /** Adventure cover reused as boss phase art (BossFight.imagePath). */
  bossImagePath: string;
  /** Surfaced as a tag: the fight has a strategy, and it was invisible until now. */
  weaknessMuscle?: MuscleCode | null;
  lastDamage?: {
    damage: number;
    isCritical: boolean;
    weaknessBonus: boolean;
  } | null;
};

const ART_SIZE = 44;

/**
 * The boss HUD: one bounded strip, pinned above the session content.
 *
 * Height is deliberately fixed. This block used to grow — a 64px portrait, phase dots, and an
 * extra "ENRAGED" line appearing below 25% HP — inside a session column that does not scroll,
 * which pushed the "done" CTA off the bottom of the screen exactly when the fight got tense.
 * The status line swaps its content instead of adding a row, and the damage popup floats
 * outside the frame, so nothing here changes the strip's height.
 */
export function BossHpBar({
  currentHp,
  totalHp,
  bossName,
  bossImagePath,
  weaknessMuscle,
  lastDamage,
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
    <YStack position="relative">
      <XStack
        bg="$surface"
        borderWidth={1}
        borderColor={isEnraged ? "$error" : "$borderStrong"}
        rounded="$6"
        px="$3"
        py="$2"
        gap="$3"
        items="center"
        transition="quick"
      >
        <BossPhaseImage
          currentHp={currentHp}
          totalHp={totalHp}
          bossImagePath={bossImagePath}
          size={ART_SIZE}
        />

        <YStack flex={1} gap="$1">
          <XStack justify="space-between" items="baseline" gap="$2">
            <Text
              flex={1}
              fontWeight="700"
              fontSize={14}
              color="$text"
              textTransform="uppercase"
              numberOfLines={1}
            >
              {bossName || t("adventures.kind_boss")}
            </Text>
            <XStack items="baseline" gap="$1">
              <Text fontWeight="700" fontSize={16} color={hpColor} transition="quick">
                {currentHp}
              </Text>
              <Text fontWeight="700" fontSize={12} color="$text" opacity={0.5}>
                /{totalHp}
              </Text>
            </XStack>
          </XStack>

          <Progress
            value={hpPercent}
            size="$1"
            bg="$surface2"
            borderWidth={1}
            borderColor="$borderStrong"
            rounded="$4"
          >
            <Progress.Indicator transition={isEnraged ? "bouncy" : "quick"} bg={hpColor} />
          </Progress>

          {/* One status line, never two: enraged replaces the weakness tag rather than stacking
              under it, so the strip keeps its height in every phase. */}
          <StatusLine isEnraged={isEnraged} weaknessMuscle={weaknessMuscle} />
        </YStack>
      </XStack>

      {/* Damage popup — floated out of the strip so it can never displace the layout, and
          non-interactive so it never eats a tap meant for the content underneath. */}
      {showDamage && !!lastDamage && (
        <XStack
          position="absolute"
          t={-18}
          r="$3"
          items="center"
          gap="$1"
          pointerEvents="none"
          transition="bouncy"
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
          {!!lastDamage.weaknessBonus && <Target size={14} color="$secondary" />}
        </XStack>
      )}
    </YStack>
  );
}

function StatusLine({
  isEnraged,
  weaknessMuscle,
}: {
  isEnraged: boolean;
  weaknessMuscle?: MuscleCode | null;
}) {
  const { t } = useTranslation();

  if (isEnraged) {
    return (
      <Text fontSize={10} fontWeight="700" color="$error" textTransform="uppercase" height={14}>
        🔥 {t("boss.enraged")}
      </Text>
    );
  }

  if (weaknessMuscle) {
    return (
      <XStack items="center" gap="$1" height={14}>
        <Target size={10} color="$secondary" />
        <Text fontSize={10} fontWeight="700" color="$textSecondary" numberOfLines={1}>
          {t("boss.weakness")} · {t(`muscles.${weaknessMuscle}`)}
        </Text>
      </XStack>
    );
  }

  // Reserved even when empty: the strip must not resize once a weakness or enrage appears.
  return <YStack height={14} />;
}
