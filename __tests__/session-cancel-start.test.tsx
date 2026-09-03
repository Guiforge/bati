import { act, fireEvent, render, screen } from "@testing-library/react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { TamaguiProvider } from "tamagui";
import config from "@/tamagui.config";

/**
 * The two things `app/session.tsx` decides on its own, both of them about a session that is
 * happening outdoors with the phone in a pocket.
 *
 * The screen is rendered whole rather than the banner alone, because both facts are about what
 * the *screen* mounts: the keep-awake child is not a prop anyone can inspect, and the banner's
 * whole design claim is that it owns no room in the screen's layout. Its children are stubbed to
 * nothing - they have their own tests, and mounting the boss arena to look at a five-second
 * banner is how a suite gets slow.
 */

const mockUseKeepAwake = jest.fn();
jest.mock("expo-keep-awake", () => ({ useKeepAwake: () => mockUseKeepAwake() }));
jest.mock("expo-router", () => ({ Redirect: () => null }));
jest.mock("react-i18next", () => ({ useTranslation: () => ({ t: (k: string) => k }) }));

jest.mock("@/components/session/ActiveExerciseView", () => ({ ActiveExerciseView: () => null }));
jest.mock("@/components/session/BossTauntOverlay", () => ({ BossTauntOverlay: () => null }));
jest.mock("@/components/session/CountdownView", () => ({ CountdownView: () => null }));
jest.mock("@/components/session/PausedOverlay", () => ({ PausedOverlay: () => null }));
jest.mock("@/components/session/RestView", () => ({ RestView: () => null }));
jest.mock("@/components/session/VictoryView", () => ({ VictoryView: () => null }));
jest.mock("@/components/session/WarmupView", () => ({ WarmupView: () => null }));

type Slot = { exercise: { style: string } };
const OUTING: { exercises: Slot[] } = { exercises: [{ exercise: { style: "expedition" } }] };
const WORKOUT: { exercises: Slot[] } = { exercises: [{ exercise: { style: "reps" } }] };

const mockQuit = jest.fn();
let mockSession: Record<string, unknown> = {};
jest.mock("@/stores/session", () => ({
  useSessionStore: (selector: (s: Record<string, unknown>) => unknown) => selector(mockSession),
}));

let mockExpedition: { sessionUuid: string | null; error: string | null } = {
  sessionUuid: null,
  error: null,
};
jest.mock("@/stores/expedition", () => ({
  useExpeditionStore: (selector: (s: typeof mockExpedition) => unknown) => selector(mockExpedition),
}));

import SessionScreen from "@/app/session";

function setSession(quest: unknown, goal: unknown, startedMsAgo = 0) {
  mockSession = {
    status: "running",
    prePauseStatus: null,
    quest,
    goal,
    // The banner only claims a walk this screen started. Fresh by default, because that is what
    // every case below is about; the one that resumes an old walk says so.
    startTime: Date.now() - startedMsAgo,
    pauseSession: jest.fn(),
    quitSession: mockQuit,
    currentRoundIndex: 0,
    currentExerciseIndex: 0,
  };
}

/**
 * The forty minutes this banner must never offer to throw away.
 *
 * It deletes the session and its GPS points on one tap, which is the right price for a mistap and
 * a catastrophe for a walk in progress. Both the recovery card and the tile on Home push this
 * screen afresh on a session that is already running, so a rule read from the store alone would
 * meet a hero resuming a long walk with "you have just set off" and a button that ends it.
 */

/** Without these the provider renders nothing at all until a layout pass that never comes. */
const METRICS = {
  frame: { x: 0, y: 0, width: 390, height: 844 },
  insets: { top: 47, left: 0, right: 0, bottom: 34 },
};

function mount() {
  return render(
    <SafeAreaProvider initialMetrics={METRICS}>
      <TamaguiProvider config={config} defaultTheme="dark">
        <SessionScreen />
      </TamaguiProvider>
    </SafeAreaProvider>,
  );
}

describe("the session screen, on an outing", () => {
  beforeEach(() => {
    jest.useFakeTimers();
    mockUseKeepAwake.mockClear();
    mockQuit.mockClear();
    mockExpedition = { sessionUuid: "s1", error: null };
    setSession(OUTING, null);
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  /**
   * Premise 7. The screen used to be pinned awake for every session without exception, which on
   * a walk means an unlocked handset lighting a pocket for an hour and burning the battery the
   * tracker needs. Nothing on it is worth looking at while walking: the notification carries the
   * figures. Letting the OS lock the phone *is* the pocket lock.
   */
  test("does not hold the screen awake", async () => {
    await mount();
    expect(mockUseKeepAwake).not.toHaveBeenCalled();
  });

  test("holds the screen awake for a workout, as it always has", async () => {
    setSession(WORKOUT, null);
    await mount();
    expect(mockUseKeepAwake).toHaveBeenCalled();
  });

  /**
   * The quick gate turns one tap into a running session with no countdown to take it back, so
   * for five seconds the way out is on screen. It is offered on a free outing only: a prepared
   * expedition was started from its own screen, deliberately, and carries a goal.
   */
  test("offers the way back on a free outing", async () => {
    await mount();
    expect(screen.getByText("session.expedition_cancel_start")).toBeTruthy();
  });

  test("says nothing on a walk that was already under way when this screen opened", async () => {
    // Resumed from the recovery card, or rejoined from Home after the back button: both push this
    // screen on a session that has been running for a while. The offer here deletes the walk and
    // its ground on one tap, under a sentence that says the hero has just set off.
    setSession(OUTING, null, 40 * 60_000);
    await mount();

    expect(screen.queryByText("session.expedition_cancel_start")).toBeNull();
  });

  test("still offers it when the permission dialogs ate a few seconds", async () => {
    // The countdown starts once the prompts are answered, so a first outing is a good deal older
    // than the five seconds the banner lives for by the time anyone can read it.
    setSession(OUTING, null, 20_000);
    await mount();

    expect(screen.getByText("session.expedition_cancel_start")).toBeTruthy();
  });

  test("says nothing on an outing that was given a goal", async () => {
    setSession(OUTING, { type: "distance", metres: 5000 });
    await mount();
    expect(screen.queryByText("session.expedition_cancel_start")).toBeNull();
  });

  test("says nothing on a workout", async () => {
    setSession(WORKOUT, null);
    await mount();
    expect(screen.queryByText("session.expedition_cancel_start")).toBeNull();
  });

  test("throws the session and its ground away, through the store's own exit", async () => {
    await mount();
    await fireEvent.press(screen.getByText("session.expedition_cancel_start"));
    expect(mockQuit).toHaveBeenCalledTimes(1);
  });

  test("goes away by itself after five seconds", async () => {
    await mount();
    await act(() => {
      jest.advanceTimersByTime(5000);
    });
    expect(screen.queryByText("session.expedition_cancel_start")).toBeNull();
  });

  test("goes away when the hero closes it, without touching the session", async () => {
    await mount();
    const close = screen.getByLabelText("common.close");
    await act(async () => {
      await fireEvent.press(close);
    });
    expect(screen.queryByText("session.expedition_cancel_start")).toBeNull();
    expect(mockQuit).not.toHaveBeenCalled();
  });

  /**
   * The first outing stacks two Android permission dialogs over this screen. Five seconds spent
   * behind them would expire a control the hero never saw, so the clock waits for the expedition
   * store to settle - a uuid, or an error - which is exactly when the last dialog closes.
   */
  test("does not start counting while the permission dialogs are still up", async () => {
    mockExpedition = { sessionUuid: null, error: null };
    await mount();
    await act(() => {
      jest.advanceTimersByTime(30_000);
    });
    expect(screen.getByText("session.expedition_cancel_start")).toBeTruthy();
  });

  /**
   * Issue #29's shape: a band mounted and then unmounted inside the flow re-parents everything
   * under it, and the 56 px figure jumps twenty pixels at the moment the hero is reading it. The
   * banner is therefore absolute and owns no height at all, which is the one property worth
   * asserting - the alternative, a reserved gap, would leave a hole for the whole session.
   */
  test("owns no room in the layout, so nothing moves when it leaves", async () => {
    await mount();
    expect(screen.getByTestId("cancel-start-banner")).toHaveStyle({ position: "absolute" });
  });

  /** Nothing has gone wrong. An alert role would interrupt a screen reader as if it had. */
  test("announces itself politely and not as an error", async () => {
    await mount();
    const banner = screen.getByTestId("cancel-start-banner");
    expect(banner.props.accessibilityLiveRegion).toBe("polite");
    expect(banner.props.accessibilityRole).toBeUndefined();
  });

  /** DESIGN.md:150. A 24 px glyph is a 24 px target unless something says otherwise. */
  test("gives the close cross a thumb-sized target", async () => {
    await mount();
    expect(screen.getByLabelText("common.close")).toHaveStyle({ width: 44, height: 44 });
  });
});
