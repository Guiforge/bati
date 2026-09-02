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

// This file mounts the real session screen inside a real Tamagui provider, and every test pays
// for it: six mounts, 46 s alone and 71 s sharing a machine with a hundred and twenty-nine other
// suites. Thirty seconds per test was enough until this branch added two more, and then the first
// walk test hit the ceiling on a pre-push run and passed on the next one, which is the worst
// shape a gate can take.
//
// Sixty is headroom, not a fix. The fix is to stop re-mounting the same frame: the four tests in
// the walk describe assert four things about one render, and could share it. That is a rewrite of
// the suite's shape, and it does not belong in a release commit.
//
// ponytail: per-test timeout raised twice now; mount once per describe when this suite is next
// opened for a real reason.
jest.setTimeout(60_000);

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

  /**
   * An outing is one round of one movement, so the HUD's long form collapsed to "ROUND 1 / 1 ·
   * EXERCISE 1 / 1", and the percentage beside it measured a target the panel underneath already
   * refuses to print because on an outing the target is only a suggestion. Three pieces of
   * information, none of them one.
   */
  test("names the quest in the HUD instead of counting to one twice", async () => {
    await mountRunning(mockWalk);

    expect(screen.getByText("The Warden's Round")).toBeTruthy();
    expect(screen.queryByText(/ROUND 1 \/ 1/)).toBeNull();
    expect(screen.queryByText(/EXERCISE 1 \/ 1/)).toBeNull();
    expect(screen.queryByText("11%")).toBeNull();
    expect(screen.queryByText("100%")).toBeNull();
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

  test("still counts its rounds and its way through them", async () => {
    await mountRunning(mockPlank);

    expect(screen.getByText("ROUND 1 / 1 · EXERCISE 1 / 1")).toBeTruthy();
    expect(screen.getByText("100%")).toBeTruthy();
    expect(screen.queryByText("The Warden's Round")).toBeNull();
  });

  test("still beeps its way to the mark", async () => {
    await mountRunning(mockPlank);

    expect(mockPlayCue).toHaveBeenCalledWith("tick");
  });
});
