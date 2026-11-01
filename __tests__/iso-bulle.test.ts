// The iso bubble's pure rules (T14, docs/design/components/village-bulle.md): placement, the sheet
// beyond 130 %, what a further tap does, and where the tail aims.

import {
  apresTap,
  etatBulle,
  HAUTEUR_BARRE,
  hauteurMaxBulle,
  largeurBulle,
  type Ouverture,
  placerBulle,
  QUEUE_BULLE,
} from "@/components/village/iso/bulle";
import { HAUTEUR, LARGEUR } from "@/components/village/iso/carteDemo";
import { carteDepuisEcran, ecranDepuisCarte } from "@/components/village/iso/navigation";
import {
  ancreBatiment,
  type Cible,
  hautMasque,
  type Masque,
} from "@/components/village/iso/tapBatiment";

jest.mock("@/db/client", () => ({ db: {}, schema: {}, runMigrations: jest.fn() }));

const ECRAN = { w: 360, h: 640 };
const INSETS = { top: 24, bottom: 16, left: 0, right: 0 };
const TAILLE = { w: 300, h: 200 };
const placer = (ancre: [number, number], over: Partial<Parameters<typeof placerBulle>[0]> = {}) =>
  placerBulle({ ancre, taille: TAILLE, ecran: ECRAN, insets: INSETS, fontScale: 1, ...over });

describe("placerBulle", () => {
  it("opens above the anchor, the tail's point on it", () => {
    const p = placer([180, 400]);
    expect(p).toEqual({
      mode: "bulle",
      x: 30,
      y: 400 - QUEUE_BULLE - 200,
      cote: "haut",
      queueX: 150,
    });
  });

  it("opens below when the room above is short of the bubble and its tail", () => {
    const p = placer([180, 150]);
    expect(p.mode === "bulle" && [p.cote, p.y]).toEqual(["bas", 150 + QUEUE_BULLE]);
  });

  it("is held in the safe area with an 8 dp margin; the tail follows the anchor, inside the corners", () => {
    const gauche = placer([10, 400]);
    expect(gauche.mode === "bulle" && [gauche.x, gauche.queueX]).toEqual([8, 12]);
    const droite = placer([355, 400], { insets: { ...INSETS, right: 20 } });
    expect(droite.mode === "bulle" && droite.x + TAILLE.w).toBe(360 - 20 - 8);
    expect(droite.mode === "bulle" && droite.queueX).toBe(TAILLE.w - 12);
  });

  it("never leaves the screen: an anchor off it is held on it first", () => {
    for (const ancre of [
      [-50, 400],
      [500, 900],
      [180, -20],
    ] as [number, number][]) {
      const p = placer(ancre);
      if (p.mode !== "bulle") continue;
      expect(p.x).toBeGreaterThanOrEqual(8);
      expect(p.x + TAILLE.w).toBeLessThanOrEqual(352);
      expect(p.y).toBeGreaterThanOrEqual(INSETS.top + 8);
      expect(p.y + TAILLE.h).toBeLessThanOrEqual(ECRAN.h - INSETS.bottom - 8);
    }
  });

  it("is the bottom sheet beyond 130 % text, or with no room", () => {
    expect(placer([180, 400], { fontScale: 1.31 }).mode).toBe("feuille");
    expect(placer([180, 400], { fontScale: 1.3 }).mode).toBe("bulle");
    // Landscape, 360 dp high: a 200 dp bubble fits neither above nor below a middle anchor.
    expect(placer([300, 180], { ecran: { w: 740, h: 360 } }).mode).toBe("feuille");
  });

  it("holds the frame under the room one side of the anchor always has, bar included", () => {
    const h = hauteurMaxBulle(ECRAN.h, { ...INSETS, bottom: INSETS.bottom + HAUTEUR_BARRE });
    expect(h).toBeGreaterThan(0);
    for (const y of [60, ECRAN.h / 2, ECRAN.h - 100]) {
      expect(placer([180, y], { taille: { w: 300, h } }).mode).toBe("bulle");
    }
  });

  it("stays whole in the window at every anchor, portrait and landscape, or is the sheet", () => {
    for (const ecran of [ECRAN, { w: 740, h: 360 }]) {
      const insets = { top: 24, bottom: 16 + HAUTEUR_BARRE, left: 24, right: 24 };
      const w = largeurBulle(ecran.w);
      const h = hauteurMaxBulle(ecran.h, insets);
      for (let x = -20; x <= ecran.w + 20; x += 20) {
        for (let y = -20; y <= ecran.h + 20; y += 20) {
          const p = placerBulle({
            ancre: [x, y],
            taille: { w, h },
            ecran,
            insets,
            fontScale: 1,
          });
          if (p.mode !== "bulle") continue;
          expect(p.x).toBeGreaterThanOrEqual(insets.left + 8);
          expect(p.x + w).toBeLessThanOrEqual(ecran.w - insets.right - 8);
          expect(p.y).toBeGreaterThanOrEqual(insets.top + 8);
          expect(p.y + h).toBeLessThanOrEqual(ecran.h - insets.bottom - 8);
        }
      }
    }
  });

  it("is 320 dp wide at most,the window less 32 dp on a narrow one", () => {
    expect(largeurBulle(400)).toBe(320);
    expect(largeurBulle(320)).toBe(288);
  });
});

describe("etatBulle", () => {
  const o: Ouverture = { cible: { type: "batiment", code: "forge" }, ancre: [180, 400] };
  const ecran = { ...ECRAN, fontScale: 1 };

  it("waits hidden for its size, then is placed", () => {
    expect(etatBulle(o, null, ecran, INSETS)).toEqual({ feuille: false, placee: null });
    expect(etatBulle(o, TAILLE, ecran, INSETS).placee?.cote).toBe("haut");
    expect(etatBulle(null, TAILLE, ecran, INSETS)).toEqual({ feuille: false, placee: null });
  });

  it("goes to the sheet at once beyond 130 %, before any measure (read live)", () => {
    expect(etatBulle(o, null, { ...ecran, fontScale: 2 }, INSETS).feuille).toBe(true);
  });
});

describe("apresTap", () => {
  const forge: Ouverture = { cible: { type: "batiment", code: "forge" }, ancre: [1, 2] };
  const puits: Ouverture = { cible: { type: "batiment", code: "well" }, ancre: [3, 4] };

  it("the same element closes, another replaces, nothing closes", () => {
    expect(apresTap(forge, { ...forge, ancre: [9, 9] })).toBeNull();
    expect(apresTap(forge, puits)).toBe(puits);
    expect(apresTap(forge, null)).toBeNull();
    expect(apresTap(null, forge)).toBe(forge);
  });
});

describe("where the tail aims", () => {
  // 8 x 4 cells of 2 px; set: row 1 cols 2..5, row 2 cols 1..6.
  const masque: Masque = { pas: 2, w: 8, h: 4, bits: "003C7E00" };

  it("the top centre of the mask's box, in sprite px", () => {
    expect(hautMasque(masque)).toEqual([8, 2]);
    expect(hautMasque({ pas: 2, w: 8, h: 4, bits: "00000000" })).toEqual([8, 0]);
  });

  it("scaled onto the sprite's rectangle on the map", () => {
    const cible: Cible = {
      code: "forge",
      rect: { x: 100, y: 50, w: 32, h: 16 },
      taille: [16, 8],
      masque,
    };
    expect(ancreBatiment("forge", [cible])).toEqual([116, 54]);
    expect(ancreBatiment("well", [cible])).toBeNull();
  });

  it("projects back to the area exactly where a tap there reads it", () => {
    const v = { zoom: 1.7, x: -40, y: 25 };
    const aire = { w: 390, h: 500 };
    const carte = { largeur: LARGEUR, hauteur: HAUTEUR };
    const p: [number, number] = [612, 431];
    const [x, y] = ecranDepuisCarte(p, v, aire, carte);
    const retour = carteDepuisEcran([x, y], v, aire, carte);
    expect(retour[0]).toBeCloseTo(p[0]);
    expect(retour[1]).toBeCloseTo(p[1]);
  });
});
