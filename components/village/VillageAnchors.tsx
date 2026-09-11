import { useEffect } from "react";
import Animated, {
  Easing,
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from "react-native-reanimated";
import { Text, XStack, YStack } from "tamagui";

import { nameOf } from "@/components/village/rows";
import { rawColors } from "@/constants/rawColors";
import { VILLAGE_ANCHORS } from "@/constants/villageAnchors";
import type { BuildingCode } from "@/db/schema";
import type { VillageBuilding, VillageTier } from "@/db/village";
import type { AppLanguage } from "@/stores/settings";

/**
 * The painting reacting to the training: one spot per building, fixed on the tier's art.
 *
 * A building that stands lights its spot, one that has not been built yet is a dashed circle (a
 * plot, not a padlock), and one that just rose pulses a gold ring twice and carries its name. The
 * spots live in `constants/villageAnchors.ts`, placed by eye on each painting; a building with no
 * spot on this tier simply is not drawn, which the list below the painting makes up for.
 *
 * Transform and opacity only, on the UI thread, and nothing moves under reduced motion: the lights
 * stay lit, the ring and the smoke are not mounted at all.
 */

/** Buildings with a fire in them: their spot smokes once they stand. */
const SMOKES: ReadonlySet<BuildingCode> = new Set(["campfire", "forge"]);

type Props = {
  tier: VillageTier;
  buildings: VillageBuilding[];
  risen: ReadonlySet<BuildingCode>;
  language: AppLanguage;
  reducedMotion: boolean;
};

export function VillageAnchors({ tier, buildings, risen, language, reducedMotion }: Props) {
  const byCode = new Map(buildings.map((b) => [b.code, b]));
  return (
    <YStack position="absolute" t={0} l={0} r={0} b={0} pointerEvents="none">
      {VILLAGE_ANCHORS[tier].map((anchor) => {
        const building = byCode.get(anchor.code);
        if (!building) return null;
        const lit = building.level > 0;
        const isRisen = risen.has(anchor.code);
        return (
          <YStack
            key={anchor.code}
            testID={`village-anchor-${anchor.code}`}
            position="absolute"
            width={30}
            height={30}
            items="center"
            justify="center"
            style={{ left: `${anchor.x}%`, top: `${anchor.y}%`, marginLeft: -15, marginTop: -15 }}
          >
            {lit ? <Light big={isRisen} seed={anchor.x} still={reducedMotion} /> : <Plot />}
            {isRisen && !reducedMotion ? <Ring /> : null}
            {lit && SMOKES.has(anchor.code) && !reducedMotion ? <Smoke seed={anchor.y} /> : null}
            {isRisen ? <Label text={`${nameOf(building, language)} ${building.level}`} /> : null}
          </YStack>
        );
      })}
    </YStack>
  );
}

function Light({ big, seed, still }: { big: boolean; seed: number; still: boolean }) {
  const t = useSharedValue(0);
  useEffect(() => {
    if (still) return;
    // A different period per spot, from its position, so the village does not breathe in unison.
    t.value = withRepeat(
      withTiming(1, { duration: 3400 + (seed % 7) * 300, easing: Easing.inOut(Easing.sin) }),
      -1,
      true,
    );
  }, [t, seed, still]);
  const halo = useAnimatedStyle(() => ({
    opacity: interpolate(t.value, [0, 1], [0.22, 0.42]),
    transform: [{ scale: interpolate(t.value, [0, 1], [1, 1.12]) }],
  }));
  const size = big ? 16 : 10;
  return (
    <>
      <Animated.View
        style={[
          {
            position: "absolute",
            width: size * 2.4,
            height: size * 2.4,
            borderRadius: size * 1.2,
            backgroundColor: rawColors.resourceGold,
            opacity: 0.3,
          },
          halo,
        ]}
      />
      <YStack width={size} height={size} rounded={size / 2} bg="$resourceGold" opacity={0.95} />
    </>
  );
}

function Plot() {
  return (
    <YStack
      width={11}
      height={11}
      rounded={6}
      borderWidth={1.5}
      borderStyle="dashed"
      borderColor="$textSecondary"
      bg="$bgOverlaySoft"
    />
  );
}

/** Twice, then gone: the building that just rose is announced, not decorated. */
function Ring() {
  const t = useSharedValue(0);
  useEffect(() => {
    t.value = withRepeat(withTiming(1, { duration: 1600, easing: Easing.out(Easing.quad) }), 2);
  }, [t]);
  const style = useAnimatedStyle(() => ({
    opacity: interpolate(t.value, [0, 0.35, 1], [0, 1, 0]),
    transform: [{ scale: interpolate(t.value, [0, 1], [0.6, 1.9]) }],
  }));
  return (
    <Animated.View
      style={[
        {
          position: "absolute",
          width: 44,
          height: 44,
          borderRadius: 22,
          borderWidth: 1.5,
          borderColor: rawColors.resourceGold,
        },
        style,
      ]}
    />
  );
}

function Smoke({ seed }: { seed: number }) {
  const t = useSharedValue(0);
  useEffect(() => {
    t.value = withRepeat(
      withTiming(1, { duration: 3200 + (seed % 5) * 400, easing: Easing.out(Easing.quad) }),
      -1,
    );
  }, [t, seed]);
  const style = useAnimatedStyle(() => ({
    opacity: interpolate(t.value, [0, 0.3, 1], [0, 0.45, 0]),
    transform: [
      { translateY: interpolate(t.value, [0, 1], [4, -34]) },
      { scale: interpolate(t.value, [0, 1], [0.8, 1.6]) },
    ],
  }));
  return (
    <Animated.View
      style={[
        {
          position: "absolute",
          bottom: 16,
          width: 10,
          height: 10,
          borderRadius: 5,
          backgroundColor: rawColors.text,
        },
        style,
      ]}
    />
  );
}

/** Centred under a 30-wide spot: (30 - 140) / 2. */
function Label({ text }: { text: string }) {
  return (
    <YStack position="absolute" t={24} width={140} items="center" style={{ left: -55 }}>
      <XStack
        px={7}
        py={2}
        rounded={999}
        bg="$bgOverlay"
        borderWidth={1}
        borderColor="$resourceGold"
      >
        <Text fontSize={10} fontWeight="600" color="$resourceGold" numberOfLines={1}>
          {text}
        </Text>
      </XStack>
    </YStack>
  );
}
