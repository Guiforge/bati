import { render, screen } from "@testing-library/react-native";
import { StyleSheet } from "react-native";
import * as Reanimated from "react-native-reanimated";
import { accrochesDe } from "@/components/village/iso/feux";
import { HorlogeContext } from "@/components/village/iso/horloge";
import { Veilles } from "@/components/village/iso/VeillesDessinees";
import { boiteFenetres, VeilleContext } from "@/components/village/iso/veilleuses";

jest.mock("expo-router", () => ({ useIsFocused: () => true }));
jest.mock("@/hooks/useReducedMotion", () => ({ useReducedMotion: () => false }));

const getAnimatedStyle = Reanimated.getAnimatedStyle as unknown as (component: {
  props: Record<string, unknown>;
}) => { opacity?: number };

// biome-ignore lint/style/useComponentExportOnlyModules: a test harness, not a module's component
function Harnais({ c }: { c: number }) {
  const horloge = Reanimated.useSharedValue(c);
  return (
    <HorlogeContext.Provider value={horloge}>
      <VeilleContext.Provider
        value={{ c0: 0, fenetres: new Set(["armory"]), portes: { armory: [[1000, 2000]] } }}
      >
        <Veilles
          code="armory"
          stade="solid"
          s={{ size: [896, 1344] } as never}
          corps={{ x: 100, y: 50, w: 448, h: 672 }}
          biome="defaut"
        />
      </VeilleContext.Provider>
    </HorlogeContext.Provider>
  );
}

describe("by day (F2)", () => {
  test("the day painting shows: no pane, no light over it", async () => {
    await render(
      <Veilles
        code="armory"
        stade="solid"
        s={{ size: [896, 1344] } as never}
        corps={{ x: 100, y: 50, w: 448, h: 672 }}
        biome="defaut"
        ambiance="jour"
      />,
    );
    expect(screen.toJSON()).toBeNull();
  });
});

describe("night lights drawn", () => {
  test("the windows sit at the sprite's rect plus the anchor times the scale", async () => {
    await render(<Harnais c={0} />);
    const a = accrochesDe("armory", "solid");
    const boite = a ? boiteFenetres(a) : null;
    const style = StyleSheet.flatten(screen.getByTestId("iso-fenetres-armory").props.style);
    expect(boite).not.toBeNull();
    expect(style.left).toBeCloseTo(100 + (boite?.x ?? 0) * 0.5, 5);
    expect(style.top).toBeCloseTo(50 + (boite?.y ?? 0) * 0.5, 5);
  });

  test("the door glows during its visit only", async () => {
    await render(<Harnais c={1500} />);
    expect(getAnimatedStyle(screen.getByTestId("iso-porte-armory") as never).opacity).toBe(1);
    await screen.unmount();
    await render(<Harnais c={9000} />);
    expect(getAnimatedStyle(screen.getByTestId("iso-porte-armory") as never).opacity).toBe(0);
  });
});
