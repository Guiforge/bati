jest.mock("@/db/client", () => ({ db: {}, schema: {}, runMigrations: jest.fn() }));
jest.mock("@/components/village/iso/solBandes", () => ({
  BANDES_TERRAIN: {
    "11.t4-6": { jour: 460, nuit: 461 },
    "11.t10-12": { jour: 1012, nuit: 1013 },
    "21.t7-9": { jour: 790, nuit: 791 },
  },
}));

import { bandesJusqua, tuileTerre } from "@/components/village/iso/alentours";

const T11 = { r: 1, c: 1, jour: 1, nuit: 2 };
const T21 = { r: 2, c: 1, jour: 3, nuit: 4 };
const T00 = { r: 0, c: 0, jour: 5, nuit: 6 };

describe("the ground's tier bands (loupe BC, cuire_sol.py)", () => {
  test("a tier draws its band and the ones below, the highest first", () => {
    expect(bandesJusqua(1)).toEqual(["t1-3"]);
    expect(bandesJusqua(3)).toEqual(["t1-3"]);
    expect(bandesJusqua(4)).toEqual(["t4-6", "t1-3"]);
    expect(bandesJusqua(8)).toEqual(["t7-9", "t4-6", "t1-3"]);
    expect(bandesJusqua(12)).toEqual(["t10-12", "t7-9", "t4-6", "t1-3"]);
  });

  test("a chunk takes the highest variant at or under the tier, else the plain ground", () => {
    const choix = (t: typeof T11, p: number) => tuileTerre(t, p).jour;
    expect([1, 3, 4, 6, 7, 9, 10, 12].map((p) => choix(T11, p))).toEqual([
      1, 1, 460, 460, 460, 460, 1012, 1012,
    ]);
    expect([1, 6, 7, 12].map((p) => choix(T21, p))).toEqual([3, 3, 790, 790]);
    expect(choix(T00, 12)).toBe(5);
  });

  test("a tile never draws less as the village grows: its variant stays from the tier it first has it", () => {
    for (const t of [T11, T21, T00]) {
      let vu = false;
      for (let p = 1; p <= 12; p++) {
        const plain = tuileTerre(t, p).jour === t.jour;
        if (!plain) vu = true;
        expect(vu && plain).toBe(false);
      }
    }
  });
});
