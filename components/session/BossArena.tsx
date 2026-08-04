import { Shield, Swords, Target, Zap } from "@tamagui/lucide-icons";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import type { ReactNode } from "react";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { useWindowDimensions } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { AnimatePresence, Text, XStack, YStack } from "tamagui";
import { GameIcon } from "@/components/common/GameIcon";
import { ImageViewer } from "@/components/common/ImageViewer";
import { getBossAsset } from "@/constants/assetMap";
import { rawColors } from "@/constants/rawColors";
import type { MuscleCode } from "@/db/schema";
import { useReducedMotion } from "@/hooks/useReducedMotion";
import { getHpPercent, getPhaseFromHp, getPhaseLook } from "./bossPhase";
import { sessionArtHeight } from "./sessionArt";

type BossArenaProps = {
  currentHp: number;
  totalHp: number;
  bossName: string;
  /** The monster's own painting (BossFight.imagePath), resolved through getBossAsset. */
  bossImagePath: string;
  /** Rematch tier (BossFight.tier). ≥ 1 serves the legendary painting. */
  tier?: number;
  /** The encounter's cosmetic roll (BossFight.shiny): the rim burns gold instead of red. */
  shiny?: boolean;
  weaknessMuscle?: MuscleCode | null;
  resistanceMuscle?: MuscleCode | null;
  /**
   * The store's `lastDamageResult`, passed by *reference*. Both call sites used to build a fresh
   * object literal every render, which re-armed the burst timer on every tick of the session
   * clock — invisible with a corner pill, a permanent twitch once the portrait flinches.
   */
  lastDamage?: {
    damage: number;
    isCritical: boolean;
    weaknessBonus: boolean;
    resistancePenalty?: boolean;
  } | null;
  /** Painted on the scrim over the art's base: the exercise while running, nothing while resting. */
  children?: ReactNode;
};

/** How long the trail holds at the old HP before draining, and the HP hairline's own height. */
const TRAIL_HOLD_MS = 700;
const BAR_HEIGHT = 3;
/** How long the portrait recoils from a hit. Short enough to read as impact, not as a wobble. */
const FLINCH_MS = 120;
/** How long the damage numeral stays struck over the art. */
const BURST_MS = 1800;
/** Half the enrage rim's breath — a slow swell, not a strobe. */
const PULSE_MS = 900;

/**
 * The damage trail: the bar remembers where HP was, holds there so the hit is legible, then
 * drains to the new value. Seeing the chunk come off is what makes progress readable mid-set —
 * a bar that just teleports to its new width tells you nothing about what you did.
 */
function useDamageTrail(currentHp: number, reducedMotion: boolean): number {
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
  return trailHp;
}

/** One hit → one flinch (FLINCH_MS) and one damage burst (BURST_MS), keyed on the hit's identity. */
function useHitReaction(
  lastDamage: BossArenaProps["lastDamage"],
  reducedMotion: boolean,
): { showDamage: boolean; flinching: boolean } {
  const [showDamage, setShowDamage] = useState(false);
  const [hit, setHit] = useState(false);
  useEffect(() => {
    if (!lastDamage) return;
    setShowDamage(true);
    setHit(true);
    // The flinch is a jab, not a wobble: out on the hit, the spring carries it back. A crit
    // holds the recoil a beat longer — the monster genuinely staggers.
    const flinch = setTimeout(
      () => setHit(false),
      lastDamage.isCritical ? FLINCH_MS * 2 : FLINCH_MS,
    );
    const clear = setTimeout(() => setShowDamage(false), BURST_MS);
    return () => {
      clearTimeout(flinch);
      clearTimeout(clear);
    };
  }, [lastDamage]);
  return { showDamage, flinching: hit && !reducedMotion };
}

/**
 * The painting's pose, one state at a time: down beats staggered beats flinching beats standing.
 * A crit recoils harder than an ordinary hit; a felled boss sinks and dims instead of standing
 * at zero as if nothing happened.
 */
/** Which painting the fight calls for; the pose helper below decides how it stands. */
function artState(isDown: boolean, phase: number): "wounded" | "defeated" | undefined {
  if (isDown) return "defeated";
  if (phase >= 3) return "wounded";
  return undefined;
}

function artPose(flinching: boolean, crit: boolean, isDown: boolean) {
  if (isDown) return { scale: 1, x: 0, y: 14, opacity: 0.45 };
  if (flinching && crit) return { scale: 1.1, x: -10, y: 0, opacity: 1 };
  if (flinching) return { scale: 1.06, x: -6, y: 0, opacity: 1 };
  return { scale: 1, x: 0, y: 0, opacity: 1 };
}

/**
 * Enrage does something now. It used to be a colour and a label: phase 4 tinted the art redder
 * and printed "ENRAGED!", and nothing about the fight changed. The rim breathes instead, which
 * is the one thing a cornered monster can do that costs the hero nothing — deliberately not a
 * change to the maths, because a fitness app should not make the last session of a campaign
 * harder than the ones that earned it.
 */
function useEnragePulse(isEnraged: boolean, reducedMotion: boolean): boolean {
  const [pulse, setPulse] = useState(false);
  useEffect(() => {
    if (!isEnraged || reducedMotion) {
      setPulse(false);
      return;
    }
    const id = setInterval(() => setPulse((p) => !p), PULSE_MS);
    return () => clearInterval(id);
  }, [isEnraged, reducedMotion]);
  return pulse;
}

/**
 * The boss fight's arena — the monster owning the screen, with its health at the screen's edge.
 *
 * It was a rounded, bordered, shadowed card inset at `px="$4"`, with art capped at
 * `min(width × 0.5, height × 0.28)` — 195 px next to the 354 px `ExerciseHero` on the other branch
 * of the same screen. The subject of the screen was its second-largest image, and the two branches
 * spoke two visual languages while `docs/design/design-system.md` §"Art heroes" documented one and
 * named both components as its users.
 *
 * This is that recipe: full width, no border, no inset, running under the status bar, with text
 * held by gradient scrims rather than by a box. Same slot and same size as `ExerciseHero`
 * (`sessionArtHeight`), so the session column is no taller than before and the footer CTA stays
 * reachable — see the vertical budget in `docs/screens/session.md`.
 *
 * The exercise you are performing comes in as `children` and sits on the scrim over the art's
 * base, so both images are on screen at once instead of the movement shrinking to a 52 px chip.
 */
export function BossArena({
  currentHp,
  totalHp,
  bossName,
  bossImagePath,
  tier = 0,
  shiny = false,
  weaknessMuscle,
  resistanceMuscle,
  lastDamage,
  children,
}: BossArenaProps) {
  const { t } = useTranslation();
  const { width, height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const reducedMotion = useReducedMotion();

  const hpPercent = getHpPercent(currentHp, totalHp);
  const phase = getPhaseFromHp(hpPercent);
  const look = getPhaseLook(phase);
  const isEnraged = phase === 4;
  // Felled mid-session (the last set landed the kill): the fight is over but the arena is still
  // on screen — the monster goes down instead of standing at 0 HP as if nothing happened.
  const isDown = currentHp <= 0;
  const hpColor = isEnraged || isDown ? "$error" : hpPercent < 50 ? "$secondary" : "$success";

  const trailHp = useDamageTrail(currentHp, reducedMotion);
  const { showDamage, flinching } = useHitReaction(lastDamage, reducedMotion);
  const pulse = useEnragePulse(isEnraged && !isDown, reducedMotion);
  const [expanded, setExpanded] = useState(false);

  const artHeight = sessionArtHeight(width, height, "boss");
  const trailPercent = getHpPercent(trailHp, totalHp);
  // The shiny floor keeps the gold visible even at phase 1, where the red rim would be off.
  const rimOpacity = Math.max(pulse ? look.rim * 0.55 : look.rim, shiny ? 0.25 : 0);
  const rimColor = shiny ? rawColors.resourceGold : rawColors.error;
  const quick = reducedMotion ? undefined : ("quick" as const);
  // The monster wears the fight: its fallen painting once the killing set lands, its battle-worn
  // one below 50 %, its legendary form at tier ≥ 1.
  const artSource = getBossAsset(bossImagePath, tier, artState(isDown, phase));
  const pose = artPose(flinching, !!lastDamage?.isCritical, isDown);

  return (
    <YStack
      height={artHeight}
      width="100%"
      position="relative"
      overflow="hidden"
      bg="$surface"
      onPress={() => setExpanded(true)}
      pressStyle={{ opacity: 0.96 }}
      accessibilityRole="imagebutton"
      accessibilityLabel={bossName}
    >
      {/* The painting and its phase treatment move together. The scrims, the HP and the text stay
          put — moving them too would judder the whole screen on every set. The wrapper also plays
          the entrance: the monster arrives with weight instead of just being there, and goes down
          when the killing set lands instead of standing at zero. */}
      <YStack
        position="absolute"
        fullscreen
        scale={pose.scale}
        x={pose.x}
        y={pose.y}
        opacity={pose.opacity}
        transition={reducedMotion ? undefined : ("bouncy" as const)}
        enterStyle={reducedMotion ? undefined : { scale: 1.12, opacity: 0 }}
      >
        <Image
          source={artSource}
          style={{ width: "100%", height: "100%" }}
          contentFit="cover"
          transition={200}
        />

        {/* Darken, do not repaint: the art keeps its own colours, the room loses its light. */}
        <YStack
          position="absolute"
          fullscreen
          bg="$bgDark"
          opacity={look.dim}
          transition="quick"
          pointerEvents="none"
        />

        {/* The rim, and — at phase 4 — its breath. `bouncy` is the slowest spring the config has
            and settles well inside the interval, so the swell reads as breathing rather than as a
            strobe; the opacity lives on this wrapper because a LinearGradient's own style is not
            animatable. A shiny encounter burns gold instead of red — same rim, rarer light.
            ponytail: the rim is horizontal only — it leans on the two scrims below to close the
            vignette top and bottom. Add a second, vertical pass if those edges ever read flat. */}
        <YStack
          position="absolute"
          fullscreen
          opacity={rimOpacity}
          transition={reducedMotion ? undefined : "bouncy"}
          pointerEvents="none"
        >
          <LinearGradient
            colors={[rimColor, "transparent", rimColor]}
            locations={[0, 0.5, 1]}
            start={{ x: 0, y: 0.5 }}
            end={{ x: 1, y: 0.5 }}
            style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0 }}
          />
        </YStack>
      </YStack>

      {/* The hit, as light. Outside the flinch wrapper, so it covers the frame the art moved out
          of instead of moving with it. */}
      <YStack
        position="absolute"
        fullscreen
        bg="$error"
        opacity={flinching ? 0.3 : 0}
        transition={quick}
        pointerEvents="none"
      />

      {/* Top scrim: the HUD sits on painted art with no card behind it, and some of these
          paintings are bright. This is what holds its contrast, not decoration. */}
      <LinearGradient
        colors={[rawColors.bgOverlay, "transparent"]}
        style={{ position: "absolute", top: 0, left: 0, right: 0, height: insets.top + 64 }}
        pointerEvents="none"
      />

      {/* Bottom scrim: ends on the phase colour the screen itself is painted, so the artwork has
          no visible edge — which is the whole point of dropping the border. Kept to the lower
          45 %: at 60 % it climbed past the monster's chest, and between the scrim, the phase dim
          and a palette anchored in near-black, the boss was genuinely hard to see. The name and
          status sit in the bottom ~90px, where the gradient is at full strength anyway. */}
      <LinearGradient
        colors={["transparent", look.bgRaw]}
        locations={[0, 0.85]}
        style={{
          position: "absolute",
          left: 0,
          right: 0,
          bottom: 0,
          height: Math.round(artHeight * 0.45),
        }}
        pointerEvents="none"
      />

      {/* HP as a hairline at the screen's own top edge, the way a game puts a boss bar at the top
          of the world. It was a 10 px bar in a `$bgDark` strip under the picture with a
          right-aligned `450 / 1070` beside it — a caption, not the boss's health. */}
      <YStack position="absolute" t={0} l={0} r={0} height={BAR_HEIGHT} bg="$bgOverlay">
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
          transition={quick}
        />
        <YStack
          testID="boss-hp-fill"
          position="absolute"
          t={0}
          b={0}
          l={0}
          width={`${hpPercent}%`}
          bg={hpColor}
          transition={quick}
        />
      </YStack>

      <YStack position="absolute" b="$3" l="$4" r="$4" gap="$2">
        <XStack items="flex-end" gap="$2">
          <Text
            flex={1}
            fontFamily="$heading"
            fontWeight="700"
            fontSize={28}
            lineHeight={32}
            color="$text"
            numberOfLines={2}
          >
            {bossName}
          </Text>
          <XStack items="baseline" gap="$1">
            <Text fontWeight="700" fontSize={15} color={hpColor} transition="quick">
              {currentHp}
            </Text>
            <Text fontWeight="700" fontSize={12} color="$textSecondary">
              / {totalHp} {t("boss.hp")}
            </Text>
          </XStack>
        </XStack>

        <StatusLine
          isEnraged={isEnraged}
          isDown={isDown}
          weaknessMuscle={weaknessMuscle}
          resistanceMuscle={resistanceMuscle}
        />

        {children}
      </YStack>

      {/* AnimatePresence is what finally lets the burst's exitStyle run: it was conditionally
          mounted with nothing above it, so it faded in and then vanished. Same wrapper as
          components/common/Toast.tsx. */}
      <AnimatePresence>
        {showDamage && !!lastDamage && (
          <YStack
            key="burst"
            position="absolute"
            fullscreen
            items="center"
            justify="center"
            pointerEvents="none"
          >
            <DamageBurst
              damage={lastDamage.damage}
              isCritical={lastDamage.isCritical}
              weaknessBonus={lastDamage.weaknessBonus}
              resistancePenalty={lastDamage.resistancePenalty ?? false}
              reducedMotion={reducedMotion}
            />
          </YStack>
        )}
      </AnimatePresence>

      <ImageViewer
        source={artSource}
        name={bossName}
        visible={expanded}
        onClose={() => setExpanded(false)}
      />
    </YStack>
  );
}

/**
 * One status line that swaps content instead of adding a row: the arena must not change height
 * when the boss enrages, or the CTA below it starts moving mid-workout. Every branch is pinned to
 * the same height for that reason, including the empty one.
 *
 * Resistance shows here alongside weakness. It has always halved damage on the resisted muscle and
 * has never once said so — `resistancePenalty` rode in `DamageResult` and `boss.resistance` sat
 * unused in both locales while the hero lost half a set with no explanation.
 *
 * Icon and muscle name only: "Weakness · chest   Resistance · legs" does not fit at 11 px on a
 * 360 dp screen. The words survive on the row's accessibility label, so nothing is lost to a
 * screen reader.
 */
function StatusLine({
  isEnraged,
  isDown,
  weaknessMuscle,
  resistanceMuscle,
}: {
  isEnraged: boolean;
  isDown?: boolean;
  weaknessMuscle?: MuscleCode | null;
  resistanceMuscle?: MuscleCode | null;
}) {
  const { t } = useTranslation();

  if (isDown) {
    return (
      <XStack items="center" gap="$1" height={16}>
        <Swords size={13} color="$resourceGold" />
        <Text fontSize={11} fontWeight="700" color="$resourceGold" textTransform="uppercase">
          {t("boss.defeated")}
        </Text>
      </XStack>
    );
  }

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

  if (weaknessMuscle || resistanceMuscle) {
    const label = [
      weaknessMuscle && `${t("boss.weakness")} ${t(`muscles.${weaknessMuscle}`)}`,
      resistanceMuscle && `${t("boss.resistance")} ${t(`muscles.${resistanceMuscle}`)}`,
    ]
      .filter(Boolean)
      .join(", ");

    return (
      <XStack items="center" gap="$3" height={16} accessibilityLabel={label}>
        {!!weaknessMuscle && (
          <XStack items="center" gap="$1">
            <Target size={12} color="$secondary" />
            <Text fontSize={11} fontWeight="700" color="$textSecondary" numberOfLines={1}>
              {t(`muscles.${weaknessMuscle}`)}
            </Text>
          </XStack>
        )}
        {!!resistanceMuscle && (
          <XStack items="center" gap="$1">
            <Shield size={12} color="$textSecondary" />
            <Text fontSize={11} fontWeight="700" color="$textSecondary" numberOfLines={1}>
              {t(`muscles.${resistanceMuscle}`)}
            </Text>
          </XStack>
        )}
      </XStack>
    );
  }

  // Held even when empty: the block must not resize once a weakness or an enrage appears.
  return <YStack height={16} />;
}

/**
 * The hit, read at a glance: struck over the middle of the portrait where the blow landed, rather
 * than fading in a corner pill that had nothing to do with the art.
 */
function DamageBurst({
  damage,
  isCritical,
  weaknessBonus,
  resistancePenalty,
  reducedMotion,
}: {
  damage: number;
  isCritical: boolean;
  weaknessBonus: boolean;
  resistancePenalty: boolean;
  reducedMotion: boolean;
}) {
  const { t } = useTranslation();

  return (
    <XStack
      items="center"
      gap="$1"
      px="$3"
      py="$2"
      rounded="$10"
      bg="$bgOverlay"
      borderWidth={1}
      borderColor={isCritical ? "$error" : "$borderStrong"}
      pointerEvents="none"
      transition={reducedMotion ? undefined : "bouncy"}
      enterStyle={reducedMotion ? undefined : { opacity: 0, scale: 0.4 }}
      exitStyle={reducedMotion ? undefined : { opacity: 0, scale: 0.8 }}
    >
      {isCritical ? <Zap size={20} color="$error" /> : <Swords size={16} color="$secondary" />}
      <Text
        fontWeight="700"
        fontSize={isCritical ? 28 : 22}
        color={isCritical ? "$error" : "$text"}
      >
        {isCritical ? `${t("common.crit")} ` : ""}−{damage}
      </Text>
      {!!weaknessBonus && <Target size={16} color="$secondary" />}
      {!!resistancePenalty && <Shield size={16} color="$textSecondary" />}
    </XStack>
  );
}
