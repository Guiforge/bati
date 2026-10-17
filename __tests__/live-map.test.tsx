import { act, fireEvent, render, screen } from "@testing-library/react-native";
import { TamaguiProvider, Text } from "tamagui";
import { LiveMap } from "@/components/session/LiveMap";
import { rawColors } from "@/constants/rawColors";
import type { LocationFix } from "@/modules/bati-location";
import { useExpeditionStore } from "@/stores/expedition";
import { useSettingsStore } from "@/stores/settings";
import config from "@/tamagui.config";

/**
 * The map a hero sees while they are out.
 *
 * Three things are checked, and none of them is what MapLibre draws: that nothing is framed before
 * the sky has given a position (a camera centred nowhere is the Gulf of Guinea), that the camera
 * follows the last fix, and that the refused state asks the network for nothing. The last one is
 * the same assertion the recap makes, for the same promise, on the second screen that keeps it.
 */

/** Every style handed to MapLibre, in order. */
const mockMapStyle = jest.fn<void, [unknown]>();
/** Every centre handed to the camera, in order. */
const mockCenter = jest.fn<void, [unknown]>();
/** The last `onDidFinishLoadingStyle` MapLibre was handed, so a test can say the style is drawn. */
let mockStyleLoaded: (() => void) | undefined;
/** The last `onRegionWillChange` MapLibre was handed, so a test can put a finger on the map. */
let mockRegionWillChange:
  | ((event: { nativeEvent: { userInteraction: boolean } }) => void)
  | undefined;
/** The finger gestures the last map was handed. */
let mockGestures: Record<string, boolean | undefined> = {};
/** What the phone answers when asked whether it refuses Bati the network. */
const mockNetworkBlocked = jest.fn(() => false);
/** Every initial view handed to the camera, in order. */
const mockInitialView = jest.fn<void, [unknown]>();

jest.mock("@/db/client", () => ({ db: {}, schema: {}, runMigrations: jest.fn() }));
jest.mock("@/db", () => ({
  preferences: { setMapTilesEnabled: jest.fn().mockResolvedValue(undefined) },
}));
const mockRouteCandidates = jest.fn();
jest.mock("@/db/gps", () => ({
  appendPoints: jest.fn(),
  pointsOf: jest.fn(),
  routeCandidates: (...args: unknown[]) => mockRouteCandidates(...args),
}));
/** The `data` each source was last handed, by id, and the paint of each layer. */
const mockSources: Record<string, unknown> = {};
const mockLayers: Record<string, unknown> = {};
jest.mock("@/modules/bati-location", () => ({
  isAvailable: () => false,
  isNetworkBlocked: () => mockNetworkBlocked(),
}));
jest.mock("@/stores/session", () => ({
  recordedDurationSeconds: () => 0,
  useSessionStore: { getState: () => ({}) },
}));
jest.mock("@/src/reportError", () => ({ reportError: jest.fn() }));
/** The real fold, counted: the live map must not run it once per fix. */
const mockToTrace = jest.fn();
jest.mock("@/src/gps/trace", () => {
  const actual = jest.requireActual("@/src/gps/trace");
  return {
    ...actual,
    toTrace: (...args: unknown[]) => {
      mockToTrace();
      return actual.toTrace(...args);
    },
  };
});
jest.mock("expo-localization", () => ({
  getLocales: () => [{ languageCode: "en", languageTag: "en-US" }],
}));
jest.mock("@maplibre/maplibre-react-native", () => {
  const { View } = require("react-native");
  return {
    Map: ({
      children,
      mapStyle,
      onDidFinishLoadingStyle,
      onRegionWillChange,
      dragPan,
      touchZoom,
      doubleTapZoom,
      doubleTapHoldZoom,
    }: {
      dragPan?: boolean;
      touchZoom?: boolean;
      doubleTapZoom?: boolean;
      doubleTapHoldZoom?: boolean;
      children?: React.ReactNode;
      mapStyle?: unknown;
      onDidFinishLoadingStyle?: () => void;
      onRegionWillChange?: typeof mockRegionWillChange;
    }) => {
      mockMapStyle(mapStyle);
      mockStyleLoaded = onDidFinishLoadingStyle;
      mockRegionWillChange = onRegionWillChange;
      mockGestures = { dragPan, touchZoom, doubleTapZoom, doubleTapHoldZoom };
      return <View testID="maplibre">{children}</View>;
    },
    Camera: ({ center, initialViewState }: { center?: unknown; initialViewState?: unknown }) => {
      mockCenter(center);
      mockInitialView(initialViewState);
      return null;
    },
    GeoJSONSource: ({
      id,
      data,
      children,
    }: {
      id: string;
      data: unknown;
      children?: React.ReactNode;
    }) => {
      mockSources[id] = data;
      return <View testID={`source-${id}`}>{children}</View>;
    },
    Layer: ({ id, paint }: { id: string; paint: unknown }) => {
      mockLayers[id] = paint;
      return <View testID={`layer-${id}`} />;
    },
  };
});

import "@/i18n";

const T0 = Date.UTC(2026, 8, 11, 7, 0, 0);

/** A hero walking north at 1.4 m/s, one fix a second. */
const walking = (i: number): LocationFix => ({
  t: T0 + i * 1000,
  lat: 43.6 + i * 0.0000126,
  lon: 1.44,
  ele: 100,
  baro: null,
  acc: 4,
  speed: 1.4,
  distFromPrev: i === 0 ? 0 : 1.4,
});

async function mount(
  fixes: LocationFix[],
  tiles: boolean,
  locked = false,
  extra: { locomotion?: "walk" | "run" | "ride"; overlay?: boolean } = {},
) {
  useExpeditionStore.setState({ fixes });
  useSettingsStore.setState({ language: "en", mapTilesEnabled: tiles });
  await act(async () => {
    await render(
      <TamaguiProvider config={config} defaultTheme="dark">
        <LiveMap
          minHeight={200}
          topInset={0}
          placeholder={<Text>the movement's picture</Text>}
          locked={locked}
          locomotion={extra.locomotion ?? "walk"}
          overlay={extra.overlay ? <Text testID="live-map-big">12.34 km</Text> : undefined}
        />
      </TamaguiProvider>,
    );
  });
}

const lastStyle = () => JSON.stringify(mockMapStyle.mock.calls.at(-1)?.[0]);

beforeEach(() => {
  mockMapStyle.mockClear();
  mockCenter.mockClear();
  mockInitialView.mockClear();
  mockToTrace.mockClear();
  mockNetworkBlocked.mockReturnValue(false);
});

test("a finger on the map stops the follow, and the button brings it back to the hero", async () => {
  await mount([walking(0), walking(1)], true);
  const regionWillChange = (userInteraction: boolean) =>
    act(async () => mockRegionWillChange?.({ nativeEvent: { userInteraction } }));

  // The camera's own glide is not a finger.
  await regionWillChange(false);
  expect(screen.queryByTestId("live-map-recenter")).toBeNull();

  await regionWillChange(true);
  await act(async () =>
    useExpeditionStore.setState({ fixes: [walking(0), walking(1), walking(2)] }),
  );
  // No centre at all: a centre, even the old one, would drag the map out from under the finger.
  expect(mockCenter.mock.calls.at(-1)?.[0]).toBeUndefined();

  await act(async () => {
    await fireEvent.press(screen.getByTestId("live-map-recenter"));
  });
  expect(mockCenter.mock.calls.at(-1)?.[0]).toEqual([walking(2).lon, walking(2).lat]);
  expect(screen.queryByTestId("live-map-recenter")).toBeNull();
});

// The pocket guard: the screen is kept on on foot, so a pocket is awake and must not move the view.
test("locked, no finger gesture reaches the map and the recentre button never shows", async () => {
  await mount([walking(0), walking(1)], true, true);
  expect(mockGestures).toEqual({
    dragPan: false,
    touchZoom: false,
    doubleTapZoom: false,
    doubleTapHoldZoom: false,
  });
  expect(screen.queryByTestId("live-map-recenter")).toBeNull();
});

test("unlocked, every finger gesture is on", async () => {
  await mount([walking(0), walking(1)], true);
  expect(mockGestures).toEqual({
    dragPan: true,
    touchZoom: true,
    doubleTapZoom: true,
    doubleTapHoldZoom: true,
  });
});

test("tiles on, the chosen style is the one handed to MapLibre; tiles off, nothing to fetch", async () => {
  useSettingsStore.setState({ mapStyle: "fiord" });
  await mount([walking(0), walking(1)], true);
  expect(lastStyle()).toContain("#45516E");
  expect(lastStyle()).toContain("tiles.openfreemap.org/sprites");
});

test("says the phone blocks the network instead of crediting tiles that never arrive", async () => {
  mockNetworkBlocked.mockReturnValue(true);
  await mount([walking(0), walking(1)], true);

  expect(screen.getByTestId("map-blocked")).toBeTruthy();
  expect(screen.getByTestId("map-open-settings")).toBeTruthy();
  expect(screen.queryByTestId("map-attribution")).toBeNull();
});

test("before the first fix it shows what it was handed, and frames nothing", async () => {
  await mount([], true);

  // The movement's picture, on the session screen. An empty dark slot while the sky is being
  // found read as a map that failed to load.
  expect(screen.getByText("the movement's picture")).toBeTruthy();
  expect(screen.queryByTestId("maplibre")).toBeNull();
  // No credit for tiles that were never fetched, and no offer for a map that is not there yet.
  expect(screen.queryByTestId("map-attribution")).toBeNull();
  expect(screen.queryByTestId("map-offer")).toBeNull();
});

test("follows the hero, and fetches nothing until the hero says yes", async () => {
  const fixes = Array.from({ length: 10 }, (_, i) => walking(i));
  await mount(fixes, false);

  expect(screen.getByTestId("maplibre")).toBeTruthy();
  const last = fixes.at(-1);
  expect(mockCenter.mock.calls.at(-1)?.[0]).toEqual([last?.lon, last?.lat]);

  // Matched against any URL rather than the host: a source written back by mistake is a request,
  // whichever host it points at.
  expect(lastStyle()).not.toMatch(/https?:\/\//);
  expect(screen.getByTestId("map-offer")).toBeTruthy();
  expect(screen.queryByTestId("map-attribution")).toBeNull();

  await act(async () => {
    await fireEvent.press(screen.getByTestId("map-enable"));
  });

  expect(useSettingsStore.getState().mapTilesEnabled).toBe(true);
  expect(lastStyle()).toMatch(/tiles\.openfreemap\.org/);
  expect(screen.queryByTestId("map-offer")).toBeNull();
  expect(screen.getByTestId("map-attribution")).toBeTruthy();
});

// Four lines of reading over the trace, at the one moment nobody reads. The credit is owed.
test("under way, the offer waits for the next stop and the credit stays", async () => {
  const fixes = Array.from({ length: 10 }, (_, i) => walking(i));
  const underWay = { ...useExpeditionStore.getState().track, startedAt: 1, paused: false };
  useExpeditionStore.setState({ track: underWay });
  await mount(fixes, false);
  expect(screen.queryByTestId("map-offer")).toBeNull();

  await act(async () => useExpeditionStore.setState({ track: { ...underWay, paused: true } }));
  expect(screen.getByTestId("map-offer")).toBeTruthy();

  await act(async () => useExpeditionStore.setState({ track: underWay }));
  await act(async () => useSettingsStore.setState({ mapTilesEnabled: true }));
  expect(screen.getByTestId("map-attribution")).toBeTruthy();
});

test("stops drawing while the app is in the background, and draws the whole walk on return", async () => {
  const { AppState } = require("react-native");
  const addListener = jest.spyOn(AppState, "addEventListener");
  await mount([walking(0), walking(1)], true);
  const onChange = addListener.mock.calls.at(-1)?.[1] as (state: string) => void;

  // Screen locked: fixes keep landing in the store, and the map neither re-renders nor moves.
  await act(async () => onChange("background"));
  mockCenter.mockClear();
  await act(() => {
    useExpeditionStore.setState({ fixes: Array.from({ length: 60 }, (_, i) => walking(i)) });
  });
  expect(screen.queryByTestId("maplibre")).toBeNull();
  expect(mockCenter).not.toHaveBeenCalled();

  // Back: one render, on the last fix, and framed there from the start. The map remounts, and a
  // camera with no initial view glides in from 0,0.
  await act(async () => onChange("active"));
  expect(screen.getByTestId("maplibre")).toBeTruthy();
  const here = [walking(59).lon, walking(59).lat];
  expect(mockCenter.mock.calls.at(-1)?.[0]).toEqual(here);
  expect(mockInitialView.mock.calls.at(-1)?.[0]).toEqual({ center: here, zoom: 16 });
});

test("says what it is waiting for, the sky and then the map, and goes quiet once drawn", async () => {
  await mount([], true);
  // Over the picture, while no position has come: the one wait a hero can see.
  expect(screen.getByTestId("live-map-loading")).toHaveTextContent("Finding your position");

  await act(() => {
    useExpeditionStore.setState({ fixes: [walking(0), walking(1)] });
  });
  // A position, and a map still blank while MapLibre builds its style.
  expect(screen.getByTestId("maplibre")).toBeTruthy();
  expect(screen.getByTestId("live-map-loading")).toHaveTextContent("Loading the map");

  await act(async () => mockStyleLoaded?.());
  expect(screen.queryByTestId("live-map-loading")).toBeNull();
});

test("follows every fix with the camera, and folds the walk at most every five seconds", async () => {
  jest.useFakeTimers();
  try {
    const fixes = Array.from({ length: 10 }, (_, i) => walking(i));
    await mount(fixes, true);
    const foldsAtMount = mockToTrace.mock.calls.length;

    // Twelve seconds of walking, one fix a second.
    for (let i = 10; i < 22; i++) {
      await act(() => {
        useExpeditionStore.setState({
          fixes: [...useExpeditionStore.getState().fixes, walking(i)],
        });
        jest.advanceTimersByTime(1000);
      });
      // The camera is never behind: it is on the fix that just landed.
      expect(mockCenter.mock.calls.at(-1)?.[0]).toEqual([walking(i).lon, walking(i).lat]);
    }

    // Two five-second ticks in twelve seconds, not twelve folds.
    expect(mockToTrace.mock.calls.length - foldsAtMount).toBe(2);

    // The next tick picks up the last two fixes; the one after it has nothing new and is free.
    await act(() => {
      jest.advanceTimersByTime(10_000);
    });
    expect(mockToTrace.mock.calls.length - foldsAtMount).toBe(3);
  } finally {
    jest.useRealTimers();
  }
});

test.each([
  ["walk", 16],
  ["run", 16],
  ["ride", 15],
] as const)("follows a %s at zoom %i, with no setting", async (locomotion, zoom) => {
  await mount([walking(0), walking(1)], true, false, { locomotion });
  expect(mockInitialView.mock.calls.at(-1)?.[0]).toMatchObject({ zoom });
});

test("the big figure floats over the picture before the first fix", async () => {
  await mount([], true, false, { overlay: true });
  expect(screen.getByTestId("live-map-big")).toBeTruthy();
  expect(screen.queryByTestId("live-map")).toBeNull();
});

test("and over the map once there is one", async () => {
  await mount([walking(0), walking(1)], true, false, { overlay: true });
  expect(screen.getByTestId("live-map")).toBeTruthy();
  expect(screen.getByTestId("live-map-big")).toBeTruthy();
});

/**
 * The route ghost. Each test has its own session uuid: the candidates hook keeps its last read at
 * module level, so a shared uuid would carry one test's answer into the next.
 */
describe("the route ghost", () => {
  const { DEFAULT_LIVE_VIEW } =
    require("@/src/gps/liveFigures") as typeof import("@/src/gps/liveFigures");
  const past = (id: string) => ({
    id,
    performedAt: new Date(Date.UTC(2026, 8, 1)),
    points: Array.from({ length: 200 }, (_, i) => ({ lat: 43.6 + i * 5 * 0.0000126, lon: 1.44 })),
  });
  const run = (n: number) => Array.from({ length: n }, (_, i) => walking(i));
  /** The store of an outing that began: view frozen, uuid set, `metres` credited. */
  const begun = (uuid: string, metres: number, view: Record<string, unknown> = {}) =>
    useExpeditionStore.setState({
      sessionUuid: uuid,
      view: { ...DEFAULT_LIVE_VIEW, routeGhost: true, ...view },
      track: { ...useExpeditionStore.getState().track, distanceM: metres },
    });

  beforeEach(() => {
    mockRouteCandidates.mockReset();
    for (const k of Object.keys(mockSources)) delete mockSources[k];
  });
  afterEach(() => {
    useExpeditionStore.setState({ sessionUuid: null, view: DEFAULT_LIVE_VIEW });
  });

  test("off by default: nothing is read and nothing is drawn", async () => {
    useExpeditionStore.setState({ sessionUuid: "g-off", view: DEFAULT_LIVE_VIEW });
    await mount(run(60), true);
    expect(mockRouteCandidates).not.toHaveBeenCalled();
    expect(screen.queryByTestId("source-live-route-ghost")).toBeNull();
  });

  test("on: nothing under 400 m, then the pale line under the gold, in the bone paint", async () => {
    jest.useFakeTimers();
    mockRouteCandidates.mockResolvedValue([past("p1")]);
    begun("g-400", 399);
    await mount(run(60), true);
    expect(mockRouteCandidates).toHaveBeenCalledWith(
      "walk",
      expect.objectContaining({ lat: 43.6 }),
      new Date(T0),
      "g-400",
    );
    expect(screen.queryByTestId("source-live-route-ghost")).toBeNull();

    await act(() => {
      begun("g-400", 400);
      useExpeditionStore.setState({ fixes: run(61) });
    });
    // The fold runs on the five-second cadence.
    await act(async () => jest.advanceTimersByTime(5000));
    expect(screen.getByTestId("source-live-route-ghost")).toBeTruthy();
    const paint = mockLayers["live-route-ghost-line"] as Record<string, unknown>;
    expect(paint["line-color"]).not.toBe(rawColors.resourceGold);
    // Drawn first: under today's line.
    const ids = screen.getAllByTestId(/^source-/).map((n) => n.props.testID);
    expect(ids.indexOf("source-live-route-ghost")).toBeLessThan(ids.indexOf("source-live-path"));
    jest.useRealTimers();
  });

  test("late candidates: the ghost appears with no new fix, and the walk is not folded again", async () => {
    let resolve: (v: unknown[]) => void = () => undefined;
    mockRouteCandidates.mockReturnValue(
      new Promise((r) => {
        resolve = r;
      }),
    );
    begun("g-late", 600);
    await mount(run(60), true);
    expect(screen.queryByTestId("source-live-route-ghost")).toBeNull();
    const folds = mockToTrace.mock.calls.length;

    await act(async () => resolve([past("p2")]));
    expect(screen.getByTestId("source-live-route-ghost")).toBeTruthy();
    expect(mockToTrace.mock.calls.length).toBe(folds);
  });

  test("a walk-run never reads and never draws", async () => {
    mockRouteCandidates.mockResolvedValue([past("p3")]);
    begun("g-wr", 600, { walkRun: true });
    await mount(run(60), true);
    expect(mockRouteCandidates).not.toHaveBeenCalled();
    expect(screen.queryByTestId("source-live-route-ghost")).toBeNull();
  });

  test("background then back: no second read, the ghost is there again", async () => {
    const { AppState } = require("react-native");
    const addListener = jest.spyOn(AppState, "addEventListener");
    mockRouteCandidates.mockResolvedValue([past("p4")]);
    begun("g-bg", 600);
    await mount(run(60), true);
    const onChange = addListener.mock.calls.at(-1)?.[1] as (state: string) => void;
    expect(screen.getByTestId("source-live-route-ghost")).toBeTruthy();

    await act(async () => onChange("background"));
    await act(async () => onChange("active"));
    expect(screen.getByTestId("source-live-route-ghost")).toBeTruthy();
    expect(mockRouteCandidates).toHaveBeenCalledTimes(1);
  });

  test("a fold that finds the same route again hands MapLibre the same data object", async () => {
    mockRouteCandidates.mockResolvedValue([past("p5")]);
    begun("g-same", 600);
    await mount(run(60), true);
    const data = mockSources["live-route-ghost"];
    expect(data).toBeDefined();

    await act(async () => useExpeditionStore.setState({ fixes: run(70) }));
    expect(mockSources["live-route-ghost"]).toBe(data);
  });
});
