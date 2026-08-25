import { act, render } from "@testing-library/react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { TamaguiProvider } from "tamagui";

import { WarmupView } from "@/components/session/WarmupView";
import { WARMUP_SEQUENCE } from "@/constants/warmup";
import { listExercises } from "@/db/exercises";
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
jest.mock("@/db/exercises", () => ({ listExercises: jest.fn().mockResolvedValue([]) }));
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

describe("WarmupView", () => {
  beforeEach(() => {
    jest.useFakeTimers();
    useSessionStore.setState({
      status: "warmup",
      // The sequence lives in state now (built per quest by `buildWarmup`), so a test that
      // drives the store directly has to seed it — the view renders nothing without one.
      warmupSequence: WARMUP_SEQUENCE,
      warmupIndex: 0,
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
  });

  it("still advances on its own once the step's timer runs out", async () => {
    await mountWarmup();

    await act(() => {
      jest.advanceTimersByTime(WARMUP_SEQUENCE[0].seconds * 1000 + 200);
    });

    expect(useSessionStore.getState().warmupIndex).toBe(1);
  });

  it("shows the movement's description, so the hero knows what to do", async () => {
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
