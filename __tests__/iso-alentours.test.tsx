// The painted surroundings (stage 5): every layer off unless asked, the forest clear of the island
// at every tier, props that only ever appear, and the painted views never tap targets.
import "react-native-gesture-handler/jestSetup";
import "@/i18n";
import { configure, render, screen } from "@testing-library/react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { OiseauxPeints } from "@/components/village/iso/Alentours";
import { AmbianceCarte } from "@/components/village/iso/AmbianceCarte";
import {
  ACCESSOIRES,
  AlentoursContext,
  accessoiresMontres,
  alentoursDe,
  massesForet,
  TERRAIN,
  TOILE_FORET,
  TUILE_TERRAIN,
  TUILES_TERRAIN,
} from "@/components/village/iso/alentours";
import { etatCarte } from "@/components/village/iso/carteDemo";
import { IsoVillage } from "@/components/village/iso/IsoVillage";
import { emplacements, rempart, sol } from "@/components/village/iso/isoLayout";
import { clairiere, distCases } from "@/components/village/iso/monde";
import { ALENTOURS } from "@/constants/isoPoc";
import { buildingCodes } from "@/db/schema";
import type { VillageTier } from "@/db/village";

jest.mock("react-native-worklets", () => ({
  ...jest.requireActual("react-native-worklets"),
  getUIRuntimeHolder: () => ({}),
}));
jest.mock("@/db/client", () => ({ db: {}, schema: {}, runMigrations: jest.fn() }));
jest.mock("expo-router", () => ({ useIsFocused: () => true }));
jest.mock("@/hooks/useReducedMotion", () => ({ useReducedMotion: () => false }));

configure({ defaultIncludeHiddenElements: true });

const PALIERS: readonly VillageTier[] = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];

describe("the layers' flags", () => {
  test("ship off, and a dev link names the ones it wants", () => {
    expect(Object.values(ALENTOURS).every((v) => !v)).toBe(true);
    expect(alentoursDe(undefined)).toBe(ALENTOURS);
    expect(alentoursDe("sol,animaux")).toEqual({
      sol: true,
      foret: false,
      decor: false,
      animaux: true,
    });
    expect(Object.values(alentoursDe("tout")).every(Boolean)).toBe(true);
  });
});

describe("the painted forest", () => {
  test.each(PALIERS)("at tier %i its masses keep clear of the island and its clearing", (p) => {
    const { visible } = etatCarte(p, false);
    const masses = massesForet(visible);
    const dist = distCases(visible);
    const clair = clairiere(visible);
    expect(masses.length).toBeGreaterThan(20);
    for (const m of masses) {
      // The foot and the crown's top: never on the village (the forest lies under the sprites).
      expect(dist(m.x, m.y)).toBeGreaterThanOrEqual(clair);
      expect(dist(m.x, m.y - TOILE_FORET.h * m.echelle * 0.9)).toBeGreaterThanOrEqual(clair);
      // Never mirrored: a scale, ±10 % round 1 (1.3 for the border).
      expect(m.echelle).toBeGreaterThanOrEqual(0.9);
      expect(m.echelle).toBeLessThanOrEqual(1.43);
    }
    // Back to front.
    expect(masses.map((m) => m.y)).toEqual(masses.map((m) => m.y).toSorted((a, b) => a - b));
  });

  test("rings the island densely, in groups with dark gaps and never one carpet (B5)", () => {
    for (const p of [1, 12] as const) {
      const { visible } = etatCarte(p, false);
      const masses = massesForet(visible);
      const dist = distCases(visible);
      const clair = clairiere(visible);
      expect(masses.length).toBeGreaterThan(90);
      // Every quarter of the ring holds some, and some of its 3 x 3 patches stay bare.
      const anneau = masses.filter((m) => dist(m.x, m.y) < 460);
      for (const [sx, sy] of [
        [-1, -1],
        [1, -1],
        [-1, 1],
        [1, 1],
      ] as const)
        expect(anneau.some((m) => Math.sign(m.x - 480) === sx && Math.sign(m.y - 240) === sy)).toBe(
          true,
        );
      const bornes = anneau.map((m) => `${Math.floor(m.x / 384)},${Math.floor(m.y / 138)}`);
      expect(new Set(bornes).size).toBeLessThan(
        Math.ceil((TERRAIN.w / 384) * (TERRAIN.h / 138)) * 0.9,
      );
      expect(Math.min(...masses.map((m) => dist(m.x, m.y)))).toBeGreaterThanOrEqual(clair);
    }
  });

  test("is the same on every launch, and its edge backs off as the island grows", () => {
    const un = etatCarte(1, false).visible;
    const copie = un.map((l) => [...l]);
    expect(massesForet(copie)).toEqual(massesForet(un));
    const plusProche = (p: VillageTier) => {
      const { visible } = etatCarte(p, false);
      const dist = distCases(visible);
      return Math.min(...massesForet(visible).map((m) => dist(m.x, m.y)));
    };
    expect(plusProche(12)).toBeGreaterThanOrEqual(plusProche(1));
  });
});

describe("the painted props", () => {
  test("stand on grass (the fisherman on the river), never on a plot or a wall", () => {
    const plots = new Set(
      buildingCodes.flatMap((c) => emplacements[c].cases.map(([x, y]) => `${x},${y}`)),
    );
    const murs = new Set(rempart.map(([x, y]) => `${x},${y}`));
    for (const a of ACCESSOIRES) {
      const k = a.case.join(",");
      if (a.sur) continue;
      expect([a.nom, sol[a.case[1]]?.[a.case[0]]]).toEqual([
        a.nom,
        a.nom === "pecheur_1" ? "eau" : "herbe",
      ]);
      expect([a.nom, plots.has(k) || murs.has(k)]).toEqual([a.nom, false]);
    }
  });

  test("only ever appear: what a tier shows, the next one shows too", () => {
    for (const debout of [false, true]) {
      let avant = new Set<string>();
      for (const p of PALIERS) {
        const { visible, montres } = etatCarte(p, debout);
        const ici = new Set<string>(accessoiresMontres(visible, montres, p).map((a) => a.nom));
        expect([...avant].filter((n) => !ici.has(n))).toEqual([]);
        avant = ici;
      }
      expect(avant.size).toBe(ACCESSOIRES.length);
    }
    // The camp shows from tier 1.
    const { visible, montres } = etatCarte(1, false);
    expect(accessoiresMontres(visible, montres, 1).length).toBeGreaterThanOrEqual(4);
  });
});

describe("the map with every painted layer", () => {
  test("draws them, the mice for the rat, and none of them takes a touch", async () => {
    const buildings = buildingCodes.map((code) => ({ code, level: 30 }));
    await render(
      <AlentoursContext.Provider value={alentoursDe("tout")}>
        <GestureHandlerRootView>
          <IsoVillage tier={12} buildings={buildings} width={411} height={520} lumiere="jour" />
        </GestureHandlerRootView>
      </AlentoursContext.Provider>,
    );
    expect(screen.getAllByTestId("iso-terrain-peint")).toHaveLength(1);
    // The terrain's tiles: the whole grid, one size, each overlapping its neighbours by 1 dp (H3-14: no seam), edge to edge over the painted box.
    const tuiles = screen.getAllByTestId("iso-terrain-tuile");
    expect(tuiles).toHaveLength(TUILES_TERRAIN.colonnes * TUILES_TERRAIN.rangees);
    const boites = tuiles.map(
      (t) => t.props.style as { left: number; top: number; width: number; height: number },
    );
    for (const b of boites)
      expect([b.width, b.height]).toEqual([TUILE_TERRAIN.w + 1, TUILE_TERRAIN.h + 1]);
    expect(Math.max(...boites.map((b) => b.left + b.width))).toBeCloseTo(TERRAIN.w + 1);
    expect(Math.max(...boites.map((b) => b.top + b.height))).toBeCloseTo(TERRAIN.h + 1);
    expect(screen.getAllByTestId("iso-foret-peinte").length).toBeGreaterThan(20);
    expect(screen.getAllByTestId(/^iso-accessoire-/)).toHaveLength(ACCESSOIRES.length);
    expect(screen.getAllByTestId("iso-souris")).toHaveLength(1);
    expect(screen.queryAllByTestId("iso-rongeur")).toHaveLength(0);
    expect(screen.queryAllByTestId(/^iso-lisiere-/)).toHaveLength(0);
    expect(screen.queryAllByTestId("iso-premier-plan")).toHaveLength(0);
    for (const v of [
      ...screen.getAllByTestId("iso-terrain-peint"),
      ...screen.getAllByTestId("iso-terrain-tuile"),
      ...screen.getAllByTestId("iso-foret-peinte"),
      ...screen.getAllByTestId(/^iso-accessoire-/),
      ...screen.getAllByTestId("iso-souris"),
    ])
      expect(v.props.pointerEvents).toBe("none");
  });

  test("with the layers off, the map is the vector one", async () => {
    const buildings = buildingCodes.map((code) => ({ code, level: 30 }));
    await render(
      <GestureHandlerRootView>
        <IsoVillage tier={12} buildings={buildings} width={411} height={520} />
      </GestureHandlerRootView>,
    );
    expect(
      screen.queryAllByTestId(/^iso-(terrain-peint|foret-peinte|accessoire-|souris)/),
    ).toHaveLength(0);
    expect(screen.getAllByTestId("iso-rongeur")).toHaveLength(1);
  });
});

describe("the painted flock", () => {
  test("at rest (no clock), no bird rises or falls", async () => {
    await render(<OiseauxPeints width={400} height={600} horloge={null} depart={null} />);
    for (const i of [0, 1, 2, 3]) {
      const style = [screen.getByTestId(`iso-oiseau-${i}`).props.style].flat(2);
      const t = style.flatMap((x) => (x as { transform?: object[] } | null)?.transform ?? []);
      expect(t).toContainEqual({ translateY: 0 });
    }
  });
});

describe("the night's lantern pool", () => {
  const pools = async (peint: ReturnType<typeof alentoursDe>) => {
    await render(
      <AlentoursContext.Provider value={peint}>
        <AmbianceCarte lumiere="nuit" biome="defaut" montres={[]} stade={() => "rough"} />
      </AlentoursContext.Provider>,
    );
    return screen.queryAllByTestId("iso-flaque-nuit").length;
  };

  test("stands with the vector lantern, goes with it under the painted props", async () => {
    expect(await pools(alentoursDe(undefined))).toBe(1);
  });

  test("none under peint.decor", async () => {
    expect(await pools(alentoursDe("decor"))).toBe(0);
  });
});
