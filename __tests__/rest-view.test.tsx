import { act, fireEvent, render, within } from "@testing-library/react-native";
import { StyleSheet } from "react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { TamaguiProvider } from "tamagui";

import { RestView } from "@/components/session/RestView";
import type { Quest } from "@/db/quests";
import { playCue } from "@/src/sounds";
import { useChorusStore } from "@/stores/chorus";
import { FINAL_REST_SECONDS, useSessionStore } from "@/stores/session";
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
jest.mock("expo-router", () => ({ useIsFocused: () => true }));
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

  // A villager moved +10s/+30s up and the set stepper down about 50 dp: the column was centred and
  // the line sat in the middle of it. The controls must not depend on whether anyone came.
  it("keeps everything the hero aims at where it is, villager or not", async () => {
    const view = await mountRest();
    const bare = JSON.stringify(view.toJSON());
    expect(bare).not.toContain("villager-line-block");

    await act(() => {
      useChorusStore.setState({
        current: {
          id: 1,
          owner: "rest",
          moment: "rest",
          villager: "farmer",
          pose: "talk",
          line: "A line in the rest.",
        },
      });
    });
    const withVillager = JSON.stringify(view.toJSON());

    expect(withVillager).toContain("villager-line-block");
    // Same place for the controls, and the line comes after the last of them.
    expect(withVillager.indexOf('"rest-up-next"')).toBe(bare.indexOf('"rest-up-next"'));
    expect(withVillager.indexOf("+10s")).toBe(bare.indexOf("+10s"));
    expect(withVillager.indexOf("villager-line-block")).toBeGreaterThan(
      withVillager.indexOf('"rest-up-next"'),
    );
    // Top-anchored: a centred column re-centres around whatever is added to it.
    const scroll = view.getByTestId("rest-scroll");
    expect(JSON.stringify(scroll.props.contentContainerStyle)).toContain('"flex-start"');
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

  it("logs a count typed over the last set", async () => {
    // The set the hero just finished, logged at its target of 10. They did 40.
    useSessionStore.setState({
      results: [
        {
          exerciseId: 1,
          result: { type: "reps", value: 10 },
          target: { type: "reps", value: 10 },
        },
      ] as never,
    });
    const view = await mountRest();

    const count = view.getByTestId("rest-result-input");
    await act(() => fireEvent(count, "focus"));
    await act(() => fireEvent.changeText(count, "40"));

    expect(useSessionStore.getState().results[0]?.result.value).toBe(40);
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

  // The rest behind the last set: the count is still correctable, nothing is up next, there is
  // no clock to wait out (it was a dead 28 s countdown, audit 2026-10-03), and the way out is the
  // summary.
  describe("after the last set", () => {
    const finalRest = (value = 12, target = 12) =>
      useSessionStore.setState({
        currentRoundIndex: 1,
        currentExerciseIndex: mockQuest.exercises.length,
        timerDuration: FINAL_REST_SECONDS,
        results: [
          {
            exerciseId: 2,
            result: { type: "reps", value },
            target: { type: "reps", value: target },
          },
        ] as never,
      });

    it("offers the correction and the summary, with no countdown", async () => {
      const mockedPlayCue = playCue as jest.MockedFunction<typeof playCue>;
      mockedPlayCue.mockClear();
      finalRest();
      const view = await mountRest();

      expect(view.getByText("session.final_rest_title")).toBeTruthy();
      expect(view.getByTestId("rest-result-input")).toBeTruthy();
      expect(view.getByTestId("session-skip-rest")).toBeTruthy();
      expect(view.queryByTestId("rest-up-next")).toBeNull();
      expect(view.queryByText(/^\d+:\d{2}$/)).toBeNull();
      expect(view.queryByText("+10s")).toBeNull();

      await act(() => {
        jest.advanceTimersByTime((REST_SECONDS + 5) * 1000);
      });

      // A quest's rest is not its clock: the hero corrects, then opens the summary.
      expect(useSessionStore.getState().status).toBe("resting");
      expect(mockedPlayCue).not.toHaveBeenCalled();

      await act(() => fireEvent.press(view.getByTestId("session-skip-rest")));
      expect(useSessionStore.getState().status).toBe("finished");
    });

    // A hero who walked away still reaches the summary, which is what saves the session.
    it("ends on its own after the long, unshown grace", async () => {
      (playCue as jest.MockedFunction<typeof playCue>).mockClear();
      finalRest();
      await mountRest();

      await act(() => {
        jest.advanceTimersByTime((FINAL_REST_SECONDS + 1) * 1000);
      });

      expect(useSessionStore.getState().status).toBe("finished");
      expect(playCue).not.toHaveBeenCalled();
    });

    it("still settles an unanswered runaway hold when the summary is opened", async () => {
      useSessionStore.setState({
        currentRoundIndex: 1,
        currentExerciseIndex: mockQuest.exercises.length,
        results: [
          {
            exerciseId: 2,
            roundIndex: 1,
            result: { type: "time", value: 362 },
            target: { type: "time", value: 35 },
          },
        ] as never,
      });
      const view = await mountRest();
      expect(view.queryByTestId("rest-hold-check")).not.toBeNull();

      await act(() => fireEvent.press(view.getByTestId("session-skip-rest")));

      expect(useSessionStore.getState().status).toBe("finished");
      expect(useSessionStore.getState().results[0]?.result.value).toBe(35);
    });
  });

  // Right above "Up next: <another movement>", an unnamed "did you do more or less?" read as a
  // question about the next one.
  it("names the movement just finished on the adjust row, not the next one", async () => {
    useSessionStore.setState({
      results: [
        { exerciseId: 1, result: { type: "reps", value: 10 }, target: { type: "reps", value: 10 } },
      ] as never,
    });
    const view = await mountRest();

    const label = view.getByTestId("rest-adjust-label");
    expect(within(label).getByText("Pushups")).toBeTruthy();
    expect(within(label).queryByText("Plank")).toBeNull();
    // The up-next card still names the next one.
    expect(within(view.getByTestId("rest-up-next")).getByText("Plank")).toBeTruthy();
  });

  describe("a hold that ran far past its target", () => {
    const hold = (value: number) =>
      useSessionStore.setState({
        results: [
          {
            exerciseId: 2,
            roundIndex: 0,
            result: { type: "time", value },
            target: { type: "time", value: 35 },
          },
        ] as never,
      });

    it("asks only when the hold is suspicious", async () => {
      hold(40);
      const view = await mountRest();
      expect(view.queryByTestId("rest-hold-check")).toBeNull();

      await act(() => hold(362));
      expect(view.queryByTestId("rest-hold-check")).not.toBeNull();
    });

    it("logs the target on one answer and keeps the held time on the other", async () => {
      hold(362);
      const view = await mountRest();

      await act(() => fireEvent.press(view.getByTestId("rest-hold-target")));
      expect(useSessionStore.getState().results[0]?.result.value).toBe(35);
      expect(view.queryByTestId("rest-hold-check")).toBeNull();

      await act(() => hold(362));
      await act(() => fireEvent.press(view.getByTestId("rest-hold-keep")));
      expect(useSessionStore.getState().results[0]?.result.value).toBe(362);
      expect(view.queryByTestId("rest-hold-check")).toBeNull();
    });
  });

  // At Android font scale 1.3 the label column grew until it pushed the stepper's "+" off the
  // card: it had no flex, so it never gave way. The label shrinks and wraps, the controls do not.
  it("lets the adjust label shrink and keeps the stepper whole", async () => {
    useSessionStore.setState({
      results: [
        { exerciseId: 1, result: { type: "reps", value: 10 }, target: { type: "reps", value: 10 } },
      ] as never,
    });
    const view = await mountRest();

    const label = StyleSheet.flatten(view.getByTestId("rest-adjust-label").props.style);
    const controls = StyleSheet.flatten(view.getByTestId("rest-adjust-controls").props.style);
    expect(label.flexShrink).toBe(1);
    expect(controls.flexShrink).toBe(0);
  });
});
