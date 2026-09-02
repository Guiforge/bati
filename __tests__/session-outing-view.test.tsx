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
    enTitle: "The Warden's Round",
    frTitle: "La Ronde du Veilleur",
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
  // Reduced motion, because the screen's entry springs run on real timers here: React Native's
  // Animated keeps updating an Animated(View) after the test that mounted it, and the suite spent
  // most of its wall clock waiting on transitions no assertion looks at.
  useSettingsStore.setState({ soundEnabled: true, language: "en", reducedMotion: true });
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

// This file mounts the real session screen inside a real Tamagui provider, and that costs about
// 45 s here no matter what the tests do: measured at six mounts and at two, with animations on
// and off, the number barely moves. It is the import graph and the provider, paid once, and the
// first test in the file is the one that pays it.
//
// So the timeout is not a guess about the assertions, it is the ceiling on that fixed cost when
// a hundred and twenty-nine other suites are sharing the machine, where the same suite has been
// measured at 160 s. Thirty seconds was enough until this branch added two mounts; then a
// pre-push run timed out and the next one passed, which is the worst shape a gate can take.
//
// Two things did help and are kept: six mounts became two, and reduced motion is on, which stops
// React Native's Animated from updating a view after the test that mounted it.
//
// ponytail: the real fix is for this screen to be testable without the whole provider tree, and
// that is a refactor of the screen, not of the test.
jest.setTimeout(180_000);

beforeEach(() => {
  mockPlayCue.mockClear();
  jest.spyOn(Date, "now").mockReturnValue(NOW);
});

afterEach(() => {
  jest.restoreAllMocks();
});

describe("a walk, on the screen a hero stares at while walking", () => {
  // One mount, three statements about the same frame. They were three tests, and three mounts of
  // the real screen inside a real Tamagui provider cost thirty seconds between them on a loaded
  // machine, which is how this suite started timing out on cadence rather than on behaviour.
  test("reads as an outing: a panel, no countdown, the quest named, and silence", async () => {
    await mountRunning(mockWalk);

    // The panel is the readout, and it is there.
    expect(screen.getByText("Finding the sky")).toBeTruthy();

    // The 72px numeral, its unit label, the hint under it, and the ghost line are all gone.
    expect(screen.queryByText("0:03")).toBeNull();
    expect(screen.queryByText("Seconds")).toBeNull();
    expect(screen.queryByText("Keep going! Timer continues after target.")).toBeNull();
    expect(screen.queryByText("Last time")).toBeNull();

    /**
     * An outing is one round of one movement, so the HUD's long form collapsed to "ROUND 1 / 1 ·
     * EXERCISE 1 / 1", and the percentage beside it measured a target the panel underneath
     * already refuses to print because on an outing the target is only a suggestion. Three pieces
     * of information, none of them one.
     */
    expect(screen.getByText("The Warden's Round")).toBeTruthy();
    expect(screen.queryByText(/ROUND 1 \/ 1/)).toBeNull();
    expect(screen.queryByText(/EXERCISE 1 \/ 1/)).toBeNull();
    expect(screen.queryByText("11%")).toBeNull();
    expect(screen.queryByText("100%")).toBeNull();

    // The cue fires from a phone in a pocket. Silence is the whole assertion.
    expect(mockPlayCue).not.toHaveBeenCalled();
  });
});

describe("a plain hold, which still has a duration to count", () => {
  // Same reason as above: one mount, and the three things a workout still owes the hero.
  test("keeps the countdown, its rounds and its beeps", async () => {
    await mountRunning(mockPlank);

    expect(screen.queryByText("Finding the sky")).toBeNull();
    expect(screen.getByText("0:03")).toBeTruthy();
    expect(screen.getByText("Seconds")).toBeTruthy();
    expect(screen.getByText("Keep going! Timer continues after target.")).toBeTruthy();
    expect(screen.getByText("Last time")).toBeTruthy();

    expect(screen.getByText("ROUND 1 / 1 · EXERCISE 1 / 1")).toBeTruthy();
    expect(screen.getByText("100%")).toBeTruthy();
    expect(screen.queryByText("The Warden's Round")).toBeNull();

    expect(mockPlayCue).toHaveBeenCalledWith("tick");
  });
});
