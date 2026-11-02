// A building that has just grown, on the iso map (L3-T05, FIN-MAG): the old stage gathers itself
// (squashes 4 % and lifts 6 px), goes flat and warm, holds for the impact, and the new stage lands
// 6 % too big and settles (revelation.ts has the timeline, `poseAncien` and `poseNouveau`).
// E5 (anim-30, anim-31): once gathered, the old stage gives way to a flat warm ochre silhouette in
// the shape of the stage that comes; nothing of the new stage itself shows before the hit-stop ends.
// Transform only, on the UI thread, all ending by themselves; the parent unmounts this once they
// are done. The squash is on the sprite's own view (an Image inside), never on a Svg, and no
// opacity is animated: a stage is hidden by a scale of 0. A last stage lights its banner and
// windows once it is down. Never mounted with reduced motion: the new sprite is simply there.
// IsoCarte mounts it in the building's own place in the depth order (after its sprite and site):
// laid over the whole map, it hid whatever stood in front of the building while it played.

import { useContext, useEffect, useState } from "react";
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";
import { rawColors } from "@/constants/rawColors";
import type { BuildingCode } from "@/db/schema";
import { PopFin } from "./Chantier";
import { ombreSocleDe, pose, spriteDe } from "./carteDemo";
import { Fierte } from "./Fierte";
import { useMouvementReduit } from "./fige";
import type { Ambiance, Biome, Stade } from "./isoSpec";
import { OmbreSocle, Planche } from "./PlancheCarte";
import { EclatRevelation } from "./Revelation";
import {
  IMPACT_MS,
  ONDE_MS,
  poseAncienVisible,
  poseNouveau,
  poseSilhouette,
  REVELATION_MS,
  RevelationContext,
} from "./revelation";

/** The silhouette's fixed opacity (anim-31): a warm shape the ground shows through a little. */
const OPACITE_SILHOUETTE = 0.7;

export function IsoCroissance({
  code,
  ancien,
  nouveau,
  ambiance = "nuit",
  lumiere = "nuit",
  biome = "defaut",
}: {
  code: BuildingCode;
  /** The stage left behind; null when the building was not there. */
  ancien: Stade | null;
  nouveau: Stade;
  /** The map's own (IsoCarte), so the layer shows the sprite, lights and colours the building will wear. */
  ambiance?: Ambiance;
  lumiere?: Ambiance;
  biome?: Biome;
}) {
  // As Maquette: the sprite follows the light, and the day lights no window.
  const vie = lumiere === "jour" ? lumiere : ambiance;
  const sNouveau = spriteDe(code, nouveau, vie);
  // A rank rising inside a stage has the same sprite before and after, and a building that was not
  // there has none: no old stage to gather, the new one lands at once.
  const sAncien = ancien && ancien !== nouveau ? spriteDe(code, ancien, vie) : undefined;
  const revelation = useContext(RevelationContext);
  // The layer's own clock, 0 to ONDE_MS: the context's ends the village's silence and may go first.
  const h = useSharedValue(0);
  // 2 once the new stage is down: a last stage lights its banner and windows then.
  const [phase, setPhase] = useState<0 | 2>(0);
  // The owner already skips the layer with reduced motion (T37); should it ever mount, it lands at once.
  const reduit = useMouvementReduit();
  useEffect(() => {
    if (reduit) {
      h.set(ONDE_MS);
      setPhase(2);
      return;
    }
    h.set(withTiming(ONDE_MS, { duration: ONDE_MS, easing: Easing.linear }));
    const id = setTimeout(() => setPhase(2), REVELATION_MS);
    return () => clearTimeout(id);
  }, [h, reduit]);
  const styleAncien = useAnimatedStyle(() => {
    const p = poseAncienVisible(h.get());
    return { transform: [{ translateY: p.y }, { scale: p.echelle }] };
  });
  const neuf = !sAncien;
  const styleSilhouette = useAnimatedStyle(() => {
    const p = poseSilhouette(h.get(), neuf);
    return { transform: [{ translateY: p.y }, { scale: p.echelle }] };
  });
  const styleNouveau = useAnimatedStyle(() => {
    const p = poseNouveau(h.get());
    return { transform: [{ translateY: p.y }, { scale: p.echelle }] };
  });
  if (!sNouveau) return null;

  // Both stages hang from the same anchor on the ground, so each is placed by its own pose.
  const couche = (s: typeof sNouveau) => {
    const r = pose(code, s);
    const k = r.w / s.size[0];
    return {
      r,
      origine: `${s.anchor[0] * k}px ${s.anchor[1] * k}px`,
    };
  };
  const n = couche(sNouveau);
  const a = sAncien ? couche(sAncien) : null;
  return (
    <>
      {a && sAncien ? (
        <Animated.View
          pointerEvents="none"
          testID={`iso-croissance-ancien-${code}`}
          style={[
            {
              position: "absolute",
              left: a.r.x,
              top: a.r.y,
              width: a.r.w,
              height: a.r.h,
              transformOrigin: a.origine,
            },
            styleAncien,
          ]}
        >
          <Planche
            s={sAncien}
            rect={{ x: 0, y: 0, w: a.r.w, h: a.r.h }}
            ancre={a.r}
            testID={`iso-croissance-ancien-image-${code}`}
          />
        </Animated.View>
      ) : null}
      {/* The silhouette: the coming stage's own outline in one warm ochre, at a fixed 70 %. */}
      <Animated.View
        pointerEvents="none"
        testID={`iso-croissance-silhouette-${code}`}
        style={[
          {
            position: "absolute",
            left: n.r.x,
            top: n.r.y,
            width: n.r.w,
            height: n.r.h,
            transformOrigin: n.origine,
            opacity: OPACITE_SILHOUETTE,
          },
          styleSilhouette,
        ]}
      >
        <Planche
          s={sNouveau}
          rect={{ x: 0, y: 0, w: n.r.w, h: n.r.h }}
          ancre={n.r}
          teinte={rawColors.isoSilhouette}
          testID={`iso-croissance-silhouette-image-${code}`}
        />
      </Animated.View>
      <Animated.View
        pointerEvents="none"
        testID={`iso-croissance-nouveau-${code}`}
        style={[
          {
            position: "absolute",
            left: n.r.x,
            top: n.r.y,
            width: n.r.w,
            height: n.r.h,
            transformOrigin: n.origine,
          },
          styleNouveau,
        ]}
      >
        <Planche
          s={sNouveau}
          rect={{ x: 0, y: 0, w: n.r.w, h: n.r.h }}
          ancre={n.r}
          testID={`iso-croissance-nouveau-image-${code}`}
        />
        {/* A last stage lights its banner and windows first, as it settles (still drawings). */}
        {nouveau !== "grand" || phase === 2 ? (
          <Fierte
            code={code}
            stade={nouveau}
            s={sNouveau}
            corps={{ x: 0, y: 0, w: n.r.w, h: n.r.h }}
            biome={biome}
            ambiance={vie}
            legendaire={false}
            anime={false}
          />
        ) : null}
      </Animated.View>
      {/* The map draws the socle shadow over the sprite; the layer covers it, so it is redrawn
          above the layer, as the real sprite will wear it. */}
      <OmbreSocle
        code={code}
        socle={ombreSocleDe(code, nouveau)}
        testID={`iso-croissance-socle-${code}`}
        biome={biome}
      />
      {/* T41: the trade's burst on every stage that rises (the ring and dust are ground light, drawn by IsoCarte under the objects). */}
      {revelation ? (
        <EclatRevelation code={code} stade={nouveau} s={sNouveau} corps={n.r} t={revelation.t} />
      ) : null}
      {/* AUDIT-DA 36, E5: the site ends on one puff of dust at the building's foot, at the impact (one node, half a second). */}
      <PopFin code={code} delai={IMPACT_MS} />
    </>
  );
}
