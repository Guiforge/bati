import { act, fireEvent, render } from "@testing-library/react-native";
import { Alert } from "react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { TamaguiProvider } from "tamagui";

import { PausedOverlay } from "@/components/session/PausedOverlay";
import type { Quest } from "@/db/quests";
import { useSessionStore } from "@/stores/session";
import config from "@/tamagui.config";

/**
 * A user wrote in: they did not know what a dead bug was, and the timer kept counting down while
 * they worked it out. Pausing is the one moment reading is free, and it showed three buttons.
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
jest.mock("@/i18n", () => ({ i18n: { changeLanguage: jest.fn(), t: (key: string) => key } }));
jest.mock("@/src/i18n/deviceLanguage", () => ({ getDevicePreferredAppLanguage: () => "en" }));
jest.mock("expo-router", () => ({
  useRouter: () => ({ back: jest.fn(), replace: jest.fn(), canGoBack: () => true }),
}));

/**
 * `mock`-prefixed and self-contained: babel-plugin-jest-hoist lifts a declaration referenced by
 * a `jest.mock` factory above the rest of the module, so a field built from a separate `const`
 * arrives `undefined`. The description is a literal here for that reason, and the assertions
 * read it back off the object rather than keeping a second copy.
 */
const mockDeadBug = {
  id: 1,
  enName: "Dead Bug",
  frName: "Dead Bug",
  enDescription:
    "Lie on your back with your arms straight up and your knees over your hips, then lower one arm and the opposite leg without letting your lower back lift off the floor.",
  frDescription: "Allongé sur le dos, descends un bras et la jambe opposée.",
  imagePath: "assets/images/exercises/dead_bug.webp",
  creator: "Admin",
  difficulty: "medium",
  equipment: "none",
  style: "strength",
  secondsPerRep: 3,
  muscles: ["abs"],
  pattern: "core",
  prerequisiteExerciseId: null,
  retiredAt: null,
};

jest.mock("@/db/exercises", () => ({
  listExercises: () => Promise.resolve([mockDeadBug]),
  officialByName: (catalogue: { enName: string }[], enName: string) =>
    catalogue.find((e) => e.enName === enName),
}));

const HOW_TO = mockDeadBug.enDescription;

const mockQuest = {
  id: 1,
  rounds: 1,
  restSeconds: 30,
  exercises: [{ exercise: mockDeadBug, target: { type: "reps", value: 10 } }],
} as unknown as Quest;

async function mountPaused() {
  let result!: ReturnType<typeof render>;
  await act(() => {
    result = render(
      <SafeAreaProvider
        initialMetrics={{
          frame: { x: 0, y: 0, width: 390, height: 844 },
          insets: { top: 0, left: 0, right: 0, bottom: 0 },
        }}
      >
        <TamaguiProvider config={config} defaultTheme="dark">
          <PausedOverlay />
        </TamaguiProvider>
      </SafeAreaProvider>,
    );
  });
  return result;
}

describe("PausedOverlay", () => {
  it("shows the current movement's whole how-to while paused", async () => {
    useSessionStore.setState({
      quest: mockQuest,
      status: "paused",
      prePauseStatus: "running",
      currentRoundIndex: 0,
      currentExerciseIndex: 0,
      warmupSequence: [],
      warmupIndex: 0,
    });

    const paused = await mountPaused();

    expect(paused.getByText("Dead Bug")).toBeTruthy();
    // The whole description, not a truncated head: the clock is stopped, so reading is free.
    expect(paused.getByText(HOW_TO)).toBeTruthy();
  });

  it("shows the warm-up movement when the pause happened during the warm-up", async () => {
    useSessionStore.setState({
      quest: mockQuest,
      status: "paused",
      prePauseStatus: "warmup",
      currentRoundIndex: 0,
      currentExerciseIndex: 0,
      warmupSequence: [{ exerciseName: "Dead Bug", seconds: 30 }],
      warmupIndex: 0,
    });

    const paused = await mountPaused();

    expect(paused.getByText(HOW_TO)).toBeTruthy();
  });

  it("renders nothing but the buttons when the session has no quest to describe", async () => {
    useSessionStore.setState({
      quest: null,
      status: "paused",
      prePauseStatus: "running",
      currentRoundIndex: 0,
      currentExerciseIndex: 0,
      warmupSequence: [],
      warmupIndex: 0,
    });

    const paused = await mountPaused();

    expect(paused.queryByText("Dead Bug")).toBeNull();
    expect(paused.getByTestId("session-resume")).toBeTruthy();
  });
});

/**
 * Two buttons on this card destroy work, and only one of them sounds like it.
 *
 * Asserted on the results in the store, not on "an alert appeared": the point is that the sets
 * survive the first tap and only go when the hero says so. A test that watched the dialog would
 * pass just as happily against a dialog wired to nothing.
 */
describe("restarting a round", () => {
  const twoLoggedSets = [
    { roundIndex: 0, exerciseIndex: 0, result: { type: "reps" as const, value: 12 } },
    { roundIndex: 0, exerciseIndex: 1, result: { type: "reps" as const, value: 10 } },
  ];

  function pauseWithTwoSets() {
    useSessionStore.setState({
      quest: mockQuest,
      status: "paused",
      prePauseStatus: "running",
      currentRoundIndex: 0,
      currentExerciseIndex: 2,
      warmupSequence: [],
      warmupIndex: 0,
      results: twoLoggedSets as never,
      pendingDamage: [],
      bossFight: null,
    });
  }

  it("keeps every logged set until the hero confirms", async () => {
    const alert = jest.spyOn(Alert, "alert").mockImplementation(() => undefined);
    pauseWithTwoSets();
    const paused = await mountPaused();

    await act(async () => {
      await fireEvent.press(paused.getByTestId("session-restart-round"));
    });

    // One tap used to be the whole gesture, on the button sitting directly above the *guarded*
    // one, wearing a label that reads additive.
    expect(useSessionStore.getState().results).toHaveLength(2);
    expect(alert).toHaveBeenCalledTimes(1);
    alert.mockRestore();
  });

  it("drops this round's sets once they do", async () => {
    let destructive: (() => void) | undefined;
    const alert = jest.spyOn(Alert, "alert").mockImplementation((_title, _body, buttons) => {
      destructive = buttons?.find((b) => b.style === "destructive")?.onPress as () => void;
    });
    pauseWithTwoSets();
    const paused = await mountPaused();

    await act(async () => {
      await fireEvent.press(paused.getByTestId("session-restart-round"));
    });
    await act(() => {
      destructive?.();
    });

    expect(useSessionStore.getState().results).toHaveLength(0);
    alert.mockRestore();
  });
});
