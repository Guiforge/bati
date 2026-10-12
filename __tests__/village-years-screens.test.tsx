import { act, fireEvent, render, within } from "@testing-library/react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { TamaguiProvider } from "tamagui";

import { VillageScene } from "@/components/village/VillageScene";
import * as crestDb from "@/db/crest";
import * as feedDb from "@/db/milestoneFeed";
import { type BuildingCode, buildingDefinitions } from "@/db/schema";
import * as village from "@/db/village";
import * as years from "@/db/villageYears";
import type { Banner, Fact, Stone } from "@/db/villageYearsRules";
import { i18n } from "@/i18n";
import * as errors from "@/src/reportError";
import { useSettingsStore } from "@/stores/settings";
import config from "@/tamagui.config";

/**
 * The stones and the seasons, through the screen the app mounts: the Village reads them after its
 * scene, the Ramparts' sheet shows the stones whatever the wall's rank, and the Seasons section
 * is not mounted before the first banner.
 */

jest.mock("@/db/client", () => ({ db: {}, schema: {}, runMigrations: jest.fn() }));
jest.mock("@/db/adventures", () => ({ listFinishedRunSummaries: jest.fn().mockResolvedValue([]) }));
jest.mock("@/db/completed", () => ({
  getRecentContributingSessions: jest.fn().mockResolvedValue([]),
}));
jest.mock("expo-router", () => ({
  useFocusEffect: (cb: () => void) => require("react").useEffect(cb, [cb]),
  useIsFocused: () => true,
  useLocalSearchParams: () => ({}),
  useRouter: () => ({ push: jest.fn() }),
}));
jest.mock("@/components/common/FlameFlicker", () => ({ FlameFlicker: () => null }));
jest.mock("@/hooks/useReducedMotion", () => ({
  ...jest.requireActual("@/hooks/useReducedMotion"),
  useReducedMotion: () => true,
}));

const METRICS = {
  frame: { x: 0, y: 0, width: 390, height: 844 },
  insets: { top: 47, left: 0, right: 0, bottom: 34 },
};

const building = (code: BuildingCode, level: number): village.VillageBuilding => ({
  code,
  emoji: "",
  tier: buildingDefinitions[code].tier,
  level,
  enName: code,
  frName: code,
  deName: code,
  esName: code,
  unlockCondition: "",
  relatedMuscle: buildingDefinitions[code].relatedMuscle,
  driver: "tier",
  metricValue: 0,
  nextTarget: null,
});

const sessionsFact = (count: number): Fact => ({ kind: "sessions", count });
const stone = (level: number, fact: Fact = sessionsFact(level)): Stone => ({
  level,
  decade: Math.floor(level / 10),
  sessions: 3,
  fact,
});
const stonesFrom = (count: number) => Array.from({ length: count }, (_, i) => stone(21 + i));

const banner = (start: number, villageYear: number, over: Partial<Banner> = {}): Banner => ({
  start,
  kind: "winter",
  villageYear,
  sessions: 3,
  fact: sessionsFact(3),
  animal: "bear",
  ...over,
});

function mockYears(over: Partial<years.VillageYears> = {}) {
  const view = { years: { stones: [], banners: [], ages: [], ...over }, names: new Map() };
  jest.spyOn(years, "loadVillageYears").mockResolvedValue(view);
}

function renderScene(wall = building("castle_wall", 1)) {
  jest.spyOn(village, "getVillageScene").mockResolvedValue({
    tier: 4,
    level: 8,
    title: { en: "Champion", fr: "Champion", de: "Champion", es: "Champion" },
    totalXp: 3180,
    flame: 0,
    streakDays: 0,
    dominantSport: null,
    buildings: [building("campfire", 4), wall],
  });
  return render(
    <SafeAreaProvider initialMetrics={METRICS}>
      <TamaguiProvider config={config} defaultTheme="dark">
        <VillageScene />
      </TamaguiProvider>
    </SafeAreaProvider>,
  );
}

async function openRamparts(wall?: village.VillageBuilding) {
  const screen = await renderScene(wall);
  await fireEvent.press(await screen.findByLabelText(village.BUILDING_LABELS.castle_wall.en));
  return screen;
}

describe("the stones in the Ramparts' sheet", () => {
  beforeEach(async () => {
    await i18n.changeLanguage("en");
    jest.spyOn(crestDb, "getCrest").mockResolvedValue(null);
    jest.spyOn(feedDb, "getRecentFeeds").mockResolvedValue({ muscle: {}, style: {}, outing: [] });
  });
  afterEach(() => jest.restoreAllMocks());

  it("shows none before level 21", async () => {
    mockYears();
    const screen = await openRamparts();
    await screen.findByTestId("village-detail");
    expect(screen.queryByTestId("village-stones")).toBeNull();
  });

  it("shows a single stone, labelled with its level and its fact", async () => {
    mockYears({ stones: [stone(21, sessionsFact(1))] });
    const screen = await openRamparts();
    const label = "Level 21: 1 session";
    expect(await screen.findByLabelText(label)).toBeTruthy();
    expect(screen.getAllByTestId(/^village-stone-\d+$/)).toHaveLength(1);
  });

  it("shows the stones whatever the wall's rank", async () => {
    mockYears({ stones: stonesFrom(3) });
    const screen = await openRamparts(building("castle_wall", 0));
    expect(await screen.findAllByTestId(/^village-stone-\d+$/)).toHaveLength(3);
  });

  it("keeps fourteen stones in one group, a record said with its movement", async () => {
    const record: Fact = {
      kind: "record",
      exerciseId: 7,
      unit: "reps",
      prior: 10,
      value: 14,
      at: 0,
    };
    jest.spyOn(years, "loadVillageYears").mockResolvedValue({
      years: { stones: [...stonesFrom(13), stone(34, record)], banners: [], ages: [] },
      names: new Map([[7, { enName: "Push-ups", frName: "Pompes", deName: "", esName: "" }]]),
    });
    const screen = await openRamparts();
    expect(await screen.findAllByTestId(/^village-stone-\d+$/)).toHaveLength(14);
    expect(screen.getAllByTestId(/^village-stones-\d+$/)).toHaveLength(1);
    expect(screen.getByLabelText("Level 34: Push-ups, from 10 to 14")).toBeTruthy();
  });

  it("says the level's session count when the record's movement is gone", async () => {
    const record: Fact = {
      kind: "record",
      exerciseId: 99,
      unit: "reps",
      prior: 10,
      value: 14,
      at: 0,
    };
    mockYears({ stones: [{ ...stone(21, record), sessions: 5 }] });
    const screen = await openRamparts();
    expect(await screen.findByLabelText("Level 21: 5 sessions")).toBeTruthy();
  });

  it("groups sixty-five stones by decade", async () => {
    mockYears({ stones: stonesFrom(65) }); // levels 21 to 85
    const screen = await openRamparts();
    expect(await screen.findAllByTestId(/^village-stone-\d+$/)).toHaveLength(65);
    expect(screen.getAllByTestId(/^village-stones-\d+$/)).toHaveLength(7);
    expect(screen.getByText("Levels 21 to 29")).toBeTruthy();
    expect(screen.getByText("Levels 80 to 85")).toBeTruthy();
  });

  it("lays the stones six to a row", async () => {
    mockYears({ stones: stonesFrom(8) });
    const screen = await openRamparts();
    const group = within(await screen.findByTestId("village-stones-2"));
    expect(group.getAllByTestId(/^village-stone-\d+$/)).toHaveLength(8);
  });
});

describe("the Seasons section", () => {
  beforeEach(async () => {
    await i18n.changeLanguage("en");
    jest.spyOn(crestDb, "getCrest").mockResolvedValue(null);
    jest.spyOn(feedDb, "getRecentFeeds").mockResolvedValue({ muscle: {}, style: {}, outing: [] });
  });
  afterEach(() => {
    jest.restoreAllMocks();
    useSettingsStore.setState({ language: "en" });
  });

  it("is not mounted without a banner", async () => {
    mockYears();
    const screen = await renderScene();
    await screen.findByTestId("village-scroll");
    await act(async () => {});
    expect(screen.queryByTestId("village-seasons")).toBeNull();
    expect(screen.queryByText("SEASONS")).toBeNull();
  });

  it("is not mounted while the years are unread", async () => {
    const failure = new Error("nope");
    jest.spyOn(years, "loadVillageYears").mockRejectedValue(failure);
    const report = jest.spyOn(errors, "reportError").mockImplementation(() => {});
    const screen = await renderScene();
    await screen.findByTestId("village-scroll");
    await act(async () => {});
    expect(report).toHaveBeenCalledWith("village.years", failure);
    expect(screen.queryByTestId("village-seasons")).toBeNull();
  });

  it("makes a row per year, four banners at most, each labelled", async () => {
    const kinds = ["winter", "spring", "summer", "autumn"] as const;
    const four = kinds.map((kind, i) => banner(i + 1, 1, { kind, animal: "stag" }));
    mockYears({
      banners: [
        ...four,
        banner(5, 2, { kind: "winter", fact: { kind: "sessions", count: 1 }, animal: null }),
      ],
    });
    const screen = await renderScene();
    const rows = await screen.findAllByTestId("village-year-row");
    expect(rows).toHaveLength(2);
    expect(within(rows[0] as never).getAllByTestId("village-banner")).toHaveLength(4);
    expect(within(rows[1] as never).getAllByTestId("village-banner")).toHaveLength(1);
    expect(screen.getByText("Year 1")).toBeTruthy();
    expect(screen.getByText("Year 2")).toBeTruthy();
    // The animal's colour decorates; the season and the fact are written.
    expect(screen.getByLabelText("Year 1, Autumn: 3 sessions")).toBeTruthy();
    expect(screen.getByLabelText("Year 2, Winter: 1 session")).toBeTruthy();
  });

  it("says the season's session count when the record's movement is gone", async () => {
    const fact: Fact = {
      kind: "record",
      exerciseId: 99,
      unit: "reps",
      prior: 10,
      value: 14,
      at: 0,
    };
    mockYears({ banners: [banner(1, 1, { fact, sessions: 4 })] });
    const screen = await renderScene();
    expect(await screen.findByLabelText("Year 1, Winter: 4 sessions")).toBeTruthy();
  });

  it("speaks French and names the fact of a record", async () => {
    await i18n.changeLanguage("fr");
    useSettingsStore.setState({ language: "fr" });
    jest.spyOn(years, "loadVillageYears").mockResolvedValue({
      years: {
        stones: [],
        banners: [
          banner(1, 1, {
            kind: "summer",
            fact: { kind: "record", exerciseId: 7, unit: "reps", prior: 10, value: 14, at: 0 },
          }),
        ],
        ages: [],
      },
      names: new Map([[7, { enName: "Push-ups", frName: "Pompes", deName: "", esName: "" }]]),
    });
    const screen = await renderScene();
    expect(await screen.findByLabelText("Année 1, Été : Pompes, de 10 à 14")).toBeTruthy();
    expect(screen.getByText("SAISONS")).toBeTruthy();
  });
});
