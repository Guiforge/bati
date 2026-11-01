// The patterns of the ground textures a tile draws (motifs.ts): one Pattern and one svg Image per
// motif used, none for the others. Static. Mounted by the lit copy only; the shadowed copy inside the
// clip refers to the same ids.

import { Defs, Image, Pattern, Rect } from "react-native-svg";
import { rawColors } from "@/constants/rawColors";
import { idMotif, type Motif, REPETITION, TEXTURES, VOILE_MOTIF, VOILE_MOTIF_NUIT } from "./motifs";

export function MotifsSol({ motifs, nuit = false }: { motifs: readonly Motif[]; nuit?: boolean }) {
  const voiles = nuit ? VOILE_MOTIF_NUIT : VOILE_MOTIF;
  const avec = [...new Set(motifs)].filter((m) => TEXTURES[m] !== undefined);
  if (avec.length === 0) return null;
  return (
    <Defs>
      {avec.map((m) => (
        <Pattern
          key={m}
          id={idMotif(m)}
          patternUnits="userSpaceOnUse"
          x={0}
          y={0}
          width={REPETITION.w}
          height={REPETITION.h}
        >
          <Image
            href={TEXTURES[m]}
            x={0}
            y={0}
            width={REPETITION.w}
            height={REPETITION.h}
            preserveAspectRatio="none"
          />
          {voiles[m] ? (
            <Rect
              x={0}
              y={0}
              width={REPETITION.w}
              height={REPETITION.h}
              fill={nuit ? rawColors.isoRueVoileNuit : rawColors.isoRueVoile}
              fillOpacity={voiles[m]}
            />
          ) : null}
        </Pattern>
      ))}
    </Defs>
  );
}
