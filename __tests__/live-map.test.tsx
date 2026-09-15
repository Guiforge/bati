import { act, fireEvent, render, screen } from "@testing-library/react-native";
import { TamaguiProvider, Text } from "tamagui";
import { LiveMap } from "@/components/session/LiveMap";
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
/** Every initial view handed to the camera, in order. */
const mockInitialView = jest.fn<void, [unknown]>();

jest.mock("@/db/client", () => ({ db: {}, schema: {}, runMigrations: jest.fn() }));
jest.mock("@/db", () => ({
  preferences: { setMapTilesEnabled: jest.fn().mockResolvedValue(undefined) },
}));
jest.mock("@/db/gps", () => ({ appendPoints: jest.fn(), pointsOf: jest.fn() }));
jest.mock("@/modules/bati-location", () => ({ isAvailable: () => false }));
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
  const passthrough =
    (testID: string) =>
    ({ children }: { children?: React.ReactNode }) => <View testID={testID}>{children}</View>;
  return {
    Map: ({
      children,
      mapStyle,
      onDidFinishLoadingStyle,
    }: {
      children?: React.ReactNode;
      mapStyle?: unknown;
      onDidFinishLoadingStyle?: () => void;
    }) => {
      mockMapStyle(mapStyle);
      mockStyleLoaded = onDidFinishLoadingStyle;
      return <View testID="maplibre">{children}</View>;
    },
    Camera: ({ center, initialViewState }: { center?: unknown; initialViewState?: unknown }) => {
      mockCenter(center);
      mockInitialView(initialViewState);
      return null;
    },
    GeoJSONSource: passthrough("maplibre-source"),
    Layer: passthrough("maplibre-layer"),
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
  acc: 4,
  speed: 1.4,
  distFromPrev: i === 0 ? 0 : 1.4,
});

async function mount(fixes: LocationFix[], tiles: boolean) {
  useExpeditionStore.setState({ fixes });
  useSettingsStore.setState({ language: "en", mapTilesEnabled: tiles });
  await act(async () => {
    await render(
      <TamaguiProvider config={config} defaultTheme="dark">
        <LiveMap minHeight={200} topInset={0} placeholder={<Text>the movement's picture</Text>} />
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
