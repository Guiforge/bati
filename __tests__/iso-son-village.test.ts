// T32: the village's volume rule and when it is silent. Pure.
import { centreBatiment, ecranXY, HAUTEUR, LARGEUR } from "@/components/village/iso/carteDemo";
import {
  fondDe,
  niveauxVillage,
  SILENCE,
  suivre,
  VOLUME_BATIMENT,
  VOLUME_FOND,
  volumeBatiment,
} from "@/components/village/iso/sonVillage";

const aire = { w: 400, h: 600 };
const carte = { largeur: LARGEUR, hauteur: HAUTEUR };
const centre = ecranXY(centreBatiment("forge"));
// A view with the building's centre in the middle of the area, at a zoom.
const surLeBatiment = (zoom: number) => ({
  zoom,
  x: -(centre[0] - LARGEUR / 2) * zoom,
  y: -(centre[1] - HAUTEUR / 2) * zoom,
});
const vol = (vue: { zoom: number; x: number; y: number }) =>
  volumeBatiment({ vue, zmin: 0.3, zmax: 1, centre, aire, carte });

describe("volumeBatiment", () => {
  it("is silent at the widest zoom, even centred", () => {
    expect(vol(surLeBatiment(0.3))).toBe(0);
  });
  it("is full at the closest zoom with the building in the middle", () => {
    expect(vol(surLeBatiment(1))).toBeCloseTo(VOLUME_BATIMENT, 5);
  });
  it("rises with the zoom", () => {
    expect(vol(surLeBatiment(0.8))).toBeGreaterThan(vol(surLeBatiment(0.5)));
  });
  it("falls as the building leaves the middle, and is silent off screen", () => {
    const v = surLeBatiment(1);
    expect(vol({ ...v, x: v.x + 100 })).toBeLessThan(vol(v));
    expect(vol({ ...v, x: v.x + 5000 })).toBe(0);
  });
});

describe("niveauxVillage", () => {
  const base = {
    soundEnabled: true,
    focus: true,
    premierPlan: true,
    fige: false,
    ambiance: "jour" as const,
    forge: 0.5,
    moulin: null,
  };
  it("picks the day or the night bed from the map's light", () => {
    expect(fondDe("jour")).toBe("jour");
    expect(fondDe("nuit")).toBe("nuit");
    expect(niveauxVillage(base)).toEqual({ jour: VOLUME_FOND, nuit: 0, forge: 0.5, moulin: 0 });
    expect(niveauxVillage({ ...base, ambiance: "nuit" })).toMatchObject({
      jour: 0,
      nuit: VOLUME_FOND,
    });
  });
  it.each([
    ["sound is off", { soundEnabled: false }],
    ["the tab is not on screen", { focus: false }],
    ["the app is in the background", { premierPlan: false }],
    ["the map is frozen", { fige: true }],
  ])("is silent when %s", (_, change) => {
    expect(niveauxVillage({ ...base, ...change })).toEqual(SILENCE);
  });
});

describe("suivre", () => {
  it("fades toward the target and stops on it", () => {
    expect(suivre(0, 0.35, 100)).toBeCloseTo(100 / 1200, 5);
    expect(suivre(0.34, 0.35, 1000)).toBe(0.35);
    expect(suivre(0.2, 0, 5000)).toBe(0);
  });
});
