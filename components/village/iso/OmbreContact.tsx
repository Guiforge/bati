import Svg, { Ellipse } from "react-native-svg";
import { rawColors } from "@/constants/rawColors";

// AUDIT-DA 5 and 22: a dark core on a small, faint halo (Guillaume's variant b), both true 2:1
// ellipses pushed to the screen's right, the way every cast shadow of the map falls (the moon,
// isoSpec.json `moon`). No gradient, no bitmap, no animated node. The foot is at (x, y) of the
// parent; `largeur` is the halo's width. The svg is wider than the halo so the pushed shadow is not cut.
const FORMES_OMBRE = [
  { part: 0.8, opacite: 0.1 },
  { part: 0.55, opacite: 0.26 },
] as const;
const DECALAGE = 0.2;
const LARGEUR_SVG = 1.5;

export function OmbreContact({ x, y, largeur }: { x: number; y: number; largeur: number }) {
  const w = largeur * LARGEUR_SVG;
  const hauteur = w / 2;
  return (
    <Svg
      pointerEvents="none"
      width={w}
      height={hauteur}
      style={{ position: "absolute", left: x - w / 2, top: y - hauteur / 2 }}
    >
      {FORMES_OMBRE.map((f) => (
        <Ellipse
          key={f.part}
          cx={w / 2 + largeur * DECALAGE}
          cy={hauteur / 2}
          rx={(largeur / 2) * f.part}
          ry={(largeur / 4) * f.part}
          fill={rawColors.isoOmbreContactSol}
          fillOpacity={f.opacite}
        />
      ))}
    </Svg>
  );
}
