import { act, fireEvent, render, screen } from "@testing-library/react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { TamaguiProvider } from "tamagui";
import ExpeditionRecapScreen from "@/app/recap";
import { ToastProvider } from "@/components/common/Toast";
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
const mockOutingSession = jest.fn<Promise<unknown>, [string]>();
const mockQuestTemplates = jest.fn<Promise<unknown[]>, []>();
const mockFlushTrack = jest.fn<void, [unknown, unknown, unknown]>();
const mockShareTrack = jest.fn<Promise<void>, [unknown]>(() => Promise.resolve());

jest.mock("@/db/gps", () => ({
  pointsOf: (id: string) => mockPointsOf(id),
  outingSession: (id: string) => mockOutingSession(id),
}));
jest.mock("@/db/quests", () => ({ listQuestTemplates: () => mockQuestTemplates() }));
jest.mock("@/db/client", () => ({ db: {}, schema: {}, runMigrations: jest.fn() }));
jest.mock("@/db", () => ({ preferences: {} }));

// The real i18n, not a stub: this screen's strings live in `locales/*.json` and the inline
// English defaults it used to carry had already drifted from them. A test reading the defaults
// would have been blind to exactly that.
import "@/i18n";

jest.mock("@/src/widget", () => ({ requestWidgetsUpdate: jest.fn() }));
jest.mock("@/src/reportError", () => ({ reportError: jest.fn() }));
jest.mock("@/src/gps/trackFile", () => ({
  FLUSH_EVERY: 30,
  trackFileFor: (startedAt: number) => ({ name: `bati-${startedAt}.gpx` }),
  flushTrack: (file: unknown, fixes: unknown, distanceM: unknown) =>
    mockFlushTrack(file, fixes, distanceM),
  shareTrack: (file: unknown) => mockShareTrack(file),
}));
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
          {/* The screen reads `useToast` to say so when a trace cannot be written, and the hook
              throws outside its provider. `app/_layout.tsx` wraps the whole navigator in one, so
              this mirrors the tree the screen actually renders in rather than working around it. */}
          <ToastProvider>
            <ExpeditionRecapScreen />
          </ToastProvider>
        </TamaguiProvider>
      </SafeAreaProvider>,
    );
  });
  return result;
}

/**
 * What the reducer credited for `walkThenStand()`, which is what `leaguesM` holds on the row.
 *
 * Derived rather than written down: the reducer's rules are still moving, and a fixture pinned
 * to yesterday's metre count fails for a reason that has nothing to do with this screen. What is
 * written down below is the *shape* each figure takes and the constants it converts by, which is
 * the part the screen is responsible for.
 */
const TRACK = walkThenStand().reduce(accept, EMPTY);
const CREDITED_M = Math.round(TRACK.distanceM);
const clock = (seconds: number) =>
  `${Math.floor(seconds / 60)}:${String(Math.floor(seconds) % 60).padStart(2, "0")}`;
const MOVING = clock(TRACK.movingMs / 1000);
const KM_PACE = `${clock(Math.round((TRACK.movingMs / 1000) * (1000 / CREDITED_M)))} /km`;
const FEET = Math.round(CREDITED_M / 0.3048);
const MILE_PACE = `${clock(Math.round((TRACK.movingMs / 1000) * (1609.344 / CREDITED_M)))} /mi`;

beforeEach(() => {
  mockPointsOf.mockReset();
  mockFlushTrack.mockClear();
  mockShareTrack.mockClear();
  mockOutingSession.mockResolvedValue({
    questId: 7,
    performedAt: new Date(T0),
    leaguesM: CREDITED_M,
  });
  mockQuestTemplates.mockResolvedValue([
    { id: 7, enTitle: "The Warden's Round", frTitle: "La Ronde du Veilleur" },
  ]);
  useSettingsStore.setState({ distanceUnit: "metric", language: "en" });
});

describe("a session that left the walls", () => {
  beforeEach(() => {
    mockPointsOf.mockResolvedValue(walkThenStand());
  });

  test("draws the map and the three numbers", async () => {
    await mount();
    expect(await screen.findByTestId("recap-map")).toBeTruthy();
    expect(screen.getByTestId("recap-distance")).toHaveTextContent(`${CREDITED_M} m`);
    // `m:ss`, the shape the panel the hero just left uses, never the estimate's "1 min 35s".
    expect(screen.getByTestId("recap-moving")).toHaveTextContent(MOVING);
    expect(screen.getByTestId("recap-pace")).toHaveTextContent(KM_PACE);
  });

  /**
   * The screen used to fold the fixes again and print that. Three derivations of one walk is how
   * a hero reads 85 m here and pays the road 84: `leaguesM` is the column the road was paid in,
   * and the recap prints the column.
   */
  test("the distance is the column the road was paid in, not a sum of the fixes", async () => {
    const fixes = walkThenStand();
    const naive = fixes.reduce((total, f) => total + f.distFromPrev, 0);
    // The fixture has to actually separate the two answers, or this test proves nothing.
    expect(Math.round(naive)).not.toBe(CREDITED_M);
    // And the column has to be able to disagree with the replay, or reading it proves nothing.
    mockOutingSession.mockResolvedValue({
      questId: 7,
      performedAt: new Date(T0),
      leaguesM: 512,
    });

    await mount();
    const distance = await screen.findByTestId("recap-distance");
    expect(distance).toHaveTextContent("512 m");
    expect(distance).not.toHaveTextContent(`${Math.round(naive)} m`);
    expect(distance).not.toHaveTextContent(`${CREDITED_M} m`);
  });

  test("names the outing and when it happened, so two of them are not the same card", async () => {
    await mount();

    expect(await screen.findByText("The Warden's Round")).toBeTruthy();
    // The screen's own name is the fallback, never the title of a walk that has one.
    expect(screen.queryByText("The ground covered")).toBeNull();
    expect(screen.getByTestId("recap-date")).toBeTruthy();
  });

  test("the unit comes from the setting, which is only possible through the format helpers", async () => {
    // No inline division by 1000 can produce feet or a mile pace: this is the assertion that
    // pins `formatDistance`/`formatPace` as the thing rendering, rather than the screen.
    useSettingsStore.setState({ distanceUnit: "imperial" });
    await mount();
    expect(await screen.findByTestId("recap-distance")).toHaveTextContent(`${FEET} ft`);
    expect(screen.getByTestId("recap-pace")).toHaveTextContent(MILE_PACE);
  });

  test("credits OpenStreetMap and the tile host, which MapLibre's own widget is not doing", async () => {
    await mount();
    const line = await screen.findByTestId("recap-attribution");
    expect(line).toHaveTextContent(/OpenStreetMap contributors/);
    expect(line).toHaveTextContent(/OpenMapTiles/);
    expect(line).toHaveTextContent(/OpenFreeMap/);
    // Once, and in the hero's language: the constant used to name the tile host in English on
    // top of the localised sentence that names it again.
    expect(line.props.children.join("").match(/OpenFreeMap/g)).toHaveLength(1);
  });

  /**
   * A walk whose service never started is saved with no `leaguesM`. Printing "0 m · 0:00 · —"
   * there reads as a verdict on the walk rather than as an absence of measurement.
   */
  test("says nothing about the ground when the session measured none", async () => {
    mockOutingSession.mockResolvedValue({
      questId: 7,
      performedAt: new Date(T0),
      leaguesM: null,
    });

    await mount();

    expect(await screen.findByTestId("recap-map")).toBeTruthy();
    expect(screen.queryByTestId("recap-distance")).toBeNull();
    expect(screen.queryByTestId("recap-moving")).toBeNull();
    expect(screen.queryByTestId("recap-pace")).toBeNull();
  });

  test("reserves the map's place while the read is in flight, and claims nothing", async () => {
    // Never resolves: the assertion is about the frame before the answer, which is the only
    // frame a slow database ever shows.
    mockPointsOf.mockReturnValue(new Promise<LocationFix[]>(() => undefined));

    await mount();

    expect(screen.getByTestId("recap-loading")).toBeTruthy();
    expect(screen.queryByTestId("recap-no-trace")).toBeNull();
    expect(screen.queryByTestId("recap-distance")).toBeNull();
  });
});

describe("a session that never left the walls", () => {
  beforeEach(() => {
    mockOutingSession.mockResolvedValue({
      questId: null,
      performedAt: new Date(T0),
      leaguesM: null,
    });
    mockQuestTemplates.mockResolvedValue([]);
  });

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

  /**
   * The export was written, tested and shipped to nobody: `shareTrack` was reachable only from
   * `app/dev-gps.tsx`, which returns null outside `__DEV__`. The recap is where a hero looks at an
   * outing, this one or one from the journal, so it is where the file is handed over.
   *
   * What matters is that it goes through `trackFile.ts` rather than formatting GPX a second time
   * here, and that it is not offered when there is nothing to hand over.
   */
  test("hands the trace over as a file, through the writer that owns the format", async () => {
    mockPointsOf.mockResolvedValue(walkThenStand());
    await mount();

    await fireEvent.press(await screen.findByTestId("recap-export"));

    expect(mockFlushTrack).toHaveBeenCalledTimes(1);
    const [file, fixes, distanceM] = mockFlushTrack.mock.calls[0] as [
      { name: string },
      LocationFix[],
      number,
    ];
    // Named after the outing, not after the tap: exporting the same run twice overwrites one file.
    expect(file.name).toBe(`bati-${walkThenStand()[0]?.t}.gpx`);
    expect(fixes).toHaveLength(walkThenStand().length);
    // The reducer's distance, the same one the screen prints, never a fresh sum of the fixes.
    expect(distanceM).toBeCloseTo(walkThenStand().reduce(accept, EMPTY).distanceM, 5);
    expect(mockShareTrack).toHaveBeenCalledWith(file);
  });

  test("offers nothing to export when the walls were never left", async () => {
    mockPointsOf.mockResolvedValue([]);
    await mount();
    expect(await screen.findByTestId("recap-no-trace")).toBeTruthy();
    expect(screen.queryByTestId("recap-export")).toBeNull();
  });
});
