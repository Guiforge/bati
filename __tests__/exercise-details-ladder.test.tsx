import { act, fireEvent, render, screen, waitFor } from "@testing-library/react-native";
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
  getExerciseUsage: () => Promise.resolve({ completedRows: 0, questRows: 0 }),
  retireUserExercise: jest.fn(),
  deleteUserExercise: jest.fn(),
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

/** Mount the Dragon Flag page with the hero standing on `position`, and `earned` rungs marked. */
async function mountSummit(position: number, earned: boolean[]) {
  mockGetChainTo.mockResolvedValue({
    rungs: CORE_PATH.map((name, i) => rung((i + 1) * 10, name, earned[i] === true)),
    position,
  });

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
    await mountSummit(3, [true, true, true]);

    expect(screen.getByText(/PATH OF THE DRAGON · CLIMBED/i)).toBeTruthy();
    // Nothing left to point at: a climbed path is not a to-do list.
    expect(screen.queryByText(/You are on/i)).toBeNull();
  });

  it("does not congratulate a beginner who mastered a high rung out of order", async () => {
    // The top rung is earned, but both rungs under it are still owed — `getChainTo` counts
    // contiguously from the bottom, so `position` stays 1.
    await mountSummit(1, [false, false, true]);

    expect(screen.getByText(/PATH OF THE DRAGON · RUNG 1\/3/i)).toBeTruthy();
    expect(screen.queryByText(/CLIMBED/i)).toBeNull();
  });
});
