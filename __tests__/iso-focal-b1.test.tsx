jest.mock("@/hooks/useReducedMotion", () => ({ useReducedMotion: () => false }));

import assert from "node:assert/strict";
import { render } from "@testing-library/react-native";
import Svg from "react-native-svg";
import { TERRAIN } from "@/components/village/iso/alentours";
import {
  cadrage,
  centreSalle,
  empriseBatie,
  etatCarte,
  HAUTEUR,
  LARGEUR,
  ZOOM_MAX,
} from "@/components/village/iso/carteDemo";
import { emplacements, TAILLE } from "@/components/village/iso/isoLayout";
import { Rues } from "@/components/village/iso/RuesDessinees";
import { ARETES, ARETES_CAMP, LARGEURS } from "@/components/village/iso/rues";

type Noeud = { type: string; props: Record<string, unknown>; children: Noeud[] | null };
const noeuds = (n: Noeud | Noeud[] | null): Noeud[] =>
  n === null ? [] : Array.isArray(n) ? n.flatMap(noeuds) : [n, ...noeuds(n.children)];

const SALLE = emplacements.heroes_hall;

describe("the opening frame holds the built village and the heroes' hall (B1)", () => {
  // 1080 x 2400 px at 2.625: the map full screen, then under the dev bar (it starts at y = 935 px)
  for (const [w, h] of [
    [411, 914],
    [411, 558],
    [390, 700],
  ] as const) {
    // FIN-DIS: every tier, the new plan grows in lobes and the frame must hold each one.
    for (const palier of [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12] as const) {
      test(`${w} x ${h}, tier ${palier}: the village fills the width, centred, the hall inside`, () => {
        const { visible } = etatCarte(palier, false);
        const v = cadrage(visible, w, h);
        const b = empriseBatie(visible);
        assert(b);
        const sx = (px: number) => w / 2 + v.x + v.zoom * (px - LARGEUR / 2);
        const sy = (py: number) => h / 2 + v.y + v.zoom * (py - HAUTEUR / 2);
        expect(sx(b.x0)).toBeGreaterThanOrEqual(0);
        expect(sx(b.x1)).toBeLessThanOrEqual(w);
        expect(sy(b.y0)).toBeGreaterThanOrEqual(0);
        expect(sy(b.y1)).toBeLessThanOrEqual(h);
        expect((sy(b.y0) + sy(b.y1)) / 2).toBeCloseTo(h / 2, 5);
        expect((sx(b.x0) + sx(b.x1)) / 2).toBeCloseTo(w / 2, 5);
        // wide enough, unless the height or the zoom bounds are what stops it
        const plein = (sx(b.x1) - sx(b.x0)) / w;
        expect(plein > 0.85 || sy(b.y1) - sy(b.y0) > 0.85 * h || v.zoom === ZOOM_MAX).toBe(true);
        const { x, demi } = centreSalle();
        const salle = visible[SALLE.coin[1]]?.[SALLE.coin[0]] ?? false;
        expect(!salle || sx(x) - demi * v.zoom > 0).toBe(true);
        expect(!salle || sx(x) + demi * v.zoom < w).toBe(true);
      });
    }
  }

  // FIN-DIS: the hall's socle shows from tier 1 on the real map, so the island is made by hand.
  test("without the hall's plot, the frame stays centred on the village", () => {
    const visible = etatCarte(1, false).visible.map((l) => [...l]);
    for (const [gx, gy] of SALLE.cases) {
      const ligne = visible[gy];
      if (ligne) ligne[gx] = false;
    }
    expect(visible[SALLE.coin[1]]?.[SALLE.coin[0]]).toBeFalsy();
    const b = empriseBatie(visible);
    assert(b);
    const v = cadrage(visible, 390, 700);
    expect(v.x).toBeCloseTo(v.zoom * (LARGEUR / 2 - (b.x0 + b.x1) / 2), 5);
  });
});

describe("the camp's streets (H1-06)", () => {
  test("every camp edge is rank 0 (LARGEURS[0]); the grown village keeps its ranks", () => {
    expect(ARETES_CAMP).toHaveLength(ARETES.length);
    expect(ARETES_CAMP.every((a) => a.classe === 0)).toBe(true);
    expect(ARETES.some((a) => a.classe > 0)).toBe(true);
    expect(LARGEURS[0]).toBe(0.5);
  });

  test("a camp island draws no ink rim under its streets; a grown island does", async () => {
    const rim = async (palier: 1 | 12) => {
      const { visible } = etatCarte(palier, false);
      const vus = new Set<number>();
      visible.forEach((ligne, gy) => {
        ligne.forEach((v, gx) => {
          if (v) vus.add(gy * TAILLE + gx);
        });
      });
      const r = await render(
        <Svg>
          <Rues dedans={vus} visibles={vus} biome="defaut" ombre={false} />
        </Svg>,
      );
      return noeuds(r.toJSON() as Noeud).filter(
        (n) => n.type === "RNSVGPath" && n.props.strokeOpacity === 0.8,
      );
    };
    expect(await rim(1)).toHaveLength(0);
    expect((await rim(12)).length).toBeGreaterThan(0);
  });
});

describe("the tight opening frame, painted layers on (B5, M4-01)", () => {
  for (const [w, h] of [
    [411, 914],
    [411, 558],
    [390, 700],
  ] as const) {
    for (const palier of [1, 6, 12] as const) {
      test(`${w} x ${h}, tier ${palier}: the view stays inside the painted terrain, the hall in it`, () => {
        const { visible } = etatCarte(palier, false);
        const v = cadrage(visible, w, h, true);
        const x0 = LARGEUR / 2 - v.x / v.zoom - w / 2 / v.zoom;
        const y0 = HAUTEUR / 2 - v.y / v.zoom - h / 2 / v.zoom;
        expect(x0).toBeGreaterThanOrEqual(TERRAIN.x);
        expect(x0 + w / v.zoom).toBeLessThanOrEqual(TERRAIN.x + TERRAIN.w);
        expect(y0).toBeGreaterThanOrEqual(TERRAIN.y);
        expect(y0 + h / v.zoom).toBeLessThanOrEqual(TERRAIN.y + TERRAIN.h);
        const { x, demi } = centreSalle();
        const sx = (px: number) => w / 2 + v.x + v.zoom * (px - LARGEUR / 2);
        expect(sx(x) - demi * v.zoom).toBeGreaterThan(0);
        expect(sx(x) + demi * v.zoom).toBeLessThan(w);
        expect(v.zoom).toBeGreaterThanOrEqual(cadrage(visible, w, h).zoom * 0.5);
      });
    }
  }
});
