import { act, render, waitFor } from "@testing-library/react-native";
import { TamaguiProvider } from "tamagui";

import ExerciseDetails from "@/app/exercises/[id]";
import "@/i18n";
import config from "@/tamagui.config";

/**
 * Which of the two irreversible-looking buttons a hero is offered.
 *
 * Retire is the normal path; delete is the narrow one. Foreign keys are off on the device and
 * nine queries innerJoin `exercises`, so deleting a movement someone has already trained would
 * silently rewrite their volume, their village level and their records. The usage count is what
 * decides, and this asserts the screen actually asks it — not that a screen rendered.
 */

const mockGetExerciseById = jest.fn();
const mockGetExerciseUsage = jest.fn();

jest.mock("expo-router", () => ({
  useRouter: () => ({ push: jest.fn(), back: jest.fn() }),
  useLocalSearchParams: () => ({ id: "77" }),
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

jest.mock("@/components/common/Toast", () => ({
  useToast: () => ({
    showError: jest.fn(),
    showSuccess: jest.fn(),
    showInfo: jest.fn(),
    showToast: jest.fn(),
  }),
}));

jest.mock("@/db", () => ({
  getExerciseById: (id: number) => mockGetExerciseById(id),
  getExerciseUsage: (id: number) => mockGetExerciseUsage(id),
  isUserExercise: (ex: { creator: string }) => ex.creator !== "Admin",
  retireUserExercise: jest.fn(),
  unretireUserExercise: jest.fn(),
  deleteUserExercise: jest.fn(),
}));

jest.mock("@/db/exercises", () => ({
  getChainTo: () => Promise.resolve(null),
  getNextProgression: () => Promise.resolve(null),
}));

const heroMovement = {
  id: 77,
  enName: "Archer Squat",
  frName: "Archer Squat",
  enDescription: "Wide stance, shift over one leg.",
  frDescription: "Wide stance, shift over one leg.",
  imagePath: "assets/placeholder.webp",
  creator: "hero",
  difficulty: "medium",
  equipment: "none",
  style: "strength",
  secondsPerRep: 3,
  muscles: ["legs"],
  pattern: null,
  prerequisiteExerciseId: null,
  retiredAt: null,
};

async function mountDetails() {
  let result!: ReturnType<typeof render>;
  await act(() => {
    result = render(
      <TamaguiProvider config={config} defaultTheme="dark">
        <ExerciseDetails />
      </TamaguiProvider>,
    );
  });
  return result;
}

describe("hero movement actions", () => {
  beforeEach(() => {
    mockGetExerciseById.mockResolvedValue(heroMovement);
    mockGetExerciseUsage.mockReset();
  });

  it("offers delete only for a movement nothing has ever used", async () => {
    mockGetExerciseUsage.mockResolvedValue({ completedRows: 0, questRows: 0 });

    const screen = await mountDetails();

    await waitFor(() => expect(screen.getByTestId("exercise-delete")).toBeTruthy());
    expect(screen.queryByTestId("exercise-retire")).toBeNull();
  });

  it("offers retire instead once the movement has history", async () => {
    mockGetExerciseUsage.mockResolvedValue({ completedRows: 3, questRows: 0 });

    const screen = await mountDetails();

    await waitFor(() => expect(screen.getByTestId("exercise-retire")).toBeTruthy());
    expect(screen.queryByTestId("exercise-delete")).toBeNull();
  });

  it("offers retire when a quest still holds the movement, even with no results", async () => {
    mockGetExerciseUsage.mockResolvedValue({ completedRows: 0, questRows: 1 });

    const screen = await mountDetails();

    await waitFor(() => expect(screen.getByTestId("exercise-retire")).toBeTruthy());
  });

  it("falls back to retire when the usage count cannot be read", async () => {
    // Unknown usage means the safe answer, not a missing button.
    mockGetExerciseUsage.mockRejectedValue(new Error("no database"));

    const screen = await mountDetails();

    await waitFor(() => expect(screen.getByTestId("exercise-retire")).toBeTruthy());
    expect(screen.queryByTestId("exercise-delete")).toBeNull();
  });

  it("offers nothing on seed content", async () => {
    mockGetExerciseById.mockResolvedValue({ ...heroMovement, creator: "Admin" });
    mockGetExerciseUsage.mockResolvedValue({ completedRows: 0, questRows: 0 });

    const screen = await mountDetails();

    await waitFor(() => expect(screen.getByText("Archer Squat")).toBeTruthy());
    expect(screen.queryByTestId("exercise-edit")).toBeNull();
    expect(screen.queryByTestId("exercise-delete")).toBeNull();
    expect(screen.queryByTestId("exercise-retire")).toBeNull();
  });

  it("offers only the way back on a retired movement", async () => {
    mockGetExerciseById.mockResolvedValue({ ...heroMovement, retiredAt: new Date() });
    mockGetExerciseUsage.mockResolvedValue({ completedRows: 0, questRows: 0 });

    const screen = await mountDetails();

    // "Retire" promised the door opens both ways; without this it was one-way and the
    // catalogue's "Retired" facet could find the movement without doing anything with it.
    await waitFor(() => expect(screen.getByTestId("exercise-restore")).toBeTruthy());
    expect(screen.queryByTestId("exercise-retire")).toBeNull();
    expect(screen.queryByTestId("exercise-delete")).toBeNull();
    expect(screen.getByTestId("exercise-edit")).toBeTruthy();
  });
});
