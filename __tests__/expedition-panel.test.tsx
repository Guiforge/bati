import { act, render, screen } from "@testing-library/react-native";
import { TamaguiProvider } from "tamagui";
import { ExpeditionPanel } from "@/components/session/ExpeditionPanel";
import "@/i18n";
import config from "@/tamagui.config";

// The panel needs the store's state, not its database half: importing @/db/gps would pull the
// SQLite client into a renderer that has none.
jest.mock("@/db/gps", () => ({
  appendPoints: jest.fn().mockResolvedValue(undefined),
  pointsOf: jest.fn().mockResolvedValue([]),
  deletePoints: jest.fn().mockResolvedValue(undefined),
}));
jest.mock("@/modules/bati-location", () => ({
  isAvailable: () => false,
  start: () => false,
  stop: () => undefined,
  addListener: () => ({ remove: () => undefined }),
}));

// The session store is the real one, because the duration under test is its rule. Its database
// half is not: these are the same seams `session-outing-view` opens for the same reason.
jest.mock("@/db/client", () => ({ db: {}, schema: {}, runMigrations: jest.fn() }));
jest.mock("@/db", () => ({ preferences: {} }));
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
jest.mock("@/db/exercises", () => ({
  listExercises: () => Promise.resolve([]),
  officialByName: () => undefined,
  pickableExercises: (all: unknown[]) => all,
  checkForNewRungs: jest.fn(),
  ADMIN_CREATOR: "Admin",
}));
jest.mock("@/src/i18n/deviceLanguage", () => ({ getDevicePreferredAppLanguage: () => "en" }));

let mockUnit: "metric" | "imperial" = "metric";
jest.mock("@/stores/settings", () => ({
  useSettingsStore: (selector: (state: { distanceUnit: string }) => unknown) =>
    selector({ distanceUnit: mockUnit }),
}));

import { rawColors } from "@/constants/rawColors";
import type { Quest } from "@/db/quests";
import { EMPTY, type OutingGoal, type TrackState } from "@/src/gps/track";
import { useExpeditionStore } from "@/stores/expedition";
import { useSessionStore } from "@/stores/session";

/**
 * A frozen clock. `recordedDurationSeconds` falls back to the wall clock when no fix ever
 * locked, and half this file is about a figure counted to the second.
 */
const NOW = 1_700_000_000_000;

const aFix = (acc: number) => ({
  lat: 48.4728,
  lon: -2.4943,
  ele: 110,
  acc,
  speed: 1.4,
  distFromPrev: 1.4,
  t: 1_800_000_000_000,
});

/** One slot, outdoors, which is what makes the session an outing to every rule that asks. */
const walk = {
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

const outing = {
  id: 1,
  enTitle: "The Warden's Round",
  frTitle: "La Ronde du Veilleur",
  rounds: 1,
  restSeconds: 30,
  exercises: [{ exercise: walk, target: { type: "time", value: 900 } }],
} as unknown as Quest;

/**
 * A session in progress. `startTime` is what the session clock measures from, and it is set apart
 * from the trace on purpose: the two disagree after a resume, and which one the panel reads is
 * the whole of T10.
 */
function setSession(goal: OutingGoal | null, startedMsAgo = 0) {
  useSessionStore.setState({
    quest: outing,
    status: "running",
    goal,
    startTime: NOW - startedMsAgo,
    totalPausedTime: 0,
    restTakenSeconds: 0,
    timerStartTimestamp: NOW,
    timerDuration: 900,
    lastPauseTimestamp: null,
  });
}

function setTrack(
  track: Partial<TrackState>,
  extra: { error?: string | null; goalReached?: boolean; accuracyM?: number } = {},
) {
  useExpeditionStore.setState({
    track: { ...EMPTY, ...track },
    error: extra.error ?? null,
    lastFix: extra.accuracyM === undefined ? null : aFix(extra.accuracyM),
    goalReached: extra.goalReached ?? false,
  });
}

/** A trace that has been running for `seconds`, `moving` of them in motion. */
function walked(seconds: number, moving: number, distanceM: number): Partial<TrackState> {
  return {
    startedAt: NOW - seconds * 1000,
    lastAt: NOW,
    movingMs: moving * 1000,
    distanceM,
  };
}

function mount() {
  return render(
    <TamaguiProvider config={config} defaultTheme="dark">
      <ExpeditionPanel />
    </TamaguiProvider>,
  );
}

/**
 * The size of the type a figure is set in. Which figure gets 56px is the whole of T10, so the
 * assertions name the size rather than trusting reading order.
 */
function figureSize(text: string): number | undefined {
  return screen.getByText(text).props.style?.fontSize;
}

describe("ExpeditionPanel", () => {
  beforeEach(() => {
    jest.spyOn(Date, "now").mockReturnValue(NOW);
    mockUnit = "metric";
    setSession(null, 600_000);
    setTrack({});
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  /**
   * A blank readout while the receiver is warming up looks exactly like a broken one, and on a
   * de-Googled ROM the first fix takes minutes rather than seconds. The screen has to say which
   * of the two it is.
   */
  test("says it is looking for the sky rather than showing nothing", async () => {
    await mount();
    expect(screen.getByText("Finding the sky")).toBeTruthy();
  });

  test("shows the ground covered, through the format helper", async () => {
    setTrack(walked(600, 600, 2500));
    await mount();

    expect(screen.getByText("2.50 km")).toBeTruthy();
    expect(screen.getByText("10:00")).toBeTruthy();
  });

  // The unit is a display choice and nothing else: the same stored metres, read differently.
  test("the same run reads in miles when the hero asked for miles", async () => {
    mockUnit = "imperial";
    setTrack(walked(600, 600, 1609.344));
    await mount();

    expect(screen.getByText("1.00 mi")).toBeTruthy();
  });

  /**
   * One line, one unit. The accuracy was printed in metres by the string itself while the
   * distance a centimetre above it was in feet, so the same line read "1.00 mi · within 8 m" for
   * a hero who never asked for a metre. Both halves go through `constants/distanceFormat.ts`.
   */
  test("says the accuracy in the hero's own unit, like everything else on the line", async () => {
    mockUnit = "imperial";
    setTrack(walked(600, 600, 1609.344), { accuracyM: 8 });
    await mount();

    expect(screen.getByText("within 26 ft")).toBeTruthy();
  });

  test("and in metres for a hero who walks in kilometres", async () => {
    setTrack(walked(900, 900, 2500), { accuracyM: 8 });
    await mount();

    expect(screen.getByText("within 8 m")).toBeTruthy();
  });

  /**
   * The big figure carries the unit the hero set out in. A hero walking to five kilometres reads
   * the kilometres, and the clock steps down to the small line.
   */
  test("the goal in metres puts the metres in display type", async () => {
    setSession({ type: "distance", metres: 5000 }, 600_000);
    setTrack(walked(600, 600, 2500));
    await mount();

    expect(figureSize("2.50 km")).toBe(56);
    expect(figureSize("10:00")).toBe(24);
  });

  test("a free outing counts the clock up, and the ground goes below it", async () => {
    setTrack(walked(600, 600, 2500));
    await mount();

    expect(figureSize("10:00")).toBe(56);
    expect(figureSize("2.50 km")).toBe(24);
  });

  test("a goal in minutes reads the same way: the clock leads", async () => {
    setSession({ type: "time", seconds: 1800 }, 600_000);
    setTrack(walked(600, 600, 2500));
    await mount();

    expect(figureSize("10:00")).toBe(56);
    expect(figureSize("2.50 km")).toBe(24);
  });

  /**
   * The reason the clock is not `useSessionTimer`'s. A resume pushes `timerStartTimestamp`
   * forward by the whole dead time, so the session timer restarts at zero while the trace still
   * carries the three quarters of an hour the hero walked. `recordedDurationSeconds` reads the
   * trace, which is what the victory screen and the journal will read too.
   */
  test("a resumed outing keeps the forty-five minutes the trace remembers", async () => {
    setSession(null, 0); // session clock at zero: the app was killed and came back
    setTrack(walked(2700, 2700, 4200));
    await mount();

    expect(figureSize("45:00")).toBe(56);
    expect(screen.queryByText("0:00")).toBeNull();
  });

  /**
   * A blank readout looks broken, and so does a confident one. Before the first fix there is no
   * distance to report — not even under a goal in metres — so `0 m` at 56px was a verdict in
   * display type that a de-Googled phone held for minutes. The clock takes the slot, and the
   * sentence under it says what the wait is.
   */
  test("does not report a distance it has not measured yet", async () => {
    setSession({ type: "distance", metres: 5000 }, 90_000);
    await mount();

    expect(figureSize("1:30")).toBe(56);
    expect(screen.queryByText("0 m")).toBeNull();
    expect(screen.getByText("Finding the sky")).toBeTruthy();
    expect(
      screen.getByText(
        "The first fix can take a few minutes to arrive. Set off anyway, the trace will catch up.",
      ),
    ).toBeTruthy();
  });

  // The hint is a promise about a wait. A refused permission is not a wait, so it is not made.
  test("does not promise the trace will catch up when nothing is coming", async () => {
    setTrack({}, { error: "permission" });
    await mount();

    expect(
      screen.queryByText(
        "The first fix can take a few minutes to arrive. Set off anyway, the trace will catch up.",
      ),
    ).toBeNull();
  });

  test("a stopped hero is told they are stopped, not left to guess", async () => {
    setTrack({ ...walked(600, 600, 100), paused: true });
    await mount();
    expect(screen.getByText("Standing still")).toBeTruthy();
  });

  /**
   * Auto-pause is right and was unexplained: at a red light the figures freeze and a hero
   * glancing down sees a dead app. They dim with the line that explains them, and go back to full
   * colour the moment the hero moves, which is the un-pause said without a word.
   */
  test("dims the frozen figures while the pause holds", async () => {
    setTrack({ ...walked(600, 600, 100), paused: true });
    await mount();

    expect(screen.getByText("10:00").props.style?.color).toBe(rawColors.textSecondary);
    expect(screen.getByText("100 m").props.style?.color).toBe(rawColors.textSecondary);
  });

  // The other half of the pair, and the half that makes the first one mean something: the same
  // figures at the same values, undimmed, because the hero is moving.
  test("gives the figures back their full colour the moment the hero moves", async () => {
    setTrack(walked(600, 600, 100));
    await mount();

    expect(screen.getByText("10:00").props.style?.color).toBe(rawColors.text);
    expect(screen.getByText("100 m").props.style?.color).toBe(rawColors.text);
  });

  /**
   * Dimming says "this stopped"; a figure that keeps climbing under the words says the opposite,
   * and the words lose. `credited` counts elapsed time from the last fix, and a hero standing at
   * a crossing keeps receiving fixes, so the freeze has to be deliberate.
   */
  test("the big figure freezes with the auto-pause instead of climbing under the word", async () => {
    setTrack(walked(600, 600, 1200));
    await mount();
    expect(figureSize("10:00")).toBe(56);

    await act(() => {
      setTrack({ ...walked(900, 600, 1200), paused: true });
    });

    expect(figureSize("10:00")).toBe(56);
    expect(screen.getByText("Standing still")).toBeTruthy();
  });

  /**
   * "No signal" was told for four different problems, and a hero who refused the prompt walked
   * forty minutes being blamed on their reception. The two the hero can fix say what to fix.
   */
  test("a refused permission names the permission, not the reception", async () => {
    setTrack(walked(600, 600, 100), { error: "permission" });
    await mount();
    expect(screen.getByText("Bati has no access to your location")).toBeTruthy();
    expect(screen.queryByText("No signal")).toBeNull();
  });

  test("a denied foreground service reads the same way", async () => {
    setTrack(walked(600, 600, 100), { error: "foreground-denied" });
    await mount();
    expect(screen.getByText("Bati has no access to your location")).toBeTruthy();
  });

  /**
   * Location switched off mid-walk. The figures freeze, the notification two swipes away says
   * "GPS off", and the panel used to keep saying "On the road" over numbers that had stopped.
   */
  test("says the GPS is off when the provider goes down mid-walk", async () => {
    setTrack(walked(600, 600, 100), { error: "gps-off" });
    await mount();

    expect(screen.getByText("GPS off")).toBeTruthy();
    expect(screen.queryByText("On the road")).toBeNull();
  });

  /**
   * A refusal the app cannot ask about again is a dead end without this: the grant lives in
   * Android's own settings, and docs/designs/gps-without-google.md promised the way there.
   */
  test("a refused permission offers the way to the setting that fixes it", async () => {
    setTrack(walked(600, 600, 100), { error: "permission" });
    await mount();

    expect(screen.getByText("Open settings")).toBeTruthy();
  });

  test("and does not offer it when there is nothing to fix", async () => {
    setTrack(walked(600, 600, 100));
    await mount();

    expect(screen.queryByText("Open settings")).toBeNull();
  });

  // The codes the hero can do nothing about keep the honest name: from where they stand, the
  // phone is not receiving.
  test.each(["unavailable", "provider-missing", "no-context"])(
    "%s is still no signal",
    async (code) => {
      setTrack(walked(600, 600, 100), { error: code });
      await mount();
      expect(screen.getByText("No signal")).toBeTruthy();
    },
  );

  test("the status says the goal was reached, ahead of moving or standing still", async () => {
    setTrack(walked(600, 600, 3000), { goalReached: true });
    await mount();
    expect(screen.getByText("Goal met")).toBeTruthy();
    expect(screen.queryByText("On the road")).toBeNull();
  });
});
