import assert from "node:assert/strict";
import { act, fireEvent, render, screen } from "@testing-library/react-native";
import { BackHandler } from "react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { TamaguiProvider } from "tamagui";

import { OutingGoalSheet } from "@/components/quests/OutingGoalSheet";
import config from "@/tamagui.config";

const mockPush = jest.fn();
jest.mock("expo-router", () => ({ useRouter: () => ({ push: mockPush }) }));
jest.mock("@/db/client", () => ({ db: {}, schema: {}, runMigrations: jest.fn() }));
jest.mock("@/db/outingHabit", () => ({ getOutingHabit: jest.fn().mockResolvedValue(null) }));
jest.mock("@/src/reportError", () => ({ reportError: jest.fn() }));
jest.mock("@/stores/settings", () => ({
  useSettingsStore: (selector: (s: { language: string }) => unknown) =>
    selector({ language: "en" }),
}));

import "@/i18n";

// A mixed quest has no `locomotion` for the presets, but it still reads a tab of the outing
// display: the link carries the tab the outing will read, not the one the presets use.
test("the line under the goals closes the sheet and opens the tab the outing reads", async () => {
  const onOpenChange = jest.fn();
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
            onOpenChange={onOpenChange}
            goal={{ type: "time", seconds: 1800 }}
            unit="metric"
            locomotion={null}
            displayLocomotion="ride"
            walkRun={false}
            onPick={jest.fn()}
          />
        </TamaguiProvider>
      </SafeAreaProvider>,
    );
  });

  expect(screen.getByText("What you see during the outing")).toBeTruthy();
  await act(async () => {
    await fireEvent.press(screen.getByTestId("goal-sheet-outing-display"));
  });
  expect(onOpenChange).toHaveBeenCalledWith(false);
  expect(mockPush).toHaveBeenCalledWith("/outing-display?tab=ride");
});

// The sheet is portalled above the navigator: without its own handler the press closed it and
// left the quest screen too.
test("hardware back closes the sheet and stops there", async () => {
  const spy = jest.spyOn(BackHandler, "addEventListener");
  const onOpenChange = jest.fn();
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
            onOpenChange={onOpenChange}
            goal={{ type: "time", seconds: 1800 }}
            unit="metric"
            locomotion={null}
            displayLocomotion="walk"
            walkRun={false}
            onPick={jest.fn()}
          />
        </TamaguiProvider>
      </SafeAreaProvider>,
    );
  });

  const call = spy.mock.calls.find(([name]) => name === "hardwareBackPress");
  assert(call);
  expect((call[1] as () => boolean)()).toBe(true);
  expect(onOpenChange).toHaveBeenCalledWith(false);
  spy.mockRestore();
});
