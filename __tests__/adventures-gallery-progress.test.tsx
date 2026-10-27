import { render, screen, within } from "@testing-library/react-native";
import { TamaguiProvider } from "tamagui";

import AdventuresGallery from "@/app/(tabs)/adventures/index";
import "@/i18n";
import config from "@/tamagui.config";

/**
 * Every adventure under way shows its own progress on its poster. A hero can have a game
 * adventure and one of their own going at once (`docs/gameplay/adventures.md`), and the step track
 * used to be filled for the newest run only: the older poster stayed empty and never moved.
 */

jest.mock("@/hooks/useSetAside");
jest.mock("@/db/client", () => ({ db: {}, schema: {}, runMigrations: jest.fn() }));
jest.mock("expo-router", () => ({
  useRouter: () => ({ push: jest.fn(), replace: jest.fn(), back: jest.fn() }),
  useLocalSearchParams: () => ({}),
  useFocusEffect: (effect: () => void) => {
    const React = require("react");
    React.useEffect(effect, [effect]);
  },
}));
jest.mock(
  "react-native-safe-area-context",
  () => require("react-native-safe-area-context/jest/mock").default,
);
jest.mock("@/components/chorus/screenCues", () => ({
  useScreenGuide: jest.fn(),
  useAmbientVisit: jest.fn(),
}));
jest.mock("@/components/chorus/VillagerLine", () => ({ VillagerLine: () => null }));
jest.mock("@/hooks/useReminderPace", () => ({
  useReminderPace: () => null,
  adventureWeeksLabel: () => null,
}));
// The gallery's list is virtualized and measures nothing under jest: a plain map renders rows.
jest.mock("@legendapp/list/react-native", () => ({
  LegendList: ({
    data,
    renderItem,
  }: {
    data: unknown[];
    renderItem: (a: { item: unknown; index: number }) => React.ReactNode;
  }) => {
    const { Fragment, createElement } = require("react");
    return data.map((item, index) =>
      createElement(Fragment, { key: index }, renderItem({ item, index })),
    );
  },
}));

type Progress = { adventureId: number; completedCount: number; currentIndex: number };

const mockAdventures = jest.fn();
/** What the gallery reads for the runs under way: every run, newest first. */
const mockProgress = jest.fn<Promise<Progress[]>, []>();

/**
 * The old single-run read, answering for the newest run only. The fixed screen no longer calls
 * it; it stays mocked so the suite is red on a screen that still does.
 */
const mockNewestOnly = async () => {
  const [newest] = await mockProgress();
  if (!newest) return null;
  const status = (i: number) =>
    i < newest.completedCount ? "completed" : i === newest.currentIndex ? "active" : "locked";
  const steps = [0, 1, 2].map((stepIndex) => ({ stepIndex, status: status(stepIndex) }));
  return {
    adventureId: newest.adventureId,
    activeRun: { run: {}, steps, activeStep: steps.find((s) => s.status === "active") ?? null },
  };
};

jest.mock("@/db", () => ({
  ...jest.requireActual("@/db"),
  listExercises: () => Promise.resolve([]),
  previewQuests: () => Promise.resolve(new Map()),
  listAdventures: () => mockAdventures(),
  getAnyActiveAdventureRun: () => mockNewestOnly(),
  activeRunProgress: () => mockProgress(),
  activeRunAdventureIds: async () => new Set((await mockProgress()).map((p) => p.adventureId)),
  getFinishedRunCountsByAdventure: () => Promise.resolve(new Map()),
  getRecentSessionHistory: () => Promise.resolve([]),
}));
jest.mock("@/db/questConfig", () => ({
  getAllQuestConfigs: () => Promise.resolve(new Map()),
  startingDifficulty: () => "medium",
}));
jest.mock("@/db/preferences", () => ({
  preferences: { getTrainingLevel: async () => "regular" },
}));

const quest = (id: number, title: string) => ({
  id,
  enTitle: title,
  frTitle: title,
  enDescription: "d",
  frDescription: "d",
  imagePath: null,
  rounds: 1,
  restSeconds: 30,
  author: "Admin",
  exercises: [],
});

const adventure = (id: number, title: string) => ({
  id,
  enTitle: title,
  frTitle: title,
  enDescription: "d",
  frDescription: "d",
  imagePath: null,
  kind: "route",
  stepsCount: 3,
  focus: { archetype: null, muscles: [] },
  bossTotalHp: null,
  coverQuest: quest(id, title),
});

async function mount() {
  await render(
    <TamaguiProvider config={config} defaultTheme="dark">
      <AdventuresGallery />
    </TamaguiProvider>,
  );
}

/** Each poster's progress label by its title, undefined when the poster carries none. */
const progressByTitle = () =>
  Object.fromEntries(
    ["The Long Road", "Bare Road"].map((title) => {
      const card = screen
        .getAllByTestId("adventures-adventure-card")
        .find((c) => within(c).queryByText(title));
      const track = card ? within(card).queryAllByLabelText(/^Step \d\/\d$/)[0] : undefined;
      return [title, track?.props.accessibilityLabel];
    }),
  );

beforeEach(() => {
  mockAdventures.mockResolvedValue([adventure(1, "The Long Road"), adventure(2, "Bare Road")]);
});

describe("the step track of an adventure under way", () => {
  test("two runs under way: each poster reads its own progress", async () => {
    // The newest run is first, as the gallery reads them.
    mockProgress.mockResolvedValue([
      { adventureId: 2, completedCount: 1, currentIndex: 1 },
      { adventureId: 1, completedCount: 2, currentIndex: 2 },
    ]);
    await mount();
    await screen.findByText("The Long Road");

    expect(progressByTitle()).toEqual({ "The Long Road": "Step 3/3", "Bare Road": "Step 2/3" });
  });

  test("one run under way: only its poster carries a progress", async () => {
    mockProgress.mockResolvedValue([{ adventureId: 1, completedCount: 1, currentIndex: 1 }]);
    await mount();
    await screen.findByText("The Long Road");

    expect(progressByTitle()).toEqual({ "The Long Road": "Step 2/3", "Bare Road": undefined });
  });

  test("no run under way: no poster carries a progress", async () => {
    mockProgress.mockResolvedValue([]);
    await mount();
    await screen.findByText("The Long Road");

    expect(progressByTitle()).toEqual({ "The Long Road": undefined, "Bare Road": undefined });
  });
});
