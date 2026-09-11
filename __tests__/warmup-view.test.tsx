import { act, fireEvent, render } from "@testing-library/react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { TamaguiProvider } from "tamagui";

import { WarmupView } from "@/components/session/WarmupView";
import { PREP_SECONDS, WARMUP_SEQUENCE } from "@/constants/warmup";
import { listExercises } from "@/db/exercises";
import { playCue } from "@/src/sounds";
import { useSessionStore } from "@/stores/session";
import config from "@/tamagui.config";

/**
 * Regression: the warm-up advances itself when its timer runs out, and `useSessionTimer`
 * used to report `remainingSeconds: 0` on the first render. The effect read that zero as
 * "this step is over" and fired `nextWarmupStep()` on mount, so every session started on the
 * second movement and the first one was never shown.
 */

jest.mock("@/db/client", () => ({ db: {}, schema: {}, runMigrations: jest.fn() }));
jest.mock("@/db/quests", () => ({ isDailyQuest: () => false }));
jest.mock("@/db/exercises", () => ({
  listExercises: jest.fn().mockResolvedValue([]),
  // Mirrors the real one: seed rows only. The view must not resolve a warm-up step to a
  // same-named movement the hero wrote.
  officialByName: (catalogue: { enName: string; creator: string }[], enName: string) =>
    catalogue.find((e) => e.enName === enName && e.creator === "Admin"),
}));
jest.mock("@/db/preferences", () => ({
  preferences: {
    getSavedSession: jest.fn().mockResolvedValue(null),
    setSavedSession: jest.fn().mockResolvedValue(undefined),
    clearSavedSession: jest.fn().mockResolvedValue(undefined),
    getWarmupEnabled: jest.fn().mockResolvedValue(true),
  },
}));
jest.mock("@/db", () => ({ preferences: {} }));
jest.mock("@/i18n", () => ({ i18n: { changeLanguage: jest.fn() } }));
jest.mock("@/src/i18n/deviceLanguage", () => ({ getDevicePreferredAppLanguage: () => "en" }));
jest.mock("@/src/sounds", () => ({ playCue: jest.fn(), warm: jest.fn() }));

async function mountWarmup() {
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
          <WarmupView />
        </TamaguiProvider>
      </SafeAreaProvider>,
    );
  });
  return result;
}

/** One second per act(): a jump renders once with the final value, and the seconds between are lost. */
async function tickSeconds(seconds: number) {
  for (let second = 0; second < seconds; second++) {
    await act(() => {
      jest.advanceTimersByTime(1000);
    });
  }
}

const cues = () => (playCue as jest.MockedFunction<typeof playCue>).mock.calls.map(([cue]) => cue);

describe("WarmupView", () => {
  beforeEach(() => {
    jest.useFakeTimers();
    (playCue as jest.Mock).mockClear();
    // Mid-movement by default: most of what is pinned here is the movement's own clock. The
    // cases about the wait before it set it up themselves.
    useSessionStore.setState({
      status: "warmup",
      // The sequence lives in state now (built per quest by `buildWarmup`), so a test that
      // drives the store directly has to seed it — the view renders nothing without one.
      warmupSequence: WARMUP_SEQUENCE,
      warmupIndex: 0,
      warmupPrep: false,
      timerStartTimestamp: Date.now(),
      timerDuration: WARMUP_SEQUENCE[0].seconds,
    });
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it("stays on the first movement when it mounts", async () => {
    await mountWarmup();

    expect(useSessionStore.getState().warmupIndex).toBe(0);
    expect(useSessionStore.getState().warmupPrep).toBe(false);
  });

  // Zero seconds between two movements is what four players described: the next one's clock
  // started the instant the last one ended, before anyone had read what it was.
  it("a movement that runs out opens the wait before the next one, not its clock", async () => {
    await mountWarmup();

    await act(() => {
      jest.advanceTimersByTime(WARMUP_SEQUENCE[0].seconds * 1000 + 200);
    });

    expect(useSessionStore.getState().warmupIndex).toBe(1);
    expect(useSessionStore.getState().warmupPrep).toBe(true);
    expect(useSessionStore.getState().timerDuration).toBe(PREP_SECONDS);
  });

  /**
   * The trap in the auto-advance: on the render where a movement becomes a wait, the timer still
   * reads the movement's zero. An effect that re-ran on that render took the zero for the end of
   * the wait and started the movement before the wait was ever shown. Walked through the whole
   * wait and five seconds into the movement, because "the wait was skipped" and "the movement was
   * skipped" are both claims about what happens after the transition.
   */
  it("the wait ends on its own and the movement then runs its whole clock", async () => {
    useSessionStore.setState({
      warmupPrep: true,
      timerStartTimestamp: Date.now(),
      timerDuration: PREP_SECONDS,
    });
    await mountWarmup();

    await tickSeconds(PREP_SECONDS);
    expect(useSessionStore.getState().warmupIndex).toBe(0);
    expect(useSessionStore.getState().warmupPrep).toBe(false);
    expect(useSessionStore.getState().timerDuration).toBe(WARMUP_SEQUENCE[0].seconds);

    await tickSeconds(5);
    expect(useSessionStore.getState().warmupIndex).toBe(0);
    expect(useSessionStore.getState().warmupPrep).toBe(false);
  });

  it("a wait for GO waits, and GO starts the movement", async () => {
    // No clock is what "wait for GO" is (prepTimer in stores/session.ts).
    useSessionStore.setState({ warmupPrep: true, timerStartTimestamp: null, timerDuration: 0 });
    const { getByTestId } = await mountWarmup();

    await tickSeconds(60);
    expect(useSessionStore.getState().warmupIndex).toBe(0);
    expect(useSessionStore.getState().warmupPrep).toBe(true);
    expect(cues()).toEqual([]);

    await fireEvent.press(getByTestId("session-prep-go"));

    expect(useSessionStore.getState().warmupPrep).toBe(false);
    expect(useSessionStore.getState().timerDuration).toBe(WARMUP_SEQUENCE[0].seconds);
  });

  /**
   * The report: no beep on any warm-up movement, only on the last one. This screen was the one
   * timed view that never called `useCountdownCues`. The wait counts down the same way, so the
   * sounds of a warm-up are the sounds of the rest of a session: 3-2-1, then go, at every end.
   */
  it("counts down the end of every movement and every wait, the same way", async () => {
    await mountWarmup();

    await tickSeconds(WARMUP_SEQUENCE[0].seconds);
    expect(cues()).toEqual(["tick", "tick", "tick", "go"]);
    expect(useSessionStore.getState().warmupIndex).toBe(1);
    expect(useSessionStore.getState().warmupPrep).toBe(true);

    (playCue as jest.Mock).mockClear();
    await tickSeconds(PREP_SECONDS);

    expect(cues()).toEqual(["tick", "tick", "tick", "go"]);
    expect(useSessionStore.getState().warmupPrep).toBe(false);
  });

  // "Slide one arm under the other", and nothing about the other arm: thirty seconds of one side.
  it("tells a one-sided movement when to switch sides", async () => {
    useSessionStore.setState({
      warmupSequence: [{ exerciseName: "Thread the Needle", seconds: 30 }, ...WARMUP_SEQUENCE],
      timerDuration: 30,
    });
    const { getByTestId } = await mountWarmup();

    // i18n is not initialised in tests, so `t()` echoes the key.
    expect(getByTestId("warmup-sides").props.children).toBe("session.each_side");

    await tickSeconds(15);

    expect(getByTestId("warmup-sides").props.children).toBe("session.switch_sides");
  });

  it("shows the movement's description on the wait, before its clock runs", async () => {
    useSessionStore.setState({
      warmupPrep: true,
      timerStartTimestamp: Date.now(),
      timerDuration: PREP_SECONDS,
    });
    (listExercises as jest.Mock).mockResolvedValueOnce([
      {
        enName: WARMUP_SEQUENCE[0].exerciseName,
        frName: "Jumping Jack",
        enDescription: "Jump while spreading your legs and raising your arms overhead.",
        frDescription: "Sautez en écartant les jambes et en levant les bras.",
        imagePath: "unknown",
        creator: "Admin",
      },
    ]);

    const { getByText } = await mountWarmup();

    expect(
      getByText("Jump while spreading your legs and raising your arms overhead."),
    ).toBeTruthy();
  });

  it("shows the whole description, not a truncated head", async () => {
    // A user wrote in about exactly this: they did not know the movement, and the three lines
    // this screen allowed cut the instructions off mid-sentence while the clock ran.
    const howTo =
      "Stand tall with your feet together and your arms at your sides, then jump your feet " +
      "wide while sweeping your arms overhead, and jump back. Keep the landing soft and the " +
      "rhythm even, because this step is here to raise your temperature rather than tire you.";

    (listExercises as jest.Mock).mockResolvedValueOnce([
      {
        enName: WARMUP_SEQUENCE[0].exerciseName,
        frName: "Jumping Jack",
        enDescription: howTo,
        frDescription: howTo,
        imagePath: "unknown",
        creator: "Admin",
      },
    ]);

    const { getByText } = await mountWarmup();

    expect(getByText(howTo).props.numberOfLines).toBeUndefined();
  });
});
