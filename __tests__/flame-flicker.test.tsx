import { render } from "@testing-library/react-native";
import { processColor } from "react-native";
import { TamaguiProvider } from "tamagui";

import { FlameFlicker } from "@/components/common/FlameFlicker";
import config from "@/tamagui.config";

jest.mock("expo-router", () => ({ useIsFocused: () => true }));
jest.mock("@/hooks/useReducedMotion", () => ({ useReducedMotion: () => true }));

const wrap = (animate: boolean) => (
  <TamaguiProvider config={config} defaultTheme="dark">
    <FlameFlicker size={20} animate={animate} />
  </TamaguiProvider>
);

const tintOf = (view: Awaited<ReturnType<typeof render>>) =>
  Number(JSON.stringify(view.toJSON()).match(/"tintColor":(\d+)/)?.[1]);

// Decision V: no colour emoji in the chrome; the streak's state is the glyph's ink.
describe("FlameFlicker", () => {
  it("draws no emoji", async () => {
    const view = await render(wrap(true));
    expect(view.queryByText("🔥")).toBeNull();
  });

  it("is primary ink while the streak is alive and muted otherwise", async () => {
    const alive = tintOf(await render(wrap(true)));
    const dead = tintOf(await render(wrap(false)));
    const dark = config.themes.dark as unknown as Record<string, { val: string }>;
    expect(alive).toBe(processColor(dark.primaryText?.val));
    expect(dead).toBe(processColor(dark.muted?.val));
    expect(alive).not.toBe(dead);
  });
});
