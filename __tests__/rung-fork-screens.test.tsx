import { act, render, screen } from "@testing-library/react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { TamaguiProvider } from "tamagui";
import { QuestLog, type QuestLogData } from "@/components/journal/QuestLog";
import { SessionRewards } from "@/components/session/SessionRewards";
import type { VariationStep } from "@/db/exercises";
import "@/i18n";
import config from "@/tamagui.config";

/**
 * A rung is allowed to fork, and three screens answer "what comes after this movement". The
 * exercise page learned to say so (`alsoNext`, c0aa998a); the quest log and the victory screen
 * kept naming whichever successor the table returned first, so a hero who mastered Push-ups was
 * told about Dip and never heard of Pike Push-Up or Diamond Push-Up.
 *
 * Asserts the sentence on both screens, because `alsoNext` being carried is not the same claim
 * as it being read.
 */

jest.mock("@/db/client", () => ({ db: {}, schema: {}, runMigrations: jest.fn() }));
jest.mock("expo-router", () => ({ useRouter: () => ({ push: jest.fn(), back: jest.fn() }) }));
jest.mock("expo-localization", () => ({
  getLocales: () => [{ languageCode: "en", languageTag: "en-US" }],
}));

const mockSettingsStore = { language: "en", distanceUnit: "metric" };
jest.mock("@/stores/settings", () => ({
  useSettingsStore: (selector: (s: typeof mockSettingsStore) => unknown) =>
    selector(mockSettingsStore),
}));

const movement = (id: number, enName: string) => ({
  id,
  enName,
  frName: enName,
  deName: enName,
  esName: enName,
  imagePath: "exercises/push-ups.webp",
});

/** Push-ups, the widest fork in the catalogue: Dip illustrated, two more beside it. */
function forkedRung(isEarned: boolean): VariationStep {
  return {
    from: movement(10, "Push-ups"),
    next: movement(20, "Dip"),
    alsoNext: [movement(30, "Pike Push-Up"), movement(40, "Diamond Push-Up")],
    metTarget: isEarned ? 3 : 1,
    required: 3,
    isEarned,
  };
}

function straightRung(): VariationStep {
  return {
    from: movement(10, "Wall Push-Up"),
    next: movement(20, "Knee Push-Up"),
    alsoNext: [],
    metTarget: 3,
    required: 3,
    isEarned: true,
  };
}

const FORK_LINE = "The same rung also leads to Pike Push-Up, Diamond Push-Up.";

async function mount(ui: React.ReactElement) {
  await act(async () => {
    await render(
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
}

function questLogData(rung: VariationStep | null): QuestLogData {
  return {
    session: {
      id: 1,
      uuid: null,
      questId: null,
      userLevel: "novice",
      durationSeconds: 600,
      xpEarned: 100,
      notes: "",
      feedback: null,
      performedAt: new Date("2026-09-15T18:00:00Z"),
      leaguesM: null,
      movingSeconds: null,
      ascentM: null,
      outing: null,
      exercises: [],
    },
    questTitle: "The Squire's Awakening",
    questImage: null,
    trace: [],
    standing: null,
    records: [],
    shift: null,
    rung,
    latest: true,
    level: {
      level: 3,
      totalXp: 300,
      currentLevelXp: 50,
      xpToNextLevel: 100,
      xpProgress: 33,
      title: { en: "Squire", fr: "Écuyer", de: "Knappe", es: "Escudero" },
    },
  } as unknown as QuestLogData;
}

function rewardsResult(newRungs: VariationStep[]) {
  return {
    sessionId: 1,
    xpEarned: 10,
    dailyBonusXp: 0,
    newRecords: [],
    standing: null,
    newRungs,
    newAchievements: [],
    fulfilledOath: null,
    oathBonusXp: 0,
    overshootXp: 0,
    outing: null,
    campaign: null,
    levelUp: null,
    tierUp: false,
    villageGrowth: [],
    heroXp: { before: 0, after: 10 },
  } as unknown as React.ComponentProps<typeof SessionRewards>["result"];
}

describe("the quest log on a rung that forks", () => {
  it("names the branches it does not illustrate", async () => {
    await mount(<QuestLog data={questLogData(forkedRung(true))} />);

    expect(screen.getByText("Push-ups is mastered: Dip is yours to try")).toBeTruthy();
    expect(screen.getByText(FORK_LINE)).toBeTruthy();
  });

  it("says nothing extra on a rung that leads to one movement", async () => {
    await mount(<QuestLog data={questLogData(straightRung())} />);

    expect(screen.queryByText(/also leads to/i)).toBeNull();
  });

  it("stays silent below the bar, where no movement is named yet", async () => {
    await mount(<QuestLog data={questLogData(forkedRung(false))} />);

    expect(screen.queryByText(/also leads to/i)).toBeNull();
  });
});

describe("the victory screen on a rung that forks", () => {
  it("announces one rung and names every movement it opens", async () => {
    await mount(
      <SessionRewards
        result={rewardsResult([forkedRung(true)])}
        language="en"
        onViewVillage={jest.fn()}
      />,
    );

    // One rung crossed, not three: the fork is what it opens, not three separate unlocks.
    expect(screen.getByText("New rung unlocked")).toBeTruthy();
    expect(screen.getByText("Dip")).toBeTruthy();
    expect(screen.getByText("You have mastered Push-ups")).toBeTruthy();
    expect(screen.getByText(FORK_LINE)).toBeTruthy();
  });

  it("says nothing extra on a rung that leads to one movement", async () => {
    await mount(
      <SessionRewards
        result={rewardsResult([straightRung()])}
        language="en"
        onViewVillage={jest.fn()}
      />,
    );

    expect(screen.getByText("Knee Push-Up")).toBeTruthy();
    expect(screen.queryByText(/also leads to/i)).toBeNull();
  });
});
