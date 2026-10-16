import { render } from "@testing-library/react-native";
import { TamaguiProvider } from "tamagui";

import AdventuresGallery from "@/app/(tabs)/adventures/index";
import "@/i18n";
import config from "@/tamagui.config";

/**
 * P-04.2: the Bati+ adventures sit under their own header with the count, after the others, and
 * wear no padlock. With nothing locked the gallery is what it was.
 */

jest.mock("@/db/client", () => ({ db: {}, schema: {}, runMigrations: jest.fn() }));
const mockLocked = jest.fn();
jest.mock("@/src/plus/access", () => ({
  lockedAdventures: (...args: unknown[]) => mockLocked(...args),
}));

jest.mock("@/db/reminders", () => ({ getReminderDays: async () => ({}) }));
jest.mock("@/db/preferences", () => ({
  preferences: { getTrainingLevel: async () => "regular" },
}));
jest.mock("@/db/questConfig", () => ({
  getAllQuestConfigs: async () => new Map(),
  startingDifficulty: () => "medium",
}));
jest.mock("@/db/bossFights", () => ({ threatRank: () => 1 }));
jest.mock("expo-router", () => ({
  useRouter: () => ({ push: jest.fn(), back: jest.fn() }),
  useFocusEffect: (effect: () => undefined | (() => void)) => {
    const { useEffect } = require("react");
    useEffect(effect, [effect]);
  },
}));
jest.mock(
  "react-native-safe-area-context",
  () => require("react-native-safe-area-context/jest/mock").default,
);
jest.mock("@/stores/settings", () => ({
  useSettingsStore: (selector?: (s: { language: string; reducedMotion: boolean }) => unknown) => {
    const state = { language: "en", reducedMotion: false };
    return selector ? selector(state) : state;
  },
}));
jest.mock("@/components/chorus/VillagerLine", () => ({ VillagerLine: () => null }));
jest.mock("@/components/chorus/screenCues", () => ({
  useScreenGuide: jest.fn(),
  useAmbientVisit: jest.fn(),
}));
jest.mock("@/hooks/useReminderPace", () => ({
  useReminderPace: () => null,
  adventureWeeksLabel: () => null,
}));
// The list is virtualized and measures nothing under jest: a plain map renders the rows.
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

const adventure = (id: number, title: string) => ({
  id,
  coverQuestId: id,
  sortOrder: id,
  kind: "route",
  isActive: 1,
  author: "Admin",
  enTitle: title,
  frTitle: title,
  deTitle: title,
  esTitle: title,
  enDescription: "",
  frDescription: "",
  deDescription: "",
  esDescription: "",
  coverQuest: { id, exercises: [], enTitle: title, frTitle: title },
  stepsCount: 3,
  imagePath: null,
  focus: { archetype: null, muscles: [] },
  bossTotalHp: null,
});

jest.mock("@/db", () => ({
  adventureOrder: (rows: unknown[]) => rows,
  getAnyActiveAdventureRun: jest.fn().mockResolvedValue(null),
  getFinishedRunCountsByAdventure: jest.fn().mockResolvedValue(new Map()),
  getRecentSessionHistory: jest.fn().mockResolvedValue([]),
  listAdventures: jest.fn(),
  listExercises: jest.fn().mockResolvedValue([]),
  previewQuests: jest.fn().mockResolvedValue(new Map()),
  suggestDifficultyFromSessions: jest.fn().mockReturnValue({ level: "medium", adjusted: false }),
}));

const renderGallery = () =>
  render(
    <TamaguiProvider config={config} defaultTheme="dark">
      <AdventuresGallery />
    </TamaguiProvider>,
  );

beforeEach(() => {
  const db = require("@/db") as { listAdventures: jest.Mock };
  db.listAdventures.mockResolvedValue([
    adventure(1, "Free One"),
    adventure(2, "Plus One"),
    adventure(3, "Plus Two"),
  ]);
});

test("locked adventures sit under the Bati+ header, after the free ones", async () => {
  mockLocked.mockResolvedValue(new Set([2, 3]));
  const { findByText, getByText, queryByTestId } = await renderGallery();

  expect(await findByText("With Bati+")).toBeTruthy();
  expect(getByText("2 more adventures with Bati+")).toBeTruthy();
  expect(getByText("Plus One")).toBeTruthy();
  expect(getByText("Free One")).toBeTruthy();
  expect(queryByTestId("adventures-plus-header")).toBeTruthy();
});

test("with nothing locked there is no header", async () => {
  mockLocked.mockResolvedValue(new Set());
  const { findByText, queryByText } = await renderGallery();

  expect(await findByText("Plus One")).toBeTruthy();
  expect(queryByText("With Bati+")).toBeNull();
});
