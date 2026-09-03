import assert from "node:assert/strict";

import { fireEvent, render, waitFor } from "@testing-library/react-native";
import { TamaguiProvider } from "tamagui";

import QuestDetails from "@/app/(tabs)/quests/[id]";
import "@/i18n";
import config from "@/tamagui.config";

// A device review of the three expeditions found the quest screen saying three things that were
// not true: a target of "900s", a rest that is never taken, and two rest steppers on a quest with
// one movement and one round. All three are quest *shape* rather than expedition specials, so the
// second half of this file runs the same screen on an ordinary three-round workout and pins that
// nothing was hidden from it.

jest.mock("expo-router", () => ({
  useRouter: () => ({
    push: jest.fn(),
    back: jest.fn(),
    navigate: jest.fn(),
    dismissTo: jest.fn(),
  }),
  // Read at call time: one test puts a `?level=hard` on the route to prove an outing ignores it.
  useLocalSearchParams: () => mockParams,
  // The screen loads on focus; in tests "focused" is simply "mounted".
  useFocusEffect: (effect: () => undefined | (() => void)) => {
    const { useEffect } = require("react");
    useEffect(effect, [effect]);
  },
}));

jest.mock(
  "react-native-safe-area-context",
  () => require("react-native-safe-area-context/jest/mock").default,
);

// The goal sheet animates; nothing here is about motion, and the picker's own tests mock it the
// same way. Not the rule under test — the sheet's content is.
jest.mock("@/hooks/useReducedMotion", () => ({ useReducedMotion: () => true }));

// Read at call time, like the route params: one test runs the whole screen as an imperial hero.
jest.mock("@/stores/settings", () => ({
  useSettingsStore: (selector?: (s: typeof mockSettings) => unknown) =>
    selector ? selector(mockSettings) : mockSettings,
}));

jest.mock("@/stores/session", () => ({
  useSessionStore: () => ({ startSession: mockStartSession }),
}));

const mockParams: { id: string; level?: string } = { id: "5" };
const mockSettings = { language: "en", distanceUnit: "metric" };
const mockStartSession = jest.fn().mockResolvedValue(undefined);

jest.mock("@/components/common/Toast", () => ({
  useToast: () => ({ showError: jest.fn(), showSuccess: jest.fn(), showInfo: jest.fn() }),
}));

// Function declarations, not consts: babel-plugin-jest-hoist lifts the jest.mock() calls above
// every import and therefore above every `const` in this file. A declaration is fully hoisted, so
// the factory below may call it. See the same note in quest-details-navigation.test.tsx.
function movement(over: Record<string, unknown>) {
  return {
    id: 21,
    enName: "Warden's Walk",
    frName: "Marche du Veilleur",
    enDescription: "",
    frDescription: "",
    muscles: [],
    equipment: "none",
    secondsPerRep: 1,
    imagePath: null,
    style: "strength",
    ...over,
  };
}

/** The Warden's Round as seeded (drizzle/0042): one round, one movement, a 900 s target. */
function expeditionQuest() {
  return {
    id: 5,
    enTitle: "The Warden's Round",
    frTitle: "La Ronde du Veilleur",
    enDescription: "",
    frDescription: "",
    imagePath: null,
    archetype: "metabolic",
    rounds: 1,
    restSeconds: 30,
    roundRestSeconds: null,
    exercises: [
      {
        id: 11,
        images: [],
        substitutedFor: null,
        ghost: { last: 720, best: 900 },
        target: { type: "time", value: 900 },
        exercise: movement({ style: "expedition" }),
      },
    ],
  };
}

/**
 * A quest a hero could write in the editor: two outdoor movements, nothing stopping the
 * combination (`docs/designs/expeditions.md` — "a hero can put a walk in a quest next to
 * anything"). Distance mode must show one distance control here, not one per slot.
 */
function twoSlotOutingQuest() {
  return {
    ...expeditionQuest(),
    enTitle: "The Twin Trail",
    exercises: [
      {
        id: 11,
        images: [],
        substitutedFor: null,
        ghost: null,
        target: { type: "time", value: 900 },
        exercise: movement({ style: "expedition" }),
      },
      {
        id: 12,
        images: [],
        substitutedFor: null,
        ghost: null,
        target: { type: "time", value: 600 },
        exercise: movement({
          id: 22,
          enName: "Messenger's Run",
          frName: "Course du Messager",
          style: "expedition",
        }),
      },
    ],
  };
}

/** An ordinary workout: three rounds, two movements — every control has something to change. */
function workoutQuest() {
  return {
    ...expeditionQuest(),
    enTitle: "The Iron Vigil",
    rounds: 3,
    exercises: [
      {
        id: 11,
        images: [],
        substitutedFor: null,
        ghost: null,
        target: { type: "reps", value: 12 },
        exercise: movement({ enName: "Push-up" }),
      },
      {
        id: 12,
        images: [],
        substitutedFor: null,
        ghost: null,
        target: { type: "time", value: 45 },
        exercise: movement({ id: 22, enName: "Plank" }),
      },
    ],
  };
}

jest.mock("@/db", () => ({
  Difficulty: { Easy: "easy", Medium: "medium", Hard: "hard" },
  // Read at call time, so each test may set it before mounting.
  getQuestById: jest.fn(() => Promise.resolve(mockLoaded.quest)),
  // Read at call time, like the quest above: a saved `hard` is what an outing has to ignore.
  getQuestConfig: jest.fn(() => Promise.resolve(mockSaved.config)),
  // Records the config it is handed, because the level in there is what retargets a swapped
  // movement — generated at one level and retargeted at another is the trap this pins.
  // Not identity: the targets a config carries are exactly what this screen then hands to
  // `startSession` as the goal, so a stub that drops them would let a duration chosen in the
  // sheet vanish between the sheet and the walk without a single test moving. Keyed the way the
  // real one keys, on the quest exercise id.
  applyQuestConfig: jest.fn((quest: unknown, config: unknown) => {
    const q = quest as { exercises: { id: number; target: { value: number } }[] };
    const targets = (config as { targets?: Record<string, number> }).targets ?? {};
    return {
      ...q,
      exercises: q.exercises.map((qex) => {
        const value = targets[String(qex.id)];
        return value === undefined ? qex : { ...qex, target: { ...qex.target, value } };
      }),
    };
  }),
  estimateQuestSeconds: jest.fn().mockReturnValue(900),
  estimateQuestXp: jest.fn().mockReturnValue(60),
  formatDurationEstimate: jest.fn().mockReturnValue("15 min"),
  indexExercises: jest.fn().mockReturnValue(new Map()),
  isUserQuest: jest.fn().mockReturnValue(false),
  saveQuestConfig: jest.fn().mockResolvedValue(undefined),
  hasQuestOverrides: jest.fn().mockReturnValue(false),
  ROUNDS_RANGE: { min: 1, max: 10 },
  REST_RANGE: { min: 0, max: 300 },
  // The real ceilings: `TIME_TARGET_MAX` is what a 60-minute preset lands exactly on, so a mock
  // that capped every type at 999 would have quietly turned an hour into sixteen minutes.
  targetRangeFor: (type: string) =>
    type === "time" ? { min: 1, max: 3600 } : { min: 1, max: 999 },
  DISTANCE_GOAL_RANGE: { min: 500, max: 200000 },
}));

jest.mock("@/db/exercises", () => ({ listExercises: jest.fn().mockResolvedValue([]) }));

jest.mock("@/db/preferences", () => ({
  preferences: { getOwnedEquipment: jest.fn().mockResolvedValue(null) },
}));

jest.mock("@/db/adventures-narrative", () => ({
  getAdventureStepNarrative: jest.fn().mockResolvedValue(null),
}));

/** The fixtures differ in their slots (a ghost line, a rep target), so the mount takes any of them. */
type QuestFixture =
  | ReturnType<typeof expeditionQuest>
  | ReturnType<typeof twoSlotOutingQuest>
  | ReturnType<typeof workoutQuest>;

const mockLoaded: { quest: QuestFixture } = { quest: expeditionQuest() };
const mockSaved: { config: { level: string } | null } = { config: null };

beforeEach(() => {
  mockLoaded.quest = expeditionQuest();
  mockSaved.config = null;
  mockParams.id = "5";
  delete mockParams.level;
  mockSettings.distanceUnit = "metric";
  mockStartSession.mockClear();
  const db = require("@/db");
  db.getQuestById.mockClear();
  db.applyQuestConfig.mockClear();
  db.estimateQuestXp.mockClear();
  db.saveQuestConfig.mockClear();
});

/**
 * What the screen has decided to run, read off the write it persists.
 *
 * `applyQuestConfig` is mocked to the identity here, so a config change never comes back around
 * as new text on screen: the saved config is the only honest witness to what a tap wrote.
 */
function lastSavedConfig(): Record<string, unknown> {
  const db = require("@/db");
  const call = db.saveQuestConfig.mock.calls.at(-1);
  assert(call);
  return call[1];
}

async function mountQuest(quest: QuestFixture) {
  mockLoaded.quest = quest;
  const view = await render(
    <TamaguiProvider config={config} defaultTheme="dark">
      <QuestDetails />
    </TamaguiProvider>,
  );
  await waitFor(() => expect(view.getByText(quest.enTitle)).toBeTruthy());
  return view;
}

describe("an expedition on the quest screen", () => {
  test("its target reads as a duration, not as a three-digit second count", async () => {
    const { getAllByText, queryByText } = await mountQuest(expeditionQuest());

    // Twice now, and both have to read the same way: the chip on the movement's row, and the
    // stepper in the config panel, which opens by itself on a quest this shape. The stepper is
    // where "900s" came back, because seconds are the unit it *moves* in.
    expect(getAllByText("15 min").length).toBeGreaterThanOrEqual(2);
    expect(queryByText("900s")).toBeNull();
  });

  test("the panel that sets its length is already open", async () => {
    const view = await mountQuest(expeditionQuest());

    // One movement, one round: this panel holds a single control, and on an outing that control
    // is the whole decision. Collapsed, setting a 45-minute run cost a scroll and two taps
    // behind a Start button that was already on screen.
    //
    // And the single control really is single now. "Rounds" used to sit above it asking how
    // many times the hero meant to walk, a question an outing cannot answer: it is one round of
    // one movement by definition.
    expect(view.queryByText("Rounds")).toBeNull();
    // One line, naming the unit the outing will actually go by, and one way to change it.
    expect(view.getAllByText("Duration")).toHaveLength(1);
    expect(view.getByText("Set up the outing")).toBeTruthy();
  });

  /**
   * Constat 3 of the audit: the goal was a stepper moving five seconds at a time, so 15 min to
   * 45 min was 360 taps and 21.1 km was not on its grid at all. A stepper's own −/+ pair is what
   * proves it is gone — the label alone survives on the row that names the goal.
   */
  test("its goal is a sheet, not a five-second stepper", async () => {
    const view = await mountQuest(expeditionQuest());

    expect(view.queryByLabelText("Decrease Duration")).toBeNull();
    expect(view.queryByLabelText("Increase Duration")).toBeNull();

    await fireEvent.press(view.getByText("Set up the outing"));
    expect(view.getByText("How long, or how far")).toBeTruthy();
    // Both units are reachable from the one sheet, and the presets are the numbers a hero says.
    expect(view.getByText("30 min")).toBeTruthy();
  });

  test("a preset writes the duration the hero tapped", async () => {
    const view = await mountQuest(expeditionQuest());

    await fireEvent.press(view.getByText("Set up the outing"));
    await fireEvent.press(view.getByText("45 min"));

    expect(lastSavedConfig()).toMatchObject({ targets: { "11": 2700 } });
    // A duration is a duration: any distance left behind would keep winning in `outingGoal`.
    expect(lastSavedConfig()).not.toHaveProperty("distanceM");
  });

  test("the ghost line speaks the same unit as the target above it", async () => {
    const { getByText, queryByText } = await mountQuest(expeditionQuest());

    expect(getByText("Last: 12 min")).toBeTruthy();
    expect(queryByText("Last: 720s")).toBeNull();
  });

  test("no rest is promised on a quest that never takes one", async () => {
    const { queryByText } = await mountQuest(expeditionQuest());

    expect(queryByText("Rest 30s")).toBeNull();
  });

  test("neither rest stepper is offered — one movement, one round", async () => {
    const view = await mountQuest(expeditionQuest());

    expect(view.queryByText("Rest")).toBeNull();
    expect(view.queryByText("Round rest")).toBeNull();
    // Nor rounds: the only control left is the one that decides how far the hero is going.
    expect(view.queryByText("Rounds")).toBeNull();
    expect(view.getAllByText("Duration")).toHaveLength(1);
  });

  test("the Distance tab writes metres, and a duration takes them back off", async () => {
    const view = await mountQuest(expeditionQuest());

    // fireEvent.press is async here (it wraps the handler in `act`), so the state update it
    // schedules is only guaranteed to have landed once this is awaited.
    await fireEvent.press(view.getByText("Set up the outing"));
    await fireEvent.press(view.getByText("Distance"));
    await fireEvent.press(view.getByText("5.00 km"));

    expect(lastSavedConfig()).toMatchObject({ distanceM: 5000 });
    // `outingGoal` says a distance beats a duration, so the screen names the distance and stops
    // naming the seconds — one goal, and it is the one that will actually start. The movement's
    // own target chip goes with it: "15 min" beside a 5 km goal is a screen arguing with itself.
    expect(view.getByText("5.00 km")).toBeTruthy();
    expect(view.queryByText("15 min")).toBeNull();

    await fireEvent.press(view.getByText("Set up the outing"));
    await fireEvent.press(view.getByText("Duration"));
    await fireEvent.press(view.getByText("20 min"));

    expect(lastSavedConfig()).not.toHaveProperty("distanceM");
    expect(view.queryByText("5.00 km")).toBeNull();
  });

  test("the sheet reopens on the unit that is going to run", async () => {
    const view = await mountQuest(expeditionQuest());

    await fireEvent.press(view.getByText("Set up the outing"));
    await fireEvent.press(view.getByText("Distance"));
    await fireEvent.press(view.getByText("10.00 km"));

    // Reopened, it offers distances: a hero who saved 10 km and came back would otherwise be
    // editing minutes that `outingGoal` has already decided to ignore.
    await fireEvent.press(view.getByText("Set up the outing"));
    expect(view.getByText("21.10 km")).toBeTruthy();
    expect(view.queryByText("30 min")).toBeNull();
  });

  /**
   * The other half of constat 3: 21.1 km is not a multiple of the 500 m the stepper moved in, so
   * a half marathon was unreachable however many taps the hero was willing to spend.
   */
  test("Other takes a value the presets never offered", async () => {
    const view = await mountQuest(expeditionQuest());

    await fireEvent.press(view.getByText("Set up the outing"));
    await fireEvent.press(view.getByText("Distance"));
    // A comma is what a French keyboard puts under the thumb.
    await fireEvent.changeText(view.getByPlaceholderText("Enter your own value"), "12,4");
    await fireEvent.press(view.getByText("Done"));

    expect(lastSavedConfig()).toMatchObject({ distanceM: 12_400 });
  });

  /**
   * The presets have to be the numbers the hero's own system is written in. 5 km / 10 km / half
   * marathon become 3 mi / 6 mi / 13.1 mi: the same three distances, named the way they are named
   * over there, rather than a 5 km offered as "3.11 mi".
   */
  test("an imperial hero is offered miles, and gets metres in the config", async () => {
    mockSettings.distanceUnit = "imperial";
    const view = await mountQuest(expeditionQuest());

    await fireEvent.press(view.getByText("Set up the outing"));
    await fireEvent.press(view.getByText("Distance"));
    expect(view.getByText("3.00 mi")).toBeTruthy();
    expect(view.queryByText("5.00 km")).toBeNull();
    await fireEvent.press(view.getByText("13.10 mi"));

    // Metres are the storage unit and the only storage unit, whatever the hero reads.
    expect(lastSavedConfig()).toMatchObject({ distanceM: 21_082 });

    // And what is typed is read in miles too: 2 mi, not 2 km.
    await fireEvent.press(view.getByText("Set up the outing"));
    await fireEvent.changeText(view.getByPlaceholderText("Enter your own value"), "2");
    await fireEvent.press(view.getByText("Done"));
    expect(lastSavedConfig()).toMatchObject({ distanceM: 3219 });
  });

  test("switching tabs decides nothing until a value is picked", async () => {
    const view = await mountQuest(expeditionQuest());
    const db = require("@/db");

    await fireEvent.press(view.getByText("Set up the outing"));
    await fireEvent.press(view.getByText("Distance"));

    // The old chips wrote the default distance on every tap, so a hero who glanced away and
    // tapped the unit they were already on lost the 500 m they had dialled — silently, and
    // saved over. A tab is a view of the presets, and nothing is written until one is tapped.
    expect(db.saveQuestConfig).not.toHaveBeenCalled();
  });

  /**
   * `stores/expedition` asks Android for the location permission during the countdown, which is
   * the worst possible moment to meet a system dialog with no idea what asked for it. The screen
   * that commits to the walk is where the promise belongs, and it is only a promise on a walk.
   */
  test("says what it will read, and where it stays, before the button that starts it", async () => {
    const view = await mountQuest(expeditionQuest());

    expect(view.getByTestId("quest-location-notice")).toBeTruthy();
    expect(
      view.getByText("Bati reads your position while you are out. It stays on this phone."),
    ).toBeTruthy();
  });

  /**
   * The level stretches an outing's duration (675 / 900 / 1125 s) and multiplies its payout
   * (×0.9 / ×1 / ×1.2) for ground that is already paid by the metre. Offering the choice was
   * offering to overwrite the duration the hero had just dialled by hand.
   */
  test("offers no level, because a walk has none to offer", async () => {
    const view = await mountQuest(expeditionQuest());

    expect(view.queryByText("Level")).toBeNull();
    expect(view.queryByText("Easy")).toBeNull();
    expect(view.queryByText("Medium")).toBeNull();
    expect(view.queryByText("Hard")).toBeNull();
    expect(view.queryByText("Baseline targets · XP ×1")).toBeNull();
  });

  test("loads and starts at medium even with a hard saved on it", async () => {
    mockSaved.config = { level: "hard" };
    const view = await mountQuest(expeditionQuest());
    const db = require("@/db");

    // The first read is what says this is an outing at all, so a saved level may reach
    // `getQuestById` once. What must never happen is the screen settling on it.
    await waitFor(() => {
      const last = db.getQuestById.mock.calls.at(-1);
      expect(last).toEqual([5, "medium"]);
    });

    // The trap the review named: `applyQuestConfig` reads `config.level` of its own for
    // `retargetForMovement`, so a level that outranks the config out here has to outrank it in
    // there too — otherwise a swapped slot is retargeted at a level the generation never used.
    expect(db.applyQuestConfig.mock.calls.at(-1)?.[1]).toMatchObject({ level: "medium" });

    await fireEvent.press(view.getByTestId("quest-start"));

    // Started, not merely estimated: the estimate was already medium while the session ran hard.
    await waitFor(() => expect(mockStartSession).toHaveBeenCalledTimes(1));
    expect(mockStartSession.mock.calls[0]?.[1]).toBe("medium");
  });

  test("the goal the hero set is what the session sets out with", async () => {
    // The whole point of the sheet, and nothing was watching the argument that carries it: with
    // `goal` left null the session starts free, so a hero who chose 5 km gets no buzz at 5 km, no
    // "goal reached", and a journal row written with no target. The sheet would be decoration.
    const view = await mountQuest(expeditionQuest());

    await fireEvent.press(view.getByText("Set up the outing"));
    await fireEvent.press(view.getByText("Distance"));
    await fireEvent.press(view.getByText("5.00 km"));
    await fireEvent.press(view.getByTestId("quest-start"));

    await waitFor(() => expect(mockStartSession).toHaveBeenCalledTimes(1));
    expect(mockStartSession.mock.calls[0]?.[2]).toMatchObject({
      goal: { type: "distance", metres: 5000 },
    });
  });

  test("and a duration travels the same way", async () => {
    const view = await mountQuest(expeditionQuest());

    await fireEvent.press(view.getByText("Set up the outing"));
    await fireEvent.press(view.getByText("45 min"));
    await fireEvent.press(view.getByTestId("quest-start"));

    await waitFor(() => expect(mockStartSession).toHaveBeenCalledTimes(1));
    expect(mockStartSession.mock.calls[0]?.[2]).toMatchObject({
      goal: { type: "time", seconds: 2700 },
    });
  });

  test("ignores a level handed to it by the route", async () => {
    mockParams.level = "hard";
    const view = await mountQuest(expeditionQuest());
    const db = require("@/db");

    await waitFor(() => expect(db.getQuestById.mock.calls.at(-1)).toEqual([5, "medium"]));

    await fireEvent.press(view.getByTestId("quest-start"));
    await waitFor(() => expect(mockStartSession).toHaveBeenCalledTimes(1));
    expect(mockStartSession.mock.calls[0]?.[1]).toBe("medium");
  });

  test("a quest with two outdoor movements has one goal, not one per slot", async () => {
    const view = await mountQuest(twoSlotOutingQuest());
    // Two slots, so the panel does not open by itself — the config it holds is no longer a
    // single control the hero came here to set.
    await fireEvent.press(view.getByLabelText("Adjust this quest"));
    // 900 s + 600 s: `outingGoal` sums the outdoor timed slots, so that sum is the goal.
    expect(view.getByText("25 min")).toBeTruthy();

    await fireEvent.press(view.getByText("Set up the outing"));
    await fireEvent.press(view.getByText("Distance"));
    await fireEvent.press(view.getByText("5.00 km"));

    // `config.distanceM` is one value for the whole quest: one control, however many movements.
    expect(view.getAllByText("5.00 km")).toHaveLength(1);
  });

  test("a duration on a two-leg outing still adds up to the one the hero picked", async () => {
    const view = await mountQuest(twoSlotOutingQuest());
    await fireEvent.press(view.getByLabelText("Adjust this quest"));
    await fireEvent.press(view.getByText("Set up the outing"));
    await fireEvent.press(view.getByText("60 min"));

    // Spread in proportion to what the legs held (900 / 600 of 1500), because `outingGoal` reads
    // the sum: writing 3600 to one slot would have promised 70 minutes of walking.
    const targets = lastSavedConfig().targets;
    expect(targets).toEqual({ "11": 2160, "12": 1440 });
  });
});

describe("an ordinary workout keeps every control", () => {
  test("the rest chip and both rest steppers are still there", async () => {
    const view = await mountQuest(workoutQuest());

    expect(view.getByText("Rest 30s")).toBeTruthy();

    await fireEvent.press(view.getByLabelText("Adjust this quest"));

    expect(view.getByText("Rest")).toBeTruthy();
    expect(view.getByText("Round rest")).toBeTruthy();
  });

  test("a short hold still reads in seconds — only long targets become minutes", async () => {
    const { getByText } = await mountQuest(workoutQuest());

    expect(getByText("45s")).toBeTruthy();
    expect(getByText("12 reps")).toBeTruthy();
  });

  test("promises nothing about a position it will never read", async () => {
    const view = await mountQuest(workoutQuest());

    expect(view.queryByTestId("quest-location-notice")).toBeNull();
  });

  /**
   * A walk that ends in push-ups is not an outing by the strict predicate, and the session store
   * starts the tracker on the generous one, so Android asks. Gated on `isOutingSession`, as it
   * first was, this hero met the system dialog during the countdown with nothing having said why.
   */
  test("a quest that only starts outdoors still says what it will read", async () => {
    const mixed = workoutQuest();
    const [first, ...rest] = mixed.exercises;
    assert(first);
    const view = await mountQuest({
      ...mixed,
      exercises: [{ ...first, exercise: { ...first.exercise, style: "expedition" } }, ...rest],
    });

    expect(view.getByTestId("quest-location-notice")).toBeTruthy();
  });

  test("still chooses its level, and runs at the one it chose", async () => {
    mockSaved.config = { level: "hard" };
    const view = await mountQuest(workoutQuest());
    const db = require("@/db");

    expect(view.getByText("Level")).toBeTruthy();
    expect(view.getByText("Targets +25% · XP ×1.2")).toBeTruthy();

    await waitFor(() => expect(db.getQuestById.mock.calls.at(-1)).toEqual([5, "hard"]));

    await fireEvent.press(view.getByTestId("quest-start"));
    await waitFor(() => expect(mockStartSession).toHaveBeenCalledTimes(1));
    expect(mockStartSession.mock.calls[0]?.[1]).toBe("hard");
  });

  test("a workout offers no distance", async () => {
    const view = await mountQuest(workoutQuest());
    expect(view.queryByText("Distance")).toBeNull();
    expect(view.queryByText("Set up the outing")).toBeNull();
  });

  /**
   * The five-second stepper leaves outings and nothing else. A hold is dialled in seconds by
   * people who mean seconds, and 45 to 50 is one tap rather than 360.
   */
  test("a hold still moves five seconds at a time", async () => {
    const view = await mountQuest(workoutQuest());
    await fireEvent.press(view.getByLabelText("Adjust this quest"));

    await fireEvent.press(view.getByLabelText("Increase Plank"));

    expect(lastSavedConfig()).toMatchObject({ targets: { "12": 50 } });
  });
});
