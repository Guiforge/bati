// The camp's small things round the fire (B2, bible §7 and §8): seat logs, a wood pile and crates,
// drawn in the ground tiles' Svg as flat inked shapes, so the first tier is a camp and not an empty
// square. Pure and fixed: every thing stands on cells the tier-1 island shows, so it is there from
// the first tier and stays through every later one (nothing goes backwards). No image, no motion.

import { ecranXY } from "./carteDemo";
import type { Point } from "./ombres";

/** The marks of the things: wood and cut ends, the three faces of a crate, and the ink line. */
export type Accessoires = Record<"bois" | "bout" | "haut" | "gauche" | "droite" | "encre", string>;

const r1 = (n: number) => Math.round(n * 10) / 10;
const poly = (pts: readonly Point[]) =>
  `${pts.map(([x, y], i) => `${i ? "L" : "M"}${r1(x)},${r1(y)}`).join("")}Z`;
const ovale = ([cx, cy]: Point, rx: number, ry: number, rot: number): Point[] =>
  Array.from({ length: 10 }, (_, k): Point => {
    const a = (2 * Math.PI * k) / 10;
    const [x, y] = [rx * Math.cos(a), ry * Math.sin(a)];
    return [cx + x * Math.cos(rot) - y * Math.sin(rot), cy + x * Math.sin(rot) + y * Math.cos(rot)];
  });

/** A log lying from grid point `p` along (`dx`, `dy`), `levee` dp above the ground: its body and its cut end. */
function rondin(p: Point, [dx, dy]: Point, long: number, rayon: number, levee: number) {
  const [x0, y0] = ecranXY(p);
  const [x1, y1] = ecranXY([p[0] + dx * long, p[1] + dy * long]);
  const [ax, ay] = [x0, y0 - levee];
  const [bx, by] = [x1, y1 - levee];
  const n = Math.hypot(bx - ax, by - ay) || 1;
  const [nx, ny] = [(-(by - ay) / n) * rayon, ((bx - ax) / n) * rayon];
  const rot = Math.atan2(by - ay, bx - ax);
  const corps = poly([
    [ax + nx, ay + ny],
    [bx + nx, by + ny],
    [bx - nx, by - ny],
    [ax - nx, ay - ny],
  ]);
  // The end facing the viewer is the one lower on screen.
  const [ex, ey] = by >= ay ? [bx, by] : [ax, ay];
  return { corps, bout: poly(ovale([ex, ey], rayon * 0.5, rayon, rot)) };
}

/** A crate: a box `w` cells wide whose back corner sits at grid point `p`, `h` dp tall, `levee` dp off the ground. */
function caisse(p: Point, w: number, h: number, levee: number) {
  const sol = (u: number, v: number): Point => {
    const [sx, sy] = ecranXY([p[0] + u * w, p[1] + v * w]);
    return [sx, sy - levee];
  };
  const haut = (u: number, v: number): Point => {
    const [sx, sy] = sol(u, v);
    return [sx, sy - h];
  };
  return {
    haut: poly([haut(0, 0), haut(1, 0), haut(1, 1), haut(0, 1)]),
    gauche: poly([haut(0, 1), haut(1, 1), sol(1, 1), sol(0, 1)]),
    droite: poly([haut(1, 0), haut(1, 1), sol(1, 1), sol(1, 0)]),
  };
}

/** Three seat logs round the fire (the cell [12, 11] on the square; the tent stands west of it): start, direction, length in cells. */
const BUCHES: readonly [Point, Point, number][] = [
  [[12.05, 12.6], [1, 0], 0.62],
  [[13.55, 11.2], [0, 1], 0.55],
  [[12.25, 9.85], [1, 0], 0.5],
];
/** A pile of logs along gy: three below, two on them (the height in dp). */
const TAS: readonly [Point, number][] = [
  [[14.45, 9.7], 0],
  [[14.62, 9.7], 0],
  [[14.79, 9.7], 0],
  [[14.53, 9.7], 4.2],
  [[14.7, 9.7], 4.2],
];
/** Crates south-west of the fire, two on the ground and one on them: back corner, width in cells, height and lift in dp. */
const CAISSES: readonly [Point, number, number, number][] = [
  [[10.05, 12.2], 0.36, 7, 0],
  [[10.62, 12.5], 0.3, 6, 0],
  [[10.12, 12.28], 0.26, 5.5, 7],
];

/** The camp's things that touch the screen box `r` (dp), a small margin round it; empty paths when none. */
export function accessoiresDans(r: { x: number; y: number; w: number; h: number }): Accessoires {
  const dedans = ([gx, gy]: Point) => {
    const [x, y] = ecranXY([gx, gy]);
    return x > r.x - 16 && x < r.x + r.w + 16 && y > r.y - 16 && y < r.y + r.h + 16;
  };
  const a: Accessoires = { bois: "", bout: "", haut: "", gauche: "", droite: "", encre: "" };
  const buche = (p: Point, dir: Point, long: number, rayon: number, levee: number) => {
    const { corps, bout } = rondin(p, dir, long, rayon, levee);
    a.bois += corps;
    a.bout += bout;
    a.encre += corps + bout;
  };
  for (const [p, dir, long] of BUCHES) if (dedans(p)) buche(p, dir, long, 4.4, 0);
  for (const [p, levee] of TAS) if (dedans(p)) buche(p, [0, 1], 0.5, 3.1, levee);
  for (const [p, w, h, levee] of CAISSES)
    if (dedans(p)) {
      const c = caisse(p, w, h, levee);
      a.haut += c.haut;
      a.gauche += c.gauche;
      a.droite += c.droite;
      a.encre += c.haut + c.gauche + c.droite;
    }
  return a;
}
