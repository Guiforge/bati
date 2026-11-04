// Geometry and state of the demo map (app/dev-iso.tsx, IsoCarteDemo.tsx), kept out of the component
// module so Fast Refresh keeps working on it.

import { buildingStage } from "@/constants/buildingLevels";
import { buildingStageFor, type VisualStage } from "@/constants/buildingStages";
import orderRaw from "@/constants/isoOrdre.json";
import { type Alentours, BATIMENT_MOTEUR } from "@/constants/isoPoc";
import spec from "@/constants/isoSpec.json";
import { type BuildingCode, buildingCodes, buildingDefinitions } from "@/db/schema";
import type { VillageTier } from "@/db/village";
import {
  CASES,
  type Case,
  emplacements,
  etapes,
  ileSeule,
  ileVisible,
  paliers,
  sol,
  TAILLE,
  troncons,
} from "./isoLayout";
import {
  type Ambiance,
  batiments,
  DEJA_PEINTE,
  nomImage,
  type SpriteIso,
  type Stade,
} from "./isoSpec";
import { LISIERE, lisiereMontree, type PieceLisiere } from "./lisiere";
import { MAQUETTES } from "./maquettes";
import { rolesPresents } from "./marcheurs";
import { opaque } from "./masque";
import type { Ile } from "./navigation";
import { enveloppe, LUNE, ombreAiles, type Point } from "./ombres";
import { peintDe } from "./peints";
import {
  casesSousOmbre,
  clePiece,
  DECORS,
  eauTracee,
  type PieceEau,
  pieceEau,
  varianteDecor,
} from "./pieces";
import type { Emprise } from "./profondeur";
import { FONDU_TERRAIN, TERRAIN } from "./terrain";

/** One cell's width on the demo map, in dp, at zoom 1. */
export const COTE = 48;
export const LARGEUR = TAILLE * COTE;
export const HAUTEUR = (TAILLE * COTE) / 2;

/** isoSpec.json `cellToScreen`, in dp, shifted so the grid's left corner sits at x = 0. */
export const ecranXY = ([gx, gy]: Point): Point => [
  ((gx - gy) * COTE) / 2 + LARGEUR / 2,
  ((gx + gy) * COTE) / 4,
];
export const ecran = (p: Point): string => ecranXY(p).join(",");
export const losange = ([gx, gy]: Case): string =>
  [ecran([gx, gy]), ecran([gx + 1, gy]), ecran([gx + 1, gy + 1]), ecran([gx, gy + 1])].join(" ");
/** A closed SVG path through grid points. */
export const cheminSvg = (points: readonly Point[]): string => `M${points.map(ecran).join("L")}Z`;

/** The shadows whose screen box meets `r`, as one path: a ground tile clips to its own, not the map's. */
export function ombresDans(ombres: readonly (readonly Point[])[], r: Rect): string {
  return ombres
    .filter((o) => {
      const pts = o.map(ecranXY);
      return (
        pts.some(([x]) => x >= r.x) &&
        pts.some(([x]) => x <= r.x + r.w) &&
        pts.some(([, y]) => y >= r.y) &&
        pts.some(([, y]) => y <= r.y + r.h)
      );
    })
    .map(cheminSvg)
    .join("");
}

/** The game's closest zoom, isoSpec.json `zoom.max` (a cell of `cellDp`), in demo units. */
export const ZOOM_MAX = (spec.zoom.max * spec.cellDp) / COTE;
// Deliberately further out than the game's `zoom.min` (0.8 in demo units): qa's captures need the
// whole grid on one phone screen, about 0.4 on a 411 dp width. A demo bound, not the game's.
export const ZOOM_MIN = 0.3;
/** The game zoom of qa's close captures (checklist item 33), the demo's "0,6" button (`vueSur` takes game zooms: 1.6 here). */
export const ZOOM_CAPTURE = 0.6;
/** `ZOOM_CAPTURE` in demo units, what `vueFoyer` takes: the scale of a building alone (BatimentSeul). */
export const ZOOM_FOYER_SEUL = (ZOOM_CAPTURE * spec.cellDp) / COTE;
/** One press of + or -. */
export const CRAN = 1.25;
/** The share of the area the island fills at the opening frame: its tips (paths, rim) never touch the edges. */
export const MARGE_CADRAGE = 0.92;
const borne = (z: number) => Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, z));

/** The camera of the demo: a scale about the map's centre, then a shift in dp. */
export type Vue = { zoom: number; x: number; y: number };

/** The island's bounding box on the demo map, in dp at zoom 1; null when no cell shows. */
export function emprise(visible: readonly (readonly boolean[])[]): Ile | null {
  let [x0, x1, y0, y1] = [Infinity, -Infinity, Infinity, -Infinity];
  for (const [gx, gy] of CASES) {
    if (!visible[gy]?.[gx]) continue;
    const [x, y] = ecranXY([gx, gy]);
    [x0, x1, y0, y1] = [
      Math.min(x0, x - COTE / 2),
      Math.max(x1, x + COTE / 2),
      Math.min(y0, y),
      Math.max(y1, y + COTE / 2),
    ];
  }
  return x0 > x1 ? null : { x0, x1, y0, y1 };
}

/** The view that fits the whole island, with a margin: the camera's zoom floor (it can always be seen whole). */
export const cadrageComplet = (visible: readonly (readonly boolean[])[], w: number, h: number) =>
  cadrageDe(visible, w, h);

/**
 * The opening frame, in an area of `w` x `h` dp: the built village (the footprints of the shown
 * buildings, not the forest and fields round them) fills the width with `MARGE_CADRAGE`, centred
 * both ways; the camera only moves toward the heroes' hall if it would otherwise leave the view.
 */
export const cadrage = (
  visible: readonly (readonly boolean[])[],
  w: number,
  h: number,
  serre = false,
): Vue => {
  if (serre) return cadrageSerre(visible, w, h);
  const v = empriseBatie(visible);
  const ile = emprise(visible);
  if (!v || !ile) return cadrageDe(visible, w, h);
  const plancher = cadrageComplet(visible, w, h).zoom;
  const zoom = Math.max(
    plancher,
    borne(MARGE_CADRAGE * Math.min(w / (v.x1 - v.x0), h / (v.y1 - v.y0))),
  );
  let cx = (v.x0 + v.x1) / 2;
  if (visible[SALLE.coin[1]]?.[SALLE.coin[0]]) {
    // the hall's edges must sit inside the view with a 3 % margin; shift the centre only by what is missing
    const { x, demi } = centreSalle();
    const moitie = (0.47 * w) / zoom - demi;
    cx += Math.sign(x - cx) * Math.max(0, Math.abs(x - cx) - moitie);
  }
  return { zoom, x: zoom * (LARGEUR / 2 - cx), y: zoom * (HAUTEUR / 2 - (v.y0 + v.y1) / 2) };
};

/** How far round the hall and the square the tight opening frame reaches, grid cells. */
const AUTOUR_PLACE = 2;
/** The share of the width the tight frame gives the hall and its square. */
const PART_PLACE = 0.6;

/**
 * The opening frame when the painted layers are on (alentours.ts `serre`): centred on the heroes'
 * hall and the square (the campfire), the town round them filling about 60 % of the width, so the
 * forest and the sky of the painted terrain fill the rest and the diamond's edge stays out of it.
 * Never wider than what the painted terrain covers: the view stays inside it, the hall in view.
 */
function cadrageSerre(visible: readonly (readonly boolean[])[], w: number, h: number): Vue {
  const salle = visible[SALLE.coin[1]]?.[SALLE.coin[0]];
  const feu = emplacements.campfire;
  const base = salle ? SALLE : feu;
  const [x0, y0] = [Math.min(base.coin[0], feu.coin[0]), Math.min(base.coin[1], feu.coin[1])];
  const [x1, y1] = [
    Math.max(base.coin[0] + base.emprise[0], feu.coin[0] + feu.emprise[0]),
    Math.max(base.coin[1] + base.emprise[1], feu.coin[1] + feu.emprise[1]),
  ];
  const a = AUTOUR_PLACE;
  const gauche = ecranXY([x0 - a, y1 + a])[0];
  const droite = ecranXY([x1 + a, y0 - a])[0];
  const haut = ecranXY([x0 - a, y0 - a])[1] - HAUT_BATIMENT;
  const bas = ecranXY([x1 + a, y1 + a])[1];
  const m = FONDU_TERRAIN + 2;
  // The zoom floor of this frame: the whole view fits the painted terrain, a margin of its fade in.
  const dansTerrain = Math.max(w / (TERRAIN.w - 2 * m), h / (TERRAIN.h - 2 * m));
  const bati = empriseBatie(visible);
  // A hamlet gets the closer of the two: its own width at 60 %, or the hall and square at 60 %.
  const zoom = borne(
    Math.max(
      dansTerrain,
      (PART_PLACE * w) / (droite - gauche),
      bati ? (PART_PLACE * w) / (bati.x1 - bati.x0) : 0,
    ),
  );
  // Centre on the core, then keep the whole view inside the painted terrain.
  const clampe = (c: number, moitie: number, min: number, max: number) =>
    Math.min(max - moitie, Math.max(min + moitie, c));
  const cx = clampe((gauche + droite) / 2, w / 2 / zoom, TERRAIN.x + m, TERRAIN.x + TERRAIN.w - m);
  const cy = clampe((haut + bas) / 2, h / 2 / zoom, TERRAIN.y + m, TERRAIN.y + TERRAIN.h - m);
  return { zoom, x: zoom * (LARGEUR / 2 - cx), y: zoom * (HAUTEUR / 2 - cy) };
}

/** The heroes' hall, the village's focal building (B1): the opening frame keeps it whole in view. */
const SALLE = emplacements.heroes_hall;
/** The hall's centre on the map, in dp at zoom 1, and its half-width. */
export const centreSalle = (): { x: number; demi: number } => ({
  x: ecranXY([SALLE.coin[0] + SALLE.emprise[0] / 2, SALLE.coin[1] + SALLE.emprise[1] / 2])[0],
  demi: ((SALLE.emprise[0] + SALLE.emprise[1]) * COTE) / 4,
});

/** How far above a footprint a building's roof and flag reach, in dp at zoom 1. */
const HAUT_BATIMENT = 1.6 * COTE;

/** The built village: the box of the shown buildings' footprints, with their height above; null if none. */
export function empriseBatie(visible: readonly (readonly boolean[])[]): Ile | null {
  let [x0, x1, y0, y1] = [Infinity, -Infinity, Infinity, -Infinity];
  for (const code of buildingCodes) {
    const { coin, emprise: e, cases } = emplacements[code];
    if (!cases.every(([gx, gy]) => visible[gy]?.[gx])) continue;
    const [gx, gy] = coin;
    x0 = Math.min(x0, ecranXY([gx, gy + e[1]])[0]);
    x1 = Math.max(x1, ecranXY([gx + e[0], gy])[0]);
    y0 = Math.min(y0, ecranXY([gx, gy])[1] - HAUT_BATIMENT);
    y1 = Math.max(y1, ecranXY([gx + e[0], gy + e[1]])[1]);
  }
  return x0 > x1 ? null : { x0, x1, y0, y1 };
}

function cadrageDe(visible: readonly (readonly boolean[])[], w: number, h: number): Vue {
  const ile = emprise(visible);
  if (!ile) return { zoom: borne(w / LARGEUR), x: 0, y: 0 };
  const { x0, x1, y0, y1 } = ile;
  const zoom = borne(MARGE_CADRAGE * Math.min(w / (x1 - x0), h / (y1 - y0)));
  return {
    zoom,
    // `a - b` and not `-(b - a)`: a centred map gives +0, never -0 (toEqual tells them apart).
    x: zoom * (LARGEUR / 2 - (x0 + x1) / 2),
    y: zoom * (HAUTEUR / 2 - (y0 + y1) / 2),
  };
}

/** The campfire's centre: the village square, where qa's close captures look. */
export const PLACE: Point = (() => {
  const { coin, emprise } = emplacements.campfire;
  return [coin[0] + emprise[0] / 2, coin[1] + emprise[1] / 2];
})();

/** The camera's move to the building that rose (the moment itself plays from the tap, moment.ts). */
// 700 ms, ease-in-out: the old 500 ms read as a jump (audit-anim anim-09).
export const CROISSANCE_CAMERA_MS = 700;
/** A building's footprint centre, where the camera looks when it has just grown. */
export const centreBatiment = (code: BuildingCode): Point => {
  const { coin, emprise } = emplacements[code];
  return [coin[0] + emprise[0] / 2, coin[1] + emprise[1] / 2];
};

/**
 * The view at the game's zoom `zoomJeu` (isoSpec.json `zoom`, in cells of `cellDp`: 0.6 is 1.6 in
 * demo units) with grid point `p` in the middle of the area.
 */
export function vueSur(p: Point, zoomJeu: number): Vue {
  const zoom = borne((zoomJeu * spec.cellDp) / COTE);
  const [x, y] = ecranXY(p);
  return { zoom, x: zoom * (LARGEUR / 2 - x), y: zoom * (HAUTEUR / 2 - y) };
}

/**
 * The close view of a building (dev captures, `?foyer=`): centred on its sprite's box, so the roof
 * is in as much as the foot, at `zoom` (demo units) unless the sprite would not fit the area.
 */
export function vueFoyer(
  code: BuildingCode,
  palier: VillageTier,
  ambiance: Ambiance,
  w: number,
  h: number,
  zoom: number,
): Vue {
  const s = spriteDe(code, stadeDemo(code, palier), ambiance);
  const [px, py] = ecranXY(centreBatiment(code));
  const r = s ? pose(code, s) : { x: px, y: py, w: 0, h: 0 };
  const tient = Math.min(
    w > 0 && r.w > 0 ? (0.92 * w) / r.w : Infinity,
    h > 0 && r.h > 0 ? (0.92 * h) / r.h : Infinity,
  );
  const z = borne(Math.min(zoom, tient));
  return {
    zoom: z,
    x: z * (LARGEUR / 2 - (r.x + r.w / 2)),
    y: z * (HAUTEUR / 2 - (r.y + r.h / 2)),
  };
}

/** Zoom by `facteur` about the centre of the area, within the bounds. */
export function zoomer(v: Vue, facteur: number): Vue {
  const zoom = borne(v.zoom * facteur);
  const k = zoom / v.zoom;
  return { zoom, x: v.x * k, y: v.y * k };
}

export type Rect = { x: number; y: number; w: number; h: number };

/** How far the bottom row reaches past the map (AUDIT-DA 17): the island's bank hangs under its lowest vertex. */
const DEBORD = 36;
/**
 * The map's tiles, in dp, for a screen of `ratio` px per dp: each at most 1024 px a side (an Svg
 * is a bitmap that size), each reaching 1 dp into its right and lower neighbours. A tile edge
 * falls between physical pixels (390 dp is 1023.75 px at 2.625, and the zoom scales it again), so
 * two tiles that only touched each antialiased their edge against nothing and left a 1 px seam
 * (qa, L0-T15). Overlapping, the tile on top fades its edge over the same drawing beneath.
 */
export function tuiles(ratio: number): Rect[] {
  const pas = Math.floor(1024 / ratio) - 1;
  const rects: Rect[] = [];
  for (let y = TUILES_X0[1]; y < HAUTEUR - 1; y += pas)
    for (let x = TUILES_X0[0]; x < LARGEUR - 1; x += pas)
      rects.push({
        x,
        y,
        w: Math.min(pas + 1, LARGEUR - x),
        h: Math.min(pas + 1, HAUTEUR - y + DEBORD),
      });
  return rects;
}

/**
 * The top left of the first tile: the map grew up and left, so the ground tiles start where the
 * land does (the cells with a tier, to the next 8 dp), not at the old map's corner. The grid's
 * unused corners are not tiled: the same 6 Svg at 2.625 as before.
 */
const TUILES_X0: readonly [x: number, y: number] = (() => {
  let [x0, y0] = [0, 0];
  for (const c of CASES) {
    if (paliers[c[1]]?.[c[0]] == null) continue;
    const [x, y] = ecranXY(c);
    x0 = Math.min(x0, x - COTE / 2);
    y0 = Math.min(y0, y);
  }
  return [Math.floor(x0 / 8) * 8, Math.floor(y0 / 8) * 8];
})();

const DEPART = buildingCodes.filter((code) => buildingDefinitions[code].tier === 1);

/** The island of a tier with `debout` standing, and the buildings whose plot is on it. */
export function etatAvec(palier: VillageTier, debout: Iterable<BuildingCode>) {
  const visible = ileVisible(palier, debout);
  const montres = buildingCodes.filter((code) =>
    emplacements[code].cases.every(([gx, gy]) => visible[gy]?.[gx]),
  );
  return { visible, montres };
}

/** The island of a building alone (`ileSeule`) and the buildings whose plot is on it. */
export function etatSeul(code: BuildingCode) {
  const visible = ileSeule(code);
  // Only this building: a neighbour whose plot falls on the margin would cast its own big shadow.
  const montres = [code];
  return { visible, montres };
}

/** What the demo shows: the island, and the buildings whose plot is on it. */
export const etatCarte = (palier: VillageTier, tousDebout: boolean) =>
  etatAvec(palier, tousDebout ? buildingCodes : DEPART);

/**
 * The tier a building's stages start at (isoLayout.json `etapes`): what the first tier whose
 * island held its whole plot was before the 04/11 plan moved the buildings. Not read from the
 * grid, so a far plot at tier 12 never turns a moved windmill back to its first stage.
 */
const palierDuTerrain = (code: BuildingCode): VillageTier => etapes[code] ?? 12;

const ORDRE_STADES: readonly Stade[] = ["rough", "solid", "grand"];

/** The engine's stages past the painted ones (legendary, mythic) draw as the last painted stage. */
export const enStade = (v: VisualStage): Stade =>
  v === "legendary" || v === "mythic" ? "grand" : v;

/**
 * The stage a hero's building level shows (constants/buildingLevels.ts `buildingStage`), within
 * the stages the building has: the highest one not past the wanted stage, else its first.
 */
export function stadeReel(code: BuildingCode, voulu: Stade): Stade {
  const stades = batiments[code].stades;
  const max = ORDRE_STADES.indexOf(voulu);
  return stades.filter((s) => ORDRE_STADES.indexOf(s) <= max).at(-1) ?? stades[0] ?? "rough";
}

/**
 * The stage a hero's building level draws. Flag off: today's mapping (buildingStage). Flag on: the
 * stage table's (buildingStageFor), so a rank past 6 can draw its own stage once one is painted.
 */
export const stadeDuNiveau = (code: BuildingCode, niveau: number): Stade =>
  stadeReel(
    code,
    BATIMENT_MOTEUR ? enStade(buildingStageFor(code, niveau)) : buildingStage(niveau),
  );

/** The stage a level draws as the engine names it (legendary, mythic kept): the painted sprite's, so its tap mask. */
export const stadeVisuel = (code: BuildingCode, niveau: number): VisualStage =>
  buildingStageFor(code, niveau);

/**
 * The demo's stage rule: rough at the tier its plot joins the island, then one stage more per
 * tier, up to its last (solid for tier 3). A building shown ahead of its plot ("Tous debout") is
 * rough.
 * shortcut: a stage made up from the tier, for the demo's captures only; lot 3 replaces it with
 * buildingStage of the hero's real building level, and this and palierDuTerrain go.
 */
export function stadeDemo(code: BuildingCode, palier: VillageTier): Stade {
  const stades = batiments[code].stades;
  const i = Math.min(stades.length - 1, Math.max(0, palier - palierDuTerrain(code)));
  return stades[i] ?? "rough";
}

// shortcut: MAQUETTES requires every mock-up, and Metro bundles every image require it can reach
// (a lazy require changes nothing), while Expo Router bundles every route, dev-iso included: about
// 2.0 MB of mock-up WebP (57 stages, the sails, 29 decor, water, scaffold and villager pieces) and
// a 190 KB index ship in every APK, F-Droid's included. Accepted on this branch (DECISIONS,
// L1-T07). Before any merge into main or any tag, the mock-ups leave the bundle or are replaced by
// the painted sprites under the same keys.
/**
 * The mock-up or painted sprite of a stage, by isoSpec.json `nomImage`; none yet: a box. F2: the
 * family is painted by day and its night graded from it (scripts/iso/famille_jour.py), same alpha,
 * so both share the night entry's geometry; a stage with no day image (high_road) shows its night one.
 */
export const spriteDe = (
  code: BuildingCode,
  stade: Stade,
  ambiance: Ambiance = "nuit",
): SpriteIso | undefined =>
  peintDe(code, stade, ambiance) ??
  MAQUETTES[nomImage(code, stade, ambiance)] ??
  MAQUETTES[nomImage(code, stade, "nuit")];
/**
 * The sails' sheet beside a windmill's stages: `windmill_sails.webp` is the night's. A stage that
 * has its own sheet (`windmill_sails_grand.webp`, the engine's bigger sails) wears it; every stage
 * without one keeps the shared sheet, so nothing changes until one is painted.
 */
export const ailesDe = (
  code: BuildingCode,
  stade?: Stade,
  ambiance: Ambiance = "nuit",
  /** The data's sheet for the rank (`ailesAuRang`), before the stage's: `windmill_sails_<feuille>.webp`. */
  feuille?: string | null,
): SpriteIso | undefined => {
  const clef = feuille ?? stade;
  const propre = clef
    ? ((ambiance === "nuit" ? undefined : MAQUETTES[`${code}_sails_${clef}.${ambiance}.webp`]) ??
      MAQUETTES[`${code}_sails_${clef}.webp`])
    : undefined;
  return (
    propre ??
    (ambiance === "nuit" ? undefined : MAQUETTES[`${code}_sails.${ambiance}.webp`]) ??
    MAQUETTES[`${code}_sails.webp`]
  );
};

/** A decor or water image standing on one cell of the master grid. */
export type PieceCarte = PieceEau & { case: Case; decor: boolean };

const CLES = Object.keys(MAQUETTES);
const paires = (plat: readonly number[]): Point[] =>
  plat.flatMap((x, i) => (i % 2 === 0 ? [[x, plat[i + 1] ?? 0] as const] : []));

/** Every decor and water cell whose piece has an image, fixed for a build. */
export const PIECES: readonly PieceCarte[] = CASES.flatMap((c): PieceCarte[] => {
  const kind = sol[c[1]]?.[c[0]];
  if (kind === undefined) return [];
  if (DECORS.includes(kind)) {
    const cle = varianteDecor(kind, c, CLES);
    return cle ? [{ cle, miroir: false, case: c, decor: true }] : [];
  }
  const eau = pieceEau(sol, c);
  return eau && MAQUETTES[eau.cle] ? [{ ...eau, case: c, decor: false }] : [];
});

/** The kinds of decor drawn as images: their cells' ground is grass under the image. */
export const DECORS_EN_IMAGE: ReadonlySet<string> = new Set(
  DECORS.filter((k) => PIECES.some((p) => p.decor && sol[p.case[1]]?.[p.case[0]] === k)),
);

/** A piece's ground shadow in grid coordinates; a mirrored piece casts none (see below). */
export function ombresPiece(p: PieceCarte): Point[][] {
  const s = MAQUETTES[p.cle];
  // A mirror would throw the shadow toward +gy, against the moon; mirrored pieces are low water.
  // A stream cell has no image, so no shadow of its own (it would darken the ground tile's stream).
  if (!s || p.miroir || eauTracee(p.cle)) return [];
  // Scaled about the anchor (the cell's bottom corner) like the image it is cast by.
  const k = reduitPiece(p.cle);
  return s.ombre.map((o) =>
    enveloppe(
      paires(o).map(([x, y]): Point => [p.case[0] + 1 + (x - 1) * k, p.case[1] + 1 + (y - 1) * k]),
    ),
  );
}

/**
 * Whether a piece shows on the island. Water: its cell is on it. Decor (DECISIONS, 28/10): its
 * cell and all the ground under its shadow are, so no decor shadow falls on the sea.
 */
export function pieceMontree(p: PieceCarte, visible: readonly (readonly boolean[])[]): boolean {
  const sur = ([gx, gy]: Case) => visible[gy]?.[gx] === true;
  return sur(p.case) && (!p.decor || casesSousOmbre(ombresPiece(p)).every(sur));
}

/**
 * Standing villagers (L1-T19, checklist item 14): blender's figurines at rest on path cells of the
 * village square, a size reference next to the buildings. Still images, no state machine until
 * lot 5; a figurine is a decor-like piece (one cell, its own small shadow).
 */
export const FIGURINES: readonly PieceCarte[] = (
  [
    ["smith_face", [11, 11]],
    ["farmer_face", [11, 12]],
    ["herbalist_face", [10, 11]],
  ] as const
).map(([nom, c]) => ({ cle: clePiece("villageois", nom), miroir: false, case: c, decor: true }));

/** T39 (DA exit audit, finding 1): a lantern stands by the path at tier 1 (one cell, one more costs the decode budget), so the foreground is not empty. A fixed prop like a figurine. FIN-DIS: at the west road's corner by the hall, a grass cell no walker crosses (iso-marcheurs-profondeur), and clear of the cat's steps. */
export const LANTERNES: readonly PieceCarte[] = ([[7, 6]] as const).map((c) => ({
  cle: clePiece("decor", "lanterne"),
  miroir: false,
  case: c,
  decor: true,
}));

/** F3: under the painted props the vector lantern (and so its pool of light, AmbianceCarte) is gone. */
export const lanterneVisible = (peint: Pick<Alentours, "decor">) => !peint.decor;

/** T39: the lantern is a small prop, decoded at 0.7 of the plain size (Planche `echelle`; iso-detail models it). */
export const ECHELLE_DECODE_LANTERNE = 0.7;

/**
 * The lantern's two glass faces on its 512 x 768 sheet: the convex hulls of its amber pixels
 * (measured on decor_lanterne.webp, 6128 of them) grown by 2 px. By day a dark pane covers them, so
 * nothing warm is lit (the VeillesDessinees rule); iso-lanterne.test.tsx keeps every pixel inside.
 */
export const VERRES_LANTERNE = [
  "269,227 283,231 308,244 313,248 313,347 309,350 295,344 272,332 269,296",
  "323,248 326,245 360,228 366,227 366,328 358,334 338,344 327,349 323,348",
] as const;

export type Animal = "poule";
/** The poses of an animal's sheet, in the order of horloge.ts `poseAnimal`. */
export const POSES_ANIMAL = ["repos", "a", "b"] as const;
export const cleAnimal = (
  nom: Animal,
  pose: (typeof POSES_ANIMAL)[number],
  ambiance: Ambiance = "nuit",
) => clePiece("animal", `${nom}_${pose}`, ambiance);

/** A small animal on its own cell: shown with its building when it has one, walking a little in a wave (L5-T10, marcheurs.ts `planifierAnimaux`). */
export type AnimalCarte = { nom: Animal; avec?: BuildingCode; piece: PieceCarte };

/**
 * Fixed places on grass, off every path and footprint (iso-pieces.test.ts measures the shadows):
 * the hen between the farm and the street (the old cat by the well and the roof crows left with
 * the life track: the wall's cat is painted, creatures.ts). `piece.cle` is the rest pose, whose shadow stands for both.
 */
export const ANIMAUX: readonly AnimalCarte[] = ([["poule", "farm", [1, 12]]] as const).map(
  ([nom, avec, c]) => ({
    nom,
    ...(avec ? { avec } : {}),
    piece: { cle: cleAnimal(nom, "repos"), miroir: false, case: c, decor: true },
  }),
);

/** Whether an animal shows: its building (if any) is shown, and its cell and shadow are on the island. */
export const animalMontre = (
  a: AnimalCarte,
  visible: readonly (readonly boolean[])[],
  montres: readonly BuildingCode[],
) => (a.avec === undefined || montres.includes(a.avec)) && pieceMontree(a.piece, visible);

export type ElementCarte =
  | { type: "batiment"; code: BuildingCode }
  | { type: "animal"; piece: PieceCarte; animal: AnimalCarte }
  | { type: "piece"; piece: PieceCarte }
  | { type: "figurine"; piece: PieceCarte }
  /** The lisiere (lisiere.ts): decor just off the island, no ground tile, no drawn shadow. */
  | { type: "lisiere"; piece: PieceLisiere }
  /** A stretch of castle_wall's wall (isoLayout.ts `troncons`, rempart.ts): drawn by the app, at the wall's stage. */
  | { type: "pan"; troncon: number; cases: readonly Case[] };

/** The footprint of every element of the map, by key, and the elements: what the depth order sorts. */
function elementsCarte(): {
  elements: Map<string, ElementCarte>;
  emprises: Record<string, Emprise>;
} {
  const elements = new Map<string, ElementCarte>();
  const emprises: Record<string, Emprise> = {};
  for (const code of buildingCodes)
    if (batiments[code].stades.some((s) => spriteDe(code, s))) {
      elements.set(code, { type: "batiment", code });
      emprises[code] = emplacements[code];
    }
  for (const piece of PIECES) {
    const cle = `piece:${piece.case.join(",")}`;
    elements.set(cle, { type: "piece", piece });
    emprises[cle] = { coin: piece.case, emprise: [1, 1] };
  }
  for (const piece of [...FIGURINES, ...LANTERNES]) {
    const cle = `figurine:${piece.case.join(",")}`;
    elements.set(cle, { type: "figurine", piece });
    emprises[cle] = { coin: piece.case, emprise: [1, 1] };
  }
  for (const animal of ANIMAUX) {
    const cle = `animal:${animal.piece.case.join(",")}`;
    elements.set(cle, { type: "animal", piece: animal.piece, animal });
    emprises[cle] = { coin: animal.piece.case, emprise: [1, 1] };
  }
  for (const piece of LISIERE) {
    const cle = `lisiere:${piece.case.join(",")}`;
    elements.set(cle, { type: "lisiere", piece });
    emprises[cle] = { coin: piece.case, emprise: [1, 1] };
  }
  troncons.forEach((cases, troncon) => {
    const cle = `pan:${troncon}`;
    const xs = cases.map(([x]) => x);
    const ys = cases.map(([, y]) => y);
    const coin: Case = [Math.min(...xs), Math.min(...ys)];
    elements.set(cle, { type: "pan", troncon, cases });
    emprises[cle] = {
      coin,
      emprise: [Math.max(...xs) + 1 - coin[0], Math.max(...ys) + 1 - coin[1]],
    };
  });
  return { elements, emprises };
}

const { elements: ELEMENTS, emprises: EMPRISES_CARTE } = elementsCarte();

export { EMPRISES_CARTE };

/**
 * Buildings with an image at some stage and pieces, back to front, sorted together as footprints
 * (a piece is one cell). Fixed for a build: IsoCarte mounts the shown ones, in this order. The
 * order is read from constants/isoOrdre.json (written by iso-profondeur-ordre.test.ts, which
 * recomputes it and compares): `ordreProfondeur` is n squared and cost start-up time (L4-AUD I6).
 */
export const ORDRE_CARTE: readonly ElementCarte[] = orderRaw.ordre.flatMap((k) => {
  const e = ELEMENTS.get(k);
  return e ? [e] : [];
});

/** The footprint of each entry of ORDRE_CARTE, same indices: what a walker's depth rank is measured against (marcheurs.ts). */
export const EMPRISES_ORDRE: readonly Emprise[] = orderRaw.ordre.flatMap((k) => {
  const e = EMPRISES_CARTE[k];
  return ELEMENTS.has(k) && e ? [e] : [];
});

/** The buildings of ORDRE_CARTE, in its order. */
export const ORDRE_SPRITES = ORDRE_CARTE.flatMap((e) => (e.type === "batiment" ? [e.code] : []));

/** Sprite px to demo dp: a cell is S px wide in a sprite, COTE dp on the map. */
const K = COTE / spec.S;

/** Where a sprite's anchor lands on a grid point, in dp; a canvas drawn at `pxScale` shrinks by it. */
const poseEn = (p: Point, s: SpriteIso, f = 1): Rect => {
  const [ax, ay] = ecranXY(p);
  const k = (f * K) / (s.pxScale ?? 1);
  return { x: ax - s.anchor[0] * k, y: ay - s.anchor[1] * k, w: s.size[0] * k, h: s.size[1] * k };
};

/**
 * Rule 21 of the tier 12 plan (direction/target.md): the player's buildings stand about a quarter
 * bigger, about their anchor (the footprint's bottom corner), so their base stays on its plot. The
 * wall, one with the locked corner, keeps its size. Everything that follows a building's picture
 * goes through `pose` or `echelleDe`: the tap mask, the contact shadow, the cast shadows, the sails.
 */
export const ECHELLE_BATIMENT = 1.25;
export const echelleDe = (code: BuildingCode): number =>
  code === "castle_wall" ? 1 : ECHELLE_BATIMENT;

/** Where a sprite lies on the map, in dp: its anchor on the footprint's bottom corner. */
export function pose(code: BuildingCode, s: SpriteIso): Rect {
  const { coin, emprise } = emplacements[code];
  return poseEn([coin[0] + emprise[0], coin[1] + emprise[1]], s, echelleDe(code));
}

/** A shadow polygon of a building, in grid coordinates, grown about the anchor like its picture. */
const grandi = (code: BuildingCode, poly: readonly Point[]): Point[] => {
  const { coin, emprise } = emplacements[code];
  const [ax, ay] = [coin[0] + emprise[0], coin[1] + emprise[1]];
  const f = echelleDe(code);
  return poly.map(([x, y]): Point => [ax + (x - ax) * f, ay + (y - ay) * f]);
};

/**
 * T39 (item 14): a rock's canvas is a villager canvas at half its resolution, so drawn like the
 * other 1x canvases it stood 1.7 times a villager's height beside a tent. Drawn at this share of
 * it, about its anchor (its base stays on its cell), it is a villager's height or less. A
 * `transform` on the same view, not a smaller one: the image keeps the canvas size the perf
 * counter already counts, and no node is added.
 */
export const ECHELLE_ROCHER_POSE = 0.5;
/** Audit T43 round 1: the tier-1 lamp post stood taller than the tent; drawn at this share of its size it stays under it. */
export const ECHELLE_LANTERNE_POSE = 0.6;
/** Rule 22 (bridge readable): the bridge's mock-up is small and dark beside buildings drawn 25 % bigger, so it is drawn bigger too, about its anchor. */
export const ECHELLE_PONT_POSE = 1.35;
export const reduitPiece = (cle: string) =>
  cle.startsWith("decor/rochers")
    ? ECHELLE_ROCHER_POSE
    : cle.startsWith("decor/lanterne")
      ? ECHELLE_LANTERNE_POSE
      : cle.startsWith("eau/canal_pont")
        ? ECHELLE_PONT_POSE
        : 1;

/** A piece's anchor on its cell's bottom corner; the cascade's falling sheet (canvas `sails`) is centred on the cell's back corner. */
export const posePiece = ([gx, gy]: Case, s: SpriteIso): Rect => poseEn([gx + 1, gy + 1], s);
export const poseChute = (c: Case, s: SpriteIso): Rect => poseEn(c, s);
/** A villager-canvas sprite (`cellCenter` anchor, animals too): its anchor on the centre of its cell. */
export const poseCentre = ([gx, gy]: Case, s: SpriteIso): Rect => poseEn([gx + 0.5, gy + 0.5], s);

/** Where the sails lie: their centre on the stage's pivot, at the stage's scale. Still in lot 1. */
export function poseAiles(corps: Rect, s: SpriteIso, ailes: SpriteIso): Rect | null {
  if (!s.ailes) return null;
  // The body's own scale (its `pose` is bigger by `echelleDe`): the sails follow it.
  const f = corps.w / (s.size[0] * (K / (s.pxScale ?? 1)));
  const k = f * K * s.ailes.echelle;
  const px = corps.x + s.ailes.pivot[0] * K * f;
  const py = corps.y + s.ailes.pivot[1] * K * f;
  return {
    x: px - ailes.anchor[0] * k,
    y: py - ailes.anchor[1] * k,
    w: ailes.size[0] * k,
    h: ailes.size[1] * k,
  };
}

/** Samples per cell along the footprint when the silhouette is read. */
const PAS_CONTACT = 6;
/** The contact shadow's margin around the socle (none: it was the wider diamond that stuck out of it), in cells, and its push to the screen's right. */
const MARGE_CONTACT = 0;
const DECALE_CONTACT = 0.08;

/**
 * AUDIT-DA 26 and T39: a contact shadow under a building with a sprite, one polygon that follows
 * its socle. The footprint is sampled on the ground; a point counts when the sprite's tap mask is
 * set just above its screen position (the base reaches it), and the hull of those points, pushed
 * out by a margin and to the screen's right like every cast shadow, is the shadow. A sprite with
 * no mask, or with fewer than three points under it, keeps the footprint's rectangle. It joins
 * the cast shadows in one flat path (one tone, nothing stacks); none without a sprite.
 */
export function ombreContactDe(
  code: BuildingCode,
  stade: Stade,
  ambiance: Ambiance = "nuit",
): Point[][] {
  const s = spriteDe(code, stade, ambiance);
  if (!s) return [];
  const { coin, emprise } = emplacements[code];
  const [w, h] = emprise;
  const rect = pose(code, s);
  const m = s.masque;
  const pris: Point[] = [];
  if (m) {
    for (let i = 0; i <= w * PAS_CONTACT; i++) {
      for (let j = 0; j <= h * PAS_CONTACT; j++) {
        const g: Point = [coin[0] + i / PAS_CONTACT, coin[1] + j / PAS_CONTACT];
        const [x, y] = ecranXY(g);
        // Two px above the ground point: on the sprite's own edge the mask is a step short.
        const u = ((x - rect.x) / rect.w) * s.size[0];
        const v = ((y - rect.y) / rect.h) * s.size[1] - 2;
        if (opaque(m, u, v)) pris.push(g);
      }
    }
  }
  const coque: Point[] =
    pris.length >= 3
      ? enveloppe(pris)
      : [
          [coin[0], coin[1]],
          [coin[0] + w, coin[1]],
          [coin[0] + w, coin[1] + h],
          [coin[0], coin[1] + h],
        ];
  const cx = coque.reduce((n, p) => n + p[0], 0) / coque.length;
  const cy = coque.reduce((n, p) => n + p[1], 0) / coque.length;
  return [
    coque.map(([x, y]): Point => {
      const d = Math.hypot(x - cx, y - cy) || 1;
      return [
        x + ((x - cx) / d) * MARGE_CONTACT + DECALE_CONTACT,
        y + ((y - cy) / d) * MARGE_CONTACT - DECALE_CONTACT,
      ];
    }),
  ];
}

/**
 * The ground a shown building darkens, in grid coordinates, one counter-clockwise hull per part
 * (the clip unites them under nonzero): its stage's exported shadow plus its sails at rest. A plot
 * with no image at its stage is flat and casts none. Every stage has a mock-up since L1-T07; the
 * largest zone over all stages (ombres.ts `zoneOmbre`) is the layout test's, not the screen's.
 */
export function ombresDe(code: BuildingCode, stade: Stade, ambiance: Ambiance = "nuit"): Point[][] {
  const s = spriteDe(code, stade, ambiance);
  if (!s) return [];
  const [gx, gy] = emplacements[code].coin;
  const ailes = ailesDe(code, stade);
  const locales = [
    ...s.ombre.map(paires),
    // A painted windmill's sails carry no volumes (and its pivot no grid point): no swept shadow.
    ...(s.ailes && ailes?.volumes && !peintDe(code, stade, ambiance)
      ? ombreAiles(ailes.volumes, s.ailes.pivotGrille, s.ailes.echelle, 0, LUNE)
      : []),
  ];
  return locales.map((p) => grandi(code, enveloppe(p.map(([x, y]): Point => [gx + x, gy + y]))));
}

/** One unit of height on the map, in dp: pxPerUnit * sin 60 (iso-maquettes test), in sprite px, scaled like a cell. */
export const Z_DP = (spec.pxPerUnit * Math.sin(Math.PI / 3) * COTE) / spec.S;

/**
 * A building's own shadow on its socle's top (L3-T01), to draw over its sprite: its `d` and the
 * dp box it lies in. Only painted stages have it (the mock-ups' renders carry theirs), and not
 * the painted images that carry it already (isoSpec.json `socle.dejaPeinte`); none otherwise.
 */
export function ombreSocleDe(code: BuildingCode, stade: Stade): { d: string; rect: Rect } | null {
  const socle = spriteDe(code, stade)?.socle;
  // DEJA_PEINTE names the night files (`.nuit.webp`); a day sprite carries what its night carries.
  if (!socle || DEJA_PEINTE.has(nomImage(code, stade, "nuit"))) return null;
  const [gx, gy] = emplacements[code].coin;
  const pieces = socle.ombre.map((o) =>
    grandi(
      code,
      paires(o).map(([x, y]): Point => [gx + x, gy + y]),
    ).map((g): Point => {
      const [sx, sy] = ecranXY(g);
      return [sx, sy - socle.hauteur * Z_DP * echelleDe(code)];
    }),
  );
  const pts = pieces.flat();
  if (pts.length === 0) return null;
  const xs = pts.map(([x]) => x);
  const ys = pts.map(([, y]) => y);
  const [x0, y0] = [Math.min(...xs) - 1, Math.min(...ys) - 1];
  return {
    d: pieces.map((p) => `M${p.map((q) => q.join(",")).join("L")}Z`).join(""),
    rect: { x: x0, y: y0, w: Math.max(...xs) + 1 - x0, h: Math.max(...ys) + 1 - y0 },
  };
}

/**
 * The `d` of a water cell's veil: the shadows of buildings and decor (`ombres`) that reach the
 * cell. A water piece's own shadow (its surface and banks) lies under its opaque image and is never
 * passed here: it covered every water cell, so the veil darkened the whole canal (qa, L1-T09).
 */
/** `casesSousOmbre([o])` holds `c`, without building the cells: it ran per piece and per shadow (PLAN-PERF P2). */
const sousOmbre = (c: Case, o: readonly Point[]) => {
  if (o.length === 0) return false;
  let x0 = Infinity;
  let x1 = -Infinity;
  let y0 = Infinity;
  let y1 = -Infinity;
  // Indexed, no destructuring: Babel turns a destructured loop variable into a helper call.
  for (let i = 0; i < o.length; i++) {
    const p = o[i] as Point;
    if (p[0] < x0) x0 = p[0];
    if (p[0] > x1) x1 = p[0];
    if (p[1] < y0) y0 = p[1];
    if (p[1] > y1) y1 = p[1];
  }
  return (
    c[0] >= Math.floor(x0) && c[0] < Math.ceil(x1) && c[1] >= Math.floor(y0) && c[1] < Math.ceil(y1)
  );
};

export const voileDe = (c: Case, ombres: readonly Point[][]): string =>
  ombres
    .filter((o) => sousOmbre(c, o))
    .map(cheminSvg)
    .join("");

const touche = (a: Rect, b: Rect) =>
  a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;

/** Rank in ORDRE_CARTE of a building (by code) or of a lisiere piece (by cell): fixed for a build. */
const RANG = new Map(
  ORDRE_CARTE.map((e, i) => [
    e.type === "batiment" ? e.code : `${e.type}:${e.type === "pan" ? e.troncon : e.piece.case}`,
    i,
  ]),
);

/**
 * `lisiereMontree` by island, filled on first use. The island is a function of the tier and of the
 * buildings standing (not of the tier alone), so the key is the island itself: at most one entry
 * per island ever shown, 12 tiers and a few standing sets.
 * shortcut: unbounded, fine while a hero meets a handful of islands; cap it if islands ever vary freely.
 */
const MONTREES = new Map<string, ReturnType<typeof lisiereMontree>>();
const montreePour = (visible: readonly (readonly boolean[])[]) => {
  const cle = CASES.map(([gx, gy]) => (visible[gy]?.[gx] ? 1 : 0)).join("");
  let m = MONTREES.get(cle);
  if (!m) {
    m = lisiereMontree(visible);
    MONTREES.set(cle, m);
  }
  return m;
};

/**
 * The lisiere on show for an island: `lisiereMontree` less every piece whose image touches the
 * image of a shown building that comes before it in `ORDRE_CARTE`, since it would be drawn over
 * that building (and over its tap zone) at up to 0.9 opacity.
 */
export function lisiereAffichee(
  visible: readonly (readonly boolean[])[],
  montres: readonly BuildingCode[],
  stade: (code: BuildingCode) => Stade,
  ambiance: Ambiance = "nuit",
): ReturnType<typeof lisiereMontree> {
  const batiments = montres.flatMap((code) => {
    const s = spriteDe(code, stade(code), ambiance);
    return s ? [{ rang: RANG.get(code) ?? 0, rect: pose(code, s) }] : [];
  });
  return montreePour(visible).filter(({ piece }) => {
    const s = MAQUETTES[clePiece(piece.famille, piece.nom, ambiance)];
    const mien = RANG.get(`lisiere:${piece.case}`) ?? 0;
    // Full size on purpose: the selection is the same as before the rocks were drawn smaller.
    const rect = s ? posePiece(piece.case, s) : null;
    return !rect || !batiments.some((b) => b.rang < mien && touche(b.rect, rect));
  });
}

/**
 * What IsoCarte mounts on an island: the pieces, standing figurines (less those a role's villager
 * replaces), animals and lisiere that show, and `indices`, the entries of ORDRE_CARTE mounted, in
 * order. One list for the map and for the walkers' depth test: a walker's rank is among these.
 */
export function elementsMontes(
  visible: readonly (readonly boolean[])[],
  montres: readonly BuildingCode[],
  stade: (code: BuildingCode) => Stade,
  ambiance: Ambiance = "nuit",
  peint: Pick<Alentours, "foret" | "decor"> = { foret: false, decor: false },
  /** A building alone: no piece, villager or animal, whatever lies on its small island. */
  seul = false,
) {
  const affiches = new Set<string>(montres);
  // The vector stand-ins the painted layers replace: the blue-grey cones of the trees and groves
  // (forest), the night lantern drawn by day (decor; see `lanterneVisible`).
  const remplace = (cle: string) =>
    (peint.foret && (cle.startsWith("decor/arbre") || cle.startsWith("decor/bosquet"))) ||
    (peint.decor && cle.startsWith("decor/lanterne"));
  const montree = (type: "piece" | "figurine") =>
    new Set(
      ORDRE_CARTE.flatMap((e) =>
        e.type === type && pieceMontree(e.piece, visible) && !remplace(e.piece.cle)
          ? [e.piece]
          : [],
      ),
    );
  // The lisiere: decor off the island, no tile, no shadow, faded (lisiere.ts).
  const lisiere = new Map(
    lisiereAffichee(visible, montres, stade, ambiance).map((l) => [
      l.piece.case.join(","),
      l.opacite,
    ]),
  );
  const pieces = seul ? new Set<PieceCarte>() : montree("piece");
  // A standing figurine gives way to its role's villager once the role's building stands.
  const roles = rolesPresents(montres);
  const figurines = new Set(
    seul ? [] : [...montree("figurine")].filter((f) => !roles.some((r) => f.cle.includes(`${r}_`))),
  );
  const animaux = new Set(seul ? [] : ANIMAUX.filter((a) => animalMontre(a, visible, montres)));
  const montre = (e: ElementCarte) => {
    if (e.type === "batiment") return affiches.has(e.code);
    // A wall stretch shows with castle_wall, once one of its cells is on the island (FIN-DIS).
    if (e.type === "pan")
      return affiches.has("castle_wall") && e.cases.some(([gx, gy]) => visible[gy]?.[gx] === true);
    if (e.type === "animal") return animaux.has(e.animal);
    if (e.type === "lisiere") return lisiere.has(e.piece.case.join(","));
    return (e.type === "figurine" ? figurines : pieces).has(e.piece);
  };
  const indices = ORDRE_CARTE.flatMap((e, i) => (montre(e) ? [i] : []));
  return { indices, pieces, figurines, animaux, lisiere };
}
