// The engine after the tech review (docs/designs/village-buildings): rule B on the plan, the swap
// at the dust's peak, the next stage mounted invisible, the z-order, the new piece as one group,
// the data's new fields, and the sizes on the real canvas.
import "react-native-gesture-handler/jestSetup";
import { act, configure, fireEvent, render, screen } from "@testing-library/react-native";
import { useEffect, useState } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import { BatimentMoteur } from "@/components/village/iso/BatimentMoteur";
import { etatBatiment } from "@/components/village/iso/batiment";
import {
  basesA,
  chantierA,
  echelleCorps,
  echellePop,
  genreDe,
  picPoussiere,
  planSpectacle,
  rangsA,
  rebond,
  souffleLueur,
} from "@/components/village/iso/spectacleBatiment";
import { useSpectacleBatiment } from "@/components/village/iso/useSpectacleBatiment";
import { type BuildingData, gagBeatAt } from "@/constants/buildingData";
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

describe("rule B on the plan", () => {
  it("rank 0 to 1 is a building going up: the full show", () => {
    expect(genreDe("windmill", 0, 1, { rule })).toBe("stade");
    expect(genreDe("windmill", 1, 2, { rule })).toBe("rang");
  });

  it("a base that rises inside a stage is a beat, across a stage the full show", () => {
    // The watchtower's own rank 3 is grand until its base reaches 7.
    expect(genreDe("watchtower", 3, 3, { deBase: 5, versBase: 6, rule })).toBe("rang");
    expect(genreDe("watchtower", 3, 3, { deBase: 6, versBase: 7, rule })).toBe("stade");
    expect(genreDe("watchtower", 3, 3, { deBase: 7, versBase: 7, rule })).toBeNull();
    expect(genreDe("watchtower", 3, 3, { deBase: 8, versBase: 6, rule })).toBeNull();
  });

  it("the base switches at the same moment as the rank, at the dust's peak", () => {
    const plan = planSpectacle("stade", 3, 3, false, { deBase: 6, versBase: 7 });
    const pic = picPoussiere(plan) ?? -1;
    expect(pic).toBeGreaterThan(0);
    expect(basesA(plan, pic - 1)).toEqual({ corps: 6, marque: 6 });
    expect(basesA(plan, pic).corps).toBe(7);
    const marque = plan.etapes.find((e) => e.etape === "marque")?.debut ?? -1;
    expect(basesA(plan, marque - 1).marque).toBe(6);
    expect(basesA(plan, marque).marque).toBe(7);
    // Reduced motion: both at once.
    expect(basesA(planSpectacle("stade", 3, 3, true, { deBase: 6, versBase: 7 }), 0)).toEqual({
      corps: 7,
      marque: 7,
    });
  });

  it("the body takes the new rank and the scaffold leaves at the dust's peak", () => {
    const plan = planSpectacle("stade", 4, 5, false);
    const pic = picPoussiere(plan) ?? -1;
    const debut = plan.etapes.find((e) => e.etape === "echafaudage")?.debut ?? -1;
    expect(rangsA(plan, pic - 1).corps).toBe(4);
    expect(rangsA(plan, pic).corps).toBe(5);
    expect(chantierA(plan, debut - 1)).toBe(false);
    expect(chantierA(plan, debut)).toBe(true);
    expect(chantierA(plan, pic - 1)).toBe(true);
    expect(chantierA(plan, pic)).toBe(false);
    expect(chantierA(planSpectacle("stade", 4, 5, true), 0)).toBe(false);
  });
});

describe("the scale jumps", () => {
  it("the anticipation squashes from 1 and comes back to 1, the bounce leaves from 1", () => {
    const plan = planSpectacle("stade", 4, 5, false);
    const [ant, , , rev] = plan.etapes;
    expect(echelleCorps(plan, ant?.debut ?? -1)).toBeCloseTo(1, 5);
    expect(echelleCorps(plan, ((ant?.debut ?? 0) + (ant?.fin ?? 0)) / 2)).toBeCloseTo(0.96, 5);
    expect(echelleCorps(plan, (ant?.fin ?? 0) - 0.001)).toBeCloseTo(1, 3);
    expect(rebond(0)).toBe(1);
    expect(echelleCorps(plan, rev?.debut ?? -1)).toBe(1);
    let max = 0;
    for (let t = 0; t <= plan.total; t += 5) max = Math.max(max, echelleCorps(plan, t));
    expect(max).toBeGreaterThan(1.05);
    expect(max).toBeLessThanOrEqual(1.1);
  });

  it("the new piece pops from nothing at the swap to 1, never far past it", () => {
    const plan = planSpectacle("rang", 3, 4, false);
    const pic = picPoussiere(plan) ?? -1;
    expect(echellePop(plan, pic - 1)).toBe(0);
    expect(echellePop(plan, pic + 1000)).toBe(1);
    for (let t = pic; t < pic + 460; t += 10) expect(echellePop(plan, t)).toBeLessThan(1.12);
    expect(echellePop(planSpectacle("rang", 3, 4, true), 0)).toBe(1);
  });

  it("a light breathes between 0.85 and 1.15 and rests at every 5 s boundary", () => {
    expect(souffleLueur(0)).toBeCloseTo(0.85, 5);
    expect(souffleLueur(5000)).toBeCloseTo(0.85, 5);
    expect(souffleLueur(1250)).toBeCloseTo(1.15, 5);
  });
});

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

// Counts how many times a sprite was mounted: a stage's own node must never be mounted again.
let montages = 0;
// biome-ignore lint/style/useComponentExportOnlyModules: a test harness
function Image({ testID }: { testID: string }) {
  useEffect(() => {
    montages += 1;
  }, []);
  return <View testID={testID} />;
}

// A parent that does what the village will: a tap starts the moment, nothing else does.
// biome-ignore lint/style/useComponentExportOnlyModules: a test harness
function Parent({
  de,
  vers,
  masque = false,
  nuit = false,
  suivis,
}: {
  de: number;
  vers: number;
  masque?: boolean;
  nuit?: boolean;
  suivis?: string[];
}) {
  const { spectacle, jouer, fini } = useSpectacleBatiment();
  const [rang, setRang] = useState(de);
  return (
    <View>
      <Pressable
        testID="tap"
        onPress={() => {
          if (jouer("windmill", de, vers, { rule })) setRang(vers);
        }}
      />
      <BatimentMoteur
        actif
        data={essai}
        rank={rang}
        nuit={nuit}
        rule={rule}
        corps={BOITE}
        taille={[896, 1344]}
        ancre={[448, 1300]}
        spectacle={spectacle}
        onFini={fini}
        masque={masque}
        sprite={(stade, suivant) => {
          suivis?.push(`${stade}${suivant ? "-suivant" : ""}`);
          return <Image testID={suivant ? `sprite-suivant-${stade}` : "sprite"} />;
        }}
        couches={<View testID="couches" />}
        reclame={<View testID="reclame" />}
      />
    </View>
  );
}
const ids = () => screen.queryAllByTestId(/./).map((n) => n.props.testID as string);
const dp = (id: string) => StyleSheet.flatten(screen.getByTestId(id).props.style);

describe("the tree", () => {
  beforeEach(() => {
    montages = 0;
    jest.useFakeTimers();
  });
  afterEach(() => jest.useRealTimers());

  it("stands in the map's z-order: behind, sprite, the map's layers, in front, the ready mark last", async () => {
    await render(<Parent de={4} vers={5} nuit />);
    const o = ids();
    const place = (id: string) => o.indexOf(id);
    expect(place("batiment-addon-4")).toBeLessThan(place("batiment-corps"));
    expect(place("batiment-corps")).toBeLessThan(place("sprite"));
    expect(place("sprite")).toBeLessThan(place("couches"));
    // The sprite and the map's layers are inside the one bouncing view; the pieces are outside it.
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
    await render(<Parent de={4} vers={5} masque nuit />);
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

  it("the sprite stays where it is in the tree when a show starts and ends", async () => {
    // A beat inside a stage: the stage's own node is never remounted.
    await render(<Parent de={3} vers={4} />);
    const avant = montages;
    await fireEvent.press(screen.getByTestId("tap"));
    expect(montages).toBe(avant);
    await act(() => {
      jest.advanceTimersByTime(10_000);
    });
    expect(montages).toBe(avant);
  });

  it("the next stage is mounted invisible from the start of the show and takes over at the swap", async () => {
    const suivis: string[] = [];
    await render(<Parent de={4} vers={5} suivis={suivis} />);
    expect(ids()).not.toContain("sprite-suivant-grand");
    await fireEvent.press(screen.getByTestId("tap"));
    expect(ids()).toContain("sprite-suivant-grand");
    expect(suivis).toContain("grand-suivant");
    // The swap: the body is grand, the only sprite left, the same node that was waiting.
    await act(() => {
      jest.advanceTimersByTime(3000);
    });
    expect(ids()).not.toContain("sprite-suivant-grand");
    expect(suivis.at(-1)).toBe("grand");
  });

  it("a rank inside a stage mounts no next stage, and the new piece is one animated group", async () => {
    await render(<Parent de={3} vers={4} />);
    await fireEvent.press(screen.getByTestId("tap"));
    expect(ids().filter((i) => i.startsWith("sprite-suivant"))).toEqual([]);
    expect(ids()).not.toContain("batiment-neuf");
    // Past the swap the rank 4 piece (behind) stands in the one group.
    await act(() => {
      jest.advanceTimersByTime(200);
    });
    expect(ids().filter((i) => i === "batiment-neuf")).toHaveLength(1);
    expect(ids()).toContain("batiment-addon-4");
    await act(() => {
      jest.advanceTimersByTime(5000);
    });
    expect(ids()).not.toContain("batiment-neuf");
    expect(ids()).toContain("batiment-addon-4");
  });

  it("the clan mark is a slot and draws nothing while its sprite is not painted", async () => {
    await render(<Parent de={4} vers={5} />);
    expect(screen.getByTestId("batiment-marque-fanion").children).toHaveLength(0);
  });
});

describe("the sizes, on the real canvas", () => {
  it("placeholders keep their size in dp, the points follow the canvas at 1/8, the tower's axis is 56 dp", async () => {
    await render(<Parent de={9} vers={10} nuit />);
    expect(dp("batiment-addon-2").width).toBeGreaterThanOrEqual(10);
    expect(dp("batiment-teaser").width).toBeGreaterThanOrEqual(16);
    expect(dp("batiment-gardien").width).toBeGreaterThanOrEqual(14);
    // A point at x = 448 px is at 56 dp: the crystal sits on the tower's axis.
    const cristal = dp("batiment-lueur-crystal");
    expect(cristal.left + cristal.width / 2).toBeCloseTo(56, 5);
    await screen.unmount();
    await render(<Parent de={10} vers={10} nuit />);
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
