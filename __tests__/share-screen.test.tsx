import { act, fireEvent, render, screen } from "@testing-library/react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { TamaguiProvider } from "tamagui";
import "@/i18n";
import ShareScreen from "@/app/share";
import type { QuestLogData } from "@/components/journal/QuestLog";
import type { LngLat } from "@/src/gps/trace";
import config from "@/tamagui.config";

/**
 * The share screen sends a picture of exactly what it draws, so the tests read what it draws and
 * what it sends. The map itself is `TraceThumb`'s (tested with `src/gps/mapThumb.ts`); here it is
 * a stand-in that records what the card asked of it and lets the test say when the map arrived.
 */
const mockRead = jest.fn();
const mockCapture = jest.fn();
const mockShare = jest.fn();
const mockAvailable = jest.fn();
const mockExport = jest.fn();
const mockShowError = jest.fn();
const mockThumb: {
  props: { segments: readonly (readonly LngLat[])[]; mapKey?: string } | null;
  onMapState: ((state: "none" | "pending" | "ready") => void) | null;
} = { props: null, onMapState: null };
const mockSettings = { language: "en", distanceUnit: "metric", mapTilesEnabled: true };

jest.mock("@/db/client", () => ({ db: {}, schema: {}, runMigrations: jest.fn() }));
jest.mock("expo-router", () => ({
  useLocalSearchParams: () => ({ session: "7" }),
  useRouter: () => ({ push: jest.fn(), back: jest.fn() }),
}));
jest.mock("expo-localization", () => ({
  getLocales: () => [{ languageCode: "en", languageTag: "en-US" }],
}));
jest.mock("@/stores/settings", () => ({
  useSettingsStore: (pick: (s: typeof mockSettings) => unknown) => pick(mockSettings),
}));
jest.mock("@/components/journal/sessionLog", () => ({
  readSession: (...args: unknown[]) => mockRead(...args),
}));
jest.mock("expo-sharing", () => ({
  isAvailableAsync: () => mockAvailable(),
  shareAsync: (...args: unknown[]) => mockShare(...args),
}));
jest.mock("react-native-view-shot", () => ({
  captureRef: (...args: unknown[]) => mockCapture(...args),
}));
jest.mock("@/db/gps", () => ({ pointsOf: jest.fn().mockResolvedValue([{ t: 1 }]) }));
jest.mock("@/src/gps/trackFile", () => ({ exportTrack: (...a: unknown[]) => mockExport(...a) }));
jest.mock("@/src/reportError", () => ({ reportError: jest.fn() }));
jest.mock("@/components/common/Toast", () => ({
  useToast: () => ({ showError: mockShowError, showSuccess: jest.fn() }),
}));
jest.mock("@/components/journal/TraceThumb", () => ({
  TraceThumb: (props: {
    segments: readonly (readonly LngLat[])[];
    mapKey?: string;
    onMapState?: (state: "none" | "pending" | "ready") => void;
  }) => {
    mockThumb.props = props;
    mockThumb.onMapState = props.onMapState ?? null;
    return null;
  },
}));

/** Due north, one point every 60 m: 1.2 km, long enough to keep a middle once the ends are cut. */
const line: LngLat[] = Array.from({ length: 21 }, (_, i) => [2.35, 48.85 + (i * 60) / 111_195]);

function log(over: Partial<QuestLogData["session"]> = {}, trace = [line]): QuestLogData {
  return {
    session: {
      id: 7,
      uuid: "u7",
      questId: 1,
      userLevel: "medium",
      durationSeconds: 1800,
      xpEarned: 120,
      notes: "",
      feedback: null,
      performedAt: new Date(2026, 8, 20),
      leaguesM: 1200,
      movingSeconds: 1700,
      ascentM: null,
      outing: "walk",
      hasNewRecords: false,
      exercises: [],
      ...over,
    },
    questTitle: "Warden's Walk",
    questImage: null,
    trace,
    standing: null,
    records: [],
    shift: null,
    rung: null,
    latest: true,
    level: {} as QuestLogData["level"],
  };
}

async function mount(data: QuestLogData, kill: unknown = null) {
  mockRead.mockResolvedValue({ status: "ready", log: data, kill });
  await render(
    <SafeAreaProvider
      initialMetrics={{
        frame: { x: 0, y: 0, width: 400, height: 800 },
        insets: { top: 0, left: 0, right: 0, bottom: 0 },
      }}
    >
      <TamaguiProvider config={config} defaultTheme="dark">
        <ShareScreen />
      </TamaguiProvider>
    </SafeAreaProvider>,
  );
  await screen.findByTestId("share-card");
}

beforeEach(() => {
  jest.clearAllMocks();
  mockThumb.props = null;
  mockThumb.onMapState = null;
  mockSettings.mapTilesEnabled = true;
  mockAvailable.mockResolvedValue(true);
  mockCapture.mockResolvedValue("file:///cache/card.png");
  mockShare.mockResolvedValue(undefined);
});

const send = async () => {
  await fireEvent.press(screen.getByTestId("share-image"));
};

test("the line on the picture has its ends cut, under a cache key of its own", async () => {
  await mount(log());

  expect(mockThumb.props?.mapKey).toBe("u7-shared");
  const drawn = mockThumb.props?.segments.flat() ?? [];
  expect(drawn.length).toBeGreaterThan(0);
  expect(drawn.length).toBeLessThan(line.length);
  expect(drawn).not.toContainEqual(line[0]);
  expect(drawn).not.toContainEqual(line[line.length - 1]);
});

test("the picture waits for the map, then is sent as a PNG of the card", async () => {
  await mount(log());

  await act(async () => mockThumb.onMapState?.("pending"));
  await send();
  expect(mockCapture).not.toHaveBeenCalled();

  await act(async () => mockThumb.onMapState?.("ready"));
  await send();
  expect(mockCapture).toHaveBeenCalledTimes(1);
  expect(mockShare).toHaveBeenCalledWith(
    "file:///cache/card.png",
    expect.objectContaining({ mimeType: "image/png" }),
  );
});

test("line only drops the map and keeps the cut", async () => {
  await mount(log());

  await fireEvent.press(screen.getByTestId("share-line-only"));

  expect(mockThumb.props?.mapKey).toBeUndefined();
  expect(mockThumb.props?.segments.flat()).not.toContainEqual(line[0]);
});

test("with the map turned off in Settings there is no map to choose, and the cut stays", async () => {
  mockSettings.mapTilesEnabled = false;
  await mount(log());

  expect(screen.queryByTestId("share-with-map")).toBeNull();
  expect(mockThumb.props?.mapKey).toBeUndefined();
  expect(screen.getByText(/left off the picture/)).toBeTruthy();
});

test("a workout has no line, no map and no GPX, and sends at once", async () => {
  await mount(log({ outing: null, leaguesM: null, movingSeconds: null, uuid: "w1" }, []));

  expect(mockThumb.props).toBeNull();
  expect(screen.queryByTestId("share-with-map")).toBeNull();
  expect(screen.queryByTestId("share-gpx")).toBeNull();
  await send();
  expect(mockCapture).toHaveBeenCalledTimes(1);
});

test("a phone with no share sheet is told, not left with a button that does nothing", async () => {
  mockAvailable.mockResolvedValue(false);
  await mount(log({ outing: null, uuid: "w1" }, []));

  await send();

  expect(mockCapture).not.toHaveBeenCalled();
  expect(mockShowError).toHaveBeenCalledWith("The picture could not be made. Try again.");
});

test("the GPX goes out through the one writer of the format", async () => {
  await mount(log());

  await fireEvent.press(screen.getByTestId("share-gpx"));

  expect(mockExport).toHaveBeenCalledWith([{ t: 1 }]);
});

test("a felled boss is named by its own name and drawn fallen, not the quest's painting", async () => {
  const { getBossAsset } = require("@/constants/assetMap") as typeof import("@/constants/assetMap");
  const { BOSSES } = require("@/constants/bosses") as typeof import("@/constants/bosses");
  await mount(log({ outing: null }, []), {
    adventureId: 1,
    title: BOSSES.fire_dragon.name,
    bossImagePath: "fire_dragon.webp",
    steps: 3,
    days: 4,
    hurt: [],
    lastBlow: null,
    pool: 100,
    felledAt: new Date(2026, 8, 20),
  });

  expect(screen.getByTestId("share-card-kill")).toHaveTextContent(
    new RegExp(BOSSES.fire_dragon.name.en),
  );
  expect(screen.getByTestId("share-card-kill")).not.toHaveTextContent("Path");
  const fallen = getBossAsset("fire_dragon.webp", 0, "defeated");
  expect(screen.getByTestId("share-card-visual").props.source).toEqual([fallen]);
});
