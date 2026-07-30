import { Swords, Target, Zap } from "@tamagui/lucide-icons";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { useWindowDimensions } from "react-native";
import { Text, XStack, YStack } from "tamagui";
import { GameIcon } from "@/components/common/GameIcon";
import { getBossAsset } from "@/constants/assetMap";
import type { MuscleCode } from "@/db/schema";
import { useReducedMotion } from "@/hooks/useReducedMotion";
import { getHpPercent, getPhaseFromHp, getPhaseTint } from "./bossPhase";

type BossArenaProps = {
  currentHp: number;
  totalHp: number;
  bossName: string;
  /** The monster's own painting (BossFight.imagePath), resolved through getBossAsset. */
  bossImagePath: string;
  weaknessMuscle?: MuscleCode | null;
  lastDamage?: {
    damage: number;
    isCritical: boolean;
    weaknessBonus: boolean;
  } | null;
};

/** How long the trail holds at the old HP before draining, and the bar's own height. */
const TRAIL_HOLD_MS = 700;
const BAR_HEIGHT = 10;

/**
 * The boss fight's stage: the monster at full width with its own health attached to it.
 *
 * It replaces a 44px puck in a status strip. The boss was never actually visible — worse, the
 * puck showed the campaign cover, because nothing had ever pointed at the boss paintings that
 * ship in assets/images/bosses/. Here the painting is the surface everything else sits on.
 *
 * The portrait takes the exercise image's slot rather than stacking above it (the exercise art
 * drops to a thumbnail beside its name during a fight), so the session column is no taller than
 * before and the footer CTA stays reachable.
 */
export function BossArena({
  currentHp,
  totalHp,
  bossName,
  bossImagePath,
  weaknessMuscle,
  lastDamage,
}: BossArenaProps) {
  const { t } = useTranslation();
  const { width, height } = useWindowDimensions();
  const reducedMotion = useReducedMotion();
  const [showDamage, setShowDamage] = useState(false);

  const hpPercent = getHpPercent(currentHp, totalHp);
  const phase = getPhaseFromHp(hpPercent);
  const tint = getPhaseTint(phase);
  const isEnraged = phase === 4;
  const hpColor = isEnraged ? "$error" : hpPercent < 50 ? "$secondary" : "$success";

  // The damage trail: the bar remembers where HP was, holds there so the hit is legible, then
  // drains to the new value. Seeing the chunk come off is what makes progress readable mid-set —
  // a bar that just teleports to its new width tells you nothing about what you did.
  const [trailHp, setTrailHp] = useState(currentHp);
  useEffect(() => {
    if (currentHp >= trailHp) {
      setTrailHp(currentHp);
      return;
    }
    if (reducedMotion) {
      setTrailHp(currentHp);
      return;
    }
    const id = setTimeout(() => setTrailHp(currentHp), TRAIL_HOLD_MS);
    return () => clearTimeout(id);
  }, [currentHp, trailHp, reducedMotion]);

  useEffect(() => {
    if (!lastDamage) return;
    setShowDamage(true);
    const timer = setTimeout(() => setShowDamage(false), 1800);
    return () => clearTimeout(timer);
  }, [lastDamage]);

  // Tall enough to read as a painting, capped so a short screen still leaves the exercise and
  // its CTA room to breathe.
  const artHeight = Math.min(Math.round(width * 0.5), Math.round(height * 0.28));
  const trailPercent = getHpPercent(trailHp, totalHp);

  return (
    <YStack
      rounded="$6"
      overflow="hidden"
      borderWidth={1}
      borderColor={isEnraged ? "$error" : "$borderStrong"}
      bg="$surface"
      shadowColor="$shadowColor"
      shadowOpacity={0.5}
      shadowRadius={12}
      shadowOffset={{ width: 0, height: 4 }}
      transition="quick"
    >
      <YStack height={artHeight} width="100%" position="relative">
        <Image
          source={getBossAsset(bossImagePath)}
          style={{ width: "100%", height: "100%" }}
          contentFit="cover"
          transition={200}
        />
        {!!tint && <YStack position="absolute" fullscreen bg={tint} pointerEvents="none" />}

        {/* Scrim: the name and HP sit on painted art, so they need their own ground to stay
            readable in gym lighting rather than relying on whatever the artwork happens to be. */}
        <LinearGradient
          colors={["transparent", "rgba(11,15,25,0.55)", "#0B0F19"]}
          locations={[0, 0.55, 1]}
          style={{ position: "absolute", left: 0, right: 0, bottom: 0, height: artHeight * 0.7 }}
          pointerEvents="none"
        />

        <YStack position="absolute" b="$3" l="$3" r="$3" gap="$1">
          <Text
            fontFamily="$heading"
            fontWeight="700"
            fontSize={22}
            lineHeight={26}
            color="$text"
            numberOfLines={1}
          >
            {bossName}
          </Text>
          <StatusLine isEnraged={isEnraged} weaknessMuscle={weaknessMuscle} />
        </YStack>

        {showDamage && !!lastDamage && (
          <DamageBurst
            damage={lastDamage.damage}
            isCritical={lastDamage.isCritical}
            weaknessBonus={lastDamage.weaknessBonus}
            reducedMotion={reducedMotion}
          />
        )}
      </YStack>

      {/* HP reads as the boss's own health because it is attached to the portrait, not floating
          in a separate card above the workout. */}
      <YStack px="$3" py="$2" gap="$1" bg="$bgDark">
        <YStack
          height={BAR_HEIGHT}
          rounded="$10"
          bg="$surface2"
          borderWidth={1}
          borderColor="$borderStrong"
          overflow="hidden"
          position="relative"
        >
          {/* Trail first, so the live bar paints over it and only the difference shows. */}
          <YStack
            testID="boss-hp-trail"
            position="absolute"
            t={0}
            b={0}
            l={0}
            width={`${trailPercent}%`}
            bg="$error"
            opacity={0.45}
            transition={reducedMotion ? undefined : "quick"}
          />
          <YStack
            testID="boss-hp-fill"
            position="absolute"
            t={0}
            b={0}
            l={0}
            width={`${hpPercent}%`}
            bg={hpColor}
            transition={reducedMotion ? undefined : "quick"}
          />
        </YStack>

        <XStack justify="flex-end" items="baseline" gap="$1">
          <Text fontWeight="700" fontSize={15} color={hpColor} transition="quick">
            {currentHp}
          </Text>
          <Text fontWeight="700" fontSize={12} color="$textSecondary">
            / {totalHp} {t("boss.hp")}
          </Text>
        </XStack>
      </YStack>
    </YStack>
  );
}

/**
 * One status line that swaps content instead of adding a row: the arena must not change height
 * when the boss enrages, or the CTA below it starts moving mid-workout.
 */
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
      <XStack items="center" gap="$1" height={16}>
        <GameIcon name="flame" size={13} color="$error" />
        <Text fontSize={11} fontWeight="700" color="$error" textTransform="uppercase">
          {t("boss.enraged")}
        </Text>
      </XStack>
    );
  }

  if (weaknessMuscle) {
    return (
      <XStack items="center" gap="$1" height={16}>
        <Target size={12} color="$secondary" />
        <Text fontSize={11} fontWeight="700" color="$textSecondary" numberOfLines={1}>
          {t("boss.weakness")} · {t(`muscles.${weaknessMuscle}`)}
        </Text>
      </XStack>
    );
  }

  // Held even when empty: the block must not resize once a weakness or an enrage appears.
  return <YStack height={16} />;
}

/** The hit, read at a glance: struck over the portrait, never in the layout flow. */
function DamageBurst({
  damage,
  isCritical,
  weaknessBonus,
  reducedMotion,
}: {
  damage: number;
  isCritical: boolean;
  weaknessBonus: boolean;
  reducedMotion: boolean;
}) {
  const { t } = useTranslation();

  return (
    <XStack
      position="absolute"
      t="$3"
      r="$3"
      items="center"
      gap="$1"
      px="$2"
      py="$1"
      rounded="$10"
      bg="$bgOverlay"
      borderWidth={1}
      borderColor={isCritical ? "$error" : "$borderStrong"}
      pointerEvents="none"
      transition={reducedMotion ? undefined : "bouncy"}
      enterStyle={reducedMotion ? undefined : { opacity: 0, y: -12, scale: 0.8 }}
      exitStyle={reducedMotion ? undefined : { opacity: 0, y: -12 }}
    >
      {isCritical ? <Zap size={16} color="$error" /> : <Swords size={14} color="$secondary" />}
      <Text
        fontWeight="700"
        fontSize={isCritical ? 20 : 16}
        color={isCritical ? "$error" : "$text"}
      >
        {isCritical ? `${t("common.crit")} ` : ""}−{damage}
      </Text>
      {!!weaknessBonus && <Target size={14} color="$secondary" />}
    </XStack>
  );
}
