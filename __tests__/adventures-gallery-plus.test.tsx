import { fireEvent, render } from "@testing-library/react-native";
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
const mockPush = jest.fn();
jest.mock("expo-router", () => ({
  useRouter: () => ({ push: mockPush, back: jest.fn() }),
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

const adventure = (id: number, title: string, extra: Record<string, unknown> = {}) => ({
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
  updatedAt: null,
  coverMissing: false,
  ...extra,
});

jest.mock("@/db", () => ({
  activeRunAdventureIds: jest.fn().mockResolvedValue(new Set()),
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
  const { findByText, getByText, queryByTestId, toJSON } = await renderGallery();

  expect(await findByText("With Bati+")).toBeTruthy();
  expect(getByText("2 more adventures with Bati+")).toBeTruthy();
  expect(getByText("Plus One")).toBeTruthy();
  expect(getByText("Free One")).toBeTruthy();
  expect(queryByTestId("adventures-plus-header")).toBeTruthy();
  // Rendered order: the free card, then the header, then the Bati+ cards.
  const dump = JSON.stringify(toJSON());
  const at = (needle: string) => dump.indexOf(needle);
  expect(at("Free One")).toBeGreaterThan(-1);
  expect(at("Free One")).toBeLessThan(at("adventures-plus-header"));
  expect(at("adventures-plus-header")).toBeLessThan(at("Plus One"));
  expect(at("Plus One")).toBeLessThan(at("Plus Two"));
  // No padlock: the Lucide Lock icon has no name or testID in the tree, only its svg path.
  expect(dump).not.toContain("M7 11V7a5 5 0 0 1 10 0v4");
});

test("with nothing locked there is no header", async () => {
  mockLocked.mockResolvedValue(new Set());
  const { findByText, queryByText } = await renderGallery();

  expect(await findByText("Plus One")).toBeTruthy();
  expect(queryByText("With Bati+")).toBeNull();
});

const hero = (id: number, title: string, extra: Record<string, unknown> = {}) =>
  adventure(id, title, { author: "hero", sortOrder: 1000, ...extra });

describe("the hero's own adventures", () => {
  beforeEach(() => {
    mockLocked.mockResolvedValue(new Set());
    mockPush.mockClear();
    const db = require("@/db") as { activeRunAdventureIds: jest.Mock };
    db.activeRunAdventureIds.mockResolvedValue(new Set());
  });

  test("sit under their own header, newest first, with the write row after them", async () => {
    const db = require("@/db") as { listAdventures: jest.Mock };
    db.listAdventures.mockResolvedValue([
      adventure(1, "Game One"),
      hero(10, "Old Tale", { updatedAt: new Date(1_000_000) }),
      hero(11, "New Tale", { updatedAt: new Date(2_000_000) }),
    ]);
    const { findByText, getAllByText, getByTestId, toJSON } = await renderGallery();

    expect(await findByText("Your adventures")).toBeTruthy();
    expect(getAllByText("Written by you")).toHaveLength(2);
    const dump = JSON.stringify(toJSON());
    const at = (needle: string) => dump.indexOf(needle);
    expect(at("Game One")).toBeLessThan(at("adventures-yours-header"));
    expect(at("adventures-yours-header")).toBeLessThan(at("New Tale"));
    expect(at("New Tale")).toBeLessThan(at("Old Tale"));
    expect(at("Old Tale")).toBeLessThan(at("adventures-write"));

    await fireEvent.press(getByTestId("adventures-write"));
    expect(mockPush).toHaveBeenCalledWith("/adventures/edit");
  });

  test("with none of them the write row closes the game's section, and there is no header", async () => {
    const db = require("@/db") as { listAdventures: jest.Mock };
    db.listAdventures.mockResolvedValue([adventure(1, "Game One")]);
    const { findByText, queryByText, getByTestId } = await renderGallery();

    expect(await findByText("Game One")).toBeTruthy();
    expect(queryByText("Your adventures")).toBeNull();
    expect(getByTestId("adventures-write")).toBeTruthy();
  });

  test("a retired one stays only while a run of it is under way here", async () => {
    const db = require("@/db") as { listAdventures: jest.Mock; activeRunAdventureIds: jest.Mock };
    db.listAdventures.mockResolvedValue([
      hero(10, "Retired Idle", { isActive: 0 }),
      hero(11, "Retired Running", { isActive: 0 }),
      hero(12, "Live Tale"),
    ]);
    db.activeRunAdventureIds.mockResolvedValue(new Set([11]));
    const { findByText, queryByText } = await renderGallery();

    expect(await findByText("Live Tale")).toBeTruthy();
    expect(queryByText("Retired Running")).toBeTruthy();
    expect(queryByText("Retired Idle")).toBeNull();
  });

  test("one whose step-1 quest is gone stays, says so and shows no duration", async () => {
    const db = require("@/db") as { listAdventures: jest.Mock };
    db.listAdventures.mockResolvedValue([hero(10, "Broken Tale", { coverMissing: true })]);
    const { findByText, queryByTestId } = await renderGallery();

    expect(await findByText("Broken Tale")).toBeTruthy();
    expect(
      await findByText("A step has lost its quest. Edit the adventure to play it again."),
    ).toBeTruthy();
    expect(queryByTestId("adventure-card-footer")).toBeNull();
  });

  test("nothing in the gallery asks the quota", () => {
    const fs = require("node:fs") as typeof import("node:fs");
    const source = fs.readFileSync(`${process.cwd()}/app/(tabs)/adventures/index.tsx`, "utf8");
    expect(source).not.toMatch(/\bcan\(|FREE_HERO|QuotaPanel/);
  });
});
