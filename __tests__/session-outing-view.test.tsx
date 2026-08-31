import { act, render, screen } from "@testing-library/react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { TamaguiProvider } from "tamagui";

import { ActiveExerciseView } from "@/components/session/ActiveExerciseView";
import type { Quest } from "@/db/quests";
import { useSessionStore } from "@/stores/session";
import { useSettingsStore } from "@/stores/settings";
import config from "@/tamagui.config";

/**
 * An outing is time-based underneath, and for a while the screen said so twice.
 *
 * The comment above the panel claimed "an outing replaces the countdown entirely"; the gate only
 * ever covered the progress bar. So a hero walking round a lake got, stacked: the panel's 56px
 * distance, a 72px countdown that kept running while the panel's own moving clock auto-paused,
 * a "keep going" hint, and a ghost line offering last time's 900 seconds as something to beat.
 * At the target mark the countdown turned green and announced OVERTIME, with three ticks and a
 * "go" from a phone in a pocket, a third of the way round.
 *
 * The assertions are on what is on screen and what is not, in both directions: a gate that hid
 * the countdown from every timed set would pass half of this file, so the same set-up runs
 * again on a plain hold and asserts all four are back.
 */

jest.mock("@/db/client", () => ({ db: {}, schema: {}, runMigrations: jest.fn() }));
jest.mock("@/db/quests", () => ({ isDailyQuest: () => false }));
jest.mock("@/db/preferences", () => ({
  preferences: {
    getSavedSession: jest.fn().mockResolvedValue(null),
    setSavedSession: jest.fn().mockResolvedValue(undefined),
    clearSavedSession: jest.fn().mockResolvedValue(undefined),
    getWarmupEnabled: jest.fn().mockResolvedValue(false),
    getOwnedEquipment: jest.fn().mockResolvedValue(null),
  },
}));
jest.mock("@/db", () => ({ preferences: {} }));
jest.mock("@/src/i18n/deviceLanguage", () => ({ getDevicePreferredAppLanguage: () => "en" }));
jest.mock("expo-router", () => ({
  useRouter: () => ({ back: jest.fn(), replace: jest.fn(), canGoBack: () => true }),
}));

// The panel's store, without its database half: @/db/gps would pull SQLite into a renderer that
// has none, and the native module does not exist off-device.
jest.mock("@/db/gps", () => ({ appendPoints: jest.fn().mockResolvedValue(undefined) }));
jest.mock("@/modules/bati-location", () => ({
  isAvailable: () => false,
  start: () => false,
  stop: () => undefined,
  addListener: () => ({ remove: () => undefined }),
}));

// `mock`-prefixed: jest lifts these factories above every other declaration, so any other name
// reaches them as `undefined`.
const mockPlayCue = jest.fn();
jest.mock("@/src/sounds", () => ({
  playCue: (cue: string) => mockPlayCue(cue),
  warm: jest.fn(),
}));

const mockWalk = {
  id: 1,
  enName: "Walk",
  frName: "Marche",
  enDescription: null,
  frDescription: null,
  imagePath: "assets/images/exercises/walk.webp",
  creator: "Admin",
  difficulty: "easy",
  equipment: "none",
  style: "expedition",
  secondsPerRep: 1,
  muscles: ["legs"],
  pattern: "carry",
  prerequisiteExerciseId: null,
  retiredAt: null,
};

const mockPlank = { ...mockWalk, id: 2, enName: "Plank", frName: "Planche", style: "strength" };

jest.mock("@/db/exercises", () => ({
  listExercises: () => Promise.resolve([]),
  officialByName: () => undefined,
  pickableExercises: (all: unknown[]) => all,
  checkForNewRungs: jest.fn(),
  ADMIN_CREATOR: "Admin",
}));

import "@/i18n";

/** The three seconds before the target: the one window `useCountdownCues` is meant to beep in. */
const THREE_SECONDS_LEFT = 897_000;
/**
 * A frozen clock, because the window this file aims at is three seconds wide and `useSessionTimer`
 * reads `Date.now()` on every render. Left on the wall clock, a slow machine walks the mount past
 * the mark and the control case stops beeping for a reason that has nothing to do with the code.
 */
const NOW = 1_700_000_000_000;

function questWith(exercise: typeof mockWalk): Quest {
  return {
    id: 1,
    rounds: 1,
    restSeconds: 30,
    exercises: [
      {
        exercise,
        target: { type: "time", value: 900 },
        ghost: { last: 900, best: 1200 },
      },
    ],
  } as unknown as Quest;
}

async function mountRunning(exercise: typeof mockWalk) {
  useSettingsStore.setState({ soundEnabled: true, language: "en" });
  useSessionStore.setState({
    quest: questWith(exercise),
    status: "running",
    currentRoundIndex: 0,
    currentExerciseIndex: 0,
    bossFight: null,
    warmupSequence: [],
    warmupIndex: 0,
    results: [],
    timerStartTimestamp: NOW - THREE_SECONDS_LEFT,
    timerDuration: 900,
    lastPauseTimestamp: null,
  });

  await act(async () => {
    // Awaited: this testing-library's `render` is thenable, and a floating one leaves every
    // `screen` query reporting "render function has not been called".
    await render(
      <SafeAreaProvider
        initialMetrics={{
          frame: { x: 0, y: 0, width: 390, height: 844 },
          insets: { top: 0, left: 0, right: 0, bottom: 0 },
        }}
      >
        <TamaguiProvider config={config} defaultTheme="dark">
          <ActiveExerciseView />
        </TamaguiProvider>
      </SafeAreaProvider>,
    );
  });
}

// This file mounts the real session screen inside a real Tamagui provider, and the first test to
// do so pays for loading both. Alone that fits inside jest's five seconds; sharing a machine with
// a hundred other suites it does not, and the suite failed on cadence rather than on behaviour.
jest.setTimeout(30_000);

beforeEach(() => {
  mockPlayCue.mockClear();
  jest.spyOn(Date, "now").mockReturnValue(NOW);
});

afterEach(() => {
  jest.restoreAllMocks();
});

describe("a walk, on the screen a hero stares at while walking", () => {
  test("shows the panel and nothing that counts a prescribed duration down", async () => {
    await mountRunning(mockWalk);

    // The panel is the readout, and it is there.
    expect(screen.getByText("Finding the sky")).toBeTruthy();

    // The 72px numeral, its unit label, the hint under it, and the ghost line are all gone.
    expect(screen.queryByText("0:03")).toBeNull();
    expect(screen.queryByText("Seconds")).toBeNull();
    expect(screen.queryByText("Keep going! Timer continues after target.")).toBeNull();
    expect(screen.queryByText("Last time")).toBeNull();
  });

  // The cue fires from a phone in a pocket. Silence is the whole assertion.
  test("says nothing out loud three seconds before a mark it is not counting to", async () => {
    await mountRunning(mockWalk);

    expect(mockPlayCue).not.toHaveBeenCalled();
  });
});

describe("a plain hold, which still has a duration to count", () => {
  test("keeps the countdown, its hint and its ghost line", async () => {
    await mountRunning(mockPlank);

    expect(screen.queryByText("Finding the sky")).toBeNull();
    expect(screen.getByText("0:03")).toBeTruthy();
    expect(screen.getByText("Seconds")).toBeTruthy();
    expect(screen.getByText("Keep going! Timer continues after target.")).toBeTruthy();
    expect(screen.getByText("Last time")).toBeTruthy();
  });

  test("still beeps its way to the mark", async () => {
    await mountRunning(mockPlank);

    expect(mockPlayCue).toHaveBeenCalledWith("tick");
  });
});
