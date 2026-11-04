// One stretch of castle_wall's wall on the map (FIN-DIS, rempart.ts), one element of the depth order:
// its painted pieces (F4), one image a cell in gx + gy order, by day or by night as the light says;
// or, behind `PANS_VECTORIELS`, the app's static Svg, its layers filled and inked back to front. No
// animated node at rest; a tap on it is read by the village screen through tapBatiment.ts `cibles`,
// as a tap on the wall.

import { Image } from "expo-image";
import type { ReactElement, ReactNode } from "react";
import { useEffect, useState } from "react";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withTiming,
} from "react-native-reanimated";
import Svg, { Path } from "react-native-svg";
import { rawColors } from "@/constants/rawColors";
import { ecranXY } from "./carteDemo";
import { useDump } from "./dumpSprites";
import { useMouvementReduit } from "./fige";
import type { Case } from "./isoLayout";
import type { Ambiance, Stade } from "./isoSpec";
import { ECHANGE_MS } from "./moment";
import { dessinPans, PANS_VECTORIELS, type PiecePeinte, piecesPeintes } from "./rempart";

/** The bible's ink: 8 px of outline at S, 1 dp here; an edge two faces share shows about half. */
const TRAIT = 1.1;

/** Wood by night is the day's, darkened; stone keeps its night blues, and warms by day (the bible's warm stone). */
const TONS = {
  roughJour: {
    haut: rawColors.isoRempartBoisCoupe,
    clair: rawColors.isoRempartBoisClair,
    sombre: rawColors.isoRempartBoisSombre,
  },
  roughNuit: {
    haut: rawColors.isoRempartBoisNuitCoupe,
    clair: rawColors.isoRempartBoisNuitClair,
    sombre: rawColors.isoRempartBoisNuitSombre,
  },
  solidJour: {
    haut: rawColors.isoPierreChaudeClair,
    clair: rawColors.isoPierreChaudeMoyen,
    sombre: rawColors.isoPierreChaudeSombre,
  },
  solidNuit: {
    haut: rawColors.isoRempartPierreHaut,
    clair: rawColors.isoRempartPierreClair,
    sombre: rawColors.isoRempartPierreSombre,
  },
} as const;

// Metro needs every require spelled out: one line per file, day and night.
const PIECES: Record<PiecePeinte["nom"], { jour: number; nuit: number }> = {
  rough_corner: {
    jour: require("@/assets/images/village/iso/rempart/rough_corner.webp"),
    nuit: require("@/assets/images/village/iso/rempart/rough_corner.nuit.webp"),
  },
  rough_end: {
    jour: require("@/assets/images/village/iso/rempart/rough_end.webp"),
    nuit: require("@/assets/images/village/iso/rempart/rough_end.nuit.webp"),
  },
  rough_end_mgx: {
    jour: require("@/assets/images/village/iso/rempart/rough_end_mgx.webp"),
    nuit: require("@/assets/images/village/iso/rempart/rough_end_mgx.nuit.webp"),
  },
  rough_end_pgy: {
    jour: require("@/assets/images/village/iso/rempart/rough_end_pgy.webp"),
    nuit: require("@/assets/images/village/iso/rempart/rough_end_pgy.nuit.webp"),
  },
  rough_run_gx: {
    jour: require("@/assets/images/village/iso/rempart/rough_run_gx.webp"),
    nuit: require("@/assets/images/village/iso/rempart/rough_run_gx.nuit.webp"),
  },
  rough_run_gy: {
    jour: require("@/assets/images/village/iso/rempart/rough_run_gy.webp"),
    nuit: require("@/assets/images/village/iso/rempart/rough_run_gy.nuit.webp"),
  },
  solid_corner: {
    jour: require("@/assets/images/village/iso/rempart/solid_corner.webp"),
    nuit: require("@/assets/images/village/iso/rempart/solid_corner.nuit.webp"),
  },
  solid_end: {
    jour: require("@/assets/images/village/iso/rempart/solid_end.webp"),
    nuit: require("@/assets/images/village/iso/rempart/solid_end.nuit.webp"),
  },
  solid_end_mgx: {
    jour: require("@/assets/images/village/iso/rempart/solid_end_mgx.webp"),
    nuit: require("@/assets/images/village/iso/rempart/solid_end_mgx.nuit.webp"),
  },
  solid_end_pgy: {
    jour: require("@/assets/images/village/iso/rempart/solid_end_pgy.webp"),
    nuit: require("@/assets/images/village/iso/rempart/solid_end_pgy.nuit.webp"),
  },
  solid_run_gx: {
    jour: require("@/assets/images/village/iso/rempart/solid_run_gx.webp"),
    nuit: require("@/assets/images/village/iso/rempart/solid_run_gx.nuit.webp"),
  },
  solid_run_gy: {
    jour: require("@/assets/images/village/iso/rempart/solid_run_gy.webp"),
    nuit: require("@/assets/images/village/iso/rempart/solid_run_gy.nuit.webp"),
  },
};

/** The cells of the stretch the island shows (rempart.ts `montresDuTroncon`), back to front. */
export function PanRempart({
  cases,
  stade,
  lumiere = "nuit",
  entree = false,
}: {
  cases: readonly Case[];
  stade: Stade;
  lumiere?: Ambiance;
  /** The wall is growing: the old stage fades out over the new one instead of changing at once. */
  entree?: boolean;
}) {
  const reduit = useMouvementReduit();
  const fond = entree && !reduit;
  // H4-07: the stage last seen at rest, kept while the wall grows (the owner's key stays the same,
  // so the stretch is never mounted again and the new stage's images stay where they are).
  const [repos, setRepos] = useState(stade);
  if (!fond && repos !== stade) setRepos(stade);
  const dessin = (s: Stade) =>
    PANS_VECTORIELS ? vectoriel(cases, s, lumiere) : peint(piecesPeintes(cases, s), lumiere);
  // Dev-iso `?dump=`: the painted pieces (the vector fallback is not a sprite), each on its cell.
  useDump(() =>
    PANS_VECTORIELS
      ? null
      : piecesPeintes(cases, stade).map((p) => ({
          id: `wall_${p.nom}`,
          layer: "wall",
          ...p.rect,
          flip: false,
          pied: ecranXY([p.case[0] + 1, p.case[1] + 1]),
        })),
  );
  const contenu = dessin(stade);
  const ancien = fond && repos !== stade ? dessin(repos) : null;
  // The same two slots at rest and in a growth: the new stage first, the old one over it, fading.
  return (
    <>
      {contenu}
      {ancien ? <Sortie>{ancien}</Sortie> : null}
    </>
  );
}

/** The old stage over the new one, fading out as the moment swaps stages (the only animated node, while it plays). */
const SORTIE_MS = 250;
function Sortie({ children }: { children: ReactNode }) {
  const opacite = useSharedValue(1);
  useEffect(() => {
    opacite.set(withDelay(ECHANGE_MS, withTiming(0, { duration: SORTIE_MS })));
  }, [opacite]);
  const style = useAnimatedStyle(() => ({ opacity: opacite.get() }));
  return (
    <Animated.View pointerEvents="none" style={[{ position: "absolute", left: 0, top: 0 }, style]}>
      {children}
    </Animated.View>
  );
}

/** The painted pieces, each on its cell; null when the island shows none of the stretch. */
function peint(pieces: readonly PiecePeinte[], lumiere: Ambiance): ReactElement | null {
  if (pieces.length === 0) return null;
  return (
    <>
      {pieces.map((p) => (
        <Image
          key={p.case.join(",")}
          testID={`iso-pan-${p.case.join("-")}`}
          pointerEvents="none"
          source={PIECES[p.nom][lumiere === "jour" ? "jour" : "nuit"]}
          contentFit="fill"
          style={{
            position: "absolute",
            left: p.rect.x,
            top: p.rect.y,
            width: p.rect.w,
            height: p.rect.h,
          }}
        />
      ))}
    </>
  );
}

/** The fallback drawing of FIN-DIS: the stretch as one static Svg. */
function vectoriel(cases: readonly Case[], stade: Stade, lumiere: Ambiance): ReactElement | null {
  const d = dessinPans(cases, stade);
  if (!d) return null;
  const tons =
    TONS[`${stade === "rough" ? "rough" : "solid"}${lumiere === "jour" ? "Jour" : "Nuit"}`];
  const encre = { stroke: rawColors.isoInk, strokeWidth: TRAIT, strokeLinejoin: "round" } as const;
  return (
    <Svg
      pointerEvents="none"
      testID={`iso-pan-${cases[0]?.join("-")}`}
      width={d.rect.w}
      height={d.rect.h}
      style={{ position: "absolute", left: d.rect.x, top: d.rect.y }}
    >
      {d.couches.flatMap((k) => [
        k.haut ? <Path key={`h${k.id}`} d={k.haut} fill={tons.haut} {...encre} /> : null,
        k.clair ? <Path key={`c${k.id}`} d={k.clair} fill={tons.clair} {...encre} /> : null,
        k.sombre ? <Path key={`s${k.id}`} d={k.sombre} fill={tons.sombre} {...encre} /> : null,
        k.joints ? (
          <Path
            key={`j${k.id}`}
            d={k.joints}
            fill="none"
            stroke={rawColors.isoInk}
            strokeWidth={TRAIT / 2}
            strokeOpacity={0.7}
          />
        ) : null,
      ])}
    </Svg>
  );
}
