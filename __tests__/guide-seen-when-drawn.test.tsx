import { act, render } from "@testing-library/react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { TamaguiProvider } from "tamagui";

import VillagePage from "@/app/(tabs)/village";
import { useComebackCue, useScreenGuide } from "@/components/chorus/screenCues";
import { VillagerLine } from "@/components/chorus/VillagerLine";
import * as village from "@/db/village";
import { useChorusStore } from "@/stores/chorus";
import { useSettingsStore } from "@/stores/settings";
import config from "@/tamagui.config";

/**
 * A guide has one chance, so it is marked seen when a villager is DRAWN saying it, never when it
 * is merely cued. Two ways a cued guide was never drawn: the Village scene failing to load (its
 * error branch mounts no figure), and Home's comeback greeting replacing guide_home in the store
 * before the line rendered. Both burnt the tutorial. Real hooks, store and drawers; only the
 * database and the router are stand-ins.
 */

jest.mock("@/db/client", () => ({ db: {}, schema: {}, runMigrations: jest.fn() }));
jest.mock("@/src/widget", () => ({ requestWidgetsUpdate: jest.fn().mockResolvedValue(undefined) }));
jest.mock("@/db/streaks", () => ({ getStreakInfo: jest.fn() }));
jest.mock("@/db/adventures", () => ({ listFinishedRunSummaries: jest.fn().mockResolvedValue([]) }));
jest.mock("@/db/completed", () => ({
  getRecentContributingSessions: jest.fn().mockResolvedValue([]),
}));
jest.mock("expo-router", () => ({
  useFocusEffect: (cb: () => void) => require("react").useEffect(cb, [cb]),
  useIsFocused: () => true,
  useLocalSearchParams: () => ({}),
  useRouter: () => ({ push: jest.fn() }),
}));
jest.mock("@/components/common/FlameFlicker", () => ({ FlameFlicker: () => null }));
jest.mock("@/hooks/useReducedMotion", () => ({
  ...jest.requireActual("@/hooks/useReducedMotion"),
  useReducedMotion: () => true,
}));
jest.mock("@/src/reportError", () => ({ reportError: jest.fn() }));
jest.mock("@/db", () => ({
  preferences: {
    getRecentCameoLines: jest.fn().mockResolvedValue([]),
    setRecentCameoLines: jest.fn().mockResolvedValue(undefined),
    getGuidesSeen: jest.fn().mockResolvedValue([]),
    setGuidesSeen: jest.fn().mockResolvedValue(undefined),
    getComebackGreetedAfter: jest.fn().mockResolvedValue(null),
    setComebackGreetedAfter: jest.fn().mockResolvedValue(undefined),
  },
}));

const { preferences: prefs } = jest.requireMock("@/db") as {
  preferences: {
    getGuidesSeen: jest.Mock;
    setGuidesSeen: jest.Mock;
    getComebackGreetedAfter: jest.Mock;
    setComebackGreetedAfter: jest.Mock;
  };
};
const { getStreakInfo } = jest.requireMock("@/db/streaks") as { getStreakInfo: jest.Mock };

const METRICS = {
  frame: { x: 0, y: 0, width: 390, height: 844 },
  insets: { top: 47, left: 0, right: 0, bottom: 34 },
};

const wrap = (children: React.ReactNode) => (
  <SafeAreaProvider initialMetrics={METRICS}>
    <TamaguiProvider config={config} defaultTheme="dark">
      {children}
    </TamaguiProvider>
  </SafeAreaProvider>
);

/** Home's wiring: both cues, and the line they are drawn in. */
// biome-ignore lint/style/useComponentExportOnlyModules: a test file exports nothing
function Home() {
  useScreenGuide("guide_home");
  useComebackCue();
  return <VillagerLine owner="home" />;
}

async function settle() {
  await act(async () => {
    for (let i = 0; i < 10; i++) await Promise.resolve();
  });
}

beforeEach(() => {
  jest.clearAllMocks();
  prefs.getGuidesSeen.mockResolvedValue([]);
  useSettingsStore.setState({ villagersEnabled: true });
  useChorusStore.setState({ current: null, recentKeys: [], lastVillager: null, lastCameoAt: 0 });
});

describe("a guide is marked seen once it is drawn", () => {
  it("not when the Village scene failed to load and no figure was ever mounted", async () => {
    jest.spyOn(village, "getVillageScene").mockRejectedValue(new Error("db down"));

    const { findByText } = await render(wrap(<VillagePage />));
    await findByText("The village is out of reach");
    await settle();

    expect(prefs.setGuidesSeen).not.toHaveBeenCalled();
  });

  it("Home's comeback waits for the guide instead of replacing it, and is not spent", async () => {
    // 21 days away: the comeback is due, in the same tick as the first-visit guide.
    getStreakInfo.mockResolvedValue({
      lastWorkoutDate: new Date(Date.now() - 21 * 86_400_000).toISOString().slice(0, 10),
    });

    const { findByTestId } = await render(wrap(<Home />));
    await findByTestId("villager-line-block");
    await settle();

    // The guide stays up and is the one marked seen; the greeting is owed to the next visit.
    expect(useChorusStore.getState().current?.moment).toBe("guide_home");
    expect(prefs.setGuidesSeen).toHaveBeenCalledWith(["guide_home"]);
    expect(prefs.setComebackGreetedAfter).not.toHaveBeenCalled();
  });

  it("the comeback still yields when the guide lands while it reads the greeted date", async () => {
    getStreakInfo.mockResolvedValue({
      lastWorkoutDate: new Date(Date.now() - 21 * 86_400_000).toISOString().slice(0, 10),
    });
    // The comeback reads its absence before the guide is cued, then the guide lands while it
    // reads the greeted date: what it checked first is stale by the time it cues.
    let seenRead: (value: string[]) => void = () => {};
    prefs.getGuidesSeen.mockReturnValueOnce(
      new Promise<string[]>((resolve) => {
        seenRead = resolve;
      }),
    );
    let greetedRead: (value: null) => void = () => {};
    prefs.getComebackGreetedAfter.mockReturnValueOnce(
      new Promise<null>((resolve) => {
        greetedRead = resolve;
      }),
    );

    const { findByTestId } = await render(wrap(<Home />));
    await settle();
    expect(prefs.getComebackGreetedAfter).toHaveBeenCalled();
    await act(async () => seenRead([]));
    await findByTestId("villager-line-block");
    expect(useChorusStore.getState().current?.moment).toBe("guide_home");
    await act(async () => greetedRead(null));
    await settle();

    expect(useChorusStore.getState().current?.moment).toBe("guide_home");
    expect(prefs.setComebackGreetedAfter).not.toHaveBeenCalled();
  });

  it("when the guide is the line on screen", async () => {
    getStreakInfo.mockResolvedValue({ lastWorkoutDate: null });

    const { findByTestId } = await render(wrap(<Home />));
    await findByTestId("villager-line-block");
    await settle();

    expect(prefs.setGuidesSeen).toHaveBeenCalledWith(["guide_home"]);
  });

  it("keeps the guides already met", async () => {
    prefs.getGuidesSeen.mockResolvedValue(["guide_quests"]);
    getStreakInfo.mockResolvedValue({ lastWorkoutDate: null });

    const { findByTestId } = await render(wrap(<Home />));
    await findByTestId("villager-line-block");
    await settle();

    expect(prefs.setGuidesSeen).toHaveBeenCalledWith(["guide_quests", "guide_home"]);
  });
});
