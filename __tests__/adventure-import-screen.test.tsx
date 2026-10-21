import { fireEvent, render, screen } from "@testing-library/react-native";
import type { ReactNode } from "react";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { TamaguiProvider } from "tamagui";
import "@/i18n";
import QuestImportScreen from "@/app/quest-import";
import { ImportFileButton } from "@/components/quests/QuestFileButtons";
import { AdventureFileError, type AdventurePreview } from "@/src/adventureFile";
import { holdIncomingFile, incomingFile } from "@/src/incomingFile";
import { QuestFileError } from "@/src/questFile";
import { reportError } from "@/src/reportError";
import config from "@/tamagui.config";

/**
 * The preview of an adventure someone sent. The file is parsed by the real reader
 * (`parseAdventureData`); only the reads and the write are stand-ins, so the screen is judged on
 * what it shows and on the call the import receives.
 */
const mockRead = jest.fn();
const mockPreview = jest.fn();
const mockPreviewQuest = jest.fn();
const mockImport = jest.fn();
const mockImportQuest = jest.fn();
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
  readBatiFile: (...a: unknown[]) => mockRead(...a),
  previewQuest: (...a: unknown[]) => mockPreviewQuest(...a),
  importQuest: (...a: unknown[]) => mockImportQuest(...a),
  pickQuestFile: (...a: unknown[]) => mockPick(...a),
}));
jest.mock("@/src/adventureFile", () => ({
  ...jest.requireActual("@/src/adventureFile"),
  previewAdventure: (...a: unknown[]) => mockPreview(...a),
  importAdventure: (...a: unknown[]) => mockImport(...a),
}));
jest.mock("@/src/reportError", () => ({ reportError: jest.fn() }));
jest.mock("@/components/common/Toast", () => ({
  useToast: () => ({ showError: mockShowError, showSuccess: mockShowSuccess }),
}));

const ADVENTURE_UUID = "0192b000-0000-7000-8000-000000000001";
const raw = {
  kind: "bati-adventure",
  version: 1,
  adventure: {
    uuid: ADVENTURE_UUID,
    title: "The long road",
    description: "Three days to the pass.",
    cover: null,
    end: { kind: "route" },
  },
  steps: [{ official: "Iron Dawn" }, { official: "Moon Walk" }, { official: "Stone Hour" }].map(
    (quest, i) => ({ quest, narrative: `before ${i}`, outro: "" }),
  ),
};

const preview = (over: Partial<AdventurePreview> = {}): AdventurePreview => ({
  steps: [
    { status: "here", questId: 1, title: "Iron Dawn" },
    { status: "brings", questId: null, title: "Moon Walk" },
    { status: "missing", questId: null, title: "Stone Hour" },
  ],
  existing: null,
  running: false,
  monster: null,
  monsterUnknown: false,
  ...over,
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

async function mountReady(over: Partial<AdventurePreview> = {}) {
  mockPreview.mockResolvedValue(preview(over));
  await render(wrap(<QuestImportScreen />));
  await screen.findByTestId("adventure-import-confirm");
}

const confirm = () => screen.getByTestId("adventure-import-confirm");

beforeEach(() => {
  jest.clearAllMocks();
  mockParams.n = String(holdIncomingFile("content://chat/adventure.bati-adventure.json"));
  mockSettings.language = "en";
  mockRead.mockResolvedValue(raw);
  mockImport.mockResolvedValue({ id: 77, updated: false });
  mockRouter.canGoBack.mockReturnValue(false);
});

test("an adventure shows its text and each step with where it comes from", async () => {
  await mountReady();

  expect(screen.getByText("Adventure received")).toBeTruthy();
  expect(mockRead).toHaveBeenCalledWith("content://chat/adventure.bati-adventure.json");
  expect(screen.getByText("The long road")).toBeTruthy();
  expect(screen.getByText("Three days to the pass.")).toBeTruthy();
  expect(screen.getByText("Steps")).toBeTruthy();
  expect(screen.getByText("Already on your phone")).toBeTruthy();
  expect(screen.getByText("Arrives with the adventure")).toBeTruthy();
  expect(screen.getByText("Unknown to your Bati, left out")).toBeTruthy();
  expect(screen.getByText("Add to my adventures")).toBeTruthy();
  expect(screen.queryByTestId("adventure-import-existing")).toBeNull();
});

test("a boss this version lacks says it arrives as a route", async () => {
  await mountReady({ monsterUnknown: true });
  expect(
    screen.getByText(
      "This boss does not exist in your version yet. The adventure arrives as a route.",
    ),
  ).toBeTruthy();
});

const golem = {
  key: "stone_golem" as const,
  bossImagePath: "assets/images/bosses/stone_golem.jpg",
  weakness: null,
  resistance: null,
};
const bossRaw = (lines: Record<string, string[]>) => ({
  ...raw,
  adventure: {
    ...raw.adventure,
    end: { kind: "boss", monster: "stone_golem", name: "Nightcoil", lines },
  },
});

test("the boss's lines are read before the import, every moment, with its name", async () => {
  mockRead.mockResolvedValue(
    bossRaw({ intro: ["Who dares?"], enrage: ["Enough."], defeat: ["Not like this."] }),
  );
  await mountReady({ monster: golem });

  expect(screen.getByTestId("adventure-import-boss-lines")).toBeTruthy();
  expect(screen.getByText("When the fight opens")).toBeTruthy();
  expect(screen.getByText("Who dares?")).toBeTruthy();
  expect(screen.getByText("Enough.")).toBeTruthy();
  expect(screen.getByText("When it falls")).toBeTruthy();
  expect(screen.getByText("Not like this.")).toBeTruthy();
  expect(screen.queryByText("When you hit it")).toBeNull();
});

test("a boss this version lacks shows no lines: it arrives as a route", async () => {
  mockRead.mockResolvedValue(bossRaw({ intro: ["Who dares?"] }));
  await mountReady({ monster: null, monsterUnknown: true });
  expect(screen.queryByTestId("adventure-import-boss-lines")).toBeNull();
});

test("an adventure the hero has offers to update it or keep both, and the choice is what is imported", async () => {
  await mountReady({ existing: { id: 5, title: "Mine" } });

  expect(screen.getByText("You already have this adventure: Mine")).toBeTruthy();
  expect(screen.getByText("Update my adventure")).toBeTruthy();
  await fireEvent.press(screen.getByTestId("adventure-import-copy"));
  expect(screen.getByText("Add to my adventures")).toBeTruthy();
  await fireEvent.press(confirm());

  expect(mockImport).toHaveBeenCalledTimes(1);
  expect(mockImport.mock.calls[0]?.[1]).toEqual({ asCopy: true });
  expect(mockImport.mock.calls[0]?.[0].adventure.uuid).toBe(ADVENTURE_UUID);
});

test("with a run under way the copy is forced: the line, no chips", async () => {
  await mountReady({ existing: { id: 5, title: "Mine" }, running: true });

  expect(
    screen.getByText("A playthrough of it is under way, so this one arrives beside it."),
  ).toBeTruthy();
  expect(screen.queryByTestId("adventure-import-update")).toBeNull();
  expect(screen.queryByTestId("adventure-import-copy")).toBeNull();
  expect(screen.getByText("Add to my adventures")).toBeTruthy();
});

test.each([
  [
    "a newer adventure",
    { ...raw, version: 3 },
    null,
    "This adventure comes from a newer Bati. Update the app to open it.",
  ],
  [
    "one step",
    { ...raw, steps: raw.steps.slice(0, 1) },
    null,
    "This file holds no Bati quest or adventure.",
  ],
])("%s is refused with its sentence under Adventure received", async (_n, data, _p, sentence) => {
  mockRead.mockResolvedValue(data);
  await render(wrap(<QuestImportScreen />));

  expect(await screen.findByText(sentence)).toBeTruthy();
  expect(screen.getByText("Adventure received")).toBeTruthy();
  expect(screen.queryByTestId("adventure-import-confirm")).toBeNull();
});

test("fewer than two steps this version has is refused as unknown_quest", async () => {
  mockPreview.mockResolvedValue(
    preview({
      steps: [
        { status: "here", questId: 1, title: "A" },
        { status: "missing", questId: null, title: "B" },
        { status: "missing", questId: null, title: "C" },
      ],
    }),
  );
  await render(wrap(<QuestImportScreen />));

  expect(
    await screen.findByText(
      "Fewer than 2 of its steps exist in your Bati yet. Update the app to open it.",
    ),
  ).toBeTruthy();
});

test("a reason raised by the preview is said as its own sentence", async () => {
  mockPreview.mockRejectedValue(new AdventureFileError("unreadable"));
  await render(wrap(<QuestImportScreen />));
  expect(
    await screen.findByText("This file cannot be read. Ask for it to be sent again."),
  ).toBeTruthy();
});

test("a database that fails during the preview is reported and reads as unreadable", async () => {
  const boom = new Error("db gone");
  mockPreview.mockRejectedValue(boom);
  await render(wrap(<QuestImportScreen />));
  expect(
    await screen.findByText("This file cannot be read. Ask for it to be sent again."),
  ).toBeTruthy();
  expect(reportError).toHaveBeenCalledWith("quests.import.read", boom);
});

test("an import lands on the adventure it filed, dismissing to the gallery first", async () => {
  await mountReady();
  await fireEvent.press(confirm());

  expect(mockImport.mock.calls[0]?.[1]).toEqual({ asCopy: false });
  expect(mockShowSuccess).toHaveBeenCalledWith("Adventure added to your adventures");
  expect(mockRouter.dismissTo).toHaveBeenCalledWith("/adventures");
  expect(mockRouter.push).toHaveBeenCalledWith("/adventures/77");
  expect(mockRouter.dismissTo.mock.invocationCallOrder[0]).toBeLessThan(
    mockRouter.push.mock.invocationCallOrder[0] ?? 0,
  );
  expect(incomingFile(mockParams.n)).toBeNull();
});

test("an update says so", async () => {
  mockImport.mockResolvedValue({ id: 5, updated: true });
  await mountReady({ existing: { id: 5, title: "Mine" } });
  await fireEvent.press(confirm());
  expect(mockShowSuccess).toHaveBeenCalledWith("Adventure updated, it replaces the old version");
});

test("a refusal at write time is a sentence, and the hero stays on the preview", async () => {
  mockImport.mockRejectedValue(new AdventureFileError("unknown_quest"));
  await mountReady();
  await fireEvent.press(confirm());

  expect(mockShowError).toHaveBeenCalledWith(
    "Fewer than 2 of its steps exist in your Bati yet. Update the app to open it.",
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

  expect(mockShowError).toHaveBeenCalledWith("The adventure could not be added. Try again.");
  expect(reportError).toHaveBeenCalledWith("adventures.import", boom);
});

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
  finish({ id: 77, updated: false });
  await screen.findByTestId("adventure-import-confirm");

  expect(mockImport).toHaveBeenCalledTimes(1);
});

test("back with nothing underneath goes to the adventures, with a screen underneath goes back", async () => {
  await mountReady();
  await fireEvent.press(screen.getByLabelText("Go back"));
  expect(mockRouter.replace).toHaveBeenCalledWith("/adventures");
  expect(mockRouter.back).not.toHaveBeenCalled();

  mockRouter.canGoBack.mockReturnValue(true);
  await fireEvent.press(screen.getByLabelText("Go back"));
  expect(mockRouter.back).toHaveBeenCalledTimes(1);
});

test("while the file is read the header is neutral and the spinner shows", async () => {
  mockRead.mockReturnValue(new Promise(() => {}));
  await render(wrap(<QuestImportScreen />));

  expect(screen.getByText("File received")).toBeTruthy();
  expect(screen.getByTestId("quest-import-loading")).toBeTruthy();
});

test("a read refused before the kind is known says the sentence for both kinds", async () => {
  mockRead.mockRejectedValue(new QuestFileError("not_a_quest"));
  await render(wrap(<QuestImportScreen />));
  expect(await screen.findByText("This file holds no Bati quest or adventure.")).toBeTruthy();
  expect(screen.getByText("File received")).toBeTruthy();
  mockRouter.canGoBack.mockReturnValue(false);
  await fireEvent.press(screen.getByLabelText("Go back"));
  expect(mockRouter.replace).toHaveBeenCalledWith("/quests");
});

describe("the Forge's import button", () => {
  const button = () =>
    wrap(
      <ImportFileButton
        label="forge.import"
        hint="forge.import_hint"
        failed="forge.import_failed"
        testID="adventure-import"
      />,
    );

  test("opens the preview with the uri held exactly, and stays on the page it was on", async () => {
    const uri =
      "content://com.android.externalstorage.documents/document/primary%3ADownload%2Fa.json";
    mockPick.mockResolvedValue(uri);
    mockRouter.canGoBack.mockReturnValue(true);
    await render(button());
    expect(screen.getByText("Import a received file")).toBeTruthy();
    await fireEvent.press(screen.getByTestId("adventure-import"));

    expect(mockRouter.back).not.toHaveBeenCalled();
    const target = mockRouter.push.mock.calls[0]?.[0] as string;
    expect(target).toMatch(/^\/quest-import\?n=\d+$/);
    expect(incomingFile(target.split("=")[1])).toBe(uri);
  });

  test("a picker that fails says the file sentence", async () => {
    const boom = new Error("no picker");
    mockPick.mockRejectedValue(boom);
    await render(button());
    await fireEvent.press(screen.getByTestId("adventure-import"));

    expect(mockShowError).toHaveBeenCalledWith("The file could not be opened. Try again.");
    expect(reportError).toHaveBeenCalledWith("quests.import", boom);
  });
});

// The kind decides where it lands, not the door that opened the screen.
test("a quest file opened from the adventure editor lands on the quest", async () => {
  mockRead.mockResolvedValue({
    kind: "bati-quest",
    version: 1,
    quest: {
      uuid: "0192b000-0000-7000-8000-0000000000aa",
      title: { en: "Iron Dawn" },
      description: { en: "" },
      rounds: 2,
      restSeconds: 30,
      roundRestSeconds: null,
      image: null,
    },
    slots: [{ movement: { official: "Push-up" }, target: { type: "reps", min: 8, max: 8 } }],
  });
  mockPreviewQuest.mockResolvedValue({
    slots: [{ exercise: null, available: true, target: { type: "reps", value: 8 } }],
    existing: null,
  });
  mockImportQuest.mockResolvedValue({ id: 42, updated: false });
  await render(wrap(<QuestImportScreen />));
  await screen.findByTestId("quest-import-title");
  expect(screen.getByText("Quest received")).toBeTruthy();
  await fireEvent.press(screen.getByTestId("quest-import-confirm"));

  expect(mockRouter.dismissTo).toHaveBeenCalledWith("/quests");
  expect(mockRouter.push).toHaveBeenCalledWith("/quests/42");
  expect(mockImport).not.toHaveBeenCalled();
});
