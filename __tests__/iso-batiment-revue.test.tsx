// The engine after the tech review (docs/designs/village-buildings): the z-order, the data's new
// fields, and the sizes on the real canvas. The growth moment is not the engine's (IsoCroissance).
import "react-native-gesture-handler/jestSetup";
import { configure, render, screen } from "@testing-library/react-native";
import { StyleSheet, View } from "react-native";
import { BatimentMoteur } from "@/components/village/iso/BatimentMoteur";
import { etatBatiment } from "@/components/village/iso/batiment";
import { FORMES_GRAIN } from "@/components/village/iso/effets";
import {
  angleAnneau,
  MARQUES_GLYPHE,
  PERIODE_EXTERIEUR_MS,
  PERIODE_INTERIEUR_MS,
  souffleZone,
} from "@/components/village/iso/magie";
import { ailesAuRang, type BuildingData, gagBeatAt, rangsDeBase } from "@/constants/buildingData";
import { batimentEssai as essai } from "@/constants/buildings/essai";

jest.mock("react-native-worklets", () => ({
  ...jest.requireActual("react-native-worklets"),
  getUIRuntimeHolder: () => ({}),
}));
jest.mock("@/db/client", () => ({ db: {}, schema: {}, runMigrations: jest.fn() }));
jest.mock("@/hooks/useReducedMotion", () => ({ useReducedMotion: () => false }));

configure({ defaultIncludeHiddenElements: true });

const rule = "B" as const;
// The real canvas of the windmill, 896 x 1344 px, at 1/8 dp a px.
const BOITE = { x: 0, y: 0, w: 112, h: 168 };

const base = (extra: Partial<BuildingData>): BuildingData => ({
  code: "watchtower",
  placeholder: true,
  addOns: [],
  gag: { slot: null, beats: [] },
  lights: [],
  clanMark: [10, 10],
  ...extra,
});

describe("the data's new fields", () => {
  it("every element goes through one test: its rank, and its base when it names one", () => {
    const d = base({
      addOns: [
        { rank: 1, sprite: null, anchorOffset: [0, 0], layer: "front", animation: null },
        {
          rank: 1,
          fromBase: 7,
          sprite: null,
          anchorOffset: [0, 0],
          layer: "front",
          animation: null,
        },
      ],
      teasers: [{ fromRank: 1, untilRank: 3, fromBase: 7, sprite: null, anchorOffset: [0, 0] }],
      lights: [{ kind: "fire", at: [0, 0], fromRank: 1, fromBase: 7 }],
      nightSprites: [{ fromRank: 1, fromBase: 7, sprite: null, anchorOffset: [0, 0] }],
      guardian: { fromRank: 1, fromBase: 7, at: [0, 0], sprite: null },
      gag: { slot: [0, 0], beats: [{ rank: 1, fromBase: 7, beat: "x", sprite: null }] },
    });
    const bas = etatBatiment(d, 2, { baseRank: 6, nuit: true, rule });
    expect(bas.addOns).toHaveLength(1);
    expect(bas.teaser).toBeNull();
    expect(bas.lights).toEqual([]);
    expect(bas.nightSprite).toBeNull();
    expect(bas.gardien).toBeNull();
    expect(bas.gag).toBeNull();
    const haut = etatBatiment(d, 2, { baseRank: 7, nuit: true, rule });
    expect(haut.addOns).toHaveLength(2);
    expect(haut.teaser).not.toBeNull();
    expect(haut.lights).toHaveLength(1);
    expect(haut.nightSprite).not.toBeNull();
    expect(haut.gardien).not.toBeNull();
    expect(haut.gag?.beat).toBe("x");
    // The beat reads the base too when asked, and not when it is not.
    expect(gagBeatAt(d, 2, 6)).toBeNull();
    expect(gagBeatAt(d, 2)?.beat).toBe("x");
  });

  it("an add-on with an untilRank leaves when the bigger piece takes over", () => {
    const d = base({
      addOns: [
        {
          rank: 2,
          untilRank: 5,
          sprite: null,
          anchorOffset: [0, 0],
          layer: "front",
          animation: null,
        },
        { rank: 5, sprite: null, anchorOffset: [0, 0], layer: "front", animation: null },
      ],
    });
    expect(etatBatiment(d, 4).addOns.map((a) => a.rank)).toEqual([2]);
    expect(etatBatiment(d, 5).addOns.map((a) => a.rank)).toEqual([5]);
  });

  it("a light flagged parJour stands by day, the others at night only", () => {
    const d = base({
      lights: [
        { kind: "fire", at: [0, 0], fromRank: 1 },
        { kind: "glyphe", at: [1, 1], fromRank: 1, parJour: true },
        { kind: "fenetre", at: [2, 2], fromRank: 1 },
      ],
    });
    expect(etatBatiment(d, 3, { nuit: false }).lights.map((l) => l.kind)).toEqual(["glyphe"]);
    expect(etatBatiment(d, 3, { nuit: true }).lights).toHaveLength(3);
  });

  it("the night sprite is a list by rank: the last one reached stands, by night only", () => {
    const d = base({
      nightSprites: [
        { fromRank: 3, sprite: "a", anchorOffset: [0, 0] },
        { fromRank: 7, sprite: "b", anchorOffset: [0, 0] },
      ],
    });
    expect(etatBatiment(d, 2, { nuit: true }).nightSprite).toBeNull();
    expect(etatBatiment(d, 5, { nuit: true }).nightSprite?.sprite).toBe("a");
    expect(etatBatiment(d, 9, { nuit: true }).nightSprite?.sprite).toBe("b");
    expect(etatBatiment(d, 9, { nuit: false }).nightSprite).toBeNull();
  });

  it("scaffold, build gag and the keeper's pose follow the stage; the mark's sprite its form", () => {
    const d = base({
      code: "windmill",
      chantier: { grand: { echafaudage: { anchorOffset: [4, 4], sprite: null } } },
      guardian: { fromRank: 1, at: [0, 0], sprite: null, poses: { grand: [9, 9] } },
      clanMarkSprites: { banniere: "marques/banniere.webp" },
    });
    expect(etatBatiment(d, 5, { rule }).chantier?.echafaudage?.anchorOffset).toEqual([4, 4]);
    expect(etatBatiment(d, 3, { rule }).chantier).toBeNull();
    expect(etatBatiment(d, 5, { rule }).gardien?.pose).toEqual([9, 9]);
    expect(etatBatiment(d, 3, { rule }).gardien?.pose).toEqual([0, 0]);
    expect(etatBatiment(d, 5, { rule }).marqueSprite).toBe("marques/banniere.webp");
    expect(etatBatiment(d, 3, { rule }).marqueSprite).toBeNull();
  });
});

// biome-ignore lint/style/useComponentExportOnlyModules: a test harness
function Image({ testID }: { testID: string }) {
  return <View testID={testID} />;
}

// biome-ignore lint/style/useComponentExportOnlyModules: a test harness
function Parent({
  de,
  masque = false,
  nuit = false,
}: {
  de: number;
  masque?: boolean;
  nuit?: boolean;
}) {
  return (
    <BatimentMoteur
      actif
      data={essai}
      rank={de}
      nuit={nuit}
      rule={rule}
      corps={BOITE}
      taille={[896, 1344]}
      ancre={[448, 1300]}
      masque={masque}
      sprite={() => <Image testID="sprite" />}
      couches={() => <View testID="couches" />}
      reclame={<View testID="reclame" />}
    />
  );
}
const ids = () => screen.queryAllByTestId(/./).map((n) => n.props.testID as string);
const dp = (id: string) => StyleSheet.flatten(screen.getByTestId(id).props.style);

describe("the tree", () => {
  it("stands in the map's z-order: behind, sprite, the map's layers, in front, the ready mark last", async () => {
    await render(<Parent de={4} nuit />);
    const o = ids();
    const place = (id: string) => o.indexOf(id);
    expect(place("batiment-addon-4")).toBeLessThan(place("batiment-corps"));
    expect(place("batiment-corps")).toBeLessThan(place("sprite"));
    expect(place("sprite")).toBeLessThan(place("couches"));
    expect(place("couches")).toBeLessThan(place("batiment-addon-2"));
    for (const devant of [
      "batiment-addon-2",
      "batiment-teaser",
      "batiment-gag-4",
      "batiment-gardien",
      "batiment-marque-fanion",
      "batiment-lueur-fire",
    ]) {
      expect(place(devant)).toBeGreaterThan(place("couches"));
      expect(place(devant)).toBeLessThan(place("reclame"));
    }
    expect(place("reclame")).toBe(o.length - 1);
  });

  it("with the building hidden under a growth layer nothing stands in front", async () => {
    await render(<Parent de={4} masque nuit />);
    const o = ids();
    expect(o).toContain("batiment-addon-4");
    expect(o).toContain("batiment-corps");
    expect(o).toContain("reclame");
    for (const devant of [
      "batiment-addon-2",
      "batiment-teaser",
      "batiment-gag-4",
      "batiment-gardien",
      "batiment-marque-fanion",
      "batiment-lueur-fire",
    ]) {
      expect(o).not.toContain(devant);
    }
  });

  it("the clan mark is a slot and draws nothing while its sprite is not painted", async () => {
    await render(<Parent de={4} />);
    expect(screen.getByTestId("batiment-marque-fanion").children).toHaveLength(0);
  });
});

describe("the sizes, on the real canvas", () => {
  it("placeholders keep their size in dp, the points follow the canvas at 1/8, the tower's axis is 56 dp", async () => {
    await render(<Parent de={9} nuit />);
    expect(dp("batiment-addon-2").width).toBeGreaterThanOrEqual(10);
    expect(dp("batiment-teaser").width).toBeGreaterThanOrEqual(16);
    expect(dp("batiment-gardien").width).toBeGreaterThanOrEqual(14);
    // A point at x = 448 px is at 56 dp: the crystal sits on the tower's axis.
    const cristal = dp("batiment-lueur-crystal");
    expect(cristal.left + cristal.width / 2).toBeCloseTo(56, 5);
    await screen.unmount();
    await render(<Parent de={10} nuit />);
    const rayon = dp("batiment-lueur-beam");
    expect(rayon.left + rayon.width / 2).toBeCloseTo(56, 5);
    // The guardian at (160, 1200) px.
    const g = dp("batiment-gardien");
    expect(g.left + g.width / 2).toBeCloseTo(20, 5);
    expect(g.top + g.height / 2).toBeCloseTo(150, 5);
    // Every point of the data lies inside the canvas.
    const tous = [
      ...essai.lights.map((l) => l.at),
      essai.clanMark,
      essai.gag.slot,
      essai.guardian?.at,
    ];
    for (const p of tous) {
      expect(p?.[0] ?? 0).toBeLessThanOrEqual(896);
      expect(p?.[1] ?? 0).toBeLessThanOrEqual(1344);
    }
  });
});

describe("the frozen cards' data, pure", () => {
  const base = {
    ...essai,
    addOns: [],
    teasers: [
      { fromRank: 1, untilRank: 99, fromBase: 6, untilBase: 7, sprite: null, anchorOffset: [0, 0] },
      {
        fromRank: 1,
        untilRank: 99,
        fromBase: 9,
        untilBase: 10,
        sprite: null,
        anchorOffset: [0, 0],
      },
    ],
  } as const satisfies BuildingData;

  it("a teaser leaves when the base reaches untilBase, and lists the base ranks that change it", () => {
    expect(etatBatiment(base, 3, { baseRank: 5 }).teaser).toBeNull();
    expect(etatBatiment(base, 3, { baseRank: 6 }).teaser).not.toBeNull();
    expect(etatBatiment(base, 3, { baseRank: 7 }).teaser).toBeNull();
    expect(etatBatiment(base, 3, { baseRank: 9 }).teaser).not.toBeNull();
    expect(rangsDeBase(base)).toEqual([6, 7, 9, 10]);
  });

  it("the sails' sheet follows the rank, the keeper its stage, a beat can stand elsewhere", () => {
    const d = {
      ...essai,
      ailes: [
        { fromRank: 1, sheet: "a" },
        { fromRank: 6, sheet: "b" },
      ],
      guardian: { fromRank: 1, at: [0, 0], sprite: "s", sprites: { grand: "g" } },
    } as const satisfies BuildingData;
    expect(ailesAuRang(d, 5, 0)).toBe("a");
    expect(ailesAuRang(d, 6, 0)).toBe("b");
    expect(ailesAuRang(essai, 4, 0)).toBeNull();
    expect(ailesAuRang(essai, 6, 0)).toBe("grand");
    expect(etatBatiment(d, 5).gardienSprite).toBe("g");
    expect(etatBatiment(d, 1).gardienSprite).toBe("s");
  });
});

describe("the magic layer", () => {
  it("the rings: opposite ways, 8 s and 12 s a turn, 4 marks that are no letters, none the rune", () => {
    expect(angleAnneau(2000, PERIODE_EXTERIEUR_MS, 1)).toBeCloseTo(90, 5);
    expect(angleAnneau(3000, PERIODE_INTERIEUR_MS, -1)).toBeCloseTo(-90, 5);
    expect(MARQUES_GLYPHE.length).toBeGreaterThanOrEqual(3);
    expect(new Set(MARQUES_GLYPHE).size).toBe(MARQUES_GLYPHE.length);
    expect(MARQUES_GLYPHE).not.toContain(FORMES_GRAIN.runes);
    for (const d of MARQUES_GLYPHE) expect(d).toMatch(/^[MHVLZ0-9. ]+$/);
    expect(souffleZone(0)).toBeCloseTo(1, 5);
    expect(souffleZone(2500)).toBeCloseTo(1.15, 5);
    expect(souffleZone(5000)).toBeCloseTo(1, 5);
  });

  it("the top rank wears its magic, drawn in code, none of it tappable, still with reduced motion", async () => {
    expect(etatBatiment(essai, 9).magie).toBeNull();
    expect(etatBatiment(essai, 10).magie).not.toBeNull();
    await render(<Parent de={10} nuit />);
    const o = ids();
    for (const id of [
      "batiment-glyphe",
      "batiment-faisceau",
      "batiment-souffle",
      "batiment-constellation",
    ]) {
      expect(o).toContain(id);
    }
    expect(o.filter((i) => i === "batiment-luciole")).toHaveLength(5);
    for (const n of screen.queryAllByTestId(
      /^batiment-(glyphe|faisceau|souffle|luciole|constellation)/,
    )) {
      expect(n.props.pointerEvents).toBe("none");
      expect(n.props.onPress).toBeUndefined();
    }
    await screen.unmount();
    // By day: the rings and the breath, not the night's beam, fireflies and stars.
    await render(<Parent de={10} />);
    const jour = ids();
    expect(jour).toContain("batiment-glyphe");
    expect(jour).toContain("batiment-souffle");
    expect(jour).not.toContain("batiment-faisceau");
    expect(jour).not.toContain("batiment-luciole");
    expect(jour).not.toContain("batiment-constellation");
  });
});
