import { act, render } from "@testing-library/react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { TamaguiProvider } from "tamagui";

import { RestView } from "@/components/session/RestView";
import type { Quest } from "@/db/quests";
import { playCue } from "@/src/sounds";
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
// `t` included because RestView cues a villager on mount and the chorus resolves its pools
// through i18next. A mock that describes less than the real module is how the last two
// suites went down — see the header of __tests__/store-settings.test.ts.
jest.mock("@/i18n", () => ({
  i18n: { changeLanguage: jest.fn(), t: (key: string) => key },
}));
jest.mock("@/src/i18n/deviceLanguage", () => ({ getDevicePreferredAppLanguage: () => "en" }));
jest.mock("@/src/sounds", () => ({ playCue: jest.fn(), warm: jest.fn() }));

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

  /**
   * The wiring, not the counting. `useCountdownCues` is proven on its own in
   * __tests__/countdown-cues.test.ts and the setting is proven in __tests__/store-settings.test.ts;
   * nothing proved this screen actually calls the hook. Delete the one line in RestView and every
   * other test here still passes — which is exactly how the 1.8.1 Sound Effects switch stayed
   * wired to a map of nulls for seven months.
   */
  it("counts its last three seconds out loud, then announces the zero", async () => {
    const mockedPlayCue = playCue as jest.MockedFunction<typeof playCue>;
    mockedPlayCue.mockClear();

    await mountRest();

    // One second per act(), not one 31-second jump: React batches the state updates inside a
    // single act, so a jump renders once with the final value and the screen would only ever
    // announce the zero. The hook is right either way — it fires "go" alone on a skip, which is
    // what an app returning from the background does — but the ticks are only observable when
    // the render happens per second, which is what really happens on a phone.
    for (let second = 0; second <= REST_SECONDS; second++) {
      await act(() => {
        jest.advanceTimersByTime(1000);
      });
    }

    expect(mockedPlayCue.mock.calls.map(([cue]) => cue)).toEqual(["tick", "tick", "tick", "go"]);
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
