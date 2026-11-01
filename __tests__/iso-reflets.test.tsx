import { render, screen } from "@testing-library/react-native";
import { StyleSheet } from "react-native";
import * as Reanimated from "react-native-reanimated";
import { CYCLE_MS, HorlogeContext, reflet } from "@/components/village/iso/horloge";
import { Reflets } from "@/components/village/iso/IsoCarteDemo";

jest.mock("expo-router", () => ({ useIsFocused: () => true }));
jest.mock("@/hooks/useReducedMotion", () => ({ useReducedMotion: () => false }));

const getAnimatedStyle = Reanimated.getAnimatedStyle as unknown as (component: {
  props: Record<string, unknown>;
}) => { opacity?: number; transform?: Record<string, number | string>[] };

// biome-ignore lint/style/useComponentExportOnlyModules: a test harness, not a module's component
function Eau({ c, cell }: { c: number; cell: [number, number] }) {
  const horloge = Reanimated.useSharedValue(c);
  return (
    <HorlogeContext.Provider value={horloge}>
      <Reflets cases={[cell]} biome="defaut" />
    </HorlogeContext.Provider>
  );
}

describe("water glints", () => {
  test("rest (invisible, at the start) on every cycle boundary, whatever the stagger", () => {
    for (const k of [0, 1, 7])
      for (const delai of [0, 0.25, 0.5, 1]) {
        expect(reflet(k * CYCLE_MS, delai)).toEqual({ avance: 0, opacite: 0 });
        // and finished just before the next boundary
        const fin = reflet((k + 1) * CYCLE_MS - 1, delai);
        expect(fin.avance).toBeCloseTo(1, 2);
        expect(fin.opacite).toBeCloseTo(0, 2);
      }
  });

  test("advance monotonically and fade in then out inside a cycle", () => {
    let avant = -1;
    for (let c = 0; c < CYCLE_MS; c += 100) {
      const { avance, opacite } = reflet(c, 0);
      expect(avance).toBeGreaterThanOrEqual(avant);
      expect(opacite).toBeGreaterThanOrEqual(0);
      expect(opacite).toBeLessThanOrEqual(1);
      avant = avance;
    }
    expect(reflet(CYCLE_MS * 0.3, 0).opacite).toBeCloseTo(1, 1);
  });

  test("the view is invisible on a boundary, visible mid-cycle", async () => {
    await render(<Eau c={3 * CYCLE_MS} cell={[2, 3]} />);
    expect(getAnimatedStyle(screen.getByTestId(`iso-reflets-2`) as never).opacity).toBe(0);
    await screen.unmount();
    await render(<Eau c={CYCLE_MS * 0.4} cell={[0, 0]} />);
    expect(getAnimatedStyle(screen.getByTestId(`iso-reflets-0`) as never).opacity).toBeGreaterThan(
      0.3,
    );
  });

  test("slides along the gy diagonal (left-down as the clock advances), tilted to match", async () => {
    const lit = () => {
      const t = getAnimatedStyle(screen.getByTestId("iso-reflets-0") as never).transform ?? [];
      return { x: Number(t[0]?.translateX), y: Number(t[1]?.translateY) };
    };
    await render(<Eau c={CYCLE_MS * 0.1} cell={[0, 0]} />);
    const tot = lit();
    await screen.unmount();
    await render(<Eau c={CYCLE_MS * 0.5} cell={[0, 0]} />);
    const tard = lit();
    expect(tard.x).toBeLessThan(tot.x);
    expect(tard.y).toBeGreaterThan(tot.y);
    expect((tard.y - tot.y) / (tard.x - tot.x)).toBeCloseTo(-0.5, 5);
    // The tilt is static, on the glint itself.
    expect(StyleSheet.flatten(screen.getByTestId("iso-reflet-0-0").props.style).transform).toEqual([
      { rotate: "-26.57deg" },
    ]);
  });

  test("never writes the clock", async () => {
    const set = jest.fn();
    const horloge = { get: () => CYCLE_MS * 0.4, set, value: CYCLE_MS * 0.4 };
    await render(
      <HorlogeContext.Provider value={horloge as never}>
        <Reflets cases={[[0, 0]]} biome="defaut" />
      </HorlogeContext.Provider>,
    );
    expect(screen.getByTestId("iso-reflet-0-0")).toBeTruthy();
    expect(set).not.toHaveBeenCalled();
  });

  test("none without a clock", async () => {
    await render(<Reflets cases={[[0, 0]]} biome="defaut" />);
    expect(screen.queryByTestId("iso-reflet-0-0")).toBeNull();
  });
});
