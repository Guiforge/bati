// The village tab's iso map (flag INTEGRATION, constants/isoPoc.ts): the hero's island and
// buildings. The island is the village tier's, widened by the buildings that stand (a built
// building is never cut off); a building shows when its level is above 0, at the stage
// buildingStage (buildingStageFor under the engine flag) gives its level, within the stages it has. The drawing is the demo's (IsoCarte).
// The camera starts framed on the island; pan, pinch (zoom bounded by isoSpec.zoom), a short
// inertia and a double-tap to frame again run on the UI thread (useCameraIso). A tap reads the
// sprites' masks (tapBatiment.ts) and opens the building through `onOpen`, the handler the
// village list uses. The map is hidden from the screen reader: the list is its door.

import { useContext, useEffect, useLayoutEffect, useRef, useState } from "react";
import { View, type ViewInstance } from "react-native";
import { GestureDetector, type NativeGesture } from "react-native-gesture-handler";
import Animated, {
  Easing,
  type SharedValue,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";
import spec from "@/constants/isoSpec.json";
import type { BuildingCode } from "@/db/schema";
import type { VillageBuilding, VillageTier } from "@/db/village";
import { mesurerFenetre, type Ouverture } from "./bulle";
import {
  COTE,
  CROISSANCE_CAMERA_MS,
  centreBatiment,
  ecranXY,
  etatAvec,
  etatSeul,
  HAUTEUR,
  LARGEUR,
  stadeDuNiveau,
  stadeVisuel,
  type Vue,
  vueFoyer,
  vueSur,
  ZOOM_CAPTURE,
  ZOOM_FOYER_SEUL,
  ZOOM_MAX,
} from "./carteDemo";
import { ECHAFAUDAGE_APRES_MS } from "./chantier";
import { PalierContext } from "./detail";
import { donneesSeul } from "./donneesBld";
import { RangsBldContext } from "./etatBld";
import { CroissanceContext, useBascule } from "./familles";
import { legendaire } from "./fierte";
import { FigeContext, useMouvementReduit } from "./fige";
import { type PriseVillageois, villageoisAuPoint } from "./habitants";
import { type Depart, DepartContext, HorlogeContext, useHorloge } from "./horloge";
import { IsoCarte } from "./IsoCarteDemo";
import type { Ambiance, Biome, Stade } from "./isoSpec";
import { Monde } from "./Monde";
import { dureeMoment, type GenreMoment, TENUE_MS } from "./moment";
import { carteDepuisEcran, ecranDepuisCarte } from "./navigation";
import { OmbresNuages } from "./OmbresNuages";
import { useFonduOuverture } from "./ouverture";
import { Lucioles } from "./petitsDetails";
import { LegendeRevelation } from "./Revelation";
import { ReclamablesContext, repartirReclamables } from "./reclame";
import {
  ameliore,
  GLISSE_ZOOM,
  IMPACT_MS,
  ONDE_MS,
  planOnde,
  RevelationContext,
  type RevelationVillage,
  SECOUSSE_MS,
} from "./revelation";
import { type BlasonCrest, etatStatue, statueAuPoint } from "./statue";
import { ancreBatiment, batimentAuPoint, cibles } from "./tapBatiment";
import { type MemoireCamera, useCameraIso } from "./useCameraIso";
import { useSonVillage } from "./useSonVillage";

// isoSpec.json `zoom.min`, in demo units (a game zoom of 1 is a cell of `cellDp`).
const ZOOM_MIN_JEU = (spec.zoom.min * spec.cellDp) / COTE;

/**
 * Growths played at once: each mounts 2 animated nodes (1 for the dust while its site stands, then
 * the 2 of the fade: never more than 2 at a time).
 * ponytail: the third growth and later snap to their new stage unplayed; queue them for the next
 * visit if a hero reports missing a rise.
 */
const CROISSANCES_MAX = 2;

/** A touched villager turns towards the finger this long before its bubble opens, ms (T26). */
const TOURNE_MS = 180;

/** Buildings that rose on return from a session; `cle` is the route's `grown` string, one play per value. */
export type Croissance = {
  cle: string;
  items: readonly { code: BuildingCode; oldLevel: number }[];
};

/** The owner's ref is written here, outside the component: the compiler rejects a prop written in its body. */
function brancher<T>(ref: { current: T }, valeur: T) {
  ref.current = valeur;
}

/** AUDIT-DA 36: a building on its site wears no ready glow (the yellow oval over the scaffold). */
function sansChantier(
  codes: readonly BuildingCode[] = [],
  monte: readonly { code: BuildingCode }[],
  enScene: boolean,
): readonly BuildingCode[] {
  return enScene ? codes.filter((c) => !monte.some((i) => i.code === c)) : codes;
}

/**
 * The pulse's timing, 0 to ONDE_MS once `joue` (the moment is over), and whether the village is
 * still quiet: from the tap (`enScene`) until the pulse has crossed, even when the growth step
 * stays at 2 (the owner drops it later).
 */
function useTempsOnde(enScene: boolean, joue: boolean, cle: string | undefined) {
  const t = useSharedValue(0);
  const [fini, setFini] = useState<string | undefined>(undefined);
  useEffect(() => {
    t.set(0);
    if (!joue) return;
    t.set(withTiming(ONDE_MS, { duration: ONDE_MS, easing: Easing.linear }));
    const id = setTimeout(() => setFini(cle), ONDE_MS);
    return () => clearTimeout(id);
  }, [joue, cle, t]);
  return { t, revele: enScene && fini !== cle };
}

/** How long the layer's clock waits from the tap: the camera's glide to the building, none when reduced. */
const delaiMoment = (reduit: boolean): number => (reduit ? 0 : CROISSANCE_CAMERA_MS);

/** The timers of one growth, in order; the caller clears them (see the effect that mounts them). */
function planifierCroissance({
  cle,
  reduit,
  genre,
  reveler,
  terminer,
  setPose,
  setLance,
}: {
  cle: string;
  reduit: boolean;
  genre: GenreMoment;
  reveler: () => void;
  terminer: () => void;
  setPose: (cle: string) => void;
  setLance: (v: { cle: string; etape: 1 | 2 }) => void;
}) {
  // The layer is mounted from the tap (step 1, its images decode) but its clock waits for the
  // camera to arrive (`delaiMoment`), the new stage is the map's from the moment's end (step 2),
  // and the owner drops the growth, once, a beat later.
  const duree = dureeMoment(genre);
  const delai = delaiMoment(reduit);
  if (reduit) reveler();
  return [
    setTimeout(() => setPose(cle), ECHAFAUDAGE_APRES_MS),
    setTimeout(() => setLance({ cle, etape: 1 }), 0),
    setTimeout(() => setLance({ cle, etape: 2 }), delai + duree),
    setTimeout(terminer, reduit ? 0 : delai + duree + TENUE_MS),
  ];
}

/**
 * E2, anim-39: the shake at the impact, then the slide toward the building (bible §10.7), timed from
 * the commit that mounts the growth layer (its clock starts there), so the camera never moves
 * before the silhouette has struck. Kept apart so a skip can drop them.
 */
function planifierCamera(
  premier: BuildingCode | undefined,
  joue: boolean,
  camera: Pick<ReturnType<typeof useCameraIso>, "secouer" | "glisser">,
) {
  if (!premier || !joue) return [];
  return [
    setTimeout(camera.secouer, IMPACT_MS),
    setTimeout(
      () => camera.glisser(vueSur(centreBatiment(premier), ZOOM_CAPTURE * GLISSE_ZOOM)),
      IMPACT_MS + SECOUSSE_MS,
    ),
  ];
}

/** The top of building `code` in the frame's dp, through the camera as it stands (the caption's anchor). */
function hautAEcran(
  code: BuildingCode | undefined,
  liste: ReturnType<typeof cibles>,
  vue: Vue,
  aire: { w: number; h: number },
): readonly [number, number] | null {
  const haut = code ? ancreBatiment(code, liste) : null;
  return haut ? ecranDepuisCarte(haut, vue, aire, { largeur: LARGEUR, hauteur: HAUTEUR }) : null;
}

/** Whether the pulse plays: a growth has a first building, motion is on, and the moment is over. */
function jouerRevelation(
  premier: BuildingCode | undefined,
  reduit: boolean,
  etape: 1 | 2 | undefined,
): boolean {
  return premier !== undefined && !reduit && etape === 2;
}

/** FIN-MAG: the first building to rise tells its story in one line when its stage changed (or it is new). */
function legendeDe(
  cle: string | undefined,
  premier: BuildingCode | undefined,
  reduit: boolean,
  changes: readonly { code: BuildingCode }[],
  stade: (code: BuildingCode) => Stade,
) {
  if (cle === undefined || !premier || reduit || !changes.some((i) => i.code === premier))
    return null;
  return { cle, code: premier, stade: stade(premier) };
}

/** The ready glows keep still (no animated node) in reduced motion and during the reveal. */
const sansSignal = (reduit: boolean, revele: boolean): boolean => reduit || revele;

/** The village's plan while a growth plays: quiet from the tap, the pulse (revelation.ts `planOnde`) once the moment is over; null when none plays. */
function planRevelation(
  joue: boolean,
  source: BuildingCode | undefined,
  t: SharedValue<number>,
  construits: readonly BuildingCode[],
  monte: readonly { code: BuildingCode }[],
  stade: (code: BuildingCode) => Stade,
): RevelationVillage | null {
  if (!joue || !source) return null;
  return {
    t,
    source,
    ...planOnde(
      ecranXY(centreBatiment(source)),
      construits
        .filter((code) => !monte.some((i) => i.code === code))
        .map((code) => ({
          code,
          centre: ecranXY(centreBatiment(code)),
          ameliore: ameliore(stade(code)),
        })),
    ),
  };
}

/** The island: a building alone (BatimentSeul) has its plot only, else the tier's. */
const etatDe = (seul: BuildingCode | undefined, tier: VillageTier, debout: BuildingCode[]) =>
  seul === undefined ? etatAvec(tier, debout) : etatSeul(seul);

/** The tier that sets the inhabitants: none for a building alone. */
const habitantsDe = (seul: BuildingCode | undefined, tier: VillageTier) =>
  seul === undefined ? tier : undefined;

/** The opening frame of a building alone: centred on it at the game's close zoom, whatever its rank. */
const vueSeul = (seul: BuildingCode | undefined, w: number, h: number) =>
  seul === undefined ? undefined : vueFoyer(seul, 12, "jour", w, h, ZOOM_FOYER_SEUL);

/** A lone building that goes through the engine opens once its own image has decoded. */
const attendBatiment = (seul: BuildingCode | undefined) =>
  seul !== undefined && donneesSeul(seul) !== undefined;

/** A lone building has no walkers to plan for: without a wave every family plays all the time (familles.ts). */
const departDe = (seul: BuildingCode | undefined, depart: SharedValue<Depart>) =>
  seul === undefined ? depart : null;

const AUCUNE_BASE = {};

export function IsoVillage<B extends Pick<VillageBuilding, "code" | "level">>({
  tier,
  buildings,
  width,
  height,
  onOpen,
  onBulle,
  viseur,
  bloque,
  margeBas,
  croissance,
  onCroissanceFinie,
  onRevelation,
  reclamables,
  niveauxReclames,
  basesReclamees = AUCUNE_BASE,
  ambiance = "nuit",
  lumiere = "nuit",
  biome = "defaut",
  memoire,
  blason,
  fete,
  sonActif = false,
  seul,
}: {
  tier: VillageTier;
  buildings: readonly B[];
  /** The area the island is framed in, in dp. */
  width: number;
  height: number;
  /** A tap on a building: the village list's own handler (the list is TalkBack's way in). */
  onOpen?: (building: B) => void;
  /**
   * A tap on a building opens its bubble (T14), with the point its tail aims at in window dp; when
   * set, `onOpen` is not called. Villagers are not tappable yet: T26 will add them (bulle.ts `CibleBulle`).
   */
  onBulle?: (o: Ouverture) => void;
  /** Filled by the map: what a tap at a window point would open, for the bubble's outside tap. */
  viseur?: { current: ((x: number, y: number) => Ouverture | null) | undefined };
  /** The page's scroll gesture, blocked by the map's pan so the page does not scroll under it. */
  bloque?: NativeGesture;
  /** Height at the bottom the island's framing leaves free: the village title lies over it. */
  margeBas?: number;
  /**
   * A growth to play: the camera frames the first building that rose, the sprites cross-fade.
   * Its buildings stay hidden while it is set: the owner must drop it in `onCroissanceFinie`.
   */
  croissance?: Croissance;
  /** Called once the play is over, so the owner can drop `croissance` and never replay it. */
  onCroissanceFinie?: () => void;
  /** Called once per growth, the moment the new stage shows (at the tap with reduced motion). */
  onRevelation?: () => void;
  /** Buildings ready to improve (L6-T13): they signal during a wave, the sheet offers the upgrade. */
  reclamables?: readonly BuildingCode[];
  /** The level each building was claimed at; the map draws the lower of it and the building's own. */
  niveauxReclames?: Readonly<Partial<Record<BuildingCode, number>>>;
  /** The base ranks claimed by tap, for the upgrades (rule B), read by the painted buildings. */
  basesReclamees?: Readonly<Partial<Record<BuildingCode, number>>>;
  /** The light of the pieces' sprites (decor, water, villagers): only `nuit` has some; the buildings follow `lumiere`. */
  ambiance?: Ambiance;
  /** The light of the map (lumiere.ts `choisirLumiere`): `jour` washes the ground and puts the night's lights out. */
  lumiere?: Ambiance;
  /** The ground, decor, water and world colours. */
  biome?: Biome;
  /** Held by the owner: a remount (the map changes side on a rotation) keeps the camera's view. */
  memoire?: { current: MemoireCamera | undefined };
  /**
   * Capture of one building alone (BatimentSeul): the island is its plot and two cells round it, no
   * inhabitants, and the camera opens on it at the game's close zoom, the same for every rank.
   */
  seul?: BuildingCode;
  /** The hero's crest on the square (T24); a tap on it calls `onPress`, the header's own handler. */
  blason?: { crest: BlasonCrest | null; onPress: () => void };
  /** The session's key (the route's `grown`): the first wave after a new one is a party (T26), once per key. */
  fete?: string;
  /** The hero's sound setting (T32), read by the owner so the map does not import the store. */
  sonActif?: boolean;
}) {
  const parCode = new Map<BuildingCode, B>(buildings.map((b) => [b.code, b]));
  const niveaux = new Map<BuildingCode, number>(
    buildings.map((b) => [b.code, Math.min(b.level, niveauxReclames?.[b.code] ?? b.level)]),
  );
  const { visible, montres } = etatDe(
    seul,
    tier,
    buildings.filter((b) => b.level > 0).map((b) => b.code),
  );
  const construits = montres.filter((code) => (niveaux.get(code) ?? 0) > 0);
  const stadeNiveau = (code: BuildingCode, niveau: number) => stadeDuNiveau(code, niveau);
  const horloge = useHorloge();
  const fondu = useFonduOuverture(attendBatiment(seul));
  // The map's top left in the window, read at each tap: the bubble lies over the whole screen.
  const racine = useRef<ViewInstance>(null);
  const origine = useRef<readonly [number, number]>([0, 0]);
  const reduit = useMouvementReduit();
  const fige = useContext(FigeContext);
  const cle = croissance?.cle;
  // Two nodes per growth, so at most two are played (the node budget, L5-AUD I1): the others show
  // their new stage at once, with no animation. ponytail: not replayed on the next visit.
  const monte = (croissance?.items.filter((i) => construits.includes(i.code)) ?? []).slice(
    0,
    CROISSANCES_MAX,
  );
  const premier = monte[0]?.code;
  // A site (L6-T02) before the new stage, for the buildings whose stage changes (or that were not
  // there); one whose rank rises inside a stage only gets the spring. The new stage is the
  // building's own level: the claimed one is still the old until the end callback writes it.
  const vise = (code: BuildingCode) =>
    monte.some((i) => i.code === code) ? (parCode.get(code)?.level ?? 0) : (niveaux.get(code) ?? 0);
  const avecChantier = monte.filter(
    (i) => i.oldLevel <= 0 || stadeNiveau(i.code, i.oldLevel) !== stadeNiveau(i.code, vise(i.code)),
  );
  // The `cle` whose steps have started, and the step it is at: 1 from the tap (the moment plays in
  // its layer), 2 once the moment is over (the new stage is the map's, then the owner drops the
  // growth). Reduced motion shows the new stage at once.
  const [lance, setLance] = useState<{ cle: string; etape: 1 | 2 } | undefined>(undefined);
  const etape = lance?.cle === cle ? lance?.etape : undefined;
  const enCours = cle !== undefined && !reduit && etape !== 2;
  // T16: a growth takes the families' turning seat from the next cycle boundary (familles.ts).
  const bascule = useBascule(cle !== undefined && !reduit, horloge.c);
  // The buildings that were not there: a heap of stones stands in the layer and they cast nothing yet.
  const neufs = new Set(
    cle !== undefined && !reduit
      ? avecChantier.filter((i) => i.oldLevel <= 0).map((i) => i.code)
      : [],
  );
  // A second tap skips the moment: the layer's clock goes to its end.
  const [sautee, setSautee] = useState<string | undefined>(undefined);
  const anciens = new Map(enCours ? avecChantier.map((i) => [i.code, i.oldLevel] as const) : []);
  // The engine draws a building by its rank: until the moment's end the map shows the rank it had
  // (its sprite, flames and pieces), or the new stage's flame stands over the site before the swap.
  const rangsAffiches = enCours
    ? new Map([
        ...niveaux,
        ...monte.filter((i) => i.oldLevel > 0).map((i) => [i.code, i.oldLevel] as const),
      ])
    : niveaux;
  const niveauAffiche = (code: BuildingCode) => {
    const ancien = anciens.get(code);
    return ancien !== undefined && ancien > 0 ? ancien : vise(code);
  };
  const stade = (code: BuildingCode) => stadeNiveau(code, niveauAffiche(code));
  // From the tap on, the village is quiet (no night lights, trade effects, glows or glints) until
  // the pulse of light has crossed it, once, over ONDE_MS after the moment.
  const { t: tOnde, revele } = useTempsOnde(
    premier !== undefined && !reduit && cle !== undefined,
    jouerRevelation(premier, reduit, etape),
    cle,
  );
  const plan = planRevelation(revele, premier, tOnde, construits, monte, stade);
  // H4-08: the hammers the map draws are the only ones a tap can hit (none over a site in play).
  const prets = sansChantier(reclamables, monte, cle !== undefined && !reduit);
  const touchables = cibles(construits, stade, visible, prets, (code) =>
    stadeVisuel(code, niveauAffiche(code)),
  );
  const legendaires = new Set(
    construits.filter((code) => legendaire(code, niveaux.get(code) ?? 0)),
  );
  // A stage change is drawn by its layer from a beat after the tap (the map's sprite is hidden then,
  // not before: the layer's images decode on the first frame); a rank inside a stage hides nothing.
  const [pose, setPose] = useState<string | undefined>(undefined);
  const masques = new Set(
    reduit ? [] : avecChantier.filter(() => etape === 2 || pose === cle).map((i) => i.code),
  );
  // The growth layers, played by the map in each building's place in the depth order, from the tap.
  const croissances = new Map(
    cle === undefined || reduit
      ? []
      : monte.map((i) => [
          i.code,
          {
            cle,
            ancien: i.oldLevel > 0 ? stadeDuNiveau(i.code, i.oldLevel) : null,
            nouveau: stadeNiveau(i.code, vise(i.code)),
            rangs: { de: i.oldLevel, vers: vise(i.code) },
            saute: sautee === cle,
            delai: delaiMoment(reduit),
          },
        ]),
  );
  // The owner is told once per growth, whether the scene ran its course or a touch skipped it.
  const dit = useRef<string | undefined>(undefined);
  const terminer = () => {
    if (cle === undefined || dit.current === cle) return;
    dit.current = cle;
    onCroissanceFinie?.();
  };
  const saute = useRef<string | undefined>(undefined);
  // The view the player had before the growth's first camera move, put back when the scene ends.
  const avant = useRef<Vue | undefined>(undefined);
  // The shake and slide timers of the growth: a touch that skips the scene drops them (H2-13).
  const mouvement = useRef<ReturnType<typeof setTimeout>[]>([]);
  const [legende, setLegende] = useState<{ cle: string; code: BuildingCode; stade: Stade } | null>(
    null,
  );
  const annonce = useRef<string | undefined>(undefined);
  const reveler = () => {
    // Frozen mode (E2E, captures) also reads as reduced motion: no buzz, no sound there.
    if (fige || cle === undefined || annonce.current === cle) return;
    annonce.current = cle;
    onRevelation?.();
  };
  const rendu = useRef<string | undefined>(undefined);
  const rendre = () => {
    // The scene's slide must not land after the return, nor be armed after it (a render slow to
    // commit step 2 arms it late: seen on a phone at 1 fps).
    rendu.current = cle;
    for (const x of mouvement.current) clearTimeout(x);
    mouvement.current = [];
    // The scene's slide must not land after the return (a parent slow to drop the growth leaves it armed).
    if (avant.current) camera.vers(avant.current);
    avant.current = undefined;
  };
  const passer = () => {
    if (cle === undefined) return;
    saute.current = cle;
    setSautee(cle);
    // A tap that skips the scene still gives the camera back, once (the bubble it opens is placed
    // from the view held at the touch, the finger's own, so the return does not move it).
    rendre();
    setLegende(null);
    setLance({ cle, etape: 2 });
    reveler();
    terminer();
  };
  /** The bubble a tap at (x, y) of the area opens: the building under it, aimed at its mask's top. */
  const prise = useRef<PriseVillageois | undefined>(undefined);
  // A villager (T26) before a building: it stands in front of it. `sens` is the side of the finger.
  const ouvertureEn = (
    x: number,
    y: number,
    vue: () => Vue,
  ): (Ouverture & { tourner?: { id: string; sens: 1 | -1 } }) | null => {
    const aire = { w: width, h: height };
    const carte = { largeur: LARGEUR, hauteur: HAUTEUR };
    const p = carteDepuisEcran([x, y], vue(), aire, carte);
    const v = villageoisAuPoint(p, prise.current?.cibles() ?? []);
    if (v) {
      const [ex, ey] = ecranDepuisCarte([v.pied[0], v.pied[1] - v.h], vue(), aire, carte);
      return {
        cible: { type: "villageois", id: v.id, role: v.role, habitant: v.habitant },
        ancre: [ex + origine.current[0], ey + origine.current[1]],
        tourner: { id: v.id, sens: p[0] >= v.pied[0] ? 1 : -1 },
      };
    }
    const code = batimentAuPoint(p, touchables);
    const haut = code ? ancreBatiment(code, touchables) : null;
    if (!code || !haut) return null;
    const [ex, ey] = ecranDepuisCarte(haut, vue(), aire, carte);
    return {
      cible: { type: "batiment", code },
      ancre: [ex + origine.current[0], ey + origine.current[1]],
    };
  };
  const retard = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Unmounted mid-show: the view kept for a remount is the player's, not the zoomed one. Declared
  // before the camera so this cleanup runs first and the camera's own reads the restored view.
  // biome-ignore lint/correctness/useExhaustiveDependencies: written once, on unmount
  const poserVue = useRef<(v: Vue) => void>(() => undefined);
  useLayoutEffect(
    () => () => {
      if (avant.current) poserVue.current(avant.current);
    },
    [],
  );
  const camera = useCameraIso({
    visible,
    w: width,
    h: height,
    zmin: ZOOM_MIN_JEU,
    zmax: ZOOM_MAX,
    bloque,
    margeBas,
    onToucher: horloge.touche,
    // The scene waits for a touch to skip it: the double tap's 500 ms wait would show the cage that long.
    sansDouble: cle !== undefined && !reduit,
    // A drag or a pinch during the show: the hand wins, no return.
    onMain: () => {
      avant.current = undefined;
    },
    memoire,
    vueDepart: vueSeul(seul, width, height),
    onTap: (x, y, vue) => {
      const p = carteDepuisEcran(
        [x, y],
        vue(),
        { w: width, h: height },
        {
          largeur: LARGEUR,
          hauteur: HAUTEUR,
        },
      );
      if (blason && !enCours && statueAuPoint(p, visible, etatStatue(blason.crest))) {
        blason.onPress();
        return;
      }
      const code = batimentAuPoint(p, touchables);
      const b = code ? parCode.get(code) : undefined;
      // A touch skips the scene (VI-29): the new stage shows at once and the owner is told.
      // A touch on a building still opens it (T38): the tap must not be lost to the skip.
      // Through the hold too (the finished building stands 1 s before the view goes back): a touch
      // then ends the scene and gives the view back at once.
      if (cle !== undefined && !reduit && rendu.current !== cle) passer();
      if (onBulle) {
        mesurerFenetre(racine.current, (ox, oy) => {
          origine.current = [ox, oy];
          // One pending bubble at most: a new tap replaces the villager's delayed one.
          if (retard.current) clearTimeout(retard.current);
          const o = ouvertureEn(x, y, vue);
          if (!o) return;
          // A villager turns towards the finger first, then its bubble opens (reduced motion: no turn).
          if (o.tourner && !reduit) {
            prise.current?.tourner(o.tourner.id, o.tourner.sens);
            retard.current = setTimeout(() => onBulle(o), TOURNE_MS);
          } else onBulle(o);
        });
      } else if (b) onOpen?.(b);
    },
  });
  // The camera is declared after the cleanup above, which reaches it through this ref.
  useLayoutEffect(() => {
    poserVue.current = camera.poser;
  });
  // The buzz leaves once the new stage's layer is committed, not with the timer that asks for it.
  // biome-ignore lint/correctness/useExhaustiveDependencies: `reveler` is once per `cle`
  useEffect(() => {
    if (etape !== 2) return;
    // Not after a skip: the touch already dropped the scene's camera moves.
    mouvement.current = planifierCamera(
      premier,
      !reduit && saute.current !== cle && rendu.current !== cle,
      camera,
    );
    reveler();
    // FIN-MAG: a stage that changes (or a new building) tells its story in one line.
    setLegende(legendeDe(cle, premier, reduit || saute.current === cle, avecChantier, stade));
  }, [cle, etape]);
  // T32: the village's ground sound, and the forge and the mill once zoomed on them.
  useSonVillage({
    suivi: camera.suivi,
    sonActif,
    zmin: camera.zmin,
    zmax: ZOOM_MAX,
    aire: { w: width, h: height },
    ambiance: lumiere,
    construits,
  });
  useEffect(
    () => () => {
      if (retard.current) clearTimeout(retard.current);
    },
    [],
  );
  useLayoutEffect(() => {
    if (viseur)
      brancher(viseur, (x, y) =>
        ouvertureEn(x - origine.current[0], y - origine.current[1], camera.vue),
      );
  });
  // biome-ignore lint/correctness/useExhaustiveDependencies: `cle` stands for the growth
  useEffect(() => {
    if (cle === undefined) return;
    if (premier) {
      avant.current = camera.vue();
      camera.vers(vueSur(centreBatiment(premier), ZOOM_CAPTURE));
    }
    const autres = planifierCroissance({
      cle,
      reduit,
      genre: avecChantier.length > 0 ? "stade" : "rang",
      reveler,
      terminer: () => {
        // Once, at the very end of the growth (all its buildings), unless a touch dropped it.
        rendre();
        terminer();
      },
      setPose,
      // A skip (step 2) is final: the step-1 timer, armed before it, must not undo it.
      setLance: (v) => setLance((p) => (v.etape === 1 && p?.cle === v.cle ? p : v)),
    });
    return () => {
      for (const x of [...autres, ...mouvement.current]) clearTimeout(x);
      mouvement.current = [];
    };
  }, [cle]);
  return (
    <View
      ref={racine}
      testID="iso-village"
      // The village list under the map is the screen reader's one door to each building.
      importantForAccessibility="no-hide-descendants"
      accessibilityElementsHidden
      style={{ width, height, overflow: "hidden", alignItems: "center", justifyContent: "center" }}
    >
      {/* The world around the island (no sky: an iso view looks down, T23); it follows the camera. */}
      <Monde
        biome={biome}
        width={width}
        height={height}
        fond={[camera.fond, fondu]}
        zoomMin={camera.zmin}
        visible={visible}
        lumiere={lumiere}
        palier={tier}
      />
      <GestureDetector gesture={camera.gestes}>
        <Animated.View style={{ width, height, alignItems: "center", justifyContent: "center" }}>
          <Animated.View testID="iso-camera" style={[camera.style, fondu]}>
            <HorlogeContext.Provider value={horloge.c}>
              <DepartContext.Provider value={departDe(seul, horloge.depart)}>
                {/* T16: a growth takes the turning seat of the families (familles.ts). */}
                <CroissanceContext.Provider value={bascule}>
                  <PalierContext.Provider value={camera.detail}>
                    <ReclamablesContext.Provider
                      value={
                        reclamables ? repartirReclamables(prets, sansSignal(reduit, revele)) : null
                      }
                    >
                      <RevelationContext.Provider value={plan}>
                        <RangsBldContext.Provider
                          value={{ rangs: rangsAffiches, bases: basesReclamees }}
                        >
                          <IsoCarte
                            visible={visible}
                            montres={construits}
                            seul={seul !== undefined}
                            stade={stade}
                            masques={masques}
                            echafaudages={neufs}
                            legendaires={legendaires}
                            croissances={croissances}
                            ambiance={ambiance}
                            lumiere={lumiere}
                            biome={biome}
                            blason={blason}
                            palier={habitantsDe(seul, tier)}
                            fete={fete}
                            prise={prise}
                          />
                        </RangsBldContext.Provider>
                      </RevelationContext.Provider>
                    </ReclamablesContext.Provider>
                    <Lucioles
                      visible={visible}
                      biome={biome}
                      ambiance={lumiere === "jour" ? lumiere : ambiance}
                    />
                    {/* E5: two cloud shadows drift over the whole map by day, on the one clock. */}
                    <OmbresNuages lumiere={lumiere} />
                  </PalierContext.Provider>
                </CroissanceContext.Provider>
              </DepartContext.Provider>
            </HorlogeContext.Provider>
          </Animated.View>
        </Animated.View>
      </GestureDetector>
      <LegendeRevelation
        legende={legende}
        onFin={() => setLegende(null)}
        place={{
          ancre: () => hautAEcran(legende?.code, touchables, camera.vue(), { w: width, h: height }),
          w: width,
          h: height,
          bas: margeBas,
        }}
      />
    </View>
  );
}
