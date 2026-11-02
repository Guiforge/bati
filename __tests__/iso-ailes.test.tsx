import assert from "node:assert/strict";
import { render, screen } from "@testing-library/react-native";
import { StyleSheet } from "react-native";
import * as Reanimated from "react-native-reanimated";
import { ailesDe, pose, poseAiles, spriteDe } from "@/components/village/iso/carteDemo";
import { CYCLE_MS, HorlogeContext } from "@/components/village/iso/horloge";
import { Ailes } from "@/components/village/iso/IsoCarteDemo";

jest.mock("expo-router", () => ({ useIsFocused: () => true }));
jest.mock("@/hooks/useReducedMotion", () => ({ useReducedMotion: () => false }));

// Reanimated 4.7 types `getAnimatedStyle` from its web stub (`(): void`); jest runs the native one.
const getAnimatedStyle = Reanimated.getAnimatedStyle as unknown as (component: {
  props: Record<string, unknown>;
}) => { transform?: { rotate?: string }[] };

function feuille() {
  const corps = spriteDe("windmill", "grand");
  const s = ailesDe("windmill");
  assert(corps && s);
  const rect = poseAiles(pose("windmill", corps), corps, s);
  assert(rect);
  return { s, rect };
}

// biome-ignore lint/style/useComponentExportOnlyModules: a test harness, not a module's component
function Voiles({ c }: { c: number }) {
  const horloge = Reanimated.useSharedValue(c);
  const { s, rect } = feuille();
  return (
    <HorlogeContext.Provider value={horloge}>
      <Ailes s={s} rect={rect} testID="iso-ailes-windmill" />
    </HorlogeContext.Provider>
  );
}

// The sheet's image sits in the animated view: its parent is the one that turns.
const tournante = () => {
  const vue = screen.getByTestId("iso-ailes-windmill").parent;
  assert(vue);
  return vue;
};
const angle = () =>
  Number.parseFloat(getAnimatedStyle(tournante() as never).transform?.[0]?.rotate ?? "NaN");

describe("the windmill's sails", () => {
  test("turn about the sheet's anchor scaled to its drawn size, and stand still on a cycle boundary", async () => {
    await render(<Voiles c={2 * CYCLE_MS} />);
    const { s, rect } = feuille();
    const k = rect.w / s.size[0];
    const style = StyleSheet.flatten(tournante().props.style) as { transformOrigin?: number[] };
    expect(style.transformOrigin).toEqual([s.anchor[0] * k, s.anchor[1] * k, 0]);
    expect(angle()).toBe(0);
  });

  test("have turned partway through a gust", async () => {
    await render(<Voiles c={CYCLE_MS * 0.6} />);
    expect(angle()).toBeGreaterThan(0.5);
  });
});
