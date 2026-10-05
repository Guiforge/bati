import { act, fireEvent, render, screen } from "@testing-library/react-native";
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

async function mount(bossFight: ReturnType<typeof fight> | null = null) {
  useSettingsStore.setState({ language: "en", reducedMotion: true });
  useSessionStore.setState({
    quest,
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
