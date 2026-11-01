// L3-T06: the sprites' levels of detail (detail.ts) and the decode memory they cost.
import assert from "node:assert/strict";
import {
  ailesDe,
  ECHELLE_DECODE_LANTERNE,
  etatCarte,
  HAUTEUR,
  LARGEUR,
  ORDRE_CARTE,
  type PieceCarte,
  pieceMontree,
  pose,
  poseAiles,
  poseChute,
  posePiece,
  type Rect,
  spriteDe,
  stadeDemo,
  ZOOM_MAX,
} from "@/components/village/iso/carteDemo";
import {
  cleDetail,
  detailDe,
  PALIERS_ZOOM,
  palierDe,
  palierPour,
  tailleDecode,
  type Zone,
  zoneDe,
} from "@/components/village/iso/detail";
import { echelleLisiere, lisiereMontree } from "@/components/village/iso/lisiere";
import { MAQUETTES } from "@/components/village/iso/maquettes";
import type { BuildingCode } from "@/db/schema";

describe("palierDe", () => {
  it("picks the lowest level that covers the zoom", () => {
    expect(palierDe(0.43, 0, false)).toBe(0);
    expect(palierDe(0.8, 1, false)).toBe(1);
    expect(palierDe(1.2, 1, false)).toBe(2);
    expect(palierDe(1.75, 2, false)).toBe(2);
    expect(palierDe(ZOOM_MAX, 2, false)).toBe(3);
    expect(palierDe(ZOOM_MAX * 2, 3, false)).toBe(3);
  });

  it("never changes level during a gesture", () => {
    for (const z of [0.3, 1.2, ZOOM_MAX]) expect(palierDe(z, 1, true)).toBe(1);
  });

  it("holds the level just past a bound, leaves it beyond the hysteresis", () => {
    expect(palierDe(0.62, 0, false)).toBe(0);
    expect(palierDe(0.66, 0, false)).toBe(1);
    expect(palierDe(0.58, 1, false)).toBe(1);
    expect(palierDe(0.5, 1, false)).toBe(0);
    expect(palierDe(1.05, 1, false)).toBe(1);
    expect(palierDe(1.1, 1, false)).toBe(2);
  });

  it("sweeps up then down around each bound with the state carried, no back-and-forth", () => {
    const balaie = (zooms: number[], depart: number) => {
      let p = depart;
      const suite = [p];
      for (const z of zooms) {
        const n = palierDe(z, p, false);
        if (n !== p) suite.push(n);
        p = n;
      }
      return suite;
    };
    for (const [i, b] of PALIERS_ZOOM.slice(0, -1).entries()) {
      const pas = Array.from({ length: 41 }, (_, k) => b * (0.9 + k * 0.005));
      expect(balaie(pas, i)).toEqual([i, i + 1]);
      expect(balaie([...pas].reverse(), i + 1)).toEqual([i + 1, i]);
      // Wobbling inside the band flips nothing.
      expect(balaie([b * 0.97, b * 1.03, b * 0.98, b * 1.02], i)).toEqual([i]);
    }
  });

  it("opens at the village framing on level 0 from a current level of 0", () => {
    expect(palierDe(0.43, 0, false)).toBe(0);
    expect(palierDe(1.4, 0, false)).toBe(2);
  });

  it("has a level at the village framing, then rising levels", () => {
    expect(PALIERS_ZOOM.length).toBeLessThanOrEqual(4);
    expect([...PALIERS_ZOOM].sort((a, b) => a - b)).toEqual(PALIERS_ZOOM);
    expect(PALIERS_ZOOM[0]).toBeLessThan(1);
  });
});

describe("tailleDecode", () => {
  it("decodes below 1 at the zoom it covers", () => {
    expect(tailleDecode(0, 100, 50, [4000, 4000], 2)).toEqual({ width: 127, height: 64 });
  });

  it("asks for the view size times density times the level's zoom", () => {
    expect(tailleDecode(2, 100, 50, [4000, 4000], 2)).toEqual({ width: 350, height: 175 });
  });

  it("never exceeds the source, keeping the ratio", () => {
    expect(tailleDecode(3, 400, 200, [1000, 1000], 3)).toEqual({ width: 1000, height: 500 });
  });
});

describe("cleDetail, zoneDe and palierPour", () => {
  const r = { x: 0, y: 0, w: 10, h: 10 };
  it("has no zone below the top level, and falls back to level 1 while it is unknown", () => {
    expect(zoneDe(2, 0, 0, 1.5, 400, 800)).toBeNull();
    expect(palierPour(2, null, r)).toBe(2);
    expect(palierPour(3, null, r)).toBe(2);
  });

  it("keeps one key while the camera stays in its bucket, a new one past it", () => {
    const k = cleDetail(ZOOM_MAX, 0, 0, 400, 800, 3);
    expect(cleDetail(ZOOM_MAX, -5, 5, 400, 800, 3)).toBe(k);
    expect(cleDetail(ZOOM_MAX, -200, 0, 400, 800, 3)).not.toBe(k);
    expect(cleDetail(0.5, 0, 0, 400, 800, 3)).toBe(0);
  });

  it("decodes its key into a zone covering the viewport", () => {
    const { palier, zone: z } = detailDe(
      cleDetail(ZOOM_MAX, 0, 0, 400, 800, 3),
      ZOOM_MAX,
      400,
      800,
    );
    expect(palier).toBe(3);
    assert(z);
    const cx = LARGEUR / 2;
    const cy = HAUTEUR / 2;
    expect(z.x).toBeLessThan(cx - 400 / ZOOM_MAX / 2);
    expect(z.x + z.w).toBeGreaterThan(cx + 400 / ZOOM_MAX / 2);
    expect(z.y).toBeLessThan(cy - 800 / ZOOM_MAX / 2);
    expect(z.y + z.h).toBeGreaterThan(cy + 800 / ZOOM_MAX / 2);
  });

  it("gives the plain decode to a sprite outside the zone", () => {
    const z = { x: 100, y: 100, w: 50, h: 50 };
    expect(palierPour(3, z, { x: 120, y: 120, w: 5, h: 5 })).toBe(3);
    expect(palierPour(3, z, { x: 0, y: 0, w: 5, h: 5 })).toBe(1);
  });
});

type Boite = Rect & { src: readonly [number, number]; lisiere?: true; cle?: string };

/** Every image of the full village (tier 12, all built at their top stage): its rect and source size. */
function boitesDuVillage(): Boite[] {
  const { visible } = etatCarte(12, true);
  // The lisiere shows off the island (lisiere.ts): at tier 12 the ring outside the grid.
  const lisiere = new Set<PieceCarte>(lisiereMontree(visible).map((l) => l.piece));
  const boites: Boite[] = [];
  const ajoute = (
    r: Rect | null,
    src: readonly [number, number] | undefined,
    l = false,
    cle?: string,
  ) => {
    if (r && src) boites.push(l ? { ...r, src, lisiere: true, cle } : { ...r, src, cle });
  };
  const batiment = (code: BuildingCode) => {
    const s = spriteDe(code, stadeDemo(code, 12));
    const corps = s ? pose(code, s) : null;
    ajoute(corps, s?.size);
    const a = ailesDe(code);
    if (corps && s && a) ajoute(poseAiles(corps, s, a), a.size);
  };
  const piece = (p: PieceCarte, l = false) => {
    const s = MAQUETTES[p.cle];
    ajoute(s ? posePiece(p.case, s) : null, s?.size, l, p.cle);
    const c = p.chute ? MAQUETTES[p.chute] : undefined;
    ajoute(c ? poseChute(p.case, c) : null, c?.size, l);
  };
  for (const e of ORDRE_CARTE) {
    if (e.type === "batiment") batiment(e.code);
    else if (e.type === "lisiere") {
      if (lisiere.has(e.piece)) piece(e.piece, true);
    } else if (e.type !== "pan" && pieceMontree(e.piece, visible)) piece(e.piece);
  }
  return boites;
}

describe("decode memory of the full village", () => {
  const DENSITE = 2.625;
  const mo = (px: number) => px / 1024 / 1024;
  // T39: the lantern is decoded at 0.7 of the plain size, as Figurine asks of Planche.
  const echelleDecode = (cle?: string) =>
    cle?.startsWith("decor/lanterne") ? ECHELLE_DECODE_LANTERNE : 1;

  it("stays under the budget at each level, the top one limited to the zone", () => {
    const toutes = boitesDuVillage();
    // The lisiere is decoded at level 0, half size, whatever the zoom (Planche `plafond`, `echelle`): budgeted apart.
    const boites = toutes.filter((b) => !b.lisiere);
    const mem = (liste: readonly Boite[], palier: number, zone: Zone) =>
      mo(
        liste.reduce((n, b) => {
          const niveau = b.lisiere ? 0 : palierPour(palier, zone, b);
          const t = tailleDecode(
            niveau,
            b.w,
            b.h,
            b.src,
            b.lisiere ? DENSITE * echelleLisiere(b.cle ?? "") : DENSITE * echelleDecode(b.cle),
          );
          return n + t.width * t.height * 4;
        }, 0),
      );
    const total = (palier: number, zone: Zone) => mem(boites, palier, zone);
    const lisiere = mem(
      toutes.filter((b) => b.lisiere),
      3,
      null,
    );
    expect(toutes.length).toBeGreaterThan(boites.length);
    // 31/10: trees at the whole level-0 decode, measured 4.18 MiB (was 2.12 at half).
    expect(lisiere).toBeLessThan(4.5);
    const tout = PALIERS_ZOOM.map((_, p) => total(p, null));
    // Worst zone: centred on each sprite in turn, on a 411 x 800 dp area at the top zoom.
    const pire = Math.max(
      ...boites.map((b) => {
        const lw = 411 / ZOOM_MAX;
        const lh = 800 / ZOOM_MAX;
        return total(3, {
          x: b.x + b.w / 2 - 0.625 * lw,
          y: b.y + b.h / 2 - 0.625 * lh,
          w: 1.25 * lw,
          h: 1.25 * lh,
        });
      }),
    );
    console.info(
      `L3-T06 images=${boites.length} MiB par palier, tout decode: ${tout.map((m) => m.toFixed(1)).join(" / ")}; palier 2 limite a la zone, pire cas: ${pire.toFixed(1)}; lisiere (niveau 0, moitie): ${lisiere.toFixed(1)}`,
    );
    // Level 2 decodes the whole village at DECODE_ZOOM[2] (1.75, no hysteresis margin added): under 60 MiB.
    expect(tout[2]).toBeLessThan(60);
    // Decoded at 0.6 of zoom 1: 0.36 of its pixels.
    expect(tout[0]).toBeLessThan((tout[1] ?? 0) * 0.4);
    expect(pire).toBeLessThan(60);
  });
});
