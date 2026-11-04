// A building that has just grown, on the iso map: the "Contre-jour" moment (moment.ts has the
// timeline, LIFE U5 and U6). Mounted from the player's tap, in the building's own place in the depth
// order (after its sprite), and ending by itself on its own clock `h` (ms from the tap) that every
// style reads on the UI thread: transforms and opacity only. The parts, back to front: the light
// behind the body (and, at night, its pool on the ground), the old stage and its scaffold, the new
// stage (colour, amber rim, ink) and the dust at the footprint corners. The ink is `tintColor` of
// the same sprite: no painting per building. A stage change hides the map's own sprite (the owner
// masks it); a rank inside a stage hides nothing, it adds the new piece(s) and a small light.
// Nothing here is tappable or counted. A skip (`saute`) and reduced motion put the clock on the end.

import { Fragment, useContext, useEffect, useRef, useState } from "react";
import { Image as ImageRN } from "react-native";
import Animated, {
  cancelAnimation,
  Easing,
  type SharedValue,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";
import type { BuildingData } from "@/constants/buildingData";
import { rawColors } from "@/constants/rawColors";
import type { BuildingCode } from "@/db/schema";
import { BATIMENT_MOTEUR, etatBatiment } from "./batiment";
import { Tas } from "./Chantier";
import type { Rect } from "./carteDemo";
import {
  COTE,
  centreBatiment,
  ecranXY,
  enStade,
  HAUTEUR,
  LARGEUR,
  ombreSocleDe,
  pose,
  spriteDe,
  stadeReel,
} from "./carteDemo";
import { echafaudageDe } from "./chantier";
import { DONNEES_BLD } from "./donneesBld";
import { RangsBldContext } from "./etatBld";
import { Fierte } from "./Fierte";
import { useMouvementReduit } from "./fige";
import type { Ambiance, Biome, SpriteIso, Stade } from "./isoSpec";
import { MAQUETTES } from "./maquettes";
import {
  COINS_BOUFFEES,
  dureeMoment,
  echelleEchafaudage,
  type GenreMoment,
  genreDeCroissance,
  LUMIERES_MS,
  poseMoment,
  tempsMoment,
} from "./moment";
import { OmbreSocle, Planche } from "./PlancheCarte";
import { PEINTS, peintDe } from "./peints";
import { coinsEmprise } from "./revelation";

const ABSOLU = { position: "absolute" } as const;
/** The amber rim: the ink copy sits over an amber copy offset up and left by this much, dp (1.5 read as a hairline at the default zoom). */
const LISERE_DP = 2.5;

// Fixed names: a painter replaces these files, nothing else changes (placeholders: the concept pieces).
const IMAGES = {
  lueur: {
    jour: require("@/assets/images/village/iso/moment/lueur_jour.webp"),
    nuit: require("@/assets/images/village/iso/moment/lueur_nuit.webp"),
  },
  bouffees: [
    {
      jour: require("@/assets/images/village/iso/moment/bouffee_1_jour.webp"),
      nuit: require("@/assets/images/village/iso/moment/bouffee_1_nuit.webp"),
    },
    {
      jour: require("@/assets/images/village/iso/moment/bouffee_2_jour.webp"),
      nuit: require("@/assets/images/village/iso/moment/bouffee_2_nuit.webp"),
    },
    {
      jour: require("@/assets/images/village/iso/moment/bouffee_3_jour.webp"),
      nuit: require("@/assets/images/village/iso/moment/bouffee_3_nuit.webp"),
    },
  ],
} as const;
/** Sizes of the placeholders, used when the bundler gives none (a test). */
const TAILLES = {
  lueur: [512, 504],
  bouffees: [
    [304, 225],
    [320, 232],
    [246, 189],
  ],
} as const;

/** A moment image as a sprite: its own size, anchored at its centre. */
function spriteMoment(image: number, repli: readonly [number, number]): SpriteIso {
  const src = ImageRN.resolveAssetSource(image);
  const size: readonly [number, number] = src?.width
    ? [src.width, src.height ?? repli[1]]
    : [repli[0], repli[1]];
  return { image, size, anchor: [size[0] / 2, size[1] / 2], ombre: [] };
}

/** `r` drawn `f` times larger about its sprite's ground anchor. */
function agrandi(r: Rect, s: SpriteIso, f: number): Rect {
  if (f === 1) return r;
  const k = r.w / s.size[0];
  const [ax, ay] = [r.x + s.anchor[0] * k, r.y + s.anchor[1] * k];
  return { x: ax - (ax - r.x) * f, y: ay - (ay - r.y) * f, w: r.w * f, h: r.h * f };
}

/** A new piece of a rank: the painted element and where it stands on the map (the engine's own placement). */
type PieceRang = { cle: string; s: SpriteIso; rect: Rect };

/** What rank `vers` wears that rank `de` did not: add-ons, the site teaser, the rank's beat; painted ones only. */
function piecesNeuves(
  code: BuildingCode,
  rangs: { de: number; vers: number; base: number },
  vie: Ambiance,
): PieceRang[] {
  const data: BuildingData | undefined = BATIMENT_MOTEUR ? DONNEES_BLD[code] : undefined;
  const elements = PEINTS[code]?.elements;
  if (!data || !elements) return [];
  const options = { baseRank: rangs.base, nuit: vie === "nuit", rule: "B" } as const;
  const avant = etatBatiment(data, rangs.de, options);
  const apres = etatBatiment(data, rangs.vers, options);
  const corps = spriteDe(code, stadeReel(code, enStade(apres.stage)), vie);
  if (!corps) return [];
  const r = pose(code, corps);
  const k = r.w / corps.size[0];
  const [ax, ay] = corps.anchor;
  const au = (o: readonly [number, number], sprite: string | null, cle: string) => {
    const e = sprite ? elements[sprite] : undefined;
    if (!e) return [];
    const [w, h] = [e.size[0] * k, e.size[1] * k];
    const [x, y] = [r.x + o[0] * k, r.y + o[1] * k];
    const s: SpriteIso = {
      image: vie === "nuit" ? e.nuit : e.jour,
      size: e.size,
      anchor: [e.size[0] / 2, e.size[1]],
      ombre: [],
    };
    return [{ cle, s, rect: { x: x - w / 2, y: y - h, w, h } }];
  };
  const ajouts = apres.addOns
    .filter((a) => !avant.addOns.includes(a))
    .flatMap((a) => au([ax + a.anchorOffset[0], ay + a.anchorOffset[1]], a.sprite, `a${a.rank}`));
  const t = apres.teaser;
  const teaser =
    t && t !== avant.teaser
      ? au([ax + t.anchorOffset[0], ay + t.anchorOffset[1]], t.sprite, "t")
      : [];
  const g = apres.gag;
  const ouGeste = g?.at ?? apres.gagSlot;
  const geste = g && g !== avant.gag && ouGeste ? au(ouGeste, g.sprite, "g") : [];
  return [...ajouts, ...teaser, ...geste];
}

/** One sprite of an ink group: its rect and whether it wears the amber rim. */
type PieceEncre = { s: SpriteIso; rect: Rect; rebord: boolean; id: string };

/** The ink over the colour and the amber rim under it, all faded by the one animated opacity (one node for the group). */
function Encre({
  pieces,
  genre,
  h,
}: {
  pieces: readonly PieceEncre[];
  genre: GenreMoment;
  h: SharedValue<number>;
}) {
  const style = useAnimatedStyle(() => ({ opacity: poseMoment(genre, h.get()).encre }));
  return (
    <Animated.View pointerEvents="none" style={[ABSOLU, { left: 0, top: 0 }, style]}>
      {pieces.map(({ s, rect, rebord, id }) => (
        <Fragment key={id}>
          {rebord ? (
            <Planche
              s={s}
              rect={{ ...rect, x: rect.x - LISERE_DP, y: rect.y - LISERE_DP }}
              ancre={rect}
              teinte={rawColors.isoLueur}
              testID={`iso-croissance-lisere-${id}`}
            />
          ) : null}
          <Planche
            s={s}
            rect={rect}
            ancre={rect}
            teinte={rawColors.isoInk}
            testID={`iso-croissance-encre-${id}`}
          />
        </Fragment>
      ))}
    </Animated.View>
  );
}

export function IsoCroissance({
  code,
  ancien,
  nouveau,
  ambiance = "nuit",
  lumiere = "nuit",
  biome = "defaut",
  rangs,
  saute = false,
  delai = 0,
}: {
  code: BuildingCode;
  /** The stage left behind; null when the building was not there. */
  ancien: Stade | null;
  nouveau: Stade;
  /** The map's own (IsoCarte), so the layer shows the sprite, lights and colours the building will wear. */
  ambiance?: Ambiance;
  lumiere?: Ambiance;
  biome?: Biome;
  /** The ranks the growth goes between: a rank inside a stage draws the piece it adds. */
  rangs?: { de: number; vers: number };
  /** A second tap: the clock goes to the end. */
  saute?: boolean;
  /** ms from the mount before the clock starts: the camera is still gliding to the building. */
  delai?: number;
}) {
  // As Maquette: the sprite follows the light, and the day lights no window.
  const vie = lumiere === "jour" ? lumiere : ambiance;
  const nuit = vie === "nuit";
  const genre = genreDeCroissance(ancien, nouveau);
  const duree = dureeMoment(genre);
  const base = useContext(RangsBldContext)?.bases[code] ?? 0;
  // The silhouette is the real final sprite: the one the engine draws at that rank (a painted
  // building's stage is not the legacy stage of the same level: a campfire at rank 10 is a tornado).
  const spriteAuRang = (rang: number): SpriteIso | undefined => {
    const data = BATIMENT_MOTEUR ? DONNEES_BLD[code] : undefined;
    if (!data || !PEINTS[code]) return undefined;
    const v = etatBatiment(data, rang, { baseRank: base, nuit, rule: "B" }).stage;
    return peintDe(code, v, vie);
  };
  const sNouveau = (rangs ? spriteAuRang(rangs.vers) : undefined) ?? spriteDe(code, nouveau, vie);
  const sAncien =
    ancien && genre === "stade"
      ? ((rangs && rangs.de > 0 ? spriteAuRang(rangs.de) : undefined) ??
        spriteDe(code, ancien, vie))
      : undefined;
  // A rank beat: the body as it stands, redrawn over the light, so the light is behind it and the
  // building is never hidden by it.
  const sRang =
    genre === "rang"
      ? ((rangs && rangs.de > 0 ? spriteAuRang(rangs.de) : undefined) ??
        spriteDe(code, ancien ?? nouveau, vie))
      : undefined;
  const sEchafaudage: SpriteIso | undefined = MAQUETTES[echafaudageDe(code)];
  // True once the clock runs: the new stage and the pieces are not shown before (no silhouette over
  // the site while the camera glides).
  const [demarre, setDemarre] = useState(delai <= 0);
  // The layer's own clock, ms from the tap.
  const h = useSharedValue(0);
  // True once the lights are on: the new stage's banner and windows show from then.
  const [allume, setAllume] = useState(false);
  // True once the moment is over: the light, the old stage, the ink and the dust are unmounted (they
  // are invisible by then) and only the new body stays until the owner drops the growth.
  const [termine, setTermine] = useState(false);
  const reduit = useMouvementReduit();
  // The pending starts, so a skip can drop them.
  const attendu = useRef<ReturnType<typeof setTimeout>[]>([]);
  // biome-ignore lint/correctness/useExhaustiveDependencies: the clock starts once per mount; the owner keys the layer by growth
  useEffect(() => {
    const debut = tempsMoment(genre, { saute: false, reduit });
    if (debut >= duree) {
      h.set(duree);
      setDemarre(true);
      setAllume(true);
      setTermine(true);
      return;
    }
    const attend = reduit ? 0 : delai;
    attendu.current = [
      // The site stands (the old stage and its scaffold) while the camera glides; the clock starts on arrival.
      // A rank's lights are on at once, with the start: no second timer of the same delay (Android
      // fires equal ones in either order).
      setTimeout(() => {
        setDemarre(true);
        h.set(withTiming(duree, { duration: duree, easing: Easing.linear }));
        if (genre !== "stade") setAllume(true);
      }, attend),
      ...(genre === "stade" ? [setTimeout(() => setAllume(true), attend + LUMIERES_MS)] : []),
      setTimeout(() => setTermine(true), attend + duree + 20),
    ];
    return () => {
      for (const id of attendu.current) clearTimeout(id);
    };
  }, []);
  useEffect(() => {
    if (!saute) return;
    for (const id of attendu.current) clearTimeout(id);
    cancelAnimation(h);
    h.set(tempsMoment(genre, { saute: true, reduit: false }));
    setDemarre(true);
    setAllume(true);
    setTermine(true);
  }, [saute, genre, h]);

  const styleLueur = useAnimatedStyle(() => {
    const p = poseMoment(genre, h.get());
    return { opacity: p.lueur * (nuit ? 1 : 0.8), transform: [{ scale: p.lueurEchelle }] };
  });
  const styleAncien = useAnimatedStyle(() => ({
    transform: [{ scale: poseMoment(genre, h.get()).ancien ? 1 : 0 }],
  }));
  const styleNouveau = useAnimatedStyle(() => ({
    transform: [{ scale: poseMoment(genre, h.get()).nouveau }],
  }));
  const stylePiece = useAnimatedStyle(() => ({
    transform: [{ scale: poseMoment(genre, h.get()).nouveau }],
  }));

  const pieces = genre === "rang" && rangs ? piecesNeuves(code, { ...rangs, base }, vie) : [];
  if (!sNouveau) return null;

  const n = pose(code, sNouveau);
  const k = n.w / sNouveau.size[0];
  const pied: readonly [number, number] = [
    n.x + sNouveau.anchor[0] * k,
    n.y + sNouveau.anchor[1] * k,
  ];
  const origineNouveau = [pied[0], pied[1], 0] as [number, number, number];
  // The light: a big one behind a stage, a small one over the upper body for a rank.
  // By the body's geometric mean for a stage: a long low sprite (the road) must not throw a glow over its neighbours.
  const taille = genre === "stade" ? Math.sqrt(n.w * n.h) * 1.15 : Math.max(n.w, n.h) * 0.5;
  const [lw, lh] = [taille, (taille * TAILLES.lueur[1]) / TAILLES.lueur[0]];
  const centre: readonly [number, number] =
    genre === "stade" ? [n.x + n.w / 2, n.y + n.h / 2] : [n.x + n.w / 2, n.y + 0.4 * n.h];
  // A long low body (the road, a wall) takes no tall glow, which would wash its neighbours: the ground pool only.
  const bas = n.h < 0.9 * n.w;
  const spriteLueur = spriteMoment(IMAGES.lueur[nuit ? "nuit" : "jour"], TAILLES.lueur);

  // The footprint: the pool at night, the puffs at its corners.
  const coins = coinsEmprise(code);
  const centreP = ecranXY(centreBatiment(code));
  const largeurSol = Math.max(...coins.map((c) => c[0])) - Math.min(...coins.map((c) => c[0]));
  const solW = 1.3 * (largeurSol + 2 * COTE);
  const solH = solW * 0.25;

  const f = echelleEchafaudage(code);
  const rEchaf = sEchafaudage ? agrandi(pose(code, sEchafaudage), sEchafaudage, f) : null;
  const rAncien = sAncien ? pose(code, sAncien) : null;
  const carte = { position: "absolute", left: 0, top: 0, width: LARGEUR, height: HAUTEUR } as const;

  return (
    <>
      {/* Behind everything of the building: the light, and at night its pool on the ground. */}
      {termine ? null : (
        <Animated.View
          pointerEvents="none"
          testID={`iso-croissance-lueur-${code}`}
          style={[carte, { transformOrigin: [centre[0], centre[1], 0] }, styleLueur]}
        >
          {bas ? null : (
            <Planche
              s={spriteLueur}
              rect={{ x: centre[0] - lw / 2, y: centre[1] - lh / 2, w: lw, h: lh }}
              testID={`iso-croissance-lueur-image-${code}`}
            />
          )}
          {/* The same light, squashed flat, pools on the ground (one image, no node of its own): at night, and by day under a low body. */}
          {(nuit || bas) && genre === "stade" ? (
            <Planche
              s={spriteLueur}
              rect={{ x: centreP[0] - solW / 2, y: centreP[1] - solH / 2, w: solW, h: solH }}
              testID={`iso-croissance-sol-image-${code}`}
            />
          ) : null}
        </Animated.View>
      )}
      {sRang && !termine ? (
        <Planche s={sRang} rect={pose(code, sRang)} testID={`iso-croissance-corps-${code}`} />
      ) : null}
      {genre === "stade" ? (
        <>
          {/* The old stage and the scaffold (or the heap of a building not there yet), then ink. */}
          {termine ? null : (
            <Animated.View
              pointerEvents="none"
              testID={`iso-croissance-ancien-${code}`}
              style={[carte, { transformOrigin: origineNouveau }, styleAncien]}
            >
              {sAncien ? null : <Tas code={code} />}
              {rAncien && sAncien ? (
                <Planche
                  s={sAncien}
                  rect={rAncien}
                  testID={`iso-croissance-ancien-image-${code}`}
                />
              ) : null}
              {sEchafaudage && rEchaf ? (
                <Planche
                  s={sEchafaudage}
                  rect={rEchaf}
                  testID={`iso-croissance-echafaudage-${code}`}
                />
              ) : null}
              <Encre
                genre={genre}
                h={h}
                pieces={[
                  ...(rAncien && sAncien
                    ? [{ s: sAncien, rect: rAncien, rebord: true, id: `ancien-${code}` }]
                    : []),
                  ...(sEchafaudage && rEchaf
                    ? [{ s: sEchafaudage, rect: rEchaf, rebord: false, id: `echafaudage-${code}` }]
                    : []),
                ]}
              />
            </Animated.View>
          )}
          {/* The new stage pops from its foot: colour, then amber rim and ink over it, then the lights. */}
          <Animated.View
            pointerEvents="none"
            testID={`iso-croissance-nouveau-${code}`}
            style={[
              carte,
              { opacity: demarre ? 1 : 0, transformOrigin: origineNouveau },
              styleNouveau,
            ]}
          >
            <Planche s={sNouveau} rect={n} testID={`iso-croissance-nouveau-image-${code}`} />
            {termine ? null : (
              <Encre
                genre={genre}
                h={h}
                pieces={[{ s: sNouveau, rect: n, rebord: true, id: `nouveau-${code}` }]}
              />
            )}
            {allume ? (
              <Fierte
                code={code}
                stade={nouveau}
                s={sNouveau}
                corps={n}
                biome={biome}
                ambiance={vie}
                legendaire={false}
                anime={false}
              />
            ) : null}
          </Animated.View>
        </>
      ) : (
        pieces.map((p) => (
          <Animated.View
            key={p.cle}
            pointerEvents="none"
            testID={`iso-croissance-piece-${code}-${p.cle}`}
            style={[
              carte,
              { transformOrigin: [p.rect.x + p.rect.w / 2, p.rect.y + p.rect.h, 0] },
              stylePiece,
            ]}
          >
            <Planche s={p.s} rect={p.rect} testID={`iso-croissance-piece-image-${code}-${p.cle}`} />
            {termine ? null : (
              <Encre
                genre={genre}
                h={h}
                pieces={[{ s: p.s, rect: p.rect, rebord: false, id: `piece-${code}-${p.cle}` }]}
              />
            )}
          </Animated.View>
        ))
      )}
      {/* The map draws the socle shadow over the sprite; a stage's layer covers it, so it is redrawn above. */}
      {genre === "stade" ? (
        <OmbreSocle
          code={code}
          socle={ombreSocleDe(code, nouveau)}
          testID={`iso-croissance-socle-${code}`}
          biome={biome}
        />
      ) : null}
      {/* Dark dust at three corners of the footprint, whatever its size (1x3 wall, 1x2 road). */}
      {genre === "stade" && !termine ? (
        <Bouffees
          code={code}
          nuit={nuit}
          centres={COINS_BOUFFEES.map((c) => [
            centreP[0] + (coins[c]?.[0] ?? 0),
            centreP[1] + (coins[c]?.[1] ?? 0),
          ])}
          pied={centreP}
          genre={genre}
          horloge={h}
        />
      ) : null}
    </>
  );
}

/**
 * The three puffs, one animated node: they swell together about the footprint's centre, which
 * also drifts them a little outward as they clear. Each is a static image box.
 */
function Bouffees({
  code,
  nuit,
  centres,
  pied,
  genre,
  horloge,
}: {
  code: BuildingCode;
  nuit: boolean;
  centres: readonly (readonly number[])[];
  pied: readonly [number, number];
  genre: GenreMoment;
  horloge: SharedValue<number>;
}) {
  const style = useAnimatedStyle(() => {
    const p = poseMoment(genre, horloge.get());
    // A small drift upward as it clears (poussiereEchelle 1 to 1.25).
    return {
      opacity: p.poussiere,
      transform: [{ translateY: -40 * (p.poussiereEchelle - 1) }, { scale: p.poussiereEchelle }],
    };
  });
  return (
    <Animated.View
      pointerEvents="none"
      testID={`iso-croissance-bouffee-${code}`}
      style={[
        ABSOLU,
        {
          left: 0,
          top: 0,
          width: LARGEUR,
          height: HAUTEUR,
          transformOrigin: [pied[0], pied[1], 0],
        },
        style,
      ]}
    >
      {centres.map((c, i) => {
        const img = IMAGES.bouffees[i];
        const repli = TAILLES.bouffees[i];
        if (!img || !repli || c[0] === undefined || c[1] === undefined) return null;
        const s = spriteMoment(img[nuit ? "nuit" : "jour"], repli);
        // 0.78 COTE: 35 % under the first size, they hid the reveal.
        const w = 0.78 * COTE;
        const h = (w * s.size[1]) / s.size[0];
        return (
          <Planche
            key={img.jour}
            s={s}
            rect={{ x: c[0] - w / 2, y: c[1] - h / 2, w, h }}
            testID={`iso-croissance-bouffee-image-${code}-${i}`}
          />
        );
      })}
    </Animated.View>
  );
}
