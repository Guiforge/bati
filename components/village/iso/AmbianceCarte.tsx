// The light of the map, in map space, UNDER everything that stands: IsoCarte mounts it between the
// ground tiles and the objects, so a sprite's lit windows are never veiled and the night's pools
// sit on the ground (iter-01 H1-01, M1-02). It follows every pan and zoom and grades the land, the
// water and the forest below the sprites.
//   Day: late afternoon, a flat warm veil (18 %) and a warm olive-brown vignette (18 %) at the edges.
//   Night: a blue-night floor (35 %, #2E3552) so no lawn reads green on green, the biome's deep blue
//   at the edges, then ONE source of warm pools: a soft radial gradient per real light (lit house,
//   lantern, hearths, forge, campfire), about 0.6 cell, no hard edge.
// One Svg for all the pools and flat or gradient views for the rest; no animated node.

import { LinearGradient } from "expo-linear-gradient";
import { useContext } from "react";
import { View } from "react-native";
import Animated, { useAnimatedStyle } from "react-native-reanimated";
import Svg, { Defs, Ellipse, RadialGradient, Rect, Stop } from "react-native-svg";
import { rawColors } from "@/constants/rawColors";
import type { BuildingCode } from "@/db/schema";
import { AlentoursContext, TERRAIN, VOILE_PORTEE, type Voile } from "./alentours";
import { type Bande, bandes, DEBORD } from "./bandesBord";
import { ecranXY, HAUTEUR, LANTERNES, LARGEUR, lanterneVisible } from "./carteDemo";
import { LumieresContext } from "./fige";
import { CYCLE_MS, HorlogeContext } from "./horloge";
import { type Ambiance, type Biome, biomes, type Stade } from "./isoSpec";
import { estChaude, type Flaque, flaquesDe, horsCentre, PENTE_RAIS, RAIS } from "./lueurs";
import { LUMIERES } from "./lumiere";
import { VariantesContext } from "./variantes";

/** Half-width of the lantern's pool, dp. */
const R_LANTERNE = 32;
const ABSOLU = { position: "absolute" } as const;
/** One veil per map: a fixed gradient id (a literal would trip the unique-id rule). */
const ID_VOILE = "voile-alentours";
// Off the cell's middle like every pool (lueurs.ts horsCentre): a lantern's pool is never wedged on a path cell.
const [lx, ly] = ecranXY([
  horsCentre(LANTERNES[0]?.case[0] ?? 0, 0.5),
  horsCentre(LANTERNES[0]?.case[1] ?? 0, 0.5),
]);
const LANTERNE: Flaque = { x: lx, y: ly, rx: R_LANTERNE };

const rect = (left: number, top: number, width: number, height: number, backgroundColor: string) =>
  ({ ...ABSOLU, left, top, width, height, backgroundColor }) as const;

const BANDES: readonly Bande[] = bandes();

function Bords({ bord, nul }: { bord: string; nul: string }) {
  return (
    <>
      {BANDES.map((b) => {
        const cle = `${b.x},${b.y},${b.axe},${b.de}`;
        if (b.de === b.vers) return <View key={cle} style={rect(b.x, b.y, b.w, b.h, bord)} />;
        return (
          <LinearGradient
            key={cle}
            colors={b.de ? [bord, nul] : [nul, bord]}
            start={{ x: 0, y: 0 }}
            end={b.axe === "x" ? { x: 1, y: 0 } : { x: 0, y: 1 }}
            style={{ ...ABSOLU, left: b.x, top: b.y, width: b.w, height: b.h }}
          />
        );
      })}
    </>
  );
}

/** All the night's pools in one Svg: one soft radial gradient per warmth, edge at opacity 0 (iter-01 H1-01). */
function Mares({ flaques }: { flaques: readonly Flaque[] }) {
  return (
    <Svg width={LARGEUR} height={HAUTEUR} style={ABSOLU} testID="iso-flaques-nuit">
      <Defs>
        {(["tiede", "chaude"] as const).map((k) => {
          const [corps, coeur] =
            k === "chaude"
              ? [rawColors.isoFlaqueFoyer, rawColors.isoFlaqueFoyerCoeur]
              : [rawColors.isoFlaqueNuit, rawColors.isoFlaqueNuitCoeur];
          return (
            <RadialGradient key={k} id={k}>
              <Stop offset="0" stopColor={coeur} />
              <Stop offset="0.35" stopColor={corps} />
              <Stop offset="0.7" stopColor={corps} stopOpacity={0.45} />
              <Stop offset="1" stopColor={corps} stopOpacity={0} />
            </RadialGradient>
          );
        })}
      </Defs>
      {flaques.map((f) => (
        <Ellipse
          key={`${f.x},${f.y}`}
          testID="iso-flaque-nuit"
          cx={f.x}
          cy={f.y}
          rx={f.rx}
          ry={f.rx / 2}
          fill={estChaude(f) ? "url(#chaude)" : "url(#tiede)"}
        />
      ))}
    </Svg>
  );
}

/** Three soft slanting bands from the left, breathing on the one clock (still without it or with reduced motion: it does not run). */
function Rais() {
  const horloge = useContext(HorlogeContext);
  const style = useAnimatedStyle(() => {
    // A whole wave per cycle: back to its rest value at every boundary, where the clock stops.
    const u = ((horloge?.get() ?? 0) % CYCLE_MS) / CYCLE_MS;
    return { opacity: 0.8 + 0.2 * Math.sin(2 * Math.PI * u) };
  });
  return (
    <Animated.View pointerEvents="none" testID="iso-rais-jour" style={[ABSOLU, style]}>
      {RAIS.map((r) => (
        <LinearGradient
          key={r.x}
          colors={[rawColors.isoRaisJourNul, rawColors.isoRaisJour, rawColors.isoRaisJourNul]}
          locations={[0, 0.5, 1]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={{
            ...ABSOLU,
            left: r.x * LARGEUR - r.w / 2,
            top: -HAUTEUR * 0.15,
            width: r.w,
            height: HAUTEUR * 1.3,
            opacity: r.force,
            transform: [{ rotate: `${PENTE_RAIS}deg` }],
          }}
        />
      ))}
    </Animated.View>
  );
}

/**
 * The day's veil on the surroundings (loupe BC, criterion 9): slate, clear over the island and
 * growing with it, easing to `VOILE_PORTEE.force` past it, so the village is the lightest and
 * most contrasted place of the map and each species keeps its tint under a soft cool cast. In map
 * space (it pans and zooms with the ground), one Rect, no animated node.
 */
function VoileAlentours({ v }: { v: Voile }) {
  const { force } = VOILE_PORTEE;
  return (
    <Svg
      testID="iso-voile-alentours"
      width={TERRAIN.w}
      height={TERRAIN.h}
      viewBox={`${TERRAIN.x} ${TERRAIN.y} ${TERRAIN.w} ${TERRAIN.h}`}
      style={{ ...ABSOLU, left: TERRAIN.x, top: TERRAIN.y }}
    >
      <Defs>
        <RadialGradient
          id={ID_VOILE}
          gradientUnits="userSpaceOnUse"
          cx={v.cx}
          cy={v.cy}
          rx={v.rx}
          ry={v.ry}
        >
          <Stop offset={v.dedans} stopColor={rawColors.isoVoileJour} stopOpacity={0} />
          <Stop
            offset={v.dedans + (1 - v.dedans) * 0.5}
            stopColor={rawColors.isoVoileJour}
            stopOpacity={force * 0.5}
          />
          <Stop offset="1" stopColor={rawColors.isoVoileJour} stopOpacity={force} />
        </RadialGradient>
      </Defs>
      <Rect
        x={TERRAIN.x}
        y={TERRAIN.y}
        width={TERRAIN.w}
        height={TERRAIN.h}
        fill={`url(#${ID_VOILE})`}
      />
    </Svg>
  );
}

export function AmbianceCarte({
  lumiere,
  biome,
  montres,
  stade,
  voileAlentours,
}: {
  lumiere: Ambiance;
  biome: Biome;
  montres: readonly BuildingCode[];
  stade: (code: BuildingCode) => Stade;
  /** The surroundings' veil (alentours.ts `voileVillage`), by day over the painted ground only. */
  voileAlentours?: Voile;
}) {
  const jour = LUMIERES[lumiere];
  const variantes = useContext(VariantesContext);
  const peint = useContext(AlentoursContext);
  const lumieres = useContext(LumieresContext);
  // Over the painted ground the vignette (a cone pegged on the map, H3-09) is the painting's own fade
  // and the night is baked in the layers (H3-04): the veil is only for the vector bits beneath.
  const nuitPeinte = peint.sol && peint.foret;
  const [pl, ph] = [LARGEUR + 2 * DEBORD, HAUTEUR + 2 * DEBORD];
  if (!lumieres) return null;
  if (jour) {
    return (
      <View pointerEvents="none" testID="iso-monde-jour" style={ABSOLU}>
        <View style={rect(-DEBORD, -DEBORD, pl, ph, jour.voile)} />
        {peint.sol ? null : <Bords bord={jour.vignette} nul={jour.vignetteNul} />}
        {voileAlentours && nuitPeinte ? <VoileAlentours v={voileAlentours} /> : null}
        <Rais />
      </View>
    );
  }
  const { voile, voileNul } = biomes[biome].monde.couleurs;
  // The vector lantern is gone under the painted props (F3): its pool goes with it.
  const flaques = variantes.flaques
    ? [...flaquesDe(montres, stade), ...(lanterneVisible(peint) ? [LANTERNE] : [])]
    : [];
  return (
    <View pointerEvents="none" testID="iso-monde-nuit" style={ABSOLU}>
      <View
        style={rect(
          -DEBORD,
          -DEBORD,
          pl,
          ph,
          nuitPeinte ? rawColors.isoNuitSolPeint : rawColors.isoNuitSol,
        )}
      />
      {peint.sol ? null : <Bords bord={rawColors[voile]} nul={rawColors[voileNul]} />}
      {flaques.length > 0 ? <Mares flaques={flaques} /> : null}
    </View>
  );
}
