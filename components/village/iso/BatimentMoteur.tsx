// The buildings engine's layers around one building (PROMPT.md §6, §9.4): add-ons, the site
// teaser, the gag slot, light points, the night-only sprite, the clan mark, the keeper, and the two
// moments (stade, rang) that play over them. The building's own sprite is the `children`: the
// engine bounces it, it never hides it (the body is on screen at every frame, scale 0.94 at the
// lowest).
//
// Nothing here is tappable: every layer is `pointerEvents="none"`, lights are not targets, and the
// map's touch and "ready" lists (tapBatiment.ts, reclame.ts) do not know this file. A moment starts
// only when the parent hands over a `spectacle`, which it does from a tap (useSpectacleBatiment).
// With `actif` off (BATIMENT_MOTEUR, the default) this renders its children and nothing else.
//
// shortcut: every `sprite` is drawn as a flat placeholder piece. The test building has no art; when
// a building's paintings land, a path-to-require table goes here and the placeholder stays as the
// fallback. Lights pulse on the UI thread, one node each, and stand still with reduced motion.

import { type ReactNode, useEffect, useRef, useState } from "react";
import { View } from "react-native";
import Animated, {
  Easing,
  type SharedValue,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from "react-native-reanimated";
import Svg, { Circle, Path } from "react-native-svg";
import type { BuildingData, Point } from "@/constants/buildingData";
import type { StageRule } from "@/constants/buildingStages";
import { rawColors } from "@/constants/rawColors";
import { BATIMENT_MOTEUR, etatBatiment, type Marque } from "./batiment";
import { useMouvementReduit } from "./fige";
import {
  echelleCorps,
  etapeA,
  gonflePoussiere,
  type PlanSpectacle,
  rangsA,
  sautGardien,
} from "./spectacleBatiment";

export type SpectacleEnCours = { cle: string; plan: PlanSpectacle };

/** Placeholder sizes, dp at the canvas scale: add-ons 10 or more, teasers 16 or more, figures 14 or more. */
const TAILLE = {
  addOn: 12,
  teaser: 18,
  gag: 16,
  gardien: 14,
  nuit: 20,
  echafaudage: 40,
  poussiere: 22,
};

function Piece({
  testID,
  at,
  k,
  taille,
  couleur,
}: {
  testID: string;
  at: Point;
  k: number;
  taille: number;
  couleur: string;
}) {
  const t = taille * k;
  return (
    <View
      pointerEvents="none"
      testID={testID}
      style={{
        position: "absolute",
        left: at[0] * k - t / 2,
        top: at[1] * k - t / 2,
        width: t,
        height: t,
        backgroundColor: couleur,
      }}
    />
  );
}

/** The clan mark: fixed Bati red, never the player's colours for now. Static, a drawing. */
const MARQUE_DESSIN: Record<Marque, { w: number; h: number; d: string }> = {
  fanion: { w: 16, h: 12, d: "M0 0 L16 5 L0 10 Z" },
  banniere: { w: 12, h: 20, d: "M0 0 H12 V20 L6 15 L0 20 Z" },
  blasonSculpte: { w: 14, h: 22, d: "M0 0 H14 V10 Q14 18 7 22 Q0 18 0 10 Z" },
  blasonLumineux: { w: 14, h: 22, d: "M0 0 H14 V10 Q14 18 7 22 Q0 18 0 10 Z" },
};

function MarqueClan({ marque, at, k }: { marque: Marque; at: Point; k: number }) {
  const m = MARQUE_DESSIN[marque];
  const pierre = marque === "blasonSculpte";
  const lumineux = marque === "blasonLumineux";
  return (
    <Svg
      pointerEvents="none"
      testID={`batiment-marque-${marque}`}
      width={m.w * k}
      height={m.h * k}
      viewBox={`-4 -4 ${m.w + 8} ${m.h + 8}`}
      style={{ position: "absolute", left: at[0] * k - (m.w * k) / 2, top: at[1] * k }}
    >
      {lumineux ? (
        <Circle
          cx={m.w / 2}
          cy={m.h / 2}
          r={m.h / 2 + 2}
          fill={rawColors.isoLueur}
          opacity={0.35}
        />
      ) : null}
      <Path
        d={m.d}
        fill={pierre ? rawColors.isoPierreChaudeMoyen : rawColors.isoFanion}
        stroke={lumineux ? rawColors.isoLueur : rawColors.isoPierreChaudeSombre}
        strokeWidth={1}
      />
    </Svg>
  );
}

function Lueur({
  kind,
  at,
  k,
  reduit,
}: {
  kind: "fire" | "crystal" | "beam";
  at: Point;
  k: number;
  reduit: boolean;
}) {
  const v = useSharedValue(0);
  useEffect(() => {
    if (reduit) {
      v.set(0);
      return;
    }
    v.set(
      withRepeat(withTiming(1, { duration: 1600, easing: Easing.inOut(Easing.quad) }), -1, true),
    );
  }, [reduit, v]);
  const pulse = useAnimatedStyle(() => ({ transform: [{ scale: 0.85 + 0.3 * v.get() }] }));
  const [w, h] = kind === "beam" ? [3, 16] : kind === "fire" ? [10, 10] : [8, 8];
  return (
    <Animated.View
      pointerEvents="none"
      testID={`batiment-lueur-${kind}`}
      style={[
        {
          position: "absolute",
          left: at[0] * k - (w * k) / 2,
          top: at[1] * k - (h * k) / 2,
          width: w * k,
          height: h * k,
          borderRadius: kind === "beam" ? 0 : (w * k) / 2,
          backgroundColor: rawColors.isoLueur,
        },
        pulse,
      ]}
    />
  );
}

export type PropsBatiment = {
  data: BuildingData;
  rank: number;
  /** The rank of the building an upgrade extends (rule B). */
  baseRank?: number;
  nuit?: boolean;
  rule?: StageRule;
  /** The building's canvas in dp at the map's scale, and the anchor on the ground in canvas px. */
  corps: { w: number; h: number };
  ancre: Point;
  /** dp per canvas px. */
  echelle?: number;
  spectacle?: SpectacleEnCours;
  /** Called once when a moment is over (at once with reduced motion). */
  onFini?: (cle: string) => void;
  actif?: boolean;
  /** The building's own sprite. */
  children: ReactNode;
};

export function BatimentMoteur({ actif = BATIMENT_MOTEUR, children, ...p }: PropsBatiment) {
  if (!actif) return <>{children}</>;
  return <Moteur {...p}>{children}</Moteur>;
}

type Etat = ReturnType<typeof etatBatiment>;
type Echelle = { k: number; ancre: Point };

/** The flat pieces: add-ons, teaser, scaffold, the gag slot (one thing at a time) and the night sprite. */
function Pieces({ etat, chantier, k, ancre }: { etat: Etat; chantier: boolean } & Echelle) {
  const decale = (o: Point): Point => [ancre[0] + o[0], ancre[1] + o[1]];
  const piece = (id: string, at: Point, taille: number, couleur: string) => (
    <Piece key={id} testID={id} at={at} k={k} taille={taille} couleur={couleur} />
  );
  const { teaser, gag, gagSlot, nightSprite } = etat;
  return (
    <>
      {etat.addOns
        .filter((a) => a.layer === "front")
        .map((a) =>
          piece(
            `batiment-addon-${a.rank}`,
            decale(a.anchorOffset),
            TAILLE.addOn,
            rawColors.isoPierreChaudeClair,
          ),
        )}
      {teaser
        ? piece(
            "batiment-teaser",
            decale(teaser.anchorOffset),
            TAILLE.teaser,
            rawColors.isoVocationBois,
          )
        : null}
      {chantier
        ? piece("batiment-echafaudage", ancre, TAILLE.echafaudage, rawColors.isoVocationBois)
        : null}
      {/* The gag slot holds one thing: the build gag during the scaffold, else the rank's beat. */}
      {gagSlot && (chantier || gag)
        ? piece(
            chantier ? "batiment-gag-chantier" : `batiment-gag-${gag?.rank}`,
            gagSlot,
            TAILLE.gag,
            rawColors.isoPierreChaudeMoyen,
          )
        : null}
      {nightSprite
        ? piece("batiment-nuit", decale(nightSprite.anchorOffset), TAILLE.nuit, rawColors.isoEclat)
        : null}
    </>
  );
}

function Gardien({
  at,
  k,
  plan,
  h,
  trace,
}: {
  at: Point;
  k: number;
  plan: PlanSpectacle | undefined;
  h: SharedValue<number>;
  /** Reduced motion keeps the moment: the keeper stays on its reaction pose after the new rank lands. */
  trace: boolean;
}) {
  const saut = useAnimatedStyle(() => ({
    transform: [{ translateY: plan ? -sautGardien(plan, h.get()) : 0 }],
  }));
  return (
    <Animated.View
      pointerEvents="none"
      testID={trace ? "batiment-gardien-reagit" : "batiment-gardien"}
      style={[
        {
          position: "absolute",
          left: at[0] * k - (TAILLE.gardien * k) / 2,
          top: at[1] * k - (TAILLE.gardien * k) / 2,
          width: TAILLE.gardien * k,
          height: TAILLE.gardien * k,
          backgroundColor: rawColors.isoFanion,
        },
        trace ? { transform: [{ translateY: -4 }] } : saut,
      ]}
    />
  );
}

function Poussiere({
  plan,
  h,
  nuit,
  k,
  ancre,
}: {
  plan: PlanSpectacle;
  h: SharedValue<number>;
  nuit: boolean;
} & Echelle) {
  const gonfle = useAnimatedStyle(() => ({
    transform: [{ scale: gonflePoussiere(plan, h.get()) }],
  }));
  const t = TAILLE.poussiere * k;
  return (
    <Animated.View
      pointerEvents="none"
      testID="batiment-poussiere"
      style={[
        {
          position: "absolute",
          left: ancre[0] * k - t / 2,
          top: ancre[1] * k - t / 2,
          width: t,
          height: t,
          borderRadius: t,
          backgroundColor: nuit ? rawColors.isoPoussiere : rawColors.isoPoussiereJour,
        },
        gonfle,
      ]}
    />
  );
}

/**
 * The step a moment is at, as the ms where it started (0 before it, the total after it), and the
 * clock `h` that drives the body's bounce. Reduced motion lands on the end at once. `onFini` is left
 * out of the dependencies on purpose: a parent's inline callback is new at every render and would
 * restart the timers of a moment that is playing.
 */
function useMoment(
  spectacle: SpectacleEnCours | undefined,
  reduitApp: boolean,
  onFini: ((cle: string) => void) | undefined,
) {
  const plan = spectacle?.plan;
  const cle = spectacle?.cle;
  const [marche, setMarche] = useState<{ cle: string; t: number } | undefined>(undefined);
  const h = useSharedValue(0);
  const dit = useRef<string | undefined>(undefined);
  // biome-ignore lint/correctness/useExhaustiveDependencies: see above
  useEffect(() => {
    if (!plan || cle === undefined) return;
    const fini = () => {
      if (dit.current === cle) return;
      dit.current = cle;
      onFini?.(cle);
    };
    h.set(0);
    if (plan.reduit || reduitApp) {
      setMarche({ cle, t: plan.total });
      fini();
      return;
    }
    h.set(withTiming(plan.total, { duration: plan.total, easing: Easing.linear }));
    const ids = plan.etapes.map((e) => setTimeout(() => setMarche({ cle, t: e.debut }), e.debut));
    ids.push(
      setTimeout(() => {
        setMarche({ cle, t: plan.total });
        fini();
      }, plan.total),
    );
    return () => {
      for (const id of ids) clearTimeout(id);
    };
  }, [plan, cle, reduitApp, h]);
  // Read only for its own key, so a new moment starts at 0.
  return { t: cle !== undefined && marche?.cle === cle ? marche.t : 0, h };
}

function Moteur({
  data,
  rank,
  baseRank = 0,
  nuit = false,
  rule,
  corps,
  ancre,
  echelle: k = 1,
  spectacle,
  onFini,
  children,
}: Omit<PropsBatiment, "actif">) {
  const reduitApp = useMouvementReduit();
  const plan = spectacle?.plan;
  const { t, h } = useMoment(spectacle, reduitApp, onFini);
  const rangs = plan ? rangsA(plan, t) : { corps: rank, marque: rank };
  const options = { baseRank, nuit, rule };
  const etat = etatBatiment(data, rangs.corps, options);
  const marque = etatBatiment(data, rangs.marque, options).marque;
  const styleCorps = useAnimatedStyle(() => ({
    transform: [{ scale: plan ? echelleCorps(plan, h.get()) : 1 }],
  }));
  const decale = (o: Point): Point => [ancre[0] + o[0], ancre[1] + o[1]];
  return (
    <View style={{ width: corps.w * k, height: corps.h * k }}>
      {etat.addOns
        .filter((a) => a.layer === "behind")
        .map((a) => (
          <Piece
            key={a.rank}
            testID={`batiment-addon-${a.rank}`}
            at={decale(a.anchorOffset)}
            k={k}
            taille={TAILLE.addOn}
            couleur={rawColors.isoPierreChaudeSombre}
          />
        ))}
      <Animated.View
        testID="batiment-corps"
        style={[
          {
            width: corps.w * k,
            height: corps.h * k,
            transformOrigin: `${ancre[0] * k}px ${ancre[1] * k}px`,
          },
          styleCorps,
        ]}
      >
        {children}
      </Animated.View>
      <Pieces
        etat={etat}
        chantier={!!plan && etapeA(plan, t) === "echafaudage"}
        k={k}
        ancre={ancre}
      />
      {etat.lights.map((l) => (
        <Lueur key={`${l.kind}-${l.fromRank}`} kind={l.kind} at={l.at} k={k} reduit={reduitApp} />
      ))}
      {marque && etat.marqueAt ? <MarqueClan marque={marque} at={etat.marqueAt} k={k} /> : null}
      {etat.gardien ? (
        <Gardien
          at={etat.gardien.at}
          k={k}
          plan={plan}
          h={h}
          trace={!!plan && (plan.reduit || reduitApp)}
        />
      ) : null}
      {plan && !plan.reduit && !reduitApp ? (
        <Poussiere plan={plan} h={h} nuit={nuit} k={k} ancre={ancre} />
      ) : null}
    </View>
  );
}
