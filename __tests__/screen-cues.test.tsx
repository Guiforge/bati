import { act, renderHook, waitFor } from "@testing-library/react-native";

import { useComebackCue, useScreenGuide } from "@/components/chorus/screenCues";
import { useChorusStore } from "@/stores/chorus";
import { useSettingsStore } from "@/stores/settings";

jest.mock("@/db/client", () => ({ db: {}, schema: {}, runMigrations: jest.fn() }));
jest.mock("@/src/widget", () => ({ requestWidgetsUpdate: jest.fn().mockResolvedValue(undefined) }));
jest.mock("@/db/streaks", () => ({ getStreakInfo: jest.fn() }));
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

// Named rather than `Record<string, jest.Mock>`: under `noUncheckedIndexedAccess` an index
// signature makes every lookup possibly-undefined, and the point of the mock is that these six
// exist.
const { preferences: prefs } = jest.requireMock("@/db") as {
  preferences: {
    getGuidesSeen: jest.Mock;
    setGuidesSeen: jest.Mock;
    getComebackGreetedAfter: jest.Mock;
    setComebackGreetedAfter: jest.Mock;
  };
};
const { getStreakInfo } = jest.requireMock("@/db/streaks") as { getStreakInfo: jest.Mock };

/**
 * Mount a hook and let its effect's promise chain settle.
 *
 * Both of these hooks read from the database before deciding whether to cue, so nothing has
 * happened yet when `renderHook` returns. Two microtask ticks cover read → decide → write.
 */
async function mountAndSettle(hook: () => void): Promise<void> {
  await act(async () => {
    // Awaited: this repo's testing-library render is thenable, and an unhandled one is a
    // floating promise that swallows whatever the first render threw.
    await renderHook(hook);
    await Promise.resolve();
  });
}

const TODAY = new Date("2026-08-23T10:00:00Z");
const daysAgo = (n: number) =>
  new Date(TODAY.getTime() - n * 86_400_000).toISOString().slice(0, 10);

beforeEach(() => {
  jest.clearAllMocks();
  prefs.getGuidesSeen.mockResolvedValue([]);
  prefs.getComebackGreetedAfter.mockResolvedValue(null);
  jest.useFakeTimers().setSystemTime(TODAY);
  useSettingsStore.setState({ villagersEnabled: true });
  useChorusStore.setState({ current: null, recentKeys: [], lastVillager: null, lastCameoAt: 0 });
});

afterEach(() => {
  jest.useRealTimers();
});

describe("useScreenGuide", () => {
  it("explains a screen the first time, and marks it met straight away", async () => {
    await mountAndSettle(() => useScreenGuide("guide_village"));

    await waitFor(() => expect(useChorusStore.getState().current?.moment).toBe("guide_village"));
    // Marked as soon as it is raised, not when it finishes: a hero who leaves the screen
    // mid-sentence has met the guide, and showing it again is the app not trusting them.
    expect(prefs.setGuidesSeen).toHaveBeenCalledWith(["guide_village"]);
  });

  it("never explains the same screen twice", async () => {
    prefs.getGuidesSeen.mockResolvedValue(["guide_village"]);

    await mountAndSettle(() => useScreenGuide("guide_village"));

    expect(useChorusStore.getState().current).toBeNull();
    expect(prefs.setGuidesSeen).not.toHaveBeenCalled();
  });

  it("keeps the other guides when one is met", async () => {
    prefs.getGuidesSeen.mockResolvedValue(["guide_home"]);

    await mountAndSettle(() => useScreenGuide("guide_quests"));

    await waitFor(() =>
      expect(prefs.setGuidesSeen).toHaveBeenCalledWith(["guide_home", "guide_quests"]),
    );
  });
});

describe("useComebackCue", () => {
  it("says nothing to someone who trained this week", async () => {
    getStreakInfo.mockResolvedValue({ lastWorkoutDate: daysAgo(3) });

    await mountAndSettle(() => useComebackCue());

    expect(useChorusStore.getState().current).toBeNull();
  });

  it("greets someone coming back after a real absence", async () => {
    getStreakInfo.mockResolvedValue({ lastWorkoutDate: daysAgo(21) });

    await mountAndSettle(() => useComebackCue());

    await waitFor(() => expect(useChorusStore.getState().current?.moment).toBe("comeback"));
    expect(prefs.setComebackGreetedAfter).toHaveBeenCalledWith(daysAgo(21));
  });

  /**
   * The one that matters. Keyed on the last *workout* date rather than on when the greeting was
   * last shown, so opening the app again the next day — still away, still not training — says
   * nothing. Re-greeting daily would be reminding someone every morning that they have stopped,
   * which is the shame loop the whole pool is written against.
   */
  it("greets once per absence, not once per day away", async () => {
    getStreakInfo.mockResolvedValue({ lastWorkoutDate: daysAgo(21) });
    prefs.getComebackGreetedAfter.mockResolvedValue(daysAgo(21));

    await mountAndSettle(() => useComebackCue());

    expect(useChorusStore.getState().current).toBeNull();
    expect(prefs.setComebackGreetedAfter).not.toHaveBeenCalled();
  });

  it("says nothing to someone who has never trained at all", async () => {
    // A brand-new hero is not "back" — they have not been anywhere.
    getStreakInfo.mockResolvedValue({ lastWorkoutDate: null });

    await mountAndSettle(() => useComebackCue());

    expect(useChorusStore.getState().current).toBeNull();
  });
});
