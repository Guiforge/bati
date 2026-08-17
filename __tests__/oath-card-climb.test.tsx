import { act, render, screen } from "@testing-library/react-native";
import { TamaguiProvider } from "tamagui";

import { OathCard } from "@/components/home/OathCard";
import "@/i18n";
import config from "@/tamagui.config";

/**
 * A beginner who swears "Pull-ups x15" has never logged a pull-up, so `exercise_pr` measures 0 and
 * the gold bar sat at 0/15 for months on the most visible card in the app — while the climb under
 * it moved every three sessions, in 13px grey. The card now leads with the climb.
 *
 * The assertion that matters is the second one in each test: that the *other* gauge is gone. Two
 * bars on one card is two notions of progress fighting for the same eye, and nothing but a test
 * stops the pair from creeping back.
 */

jest.mock("expo-router", () => ({
  useRouter: () => ({ push: jest.fn(), back: jest.fn() }),
  useFocusEffect: (cb: () => void) => {
    const { useEffect } = require("react");
    useEffect(cb, [cb]);
  },
}));

jest.mock("@/stores/settings", () => ({
  useSettingsStore: (selector?: (s: { language: string }) => unknown) => {
    const state = { language: "en" };
    return selector ? selector(state) : state;
  },
}));

const mockGetOathProgress = jest.fn();
const mockGetChainTo = jest.fn();

jest.mock("@/db/oaths", () => ({
  getOathProgress: () => mockGetOathProgress(),
  oathNeedsExercise: (m: string) => m === "exercise_pr" || m === "exercise_volume",
}));
jest.mock("@/db/exercises", () => ({ getChainTo: (id: number) => mockGetChainTo(id) }));
jest.mock("@/components/oath/useOathText", () => ({ useOathText: () => "15 x Pull-ups in a row" }));

/** The real route, as `0032` and `0033` left it — the name comes from its summit, so it has to
 *  end on the one the catalogue actually ends on or `pathName` falls back to the movement. */
const PULL_PATH = [
  "Towel Door Row",
  "Table Row",
  "Inverted Row",
  "Dead Hang",
  "Scapular Pull-Up",
  "Negative Pull-Up",
  "Chin-Up",
  "Pull-ups",
  "Muscle-Up",
];

const oath = (over: Record<string, unknown> = {}) => ({
  oath: {
    metric: "exercise_pr",
    exerciseId: 60,
    target: 15,
    swornAt: "2026-01-15T12:00:00.000Z",
    fulfilledAt: null,
  },
  current: 0,
  target: 15,
  progress: 0,
  isFulfilled: false,
  exerciseName: { en: "Pull-ups", fr: "Tractions" },
  ...over,
});

async function mount() {
  await act(async () => {
    const tree = render(
      <TamaguiProvider config={config} defaultTheme="dark">
        <OathCard />
      </TamaguiProvider>,
    );
    await Promise.resolve();
    return tree;
  });
}

beforeEach(() => {
  jest.clearAllMocks();
  mockGetOathProgress.mockResolvedValue(oath());
  mockGetChainTo.mockResolvedValue({
    rungs: PULL_PATH.map((name, i) => ({
      exercise: { id: (i + 1) * 10, enName: name, frName: name, imagePath: "" },
      metTarget: i < 2 ? 3 : 0,
      required: 3,
      isEarned: i < 2,
    })),
    position: 3,
  });
});

test("a sworn movement on a path shows the climb, not a bar frozen at zero", async () => {
  await mount();

  expect(screen.getByText(/PATH OF THE PULL · RUNG 3\/9/i)).toBeTruthy();
  // The strip *replaces* the bar — this is the assertion that keeps the pair from creeping back.
  expect(screen.queryByTestId("oath-progress-bar")).toBeNull();
  // The counter stays, demoted: the strip measures the distance to the movement, the counter the
  // distance to fifteen reps of it.
  expect(screen.getByText("0 / 15")).toBeTruthy();
});

test("an oath with no path keeps the plain bar", async () => {
  // A streak or weekly-sessions oath names no movement, so there is no climb to show.
  mockGetOathProgress.mockResolvedValue(
    oath({ oath: { ...oath().oath, metric: "streak", exerciseId: null } }),
  );

  await mount();

  expect(screen.queryByText(/PATH OF/i)).toBeNull();
  expect(screen.getByTestId("oath-progress-bar")).toBeTruthy();
  expect(screen.getByText("0 / 15")).toBeTruthy();
});

test("a fulfilled oath is about its number again, not the path behind it", async () => {
  mockGetOathProgress.mockResolvedValue(oath({ current: 15, progress: 100, isFulfilled: true }));

  await mount();

  expect(screen.getByText("Oath fulfilled.")).toBeTruthy();
  expect(screen.queryByText(/PATH OF/i)).toBeNull();
  expect(screen.getByTestId("oath-progress-bar")).toBeTruthy();
});
