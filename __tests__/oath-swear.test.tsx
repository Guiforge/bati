import { act, fireEvent, render, screen } from "@testing-library/react-native";
import { Alert } from "react-native";
import { TamaguiProvider } from "tamagui";
import OathScreen from "@/app/oath";
import { ToastProvider } from "@/components/common/Toast";
import "@/i18n";
import config from "@/tamagui.config";

/**
 * Swearing a preset is the oath screen's one job, and it was only ever checked in the database
 * (db-oaths.test.ts) and by a Maestro flow that took minutes to say "a card appeared". What the
 * tap itself does was untested: which oath it swears, that it asks before overwriting one in
 * force, and that a failed save does not close the screen as if it had worked.
 *
 * Asserted on `swearOath` and the router, not on the toast.
 */

const mockBack = jest.fn();
jest.mock("expo-router", () => ({
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

const mockGetOathProgress = jest.fn();
const mockSwearOath = jest.fn();

// One preset that needs no exercise, so it is offered whatever the catalogue and the kit hold.
jest.mock("@/db/oaths", () => ({
  DEFAULT_WEEKLY_TARGET: 3,
  OATH_PRESETS: [{ id: "streak_30", metric: "streak", target: 30 }],
  getOathProgress: () => mockGetOathProgress(),
  breakOath: jest.fn(),
  swearOath: (...args: unknown[]) => mockSwearOath(...args),
  standingForPreset: jest.fn().mockResolvedValue(null),
  oathNeedsExercise: (m: string) => m === "exercise_pr" || m === "exercise_volume",
  oathNeedsWeeklyTarget: (m: string) => m === "weekly_sessions",
}));

jest.mock("@/db/exercises", () => ({
  listExercises: jest.fn().mockResolvedValue([]),
  officialByName: jest.fn(),
  pickableExercises: (all: unknown[]) => all,
}));

jest.mock("@/db/preferences", () => ({
  preferences: { getOwnedEquipment: jest.fn().mockResolvedValue([]) },
}));

// The real module opens the SQLite database at import time.
jest.mock("@/src/widget", () => ({
  requestWidgetsUpdate: jest.fn().mockResolvedValue(undefined),
}));

const mockReportError = jest.fn();
jest.mock("@/src/reportError", () => ({
  reportError: (...args: unknown[]) => mockReportError(...args),
}));

const OATH_IN_FORCE = {
  oath: {
    metric: "exercise_pr",
    exerciseId: 1,
    target: 15,
    swornAt: "2026-01-15T12:00:00.000Z",
    fulfilledAt: null,
  },
  current: 8,
  target: 15,
  progress: 53,
  isFulfilled: false,
  exerciseName: { en: "Pull-ups", fr: "Tractions" },
};

async function renderScreen() {
  return await render(
    <TamaguiProvider config={config} defaultTheme="dark">
      <ToastProvider>
        <OathScreen />
      </ToastProvider>
    </TamaguiProvider>,
  );
}

beforeEach(() => {
  mockBack.mockClear();
  mockSwearOath.mockReset();
  mockReportError.mockClear();
});

test("tapping a preset swears that preset, then closes the screen", async () => {
  mockGetOathProgress.mockResolvedValue(null);
  mockSwearOath.mockResolvedValue(undefined);
  await renderScreen();

  await fireEvent.press(await screen.findByTestId("oath-preset"));

  expect(mockSwearOath).toHaveBeenCalledTimes(1);
  expect(mockSwearOath).toHaveBeenCalledWith(
    expect.objectContaining({ metric: "streak", target: 30, exerciseId: null }),
  );
  expect(mockBack).toHaveBeenCalledTimes(1);
});

test("an oath in force is not overwritten until the hero confirms", async () => {
  let destructive: (() => void) | undefined;
  const alert = jest.spyOn(Alert, "alert").mockImplementation((_title, _body, buttons) => {
    destructive = buttons?.find((b) => b.style === "destructive")?.onPress as () => void;
  });
  mockGetOathProgress.mockResolvedValue(OATH_IN_FORCE);
  mockSwearOath.mockResolvedValue(undefined);
  await renderScreen();
  // The oath in force has to have loaded, or the tap has nothing to protect.
  expect(await screen.findByText("8 / 15")).toBeVisible();

  await fireEvent.press(screen.getByTestId("oath-preset"));

  expect(alert).toHaveBeenCalledTimes(1);
  expect(mockSwearOath).not.toHaveBeenCalled();
  expect(mockBack).not.toHaveBeenCalled();

  await act(async () => destructive?.());

  expect(mockSwearOath).toHaveBeenCalledTimes(1);
  expect(mockBack).toHaveBeenCalledTimes(1);
  alert.mockRestore();
});

test("a save that fails keeps the screen open", async () => {
  mockGetOathProgress.mockResolvedValue(null);
  mockSwearOath.mockRejectedValue(new Error("invalid oath"));
  await renderScreen();

  await fireEvent.press(await screen.findByTestId("oath-preset"));

  // The tap used to look like it worked while the promise rejected and nothing closed.
  expect(mockReportError).toHaveBeenCalledWith("oath.swear", expect.any(Error));
  expect(mockBack).not.toHaveBeenCalled();
});
