import { type ElementCarte, ORDRE_CARTE } from "@/components/village/iso/carteDemo";
import type { Stade } from "@/components/village/iso/isoSpec";
import {
  couvre,
  DELAIS,
  pointsReflet,
  refletsPar,
  traitReflet,
} from "@/components/village/iso/reflets";

jest.mock("expo-router", () => ({ useIsFocused: () => true }));
jest.mock("@/hooks/useReducedMotion", () => ({ useReducedMotion: () => false }));

const STADES: readonly Stade[] = ["rough", "solid", "grand"];
const couches = (stade: Stade) =>
  refletsPar(ORDRE_CARTE, (e, x, y) => couvre(e, x, y, () => stade));
const ou = (c: readonly number[]) =>
  ORDRE_CARTE.findIndex((e) => e.type === "piece" && e.piece.case.join() === c.join());
const eau = (e: ElementCarte) => e.type === "piece" && e.piece.cle.startsWith("eau/");

describe("water glints under a later sprite (L5-T09b)", () => {
  test("the canal is cut in 5 bands, each layer filed under its last water piece, in order", () => {
    const m = couches("solid");
    expect(m.size).toBe(DELAIS);
    const rangs = [...m.keys()].map((k) => ou(k.split(",").map(Number)));
    expect(rangs).toEqual(rangs.toSorted((a, b) => a - b));
    expect([...m.values()].map((v) => v.k)).toEqual([0, 1, 2, 3, 4]);
  });

  test("at least 6 glints (sparse: one cell in two) are left, at every stage", () => {
    for (const stade of STADES)
      expect([...couches(stade).values()].flatMap((v) => v.cases).length).toBeGreaterThanOrEqual(6);
  });

  test("nothing sorted between a glint's cell and its layer covers its track, at any stage", () => {
    for (const stade of STADES)
      for (const [cle, { cases }] of couches(stade))
        for (const c of cases) {
          const entre = ORDRE_CARTE.slice(ou(c) + 1, ou(cle.split(",").map(Number)) + 1).filter(
            (v) => !eau(v),
          );
          for (const [x, y] of pointsReflet(c))
            expect(entre.filter((v) => couvre(v, x, y, () => stade))).toEqual([]);
        }
  });

  test("the rule bites: a view between a cell and its layer that covers it removes the glint", () => {
    const eaux = ORDRE_CARTE.filter(eau);
    // The first cell whose glint the hash keeps (sparse glints), read off the full map.
    const gardes = [...couches("solid").values()].flatMap((v) => v.cases.map(String));
    const un = eaux.find((e) => e.type === "piece" && gardes.includes(String(e.piece.case)));
    if (un?.type !== "piece") throw new Error("no water piece");
    const couvrant: ElementCarte = { type: "figurine", piece: un.piece };
    const sans = [
      ...refletsPar([un, couvrant, ...eaux.filter((e) => e !== un)], () => false).values(),
    ];
    const avec = [
      ...refletsPar(
        [un, couvrant, ...eaux.filter((e) => e !== un)],
        (e) => e === couvrant,
      ).values(),
    ];
    expect(sans.flatMap((v) => v.cases)).toContainEqual(un.piece.case);
    expect(avec.flatMap((v) => v.cases)).not.toContainEqual(un.piece.case);
  });
});

describe("the glints are irregular (T22 round 3)", () => {
  test("sparse, off the centre line and of different lengths", () => {
    const cases = [...couches("solid").values()].flatMap((v) => v.cases);
    const eaux = ORDRE_CARTE.filter(eau).length;
    expect(cases.length).toBeLessThan(eaux * 0.7);
    const t = cases.map(traitReflet);
    expect(new Set(t.map((x) => x.long.toFixed(2))).size).toBeGreaterThan(3);
    expect(t.filter((x) => Math.abs(x.dx) > 0.04).length).toBeGreaterThan(2);
  });
});
