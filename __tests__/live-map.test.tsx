import { act, fireEvent, render, screen } from "@testing-library/react-native";
import { TamaguiProvider } from "tamagui";
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
jest.mock("expo-localization", () => ({
  getLocales: () => [{ languageCode: "en", languageTag: "en-US" }],
}));
jest.mock("@maplibre/maplibre-react-native", () => {
  const { View } = require("react-native");
  const passthrough =
    (testID: string) =>
    ({ children }: { children?: React.ReactNode }) => <View testID={testID}>{children}</View>;
  return {
    Map: ({ children, mapStyle }: { children?: React.ReactNode; mapStyle?: unknown }) => {
      mockMapStyle(mapStyle);
      return <View testID="maplibre">{children}</View>;
    },
    Camera: ({ center }: { center?: unknown }) => {
      mockCenter(center);
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
        <LiveMap minHeight={200} topInset={0} />
      </TamaguiProvider>,
    );
  });
}

const lastStyle = () => JSON.stringify(mockMapStyle.mock.calls.at(-1)?.[0]);

beforeEach(() => {
  mockMapStyle.mockClear();
  mockCenter.mockClear();
});

test("before the first fix it holds the place and frames nothing", async () => {
  await mount([], true);

  expect(screen.getByTestId("live-map")).toBeTruthy();
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
