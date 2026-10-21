import { act, render, screen } from "@testing-library/react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { TamaguiProvider } from "tamagui";

import { OutingGoalSheet } from "@/components/quests/OutingGoalSheet";
import type { Locomotion } from "@/db/schema";
import config from "@/tamagui.config";

jest.mock("expo-router", () => ({ useRouter: () => ({ push: jest.fn() }) }));
jest.mock("@/db/client", () => ({ db: {}, schema: {}, runMigrations: jest.fn() }));
jest.mock("@/db/outingHabit", () => ({
  getOutingHabit: jest.fn().mockResolvedValue(jest.requireActual("@/db/outingRule").NO_HABIT),
}));
jest.mock("@/src/reportError", () => ({ reportError: jest.fn() }));
let mockZone: { groups: string[] } | null = null;
jest.mock("@/db/zone", () => ({ getZone: () => Promise.resolve(mockZone) }));
jest.mock("@/stores/settings", () => ({
  useSettingsStore: (selector: (s: { language: string }) => unknown) =>
    selector({ language: "en" }),
}));

import "@/i18n";

async function mount(locomotion: Locomotion) {
  await act(async () => {
    await render(
      <SafeAreaProvider
        initialMetrics={{
          frame: { x: 0, y: 0, width: 390, height: 800 },
          insets: { top: 0, left: 0, right: 0, bottom: 0 },
        }}
      >
        <TamaguiProvider config={config} defaultTheme="dark">
          <OutingGoalSheet
            open
            onOpenChange={jest.fn()}
            goal={{ type: "time", seconds: 1800 }}
            unit="metric"
            locomotion={locomotion}
            displayLocomotion={locomotion}
            walkRun={false}
            onPick={jest.fn()}
          />
        </TamaguiProvider>
      </SafeAreaProvider>,
    );
  });
}

const NOTE = "You're sparing your legs: run easy, or take a short walk.";

describe("the goal sheet with the legs spared", () => {
  test("tells a runner before the clock starts", async () => {
    mockZone = { groups: ["legs"] };
    await mount("run");
    expect(screen.getByText(NOTE)).toBeTruthy();
  });

  test.each(["walk", "ride"] as const)("says nothing to a %s", async (kind) => {
    mockZone = { groups: ["legs"] };
    await mount(kind);
    expect(screen.queryByText(NOTE)).toBeNull();
  });

  test("says nothing when another zone is spared, or none", async () => {
    mockZone = { groups: ["shoulder"] };
    await mount("run");
    expect(screen.queryByText(NOTE)).toBeNull();
  });
});
