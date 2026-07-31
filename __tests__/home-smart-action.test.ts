import { renderHook, waitFor } from "@testing-library/react-native";

import { useSmartAction } from "@/components/home/useSmartAction";

/**
 * The order of the waterfall *is* the feature, so this is what the tests hold onto.
 *
 * Two regressions live here. The older one: the CTA used to push `/session` with a `questId`
 * param nothing read, so the most prominent button on the screen did nothing — only
 * `startSession` fills that store. Home is therefore not allowed to push a session route at
 * all: it hands over the quest detail, which is the one screen that calls `startSession`
 * before navigating. The newer one: the oath must outrank the weak-area rule. A hero who
 * swore "15 pull-ups" and gets offered a legs quest has an objective the app ignores, which
 * is how the oath, the ladder and the sessions ended up feeling unrelated.
 */

const mockPush = jest.fn();

jest.mock("expo-router", () => ({
  useRouter: () => ({ push: mockPush, back: jest.fn() }),
  // The hook loads on focus; run the callback once, like a first focus.
  useFocusEffect: (cb: () => undefined | (() => void)) => {
    const { useEffect } = require("react");
    useEffect(() => cb(), []);
  },
}));

// Honours the selector: the hook reads `useSettingsStore((s) => s.language)`, and a mock that
// returns the whole state regardless handed it `{ language: "en" }` as the language itself.
jest.mock("@/stores/settings", () => ({
  useSettingsStore: (selector?: (s: { language: string }) => unknown) => {
    const state = { language: "en" };
    return selector ? selector(state) : state;
  },
}));

// The real en.json, interpolated. Without this `t` hands back bare keys and the subtext
// assertions below cannot see a sentence at all — which is how "Oath · Rung 2/3 · Inverted Row"
// shipped unread. A missing key now surfaces as the key itself and fails the expectation.
jest.mock("react-i18next", () => {
  const en = require("@/locales/en.json");
  return {
    useTranslation: () => ({
      t: (key: string, opts?: Record<string, unknown>) => {
        const walk = (path: string[]): unknown =>
          path.reduce<unknown>(
            (node, k) =>
              typeof node === "object" && node !== null
                ? (node as Record<string, unknown>)[k]
                : undefined,
            en,
          );
        // i18next resolves a flat dotted key before splitting on "."; mirror that order.
        const found = walk([key]) ?? walk(key.split("."));
        if (typeof found !== "string") return key;
        return found.replace(/{{(\w+)}}/g, (_: string, name: string) => String(opts?.[name] ?? ""));
      },
    }),
  };
});

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
    loadConfiguredQuest.mockImplementation(async (id: number) =>
      questNamed(id, id === 7 ? "Iron Path" : "Chest Day"),
    );
    getOathProgress.mockClear().mockResolvedValue(null);
    getChainTo.mockClear().mockResolvedValue(null);
    findQuestWithExercise.mockClear().mockResolvedValue(null);
  });

  it("hands over the quest detail, and never a session route", async () => {
    const { result } = await renderHook(() => useSmartAction());
    await waitFor(() => expect(result.current.config).not.toBeNull());

    result.current.config?.onPress();

    expect(mockPush).toHaveBeenCalledWith("/quests/12");
    // Only the detail screen calls startSession, and /session redirects home on an empty
    // store — so Home reaching it directly is the bug this line exists to catch.
    expect(mockPush).not.toHaveBeenCalledWith("/session");
  });

  it("labels the button with what it does, not with the detail screen's verb", async () => {
    const { result } = await renderHook(() => useSmartAction());
    await waitFor(() => expect(result.current.config).not.toBeNull());

    expect(result.current.config?.label).toBe("See the quest");
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

    // The gold line under the title reads as a sentence. "Oath · Rung 2/3 · Inverted Row" was
    // three fragments glued by middots, and the ladder is nowhere on Home to explain itself.
    expect(result.current.config?.subtext).toBe(
      "Toward your oath: Pull-ups — step 2 of 3, tonight: Inverted Row",
    );

    result.current.config?.onPress();
    expect(mockPush).toHaveBeenCalledWith("/quests/7");
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
    expect(result.current.config?.label).toBe("Pick a quest");
    result.current.config?.onPress();
    expect(mockPush).toHaveBeenCalledWith("/(tabs)/quests");
  });
});
