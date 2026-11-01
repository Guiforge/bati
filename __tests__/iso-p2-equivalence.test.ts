// PLAN-PERF P2: distCases and voileDe were rewritten as plain loops for the first render's cost.
// Same answers as the code they replaced, on random shapes and points.
import { COTE, ecranXY, voileDe } from "@/components/village/iso/carteDemo";
import type { Case } from "@/components/village/iso/isoLayout";
import { distCases } from "@/components/village/iso/monde";
import type { Point } from "@/components/village/iso/ombres";
import { casesSousOmbre } from "@/components/village/iso/pieces";

function aleatoire(graine: number) {
  let s = graine;
  return () => {
    s = (s * 1103515245 + 12345) % 2147483648;
    return s / 2147483648;
  };
}

test("voileDe keeps exactly the shadows whose cells hold the piece", () => {
  const r = aleatoire(7);
  for (let i = 0; i < 200; i++) {
    const ombres: Point[][] = Array.from({ length: 6 }, () =>
      Array.from({ length: 3 + Math.floor(r() * 4) }, () => [r() * 20 - 2, r() * 20 - 2] as Point),
    );
    const c: Case = [Math.floor(r() * 20), Math.floor(r() * 20)];
    const avant = ombres.filter((o) =>
      casesSousOmbre([o]).some(([x, y]) => x === c[0] && y === c[1]),
    );
    expect(voileDe(c, ombres)).toBe(voileDe(c, avant));
    // The reference's shadows all hold the piece, so voileDe keeps every one of them.
    expect(voileDe(c, avant).length > 0).toBe(avant.length > 0);
  }
});

test("distCases is the nearest diamond, as the map-and-spread version computed it", () => {
  const r = aleatoire(11);
  const visible = Array.from({ length: 20 }, () => Array.from({ length: 20 }, () => r() < 0.5));
  const dist = distCases(visible);
  const centres = visible.flatMap((l, gy) =>
    l.flatMap((v, gx) => (v ? [ecranXY([gx + 0.5, gy + 0.5])] : [])),
  );
  const [a, b] = [COTE / 2, COTE / 4];
  const echelle = (a * b) / Math.hypot(a, b);
  for (let i = 0; i < 300; i++) {
    const [px, py] = [r() * 30 * COTE - 5 * COTE, r() * 20 * COTE - 5 * COTE];
    const avant =
      (Math.min(...centres.map(([cx, cy]) => Math.abs(px - cx) / a + Math.abs(py - cy) / b)) - 1) *
      echelle;
    expect(dist(px, py)).toBe(avant);
  }
});
