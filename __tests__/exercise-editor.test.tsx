import { act, fireEvent, render, waitFor } from "@testing-library/react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { TamaguiProvider } from "tamagui";

import ExerciseEditor from "@/app/exercises/new";
import config from "@/tamagui.config";

/**
 * Two fields and a fold.
 *
 * The minimum a movement needs to exist is a name and how to do it. Everything else has a schema
 * default that is honest on its own — and the one that is not, an empty muscle list, is reported
 * out loud by the balance card rather than absorbed.
 */

jest.mock("@/db/client", () => ({ db: {}, schema: {}, runMigrations: jest.fn() }));
jest.mock("@/db", () => ({ preferences: {} }));
jest.mock("@/i18n", () => ({ i18n: { changeLanguage: jest.fn(), t: (key: string) => key } }));
jest.mock("@/src/i18n/deviceLanguage", () => ({ getDevicePreferredAppLanguage: () => "en" }));

const mockCreate = jest.fn().mockResolvedValue(42);
const mockUpdate = jest.fn().mockResolvedValue(undefined);
const mockGetById = jest.fn().mockResolvedValue(null);

// Lazy wrappers, not `createUserExercise: mockCreate`: the `import` of the screen above is
// hoisted over these `const`s, so the factory runs while they are still undefined and the screen
// would bind `undefined` for the whole test file.
jest.mock("@/db/exercises", () => ({
  createUserExercise: (...args: unknown[]) => mockCreate(...args),
  updateUserExercise: (...args: unknown[]) => mockUpdate(...args),
  getExerciseById: (...args: unknown[]) => mockGetById(...args),
  isUserExercise: (ex: { creator: string }) => ex.creator !== "Admin",
  DEFAULT_USER_EXERCISE_DRAFT: {
    muscles: [],
    style: "strength",
    difficulty: "medium",
    equipment: "none",
    pattern: null,
    secondsPerRep: 3,
    imagePath: "assets/placeholder.webp",
  },
}));

const mockBack = jest.fn();
const mockParams: { id?: string } = {};
jest.mock("expo-router", () => ({
  useRouter: () => ({
    back: (...args: unknown[]) => mockBack(...args),
    replace: jest.fn(),
    push: jest.fn(),
  }),
  useLocalSearchParams: () => mockParams,
}));

const mockShowError = jest.fn();
jest.mock("@/components/common/Toast", () => ({
  useToast: () => ({
    showError: (...args: unknown[]) => mockShowError(...args),
    showSuccess: jest.fn(),
    showInfo: jest.fn(),
    showToast: jest.fn(),
  }),
}));

async function mountEditor() {
  let result!: ReturnType<typeof render>;
  await act(() => {
    result = render(
      <SafeAreaProvider
        initialMetrics={{
          frame: { x: 0, y: 0, width: 390, height: 844 },
          insets: { top: 0, left: 0, right: 0, bottom: 0 },
        }}
      >
        <TamaguiProvider config={config} defaultTheme="dark">
          <ExerciseEditor />
        </TamaguiProvider>
      </SafeAreaProvider>,
    );
  });
  return result;
}

describe("exercise editor", () => {
  beforeEach(() => {
    mockBack.mockClear();
    mockCreate.mockClear();
    mockUpdate.mockClear();
    mockShowError.mockClear();
    mockGetById.mockResolvedValue(null);
    delete mockParams.id;
  });

  it("saves with nothing but a name and a how-to", async () => {
    const editor = await mountEditor();

    await act(async () =>
      fireEvent.changeText(editor.getByTestId("exercise-name"), "Archer Squat"),
    );
    await act(async () =>
      fireEvent.changeText(
        editor.getByTestId("exercise-description"),
        "Wide stance, shift over one leg.",
      ),
    );
    await act(async () => fireEvent.press(editor.getByTestId("exercise-save")));

    await waitFor(() => {
      expect(mockCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          name: "Archer Squat",
          description: "Wide stance, shift over one leg.",
          muscles: [],
          style: "strength",
          secondsPerRep: 3,
        }),
      );
    });
    expect(mockBack).toHaveBeenCalled();
  });

  it("refuses a blank name and says so", async () => {
    const editor = await mountEditor();

    await act(async () => fireEvent.changeText(editor.getByTestId("exercise-name"), "   "));
    await act(async () => fireEvent.press(editor.getByTestId("exercise-save")));

    expect(mockCreate).not.toHaveBeenCalled();
    expect(mockShowError).toHaveBeenCalled();
  });

  it("carries a muscle picked in the fold into the draft", async () => {
    const editor = await mountEditor();

    await act(async () =>
      fireEvent.changeText(editor.getByTestId("exercise-name"), "Horse Stance"),
    );
    await act(async () => fireEvent.press(editor.getByTestId("exercise-details-toggle")));
    await act(async () => fireEvent.press(editor.getByTestId("exercise-muscle-legs")));
    await act(async () => fireEvent.press(editor.getByTestId("exercise-save")));

    await waitFor(() => {
      expect(mockCreate).toHaveBeenCalledWith(expect.objectContaining({ muscles: ["legs"] }));
    });
  });

  it("tells the hero the name is taken rather than swallowing the unique index", async () => {
    mockCreate.mockRejectedValueOnce(new Error("UNIQUE constraint failed: exercises.enName"));

    const editor = await mountEditor();
    await act(async () => fireEvent.changeText(editor.getByTestId("exercise-name"), "Squat"));
    await act(async () => fireEvent.press(editor.getByTestId("exercise-save")));

    await waitFor(() => {
      expect(mockShowError).toHaveBeenCalledWith(expect.stringMatching(/name/i));
    });
    expect(mockBack).not.toHaveBeenCalled();
  });

  it("loads a hero movement for editing and updates it in place", async () => {
    mockParams.id = "7";
    mockGetById.mockResolvedValue({
      id: 7,
      enName: "Punch",
      frName: "Punch",
      enDescription: "Straight from the hip.",
      frDescription: "Straight from the hip.",
      imagePath: "assets/placeholder.webp",
      creator: "hero",
      difficulty: "medium",
      equipment: "none",
      style: "strength",
      secondsPerRep: 3,
      muscles: ["arms"],
      pattern: null,
      prerequisiteExerciseId: null,
      retiredAt: null,
    });

    const editor = await mountEditor();

    await waitFor(() => {
      expect(editor.getByTestId("exercise-name").props.value).toBe("Punch");
    });

    await act(async () => fireEvent.press(editor.getByTestId("exercise-save")));

    await waitFor(() => {
      expect(mockUpdate).toHaveBeenCalledWith(
        7,
        expect.objectContaining({ name: "Punch", muscles: ["arms"] }),
      );
    });
    expect(mockCreate).not.toHaveBeenCalled();
  });

  it("refuses to load seed content into the editor", async () => {
    mockParams.id = "1";
    mockGetById.mockResolvedValue({
      id: 1,
      enName: "Squat",
      frName: "Squat",
      enDescription: "",
      frDescription: "",
      imagePath: "",
      creator: "Admin",
      difficulty: "medium",
      equipment: "none",
      style: "strength",
      secondsPerRep: 3,
      muscles: [],
      pattern: "squat",
      prerequisiteExerciseId: null,
      retiredAt: null,
    });

    const editor = await mountEditor();

    // A content update must never be clobbered — the form stays empty rather than offering it.
    await waitFor(() => {
      expect(mockGetById).toHaveBeenCalled();
    });
    expect(editor.getByTestId("exercise-name").props.value).toBe("");
  });
});
