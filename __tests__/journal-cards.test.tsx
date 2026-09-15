import { act, render, screen, waitFor } from "@testing-library/react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { TamaguiProvider } from "tamagui";
import { AchievementsCard } from "@/components/journal/AchievementsCard";
import { SuggestedQuestsCard } from "@/components/journal/SuggestedQuestsCard";
import "@/i18n";
import config from "@/tamagui.config";

// Every card in the journal follows the same shape: fetch on mount, show a skeleton, then either
// render or disappear. The "disappear" arm is the one worth pinning — each card swallows its own
// failure into `return null` so a broken query costs a card and not the screen, and a card that
// silently stops appearing is the least reportable bug there is.

jest.mock("@/db/client", () => ({ db: {}, schema: {}, runMigrations: jest.fn() }));
jest.mock("expo-router", () => ({ useRouter: () => ({ push: jest.fn(), back: jest.fn() }) }));
// reportError writes to the crash log, which needs the real database; the cards under test are
// about what the *screen* does when a query fails, not about how the failure is recorded.
jest.mock("@/src/reportError", () => ({ reportError: jest.fn() }));
jest.mock("expo-localization", () => ({
  getLocales: () => [{ languageCode: "en", languageTag: "en-US" }],
}));

const mockGetSuggestedQuestsForWeakAreas = jest.fn();
const mockGetAllAchievementsWithProgress = jest.fn();
const mockGetMuscleBalance = jest.fn();
const mockGetPatternBalance = jest.fn();

jest.mock("@/db/muscleBalance", () => ({
  getSuggestedQuestsForWeakAreas: () => mockGetSuggestedQuestsForWeakAreas(),
  getMuscleBalance: () => mockGetMuscleBalance(),
  getPatternBalance: () => mockGetPatternBalance(),
  getPullDeficit: () => null,
}));
jest.mock("@/db/achievements", () => ({
  getAllAchievementsWithProgress: () => mockGetAllAchievementsWithProgress(),
}));
async function mount(ui: React.ReactElement) {
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
          {ui}
        </TamaguiProvider>
      </SafeAreaProvider>,
    );
  });
  return result;
}

beforeEach(() => {
  jest.clearAllMocks();
  mockGetSuggestedQuestsForWeakAreas.mockResolvedValue([]);
  mockGetAllAchievementsWithProgress.mockResolvedValue([]);
  mockGetMuscleBalance.mockResolvedValue([]);
  mockGetPatternBalance.mockResolvedValue([]);
});

describe("SuggestedQuestsCard", () => {
  it("stays out of the way when there is nothing to suggest", async () => {
    await mount(<SuggestedQuestsCard />);

    // An empty suggestion list must not leave a header hanging over a blank space, so the card's
    // title is the thing that must be absent.
    await waitFor(() => expect(screen.queryByText(/uggest|onseil/i)).toBeNull());
  });

  it("survives a failing suggestion query", async () => {
    mockGetSuggestedQuestsForWeakAreas.mockRejectedValue(new Error("db is gone"));

    await expect(mount(<SuggestedQuestsCard />)).resolves.toBeDefined();
  });
});

// The same two arms for the remaining cards. Each swallows its own failure, so the one
// thing that must hold is that a broken query costs a card and never the screen around it.
describe.each([
  ["AchievementsCard", AchievementsCard, mockGetAllAchievementsWithProgress],
] as const)("%s", (_name, Component, query) => {
  // MuscleBalanceCard is deliberately absent: it reads two views of the same 30 days and expects
  // a shape this harness would have to guess at. Guessing produces a test that passes against a
  // fiction. It needs its own fixture, not a place in this loop.
  it("mounts on an empty database, which is what a new hero has", async () => {
    await mount(<Component />);

    await waitFor(() => expect(query).toHaveBeenCalled());
    expect(screen.toJSON()).not.toBeUndefined();
  });

  it("swallows a failing query instead of taking the journal down", async () => {
    query.mockRejectedValue(new Error("db is gone"));

    await expect(mount(<Component />)).resolves.toBeDefined();
    await waitFor(() => expect(query).toHaveBeenCalled());
  });
});
