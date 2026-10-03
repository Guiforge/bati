import assert from "node:assert/strict";
import { fireEvent, render, screen } from "@testing-library/react-native";
import type { ReactNode } from "react";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { TamaguiProvider } from "tamagui";
import "@/i18n";
import QuestImportScreen from "@/app/quest-import";
import { ImportQuestButton } from "@/components/quests/QuestFileButtons";
import type { QuestTemplate } from "@/db/quests";
import { holdIncomingFile, incomingFile } from "@/src/incomingFile";
import { parseQuestFile, type QuestFile, QuestFileError, type QuestPreview } from "@/src/questFile";
import { reportError } from "@/src/reportError";
import config from "@/tamagui.config";

/**
 * The preview of a quest someone sent. The file is parsed and edited by the real code
 * (`parseQuestFile`, `editQuestFile`); only the reads and the write are stand-ins, so every test
 * asserts the file `importQuest` actually received rather than the screen's own idea of it.
 */
const mockRead = jest.fn();
const mockPreview = jest.fn();
const mockImport = jest.fn();
const mockPick = jest.fn();
const mockShowError = jest.fn();
const mockShowSuccess = jest.fn();
const mockRouter = {
  replace: jest.fn(),
  push: jest.fn(),
  dismissTo: jest.fn(),
  back: jest.fn(),
  canGoBack: jest.fn(),
};
const mockParams: { n?: string } = {};
const mockSettings = { language: "en", distanceUnit: "metric" };

jest.mock("@/db/client", () => ({ db: {}, schema: {}, runMigrations: jest.fn() }));
jest.mock("expo-router", () => ({
  useLocalSearchParams: () => mockParams,
  useRouter: () => mockRouter,
}));
jest.mock("expo-localization", () => ({
  getLocales: () => [{ languageCode: "en", languageTag: "en-US" }],
}));
jest.mock("@/stores/settings", () => {
  const useSettingsStore = (pick: (s: typeof mockSettings) => unknown) => pick(mockSettings);
  useSettingsStore.getState = () => mockSettings;
  return { useSettingsStore };
});
jest.mock("@/src/questFile", () => ({
  ...jest.requireActual("@/src/questFile"),
  readQuestFile: (...a: unknown[]) => mockRead(...a),
  previewQuest: (...a: unknown[]) => mockPreview(...a),
  importQuest: (...a: unknown[]) => mockImport(...a),
  pickQuestFile: (...a: unknown[]) => mockPick(...a),
}));
jest.mock("@/src/reportError", () => ({ reportError: jest.fn() }));
jest.mock("@/components/common/Toast", () => ({
  useToast: () => ({ showError: mockShowError, showSuccess: mockShowSuccess }),
}));

const UUID = "01890a5d-ac96-774b-bcce-b302099a8057";

/** Three movements: a seed one this phone has, a seed one it lacks, and the sender's own. */
const file: QuestFile = parseQuestFile(
  JSON.stringify({
    kind: "bati-quest",
    version: 1,
    quest: {
      uuid: UUID,
      title: { en: "Iron Dawn", fr: "Aube de fer", de: "Eisenmorgen", es: "Alba de hierro" },
      description: { en: "Before the sun." },
      rounds: 3,
      restSeconds: 30,
      roundRestSeconds: null,
      image: null,
    },
    slots: [
      { movement: { official: "Push-up" }, target: { type: "reps", min: 10, max: 12 } },
      { movement: { official: "Moon Walk" }, target: { type: "time", min: 30, max: 30 } },
      {
        movement: {
          own: {
            uuid: "01890a5d-ac96-774b-bcce-b302099a8058",
            name: "Bear crawl",
            description: "",
            image: "assets/placeholder.jpg",
            muscles: [],
            style: "calisthenics",
            difficulty: "easy",
            equipment: "none",
            pattern: null,
            measure: null,
            secondsPerRep: 3,
          },
        },
        target: { type: "reps", min: 8, max: 8 },
      },
    ],
  }),
);

const preview = (existing: QuestTemplate | null = null): QuestPreview => ({
  slots: [
    { exercise: null, available: true, target: { type: "reps" as const, value: 10 } },
    { exercise: null, available: false, target: { type: "reps" as const, value: 5 } },
    { exercise: null, available: true, target: { type: "reps" as const, value: 10 } },
  ],
  existing,
});

function wrap(children: ReactNode) {
  return (
    <SafeAreaProvider
      initialMetrics={{
        frame: { x: 0, y: 0, width: 400, height: 800 },
        insets: { top: 0, left: 0, right: 0, bottom: 0 },
      }}
    >
      <TamaguiProvider config={config} defaultTheme="dark">
        {children}
      </TamaguiProvider>
    </SafeAreaProvider>
  );
}

async function mount() {
  await render(wrap(<QuestImportScreen />));
}

async function mountReady(existing: QuestTemplate | null = null) {
  mockPreview.mockResolvedValue(preview(existing));
  await mount();
  await screen.findByTestId("quest-import-title");
}

const confirm = () => screen.getByTestId("quest-import-confirm");
const slot = (i: number) => screen.getByTestId(`quest-import-slot-${i}`);

/** The one file `importQuest` was given. */
function imported(): QuestFile {
  expect(mockImport).toHaveBeenCalledTimes(1);
  const sent = mockImport.mock.calls[0]?.[0] as QuestFile | undefined;
  assert(sent);
  return sent;
}

beforeEach(() => {
  jest.clearAllMocks();
  mockParams.n = String(holdIncomingFile("content://chat/quest.json"));
  mockSettings.language = "en";
  mockRead.mockResolvedValue(file);
  mockImport.mockResolvedValue({ id: 42, updated: false });
  mockRouter.canGoBack.mockReturnValue(false);
});

// A title read in English for a French hero put the sender's language in their gallery.
test("the title is the hero's language, and every movement this phone has comes ticked", async () => {
  mockSettings.language = "fr";
  await mountReady();

  expect(mockRead).toHaveBeenCalledWith("content://chat/quest.json");
  expect(screen.getByTestId("quest-import-title").props.value).toBe("Aube de fer");
  expect(screen.getByText("3 rounds")).toBeTruthy();
  expect(screen.queryByTestId("quest-import-slot-3")).toBeNull();
  expect(slot(0).props.accessibilityState).toEqual({ checked: true, disabled: false });
  expect(slot(2).props.accessibilityState).toEqual({ checked: true, disabled: false });
  expect(screen.getByText("Bear crawl")).toBeTruthy();
});

// A seed movement this version lacks refused the whole quest at import time.
test("a movement this version lacks is unticked, cannot be ticked, and stays out", async () => {
  await mountReady();

  expect(slot(1).props.accessibilityState).toEqual({ checked: false, disabled: true });
  expect(screen.getByText("Not in your version of Bati yet")).toBeTruthy();
  await fireEvent.press(slot(1));
  expect(slot(1).props.accessibilityState.checked).toBe(false);

  await fireEvent.press(confirm());

  const sent = imported();
  expect(sent.slots).toEqual([file.slots[0], file.slots[2]]);
  // Untouched, the title keeps the sender's four translations.
  expect(sent.quest.title).toEqual(file.quest.title);
  expect(sent.quest.uuid).toBe(UUID);
});

// The edits on screen must be the file written, not a preview the import ignores.
test("an unticked movement and a new title are what gets imported", async () => {
  await mountReady();

  await fireEvent.press(slot(0));
  expect(slot(0).props.accessibilityState.checked).toBe(false);
  await fireEvent.changeText(screen.getByTestId("quest-import-title"), "  My dawn  ");
  await fireEvent.press(confirm());

  const sent = imported();
  expect(sent.slots).toEqual([file.slots[2]]);
  expect(sent.quest.title).toEqual({ en: "My dawn", fr: "My dawn", de: "My dawn", es: "My dawn" });
});

// A quest with no movement, or no name, cannot be started once filed.
test("nothing ticked or a blank title leaves nothing to import", async () => {
  await mountReady();
  expect(screen.queryByText("Pick at least one exercise.")).toBeNull();

  await fireEvent.press(slot(0));
  await fireEvent.press(slot(2));
  expect(screen.getByText("Pick at least one exercise.")).toBeTruthy();
  expect(confirm()).toBeDisabled();
  await fireEvent.press(confirm());

  await fireEvent.press(slot(2));
  expect(confirm()).not.toBeDisabled();
  await fireEvent.changeText(screen.getByTestId("quest-import-title"), "   ");
  expect(confirm()).toBeDisabled();
  await fireEvent.press(confirm());

  expect(mockImport).not.toHaveBeenCalled();
});

// A file carrying the uuid of the hero's quest overwrote it without a word.
test("a quest the hero has says it will update, and keeping both imports under a new uuid", async () => {
  const mine = { id: 9, enTitle: "Iron Dawn", frTitle: "", deTitle: "", esTitle: "" };
  await mountReady(mine as unknown as QuestTemplate);

  expect(screen.getByTestId("quest-import-existing")).toBeTruthy();
  expect(screen.getByText("You already have this quest: Iron Dawn")).toBeTruthy();
  expect(screen.getByText("Update my quest")).toBeTruthy();

  await fireEvent.press(screen.getByTestId("quest-import-copy"));
  expect(screen.queryByText("Update my quest")).toBeNull();
  expect(screen.getByText("Add to my quests")).toBeTruthy();
  await fireEvent.press(confirm());

  const sent = imported();
  expect(sent.quest.uuid).not.toBe(UUID);
  expect(sent.quest.uuid).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-7/);
});

// A refused file showed a raw key, or nothing, instead of why.
test.each([
  [new QuestFileError("newer"), "This quest comes from a newer Bati. Update the app to open it."],
  [new QuestFileError("not_a_quest"), "This file holds no Bati quest."],
])("a refused file says why: %s", async (error, sentence) => {
  mockRead.mockRejectedValue(error);
  await mount();

  expect(await screen.findByText(sentence)).toBeTruthy();
  expect(screen.queryByTestId("quest-import-confirm")).toBeNull();
  expect(reportError).not.toHaveBeenCalled();
});

// Opened with no file, the screen waited forever on a read it never made.
test("no uri is an unreadable file", async () => {
  delete mockParams.n;
  await mount();

  expect(
    await screen.findByText("This file cannot be read. Ask for it to be sent again."),
  ).toBeTruthy();
  expect(mockRead).not.toHaveBeenCalled();
});

// A provider that failed is not the file's fault: it is reported, and the hero told to resend.
test("a read that fails for another reason is reported and reads as unreadable", async () => {
  const boom = new Error("provider died");
  mockRead.mockRejectedValue(boom);
  await mount();

  expect(
    await screen.findByText("This file cannot be read. Ask for it to be sent again."),
  ).toBeTruthy();
  expect(reportError).toHaveBeenCalledWith("quests.import.read", boom);
});

// After an import the hero must land on the quest, not back on a preview they could import again.
test("an import lands on the quest it filed", async () => {
  await mountReady();
  await fireEvent.press(confirm());

  expect(mockShowSuccess).toHaveBeenCalledWith("Quest added to yours");
  // Down to the gallery, then the quest: a replace left a second tab navigator on the stack, and
  // `dismissTo` the quest alone kept the picker's empty editor under it.
  expect(mockRouter.dismissTo).toHaveBeenCalledWith("/quests");
  expect(mockRouter.push).toHaveBeenCalledWith("/quests/42");
  // Imported, the file is released: a `bati://quest-import?n=` link cannot reopen it.
  expect(incomingFile(mockParams.n)).toBeNull();
  expect(mockRouter.replace).not.toHaveBeenCalled();
});

test("an import that updated says so", async () => {
  mockImport.mockResolvedValue({ id: 9, updated: true });
  await mountReady();
  await fireEvent.press(confirm());

  expect(mockShowSuccess).toHaveBeenCalledWith("Quest updated, it replaces the earlier version");
  expect(mockRouter.push).toHaveBeenCalledWith("/quests/9");
});

// A refusal at write time must still be a sentence, and must leave the hero on the preview.
test("an import refused by the writer says why and stays", async () => {
  mockImport.mockRejectedValue(new QuestFileError("unknown_movement"));
  await mountReady();
  await fireEvent.press(confirm());

  expect(mockShowError).toHaveBeenCalledWith(
    "This quest uses an exercise your Bati does not know yet. Update the app to open it.",
  );
  expect(mockRouter.dismissTo).not.toHaveBeenCalled();
  expect(reportError).not.toHaveBeenCalled();
  expect(confirm()).not.toBeDisabled();
});

test("an import that fails otherwise is reported", async () => {
  const boom = new Error("disk full");
  mockImport.mockRejectedValue(boom);
  await mountReady();
  await fireEvent.press(confirm());

  expect(mockShowError).toHaveBeenCalledWith("The quest could not be imported. Try again.");
  expect(reportError).toHaveBeenCalledWith("quests.import", boom);
});

// A double tap imported twice, the second reporting an update over the first.
test("a double tap imports once", async () => {
  let finish: (v: { id: number; updated: boolean }) => void = () => {};
  mockImport.mockReturnValue(
    new Promise((resolve) => {
      finish = resolve;
    }),
  );
  await mountReady();

  await fireEvent.press(confirm());
  await fireEvent.press(confirm());
  finish({ id: 42, updated: false });
  await screen.findByTestId("quest-import-confirm");

  expect(mockImport).toHaveBeenCalledTimes(1);
});

// Opened from a chat there is nothing underneath, and `back()` left the hero on a blank stack.
test("back with nothing underneath goes to the quests", async () => {
  await mountReady();
  await fireEvent.press(screen.getByLabelText("Go back"));

  expect(mockRouter.replace).toHaveBeenCalledWith("/quests");
  expect(mockRouter.back).not.toHaveBeenCalled();
});

test("back with a screen underneath goes back to it", async () => {
  mockRouter.canGoBack.mockReturnValue(true);
  await mountReady();
  await fireEvent.press(screen.getByLabelText("Go back"));

  expect(mockRouter.back).toHaveBeenCalledTimes(1);
  expect(mockRouter.replace).not.toHaveBeenCalled();
});

describe("ImportQuestButton", () => {
  const press = async () => {
    await render(wrap(<ImportQuestButton />));
    await fireEvent.press(screen.getByTestId("quest-import"));
  };

  // The picker used to import on its own, past the preview a tapped file gets. The URI is held
  // aside, never in the route: the router decoded `%3A` in it, and Android refused the read.
  test("a picked file opens the preview in place of the editor, its uri held exactly", async () => {
    const uri =
      "content://com.android.externalstorage.documents/document/primary%3ADownload%2Fq.json";
    mockPick.mockResolvedValue(uri);
    mockRouter.canGoBack.mockReturnValue(true);
    await press();

    expect(mockRouter.push).toHaveBeenCalledWith(expect.stringMatching(/^\/quest-import\?n=\d+$/));
    const target = mockRouter.push.mock.calls[0]?.[0] as string;
    expect(incomingFile(target.split("=")[1])).toBe(uri);
    // The empty editor closes first, or back from the imported quest landed on it.
    expect(mockRouter.back).toHaveBeenCalledTimes(1);
    expect(mockRouter.back.mock.invocationCallOrder[0]).toBeLessThan(
      mockRouter.push.mock.invocationCallOrder[0] ?? 0,
    );
    expect(mockRouter.replace).not.toHaveBeenCalled();
    expect(mockImport).not.toHaveBeenCalled();
  });

  test("backing out of the picker does nothing", async () => {
    mockPick.mockResolvedValue(null);
    await press();

    expect(mockRouter.push).not.toHaveBeenCalled();
    expect(mockShowError).not.toHaveBeenCalled();
  });

  test("a picker that fails is reported and said", async () => {
    const boom = new Error("no picker");
    mockPick.mockRejectedValue(boom);
    await press();

    expect(mockShowError).toHaveBeenCalledWith("The quest could not be imported. Try again.");
    expect(reportError).toHaveBeenCalledWith("quests.import", boom);
    expect(mockRouter.push).not.toHaveBeenCalled();
  });
});

// A slow provider (a Drive or Gmail download) left a header over an empty screen.
test("the file being read shows a spinner, not an empty screen", async () => {
  mockRead.mockReturnValue(new Promise(() => {}));
  await mount();

  expect(screen.getByTestId("quest-import-loading")).toBeTruthy();
  expect(screen.queryByTestId("quest-import-confirm")).toBeNull();
});

// Every row disabled and "pick at least one" under them was a dead end with nothing to pick.
test("a quest whose every movement this version lacks says to update", async () => {
  mockPreview.mockResolvedValue({
    slots: file.slots.map(() => ({
      exercise: null,
      available: false,
      target: { type: "reps" as const, value: 5 },
    })),
    existing: null,
  });
  await mount();

  expect(
    await screen.findByText(
      "This quest uses an exercise your Bati does not know yet. Update the app to open it.",
    ),
  ).toBeTruthy();
  expect(screen.queryByTestId("quest-import-confirm")).toBeNull();
});

// The field was filled in English, then the stored language (French) arrived: comparing against
// French read the untouched title as a rename and collapsed the four translations into one.
test("a language that changes during the preview is not a rename", async () => {
  await mountReady();
  mockSettings.language = "fr";
  await screen.rerender(wrap(<QuestImportScreen />));
  await fireEvent.press(confirm());

  expect(imported().quest.title).toEqual(file.quest.title);
});

// A second file opened over the preview kept the first one's choices, and imported them.
test("a second file opened over the preview is read afresh", async () => {
  await mountReady();
  await fireEvent.press(slot(0));
  expect(slot(0).props.accessibilityState.checked).toBe(false);

  mockRead.mockClear();
  mockParams.n = String(holdIncomingFile("content://chat/second.json"));
  await screen.rerender(wrap(<QuestImportScreen />));
  await screen.findByTestId("quest-import-title");

  expect(mockRead).toHaveBeenCalledWith("content://chat/second.json");
  expect(slot(0).props.accessibilityState.checked).toBe(true);
});
