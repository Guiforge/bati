// The village's vocation made visible (G1, G3): the hero's dominant practice (`vocationDeBlason`,
// read from the crest's animal) lays its grounds round the campfire square, sets two of its things
// on the square and raises two great banners with its emblem at the front of the hall of heroes.
// A runner gets a beaten-earth track with its start arch and milestones; a calisthenics hero a sand
// yard with a pull-up frame, rings and parallel bars; strength a yard of plates, a loaded rack and
// stones; yoga a raked circle with mats and a stone lantern; riding a paddock with hitching posts
// and a trough. Pure and fixed: the same vocation, the same drawing. A vocation that changes swaps
// the set for another of the same size, so nothing goes away. EnsembleVocation.tsx draws.

import { rawColors } from "@/constants/rawColors";
import {
  ANIMAL_OF,
  type Animal,
  PRACTICES,
  type Practice,
  practiceOfAnimal,
} from "@/db/crestRules";
import { COTE, ecranXY, type Rect } from "./carteDemo";
import { type Case, emplacements } from "./isoLayout";
import type { Point } from "./ombres";
import type { Emprise } from "./profondeur";

/**
 * The village's vocation: the hero's dominant practice, read from the crest's animal (the one the
 * statue carries, which db/crest.ts computes from the journal). One source: the trade favoured on
 * the square (habitants.ts `metierFavori`) reads the same animal. Null for the boar. Here and not
 * in db/village.ts, which opens the database on import.
 */
export const vocationDeBlason = (animal: Animal | undefined): Practice | null =>
  (animal && practiceOfAnimal(animal)) || null;

/** A drawing's fills by material, and the ink line round all of them. */
export type Formes = Record<"terre" | "bois" | "pierre" | "sombre" | "tissu" | "clair", string>;
export type Matiere = keyof Formes;
export const MATIERES: readonly Matiere[] = ["terre", "bois", "pierre", "sombre", "tissu", "clair"];

const r1 = (n: number) => Math.round(n * 10) / 10;
const poly = (pts: readonly Point[]) =>
  `${pts.map(([x, y], i) => `${i ? "L" : "M"}${r1(x)},${r1(y)}`).join("")}Z`;
const ovale = ([cx, cy]: Point, rx: number, ry: number, n = 14): string =>
  poly(
    Array.from({ length: n }, (_, k): Point => {
      const a = (2 * Math.PI * k) / n;
      return [cx + rx * Math.cos(a), cy + ry * Math.sin(a)];
    }),
  );
/** A ring: two ovals, to fill with evenodd. */
const anneau = (c: Point, rx: number, ry: number, e: number) =>
  ovale(c, rx, ry) + ovale(c, rx - e, ry - e);
/** An upright from its foot `[x, y]`, `h` dp tall and `2w` wide. */
const poteau = ([x, y]: Point, h: number, w = 1.6) =>
  poly([
    [x - w, y],
    [x + w, y],
    [x + w, y - h],
    [x - w, y - h],
  ]);
/** A bar from `a` to `b`, `e` dp thick. */
const barre = (a: Point, b: Point, e: number) =>
  poly([
    [a[0], a[1] - e / 2],
    [b[0], b[1] - e / 2],
    [b[0], b[1] + e / 2],
    [a[0], a[1] + e / 2],
  ]);
/** Half a cell along gx and along gy on screen, dp. */
const GX: Point = [COTE / 4, COTE / 8];
const GY: Point = [-COTE / 4, COTE / 8];
const plus = (p: Point, v: Point, k: number): Point => [p[0] + v[0] * k, p[1] + v[1] * k];
const haut = (p: Point, h: number): Point => [p[0], p[1] - h];
const lerp = (a: Point, b: Point, t: number): Point => [
  a[0] + (b[0] - a[0]) * t,
  a[1] + (b[1] - a[1]) * t,
];
/** An iso box standing on `p`: `a` half-cells along gx, `b` along gy, `h` dp tall. Its top and its two front faces. */
function caisse(p: Point, a: number, b: number, h: number) {
  const coin = (ka: number, kb: number) => plus(plus(p, GX, ka), GY, kb);
  const [F, R, L, B] = [coin(a, b), coin(a, -b), coin(-a, b), coin(-a, -b)];
  return {
    dessus: poly([haut(B, h), haut(R, h), haut(F, h), haut(L, h)]),
    faces: poly([haut(L, h), haut(F, h), F, L]) + poly([haut(F, h), haut(R, h), R, F]),
  };
}
/** A pennant hanging from `[x, y]`, `l` dp long. */
const fanion = ([x, y]: Point, l: number) =>
  poly([
    [x - 3.4, y],
    [x + 3.4, y + 1.7],
    [x + 0.4, y + l],
  ]);
/** A pennant flying to the right from a mast at `[x, y]`. */
const flamme = ([x, y]: Point, l: number, e: number) =>
  poly([
    [x, y - e / 2],
    [x + l, y + 1.5],
    [x + l * 0.8, y + 2.5],
    [x, y + e / 2],
  ]);

type Dessin = Partial<Formes>;
const joindre = (...ds: Dessin[]): Dessin => {
  const s: Dessin = {};
  for (const d of ds) for (const m of MATIERES) if (d[m]) s[m] = (s[m] ?? "") + d[m];
  return s;
};
const boite = (c: ReturnType<typeof caisse>, m: Matiere, dessus: Matiere = m): Dessin =>
  joindre({ [m]: c.faces }, { [dessus]: c.dessus });

/** The two things of each practice on the square, drawn round their foot at (0, 0), dp. */
const CHOSES: Readonly<Record<Practice, readonly [Dessin, Dessin]>> = {
  run: [
    // The start arch across the track: two posts on stone bases, a beam, a line of pennants.
    (() => {
      const [g, d] = [plus([0, 0], GX, -1.8), plus([0, 0], GX, 1.8)];
      const H = 56;
      const fanions = [0.14, 0.28, 0.42, 0.56, 0.7, 0.84].map((t) =>
        fanion(lerp(haut(g, H - 2), haut(d, H - 2), t), 11),
      );
      return joindre(
        { bois: poteau(g, H, 2.4) + poteau(d, H, 2.4) + barre(haut(g, H), haut(d, H), 4) },
        boite(caisse(g, 0.45, 0.45, 5), "pierre"),
        boite(caisse(d, 0.45, 0.45, 5), "pierre"),
        { tissu: fanions.join("") },
      );
    })(),
    // A milestone and a tall mast flying three long pennants.
    joindre(
      {
        pierre:
          poly([
            [-18, 4],
            [-5, 6],
            [-5, -14],
            [-18, -16],
          ]) + ovale([-11.5, -15], 6.5, 3),
      },
      { clair: barre([-15, -6], [-8, -5], 2) },
      { bois: poteau([8, 0], 66, 1.8) },
      { tissu: flamme([9.8, -64], 26, 7) + flamme([9.8, -54], 23, 6) + flamme([9.8, -44], 20, 6) },
      { clair: ovale([8, -67], 2.6, 2.6, 8) },
      boite(caisse([8, 0], 0.4, 0.4, 3), "pierre"),
    ),
  ],
  calisthenics: [
    // The pull-up frame: three posts, a high bar and a low one, a pair of rings on ropes.
    (() => {
      const [a, b, c] = [plus([0, 0], GX, -2.2), [0, 0] as Point, plus([0, 0], GX, 2.2)];
      const anneaux = [0.33, 0.67].map((t) => {
        const p = lerp(haut(a, 60), haut(b, 60), t);
        return {
          corde: poteau([p[0], p[1] + 22], 22, 0.5),
          rond: anneau([p[0], p[1] + 26], 4, 4.6, 1.8),
        };
      });
      return joindre(
        { bois: poteau(a, 62, 2.4) + poteau(b, 62, 2.4) + poteau(c, 46, 2.4) },
        { sombre: barre(haut(a, 60), haut(b, 60), 2.6) + barre(haut(b, 44), haut(c, 44), 2.6) },
        { sombre: anneaux.map((x) => x.corde).join("") },
        { tissu: anneaux.map((x) => x.rond).join("") },
      );
    })(),
    // The parallel bars and a jump box.
    (() => {
      const rail = (o: Point) => {
        const [g, d] = [plus(o, GX, -1.5), plus(o, GX, 1.5)];
        return {
          bois: poteau(g, 24, 2) + poteau(d, 24, 2),
          sombre: barre(haut(plus(g, GX, -0.2), 24), haut(plus(d, GX, 0.2), 24), 2.4),
        };
      };
      return joindre(
        rail(plus([-6, -6], GY, -0.6)),
        rail(plus([-6, -6], GY, 0.6)),
        boite(caisse([26, 0], 0.7, 0.7, 13), "bois", "terre"),
      );
    })(),
  ],
  strength: [
    // A rack: two uprights, a loaded bar across them, plates stacked at its foot.
    (() => {
      const [g, d] = [plus([0, 0], GX, -1.2), plus([0, 0], GX, 1.2)];
      const [bg, bd] = [haut(plus([0, 0], GX, -2.4), 36), haut(plus([0, 0], GX, 2.4), 36)];
      return joindre(
        { bois: poteau(g, 48, 2.6) + poteau(d, 48, 2.6) + barre(haut(g, 48), haut(d, 48), 3) },
        { sombre: barre(plus(bg, GX, -0.3), plus(bd, GX, 0.3), 2.2) },
        { sombre: ovale(bg, 4, 12) + ovale(bd, 4, 12) },
        { pierre: ovale(bg, 1.6, 3.6, 8) + ovale(bd, 1.6, 3.6, 8) },
        { sombre: [8, 5, 2].map((y) => ovale([-30, y], 9, 4)).join("") },
      );
    })(),
    // A loaded bar on the ground and three lifting stones.
    (() => {
      const [g, d] = [haut(plus([0, 0], GX, -2), 10), haut(plus([0, 0], GX, 2), 10)];
      return joindre(
        { sombre: barre(plus(g, GX, -0.4), plus(d, GX, 0.4), 2.2) },
        { sombre: ovale(g, 3.6, 10) + ovale(d, 3.6, 10) },
        { pierre: ovale(g, 1.4, 3, 8) + ovale(d, 1.4, 3, 8) },
        { pierre: ovale([-32, 4], 8, 7) + ovale([-24, 12], 6, 5) + ovale([32, -6], 9, 8) },
      );
    })(),
  ],
  yoga: [
    // Two mats side by side and a stone lantern.
    (() => {
      const tapis = (p: Point) => ({
        tissu: poly([plus(p, GX, -1.5), plus(p, GY, -0.8), plus(p, GX, 1.5), plus(p, GY, 0.8)]),
        clair: poly([plus(p, GX, -1), plus(p, GY, -0.5), plus(p, GX, 1), plus(p, GY, 0.5)]),
      });
      return joindre(
        tapis(plus([0, 0], GY, -0.9)),
        tapis(plus([0, 0], GY, 0.9)),
        boite(caisse([30, -2], 0.35, 0.35, 16), "pierre"),
        {
          clair: poly([
            [28, -12],
            [32, -11],
            [32, -7],
            [28, -8],
          ]),
        },
        boite(caisse([30, -18], 0.6, 0.6, 3), "sombre"),
      );
    })(),
    // A mat, a rolled one standing, and a stick of incense.
    joindre(
      {
        tissu:
          poly([
            plus([0, 4], GX, -1.5),
            plus([0, 4], GY, -0.8),
            plus([0, 4], GX, 1.5),
            plus([0, 4], GY, 0.8),
          ]) + poteau([-28, 0], 18, 3.4),
      },
      { clair: ovale([-28, -18], 3.4, 1.6, 8) + ovale([20, -24], 2.4, 3.6, 8) },
      { bois: poteau([20, 0], 20, 0.7) },
      boite(caisse([20, 0], 0.3, 0.3, 3), "pierre"),
    ),
  ],
  ride: [
    // The hitching post: two posts, a rail, a rope ring.
    (() => {
      const [g, d] = [plus([0, 0], GX, -1.7), plus([0, 0], GX, 1.7)];
      return joindre(
        { bois: poteau(g, 30, 2.4) + poteau(d, 30, 2.4) + barre(haut(g, 26), haut(d, 26), 3.4) },
        { tissu: anneau(haut([0, 0], 18), 4.4, 5, 1.8) },
      );
    })(),
    // A trough of water and a bale of hay.
    joindre(
      boite(caisse([-6, 0], 2.2, 0.8, 11), "bois"),
      { sombre: caisse([-6, 0], 1.9, 0.55, 9.5).dessus },
      boite(caisse([28, 2], 0.8, 0.6, 9), "terre"),
    ),
  ],
};

/** The things' box round their foot, dp: one size for all, so one Svg size. */
export const BOITE_CHOSE = { gauche: 46, droite: 46, haut: 82, bas: 20 } as const;

/** The square's middle (the campfire's), grid: the grounds are drawn round it. */
const CENTRE: Point = [emplacements.campfire.coin[0] + 0.5, emplacements.campfire.coin[1] + 0.5];

/**
 * The cells the two things stand on: on the square's paving, on either side of the fire (the dead
 * end by the archery range, and the corner by the fountain), so no way through the square closes.
 */
export const CASES_VOCATION: readonly [Case, Case] = [
  [13, 11],
  [11, 12],
];
/** Their footprints in the depth order. */
export const EMPRISES_VOCATION: readonly Emprise[] = CASES_VOCATION.map((c) => ({
  coin: c,
  emprise: [1, 1] as const,
}));

/** A thing of the vocation on the map: its foot (dp), its box and its drawing. */
export type ChoseVocation = { pied: Point; boite: Rect; dessin: Dessin };

/** The vocation's two things on the square. */
export function chosesDe(vocation: Practice): ChoseVocation[] {
  return CASES_VOCATION.map(([gx, gy], i) => {
    const pied = ecranXY([gx + 0.5, gy + 0.5]);
    const b = BOITE_CHOSE;
    return {
      pied,
      boite: {
        x: pied[0] - b.gauche,
        y: pied[1] - b.haut,
        w: b.gauche + b.droite,
        h: b.haut + b.bas,
      },
      dessin: CHOSES[vocation][i] ?? {},
    };
  });
}

/** The ellipse a grid circle of radius `r` round the square's middle makes on screen, dp. */
const RX = (COTE / 2) * Math.SQRT2;
const RY = RX / 2;
const ellipseSol = (r: number, n = 44) => ovale([0, 0], r * RX, r * RY, n);
/** A rounded grid square (|x|⁴ + |y|⁴ = r⁴) round the middle, on screen. */
function cour(r: number, n = 48): string {
  return poly(
    Array.from({ length: n }, (_, k): Point => {
      const a = (2 * Math.PI * k) / n;
      const [c, s] = [Math.cos(a), Math.sin(a)];
      const x = r * Math.sign(c) * Math.sqrt(Math.abs(c));
      const y = r * Math.sign(s) * Math.sqrt(Math.abs(s));
      const [sx, sy] = ecranXY([x, y]);
      const [ox, oy] = ecranXY([0, 0]);
      return [sx - ox, sy - oy];
    }),
  );
}
/** A point on the ground ellipse of radius `r` at angle `a` (0 to the right, π/2 to the front). */
const surSol = (r: number, a: number): Point => [r * RX * Math.cos(a), r * RY * Math.sin(a)];

/** The grounds of a vocation round the square, in dp relative to the square's middle. */
export type Sol = {
  /** Filled shapes by material (evenodd: a band is two ovals). */
  formes: Dessin;
  /** Chalk lines, stroked: a lane, a yard's border, raked rings. */
  traits: string;
  /** Whether the chalk lines are dashed. */
  pointille: boolean;
};

/** The milestones or fence posts round a band, small uprights drawn with the ground. */
const bornes = (r: number, n: number, h: number, sauf: (a: number) => boolean, m: Matiere) => ({
  [m]: Array.from({ length: n }, (_, k) => (2 * Math.PI * k) / n)
    .filter((a) => !sauf(a))
    .map((a) => poteau(surSol(r, a), h, 1.6))
    .join(""),
});
const pres = (a: number, b: number, d: number) =>
  Math.abs(Math.atan2(Math.sin(a - b), Math.cos(a - b))) < d;

const SOLS: Readonly<Record<Practice, Sol>> = {
  run: {
    formes: joindre(
      { terre: ellipseSol(2.05) + ellipseSol(1.45) },
      // The start line across the track, in front.
      {
        clair: poly([
          surSol(1.45, Math.PI / 2 - 0.05),
          surSol(2.05, Math.PI / 2 - 0.05),
          surSol(2.05, Math.PI / 2 + 0.05),
          surSol(1.45, Math.PI / 2 + 0.05),
        ]),
      },
      bornes(2.12, 10, 7, (a) => pres(a, Math.PI / 2, 0.4), "pierre"),
    ),
    traits: ellipseSol(1.75),
    pointille: true,
  },
  calisthenics: {
    formes: { terre: cour(1.9) },
    traits: cour(1.65),
    pointille: false,
  },
  strength: {
    formes: joindre(
      { terre: cour(1.9) },
      ...CASES_VOCATION.map(([gx, gy]) => {
        const [x, y] = ecranXY([gx + 0.5 - CENTRE[0], gy + 0.5 - CENTRE[1]]);
        const [ox, oy] = ecranXY([0, 0]);
        return boite(caisse([x - ox, y - oy], 1, 1, 2), "bois");
      }),
    ),
    traits: cour(1.65),
    pointille: false,
  },
  yoga: {
    formes: joindre(
      { terre: ellipseSol(1.95) },
      { pierre: [0.3, 2.4, 4].map((a) => ovale(surSol(1.7, a), 4, 2.2, 8)).join("") },
    ),
    traits: ellipseSol(1.55) + ellipseSol(1.25),
    pointille: false,
  },
  ride: {
    formes: joindre(
      { terre: ellipseSol(2.1) + ellipseSol(1.5) },
      bornes(2.16, 16, 9, (a) => pres(a, Math.PI / 2, 0.25), "bois"),
    ),
    traits: "",
    pointille: false,
  },
};

/** The grounds' box round the square's middle, dp, and the middle on the map. */
export const BOITE_SOL = { l: 2.3 * RX, h: 2.3 * RY + 12 } as const;
export const centreSol = (): Point => ecranXY(CENTRE);
export const solDe = (vocation: Practice): Sol => SOLS[vocation];

/**
 * The two great banners at the front of the hall of heroes: their poles' feet on the hall's two
 * front edges, either side of its door (grid), so they are drawn right after the hall.
 */
export const HAMPES: readonly [Point, Point] = (() => {
  const [x, y] = emplacements.heroes_hall.coin;
  const [w, h] = emplacements.heroes_hall.emprise;
  return [
    [x + w - 0.05, y + h - 1.2],
    [x + w - 1.2, y + h - 0.05],
  ];
})();
/** A banner's pole height and its cloth's box (viewBox 0 0 30 52), dp. */
export const HAMPE_H = 96;
export const ETENDARD = { w: 30, h: 52 } as const;

/** A spoke of a wheel centred on `c`, from radius `r0` to `r1`, at angle `a`, `e` dp wide. */
const rayon = (c: Point, a: number, r0: number, r1: number, e: number) => {
  const [u, v] = [Math.cos(a), Math.sin(a)];
  const p = (r: number, k: number): Point => [c[0] + u * r - v * k, c[1] + v * r + u * k];
  return poly([p(r0, -e / 2), p(r1, -e / 2), p(r1, e / 2), p(r0, e / 2)]);
};

/**
 * The emblem of each practice on its banner, a stitched crest in the cloth's 30 x 52 box, inside the
 * roundel centred on (15, 22) (radius 11): drawn to be filled ochre with evenodd, no two alike.
 */
export const EMBLEMES: Readonly<Record<Practice, string>> = {
  // A winged boot: sole, shaft, and three feathers behind the heel.
  run:
    poly([
      [11, 29],
      [11, 25],
      [15, 24],
      [16, 16],
      [21, 16],
      [21.5, 23],
      [26, 26],
      [26, 29],
    ]) +
    poly([
      [9.5, 21],
      [3.5, 12],
      [7, 12.5],
      [12, 19],
    ]) +
    poly([
      [9, 24],
      [2.5, 17],
      [6, 16.5],
      [10.5, 21.5],
    ]) +
    poly([
      [9, 26.5],
      [3, 23],
      [6, 21.5],
      [10, 24.5],
    ]),
  // A bar above a pair of rings.
  calisthenics:
    barre([5, 12.5], [25, 12.5], 2.4) +
    poteau([10, 18], 5, 0.5) +
    poteau([20, 18], 5, 0.5) +
    anneau([10, 23], 5, 5.4, 2) +
    anneau([20, 23], 5, 5.4, 2),
  // A barbell: the bar, two plates each side.
  strength:
    barre([3.5, 22], [26.5, 22], 2) +
    poly([
      [5, 14],
      [8, 14],
      [8, 30],
      [5, 30],
    ]) +
    poly([
      [22, 14],
      [25, 14],
      [25, 30],
      [22, 30],
    ]) +
    poly([
      [9.5, 16.5],
      [11.5, 16.5],
      [11.5, 27.5],
      [9.5, 27.5],
    ]) +
    poly([
      [18.5, 16.5],
      [20.5, 16.5],
      [20.5, 27.5],
      [18.5, 27.5],
    ]),
  // A lotus: a tall centre petal, two leaning ones, a low line of water.
  yoga:
    poly([
      [15, 11],
      [19.5, 20],
      [15, 27.5],
      [10.5, 20],
    ]) +
    poly([
      [7, 16.5],
      [13, 25.5],
      [6, 27],
      [3.5, 21],
    ]) +
    poly([
      [23, 16.5],
      [26.5, 21],
      [24, 27],
      [17, 25.5],
    ]) +
    barre([6, 30], [24, 30], 1.6),
  // A spoked wheel: rim, hub, eight spokes.
  ride:
    anneau([15, 22], 10, 10, 1.8) +
    anneau([15, 22], 2.4, 2.4, 1) +
    Array.from({ length: 8 }, (_, k) => rayon([15, 22], (Math.PI * k) / 4, 2.4, 8.4, 1)).join(""),
};

/** The colour of the vocation's cloth: its pennants, its rings, its banners and the district's. */
export const COULEUR_VOCATION: Readonly<Record<Practice, string>> = {
  strength: rawColors.isoQuartierArtisans,
  calisthenics: rawColors.isoQuartierEntrainement,
  run: rawColors.isoFanion,
  yoga: rawColors.isoQuartierCalme,
  ride: rawColors.isoChampOcre,
};

/** The fills by material, by day and by night (the grounds lie under the night's veil, the things do not). */
export function teintes(vocation: Practice, nuit: boolean): Formes {
  return {
    terre: nuit ? rawColors.isoVocationTerreNuit : rawColors.isoVocationTerre,
    bois: nuit ? rawColors.isoTronc : rawColors.isoVocationBois,
    pierre: nuit ? rawColors.isoPierreChaudeSombre : rawColors.isoPierreChaudeClair,
    sombre: nuit ? rawColors.isoPaveSombreNuit : rawColors.isoPierreChaudeSombre,
    tissu: COULEUR_VOCATION[vocation],
    clair: nuit ? rawColors.isoPaveClairNuit : rawColors.isoJourLavis,
  };
}

/**
 * Dev only (dev-iso `?vocation=`): the vocation a link forces, by its English or French name, as
 * the animal the crest would carry (the one source of the vocation).
 */
const NOMS: Readonly<Record<string, Practice>> = {
  strength: "strength",
  force: "strength",
  calisthenics: "calisthenics",
  callisthenie: "calisthenics",
  yoga: "yoga",
  run: "run",
  course: "run",
  ride: "ride",
  velo: "ride",
};
export function animalDeVocation(nom: string | undefined): Animal | undefined {
  const p = nom ? NOMS[nom] : undefined;
  return p && PRACTICES.includes(p) ? ANIMAL_OF[p] : undefined;
}
