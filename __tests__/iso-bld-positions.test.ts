// The positions of the 21 painted buildings (constants/buildings/<code>.ts hand blocks): what a pass over the paintings fixes.
// The dp scale: a 2 x 2 building is a 768 px diamond on its canvas and 96 to 192 dp on screen (PROMPT.md section 7), so at the
// farthest zoom 1 dp is 8 canvas px. A gag must keep 10 dp and a teaser 16 dp there.

import { archery_range as archery_rangeS } from "@/components/village/iso/peints/archery_range";
import { armory as armoryS } from "@/components/village/iso/peints/armory";
import { barn as barnS } from "@/components/village/iso/peints/barn";
import { campfire as campfireS } from "@/components/village/iso/peints/campfire";
import { castle_wall as castle_wallS } from "@/components/village/iso/peints/castle_wall";
import { champion_arena as champion_arenaS } from "@/components/village/iso/peints/champion_arena";
import { dragon_lair as dragon_lairS } from "@/components/village/iso/peints/dragon_lair";
import { druid_grove as druid_groveS } from "@/components/village/iso/peints/druid_grove";
import { farm as farmS } from "@/components/village/iso/peints/farm";
import { forge as forgeS } from "@/components/village/iso/peints/forge";
import { fountain as fountainS } from "@/components/village/iso/peints/fountain";
import { heroes_hall as heroes_hallS } from "@/components/village/iso/peints/heroes_hall";
import { high_road as high_roadS } from "@/components/village/iso/peints/high_road";
import { observatory as observatoryS } from "@/components/village/iso/peints/observatory";
import { quarry as quarryS } from "@/components/village/iso/peints/quarry";
import { tent as tentS } from "@/components/village/iso/peints/tent";
import { training_dummy as training_dummyS } from "@/components/village/iso/peints/training_dummy";
import { watchtower as watchtowerS } from "@/components/village/iso/peints/watchtower";
import { well as wellS } from "@/components/village/iso/peints/well";
import { windmill as windmillS } from "@/components/village/iso/peints/windmill";
import { wizard_tower as wizard_towerS } from "@/components/village/iso/peints/wizard_tower";
import type { BuildingData } from "@/constants/buildingData";
import { archery_range } from "@/constants/buildings/archery_range";
import { armory } from "@/constants/buildings/armory";
import { barn } from "@/constants/buildings/barn";
import { campfire } from "@/constants/buildings/campfire";
import { castle_wall } from "@/constants/buildings/castle_wall";
import { champion_arena } from "@/constants/buildings/champion_arena";
import { dragon_lair } from "@/constants/buildings/dragon_lair";
import { druid_grove } from "@/constants/buildings/druid_grove";
import { farm } from "@/constants/buildings/farm";
import { forge } from "@/constants/buildings/forge";
import { fountain } from "@/constants/buildings/fountain";
import { heroes_hall } from "@/constants/buildings/heroes_hall";
import { high_road } from "@/constants/buildings/high_road";
import { observatory } from "@/constants/buildings/observatory";
import { quarry } from "@/constants/buildings/quarry";
import { tent } from "@/constants/buildings/tent";
import { training_dummy } from "@/constants/buildings/training_dummy";
import { watchtower } from "@/constants/buildings/watchtower";
import { well } from "@/constants/buildings/well";
import { windmill } from "@/constants/buildings/windmill";
import { wizard_tower } from "@/constants/buildings/wizard_tower";

const PX_PAR_DP = 768 / 96;
const GAG_MIN_PX = 10 * PX_PAR_DP;
const TEASER_MIN_PX = 16 * PX_PAR_DP;

type Point = readonly [number, number];
type Sprites = {
  stades: Record<string, { jour: { size: Point; anchor: Point; ailes?: { pivot: Point } } }>;
  elements: Record<string, { size: Point }>;
};

const TOUS: readonly (readonly [string, BuildingData, Sprites])[] = [
  ["archery_range", archery_range, archery_rangeS],
  ["armory", armory, armoryS],
  ["barn", barn, barnS],
  ["campfire", campfire, campfireS],
  ["castle_wall", castle_wall, castle_wallS],
  ["champion_arena", champion_arena, champion_arenaS],
  ["dragon_lair", dragon_lair, dragon_lairS],
  ["druid_grove", druid_grove, druid_groveS],
  ["farm", farm, farmS],
  ["forge", forge, forgeS],
  ["fountain", fountain, fountainS],
  ["heroes_hall", heroes_hall, heroes_hallS],
  ["high_road", high_road, high_roadS],
  ["observatory", observatory, observatoryS],
  ["quarry", quarry, quarryS],
  ["tent", tent, tentS],
  ["training_dummy", training_dummy, training_dummyS],
  ["watchtower", watchtower, watchtowerS],
  ["well", well, wellS],
  ["windmill", windmill, windmillS],
  ["wizard_tower", wizard_tower, wizard_towerS],
];

describe.each(TOUS)("%s: positions", (code, data, sprites) => {
  const rough = sprites.stades.rough?.jour;
  const [W, H] = rough?.size ?? [0, 0];
  // The nominal ground line (canvas bottom minus 64): the stage anchors sit on each painting's own foot.
  const ax = rough?.anchor[0] ?? 0;
  const ay = H - 64;
  const dedans = (x: number, y: number) => x >= 0 && x <= W && y >= 0 && y <= H;

  test("the gag stands in the canvas, at or above the ground line, at 10 dp at least", () => {
    expect(data.gag.slot).not.toBeNull();
    for (const b of data.gag.beats) {
      const e = sprites.elements[b.sprite ?? ""];
      expect(e).toBeDefined();
      const [w, h] = e?.size ?? [0, 0];
      expect(Math.max(w, h)).toBeGreaterThanOrEqual(GAG_MIN_PX);
      const [x, y] = b.at ?? data.gag.slot ?? [0, 0];
      expect(dedans(x - w / 2, y - h)).toBe(true);
      expect(dedans(x + w / 2, y)).toBe(true);
      expect(y).toBeLessThanOrEqual(ay + 8);
    }
  });

  test("the teaser stands in the canvas, at 16 dp at least", () => {
    for (const t of data.teasers ?? []) {
      const e = sprites.elements[t.sprite ?? ""];
      expect(e).toBeDefined();
      const [w, h] = e?.size ?? [0, 0];
      expect(Math.max(w, h)).toBeGreaterThanOrEqual(TEASER_MIN_PX);
      const x = ax + t.anchorOffset[0];
      const y = ay + t.anchorOffset[1];
      expect(dedans(x - w / 2, y - h)).toBe(true);
      expect(dedans(x + w / 2, y)).toBe(true);
      expect(y).toBeLessThanOrEqual(ay + 8);
    }
  });

  test("lights and anchors sit on the canvas, and none is the old fallback fire above the anchor", () => {
    for (const p of [...data.lights, ...(data.ancres ?? [])])
      expect(dedans(p.at[0], p.at[1])).toBe(true);
    for (const l of data.lights) {
      expect(Math.abs(l.at[0] - ax) < 4 && Math.abs(l.at[1] - (ay - 100)) < 4).toBe(false);
    }
  });

  test("a light shows from the stage where the painting lights it: only the campfire burns from rank 1", () => {
    for (const l of code === "campfire" ? [] : data.lights) expect(l.fromRank).toBeGreaterThan(1);
  });
});

describe("windmill: the sails turn about the axle's tip", () => {
  // Measured on the paintings (the end of the axle; the disc on the roof for the two first stages), canvas px.
  const MOYEUX = {
    rough: [407, 739],
    solid: [399, 606],
    grand: [367, 600],
    legendary: [361, 481],
    mythic: [351, 392],
  } as const;
  test.each(Object.entries(MOYEUX))("%s", (stade, hub) => {
    expect(windmillS.stades[stade as keyof typeof windmillS.stades]?.jour.ailes?.pivot).toEqual(
      hub,
    );
  });
});
