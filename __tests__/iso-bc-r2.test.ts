jest.mock("@/db/client", () => ({ db: {}, schema: {}, runMigrations: jest.fn() }));

import { massesForet, voileVillage } from "@/components/village/iso/alentours";
import { etatCarte } from "@/components/village/iso/carteDemo";

const grille = (x: number, y: number) => {
  const u = (x - 480) / 24;
  const v = y / 12;
  return [(u + v) / 2, (v - u) / 2] as const;
};
const PALIERS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12] as const;
const cle = (m: { nom: string; x: number; y: number; echelle: number; flip: boolean }) =>
  `${m.nom}@${Math.round(m.x)},${Math.round(m.y)}x${m.echelle}${m.flip ? "f" : ""}`;

describe("loupe BC round 2: the forest", () => {
  test("north crop (tiles -12,-12,6,8) at tier 6: three classes 0.7 to 1.3, small toward the village, half mirrored", () => {
    const ms = massesForet(etatCarte(6, false).visible).filter((m) => {
      const [gx, gy] = grille(m.x, m.y);
      return gx >= -12 && gx <= 6 && gy >= -12 && gy <= 8;
    });
    expect(ms.length).toBeGreaterThanOrEqual(8);
    const ws = ms.map((m) => m.echelle).toSorted((a, b) => a - b);
    expect(ws.at(-1) ?? 0).toBeGreaterThanOrEqual(1.8 * (ws[0] ?? 1));
    expect(1 + ws.slice(1).filter((b, i) => b / (ws[i] ?? 1) > 1.25).length).toBeGreaterThanOrEqual(
      3,
    );
    const dist = (m: (typeof ms)[number]) => {
      const [gx, gy] = grille(m.x, m.y);
      return Math.max(Math.abs(gx - 10), Math.abs(gy - 10));
    };
    const tri = ms.toSorted((a, b) => dist(a) - dist(b));
    const q = Math.floor(tri.length / 4);
    const med = (l: typeof ms) => l.map((m) => m.echelle).toSorted()[Math.floor(l.length / 2)] ?? 0;
    expect(med(tri.slice(0, q))).toBeLessThan(med(tri.slice(-q)));
    expect(ms.some((m) => m.flip)).toBe(true);
    expect(ms.some((m) => !m.flip)).toBe(true);
  });

  test("a mass keeps its species, size and mirror at every tier (only the clearing's edge backs off)", () => {
    const pos = (m: { x: number; y: number }) => `${Math.round(m.x)},${Math.round(m.y)}`;
    const un = new Map(massesForet(etatCarte(1, false).visible).map((m) => [pos(m), cle(m)]));
    for (const p of PALIERS.slice(1))
      for (const m of massesForet(etatCarte(p, false).visible))
        expect(cle(m)).toBe(un.get(pos(m)) ?? cle(m));
  });

  test("no neighbouring pair of one asset overlaps (3 cells apart at least), no bord_* inside the forest", () => {
    const ms = massesForet(etatCarte(6, false).visible);
    for (const [i, a] of ms.entries())
      for (const b of ms.slice(i + 1)) {
        if (a.nom !== b.nom || a.nom.startsWith("bord_")) continue;
        const [ax, ay] = grille(a.x, a.y);
        const [bx, by] = grille(b.x, b.y);
        expect(Math.max(Math.abs(ax - bx), Math.abs(ay - by))).toBeGreaterThan(2);
      }
    const [t] = [{ x: -348, y: -836, w: 1656, h: 2152 }];
    for (const m of ms.filter((n) => n.nom.startsWith("bord_")))
      expect(Math.min(m.x - t.x, t.x + t.w - m.x, m.y - t.y, t.y + t.h - m.y)).toBeLessThan(140);
  });

  test("undergrowth: one strip at most a mass, south and north edges only, no identical pair within 3 cells", () => {
    const ms = massesForet(etatCarte(6, false).visible).filter((m) => m.sb !== undefined);
    expect(ms.length).toBeGreaterThan(10);
    for (const m of ms) {
      const [gx, gy] = grille(m.x, m.y);
      expect(gx > 35.2 || gy > 35.2 || gx + gy < 6).toBe(true);
    }
    for (const [i, a] of ms.entries())
      for (const b of ms.slice(i + 1)) {
        const [ax, ay] = grille(a.x, a.y);
        const [bx, by] = grille(b.x, b.y);
        const proches = Math.max(Math.abs(ax - bx), Math.abs(ay - by)) < 3;
        expect(proches && a.sb === b.sb && a.flip === b.flip).toBe(false);
      }
  });
});

describe("loupe BC round 2: the corner and the veil", () => {
  test("the surroundings' veil is centred on the island and grows with the tier", () => {
    const [v1, v6, v12] = [1, 6, 12].map((p) => voileVillage(etatCarte(p as 1, false).visible));
    expect(v1 && v6 && v12).toBeTruthy();
    expect(v12?.rx ?? 0).toBeGreaterThan(v1?.rx ?? 0);
    for (const v of [v1, v6, v12]) {
      expect(v?.dedans ?? 0).toBeGreaterThan(0.2);
      expect(v?.dedans ?? 1).toBeLessThan(0.9);
    }
  });
});
