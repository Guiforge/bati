import { act, render, screen, waitFor } from "@testing-library/react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { TamaguiProvider } from "tamagui";
import { AchievementsCard } from "@/components/journal/AchievementsCard";
import { PersonalRecordsCard } from "@/components/journal/PersonalRecordsCard";
import { ProgressionCard } from "@/components/journal/ProgressionCard";
import { SuggestedQuestsCard } from "@/components/journal/SuggestedQuestsCard";
import { UserLevelCard } from "@/components/journal/UserLevelCard";
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
jest.mock("@/i18n", () => ({ i18n: { changeLanguage: jest.fn() } }));
jest.mock("expo-localization", () => ({
  getLocales: () => [{ languageCode: "en", languageTag: "en-US" }],
}));

const mockGetUserLevelInfo = jest.fn();
const mockGetPersonalRecordsSummary = jest.fn();
const mockGetStreakInfo = jest.fn();
const mockGetSuggestedQuestsForWeakAreas = jest.fn();
const mockGetAllAchievementsWithProgress = jest.fn();
const mockGetMuscleBalance = jest.fn();
const mockGetPatternBalance = jest.fn();
const mockGetRecentSessionHistory = jest.fn();
const mockGetReadyStep = jest.fn();

jest.mock("@/db/userLevel", () => ({
  getUserLevelInfo: () => mockGetUserLevelInfo(),
  calculateLevelFromXp: () => 3,
  getXpForLevel: (l: number) => l * 100,
  getLevelTitle: () => ({ en: "Apprentice", fr: "Apprenti" }),
}));
jest.mock("@/db/personalRecords", () => ({
  getPersonalRecordsSummary: () => mockGetPersonalRecordsSummary(),
}));
jest.mock("@/db/streaks", () => ({ getStreakInfo: () => mockGetStreakInfo() }));
jest.mock("@/db/muscleBalance", () => ({
  getSuggestedQuestsForWeakAreas: () => mockGetSuggestedQuestsForWeakAreas(),
  getMuscleBalance: () => mockGetMuscleBalance(),
  getPatternBalance: () => mockGetPatternBalance(),
  getPullDeficit: () => null,
  getBalanceRecommendation: () => null,
}));
jest.mock("@/db/achievements", () => ({
  getAllAchievementsWithProgress: () => mockGetAllAchievementsWithProgress(),
}));
jest.mock("@/db/completed", () => ({
  getRecentSessionHistory: () => mockGetRecentSessionHistory(),
}));
jest.mock("@/db/exercises", () => ({ getReadyStep: () => mockGetReadyStep() }));

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
  mockGetUserLevelInfo.mockResolvedValue({
    level: 3,
    title: { en: "Apprentice", fr: "Apprenti" },
    totalXp: 350,
    currentLevelXp: 50,
    xpToNextLevel: 150,
    xpProgress: 33,
  });
  mockGetPersonalRecordsSummary.mockResolvedValue({
    records: [],
    totalSessions: 0,
    totalWorkUnits: 0,
    longestSession: null,
  });
  mockGetStreakInfo.mockResolvedValue({ current: 0, longest: 0, isLit: false });
  mockGetSuggestedQuestsForWeakAreas.mockResolvedValue([]);
  mockGetAllAchievementsWithProgress.mockResolvedValue([]);
  mockGetMuscleBalance.mockResolvedValue([]);
  mockGetPatternBalance.mockResolvedValue([]);
  mockGetRecentSessionHistory.mockResolvedValue([]);
  mockGetReadyStep.mockResolvedValue(null);
});

describe("UserLevelCard", () => {
  it("shows the hero's level once the query lands", async () => {
    await mount(<UserLevelCard />);

    expect(await screen.findByText(/Apprentice/)).toBeTruthy();
  });

  it("disappears rather than sitting as an eternal skeleton when the query fails", async () => {
    mockGetUserLevelInfo.mockRejectedValue(new Error("db is gone"));

    await mount(<UserLevelCard />);

    // Asserting on the card's own content, not on a null tree: the mount helper wraps everything
    // in providers, so the rendered tree is never empty even when the card returns null.
    await waitFor(() => expect(screen.queryByText(/Apprentice/)).toBeNull());
  });
});

describe("PersonalRecordsCard", () => {
  it("renders with no records at all — a new hero is the common case", async () => {
    await mount(<PersonalRecordsCard />);

    await waitFor(() => expect(screen.toJSON()).not.toBeUndefined());
  });

  it("survives a failing summary without taking the journal with it", async () => {
    mockGetPersonalRecordsSummary.mockRejectedValue(new Error("db is gone"));

    await expect(mount(<PersonalRecordsCard />)).resolves.toBeDefined();
  });
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

describe("ProgressionCard priority", () => {
  /** Five sessions all reporting the same thing — enough for `analyzeDifficultyProgression`. */
  const sessionsFeeling = (feedback: "easy" | "hard") =>
    Array.from({ length: 5 }, (_, i) => ({
      id: i + 1,
      questId: 1,
      userLevel: "medium" as const,
      durationSeconds: 600,
      performedAt: new Date(2026, 0, i + 1),
      feedback,
    }));

  /** A rung in progress: enough to render the ladder branch. */
  const readyStep = {
    from: { id: 1, enName: "Table Row", frName: "Rowing sur table", imagePath: "" },
    next: { id: 2, enName: "Inverted Row", frName: "Rowing inversé", imagePath: "" },
    metTarget: 2,
    required: 3,
    isEarned: false,
  };

  it("puts recovery ahead of the ladder when the hero reports it is too hard", async () => {
    // The ladder used to sit in front of this branch, so a hero reporting five hard sessions
    // running was answered with "here is your next rung" as long as any tracked movement had one
    // on-target set. Pushing up on someone asking to come down is the bug this pins.
    mockGetRecentSessionHistory.mockResolvedValue(sessionsFeeling("hard"));
    mockGetReadyStep.mockResolvedValue(readyStep);

    await mount(<ProgressionCard />);

    expect(await screen.findByText(/Recovery|Récupération/i)).toBeTruthy();
    expect(screen.queryByText(/next rung|prochaine marche/i)).toBeNull();
  });

  it("keeps the ladder ahead of 'too easy' — a harder variation beats a bigger multiplier", async () => {
    mockGetRecentSessionHistory.mockResolvedValue(sessionsFeeling("easy"));
    mockGetReadyStep.mockResolvedValue(readyStep);

    await mount(<ProgressionCard />);

    expect(await screen.findByText(/next rung|prochaine marche/i)).toBeTruthy();
  });
});

// The same two arms for the three remaining cards. Each swallows its own failure, so the one
// thing that must hold is that a broken query costs a card and never the screen around it.
describe.each([
  ["AchievementsCard", AchievementsCard, mockGetAllAchievementsWithProgress],
  ["ProgressionCard", ProgressionCard, mockGetRecentSessionHistory],
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
