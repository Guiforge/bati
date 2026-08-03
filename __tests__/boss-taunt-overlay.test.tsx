import { act, render } from "@testing-library/react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { TamaguiProvider } from "tamagui";

import { BossTauntOverlay } from "@/components/session/BossTauntOverlay";
import { BOSSES } from "@/constants/bosses";
import type { BossFight, DamageResult } from "@/db/bossFights";
import { useSessionStore } from "@/stores/session";
import config from "@/tamagui.config";

/**
 * The boss now answers the hit instead of a clock. It used to fire on a random 15-45s schedule
 * from one ten-line pool shared by all six bosses, which meant it talked over your set about
 * nothing. What matters here is that the *right* pool is picked: a crit, a resisted blow and an
 * enraged boss must not all get the same line, or the reaction is decorative again.
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

const GOLEM = BOSSES.stone_golem;

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
    imagePath: "assets/images/bosses/stone_golem.jpg",
    enName: "The Warden",
    frName: "Le Gardien",
  };
}

function makeHit(over: Partial<DamageResult> = {}): DamageResult {
  return {
    damage: 10,
    isCritical: false,
    newHp: 90,
    defeated: false,
    weaknessBonus: false,
    resistancePenalty: false,
    ...over,
  };
}

function renderOverlay() {
  return render(
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
}

describe("BossTauntOverlay", () => {
  beforeEach(() => {
    jest.useFakeTimers();
    // Pins every pool to its first line.
    jest.spyOn(Math, "random").mockReturnValue(0);
    useSessionStore.setState({
      status: "running",
      bossFight: makeBossFight(100),
      lastDamageResult: null,
    });
  });

  afterEach(() => {
    jest.useRealTimers();
    jest.restoreAllMocks();
    useSessionStore.setState({ bossFight: null, lastDamageResult: null });
  });

  it("says nothing until a hit lands, then answers it", async () => {
    const { getByText, queryByText } = await renderOverlay();

    // No timer to wait out any more: silence is the resting state.
    await act(() => {
      jest.advanceTimersByTime(60_000);
    });
    expect(queryByText(GOLEM.idle.en[0])).toBeNull();

    await act(() => {
      useSessionStore.setState({ bossFight: makeBossFight(90), lastDamageResult: makeHit() });
    });

    expect(getByText(GOLEM.idle.en[0])).toBeTruthy();
  });

  it("picks the pool from what the hit actually was", async () => {
    const { getByText } = await renderOverlay();

    await act(() => {
      useSessionStore.setState({ lastDamageResult: makeHit({ isCritical: true }) });
    });
    expect(getByText(GOLEM.crit.en[0])).toBeTruthy();

    await act(() => {
      useSessionStore.setState({ lastDamageResult: makeHit({ resistancePenalty: true }) });
    });
    expect(getByText(GOLEM.resist.en[0])).toBeTruthy();

    // Below 25 % the boss answers its own state before it answers your hit — a crit that corners
    // it gets the enrage line, not the mocking one.
    await act(() => {
      useSessionStore.setState({
        lastDamageResult: makeHit({ newHp: 10, isCritical: true }),
      });
    });
    expect(getByText(GOLEM.enrage.en[0])).toBeTruthy();
  });

  it("goes quiet again after its line has been up long enough", async () => {
    const { queryByText } = await renderOverlay();

    await act(() => {
      useSessionStore.setState({ lastDamageResult: makeHit() });
    });
    expect(queryByText(GOLEM.idle.en[0])).not.toBeNull();

    await act(() => {
      jest.advanceTimersByTime(4_000);
    });
    expect(queryByText(GOLEM.idle.en[0])).toBeNull();
  });
});
