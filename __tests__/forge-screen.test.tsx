import { fireEvent, render, screen } from "@testing-library/react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { TamaguiProvider } from "tamagui";
import "@/i18n";
import ForgeScreen from "@/app/forge";
import { ForgeButton } from "@/components/forge/ForgeButton";
import { VillageDetailSheet } from "@/components/village/VillageDetailSheet";
import type { VillageBuilding } from "@/db/village";
import config from "@/tamagui.config";

const mockRouter = { push: jest.fn(), back: jest.fn(), replace: jest.fn(), canGoBack: jest.fn() };
const mockQuests = jest.fn();
const mockAdventures = jest.fn();
const mockExercises = jest.fn();
const mockBuildings = jest.fn();
const mockBosses = jest.fn();

jest.mock("expo-router", () => ({
  useRouter: () => mockRouter,
  useFocusEffect: (cb: () => void) => {
    require("react").useEffect(cb, []);
  },
}));
jest.mock("@/db/client", () => ({ db: {}, schema: {}, runMigrations: jest.fn() }));
jest.mock("@/db/quests", () => ({
  ...jest.requireActual("@/db/quests"),
  listQuestTemplates: () => mockQuests(),
}));
jest.mock("@/db/adventures", () => ({
  listAdventures: () => mockAdventures(),
  listFinishedRunSummaries: jest.fn().mockResolvedValue([]),
}));
jest.mock("@/db/exercises", () => ({
  ...jest.requireActual("@/db/exercises"),
  listExercises: () => mockExercises(),
}));
jest.mock("@/db/heroBosses", () => ({ listHeroBosses: () => mockBosses() }));
jest.mock("@/db/village", () => ({
  ...jest.requireActual("@/db/village"),
  getVillageBuildings: () => mockBuildings(),
}));
jest.mock("@/db/completed", () => ({
  getRecentContributingSessions: jest.fn().mockResolvedValue([]),
}));
jest.mock("@/components/common/Toast", () => ({
  useToast: () => ({ showError: jest.fn(), showSuccess: jest.fn() }),
}));
jest.mock("@/src/reportError", () => ({ reportError: jest.fn() }));

const wrap = (node: React.ReactNode) => (
  <SafeAreaProvider
    initialMetrics={{
      frame: { x: 0, y: 0, width: 360, height: 640 },
      insets: { top: 0, left: 0, right: 0, bottom: 0 },
    }}
  >
    <TamaguiProvider config={config} defaultTheme="dark">
      {node}
    </TamaguiProvider>
  </SafeAreaProvider>
);

const quest = (id: number, author: string) => ({
  id,
  author,
  enTitle: `Quest ${id}`,
  frTitle: `Quête ${id}`,
});
const adventure = (id: number, author: string, isActive = 1) => ({
  id,
  author,
  isActive,
  enTitle: `Tale ${id}`,
  frTitle: `Conte ${id}`,
});
const exercise = (id: number, creator: string, retiredAt: Date | null = null) => ({
  id,
  creator,
  retiredAt,
  enName: `Move ${id}`,
  frName: `Mouvement ${id}`,
});

beforeEach(() => {
  jest.clearAllMocks();
  mockQuests.mockResolvedValue([]);
  mockAdventures.mockResolvedValue([]);
  mockExercises.mockResolvedValue([]);
  mockBuildings.mockResolvedValue([]);
  mockBosses.mockResolvedValue([]);
});

describe("Forge page", () => {
  test("empty: no sentence, the smith is the one voice; a button per section, bosses after adventures, and the import door", async () => {
    await render(wrap(<ForgeScreen />));
    await screen.findByTestId("forge-quests-new");
    expect(screen.queryByText(/yet\.$/)).toBeNull();
    expect(screen.queryByTestId("forge-quests-all")).toBeNull();

    // Quests, then adventures, then bosses, then exercises, then the import.
    const order = [
      "forge-quests",
      "forge-adventures",
      "forge-bosses",
      "forge-exercises",
      "forge-import",
    ].map((id) => JSON.stringify(screen.toJSON()).indexOf(`"testID":"${id}"`));
    expect([...order].sort((a, b) => a - b)).toEqual(order);
    expect(order.every((i) => i >= 0)).toBe(true);

    await fireEvent.press(screen.getByTestId("forge-quests-new"));
    await fireEvent.press(screen.getByTestId("forge-adventures-new"));
    await fireEvent.press(screen.getByTestId("forge-exercises-new"));
    await fireEvent.press(screen.getByTestId("forge-bosses-new"));
    expect(mockRouter.push.mock.calls.map((c) => c[0])).toEqual([
      "/quests/edit",
      "/adventures/edit",
      "/exercises/new",
      "/bosses/edit",
    ]);
    // Into a tab's stack with its gallery under it, or back falls through to Home.
    expect(mockRouter.push.mock.calls.map((c) => c[1])).toEqual([
      { withAnchor: true },
      { withAnchor: true },
      undefined,
      undefined,
    ]);
  });

  test("some made, some not: the empty sections say so, and only once the read is in", async () => {
    mockQuests.mockResolvedValue([quest(10, "hero")]);
    await render(wrap(<ForgeScreen />));
    await screen.findByText("Quest 10");
    expect(screen.getByText("You haven't written an adventure yet.")).toBeTruthy();
    expect(screen.getByText("You haven't made an exercise yet.")).toBeTruthy();
    expect(screen.getByText("You haven't made a boss yet.")).toBeTruthy();
  });

  test("while it reads, it asserts nothing", async () => {
    mockQuests.mockReturnValue(new Promise(() => undefined));
    await render(wrap(<ForgeScreen />));
    await screen.findByTestId("forge-quests-new");
    expect(screen.queryByText(/yet\.$/)).toBeNull();
    expect(screen.queryByTestId("forge-load-failed")).toBeNull();
  });

  test("a read that fails is reported and does not claim the hero has made nothing", async () => {
    const failure = new Error("disk");
    mockQuests.mockRejectedValue(failure);
    await render(wrap(<ForgeScreen />));
    await screen.findByTestId("forge-load-failed");
    expect(require("@/src/reportError").reportError).toHaveBeenCalledWith("forge.load", failure);
    expect(screen.queryByText(/yet\.$/)).toBeNull();
  });

  test("full: only the hero's own, the last three, each row opening its own screen", async () => {
    mockQuests.mockResolvedValue([
      quest(1, "Admin"),
      quest(10, "hero"),
      quest(11, "hero"),
      quest(12, "hero"),
      quest(13, "hero"),
    ]);
    mockAdventures.mockResolvedValue([
      adventure(2, "Admin"),
      adventure(20, "hero"),
      adventure(21, "hero", 0),
    ]);
    mockExercises.mockResolvedValue([
      exercise(3, "Admin"),
      exercise(30, "hero"),
      exercise(31, "hero", new Date()),
    ]);
    mockBosses.mockResolvedValue([1, 2, 3, 4].map((id) => ({ id, name: `Boss ${id}` })));
    await render(wrap(<ForgeScreen />));
    await screen.findByText("Quest 13");

    expect(screen.getByText("Quest 11")).toBeTruthy();
    expect(screen.queryByText("Quest 10")).toBeNull();
    expect(screen.queryByText("Quest 1")).toBeNull();
    expect(screen.getByText("Tale 20")).toBeTruthy();
    expect(screen.queryByText("Tale 21")).toBeNull();
    expect(screen.getByText("Move 30")).toBeTruthy();
    expect(screen.queryByText("Move 31")).toBeNull();
    expect(screen.getByText("Boss 4")).toBeTruthy();
    expect(screen.queryByText("Boss 1")).toBeNull();

    await fireEvent.press(screen.getByTestId("forge-quests-13"));
    await fireEvent.press(screen.getByTestId("forge-adventures-20"));
    await fireEvent.press(screen.getByTestId("forge-exercises-30"));
    await fireEvent.press(screen.getByTestId("forge-bosses-4"));
    await fireEvent.press(screen.getByTestId("forge-quests-all"));
    await fireEvent.press(screen.getByTestId("forge-adventures-all"));
    await fireEvent.press(screen.getByTestId("forge-exercises-all"));
    await fireEvent.press(screen.getByTestId("forge-bosses-all"));
    expect(mockRouter.push.mock.calls.map((c) => c[0])).toEqual([
      "/quests/13",
      "/adventures/20",
      "/exercises/30",
      "/bosses/edit?id=4",
      "/quests",
      "/adventures",
      "/exercises?mine=1",
      "/bosses",
    ]);
  });
});

test("inside the building: its painting at the hero's rank, and the smith's line", async () => {
  const getArt = jest.spyOn(require("@/constants/assetMap"), "getBuildingIconAsset");
  mockBuildings.mockResolvedValue([
    { code: "quarry", relatedMuscle: "back", level: 4 },
    { code: "forge", relatedMuscle: "chest", level: 0 },
  ]);
  await render(wrap(<ForgeScreen />));
  await screen.findByTestId("forge-building");
  // Not built yet still draws, at level 0, which the village paints rough.
  expect(getArt).toHaveBeenCalledWith("forge", "chest", 0);
  expect(screen.getByText("The Smith")).toBeTruthy();
  expect(
    screen.getByText(
      "Everything gets forged here, even your monsters. Tell me what you need, I'll bring the fire.",
    ),
  ).toBeTruthy();
  expect(screen.queryByText("What you've made, and room for more.")).toBeNull();
  getArt.mockRestore();
});

test("the gallery button says Create and opens the Forge", async () => {
  await render(wrap(<ForgeButton />));
  expect(screen.getByText("Create")).toBeTruthy();
  await fireEvent.press(screen.getByTestId("forge-open"));
  expect(mockRouter.push).toHaveBeenCalledWith("/forge");
});

describe("the village Forge building", () => {
  const building = (code: string, level: number) =>
    ({
      code,
      emoji: "🏠",
      tier: 2,
      level,
      enName: "x",
      frName: "x",
      unlockCondition: "default",
      relatedMuscle: code === "forge" ? "chest" : "back",
      driver: "muscle",
      metricValue: 0,
      nextTarget: 100,
    }) as unknown as VillageBuilding;

  const sheet = (b: VillageBuilding, onClose = jest.fn()) =>
    render(
      wrap(
        <VillageDetailSheet
          selected={{ kind: "building", building: b }}
          onClose={onClose}
          language="en"
          feeds={null}
          bottomInset={0}
        />,
      ),
    );

  test.each([0, 2])("enters the page, at level %i", async (level) => {
    const onClose = jest.fn();
    await sheet(building("forge", level), onClose);
    await fireEvent.press(await screen.findByText("Enter the forge"));
    expect(onClose).toHaveBeenCalled();
    expect(mockRouter.push).toHaveBeenCalledWith("/forge");
  });

  test("no other building carries it", async () => {
    await sheet(building("quarry", 1));
    await screen.findByText(/quarry|Quarry/i);
    expect(screen.queryByText("Enter the forge")).toBeNull();
  });
});
