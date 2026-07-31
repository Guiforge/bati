import { render, screen } from "@testing-library/react-native";
import { TamaguiProvider } from "tamagui";

import OathScreen from "@/app/oath";
import "@/i18n";
import config from "@/tamagui.config";

/**
 * The swear screen's "current oath" card showed a progress bar and two bare numbers — "8 / 15" —
 * without ever naming the oath they belonged to. The one surface whose whole job is the oath was
 * the only one that did not say which oath it was.
 *
 * Asserted here is the text on the card, not that the screen rendered: the card came back after
 * every change to this screen precisely because "it still renders" was all anyone checked.
 */

jest.mock("expo-router", () => ({
  useRouter: () => ({ push: jest.fn(), back: jest.fn() }),
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

// Mocked wholesale rather than via requireActual: the real module pulls in the SQLite client,
// and nothing under test here needs a database. The presets are empty on purpose — this test is
// about the card above them.
const mockGetOathProgress = jest.fn();

jest.mock("@/db/oaths", () => ({
  DEFAULT_WEEKLY_TARGET: 3,
  OATH_PRESETS: [],
  getOathProgress: () => mockGetOathProgress(),
  breakOath: jest.fn(),
  swearOath: jest.fn(),
  oathNeedsExercise: (m: string) => m === "exercise_pr" || m === "exercise_volume",
  oathNeedsWeeklyTarget: (m: string) => m === "weekly_sessions",
}));

jest.mock("@/db/exercises", () => ({ listExercises: jest.fn().mockResolvedValue([]) }));

jest.mock("@/db/preferences", () => ({
  preferences: { getOwnedEquipment: jest.fn().mockResolvedValue([]) },
}));

/** Noon UTC so the formatted day is the same one in every timezone the suite might run in. */
const SWORN_AT = "2026-01-15T12:00:00.000Z";

function oathProgress(overrides: Record<string, unknown> = {}) {
  return {
    oath: {
      metric: "exercise_pr",
      exerciseId: 1,
      target: 15,
      swornAt: SWORN_AT,
      fulfilledAt: null,
    },
    current: 8,
    target: 15,
    progress: 53,
    isFulfilled: false,
    exerciseName: { en: "Pull-ups", fr: "Tractions" },
    ...overrides,
  };
}

async function renderScreen() {
  return await render(
    <TamaguiProvider config={config} defaultTheme="dark">
      <OathScreen />
    </TamaguiProvider>,
  );
}

test("the current oath card names the oath, not just its numbers", async () => {
  mockGetOathProgress.mockResolvedValue(oathProgress());

  await renderScreen();

  // The label the home card already showed, now on the screen that swears it.
  expect(await screen.findByText("15 × Pull-ups in a row")).toBeVisible();
  expect(await screen.findByText("8 / 15")).toBeVisible();
  expect(await screen.findByText("Sworn on Jan 15, 2026")).toBeVisible();
});

test("a fulfilled oath says so instead of counting past its target", async () => {
  mockGetOathProgress.mockResolvedValue(
    oathProgress({ current: 20, progress: 100, isFulfilled: true }),
  );

  await renderScreen();

  expect(await screen.findByText("Oath fulfilled.")).toBeVisible();
  expect(screen.queryByText("20 / 15")).toBeNull();
});

test("an unparseable sworn date drops the line instead of the screen", async () => {
  mockGetOathProgress.mockResolvedValue(
    oathProgress({ oath: { ...oathProgress().oath, swornAt: "not a date" } }),
  );

  await renderScreen();

  // Intl throws on an invalid date; the guard has to keep the rest of the card alive.
  expect(await screen.findByText("15 × Pull-ups in a row")).toBeVisible();
  expect(screen.queryByText(/^Sworn on/)).toBeNull();
});
