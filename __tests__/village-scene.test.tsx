import { fireEvent, render, waitFor } from "@testing-library/react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { TamaguiProvider } from "tamagui";

import { VillageScene } from "@/components/village/VillageScene";
import * as village from "@/db/village";
import config from "@/tamagui.config";

/**
 * The screen splits buildings on level > 0: built ones get a named tile with level pips,
 * unbuilt ones a silhouette under "to build". A regression here shows the whole village as
 * either finished or empty. Tapping either rack has to explain the level, which is the only
 * place the village ever answers "why".
 */

jest.mock("@/db/client", () => ({ db: {}, schema: {}, runMigrations: jest.fn() }));
// The sheet fetches its deed list on open; the headline it renders comes from the building.
jest.mock("@/db/adventures", () => ({ listFinishedRunSummaries: jest.fn().mockResolvedValue([]) }));
jest.mock("@/db/completed", () => ({
  getRecentContributingSessions: jest.fn().mockResolvedValue([]),
}));
jest.mock("expo-router", () => ({
  useFocusEffect: (cb: () => void) => require("react").useEffect(cb, [cb]),
  useLocalSearchParams: () => ({}),
}));
// Reanimated needs a native worklets module jest-expo doesn't install.
jest.mock("@/components/common/FlameFlicker", () => ({ FlameFlicker: () => null }));

const METRICS = {
  frame: { x: 0, y: 0, width: 390, height: 844 },
  insets: { top: 47, left: 0, right: 0, bottom: 34 },
};

function building(
  code: string,
  level: number,
  extra: Partial<village.VillageBuilding> = {},
): village.VillageBuilding {
  return {
    code,
    emoji: "🏠",
    tier: 1,
    level,
    enName: `${code}-en`,
    frName: `${code}-fr`,
    unlockCondition: "default",
    relatedMuscle: null,
    driver: "tier",
    metricValue: 3,
    nextTarget: 5,
    ...extra,
  } as village.VillageBuilding;
}

function mockScene(buildings: village.VillageBuilding[]) {
  jest.spyOn(village, "getVillageScene").mockResolvedValue({
    tier: 1,
    level: 3,
    flame: 0,
    dominantSport: null,
    neglected: null,
    bossBanners: [],
    buildings,
    trophies: [],
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
  afterEach(() => jest.restoreAllMocks());

  it("shows both racks when the village is part built", async () => {
    mockScene([building("campfire", 2), building("forge", 0)]);

    const { getByTestId, getByText } = await renderScene();

    await waitFor(() => expect(getByTestId("village-built")).toBeTruthy());
    expect(getByTestId("village-to-build")).toBeTruthy();
    expect(getByText("campfire-en")).toBeTruthy();
  });

  it("drops the to-build rack once every building stands", async () => {
    mockScene([building("campfire", 2), building("forge", 1)]);

    const { getByTestId, queryByTestId } = await renderScene();

    await waitFor(() => expect(getByTestId("village-built")).toBeTruthy());
    expect(queryByTestId("village-to-build")).toBeNull();
  });

  it("tapping a built tile explains what raised it", async () => {
    mockScene([
      building("forge", 3, {
        driver: "muscle",
        relatedMuscle: "chest",
        metricValue: 350,
        nextTarget: 600,
      }),
    ]);

    const { getByTestId, getByLabelText, findByText } = await renderScene();

    await waitFor(() => expect(getByTestId("village-built")).toBeTruthy());
    fireEvent.press(getByLabelText("forge-en"));

    // The driver, where it stands, and what the next level costs.
    expect(await findByText("350 work units of chest training")).toBeTruthy();
    expect(await findByText("250 more for level 4")).toBeTruthy();
  });

  it("tapping a silhouette says what would build it", async () => {
    mockScene([building("quarry", 0, { driver: "muscle", relatedMuscle: "back", metricValue: 0 })]);

    const { getByTestId, getByLabelText, findByText } = await renderScene();

    await waitFor(() => expect(getByTestId("village-to-build")).toBeTruthy());
    fireEvent.press(getByLabelText("quarry-en"));

    expect(await findByText("Train your back to raise this building")).toBeTruthy();
  });
});
