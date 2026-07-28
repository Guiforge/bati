import { act, render } from "@testing-library/react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { TamaguiProvider } from "tamagui";

import { WarmupView } from "@/components/session/WarmupView";
import { WARMUP_SEQUENCE } from "@/constants/warmup";
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
jest.mock("@/i18n", () => ({ __esModule: true, default: { changeLanguage: jest.fn() } }));
jest.mock("@/src/i18n/deviceLanguage", () => ({ getDevicePreferredAppLanguage: () => "en" }));

async function mountWarmup() {
  await act(async () => {
    render(
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
}

describe("WarmupView", () => {
  beforeEach(() => {
    jest.useFakeTimers();
    useSessionStore.setState({
      status: "warmup",
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

    await act(async () => {
      jest.advanceTimersByTime(WARMUP_SEQUENCE[0].seconds * 1000 + 200);
    });

    expect(useSessionStore.getState().warmupIndex).toBe(1);
  });
});
