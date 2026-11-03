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
// Z-order, back to front: add-ons `behind`, the body (the sprite, the add-ons `sousAiles` and the
// map's own `couches`, which is called with the stage the body wears so its shadow, sails and
// glows are never a stage ahead; bounced together by the one always-mounted view), then in front,
// in a second view that bounces the same way (same origin, same scale), the add-ons, teaser,
// scaffold, gag, night sprite, keeper, clan mark and lights, then the dust, then `reclame`. Pieces
// are sized in dp, not in canvas px. With `masque` the building is hidden under a growth layer:
// nothing stands in front.
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
import {
  createContext,
  Fragment,
  type ReactNode,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import { View } from "react-native";
import Animated, {
  cancelAnimation,
  Easing,
  type SharedValue,
  useAnimatedReaction,
  useAnimatedStyle,
  useDerivedValue,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";
import { scheduleOnRN } from "react-native-worklets";
import type { AddOn, BuildingData, LightAnchor, Point } from "@/constants/buildingData";
import { buildingStageFor, type StageRule, type VisualStage } from "@/constants/buildingStages";
import { rawColors } from "@/constants/rawColors";
import { BATIMENT_MOTEUR, etatBatiment, type Marque } from "./batiment";
import type { Rect } from "./carteDemo";
import { ArretAilesContext } from "./etatBld";
import { useMouvementReduit } from "./fige";
import { HorlogeContext } from "./horloge";
import { MagieCiel, MagieSol } from "./MagieBld";
import { PEINTS } from "./peints";
import {
  arretAiles,
  BOUFFEES,
  balancement,
  basesA,
  bouffee,
  chantierA,
  echelleCorps,
  echellePop,
  gesteGag,
  monteEchafaudage,
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
};

/** The keeper's reaction pose, held with reduced motion: the top of its hop, tilted. */
const POSE_REACTION = [{ translateY: -8 }, { rotate: "-6deg" }];

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

/** What a piece needs to draw a painted element: the building, its light, dp per canvas px. */
const ElementsContext = createContext<{
  code: BuildingData["code"];
  nuit: boolean;
  k: number;
} | null>(null);

/** The style of a flat square centred on a map point. */
const forme = (at: Point, taille: number, couleur: string) =>
  ({
    position: "absolute",
    left: at[0] - taille / 2,
    top: at[1] - taille / 2,
    width: taille,
    height: taille,
    backgroundColor: couleur,
  }) as const;

/** A flat piece centred on a map point. */
function Piece({
  testID,
  at,
  taille,
  couleur,
  sprite,
}: {
  testID: string;
  at: Point;
  taille: number;
  couleur: string;
  /** The data's sprite path: drawn when it is painted, else the flat placeholder. */
  sprite?: string | null;
}) {
  const ctx = useContext(ElementsContext);
  const e = sprite && ctx ? PEINTS[ctx.code]?.elements[sprite] : undefined;
  if (e && ctx) {
    const [w, h] = [e.size[0] * ctx.k, e.size[1] * ctx.k];
    return (
      <Image
        pointerEvents="none"
        testID={testID}
        source={ctx.nuit ? e.nuit : e.jour}
        style={{ position: "absolute", left: at[0] - w / 2, top: at[1] - h, width: w, height: h }}
        contentFit="contain"
      />
    );
  }
  return <View pointerEvents="none" testID={testID} style={forme(at, taille, couleur)} />;
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

function Lueur({
  kind,
  at,
  reduit,
  cycles,
}: {
  kind: LightAnchor["kind"];
  at: Point;
  reduit: boolean;
  cycles: 1 | 2 | 3;
}) {
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
  return <LueurVivante kind={kind} forme={forme} horloge={horloge} cycles={cycles} />;
}

function LueurVivante({
  kind,
  forme,
  horloge,
  cycles,
}: {
  kind: LightAnchor["kind"];
  forme: object;
  horloge: SharedValue<number>;
  cycles: 1 | 2 | 3;
}) {
  const souffle = useAnimatedStyle(() => ({
    transform: [{ scale: souffleLueur(horloge.get(), cycles) }],
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
  /** The map's own layers over the sprite (shadow, sails, fires, effects) at the stage the body wears: they bounce with it. */
  couches?: (stade: VisualStage, rang: number, base: number) => ReactNode;
  /** The ready-to-rise mark: the last thing drawn. */
  reclame?: ReactNode;
  /** Capture only: the clock of a moment runs this many times slower (a film at 7 fps misses 2.5 s). */
  ralenti?: number;
};

export function BatimentMoteur({ actif = BATIMENT_MOTEUR, ...p }: PropsBatiment) {
  if (!actif) {
    const stade = buildingStageFor(p.data.code, p.rank, p.baseRank ?? 0, p.rule);
    return (
      <>
        {p.sprite(stade, false)}
        {p.couches?.(stade, p.rank, p.baseRank ?? 0)}
        {p.reclame}
      </>
    );
  }
  return <Moteur {...p} />;
}

type Etat = ReturnType<typeof etatBatiment>;
type Geo = { px: (o: Point) => Point; ancre: Point };
type Boite = { w: number; h: number };
/** What a moment that plays gives the pieces: its plan (undefined at rest and with reduced motion), its clock, the map box. */
type Jeu = {
  plan: PlanSpectacle | undefined;
  h: SharedValue<number>;
  boite: Boite;
  /** The keeper stays on its reaction pose: the moment is over before it starts (reduced motion). */
  trace: boolean;
};

const enBoite = (b: Boite) =>
  ({ position: "absolute", left: 0, top: 0, width: b.w, height: b.h }) as const;

/**
 * One piece a rise adds, as its own animated node: it pops out at the swap from its own centre, a
 * little too big, then settles. Each piece has its own origin, so a far one never slides from the foot.
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
  boite: Boite;
  origine: Point;
  children: ReactNode;
}) {
  const style = useAnimatedStyle(() => ({ transform: [{ scale: echellePop(plan, h.get()) }] }));
  return (
    <Animated.View
      pointerEvents="none"
      testID="batiment-neuf"
      style={[enBoite(boite), { transformOrigin: [origine[0], origine[1], 0] }, style]}
    >
      {children}
    </Animated.View>
  );
}

/** A piece that pops in when it is new to this rise, else just there. */
function Neuf({
  neuf,
  jeu,
  at,
  children,
}: {
  neuf: boolean;
  jeu: Jeu;
  at: Point;
  children: ReactNode;
}) {
  if (!neuf || !jeu.plan) return <>{children}</>;
  return (
    <Pop plan={jeu.plan} h={jeu.h} boite={jeu.boite} origine={at}>
      {children}
    </Pop>
  );
}

/**
 * The keeper's hop, or its reaction pose with reduced motion. Both come out of the one animated
 * style: a fixed style next to an animated one is the one the animated style hides.
 */
function useSautGardien({ plan, h, trace }: Jeu) {
  return useAnimatedStyle(() => ({
    transform: trace ? POSE_REACTION : [{ translateY: plan ? -sautGardien(plan, h.get()) : 0 }],
  }));
}

/** Whatever it holds hops with the keeper's two jumps, or stays on the reaction pose. */
function Saute({ jeu, children }: { jeu: Jeu; children: ReactNode }) {
  const saut = useSautGardien(jeu);
  return (
    <Animated.View pointerEvents="none" style={[enBoite(jeu.boite), saut]}>
      {children}
    </Animated.View>
  );
}

/** The scaffold rises from its foot with an overshoot, then sways a little. */
function Echafaudage({ jeu, at }: { jeu: Jeu; at: Point }) {
  const { plan, h } = jeu;
  const t = TAILLE.echafaudage;
  const style = useAnimatedStyle(() => ({
    transform: [
      { scaleY: plan ? monteEchafaudage(plan, h.get()) : 1 },
      { rotate: `${plan ? balancement(plan, h.get()) : 0}deg` },
    ],
  }));
  return (
    <Animated.View
      pointerEvents="none"
      testID="batiment-echafaudage"
      style={[forme(at, t, rawColors.isoVocationBois), { transformOrigin: [t / 2, t, 0] }, style]}
    />
  );
}

/** The build gag fidgets in a loop while the scaffold stands. */
function GagChantier({ jeu, at }: { jeu: Jeu; at: Point }) {
  const { plan, h } = jeu;
  const t = TAILLE.gag;
  const style = useAnimatedStyle(() => {
    const g = plan ? gesteGag(plan, h.get()) : { rot: 0, saut: 0 };
    return { transform: [{ translateY: -g.saut }, { rotate: `${g.rot}deg` }] };
  });
  return (
    <Animated.View
      pointerEvents="none"
      testID="batiment-gag-chantier"
      style={[forme(at, t, rawColors.isoPierreChaudeMoyen), style]}
    />
  );
}

/** The flat pieces in front: add-ons, teaser, scaffold, the gag slot (one thing at a time) and the night sprite. */
function Devant({
  etat,
  depart,
  cible,
  chantier,
  jeu,
  geo,
}: {
  etat: Etat;
  /** What stood before the rise: a teaser or a beat that is not it is new, and pops in. */
  depart: Etat;
  /** What the stage being built has: its scaffold and its build gag. */
  cible: Etat;
  chantier: boolean;
  jeu: Jeu;
  geo: Geo;
}) {
  const { px, ancre } = geo;
  const decale = (o: Point) => px([ancre[0] + o[0], ancre[1] + o[1]]);
  const { teaser, gag, gagSlot, nightSprite } = etat;
  const echaf = cible.chantier?.echafaudage;
  const gagChantier = cible.chantier?.gag?.at ?? gagSlot;
  const ouGag = gag?.at ?? gagSlot;
  const piece = ouGag && gag && (
    <Neuf neuf={depart.gag !== gag} jeu={jeu} at={px(ouGag)}>
      <Piece
        testID={`batiment-gag-${gag.rank}`}
        at={px(ouGag)}
        taille={TAILLE.gag}
        couleur={rawColors.isoPierreChaudeMoyen}
        sprite={gag.sprite}
      />
    </Neuf>
  );
  return (
    <>
      {teaser ? (
        <Neuf neuf={depart.teaser !== teaser} jeu={jeu} at={decale(teaser.anchorOffset)}>
          <Piece
            testID="batiment-teaser"
            at={decale(teaser.anchorOffset)}
            taille={TAILLE.teaser}
            couleur={rawColors.isoVocationBois}
            sprite={teaser.sprite}
          />
        </Neuf>
      ) : null}
      {chantier ? (
        <Echafaudage jeu={jeu} at={echaf ? decale(echaf.anchorOffset) : px(ancre)} />
      ) : null}
      {/* The gag slot holds one thing: the build gag during the scaffold, else the rank's beat. */}
      {gagChantier && chantier ? (
        <GagChantier jeu={jeu} at={px(gagChantier)} />
      ) : piece ? (
        // Without a keeper the beat's figure is the one that reacts to the show.
        etat.gardien ? (
          piece
        ) : (
          <Saute jeu={jeu}>{piece}</Saute>
        )
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

function Gardien({ at, jeu }: { at: Point; jeu: Jeu }) {
  const saut = useSautGardien(jeu);
  return (
    <Animated.View
      pointerEvents="none"
      testID={jeu.trace ? "batiment-gardien-reagit" : "batiment-gardien"}
      style={[forme(at, TAILLE.gardien, rawColors.isoFanion), saut]}
    />
  );
}

/** One puff of the cloud: it swells and fades out, and never goes back through scale 0. */
function Bouffee({
  plan,
  h,
  i,
  centre,
  d,
  nuit,
  n,
}: {
  plan: PlanSpectacle;
  h: SharedValue<number>;
  n: number;
  i: number;
  centre: Point;
  d: number;
  nuit: boolean;
}) {
  const style = useAnimatedStyle(() => {
    const b = bouffee(plan, h.get(), i, n);
    return { opacity: b.opacite, transform: [{ scale: b.echelle }] };
  });
  return (
    <Animated.View
      pointerEvents="none"
      testID="batiment-bouffee"
      style={[
        forme(centre, d, nuit ? rawColors.isoPoussiere : rawColors.isoPoussiereJour),
        { borderRadius: d },
        style,
      ]}
    />
  );
}

/** The little puffs round a new piece, dp from its centre, and their diameter. */
const AUTOUR: readonly (readonly [dx: number, dy: number])[] = [
  [-9, 7],
  [9, 5],
  [0, -9],
];
const D_AUTOUR = 30;

/**
 * The cloud. A stage change: 7 puffs from the foot to the middle of the body that cover all of it.
 * A rank inside a stage: 3 puffs round the new piece (`neuve`), the body stays clear.
 */
function Poussiere({
  plan,
  h,
  nuit,
  corps,
  boite,
  neuve,
  pied,
}: {
  plan: PlanSpectacle;
  h: SharedValue<number>;
  nuit: boolean;
  corps: Rect;
  boite: Boite;
  /** Where the rank's new piece stands, when it has one. */
  neuve: Point | null;
  pied: Point;
}) {
  const centre = neuve ?? pied;
  const puffs: readonly { c: Point; d: number }[] =
    plan.genre === "stade"
      ? BOUFFEES.map(([bx, by, bd]) => ({
          c: [corps.x + bx * corps.w, corps.y + by * corps.h],
          d: bd * corps.w,
        }))
      : AUTOUR.map(([dx, dy]) => ({ c: [centre[0] + dx, centre[1] + dy], d: D_AUTOUR }));
  return (
    <View pointerEvents="none" testID="batiment-poussiere" style={enBoite(boite)}>
      {puffs.map(({ c, d }, i) => (
        <Bouffee
          key={`${c[0]}-${c[1]}`}
          plan={plan}
          h={h}
          i={i}
          n={puffs.length}
          centre={c}
          d={d}
          nuit={nuit}
        />
      ))}
    </View>
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
  ralenti: number,
) {
  const plan = spectacle?.plan;
  const cle = spectacle?.cle;
  const [marche, setMarche] = useState<{ cle: string; t: number } | undefined>(undefined);
  const h = useSharedValue(0);
  const dit = useRef<string | undefined>(undefined);
  const fini = () => {
    if (cle === undefined || dit.current === cle) return;
    dit.current = cle;
    onFini?.(cle);
  };
  // Every instant comes from `h`, the clock the cloud and the bounce read on the UI thread: the JS
  // side that swaps the image can only be late on the cloud, never early (a JS timer raced it).
  const instants = plan
    ? [...plan.etapes.map((e) => e.debut), picPoussiere(plan) ?? 0].sort((a, b) => a - b)
    : [];
  const total = plan?.total ?? 0;
  const avance = (n: number) => {
    if (cle === undefined) return;
    if (n > instants.length) {
      setMarche({ cle, t: total });
      fini();
    } else setMarche({ cle, t: instants[n - 1] ?? 0 });
  };
  useAnimatedReaction(
    () => {
      const v = h.get();
      if (total > 0 && v >= total) return instants.length + 1;
      return instants.filter((i) => v >= i).length;
    },
    (n, avant) => {
      if (n > 0 && n !== avant) scheduleOnRN(avance, n);
    },
    [plan, cle],
  );
  // biome-ignore lint/correctness/useExhaustiveDependencies: see above
  useEffect(() => {
    if (!plan || cle === undefined) return;
    h.set(0);
    if (plan.reduit || reduitApp) {
      // On the end: a piece's pop is on 1 and the cloud is gone, not stuck at the first frame.
      h.set(plan.total);
      setMarche({ cle, t: plan.total });
      fini();
      return;
    }
    h.set(withTiming(plan.total, { duration: plan.total * ralenti, easing: Easing.linear }));
    return () => cancelAnimation(h);
  }, [plan, cle, reduitApp, h, ralenti]);
  // Read only for its own key, so a new moment starts at 0.
  return { t: cle !== undefined && marche?.cle === cle ? marche.t : 0, h };
}

/** The add-ons of one layer: the ones that stand, flat, and the ones this rise brings, each popping from its own centre. */
function Ajouts({
  layer,
  etat,
  jeu,
  geo,
}: {
  layer: AddOn["layer"];
  etat: Etat;
  jeu: Jeu;
  geo: Geo;
}) {
  const { px, ancre } = geo;
  const couleur =
    layer === "behind" ? rawColors.isoPierreChaudeSombre : rawColors.isoPierreChaudeClair;
  const deRang = jeu.plan?.deRang;
  return (
    <>
      {etat.addOns
        .filter((a) => a.layer === layer)
        .map((a) => {
          const at = px([ancre[0] + a.anchorOffset[0], ancre[1] + a.anchorOffset[1]]);
          return (
            <Neuf key={a.rank} neuf={deRang !== undefined && a.rank > deRang} jeu={jeu} at={at}>
              <Piece
                testID={`batiment-addon-${a.rank}`}
                at={at}
                taille={TAILLE.addOn}
                couleur={couleur}
                sprite={a.sprite}
              />
            </Neuf>
          );
        })}
    </>
  );
}

/** The states a moment shows at `t`: the body's, the clan mark's, the one before the rise and the one it raises to. */
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
  const depart = plan
    ? etatBatiment(data, plan.deRang, { baseRank: plan.deBase, nuit, rule })
    : etat;
  return { etat, etatMarque, cible, depart, rang: rangs.corps, base: bases.corps };
}

/** Everything that stands in front of the body, but the dust. */
function Avant({
  etat,
  etatMarque,
  cible,
  depart,
  plan,
  t,
  jeu,
  geo,
  reduitApp,
}: {
  etat: Etat;
  etatMarque: Etat;
  cible: Etat;
  depart: Etat;
  plan: PlanSpectacle | undefined;
  t: number;
  jeu: Jeu;
  geo: Geo;
  reduitApp: boolean;
}) {
  const { px } = geo;
  return (
    <>
      <Ajouts layer="front" etat={etat} jeu={jeu} geo={geo} />
      <Devant
        etat={etat}
        depart={depart}
        cible={cible}
        chantier={!!plan && chantierA(plan, t)}
        jeu={jeu}
        geo={geo}
      />
      {etat.gardien ? <Gardien at={px(etat.gardien.pose)} jeu={jeu} /> : null}
      {etatMarque.marque && etatMarque.marqueAt ? (
        <MarqueClan
          marque={etatMarque.marque}
          sprite={etatMarque.marqueSprite}
          at={px(etatMarque.marqueAt)}
        />
      ) : null}
      {etat.lights.map((l) => (
        <Lueur
          key={`${l.kind}-${l.fromRank}`}
          kind={l.kind}
          at={px(l.at)}
          reduit={reduitApp}
          cycles={l.cycles ?? 2}
        />
      ))}
    </>
  );
}

/** Where the rank's new piece stands (an add-on, then the teaser, then the beat), else null. */
function pieceNeuve(cible: Etat, depart: Etat, { px, ancre }: Geo): Point | null {
  const ajout = cible.addOns.find((a) => !depart.addOns.includes(a));
  if (ajout) return px([ancre[0] + ajout.anchorOffset[0], ancre[1] + ajout.anchorOffset[1]]);
  const { teaser, gag, gagSlot } = cible;
  if (teaser && teaser !== depart.teaser) {
    return px([ancre[0] + teaser.anchorOffset[0], ancre[1] + teaser.anchorOffset[1]]);
  }
  const ou = gag?.at ?? gagSlot;
  return gag && gag !== depart.gag && ou ? px(ou) : null;
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
  ralenti = 1,
}: Omit<PropsBatiment, "actif">) {
  const reduitApp = useMouvementReduit();
  const plan = spectacle?.plan;
  const { t, h } = useMoment(spectacle, reduitApp, onFini, ralenti);
  const {
    etat,
    etatMarque,
    cible,
    depart,
    rang: rangCorps,
    base: baseCorps,
  } = etatsA(data, plan, t, {
    rank,
    baseRank,
    nuit,
    rule,
  });
  const stades = cible.stage === etat.stage ? [etat.stage] : [etat.stage, cible.stage];
  const k = corps.w / taille[0];
  const px = (o: Point): Point => [corps.x + o[0] * k, corps.y + o[1] * k];
  const geo: Geo = { px, ancre };
  const pied = px(ancre);
  const boite = { w: corps.x + corps.w, h: corps.y + corps.h };
  const styleCorps = useAnimatedStyle(() => {
    const [x, y] = plan ? echelleCorps(plan, h.get()) : [1, 1];
    return { transform: [{ scaleX: x }, { scaleY: y }] };
  });
  const joue = !!plan && !plan.reduit;
  const arret = useDerivedValue(() =>
    plan && joue ? arretAiles(plan, h.get()) : { angle: 0, poids: 0 },
  );
  const jeu: Jeu = {
    plan: joue ? plan : undefined,
    h,
    boite,
    trace: !!plan && (plan.reduit || reduitApp),
  };
  return (
    <ElementsContext.Provider value={{ code: data.code, nuit, k }}>
      {masque || !etat.magie ? null : <MagieSol magie={etat.magie} px={px} />}
      <Ajouts layer="behind" etat={etat} jeu={jeu} geo={geo} />
      <Animated.View
        pointerEvents="none"
        testID="batiment-corps"
        style={[enBoite(boite), { transformOrigin: [pied[0], pied[1], 0] }, styleCorps]}
      >
        {stades.map((stade) => (
          <Fragment key={stade}>{sprite(stade, stade !== etat.stage)}</Fragment>
        ))}
        <Ajouts layer="sousAiles" etat={etat} jeu={jeu} geo={geo} />
        <ArretAilesContext.Provider value={arret}>
          {couches?.(etat.stage, rangCorps, baseCorps)}
        </ArretAilesContext.Provider>
      </Animated.View>
      {masque ? null : (
        <Animated.View
          pointerEvents="none"
          testID="batiment-avant"
          style={[enBoite(boite), { transformOrigin: [pied[0], pied[1], 0] }, styleCorps]}
        >
          {etat.magie ? <MagieCiel magie={etat.magie} px={px} nuit={nuit} boite={boite} /> : null}
          <Avant
            etat={etat}
            etatMarque={etatMarque}
            cible={cible}
            depart={depart}
            plan={plan}
            t={t}
            jeu={jeu}
            geo={geo}
            reduitApp={reduitApp}
          />
        </Animated.View>
      )}
      {joue && plan ? (
        <Poussiere
          plan={plan}
          h={h}
          nuit={nuit}
          corps={corps}
          boite={boite}
          pied={pied}
          neuve={pieceNeuve(cible, depart, geo)}
        />
      ) : null}
      {reclame}
    </ElementsContext.Provider>
  );
}
