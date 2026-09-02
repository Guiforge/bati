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
  useLocalSearchParams: () => ({ id: "5" }),
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

jest.mock("@/stores/settings", () => ({
  useSettingsStore: (selector?: (s: { language: string; distanceUnit: string }) => unknown) => {
    const state = { language: "en", distanceUnit: "metric" };
    return selector ? selector(state) : state;
  },
}));

jest.mock("@/stores/session", () => ({ useSessionStore: () => ({ startSession: jest.fn() }) }));

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
  getQuestConfig: jest.fn().mockResolvedValue(null),
  applyQuestConfig: (quest: unknown) => quest,
  estimateQuestSeconds: jest.fn().mockReturnValue(900),
  estimateQuestXp: jest.fn().mockReturnValue(60),
  formatDurationEstimate: jest.fn().mockReturnValue("15 min"),
  indexExercises: jest.fn().mockReturnValue(new Map()),
  isUserQuest: jest.fn().mockReturnValue(false),
  saveQuestConfig: jest.fn().mockResolvedValue(undefined),
  hasQuestOverrides: jest.fn().mockReturnValue(false),
  ROUNDS_RANGE: { min: 1, max: 10 },
  REST_RANGE: { min: 0, max: 300 },
  targetRangeFor: () => ({ min: 1, max: 999 }),
  DISTANCE_GOAL_RANGE: { min: 500, max: 200000 },
  DISTANCE_GOAL_STEP: 500,
  DEFAULT_DISTANCE_GOAL_M: 3000,
}));

jest.mock("@/db/exercises", () => ({ listExercises: jest.fn().mockResolvedValue([]) }));

jest.mock("@/db/preferences", () => ({
  preferences: { getOwnedEquipment: jest.fn().mockResolvedValue(null) },
}));

jest.mock("@/db/adventures-narrative", () => ({
  getAdventureStepNarrative: jest.fn().mockResolvedValue(null),
}));

/** The two fixtures differ in their slots (a ghost line, a rep target), so the mount takes both. */
type QuestFixture = ReturnType<typeof expeditionQuest> | ReturnType<typeof workoutQuest>;

const mockLoaded: { quest: QuestFixture } = { quest: expeditionQuest() };

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
    expect(view.getByText("Rounds")).toBeTruthy();
    // The control is labelled by its unit, not by the movement: on a one-movement quest the
    // screen has already named it twice above, and the name truncated in a 70 dp column. It now
    // also names the Duration/Distance toggle, so "Duration" appears twice.
    expect(view.getAllByText("Duration").length).toBeGreaterThanOrEqual(1);
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
    // The controls that do something are untouched: rounds, and the outing's own length.
    expect(view.getByText("Rounds")).toBeTruthy();
    expect(view.getAllByText("Duration").length).toBeGreaterThanOrEqual(1);
  });

  test("an outing can be set by distance instead of by duration", async () => {
    const view = await mountQuest(expeditionQuest());
    // fireEvent.press is async here (it wraps the handler in `act`), so the state update it
    // schedules is only guaranteed to have landed once this is awaited.
    await fireEvent.press(view.getByText("Distance"));
    expect(view.getByText("3.00 km")).toBeTruthy();
    await fireEvent.press(view.getByText("Duration"));
    expect(view.queryByText("3.00 km")).toBeNull();
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

  test("a workout offers no distance", async () => {
    const view = await mountQuest(workoutQuest());
    expect(view.queryByText("Distance")).toBeNull();
  });
});
