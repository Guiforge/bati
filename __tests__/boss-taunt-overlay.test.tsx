import { act, render } from "@testing-library/react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { TamaguiProvider } from "tamagui";

import { BossTauntOverlay } from "@/components/session/BossTauntOverlay";
import { BOSS_TAUNTS } from "@/constants/bossTaunts";
import type { BossFight } from "@/db/bossFights";
import { useSessionStore } from "@/stores/session";
import config from "@/tamagui.config";

/**
 * Regression: bossFight is a new object every time damage is dealt (currentHp changes each
 * hit). An effect keyed on that object restarted the whole 15-45s taunt schedule on every
 * exercise completed during a fight, so taunts almost never actually fired.
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
jest.mock("@/i18n", () => ({ __esModule: true, default: { changeLanguage: jest.fn() } }));
jest.mock("@/src/i18n/deviceLanguage", () => ({ getDevicePreferredAppLanguage: () => "en" }));

function makeBossFight(currentHp: number): BossFight {
  return {
    id: 1,
    adventureId: 1,
    totalHp: 100,
    currentHp,
    weaknessMuscle: null,
    resistanceMuscle: null,
    defeatedAt: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    imagePath: "assets/placeholder.jpg",
    enName: "The Warden",
    frName: "Le Gardien",
  };
}

describe("BossTauntOverlay", () => {
  beforeEach(() => {
    jest.useFakeTimers();
    // Pins the random delay to its minimum (15s) and the taunt pool index to 0.
    jest.spyOn(Math, "random").mockReturnValue(0);
    useSessionStore.setState({ status: "running", bossFight: makeBossFight(100) });
  });

  afterEach(() => {
    jest.useRealTimers();
    jest.restoreAllMocks();
  });

  it("keeps the taunt schedule alive across HP updates on the same fight", async () => {
    const { getByText, queryByText } = await render(
      <SafeAreaProvider
        initialMetrics={{
          frame: { x: 0, y: 0, width: 390, height: 844 },
          insets: { top: 0, left: 0, right: 0, bottom: 0 },
        }}
      >
        <TamaguiProvider config={config} defaultTheme="dark">
          <BossTauntOverlay />
        </TamaguiProvider>
      </SafeAreaProvider>,
    );

    await act(() => {
      jest.advanceTimersByTime(10_000);
    });
    expect(queryByText(BOSS_TAUNTS.en[0])).toBeNull();

    // A hit lands: same fight (id 1), new object, lower HP — must not reset the timer.
    await act(() => {
      useSessionStore.setState({ bossFight: makeBossFight(90) });
    });

    await act(() => {
      jest.advanceTimersByTime(5_000);
    });

    expect(getByText(BOSS_TAUNTS.en[0])).toBeTruthy();
  });
});
