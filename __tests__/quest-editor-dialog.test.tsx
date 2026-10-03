import { act, fireEvent, render } from "@testing-library/react-native";
import { Alert, StyleSheet } from "react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { TamaguiProvider } from "tamagui";

import QuestEditor from "@/app/(tabs)/quests/edit";
import { rawColors } from "@/constants/rawColors";
import config from "@/tamagui.config";

/**
 * Saving without a name used to raise the native grey Alert, the only off-palette surface in a
 * dark-only app. It is the app's own dialog now, and the field says which piece is missing.
 */

jest.mock("@/db/client", () => ({ db: {}, schema: {}, runMigrations: jest.fn() }));
jest.mock("@/i18n", () => ({ i18n: { changeLanguage: jest.fn(), t: (key: string) => key } }));
jest.mock("@/src/i18n/deviceLanguage", () => ({ getDevicePreferredAppLanguage: () => "en" }));

const mockCreate = jest.fn();
jest.mock("@/db", () => ({
  clearQuestConfig: jest.fn(),
  createQuestTemplate: (...args: unknown[]) => mockCreate(...args),
  deleteQuest: jest.fn(),
  getQuestConfig: jest.fn(),
  getQuestTemplateById: jest.fn(),
  heroFirst: (rows: unknown[]) => rows,
  listExercises: jest.fn().mockResolvedValue([]),
  pickableExercises: (rows: unknown[]) => rows,
  REST_RANGE: { min: 5, max: 300 },
  ROUNDS_RANGE: { min: 1, max: 10 },
  saveQuestConfig: jest.fn(),
  setQuestExercises: jest.fn(),
  TARGET_RANGE: { min: 1, max: 100 },
  targetRangeFor: () => ({ min: 1, max: 100 }),
  USER_QUEST_AUTHOR: "hero",
  updateQuestMeta: jest.fn(),
}));

jest.mock("expo-router", () => ({
  useRouter: () => ({ back: jest.fn(), replace: jest.fn(), push: jest.fn() }),
  useLocalSearchParams: () => ({}),
  useNavigation: () => ({ addListener: () => () => undefined, dispatch: jest.fn() }),
}));
jest.mock("@/components/common/Toast", () => ({
  useToast: () => ({
    showError: jest.fn(),
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
          <QuestEditor />
        </TamaguiProvider>
      </SafeAreaProvider>,
    );
  });
  return result;
}

describe("quest editor, saving without a name", () => {
  it("says so in the app's own dialog, not a native alert, and writes nothing", async () => {
    const alert = jest.spyOn(Alert, "alert").mockImplementation(() => undefined);
    const editor = await mountEditor();

    await act(async () => {
      await fireEvent.press(editor.getByTestId("quest-save"));
    });

    expect(editor.getByTestId("confirm-dialog")).toBeTruthy();
    expect(editor.getByText("Your quest needs a name.")).toBeTruthy();
    expect(alert).not.toHaveBeenCalled();
    expect(mockCreate).not.toHaveBeenCalled();
    alert.mockRestore();
  });

  it("closes on the button and marks the name field until they type", async () => {
    const editor = await mountEditor();
    await act(async () => {
      await fireEvent.press(editor.getByTestId("quest-save"));
    });
    await act(async () => {
      await fireEvent.press(editor.getByTestId("confirm-dialog-confirm"));
    });

    expect(editor.queryByTestId("confirm-dialog")).toBeNull();
    expect(StyleSheet.flatten(editor.getByTestId("quest-name").props.style).borderTopColor).toBe(
      rawColors.error,
    );
  });
});
