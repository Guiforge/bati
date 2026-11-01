// Which image stands on a decor or water cell of the master grid, pure and keyed like the image
// index (maquettes.ts): `decor/<kind>_<variant>.nuit.webp`, `eau/<piece>.nuit.webp`. A painted
// sprite of lot 2 takes the same key as blender's mock-up, so nothing here changes with it.

import type { Case, Sol } from "./isoLayout";
import { type Ambiance, biomes, nomFichier } from "./isoSpec";
import type { Point } from "./ombres";

// The image families of the biome, the folder part of every key (isoSpec.json biomes.defaut).
const FAMILLE_DECOR = biomes.defaut.decors.famille;
const FAMILLE_EAU = biomes.defaut.eau.famille;

/** The decor kinds of isoLayout.json's legend, which have variants. */
export const DECORS: readonly Sol[] = ["arbre", "rochers", "bosquet"];
const EAU: ReadonlySet<Sol | undefined> = new Set<Sol | undefined>(["eau", "pont", "cascade"]);

/** A piece's index key, isoSpec.json `nomImage` with the family as slug and the name as stage. */
export const clePiece = (famille: string, nom: string, ambiance: Ambiance = "nuit") =>
  nomFichier(famille, nom, ambiance);

/**
 * The variant of a decor on a cell: stable for the cell (a spatial hash, no randomness), spread
 * over the variants `cles` holds for its kind; none when the kind has no image yet.
 */
export function varianteDecor(
  kind: Sol,
  [gx, gy]: Case,
  cles: readonly string[],
): string | undefined {
  // The key with an empty variant, cut where the variant goes: `decor/arbre_` and `.nuit.webp`.
  const [prefixe = "", suffixe = ""] = clePiece(FAMILLE_DECOR, `${kind}_|`).split("|");
  const variantes = cles
    .filter((c) => c.startsWith(prefixe) && c.endsWith(suffixe))
    // T39: of the trees only the painted one is accepted (arbre_b and arbre_c failed twice, out of the V1): the stencils stay on disk, never drawn.
    .filter((c) => kind !== "arbre" || c.includes("arbre_a"))
    .sort();
  const h = (Math.imul(gx, 73856093) ^ Math.imul(gy, 19349663)) >>> 0;
  return variantes[h % Math.max(1, variantes.length)];
}

export type PieceEau = { cle: string; miroir: boolean; chute?: string };

/**
 * The water piece of a cell from its neighbours (water, bridge or cascade). blender drew each
 * piece one way: the straight canal and the bridge along gy, the head closed on the -gy side, the
 * corner joining the +gy and +gx edges, the cascade's lip on the +gy edge. A screen mirror swaps
 * gx and gy, which turns the others along gx.
 * shortcut: a corner or a head facing another way falls back on the straight canal, and the
 * cascade is always `cascade_bord` with its lip on +gy (+gx mirrored), even where the water leaves
 * the island by -gy or -gx; the master grid has none of these (one canal along gy, falling at
 * +gy). Painted variants in lot 2 if a layout ever needs them.
 */
export function pieceEau(sol: readonly (readonly Sol[])[], [gx, gy]: Case): PieceEau | null {
  const s = sol[gy]?.[gx];
  if (!EAU.has(s)) return null;
  const eau = (x: number, y: number) => EAU.has(sol[y]?.[x]);
  const [n, sud, o, e] = [eau(gx, gy - 1), eau(gx, gy + 1), eau(gx - 1, gy), eau(gx + 1, gy)];
  const enX = (o || e) && !(n || sud);
  if (s === "pont") return { cle: clePiece(FAMILLE_EAU, "canal_pont"), miroir: enX };
  if (s === "cascade")
    return {
      cle: clePiece(FAMILLE_EAU, "cascade_bord"),
      miroir: enX,
      chute: clePiece(FAMILLE_EAU, "cascade_chute"),
    };
  if (sud && e && !n && !o) return { cle: clePiece(FAMILLE_EAU, "canal_angle"), miroir: false };
  if (sud && !n && !o && !e) return { cle: clePiece(FAMILLE_EAU, "canal_berge"), miroir: false };
  if (e && !n && !o && !sud) return { cle: clePiece(FAMILLE_EAU, "canal_berge"), miroir: true };
  return { cle: clePiece(FAMILLE_EAU, "canal_droit"), miroir: enX };
}

// T22: the plain canal pieces keep their place in the depth order (a glint layer follows them) but
// show no image: the ground tile draws the stream (riviere.ts). The bridge and the cascade keep theirs.
// Every ambiance's key, so a day sprite of the canal is left to the stream as well.
const TRACEES: ReadonlySet<string> = new Set(
  ["canal_droit", "canal_angle", "canal_berge"].flatMap((n) =>
    (["nuit", "jour"] as const satisfies readonly Ambiance[]).map((a) =>
      clePiece(FAMILLE_EAU, n, a),
    ),
  ),
);
/** Whether a water piece is drawn by the ground tile's stream rather than by its image. */
export const eauTracee = (cle: string) => TRACEES.has(cle);

/** Every cell the box of a shadow touches: more than its polygons, never fewer. */
export function casesSousOmbre(polygones: readonly (readonly Point[])[]): Case[] {
  const pts = polygones.flat();
  if (pts.length === 0) return [];
  const xs = pts.map(([x]) => x);
  const ys = pts.map(([, y]) => y);
  const cases: Case[] = [];
  for (let x = Math.floor(Math.min(...xs)); x < Math.ceil(Math.max(...xs)); x++)
    for (let y = Math.floor(Math.min(...ys)); y < Math.ceil(Math.max(...ys)); y++)
      cases.push([x, y]);
  return cases;
}
