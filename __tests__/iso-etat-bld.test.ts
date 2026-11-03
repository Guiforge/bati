import { etatSeul } from "@/components/village/iso/carteDemo";
import { etatBldDe } from "@/components/village/iso/etatBld";

describe("etatBldDe (?bld= capture states of the buildings track)", () => {
  test("a building at a rank, alone on the tier-12 island", () => {
    expect(etatBldDe({ bld: "forge", rang: "5" })).toEqual({
      code: "forge",
      rang: 5,
      base: undefined,
      avant: 4,
      avantBase: undefined,
      show: undefined,
      delai: 1.5,
      palier: 12,
      semaine: false,
    });
  });

  test("an upgrade as (own rank, base rank), and a show from a given rank", () => {
    const e = etatBldDe({
      bld: "armory",
      rang: "3",
      base: "7",
      avantbase: "6",
      show: "rang",
      avant: "2",
    });
    expect(e).toMatchObject({ rang: 3, base: 7, avantBase: 6, show: "rang", avant: 2 });
    // a base-driven show keeps the upgrade's own rank; without avantbase avant stays below rang
    expect(
      etatBldDe({ bld: "armory", rang: "3", avant: "3", base: "7", avantbase: "6" })?.avant,
    ).toBe(3);
    expect(etatBldDe({ bld: "armory", rang: "3", avant: "3" })?.avant).toBe(2);
  });

  test("the first week takes the tier from 1 to 3 and never more", () => {
    expect(etatBldDe({ bld: "tent", rang: "2", semaine: "1", palier: "9" })?.palier).toBe(3);
    expect(etatBldDe({ bld: "tent", rang: "2", semaine: "1" })?.palier).toBe(1);
  });

  test("delai= is the show's start in seconds, 1.5 when absent or not a number from 0 to 60", () => {
    expect(etatBldDe({ bld: "forge", rang: "5", delai: "8" })?.delai).toBe(8);
    expect(etatBldDe({ bld: "forge", rang: "5", delai: "0.5" })?.delai).toBe(0.5);
    for (const v of [undefined, "", "x", "-2", "61"])
      expect(etatBldDe({ bld: "forge", rang: "5", delai: v })?.delai).toBe(1.5);
  });

  test("a building alone has its plot and two cells round it, the same for every rank", () => {
    const { visible, montres } = etatSeul("windmill");
    expect(montres).toContain("windmill");
    expect(visible.flat().filter(Boolean).length).toBeLessThan(80);
  });

  test("an unknown building, a missing rank or a rank above the ceiling opens nothing", () => {
    expect(etatBldDe({ bld: "castle", rang: "1" })).toBeNull();
    expect(etatBldDe({ bld: "forge" })).toBeNull();
    expect(etatBldDe({ bld: "forge", rang: "11" })).toBeNull();
    expect(etatBldDe({ bld: "armory", rang: "4" })).toBeNull();
    expect(etatBldDe({ bld: "forge", rang: "0" })).toBeNull();
  });
});
