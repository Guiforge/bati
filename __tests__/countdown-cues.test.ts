import { act, renderHook } from "@testing-library/react-native";

import { useCountdownCues } from "@/hooks/useCountdownCues";
import { playCue, warm } from "@/src/sounds";
import { useSettingsStore } from "@/stores/settings";

/**
 * The beeps must fire exactly three times on the way down and once on zero — no more.
 *
 * The three cases this exists for are all "it fires when it should not": a timed exercise that
 * runs into overtime, a rep-based exercise whose timer never starts, and a re-render at the same
 * second. Each of them looked like it needed a guard parameter and does not, which is only true
 * as long as this file says so.
 */

jest.mock("@/src/sounds", () => ({
  playCue: jest.fn(),
  warm: jest.fn(),
}));

jest.mock("@/stores/settings", () => ({
  useSettingsStore: jest.fn(),
}));

const mockedPlayCue = playCue as jest.MockedFunction<typeof playCue>;
const mockedWarm = warm as jest.MockedFunction<typeof warm>;
const mockedStore = useSettingsStore as unknown as jest.Mock;

function withSound(enabled: boolean) {
  mockedStore.mockImplementation((selector: (s: { soundEnabled: boolean }) => unknown) =>
    selector({ soundEnabled: enabled }),
  );
}

/**
 * Play a countdown through the hook and collect the cues, in order.
 *
 * Mounts one second above the sequence so every entry in it is a *new* second. Mounting straight
 * onto a value is silent by design — a screen appearing mid-countdown should not announce the
 * second that was already running — and `from` is there for the tests that check exactly that.
 */
async function countDown(
  seconds: number[],
  { from = (seconds[0] ?? 0) + 1 } = {},
): Promise<string[]> {
  const { rerender } = await renderHook((s: number) => useCountdownCues(s), {
    initialProps: from,
  });
  for (const second of seconds) {
    await act(async () => {
      await rerender(second);
    });
  }
  return mockedPlayCue.mock.calls.map(([cue]) => cue);
}

beforeEach(() => {
  jest.clearAllMocks();
  withSound(true);
});

describe("useCountdownCues", () => {
  test("beeps the last three seconds and once on zero", async () => {
    expect(await countDown([5, 4, 3, 2, 1, 0])).toEqual(["tick", "tick", "tick", "go"]);
  });

  // A timed exercise is not stopped by its own timer: the hero decides when the hold is over,
  // and `remainingSeconds` keeps falling. Zero is announced once and then the set is silent.
  test("goes quiet in overtime instead of beeping every second", async () => {
    expect(await countDown([2, 1, 0, -1, -2, -3, -4])).toEqual(["tick", "tick", "go"]);
  });

  // useSessionTimer ticks at 10 Hz. Only one in ten of those renders is a new second.
  test("a re-render at the same second says nothing", async () => {
    expect(await countDown([3, 3, 3, 2, 2, 1, 1, 0, 0])).toEqual(["tick", "tick", "tick", "go"]);
  });

  // A rep-based exercise has no timer, so useSessionTimer parks remainingSeconds at 0 forever.
  // Mounting on that zero must not sound like a set just ended.
  test("a rep-based exercise, parked at zero, never fires", async () => {
    expect(await countDown([0, 0], { from: 0 })).toEqual([]);
  });

  // Pause freezes the count and resume shifts the start timestamp, so a second can repeat but
  // never come back up. Adding rest time is the one crossing that *should* beep twice.
  test("added rest time counts down again", async () => {
    expect(await countDown([3, 2, 33, 3, 2, 1, 0])).toEqual([
      "tick",
      "tick",
      "tick",
      "tick",
      "tick",
      "go",
    ]);
  });

  test("says nothing at all when the hero turned sound off", async () => {
    withSound(false);
    expect(await countDown([3, 2, 1, 0])).toEqual([]);
    expect(mockedWarm).not.toHaveBeenCalled();
  });

  // Building the players at the first tick loses that tick: the file is still loading when
  // play() is called. Warming on mount is the whole reason the first "3" is audible.
  test("warms the players on mount, before anything needs to be heard", async () => {
    await renderHook(() => useCountdownCues(30));
    expect(mockedWarm).toHaveBeenCalled();
  });

  // Turning sound on mid-rest re-runs the effect. The hero should hear the next second, not the
  // one they were already on replayed at them.
  test("turning sound on mid-countdown does not replay the current second", async () => {
    const { rerender } = await renderHook((s: number) => useCountdownCues(s), {
      initialProps: 5,
    });
    await act(async () => {
      await rerender(3);
    });
    await act(async () => {
      await rerender(2);
    });
    withSound(false);
    await act(async () => {
      await rerender(2);
    });
    withSound(true);
    await act(async () => {
      await rerender(2);
    });
    expect(mockedPlayCue.mock.calls.map(([cue]) => cue)).toEqual(["tick", "tick"]);
  });
});
