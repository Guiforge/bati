import { act, fireEvent, render, screen, waitFor } from "@testing-library/react-native";
import { Linking } from "react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { TamaguiProvider } from "tamagui";

import { OutingGoalSheet } from "@/components/quests/OutingGoalSheet";
import "@/i18n";
import config from "@/tamagui.config";

/**
 * "GPS : oui / non" on the outing's goal sheet: remembered, prefilled, a switch for TalkBack, and
 * the rule behind it one tap away. The setting only prefills the next start.
 */

jest.mock("expo-router", () => ({ useRouter: () => ({ push: jest.fn() }) }));
jest.mock("@/db/client", () => ({ db: {}, schema: {}, runMigrations: jest.fn() }));
jest.mock("@/db/outingHabit", () => ({
  getOutingHabit: jest
    .fn()
    .mockResolvedValue({ usual: null, longestM: null, longestSeconds: null }),
}));
jest.mock("@/src/reportError", () => ({ reportError: jest.fn() }));
jest.mock("@/stores/settings", () => ({
  useSettingsStore: (selector: (s: { language: string }) => unknown) =>
    selector({ language: "en" }),
}));

let mockOn = true;
const mockSet = jest.fn().mockResolvedValue(undefined);
jest.mock("@/db/preferences", () => ({
  preferences: {
    getOutingGps: () => Promise.resolve(mockOn),
    setOutingGps: (...a: unknown[]) => mockSet(...a),
  },
}));
let mockGranted = true;
jest.mock("@/modules/bati-location", () => ({
  getPermissionStatus: () => Promise.resolve({ granted: mockGranted }),
}));

async function mount(
  goal: { type: "time"; seconds: number } | { type: "distance"; metres: number },
  onGps?: (gps: boolean) => void,
) {
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
            goal={goal}
            unit="metric"
            locomotion="walk"
            displayLocomotion="walk"
            walkRun={false}
            onPick={jest.fn()}
            onGps={onGps}
          />
        </TamaguiProvider>
      </SafeAreaProvider>,
    );
  });
}

beforeEach(() => {
  mockOn = true;
  mockGranted = true;
  mockSet.mockClear();
});

test("opens on the last choice, as a switch that reads 'GPS: yes' and is on", async () => {
  await mount({ type: "time", seconds: 1800 });
  const chip = await screen.findByTestId("gps-chip");
  expect(screen.getByText("GPS: yes")).toBeTruthy();
  expect(chip.props.accessibilityRole).toBe("switch");
  expect(chip.props.accessibilityState).toEqual({ checked: true });
  // The label is the setting's name alone: TalkBack adds the state and the gesture itself.
  expect(chip.props.accessibilityLabel).toBe("GPS");
});

test("a tap flips it, says so in the word and the state, and remembers it", async () => {
  await mount({ type: "time", seconds: 1800 });
  await fireEvent.press(await screen.findByTestId("gps-chip"));
  expect(screen.getByText("GPS: no")).toBeTruthy();
  expect(screen.getByTestId("gps-chip").props.accessibilityState).toEqual({ checked: false });
  expect(mockSet).toHaveBeenCalledWith(false);
});

test("a hero who chose no GPS last time is met with it off", async () => {
  mockOn = false;
  await mount({ type: "time", seconds: 1800 });
  await waitFor(() => expect(screen.getByText("GPS: no")).toBeTruthy());
});

test("the rule is one tap away and says what is earned without it", async () => {
  await mount({ type: "time", seconds: 1800 });
  await fireEvent.press(await screen.findByTestId("goal-gps-rule-link"));
  expect(screen.getByTestId("goal-gps-rule").props.children).toBe(
    "Without GPS, your outing counts by time: flame, XP, but no leagues until you add the distance.",
  );
});

test("with GPS off, a distance goal says it cannot be measured; on the duration tab it stays quiet", async () => {
  mockOn = false;
  await mount({ type: "distance", metres: 5000 });
  await waitFor(() => expect(screen.getByTestId("goal-gps-distance-note")).toBeTruthy());
  await fireEvent.press(screen.getByRole("button", { name: "Duration" }));
  expect(screen.queryByTestId("goal-gps-distance-note")).toBeNull();
});

test("with GPS on there is no note", async () => {
  await mount({ type: "distance", metres: 5000 });
  await screen.findByTestId("gps-chip");
  expect(screen.queryByTestId("goal-gps-distance-note")).toBeNull();
});

test("GPS off and the position refused: a link to where Android keeps the grant", async () => {
  mockOn = false;
  mockGranted = false;
  const open = jest.spyOn(Linking, "openSettings").mockResolvedValue(undefined);
  await mount({ type: "time", seconds: 1800 });
  await fireEvent.press(await screen.findByTestId("goal-allow-location"));
  expect(open).toHaveBeenCalled();
});

test("GPS on, or the position already granted, offers no such link", async () => {
  mockGranted = false;
  await mount({ type: "time", seconds: 1800 });
  await screen.findByTestId("gps-chip");
  expect(screen.queryByTestId("goal-allow-location")).toBeNull();
});

test("the tabs are choices: the one picked is selected and wears a check", async () => {
  await mount({ type: "time", seconds: 1800 });
  expect(screen.getByRole("button", { name: "Duration", selected: true })).toBeTruthy();
  expect(screen.getByRole("button", { name: "Distance", selected: false })).toBeTruthy();
});

test("the screen under the sheet hears the chip live, at open and on every tap", async () => {
  const onGps = jest.fn();
  await mount({ type: "time", seconds: 1800 }, onGps);
  await screen.findByTestId("gps-chip");
  expect(onGps).toHaveBeenLastCalledWith(true);
  await fireEvent.press(screen.getByTestId("gps-chip"));
  expect(onGps).toHaveBeenLastCalledWith(false);
  await fireEvent.press(screen.getByTestId("gps-chip"));
  expect(onGps).toHaveBeenLastCalledWith(true);
});
