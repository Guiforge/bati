import assert from "node:assert/strict";
import { act, fireEvent, render, screen, within } from "@testing-library/react-native";
import { StyleSheet } from "react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { TamaguiProvider } from "tamagui";

import { ActiveExerciseView } from "@/components/session/ActiveExerciseView";
import { rawColors } from "@/constants/rawColors";
import type { Quest } from "@/db/quests";
import { useSessionStore } from "@/stores/session";
import { useSettingsStore } from "@/stores/settings";
import config from "@/tamagui.config";

/**
 * Two things the running screen got wrong, both about a moment rather than a value.
 *
 * - A tap meant for the previous screen's button (GO, "I'm ready") landed on Done, which sits at
 *   the same place, right after the screen advanced on its own, and logged a set nobody did.
 * - A boss at 0 HP kept promising critical strikes and armour maths for damage that is now zero.
 */

jest.mock("@/hooks/useSetAside");
jest.mock("@/db/client", () => ({ db: {}, schema: {}, runMigrations: jest.fn() }));
jest.mock("@/db/quests", () => ({ isDailyQuest: () => false }));
jest.mock("@/db/preferences", () => ({
  preferences: {
    getSavedSession: jest.fn().mockResolvedValue(null),
    setSavedSession: jest.fn().mockResolvedValue(undefined),
    clearSavedSession: jest.fn().mockResolvedValue(undefined),
    getWarmupEnabled: jest.fn().mockResolvedValue(false),
    getOwnedEquipment: jest.fn().mockResolvedValue(null),
    getSetAsideExercises: jest.fn().mockResolvedValue([]),
  },
}));
jest.mock("@/db", () => ({ preferences: {} }));
jest.mock("@/src/i18n/deviceLanguage", () => ({ getDevicePreferredAppLanguage: () => "en" }));
jest.mock("expo-router", () => ({
  useRouter: () => ({ back: jest.fn(), replace: jest.fn(), canGoBack: () => true }),
}));
jest.mock("@/db/gps", () => ({ appendPoints: jest.fn().mockResolvedValue(undefined) }));
jest.mock("@/modules/bati-location", () => ({
  isAvailable: () => false,
  start: () => false,
  stop: () => undefined,
  addListener: () => ({ remove: () => undefined }),
}));
jest.mock("@/src/sounds", () => ({ playCue: jest.fn(), warm: jest.fn() }));
jest.mock("@/db/exercises", () => ({
  listExercises: () => Promise.resolve([]),
  officialByName: () => undefined,
  pickableExercises: (all: unknown[]) => all,
  checkForNewRungs: jest.fn(),
  ADMIN_CREATOR: "Admin",
}));

import "@/i18n";

const exercise = (id: number, enName: string) => ({
  id,
  enName,
  frName: enName,
  enDescription: null,
  frDescription: null,
  imagePath: "assets/images/exercises/walk.webp",
  creator: "Admin",
  difficulty: "easy",
  equipment: "none",
  style: "strength",
  secondsPerRep: 3,
  muscles: ["core"],
  pattern: "carry",
  prerequisiteExerciseId: null,
  retiredAt: null,
});

const quest = {
  id: 1,
  enTitle: "Round",
  frTitle: "Ronde",
  rounds: 2,
  restSeconds: 30,
  exercises: [
    { exercise: exercise(1, "Pushups"), target: { type: "reps", value: 10 } },
    { exercise: exercise(2, "Squats"), target: { type: "reps", value: 10 } },
  ],
} as unknown as Quest;

const fight = (currentHp: number) => ({
  id: 1,
  adventureId: 1,
  totalHp: 100,
  currentHp,
  weaknessMuscle: "core",
  resistanceMuscle: null,
  defeatedAt: currentHp > 0 ? null : new Date(),
  createdAt: new Date(),
  updatedAt: new Date(),
  imagePath: "unknown-boss.webp",
  enName: "Gorgon",
  frName: "Gorgone",
  deName: "Gorgone",
  esName: "Gorgona",
  tier: 0,
  shiny: false,
});

async function mount(bossFight: ReturnType<typeof fight> | null = null, withQuest: Quest = quest) {
  useSettingsStore.setState({ language: "en", reducedMotion: true });
  useSessionStore.setState({
    quest: withQuest,
    status: "running",
    currentRoundIndex: 0,
    currentExerciseIndex: 0,
    bossFight: bossFight as never,
    warmupSequence: [],
    warmupIndex: 0,
    results: [],
    pendingDamage: [],
    timerStartTimestamp: null,
    timerDuration: 0,
    lastPauseTimestamp: null,
  });
  await act(async () => {
    await render(
      <SafeAreaProvider
        initialMetrics={{
          frame: { x: 0, y: 0, width: 390, height: 844 },
          insets: { top: 0, left: 0, right: 0, bottom: 0 },
        }}
      >
        <TamaguiProvider config={config} defaultTheme="dark">
          <ActiveExerciseView />
        </TamaguiProvider>
      </SafeAreaProvider>,
    );
  });
}

// The real screen in a real Tamagui provider costs tens of seconds to mount: see the note in
// __tests__/session-outing-view.test.tsx.
jest.setTimeout(180_000);

afterEach(() => {
  jest.useRealTimers();
});

describe("Done, right after the screen appears", () => {
  const done = () => screen.getByTestId("session-complete-exercise");

  test("ignores a press inside the first 700 ms, then completes", async () => {
    jest.useFakeTimers();
    await mount();

    await act(() => {
      jest.advanceTimersByTime(100);
    });
    await act(() => fireEvent.press(done()));
    expect(useSessionStore.getState().results).toHaveLength(0);

    await act(() => {
      jest.advanceTimersByTime(700);
    });
    await act(() => fireEvent.press(done()));
    expect(useSessionStore.getState().results).toHaveLength(1);
  });
});

describe("the exercise name over the art", () => {
  test("sits in a récitatif, a header in the title font", async () => {
    await mount();

    const box = screen.getByTestId("exercise-hero-name");
    expect(StyleSheet.flatten(box.props.style).borderTopWidth).toBe(1);
    expect(within(box).getByRole("header")).toBeTruthy();
  });
});

describe("the reps stepper", () => {
  test("draws both signs as icons of one size, not as text glyphs", async () => {
    await mount();

    expect(screen.queryByText("\u2212")).toBeNull();
    expect(screen.queryByText("-")).toBeNull();
    expect(screen.queryByText("+")).toBeNull();
  });

  test("both controls are there, by label", async () => {
    await mount();

    expect(screen.getByLabelText("Decrease reps by one")).toBeTruthy();
    expect(screen.getByLabelText("Increase reps by one")).toBeTruthy();
  });

  test("the three tertiary links reach 44 dp through a vertical slop of 12 or more", async () => {
    const [first, ...rest] = quest.exercises;
    assert(first);
    const described = {
      ...quest,
      exercises: [
        { ...first, exercise: { ...first.exercise, enDescription: "Lower, then press up." } },
        ...rest,
      ],
    } as Quest;
    await mount(null, described);

    for (const id of ["session-how-to", "session-swap-exercise", "session-skip-exercise"]) {
      const slop = screen.getByTestId(id).props.hitSlop;
      const vertical = typeof slop === "number" ? [slop, slop] : [slop.top, slop.bottom];
      expect(vertical.every((v: number) => v >= 12)).toBe(true);
    }
  });
});

describe("a boss that is already down", () => {
  test("drops the crit promise and the weak point, and says the rest is the hero's", async () => {
    await mount(fight(0));

    expect(screen.queryByText(/strike critical/)).toBeNull();
    expect(screen.queryByText(/weak point/)).toBeNull();
    expect(screen.getByText(/is down\. The rest of this session is yours\./)).toBeTruthy();
    expect(screen.getByText(/1-2 reps left in the tank/)).toBeTruthy();
  });

  test("a live fight is unchanged", async () => {
    await mount(fight(60));

    expect(screen.getByText(/strike critical/)).toBeTruthy();
    expect(screen.getByText(/weak point/)).toBeTruthy();
    expect(screen.queryByText(/is down\./)).toBeNull();
  });
});

describe("Done is a seal", () => {
  const edge = () =>
    StyleSheet.flatten(screen.getByTestId("session-complete-exercise").props.style);

  test("carries the 3 px braise edge while the set is under target", async () => {
    await mount();
    expect(edge().borderBottomWidth).toBe(3);
    expect(edge().borderBottomColor).toBe(rawColors.primaryEdge);
  });

  test("past the target it is the green fill: no edge, an ink label", async () => {
    await mount();
    await act(() => {
      useSessionStore.setState({ timerStartTimestamp: Date.now() - 60_000, timerDuration: 5 });
    });
    expect(edge().borderBottomWidth).not.toBe(3);
    expect(screen.getByText("Finish")).toHaveStyle({ color: rawColors.bgDark });
  });
});

describe("a per-side hold", () => {
  const sidePlank = {
    ...quest,
    exercises: [
      {
        exercise: { ...exercise(3, "Side Plank"), perSide: true },
        target: { type: "time", value: 30 },
      },
    ],
  } as unknown as Quest;

  // The store runs side, switch, side (`setTimer`, `src/perSide.ts`); the view counts each phase
  // down, beeps the switch rather than the end-of-set "go", starts the second side on a "go", and
  // logs one side's worth.
  test("counts each side, gives a switch between them, and logs per side", async () => {
    const { playCue } = jest.requireMock("@/src/sounds") as { playCue: jest.Mock };
    const tick = async (seconds: number) => {
      // A second at a time: one big jump lands in one render, which the hook answers with the
      // zero alone, as it does for a phone that slept through the ticks.
      for (let second = 0; second < seconds; second++) {
        await act(() => {
          jest.advanceTimersByTime(1_000);
        });
      }
    };
    jest.useFakeTimers();
    await mount(null, sidePlank);
    await act(() => {
      useSettingsStore.setState({ soundEnabled: true });
      useSessionStore.setState({ timerStartTimestamp: Date.now(), timerDuration: 65 });
    });
    const scaleX = () =>
      (
        StyleSheet.flatten(screen.getByTestId("exercise-hero-art").props.style).transform as
          | { scaleX?: number }[]
          | undefined
      )?.[0]?.scaleX;
    expect(screen.getByTestId("session-side").props.children).toBe("Side 1 of 2");
    expect(screen.getByText("left of 30s per side")).toBeTruthy();
    expect(scaleX()).toBe(1);

    await tick(30);
    expect(screen.getByTestId("session-side").props.children).toBe("Switch sides");
    // The figure turns at the switch, so the hero sees the second side while getting into it.
    expect(scaleX()).toBe(-1);
    expect(screen.getByText("0:05")).toBeTruthy();
    expect(playCue.mock.calls.map(([cue]) => cue)).toEqual(["tick", "tick", "tick", "switch"]);

    await tick(5);
    expect(screen.getByTestId("session-side").props.children).toBe("Side 2 of 2");
    expect(screen.getByText("0:30")).toBeTruthy();
    expect(playCue.mock.calls.map(([cue]) => cue).slice(4)).toEqual(["tick", "tick", "tick", "go"]);

    // 46 s in, eleven into the second side: the full first side stands until the average of the
    // two passes it, so stopping here does not log less than stopping at the switch.
    await act(() => {
      jest.advanceTimersByTime(11_000);
    });
    await act(() => fireEvent.press(screen.getByTestId("session-complete-exercise")));
    expect(useSessionStore.getState().results[0]?.result.value).toBe(30);
  });

  // The hero who stops on the first side because it hurts held what they held. Halving it would
  // write a false record at the worst moment.
  test("a set stopped on the first side logs the time held", async () => {
    jest.useFakeTimers();
    await mount(null, sidePlank);
    await act(() => {
      useSessionStore.setState({ timerStartTimestamp: Date.now(), timerDuration: 65 });
    });
    await act(() => {
      jest.advanceTimersByTime(25_000);
    });
    await act(() => fireEvent.press(screen.getByTestId("session-complete-exercise")));
    expect(useSessionStore.getState().results[0]?.result.value).toBe(25);
  });
});
