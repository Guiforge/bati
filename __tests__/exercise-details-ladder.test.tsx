import { act, fireEvent, render, screen, waitFor, within } from "@testing-library/react-native";
import { TamaguiProvider } from "tamagui";

import ExerciseDetails from "@/app/exercises/[id]";
import "@/i18n";
import config from "@/tamagui.config";

// The path block used to live *inside* the next-step card, which only renders when a harder
// variation exists. So on the thirteen summits — Dragon Flag, Handstand Push-Up, Muscle-Up, the
// movements a hero opens out of ambition — the whole ladder was absent. These assertions are on
// the tree's contents, not on "the screen rendered": a screen missing its best block still
// renders.

const mockPush = jest.fn();

jest.mock("expo-router", () => ({
  useRouter: () => ({ push: mockPush, back: jest.fn() }),
  useLocalSearchParams: () => ({ id: "30" }),
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

const mockGetExerciseById = jest.fn();
const mockGetChainTo = jest.fn();
const mockGetNextProgression = jest.fn();

jest.mock("@/db", () => ({
  getExerciseById: (id: number) => mockGetExerciseById(id),
  // Seed content, so the hero actions never render here — this suite is about the ladder.
  isUserExercise: (ex: { creator: string }) => ex.creator !== "Admin",
  getExerciseUsage: () => Promise.resolve({ completedRows: 0, questRows: 0, preferenceRows: 0 }),
  retireUserExercise: jest.fn(),
  deleteUserExercise: jest.fn(),
}));
// The screen reads the hero's own numbers for this movement now, and `db/personalRecords` opens
// the database at import time. The ladder is what most of this file is about, so the journal is
// empty unless a test fills it. The arrow is what makes the `const` above legal: a factory body
// runs on first require, not at hoist time.
const mockGetExerciseHistory = jest.fn();
jest.mock("@/db/personalRecords", () => ({
  getExerciseHistory: (ids: number[]) => mockGetExerciseHistory(ids),
  ghostKey: (id: number, type: string) => `${id}:${type}`,
}));

jest.mock("@/db/exercises", () => ({
  getChainTo: (id: number) => mockGetChainTo(id),
  getNextProgression: (id: number) => mockGetNextProgression(id),
}));

const movement = (id: number, enName: string) => ({ id, enName, frName: enName, imagePath: "" });

const rung = (id: number, enName: string, isEarned: boolean) => ({
  exercise: movement(id, enName),
  metTarget: isEarned ? 3 : 0,
  required: 3,
  isEarned,
});

/** Dragon Flag — the top of the core lever path, so `getNextProgression` has nothing to return. */
const DRAGON_FLAG = {
  id: 30,
  enName: "Dragon Flag",
  frName: "Dragon flag",
  enDescription: "",
  frDescription: "",
  imagePath: "",
  creator: "Admin",
  difficulty: "hard" as const,
  equipment: "none" as const,
  style: "calisthenics" as const,
  secondsPerRep: 3,
  muscles: ["abs" as const],
  pattern: "core" as const,
  prerequisiteExerciseId: 20,
};

const CORE_PATH = ["Dead Bug", "Hollow Body Hold", "Dragon Flag"];

/**
 * Mount the Dragon Flag page with the hero standing on `position`, `earned` rungs marked as earned
 * lately, and `climbed` saying whether the summit is behind them.
 */
async function mountSummit(position: number, earned: boolean[], climbed = false) {
  mockGetChainTo.mockResolvedValue({
    rungs: CORE_PATH.map((name, i) => rung((i + 1) * 10, name, earned[i] === true)),
    position,
    climbed,
  });
  await mountScreen();
}

async function mountScreen() {
  await act(async () => {
    // Assigned rather than left as a bare statement: `render` returns a thenable-shaped result,
    // which the floating-promise rule reads as an unhandled promise.
    const _tree = render(
      <TamaguiProvider config={config} defaultTheme="dark">
        <ExerciseDetails />
      </TamaguiProvider>,
    );
    // Both ladder queries resolve on mount; let them land before any assertion runs.
    await Promise.resolve();
    return _tree;
  });
}

beforeEach(() => {
  jest.clearAllMocks();
  mockGetExerciseById.mockResolvedValue(DRAGON_FLAG);
  mockGetNextProgression.mockResolvedValue(null);
  mockGetExerciseHistory.mockResolvedValue(new Map());
});

describe("the path on the exercise screen", () => {
  it("speaks on a summit, where there is no next rung to hang it on", async () => {
    await mountSummit(1, [false, false, false]);

    // Named, not numbered: "rung 1 of 3" is a coordinate nobody can want or tell anyone about.
    expect(screen.getByText(/PATH OF THE DRAGON/i)).toBeTruthy();
  });

  it("names the rung the hero stands on, never the page's own movement", async () => {
    await mountSummit(1, [false, false, false]);

    // A beginner opening Dragon Flag is pointed at Dead Bug — the honest answer to "this is too hard".
    expect(screen.getByText(/You are on Dead Bug/i)).toBeTruthy();
  });

  it("opens that rung when tapped, so the path can be walked back down", async () => {
    await mountSummit(1, [false, false, false]);

    await act(async () => {
      await fireEvent.press(screen.getByText(/You are on Dead Bug/i));
    });

    await waitFor(() => expect(mockPush).toHaveBeenCalledWith("/exercises/10"));
  });

  it("declares the path climbed only once the hero has reached its top", async () => {
    await mountSummit(3, [true, true, true], true);

    expect(screen.getByText(/PATH OF THE DRAGON · CLIMBED/i)).toBeTruthy();
    // Nothing left to point at: a climbed path is not a to-do list.
    expect(screen.queryByText(/You are on/i)).toBeNull();
  });

  it("stays climbed after the summit's last clean sessions leave the window", async () => {
    // `isEarned` is windowed; where the hero stands is not. "Climbed" must not blink out after a
    // quiet summer (rule C, `rungsBehind`).
    await mountSummit(3, [false, false, false], true);

    expect(screen.getByText(/PATH OF THE DRAGON · CLIMBED/i)).toBeTruthy();
  });

  it("says where an unnamed path is going instead of calling its movement a rung", async () => {
    // "PLANK · RUNG 1/2" read as "the plank is rung 1". The chain ends on a movement with no path
    // name, so the caption says the hero is working up to it.
    mockGetChainTo.mockResolvedValue({
      rungs: [rung(10, "Dead Bug", false), rung(20, "Plank", false)],
      position: 1,
      climbed: false,
    });
    await mountScreen();

    expect(screen.getByText("WORKING UP TO PLANK · RUNG 1 OF 2")).toBeTruthy();
  });

  it("reads the climb from the hero's standing, never from one rung's recent sessions", async () => {
    // A top rung earned lately is not, on its own, a climbed path: `getChainTo` says whether it is.
    await mountSummit(1, [false, false, true]);

    expect(screen.getByText(/PATH OF THE DRAGON · RUNG 1\/3/i)).toBeTruthy();
    expect(screen.queryByText(/CLIMBED/i)).toBeNull();
  });

  it("counts what is left as a run of sessions, which is what earns the rung", async () => {
    // One clean session at the head: two more *in a row*, not "1 more time" out of three.
    mockGetChainTo.mockResolvedValue(null);
    mockGetNextProgression.mockResolvedValue({
      from: movement(30, "Dragon Flag"),
      next: movement(40, "Human Flag"),
      metTarget: 1,
      required: 3,
      isEarned: false,
      alsoNext: [],
    });
    await mountScreen();

    expect(screen.getByText("Hit your target 2 more sessions in a row to earn it.")).toBeTruthy();
  });
});

describe("a rung that forks", () => {
  beforeEach(() => mockGetChainTo.mockResolvedValue(null));

  it("names the movements the card has no room to illustrate", async () => {
    // Push-ups opens Dip, Pike Push-Up and Diamond Push-Up; the card announced Dip and stopped.
    mockGetNextProgression.mockResolvedValue({
      from: movement(30, "Push-ups"),
      next: movement(40, "Dip"),
      metTarget: 0,
      required: 3,
      isEarned: false,
      alsoNext: [movement(50, "Pike Push-Up"), movement(60, "Diamond Push-Up")],
    });
    await mountScreen();

    // The rung is the subject, not the card's headline: "Dip also leads to…" would be a different,
    // and false, sentence. The same words close the quest log and the victory card.
    expect(
      screen.getByText("The same rung also leads to Pike Push-Up, Diamond Push-Up."),
    ).toBeTruthy();
  });

  it("says nothing extra when the rung leads to one movement", async () => {
    mockGetNextProgression.mockResolvedValue({
      from: movement(30, "Wall Push-Up"),
      next: movement(40, "Knee Push-Up"),
      metTarget: 0,
      required: 3,
      isEarned: false,
      alsoNext: [],
    });
    await mountScreen();

    expect(screen.queryByText(/also leads to/i)).toBeNull();
  });
});

describe("the hero's own numbers", () => {
  const DAY = 24 * 60 * 60 * 1000;

  beforeEach(() => mockGetChainTo.mockResolvedValue(null));

  const withGhost = (best: number, bestAgoDays: number) =>
    mockGetExerciseHistory.mockResolvedValue(
      new Map([
        [
          "30:reps",
          { last: 18, best, at: Date.now() - DAY, bestAt: Date.now() - bestAgoDays * DAY },
        ],
      ]),
    );

  it("dates the record, in the Journal's words", async () => {
    // "best 25 reps" with no date reads as something done tonight, while the wall two taps away
    // said "Record 1:00 · 10 months ago" about the same movement.
    withGhost(25, 300);
    await mountScreen();

    // One node, so the line wraps as a whole: flat siblings let "Aug 15" break off from
    // "Record 1,000 reps" and sit alone under it.
    const record = within(screen.getByTestId("exercise-record"));
    expect(record.getByText("Record")).toBeTruthy();
    expect(record.getByText("25 reps")).toBeTruthy();
    expect(record.getByText("9 months ago")).toBeTruthy();
  });

  it("says a fresh record the way the wall says it", async () => {
    withGhost(25, 0);
    await mountScreen();

    expect(screen.getByText("set today")).toBeTruthy();
  });

  it("stays quiet about a record the last session equalled", async () => {
    withGhost(18, 1);
    await mountScreen();

    expect(screen.queryByText("Record")).toBeNull();
  });
});

describe("the tempo chip", () => {
  beforeEach(() => mockGetChainTo.mockResolvedValue(null));

  it("is not offered for a hold, which has no repetitions to pace", async () => {
    // Plank, Wall Sit and Side Plank all carry `secondsPerRep = 1` for the estimator, and the
    // page read "tempo 1s/rep" under a 45 s hold.
    mockGetExerciseById.mockResolvedValue({ ...DRAGON_FLAG, measure: "time", secondsPerRep: 1 });
    await mountScreen();

    expect(screen.queryByText(/tempo/i)).toBeNull();
  });

  it("stays on a counted movement", async () => {
    mockGetExerciseById.mockResolvedValue({ ...DRAGON_FLAG, measure: "reps" });
    await mountScreen();

    expect(screen.getByText("tempo 3s/rep")).toBeTruthy();
  });
});
