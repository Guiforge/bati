import { fireEvent, render, waitFor, within } from "@testing-library/react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { TamaguiProvider } from "tamagui";

import { VillageScene } from "@/components/village/VillageScene";
import { type BuildingCode, buildingDefinitions } from "@/db/schema";
import * as village from "@/db/village";
import config from "@/tamagui.config";

/**
 * The village is read without a tap: what rises next and what it costs, then every building in the
 * family that feeds it, each on the ceiling it can really reach. A session that brought the hero
 * here plays once. Tapping a row still has to explain the level, the only place a bar is allowed.
 */

jest.mock("@/db/client", () => ({ db: {}, schema: {}, runMigrations: jest.fn() }));
// The sheet fetches its deed list on open; the headline it renders comes from the building.
jest.mock("@/db/adventures", () => ({ listFinishedRunSummaries: jest.fn().mockResolvedValue([]) }));
jest.mock("@/db/completed", () => ({
  getRecentContributingSessions: jest.fn().mockResolvedValue([]),
}));
let mockParams: { grown?: string } = {};
jest.mock("expo-router", () => ({
  useFocusEffect: (cb: () => void) => require("react").useEffect(cb, [cb]),
  useLocalSearchParams: () => mockParams,
  useRouter: () => ({ push: jest.fn() }),
}));
// Reanimated needs a native worklets module jest-expo doesn't install.
jest.mock("@/components/common/FlameFlicker", () => ({ FlameFlicker: () => null }));
// The return card is up at once instead of 1.3 s in, and nothing on the painting loops forever.
jest.mock("@/hooks/useReducedMotion", () => ({
  ...jest.requireActual("@/hooks/useReducedMotion"),
  useReducedMotion: () => true,
}));

const METRICS = {
  frame: { x: 0, y: 0, width: 390, height: 844 },
  insets: { top: 47, left: 0, right: 0, bottom: 34 },
};

function building(
  code: BuildingCode,
  level: number,
  extra: Partial<village.VillageBuilding> = {},
): village.VillageBuilding {
  const def = buildingDefinitions[code];
  return {
    code,
    emoji: "",
    tier: def.tier,
    level,
    enName: code,
    frName: code,
    unlockCondition: "",
    relatedMuscle: def.relatedMuscle,
    driver: "tier",
    metricValue: 0,
    nextTarget: null,
    ...extra,
  };
}

const campfire = building("campfire", 4, { metricValue: 8, nextTarget: 10 });
const forge = building("forge", 1, { driver: "muscle", metricValue: 60, nextTarget: 100 });
// Further along in percent (65 against 60), further away in reps (350 against 40).
const farm = building("farm", 4, { driver: "muscle", metricValue: 650, nextTarget: 1000 });
const quarry = building("quarry", 0, { driver: "muscle", metricValue: 0, nextTarget: 1 });
const barn = building("barn", 2, { driver: "prereq", metricValue: 4, nextTarget: 5 });

function mockScene(buildings: village.VillageBuilding[], over: Partial<village.VillageScene> = {}) {
  jest.spyOn(village, "getVillageScene").mockResolvedValue({
    tier: 4,
    level: 8,
    title: { en: "Champion", fr: "Champion" },
    flame: 0,
    streakDays: 0,
    dominantSport: null,
    buildings,
    ...over,
  });
}

function renderScene() {
  return render(
    <SafeAreaProvider initialMetrics={METRICS}>
      <TamaguiProvider config={config} defaultTheme="dark">
        <VillageScene />
      </TamaguiProvider>
    </SafeAreaProvider>,
  );
}

describe("VillageScene", () => {
  afterEach(() => {
    jest.restoreAllMocks();
    mockParams = {};
  });

  it("puts the closest rung first, in reps, with its unit at both ends of the bar", async () => {
    mockScene([campfire, forge, farm, quarry, barn]);

    const { findByTestId } = await renderScene();
    const next = within(await findByTestId("village-next"));

    expect(next.getByText("Forge")).toBeTruthy();
    expect(next.getByText("Chest: 40 reps to level 2")).toBeTruthy();
    expect(next.getByText("60 reps")).toBeTruthy();
    expect(next.getByText("level 2 at 100")).toBeTruthy();
  });

  it("files every building with what feeds it, unbuilt ones included, on its real ceiling", async () => {
    mockScene([campfire, forge, farm, quarry, barn]);

    const { findByTestId, getByTestId } = await renderScene();
    const muscles = within(await findByTestId("village-family-muscle"));

    // No locked drawer: the unbuilt Quarry sits with the muscles that feed it.
    expect(muscles.getByText("Quarry")).toBeTruthy();
    expect(muscles.getByText("Back: one rep builds it")).toBeTruthy();
    // The six upgrades stop at 3; five pips under them promised a road that never came.
    expect(within(getByTestId("village-family-upgrade")).getByText("level 2 of 3")).toBeTruthy();
    expect(within(getByTestId("village-family-starter")).getByText("level 4 of 5")).toBeTruthy();
  });

  it("states the rule on day one, when nothing has been earned", async () => {
    mockScene([campfire, quarry], { tier: 1, level: 1 });

    const { findByText, getByTestId, queryByTestId } = await renderScene();

    expect(await findByText("Nothing has risen yet")).toBeTruthy();
    expect(getByTestId("village-family-unbuilt")).toBeTruthy();
    expect(queryByTestId("village-family-muscle")).toBeNull();
  });

  it("says a finished village is finished, and what still answers", async () => {
    mockScene(
      [
        building("campfire", 5),
        building("farm", 5, { driver: "muscle" }),
        building("barn", 3, { driver: "prereq" }),
        building("high_road", 4, { driver: "leagues", metricValue: 118, nextTarget: 200 }),
      ],
      { tier: 12, level: 44 },
    );

    const { findByTestId, getByTestId } = await renderScene();

    const done = within(await findByTestId("village-done"));
    expect(done.getByText(/1 deed still answers to you/)).toBeTruthy();
    expect(getByTestId("village-family-rest")).toBeTruthy();
  });

  it("tapping a row explains what raised it", async () => {
    mockScene([building("forge", 3, { driver: "muscle", metricValue: 350, nextTarget: 600 })]);

    const { findByTestId, findByText } = await renderScene();
    const muscles = within(await findByTestId("village-family-muscle"));
    await fireEvent.press(muscles.getByLabelText("Forge"));

    // The driver, where it stands, and what the next level costs. In reps, with the one exchange
    // rate that is not one-to-one named on the same line.
    expect(
      await findByText("350 reps of chest training. A hold counts one rep every 3 seconds."),
    ).toBeTruthy();
    // In the sheet: the Forge is also "Next to rise", whose bar carries the same two ends.
    expect(within(await findByTestId("village-detail")).getByText("level 4 at 600")).toBeTruthy();
  });

  it("tapping an unbuilt row says what would build it", async () => {
    mockScene([campfire, forge, quarry]);

    const { findByTestId, findByText } = await renderScene();
    const muscles = within(await findByTestId("village-family-muscle"));
    await fireEvent.press(muscles.getByLabelText("Quarry"));

    expect(await findByText("Train your back to raise this building")).toBeTruthy();
  });

  it("plays the return from a session once, then gets out of the way", async () => {
    mockParams = { grown: "farm:3:4,barn:1:2" };
    mockScene([campfire, forge, farm, quarry, barn]);

    const { findByTestId, getByTestId, getAllByText, queryByTestId } = await renderScene();

    const reward = await findByTestId("village-reward");
    expect(within(reward).getByText("Farm, level 4")).toBeTruthy();
    expect(within(reward).getByText(/Also rose: Barn\./)).toBeTruthy();
    expect(within(getByTestId("village-changes")).getByText("3 → 4")).toBeTruthy();
    expect(getAllByText("Risen")).toHaveLength(2);

    await fireEvent.press(reward);
    await waitFor(() => expect(queryByTestId("village-reward")).toBeNull());
  });

  it("a plain visit plays nothing", async () => {
    mockScene([campfire, forge, farm]);

    const { findByTestId, queryByTestId, queryByText } = await renderScene();

    await findByTestId("village-next");
    expect(queryByTestId("village-reward")).toBeNull();
    expect(queryByTestId("village-changes")).toBeNull();
    expect(queryByText("Risen")).toBeNull();
  });
});
