// The buildings engine's layers around one building (PROMPT.md §6, §9.4): add-ons, the site
// teaser, the gag slot, light points, the night-only sprite, the clan mark, the keeper, and the two
// moments (stade, rang) that play over them. The building's own image comes in as `sprite`, one
// render per stage: the engine bounces it, it never hides it (the body is on screen at every
// frame, scale 0.96 at the lowest), and it mounts the next stage's image invisible when a stade
// moment starts, so the reveal swaps an image that is already decoded (`cachePolicy="disk"` makes
// a new one decode again).
//
// Everything is in map coordinates, like the sprite it draws over: `corps` is the sprite's
// rectangle on the map, the data's points are canvas px (`taille`), `corps.w / taille[0]` dp a px.
// Z-order, back to front: add-ons `behind`, the body (the sprite and the map's own `couches`, bounced
// together by the one always-mounted view), then in front the add-ons, teaser, scaffold, gag, night
// sprite, keeper, clan mark and lights, then the dust, then `reclame`. Pieces are sized in dp, not
// in canvas px. With `masque` the building is hidden under a growth layer: nothing stands in front.
//
// Nothing here is tappable: every layer is `pointerEvents="none"`, lights are not targets, and the
// map's touch and "ready" lists (tapBatiment.ts, reclame.ts) do not know this file. A moment starts
// only when the parent hands over a `spectacle`, which it does from a tap (useSpectacleBatiment).
// With `actif` off (BATIMENT_MOTEUR, the default) this renders the sprite, `couches` and `reclame`
// in the map's own order and nothing else.
//
// shortcut: every `sprite` of the data is drawn as a flat placeholder piece, and the clan mark as an
// empty slot until its sprite is in IMAGES. When a building's paintings land, their path-to-require
// entries go there and the placeholders stay as the fallback (the mark never falls back on a
// vector). Lights breathe on the map's clock and stand still without it or with reduced motion.

import { Image } from "expo-image";
import { Fragment, type ReactNode, useContext, useEffect, useRef, useState } from "react";
import { View } from "react-native";
import Animated, {
  Easing,
  type SharedValue,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";
import type { AddOn, BuildingData, LightAnchor, Point } from "@/constants/buildingData";
import { buildingStageFor, type StageRule, type VisualStage } from "@/constants/buildingStages";
import { rawColors } from "@/constants/rawColors";
import { BATIMENT_MOTEUR, etatBatiment, type Marque } from "./batiment";
import type { Rect } from "./carteDemo";
import { useMouvementReduit } from "./fige";
import { HorlogeContext } from "./horloge";
import {
  basesA,
  chantierA,
  echelleCorps,
  echellePop,
  gonflePoussiere,
  type PlanSpectacle,
  picPoussiere,
  rangsA,
  sautGardien,
  souffleLueur,
} from "./spectacleBatiment";

export type SpectacleEnCours = { cle: string; plan: PlanSpectacle };

/** Placeholder sizes, dp: add-ons 10 or more, teasers 16 or more, figures 14 or more. */
const TAILLE = {
  addOn: 12,
  teaser: 18,
  gag: 16,
  gardien: 14,
  nuit: 20,
  echafaudage: 40,
  poussiere: 22,
};

/** The clan mark's slot by form, dp, until its sprite is painted. */
const TAILLE_MARQUE: Record<Marque, readonly [w: number, h: number]> = {
  fanion: [8, 6],
  banniere: [6, 10],
  blasonSculpte: [7, 11],
  blasonLumineux: [7, 11],
};

/** A light's size by kind, dp. */
const TAILLE_LUEUR: Record<LightAnchor["kind"], readonly [w: number, h: number]> = {
  fire: [10, 10],
  crystal: [8, 8],
  beam: [3, 16],
  fenetre: [4, 6],
  glyphe: [12, 12],
};

/** The painted sprites by data path; empty until a building's art lands. */
const IMAGES: Readonly<Record<string, number>> = {};

/** A flat piece centred on a map point. */
function Piece({
  testID,
  at,
  taille,
  couleur,
}: {
  testID: string;
  at: Point;
  taille: number;
  couleur: string;
}) {
  return (
    <View
      pointerEvents="none"
      testID={testID}
      style={{
        position: "absolute",
        left: at[0] - taille / 2,
        top: at[1] - taille / 2,
        width: taille,
        height: taille,
        backgroundColor: couleur,
      }}
    />
  );
}

/**
 * The clan mark's slot: its sprite by form when there is one, else nothing visible. Never a
 * vector stand-in, so a form with no art shows no mark rather than a wrong one.
 */
function MarqueClan({ marque, sprite, at }: { marque: Marque; sprite: string | null; at: Point }) {
  const [w, h] = TAILLE_MARQUE[marque];
  const image = sprite ? IMAGES[sprite] : undefined;
  return (
    <View
      pointerEvents="none"
      testID={`batiment-marque-${marque}`}
      style={{ position: "absolute", left: at[0] - w / 2, top: at[1], width: w, height: h }}
    >
      {image === undefined ? null : (
        <Image source={image} style={{ width: w, height: h }} contentFit="contain" />
      )}
    </View>
  );
}

function Lueur({ kind, at, reduit }: { kind: LightAnchor["kind"]; at: Point; reduit: boolean }) {
  const horloge = useContext(HorlogeContext);
  const [w, h] = TAILLE_LUEUR[kind];
  const forme = {
    position: "absolute" as const,
    left: at[0] - w / 2,
    top: at[1] - h / 2,
    width: w,
    height: h,
    borderRadius: kind === "beam" || kind === "fenetre" ? 0 : w / 2,
    backgroundColor: rawColors.isoLueur,
  };
  // A window is a fixed point; the others breathe on the map's one clock, which stops by itself.
  if (!horloge || reduit || kind === "fenetre") {
    return <View pointerEvents="none" testID={`batiment-lueur-${kind}`} style={forme} />;
  }
  return <LueurVivante kind={kind} forme={forme} horloge={horloge} />;
}

function LueurVivante({
  kind,
  forme,
  horloge,
}: {
  kind: LightAnchor["kind"];
  forme: object;
  horloge: SharedValue<number>;
}) {
  const souffle = useAnimatedStyle(() => ({
    transform: [{ scale: souffleLueur(horloge.get()) }],
  }));
  return (
    <Animated.View
      pointerEvents="none"
      testID={`batiment-lueur-${kind}`}
      style={[forme, souffle]}
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
  /** The sprite's rectangle on the map, dp. */
  corps: Rect;
  /** The sprite's canvas, px: the data's points are in it. */
  taille: Point;
  /** The anchor on the ground in the canvas, px. */
  ancre: Point;
  spectacle?: SpectacleEnCours;
  /** Called once when a moment is over (at once with reduced motion). */
  onFini?: (cle: string) => void;
  actif?: boolean;
  /** Hidden under a growth layer: nothing stands in front. */
  masque?: boolean;
  /** The building's image at a stage; `suivant` for the stage being revealed, mounted invisible. */
  sprite: (stade: VisualStage, suivant: boolean) => ReactNode;
  /** The map's own layers over the sprite (sails, fires, effects): they bounce with it. */
  couches?: ReactNode;
  /** The ready-to-rise mark: the last thing drawn. */
  reclame?: ReactNode;
};

export function BatimentMoteur({ actif = BATIMENT_MOTEUR, ...p }: PropsBatiment) {
  if (!actif) {
    const stade = buildingStageFor(p.data.code, p.rank, p.baseRank ?? 0, p.rule);
    return (
      <>
        {p.sprite(stade, false)}
        {p.couches}
        {p.reclame}
      </>
    );
  }
  return <Moteur {...p} />;
}

type Etat = ReturnType<typeof etatBatiment>;
type Geo = { px: (o: Point) => Point; ancre: Point };

/** The flat pieces in front: add-ons, teaser, scaffold, the gag slot (one thing at a time) and the night sprite. */
function Devant({
  etat,
  cible,
  chantier,
  geo,
}: {
  etat: Etat;
  /** What the stage being built has: its scaffold and its build gag. */
  cible: Etat;
  chantier: boolean;
  geo: Geo;
}) {
  const { px, ancre } = geo;
  const decale = (o: Point) => px([ancre[0] + o[0], ancre[1] + o[1]]);
  const { teaser, gag, gagSlot, nightSprite } = etat;
  const echaf = cible.chantier?.echafaudage;
  const gagChantier = cible.chantier?.gag?.at ?? gagSlot;
  return (
    <>
      {teaser ? (
        <Piece
          testID="batiment-teaser"
          at={decale(teaser.anchorOffset)}
          taille={TAILLE.teaser}
          couleur={rawColors.isoVocationBois}
        />
      ) : null}
      {chantier ? (
        <Piece
          testID="batiment-echafaudage"
          at={echaf ? decale(echaf.anchorOffset) : px(ancre)}
          taille={TAILLE.echafaudage}
          couleur={rawColors.isoVocationBois}
        />
      ) : null}
      {/* The gag slot holds one thing: the build gag during the scaffold, else the rank's beat. */}
      {gagChantier && chantier ? (
        <Piece
          testID="batiment-gag-chantier"
          at={px(gagChantier)}
          taille={TAILLE.gag}
          couleur={rawColors.isoPierreChaudeMoyen}
        />
      ) : gagSlot && gag ? (
        <Piece
          testID={`batiment-gag-${gag.rank}`}
          at={px(gagSlot)}
          taille={TAILLE.gag}
          couleur={rawColors.isoPierreChaudeMoyen}
        />
      ) : null}
      {nightSprite ? (
        <Piece
          testID="batiment-nuit"
          at={decale(nightSprite.anchorOffset)}
          taille={TAILLE.nuit}
          couleur={rawColors.isoEclat}
        />
      ) : null}
    </>
  );
}

function Gardien({
  at,
  plan,
  h,
  trace,
}: {
  at: Point;
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
          left: at[0] - TAILLE.gardien / 2,
          top: at[1] - TAILLE.gardien / 2,
          width: TAILLE.gardien,
          height: TAILLE.gardien,
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
  at,
}: {
  plan: PlanSpectacle;
  h: SharedValue<number>;
  nuit: boolean;
  at: Point;
}) {
  const gonfle = useAnimatedStyle(() => ({
    transform: [{ scale: gonflePoussiere(plan, h.get()) }],
  }));
  const t = TAILLE.poussiere;
  return (
    <Animated.View
      pointerEvents="none"
      testID="batiment-poussiere"
      style={[
        {
          position: "absolute",
          left: at[0] - t / 2,
          top: at[1] - t / 2,
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
 * The group of pieces a rise adds, as one animated node: it pops out of the building's foot at the
 * swap, a little too big, then settles.
 */
function Pop({
  plan,
  h,
  boite,
  origine,
  children,
}: {
  plan: PlanSpectacle;
  h: SharedValue<number>;
  boite: { w: number; h: number };
  origine: Point;
  children: ReactNode;
}) {
  const style = useAnimatedStyle(() => ({ transform: [{ scale: echellePop(plan, h.get()) }] }));
  return (
    <Animated.View
      pointerEvents="none"
      testID="batiment-neuf"
      style={[
        {
          position: "absolute",
          left: 0,
          top: 0,
          width: boite.w,
          height: boite.h,
          transformOrigin: [origine[0], origine[1], 0],
        },
        style,
      ]}
    >
      {children}
    </Animated.View>
  );
}

/**
 * The step a moment is at, as the ms where it started (0 before it, the total after it) and the
 * dust's peak, and the clock `h` that drives the body's bounce. Reduced motion lands on the end at
 * once. `onFini` is left out of the dependencies on purpose: a parent's inline callback is new at
 * every render and would restart the timers of a moment that is playing.
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
    const instants = plan.etapes.map((e) => e.debut);
    // The swap is at the dust's peak, in the middle of a step.
    const pic = picPoussiere(plan);
    if (pic !== undefined) instants.push(pic);
    const ids = instants.map((t) => setTimeout(() => setMarche({ cle, t }), t));
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

/** The add-ons of one layer: the ones that stand, flat, and the ones this rise brings, as one popping group. */
function Ajouts({
  layer,
  etat,
  plan,
  h,
  boite,
  pied,
  geo,
}: {
  layer: AddOn["layer"];
  etat: Etat;
  /** The plan of a moment that plays; undefined at rest and with reduced motion. */
  plan: PlanSpectacle | undefined;
  h: SharedValue<number>;
  boite: { w: number; h: number };
  pied: Point;
  geo: Geo;
}) {
  const { px, ancre } = geo;
  const couleur =
    layer === "behind" ? rawColors.isoPierreChaudeSombre : rawColors.isoPierreChaudeClair;
  const piece = (a: AddOn) => (
    <Piece
      key={a.rank}
      testID={`batiment-addon-${a.rank}`}
      at={px([ancre[0] + a.anchorOffset[0], ancre[1] + a.anchorOffset[1]])}
      taille={TAILLE.addOn}
      couleur={couleur}
    />
  );
  const ceux = etat.addOns.filter((a) => a.layer === layer);
  const neuf = (a: AddOn) => !!plan && a.rank > plan.deRang;
  return (
    <>
      {ceux.filter((a) => !neuf(a)).map(piece)}
      {plan && ceux.some(neuf) ? (
        <Pop plan={plan} h={h} boite={boite} origine={pied}>
          {ceux.filter(neuf).map(piece)}
        </Pop>
      ) : null}
    </>
  );
}

/** The three states a moment shows at `t`: the body's, the clan mark's, and the one the show raises to. */
function etatsA(
  data: BuildingData,
  plan: PlanSpectacle | undefined,
  t: number,
  {
    rank,
    baseRank,
    nuit,
    rule,
  }: { rank: number; baseRank: number; nuit: boolean; rule?: StageRule },
) {
  const rangs = plan ? rangsA(plan, t) : { corps: rank, marque: rank };
  const bases = plan ? basesA(plan, t) : { corps: baseRank, marque: baseRank };
  const etat = etatBatiment(data, rangs.corps, { baseRank: bases.corps, nuit, rule });
  const etatMarque = etatBatiment(data, rangs.marque, { baseRank: bases.marque, nuit, rule });
  // What the show is raising the building to: its stage is mounted invisible from the first frame,
  // its scaffold and build gag are the ones painted for it.
  const cible = plan
    ? etatBatiment(data, plan.versRang, { baseRank: plan.versBase, nuit, rule })
    : etat;
  return { etat, etatMarque, cible };
}

/** Everything that stands in front of the body, but the dust. */
function Avant({
  etat,
  etatMarque,
  cible,
  plan,
  t,
  h,
  reduitApp,
  boite,
  pied,
  geo,
}: {
  etat: Etat;
  etatMarque: Etat;
  cible: Etat;
  plan: PlanSpectacle | undefined;
  t: number;
  h: SharedValue<number>;
  reduitApp: boolean;
  boite: { w: number; h: number };
  pied: Point;
  geo: Geo;
}) {
  const { px } = geo;
  const joue = !!plan && !plan.reduit;
  return (
    <>
      <Ajouts
        layer="front"
        etat={etat}
        plan={joue ? plan : undefined}
        h={h}
        boite={boite}
        pied={pied}
        geo={geo}
      />
      <Devant etat={etat} cible={cible} chantier={!!plan && chantierA(plan, t)} geo={geo} />
      {etat.gardien ? (
        <Gardien
          at={px(etat.gardien.pose)}
          plan={plan}
          h={h}
          trace={!!plan && (plan.reduit || reduitApp)}
        />
      ) : null}
      {etatMarque.marque && etatMarque.marqueAt ? (
        <MarqueClan
          marque={etatMarque.marque}
          sprite={etatMarque.marqueSprite}
          at={px(etatMarque.marqueAt)}
        />
      ) : null}
      {etat.lights.map((l) => (
        <Lueur key={`${l.kind}-${l.fromRank}`} kind={l.kind} at={px(l.at)} reduit={reduitApp} />
      ))}
    </>
  );
}

function Moteur({
  data,
  rank,
  baseRank = 0,
  nuit = false,
  rule,
  corps,
  taille,
  ancre,
  spectacle,
  onFini,
  masque = false,
  sprite,
  couches,
  reclame,
}: Omit<PropsBatiment, "actif">) {
  const reduitApp = useMouvementReduit();
  const plan = spectacle?.plan;
  const { t, h } = useMoment(spectacle, reduitApp, onFini);
  const { etat, etatMarque, cible } = etatsA(data, plan, t, { rank, baseRank, nuit, rule });
  const stades = cible.stage === etat.stage ? [etat.stage] : [etat.stage, cible.stage];
  const k = corps.w / taille[0];
  const px = (o: Point): Point => [corps.x + o[0] * k, corps.y + o[1] * k];
  const geo: Geo = { px, ancre };
  const pied = px(ancre);
  const boite = { w: corps.x + corps.w, h: corps.y + corps.h };
  const styleCorps = useAnimatedStyle(() => ({
    transform: [{ scale: plan ? echelleCorps(plan, h.get()) : 1 }],
  }));
  const joue = !!plan && !plan.reduit;
  return (
    <>
      <Ajouts
        layer="behind"
        etat={etat}
        plan={joue ? plan : undefined}
        h={h}
        boite={boite}
        pied={pied}
        geo={geo}
      />
      <Animated.View
        pointerEvents="none"
        testID="batiment-corps"
        style={[
          {
            position: "absolute",
            left: 0,
            top: 0,
            width: boite.w,
            height: boite.h,
            transformOrigin: [pied[0], pied[1], 0],
          },
          styleCorps,
        ]}
      >
        {stades.map((stade) => (
          <Fragment key={stade}>{sprite(stade, stade !== etat.stage)}</Fragment>
        ))}
        {couches}
      </Animated.View>
      {masque ? null : (
        <Avant
          etat={etat}
          etatMarque={etatMarque}
          cible={cible}
          plan={plan}
          t={t}
          h={h}
          reduitApp={reduitApp}
          boite={boite}
          pied={pied}
          geo={geo}
        />
      )}
      {joue && plan ? <Poussiere plan={plan} h={h} nuit={nuit} at={pied} /> : null}
      {reclame}
    </>
  );
}
