// The ground a building can darken, in grid coordinates, from blender's exports
// (scripts/iso/exports/heights.json, L0-T05): the hull of every stage's shadow, the windmill's
// swept sail shadow, and the sails' own box seen from above (they overhang the footprint).
// `zoneOmbre` is the layout test's (spacing rule); the screen draws each stage's own exported
// shadow (maquettes.ts, carteDemo.ts `ombresDe`). The functions below recompute a shadow from the
// exported volumes under any light (§7), and the sails' at any angle.
//
// shortcut: the zones read heights.json (L0-T05), whose stages without a blockout are estimates;
// heights.py replaces each estimate as blender delivers the stage, nothing to change here.

import spec from "@/constants/isoSpec.json";
import type { BuildingCode } from "@/db/schema";
import heightsRaw from "@/scripts/iso/exports/heights.json";
import { DONNEES_BLD } from "./donneesBld";
import { emplacements } from "./isoLayout";
import type { PointGrille, Volume } from "./isoSpec";

export type Point = readonly [number, number];

type Mobile = { nom: string; boite: number[][]; ombrePortee: boolean; ombre?: number[][] };
type StadeHauteurs = { ombre: { polygone: number[][] }; mobile?: Mobile[] };
type Hauteurs = { emprise: number[]; stades: Record<string, StadeHauteurs> };

export const hauteurs: Record<string, Hauteurs> = heightsRaw.batiments;

function point(p: readonly number[] | undefined, ou: string): Point {
  const [x, y] = p ?? [];
  if (x === undefined || y === undefined) throw new Error(`heights.json ${ou}: bad point`);
  return [x, y];
}

/** Convex hull, counter-clockwise in grid coordinates (monotone chain). */
export function enveloppe(points: readonly Point[]): Point[] {
  const pts = [...new Map(points.map((p) => [`${p[0]},${p[1]}`, p])).values()].sort(
    (a, b) => a[0] - b[0] || a[1] - b[1],
  );
  const cross = (o: Point, a: Point, b: Point) =>
    (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]);
  const chaine = (liste: Point[]) => {
    const h: Point[] = [];
    for (const p of liste) {
      for (
        let a = h.at(-2), b = h.at(-1);
        a && b && cross(a, b, p) <= 0;
        a = h.at(-2), b = h.at(-1)
      )
        h.pop();
      h.push(p);
    }
    return h.slice(0, -1);
  };
  return [...chaine(pts), ...chaine([...pts].reverse())];
}

export function zoneOmbre(code: BuildingCode, data = DONNEES_BLD[code]): Point[] {
  // New art: the contact measured on the painting wins; old art falls through to heights.json.
  if (data?.mesure) {
    const [gx, gy] = emplacements[code].coin;
    return enveloppe(data.mesure.contact.map(([x, y]): Point => [gx + x, gy + y]));
  }
  const h = hauteurs[code];
  if (!h) throw new Error(`heights.json: no ${code}`);
  const pts: Point[] = [];
  for (const [nom, stade] of Object.entries(h.stades)) {
    const ou = `${code}.${nom}`;
    pts.push(...stade.ombre.polygone.map((p) => point(p, ou)));
    for (const m of stade.mobile ?? []) {
      // A shadow-casting part without its polygon is caught by __tests__/iso-layout.test.ts.
      pts.push(...(m.ombrePortee ? (m.ombre ?? []) : []).map((p) => point(p, ou)));
      if (m.nom !== "ailes") continue;
      const [x0, y0] = point(m.boite[0], ou);
      const [x1, y1] = point(m.boite[1], ou);
      pts.push([x0, y0], [x1, y0], [x1, y1], [x0, y1]);
    }
  }
  const [gx, gy] = emplacements[code].coin;
  return enveloppe(pts.map(([x, y]): Point => [gx + x, gy + y]));
}

/** Toward the light, in Blender coordinates (y = -gy), as isoSpec.json `moon.L`. */
export type Lumiere = readonly [x: number, y: number, z: number];

export const LUNE: Lumiere = [spec.moon.L[0] ?? 0, spec.moon.L[1] ?? 0, spec.moon.L[2] ?? 1];

export function lumiere(azimuthDeg: number, elevationDeg: number): Lumiere {
  const a = (azimuthDeg * Math.PI) / 180;
  const e = (elevationDeg * Math.PI) / 180;
  return [Math.cos(e) * Math.cos(a), Math.cos(e) * Math.sin(a), Math.sin(e)];
}

/** Where a point's shadow meets the ground (L in Blender coordinates, hence the + on gy). */
const auSol = ([gx, gy, z]: PointGrille, [lx, ly, lz]: Lumiere): Point => [
  gx - (z * lx) / lz,
  gy + (z * ly) / lz,
];

/**
 * The ground shadow of a stage under any light, from its exported volumes (§7, no Blender): one
 * hull per part that casts one, in the order of the export's `ombre`.
 */
export function ombreVolumes(volumes: readonly Volume[], l: Lumiere): Point[][] {
  return volumes
    .filter((v) => !v.emissive && !v.noShadow)
    .map((v) => enveloppe(v.vertices.map((p) => auSol(p, l))));
}

/** Toward the camera, in Blender coordinates: isoSpec.json cameraRotationDeg [60, 0, 45] looks down at 30 degrees from the +gx +gy side. */
export const CAMERA: Lumiere = lumiere(
  -(spec.cameraRotationDeg[2] ?? 0),
  90 - (spec.cameraRotationDeg[0] ?? 0),
);

// ---- The building's own shadow on its socle's top (L3-T01) ----------------------------------

const cote = (a: Point, b: Point, p: Point) =>
  (b[0] - a[0]) * (p[1] - a[1]) - (b[1] - a[1]) * (p[0] - a[0]);

/** Signed area, positive for a counter-clockwise polygon. */
export const aire = (poly: readonly Point[]): number =>
  poly.reduce((s, a, i) => {
    const b = poly[(i + 1) % poly.length] ?? a;
    return s + a[0] * b[1] - a[1] * b[0];
  }, 0) / 2;

/** The part of a convex polygon left of the line a to b (or right of it with `droite`), Sutherland-Hodgman. */
function demiPlan(poly: readonly Point[], a: Point, b: Point, droite = false): Point[] {
  const s = droite ? -1 : 1;
  const sortie: Point[] = [];
  poly.forEach((p, i) => {
    const q = poly[(i + 1) % poly.length] ?? p;
    const dp = s * cote(a, b, p);
    const dq = s * cote(a, b, q);
    if (dp >= 0) sortie.push(p);
    if ((dp > 0 && dq < 0) || (dp < 0 && dq > 0)) {
      const t = dp / (dp - dq);
      sortie.push([p[0] + t * (q[0] - p[0]), p[1] + t * (q[1] - p[1])]);
    }
  });
  return sortie;
}

/** A convex polygon minus a convex one: disjoint convex pieces (one per edge of the second that cuts it). */
export function soustraire(poly: readonly Point[], convexe: readonly Point[]): Point[][] {
  if (convexe.length < 3) return [[...poly]];
  const pieces: Point[][] = [];
  let reste: Point[] = [...poly];
  convexe.forEach((a, i) => {
    const b = convexe[(i + 1) % convexe.length] ?? a;
    pieces.push(demiPlan(reste, a, b, true));
    reste = demiPlan(reste, a, b);
  });
  return pieces.filter((p) => p.length >= 3 && aire(p) > 1e-5);
}

/**
 * A stage's shadow on the top of its socle (the painted sprites do not carry it, H1), from its
 * exported volumes: each part above the socle, projected along the light onto the plane at the
 * socle's height `hauteur`, cut to the socle `[0, w] x [0, d]`, minus what the parts hide of that
 * plane from the camera (the same projection along the view), which the sprite draws as walls.
 * Disjoint convex pieces, counter-clockwise, grid units from the footprint's back corner.
 */
export function ombreSocle(
  volumes: readonly Volume[],
  hauteur: number,
  [w, d]: readonly [number, number],
  l: Lumiere = LUNE,
): Point[][] {
  const eps = 1e-6;
  const dessus = volumes.filter((v) => v.vertices.some(([, , z]) => z > hauteur + eps));
  const plan = (v: Volume, lum: Lumiere) =>
    enveloppe(v.vertices.map(([x, y, z]): Point => auSol([x, y, Math.max(0, z - hauteur)], lum)));
  const socle: Point[] = [
    [0, 0],
    [w, 0],
    [w, d],
    [0, d],
  ];
  const toutes = dessus.map((v) => plan(v, CAMERA));
  // A hidden zone inside another adds nothing; of two equal ones the first stays.
  const dedans = (a: readonly Point[], b: readonly Point[]) =>
    a.every((p) => b.every((q, i) => cote(q, b[(i + 1) % b.length] ?? q, p) >= -1e-9));
  const cachees = toutes.filter(
    (a, i) => !toutes.some((b, j) => j !== i && dedans(a, b) && (j < i || !dedans(b, a))),
  );
  return (
    dessus
      .filter((v) => !v.emissive && !v.noShadow)
      .flatMap((v) => {
        const dans = socle.reduce(
          (poly, a, i) => demiPlan(poly, a, socle[(i + 1) % 4] ?? a),
          plan(v, l),
        );
        return cachees.reduce(
          (pieces, c) => pieces.flatMap((p) => soustraire(p, c)),
          dans.length >= 3 ? [dans] : [],
        );
      })
      // shortcut: slivers under 0.0005 cell2 (under 1 dp2 at zoom 1) are dropped to keep the index
      // small; a hole that shows at the closest zoom lowers the threshold.
      .filter((p) => aire(p) > 0.0005)
  );
}

// The sails turn in the plane facing the camera (windmill blockouts' `_doc`; camera rotation
// 60, 0, 45): screen right and screen up, in grid units, one unit each on screen.
const DROITE: PointGrille = [Math.SQRT1_2, -Math.SQRT1_2, 0];
const HAUT: PointGrille = [-Math.SQRT1_2 / 2, -Math.SQRT1_2 / 2, Math.sqrt(3) / 2];
const scalaire = (a: PointGrille, b: PointGrille) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];

/** A point of the sails turned `angleDeg` clockwise on screen about the hub, as a view `rotate` turns their image. */
export function tournerAiles(p: PointGrille, angleDeg: number): PointGrille {
  const t = (angleDeg * Math.PI) / 180;
  const a = scalaire(p, DROITE);
  const b = scalaire(p, HAUT);
  const da = a * Math.cos(t) + b * Math.sin(t) - a;
  const db = -a * Math.sin(t) + b * Math.cos(t) - b;
  return [
    p[0] + da * DROITE[0] + db * HAUT[0],
    p[1] + da * DROITE[1] + db * HAUT[1],
    p[2] + da * DROITE[2] + db * HAUT[2],
  ];
}

/** The sails' shadow at an angle: their volumes turned, scaled and moved to the stage's pivot. */
export function ombreAiles(
  volumes: readonly Volume[],
  pivot: PointGrille,
  echelle: number,
  angleDeg: number,
  l: Lumiere,
): Point[][] {
  const poser = (p: PointGrille): PointGrille => {
    const [x, y, z] = tournerAiles(p, angleDeg);
    return [pivot[0] + echelle * x, pivot[1] + echelle * y, pivot[2] + echelle * z];
  };
  return ombreVolumes(
    volumes.map((v) => ({ ...v, vertices: v.vertices.map(poser) })),
    l,
  );
}
