// L6-T21: the iso map's place in the village tab, and the view it keeps when the area turns.
import {
  aireDepuisFenetre,
  colonneLibre,
  colonneOnglets,
  dispositionIso,
  HAUTEUR_BANDEAU,
} from "@/components/village/iso/disposition";
import { type Limites, ramener, vueApresRedimension } from "@/components/village/iso/navigation";

const limites = (w: number, h: number): Limites => ({
  ile: { x0: -300, x1: 300, y0: -200, y1: 200 },
  w,
  h,
  zmin: 0.5,
  zmax: 3,
});

describe("dispositionIso", () => {
  it("portrait: the map is the whole page less the drawer's strip", () => {
    expect(dispositionIso(393, 790)).toEqual({
      paysage: false,
      carteW: 393,
      carteH: 790 - HAUTEUR_BANDEAU,
    });
  });
  it("landscape: the map takes the whole width too, the list is in the drawer", () => {
    expect(dispositionIso(850, 330)).toEqual({
      paysage: true,
      carteW: 850,
      carteH: 330 - HAUTEUR_BANDEAU,
    });
  });
  it("a square or tiny area stays portrait and never goes negative", () => {
    expect(dispositionIso(50, 50)).toEqual({ paysage: false, carteW: 50, carteH: 0 });
  });
});

describe("aireDepuisFenetre", () => {
  it("is the window less the tab bar, so the first layout after a turn is the measured one", () => {
    // 393 x 852 window, 34 dp inset: the bar takes 60 + 34.
    expect(aireDepuisFenetre(393, 852, 60, 34)).toEqual({ w: 393, h: 758 });
    expect(dispositionIso(393, 758)).toEqual(dispositionIso(393, 852 - 94));
    // The turn flips the disposition at once and never goes negative.
    const tournee = aireDepuisFenetre(852, 393, 60, 0);
    expect(dispositionIso(tournee.w, tournee.h).paysage).toBe(true);
    expect(aireDepuisFenetre(50, 50, 60, 0).h).toBe(0);
  });
});

describe("vueApresRedimension", () => {
  const ancien = { zoom: 1, x: 0, y: -20 };
  const nouveau = { zoom: 0.7, x: 0, y: 0 };
  it("an untouched view takes the new framing", () => {
    expect(vueApresRedimension({ ...ancien, x: 0.2 }, ancien, nouveau, limites(500, 300))).toEqual(
      nouveau,
    );
  });
  it("a moved view keeps its point and zoom when they fit the new area", () => {
    const v = { zoom: 1.5, x: 40, y: 30 };
    expect(vueApresRedimension(v, ancien, nouveau, limites(500, 300))).toEqual(v);
  });
  it("a moved view is held inside the new limits", () => {
    const v = { zoom: 5, x: 4000, y: 0 };
    const l = limites(500, 300);
    const r = vueApresRedimension(v, ancien, nouveau, l);
    expect(r).toEqual(ramener(v, l));
    expect(r.zoom).toBe(3);
    expect(r.x).toBeLessThan(4000);
  });
});

describe("colonneLibre and colonneOnglets", () => {
  it("leaves the column to the tab group only, and only with the flag on", () => {
    expect(colonneLibre("(tabs)", true)).toBe(true);
    expect(colonneLibre("(tabs)", false)).toBe(false);
    expect(colonneLibre("settings", true)).toBe(false);
    expect(colonneLibre("session", true)).toBe(false);
  });
  it("gives the tabs the same column back with the flag on, nothing with it off", () => {
    expect(colonneOnglets(true, 520)).toEqual({
      width: "100%",
      maxWidth: 520,
      alignSelf: "center",
    });
    expect(colonneOnglets(false, 520)).toBeUndefined();
  });
});
