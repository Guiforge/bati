import assert from "node:assert/strict";
import { act, fireEvent, render, waitFor } from "@testing-library/react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { TamaguiProvider } from "tamagui";

import AdventureEditor from "@/app/(tabs)/adventures/edit";
import "@/i18n";
import config from "@/tamagui.config";

/**
 * The adventure editor's wiring: what it refuses, what it hands the writer, and what it freezes.
 * The writer itself is proven on a real database in db-hero-adventures.test.ts.
 */

jest.mock("@/db/client", () => ({ db: {}, schema: {}, runMigrations: jest.fn() }));

const mockReplace = jest.fn();
const mockParams: { id?: string } = {};
jest.mock("expo-router", () => ({
  useRouter: () => ({ back: jest.fn(), replace: mockReplace, push: jest.fn() }),
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
jest.mock("@/hooks/useReminderPace", () => ({
  useReminderPace: () => null,
  adventureWeeksLabel: () => null,
}));
jest.mock("@/stores/settings", () => ({
  useSettingsStore: (selector?: (s: { language: string; reducedMotion: boolean }) => unknown) => {
    const state = { language: "en", reducedMotion: false };
    return selector ? selector(state) : state;
  },
}));

const quest = (id: number, title: string) => ({
  id,
  enTitle: title,
  frTitle: title,
  deTitle: title,
  esTitle: title,
  author: id > 100 ? "hero" : "Admin",
  imagePath: null,
  exercises: [],
});
const QUESTS = [quest(1, "Squire"), quest(2, "Ranger"), quest(101, "Porch forge")];

jest.mock("@/db", () => ({
  getRecentSessionHistory: jest.fn().mockResolvedValue([]),
  listExercises: jest.fn().mockResolvedValue([]),
  listQuestTemplates: jest.fn(),
  previewQuests: jest.fn().mockResolvedValue(new Map()),
  suggestDifficultyFromSessions: jest.fn().mockReturnValue({ level: "medium", adjusted: false }),
}));
jest.mock("@/db/bossFights", () => ({ bossHpForQuests: jest.fn().mockResolvedValue(321) }));
const mockOuting = jest.fn(() => false);
jest.mock("@/db/expeditions", () => ({ isOutingQuest: () => mockOuting() }));
jest.mock("@/db/preferences", () => ({ preferences: { getTrainingLevel: async () => "regular" } }));
jest.mock("@/db/questConfig", () => ({
  getAllQuestConfigs: async () => new Map(),
  startingDifficulty: () => "medium",
}));
jest.mock("@/db/quests", () => ({
  USER_QUEST_AUTHOR: "hero",
  trainingFocus: () => ({ archetype: null, muscles: [] }),
}));
jest.mock("@/db/heroAdventures", () => ({
  ...jest.requireActual("@/db/heroAdventures"),
  createHeroAdventure: jest.fn().mockResolvedValue(5),
  updateHeroAdventure: jest.fn().mockResolvedValue(undefined),
  retireHeroAdventure: jest.fn().mockResolvedValue(undefined),
  loadHeroAdventureDraft: jest.fn(),
  listMonsters: jest.fn().mockResolvedValue([
    {
      key: "shadow_serpent",
      bossImagePath: "assets/images/bosses/shadow_serpent.jpg",
      weakness: "abs",
      resistance: "legs",
    },
    {
      key: "iron_golem",
      bossImagePath: "assets/images/bosses/iron_golem.jpg",
      weakness: "chest",
      resistance: "back",
    },
  ]),
  recentSessionQuests: jest.fn().mockResolvedValue([]),
}));
// The sheet is a modal the test cannot drive; its contract is `onPick` of a quest.
jest.mock("@/components/adventures/QuestPickerSheet", () => ({
  QuestPickerSheet: ({
    quests,
    onPick,
    open,
  }: {
    quests: { id: number; enTitle: string }[];
    onPick: (q: unknown) => void;
    open: boolean;
  }) => {
    const { Text } = require("react-native");
    return open
      ? quests.map((q) => (
          <Text key={q.id} testID={`pick-${q.id}`} onPress={() => onPick(q)}>
            {q.enTitle}
          </Text>
        ))
      : null;
  },
}));

type Editor = Awaited<ReturnType<typeof render>>;

const hero = () => require("@/db/heroAdventures") as Record<string, jest.Mock>;

async function mount() {
  let result!: Editor;
  await act(async () => {
    result = await render(
      <SafeAreaProvider
        initialMetrics={{
          frame: { x: 0, y: 0, width: 390, height: 844 },
          insets: { top: 0, left: 0, right: 0, bottom: 0 },
        }}
      >
        <TamaguiProvider config={config} defaultTheme="dark">
          <AdventureEditor />
        </TamaguiProvider>
      </SafeAreaProvider>,
    );
  });
  // The catalogue loads after the first render.
  await waitFor(() => expect(hero().listMonsters).toHaveBeenCalled());
  return result;
}

async function pick(editor: Editor, ...ids: number[]) {
  for (const id of ids) {
    await fireEvent.press(editor.getByTestId("editor-add-step"));
    await fireEvent.press(await editor.findByTestId(`pick-${id}`));
  }
}

beforeEach(() => {
  jest.clearAllMocks();
  mockParams.id = undefined;
  mockOuting.mockReturnValue(false);
  (require("@/db") as { listQuestTemplates: jest.Mock }).listQuestTemplates.mockResolvedValue(
    QUESTS,
  );
  hero().recentSessionQuests?.mockResolvedValue([]);
});

describe("a new adventure", () => {
  test("refuses an empty name, then a lone step, and writes nothing", async () => {
    const editor = await mount();

    await fireEvent.press(editor.getByTestId("adventure-save"));
    expect(editor.getByTestId("adventure-name-error")).toHaveTextContent(
      "Give your adventure a name.",
    );

    await fireEvent.changeText(editor.getByTestId("adventure-name"), "Tale");
    await pick(editor, 1);
    await fireEvent.press(editor.getByTestId("adventure-save"));
    expect(editor.getByTestId("adventure-steps-error")).toHaveTextContent(
      "It needs at least two steps.",
    );
    expect(hero().createHeroAdventure).not.toHaveBeenCalled();
  });

  test("hands the writer the steps, their words and the monster it picked, then opens the page", async () => {
    const editor = await mount();
    await fireEvent.changeText(editor.getByTestId("adventure-name"), "  Tale  ");
    await pick(editor, 1, 101);
    const [firstWords] = editor.getAllByPlaceholderText(/forest is freezing/i);
    assert(firstWords);
    await fireEvent.changeText(firstWords, "Cold.");
    await fireEvent.press(editor.getByTestId("editor-end-boss"));
    await fireEvent.press(editor.getByTestId("editor-monster-iron_golem"));

    // The pool shown is the one the fight computes (`bossHpForQuests`).
    expect(await editor.findByText("about 321 HP at your level")).toBeTruthy();

    await fireEvent.press(editor.getByTestId("adventure-save"));

    await waitFor(() =>
      expect(hero().createHeroAdventure).toHaveBeenCalledWith({
        title: "Tale",
        description: "",
        imagePath: expect.any(String),
        end: { kind: "boss", monster: "iron_golem" },
        voice: { name: "", lines: { idle: [], crit: [], enrage: [] } },
        steps: [
          { questId: 1, narrative: "Cold.", outro: "" },
          { questId: 101, narrative: "", outro: "" },
        ],
      }),
    );
    expect(mockReplace).toHaveBeenCalledWith("/adventures/5");
  });

  test("eight steps are the most: the add button goes", async () => {
    const editor = await mount();
    await pick(editor, 1, 2, 1, 2, 1, 2, 1);
    expect(editor.getByTestId("editor-add-step")).toBeTruthy();
    await pick(editor, 2);
    expect(editor.queryByTestId("editor-add-step")).toBeNull();
  });

  test("a boss over steps that are all outings says they do not hit, and still saves", async () => {
    mockOuting.mockReturnValue(true);
    const editor = await mount();
    await fireEvent.changeText(editor.getByTestId("adventure-name"), "Walks");
    await pick(editor, 1, 2);
    await fireEvent.press(editor.getByTestId("editor-end-boss"));
    expect(editor.getByTestId("editor-outings-no-hit")).toBeTruthy();

    await fireEvent.press(editor.getByTestId("adventure-save"));
    await waitFor(() => expect(hero().createHeroAdventure).toHaveBeenCalled());
  });

  test("starts from the last sessions only when there are two, and fills the steps", async () => {
    const none = await mount();
    expect(none.queryByTestId("editor-from-recent")).toBeNull();
    await none.unmount();

    hero().recentSessionQuests?.mockResolvedValue([1, 2, 1]);
    const editor = await mount();
    await fireEvent.press(await editor.findByTestId("editor-from-recent"));
    expect(editor.getByTestId("editor-step-2")).toBeTruthy();
    // Nothing is saved by it.
    expect(hero().createHeroAdventure).not.toHaveBeenCalled();
  });

  test("the cover offers no photo: it must be one of the bundled covers", async () => {
    const editor = await mount();
    await fireEvent.press(editor.getByTestId("image-choice-preview"));
    expect(editor.queryByTestId("image-choice-photo")).toBeNull();
  });
});

describe("an adventure being edited", () => {
  const draft = (frozen: boolean) => ({
    title: "Tale",
    description: "Once",
    imagePath: "the_golem",
    end: { kind: "route" },
    voice: { name: "", lines: { idle: [], crit: [], enrage: [] } },
    steps: [
      { questId: 1, narrative: "a", outro: "back" },
      { questId: 2, narrative: "b", outro: "" },
    ],
    frozen,
  });

  test("with a playthrough under way the steps and the end are frozen and it cannot be retired", async () => {
    mockParams.id = "9";
    hero().loadHeroAdventureDraft?.mockResolvedValue(draft(true));
    const editor = await mount();
    expect(await editor.findByTestId("editor-frozen")).toBeTruthy();
    expect(editor.queryByTestId("editor-add-step")).toBeNull();
    expect(editor.queryByTestId("editor-retire")).toBeNull();
    // The way-back text that was written is still shown.
    expect(editor.getByDisplayValue("back")).toBeTruthy();
  });

  test("saving rewrites the same adventure and keeps its way-back text", async () => {
    mockParams.id = "9";
    hero().loadHeroAdventureDraft?.mockResolvedValue(draft(false));
    const editor = await mount();
    await editor.findByDisplayValue("Tale");
    await fireEvent.changeText(editor.getByTestId("adventure-name"), "Tale 2");
    await fireEvent.press(editor.getByTestId("adventure-save"));

    await waitFor(() =>
      expect(hero().updateHeroAdventure).toHaveBeenCalledWith(
        9,
        expect.objectContaining({
          title: "Tale 2",
          steps: [
            { questId: 1, narrative: "a", outro: "back" },
            { questId: 2, narrative: "b", outro: "" },
          ],
        }),
      ),
    );
    expect(mockReplace).toHaveBeenCalledWith("/adventures/9");
  });

  test("a step whose quest is gone leaves the form, and saving repairs the adventure", async () => {
    mockParams.id = "9";
    hero().loadHeroAdventureDraft?.mockResolvedValue({
      ...draft(false),
      steps: [
        { questId: 1, narrative: "", outro: "" },
        { questId: 0, narrative: "", outro: "" },
        { questId: 2, narrative: "", outro: "" },
      ],
    });
    const editor = await mount();
    await editor.findByDisplayValue("Tale");
    expect(editor.queryByTestId("editor-step-2")).toBeNull();
    await fireEvent.press(editor.getByTestId("adventure-save"));
    await waitFor(() =>
      expect(hero().updateHeroAdventure).toHaveBeenCalledWith(
        9,
        expect.objectContaining({
          steps: [
            { questId: 1, narrative: "", outro: "" },
            { questId: 2, narrative: "", outro: "" },
          ],
        }),
      ),
    );
  });

  test("retiring asks first, then retires and goes back to the gallery", async () => {
    mockParams.id = "9";
    hero().loadHeroAdventureDraft?.mockResolvedValue(draft(false));
    const editor = await mount();
    await editor.findByDisplayValue("Tale");

    await fireEvent.press(editor.getByTestId("editor-retire"));
    expect(hero().retireHeroAdventure).not.toHaveBeenCalled();
    await fireEvent.press(await editor.findByText("Retire"));

    await waitFor(() => expect(hero().retireHeroAdventure).toHaveBeenCalledWith(9));
    expect(mockReplace).toHaveBeenCalledWith("/adventures");
  });
});

describe("the boss's voice", () => {
  const bossDraft = (frozen: boolean) => ({
    title: "Tale",
    description: "",
    imagePath: "the_golem",
    end: { kind: "boss", monster: "iron_golem" },
    voice: { name: "Nightcoil", lines: { idle: ["Again."], crit: [], enrage: [] } },
    steps: [
      { questId: 1, narrative: "", outro: "" },
      { questId: 2, narrative: "", outro: "" },
    ],
    frozen,
  });

  test("the block shows for a boss only, and keeps what was typed through a switch to route", async () => {
    const editor = await mount();
    expect(editor.queryByTestId("editor-boss-name")).toBeNull();
    await fireEvent.press(editor.getByTestId("editor-end-boss"));
    await fireEvent.changeText(editor.getByTestId("editor-boss-name"), "Nightcoil");
    await fireEvent.press(editor.getByTestId("editor-end-route"));
    expect(editor.queryByTestId("editor-boss-name")).toBeNull();
    await fireEvent.press(editor.getByTestId("editor-end-boss"));
    expect(editor.getByDisplayValue("Nightcoil")).toBeTruthy();
  });

  test("a fourth line and a 61st character do not appear; save hands the writer the voice", async () => {
    const editor = await mount();
    await fireEvent.changeText(editor.getByTestId("adventure-name"), "Tale");
    await pick(editor, 1, 2);
    await fireEvent.press(editor.getByTestId("editor-end-boss"));
    await fireEvent.changeText(editor.getByTestId("editor-boss-name"), "Nightcoil");
    await fireEvent.changeText(editor.getByTestId("editor-boss-lines-idle"), "a\nb\nc\nd");
    await fireEvent.changeText(editor.getByTestId("editor-boss-lines-crit"), "x".repeat(70));
    expect(editor.getByTestId("editor-boss-lines-idle").props.value).toBe("a\nb\nc");
    await fireEvent.press(editor.getByTestId("adventure-save"));
    await waitFor(() =>
      expect(hero().createHeroAdventure).toHaveBeenCalledWith(
        expect.objectContaining({
          voice: {
            name: "Nightcoil",
            lines: { idle: ["a", "b", "c"], crit: ["x".repeat(60)], enrage: [] },
          },
        }),
      ),
    );
  });

  test("under a playthrough the end is frozen and the name still edits and saves", async () => {
    mockParams.id = "9";
    hero().loadHeroAdventureDraft?.mockResolvedValue(bossDraft(true));
    const editor = await mount();
    expect(await editor.findByTestId("editor-frozen")).toBeTruthy();
    await fireEvent.changeText(await editor.findByTestId("editor-boss-name"), "Nightcoil II");
    await fireEvent.press(editor.getByTestId("adventure-save"));
    await waitFor(() =>
      expect(hero().updateHeroAdventure).toHaveBeenCalledWith(
        9,
        expect.objectContaining({
          end: { kind: "boss", monster: "iron_golem" },
          voice: expect.objectContaining({ name: "Nightcoil II" }),
        }),
      ),
    );
  });

  test("the summary says the hero's name for the boss once there is one", async () => {
    mockParams.id = "9";
    hero().loadHeroAdventureDraft?.mockResolvedValue(bossDraft(false));
    const editor = await mount();
    await editor.findByDisplayValue("Tale");
    expect(editor.getByTestId("editor-summary")).toHaveTextContent(/Nightcoil/);
    await fireEvent.changeText(editor.getByTestId("editor-boss-name"), "");
    expect(editor.getByTestId("editor-summary")).not.toHaveTextContent(/Nightcoil/);
  });
});

describe("the balance sentences", () => {
  test("three steps that only push say so under the summary", async () => {
    const pushing = (id: number) => ({ ...quest(id, `Q${id}`), exercises: [{ exerciseId: 1 }] });
    const db = require("@/db") as { listQuestTemplates: jest.Mock; listExercises: jest.Mock };
    db.listQuestTemplates.mockResolvedValue([pushing(1), pushing(2)]);
    db.listExercises.mockResolvedValue([{ id: 1, muscles: ["chest"], pattern: "push_horizontal" }]);
    const editor = await mount();
    await pick(editor, 1, 2, 1);
    const [first] = await editor.findAllByTestId("editor-balance");
    expect(first).toHaveTextContent(/^3 steps in a row push without pulling/);
    db.listExercises.mockResolvedValue([]);
  });
});
