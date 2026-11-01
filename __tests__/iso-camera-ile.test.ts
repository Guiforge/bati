// qa-audit1 (31/10): after a few swipes the frame rested on bare forest, the island gone. The pan
// bounds kept half of the island's BOX in view, and a diamond's box corner holds no land. This
// plays the camera's real path: its real zoom floor (useCameraIso: the game's, never above the
// framing, MARGE_CADRAGE and `margeBas`), the bounds of `limites` (ileJouable), every corner of the
// pan range at several zooms, and asks that land cells be on screen.

import assert from "node:assert/strict";
import { bordDe, PORTEE_BORD } from "@/components/village/iso/bord";
import {
  COTE,
  cadrage,
  cadrageComplet,
  ecranXY,
  emprise,
  etatCarte,
  HAUTEUR,
  LARGEUR,
  ZOOM_MAX,
} from "@/components/village/iso/carteDemo";
import { bornesPan, limitesDe } from "@/components/village/iso/navigation";

const ECRANS = [
  { w: 411, h: 520 },
  { w: 411, h: 700 },
  { w: 800, h: 360 },
] as const;

describe("the camera keeps land in view at every corner of its pan range", () => {
  // biome-ignore lint/complexity/noExcessiveCognitiveComplexity: a grid of screens, floors, zooms and corners, kept in one place
  test.each([1, 6, 12] as const)("palier %i", (p) => {
    const { visible } = etatCarte(p, false);
    const ile = emprise(visible);
    assert(ile);
    const centres = visible.flatMap((ligne, gy) =>
      ligne.flatMap((v, gx) => (v ? [ecranXY([gx + 0.5, gy + 0.5])] : [])),
    );
    for (const { w, h } of ECRANS)
      for (const plancher of [0.3, 0.8])
        for (const margeBas of [0, 120]) {
          const cadre = cadrageComplet(visible, w, h - margeBas).zoom;
          const l = limitesDe(
            ile,
            { largeur: LARGEUR, hauteur: HAUTEUR },
            { w, h },
            { min: plancher, max: ZOOM_MAX, cadre },
          );
          const zmin = l.zmin;
          for (const z of [zmin, (zmin + ZOOM_MAX) / 2, ZOOM_MAX]) {
            const b = bornesPan(z, l);
            for (const x of [b.xMin, b.xMax])
              for (const y of [b.yMin, b.yMax]) {
                const vus = centres.filter(([cx, cy]) => {
                  const sx = (cx - LARGEUR / 2) * z + x + w / 2;
                  const sy = (cy - HAUTEUR / 2) * z + y + h / 2;
                  return sx >= 0 && sx <= w && sy >= 0 && sy <= h;
                }).length;
                expect([p, w, h, plancher, margeBas, z, x, y, vus > 0]).toEqual([
                  p,
                  w,
                  h,
                  plancher,
                  margeBas,
                  z,
                  x,
                  y,
                  true,
                ]);
              }
          }
        }
  });
});

describe("the rim and the island's shadow stay inside a tile's margin", () => {
  // biome-ignore lint/complexity/noExcessiveCognitiveComplexity: a walk over every cell and every coordinate of its paths
  test("PORTEE_BORD covers every cell's bulges, and the rim has no bank, glints or ink (FIN-CAR)", () => {
    const { visible } = etatCarte(12, false);
    const vu = (gx: number, gy: number) => visible[gy]?.[gx] === true;
    let pire = 0;
    for (const [gy, ligne] of visible.entries())
      for (const [gx, v] of ligne.entries()) {
        if (!v) continue;
        const [hx, hy] = ecranXY([gx, gy]);
        const b = bordDe([[gx, gy]], vu);
        expect(Object.keys(b).sort()).toEqual(["bosses", "ilot"]);
        // Every coordinate of every path, against the cell's diamond (COTE wide, COTE / 2 high from its top corner).
        for (const d of [b.bosses]) {
          const n = (d.match(/-?\d+(\.\d+)?/g) ?? []).map(Number);
          for (let i = 0; i + 1 < n.length; i += 2) {
            const [x, y] = [n[i] ?? 0, n[i + 1] ?? 0];
            pire = Math.max(
              pire,
              hx - COTE / 2 - x,
              x - (hx + COTE / 2),
              hy - y,
              y - (hy + COTE / 2),
            );
          }
        }
      }
    expect(pire).toBeGreaterThan(0);
    expect(pire).toBeLessThanOrEqual(PORTEE_BORD);
  });
});

describe("the opening frame is closer than the whole island (audit T43 round 1)", () => {
  test("tier 6 opens on the village, the floor still shows the whole island", () => {
    const { visible } = etatCarte(6, false);
    const [w, h] = [411, 520];
    const ouverture = cadrage(visible, w, h).zoom;
    const complet = cadrageComplet(visible, w, h).zoom;
    expect(ouverture).toBeGreaterThanOrEqual(0.6);
    expect(ouverture).toBeGreaterThanOrEqual(complet);
    const ile = emprise(visible);
    assert(ile);
    const l = limitesDe(
      ile,
      { largeur: LARGEUR, hauteur: HAUTEUR },
      { w, h },
      { min: 0.8, max: ZOOM_MAX, cadre: complet },
    );
    expect(l.zmin).toBe(complet);
  });
});
