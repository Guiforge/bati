import { act, render, screen } from "@testing-library/react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { TamaguiProvider } from "tamagui";
import ExpeditionRecapScreen from "@/app/recap";
import type { LocationFix } from "@/modules/bati-location";
import { accept, EMPTY } from "@/src/gps/track";
import { useSettingsStore } from "@/stores/settings";
import config from "@/tamagui.config";

/**
 * The recap screen, minus the one thing no test can see: whether a tile ever arrives.
 *
 * What is checked here is everything the map is *not* — that a quest with no fixes is never
 * offered a map, that the three numbers come from the reducer rather than from a fresh sum, that
 * they are drawn by `constants/distanceFormat.ts` rather than by an inline division, and that the
 * attribution the ODbL and OpenFreeMap require is actually on screen. All four have shipped
 * broken elsewhere in this app at least once.
 */

const mockPointsOf = jest.fn<Promise<LocationFix[]>, [string]>();

jest.mock("@/db/gps", () => ({ pointsOf: (id: string) => mockPointsOf(id) }));
jest.mock("@/db/client", () => ({ db: {}, schema: {}, runMigrations: jest.fn() }));
jest.mock("@/db", () => ({ preferences: {} }));
jest.mock("@/i18n", () => ({ i18n: { changeLanguage: jest.fn() } }));
jest.mock("@/src/widget", () => ({ requestWidgetsUpdate: jest.fn() }));
jest.mock("@/src/reportError", () => ({ reportError: jest.fn() }));
jest.mock("expo-localization", () => ({
  getLocales: () => [{ languageCode: "en", languageTag: "en-US" }],
}));
jest.mock("expo-router", () => ({
  useRouter: () => ({ push: jest.fn(), back: jest.fn(), replace: jest.fn() }),
  useLocalSearchParams: () => ({ session: "session-uuid" }),
}));

// The renderer is native and there is none in jest. Everything below the `Map` is a plain view:
// this suite is about what the screen decides, never about what MapLibre draws.
jest.mock("@maplibre/maplibre-react-native", () => {
  const { View } = require("react-native");
  const passthrough =
    (testID: string) =>
    ({ children }: { children?: React.ReactNode }) => <View testID={testID}>{children}</View>;
  return {
    Map: passthrough("maplibre"),
    Camera: passthrough("maplibre-camera"),
    GeoJSONSource: passthrough("maplibre-source"),
    Layer: passthrough("maplibre-layer"),
  };
});

const T0 = Date.UTC(2026, 7, 31, 15, 0, 0);

const fix = (over: Partial<LocationFix> & { t: number }): LocationFix => ({
  lat: 43.6,
  lon: 1.44,
  ele: 100,
  acc: 4,
  speed: 1.4,
  bearing: null,
  distFromPrev: 0,
  ...over,
});

/**
 * A minute of walking, then a minute of a phone lying still on a bench.
 *
 * The drift is the point: 60 fixes of 0.2 m sum to 12 m the hero never walked, which is what
 * auto-pause exists to refuse. A screen that re-adds `distFromPrev` itself renders 96 m; the
 * reducer says 85.
 */
function walkThenStand(): LocationFix[] {
  const fixes: LocationFix[] = [
    fix({ t: T0, acc: 5 }),
    fix({ t: T0 + 1000, acc: 5 }),
    fix({ t: T0 + 3000, acc: 5 }),
  ];
  for (let i = 1; i <= 60; i++) {
    fixes.push(
      fix({
        t: T0 + 3000 + i * 1000,
        distFromPrev: 1.4,
        lat: 43.6 + i * 0.0000126,
        lon: 1.44 + i * 0.000002,
      }),
    );
  }
  for (let i = 1; i <= 60; i++) {
    fixes.push(
      fix({
        t: T0 + 63_000 + i * 1000,
        distFromPrev: 0.2,
        lat: 43.6 + 60 * 0.0000126 + (i % 2 === 0 ? 0.00001 : -0.00001),
        lon: 1.44 + 60 * 0.000002,
      }),
    );
  }
  return fixes;
}

async function mount() {
  // `act` around the render, the same shape every other screen test here uses: the points
  // arrive on a resolved promise, and the first paint must not be asserted before it lands.
  let result!: ReturnType<typeof render>;
  await act(() => {
    result = render(
      <SafeAreaProvider
        initialMetrics={{
          frame: { x: 0, y: 0, width: 390, height: 844 },
          insets: { top: 0, left: 0, right: 0, bottom: 0 },
        }}
      >
        <TamaguiProvider config={config} defaultTheme="dark">
          <ExpeditionRecapScreen />
        </TamaguiProvider>
      </SafeAreaProvider>,
    );
  });
  return result;
}

beforeEach(() => {
  mockPointsOf.mockReset();
  useSettingsStore.setState({ distanceUnit: "metric" });
});

describe("a session that left the walls", () => {
  beforeEach(() => {
    mockPointsOf.mockResolvedValue(walkThenStand());
  });

  test("draws the map and the three numbers", async () => {
    await mount();
    expect(await screen.findByTestId("recap-map")).toBeTruthy();
    expect(screen.getByTestId("recap-distance")).toHaveTextContent("85 m");
    expect(screen.getByTestId("recap-moving")).toHaveTextContent("1 min 5s");
    expect(screen.getByTestId("recap-pace")).toHaveTextContent("12:45 /km");
  });

  test("the distance is the reducer's, not a fresh sum of the fixes", async () => {
    const fixes = walkThenStand();
    const naive = fixes.reduce((total, f) => total + f.distFromPrev, 0);
    const reduced = fixes.reduce(accept, EMPTY).distanceM;
    // The fixture has to actually separate the two answers, or this test proves nothing.
    expect(Math.round(naive)).not.toBe(Math.round(reduced));

    await mount();
    const distance = await screen.findByTestId("recap-distance");
    expect(distance).toHaveTextContent(`${Math.round(reduced)} m`);
    expect(distance).not.toHaveTextContent(`${Math.round(naive)} m`);
  });

  test("the unit comes from the setting, which is only possible through the format helpers", async () => {
    // No inline division by 1000 can produce feet or a mile pace: this is the assertion that
    // pins `formatDistance`/`formatPace` as the thing rendering, rather than the screen.
    useSettingsStore.setState({ distanceUnit: "imperial" });
    await mount();
    expect(await screen.findByTestId("recap-distance")).toHaveTextContent("279 ft");
    expect(screen.getByTestId("recap-pace")).toHaveTextContent("20:31 /mi");
  });

  test("credits OpenStreetMap and the tile host, which MapLibre's own widget is not doing", async () => {
    await mount();
    const line = await screen.findByTestId("recap-attribution");
    expect(line).toHaveTextContent(/OpenStreetMap contributors/);
    expect(line).toHaveTextContent(/OpenMapTiles/);
    expect(line).toHaveTextContent(/OpenFreeMap/);
  });
});

describe("a session that never left the walls", () => {
  test("offers no map at all, rather than an empty one", async () => {
    mockPointsOf.mockResolvedValue([]);
    await mount();
    expect(await screen.findByTestId("recap-no-trace")).toBeTruthy();
    expect(screen.queryByTestId("recap-map")).toBeNull();
    expect(screen.queryByTestId("maplibre")).toBeNull();
  });

  test("a trace that cannot be read is the same answer, not a blank screen", async () => {
    mockPointsOf.mockRejectedValue(new Error("database is locked"));
    await mount();
    expect(await screen.findByTestId("recap-no-trace")).toBeTruthy();
    expect(screen.queryByTestId("maplibre")).toBeNull();
  });
});
