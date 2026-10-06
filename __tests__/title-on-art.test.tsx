import { render, screen, within } from "@testing-library/react-native";
import { TamaguiProvider } from "tamagui";

import AdventuresGallery from "@/app/(tabs)/adventures/index";
import QuestsGallery from "@/app/(tabs)/quests/index";
import "@/i18n";
import config from "@/tamagui.config";

/**
 * A card with cover art names itself on the art, in a récitatif, like Home and the session; a
 * card without one keeps the title in its body. Asserted on the tree: a title in both places
 * would still render.
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

const mockQuests = jest.fn();
const mockAdventures = jest.fn();

jest.mock("@/db", () => ({
  ...jest.requireActual("@/db"),
  listQuestTemplates: () => mockQuests(),
  listExercises: () => Promise.resolve([]),
  previewQuests: () => Promise.resolve(new Map()),
  listAdventures: () => mockAdventures(),
  getAnyActiveAdventureRun: () => Promise.resolve(null),
  getFinishedRunCountsByAdventure: () => Promise.resolve(new Map()),
  getRecentSessionHistory: () => Promise.resolve([]),
}));
jest.mock("@/db/questConfig", () => ({ getAllQuestConfigs: () => Promise.resolve(new Map()) }));
jest.mock("@/db/favourites", () => ({
  getFavouriteQuestIds: () => Promise.resolve(new Set()),
  toggleFavouriteQuest: jest.fn(),
}));

const quest = (id: number, title: string, imagePath: string | null) => ({
  id,
  enTitle: title,
  frTitle: title,
  enDescription: "d",
  frDescription: "d",
  imagePath,
  rounds: 1,
  restSeconds: 30,
  author: "Admin",
  exercises: [],
});

const adventure = (id: number, title: string, imagePath: string | null) => ({
  id,
  enTitle: title,
  frTitle: title,
  enDescription: "d",
  frDescription: "d",
  imagePath,
  kind: "route",
  stepsCount: 3,
  focus: { archetype: null, muscles: [] },
  bossTotalHp: null,
  coverQuest: quest(id, title, imagePath),
});

async function mount(ui: React.ReactElement) {
  await render(
    <TamaguiProvider config={config} defaultTheme="dark">
      {ui}
    </TamaguiProvider>,
  );
}

describe("quest cards", () => {
  test("with a cover, the title is a récitatif on the art and not in the body", async () => {
    mockQuests.mockResolvedValue([
      quest(1, "Iron Dawn", "assets/images/quests/unknown.webp"),
      quest(2, "Bare Quest", null),
    ]);
    await mount(<QuestsGallery />);

    const box = await screen.findByTestId("quest-card-title");
    expect(within(box).getByRole("header")).toBeTruthy();
    expect(within(box).getByText("Iron Dawn")).toBeTruthy();
    expect(screen.getAllByText("Iron Dawn")).toHaveLength(1);
    // No cover, no art to carry it: the title stays in the body.
    expect(screen.getAllByTestId("quest-card-title")).toHaveLength(1);
    expect(screen.getByText("Bare Quest")).toBeTruthy();
  });
});

describe("adventure cards", () => {
  test("with a cover, the title is a récitatif on the art and not in the body", async () => {
    mockAdventures.mockResolvedValue([
      adventure(1, "The Long Road", "assets/images/adventures/unknown.webp"),
      adventure(2, "Bare Road", null),
    ]);
    await mount(<AdventuresGallery />);

    const box = await screen.findByTestId("adventure-card-title");
    expect(within(box).getByRole("header")).toBeTruthy();
    expect(within(box).getByText("The Long Road")).toBeTruthy();
    expect(screen.getAllByText("The Long Road")).toHaveLength(1);
    expect(screen.getAllByTestId("adventure-card-title")).toHaveLength(1);
    expect(screen.getByText("Bare Road")).toBeTruthy();
  });
});
