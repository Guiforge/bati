import { act, fireEvent, render, screen } from "@testing-library/react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { TamaguiProvider } from "tamagui";

import { ActiveExerciseView } from "@/components/session/ActiveExerciseView";
import { RestView } from "@/components/session/RestView";
import { WarmupView } from "@/components/session/WarmupView";
import type { Quest } from "@/db/quests";
import { useSessionStore } from "@/stores/session";
import config from "@/tamagui.config";

/**
 * The paused screen was the only place the movement was ever *drawn* and explained, which meant
 * the answer to "what is a dead bug?" cost a pause. The running screen now opens the same block
 * as a modal, from the art or from the row that names it — and stops the clock behind it, which
 * is the half the modal did not have at first.
 *
 * Asserted on the text and the trigger, not on a state flag: the accordion this replaced showed
 * the description with no picture, and a test that only checked "some panel opened" would have
 * been just as green then.
 */

jest.mock("@/db/client", () => ({ db: {}, schema: {}, runMigrations: jest.fn() }));
jest.mock("@/db/quests", () => ({ isDailyQuest: () => false }));
jest.mock("@/db/preferences", () => ({
  preferences: {
    getSavedSession: jest.fn().mockResolvedValue(null),
    setSavedSession: jest.fn().mockResolvedValue(undefined),
    clearSavedSession: jest.fn().mockResolvedValue(undefined),
    getWarmupEnabled: jest.fn().mockResolvedValue(false),
    getOwnedEquipment: jest.fn().mockResolvedValue(null),
  },
}));
jest.mock("@/db", () => ({ preferences: {} }));
jest.mock("@/i18n", () => ({ i18n: { changeLanguage: jest.fn(), t: (key: string) => key } }));
jest.mock("@/src/i18n/deviceLanguage", () => ({ getDevicePreferredAppLanguage: () => "en" }));
jest.mock("expo-router", () => ({
  useRouter: () => ({ back: jest.fn(), replace: jest.fn(), canGoBack: () => true }),
}));

// Same hoisting rule as paused-overlay.test.tsx: a `jest.mock` factory is lifted above every
// other declaration, so anything it reads has to be `mock`-prefixed and self-contained.
const mockDeadBug = {
  id: 1,
  enName: "Dead Bug",
  frName: "Dead Bug",
  enDescription:
    "Lie on your back with your arms straight up and your knees over your hips, then lower one " +
    "arm and the opposite leg without letting your lower back lift off the floor.",
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
  pickableExercises: (all: unknown[]) => all,
  checkForNewRungs: jest.fn(),
  ADMIN_CREATOR: "Admin",
}));

const HOW_TO = mockDeadBug.enDescription;

const mockQuest = {
  id: 1,
  rounds: 1,
  restSeconds: 30,
  exercises: [{ exercise: mockDeadBug, target: { type: "reps", value: 10 } }],
} as unknown as Quest;

async function mount(view: React.ReactElement) {
  await act(async () => {
    // Awaited: this testing-library's `render` is thenable, and a floating one leaves every
    // `screen` query reporting "render function has not been called".
    await render(
      <SafeAreaProvider
        initialMetrics={{
          frame: { x: 0, y: 0, width: 390, height: 844 },
          insets: { top: 0, left: 0, right: 0, bottom: 0 },
        }}
      >
        <TamaguiProvider config={config} defaultTheme="dark">
          {view}
        </TamaguiProvider>
      </SafeAreaProvider>,
    );
  });
}

async function mountRunning() {
  useSessionStore.setState({
    quest: mockQuest,
    status: "running",
    currentRoundIndex: 0,
    currentExerciseIndex: 0,
    bossFight: null,
    warmupSequence: [],
    warmupIndex: 0,
  });

  await mount(<ActiveExerciseView />);
}

async function mountResting() {
  useSessionStore.setState({
    quest: mockQuest,
    status: "resting",
    currentRoundIndex: 0,
    currentExerciseIndex: 0,
    bossFight: null,
    warmupSequence: [],
    warmupIndex: 0,
    results: [],
    timerStartTimestamp: Date.now(),
    timerDuration: 30,
  });

  await mount(<RestView />);
}

async function mountWarmup() {
  useSessionStore.setState({
    quest: mockQuest,
    status: "warmup",
    currentRoundIndex: 0,
    currentExerciseIndex: 0,
    bossFight: null,
    // The step just finished is one the catalogue does not hold, so the only place HOW_TO can
    // come from is the wait before the movement that follows it.
    warmupSequence: [
      { exerciseName: "Jumping Jack", seconds: 30 },
      { exerciseName: mockDeadBug.enName, seconds: 30 },
    ],
    warmupIndex: 1,
    warmupPrep: true,
    timerStartTimestamp: Date.now(),
    timerDuration: 10,
  });

  await mount(<WarmupView />);
}

describe("the movement's instructions, mid-set", () => {
  it("keeps the how-to out of the way until it is asked for", async () => {
    await mountRunning();

    expect(screen.queryByText(HOW_TO)).toBeNull();
  });

  it("opens art and text together on the row that offers it", async () => {
    await mountRunning();

    await act(async () => {
      await fireEvent.press(screen.getByTestId("session-how-to"));
    });

    // The name and the description, inside the modal — the picture beside them is an
    // <Image>, which has no text to assert on and is covered by the component's own props.
    expect(screen.getByTestId("session-instructions")).toBeTruthy();
    expect(screen.getByText(HOW_TO)).toBeTruthy();
  });

  // The rest is the one moment reading is free, and "up next" names the movement worth reading
  // about — the same hook resolves it, because completeExercise advances the index before the
  // rest screen mounts.
  it("opens the same block from the up-next card during a rest", async () => {
    await mountResting();

    expect(screen.queryByText(HOW_TO)).toBeNull();

    await act(async () => {
      await fireEvent.press(screen.getByTestId("rest-up-next"));
    });

    expect(screen.getByTestId("session-instructions")).toBeTruthy();
    expect(screen.getByText(HOW_TO)).toBeTruthy();
  });

  /**
   * Reading the movement used to cost whatever the clock ran while you read. The pause was
   * already the one moment reading is free — it draws the same block — so the modal that made it
   * reachable mid-set inherited the wrong half of that trade: the answer came without stopping
   * the timer, and a hero who did not know the movement paid for finding out.
   *
   * Asserted on `prePauseStatus` as well as `status`: a pause that forgets what it interrupted
   * resumes into "running", which would end a rest early and start a set nobody was ready for.
   */
  it("stops the clock while the movement is being read", async () => {
    await mountRunning();

    await act(async () => {
      await fireEvent.press(screen.getByTestId("session-how-to"));
    });

    expect(useSessionStore.getState().status).toBe("paused");
    expect(useSessionStore.getState().prePauseStatus).toBe("running");
  });

  it("gives the rest its own clock back too, not the set's", async () => {
    await mountResting();

    await act(async () => {
      await fireEvent.press(screen.getByTestId("rest-up-next"));
    });

    expect(useSessionStore.getState().status).toBe("paused");
    expect(useSessionStore.getState().prePauseStatus).toBe("resting");

    await act(async () => {
      await fireEvent.press(screen.getByTestId("session-instructions-close"));
    });

    expect(useSessionStore.getState().status).toBe("resting");
  });

  // A movement the hero has never done and is about to is the strongest case in the flow for
  // reading about it. The warm-up used to answer it with an up-next card that paused the session
  // to be read; the wait before every movement answers it now, with nothing to tap and no clock
  // running on the movement yet.
  it("shows the warm-up's next movement on its wait, without stopping anything", async () => {
    await mountWarmup();

    expect(screen.getByText(HOW_TO)).toBeTruthy();
    expect(useSessionStore.getState().status).toBe("warmup");
    expect(useSessionStore.getState().warmupPrep).toBe(true);
  });

  it("starts the clock again on the way out, so nothing has to be tapped twice", async () => {
    await mountRunning();

    await act(async () => {
      await fireEvent.press(screen.getByTestId("session-how-to"));
    });
    await act(async () => {
      await fireEvent.press(screen.getByTestId("session-instructions-close"));
    });

    expect(useSessionStore.getState().status).toBe("running");
    expect(useSessionStore.getState().prePauseStatus).toBeNull();
  });

  it("closes again, so the set is never trapped behind it", async () => {
    await mountRunning();

    await act(async () => {
      await fireEvent.press(screen.getByTestId("session-how-to"));
    });
    await act(async () => {
      await fireEvent.press(screen.getByTestId("session-instructions-close"));
    });

    expect(screen.queryByText(HOW_TO)).toBeNull();
  });
});
