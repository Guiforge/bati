import "@/i18n";
import { render, screen } from "@testing-library/react-native";
import * as Reanimated from "react-native-reanimated";
import { CYCLE_MS, DepartContext, HorlogeContext } from "@/components/village/iso/horloge";
import { emplacements, ileVisible } from "@/components/village/iso/isoLayout";
import { Lucioles } from "@/components/village/iso/petitsDetails";
import {
  DERIVE_LUCIOLES,
  GROUPES_LUCIOLES,
  hasard,
  lucioles,
  lueurLucioles,
  NOMBRE_LUCIOLES,
  sousBatiment,
  ZONE_LUCIOLES,
} from "@/components/village/iso/vivant";
import { rawColors } from "@/constants/rawColors";
import { buildingCodes } from "@/db/schema";

jest.mock("react-native-worklets", () => ({
  ...jest.requireActual("react-native-worklets"),
  getUIRuntimeHolder: () => ({}),
}));
jest.mock("expo-router", () => ({ useIsFocused: () => true }));
jest.mock("@/hooks/useReducedMotion", () => ({ useReducedMotion: () => false }));

const getAnimatedStyle = Reanimated.getAnimatedStyle as unknown as (component: {
  props: Record<string, unknown>;
}) => { opacity?: number; transform?: Record<string, number>[] };

const vagues = Array.from({ length: 40 }, (_, i) => i + 1);

describe("the seed", () => {
  test("same wave, same number; other waves, other numbers", () => {
    expect(hasard(3, 2)).toBe(hasard(3, 2));
    expect(new Set(vagues.map((n) => hasard(n, 2))).size).toBeGreaterThan(30);
    for (const n of vagues) {
      expect(hasard(n, 1)).toBeGreaterThanOrEqual(0);
      expect(hasard(n, 1)).toBeLessThan(1);
    }
  });
});

describe("fireflies", () => {
  test("8 to 12, fixed, over the canal and the trees beside it", () => {
    const visible = ileVisible(12, buildingCodes);
    const l = lucioles(visible);
    expect(l).toEqual(lucioles(visible));
    expect(l).toHaveLength(NOMBRE_LUCIOLES);
    expect(NOMBRE_LUCIOLES).toBeGreaterThanOrEqual(8);
    expect(NOMBRE_LUCIOLES).toBeLessThanOrEqual(12);
    for (const p of l) {
      expect(p.gx).toBeGreaterThanOrEqual(ZONE_LUCIOLES.gx[0]);
      expect(p.gx).toBeLessThan(ZONE_LUCIOLES.gx[1]);
      expect(p.gy).toBeGreaterThanOrEqual(ZONE_LUCIOLES.gy[0]);
      expect(p.gy).toBeLessThan(ZONE_LUCIOLES.gy[1]);
      expect(Math.abs(p.gx - (ZONE_LUCIOLES.gx[0] + ZONE_LUCIOLES.gx[1]) / 2)).toBeLessThanOrEqual(
        2,
      );
    }
  });

  test("each one hovers over a cell the island shows, at every tier", () => {
    for (const tier of [1, 3, 6, 12] as const) {
      const visible = ileVisible(tier, tier === 12 ? buildingCodes : []);
      for (const p of lucioles(visible))
        expect(visible[Math.floor(p.gy)]?.[Math.floor(p.gx)]).toBe(true);
    }
    expect(lucioles(ileVisible(12, buildingCodes))).toHaveLength(NOMBRE_LUCIOLES);
  });

  test("none stands over a building's footprint or the cell round it (the windmill's sails)", () => {
    for (const tier of [3, 6, 12] as const) {
      const visible = ileVisible(tier, tier === 12 ? buildingCodes : []);
      for (const p of lucioles(visible)) expect(sousBatiment(p.gx, p.gy)).toBe(false);
    }
    for (const { cases } of Object.values(emplacements))
      for (const [gx, gy] of cases) expect(sousBatiment(gx + 0.5, gy + 0.5)).toBe(true);
    // the zone does reach the windmill's plot: the rule is not vacuous
    const { cases } = emplacements.windmill;
    expect(cases.some(([gx, gy]) => gx >= ZONE_LUCIOLES.gx[0] && gy < ZONE_LUCIOLES.gy[1])).toBe(
      true,
    );
  });

  test("the points are dealt to every group, which beat out of step and both rest out", () => {
    const groupes = new Set(lucioles(ileVisible(12, buildingCodes)).map((p) => p.groupe));
    expect(groupes.size).toBe(GROUPES_LUCIOLES);
    for (let g = 0; g < GROUPES_LUCIOLES; g++)
      for (const k of [0, 1, 7]) expect(lueurLucioles(k * CYCLE_MS, g).opacite).toBeCloseTo(0, 9);
    expect(lueurLucioles(CYCLE_MS / 2, 1).opacite).toBeGreaterThan(0.8);
    expect(lueurLucioles(CYCLE_MS / 2, 0).opacite).toBeCloseTo(0, 9);
  });

  test("the drift stays within DERIVE_LUCIOLES", () => {
    for (let c = 0; c < CYCLE_MS; c += 50) {
      for (let g = 0; g < GROUPES_LUCIOLES; g++) {
        const r = lueurLucioles(c, g);
        expect(Math.abs(r.dx)).toBeLessThanOrEqual(DERIVE_LUCIOLES);
        expect(Math.abs(r.dy)).toBeLessThanOrEqual(DERIVE_LUCIOLES);
      }
    }
  });

  test("out (opacity 0, no drift) on every boundary, lit between, always a cold colour", () => {
    for (const k of [0, 1, 7]) {
      const r = lueurLucioles(k * CYCLE_MS);
      expect([r.opacite, r.dx, r.dy].map(Math.abs)).toEqual([0, 0, 0]);
    }
    expect(lueurLucioles(CYCLE_MS / 4).opacite).toBeGreaterThan(0.8);
    expect(lueurLucioles(CYCLE_MS / 2).opacite).toBeCloseTo(0, 9);
    const [r = 0, g = 0, b = 0] = [1, 3, 5].map((i) =>
      Number.parseInt(rawColors.isoLuciole.slice(i, i + 2), 16),
    );
    expect(b).toBeGreaterThanOrEqual(r);
    expect(g).toBeGreaterThan(r);
  });
});

describe("the fireflies' zone (isoLayout.json lieux)", () => {
  test("is read from the layout", () => {
    expect(ZONE_LUCIOLES).toEqual({ gx: [3, 7], gy: [0, 3] });
  });
});

// biome-ignore lint/style/useComponentExportOnlyModules: a test harness, not a module's component
function Hote({ c, n }: { c: number; n: number }) {
  const horloge = Reanimated.useSharedValue(c);
  const depart = Reanimated.useSharedValue({ n, c0: 0 });
  const visible = ileVisible(12, buildingCodes);
  return (
    <HorlogeContext.Provider value={horloge}>
      <DepartContext.Provider value={depart}>
        <Lucioles visible={visible} />
      </DepartContext.Provider>
    </HorlogeContext.Provider>
  );
}

describe("the nodes", () => {
  const lit = (id: string) => getAnimatedStyle(screen.getByTestId(id) as never);

  test("the fireflies are inked blobs, not bare circles", async () => {
    await render(<Lucioles visible={ileVisible(12, buildingCodes)} />);
    const svg = JSON.stringify(screen.toJSON());
    expect(svg.match(/"stroke":/g)?.length).toBe(lucioles(ileVisible(12, buildingCodes)).length);
    expect(svg).not.toContain("RNSVGCircle");
  });

  test("at rest on a boundary the fireflies are hidden", async () => {
    await render(<Hote c={3 * CYCLE_MS} n={1} />);
    expect(lit("iso-lucioles").opacity).toBe(0);
  });

  test("they glow in the wave's second cycle (familles.ts ROTATION), animating only opacity and transform", async () => {
    const place = new Set(["position", "top", "left", "right", "bottom", "width", "height"]);
    await render(<Hote c={CYCLE_MS + CYCLE_MS / 4} n={1} />);
    expect(lit("iso-lucioles").opacity).toBeGreaterThan(0.8);
    for (const k of Object.keys(lit("iso-lucioles")).filter((k2) => !place.has(k2)))
      expect(["opacity", "transform"]).toContain(k);
  });
});
