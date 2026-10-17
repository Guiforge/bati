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
jest.mock("@/db/quests", () => ({}));
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
  useSettingsStore: (selector: (state: { distanceUnit: string; language: string }) => unknown) =>
    selector({ distanceUnit: mockUnit, language: "en" }),
}));

import { defaultsOf } from "@/constants/outingDisplay";
import { rawColors } from "@/constants/rawColors";
import type { Quest } from "@/db/quests";
import { DEFAULT_LIVE_VIEW, type LiveView } from "@/src/gps/liveFigures";
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
  baro: null,
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

/** The view `beginTrackingIfOuting` froze for this outing; the default is today's panel. */
function setView(over: Partial<LiveView>) {
  useExpeditionStore.setState({ view: { ...DEFAULT_LIVE_VIEW, ...over } });
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
    setView({});
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

  test("the current league reads from where the league began, with its label", async () => {
    setTrack(walked(600, 250, 2500));
    useExpeditionStore.setState({ lap: { league: 2, fromMs: 60_000 } });
    setView({ big: "lap" });
    await mount();

    expect(screen.getByTestId("expedition-big").props.children).toBe("3:10");
    expect(screen.getByText("Current league")).toBeTruthy();
    useExpeditionStore.setState({ lap: { league: 0, fromMs: 0 } });
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

  test("says how much the hero has climbed, once the receiver has given a height", async () => {
    setTrack({ ...walked(900, 900, 2500), ascentM: 84.6, climbFrom: 190 });
    await mount();
    expect(screen.getByTestId("expedition-climb")).toHaveTextContent("85 m");
  });

  test("and says nothing about a climb on a receiver that reports no altitude", async () => {
    setTrack({ ...walked(900, 900, 2500), climbFrom: null });
    await mount();
    expect(screen.queryByTestId("expedition-climb")).toBeNull();
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
        "The first fix can take a few minutes to arrive. Set off anyway and the trace will catch up.",
      ),
    ).toBeTruthy();
  });

  // The hint is a promise about a wait. A refused permission is not a wait, so it is not made.
  test("does not promise the trace will catch up when nothing is coming", async () => {
    setTrack({}, { error: "permission" });
    await mount();

    expect(
      screen.queryByText(
        "The first fix can take a few minutes to arrive. Set off anyway and the trace will catch up.",
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

  // "261 m" said nothing about whether that was a warm-up for 15 km or most of a short stroll.
  test("a goal is shown under the figure that measures it, and a free outing shows none", async () => {
    setSession({ type: "distance", metres: 5000 }, 600_000);
    setTrack(walked(600, 600, 2500));
    await mount();
    expect(screen.getByText("of 5.00 km")).toBeTruthy();
  });

  // `goalReached` reads moving seconds. On the recorded total, red lights filled the bar minutes
  // before the goal was met.
  test("a time goal's bar fills on moving time, the clock the goal is met on", async () => {
    setSession({ type: "time", seconds: 600 }, 900_000);
    setTrack(walked(900, 300, 1000));
    await mount();
    const bar = screen.getByTestId("expedition-goal-fill");
    expect(bar.props.style.width).toBe("50%");
  });

  test("a free outing has no goal to show", async () => {
    setTrack(walked(600, 600, 2500));
    await mount();
    expect(screen.queryByTestId("expedition-goal")).toBeNull();
  });

  // The emulator reports a speed of 0 with every fix, and so do some receivers: the panel read
  // "..." for a ride that was covering ground.
  test("a receiver swearing to a standstill while the ground moves falls back to the average", async () => {
    setTrack(walked(600, 600, 2500));
    useExpeditionStore.setState({ recentSpeedMps: 0 });
    await mount();
    expect(screen.getByTestId("expedition-rate").props.children).toBe("4:00 /km");
  });

  test("once the auto-pause holds, a standstill reads as one", async () => {
    setTrack({ ...walked(600, 600, 2500), paused: true });
    useExpeditionStore.setState({ recentSpeedMps: 0 });
    await mount();
    expect(screen.getByTestId("expedition-rate").props.children).toBe("...");
  });

  test("every figure on the second row says what it is", async () => {
    setTrack(walked(600, 600, 2500));
    await mount();
    expect(screen.getByText("Distance")).toBeTruthy();
    expect(screen.getByText("Pace")).toBeTruthy();
  });

  describe("a walk-run", () => {
    const walkRunQuest = (extra: { prescribed?: number } = {}) =>
      ({
        ...outing,
        exercises: [{ ...outing.exercises[0], walkRun: true, ...extra }],
      }) as unknown as Quest;

    test("shows no pace, the coach paces it", async () => {
      setSession({ type: "time", seconds: 900 }, 600_000);
      useSessionStore.setState({ quest: walkRunQuest() });
      setView({ walkRun: true });
      setTrack(walked(600, 600, 2500));
      await mount();
      expect(screen.queryByTestId("expedition-rate")).toBeNull();
      expect(screen.queryByText("Pace")).toBeNull();
      expect(screen.getByText("Distance")).toBeTruthy();
    });

    // The flag is frozen with the view, so a pace never shows between two outings.
    test("shows it when the outing is not a walk-run", async () => {
      setSession({ type: "time", seconds: 900 }, 600_000);
      setView({ walkRun: false });
      setTrack(walked(600, 600, 2500));
      await mount();
      expect(screen.getByTestId("expedition-rate")).toBeTruthy();
    });

    test("a rate chosen for the big place falls back to the clock", async () => {
      setView({ walkRun: true, big: "rate" });
      setTrack(walked(600, 600, 2500));
      await mount();
      expect(screen.getByTestId("expedition-big").props.children).toBe("10:00");
      expect(screen.queryByText("Pace")).toBeNull();
    });
  });
});

/**
 * The default readout, pinned before the places became configurable: 3 activities x 3 goal
 * states, the order of figures and labels exactly as shipped (big without a label; second,
 * climb, rate). The outing display must leave all nine untouched when the hero changed nothing.
 */
function texts(node: unknown): string[] {
  if (typeof node === "string") return [node];
  if (Array.isArray(node)) return node.flatMap(texts);
  if (node && typeof node === "object" && "children" in node) {
    return texts((node as { children: unknown }).children ?? []);
  }
  return [];
}

describe("ExpeditionPanel default readout", () => {
  const withLocomotion = (locomotion: "walk" | "run" | "ride") =>
    ({
      ...outing,
      exercises: [{ ...outing.exercises[0], exercise: { ...walk, locomotion } }],
    }) as unknown as Quest;

  const goals: [string, OutingGoal | null, string[]][] = [
    ["no goal", null, ["10:00", "2.50 km", "Distance"]],
    ["a time goal", { type: "time", seconds: 1200 }, ["10:00", "of 20 min", "2.50 km", "Distance"]],
    [
      "a distance goal",
      { type: "distance", metres: 5000 },
      ["2.50 km", "of 5.00 km", "10:00", "Duration"],
    ],
  ];
  const rates = {
    walk: ["4:00 /km", "Pace"],
    run: ["4:00 /km", "Pace"],
    ride: ["15.0 km/h", "Speed"],
  };

  beforeEach(() => {
    jest.spyOn(Date, "now").mockReturnValue(NOW);
    mockUnit = "metric";
    setTrack({ ...walked(600, 600, 2500), climbFrom: 100, ascentM: 85 });
  });
  afterEach(() => jest.restoreAllMocks());

  test.each(
    (["walk", "run", "ride"] as const).flatMap((l) =>
      goals.map(([name, goal, head]) => [l, name, goal, head] as const),
    ),
  )("%s with %s", async (l, _name, goal, head) => {
    setSession(goal, 600_000);
    useSessionStore.setState({ quest: withLocomotion(l) });
    setView({ ...defaultsOf(l), locomotion: l });
    await mount();
    const seen = texts(screen.toJSON()).filter((x) => x.trim() !== "");
    // The figure/label order: big, [goal], second, its label, climb, its label, rate, its label.
    const expected = [...head, "85 m", "Climb", ...rates[l]];
    expect(seen.filter((x) => expected.includes(x))).toEqual(expected);
  });
});

describe("ExpeditionPanel with the hero's places", () => {
  beforeEach(() => {
    jest.spyOn(Date, "now").mockReturnValue(NOW);
    mockUnit = "metric";
    setSession(null, 600_000);
    setTrack({ ...walked(600, 600, 2500), climbFrom: 100, ascentM: 85 });
    setView({});
  });
  afterEach(() => jest.restoreAllMocks());

  test("a big number the hero chose carries its word, and the default big does not", async () => {
    setView({ big: "distance" });
    const { unmount } = await mount();
    expect(screen.getByTestId("expedition-big").props.children).toBe("2.50 km");
    // Two labels: the big's own, and the small one that is not in the big place.
    expect(screen.getAllByText("Distance")).toHaveLength(1);
    await unmount();

    setView({});
    await mount();
    expect(screen.queryByText("Duration")).toBeNull();
    expect(screen.getAllByText("Distance")).toHaveLength(1);
  });

  const ridePlusPushUps = () =>
    ({
      ...outing,
      exercises: [
        { ...outing.exercises[0], exercise: { ...walk, locomotion: "ride" } },
        { ...outing.exercises[0], exercise: { ...walk, style: "reps", locomotion: null } },
      ],
    }) as unknown as Quest;

  test("a ride on a mixed quest with a chosen speed in big reads Speed and km/h", async () => {
    useSessionStore.setState({ quest: ridePlusPushUps() });
    // What beginTrackingIfOuting freezes for it: the Ride tab, with speed in big.
    setView({ locomotion: "ride", rate: "speed", big: "rate" });
    await mount();
    expect(screen.getByTestId("expedition-big").props.children).toBe("15.0 km/h");
    expect(screen.getByText("Speed")).toBeTruthy();
    expect(screen.queryByText("Pace")).toBeNull();
  });

  test("a walk the hero reads in km/h says Speed and km/h, in the big place and the small ones", async () => {
    setView({ rate: "speed", big: "rate", small: ["rateAvg", null, null] });
    await mount();
    expect(screen.getByTestId("expedition-big").props.children).toBe("15.0 km/h");
    expect(screen.getByText("Speed")).toBeTruthy();
    expect(screen.getByText("Avg speed")).toBeTruthy();
    expect(screen.queryByText("Pace")).toBeNull();
    expect(screen.queryByText(/\/km/)).toBeNull();
  });

  test("a ride the hero reads as a pace says Pace and min per km", async () => {
    useSessionStore.setState({ quest: ridePlusPushUps() });
    setView({ locomotion: "ride", rate: "pace", big: "rate" });
    await mount();
    expect(screen.getByTestId("expedition-big").props.children).toBe("4:00 /km");
    expect(screen.getByText("Pace")).toBeTruthy();
  });

  test("the average has its own word, and the remaining figure counts down", async () => {
    setSession({ type: "distance", metres: 5000 }, 600_000);
    setView({ small: ["rateAvg", "remaining", null] });
    await mount();
    expect(screen.getByText("Avg pace")).toBeTruthy();
    expect(screen.getByText("4:00 /km")).toBeTruthy();
    expect(screen.getByText("To go")).toBeTruthy();
    // The big number (ground covered) and the 2.50 km still to go, by coincidence of this track.
    expect(screen.getAllByText("2.50 km")).toHaveLength(2);
  });

  test("every figure is one line that shrinks before it wraps", async () => {
    await mount();
    for (const id of ["expedition-big", "expedition-distance", "expedition-climb"]) {
      const node = screen.getByTestId(id);
      expect(node.props.numberOfLines).toBe(1);
      expect(node.props.adjustsFontSizeToFit).toBe(true);
    }
  });

  test("big numbers: the big figure is 72 and the smalls stack at 32", async () => {
    setView({ layout: "bigFigures" });
    await mount();
    expect(screen.getByTestId("expedition-big").props.style.fontSize).toBe(72);
    expect(screen.getByTestId("expedition-distance").props.style.fontSize).toBe(32);
  });

  test("the pocket hint is said when the screen will go off, and not when it stays on", async () => {
    setTrack({ ...walked(10, 10, 14), climbFrom: 100, ascentM: 0 });
    useSessionStore.setState({ startTime: NOW - 10_000 });
    const { unmount } = await mount();
    expect(screen.getByText(/put the phone away/)).toBeTruthy();
    await unmount();

    setView({ keepAwake: true });
    await mount();
    expect(screen.queryByText(/put the phone away/)).toBeNull();
  });

  // A mixed quest holds the screen for its push-ups whatever the setting says, so the hint that
  // the screen will go dark would be false there.
  test("no pocket hint on a mixed quest, whatever keepAwake says", async () => {
    const mixed = {
      ...outing,
      exercises: [
        ...outing.exercises,
        { ...outing.exercises[0], exercise: { ...walk, style: "reps" } },
      ],
    } as unknown as Quest;
    useSessionStore.setState({ quest: mixed, startTime: NOW - 10_000 });
    setTrack({ ...walked(10, 10, 14) });
    setView({ keepAwake: false });
    await mount();
    expect(screen.queryByText(/put the phone away/)).toBeNull();
  });
});
