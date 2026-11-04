// The typed reader of constants/isoSpec.json, the one source of the iso grammar (the Python
// pipeline reads the same file). JSON imports widen every string, so names are checked here
// at load and a bad spec throws on import instead of drawing something wrong.

import raw from "@/constants/isoSpec.json";
import { rawColors } from "@/constants/rawColors";
import type { BuildingCode, BuildingTier } from "@/db/schema";
import type { Masque } from "./tapBatiment";

export type Ambiance = "nuit" | "jour";
/** `defautNuit` is `defaut` with the vector ground's night tokens (rawColors `<token>Nuit`): the tiles take it by night. */
export type Biome = "defaut" | "defautNuit";
export type Stade = "rough" | "solid" | "grand";
export type CoucheBatiment =
  | "sol"
  | "ombre"
  | "flaques"
  | "sprite"
  | "decorSaison"
  | "effets"
  | "ui";
export type Effet = "flamme" | "fumee" | "ailes" | "banniere";
export type ExportStade =
  | "volumes"
  | "masqueEmissif"
  | "pointsAccroche"
  | "masqueToit"
  | "ombre"
  | "flaques"
  | "masqueTap"
  | "ancrage";
export type NomAccroche = "faite" | "porte" | "cheminee" | "avantToits";
export type TokenCouleur = keyof typeof rawColors;

/** A point in sprite pixels, origin at the sprite's top left. */
export type PointSprite = readonly [x: number, y: number];
/** A point in grid units relative to the footprint's back corner, z up. */
export type PointGrille = readonly [gx: number, gy: number, z: number];

/** One form of a stage's anchor points: null when the stage has no such part (sails have none). */
type Accroches<P> = {
  faite: P | null;
  porte: P | null;
  cheminee: P | null;
  avantToits: readonly P[];
};

/** `pointsAccroche` of a stage's .anchor.json export, in sprite px and in grid units. */
export type PointsAccroche = {
  px: Accroches<PointSprite>;
  grid: Accroches<PointGrille>;
  /** Flame base: the hearth's top-face middle, half its width in px. Null without a fire or ember. */
  foyer: { px: PointSprite; grid: PointGrille; demiLargeur: number } | null;
  /** Lit windows the camera sees; `gauche` faces +gy, `droite` faces +gx. Sizes in px. */
  fenetres: readonly {
    px: PointSprite;
    grid: PointGrille;
    largeur: number;
    hauteur: number;
    face: "gauche" | "droite";
  }[];
};

/** One primitive of a stage's `volumes` export: convex, so its shadow is the hull of its vertices' shadows. */
export type Volume = {
  vertices: readonly PointGrille[];
  emissive: boolean;
  noShadow: boolean;
};

/**
 * An image the map poses (mock-up from blender, then the painted sprite under the same name),
 * with what the app needs from its sidecar and exports. Listed in maquettes.ts.
 */
export type SpriteIso = {
  /** Metro asset id. */
  image: number;
  /**
   * Canvas px of the point posed on the grid, by its canvas's `anchor` in isoSpec.json: the
   * footprint's bottom corner (`footprintBottom`), the canvas centre (`center`, sails and the
   * cascade's sheet), or the cell's centre (`cellCenter`, villagers).
   */
  anchor: readonly [x: number, y: number];
  size: readonly [w: number, h: number];
  /** Canvas px per grid px when the canvas is drawn larger (isoSpec.json `pxScale`, 2 for villagers): posed at 1 / pxScale. */
  pxScale?: number;
  /**
   * Export `ombre`: one convex ground polygon per part, flat `[gx, gy, gx, gy, …]` in grid units
   * from the footprint's back corner; a part whose shadow lies in another's is left out.
   */
  ombre: readonly (readonly number[])[];
  /**
   * A painted stage's own shadow on the top of its socle (ombres.ts `ombreSocle`, under the moon):
   * the socle's height in grid units, and disjoint convex pieces flat `[gx, gy, …]` in grid units
   * from the footprint's back corner. Painted sprites only: a mock-up's render carries it.
   * shortcut: baked for the moon, nothing re-lights it for `jour`; regenerate the index then, or
   * ship the volumes as the sails' are.
   */
  socle?: { hauteur: number; ombre: readonly (readonly number[])[] };
  /** The sidecar's tap mask (buildings' stages only), hex rows: tapBatiment.ts reads it. */
  masque?: Masque;
  /** A windmill stage: where the sails turn, in sprite px and in grid units, and their scale. */
  ailes?: { pivot: readonly [x: number, y: number]; pivotGrille: PointGrille; echelle: number };
  /** Sails only: their volumes about the hub, to recompute their shadow at any angle. */
  volumes?: readonly Volume[];
};

export type AmbianceSpec = {
  lumiere: typeof raw.moon;
  tons: typeof raw.tones;
  matieres: typeof raw.materials;
  emissifs: typeof raw.emissive;
  flaques: typeof raw.pools;
};

export type VarianteSol = { couleur: TokenCouleur; poids: number };
export type GenreDecal =
  | "touffe"
  | "fleur"
  | "caillou"
  | "feuille"
  | "buisson"
  | "herbeHaute"
  | "rocaille";
export type VariantesSpec = {
  graine: number;
  /** Size in cells of the lawn's soft patches (a value noise on a grid of this period). */
  tache: number;
  herbe: readonly VarianteSol[];
  chemin: readonly VarianteSol[];
  terre: readonly VarianteSol[];
  decals: Record<GenreDecal, VarianteSol & { surChemin: boolean; trait: number }>;
  chance: number;
  chanceBord: number;
  bordChemin: TokenCouleur;
  /** A path-edge pebble: half-axes and ink width, in dp. */
  galet: { rx: number; ry: number; trait: number };
  assombri: { couleur: TokenCouleur; opacites: readonly number[] };
};

export type BiomeSpec = {
  variantes: VariantesSpec;
  sol: Record<keyof typeof raw.biomes.defaut.sol, TokenCouleur>;
  /** The drawn fire and smoke (FeuxDessines.tsx): flame, core, ground glow, smoke, ink. */
  feu: Record<keyof typeof raw.biomes.defaut.feu, TokenCouleur>;
  /** A last stage's pride (Fierte.tsx): banner cloth, gold trim, pole, glint, warm windows, ink. */
  fierte: Record<keyof typeof raw.biomes.defaut.fierte, TokenCouleur>;
  /** The small lives (petitsDetails.tsx): fireflies. */
  vivant: Record<keyof typeof raw.biomes.defaut.vivant, TokenCouleur>;
  decors: {
    /** The folder part of a decor image's key (pieces.ts). */
    famille: string;
    couleurs: Record<keyof typeof raw.biomes.defaut.decors.couleurs, TokenCouleur>;
  };
  eau: {
    famille: string;
    couleurs: Record<keyof typeof raw.biomes.defaut.eau.couleurs, TokenCouleur>;
  };
  /** The world around the island (monde.ts): its seed and colours. */
  monde: {
    graine: number;
    couleurs: Record<keyof typeof raw.biomes.defaut.monde.couleurs, TokenCouleur>;
  };
};

export type BatimentIso = {
  tier: BuildingTier;
  stades: readonly Stade[];
  /** Footprint in cells, set by L0-T03. */
  emprise: readonly [number, number] | null;
  /** What makes it recognisable at 30 % zoom (checklist item 7). */
  repere: string;
};

function unDe<T extends string>(permis: readonly T[], valeur: string, ou: string): T {
  const trouve = permis.find((p) => p === valeur);
  if (trouve === undefined)
    throw new Error(`isoSpec.json ${ou}: "${valeur}" not in ${permis.join(", ")}`);
  return trouve;
}

function liste<T extends string>(
  permis: readonly T[],
  valeurs: readonly string[],
  ou: string,
): T[] {
  return valeurs.map((v) => unDe(permis, v, ou));
}

const STADES: readonly Stade[] = ["rough", "solid", "grand"];
const TIERS: readonly BuildingTier[] = [1, 2, 3, 4];

// Checked at load; nothing reads the list yet.
liste<Ambiance>(["nuit", "jour"], raw.ambiances.permises, "ambiances.permises");

export const NOM_IMAGE = raw.nomImage;

/** `nomImage` with any name in the stage's place: a piece is `<famille>/<nom>.<ambiance>.webp`. */
export function nomFichier(slug: string, nom: string, ambiance: Ambiance): string {
  return NOM_IMAGE.replaceAll("<slug>", slug)
    .replaceAll("<stade>", nom)
    .replaceAll("<ambiance>", ambiance);
}

/** The file of one painted stage: `<slug>/<stade>.<ambiance>.webp`. */
export const nomImage = (slug: string, stade: Stade, ambiance: Ambiance): string =>
  nomFichier(slug, stade, ambiance);

// shortcut: nuit's blocks live at the top level because scripts/iso/*.py read them there; the
// spec names them and this checks the names. Move them under `ambiances` when `jour` arrives.
function nuit(): AmbianceSpec {
  const refs = raw.ambiances.nuit;
  const attendu = {
    lumiere: "moon",
    tons: "tones",
    matieres: "materials",
    emissifs: "emissive",
    flaques: "pools",
  };
  for (const [champ, bloc] of Object.entries(attendu)) {
    if (refs[champ as keyof typeof refs] !== bloc)
      throw new Error(`isoSpec.json ambiances.nuit.${champ} must be "${bloc}"`);
  }
  return {
    lumiere: raw.moon,
    tons: raw.tones,
    matieres: raw.materials,
    emissifs: raw.emissive,
    flaques: raw.pools,
  };
}

/** What the app draws by ambiance beyond the images (isoSpec.json `vieParAmbiance`). */
export type VieAmbiance = {
  lucioles: boolean;
  lueurFeux: boolean;
  /** The small animals walk a little in a wave. */
  animaux: boolean;
  /** Birds land on some roofs: by day only. */
  oiseaux: boolean;
};
const vie: Record<Ambiance, VieAmbiance> = raw.vieParAmbiance;
/** The night draws all of it; an ambiance without an entry draws none of it. */
export const vieDe = (ambiance: Ambiance): VieAmbiance => vie[ambiance];

export const ambiances: Partial<Record<Ambiance, AmbianceSpec>> = { nuit: nuit() };

type VarianteSolBrute = { couleur: string; poids: number };
export const GENRES_DECAL: readonly GenreDecal[] = [
  "touffe",
  "fleur",
  "caillou",
  "feuille",
  "buisson",
  "herbeHaute",
  "rocaille",
];

/** A biome's `variantes`, every token and every decal kind checked at load. */
function variantes(
  v: typeof raw.biomes.defaut.variantes,
  ici: string,
  tokens: readonly TokenCouleur[],
): VariantesSpec {
  const pesees = (l: readonly VarianteSolBrute[], nom: string) => {
    if (l.length === 0) throw new Error(`isoSpec.json ${ici}.${nom}: at least one variant`);
    return l.map((e, i) => ({ ...e, couleur: unDe(tokens, e.couleur, `${ici}.${nom}[${i}]`) }));
  };
  const brut: Record<
    string,
    (VarianteSolBrute & { surChemin: boolean; trait: number }) | undefined
  > = v.decals;
  const decals = Object.fromEntries(
    GENRES_DECAL.map((g) => {
      const d = brut[g];
      if (d === undefined) throw new Error(`isoSpec.json ${ici}.decals.${g}: missing`);
      return [g, { ...d, couleur: unDe(tokens, d.couleur, `${ici}.decals.${g}`) }];
    }),
  ) as VariantesSpec["decals"];
  if (v.assombri.opacites.length !== 3)
    throw new Error(
      `isoSpec.json ${ici}.assombri.opacites: 3 values expected (1, 2 and 3 cells from the edge)`,
    );
  return {
    graine: v.graine,
    tache: v.tache,
    herbe: pesees(v.herbe, "herbe"),
    chemin: pesees(v.chemin, "chemin"),
    terre: pesees(v.terre, "terre"),
    decals,
    chance: v.chance,
    chanceBord: v.chanceBord,
    bordChemin: unDe(tokens, v.bordChemin, `${ici}.bordChemin`),
    galet: v.galet,
    assombri: {
      couleur: unDe(tokens, v.assombri.couleur, `${ici}.assombri`),
      opacites: v.assombri.opacites,
    },
  };
}

function biome(b: typeof raw.biomes.defaut, ou: string): BiomeSpec {
  const tokens = Object.keys(rawColors) as TokenCouleur[];
  const couleurs = <T extends Record<string, string>>(c: T, ici: string) =>
    Object.fromEntries(
      Object.entries(c).map(([k, t]) => [k, unDe(tokens, t, `${ici}.${k}`)]),
    ) as Record<keyof T, TokenCouleur>;
  return {
    variantes: variantes(b.variantes, `${ou}.variantes`, tokens),
    sol: couleurs(b.sol, `${ou}.sol`),
    feu: couleurs(b.feu, `${ou}.feu`),
    fierte: couleurs(b.fierte, `${ou}.fierte`),
    vivant: couleurs(b.vivant, `${ou}.vivant`),
    decors: {
      famille: b.decors.famille,
      couleurs: couleurs(b.decors.couleurs, `${ou}.decors.couleurs`),
    },
    eau: { famille: b.eau.famille, couleurs: couleurs(b.eau.couleurs, `${ou}.eau.couleurs`) },
    monde: { graine: b.monde.graine, couleurs: couleurs(b.monde.couleurs, `${ou}.monde.couleurs`) },
  };
}

const DEFAUT = biome(raw.biomes.defaut, "biomes.defaut");

/** A ground token's night twin (`isoPre` to `isoPreNuit`), the token itself when it has none. */
const nuitDe = (t: TokenCouleur): TokenCouleur => {
  const n = `${t}Nuit`;
  return n in rawColors ? (n as TokenCouleur) : t;
};
const teintes = (l: readonly VarianteSol[]) => l.map((e) => ({ ...e, couleur: nuitDe(e.couleur) }));
const SOL_NUIT = ["herbe", "herbeAlt", "chemin", "parcelle", "rueEmpierree", "ruePave"] as const;

export const biomes: Record<Biome, BiomeSpec> = {
  defaut: DEFAUT,
  // Only the lawn, the plots, the paths and the paving change: the rest of the spec is the day's.
  defautNuit: {
    ...DEFAUT,
    variantes: {
      ...DEFAUT.variantes,
      herbe: teintes(DEFAUT.variantes.herbe),
      chemin: teintes(DEFAUT.variantes.chemin),
      terre: teintes(DEFAUT.variantes.terre),
    },
    sol: {
      ...DEFAUT.sol,
      ...Object.fromEntries(SOL_NUIT.map((k) => [k, nuitDe(DEFAUT.sol[k])])),
    },
  },
};

/** The painted images that carry the building's shadow on their socle already (isoSpec.json `socle`). */
export const DEJA_PEINTE: ReadonlySet<string> = new Set(raw.socle.dejaPeinte);

export const NOMS_ACCROCHE = liste<NomAccroche>(
  ["faite", "porte", "cheminee", "avantToits"],
  raw.pointsAccroche.noms,
  "pointsAccroche.noms",
);

export const EXPORTS_PAR_STADE = liste<ExportStade>(
  [
    "volumes",
    "masqueEmissif",
    "pointsAccroche",
    "masqueToit",
    "ombre",
    "flaques",
    "masqueTap",
    "ancrage",
  ],
  raw.exportsParStade,
  "exportsParStade",
);

export const ORDRE_COUCHES = liste<CoucheBatiment>(
  ["sol", "ombre", "flaques", "sprite", "decorSaison", "effets", "ui"],
  raw.couches.ordre,
  "couches.ordre",
);

// Checked at load; the effects layer reads it from lot 1.
liste<Effet>(["flamme", "fumee", "ailes", "banniere"], raw.couches.effets, "couches.effets");

type BatimentBrut = { tier: number; stades: string[]; emprise: number[] | null; repere: string };

// Typed on BuildingCode: a code missing from the JSON fails tsc; an extra one fails the test.
const batimentsBruts: Record<BuildingCode, BatimentBrut> = raw.batiments;

function batiment(b: BatimentBrut, code: string): BatimentIso {
  const ou = `batiments.${code}`;
  const tier = TIERS.find((t) => t === b.tier);
  if (tier === undefined) throw new Error(`isoSpec.json ${ou}.tier: ${b.tier}`);
  let emprise: BatimentIso["emprise"] = null;
  if (b.emprise !== null) {
    const [w, h] = b.emprise;
    if (b.emprise.length !== 2 || w === undefined || h === undefined)
      throw new Error(`isoSpec.json ${ou}.emprise`);
    emprise = [w, h];
  }
  return { tier, stades: liste(STADES, b.stades, `${ou}.stades`), emprise, repere: b.repere };
}

export const batiments = Object.fromEntries(
  Object.entries(batimentsBruts)
    .filter(([code]) => !code.startsWith("_"))
    .map(([code, b]) => [code, batiment(b, code)]),
) as Record<BuildingCode, BatimentIso>;
