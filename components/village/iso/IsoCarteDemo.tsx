// The master grid drawn in iso for the demo screen (app/dev-iso.tsx): the island of one village
// tier, the ground by kind, the shadows, and each shown building at its demo stage (carteDemo.ts
// `stadeDemo`): its image (blender's mock-up, later the painted sprite, by isoSpec `nomImage`)
// posed by its anchor, or, while it has none, its plot with a short name; then the decor and
// water pieces of the grid (pieces.ts), all sorted back to front together. Scaffolds and villagers
// are in the index only, for lot 5.
//
// Shadows are flat: the ground is drawn a second time in its shadow tones, clipped to the union of
// the exported shadows, one hull per part. The rule is `clipRule="nonzero"` on the group that wears
// the clip: react-native-svg's Android side reads it there (VirtualView.getClipPath, mClipRule of
// the clipped node), not on the paths inside the ClipPath, and defaults to evenodd, which drew
// every overlap of two parts as a hole, so shadows showed as rings (L1-T17). An Svg is a bitmap at
// its size in pixels, so the map is cut in tiles of at most 1024 px, each a viewBox onto the same
// drawing. A water image is opaque over its cell, so each carries a small veil right above it
// (`Voile`), clipped to the building and decor shadows that reach its cell, under whatever stands
// in front.
//
// The tree has one shape whatever the tier (L0-T14): every native SVG view is an Android view
// with its own RenderNode, freed only when the Java GC gets to it. The ground is one Path per
// colour and the clip one Path, so a tier change rewrites their `d` and creates no view; every
// plot crossing a tile is always mounted and hidden by `display="none"`, never by opacity: on
// Android a group whose opacity is not 1 draws through a layer bitmap the size of its tile, kept
// after (react-native-svg 15.16 GroupView.drawGroup); a hidden child is skipped, no layer.
// The images follow the same rule: one per building that has any, always mounted in depth order,
// hidden by `display: "none"` with no source. A tier change swaps the source of the buildings
// whose stage changed and reloads nothing else.
//
// Decoding (L1-T16): `contentFit="contain"` makes expo-image scale the decode to the size Glide
// is asked for (ContentFitDownsampleStrategy). Given a `require`, expo-image sends the asset's own
// width and height with the uri and turns them into Glide's `override` (SourceMap.kt,
// createGlideOptions), so Glide was asked for the file's size and decoded it whole: about 124 MB
// of Native Heap at tier 12 (qa, L1-T09). The images get the uri alone (`aLaVue`): Glide then
// measures the view, about 15 MB at tier 12 on a 2.625 screen. The view keeps its layout size
// under the camera's scale, so zooming reloads nothing, and at the closest zoom the mock-ups are
// 2.7 times upscaled, soft: detail.ts re-decodes larger once the camera rests. The only motion is
// the sails' turn on the ambient clock (horloge.ts), a rotation about their pivot, and the drawn
// flames and smoke over the sprites (FeuxDessines.tsx).

import {
  type ContextType,
  Fragment,
  type ReactElement,
  type ReactNode,
  useContext,
  useEffect,
  useLayoutEffect,
  useState,
} from "react";
import { PixelRatio, View } from "react-native";
import Animated, {
  Easing,
  type SharedValue,
  useAnimatedStyle,
  useDerivedValue,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withTiming,
} from "react-native-reanimated";
import Svg, { ClipPath, Defs, G, Path, Polygon, Text } from "react-native-svg";
import { ailesAuRang, type BuildingData } from "@/constants/buildingData";
import type { VisualStage } from "@/constants/buildingStages";
import { BATIMENT_MOTEUR } from "@/constants/isoPoc";
import { rawColors } from "@/constants/rawColors";
import type { Practice } from "@/db/crestRules";
import { type BuildingCode, buildingCodes } from "@/db/schema";
import type { VillageTier } from "@/db/village";
import { AccessoirePeint, ChampPeint, ForetSiPeinte } from "./Alentours";
import { AmbianceCarte } from "./AmbianceCarte";
import { accessoiresDans } from "./accessoires";
import {
  type Accessoire,
  type Alentours,
  AlentoursContext,
  accessoiresMontres,
  empriseAccessoire,
  horsTerrain,
  piedAccessoire,
  voileVillage,
} from "./alentours";
import { bordDe, PORTEE_BORD } from "./bord";
import { Echafaudage, Poussiere } from "./Chantier";
import { CorbeauToit } from "./CorbeauxToits";
import {
  ANIMAUX,
  type AnimalCarte,
  ailesDe,
  COTE,
  centreBatiment,
  cleAnimal,
  DECORS_EN_IMAGE,
  ECHELLE_DECODE_LANTERNE,
  type ElementCarte,
  EMPRISES_ORDRE,
  ecran,
  ecranXY,
  elementsMontes,
  enStade,
  etatCarte,
  HAUTEUR,
  LARGEUR,
  losange,
  ORDRE_CARTE,
  ombreContactDe,
  ombreSocleDe,
  ombresDans,
  ombresDe,
  ombresPiece,
  type PieceCarte,
  POSES_ANIMAL,
  pose,
  poseAiles,
  poseCentre,
  poseChute,
  posePiece,
  type Rect,
  reduitPiece,
  spriteDe,
  stadeDemo,
  stadeReel,
  tuiles,
  VERRES_LANTERNE,
  voileDe,
} from "./carteDemo";
import { type Champs, champsDe, tuilesChamps } from "./champs";
import { COUP_MS, COUPS, RETOUR_COUP_MS } from "./chantier";
import { CODES_A_CORBEAU } from "./corbeaux";
import { DONNEES_BLD } from "./donneesBld";
import { Effets } from "./Effets";
import { BannieresVocation, ChoseDeVocation, SolVocation } from "./EnsembleVocation";
import {
  ArretAilesContext,
  type EtatBld,
  EtatBldContext,
  etatDeRang,
  RangsBldContext,
} from "./etatBld";
import { Feux } from "./FeuxDessines";
import { Fierte } from "./Fierte";
import { useTour } from "./familles";
import { accrochesDe } from "./feux";
import { bannieres, eclatsAnimes, tissuBlason } from "./fierte";
import { useMouvementReduit } from "./fige";
import { poseA } from "./gestes";
import {
  type CibleVillageois,
  empriseHabitant,
  type Habitant,
  metierFavori,
  type PriseVillageois,
  placerHabitants,
  TOUCHE_H,
  TOUCHE_L,
} from "./habitants";
import {
  angleAiles,
  DepartContext,
  EffroiContext,
  HorlogeContext,
  reflet,
  type useHorloge,
} from "./horloge";
import { IsoCroissance } from "./IsoCroissance";
import { type Case, emplacements, rempart, type Sol, sol, TAILLE } from "./isoLayout";
import {
  type Ambiance,
  type Biome,
  biomes,
  GENRES_DECAL,
  type SpriteIso,
  type Stade,
  vieDe,
} from "./isoSpec";
import { echelleLisiere, retournee } from "./lisiere";
import { LUMIERES } from "./lumiere";
import { MoteurBld } from "./MoteurBld";
import { MAQUETTES } from "./maquettes";
import {
  borneRang,
  type Carte,
  orientationA,
  positionA,
  type Role,
  rangsMarcheurs,
  reposDuJour,
  type Segment,
  sensEcranA,
} from "./marcheurs";
import { OmbreContact } from "./OmbreContact";
import { ecartGrille, ombreMarcheur } from "./ombreMarcheur";
import type { Point } from "./ombres";
import { batimentCharge } from "./ouverture";
import { OmbreSocle, Planche } from "./PlancheCarte";
import { PEINTS, peintDe } from "./peints";
import { Lucioles, Rongeur } from "./petitsDetails";
import { clePiece, eauTracee } from "./pieces";
import type { Emprise } from "./profondeur";
import { blocD, type Construction, construire, type Famille, QuartiersContext } from "./quartiers";
import { Reclame } from "./Reclame";
import { PanRempart } from "./Rempart";
import { Retouches } from "./Retouches";
import { AnneauRevelation } from "./Revelation";
import { Rues } from "./RuesDessinees";
import { ReclamablesContext } from "./reclame";
import {
  type CoucheReflets,
  couvre,
  DELAIS,
  REFLET_COURSE,
  REFLET_LONG,
  refletsPar,
  traitReflet,
} from "./reflets";
import { montresDuTroncon, ombresPan, pansMontres } from "./rempart";
import { boiteDePose, poseDe } from "./reposTable";
import { RevelationContext } from "./revelation";
import { BERGE, centreEau, type Ruisseau, ruisseauDe } from "./riviere";
import { Statue } from "./Statue";
import { blob, rayonPlaque } from "./solOrganique";
import { bordsDe, dessinDecal, dessinGalet, detail, estTerre, teinteDe, terreDe } from "./solVarie";
import {
  type BlasonCrest,
  boiteStatue,
  CASE_STATUE,
  EMPRISE_STATUE,
  etatStatue,
  piedStatue,
  statueVisible,
} from "./statue";
import { couleur, place } from "./styleCarte";
import { cibles } from "./tapBatiment";
import { AnimauxContext, type MarcheurVu, useJour, useMarcheurs, type Vie } from "./useMarcheurs";
import { Veilles } from "./VeillesDessinees";
import { VariantesContext } from "./variantes";
import { VeilleContext } from "./veilleuses";
import { type Etape, type Pose, poseVie } from "./vieAnimaux";
import { EMPRISE_RAT, ratMontre } from "./vivant";
import { CASES_VOCATION, chosesDe, EMPRISES_VOCATION, vocationDeBlason } from "./vocation";

// Every colour comes from the biome (isoSpec.json biomes, token names of rawColors.ts).

type Palette = Record<Sol, string>;
/** The lit and shadowed ground palettes of a biome. */
function paletteDe(biome: Biome): { eclaire: Palette; ombre: Palette } {
  const { sol: BS, decors: BD, eau: BE } = biomes[biome];
  const eclaire: Palette = {
    herbe: couleur(BS.herbe),
    chemin: couleur(BS.chemin),
    pont: couleur(BS.chemin),
    eau: couleur(BE.couleurs.eau),
    cascade: couleur(BE.couleurs.ecume),
    arbre: couleur(BD.couleurs.arbre),
    rochers: couleur(BD.couleurs.rochers),
    bosquet: couleur(BD.couleurs.bosquet),
  };
  // Decor and foam keep their tone: the layout test keeps building and decor shadows off decor
  // cells, a decor drawn as an image stands on grass (`sols`), and the cascade's image covers the
  // foam (its veil darkens it).
  const ombre: Palette = {
    ...eclaire,
    herbe: couleur(BS.herbeOmbre),
    chemin: couleur(BS.cheminOmbre),
    pont: couleur(BS.cheminOmbre),
    eau: couleur(BE.couleurs.eauOmbre),
  };
  return { eclaire, ombre };
}

const diamant = ([gx, gy]: Case) => `M${losange([gx, gy]).replaceAll(" ", "L")}Z`;

/**
 * One `d` per colour, every colour of `palette` and `extras` present (empty when unused) so the tree
 * keeps its shape. `teinte` picks a cell's colour; by default the palette's.
 */
function sols(
  cases: readonly Case[],
  palette: Palette,
  extras: readonly string[],
  teinte?: (gx: number, gy: number) => string | null,
): [string, string][] {
  const parCouleur = new Map<string, string[]>(
    [...Object.values(palette), ...extras].map((c) => [c, []]),
  );
  for (const [gx, gy] of cases) {
    const brut = sol[gy]?.[gx] ?? "herbe";
    // A decor drawn as an image stands on grass, whether it shows yet or not.
    const s = DECORS_EN_IMAGE.has(brut) ? "herbe" : brut;
    parCouleur.get(teinte?.(gx, gy) ?? palette[s])?.push(diamant([gx, gy]));
  }
  return [...parCouleur].map(([couleur, d]) => [couleur, d.join("")]);
}

const coinsDe = (code: (typeof buildingCodes)[number]): Point[] => {
  const [gx, gy] = emplacements[code].coin;
  const [w, d] = emplacements[code].emprise;
  return [
    [gx, gy],
    [gx + w, gy],
    [gx + w, gy + d],
    [gx, gy + d],
  ];
};
const centreDe = (code: (typeof buildingCodes)[number]): Point => {
  const [gx, gy] = emplacements[code].coin;
  const [w, d] = emplacements[code].emprise;
  return ecranXY([gx + w / 2, gy + d / 2]);
};

/** The stream in a ground tile: its bank in two soft steps, then the water and its lighter heart. Static. */
function RuisseauDessine({
  ruisseau,
  ici,
  biome,
  ombre,
}: {
  ruisseau: Ruisseau;
  ici: boolean;
  biome: Biome;
  ombre: boolean;
}) {
  const C = biomes[biome].eau.couleurs;
  const berge = couleur(ombre ? C.bergeOmbre : C.berge);
  const ombree = couleur(C.eauOmbre);
  const encre = biomes[biome].sol.encre;
  const eau = ici ? ruisseau.eau : "";
  return (
    <>
      {BERGE.map(({ opacite }, k) => (
        <Path
          // biome-ignore lint/suspicious/noArrayIndexKey: fixed steps, never reordered
          key={k}
          d={ici ? (ruisseau.berge[k] ?? "") : ""}
          fill={berge}
          fillOpacity={opacite}
        />
      ))}
      {/* Flat deep water with a lighter heart: the grey texture read as tarmac (T22 round 3). */}
      <Path
        d={eau}
        fill={eau ? (ombre ? ombree : couleur(C.eau)) : "none"}
        stroke={eau ? couleur(encre) : "none"}
        strokeWidth={1.6}
        strokeLinejoin="round"
      />
      <Path
        d={ici ? ruisseau.coeur : ""}
        fill={ici ? couleur(C.coeur) : "none"}
        fillOpacity={ombre ? 0.25 : 0.5}
      />
    </>
  );
}

/** How far the island's shadow falls below it, in dp (inside the tile margin, `marge` in Tuile). */
const OMBRE_ILE = 6;

/** The fields' tints, in the order `champsDe` numbers them: two greens, a dark ochre. */
const CHAMPS_COULEURS = ["isoChampA", "isoChampB", "isoChampOcre"] as const;
/** The same by night (H4-01): the fields, the pale furrows and the hedge each have a night of their own. */
const CHAMPS_NUIT = ["isoChampANuit", "isoChampBNuit", "isoChampOcreNuit"] as const;

const COULEUR_FAMILLE = {
  artisans: "isoQuartierArtisans",
  entrainement: "isoQuartierEntrainement",
  calme: "isoQuartierCalme",
  rempart: "isoQuartierRempart",
} as const satisfies Record<Famille, keyof typeof rawColors>;

/** The colour blocks that reach a tile, one pair of paths (sides, tops) per family, back to front. */
function blocsDeTuile(quartiers: readonly Construction[], rect: Rect) {
  if (quartiers.length === 0) return [];
  const par = new Map<Famille, { haut: string; cotes: string }>();
  const visibles = quartiers
    .filter((q) => {
      const [x, y] = ecranXY([q.case[0] + 0.5, q.case[1] + 0.5]);
      return (
        x > rect.x - 40 && x < rect.x + rect.w + 40 && y > rect.y - 20 && y < rect.y + rect.h + 60
      );
    })
    .sort((a, b) => a.case[0] + a.case[1] - (b.case[0] + b.case[1]));
  for (const q of visibles) {
    const { haut, gauche, droite } = blocD(q);
    const f = par.get(q.famille) ?? { haut: "", cotes: "" };
    par.set(q.famille, { haut: f.haut + haut, cotes: f.cotes + gauche + droite });
  }
  return [...par].map(([famille, d]) => ({ famille, ...d }));
}

function Tuile({
  rect,
  cases,
  boites,
  ombres,
  i,
  biome,
  bords,
  champs,
  ruisseau,
  lumiere,
  quartiers,
  peint,
}: {
  rect: Rect;
  /** The painted layers on (alentours.ts): `sol` keeps the vector ground outside the painted terrain only, `decor` drops the drawn camp props. */
  peint: Alentours;
  /** Dev colour blocks of the small buildings (quartiers.ts); empty unless dev-iso asks. */
  quartiers: readonly Construction[];
  /** The stream on this island (riviere.ts), once per island. */
  ruisseau: Ruisseau;
  cases: readonly Case[];
  /** How far each land or stream cell is from the island's rim (solVarie.ts `bordsDe`), once per island. */
  bords: Uint8Array;
  /** The fields and hedges round the island (champs.ts), once per island. */
  champs: Champs;
  /** Shown buildings without an image at their stage: drawn as their plot. */
  boites: ReadonlySet<string>;
  /** Every shown building's and piece's shadow; the tile clips to those that reach it. */
  ombres: readonly (readonly Point[])[];
  i: number;
  biome: Biome;
  /** The light of the map: `jour` washes the ground in a pale warm colour (T15). */
  lumiere: Ambiance;
}) {
  const jour = LUMIERES[lumiere];
  const { sol: BS } = biomes[biome];
  const haie = biome === "defautNuit" ? rawColors.isoHaieNuit : rawColors.isoHaie;
  const { eclaire, ombre } = paletteDe(biome);
  const { variantes: V } = biomes[biome];
  // A cell's diamond spans COTE wide and COTE / 2 high from its top corner.
  // Plus a margin: a lawn patch or the rim's curve reaches a third of a cell past its diamond. A cell
  // on the island's rim (a neighbour not shown) also draws its bulge, bank, glints and the island's
  // shadow, PORTEE_BORD + OMBRE_ILE past it: a tile that left it out cut them in a straight line at
  // the seam (qa-audit1). Only rim cells take the wide margin (the inner ones cost +34 % cells).
  const marge = COTE / 3;
  const margeBord = Math.max(marge, PORTEE_BORD + OMBRE_ILE);
  const cleDe = (gx: number, gy: number) => gy * TAILLE + gx;
  const visibles = new Set(cases.map(([gx, gy]) => cleDe(gx, gy)));
  const rive = ([gx, gy]: Case) =>
    gx === 0 ||
    gy === 0 ||
    gx === TAILLE - 1 ||
    gy === TAILLE - 1 ||
    !(
      visibles.has(cleDe(gx + 1, gy)) &&
      visibles.has(cleDe(gx - 1, gy)) &&
      visibles.has(cleDe(gx, gy + 1)) &&
      visibles.has(cleDe(gx, gy - 1))
    );
  const touche = (x: number, y: number, h: number, m: number) =>
    x + COTE / 2 + m > rect.x &&
    x - COTE / 2 - m < rect.x + rect.w &&
    y + h + m > rect.y &&
    y - m < rect.y + rect.h;
  const dedans = cases.filter((c) => touche(...ecranXY(c), COTE / 2, rive(c) ? margeBord : marge));
  const dansTuile = new Set(dedans.map(([gx, gy]) => cleDe(gx, gy)));
  // Land (grass, path, a decor image's grass) is drawn as organic shapes, the rest as diamonds.
  const terres = dedans.filter(([gx, gy]) => estTerre(gx, gy));
  // The bridge's and the cascade's cells keep a diamond under their images; a stream cell is lawn
  // under the stream (no edge between two of them), and the stream shows in a tile that holds one.
  const eaux = dedans.filter(([gx, gy]) => !estTerre(gx, gy) && sol[gy]?.[gx] !== "eau");
  const fonds = dedans.filter(([gx, gy]) => sol[gy]?.[gx] === "eau");
  const eauIci = fonds.length > 0;
  // AUDIT-DA 17, 18, 40: one rim for every stage (bord.ts): the lawn is the diamonds and the bulges of the
  // organic contour, the patches and the dusk are clipped to them, and the edge is a bank with thickness.
  const bord = bordDe(dedans, (gx, gy) => visibles.has(cleDe(gx, gy)));
  const diamantsTerre = terres.map(diamant).join("") + fonds.map(diamant).join("");
  const dedansTerre = diamantsTerre + bord.bosses;
  // H1-07: the day's wash covers the fields too, one flat coat over land and fields, or the bulges
  // (washed) next to the fields (not) read as pale patches.
  const lavisTerre = dedansTerre + champs.teintes.join("") + eaux.map(diamant).join("");
  const enVue = (gx: number, gy: number) => visibles.has(cleDe(gx, gy));
  // Lawn patches: the variant colour of each land cell (a street's cell takes the lawn's under it).
  const plaques = V.herbe.map((e) => ({
    couleur: couleur(e.couleur),
    d: terres
      .filter(([gx, gy]) => teinteDe(gx, gy, V.herbe, V) === e.couleur)
      .map((c) => blob(...c, rayonPlaque(enVue, ...c), 1, 7, 9))
      .join(""),
  }));
  // Which plots a tile holds never changes: their screen box against the tile's.
  const terrains = buildingCodes.filter((code) => {
    const pts = coinsDe(code).map(ecranXY);
    const xs = pts.map(([x]) => x);
    const ys = pts.map(([, y]) => y);
    return (
      Math.max(...xs) > rect.x &&
      Math.min(...xs) < rect.x + rect.w &&
      Math.max(...ys) > rect.y &&
      Math.min(...ys) < rect.y + rect.h
    );
  });
  // The dusk of the rim, in the same organic shapes as the ground.
  // H0-01: one opaque colour per level, laid from the outermost in (3, 2, 1): a level is a flat step over the one before, never a translucent blot that doubles where two blobs meet.
  const sombres = ([3, 2, 1] as const).map((niveau) => ({
    niveau,
    teinte: melange(
      couleur(BS.herbe),
      couleur(V.assombri.couleur),
      V.assombri.opacites[niveau - 1] ?? 0,
    ),
    d: terres
      .concat(fonds)
      .filter(([gx, gy]) => bords[cleDe(gx, gy)] === niveau)
      .map((c) => blob(...c, niveau === 1 ? 0.82 : 1, 2))
      .join(""),
  }));
  const { rx, ry } = V.galet;
  const galets = dedans.flatMap(([gx, gy]) =>
    detail(biome, gx, gy).galets.map(([u, v, k]) => [...ecranXY([gx + u, gy + v]), k] as const),
  );
  // One path per kind of decal, the four always mounted: the pose is inside the `d`.
  const decals = GENRES_DECAL.map((genre) => ({
    genre,
    d: dedans
      .flatMap(([gx, gy]) => {
        const dc = detail(biome, gx, gy).decal;
        // B2: the round inked bushes read as flat apple-green trees; the lisiere's painted groves stand in.
        if (dc?.genre !== genre || genre === "buisson") return [];
        const [x, y] = ecranXY([gx + dc.a, gy + dc.b]);
        return [dessinDecal(genre, x, y, dc.rot)];
      })
      .join(""),
  }));
  const clip = `ombres-${i}`;
  const hors = peint.sol ? `hors-${i}` : null;
  return (
    <Svg
      width={rect.w}
      height={rect.h}
      viewBox={`${rect.x} ${rect.y} ${rect.w} ${rect.h}`}
      style={{ position: "absolute", left: rect.x, top: rect.y }}
    >
      <Defs>
        <ClipPath id={clip}>
          <Path d={ombresDans(ombres, rect)} />
        </ClipPath>
        <ClipPath id={`ilot-${i}`}>
          <Path d={bord.ilot} clipRule="nonzero" />
        </ClipPath>
        {hors ? (
          <ClipPath id={hors}>
            <Path d={horsTerrain(rect)} clipRule="evenodd" />
          </ClipPath>
        ) : null}
      </Defs>
      <SolVectoriel hors={hors}>
        {sols(eaux, eclaire, []).map(([couleur, d]) => (
          <Path key={couleur} d={d} fill={couleur} />
        ))}
      </SolVectoriel>
      {/* With the painted terrain the lawn is not drawn at all: outside the painting the island's corners lie on its floor, the tone of its faded edge, never a green wedge against it. */}
      <Pelouse sans={peint.sol}>
        {/* The island casts a shadow on the world: its own outline shifted down, one flat translucent fill (a tile's margin is wider than the shift, so a seam never cuts it). */}
        <Path
          d={bord.ilot}
          fill={rawColors.isoSocleShadow}
          clipRule="nonzero"
          transform={[{ translateY: OMBRE_ILE }]}
        />
        {/* The lawn: one base colour (the stroke hides the seams between cells), then patches of the variants. */}
        <Path
          d={diamantsTerre}
          fill={couleur(BS.herbe)}
          stroke={couleur(BS.herbe)}
          strokeWidth={1}
        />
        {/* AUDIT-DA 12: the bulges take no stroke, which drew their chords as thin lines across the lawn. */}
        <Path d={bord.bosses} fill={couleur(BS.herbe)} />
        {/* T39: flat patches, no soft edge (was a wide faint stroke): the steps of colour read like the sprites' flat inked planes. */}
        <G clipPath={`url(#ilot-${i})`} clipRule="nonzero">
          {plaques.map(({ couleur: c, d }) => (
            <Path key={c} d={d} fill={c} />
          ))}
          {/* The island's rim dusk: ink over the land cells 1 to 3 cells from the edge. AUDIT-DA 5: under the streets, whose texture showed its round edges as dark plates. */}
          {sombres.map(({ niveau, d, teinte }) => (
            <Path key={niveau} d={d} fill={teinte} />
          ))}
        </G>
        {/* FIN-CAR: the bulges carry the outermost dusk, so the lawn reaches the world's floor by a monotone ramp (lawn, dusk 3, 2, 1, bulges, floor). */}
        <Path
          d={bord.bosses}
          fill={couleur(V.assombri.couleur)}
          fillOpacity={V.assombri.opacites[0] ?? 0}
        />
      </Pelouse>
      {/* FIN-CAR: fields and low hedges where the village meets the land: flat tints, inked furrows, a hedge in a thin ink line. */}
      {champs.teintes.map((d, k) => (
        <Path
          key={CHAMPS_COULEURS[k]}
          d={d}
          fill={
            biome === "defautNuit"
              ? rawColors[CHAMPS_NUIT[k] ?? "isoChampANuit"]
              : rawColors[CHAMPS_COULEURS[k] ?? "isoChampA"]
          }
        />
      ))}
      {/* B2: two tones of furrow and a hedge on a side, no ink: the ground is never inked. */}
      <Path
        d={champs.sillonsClairs}
        stroke={biome === "defautNuit" ? rawColors.isoPreSecNuit : rawColors.isoPreSec}
        strokeOpacity={0.5}
        strokeWidth={1}
        strokeLinecap="round"
        fill="none"
      />
      <Path
        d={champs.sillons}
        stroke={haie}
        strokeOpacity={0.85}
        strokeWidth={1.1}
        strokeLinecap="round"
        fill="none"
      />
      <Path d={champs.haies} fill={haie} />
      {/* The plots before the streets: a footpath starts on a plot's edge and must stay on top of it (L6-T20). */}
      {terrains.map((code) => {
        const [cx, cy] = centreDe(code);
        const montre = boites.has(code);
        // Drawn in every tile it crosses, named in the one holding its centre only.
        const ici = cx >= rect.x && cx < rect.x + rect.w && cy >= rect.y && cy < rect.y + rect.h;
        return (
          <G
            key={code}
            display={montre ? undefined : "none"}
            testID={montre && ici ? `iso-batiment-${code}` : undefined}
          >
            <Polygon
              points={coinsDe(code).map(ecran).join(" ")}
              fill={couleur(terreDe(...emplacements[code].coin, V))}
              stroke={couleur(BS.encre)}
              strokeWidth={1.5}
            />
            <Text x={cx} y={cy + 3} fontSize={9} fill={rawColors.text} textAnchor="middle">
              {code.split("_")[0]}
            </Text>
          </G>
        );
      })}
      <Rues dedans={dansTuile} visibles={visibles} biome={biome} ombre={false} />
      <SolVectoriel hors={hors}>
        <RuisseauDessine ruisseau={ruisseau} ici={eauIci} biome={biome} ombre={false} />
      </SolVectoriel>
      {/* Pebbles on the grass edge of the path, one path for all of them. */}
      <Path
        d={galets.map(([x, y, k]) => dessinGalet(x, y, rx * k, ry * k)).join("")}
        fill={couleur(V.bordChemin)}
        stroke={couleur(BS.encre)}
        strokeWidth={V.galet.trait}
      />
      <Pelouse sans={peint.sol}>
        {decals.map(({ genre, d }) => (
          <Path
            key={genre}
            d={d}
            fill={couleur(V.decals[genre].couleur)}
            stroke={V.decals[genre].trait > 0 ? couleur(BS.encre) : undefined}
            strokeWidth={V.decals[genre].trait}
            strokeLinejoin="round"
          />
        ))}
      </Pelouse>
      {/* B2: the camp's logs, wood pile and crates round the fire, flat and inked; the painted props take their place. */}
      {peint.decor ? null : <Accessoires r={rect} />}
      {blocsDeTuile(quartiers, rect).map(({ famille, haut, cotes }) => (
        <Fragment key={famille}>
          <Path d={cotes} fill={rawColors[COULEUR_FAMILLE[famille]]} />
          <Path d={cotes} fill={rawColors.isoQuartierCote} />
          <Path d={haut} fill={rawColors[COULEUR_FAMILLE[famille]]} />
        </Fragment>
      ))}
      {/* The day: a pale warm wash over the lawn, the paths, the stream and the water (one path). AUDIT-DA 22:
          drawn before the shadows, which take a weaker wash of their own (below), so a shadow keeps its contrast by day. */}
      {jour ? (
        <Pelouse sans={peint.sol}>
          <Path
            testID={`iso-lavis-jour-${i}`}
            d={lavisTerre}
            fill={jour.lavis}
            fillOpacity={jour.opaciteLavis}
          />
        </Pelouse>
      ) : null}
      {peint.sol ? (
        // On the painted terrain a shadow is the slate laid over the painting, then the streets in their shadow tone.
        <G clipPath={`url(#${clip})`} clipRule="nonzero">
          <Path
            d={`M${rect.x} ${rect.y}h${rect.w}v${rect.h}h${-rect.w}Z`}
            fill={rawColors.isoOmbrePeinte}
          />
          <Rues dedans={dansTuile} visibles={visibles} biome={biome} ombre />
        </G>
      ) : (
        <OmbresVectorielles
          clip={clip}
          eaux={eaux}
          ombre={ombre}
          dedansTerre={dedansTerre}
          herbeOmbre={couleur(BS.herbeOmbre)}
          dansTuile={dansTuile}
          visibles={visibles}
          biome={biome}
          ruisseau={ruisseau}
          eauIci={eauIci}
          lavis={jour ? { d: lavisTerre, couleur: jour.lavis, opacite: jour.opaciteLavis } : null}
          i={i}
        />
      )}
    </Svg>
  );
}

/** The vector ground's shadows: the ground drawn again in its shadow tones, clipped to the shadows (see the header). */
function OmbresVectorielles({
  clip,
  eaux,
  ombre,
  dedansTerre,
  herbeOmbre,
  dansTuile,
  visibles,
  biome,
  ruisseau,
  eauIci,
  lavis,
  i,
}: {
  clip: string;
  eaux: readonly Case[];
  ombre: Palette;
  dedansTerre: string;
  herbeOmbre: string;
  dansTuile: ReadonlySet<number>;
  visibles: ReadonlySet<number>;
  biome: Biome;
  ruisseau: Ruisseau;
  eauIci: boolean;
  lavis: { d: string; couleur: string; opacite: number } | null;
  i: number;
}) {
  return (
    <G clipPath={`url(#${clip})`} clipRule="nonzero">
      {sols(eaux, ombre, []).map(([couleur, d]) => (
        <Path key={couleur} d={d} fill={couleur} />
      ))}
      <Path d={dedansTerre} fill={herbeOmbre} stroke={herbeOmbre} strokeWidth={1} />
      <Rues dedans={dansTuile} visibles={visibles} biome={biome} ombre />
      <RuisseauDessine ruisseau={ruisseau} ici={eauIci} biome={biome} ombre />
      {lavis ? (
        <Path
          testID={`iso-lavis-ombre-${i}`}
          d={lavis.d}
          fill={lavis.couleur}
          fillOpacity={lavis.opacite * OMBRE_LAVIS}
        />
      ) : null}
    </G>
  );
}

/** The vector lawn, its rim, its decals and the day's wash on it: none under the painted terrain's layer (`sans`). */
function Pelouse({ sans, children }: { sans: boolean; children: ReactNode }) {
  return sans ? null : children;
}

/** The vector water, everywhere, or only outside the painted terrain when `hors` names its clip (alentours.ts `horsTerrain`). */
function SolVectoriel({ hors, children }: { hors: string | null; children: ReactNode }) {
  return hors ? (
    <G clipPath={`url(#${hors})`} clipRule="evenodd">
      {children}
    </G>
  ) : (
    children
  );
}

function Accessoires({ r }: { r: Rect }) {
  const a = accessoiresDans(r);
  return (
    <>
      <Path d={a.bois} fill={rawColors.isoTronc} />
      <Path d={a.bout} fill={rawColors.isoTerre} />
      <Path d={a.haut} fill={rawColors.isoTerre} />
      <Path d={a.gauche} fill={rawColors.isoTerreAlt} />
      <Path d={a.droite} fill={rawColors.isoTerreSombre} />
      <Path
        d={a.encre}
        fill="none"
        stroke={rawColors.isoInk}
        strokeWidth={0.9}
        strokeOpacity={0.85}
        strokeLinejoin="round"
      />
    </>
  );
}

/** A colour `t` of the way from `a` to `b`, both `#rrggbb`: what `b` laid at opacity `t` over `a` comes to, opaque. */
const melange = (a: string, b: string, t: number) =>
  `#${[1, 3, 5]
    .map((i) => {
      const [u, v] = [a, b].map((h) => Number.parseInt(h.slice(i, i + 2), 16));
      return Math.round((u ?? 0) * (1 - t) + (v ?? 0) * t)
        .toString(16)
        .padStart(2, "0");
    })
    .join("")}`;

/** Share of the day's wash a shadow takes (AUDIT-DA 22): the lit ground takes all of it, a shadow half. */
const OMBRE_LAVIS = 0.5;

/**
 * A windmill's sails, turning about their pivot (the sheet's anchor) on the ambient clock: a
 * `transform` only. The wrapper sits where the sheet sits; the image inside is at its origin.
 */
export function Ailes({ s, rect, testID }: { s: SpriteIso; rect: Rect; testID: string }) {
  const horloge = useContext(HorlogeContext);
  if (!horloge) return <Planche s={s} rect={rect} testID={testID} />;
  return <AilesVivantes s={s} rect={rect} testID={testID} horloge={horloge} />;
}

function AilesVivantes({
  s,
  rect,
  testID,
  horloge,
}: {
  s: SpriteIso;
  rect: Rect;
  testID: string;
  horloge: SharedValue<number>;
}) {
  const tour = useTour("moulin");
  const arret = useContext(ArretAilesContext);
  const style = useAnimatedStyle(() => {
    const libre = angleAiles(tour(horloge.get()));
    const a = arret ? arret.get() : null;
    // A show holds the sails (still at the tap, 45 degrees at the reveal) and lets them go again.
    const angle = a && a.poids > 0 ? libre + (a.angle - libre) * a.poids : libre;
    return { transform: [{ rotate: `${angle}rad` }] };
  });
  const k = rect.w / s.size[0];
  return (
    <Animated.View
      pointerEvents="none"
      style={[place(rect), { transformOrigin: [s.anchor[0] * k, s.anchor[1] * k, 0] }, style]}
    >
      <Planche s={s} rect={{ ...rect, x: 0, y: 0 }} ancre={rect} testID={testID} />
    </Animated.View>
  );
}

type CouchesMoteur = {
  code: BuildingCode;
  donnees: BuildingData;
  vie: Ambiance;
  masque: boolean;
  biome: Biome;
};

/** Shadow, sails and glows of the stage `v` the body wears (and its rank): they change with it, at the swap. */
function couchesDe(
  { code, donnees, vie, masque, biome }: CouchesMoteur,
  v: VisualStage,
  rang: number,
  base: number,
) {
  const st = stadeReel(code, enStade(v));
  const sp = spriteDe(code, st, vie);
  const cp = sp ? pose(code, sp) : null;
  const ailes = ailesDe(code, st, vie, ailesAuRang(donnees, rang, base));
  const rectAiles = cp && sp && ailes ? poseAiles(cp, sp, ailes) : null;
  return (
    <>
      {masque ? null : (
        <OmbreSocle code={code} socle={cp ? ombreSocleDe(code, st) : null} biome={biome} />
      )}
      {ailes && rectAiles ? (
        <Ailes s={ailes} rect={rectAiles} testID={`iso-ailes-${code}`} />
      ) : null}
      {masque || !sp || !cp || PEINTS[code] ? null : (
        <>
          <Feux code={code} stade={st} s={sp} corps={cp} biome={biome} ambiance={vie} />
          <Veilles code={code} stade={st} s={sp} corps={cp} biome={biome} ambiance={vie} />
          <Effets code={code} stade={st} s={sp} corps={cp} ambiance={vie} />
          <Retouches code={code} stade={st} s={sp} corps={cp} />
        </>
      )}
    </>
  );
}

/** The engine's version of Maquette (see below): the map's own layers go inside the engine's body. */
function MaquetteMoteur({
  code,
  stade,
  masque,
  biome,
  donnees,
  bld,
  s,
  corps,
  vie,
}: {
  code: BuildingCode;
  stade: Stade;
  masque: boolean;
  biome: Biome;
  donnees: BuildingData;
  bld: EtatBld;
  s: SpriteIso;
  corps: Rect;
  vie: Ambiance;
}) {
  const image = (v: VisualStage, suivant: boolean) => {
    const st = peintDe(code, v, vie) ?? spriteDe(code, stadeReel(code, enStade(v)), vie);
    return (
      <Planche
        s={st}
        rect={st ? pose(code, st) : null}
        invisible={masque || suivant}
        onCharge={suivant ? undefined : batimentCharge}
        testID={suivant ? `iso-maquette-${code}-suivant` : `iso-maquette-${code}`}
      />
    );
  };
  const couches = (v: VisualStage, rang: number, base: number) =>
    couchesDe({ code, donnees, vie, masque, biome }, v, rang, base);
  return (
    <MoteurBld
      data={donnees}
      etat={bld}
      corps={corps}
      s={s}
      nuit={vie === "nuit"}
      masque={masque}
      sprite={image}
      couches={couches}
      reclame={masque ? null : <Reclame code={code} stade={stade} s={s} corps={corps} />}
    />
  );
}

/**
 * One building's image and, for a windmill, its sails right above it (the effects layer). A
 * building with engine data and a capture state (BatimentSeul, the engine flag on) goes through
 * the engine instead: one view at the top, always mounted, bounces the sprite and every layer of
 * this function together, and the engine's own pieces stand around it in this order: behind, the
 * sprite, these layers, in front, the dust, the ready mark. The engine draws its own clan mark, so
 * the pride banner is left out. Every other building is the tree it always was.
 */
export function Maquette({
  code,
  stade,
  masque,
  ambiance,
  lumiere = "nuit",
  biome,
  legendaire = false,
  eclatAnime = false,
  banniere = false,
  tissu = null,
}: {
  code: BuildingCode;
  stade: Stade;
  masque: boolean;
  ambiance: Ambiance;
  /** The light of the map (T15): by day the day sprite, and the night's lights stay out. */
  lumiere?: Ambiance;
  biome: Biome;
  /** At its highest rank (fierte.ts): a glint on its banner. */
  legendaire?: boolean;
  /** Its glint twinkles in a wave. */
  eclatAnime?: boolean;
  /** One of the few buildings that fly a banner (fierte.ts `bannieres`). */
  banniere?: boolean;
  /** The crest's colour for the banner (T24). */
  tissu?: string | null;
}) {
  // F2: the sprite follows the light (day painting, or its graded night); the windows, hearths and
  // watch lights are the night's: the day lights none of them.
  const vie = lumiere === "jour" ? lumiere : ambiance;
  const s = spriteDe(code, stade, vie);
  const ailes = ailesDe(code, stade, vie);
  const corps = s ? pose(code, s) : null;
  const rectAiles = corps && s && ailes ? poseAiles(corps, s, ailes) : null;
  const socle = corps ? ombreSocleDe(code, stade) : null;
  // The buildings engine: only a capture state naming this building, with its data, and the flag.
  const capture = useContext(EtatBldContext);
  const appli = useContext(RangsBldContext);
  // The village tab: a painted building at its claimed rank (and claimed base), no show.
  const donneesAppli = BATIMENT_MOTEUR ? DONNEES_BLD[code] : undefined;
  const rangAppli = appli?.rangs.get(code);
  const bld =
    capture?.code === code
      ? capture
      : donneesAppli && rangAppli
        ? etatDeRang(code, rangAppli, appli?.bases[code] ?? 0, donneesAppli)
        : null;
  const donnees = BATIMENT_MOTEUR ? bld?.donnees : undefined;
  const ombre = masque ? null : <OmbreSocle code={code} socle={socle} biome={biome} />;
  const voiles =
    ailes && rectAiles ? <Ailes s={ailes} rect={rectAiles} testID={`iso-ailes-${code}`} /> : null;
  if (donnees && bld && s && corps) {
    return <MaquetteMoteur {...{ code, stade, masque, biome, donnees, bld, s, corps, vie }} />;
  }
  return (
    <>
      <Planche s={s} rect={corps} invisible={masque} testID={`iso-maquette-${code}`} />
      {/* Hidden with its sprite: over a heap of stones it was a shadow of nothing, and the growth layer draws its own. */}
      {ombre}
      {voiles}
      {s && corps && !masque ? (
        <>
          {/* A painted building draws none of the old art's overlays: their points sit on the old canvas. */}
          {PEINTS[code] ? null : (
            <>
              <Fierte
                code={code}
                stade={stade}
                s={s}
                corps={corps}
                biome={biome}
                ambiance={vie}
                legendaire={legendaire}
                anime={eclatAnime}
                banniere={banniere}
                tissu={tissu}
              />
              <Feux code={code} stade={stade} s={s} corps={corps} biome={biome} ambiance={vie} />
              <Veilles code={code} stade={stade} s={s} corps={corps} biome={biome} ambiance={vie} />
              <Effets code={code} stade={stade} s={s} corps={corps} ambiance={vie} />
              <Retouches code={code} stade={stade} s={s} corps={corps} />
            </>
          )}
          <Reclame code={code} stade={stade} s={s} corps={corps} />
        </>
      ) : null}
    </>
  );
}

/**
 * The shadows on a water cell, over its image: the building and decor shadows that reach the cell
 * (carteDemo `voileDe`), filled with a translucent dark on the cell's diamond. A small Svg (one
 * cell, about 126 x 63 px at 2.625); an empty clip draws nothing.
 * shortcut: the veil is the flat cell, so a bridge's deck and the canal's raised banks are
 * darkened as if at ground level; lot 2's painted water decides whether its shadow is painted in.
 */
function Voile({ c, ombres, biome }: { c: Case; ombres: string; biome: Biome }) {
  const [x, y] = ecranXY(c);
  const r = { x: x - COTE / 2, y, w: COTE, h: COTE / 2 };
  const id = `voile-${c.join("-")}`;
  return (
    <Svg
      width={r.w}
      height={r.h}
      viewBox={`${r.x} ${r.y} ${r.w} ${r.h}`}
      style={place(r)}
      testID={`iso-${id}`}
    >
      <Defs>
        <ClipPath id={id}>
          <Path d={ombres} />
        </ClipPath>
      </Defs>
      <G clipPath={`url(#${id})`} clipRule="nonzero">
        <Path d={diamant(c)} fill={couleur(biomes[biome].eau.couleurs.voile)} />
      </G>
    </Svg>
  );
}

// Glints stay on the cell's own diagonal (it runs along gy, the canal), short enough to never
// reach the diamond's edge: no clip needed, and no animation in the ground tiles.
const REFLET_OPACITE = 0.55;

/** Staggers the cells' glints, fixed per cell. */
const delaiReflet = ([gx, gy]: Case) => ((gx * 3 + gy * 7) % 5) / 4;

/**
 * All the water glints, in DELAIS animated nodes instead of one per cell: a glint's course and
 * opacity depend on its stagger alone, so the cells sharing one share a translated, fading layer
 * and each glint inside it is a plain View, tilted once. The layer is drawn after the last water
 * piece (the caller picks it), so a glint shows over buildings that stand after its own water cell.
 * The caller (`refletsPar`) leaves out the cells a later sprite covers, so no glint lands on a roof.
 */
export function Reflets({
  cases,
  biome,
  k: seule,
}: {
  cases: readonly Case[];
  biome: Biome;
  /** Draw this one layer with all `cases` (the map's bands); without it the cases split by stagger. */
  k?: number;
}) {
  const horloge = useContext(HorlogeContext);
  if (!horloge) return null;
  return (
    <>
      {Array.from({ length: DELAIS }, (_, k) =>
        seule !== undefined && seule !== k ? null : (
          <RefletsVivants
            // biome-ignore lint/suspicious/noArrayIndexKey: a fixed list of five layers
            key={k}
            k={k}
            cases={
              seule === undefined ? cases.filter((c) => delaiReflet(c) === k / (DELAIS - 1)) : cases
            }
            biome={biome}
            horloge={horloge}
          />
        ),
      )}
    </>
  );
}

function RefletsVivants({
  k,
  cases,
  biome,
  horloge,
}: {
  k: number;
  cases: readonly Case[];
  biome: Biome;
  horloge: SharedValue<number>;
}) {
  const delai = k / (DELAIS - 1);
  const style = useAnimatedStyle(() => {
    const { avance, opacite } = reflet(horloge.get(), delai);
    const t = (avance - 0.5) * 2 * REFLET_COURSE;
    return {
      opacity: opacite * REFLET_OPACITE,
      transform: [{ translateX: -t }, { translateY: t / 2 }],
    };
  });
  if (cases.length === 0) return null;
  return (
    <Animated.View
      pointerEvents="none"
      testID={`iso-reflets-${k}`}
      style={[{ position: "absolute", left: 0, top: 0, width: LARGEUR, height: HAUTEUR }, style]}
    >
      {cases.map((c) => {
        const { dx, dy, long } = traitReflet(c);
        const [gx, gy] = centreEau(c);
        const [x, y] = ecranXY([gx + dx, gy + dy]);
        const demi = REFLET_LONG * long;
        return (
          <View
            key={c.join("-")}
            testID={`iso-reflet-${c.join("-")}`}
            style={{
              position: "absolute",
              left: x - demi,
              top: y - 1,
              width: demi * 2,
              height: 2,
              borderRadius: 1,
              backgroundColor: couleur(biomes[biome].eau.couleurs.ecume),
              transform: [{ rotate: "-26.57deg" }],
            }}
          />
        );
      })}
    </Animated.View>
  );
}

const ASSOMBRI_ROCHERS = 0.45;

/** AUDIT-DA 20 and 8: the big pale rocks, the foreground ones too, are darkened by the app with their own silhouette in ink. */
function AssombriRochers({
  piece,
  s,
  rect,
  opacite,
  id,
}: {
  piece: PieceCarte;
  s: SpriteIso | undefined;
  rect: Rect | null;
  opacite?: number;
  id: string;
}) {
  if (!piece.decor || !piece.cle.startsWith("decor/rochers")) return null;
  return (
    <Planche
      s={s}
      rect={rect}
      miroir={piece.miroir}
      reduit={reduitPiece(piece.cle)}
      // AUDIT-DA 8: the foreground (lisiere) rocks too, with the fade of their own piece.
      opacite={ASSOMBRI_ROCHERS * (opacite ?? 1)}
      plafond={opacite === undefined ? undefined : 0}
      echelle={opacite === undefined ? undefined : echelleLisiere(piece.cle)}
      teinte={rawColors.isoInk}
      testID={`iso-assombri-${id}`}
    />
  );
}

/** A decor or water piece on its cell, mirrored on screen when it runs along gx, and the cascade's falling sheet. */
function Piece({
  piece,
  voile,
  biome,
  opacite,
  reflets,
}: {
  piece: PieceCarte;
  voile: string;
  biome: Biome;
  opacite?: number;
  reflets?: CoucheReflets;
}) {
  const { echelleDecode } = useContext(VariantesContext);
  const chute = piece.chute ? MAQUETTES[piece.chute] : undefined;
  const id = piece.case.join("-");
  // A stream cell is drawn by the ground tile (riviere.ts): only its glint layer stays here.
  if (!piece.decor && eauTracee(piece.cle))
    return reflets ? <Reflets cases={reflets.cases} k={reflets.k} biome={biome} /> : null;
  const s = MAQUETTES[piece.cle];
  const corps = s ? posePiece(piece.case, s) : null;
  const rectChute = chute ? poseChute(piece.case, chute) : null;
  return (
    <>
      <Planche
        s={s}
        rect={corps}
        miroir={retournee(piece)}
        reduit={reduitPiece(piece.cle)}
        opacite={opacite}
        plafond={opacite === undefined ? undefined : 0}
        echelle={opacite === undefined ? undefined : echelleLisiere(piece.cle, echelleDecode)}
        testID={`iso-${opacite === undefined ? "piece" : "lisiere"}-${id}`}
      />
      <AssombriRochers piece={piece} s={s} rect={corps} opacite={opacite} id={id} />
      {piece.decor || !corps ? null : <Voile c={piece.case} ombres={voile} biome={biome} />}
      {reflets ? <Reflets cases={reflets.cases} k={reflets.k} biome={biome} /> : null}
      {chute ? (
        <Planche s={chute} rect={rectChute} miroir={piece.miroir} testID={`iso-chute-${id}`} />
      ) : null}
    </>
  );
}

/** A decor or water piece, or the lisiere's: the lisiere fades, a water cell takes the shadow veil. */
function PieceOuLisiere({
  e,
  ambiance,
  biome,
  portees,
  lisiere,
  reflets,
}: {
  e: Extract<ElementCarte, { type: "piece" | "lisiere" }>;
  ambiance: Ambiance;
  biome: Biome;
  portees: readonly Point[][];
  lisiere: ReadonlyMap<string, number>;
  reflets: ReadonlyMap<string, CoucheReflets>;
}) {
  const voile = e.type === "piece" && !e.piece.decor ? voileDe(e.piece.case, portees) : "";
  const opacite = e.type === "lisiere" ? lisiere.get(e.piece.case.join(",")) : undefined;
  // The lisiere is stored without an ambiance: its image key is resolved here.
  const piece =
    e.type === "lisiere"
      ? { ...e.piece, cle: clePiece(e.piece.famille, e.piece.nom, ambiance) }
      : e.piece;
  return (
    <Piece
      piece={piece}
      biome={biome}
      voile={voile}
      opacite={opacite}
      reflets={reflets.get(piece.case.join(","))}
    />
  );
}

/** A standing villager or a prop on its cell: its anchor on the cell's bottom corner, drawn at its `pxScale`. */
function Figurine({
  piece,
  ambiance,
  lumiere = "nuit",
}: {
  piece: PieceCarte;
  ambiance: Ambiance;
  lumiere?: Ambiance;
}) {
  // The same light as the buildings' windows (`vie` in Batiment): the day puts the glass out.
  const vie = lumiere === "jour" ? lumiere : ambiance;
  const s = MAQUETTES[piece.cle];
  const rect = s
    ? piece.cle.startsWith("decor/")
      ? posePiece(piece.case, s)
      : poseCentre(piece.case, s)
    : null;
  const id = piece.case.join("-");
  return (
    <>
      <Planche
        s={s}
        rect={rect}
        echelle={piece.cle.startsWith("decor/lanterne") ? ECHELLE_DECODE_LANTERNE : undefined}
        reduit={reduitPiece(piece.cle)}
        testID={`iso-figurine-${id}`}
      />
      {s && rect && vie === "jour" && piece.cle.startsWith("decor/lanterne") ? (
        <Svg
          pointerEvents="none"
          testID={`iso-lanterne-jour-${id}`}
          width={rect.w}
          height={rect.h}
          viewBox={`0 0 ${s.size[0]} ${s.size[1]}`}
          style={{
            position: "absolute",
            left: rect.x,
            top: rect.y,
            // The same reduction as the lamp post's image, about its anchor.
            transformOrigin: [
              (s.anchor[0] * rect.w) / s.size[0],
              (s.anchor[1] * rect.h) / s.size[1],
              0,
            ],
            transform: [{ scale: reduitPiece(piece.cle) }],
          }}
        >
          {VERRES_LANTERNE.map((points) => (
            <Polygon
              key={points}
              points={points}
              fill={rawColors.isoFenetreEteinte}
              stroke={rawColors.isoInk}
              strokeWidth={4}
            />
          ))}
        </Svg>
      ) : null}
    </>
  );
}

/**
 * A small animal on its cell. Its three poses are three images stacked, all mounted; the clock
 * only moves their opacity (0 or 1), so nothing reloads. IsoVillage always provides the clock (it
 * rests on an even cycle when unfocused or with reduced motion), so there all three poses stay
 * mounted and the rest one shows; only a map with no provider mounts the rest pose alone. Never a
 * tap target: `pointerEvents="none"`.
 */
export function Animal({ a, ambiance = "nuit" }: { a: AnimalCarte; ambiance?: Ambiance }) {
  const horloge = useContext(HorlogeContext);
  const animaux = useContext(AnimauxContext);
  const marche = animaux?.betes.find((b) => b.nom === a.nom);
  const poses = POSES_ANIMAL.map((p) => MAQUETTES[cleAnimal(a.nom, p, ambiance)]);
  // The pose held outside a wave (vieAnimaux.ts): the plan's own in a wave, the day's otherwise.
  const jour = useJour();
  const posRepos = marche?.repos ?? reposDuJour(jour, a.nom);
  const repos = poses[posRepos] ?? poses[0];
  if (!repos) return null;
  const rect = poseCentre(a.piece.case, repos);
  const id = `iso-animal-${a.nom}`;
  const pieds = [
    (repos.anchor[0] * rect.w) / repos.size[0],
    (repos.anchor[1] * rect.h) / repos.size[1],
  ] as const;
  if (!horloge)
    return (
      <>
        <OmbreContact x={rect.x + pieds[0]} y={rect.y + pieds[1]} largeur={OMBRE_ANIMAL_L} />
        <Planche s={repos} rect={rect} testID={id} />
      </>
    );
  return (
    <AnimalVivant
      poses={poses}
      rect={rect}
      id={id}
      horloge={horloge}
      segments={marche?.segments ?? null}
      vie={marche?.vie ?? null}
      posRepos={posRepos}
      c0={animaux?.c0 ?? 0}
      cellule={a.piece.case}
      // Mirrored about the view's centre, the feet (the anchor) land `retour` too far right: moved back by it.
      retour={rect.w - 2 * pieds[0]}
      pieds={pieds}
    />
  );
}

/**
 * The animal's three poses, each a node with the contact oval at its feet, so the shadow goes where
 * the animal goes (no node added: the oval is a still drawing in a node that already moves). Two
 * derived values feed them: the pose (8 images a second, 4 changes a loop) and the walk (the
 * translation from the clock and a mirror on its way left), computed once a frame, not once a pose.
 * At rest the walk's transform is the identity.
 */
function AnimalVivant({
  poses,
  rect,
  id,
  horloge,
  segments,
  vie,
  posRepos,
  c0,
  cellule,
  retour,
  pieds,
}: {
  poses: (SpriteIso | undefined)[];
  rect: Rect;
  id: string;
  horloge: SharedValue<number>;
  /** Its walk in the wave on now, or null: it stays on its cell. */
  segments: readonly Segment[] | null;
  /** Its behaviours in the wave on now, or null: it holds `posRepos`. */
  vie: readonly Etape[] | null;
  posRepos: Pose;
  c0: number;
  cellule: Case;
  retour: number;
  /** Where its feet (the sheet's anchor) are in the view, dp. */
  pieds: readonly [number, number];
}) {
  // Derived, not a shared value seeded from the clock, which would read the clock during render.
  const pose = useDerivedValue<number>(() =>
    vie ? poseVie(vie, horloge.get() - c0, posRepos) : posRepos,
  );
  const [cx, cy] = cellule;
  const marche = useDerivedValue(() => {
    if (!segments) return IMMOBILE;
    const t = horloge.get() - c0;
    const p = positionA(segments, t);
    const sens = sensEcranA(segments, t);
    return {
      x: ((p.x - p.y - (cx - cy)) * COTE) / 2 + (sens < 0 ? -retour : 0),
      y: ((p.x + p.y - (cx + cy + 1)) * COTE) / 4,
      sens,
    };
  });
  return (
    <>
      {poses.map((s, i) => (
        <PoseAnimale
          key={POSES_ANIMAL[i]}
          s={s}
          rect={rect}
          i={i}
          pose={pose}
          marche={marche}
          pieds={pieds}
          testID={`${id}-${POSES_ANIMAL[i]}`}
        />
      ))}
    </>
  );
}

const IMMOBILE = { x: 0, y: 0, sens: 1 };

/** One pose of an animal's sheet and its shadow: shown when the clock's pose is its own, moved by the walk. */
function PoseAnimale({
  s,
  rect,
  i,
  pose,
  marche,
  pieds,
  testID,
}: {
  s: SpriteIso | undefined;
  rect: Rect;
  i: number;
  pose: SharedValue<number>;
  marche: SharedValue<{ x: number; y: number; sens: number }>;
  pieds: readonly [number, number];
  testID: string;
}) {
  const style = useAnimatedStyle(() => {
    const m = marche.get();
    return {
      opacity: pose.get() === i ? 1 : 0,
      transform: [{ translateX: m.x }, { translateY: m.y }, { scaleX: m.sens }],
    };
  });
  return (
    <Animated.View pointerEvents="none" testID={`${testID}-marche`} style={[place(rect), style]}>
      <OmbreContact x={pieds[0]} y={pieds[1]} largeur={OMBRE_ANIMAL_L} />
      <Planche s={s} rect={{ ...rect, x: 0, y: 0 }} ancre={rect} testID={testID} />
    </Animated.View>
  );
}

/** Half a walking step of the bounce, ms: a step is two of them (the feet strike twice a second or so). */
const PERIODE_PAS_MS = 380;
/** The bounce's height, dp. */
const SAUT_PAS = 2;

/** How high a villager rises on its toes before a strike, dp, and how far it leans back, degrees (a strike swings it past upright, so the blow reads without an arm drawn). */
const LEVEE_COUP = 5;
const PENCHE_COUP = 26;

const ORIENTATION_DEBOUT = { dos: false, miroir: false };

const spriteMarcheur = (role: Role, dos: boolean) =>
  MAQUETTES[clePiece("villageois", `${role}_${dos ? "dos" : "face"}`)];

/** The oval shadow under a villager, dp: a cell is COTE wide and COTE / 2 high. */
const OMBRE_L = COTE * 0.4; // the contact shadow's width (OmbreContact.tsx)
/** The same under a small animal (a hen, a cat): a little over half a villager's. */
const OMBRE_ANIMAL_L = COTE * 0.24;

/**
 * A villager on the map. Standing or walking it is the same tree, one animated node holding a
 * shadow oval and the image, so the image is never mounted again when a wave starts or ends. The
 * node's translation is zero when it stands and read from the clock when it walks, plus a small
 * bounce (no walking poses are drawn). Which way it faces and whether it is mirrored are the
 * segment's, set in JS when the segment changes, as is its place in the depth order. Never a tap
 * target, never read aloud.
 */
function Marcheur({
  m,
  horloge,
  tourne,
}: {
  m: MarcheurVu;
  horloge: SharedValue<number> | null;
  /** Turned towards a finger (T26): the side it shows while it stands. */
  tourne?: 1 | -1;
}) {
  const { segments } = m;
  const marche = segments !== null && horloge !== null;
  const { dos, miroir } = segments
    ? orientationA(segments, m.indice)
    : tourne !== undefined
      ? { dos: false, miroir: tourne === -1 }
      : ORIENTATION_DEBOUT;
  const s = spriteMarcheur(m.role, dos);
  const role = m.role;
  const rect = s ? poseCentre(m.cellule, s) : null;
  const [cx, cy] = m.cellule;
  const c0 = m.c0;
  // A strike at a building site: lean back slowly, swing through past upright fast (the blow lands
  // at the end of each cycle, chantier.ts `impact`), a fixed number of times, out of step with the
  // others; the same node as the walk, and 0 the rest of the time.
  const coup = useSharedValue(0);
  const reduit = useMouvementReduit();
  const frappe = reduit ? undefined : m.frappe;
  useEffect(() => {
    coup.set(
      frappe === undefined
        ? 0
        : withDelay(
            frappe,
            withSequence(
              withRepeat(
                withSequence(
                  withTiming(1, { duration: COUP_MS * 0.7 }),
                  withTiming(-0.45, { duration: COUP_MS * 0.3, easing: Easing.in(Easing.quad) }),
                ),
                COUPS,
              ),
              // Upright again after the last blow, not leaning until the site unmounts.
              withTiming(0, { duration: RETOUR_COUP_MS }),
            ),
          ),
    );
  }, [coup, frappe]);
  const style = useAnimatedStyle(() => {
    if (!segments || !horloge)
      return {
        transform: [
          { translateX: 0 },
          { translateY: -LEVEE_COUP * Math.max(coup.get(), 0) },
          { rotate: `${-PENCHE_COUP * coup.get()}deg` },
        ],
      };
    const t = horloge.get() - c0;
    const p = positionA(segments, t);
    // ecranXY of the walker's centre less that of the start cell's centre, where the view sits.
    const { dx, dy } = ecartGrille(p, cx, cy, COTE);
    const saut = p.marche ? -Math.abs(Math.sin((t * Math.PI) / PERIODE_PAS_MS)) * SAUT_PAS : 0;
    // At a work stop the role's gesture (gestes.ts), about the feet; "forward" is the way it faces.
    const g = poseA(role, segments, t);
    return {
      transform: [
        { translateX: dx },
        { translateY: dy + saut - g.leve },
        { rotate: `${(miroir ? -1 : 1) * g.penche}deg` },
        { scaleY: 1 - g.ecrase },
      ],
    };
  });
  if (!rect) return null;
  const id = `iso-marcheur-${m.role}`;
  // The feet are on the cell's centre, which is the sprite's anchor.
  const [ax, ay] = ecranXY([cx + 0.5, cy + 0.5]);
  // The shadow is the body's sibling on the ground (OmbreMarcheur): a node of its own while the villager
  // walks (3 at most, one per walker of a wave), a still drawing when it stands.
  return (
    <>
      {marche ? (
        <OmbreMarcheur
          segments={segments}
          horloge={horloge}
          role={role}
          c0={c0}
          cellule={m.cellule}
          testID={`${id}-ombre`}
        />
      ) : (
        <OmbreContact x={ax} y={ay} largeur={OMBRE_L} />
      )}
      <Animated.View
        pointerEvents="none"
        testID={`${id}-${marche ? "noeud" : "fixe"}`}
        // A strike or a work gesture leans the villager about its feet.
        style={[place(rect), { transformOrigin: [ax - rect.x, ay - rect.y, 0] }, style]}
      >
        <Planche s={s} rect={{ ...rect, x: 0, y: 0 }} ancre={rect} miroir={miroir} testID={id} />
      </Animated.View>
    </>
  );
}

/** Where an inhabitant is posed: a pair is one image centred between its two cells (the second of them draws nothing). */
const milieuHabitant = (h: Habitant, autre?: Habitant): Case =>
  autre
    ? [(h.cellule[0] + autre.cellule[0]) / 2 + 0.5, (h.cellule[1] + autre.cellule[1]) / 2 + 0.5]
    : [h.cellule[0] + 0.5, h.cellule[1] + 0.5];

/**
 * An inhabitant (T26): a trade's painted sprite at full opacity (a wash under a 0.8 sprite read
 * as faded; the per-villager cloth tint is gone with it), standing on a still shadow. No animated node, ever.
 */
function HabitantVue({
  h,
  autre,
  tourne,
}: {
  h: Habitant;
  /** The other half of a talking pair. */
  autre?: Habitant;
  tourne?: 1 | -1;
}) {
  const repos = poseDe(h.pose);
  const s = repos?.image ?? spriteMarcheur(h.role, false);
  const mi = milieuHabitant(h, autre);
  const [ax, ay] = ecranXY(mi);
  const brut = s ? (repos ? poseChute(mi, s) : poseCentre(h.cellule, s)) : null;
  // Perf ratchet (distinct image sizes): each pose is calibrated at its own scale, so ten poses were ten
  // bitmaps. Snap the width to an even dp (5% at most) about the anchor, which stays on the cell.
  const f = brut ? Math.max(2, 2 * Math.round(brut.w / 2)) / brut.w : 1;
  const r2 = (n: number) => Math.round(n * 100) / 100;
  const rect = brut
    ? {
        x: r2(ax - (ax - brut.x) * f),
        y: r2(ay - (ay - brut.y) * f),
        w: Math.round(brut.w * f),
        h: r2(brut.h * f),
      }
    : null;
  const miroir = tourne === undefined ? h.miroir : tourne === -1;
  const id = `iso-habitant-${h.id}`;
  if (h.compagnon) return <View pointerEvents="none" testID={`${id}-paire`} />;
  return (
    <>
      <OmbreContact x={ax} y={ay} largeur={OMBRE_L} />
      <Planche s={s} rect={rect} miroir={miroir} testID={id} />
    </>
  );
}

const brancherPrise = (ref: { current: PriseVillageois | undefined }, v: PriseVillageois) => {
  ref.current = v;
};

/**
 * The shadow of a villager on a walk: a sibling of the body, under it, on the ground. Its node
 * follows the walker's place on the grid and nothing of the step's bounce or the gesture's lift; it
 * shrinks and fades a notch or two while the body is up (ombreMarcheur.ts). A standing villager's
 * shadow is a still drawing (no node).
 */
function OmbreMarcheur({
  segments,
  horloge,
  role,
  c0,
  cellule,
  testID,
}: {
  segments: readonly Segment[];
  horloge: SharedValue<number>;
  role: Role;
  c0: number;
  cellule: Case;
  testID: string;
}) {
  const [cx, cy] = cellule;
  const [ax, ay] = ecranXY([cx + 0.5, cy + 0.5]);
  const w = OMBRE_L * 1.5;
  const style = useAnimatedStyle(() => {
    const t = horloge.get() - c0;
    const saut = positionA(segments, t).marche
      ? Math.abs(Math.sin((t * Math.PI) / PERIODE_PAS_MS)) * SAUT_PAS
      : 0;
    const o = ombreMarcheur(
      positionA(segments, t),
      cx,
      cy,
      COTE,
      saut + poseA(role, segments, t).leve,
    );
    return {
      opacity: o.opacite,
      transform: [{ translateX: o.dx }, { translateY: o.dy }, { scale: o.echelle }],
    };
  });
  return (
    <Animated.View
      pointerEvents="none"
      testID={testID}
      style={[
        { position: "absolute", left: ax - w / 2, top: ay - w / 4, width: w, height: w / 2 },
        style,
      ]}
    >
      <OmbreContact x={w / 2} y={w / 4} largeur={OMBRE_L} />
    </Animated.View>
  );
}

export function IsoCarteDemo({
  palier,
  tousDebout,
  horloge,
  lumiere,
  blason,
  fete,
}: {
  palier: VillageTier;
  /** A session's key (dev-iso `Fête`): the next wave is the party, once per key (T26). */
  fete?: string;
  tousDebout: boolean;
  /** The hero's crest for the statue on the square (dev-iso `?animal=&stade=`). */
  blason?: { crest: BlasonCrest | null; onPress: () => void };
  /** The clock of the screen's camera (its touch starts a wave, as in the village tab). */
  horloge: ReturnType<typeof useHorloge>;
  /** The light of the map (dev-iso `?ambiance=`). */
  lumiere?: Ambiance;
}) {
  const { visible, montres } = etatCarte(palier, tousDebout);
  return (
    <HorlogeContext.Provider value={horloge.c}>
      <DepartContext.Provider value={horloge.depart}>
        <EffroiContext.Provider value={horloge.effroi}>
          <IsoCarte
            visible={visible}
            montres={montres}
            stade={(code) => stadeDemo(code, palier)}
            lumiere={lumiere}
            blason={blason}
            palier={palier}
            fete={fete}
            // The demo has no levels: at the last tier every building stands at its last stage and rank.
            legendaires={palier === 12 ? new Set(montres) : undefined}
          />
          <Lucioles visible={visible} ambiance={lumiere} />
        </EffroiContext.Provider>
      </DepartContext.Provider>
    </HorlogeContext.Provider>
  );
}

/**
 * What stands on the ground, back to front: the map's mounted elements (made by IsoCarte, `objets`,
 * with their footprints) and the villagers, each right before the first element it is behind and
 * after all that are behind it. The walkers' state lives here and nowhere above, so a segment
 * change (a few a wave) renders this list and the villagers, not the map: the elements passed in
 * are the same objects as before, which React skips.
 */
function Objets({
  objets,
  emprises,
  carte,
  stade,
  horloge,
  chantiers,
  vie,
  prise,
}: {
  chantiers: readonly BuildingCode[];
  objets: readonly ReactElement[];
  emprises: readonly Emprise[];
  carte: Carte;
  stade: (code: BuildingCode) => Stade;
  horloge: SharedValue<number> | null;
  /** The inhabitants, the party and the favourite trade (T26). */
  vie: Vie;
  /** Filled with who stands where and how to turn one: the screen's touch reads it (IsoVillage). */
  prise?: { current: PriseVillageois | undefined };
}) {
  const { marcheurs, habitants, veille, animaux } = useMarcheurs(
    carte,
    horloge,
    {
      fenetres: (code) => (accrochesDe(code, stade(code))?.fenetres.length ?? 0) > 0,
      porte: (code) => accrochesDe(code, stade(code))?.porte != null,
    },
    chantiers,
    vie,
  );
  // The side a touched villager was turned to, by id (T26): kept until a wave walks it away.
  const [tournes, setTournes] = useState<Readonly<Record<string, 1 | -1>>>({});
  useLayoutEffect(() => {
    if (!prise) return;
    const cible = (
      id: string,
      role: Role,
      habitant: boolean,
      x: number,
      y: number,
      boite?: CibleVillageois["boite"],
    ) =>
      ({
        id,
        role,
        habitant,
        pied: ecranXY([x, y]),
        l: TOUCHE_L,
        h: TOUCHE_H,
        boite,
      }) satisfies CibleVillageois;
    // A resting pose is touched on its own figure's box, not the standing one (T40).
    const cibleHabitant = (h: Habitant) => {
      const repos = poseDe(h.pose);
      const autre = habitants.find((x) => x.id === h.avec);
      const mi = milieuHabitant(h, autre);
      const miroir = tournes[h.id] === undefined ? h.miroir : tournes[h.id] === -1;
      const entiere = repos && boiteDePose(repos, poseChute(mi, repos.image), miroir, TOUCHE_L);
      // A pair is one image: each of the two keeps the half on its own side (by their feet).
      const gauche =
        autre &&
        ecranXY([h.cellule[0], h.cellule[1]])[0] < ecranXY([autre.cellule[0], autre.cellule[1]])[0];
      const [x0, y0, x1, y1] = entiere ?? [0, 0, 0, 0];
      const milieu = (x0 + x1) / 2;
      const boite: CibleVillageois["boite"] =
        entiere && autre ? (gauche ? [x0, y0, milieu, y1] : [milieu, y0, x1, y1]) : entiere;
      return cible(h.id, h.role, true, h.cellule[0] + 0.5, h.cellule[1] + 0.5, boite);
    };
    brancherPrise(prise, {
      cibles: () => [
        ...marcheurs.map((m) => {
          const p = m.segments
            ? positionA(m.segments, (horloge?.get() ?? 0) - m.c0)
            : { x: m.cellule[0] + 0.5, y: m.cellule[1] + 0.5 };
          return cible(m.role, m.role, false, p.x, p.y);
        }),
        ...habitants.map(cibleHabitant),
      ],
      tourner: (id, sens) => setTournes((t) => ({ ...t, [id]: sens })),
    });
  });
  const entrees = [
    ...marcheurs.map((m) => ({
      cle: `m${m.role}`,
      emprise: m.emprise,
      vue: <Marcheur key={`m${m.role}`} m={m} horloge={horloge} tourne={tournes[m.role]} />,
    })),
    ...habitants.map((h) => ({
      cle: `h${h.id}`,
      emprise: empriseHabitant(
        h,
        habitants.find((x) => x.id === h.avec),
      ),
      vue: (
        <HabitantVue
          key={`h${h.id}`}
          h={h}
          autre={habitants.find((x) => x.id === h.avec)}
          tourne={tournes[h.id]}
        />
      ),
    })),
  ];
  const rangs = rangsMarcheurs(
    emprises,
    entrees.map((e) => e.emprise),
  );
  const loin = (e: Emprise) => e.coin[0] + e.emprise[0] + e.coin[1] + e.emprise[1];
  const marches = entrees
    .map((e, i) => ({ e, rang: rangs[i] ?? 0 }))
    .sort((a, b) => a.rang - b.rang || loin(a.e.emprise) - loin(b.e.emprise));
  return (
    <AnimauxContext.Provider value={animaux}>
      <VeilleContext.Provider value={veille}>
        {objets.flatMap((o, i) => [...marches.filter((w) => w.rang === i).map((w) => w.e.vue), o])}
        {marches.filter((w) => w.rang >= objets.length).map((w) => w.e.vue)}
      </VeilleContext.Provider>
    </AnimauxContext.Provider>
  );
}

/** The rank a footprint takes in `ordre` when its element shows, else null. */
const rangSi = (montre: unknown, ordre: readonly Emprise[], e: Emprise): number | null =>
  montre ? borneRang(ordre, e)[0] : null;

/** The totem statue (T25) on the square: the empty plinth before the reveal, null off the island. */
function statueDe(
  blason: { crest: BlasonCrest | null; onPress: () => void } | undefined,
  visible: readonly (readonly boolean[])[],
) {
  if (!blason || !statueVisible(visible)) return null;
  const etat = etatStatue(blason.crest);
  return (
    <Statue
      key="statue"
      boite={boiteStatue(piedStatue(), etat)}
      etat={etat}
      onPress={blason.onPress}
    />
  );
}

/**
 * The cells nobody crosses (the animals', the statue's) or stops on (the figurines', the statue's),
 * and the inhabitants (T26) placed on the others, before the trades, which never stop on their cells.
 */
function peuple(
  palier: VillageTier | undefined,
  visible: readonly (readonly boolean[])[],
  montres: readonly BuildingCode[],
  figurines: Iterable<PieceCarte>,
  blason: { crest: BlasonCrest | null } | undefined,
  stade: (code: BuildingCode) => Stade,
  animaux: readonly { nom: string; cellule: Case }[],
  jour: number,
  /** The painted props' cells (alentours.ts): nobody stops on them. */
  decor: readonly Case[] = [],
  /** The vocation whose things stand on the square (vocation.ts): their cells close like the statue's. */
  vocation: Practice | null = null,
) {
  const fermees = vocation ? CASES_VOCATION : [];
  const statue: Case[] = blason && statueVisible(visible) ? [CASE_STATUE] : [];
  // The wall's cells are closed too, built or not: nobody stands in a wall (marcheurs.ts walks round them).
  const obstacles = [...ANIMAUX.map((a) => a.piece.case), ...statue, ...fermees, ...rempart];
  const fixes = [...[...figurines].map((f) => f.case), ...statue, ...fermees, ...decor];
  const carte = {
    visible,
    montres,
    obstacles,
    occupees: fixes,
    ecrans: cibles(montres, stade, visible),
    animaux,
  };
  return {
    obstacles,
    fixes,
    habitants: palier
      ? placerHabitants(palier, carte, jour, metierFavori(blason?.crest?.animal))
      : [],
  };
}

/** The districts to draw: none until the tier is known and the page asks for blocks. */
function quartiersDe(
  blocs: ContextType<typeof QuartiersContext>,
  palier: VillageTier | undefined,
  vocation: ReturnType<typeof vocationDeBlason>,
) {
  return blocs && palier ? construire({ palier, graine: 0, vocation }) : [];
}

/** The painted props on show (alentours.ts), none while their layer is off. */
const decorDe = (
  peint: Alentours,
  visible: readonly (readonly boolean[])[],
  montres: readonly BuildingCode[],
  palier: VillageTier | undefined,
) => (peint.decor ? accessoiresMontres(visible, montres, palier ?? 12, peint.sol) : []);

/** The mounted indices, less the lisiere when the painted forest stands in its place. */
const sansLisiere = (indices: readonly number[], peint: Alentours) =>
  peint.foret ? indices.filter((i) => ORDRE_CARTE[i]?.type !== "lisiere") : indices;

/**
 * The props' footprints inserted one after the other in the mounted order, and the rank each took:
 * after everything behind its cell (a roof cat after its building, whose footprint it shares).
 */
function placerDecor(
  emprises: readonly Emprise[],
  decor: readonly Accessoire[],
): { emprises: Emprise[]; rangs: number[] } {
  let liste = [...emprises];
  const rangs = decor.map((a) => {
    const toit = a.sur
      ? { coin: emplacements[a.sur].coin, emprise: emplacements[a.sur].emprise }
      : undefined;
    const e = empriseAccessoire(a, toit);
    const [rang] = borneRang(liste, e, toit !== undefined);
    liste = insere(liste, e, rang);
    return rang;
  });
  return { emprises: liste, rangs };
}

/** Elements placed one after the other among `emprises`, each at its first rank (`dessus`: on its footprint, after it). */
function placer(
  emprises: readonly Emprise[],
  elements: readonly { e: Emprise; dessus: boolean }[],
): { emprises: Emprise[]; rangs: number[] } {
  let liste = [...emprises];
  const rangs = elements.map(({ e, dessus }) => {
    const [rang] = borneRang(liste, e, dessus);
    liste = insere(liste, e, rang);
    return rang;
  });
  return { emprises: liste, rangs };
}

/** G3: the vocation whose set shows, once the fire's cell is on the island; else null. */
function vocationMontree(
  vocation: Practice | null,
  visible: readonly (readonly boolean[])[],
): Practice | null {
  const [fx, fy] = emplacements.campfire.coin;
  return visible[fy]?.[fx] ? vocation : null;
}

/** G3: the vocation's things on the square and its banners at the hall's front, with their footprints. */
function vocationEnPlace(
  vocation: Practice | null,
  montres: readonly BuildingCode[],
  nuit: boolean,
): { e: Emprise; dessus: boolean; noeud: ReactElement }[] {
  if (!vocation) return [];
  const choses = chosesDe(vocation).map((chose, i) => ({
    e: EMPRISES_VOCATION[i] ?? EMPRISE_STATUE,
    dessus: false,
    noeud: (
      <ChoseDeVocation
        key={`v${chose.pied.join()}`}
        chose={chose}
        vocation={vocation}
        nuit={nuit}
        i={i}
      />
    ),
  }));
  if (!montres.includes("heroes_hall")) return choses;
  const { coin, emprise } = emplacements.heroes_hall;
  return [
    ...choses,
    {
      e: { coin, emprise },
      dessus: true,
      noeud: <BannieresVocation key="vb" vocation={vocation} />,
    },
  ];
}

/** `x` inserted at `rang` (the list unchanged when there is none). */
function insere<T>(liste: readonly T[], x: T | null, rang: number | null): T[] {
  return rang === null ? [...liste] : [...liste.slice(0, rang), x as T, ...liste.slice(rang)];
}

/** A building hidden behind its heap of stones: masked while a site (or its bare scaffold) stands. */
function enTasDe(
  code: BuildingCode,
  masques: ReadonlySet<BuildingCode> | undefined,
  chantiers: ReadonlySet<BuildingCode> | undefined,
  echafaudages: ReadonlySet<BuildingCode> | undefined,
) {
  return (
    (masques?.has(code) ?? false) &&
    ((chantiers?.has(code) ?? false) || (echafaudages?.has(code) ?? false))
  );
}

/**
 * The map for an island (`visible`), the buildings shown on it and the stage of each: the demo's
 * and the village tab's (IsoVillage.tsx) one drawing.
 */
export function IsoCarte({
  visible,
  montres,
  stade,
  masques,
  chantiers,
  echafaudages,
  legendaires,
  croissances,
  seul = false,
  ambiance = "nuit",
  lumiere = "nuit",
  biome = "defaut",
  blason,
  palier,
  fete,
  prise,
}: {
  visible: readonly (readonly boolean[])[];
  montres: readonly BuildingCode[];
  stade: (code: BuildingCode) => Stade;
  /** The village tier: it sets how many inhabitants stand on the map (T26); none when absent. */
  palier?: VillageTier;
  /** The session's key (the route's `grown`): the first wave after a new one is a party (T26). */
  fete?: string;
  /** Filled with who stands where and how to turn one towards a finger (T26): the screen's touch. */
  prise?: { current: PriseVillageois | undefined };
  /** Buildings whose sprite is hidden while a growth layer plays over them. */
  masques?: ReadonlySet<BuildingCode>;
  /** A building alone (BatimentSeul): no villager, no decor, no camp props, nothing but the building and its ground. */
  seul?: boolean;
  /** Buildings with a site on now (L6-T02): scaffold and dust right after the sprite, and villagers striking beside it. */
  chantiers?: ReadonlySet<BuildingCode>;
  /** Buildings whose scaffold already stands, before its villagers come (T03: the camera's move, so a new plot is never bare). */
  echafaudages?: ReadonlySet<BuildingCode>;
  /** Buildings at their highest rank (fierte.ts): a small glint on their banner. */
  legendaires?: ReadonlySet<BuildingCode>;
  /**
   * Growths playing (IsoVillage), by building: its new stage is `stade`'s, `ancien` the one left
   * (null when it was not there); `cle` mounts the layer once per growth.
   */
  croissances?: ReadonlyMap<BuildingCode, { cle: string; ancien: Stade | null }>;
  /** The light the sprites are painted under; only `nuit` has sprites yet. */
  ambiance?: Ambiance;
  /** The light of the map (lumiere.ts): `jour` washes the ground and puts the night's lights out. */
  lumiere?: Ambiance;
  /** The ground, decor and water colours. */
  biome?: Biome;
  /** The hero's crest on the village square (T24): null before the reveal, absent when not asked for. */
  blason?: { crest: BlasonCrest | null; onPress: () => void };
}) {
  const horloge = useContext(HorlogeContext);
  // The painted surroundings on (alentours.ts): the props in the depth order, the forest over the ground.
  const peint = useContext(AlentoursContext);
  const decor = seul ? [] : decorDe(peint, visible, montres, palier);
  const cases: Case[] = [];
  for (let gy = 0; gy < TAILLE; gy++)
    for (let gx = 0; gx < TAILLE; gx++) if (visible[gy]?.[gx]) cases.push([gx, gy]);
  const rects = tuiles(PixelRatio.get());
  const boites = new Set<string>(montres.filter((c) => !spriteDe(c, stade(c), ambiance)));
  const { indices, pieces, figurines, animaux, lisiere } = elementsMontes(
    visible,
    montres,
    stade,
    ambiance,
    peint,
    seul,
  );
  const bords = bordsDe(visible);
  const vu = (gx: number, gy: number) => visible[gy]?.[gx] === true;
  // F4: with the painted ground, the plan's fields are painted tiles; the drawn ones stay off the island.
  const champs = champsDe(vu, peint.sol);
  const tuilesChamp = peint.sol ? tuilesChamps(vu) : [];
  // The back row's hedge stands up: in the depth order, so the wall behind it never covers it.
  const haies = tuilesChamp.filter((t) => t.haie);
  const ruisseau = ruisseauDe(visible);
  const blocs = useContext(QuartiersContext);
  const vocation = vocationDeBlason(blason?.crest?.animal);
  const quartiers = quartiersDe(blocs, palier, vocation);
  const sienne = vocationMontree(vocation, visible);
  const nuit = lumiere === "nuit";
  // The animals on show, where the ambiance lets them live: the trades walk around them and an inhabitant may play with the cat.
  const betes = vieDe(ambiance).animaux
    ? [...animaux].map((a) => ({ nom: a.nom, cellule: a.piece.case }))
    : [];
  const { obstacles, fixes, habitants } = peuple(
    palier,
    visible,
    montres,
    figurines,
    blason,
    stade,
    betes,
    useJour(),
    // Nobody stops on a prop, nor in a hedge.
    [...decor.map((a) => a.case), ...haies.map((t) => t.case)],
    sienne,
  );
  // A building hidden behind its heap of stones (a site with no old stage) casts nothing yet.
  const enTas = (code: BuildingCode) => enTasDe(code, masques, chantiers, echafaudages);
  // What a veil may darken: buildings and decor, never water's own shadow (see `voileDe`). The
  // animals walk, so their shadow is a contact oval that goes with them (Animal), not a cast one.
  const portees = [
    ...montres
      .filter((code) => !enTas(code))
      .flatMap((code) => [
        ...ombresDe(code, stade(code), ambiance),
        // AUDIT-DA 26: one more polygon in the same flat tone, so it never stacks with the cast shadow.
        ...ombreContactDe(code, stade(code), ambiance),
      ]),
    ...[...pieces].filter((p) => p.decor).flatMap(ombresPiece),
    ...[...figurines].flatMap(ombresPiece),
    ...pansMontres(visible, montres).flatMap((c) => ombresPan(c, stade("castle_wall"))),
  ];
  const ombres = [...portees, ...[...pieces].filter((p) => !p.decor).flatMap(ombresPiece)];
  // Only what shows is mounted, in depth order (L4-T02); keys keep a surviving entry's views.
  // A walker's rank is among what is mounted: an element that does not show orders nothing.
  // The painted forest takes the lisiere's place (its round trees on the cells off the island).
  const montes = sansLisiere(indices, peint);
  const vues = montes.flatMap((i) => ORDRE_CARTE[i] ?? []);
  const empriseVues = montes.flatMap((i) => EMPRISES_ORDRE[i] ?? []);
  // The rat runs along one row: its rank is that of its one footprint, right after everything
  // behind it, so it passes in front of the farm's wall and behind the buildings in front.
  // The totem statue (T25) takes its rank among the mounted footprints the same way, before the rat's.
  const statue = statueDe(blason, visible);
  const rangStatue = rangSi(statue, empriseVues, EMPRISE_STATUE);
  // The painted props (alentours.ts) take their ranks the same way, one after the other.
  const { emprises: emprisesD, rangs: rangsDecor } = placerDecor(
    insere(empriseVues, EMPRISE_STATUE, rangStatue),
    decor,
  );
  // G3: the vocation's two things on the square, then its banners right after the hall of heroes.
  const enVocation = vocationEnPlace(sienne, montres, nuit);
  const { emprises: emprisesV, rangs: rangsVocation } = placer(emprisesD, enVocation);
  // F4: the fields' hedge tiles, each on its cell, one after the other.
  const { emprises: emprisesE, rangs: rangsHaies } = placer(
    emprisesV,
    haies.map((t) => ({ e: { coin: t.case, emprise: [1, 1] as const }, dessus: false })),
  );
  const noeudsVues = () =>
    haies.reduce<ReactElement[]>(
      (liste, t, k) =>
        insere(
          liste,
          <ChampPeint key={`h${t.case.join(",")}`} t={t} lumiere={lumiere} />,
          rangsHaies[k] ?? null,
        ),
      enVocation.reduce<ReactElement[]>(
        (liste, x, k) => insere(liste, x.noeud, rangsVocation[k] ?? null),
        noeudsDecor(),
      ),
    );
  const noeudsDecor = () =>
    decor.reduce<ReactElement[]>(
      (liste, a, k) =>
        insere(
          liste,
          <AccessoirePeint
            key={`d${a.nom}${a.case.join(",")}`}
            a={a}
            lumiere={lumiere}
            stade={stade}
          />,
          rangsDecor[k] ?? null,
        ),
      insere(vues.map(noeud), statue, rangStatue),
    );
  const rangRat = ratMontre(visible) ? borneRang(emprisesE, EMPRISE_RAT)[0] : null;
  const avecRat = <T,>(liste: readonly T[], rat: T) => insere(liste, rat, rangRat);
  const reflets = refletsPar(vues, (e, x, y) => couvre(e, x, y, stade));
  // The ready-to-evolve glows take the glints' place in the budget: never both (T03 review, 64 flat).
  const reclames = useContext(ReclamablesContext);
  const fanions = bannieres(legendaires ?? [], stade);
  // T41: the glints are silent while a stage is revealed.
  const revelation = useContext(RevelationContext);
  const eclats =
    reclames?.animes.size || revelation ? new Set<BuildingCode>() : eclatsAnimes(fanions, stade);
  const tissu = tissuBlason(blason?.crest ?? null);
  const batiment = (code: BuildingCode) => {
    const croissance = croissances?.get(code);
    const commun = {
      code,
      stade: stade(code),
      masque: masques?.has(code) ?? false,
      ambiance,
      lumiere,
      biome,
    };
    // The crow and a site's scaffold and dust follow the sprite in the depth order. The children
    // are positional, so the sprite is not mounted again when a site begins.
    return (
      <Fragment key={code}>
        <Maquette
          {...commun}
          legendaire={legendaires?.has(code) ?? false}
          eclatAnime={eclats.has(code)}
          banniere={fanions.has(code)}
          tissu={tissu}
        />
        {CODES_A_CORBEAU.has(code) ? <CorbeauToit {...commun} /> : null}
        {/* Masked during a site only when there is no old stage: then a heap of stones stands in. */}
        {echafaudages?.has(code) || chantiers?.has(code) ? (
          <Echafaudage code={code} neuf={commun.masque} />
        ) : null}
        {chantiers?.has(code) ? <Poussiere code={code} /> : null}
        {/* A growth plays over the sprite and its site, and under all that stands in front. */}
        {croissance ? (
          <IsoCroissance
            key={croissance.cle}
            code={code}
            ancien={croissance.ancien}
            nouveau={commun.stade}
            ambiance={ambiance}
            lumiere={lumiere}
            biome={biome}
          />
        ) : null}
      </Fragment>
    );
  };
  const noeud = (e: ElementCarte) =>
    e.type === "batiment" ? (
      batiment(e.code)
    ) : e.type === "figurine" ? (
      <Figurine
        key={`f${e.piece.case.join(",")}`}
        piece={e.piece}
        ambiance={ambiance}
        lumiere={lumiere}
      />
    ) : e.type === "animal" ? (
      <Animal key={`a${e.piece.case.join(",")}`} a={e.animal} ambiance={ambiance} />
    ) : e.type === "pan" ? (
      <PanRempart
        key={`m${e.troncon}`}
        cases={montresDuTroncon(e.troncon, visible, montres)}
        stade={stade("castle_wall")}
        lumiere={lumiere}
        entree={croissances?.has("castle_wall") === true}
      />
    ) : (
      <PieceOuLisiere
        key={`${e.type}${e.piece.case.join(",")}`}
        e={e}
        ambiance={ambiance}
        biome={biome}
        portees={portees}
        lisiere={lisiere}
        reflets={reflets}
      />
    );
  return (
    <View style={{ width: LARGEUR, height: HAUTEUR }} testID="iso-carte">
      {rects.map((rect, i) => (
        <Tuile
          key={`${rect.x},${rect.y}`}
          rect={rect}
          cases={cases}
          boites={boites}
          ombres={ombres}
          i={i}
          biome={lumiere === "nuit" ? "defautNuit" : biome}
          bords={bords}
          champs={champs}
          ruisseau={ruisseau}
          lumiere={lumiere}
          quartiers={quartiers}
          peint={seul ? { ...peint, decor: true } : peint}
        />
      ))}
      {/* G3: the vocation's grounds over the tiles and their shadows, under the night's veil and every sprite. */}
      {/* F4: the plan's fields, painted, flat rows on the ground (the hedge rows stand in the depth order). */}
      {tuilesChamp
        .filter((t) => !t.haie)
        .map((t) => (
          <ChampPeint key={`c${t.case.join(",")}`} t={t} lumiere={lumiere} />
        ))}
      <SolVocation vocation={sienne} nuit={nuit} />
      {/* The painted forest: over the ground and the vector roads it keeps clear of, under the light (graded at night) and the sprites. */}
      <ForetSiPeinte
        visible={visible}
        champs={champs.blocs}
        pieds={decor.filter((a) => a.hors && a.nom === "charrette_1").map(piedAccessoire)}
        lumiere={lumiere}
      />
      {/* The light of the map: over the ground, UNDER every sprite (windows stay lit), one source of night pools. */}
      <AmbianceCarte
        lumiere={lumiere}
        biome={biome}
        montres={montres}
        stade={stade}
        voileAlentours={voileVillage(visible)}
      />
      {/* The reveal's ring and dust are ground light: below the objects, never over a neighbour in front. */}
      {revelation ? (
        <AnneauRevelation
          code={revelation.source}
          pied={ecranXY(centreBatiment(revelation.source))}
          t={revelation.t}
        />
      ) : null}
      <Objets
        objets={avecRat(noeudsVues(), <Rongeur key="rongeur" biome={biome} lumiere={lumiere} />)}
        emprises={avecRat(emprisesE, EMPRISE_RAT)}
        stade={stade}
        chantiers={[...(chantiers ?? [])]}
        vie={{ habitants, fete, favori: metierFavori(blason?.crest?.animal) }}
        prise={prise}
        carte={{
          visible,
          montres,
          // The statue closes its cell like a beast and a figurine: no walker crosses or stops in it.
          obstacles,
          animaux: betes,
          occupees: fixes,
          // What the walkers are ranked against on screen (Objets' `emprises`), statue and rat included.
          vues: avecRat(emprisesE, EMPRISE_RAT),
        }}
        horloge={horloge}
      />
    </View>
  );
}
