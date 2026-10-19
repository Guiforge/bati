import { fireEvent, render, screen } from "@testing-library/react-native";
import { TamaguiProvider } from "tamagui";
import OathScreen from "@/app/oath";
import { ToastProvider } from "@/components/common/Toast";
import "@/i18n";
import config from "@/tamagui.config";

/**
 * The quota comes from the oath, and the whole journal is read at it: swearing "3 a week" over a
 * past at two recounts a lit or sleeping flame, possibly to 0. The screen says so before the tap
 * that swears (a preset swears at the tap), and again under the form's choice of sessions.
 */

const mockBack = jest.fn();
jest.mock("expo-router", () => ({
  useFocusEffect: (cb: () => void) => {
    const { useEffect } = require("react");
    useEffect(() => cb(), []);
  },
  useRouter: () => ({ push: jest.fn(), back: mockBack }),
}));

jest.mock(
  "react-native-safe-area-context",
  () => require("react-native-safe-area-context/jest/mock").default,
);

jest.mock("@/stores/settings", () => ({
  useSettingsStore: (selector?: (s: { language: string }) => unknown) => {
    const state = { language: "en" };
    return selector ? selector(state) : state;
  },
}));

const mockGetStreakInfo = jest.fn();

jest.mock("@/db/oaths", () => ({
  DEFAULT_WEEKLY_TARGET: 3,
  OATH_PRESETS: [{ id: "weekly_3x_8w", metric: "weekly_sessions", target: 8, weeklyTarget: 3 }],
  getOathProgress: jest.fn().mockResolvedValue(null),
  breakOath: jest.fn(),
  swearOath: jest.fn(),
  standingForPreset: jest.fn().mockResolvedValue(null),
  oathNeedsExercise: (m: string) => m === "exercise_pr" || m === "exercise_volume",
  oathNeedsWeeklyTarget: (m: string) => m === "weekly_sessions",
}));

jest.mock("@/db/streaks", () => ({ getStreakInfo: () => mockGetStreakInfo() }));

jest.mock("@/db/exercises", () => ({
  listExercises: jest.fn().mockResolvedValue([]),
  officialByName: jest.fn(),
  pickableExercises: (all: unknown[]) => all,
}));

jest.mock("@/db/preferences", () => ({
  preferences: { getOwnedEquipment: jest.fn().mockResolvedValue([]) },
}));

jest.mock("@/src/widget", () => ({
  requestWidgetsUpdate: jest.fn().mockResolvedValue(undefined),
}));

jest.mock("@/src/reportError", () => ({ reportError: jest.fn() }));

const LINE = "Your flame will be recounted at 3 sessions a week.";

async function renderScreen() {
  return await render(
    <TamaguiProvider config={config} defaultTheme="dark">
      <ToastProvider>
        <OathScreen />
      </ToastProvider>
    </TamaguiProvider>,
  );
}

test("a sleeping flame at 2 a week is warned before the 3-a-week preset is tapped", async () => {
  mockGetStreakInfo.mockResolvedValue({ current: 0, dormant: 45, quota: 2 });
  await renderScreen();

  expect(await screen.findByText(LINE)).toBeVisible();
});

test("a lit flame is warned too, and the form says it under the sessions a week", async () => {
  mockGetStreakInfo.mockResolvedValue({ current: 9, dormant: 0, quota: 2 });
  await renderScreen();
  await screen.findByText(LINE);

  await fireEvent.press(screen.getByText("Custom oath"));
  await fireEvent.press(screen.getByText("Every week"));

  expect(await screen.findByText(LINE)).toBeVisible();
});

test("no flame, lit or asleep, no line: there is nothing to recount", async () => {
  mockGetStreakInfo.mockResolvedValue({ current: 0, dormant: 0, quota: 2 });
  await renderScreen();
  await screen.findByTestId("oath-preset");

  expect(screen.queryByText(LINE)).toBeNull();
});

test("a quota already at 3 recounts nothing", async () => {
  mockGetStreakInfo.mockResolvedValue({ current: 9, dormant: 0, quota: 3 });
  await renderScreen();
  await screen.findByTestId("oath-preset");

  expect(screen.queryByText(LINE)).toBeNull();
});
