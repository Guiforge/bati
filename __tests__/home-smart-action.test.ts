import assert from "node:assert/strict";
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

// Every focus reads as a fresh write, so these tests load on each one as they always did. The
// gate itself is `__tests__/use-reload-on-change.test.ts`'s.
let mockChanges = 0;
jest.mock("@/db/changeVersion", () => ({
  getChangeVersion: async () => String(mockChanges++),
}));

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
        // ...and the plural suffix when a count is given, as i18next does.
        const plural =
          typeof opts?.count === "number" ? (opts.count === 1 ? "_one" : "_other") : "";
        const found =
          walk([key + plural]) ??
          walk((key + plural).split(".")) ??
          walk([key]) ??
          walk(key.split("."));
        if (typeof found !== "string") return key;
        return found.replace(/{{(\w+)(?:, *\w+)?}}/g, (_: string, name: string) =>
          String(opts?.[name] ?? ""),
        );
      },
    }),
  };
});

jest.mock("@/db/adventures", () => ({
  getAnyActiveAdventureRun: jest.fn().mockResolvedValue(null),
  getAdventureDetails: jest.fn().mockResolvedValue(null),
}));

// The real WEEKDAYS below reads through a module that opens the database at import.
jest.mock("@/db/client", () => ({ db: {}, schema: jest.requireActual("@/db/schema") }));

// The hero's reminder days, for the "Your day" kicker. None by default.
let mockReminderDays: Record<string, string> = {};
jest.mock("@/db/reminders", () => ({
  getReminderDays: async () => mockReminderDays,
  WEEKDAYS: jest.requireActual("@/db/reminders").WEEKDAYS,
}));

// A pause the hero is in today, or null.
let mockPause: { from: string; until: string } | null = null;
jest.mock("@/db/pause", () => ({ getActivePause: async () => mockPause }));

jest.mock("@/db/bossFights", () => ({
  getBossFightByAdventure: jest.fn().mockResolvedValue(null),
}));

jest.mock("@/db/muscleBalance", () => ({
  getSuggestedQuestsForWeakAreas: jest
    .fn()
    .mockResolvedValue([{ id: 12, matchingMuscles: ["chest"] }]),
}));

// A hero with no history unless a test says otherwise: the day-one rule asks the journal.
jest.mock("@/db/completed", () => ({
  getSessionAggregates: jest
    .fn()
    .mockResolvedValue({ totalSessions: 0, totalXp: 0, uniqueQuests: 0 }),
  getStalestQuest: jest.fn().mockResolvedValue(null),
  hasSessionToday: jest.fn().mockResolvedValue(false),
}));

jest.mock("@/db/oaths", () => ({
  getOathProgress: jest.fn().mockResolvedValue(null),
  isOathFrozen: jest.fn().mockResolvedValue(false),
  oathNeedsExercise: (metric: string) => metric === "exercise_pr" || metric === "exercise_volume",
}));

jest.mock("@/db/exercises", () => ({
  getChainTo: jest.fn().mockResolvedValue(null),
}));

jest.mock("@/db/quests", () => ({
  findQuestWithExercise: jest.fn().mockResolvedValue(null),
  listQuestTemplates: jest.fn().mockResolvedValue([]),
}));

jest.mock("@/db/estimate", () => ({
  estimateQuestSeconds: () => 20 * 60,
  formatDurationEstimate: () => "20 min",
}));

jest.mock("@/db/questConfig", () => ({
  loadConfiguredQuest: jest.fn(),
}));

jest.mock("@/db/outings", () => ({
  listOutings: jest.fn().mockResolvedValue([]),
}));

const { getOathProgress } = require("@/db/oaths");
const { getSessionAggregates, getStalestQuest, hasSessionToday } = require("@/db/completed");
const { getChainTo } = require("@/db/exercises");
const { findQuestWithExercise, listQuestTemplates } = require("@/db/quests");
const { loadConfiguredQuest } = require("@/db/questConfig");
const { listOutings } = require("@/db/outings");

const { FIRST_QUEST_TITLE } = require("@/constants/onboarding");

const questNamed = (id: number, title: string, style = "strength") => ({
  quest: {
    id,
    enTitle: title,
    frTitle: title,
    imagePath: "quests/x.jpg",
    archetype: "strength",
    exercises: [
      { id: 1, exercise: { style } },
      { id: 2, exercise: { style } },
    ],
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
    listQuestTemplates.mockClear().mockResolvedValue([]);
    listOutings.mockClear().mockResolvedValue([]);
  });

  it("hands over the quest detail, and never a session route", async () => {
    const { result } = await renderHook(() => useSmartAction());
    await waitFor(() => expect(result.current.config).not.toBeNull());

    result.current.config?.onPress();

    // withAnchor mounts the gallery under the detail so the hardware back pops to it
    // instead of falling through to the Home tab.
    expect(mockPush).toHaveBeenCalledWith("/quests/12", { withAnchor: true });
    // Only the detail screen calls startSession, and /session redirects home on an empty
    // store — so Home reaching it directly is the bug this line exists to catch.
    expect(mockPush).not.toHaveBeenCalledWith("/session");
  });

  it("starts the quest itself, and names the one it starts", async () => {
    const { result } = await renderHook(() => useSmartAction());
    await waitFor(() => expect(result.current.config).not.toBeNull());

    // The stage's Start runs this id through `useStartQuest`; the detail screen is Details now,
    // no longer a toll on the way to the session.
    expect(result.current.config?.label).toBe("Start");
    expect(result.current.config?.startQuestId).toBe(12);
  });

  it("sends a quest that reads the position to its screen, where the notice is", async () => {
    const { NON_REP_STYLE } = require("@/db/workUnits");
    loadConfiguredQuest.mockImplementation(async (id: number) =>
      questNamed(id, "The Warden's Round", NON_REP_STYLE),
    );

    const { result } = await renderHook(() => useSmartAction());
    await waitFor(() => expect(result.current.config).not.toBeNull());

    // A system dialog over a countdown, with nothing having warned the hero, is what the quest
    // screen's location notice exists to prevent. The button says it only opens that screen.
    expect(result.current.config?.startQuestId).toBeNull();
    expect(result.current.config?.label).toBe("See the quest");
  });

  describe("the Tonight line", () => {
    const slot = (over: Record<string, unknown>) => ({
      id: 1,
      exercise: { style: "strength", enName: "Push-ups", frName: "Pompes", perSide: false },
      target: { type: "reps", value: 13 },
      ghost: { last: 12, best: 12, at: 0, bestAt: Date.now(), seasonBest: 12, recent: [] },
      ...over,
    });
    const withSlots = (...slots: unknown[]) =>
      loadConfiguredQuest.mockImplementation(async (id: number) => ({
        ...questNamed(id, "Chest Day"),
        quest: { ...questNamed(id, "Chest Day").quest, exercises: slots },
      }));

    it("names the first counted movement with a history, at the number to beat", async () => {
      withSlots(slot({}));
      const { result } = await renderHook(() => useSmartAction());
      await waitFor(() => expect(result.current.config).not.toBeNull());

      expect(result.current.config?.scene?.tonight).toBe("Tonight: Push-ups, at least 13");
    });

    it("has no line on a movement's first session, or on a quest of holds", async () => {
      withSlots(slot({ ghost: undefined }));
      const first = await renderHook(() => useSmartAction());
      await waitFor(() => expect(first.result.current.config).not.toBeNull());
      expect(first.result.current.config?.scene?.tonight).toBeUndefined();

      withSlots(slot({ target: { type: "time", value: 30 } }));
      const holds = await renderHook(() => useSmartAction());
      await waitFor(() => expect(holds.result.current.config).not.toBeNull());
      expect(holds.result.current.config?.scene?.tonight).toBeUndefined();
    });

    it("skips an outing and a hold for the first counted movement after them", async () => {
      const { NON_REP_STYLE } = require("@/db/workUnits");
      withSlots(
        slot({ exercise: { style: NON_REP_STYLE, enName: "Walk", frName: "Marche" } }),
        slot({ id: 2, target: { type: "time", value: 30 } }),
        slot({ id: 3 }),
      );
      const { result } = await renderHook(() => useSmartAction());
      await waitFor(() => expect(result.current.config).not.toBeNull());

      expect(result.current.config?.scene?.tonight).toBe("Tonight: Push-ups, at least 13");
    });

    it("says nothing on the adventure stage", async () => {
      withSlots(slot({}));
      const { getAnyActiveAdventureRun, getAdventureDetails } = require("@/db/adventures");
      getAnyActiveAdventureRun.mockResolvedValueOnce({
        adventureId: 4,
        activeRun: { steps: [{ status: "completed" }, { status: "active" }] },
      });
      getAdventureDetails.mockResolvedValueOnce({
        adventure: { enTitle: "The North Road", frTitle: "La route du Nord", imagePath: null },
      });
      const { result } = await renderHook(() => useSmartAction());
      await waitFor(() => expect(result.current.config).not.toBeNull());

      expect(result.current.config?.variant).toBe("adventure");
      expect(result.current.config?.scene?.tonight).toBeUndefined();

      // Anchored, so a never-opened Adventures tab holds [index, id] and its list stays reachable.
      result.current.config?.onPress();
      expect(mockPush).toHaveBeenCalledWith("/adventures/4?from=home", { withAnchor: true });
    });
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
      "Toward your oath: Pull-ups, rung 2 of 3, today: Inverted Row",
    );

    result.current.config?.onPress();
    expect(mockPush).toHaveBeenCalledWith("/quests/7", { withAnchor: true });
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

  it("serves a leagues oath with the first way out, not a lifting quest", async () => {
    getOathProgress.mockResolvedValue({
      oath: { metric: "leagues", target: 50, exerciseId: null },
      isFulfilled: false,
      exerciseName: null,
    });
    listOutings.mockResolvedValue([{ quest: { id: 40 }, exercise: { enName: "Warden's Walk" } }]);
    loadConfiguredQuest.mockResolvedValue(questNamed(40, "The Warden's Round"));

    const { result } = await renderHook(() => useSmartAction());
    await waitFor(() => expect(result.current.config).not.toBeNull());

    expect(loadConfiguredQuest).toHaveBeenCalledWith(40);
    expect(result.current.config?.scene?.title).toBe("The Warden's Round");
    expect(result.current.config?.subtext).toBe("Toward your oath: 50 leagues beyond the walls");
  });

  it("falls back to the weak areas when a leagues oath has no door out", async () => {
    getOathProgress.mockResolvedValue({
      oath: { metric: "leagues", target: 50, exerciseId: null },
      isFulfilled: false,
      exerciseName: null,
    });
    listOutings.mockResolvedValue([]);

    const { result } = await renderHook(() => useSmartAction());
    await waitFor(() => expect(result.current.config).not.toBeNull());

    expect(result.current.config?.scene?.title).toBe("Chest Day");
  });

  it("falls back to the weak areas when a leagues oath is already fulfilled", async () => {
    getOathProgress.mockResolvedValue({
      oath: { metric: "leagues", target: 50, exerciseId: null },
      isFulfilled: true,
      exerciseName: null,
    });
    listOutings.mockResolvedValue([{ quest: { id: 40 }, exercise: { enName: "Warden's Walk" } }]);

    const { result } = await renderHook(() => useSmartAction());
    await waitFor(() => expect(result.current.config).not.toBeNull());

    expect(listOutings).not.toHaveBeenCalled();
    expect(result.current.config?.scene?.title).toBe("Chest Day");
  });

  // Day one, which is the whole retention question: the hero agreed to an eight minute session
  // one screen ago, and Home used to answer with an empty card and a trip to the catalogue.
  it("offers back the session onboarding just offered, when there is no history at all", async () => {
    const { getSuggestedQuestsForWeakAreas } = require("@/db/muscleBalance");
    getSuggestedQuestsForWeakAreas.mockResolvedValueOnce([]);
    listQuestTemplates.mockResolvedValueOnce([
      { id: 3, enTitle: "Something else" },
      { id: 9, enTitle: FIRST_QUEST_TITLE },
    ]);
    loadConfiguredQuest.mockImplementation(async (id: number) =>
      questNamed(id, "The Squire's Awakening"),
    );

    const { result } = await renderHook(() => useSmartAction());
    await waitFor(() => expect(result.current.config).not.toBeNull());

    // The quest itself, so the card can name it and show its art and its minutes.
    expect(loadConfiguredQuest).toHaveBeenCalledWith(9);
    expect(result.current.config?.variant).toBe("quest");
    expect(result.current.config?.scene?.title).toBe("The Squire's Awakening");
  });

  it('says "Your day" on one of the hero\'s reminder days, and only there', async () => {
    const { WEEKDAYS } = jest.requireActual("@/db/reminders") as typeof import("@/db/reminders");
    const today = WEEKDAYS[new Date().getDay()] as string;
    mockReminderDays = { [today]: "20:00" };
    const { result } = await renderHook(() => useSmartAction());
    await waitFor(() => expect(result.current.config).not.toBeNull());
    expect(result.current.config?.scene?.kicker).toBe("Your day");

    mockReminderDays = {};
    const other = await renderHook(() => useSmartAction());
    await waitFor(() => expect(other.result.current.config).not.toBeNull());
    expect(other.result.current.config?.scene?.kicker).toBeUndefined();
  });

  it('does not say "Your day" during a pause: no reminder goes out on it', async () => {
    const { WEEKDAYS } = jest.requireActual("@/db/reminders") as typeof import("@/db/reminders");
    const today = WEEKDAYS[new Date().getDay()] as string;
    mockReminderDays = { [today]: "20:00" };
    mockPause = { from: "2026-01-01", until: "2099-01-01" };
    const { result } = await renderHook(() => useSmartAction());
    await waitFor(() => expect(result.current.config).not.toBeNull());
    expect(result.current.config?.scene?.kicker).toBeUndefined();
    mockPause = null;
    mockReminderDays = {};
  });

  it("keeps day one's own kicker on a reminder day", async () => {
    const { WEEKDAYS } = jest.requireActual("@/db/reminders") as typeof import("@/db/reminders");
    const today = WEEKDAYS[new Date().getDay()] as string;
    mockReminderDays = { [today]: "20:00" };
    const { getSuggestedQuestsForWeakAreas } = require("@/db/muscleBalance");
    getSuggestedQuestsForWeakAreas.mockResolvedValueOnce([]);
    listQuestTemplates.mockResolvedValueOnce([{ id: 9, enTitle: FIRST_QUEST_TITLE }]);
    const { result } = await renderHook(() => useSmartAction());
    await waitFor(() => expect(result.current.config).not.toBeNull());
    expect(result.current.config?.scene?.kicker).toBe("Day one");
    mockReminderDays = {};
  });

  it("offers the gallery, honestly labelled, when even the on-ramp quest is gone", async () => {
    const { getSuggestedQuestsForWeakAreas } = require("@/db/muscleBalance");
    getSuggestedQuestsForWeakAreas.mockResolvedValueOnce([]);
    // The seed quest is keyed on a title written by an immutable migration. If it ever goes
    // missing, the catalogue is still an honest answer.
    listQuestTemplates.mockResolvedValueOnce([{ id: 3, enTitle: "Something else" }]);

    const { result } = await renderHook(() => useSmartAction());
    await waitFor(() => expect(result.current.config).not.toBeNull());

    expect(result.current.config?.variant).toBe("gallery");
    expect(result.current.config?.label).toBe("Pick a quest");
    result.current.config?.onPress();
    expect(mockPush).toHaveBeenCalledWith("/(tabs)/quests");
  });

  describe("a hero who has trained, with nothing else to say", () => {
    beforeEach(() => {
      const { getSuggestedQuestsForWeakAreas } = require("@/db/muscleBalance");
      getSuggestedQuestsForWeakAreas.mockResolvedValueOnce([]);
      getSessionAggregates.mockResolvedValueOnce({
        totalSessions: 40,
        totalXp: 9000,
        uniqueQuests: 6,
      });
    });

    it("offers the quest left longest, startable, with the days it has waited", async () => {
      getStalestQuest.mockResolvedValueOnce({ questId: 5, daysAgo: 9 });
      loadConfiguredQuest.mockImplementation(async (id: number) => questNamed(id, "Chop Wood"));

      const { result } = await renderHook(() => useSmartAction());
      await waitFor(() => expect(result.current.config).not.toBeNull());

      expect(result.current.config?.variant).toBe("quest");
      expect(result.current.config?.label).toBe("Start");
      expect(result.current.config?.startQuestId).toBe(5);
      expect(result.current.config?.scene?.title).toBe("Chop Wood");
      expect(result.current.config?.subtext).toBe("Last done 9 days ago");
    });

    it("the Tonight line says nothing on a day already done", async () => {
      loadConfiguredQuest.mockImplementation(async (id: number) => ({
        ...questNamed(id, "Chest Day"),
        quest: {
          ...questNamed(id, "Chest Day").quest,
          exercises: [
            {
              id: 1,
              exercise: { style: "strength", enName: "Push-ups", perSide: false },
              target: { type: "reps", value: 13 },
              ghost: { last: 12, best: 12, at: 0, bestAt: Date.now(), seasonBest: 12, recent: [] },
            },
          ],
        },
      }));
      getStalestQuest.mockResolvedValueOnce({ questId: 5, daysAgo: 0 });
      hasSessionToday.mockResolvedValueOnce(true);
      const { result } = await renderHook(() => useSmartAction());
      await waitFor(() => expect(result.current.config).not.toBeNull());

      expect(result.current.config?.variant).toBe("done");
      expect(result.current.config?.scene?.tonight).toBeUndefined();
    });

    it("says the singular for a quest left one day", async () => {
      getStalestQuest.mockResolvedValueOnce({ questId: 5, daysAgo: 1 });
      const { result } = await renderHook(() => useSmartAction());
      await waitFor(() => expect(result.current.config).not.toBeNull());
      expect(result.current.config?.subtext).toBe("Last done yesterday");
    });

    it("titles the gallery for a veteran, never as a first step", async () => {
      const { result } = await renderHook(() => useSmartAction());
      await waitFor(() => expect(result.current.config).not.toBeNull());

      expect(result.current.config?.variant).toBe("gallery");
      expect(result.current.config?.scene?.title).toBe("Choose your next quest");
    });

    // Audit 2026-10-11, F5: the evening of the first victory, the stage sent the hero shopping.
    it("says the day is done and names the next session, with nothing to start", async () => {
      getStalestQuest.mockResolvedValueOnce({ questId: 5, daysAgo: 0 });
      hasSessionToday.mockResolvedValueOnce(true);
      loadConfiguredQuest.mockImplementation(async (id: number) => questNamed(id, "Chop Wood"));

      const { result } = await renderHook(() => useSmartAction());
      await waitFor(() => expect(result.current.config).not.toBeNull());

      expect(result.current.config?.variant).toBe("done");
      expect(result.current.config?.scene?.title).toBe("Done for today.");
      expect(result.current.config?.subtext).toBe("Your next session: Chop Wood, 20 min");
      expect(result.current.config?.startQuestId).toBeNull();
      result.current.config?.onPress();
      expect(mockPush).toHaveBeenCalledWith("/(tabs)/quests");
    });
  });
});

/**
 * The evening of a session. The quest named is rule 4's own, with its "not done today" guard
 * lifted, so the journal is the only thing moved between the two reads below: one day.
 */
describe("decideHomeOffer, a day already done", () => {
  const { decideHomeOffer } = require("@/db/homeOffer") as typeof import("@/db/homeOffer");
  const { getSuggestedQuestsForWeakAreas } = require("@/db/muscleBalance");

  beforeEach(() => {
    getSuggestedQuestsForWeakAreas.mockResolvedValue([]);
    loadConfiguredQuest.mockImplementation(async (id: number) => questNamed(id, "Chop Wood"));
  });

  afterEach(() => {
    getSuggestedQuestsForWeakAreas.mockResolvedValue([{ id: 12, matchingMuscles: ["chest"] }]);
    getSessionAggregates.mockResolvedValue({ totalSessions: 0, totalXp: 0, uniqueQuests: 0 });
    getStalestQuest.mockResolvedValue(null);
    hasSessionToday.mockResolvedValue(false);
    listQuestTemplates.mockResolvedValue([]);
  });

  it("names in the evening the quest it offers the next day", async () => {
    getSessionAggregates.mockResolvedValue({ totalSessions: 1, totalXp: 100, uniqueQuests: 1 });
    getStalestQuest.mockResolvedValue({ questId: 5, daysAgo: 0 });
    hasSessionToday.mockResolvedValue(true);
    const evening = await decideHomeOffer("en");

    getStalestQuest.mockResolvedValue({ questId: 5, daysAgo: 1 });
    hasSessionToday.mockResolvedValue(false);
    const nextDay = await decideHomeOffer("en");

    assert(evening?.kind === "done_today" && nextDay?.kind === "stale_quest");
    expect(evening.next?.quest.id).toBe(5);
    expect(nextDay.quest.id).toBe(evening.next?.quest.id);
    expect(nextDay.seconds).toBe(evening.next?.seconds);
  });

  // `getStalestQuest` reads workouts only, so a hero who only goes out has no quest to name,
  // and day one's on-ramp must not greet them as someone who has not started.
  it("an outing that counts is a day done, with no quest named", async () => {
    hasSessionToday.mockResolvedValue(true);
    listQuestTemplates.mockResolvedValue([{ id: 9, enTitle: FIRST_QUEST_TITLE }]);

    expect(await decideHomeOffer("en")).toEqual({ kind: "done_today", next: null });
  });

  it("leaves a day with no session to the rules it had", async () => {
    getSessionAggregates.mockResolvedValue({ totalSessions: 3, totalXp: 100, uniqueQuests: 1 });

    expect(await decideHomeOffer("en")).toEqual({ kind: "gallery", trained: true });
  });
});

/**
 * The offer itself, which the reminders read too. The stage above never shows a boss; the
 * notification does, so the fight belongs to the one function both of them call.
 */
describe("decideHomeOffer", () => {
  const { decideHomeOffer } = require("@/db/homeOffer") as typeof import("@/db/homeOffer");
  const { getAnyActiveAdventureRun, getAdventureDetails } = require("@/db/adventures");
  const { getBossFightByAdventure } = require("@/db/bossFights");

  const fight = (currentHp: number, defeatedAt: Date | null = null) => ({
    totalHp: 1000,
    currentHp,
    defeatedAt,
    enName: "The Iron Warden",
    frName: "Le Gardien de fer",
    deName: "Der Eiserne Wächter",
    esName: "El Guardián de hierro",
  });

  beforeEach(() => {
    getAnyActiveAdventureRun.mockResolvedValue({
      adventureId: 4,
      activeRun: { steps: [{ status: "completed" }, { status: "active" }, { status: "locked" }] },
    });
    getAdventureDetails.mockResolvedValue({
      adventure: { enTitle: "The North Road", frTitle: "La route du Nord", imagePath: null },
    });
  });

  afterEach(() => {
    getAnyActiveAdventureRun.mockResolvedValue(null);
    getBossFightByAdventure.mockResolvedValue(null);
  });

  it("names a boss already swung at, with what it has left", async () => {
    getBossFightByAdventure.mockResolvedValue(fight(340));
    expect(await decideHomeOffer("fr")).toMatchObject({
      kind: "adventure",
      title: "La route du Nord",
      step: 2,
      total: 3,
      boss: { name: "Le Gardien de fer", hp: 340 },
    });
  });

  it("stays quiet about a fight nobody has started, or one already won", async () => {
    getBossFightByAdventure.mockResolvedValue(fight(1000));
    expect(await decideHomeOffer("en")).toMatchObject({ kind: "adventure", boss: null });

    getBossFightByAdventure.mockResolvedValue(fight(0, new Date()));
    expect(await decideHomeOffer("en")).toMatchObject({ kind: "adventure", boss: null });
  });

  it("answers null once the read is abandoned", async () => {
    expect(await decideHomeOffer("en", () => true)).toBeNull();
  });

  // The hero's own adventures come right after the oath; the game's keep their place before it.
  describe("a run of the hero's own adventure", () => {
    const { getOathProgress, isOathFrozen } = require("@/db/oaths");
    const { getChainTo } = require("@/db/exercises");
    const { findQuestWithExercise } = require("@/db/quests");

    const run = (adventureId: number) => ({
      adventureId,
      activeRun: { steps: [{ status: "completed" }, { status: "active" }] },
    });
    /** One run per population, as `getAnyActiveAdventureRun(owner)` answers. */
    const runs = (byOwner: { game?: number; hero?: number }) =>
      getAnyActiveAdventureRun.mockImplementation((owner?: "game" | "hero") => {
        const id = owner ? byOwner[owner] : (byOwner.hero ?? byOwner.game);
        return Promise.resolve(id === undefined ? null : run(id));
      });
    const dueOath = () => {
      getOathProgress.mockResolvedValue({
        oath: { metric: "exercise_pr", exerciseId: 99 },
        isFulfilled: false,
        exerciseName: { en: "Pull-ups", fr: "Tractions" },
      });
      getChainTo.mockResolvedValue({
        position: 1,
        rungs: [{ exercise: { id: 99, enName: "Pull-ups", frName: "Tractions" } }],
      });
      findQuestWithExercise.mockResolvedValue(7);
    };

    afterEach(() => {
      getOathProgress.mockResolvedValue(null);
      isOathFrozen.mockResolvedValue(false);
      getChainTo.mockResolvedValue(null);
      findQuestWithExercise.mockResolvedValue(null);
    });

    it("comes after a due oath", async () => {
      runs({ hero: 9 });
      dueOath();
      expect(await decideHomeOffer("en")).toMatchObject({ kind: "oath_exercise" });
    });

    it("a game adventure under way still comes before that oath", async () => {
      runs({ game: 4 });
      dueOath();
      expect(await decideHomeOffer("en")).toMatchObject({ kind: "adventure", adventureId: 4 });
    });

    it("an older game run and a newer hero run with an oath due: the game adventure", async () => {
      runs({ game: 4, hero: 9 });
      dueOath();
      expect(await decideHomeOffer("en")).toMatchObject({ kind: "adventure", adventureId: 4 });
    });

    it("is offered when the oath is frozen, or fulfilled, or there is none", async () => {
      runs({ hero: 9 });
      dueOath();
      isOathFrozen.mockResolvedValue(true);
      expect(await decideHomeOffer("en")).toMatchObject({ kind: "adventure", adventureId: 9 });

      isOathFrozen.mockResolvedValue(false);
      getOathProgress.mockResolvedValue({
        oath: { metric: "exercise_pr", exerciseId: 99 },
        isFulfilled: true,
        exerciseName: null,
      });
      expect(await decideHomeOffer("en")).toMatchObject({ kind: "adventure", adventureId: 9 });

      getOathProgress.mockResolvedValue(null);
      expect(await decideHomeOffer("en")).toMatchObject({ kind: "adventure", adventureId: 9 });
    });

    it("is still offered once retired elsewhere, while its run is under way here", async () => {
      runs({ hero: 9 });
      getAdventureDetails.mockResolvedValue({
        adventure: { enTitle: "Retired", frTitle: "Retirée", imagePath: null, isActive: 0 },
      });
      expect(await decideHomeOffer("en")).toMatchObject({
        kind: "adventure",
        adventureId: 9,
        title: "Retired",
      });
    });
  });
});
