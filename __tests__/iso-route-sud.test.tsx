jest.mock("@/hooks/useReducedMotion", () => ({ useReducedMotion: () => false }));
jest.mock("@/db/client", () => ({ db: {}, schema: {}, runMigrations: jest.fn() }));

import { readFileSync } from "node:fs";
import { render } from "@testing-library/react-native";
import Svg from "react-native-svg";
import { AlentoursContext, alentoursDe } from "@/components/village/iso/alentours";
import { ecranXY } from "@/components/village/iso/carteDemo";
import { PARCELLES } from "@/components/village/iso/champs";
import { TAILLE } from "@/components/village/iso/isoLayout";
import { Rues } from "@/components/village/iso/RuesDessinees";
import { SORTIES } from "@/components/village/iso/rues";

// The south road's frozen tile list (loupe BC), written by scripts/iso/rues_port.py from the Python port of rues.ts.
const FIGE = JSON.parse(
  readFileSync("docs/designs/village-loop/loupes/bc/route_tuiles.json", "utf8"),
) as {
  parcelles: Record<string, number[]>;
  sorties: Record<string, { route: number[][]; voie: number[][]; noeuds_route: number[][] }>;
};

/** The cells a polyline crosses, sampled every 0.1 cell, as rues_port.py `cases` does. */
function cases(ligne: readonly (readonly [number, number])[]) {
  const seq: number[][] = [];
  ligne.forEach((a, i) => {
    const b = ligne[i + 1];
    if (!b) return;
    const n = Math.max(1, Math.trunc(Math.hypot(b[0] - a[0], b[1] - a[1]) / 0.1));
    for (let k = 0; k <= n; k++) {
      const c = [
        Math.floor(a[0] + ((b[0] - a[0]) * k) / n),
        Math.floor(a[1] + ((b[1] - a[1]) * k) / n),
      ];
      const dernier = seq[seq.length - 1];
      if (!dernier || dernier[0] !== c[0] || dernier[1] !== c[1]) seq.push(c);
    }
  });
  return seq;
}

const horsGrille = (c: number[]) =>
  [c[0], c[1]].some((v) => v === undefined || v < 0 || v >= TAILLE);

type Noeud = { type: string; props: Record<string, unknown>; children: Noeud[] | null };
const noeuds = (n: Noeud | Noeud[] | null): Noeud[] =>
  n === null ? [] : Array.isArray(n) ? n.flatMap(noeuds) : [n, ...noeuds(n.children)];
const toutes = new Set(Array.from({ length: TAILLE * TAILLE }, (_, i) => i));

async function traces(peint: boolean) {
  const r = await render(
    <AlentoursContext.Provider value={alentoursDe(peint ? "sol" : "aucune")}>
      <Svg>
        <Rues dedans={toutes} visibles={toutes} biome="defaut" ombre={false} />
      </Svg>
    </AlentoursContext.Provider>,
  );
  return noeuds(r.toJSON() as Noeud)
    .map((n) => n.props.d)
    .filter((d): d is string => typeof d === "string");
}

describe("the south road (loupe BC)", () => {
  test("the TS road is the frozen list, which the Python port also writes (the two agree through the file)", () => {
    for (const s of SORTIES) {
      const gele = FIGE.sorties[s.fin.join(",")];
      expect(gele).toBeDefined();
      const [route, voie] = s.branches;
      expect(cases(route ?? [])).toEqual(gele?.route);
      expect(cases(voie ?? [])).toEqual(gele?.voie);
      // The nodes to the micro-unit: libm may differ in the last bit, never more.
      (route ?? []).forEach(([x, y], i) => {
        expect(x).toBeCloseTo(gele?.noeuds_route[i]?.[0] ?? Number.NaN, 5);
        expect(y).toBeCloseTo(gele?.noeuds_route[i]?.[1] ?? Number.NaN, 5);
      });
      expect(route).toHaveLength(gele?.noeuds_route.length ?? 0);
    }
  });

  test("it heads screen-down, never crosses the river, and carries on below the painted ground's tip, out of the frame", () => {
    const sud = SORTIES.find((s) => s.fin[0] === 12);
    const route = sud?.branches[0] ?? [];
    expect(route.length).toBeGreaterThan(20);
    for (const [gx, gy] of route) {
      expect(gx).toBeGreaterThan(12); // the river runs at gx 1.5 to 3.5
      expect(gy).toBeGreaterThan(19);
    }
    const [gx, gy] = route[route.length - 1] ?? [0, 0];
    expect(gx + gy).toBeGreaterThan(86);
    expect(gx + gy).toBeLessThanOrEqual(88.001); // the last waypoint, (44, 44)
    // The tip of the ground lies at gx + gy about 73.7: the road runs 14 on, below the p06 screen (y 1002 dp).
    expect(ecranXY([gx, gy])[1]).toBeGreaterThan(1040);
  });

  test("the plots sit off the grid, clear of the road and its fork, in the frozen file's numbers", () => {
    expect(FIGE.parcelles).toEqual(PARCELLES);
    const sud = SORTIES.find((s) => s.fin[0] === 12);
    for (const [x0, y0, x1, y1] of Object.values(PARCELLES))
      for (const [gx, gy] of sud?.branches.flat() ?? []) {
        expect(Math.min(x0, y0)).toBeGreaterThanOrEqual(0);
        expect(Math.max(x0, y0)).toBeGreaterThanOrEqual(TAILLE);
        const dx = Math.max(x0 - gx, 0, gx - x1);
        const dy = Math.max(y0 - gy, 0, gy - y1);
        expect(Math.hypot(dx, dy)).toBeGreaterThan(1);
      }
  });

  test("criterion 6: over the painted ground RuesDessinees traces none of the off-island road tiles", async () => {
    const hors = Object.values(FIGE.sorties).flatMap((s) =>
      [...s.route, ...s.voie].filter(horsGrille),
    );
    expect(hors.length).toBeGreaterThan(40);
    // A point in the core of the cell's diamond (0.6 of it): the gate street's own end disc overhangs the rim by a quarter cell.
    const dedans = (d: string, [gx, gy]: number[]) => {
      const [cx, cy] = ecranXY([(gx ?? 0) + 0.5, (gy ?? 0) + 0.5]);
      return [...d.matchAll(/(-?\d+(?:\.\d+)?),(-?\d+(?:\.\d+)?)/g)].some(
        (m) => Math.abs(Number(m[1]) - cx) / 24 + Math.abs(Number(m[2]) - cy) / 12 < 0.6,
      );
    };
    const touche = (ds: string[]) => hors.filter((c) => ds.some((d) => dedans(d, c))).length;
    // The control: with the ground drawn by the code the same road is traced over those cells.
    expect(touche(await traces(false))).toBeGreaterThan(20);
    const peint = await traces(true);
    expect(touche(peint)).toBe(0);
    for (const s of SORTIES) expect(peint.some((d) => d.includes(s.d))).toBe(false);
  });
});
