import assert from "node:assert/strict";
import { type BuildingData, gagBeatAt, gagIsOneAtATime } from "@/constants/buildingData";
import { buildingCeiling, buildingStage } from "@/constants/buildingLevels";
import {
  BUILDING_STAGES_RULE,
  baseOf,
  buildingStageFor,
  DEEDS,
  type VisualStage,
} from "@/constants/buildingStages";
import { windmill } from "@/constants/buildings/windmill";
import { type BuildingCode, buildingCodes, buildingDefinitions } from "@/db/schema";

const UPGRADES = buildingCodes.filter((c) => buildingDefinitions[c].tier === 3);
const TEN = buildingCodes.filter(
  (c) => !UPGRADES.includes(c) && !(DEEDS as readonly string[]).includes(c),
);
const order: readonly VisualStage[] = ["rough", "solid", "grand", "legendary", "mythic"];
const at = (s: VisualStage) => order.indexOf(s);

// Frozen literals of today's mapping (buildingStage, tier 3 clamped to solid), ranks 0 to 10.
// biome-ignore format: one rank per column
const OLD_TEN_AND_DEEDS: VisualStage[] = ["rough", "rough", "rough", "solid", "solid", "grand", "grand", "grand", "grand", "grand", "grand"];
// biome-ignore format: one rank per column
const OLD_UPGRADES: VisualStage[] = ["rough", "rough", "rough", "solid", "solid", "solid", "solid", "solid", "solid", "solid", "solid"];
const oldOf = (c: BuildingCode, r: number) =>
  (UPGRADES.includes(c) ? OLD_UPGRADES : OLD_TEN_AND_DEEDS)[r];

describe("building stage table (PROMPT.md section 6)", () => {
  test("the families have the sizes the prompt counts", () => {
    expect(TEN).toHaveLength(12);
    expect(UPGRADES).toHaveLength(6);
    expect(DEEDS).toHaveLength(3);
  });

  test("the flag defaults to the old mapping", () => {
    expect(BUILDING_STAGES_RULE).toBe("old");
  });

  test("every upgrade is paired with its real base", () => {
    expect(UPGRADES.map(baseOf)).toEqual([
      "archery_range",
      "quarry",
      "forge",
      "well",
      "windmill",
      "farm",
    ]);
    expect(baseOf("forge")).toBeNull();
  });

  test.each(["A", "B"] as const)("ten-rank buildings, rule %s", (rule) => {
    const got = Array.from({ length: 11 }, (_, r) => buildingStageFor("forge", r, 0, rule));
    expect(got).toEqual([
      "rough",
      "rough",
      "rough",
      "solid",
      "solid",
      "grand",
      "grand",
      "legendary",
      "legendary",
      "legendary",
      "mythic",
    ]);
  });

  test("deeds", () => {
    const got = Array.from({ length: 6 }, (_, r) => buildingStageFor("heroes_hall", r, 0, "A"));
    expect(got).toEqual(["rough", "rough", "rough", "solid", "grand", "mythic"]);
  });

  test("upgrades, rule A: own rank only, capped at 3", () => {
    const got = Array.from({ length: 6 }, (_, r) => buildingStageFor("armory", r, 10, "A"));
    expect(got).toEqual(["rough", "rough", "solid", "grand", "grand", "grand"]);
  });

  test("upgrades, rule B: own rank, then the base rank", () => {
    const f = (own: number, base: number) => buildingStageFor("observatory", own, base, "B");
    expect([f(1, 10), f(2, 10)]).toEqual(["rough", "solid"]);
    expect([f(3, 5), f(3, 6), f(3, 7), f(3, 9), f(3, 10)]).toEqual([
      "grand",
      "grand",
      "legendary",
      "legendary",
      "mythic",
    ]);
    expect(f(9, 10)).toBe("mythic"); // own rank past 3 counts as 3
  });

  test("old mapping literal equals buildingStage and the tier-3 clamp", () => {
    for (let r = 0; r <= 10; r++) {
      expect(OLD_TEN_AND_DEEDS[r]).toBe(buildingStage(r));
      expect(OLD_UPGRADES[r]).toBe(buildingStage(r) === "grand" ? "solid" : buildingStage(r));
    }
  });

  test("flag off returns exactly the old mapping for every building and rank", () => {
    for (const c of buildingCodes)
      for (let r = 0; r <= 10; r++) {
        expect(buildingStageFor(c, r, 10)).toBe(oldOf(c, r));
        expect(buildingStageFor(c, r, 10, "old")).toBe(oldOf(c, r));
      }
  });

  test("monotonic: no building, rank or rule shows a lower stage than before", () => {
    for (const rule of ["A", "B"] as const)
      for (const c of buildingCodes)
        for (let r = 0; r <= 10; r++)
          for (const base of [0, 3, 7, 10]) {
            const now = buildingStageFor(c, r, base, rule);
            const old = oldOf(c, r);
            assert(old);
            expect([c, r, base, rule, at(now) >= at(old)]).toEqual([c, r, base, rule, true]);
          }
  });

  test("rank 0 is rough and ranks past a ceiling count as the ceiling", () => {
    for (const rule of ["old", "A", "B"] as const)
      for (const c of buildingCodes) {
        expect(buildingStageFor(c, 0, 10, rule)).toBe("rough");
        const top = buildingCeiling({ tier: buildingDefinitions[c].tier, code: c });
        expect(buildingStageFor(c, 99, 10, rule)).toBe(
          rule === "old" ? oldOf(c, 10) : buildingStageFor(c, top, 10, rule),
        );
      }
  });

  test("the rank thresholds are untouched", () => {
    expect(buildingCeiling({ tier: 3, code: "armory" })).toBe(3);
    expect(buildingCeiling({ tier: 4, code: "dragon_lair" })).toBe(5);
    expect(buildingCeiling({ tier: 4, code: "high_road" })).toBe(10);
    expect(buildingCeiling({ tier: 2, code: "forge" })).toBe(10);
  });
});

describe("per-building data", () => {
  const beats = (...ranks: number[]): BuildingData => ({
    ...windmill,
    gag: { slot: [0, 0], beats: ranks.map((rank) => ({ rank, beat: `b${rank}`, sprite: null })) },
  });

  test("the windmill is painted now: not a placeholder, a valid gag shape, no beat before rank 2", () => {
    expect(windmill.code).toBe("windmill");
    expect(windmill.placeholder).toBe(false);
    expect(gagIsOneAtATime(windmill)).toBe(true);
    expect(gagBeatAt(windmill, 1)).toBeNull();
  });

  test("the gag slot shows one beat at a time, each replacing the last", () => {
    const d = beats(2, 4, 7);
    expect(gagIsOneAtATime(d)).toBe(true);
    expect([1, 2, 3, 4, 9].map((r) => gagBeatAt(d, r)?.beat ?? null)).toEqual([
      null,
      "b2",
      "b2",
      "b4",
      "b7",
    ]);
  });

  test("two beats on one rank, or out of order, break the shape", () => {
    expect(gagIsOneAtATime(beats(2, 2))).toBe(false);
    expect(gagIsOneAtATime(beats(4, 2))).toBe(false);
  });
});
