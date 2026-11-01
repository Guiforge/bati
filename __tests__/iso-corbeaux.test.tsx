// L5-T10 B: crows perched on roofs. Still drawings (no animated node) until a touch lands near
// one: it flies off in an arc on one node, for the length of the flight, then is gone.
// RNGH mocks its native module and host detector; it must load before the component does.
import "react-native-gesture-handler/jestSetup";
import "@/i18n";
import assert from "node:assert/strict";
import { act, configure, render, screen } from "@testing-library/react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import {
  createGestureController,
  getByGestureTestId,
} from "react-native-gesture-handler/jest-utils";
import * as Reanimated from "react-native-reanimated";
import {
  COTE,
  etatCarte,
  HAUTEUR,
  LARGEUR,
  spriteDe,
  stadeDemo,
  stadeReel,
} from "@/components/village/iso/carteDemo";
import {
  CODES_A_CORBEAU,
  DUREE_ENVOL_MS,
  envolCorbeau,
  perchoirDe,
  peutEnvoler,
  RAYON_EFFROI,
  sensEnvol,
  toucheProche,
} from "@/components/village/iso/corbeaux";
import { type Effroi, EffroiContext, HorlogeContext } from "@/components/village/iso/horloge";
import { IsoCarte } from "@/components/village/iso/IsoCarteDemo";
import { IsoVillage } from "@/components/village/iso/IsoVillage";
import { toits } from "@/components/village/iso/isoLayout";
import { vieDe } from "@/components/village/iso/isoSpec";
import { opaque } from "@/components/village/iso/tapBatiment";
import { buildingStage } from "@/constants/buildingLevels";
import spec from "@/constants/isoSpec.json";
import { type BuildingCode, buildingCodes } from "@/db/schema";

jest.mock("react-native-worklets", () => ({
  ...jest.requireActual("react-native-worklets"),
  getUIRuntimeHolder: () => ({}),
}));
jest.mock("@/db/client", () => ({ db: {}, schema: {}, runMigrations: jest.fn() }));
jest.mock("expo-router", () => ({ useIsFocused: () => true }));
jest.mock("@/hooks/useReducedMotion", () => ({ useReducedMotion: () => false }));

configure({ defaultIncludeHiddenElements: true });

const getAnimatedStyle = Reanimated.getAnimatedStyle as unknown as (component: {
  props: Record<string, unknown>;
}) => { opacity?: number; transform?: Record<string, number>[] };

describe("the roof points", () => {
  test("only the farm and the forge have a crow, at the stages with a point", () => {
    expect([...CODES_A_CORBEAU].sort()).toEqual(["farm", "forge"]);
    expect(perchoirDe("farm", "rough")).toBeNull();
    expect(perchoirDe("tent", "solid")).toBeNull();
    for (const cle of toits.keys()) {
      const [code, stade] = cle.split(/_(?=[^_]+$)/);
      expect([cle, perchoirDe(code as BuildingCode, stade as "solid" | "grand")]).toEqual([
        cle,
        expect.objectContaining({ x: expect.any(Number), y: expect.any(Number) }),
      ]);
    }
  });

  test("each point sits on its sprite's own mask, on the roof's top edge (nothing opaque just above)", () => {
    for (const [cle, p] of toits) {
      const [code, stade] = cle.split(/_(?=[^_]+$)/) as [BuildingCode, "solid" | "grand"];
      const s = spriteDe(code, stade);
      assert(s?.masque, cle);
      expect([cle, opaque(s.masque, p[0], p[1])]).toEqual([cle, true]);
      // The ridge is the edge of the painting: some of the cells straight above are empty.
      const dessus = [1, 2, 3].map((k) => opaque(s.masque as never, p[0], p[1] - 8 * k));
      expect([cle, dessus.includes(false)]).toEqual([cle, true]);
    }
  });

  test("the point lands inside the building's own sprite on the map", () => {
    const p = perchoirDe("farm", "grand");
    assert(p);
    expect(p.x).toBeGreaterThan(0);
    expect(p.x).toBeLessThan(LARGEUR);
    expect(p.y).toBeGreaterThan(0);
    expect(p.y).toBeLessThan(HAUTEUR);
    // A crow is a few dp: the roof's top is a few cells' width from the map's bottom edge.
    expect(COTE).toBeGreaterThan(0);
  });

  test("it lives by day and by night (isoSpec vieParAmbiance), like the animals", () => {
    expect([vieDe("nuit").corbeaux, vieDe("jour").corbeaux]).toEqual([true, true]);
    expect([vieDe("nuit").animaux, vieDe("jour").animaux]).toEqual([true, true]);
    expect(spec.vieParAmbiance.jour.lucioles).toBe(false);
  });
});

describe("the startle and the flight", () => {
  test("a touch near startles, a touch far does not; the crow flies away from the finger", () => {
    expect(toucheProche(100, 100, 100 + RAYON_EFFROI - 1, 100)).toBe(true);
    expect(toucheProche(100, 100, 100, 100 + RAYON_EFFROI + 1)).toBe(false);
    expect(sensEnvol(100, 140)).toBe(-1);
    expect(sensEnvol(100, 60)).toBe(1);
  });

  test("the flight: still at its start, an arc up and away, gone at its end, clamped outside", () => {
    const debut = envolCorbeau(0, 1);
    expect([debut.opacite, debut.dx, Math.abs(debut.dy), debut.battement]).toEqual([1, 0, 0, 1]);
    const mi = envolCorbeau(DUREE_ENVOL_MS / 2, -1);
    expect(mi.dx).toBeLessThan(0);
    expect(mi.dy).toBeLessThan(0);
    expect(mi.opacite).toBe(1);
    const fin = envolCorbeau(DUREE_ENVOL_MS, 1);
    expect(fin.opacite).toBe(0);
    expect(fin.dx).toBeGreaterThan(0);
    expect(envolCorbeau(DUREE_ENVOL_MS * 3, 1)).toEqual(fin);
    expect(envolCorbeau(-500, 1)).toEqual(envolCorbeau(0, 1));
    // Rising all along the visible part (it eases down a little as it fades).
    let avant = 0;
    for (let t = 0; t <= DUREE_ENVOL_MS * 0.7; t += 100) {
      const v = envolCorbeau(t, 1);
      expect(v.dy).toBeLessThanOrEqual(avant + 1e-9);
      avant = v.dy;
    }
  });
});

type Noeud = { props?: Record<string, unknown>; children?: unknown[] | null };
const compte = (n: unknown): number => {
  if (typeof n !== "object" || n === null) return 0;
  const { props, children } = n as Noeud;
  const propre =
    props?.jestAnimatedStyle === undefined && props?.animatedProps === undefined ? 0 : 1;
  return (children ?? []).reduce<number>((a, c) => a + compte(c), propre);
};

let horloge: Reanimated.SharedValue<number> | undefined;
let effroi: Reanimated.SharedValue<Effroi> | undefined;
// biome-ignore lint/style/useComponentExportOnlyModules: a test harness, not a module's component
function Hote({ lumiere = "jour" }: { lumiere?: "jour" | "nuit" }) {
  const c = Reanimated.useSharedValue(0);
  horloge = c;
  const e = Reanimated.useSharedValue<Effroi>({ n: 0, c0: 0, x: 0, y: 0 });
  effroi = e;
  const { visible, montres } = etatCarte(12, true);
  return (
    <HorlogeContext.Provider value={c}>
      <EffroiContext.Provider value={e}>
        <IsoCarte
          visible={visible}
          montres={montres}
          stade={(code) => stadeDemo(code, 12)}
          lumiere={lumiere}
        />
      </EffroiContext.Provider>
    </HorlogeContext.Provider>
  );
}

const toucher = (x: number, y: number, c0 = 0) =>
  act(() => {
    assert(effroi);
    effroi.set({ n: effroi.get().n + 1, c0, x, y });
    jest.advanceTimersByTime(20);
  });
const passer = (ms: number) =>
  act(() => {
    jest.advanceTimersByTime(ms);
  });
const pose = () => screen.queryAllByTestId(/^iso-corbeau-pose-/).length;
const envols = () => screen.queryAllByTestId(/^iso-corbeau-envol-/);

describe("the crows on the map", () => {
  beforeEach(() => jest.useFakeTimers());
  afterEach(() => jest.useRealTimers());

  const ferme = perchoirDe("farm", stadeDemo("farm", 12));
  const forge = perchoirDe("forge", stadeDemo("forge", 12));

  test("two crows perch, drawn still: not one animated node, none in flight", async () => {
    assert(ferme && forge);
    await render(<Hote />);
    expect(pose()).toBe(2);
    expect(envols()).toHaveLength(0);
    for (const v of screen.queryAllByTestId(/^iso-corbeau-pose-/))
      expect(v.props.jestAnimatedStyle).toBeUndefined();
    // Time passes, a wave of the clock runs: still nothing in flight, still the same count.
    const repos = compte(screen.toJSON());
    await act(() => {
      horloge?.set(7000);
      jest.advanceTimersByTime(500);
    });
    expect(compte(screen.toJSON())).toBe(repos);
    expect(envols()).toHaveLength(0);
  });

  test("at night a near touch startles nothing: no bird in flight, the crow stays perched", async () => {
    assert(ferme);
    expect(peutEnvoler("nuit")).toBe(false);
    expect(peutEnvoler("jour")).toBe(true);
    await render(<Hote lumiere="nuit" />);
    const repos = pose();
    await toucher(ferme.x + 20, ferme.y);
    await passer(DUREE_ENVOL_MS);
    expect(envols()).toHaveLength(0);
    expect(pose()).toBe(repos);
  });

  test("a far touch startles nothing; a near one sends that crow flying on one node, away from the finger", async () => {
    assert(ferme && forge);
    await render(<Hote />);
    const repos = compte(screen.toJSON());
    await toucher(5, 5);
    expect(envols()).toHaveLength(0);
    expect(pose()).toBe(2);
    // To the right of the farm's crow: it goes left.
    await toucher(ferme.x + 20, ferme.y);
    expect(envols()).toHaveLength(1);
    expect(screen.queryAllByTestId("iso-corbeau-pose-farm")).toHaveLength(0);
    expect(screen.queryAllByTestId("iso-corbeau-pose-forge")).toHaveLength(1);
    expect(compte(screen.toJSON())).toBe(repos + 1);
    await act(() => {
      horloge?.set(1300);
      jest.advanceTimersByTime(20);
    });
    const style = getAnimatedStyle(envols()[0] as never);
    const t = Object.assign({}, ...(style.transform ?? [])) as Record<string, number>;
    expect(t.translateX).toBeLessThan(0);
    expect(t.translateY).toBeLessThan(0);
    // The other one flies too: two nodes at the most (the budget's two).
    await toucher(forge.x - 20, forge.y, 1300);
    expect(envols()).toHaveLength(2);
    expect(compte(screen.toJSON())).toBe(repos + 2);
  });

  test("after the flight no node is left; a far touch brings the crows back on their roofs", async () => {
    assert(ferme && forge);
    await render(<Hote />);
    const repos = compte(screen.toJSON());
    await toucher(ferme.x + 20, ferme.y);
    await toucher(forge.x - 20, forge.y);
    expect(envols()).toHaveLength(2);
    await passer(DUREE_ENVOL_MS + 200);
    expect(envols()).toHaveLength(0);
    expect(pose()).toBe(0);
    expect(compte(screen.toJSON())).toBe(repos);
    await toucher(5, 5, horloge?.get() ?? 0);
    expect(pose()).toBe(2);
    expect(envols()).toHaveLength(0);
    expect(compte(screen.toJSON())).toBe(repos);
  });

  test("a touch that was left from before the map mounted startles nothing", async () => {
    assert(ferme);
    // The clock is long past the touch: it is no news.
    await render(<Hote />);
    await act(() => {
      horloge?.set(20_000);
      jest.advanceTimersByTime(20);
    });
    await toucher(ferme.x + 5, ferme.y, 0);
    expect(envols()).toHaveLength(0);
    expect(pose()).toBe(2);
  });
});

describe("a finger on the village", () => {
  beforeEach(() => jest.useFakeTimers());
  afterEach(() => jest.useRealTimers());

  const buildings = buildingCodes.map((code) => ({ code, level: 5 }));
  const village = (
    <GestureHandlerRootView>
      <IsoVillage tier={12} buildings={buildings} width={390} height={390} lumiere="jour" />
    </GestureHandlerRootView>
  );
  /** Where a map point lies on the area, through the camera the screen has now. */
  const surEcran = (mx: number, my: number) => {
    const t = getAnimatedStyle(screen.getByTestId("iso-camera")).transform ?? [];
    const v = Object.assign({}, ...t) as Record<string, number>;
    return {
      x: (mx - LARGEUR / 2) * (v.scale ?? 1) + 195 + (v.translateX ?? 0),
      y: (my - HAUTEUR / 2) * (v.scale ?? 1) + 195 + (v.translateY ?? 0),
    };
  };
  const poser = async (x: number, y: number) => {
    const pan = createGestureController(getByGestureTestId("iso-geste-pan"));
    await act(() => {
      pan.begin({ x, y });
      jest.advanceTimersByTime(50);
    });
  };

  test("the finger's place on the map decides: on the roof it startles, in a corner it does not", async () => {
    await render(village);
    const p = perchoirDe("farm", stadeReel("farm", buildingStage(5)));
    assert(p);
    const dessus = surEcran(p.x, p.y);
    await poser(4, 4);
    expect(envols()).toHaveLength(0);
    expect(pose()).toBe(2);
    await poser(dessus.x + 6, dessus.y + 2);
    expect(envols()).toHaveLength(1);
    expect(envols()[0]?.props.testID).toBe("iso-corbeau-envol-farm");
    await act(() => jest.advanceTimersByTime(DUREE_ENVOL_MS + 300));
    expect(envols()).toHaveLength(0);
  });
});
