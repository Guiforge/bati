import { act, fireEvent, render } from "@testing-library/react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { TamaguiProvider } from "tamagui";

import { CountdownView } from "@/components/session/CountdownView";
import type { Quest } from "@/db/quests";
import { useSessionStore } from "@/stores/session";
import config from "@/tamagui.config";

/**
 * "Skip warm-up" sits exactly where this screen's GO appears, so a double tap on Skip started the
 * first set before the hero had seen what it was (audit 2026-10-03).
 */

jest.mock("@/db/client", () => ({ db: {}, schema: {}, runMigrations: jest.fn() }));
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
jest.mock("@/i18n", () => ({ i18n: { changeLanguage: jest.fn(), t: (key: string) => key } }));
jest.mock("@/src/i18n/deviceLanguage", () => ({ getDevicePreferredAppLanguage: () => "en" }));
jest.mock("@/src/sounds", () => ({ playCue: jest.fn(), warm: jest.fn() }));

const quest = {
  id: 1,
  rounds: 1,
  restSeconds: 30,
  title: "Q",
  exercises: [
    {
      exercise: { id: 1, enName: "Pushups", frName: "Pompes", muscles: [], imagePath: "x" },
      target: { type: "reps", value: 10 },
    },
  ],
} as unknown as Quest;

async function mount() {
  let view!: ReturnType<typeof render>;
  await act(() => {
    view = render(
      <SafeAreaProvider
        initialMetrics={{
          frame: { x: 0, y: 0, width: 390, height: 844 },
          insets: { top: 0, left: 0, right: 0, bottom: 0 },
        }}
      >
        <TamaguiProvider config={config} defaultTheme="dark">
          <CountdownView />
        </TamaguiProvider>
      </SafeAreaProvider>,
    );
  });
  return view;
}

describe("CountdownView GO", () => {
  beforeEach(() => {
    jest.useFakeTimers();
    useSessionStore.setState({
      quest,
      status: "countdown",
      currentExerciseIndex: 0,
      currentRoundIndex: 0,
      bossFight: null,
      // Wait for GO: no clock.
      timerStartTimestamp: null,
      timerDuration: 0,
    });
  });
  afterEach(() => jest.useRealTimers());

  it("ignores a GO that lands right after the screen appears, honours a later one", async () => {
    const view = await mount();

    await act(() => fireEvent.press(view.getByTestId("session-start-go")));
    expect(useSessionStore.getState().status).toBe("countdown");

    await act(() => {
      jest.advanceTimersByTime(800);
    });
    await act(() => fireEvent.press(view.getByTestId("session-start-go")));
    expect(useSessionStore.getState().status).toBe("running");
  });
});
