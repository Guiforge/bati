import { ecranXY } from "@/components/village/iso/carteDemo";
import { type Sol, sol, TAILLE } from "@/components/village/iso/isoLayout";
import { eauTracee, pieceEau } from "@/components/village/iso/pieces";
import { BERGE, centreEau, chaineEau, ruisseauDe } from "@/components/village/iso/riviere";
import { disque, lisse, ruban } from "@/components/village/iso/ruban";

const tout = Array.from({ length: TAILLE }, () => Array.from({ length: TAILLE }, () => true));
const sousChemins = (d: string) => d.split("M").filter(Boolean);
const points = (d: string) =>
  [...d.matchAll(/(-?\d+(?:\.\d+)?),(-?\d+(?:\.\d+)?)/g)].map(
    (m) => [Number(m[1]), Number(m[2])] as const,
  );
/** Screen dp back to grid units (ecranXY inverted). */
const grille = ([x, y]: readonly [number, number]) => {
  const [ox] = ecranXY([0, 0]);
  const k = ecranXY([1, 0])[0] - ox;
  const a = (x - ox) / k;
  const b = y / (k / 2);
  return [(a + b) / 2, (b - a) / 2] as const;
};
const aire = (p: readonly (readonly [number, number])[]) =>
  p.reduce((s, [x, y], i) => {
    const [u, v] = p[(i + 1) % p.length] ?? [x, y];
    return s + x * v - u * y;
  }, 0);

describe("the bands drawn on the ground (ruban.ts)", () => {
  test("a band is as wide as asked at each point, and always turned the same way", () => {
    const p = ruban(
      [
        [0, 0],
        [1, 0],
        [2, 0],
      ],
      [0.1, 0.2, 0.3],
    );
    expect(p.map(([, y]) => Math.abs(y))).toEqual([0.1, 0.2, 0.3, 0.3, 0.2, 0.1]);
    const retour = ruban(
      [
        [2, 0],
        [1, 0],
        [0, 0],
      ],
      [0.1, 0.1, 0.1],
    );
    expect(aire(p)).toBeGreaterThan(0);
    expect(aire(retour)).toBeGreaterThan(0);
    expect(aire(disque([0, 0], 1))).toBeGreaterThan(0);
  });

  test("the smoothed line passes through every point it was given", () => {
    const pts = [
      [0, 0],
      [1, 0.3],
      [2, -0.2],
      [3, 0],
    ] as const;
    const l = lisse(pts, 4);
    expect(l).toHaveLength(13);
    for (const [i, q] of pts.entries()) expect(l[i * 4]).toEqual(q);
  });
});

describe("the stream (T22)", () => {
  test("its chain runs through every water cell of the master grid, from one end to the cascade", () => {
    const chaine = chaineEau();
    const eaux = sol.flatMap((l, y) =>
      l.flatMap((s, x) => (s === "eau" || s === "pont" || s === "cascade" ? [`${x},${y}`] : [])),
    );
    expect(chaine.map((c) => c.join(",")).toSorted()).toEqual(eaux.toSorted());
    const pas = chaine.slice(1).map((c, i) => {
      const p = chaine[i] ?? c;
      return Math.abs(p[0] - c[0]) + Math.abs(p[1] - c[1]);
    });
    expect(new Set(pas)).toEqual(new Set([1]));
    const fin = chaine.at(-1);
    expect(fin && sol[fin[1]]?.[fin[0]]).toBe("cascade");
  });

  test("it is one continuous band with no seam between two water cells, and it meanders", () => {
    const r = ruisseauDe(tout);
    expect(sousChemins(r.eau)).toHaveLength(1);
    expect(r.berge).toHaveLength(BERGE.length);
    for (const b of r.berge) expect(sousChemins(b)).toHaveLength(1);
    const centres = chaineEau().map(centreEau);
    const ecarts = centres.map(([x], i) => x - ((chaineEau()[i]?.[0] ?? 0) + 0.5));
    expect(Math.max(...ecarts.map(Math.abs))).toBeGreaterThan(0.2);
    expect(ecarts.some((e) => e > 0.03) && ecarts.some((e) => e < -0.03)).toBe(true);
    expect(ruisseauDe(tout)).toEqual(r);
  });

  test("it stays in its cells and their banks, and meets the bridge and the cascade centred", () => {
    const chaine = chaineEau();
    const cles = new Set(chaine.map((c) => c.join(",")));
    // The water, meanders and all, stays inside its own column of cells (gx 2 on the master grid).
    for (const [x] of points(ruisseauDe(tout).eau).map(grille)) {
      expect(x).toBeGreaterThan(2);
      expect(x).toBeLessThan(3);
    }
    const peintes = chaine.filter((c) => sol[c[1]]?.[c[0]] !== "eau");
    expect(peintes).toHaveLength(2);
    expect(peintes.map(centreEau)).toEqual(peintes.map((c) => [c[0] + 0.5, c[1] + 0.5]));
    expect(cles.size).toBe(chaine.length);
  });

  test("a stretch off the island draws nothing; a cut leaves one band per stretch", () => {
    const rien = tout.map((l) => l.map(() => false));
    expect(ruisseauDe(rien)).toEqual({ eau: "", berge: ["", ""], coeur: "" });
    const coupe = tout.map((l, y) => l.map(() => y !== 6));
    expect(sousChemins(ruisseauDe(coupe).eau)).toHaveLength(2);
  });

  test("a stream that turns is drawn too (a grid other than the master one)", () => {
    const L: Record<string, Sol> = { ".": "herbe", "~": "eau" };
    const g = ["~~~.", "..~.", "..~~"].map((l) => [...l].map((ch) => L[ch] ?? "herbe"));
    expect(chaineEau(g)).toHaveLength(6);
    const vu = g.map((l) => l.map(() => true));
    expect(sousChemins(ruisseauDe(vu, g).eau)).toHaveLength(1);
  });

  test("the plain canal pieces are left to the stream; the bridge and the cascade keep their images", () => {
    const pieces = chaineEau().flatMap((c) => pieceEau(sol, c) ?? []);
    const peintes = pieces.filter((p) => !eauTracee(p.cle)).map((p) => p.cle);
    expect(peintes.toSorted()).toEqual(["eau/canal_pont.nuit.webp", "eau/cascade_bord.nuit.webp"]);
    // Whatever the ambiance of the key.
    expect(eauTracee("eau/canal_droit.jour.webp")).toBe(true);
    expect(eauTracee("eau/canal_pont.jour.webp")).toBe(false);
  });
});
