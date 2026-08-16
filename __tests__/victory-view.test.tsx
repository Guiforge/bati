import { act, fireEvent, render } from "@testing-library/react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { TamaguiProvider } from "tamagui";

import { VictoryView } from "@/components/session/VictoryView";
import type { Quest } from "@/db/quests";
import { useSessionStore } from "@/stores/session";
import config from "@/tamagui.config";

/**
 * BUG-010. The session is saved on mount, and the "how did that feel" buttons render straight
 * away — so a hero who taps a feeling before the save resolves has no session id to write it
 * against. The old code wrote from the tap handler under `if (result)`, which silently dropped
 * exactly those taps: the button lit up, the row kept `feedback: null`, and nothing said so.
 */

const mockUpdateSessionFeedback = jest.fn().mockResolvedValue(undefined);

jest.mock("@/db/client", () => ({ db: {}, schema: {}, runMigrations: jest.fn() }));
jest.mock("@/db/completed", () => ({
  updateSessionFeedback: (...args: unknown[]) => mockUpdateSessionFeedback(...args),
}));
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
jest.mock("@/db", () => ({ preferences: {} }));
jest.mock("@/i18n", () => ({ __esModule: true, default: { changeLanguage: jest.fn() } }));
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

const SESSION_ID = 42;

const saveResult = {
  sessionId: SESSION_ID,
  xpEarned: 100,
  levelUp: false,
  dailyBonusApplied: false,
  heroXp: { before: 50, after: 150 },
  villageGrowth: [],
  campaign: null,
  fulfilledOath: null,
  tierUp: false,
};

const mockQuest = {
  id: 1,
  rounds: 1,
  restSeconds: 0,
  enTitle: "Quest",
  frTitle: "Quête",
  imagePath: "assets/placeholder.jpg",
  exercises: [],
} as unknown as Quest;

/** Mount with the save deliberately left in flight; call the returned fn to let it land. */
async function mountWithPendingSave() {
  let release!: () => void;
  const pending = new Promise((resolve) => {
    release = () => resolve(saveResult);
  });

  type SessionState = ReturnType<typeof useSessionStore.getState>;
  useSessionStore.setState({
    quest: mockQuest,
    status: "finished",
    startTime: Date.now() - 60_000,
    totalPausedTime: 0,
    adventureRunStepId: null,
    bossFight: null,
    results: [],
    // The point of the test is a save that has not resolved yet, so the real one is replaced
    // by a promise this test opens and closes by hand.
    saveSession: (() => pending) as unknown as SessionState["saveSession"],
  } as unknown as Partial<SessionState>);

  const view = await render(
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

  return { view, release: async () => await act(async () => release()) };
}

describe("VictoryView feedback", () => {
  beforeEach(() => {
    mockUpdateSessionFeedback.mockClear();
  });

  it("persists a feeling tapped while the save is still in flight", async () => {
    const { view, release } = await mountWithPendingSave();

    // The tap lands before there is any session id to write against.
    await fireEvent.press(view.getByLabelText("session.feedback_hard"));
    expect(mockUpdateSessionFeedback).not.toHaveBeenCalled();

    await release();

    expect(mockUpdateSessionFeedback).toHaveBeenCalledWith(SESSION_ID, "hard");
  });

  it("persists a feeling tapped after the save landed", async () => {
    const { view, release } = await mountWithPendingSave();
    await release();

    await fireEvent.press(view.getByLabelText("session.feedback_easy"));

    expect(mockUpdateSessionFeedback).toHaveBeenCalledWith(SESSION_ID, "easy");
  });

  it("writes nothing when the hero never picks a feeling", async () => {
    const { release } = await mountWithPendingSave();
    await release();

    expect(mockUpdateSessionFeedback).not.toHaveBeenCalled();
  });

  it("clears the feeling when the same button is tapped twice", async () => {
    const { view, release } = await mountWithPendingSave();
    await release();

    await fireEvent.press(view.getByLabelText("session.feedback_good"));
    await fireEvent.press(view.getByLabelText("session.feedback_good"));

    expect(mockUpdateSessionFeedback).toHaveBeenLastCalledWith(SESSION_ID, null);
  });
});
