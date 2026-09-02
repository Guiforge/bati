import { act, fireEvent, render, screen } from "@testing-library/react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { TamaguiProvider } from "tamagui";

import { VictoryView } from "@/components/session/VictoryView";
import type { Quest } from "@/db/quests";
import type { VillageBuilding } from "@/db/village";
import "@/i18n";
import { EMPTY } from "@/src/gps/track";
import { useExpeditionStore } from "@/stores/expedition";
import { useSessionStore } from "@/stores/session";
import { useSettingsStore } from "@/stores/settings";
import config from "@/tamagui.config";

/**
 * The victory screen, for a hero who just walked.
 *
 * An outing used to end here on an XP number alone: the distance lived behind the Village tab
 * and the map behind two taps in the Journal. What is checked below is that the three figures
 * come from the tracker the save was paid from rather than from a fresh sum over `gps_points`,
 * that the road line survives a maxed road, and that the door to the map carries the session
 * whose points it is about to draw.
 *
 * Real translations here, unlike `victory-view.test.tsx`: the road line is interpolated copy, and
 * a `t` that hands back its own key cannot tell "12/15 leagues" from "42/null leagues".
 */

const mockPush = jest.fn();
const mockGetVillageBuildings = jest.fn<Promise<VillageBuilding[]>, []>();

jest.mock("expo-router", () => ({
  useRouter: () => ({ push: mockPush, replace: jest.fn(), back: jest.fn() }),
}));
jest.mock("@/db/client", () => ({ db: {}, schema: {}, runMigrations: jest.fn() }));
jest.mock("@/db", () => ({ preferences: {} }));
jest.mock("@/db/completed", () => ({ updateSessionFeedback: jest.fn() }));
jest.mock("@/db/adventures-narrative", () => ({
  getAdventureStepOutroNarrative: jest.fn().mockResolvedValue(null),
}));
jest.mock("@/db/quests", () => ({ isDailyQuest: () => false }));
jest.mock("@/db/preferences", () => ({
  preferences: {
    getSavedSession: jest.fn().mockResolvedValue(null),
    setSavedSession: jest.fn().mockResolvedValue(undefined),
    clearSavedSession: jest.fn().mockResolvedValue(undefined),
    getWarmupEnabled: jest.fn().mockResolvedValue(false),
  },
}));
jest.mock("@/db/village", () => ({
  ...jest.requireActual("@/db/village"),
  getVillageBuildings: () => mockGetVillageBuildings(),
}));
jest.mock("@/src/i18n/deviceLanguage", () => ({ getDevicePreferredAppLanguage: () => "en" }));
jest.mock("@/hooks/useHaptics", () => ({
  useHaptics: () => ({ success: jest.fn(), selection: jest.fn() }),
}));
jest.mock("@/components/common/Toast", () => ({
  useToast: () => ({ showError: jest.fn(), showSuccess: jest.fn() }),
}));
jest.mock("react-native-confetti-cannon", () => "ConfettiCannon");
jest.mock("@/components/session/ProgressionChart", () => ({ ProgressionChart: () => null }));
jest.mock("@/components/session/SessionRewards", () => ({ SessionRewards: () => null }));

type StoreState = ReturnType<typeof useSessionStore.getState>;

const saveResult = {
  sessionId: 42,
  xpEarned: 100,
  levelUp: null,
  dailyBonusApplied: false,
  heroXp: { before: 50, after: 150 },
  villageGrowth: [],
  campaign: null,
  fulfilledOath: null,
  tierUp: null,
  newRecords: [],
};

/** The High Road, at whatever floor a test needs it at. */
const road = (over: Partial<VillageBuilding>): VillageBuilding => ({
  code: "high_road",
  emoji: "🛤️",
  tier: 4,
  level: 2,
  enName: "High Road",
  frName: "Grand Chemin",
  unlockCondition: "leagues",
  relatedMuscle: null,
  driver: "leagues",
  metricValue: 12,
  nextTarget: 15,
  ...over,
});

const expeditionQuest = {
  id: 1,
  rounds: 1,
  restSeconds: 0,
  enTitle: "The Long Walk",
  frTitle: "La longue marche",
  imagePath: "assets/placeholder.jpg",
  exercises: [
    {
      exercise: { style: "expedition", muscles: ["legs"], secondsPerRep: 1 },
      target: { type: "time", value: 1800 },
    },
  ],
} as unknown as Quest;

const strengthQuest = {
  ...expeditionQuest,
  exercises: [
    // Thirty reps at three seconds: a quest whose own estimate is long enough that the duration
    // the journal keeps is the measured one. A ten-rep set estimates at 30 s, and `sessionClock`
    // caps a workout at twice its estimate — so every session of it would be filed as one minute.
    {
      exercise: { style: "strength", muscles: ["chest"], secondsPerRep: 3 },
      target: { type: "reps", value: 30 },
    },
  ],
} as unknown as Quest;

async function mountVictory({
  quest = expeditionQuest,
  sessionSeconds = 25 * 60,
}: {
  quest?: Quest;
  sessionSeconds?: number;
} = {}) {
  useSessionStore.setState({
    quest,
    status: "finished",
    startTime: Date.now() - sessionSeconds * 1000,
    totalPausedTime: 0,
    adventureRunStepId: null,
    bossFight: null,
    results: [],
    sessionUuid: "0192-walk",
    saveSession: (async () => saveResult) as unknown as StoreState["saveSession"],
    quitSession: jest.fn() as unknown as StoreState["quitSession"],
  } as unknown as Partial<StoreState>);

  await act(async () => {
    await render(
      <SafeAreaProvider
        initialMetrics={{
          frame: { x: 0, y: 0, width: 390, height: 844 },
          insets: { top: 0, left: 0, right: 0, bottom: 0 },
        }}
      >
        <TamaguiProvider config={config} defaultTheme="dark">
          <VictoryView />
        </TamaguiProvider>
      </SafeAreaProvider>,
    );
  });
}

describe("VictoryView, the walk it just celebrated", () => {
  beforeEach(() => {
    mockPush.mockClear();
    mockGetVillageBuildings.mockReset();
    mockGetVillageBuildings.mockResolvedValue([road({})]);
    useSettingsStore.setState({ language: "en", distanceUnit: "metric" });
    // 2.5 km in 25 minutes of moving. Left in the store on purpose: `end()` stops the
    // subscriptions, it never clears the reading `saveSession` was paid from.
    useExpeditionStore.setState({ track: { ...EMPTY, distanceM: 2500, movingMs: 1_500_000 } });
  });

  test("reports the ground, the moving time and the pace the save was paid from", async () => {
    await mountVictory();

    expect(screen.getByTestId("victory-expedition-distance")).toHaveTextContent("2.50 km");
    expect(screen.getByTestId("victory-expedition-moving")).toHaveTextContent("25:00");
    expect(screen.getByTestId("victory-expedition-pace")).toHaveTextContent("10:00 /km");
  });

  test("the same walk reads in miles when the hero asked for miles", async () => {
    useSettingsStore.setState({ distanceUnit: "imperial" });
    useExpeditionStore.setState({ track: { ...EMPTY, distanceM: 3218.688, movingMs: 1_500_000 } });

    await mountVictory();

    expect(screen.getByTestId("victory-expedition-distance")).toHaveTextContent("2.00 mi");
    expect(screen.getByTestId("victory-expedition-pace")).toHaveTextContent("12:30 /mi");
  });

  test("the road line names the building, the leagues covered and the next floor", async () => {
    await mountVictory();

    expect(screen.getByTestId("victory-expedition-road")).toHaveTextContent(
      "High Road · 12/15 leagues",
    );
  });

  // `nextTarget` is null once the road is maxed, and "40/null leagues" is exactly the shape a
  // template with a hole in it prints.
  test("a maxed road drops the fraction instead of printing null", async () => {
    mockGetVillageBuildings.mockResolvedValue([
      road({ level: 5, metricValue: 40, nextTarget: null }),
    ]);

    await mountVictory();

    const line = screen.getByTestId("victory-expedition-road");
    expect(line).toHaveTextContent("High Road · 40 leagues covered beyond the walls");
    expect(line).not.toHaveTextContent("null");
  });

  // The map has to be handed the session its points were filed under: `gps_points.sessionId` is
  // the uuid, not the row id, and a recap opened on the wrong one draws someone else's walk.
  test("the door to the map carries the session the points were filed under", async () => {
    await mountVictory();

    await fireEvent.press(screen.getByTestId("victory-expedition-recap"));

    expect(mockPush).toHaveBeenCalledWith("/recap?session=0192-walk");
  });

  /**
   * The screen must show the duration the journal is about to keep. `sessionClock` clamps a walk
   * to its moving time plus twenty minutes of red lights, so twelve minutes of walking with forty
   * minutes of stops is 32 min in the journal — and this screen said 52, one tap earlier.
   */
  test("reports the duration that gets recorded, not the wall clock", async () => {
    // `startedAt` is what makes this a witnessed run: without it the reducer has no opinion and
    // the clock decides, which is the workout path and a different rule.
    useExpeditionStore.setState({
      track: { ...EMPTY, startedAt: 1, distanceM: 1500, movingMs: 720_000 },
    });

    await mountVictory({ sessionSeconds: 52 * 60 });

    expect(screen.getByTestId("victory-stat-row")).toHaveTextContent(/32:00/);
    expect(screen.queryByText("52:00")).toBeNull();
  });

  test("a quest that never left the walls says nothing about ground or pace", async () => {
    await mountVictory({ quest: strengthQuest });

    expect(screen.queryByTestId("victory-expedition")).toBeNull();
    expect(mockGetVillageBuildings).not.toHaveBeenCalled();
  });

  // The villager cameo draws over the bottom of this screen (VillagerCameo.tsx). Anything below
  // the stat tiles used to land in its band; the summary has to render first so it clears it.
  test("renders above the stat tiles, so the cameo does not land on top of it", async () => {
    await mountVictory();

    const tree = JSON.stringify(screen.toJSON());
    const summaryIndex = tree.indexOf('"victory-expedition"');
    const statRowIndex = tree.indexOf('"victory-stat-row"');

    expect(summaryIndex).toBeGreaterThan(-1);
    expect(statRowIndex).toBeGreaterThan(-1);
    expect(summaryIndex).toBeLessThan(statRowIndex);
  });
});

/**
 * The too-short prompt used to say "You were out for 95 seconds" to every quest — expedition
 * copy, a raw second count, and a gendered French verb the rest of the app avoids.
 */
describe("VictoryView, the session too short to be one", () => {
  beforeEach(() => {
    mockGetVillageBuildings.mockReset();
    mockGetVillageBuildings.mockResolvedValue([road({})]);
    useSettingsStore.setState({ language: "en", distanceUnit: "metric" });
  });

  test("tells the hero how long they trained, not how many seconds elapsed", async () => {
    await mountVictory({ quest: strengthQuest, sessionSeconds: 115 });

    expect(screen.getByText(/You trained for 1 min 55s\./)).toBeTruthy();
    expect(screen.queryByText(/115 seconds/)).toBeNull();
  });
});
