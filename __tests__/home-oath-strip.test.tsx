import { act, render, screen, userEvent } from "@testing-library/react-native";
import { TamaguiProvider } from "tamagui";

import { OathStrip } from "@/components/home/OathStrip";
import "@/i18n";
import config from "@/tamagui.config";

/**
 * A beginner who swears "Pull-ups x15" has never logged a pull-up, so `exercise_pr` measures 0 and
 * a gold bar would sit at 0/15 for months at the foot of the one scene Home is built around, while
 * the climb under it moved every three sessions. The strip leads with the climb.
 *
 * The assertion that matters is the second one in each test: that the *other* gauge is gone. Two
 * gauges on one line is two notions of progress fighting for the same eye, and nothing but a test
 * stops the pair from creeping back.
 */

const mockPush = jest.fn();

jest.mock("expo-router", () => ({
  useRouter: () => ({ push: mockPush, back: jest.fn() }),
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
        <OathStrip />
      </TamaguiProvider>,
    );
    await Promise.resolve();
    return tree;
  });
}

const strip = () => screen.getByTestId("home-oath-card");

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

  expect(strip()).toHaveTextContent(/Path\sof\sthe\sPull\s·\sRung\s3\/9/i);
  // The rungs *replace* the bar and its counter — this is what keeps the pair from creeping back.
  expect(screen.queryByTestId("oath-progress-bar")).toBeNull();
  expect(strip()).not.toHaveTextContent(/0\s\/\s15/);
});

test("an oath with no path keeps the plain bar", async () => {
  // A streak or weekly-sessions oath names no movement, so there is no climb to show.
  mockGetOathProgress.mockResolvedValue(
    oath({ oath: { ...oath().oath, metric: "streak", exerciseId: null } }),
  );

  await mount();

  expect(strip()).not.toHaveTextContent(/Path\sof/i);
  expect(screen.getByTestId("oath-progress-bar")).toBeTruthy();
  expect(strip()).toHaveTextContent(/0\s\/\s15/);
});

test("a fulfilled oath is about its number again, not the path behind it", async () => {
  mockGetOathProgress.mockResolvedValue(oath({ current: 15, progress: 100, isFulfilled: true }));

  await mount();

  expect(strip()).toHaveTextContent(/Oath\sfulfilled\./);
  expect(strip()).not.toHaveTextContent(/Path\sof/i);
  expect(screen.getByTestId("oath-progress-bar")).toBeTruthy();
});

test("with no oath sworn, the same strip is the way to swear one", async () => {
  // The only entry to the feature from Home: it must hold the same place, not disappear.
  mockGetOathProgress.mockResolvedValue(null);

  await mount();

  expect(strip()).toHaveTextContent(/Swear an oath/);
  await userEvent.press(strip());
  expect(mockPush).toHaveBeenCalledWith("/oath");
});
