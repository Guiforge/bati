import { act, render } from "@testing-library/react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { TamaguiProvider } from "tamagui";

import { RestView } from "@/components/session/RestView";
import type { Quest } from "@/db/quests";
import { useSessionStore } from "@/stores/session";
import config from "@/tamagui.config";

/**
 * Regression: rest ended and the session stopped. `useSessionTimer` clamps `resting` at zero, so
 * the screen parked on 0:00 forever — nothing consumed that zero, and `skipRest()` only ever ran
 * from the button. The next exercise never started unless the hero tapped "skip rest".
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
jest.mock("@/i18n", () => ({ i18n: { changeLanguage: jest.fn() } }));
jest.mock("@/src/i18n/deviceLanguage", () => ({ getDevicePreferredAppLanguage: () => "en" }));

const REST_SECONDS = 30;

const mockQuest = {
  id: 1,
  rounds: 2,
  restSeconds: REST_SECONDS,
  exercises: [
    {
      exercise: {
        id: 1,
        enName: "Pushups",
        frName: "Pompes",
        muscles: [],
        imagePath: "assets/placeholder.jpg",
      },
      target: { type: "reps", value: 10 },
    },
    {
      exercise: {
        id: 2,
        enName: "Plank",
        frName: "Planche",
        muscles: [],
        imagePath: "assets/placeholder.jpg",
      },
      target: { type: "reps", value: 12 },
    },
  ],
} as unknown as Quest;

async function mountRest() {
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
          <RestView />
        </TamaguiProvider>
      </SafeAreaProvider>,
    );
  });
  return result;
}

describe("RestView", () => {
  beforeEach(() => {
    jest.useFakeTimers();
    useSessionStore.setState({
      quest: mockQuest,
      status: "resting",
      // Resting already points at the UPCOMING exercise — completeExercise moved the index
      // before handing over to this screen.
      currentRoundIndex: 0,
      currentExerciseIndex: 1,
      results: [],
      timerStartTimestamp: Date.now(),
      timerDuration: REST_SECONDS,
      lastPauseTimestamp: null,
      prePauseStatus: null,
      bossFight: null,
      lastDamageResult: null,
    });
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it("names the rest after the round when a round just ended", async () => {
    // Mid-round: the index points at the second exercise of round 0.
    const midRound = await mountRest();
    expect(midRound.queryByText(/round_rest_title/)).toBeNull();

    // Round boundary: back to exercise 0, one round further in.
    await act(() => {
      useSessionStore.setState({ currentRoundIndex: 1, currentExerciseIndex: 0 });
    });
    expect(midRound.queryByText(/round_rest_title/)).not.toBeNull();
  });

  it("stays resting while the timer still has time on it", async () => {
    await mountRest();

    await act(() => {
      jest.advanceTimersByTime((REST_SECONDS - 5) * 1000);
    });

    expect(useSessionStore.getState().status).toBe("resting");
  });

  it("starts the next exercise on its own when the rest timer reaches zero", async () => {
    await mountRest();

    await act(() => {
      jest.advanceTimersByTime((REST_SECONDS + 1) * 1000);
    });

    const state = useSessionStore.getState();
    expect(state.status).toBe("running");
    // The index was already advanced before rest began — auto-advancing must not skip an
    // exercise on top of it.
    expect(state.currentExerciseIndex).toBe(1);
  });
});
