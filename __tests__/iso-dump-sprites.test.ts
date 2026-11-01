// The pure side of the sprite dump (dev-iso `?dump=`): ids, the tile under a point, the projection
// to screen pixels against the app's own camera maths, and the logcat chunks.

import { COTE, ecranXY, HAUTEUR, LARGEUR } from "@/components/village/iso/carteDemo";
import {
  construireDump,
  coucheDe,
  type EntreeDump,
  entreePlanche,
  idAsset,
  lignesDump,
  tuileDe,
  versPixels,
} from "@/components/village/iso/dumpSprites";
import { ecranDepuisCarte } from "@/components/village/iso/navigation";

const DPR = 2.625;
const VUE = { zoom: 1.4, x: 30, y: -20 };
const AIRE = { x: 0, y: 90, w: 411, h: 700 };

test("a night, a day and a bare file name are one asset", () => {
  expect(idAsset("forge/solid.nuit.webp")).toBe("forge/solid");
  expect(idAsset("forge/solid.jour.webp")).toBe("forge/solid");
  expect(idAsset("windmill_sails.webp")).toBe("windmill_sails");
});

test("the layer comes from the testID", () => {
  expect(coucheDe("iso-maquette-forge")).toBe("building");
  expect(coucheDe("iso-habitant-3")).toBe("villager");
  expect(coucheDe("iso-lisiere-4-5")).toBe("decor");
});

test("tuileDe inverts ecranXY, a corner belongs to the tile behind it", () => {
  for (const [i, j] of [
    [0, 0],
    [7, 11],
    [19, 3],
  ] as const) {
    const [x, y] = ecranXY([i + 0.5, j + 0.5]);
    expect(tuileDe(x, y)).toEqual([i, j]);
    const [cx, cy] = ecranXY([i + 1, j + 1]);
    expect(tuileDe(cx, cy)).toEqual([i, j]);
  }
});

test("the camera is the header formula in pixels, and it agrees with the app's own transform", () => {
  const { camera } = construireDump([], VUE, AIRE, DPR, { w: 411, h: 914 });
  expect(camera.tileW).toBe(COTE);
  expect(camera.tileH).toBe(COTE / 2);
  for (const [i, j] of [
    [0, 0],
    [8, 5],
    [19, 19],
  ] as const) {
    const [ax, ay] = ecranDepuisCarte(ecranXY([i, j]), VUE, AIRE, {
      largeur: LARGEUR,
      hauteur: HAUTEUR,
    });
    const x = ((i - j) * camera.tileW * camera.zoom) / 2 + camera.tx;
    const y = ((i + j) * camera.tileH * camera.zoom) / 2 + camera.ty;
    expect(x).toBeCloseTo((ax + AIRE.x) * DPR, 3);
    expect(y).toBeCloseTo((ay + AIRE.y) * DPR, 3);
  }
});

const arbre: EntreeDump = {
  id: "tree_dense",
  layer: "forest",
  x: ecranXY([8, 5])[0] - 40,
  y: ecranXY([8, 5])[1] - 100,
  w: 80,
  h: 100,
  flip: false,
  pied: ecranXY([8.5, 5.5]),
};

test("a map sprite lands in screen px with the tile of its foot and its depth", () => {
  const p = versPixels(arbre, VUE, AIRE, DPR);
  const [ax, ay] = ecranDepuisCarte([arbre.x, arbre.y], VUE, AIRE, {
    largeur: LARGEUR,
    hauteur: HAUTEUR,
  });
  expect(p.x).toBeCloseTo((ax + AIRE.x) * DPR, 0);
  expect(p.y).toBeCloseTo((ay + AIRE.y) * DPR, 0);
  expect(p.w).toBeCloseTo(80 * VUE.zoom * DPR, 0);
  expect([p.tileI, p.tileJ]).toEqual([8, 5]);
  expect(p.z).toBeCloseTo(14, 3);
});

test("a screen-fixed sprite does not move with the camera", () => {
  const fixe: EntreeDump = { ...arbre, id: "plan_dense", x: -20, y: 600, screenFixed: true };
  const a = versPixels(fixe, VUE, AIRE, DPR);
  const b = versPixels(fixe, { zoom: 0.5, x: 200, y: 100 }, AIRE, DPR);
  expect([a.x, a.y, a.w]).toEqual([b.x, b.y, b.w]);
  expect(a.screenFixed).toBe(true);
  expect(a.z).toBe(1000);
});

test("a flame keeps its container", () => {
  const f = versPixels({ ...arbre, id: "flame_forge", container: "forge" }, VUE, AIRE, DPR);
  expect(f.container).toBe("forge");
});

test("a Planche entry scales about its anchor and skips hidden images", () => {
  const s = { image: 0, anchor: [50, 100], size: [100, 100], ombre: [] } as never;
  const rect = { x: 10, y: 20, w: 100, h: 100 };
  const base = { s, rect, miroir: true, reduit: 0.5, invisible: false, testID: "iso-piece-1-2" };
  const e = entreePlanche(base);
  expect(e).toMatchObject({ x: 35, y: 70, w: 50, h: 50, flip: true, pied: [60, 120] });
  expect(entreePlanche({ ...base, invisible: true })).toBeNull();
  expect(entreePlanche({ ...base, testID: "iso-assombri-1-2" })).toBeNull();
  expect(entreePlanche({ ...base, rect: null })).toBeNull();
});

test("the logcat lines carry the dump whole, in chunks a line can hold", () => {
  const dump = {
    camera: { zoom: 1 },
    sprites: Array.from({ length: 200 }, (_, k) => ({ id: `tree_${k}`, x: k })),
  };
  const lignes = lignesDump("palier-12", dump);
  expect(lignes.length).toBeGreaterThan(1);
  const n = lignes.length;
  const pieces = lignes.map((l, k) => {
    const m = l.match(/^ISO_DUMP palier-12 (\d+)\/(\d+) (.*)$/);
    expect([Number(m?.[1]), Number(m?.[2])]).toEqual([k + 1, n]);
    expect((m?.[3] ?? "").length).toBeLessThanOrEqual(3000);
    return m?.[3];
  });
  expect(JSON.parse(pieces.join(""))).toEqual(dump);
});
