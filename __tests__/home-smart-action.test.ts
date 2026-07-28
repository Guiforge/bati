import { renderHook, waitFor } from "@testing-library/react-native";

import { useSmartAction } from "@/components/home/useSmartAction";

/**
 * Regression: the home CTA used to push `/session` with a `questId` param. Nothing reads that
 * param — `app/session.tsx` looks at the session store, finds it empty and redirects home — so
 * the most prominent button on the screen did nothing. Only `startSession` fills that store,
 * and the quest detail screen is what calls it.
 */

const mockPush = jest.fn();

jest.mock("expo-router", () => ({
  useRouter: () => ({ push: mockPush, back: jest.fn() }),
  // The hook loads on focus; run the callback once, like a first focus.
  useFocusEffect: (cb: () => undefined | (() => void)) => {
    const { useEffect } = require("react");
    // biome-ignore lint/correctness/useExhaustiveDependencies: mirrors expo-router's own signature
    useEffect(() => cb(), []);
  },
}));

jest.mock("@/stores/settings", () => ({
  useSettingsStore: () => ({ language: "en" }),
}));

jest.mock("@/db/adventures", () => ({
  getAnyActiveAdventureRun: jest.fn().mockResolvedValue(null),
  getAdventureDetails: jest.fn().mockResolvedValue(null),
}));

jest.mock("@/db/muscleBalance", () => ({
  getSuggestedQuestsForWeakAreas: jest
    .fn()
    .mockResolvedValue([{ id: 12, matchingMuscles: ["chest"] }]),
}));

describe("useSmartAction", () => {
  beforeEach(() => {
    mockPush.mockClear();
  });

  it("opens the suggested quest's own screen, not the empty session screen", async () => {
    const { result } = await renderHook(() => useSmartAction());

    await waitFor(() => expect(result.current.config).not.toBeNull());

    result.current.config?.onPress();

    expect(mockPush).toHaveBeenCalledWith("/quests/12");
  });
});
