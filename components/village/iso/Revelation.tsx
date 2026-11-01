// What a stage's reveal throws (T41, E2, revelation.ts): from the building that rose, twelve small warm
// points born at its roof, staggered and rimmed in brown, climbing then falling under gravity and shrinking out; and,
// from the impact, a soft ring of golden light that follows the building's real footprint (a
// diamond) out over the ground, with a puff of dust at each of the four corners. No hard line: the
// ring is three layered strokes, wide and faint to narrow, the dust has no outline. One animated
// node each (a path and its props), on the reveal's own timing (0 to ONDE_MS), all mounted by
// IsoCroissance only while the layer plays: nothing at rest, nothing in reduced motion (the layer
// is not mounted then). The line of the story fades in 6 dp lower and out (LegendeRevelation).

import { useContext, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { AccessibilityInfo, Text, View } from "react-native";
import Animated, {
  Easing,
  type SharedValue,
  useAnimatedProps,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withSequence,
  withTiming,
} from "react-native-reanimated";
import { SafeAreaInsetsContext } from "react-native-safe-area-context";
import Svg, { Path } from "react-native-svg";
import { rawColors } from "@/constants/rawColors";
import type { BuildingCode } from "@/db/schema";
import type { Rect } from "./carteDemo";
import { accrochesDe } from "./feux";
import { sommetDp } from "./fierte";
import { useMouvementReduit } from "./fige";
import type { SpriteIso, Stade } from "./isoSpec";
import {
  anneauChemin,
  anneauOnde,
  coinsEmprise,
  ECHELLE_BITMAP,
  eclatDe,
  LEGENDE_DEBUT_MS,
  LEGENDE_ECART,
  LEGENDE_ENTREE_MS,
  LEGENDE_MONTEE_DP,
  LEGENDE_MS,
  LEGENDE_SORTIE_MS,
  POINTS_H,
  POINTS_L,
  PORTEE_DP,
  placeLegende,
  pointsChemin,
  poussiereChemin,
  poussiereOnde,
  RevelationContext,
} from "./revelation";

const ABSOLU = { position: "absolute" } as const;
/** The ring's widest (faintest) stroke, dp; the two inside it are narrower and warmer. */
const TRAIT = 40;
const TRAITS = [
  { largeur: TRAIT, opacite: 0.22 },
  { largeur: 22, opacite: 0.35 },
  { largeur: 9, opacite: 0.5 },
] as const;
/** By day the ring is the warm lamp gold and a third stronger (H4-05): the pale gold sank into the sand. */
const RENFORT_JOUR = 1.35;
const LISERE = {
  stroke: rawColors.isoPierreChaudeSombre,
  strokeWidth: 0.9,
  strokeLinejoin: "round",
} as const;
const AnimatedPath = Animated.createAnimatedComponent(Path);

/** The burst: small warm points born at the top of the painting (the hearth for embers). */
export function EclatRevelation({
  code,
  stade,
  s,
  corps,
  t,
}: {
  code: BuildingCode;
  stade: Stade;
  s: SpriteIso;
  corps: Rect;
  t: SharedValue<number>;
}) {
  const e = eclatDe(code);
  const k = corps.w / s.size[0];
  const foyer = e.genre === "braise" ? accrochesDe(code, stade)?.foyer : undefined;
  const p = foyer
    ? ([corps.x + foyer.px[0] * k, corps.y + foyer.px[1] * k] as const)
    : (sommetDp(s, corps) ?? ([corps.x + corps.w / 2, corps.y] as const));
  const clair = useAnimatedProps(() => ({ d: pointsChemin(t.get(), 0) }));
  const chaud = useAnimatedProps(() => ({ d: pointsChemin(t.get(), 1) }));
  return (
    <View
      pointerEvents="none"
      testID={`iso-revelation-eclat-${code}`}
      style={{
        ...ABSOLU,
        left: p[0] - POINTS_L / 2,
        top: p[1] - (POINTS_H - 12),
        width: POINTS_L,
        height: POINTS_H,
      }}
    >
      <Svg width={POINTS_L} height={POINTS_H}>
        {/* A brown rim (anim-32): a pale gold point alone vanishes on sunlit sand. */}
        <AnimatedPath fill={rawColors[e.tons[0]]} {...LISERE} animatedProps={clair} />
        <AnimatedPath fill={rawColors[e.tons[1]]} {...LISERE} animatedProps={chaud} />
      </Svg>
    </View>
  );
}

/**
 * The golden ring and the dust on the ground, from the building's footprint (`code`'s corners; the
 * box is centred on its centre, `pied`, map dp) out to PORTEE_DP.
 */
export function AnneauRevelation({
  code,
  pied,
  t,
}: {
  code: BuildingCode;
  pied: readonly [number, number];
  t: SharedValue<number>;
}) {
  const coins = coinsEmprise(code);
  const jour = useContext(RevelationContext)?.jour === true;
  const anneau = useAnimatedProps(() => {
    const a = anneauOnde(t.get());
    return { d: anneauChemin(coins, a.echelle, PORTEE_DP - TRAIT / 2), strokeOpacity: a.opacite };
  });
  const poussiere = useAnimatedProps(() => {
    const p = poussiereOnde(t.get());
    return {
      d: poussiereChemin(coins, p.derive),
      fillOpacity: p.opacite,
    };
  });
  // The paths grow by their own points and fade by their own opacity: no transform scale on them
  // (the stroke would swell) and no opacity on a parent view (an offscreen layer). The scale below
  // is static and holds the whole drawing.
  const e = ECHELLE_BITMAP;
  return (
    // Centred on the foot: the scale turns about the middle, so the enlarged box lands on PORTEE_DP.
    <View
      pointerEvents="none"
      style={{
        ...ABSOLU,
        left: pied[0] - PORTEE_DP * e,
        top: pied[1] - (PORTEE_DP * e) / 2,
        width: 2 * PORTEE_DP * e,
        height: PORTEE_DP * e,
        transform: [{ scale: 1 / e }],
      }}
    >
      <Svg
        width={2 * PORTEE_DP * e}
        height={PORTEE_DP * e}
        viewBox={`0 0 ${2 * PORTEE_DP} ${PORTEE_DP}`}
      >
        {/* Layered strokes, wide and faint to narrow: a soft edge, no sharp line. */}
        {TRAITS.map((x, i) => (
          <AnimatedPath
            key={x.largeur}
            testID={i === 0 ? "iso-revelation-onde" : undefined}
            fill="none"
            stroke={jour ? rawColors.isoLueur : rawColors.resourceGold}
            strokeWidth={x.largeur}
            strokeLinejoin="round"
            animatedProps={anneau}
            opacity={Math.min(1, x.opacite * (jour ? RENFORT_JOUR : 1))}
          />
        ))}
        <AnimatedPath
          testID="iso-revelation-poussiere"
          fill={jour ? rawColors.isoPoussiereJour : rawColors.isoPoussiere}
          animatedProps={poussiere}
        />
      </Svg>
    </View>
  );
}

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
