// The story line that closes a growth (the moment itself is IsoCroissance, moment.ts): one line of
// the building story in an inked parchment cartouche, once per stage and building. The gold
// burst and the ring across the island are gone from the moment.

import { useContext, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { AccessibilityInfo, Text, View } from "react-native";
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withSequence,
  withTiming,
} from "react-native-reanimated";
import { SafeAreaInsetsContext } from "react-native-safe-area-context";
import { rawColors } from "@/constants/rawColors";
import type { BuildingCode } from "@/db/schema";
import { useMouvementReduit } from "./fige";
import type { Stade } from "./isoSpec";
import {
  LEGENDE_DEBUT_MS,
  LEGENDE_ECART,
  LEGENDE_ENTREE_MS,
  LEGENDE_MONTEE_DP,
  LEGENDE_MS,
  LEGENDE_SORTIE_MS,
  placeLegende,
} from "./revelation";

const ABSOLU = { position: "absolute" } as const;

/** Where the caption goes: over the building's top when it fits, else at the bottom of the frame. */
export type PlaceLegende = {
  /** The top of the building that rose, in the frame's dp, read when the line shows (the camera has settled); null when unknown. */
  ancre: () => readonly [number, number] | null;
  /** The frame, dp, and the height its bottom leaves to the village title. */
  w: number;
  h: number;
  bas?: number;
};

/**
 * The comic caption of the moment: one line of the building's story in an inked parchment
 * cartouche, set by the building that rose (T4-06, anim-33), from LEGENDE_DEBUT_MS for LEGENDE_MS,
 * then `onFin`. Still drawings, no node; the owner mounts it once per growth and not in reduced
 * motion. The line is copy (`village.iso.legende.<code>.<stade>`).
 */
export function LegendeRevelation({
  legende,
  onFin,
  place,
}: {
  legende: { cle: string; code: BuildingCode; stade: Stade } | null;
  onFin: () => void;
  place?: PlaceLegende;
}) {
  return legende ? (
    <Legende
      key={legende.cle}
      code={legende.code}
      stade={legende.stade}
      onFin={onFin}
      place={place}
    />
  ) : null;
}

function Legende({
  code,
  stade,
  onFin,
  place,
}: {
  code: BuildingCode;
  stade: Stade;
  onFin: () => void;
  place?: PlaceLegende;
}) {
  const { t } = useTranslation();
  const [vue, setVue] = useState(false);
  const [point, setPoint] = useState<readonly [number, number] | null>(null);
  // biome-ignore lint/correctness/useExhaustiveDependencies: the timers run once per mount; the owner keys the caption by growth
  useEffect(() => {
    const ids = [
      setTimeout(() => {
        // Read once, when it shows: the slide toward the building is over by then (GLISSE_MS).
        setPoint(place?.ancre() ?? null);
        setVue(true);
      }, LEGENDE_DEBUT_MS),
      setTimeout(onFin, LEGENDE_DEBUT_MS + LEGENDE_MS),
    ];
    return () => {
      for (const id of ids) clearTimeout(id);
    };
  }, []);
  // The status bar's height (H2-01); null without a provider (a test, a capture), then 0.
  const haut = useContext(SafeAreaInsetsContext)?.top ?? 0;
  const texte = t(`village.iso.legende.${code}.${stade}`);
  // The map hides its descendants from the reader (it has its own list), so the line is spoken here.
  useEffect(() => {
    if (vue) AccessibilityInfo.announceForAccessibility(texte);
  }, [vue, texte]);
  // In 200 ms, 6 dp higher; out over the last 300 ms of its time (no reduced-motion case: the owner
  // does not mount the line then).
  const opacite = useSharedValue(0);
  const reduit = useMouvementReduit();
  useEffect(() => {
    if (!vue) return;
    if (reduit) {
      opacite.set(1);
      return;
    }
    opacite.set(
      withSequence(
        withTiming(1, { duration: LEGENDE_ENTREE_MS, easing: Easing.out(Easing.cubic) }),
        withDelay(
          LEGENDE_MS - LEGENDE_ENTREE_MS - LEGENDE_SORTIE_MS,
          withTiming(0, { duration: LEGENDE_SORTIE_MS }),
        ),
      ),
    );
  }, [vue, opacite, reduit]);
  const style = useAnimatedStyle(() => ({
    opacity: opacite.get(),
    transform: [{ translateY: LEGENDE_MONTEE_DP * (1 - Math.min(1, opacite.get() * 1.0)) }],
  }));
  if (!vue) return null;
  const boite = place
    ? placeLegende(point, place, haut)
    : { left: 16, right: 16, top: haut + LEGENDE_ECART };
  return (
    <Animated.View
      pointerEvents="none"
      testID="iso-legende-revelation"
      role="status"
      accessibilityLiveRegion="polite"
      style={[{ ...ABSOLU, ...boite, alignItems: "center" }, style]}
    >
      {/* An inked cartouche: a dark frame round a parchment strip with a fine inner rule. */}
      <View
        style={{
          backgroundColor: rawColors.isoInk,
          borderRadius: 5,
          padding: 2,
        }}
      >
        <View
          style={{
            backgroundColor: rawColors.parchment,
            borderColor: rawColors.isoPierreChaudeSombre,
            borderWidth: 1,
            borderRadius: 3,
            paddingHorizontal: 14,
            paddingVertical: 6,
          }}
        >
          {/* The app's display face (Tamagui's `heading`, the bubbles' and sheets' titles), not the
              system sans. Named by its loaded face: the map renders outside Tamagui's provider in tests. */}
          <Text
            style={{
              color: rawColors.isoInk,
              fontFamily: "Alegreya_700Bold",
              fontSize: 16,
              lineHeight: 21,
              textAlign: "center",
            }}
          >
            {texte}
          </Text>
        </View>
      </View>
    </Animated.View>
  );
}
