// The vocation's set on the map (vocation.ts): its grounds round the square (one Svg over the ground
// tiles and their shadows, under the night's veil), its two things on the square (one Svg each, in
// the depth order) and its two great banners at the hall's front (a still pole, a cloth that sways
// on the one clock like the pride banners, Fierte.tsx; still under reduced motion, where the clock
// rests). Never read aloud, no tap.

import { useContext } from "react";
import Animated, { useAnimatedStyle } from "react-native-reanimated";
import Svg, { Circle, Line, Path } from "react-native-svg";
import { rawColors } from "@/constants/rawColors";
import type { Practice } from "@/db/crestRules";
import { ecranXY } from "./carteDemo";
import { inclinaisonBanniere } from "./fierte";
import { HorlogeContext } from "./horloge";
import {
  BOITE_SOL,
  type ChoseVocation,
  centreSol,
  EMBLEMES,
  ETENDARD,
  type Formes,
  HAMPE_H,
  HAMPES,
  MATIERES,
  solDe,
  teintes,
} from "./vocation";

const ABSOLU = { position: "absolute" } as const;
const ENCRE = { stroke: rawColors.isoInk, strokeLinejoin: "round" as const, fill: "none" };

/** The fills of a drawing by material, then one ink line round all of them. */
function Remplis({ d, t, trait }: { d: Partial<Formes>; t: Formes; trait: number }) {
  return (
    <>
      {MATIERES.map((m) =>
        d[m] ? <Path key={m} d={d[m]} fill={t[m]} fillRule="evenodd" /> : null,
      )}
      <Path d={MATIERES.map((m) => d[m] ?? "").join("")} strokeWidth={trait} {...ENCRE} />
    </>
  );
}

/** The grounds round the square. */
export function SolVocation({ vocation, nuit }: { vocation: Practice | null; nuit: boolean }) {
  if (!vocation) return null;
  const sol = solDe(vocation);
  const t = teintes(vocation, nuit);
  const [cx, cy] = centreSol();
  const { l, h } = BOITE_SOL;
  return (
    <Svg
      pointerEvents="none"
      testID={`iso-vocation-sol-${vocation}`}
      width={2 * l}
      height={2 * h}
      viewBox={`${-l} ${-h} ${2 * l} ${2 * h}`}
      style={[ABSOLU, { left: cx - l, top: cy - h }]}
    >
      <Remplis d={sol.formes} t={t} trait={1.2} />
      {sol.traits ? (
        <Path
          d={sol.traits}
          fill="none"
          stroke={t.clair}
          strokeWidth={1.6}
          strokeDasharray={sol.pointille ? "6 5" : undefined}
        />
      ) : null}
    </Svg>
  );
}

/** One of the vocation's things on the square. */
export function ChoseDeVocation({
  chose,
  vocation,
  nuit,
  i,
}: {
  chose: ChoseVocation;
  vocation: Practice;
  nuit: boolean;
  i: number;
}) {
  const { boite: b, pied } = chose;
  return (
    <Svg
      pointerEvents="none"
      testID={`iso-vocation-chose-${vocation}-${i}`}
      width={b.w}
      height={b.h}
      viewBox={`${b.x - pied[0]} ${b.y - pied[1]} ${b.w} ${b.h}`}
      style={[ABSOLU, { left: b.x, top: b.y, width: b.w, height: b.h }]}
    >
      {/* Its contact shadow, flat, toward the screen right like every cast shadow. */}
      <Path d="M-24,2A27,8 0 1,0 30,2A27,8 0 1,0 -24,2Z" fill={rawColors.isoOmbrePeinte} />
      <Remplis d={chose.dessin} t={teintes(vocation, nuit)} trait={1.3} />
    </Svg>
  );
}

/** The two great banners at the hall's front: poles still, cloths swaying on the clock. */
export function BannieresVocation({ vocation }: { vocation: Practice }) {
  return (
    <>
      {HAMPES.map((g, i) => (
        <Banniere key={g.join()} vocation={vocation} pied={ecranXY(g)} i={i} />
      ))}
    </>
  );
}

const PERCHE = 18;
const DRAP = "M2,1L28,1L28,50L15,42L2,50Z";
const PLIS = "M8,2L11,2L11,44L8,44ZM18,2L21,2L21,43L18,43Z";
const OMBRE = "M23,2L27,2L27,48.5L23,46Z";
function Banniere({
  vocation,
  pied,
  i,
}: {
  vocation: Practice;
  pied: readonly [number, number];
  i: number;
}) {
  const horloge = useContext(HorlogeContext);
  const battements = 2 + i;
  const style = useAnimatedStyle(() => ({
    transform: [{ rotate: `${horloge ? inclinaisonBanniere(horloge.get(), battements) : 0}rad` }],
  }));
  const [x, y] = pied;
  const haut = y - HAMPE_H;
  const { w, h } = ETENDARD;
  return (
    <>
      <Svg
        pointerEvents="none"
        testID={`iso-vocation-hampe-${vocation}-${i}`}
        width={PERCHE * 2}
        height={HAMPE_H + 4}
        viewBox={`${-PERCHE} ${-HAMPE_H} ${PERCHE * 2} ${HAMPE_H + 4}`}
        style={[ABSOLU, { left: x - PERCHE, top: haut }]}
      >
        <Line
          x1={0}
          y1={0}
          x2={0}
          y2={-HAMPE_H + 2}
          stroke={rawColors.isoInk}
          strokeWidth={4.5}
          strokeLinecap="round"
        />
        <Line
          x1={0}
          y1={-1}
          x2={0}
          y2={-HAMPE_H + 3}
          stroke={rawColors.isoVocationBois}
          strokeWidth={2.2}
        />
        <Line
          x1={-16}
          y1={-HAMPE_H + 6}
          x2={16}
          y2={-HAMPE_H + 6}
          stroke={rawColors.isoInk}
          strokeWidth={4}
          strokeLinecap="round"
        />
        <Line
          x1={-15}
          y1={-HAMPE_H + 6}
          x2={15}
          y2={-HAMPE_H + 6}
          stroke={rawColors.isoVocationBois}
          strokeWidth={1.8}
        />
        <Path
          d={`M-3,${-HAMPE_H + 2}a3,3 0 1,0 6,0a3,3 0 1,0 -6,0Z`}
          fill={rawColors.isoLueur}
          stroke={rawColors.isoInk}
          strokeWidth={1.2}
        />
      </Svg>
      {/* The cloth hangs from the crossbar and sways about its middle there. */}
      <Animated.View
        pointerEvents="none"
        testID={`iso-vocation-banniere-${vocation}-${i}`}
        style={[
          ABSOLU,
          { left: x - w / 2, top: haut + 6, width: w, height: h },
          { transformOrigin: [w / 2, 0, 0] },
          style,
        ]}
      >
        <Svg width={w} height={h} viewBox={`0 0 ${w} ${h}`}>
          {/* The cloth, its even ink edge, then a gold hem over it (the ink shows on both sides). */}
          <Path
            d={DRAP}
            fill={teintes(vocation, false).tissu}
            stroke={rawColors.isoInk}
            strokeWidth={2.4}
            strokeLinejoin="round"
          />
          {/* Two folds, then the shade on the right (the light comes from the left). */}
          <Path d={PLIS} fill={rawColors.isoInk} fillOpacity={0.16} />
          <Path d={OMBRE} fill={rawColors.isoInk} fillOpacity={0.3} />
          <Path
            d={DRAP}
            fill="none"
            stroke={rawColors.resourceGold}
            strokeWidth={1.2}
            strokeLinejoin="round"
          />
          {/* The crest, stitched: a roundel, then the emblem in ochre. */}
          <Circle
            cx={15}
            cy={22}
            r={11.5}
            fill={rawColors.isoInk}
            fillOpacity={0.3}
            stroke={rawColors.isoVocationTerre}
            strokeWidth={1.1}
          />
          <Path
            testID={`iso-vocation-embleme-${vocation}`}
            d={EMBLEMES[vocation]}
            fill={rawColors.isoVocationTerre}
            fillRule="evenodd"
            stroke={rawColors.isoInk}
            strokeWidth={0.6}
            strokeLinejoin="round"
          />
        </Svg>
      </Animated.View>
    </>
  );
}
