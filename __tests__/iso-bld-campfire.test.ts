// The painted campfire (docs/designs/village-buildings, step E.5): its data through the engine's
// pure reader, its registry, and the proof that with its flag off the map is the one of today.
import { etatBatiment } from "@/components/village/iso/batiment";
import { spriteDe } from "@/components/village/iso/carteDemo";
import { DONNEES_BLD } from "@/components/village/iso/donneesBld";
import { MAQUETTES } from "@/components/village/iso/maquettes";
import { PEINTS } from "@/components/village/iso/peints";
import { campfire as sprites } from "@/components/village/iso/peints/campfire";
import { gagIsOneAtATime } from "@/constants/buildingData";
import { campfire } from "@/constants/buildings/campfire";
import { BLD_PEINTS } from "@/constants/isoPoc";

const RANGS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
const etat = (r: number, nuit = false) => etatBatiment(campfire, r, { nuit, rule: "B" });

describe("the campfire flag is off by default", () => {
  test("flag off: no painted entry, no engine data, the map's own sprite", () => {
    expect(BLD_PEINTS.campfire).toBe(false);
    expect(PEINTS.campfire).toBeUndefined();
    expect(DONNEES_BLD.campfire).toBeUndefined();
    expect(spriteDe("campfire", "rough", "jour")).toBe(MAQUETTES["campfire/rough.jour.webp"]);
  });
});

describe("the campfire's data", () => {
  test("stages follow the ten-rank ladder, five painted stages on one canvas", () => {
    expect(RANGS.map((r) => etat(r).stage)).toEqual([
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
    const tailles = Object.values(sprites.stades).flatMap((s) => [s.jour.size, s.nuit.size]);
    expect(new Set(tailles.map((t) => t.join("x"))).size).toBe(1);
    expect(Object.keys(sprites.stades)).toHaveLength(5);
  });

  test("a teaser from rank 2, one at a time, gone at the next stage's rank; the gag holds one beat", () => {
    expect(RANGS.map((r) => etat(r).teaser?.sprite ?? null)).toEqual([
      null,
      "elements/teaser_r2",
      null,
      "elements/teaser_r4",
      null,
      "elements/teaser_r6",
      null,
      "elements/teaser_r8",
      "elements/teaser_r9",
      null,
    ]);
    expect(gagIsOneAtATime(campfire)).toBe(true);
    expect(etat(10).gag?.sprite).toBe("elements/gag_10");
  });

  test("every sprite the data names is in the registry, and nobody is painted", () => {
    const noms = [
      ...(campfire.teasers ?? []).map((t) => t.sprite),
      ...campfire.gag.beats.map((b) => b.sprite),
    ];
    for (const n of noms) expect(sprites.elements[n ?? ""]).toBeDefined();
    expect(campfire.guardian).toBeUndefined();
    expect(etat(10).gardien).toBeNull();
  });

  test("the fire is a night light, the smoke and the magic are posed anchors", () => {
    expect(etat(5).lights).toEqual([]);
    expect(etat(5, true).lights.map((l) => l.kind)).toEqual(["fire"]);
    expect((campfire.ancres ?? []).map((a) => a.kind)).toEqual(["smoke", "magic"]);
  });

  test("the measure fits the canvas and the contact stays inside the cell", () => {
    const [, hauteur] = sprites.stades.rough?.jour.size ?? [0, 0];
    expect(campfire.mesure?.sommet).toBeGreaterThanOrEqual(0);
    expect(campfire.mesure?.sommet).toBeLessThan(hauteur);
    for (const [x = 9, y = 9] of campfire.mesure?.contact ?? [])
      expect([x, y].every((v) => v >= 0 && v <= 1)).toBe(true);
  });
});
