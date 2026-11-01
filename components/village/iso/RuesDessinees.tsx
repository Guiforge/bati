// The streets in a ground tile's SVG (L6-T18, rues.ts): footpaths, then three ranks of street, then
// the paved square. T22: each is a filled outline with no dashes; T39: edged by a net ink line, no
// soft copies melting it into the lawn. Static (nothing animates). The
// same nodes are mounted whatever the island, a tier only rewrites `d`; `ombre` draws the shadowed
// copy that goes inside the shadow clip. Each band is filled with its texture (motifs.ts) when it
// has one; in shade the textured band takes a veil of its shadow colour.

import { useContext } from "react";
import { ClipPath, Defs, G, Path } from "react-native-svg";
import { rawColors } from "@/constants/rawColors";
import { AlentoursContext } from "./alentours";
import { emplacements, TAILLE } from "./isoLayout";
import { type Biome, biomes } from "./isoSpec";
import { MotifsSol } from "./MotifsSol";
import { type Motif, remplissage, VOILE_OMBRE } from "./motifs";
import { estPave, pavageCase } from "./pave";
import {
  ARETES,
  ARETES_CAMP,
  bornePath,
  bornesDeRue,
  CASE_PLACE,
  classeDe,
  PLACE,
  SENTIERS,
  SORTIES,
} from "./rues";
import { ENCRE_SOL } from "./solVarie";
import { VariantesContext } from "./variantes";

/** The paving's two stone tints, lit and in joint: the day's, and the night's (rawColors `<token>Nuit`). */
const PAVES: Record<Biome, { clair: string; sombre: string }> = {
  defaut: { clair: rawColors.isoPaveClair, sombre: rawColors.isoPaveSombre },
  defautNuit: { clair: rawColors.isoPaveClairNuit, sombre: rawColors.isoPaveSombreNuit },
};

const cle = ([gx, gy]: readonly [number, number]) => gy * TAILLE + gx;
/** The texture of each rank: beaten earth, stones, paving. */
const MOTIFS: readonly Motif[] = ["terre", "pierres", "paves"];
/** FIN-DIS: the first tier's island, with its starters' ground, holds about 80 cells; the second about 125. */
const ILE_DU_CAMP = 100;

export function Rues({
  dedans,
  visibles,
  biome,
  ombre,
}: {
  /** The cells (keys `gy * TAILLE + gx`) whose box touches the tile. */
  dedans: ReadonlySet<number>;
  /** The cells on the island. */
  visibles: ReadonlySet<number>;
  biome: Biome;
  ombre: boolean;
}) {
  const { bornes: avecBornes } = useContext(VariantesContext);
  const { sol: peint } = useContext(AlentoursContext);
  const { sol: BS } = biomes[biome];
  const { clair, sombre } = PAVES[biome];
  const ombree = rawColors[BS.cheminOmbre];
  const teintes = [BS.chemin, BS.rueEmpierree, BS.ruePave].map((t) => rawColors[t]);
  const ici = (...cs: (readonly [number, number])[]) =>
    cs.every((c) => visibles.has(cle(c))) && cs.some((c) => dedans.has(cle(c)));
  const place = ici(CASE_PLACE);
  const petite = visibles.size <= ILE_DU_CAMP;
  // Footpaths first (earth), then each rank, then the square: a layer is its soft edge, then its band.
  const couches = [
    {
      nom: "sentiers",
      motif: 0,
      // AUDIT-DA 7: no footpath inside the paved square, where it showed as a blurred brown bar.
      liste: [
        ...SENTIERS.filter((s) => classeDe(s.fin) < 2 && ici(s.fin, emplacements[s.code].coin)),
        // FIN-CAR: the long street goes on past the island's edge, once its last cell shows. H3-13: not over
        // the painted ground, which carries its own roads.
        ...(peint ? [] : SORTIES).filter((s) => dedans.size > 0 && visibles.has(cle(s.fin))),
      ],
    },
    ...([0, 1, 2] as const).map((k) => ({
      nom: `rang${k}`,
      motif: k,
      // B2: a camp is beaten earth: narrow beaten earth with no ink rim until the island has grown past its first tier, then the street widens and takes its stones (nothing goes back).
      liste: (petite ? ARETES_CAMP : ARETES).filter((a) => a.classe === k && ici(a.de, a.vers)),
    })),
    // H3-07: the square is traced from the camp, in beaten earth until the paving comes (nothing goes back).
    { nom: "place", motif: petite ? 0 : 2, liste: place ? [{ d: PLACE }] : [] },
  ];
  const toutes = couches.flatMap(({ liste }) => liste.map((e) => e.d)).join("");
  // The textures this tile draws, declared once by the lit copy (the shadowed one uses the same ids).
  const motifs = couches.flatMap(({ motif, liste }) =>
    liste.length ? [MOTIFS[motif] ?? "terre"] : [],
  );
  // AUDIT-DA 8: joints and tinted stones over the square's paving (and the paved streets), clipped to
  // their bands. Without a paved band in this tile nothing mounts.
  const bandePave = couches
    .filter(({ nom }) => nom === "rang2" || (nom === "place" && !petite))
    .flatMap(({ liste }) => liste.map((e) => e.d))
    .join("");
  const pierres = [...dedans]
    .map((k) => [k % TAILLE, Math.floor(k / TAILLE)] as const)
    .filter(([gx, gy]) => estPave(gx, gy))
    .map(([gx, gy]) => pavageCase(gx, gy));
  const idPave = ombre ? "pave-ombre" : "pave";
  // Audit T43 round 1: a street that stops on the island's rim ends on a stone, not in the void.
  const bornes = (avecBornes ? bornesDeRue((gx, gy) => visibles.has(cle([gx, gy]))) : [])
    .filter(([x, y]) => dedans.has(cle([Math.floor(x), Math.floor(y)])))
    .map(bornePath)
    .join("");
  return (
    <>
      {ombre ? null : <MotifsSol motifs={motifs} nuit={biome === "defautNuit"} />}
      {/* One net rim for every band: the ink shape underneath, wider than the bands by the rim's width. Drawn per band, overlapping subpaths each took a stroke, which read as rings and stitches. */}
      {ombre || !toutes || petite ? null : (
        <Path
          d={toutes}
          fill={rawColors[BS.encre]}
          stroke={rawColors[BS.encre]}
          strokeWidth={ENCRE_SOL * 2}
          strokeOpacity={0.8}
          strokeLinejoin="round"
        />
      )}
      {couches.flatMap(({ nom, motif, liste }) => {
        const m = MOTIFS[motif] ?? "terre";
        const texture = remplissage(m);
        const aplat = ombre ? ombree : (teintes[motif] ?? "");
        const bande = liste.map((e) => e.d).join("");
        // rn-svg Android allocates a bitmap for a pattern fill on every draw, even of an empty `d`:
        // only a band with a shape takes a fill, an empty one is "none".
        const plein = (d: string, f: string) => (d ? f : "none");
        return [
          <Path key={nom} d={bande} fill={plein(bande, texture ?? aplat)} />,
          // In shade, the same textured band under a veil of its shadow colour (no second image).
          ombre ? (
            <Path
              key={`${nom}-voile`}
              d={texture ? bande : ""}
              fill={plein(texture ? bande : "", ombree)}
              fillOpacity={VOILE_OMBRE}
            />
          ) : null,
        ];
      })}
      <Path
        d={bornes}
        fill={bornes ? (ombre ? ombree : clair) : "none"}
        stroke={bornes && !ombre ? rawColors[BS.encre] : "none"}
        strokeWidth={ENCRE_SOL}
        strokeLinejoin="round"
      />
      {bandePave && pierres.length > 0 ? (
        <>
          <Defs>
            <ClipPath id={idPave}>
              <Path d={bandePave} clipRule="nonzero" />
            </ClipPath>
          </Defs>
          <G clipPath={`url(#${idPave})`} clipRule="nonzero">
            <Path d={pierres.map((p) => p.sombres).join("")} fill={sombre} fillOpacity={0.3} />
            <Path d={pierres.map((p) => p.clairs).join("")} fill={clair} fillOpacity={0.26} />
            <Path
              d={pierres.map((p) => p.joints).join("")}
              fill="none"
              stroke={rawColors[BS.encre]}
              strokeOpacity={0.3}
              strokeWidth={0.7}
              strokeLinejoin="round"
            />
          </G>
        </>
      ) : null}
    </>
  );
}
