// H0-06 (T40): a talking pair is drawn between its two cells, so it sorts as the box of both.

import type { Habitant } from "@/components/village/iso/habitants";
import { empriseHabitant } from "@/components/village/iso/habitants";

jest.mock("expo-router", () => ({ useIsFocused: () => true }));
jest.mock("@/hooks/useReducedMotion", () => ({ useReducedMotion: () => false }));

const hab = (id: string, cellule: [number, number], extra: Partial<Habitant> = {}) =>
  ({ id, cellule, ...extra }) as Habitant;

describe("empriseHabitant", () => {
  test("a lone villager keeps its one cell", () => {
    expect(empriseHabitant(hab("a", [3, 4]))).toEqual({ coin: [3, 4], emprise: [1, 1] });
  });
  test("the pair sorts as the box of its two cells", () => {
    const a = hab("a", [5, 2], { avec: "b" });
    const b = hab("b", [4, 3], { compagnon: true });
    expect(empriseHabitant(a, b)).toEqual({ coin: [4, 2], emprise: [2, 2] });
  });
  test("the companion keeps its own cell", () => {
    const a = hab("a", [5, 2], { avec: "b" });
    const b = hab("b", [4, 3], { compagnon: true, avec: "a" });
    expect(empriseHabitant(b, a)).toEqual({ coin: [4, 3], emprise: [1, 1] });
  });
});
