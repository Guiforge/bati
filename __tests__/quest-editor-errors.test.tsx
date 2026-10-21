import { act, fireEvent, render, waitFor } from "@testing-library/react-native";
import { Alert, StyleSheet } from "react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { TamaguiProvider } from "tamagui";

import QuestEditor from "@/app/(tabs)/quests/edit";
import { rawColors } from "@/constants/rawColors";
import config from "@/tamagui.config";

/**
 * Saving without a name used to raise the native grey Alert, then the app's own dialog over the
 * form. The error is on the field now: a red line under the name, or under "Add an exercise", and
 * nothing in between to dismiss.
 */

jest.mock("@/db/client", () => ({ db: {}, schema: {}, runMigrations: jest.fn() }));
jest.mock("@/i18n", () => ({ i18n: { changeLanguage: jest.fn(), t: (key: string) => key } }));
jest.mock("@/src/i18n/deviceLanguage", () => ({ getDevicePreferredAppLanguage: () => "en" }));

const mockCreate = jest.fn();
jest.mock("@/db", () => ({
  adventuresUsingQuest: jest.fn().mockResolvedValue([]),
  clearQuestConfig: jest.fn(),
  createQuestTemplate: (...args: unknown[]) => mockCreate(...args),
  deleteQuest: jest.fn(),
  getQuestConfig: jest.fn(),
  getQuestTemplateById: jest.fn(),
  heroFirst: (rows: unknown[]) => rows,
  listExercises: jest.fn().mockResolvedValue([]),
  pickableExercises: (rows: unknown[]) => rows,
  preferences: { getRestDefault: jest.fn().mockResolvedValue(null) },
  REST_RANGE: { min: 5, max: 300 },
  ROUNDS_RANGE: { min: 1, max: 10 },
  saveQuestConfig: jest.fn(),
  setQuestExercises: jest.fn(),
  TARGET_RANGE: { min: 1, max: 100 },
  targetRangeFor: () => ({ min: 1, max: 100 }),
  USER_QUEST_AUTHOR: "hero",
  updateQuestMeta: jest.fn(),
}));

const mockParams: { id?: string } = {};
jest.mock("expo-router", () => ({
  useRouter: () => ({ back: jest.fn(), replace: jest.fn(), push: jest.fn() }),
  useLocalSearchParams: () => mockParams,
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

describe("quest editor, saving an incomplete quest", () => {
  it("says so under the name, with no dialog and no native alert, and writes nothing", async () => {
    const alert = jest.spyOn(Alert, "alert").mockImplementation(() => undefined);
    const editor = await mountEditor();

    await act(async () => {
      await fireEvent.press(editor.getByTestId("quest-save"));
    });

    expect(editor.queryByTestId("confirm-dialog")).toBeNull();
    expect(editor.getByTestId("quest-name-error")).toHaveTextContent(
      "quests.editor_incomplete_name",
    );
    expect(alert).not.toHaveBeenCalled();
    expect(mockCreate).not.toHaveBeenCalled();
    alert.mockRestore();
  });

  it("marks the name field, and the line goes once they type", async () => {
    const editor = await mountEditor();
    await act(async () => {
      await fireEvent.press(editor.getByTestId("quest-save"));
    });

    expect(StyleSheet.flatten(editor.getByTestId("quest-name").props.style).borderTopColor).toBe(
      rawColors.error,
    );

    await fireEvent.changeText(editor.getByTestId("quest-name"), "Dawn");

    expect(editor.queryByTestId("quest-name-error")).toBeNull();
  });

  it("a named quest with no exercise says so under the add button, and writes nothing", async () => {
    const editor = await mountEditor();
    await fireEvent.changeText(editor.getByTestId("quest-name"), "Dawn");

    await act(async () => {
      await fireEvent.press(editor.getByTestId("quest-save"));
    });

    expect(editor.getByTestId("quest-exercises-error")).toHaveTextContent(
      "quests.editor_incomplete_exercises",
    );
    expect(editor.queryByTestId("quest-name-error")).toBeNull();
    expect(editor.queryByTestId("confirm-dialog")).toBeNull();
    expect(mockCreate).not.toHaveBeenCalled();
  });
});

describe("quest editor, a new quest", () => {
  it("opens on the rest the hero set in Settings, for both rests", async () => {
    const prefs = (require("@/db") as { preferences: { getRestDefault: jest.Mock } }).preferences;
    prefs.getRestDefault.mockResolvedValueOnce(45);
    delete mockParams.id;
    const editor = await mountEditor();

    expect(editor.getAllByText(/^45/)).toHaveLength(2);
  });

  it("opens on 30 s when the hero set none", async () => {
    delete mockParams.id;
    const editor = await mountEditor();

    expect(editor.getAllByText(/^30/)).toHaveLength(2);
  });

  it("leaves an existing quest on its own rest, whatever Settings say", async () => {
    const dbm = require("@/db") as {
      preferences: { getRestDefault: jest.Mock };
      getQuestTemplateById: jest.Mock;
    };
    dbm.preferences.getRestDefault.mockResolvedValue(45);
    dbm.getQuestTemplateById.mockResolvedValue({
      id: 7,
      enTitle: "Porch forge",
      frTitle: "Porch forge",
      enDescription: "",
      frDescription: "",
      rounds: 1,
      restSeconds: 20,
      roundRestSeconds: null,
      imagePath: null,
      exercises: [],
    });
    mockParams.id = "7";
    const editor = await mountEditor();
    dbm.preferences.getRestDefault.mockResolvedValue(null);

    expect(editor.queryAllByText(/^45/)).toHaveLength(0);
    expect(editor.getAllByText(/^20/)).toHaveLength(2);
  });
});

// A quest an adventure names cannot be deleted: the dialog says so, and nothing is written.
describe("quest editor, deleting a quest an adventure names", () => {
  const db = () =>
    require("@/db") as {
      adventuresUsingQuest: jest.Mock;
      deleteQuest: jest.Mock;
      getQuestTemplateById: jest.Mock;
    };

  beforeEach(() => {
    mockParams.id = "7";
    db().deleteQuest.mockClear();
    db().getQuestTemplateById.mockResolvedValue({
      id: 7,
      enTitle: "Porch forge",
      frTitle: "Porch forge",
      enDescription: "",
      frDescription: "",
      rounds: 1,
      restSeconds: 30,
      roundRestSeconds: null,
      imagePath: null,
      exercises: [],
    });
  });

  afterEach(() => {
    delete mockParams.id;
    db().adventuresUsingQuest.mockResolvedValue([]);
  });

  it("names the adventure, offers only to close, and deletes nothing", async () => {
    db().adventuresUsingQuest.mockResolvedValue([
      { enTitle: "Tale", frTitle: "Tale", deTitle: "Tale", esTitle: "Tale" },
    ]);
    const editor = await mountEditor();

    await act(async () => {
      await fireEvent.press(editor.getByLabelText("quests.editor_delete"));
    });

    expect(await editor.findByText("quests.editor_delete_in_use")).toBeTruthy();
    expect(db().adventuresUsingQuest).toHaveBeenCalledWith(7);
    expect(editor.queryByText("common.cancel")).toBeNull();
    expect(db().deleteQuest).not.toHaveBeenCalled();
  });

  it("asks the usual question when no adventure names it", async () => {
    const editor = await mountEditor();

    await act(async () => {
      await fireEvent.press(editor.getByLabelText("quests.editor_delete"));
    });

    expect(await editor.findByText("quests.editor_delete_body")).toBeTruthy();
    expect(editor.getByText("common.cancel")).toBeTruthy();
  });
});

describe("quest editor, the story field", () => {
  it("takes several lines and stops at 280, the cap an adventure's introduction has", async () => {
    const editor = await mountEditor();
    const field = editor.getByTestId("quest-description");

    expect(field.props.multiline).toBe(true);
    expect(field.props.maxLength).toBe(280);
  });

  it("a received quest's longer story is shown whole, not cut by the field", async () => {
    const dbm = require("@/db") as { getQuestTemplateById: jest.Mock };
    const story = "Once. ".repeat(80).trim();
    mockParams.id = "7";
    dbm.getQuestTemplateById.mockResolvedValue({
      id: 7,
      enTitle: "Long tale",
      frTitle: "Long tale",
      enDescription: story,
      frDescription: story,
      rounds: 1,
      restSeconds: 30,
      roundRestSeconds: null,
      imagePath: null,
      exercises: [],
    });
    try {
      const editor = await mountEditor();
      await waitFor(() => expect(editor.getByTestId("quest-description").props.value).toBe(story));
      expect(editor.getByTestId("quest-description").props.maxLength).toBe(story.length);
    } finally {
      delete mockParams.id;
    }
  });
});
