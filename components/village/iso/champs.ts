// The fields and hedges round the village (FIN-CAR tour 1, B2): strips of ploughed ground with
// two-tone furrows and a low hedge on a side, laid in grid space just off the island, on the cells it
// does not show, and on the island where the plan puts them (isoLayout.json `champs`). No ink: the
// ground is never inked. They are paths in the ground tiles' existing Svg (no image, nothing
// animated) and replace, at the island's contact, the glade of painted wallpaper. Pure: a function
// of the island and a hash of the block, so the same land is drawn on every visit; a growing island
// takes back the blocks it needs off the island, and shows the plan's once their cells are on it.

import { ecranXY, HAUTEUR, LARGEUR, type Rect } from "./carteDemo";
import { type Case, champsDuPlan } from "./isoLayout";
import type { Point } from "./ombres";
import { cheminRuban, ruban } from "./ruban";
import { SORTIES } from "./rues";
import { hasard } from "./solVarie";

const GRAINE = 83;
/** The lattice of blocks, in cells: a field is `PAS_X` x `PAS_Y` cells less its lanes. */
const PAS_X = 3;
const PAS_Y = 2;
/** The lane left round a field, in cells (a hedge stands in it). */
const RUELLE = 0.16;
/** How far from the island a block may stand, in cells (king moves): the contact only. */
const CONTACT = 3;
/** The furrows' spacing, in cells. */
const SILLON = 0.2;
/** A field stays this far (dp) inside the map's box, which the ground tiles cover and no more. */
const BORD_CARTE = 14;
/** A field keeps this far (cells) from a road leaving the village. */
const DEGAGE = 1.15;

export type Champs = {
  /** The fields' fill, by tint (two greens, a dark ochre). */
  teintes: readonly [string, string, string];
  /** The furrows, as strokes: every other one dark, the rest pale (two tones, no ink). */
  sillons: string;
  sillonsClairs: string;
  /** The hedges, as filled outlines. */
  haies: string;
  /** How many fields stand off the island: 0 when none does. */
  nombre: number;
  /** Each of those fields' block: its cells' top left corner and size, in cells. */
  blocs: readonly (readonly [gx: number, gy: number, w: number, h: number])[];
};

type Rect4 = [x0: number, y0: number, x1: number, y1: number];

const quad = (x0: number, y0: number, x1: number, y1: number): Point[] => [
  [x0, y0],
  [x1, y0],
  [x1, y1],
  [x0, y1],
];

/** The road cells' samples outside the island, every 0.3 cell along each branch. */
const ECHANTILLONS: readonly Point[] = SORTIES.flatMap((s) =>
  s.branches.flatMap((b) =>
    b.slice(1).flatMap((p, i): Point[] => {
      const q = b[i] ?? p;
      const n = Math.max(1, Math.ceil(Math.hypot(p[0] - q[0], p[1] - q[1]) / 0.3));
      return Array.from(
        { length: n },
        (_, k): Point => [q[0] + ((p[0] - q[0]) * k) / n, q[1] + ((p[1] - q[1]) * k) / n],
      );
    }),
  ),
);

/** Whether a road leaving the village passes within `DEGAGE` of the rectangle. */
const surRoute = (x0: number, y0: number, x1: number, y1: number) =>
  ECHANTILLONS.some(
    ([x, y]) => x > x0 - DEGAGE && x < x1 + DEGAGE && y > y0 - DEGAGE && y < y1 + DEGAGE,
  );

/**
 * The three plots the painted ground carries beside the south road (loupe BC, frozen in
 * docs/designs/village-loop/loupes/bc/route_tuiles.json): wheat on the road's left, a vegetable
 * plot on its right, [gx0, gy0, gx1, gy1] in cells, both off the 20x20 grid. The painted ground
 * draws them, so no block of the lattice below stands on them (`surParcelle`).
 */
export const PARCELLES = {
  ble: [21, 19.5, 26, 23.5],
  potager: [22.5, 13, 26.5, 16],
  paturage: [27.5, 21.5, 31.5, 25],
} as const;
/** The lattice block's margin round a plot, cells. */
const MARGE_PARCELLE = 0.5;

/** Whether a rectangle (cells) touches a plot of the south corner, margin included. */
export const surParcelle = (x0: number, y0: number, x1: number, y1: number) =>
  Object.values(PARCELLES).some(
    ([a, b, c, d]) =>
      x1 > a - MARGE_PARCELLE &&
      x0 < c + MARGE_PARCELLE &&
      y1 > b - MARGE_PARCELLE &&
      y0 < d + MARGE_PARCELLE,
  );

/** The ring (1 to `CONTACT`) of the nearest shown cell, in king moves, from a cell off the island; 0 when none is near. */
function anneau(vu: (gx: number, gy: number) => boolean, gx: number, gy: number) {
  for (let r = 1; r <= CONTACT; r++)
    for (let x = gx - r; x <= gx + r; x++)
      for (let y = gy - r; y <= gy + r; y++)
        if (Math.max(Math.abs(x - gx), Math.abs(y - gy)) === r && vu(x, y)) return r;
  return 0;
}

/** Whether a screen point lies where the ground tiles draw: inside the map's box, with a margin. */
const dansCarte = ([gx, gy]: Point) => {
  const [x, y] = ecranXY([gx, gy]);
  return x > BORD_CARTE && x < LARGEUR - BORD_CARTE && y > BORD_CARTE && y < HAUTEUR - BORD_CARTE;
};

const cellules = (x: number, y: number, w: number, h: number) =>
  Array.from({ length: w * h }, (_, k): [number, number] => [x + (k % w), y + Math.floor(k / w)]);
/** The plan's fields (isoLayout.json `champs`): blocks of grass on the island, by the mill and outside the south wall. */
const COLLEES = champsDuPlan.map(({ coin: [x, y], taille: [w, h] }) => ({
  coin: [x, y] as const,
  bloc: [x, y, w, h] as const,
}));

/** A field's outline: each side broken in four, every point pushed along the side's normal a little. */
function contour(i: number, j: number, [x0, y0, x1, y1]: Rect4): Point[] {
  const coins = quad(x0, y0, x1, y1);
  return coins.flatMap((a, c): Point[] => {
    const b = coins[(c + 1) % 4] ?? a;
    const [dx, dy] = [b[0] - a[0], b[1] - a[1]];
    const l = Math.hypot(dx, dy) || 1;
    return Array.from({ length: 4 }, (_, m): Point => {
      const n = (hasard(i, j, 10 + c * 4 + m, GRAINE) - 0.5) * (m === 0 ? 0.16 : 0.12);
      return [a[0] + (dx * m) / 4 - (dy / l) * n, a[1] + (dy * m) / 4 + (dx / l) * n];
    });
  });
}

/**
 * The fields round the island `vu` tells, and beside its mill, barn and farm. A block of the
 * lattice becomes a field when none of its cells is shown, the island is within `CONTACT` cells of
 * it, no road leaves through it, and a hash of the block says so (about two in three). Furrows run
 * along one side or the other by the hash, in two tones. A hedge runs along one side, sometimes two.
 */
// biome-ignore lint/complexity/noExcessiveCognitiveComplexity: one lattice walk, each block a short list of steps
export function champsDe(
  vu: (gx: number, gy: number) => boolean,
  /** The ground is painted: the plan's fields (`tuilesChamps`) and the blocks off the island (`tuilesBlocs`) are tiles, nothing is drawn here but the blocks' list. */
  planPeint = false,
): Champs {
  const teintes = ["", "", ""];
  let sillons = "";
  let sillonsClairs = "";
  let nombre = 0;
  const blocs: [number, number, number, number][] = [];
  const hedges: Point[][] = [];
  /** Lays one field on the rectangle `r` (grid units); `i` and `j` seed its hashes. */
  // biome-ignore lint/complexity/noExcessiveCognitiveComplexity: one field, three short steps (tint, furrows, hedge)
  const poser = (i: number, j: number, r: Rect4, tinte: number) => {
    const [x0, y0, x1, y1] = r;
    teintes[tinte] += cheminRuban([contour(i, j, r)]);
    const le = hasard(i, j, 3, GRAINE) < 0.5;
    const [a, b] = le ? [x0, x1] : [y0, y1];
    const [c, d] = le ? [y0, y1] : [x0, x1];
    let k = 0;
    for (let t = c + SILLON * 1.2; t < d - SILLON; t += SILLON, k++) {
      const [px, py] = ecranXY(le ? [a + 0.12, t] : [t, a + 0.12]);
      const [qx, qy] = ecranXY(le ? [b - 0.12, t] : [t, b - 0.12]);
      const seg = `M${px.toFixed(1)},${py.toFixed(1)}L${qx.toFixed(1)},${qy.toFixed(1)}`;
      if (k % 2 === 0) sillons += seg;
      else sillonsClairs += seg;
    }
    // One side carries the hedge, a second one in about two fields in five.
    const cote = Math.floor(hasard(i, j, 20, GRAINE) * 4);
    const coins = quad(x0, y0, x1, y1);
    for (const sel of [cote, hasard(i, j, 21, GRAINE) < 0.4 ? (cote + 2) % 4 : -1]) {
      const p = coins[sel];
      const q = coins[(sel + 1) % 4];
      if (!p || !q) continue;
      const m = Math.max(3, Math.round(Math.hypot(q[0] - p[0], q[1] - p[1]) * 2));
      const ligne = Array.from({ length: m + 1 }, (_, s): Point => {
        const t = s / m;
        return [p[0] + (q[0] - p[0]) * t, p[1] + (q[1] - p[1]) * t];
      });
      // The hedge swells and thins from knot to knot, like a clipped bush, and starts and ends narrow.
      const demi = ligne.map(
        (_, s) =>
          (0.05 + 0.045 * hasard(i * 7 + s, j * 5 + sel, 30, GRAINE)) *
          Math.sin((Math.PI * (s + 0.5)) / (m + 1)) ** 0.5,
      );
      hedges.push(ruban(ligne, demi));
    }
  };
  for (let j = -4; j < 12; j++)
    for (let i = -4; i < 11; i++) {
      const [gx0, gy0] = [i * PAS_X, j * PAS_Y];
      if (hasard(i, j, 1, GRAINE) < 0.32) continue;
      const r: Rect4 = [gx0 + RUELLE, gy0 + RUELLE, gx0 + PAS_X - RUELLE, gy0 + PAS_Y - RUELLE];
      if (!quad(...r).every(dansCarte)) continue;
      if (surRoute(...r)) continue;
      // The painted ground carries the south corner's plots: no lattice block on them.
      if (planPeint && surParcelle(gx0, gy0, gx0 + PAS_X, gy0 + PAS_Y)) continue;
      let proche = false;
      let libre = true;
      for (let x = gx0; x < gx0 + PAS_X && libre; x++)
        for (let y = gy0; y < gy0 + PAS_Y; y++) {
          if (vu(x, y)) {
            libre = false;
            break;
          }
          if (anneau(vu, x, y) > 0) proche = true;
        }
      if (!libre || !proche) continue;
      // Over the painted ground the block is paved with painted tiles instead (`tuilesBlocs`).
      if (!planPeint) poser(i, j, r, Math.floor(hasard(i, j, 2, GRAINE) * 3));
      nombre++;
      blocs.push([gx0, gy0, PAS_X, PAS_Y]);
    }
  // The plan's fields, once all their cells show: wheat (the ochre tint) in most.
  for (const { coin, bloc } of planPeint ? [] : COLLEES) {
    const [fx, fy, fw, fh] = bloc;
    const [bx, by] = coin;
    if (!cellules(...bloc).every(([gx, gy]) => vu(gx, gy))) continue;
    const m = 0.09;
    const tinte = hasard(bx, by, 6, GRAINE) < 0.7 ? 2 : 1;
    poser(100 + bx, 100 + by, [fx + m, fy + m, fx + fw - m, fy + fh - m], tinte);
  }
  return {
    teintes: teintes as [string, string, string],
    sillons,
    sillonsClairs,
    haies: cheminRuban(hedges),
    nombre,
    blocs,
  };
}

// --- Painted fields (F4) -------------------------------------------------------------------------

/** The painted crops (scripts/iso/rempart_champs.py), in the order the plan's fields take them. */
const CULTURES = ["ble", "legumes", "labour"] as const;
export type Culture = (typeof CULTURES)[number];

/** A field tile's canvas (512 x 384 px at S, 8 px a dp), dp, and its anchor on the cell's bottom corner. */
const TOILE_CHAMP = { w: 64, h: 48, ancre: [32, 41] } as const;

export type TuileChamp = {
  case: Case;
  culture: Culture;
  /** The field's back row (its smallest gy): the tile with the hedge on its back edge. */
  haie: boolean;
  /** Where it lies on the map, dp. */
  rect: Rect;
};

/**
 * The plan's fields, each paved with painted tiles once all its cells show (as the drawn ones: the
 * island never shrinks, so a field never goes). One crop a field, the plan's order through
 * CULTURES, so two fields side by side ([0, 16] and [3, 17]) never share it; the hedge on the
 * back row only. Back to front.
 */
export function tuilesChamps(vu: (gx: number, gy: number) => boolean): TuileChamp[] {
  return champsDuPlan
    .flatMap(({ coin: [fx, fy], taille: [fw, fh] }, i) => {
      const cases = cellules(fx, fy, fw, fh);
      if (!cases.every(([gx, gy]) => vu(gx, gy))) return [];
      return paver(cases, fy, CULTURES[i % CULTURES.length] ?? "ble");
    })
    .sort(dos);
}

const dos = (a: TuileChamp, b: TuileChamp) => a.case[0] + a.case[1] - (b.case[0] + b.case[1]);

/** Cells paved with one crop, the hedge on the back row `fy`. */
function paver(cases: readonly (readonly [number, number])[], fy: number, culture: Culture) {
  const { w, h, ancre } = TOILE_CHAMP;
  return cases.map(([gx, gy]): TuileChamp => {
    const [x, y] = ecranXY([gx + 1, gy + 1]);
    return {
      case: [gx, gy],
      culture,
      haie: gy === fy,
      rect: { x: x - ancre[0], y: y - ancre[1], w, h },
    };
  });
}

/**
 * The blocks off the island (`champsDe(...).blocs`), paved with the same painted tiles (H4-04):
 * one crop a block, drawn by the hash of its corner, the hedge on its back row. Back to front.
 */
export function tuilesBlocs(
  blocs: readonly (readonly [gx: number, gy: number, w: number, h: number])[],
  /** Whether the ground is painted: without it, no tile (the blocks are drawn by `champsDe`). */
  peint = true,
): TuileChamp[] {
  return (peint ? blocs : [])
    .flatMap(([gx, gy, w, h]) =>
      paver(
        cellules(gx, gy, w, h),
        gy,
        CULTURES[Math.floor(hasard(gx, gy, 4, GRAINE) * 3)] ?? "ble",
      ),
    )
    .sort(dos);
}
