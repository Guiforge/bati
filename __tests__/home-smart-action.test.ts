import { renderHook, waitFor } from "@testing-library/react-native";

import { useSmartAction } from "@/components/home/useSmartAction";

/**
 * The order of the waterfall *is* the feature, so this is what the tests hold onto.
 *
 * Two regressions live here. The older one: the CTA used to push `/session` with a `questId`
 * param nothing read, so the most prominent button on the screen did nothing — only
 * `startSession` fills that store. The newer one: the oath must outrank the weak-area rule.
 * A hero who swore "15 pull-ups" and gets offered a legs quest has an objective the app
 * ignores, which is how the oath, the ladder and the sessions ended up feeling unrelated.
 */

const mockPush = jest.fn();
const mockStartSession = jest.fn().mockResolvedValue(undefined);

jest.mock("expo-router", () => ({
  useRouter: () => ({ push: mockPush, back: jest.fn() }),
  // The hook loads on focus; run the callback once, like a first focus.
  useFocusEffect: (cb: () => undefined | (() => void)) => {
    const { useEffect } = require("react");
    useEffect(() => cb(), []);
  },
}));

jest.mock("@/stores/settings", () => ({
  useSettingsStore: () => ({ language: "en" }),
}));

jest.mock("@/stores/session", () => ({
  useSessionStore: () => ({ startSession: mockStartSession }),
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

jest.mock("@/db/oaths", () => ({
  getOathProgress: jest.fn().mockResolvedValue(null),
  oathNeedsExercise: (metric: string) => metric === "exercise_pr" || metric === "exercise_volume",
}));

jest.mock("@/db/exercises", () => ({
  getChainTo: jest.fn().mockResolvedValue(null),
}));

jest.mock("@/db/quests", () => ({
  findQuestWithExercise: jest.fn().mockResolvedValue(null),
}));

jest.mock("@/db/estimate", () => ({
  estimateQuestSeconds: () => 20 * 60,
  formatDuration: () => "20 min",
}));

jest.mock("@/db/questConfig", () => ({
  loadConfiguredQuest: jest.fn(),
}));

const { getOathProgress } = require("@/db/oaths");
const { getChainTo } = require("@/db/exercises");
const { findQuestWithExercise } = require("@/db/quests");
const { loadConfiguredQuest } = require("@/db/questConfig");

const questNamed = (id: number, title: string) => ({
  quest: {
    id,
    enTitle: title,
    frTitle: title,
    imagePath: "quests/x.jpg",
    archetype: "strength",
    exercises: [{ id: 1 }, { id: 2 }],
  },
  level: "medium",
});

describe("useSmartAction", () => {
  beforeEach(() => {
    mockPush.mockClear();
    mockStartSession.mockClear();
    loadConfiguredQuest.mockImplementation(async (id: number) =>
      questNamed(id, id === 7 ? "Iron Path" : "Chest Day"),
    );
    getOathProgress.mockClear().mockResolvedValue(null);
    getChainTo.mockClear().mockResolvedValue(null);
    findQuestWithExercise.mockClear().mockResolvedValue(null);
  });

  it("starts the session instead of opening one more screen to press start on", async () => {
    const { result } = await renderHook(() => useSmartAction());
    await waitFor(() => expect(result.current.config).not.toBeNull());

    result.current.config?.onPress();

    await waitFor(() => expect(mockStartSession).toHaveBeenCalled());
    expect(mockStartSession.mock.calls[0][0].id).toBe(12);
    await waitFor(() => expect(mockPush).toHaveBeenCalledWith("/session"));
  });

  it("serves the oath before the weak areas, on the rung the hero is standing on", async () => {
    getOathProgress.mockResolvedValue({
      oath: { metric: "exercise_pr", exerciseId: 99 },
      isFulfilled: false,
      exerciseName: { en: "Pull-ups", fr: "Tractions" },
    });
    getChainTo.mockResolvedValue({
      position: 2,
      rungs: [
        { exercise: { id: 50, enName: "Table Row", frName: "Tirage table" } },
        { exercise: { id: 51, enName: "Inverted Row", frName: "Rowing inversé" } },
        { exercise: { id: 99, enName: "Pull-ups", frName: "Tractions" } },
      ],
    });
    findQuestWithExercise.mockResolvedValue(7);

    const { result } = await renderHook(() => useSmartAction());
    await waitFor(() => expect(result.current.config).not.toBeNull());

    // The rung under their feet, not the top of the chain they swore.
    expect(findQuestWithExercise).toHaveBeenCalledWith(51);
    expect(result.current.config?.scene?.title).toBe("Iron Path");

    result.current.config?.onPress();
    await waitFor(() => expect(mockStartSession).toHaveBeenCalled());
    expect(mockStartSession.mock.calls[0][0].id).toBe(7);
  });

  it("falls back to the weak areas when the oath names no exercise", async () => {
    getOathProgress.mockResolvedValue({
      oath: { metric: "streak", exerciseId: null },
      isFulfilled: false,
      exerciseName: null,
    });

    const { result } = await renderHook(() => useSmartAction());
    await waitFor(() => expect(result.current.config).not.toBeNull());

    expect(findQuestWithExercise).not.toHaveBeenCalled();
    expect(result.current.config?.scene?.title).toBe("Chest Day");
  });

  it("offers the gallery, honestly labelled, when there is nothing to go on", async () => {
    const { getSuggestedQuestsForWeakAreas } = require("@/db/muscleBalance");
    getSuggestedQuestsForWeakAreas.mockResolvedValueOnce([]);

    const { result } = await renderHook(() => useSmartAction());
    await waitFor(() => expect(result.current.config).not.toBeNull());

    expect(result.current.config?.variant).toBe("gallery");
    result.current.config?.onPress();
    expect(mockPush).toHaveBeenCalledWith("/(tabs)/quests");
    expect(mockStartSession).not.toHaveBeenCalled();
  });
});
