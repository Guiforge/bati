import { act, render, screen } from "@testing-library/react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { TamaguiProvider } from "tamagui";
import type { JournalEntry } from "@/components/journal/SessionCard";
import { SessionCard } from "@/components/journal/SessionCard";
import { formatDistance } from "@/constants/distanceFormat";
import config from "@/tamagui.config";

jest.mock("@/db/client", () => ({ db: {}, schema: {}, runMigrations: jest.fn() }));
jest.mock("@/i18n", () => ({ i18n: { changeLanguage: jest.fn() } }));
jest.mock("expo-router", () => ({ useRouter: () => ({ push: jest.fn(), back: jest.fn() }) }));
jest.mock("expo-localization", () => ({
  getLocales: () => [{ languageCode: "en", languageTag: "en-US" }],
}));

const mockSettingsStore: { language: "en"; distanceUnit: "metric" | "imperial" } = {
  language: "en",
  distanceUnit: "metric",
};

jest.mock("@/stores/settings", () => ({
  useSettingsStore: (selector: (s: typeof mockSettingsStore) => unknown) =>
    selector(mockSettingsStore),
}));

async function mount(entry: JournalEntry) {
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
          <SessionCard entry={entry} />
        </TamaguiProvider>
      </SafeAreaProvider>,
    );
  });
  return result;
}

describe("SessionCard", () => {
  beforeEach(() => {
    // The imperial cases below mutate this shared mock; reset it so a test order that runs one
    // of them first does not leave the next test reading distances in the wrong unit.
    mockSettingsStore.language = "en";
    mockSettingsStore.distanceUnit = "metric";
  });

  const baseEntry: JournalEntry = {
    id: 1,
    questTitle: "Test Quest",
    performedAt: new Date("2026-01-01T10:00:00.000Z"),
    durationSeconds: 300, // 5 minutes
    userLevel: "medium",
    leaguesM: null,
  };

  it("renders duration alone for a workout with leaguesM null", async () => {
    await mount({ ...baseEntry, leaguesM: null });

    // The tag should show just the duration, no distance
    const durationTag = await screen.findByText(/5 min/);
    expect(durationTag).toBeTruthy();
    // Ensure no distance units appear (km, mi, ft)
    expect(screen.queryByText(/\bkm\b/)).toBeNull();
    expect(screen.queryByText(/\bmi\b/)).toBeNull();
    expect(screen.queryByText(/\bft\b/)).toBeNull();
  });

  it("renders duration alone for a workout with leaguesM zero", async () => {
    await mount({ ...baseEntry, leaguesM: 0 });

    // The zero case should behave like null (the > 0 guard)
    const durationTag = await screen.findByText(/5 min/);
    expect(durationTag).toBeTruthy();
    // Ensure no distance units appear (km, mi, ft)
    expect(screen.queryByText(/\bkm\b/)).toBeNull();
    expect(screen.queryByText(/\bmi\b/)).toBeNull();
    expect(screen.queryByText(/\bft\b/)).toBeNull();
  });

  it("renders distance and duration joined by middot for an outing with positive leaguesM", async () => {
    mockSettingsStore.distanceUnit = "metric";
    const distanceStr = formatDistance(4580, "metric"); // "4.58 km"
    const expectedLabel = `${distanceStr} · 5 min`;

    await mount({ ...baseEntry, leaguesM: 4580 });

    await expect(screen.findByText(expectedLabel)).resolves.toBeTruthy();
  });

  it("formats distance in imperial when distanceUnit is imperial", async () => {
    mockSettingsStore.distanceUnit = "imperial";
    const distanceStr = formatDistance(4580, "imperial"); // "2.85 mi" (4580 m / 1609.344, over the 5280 ft mile cut-over)
    const expectedLabel = `${distanceStr} · 5 min`;

    await mount({ ...baseEntry, leaguesM: 4580 });

    await expect(screen.findByText(expectedLabel)).resolves.toBeTruthy();
  });

  it("shows the quest title", async () => {
    await mount(baseEntry);

    await expect(screen.findByText("Test Quest")).resolves.toBeTruthy();
  });
});
