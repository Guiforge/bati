import { act, fireEvent, render, screen } from "@testing-library/react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { TamaguiProvider } from "tamagui";

import SessionScreen from "@/app/session";
import type { Quest } from "@/db/quests";
import { DEFAULT_LIVE_VIEW, type LiveView, pocketGuarded } from "@/src/gps/liveFigures";
import { useExpeditionStore } from "@/stores/expedition";
import { useSessionStore } from "@/stores/session";
import { useSettingsStore } from "@/stores/settings";
import config from "@/tamagui.config";

/**
 * The anti-pocket protection of "screen on" (D-35 Q3): on foot, with the screen kept on, one hold
 * of the finish button must never end anything by itself. It opens a confirmation instead, and the
 * map stops answering to fingers. Proven on the real session screen, so the same mount also says
 * whether the screen is kept awake at all.
 */

jest.mock("@/hooks/useSetAside");
jest.mock("@/db/client", () => ({ db: {}, schema: {}, runMigrations: jest.fn() }));
jest.mock("@/db/quests", () => ({}));
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
  Redirect: () => null,
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
const mockKeepAwake = jest.fn();
jest.mock("expo-keep-awake", () => ({ useKeepAwake: () => mockKeepAwake() }));

const mockWalk: Record<string, unknown> = {
  id: 1,
  enName: "Walk",
  frName: "Marche",
  enDescription: null,
  frDescription: null,
  imagePath: "assets/images/exercises/walk.webp",
  creator: "Admin",
  difficulty: "easy",
  equipment: "none",
  style: "expedition",
  locomotion: "walk",
  secondsPerRep: 1,
  muscles: ["legs"],
  pattern: "carry",
  prerequisiteExerciseId: null,
  retiredAt: null,
};
const mockPushUp = { ...mockWalk, id: 2, enName: "Push-up", style: "strength", locomotion: null };

jest.mock("@/db/exercises", () => ({
  listExercises: () => Promise.resolve([]),
  officialByName: () => undefined,
  pickableExercises: (all: unknown[]) => all,
  checkForNewRungs: jest.fn(),
  ADMIN_CREATOR: "Admin",
}));

import "@/i18n";

const NOW = 1_700_000_000_000;

function questOf(...slots: (typeof mockWalk)[]): Quest {
  return {
    id: 1,
    enTitle: "The Warden's Round",
    frTitle: "La Ronde du Veilleur",
    rounds: 1,
    restSeconds: 30,
    exercises: slots.map((exercise, i) => ({
      id: i + 1,
      exercise,
      target: { type: "time", value: 900 },
    })),
  } as unknown as Quest;
}

const mockCompleteOuting = jest.fn();
const mockCompleteExercise = jest.fn();

async function mountRunning(quest: Quest, view: Partial<LiveView>) {
  useSettingsStore.setState({ soundEnabled: false, language: "en", reducedMotion: true });
  useExpeditionStore.setState({ fixes: [], view: { ...DEFAULT_LIVE_VIEW, ...view } });
  useSessionStore.setState({
    quest,
    status: "running",
    currentRoundIndex: 0,
    currentExerciseIndex: 0,
    bossFight: null,
    warmupSequence: [],
    warmupIndex: 0,
    results: [],
    timerStartTimestamp: NOW - 600_000,
    timerDuration: 900,
    lastPauseTimestamp: null,
    completeOuting: mockCompleteOuting,
    completeExercise: mockCompleteExercise,
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
          <SessionScreen />
        </TamaguiProvider>
      </SafeAreaProvider>,
    );
  });
}

const hold = async () => {
  await act(async () => {
    await fireEvent(screen.getByTestId("session-complete-exercise"), "longPress");
  });
};

const press = async (testID: string) => {
  await act(async () => {
    await fireEvent.press(screen.getByTestId(testID));
  });
};

const advance = async (ms: number) => {
  await act(async () => {
    await jest.advanceTimersByTimeAsync(ms);
  });
};

jest.setTimeout(180_000);

beforeEach(() => {
  mockKeepAwake.mockClear();
  mockCompleteOuting.mockClear();
  mockCompleteExercise.mockClear();
  jest.spyOn(Date, "now").mockReturnValue(NOW);
});
afterEach(() => {
  jest.useRealTimers();
  jest.restoreAllMocks();
});

const slot = (locomotion: "walk" | "run" | "ride" | null, style = "expedition") =>
  ({ exercise: { style, locomotion } }) as never;

describe("pocketGuarded", () => {
  const pure = { exercises: [slot("walk")] } as never;
  const mixed = { exercises: [slot("walk"), slot(null, "strength")] } as never;
  const on = { keepAwake: true };
  const off = { keepAwake: false };

  test.each([
    ["walk, screen on", pure, slot("walk"), on, true],
    ["run, screen on", pure, slot("run"), on, true],
    ["ride, screen on", pure, slot("ride"), on, false],
    ["walk, screen off", pure, slot("walk"), off, false],
    ["run, screen off", pure, slot("run"), off, false],
    ["a mixed quest's walk leg, setting off", mixed, slot("walk"), off, true],
    ["a mixed quest's ride leg", mixed, slot("ride"), off, false],
    ["a mixed quest's push-ups", mixed, slot(null, "strength"), off, false],
  ])("%s", (_name, quest, current, view, expected) => {
    expect(pocketGuarded(quest, current, view)).toBe(expected);
  });
});

describe("a walk with the screen kept on", () => {
  test("keeps the phone awake, and one hold never ends the outing by itself", async () => {
    await mountRunning(questOf(mockWalk), { keepAwake: true });
    expect(mockKeepAwake).toHaveBeenCalled();

    await hold();
    expect(mockCompleteOuting).not.toHaveBeenCalled();
    expect(screen.getByTestId("confirm-dialog")).toBeTruthy();
    expect(screen.getByText("Finish the outing?")).toBeTruthy();

    // Cancel: nothing written, the outing carries on.
    await press("confirm-dialog-cancel");
    expect(mockCompleteOuting).not.toHaveBeenCalled();
    expect(screen.queryByTestId("confirm-dialog")).toBeNull();

    // Confirm: now, and once.
    await hold();
    await press("confirm-dialog-confirm");
    expect(mockCompleteOuting).toHaveBeenCalledTimes(1);
    expect(mockCompleteExercise).not.toHaveBeenCalled();
  });

  test("10 seconds without an answer close it with nothing written", async () => {
    await mountRunning(questOf(mockWalk), { keepAwake: true });
    jest.useFakeTimers();
    await hold();
    expect(screen.getByTestId("confirm-dialog")).toBeTruthy();
    await advance(10_000);
    expect(screen.queryByTestId("confirm-dialog")).toBeNull();
    expect(mockCompleteOuting).not.toHaveBeenCalled();
  });

  test("the TalkBack action asks too", async () => {
    await mountRunning(questOf(mockWalk), { keepAwake: true });
    await act(async () => {
      await fireEvent(screen.getByTestId("session-complete-exercise"), "accessibilityAction", {
        nativeEvent: { actionName: "finishOuting" },
      });
    });
    expect(mockCompleteOuting).not.toHaveBeenCalled();
    expect(screen.getByTestId("confirm-dialog")).toBeTruthy();
  });
});

describe("a walk with the screen going off, as shipped", () => {
  test("is not kept awake, and one hold ends it as it always did", async () => {
    await mountRunning(questOf(mockWalk), { keepAwake: false });
    expect(mockKeepAwake).not.toHaveBeenCalled();

    await hold();
    expect(mockCompleteOuting).toHaveBeenCalledTimes(1);
    expect(screen.queryByTestId("confirm-dialog")).toBeNull();
  });
});

describe("a ride with the screen kept on", () => {
  test("is kept awake and is not guarded: a handlebar and gloves, one hold ends it", async () => {
    const ride = { ...mockWalk, locomotion: "ride" };
    await mountRunning(questOf(ride), { keepAwake: true, locomotion: "ride" });
    expect(mockKeepAwake).toHaveBeenCalled();

    await hold();
    expect(mockCompleteOuting).toHaveBeenCalledTimes(1);
    expect(screen.queryByTestId("confirm-dialog")).toBeNull();
  });
});

describe("a mixed quest's walking leg", () => {
  // The screen is held for the push-ups whatever the setting says, so the leg is guarded and the
  // hold ends a stretch, not the outing.
  test("asks to finish the stretch, and confirming completes the leg, never the outing", async () => {
    await mountRunning(questOf(mockWalk, mockPushUp), { keepAwake: false });
    expect(mockKeepAwake).toHaveBeenCalled();

    await hold();
    expect(mockCompleteExercise).not.toHaveBeenCalled();
    expect(mockCompleteOuting).not.toHaveBeenCalled();
    expect(screen.getByText("Finish this stretch?")).toBeTruthy();
    expect(screen.getByText(/done walking/)).toBeTruthy();

    await press("confirm-dialog-cancel");
    expect(mockCompleteExercise).not.toHaveBeenCalled();

    await hold();
    await press("confirm-dialog-confirm");
    expect(mockCompleteExercise).toHaveBeenCalledTimes(1);
    expect(mockCompleteOuting).not.toHaveBeenCalled();
  });

  test("its 10 seconds close it without completing either", async () => {
    await mountRunning(questOf(mockWalk, mockPushUp), { keepAwake: false });
    jest.useFakeTimers();
    await hold();
    await advance(10_000);
    expect(screen.queryByTestId("confirm-dialog")).toBeNull();
    expect(mockCompleteExercise).not.toHaveBeenCalled();
    expect(mockCompleteOuting).not.toHaveBeenCalled();
  });
});
