import { fireEvent, render, screen, userEvent, waitFor } from "@testing-library/react-native";
import { TamaguiProvider } from "tamagui";
import { QuickActions } from "@/components/home/QuickActions";
import { NON_REP_STYLE } from "@/db/workUnits";
import "@/i18n";
import config from "@/tamagui.config";

/**
 * The row exists because Home could not reach an expedition at all: `useSmartAction` follows the
 * oath's exercise chain or the muscles the last thirty days went light on, and an outing carries
 * no muscles. Asserted here is what the hero reads and where the tap goes, not that it rendered.
 *
 * The tap *starts*, which puts three negative rules on this file, and a negative rule with no test
 * disappears at the first refactor with nobody watching it go: it does not overwrite a live
 * session, it does not start twice on a double tap, and it does not start a session that measures
 * nothing when the position was refused.
 *
 * The two preamble tests sit at the end of the file on purpose, in that order: the flag they
 * exercise is module-scoped, which is to say per process, and a test written after them would
 * find the why already said.
 */

// The row asks the module what the grant already is before it explains anything, which is the
// one question a request cannot answer: by the time a request resolves, the dialog the sentence
// was meant to introduce has already been shown. Granted by default, so every test above reads as
// the returning hero it describes: the why belongs to the phone that has not granted it yet.
const mockPermissionStatus = jest.fn();

/** `session.expedition_permission_why`, the sentence the system dialog used to arrive without. */
const WHY =
  "Bati reads your location during an outing, and it stays on this phone. Android is about to ask.";

const mockPush = jest.fn();

jest.mock("expo-router", () => ({
  useRouter: () => ({ push: mockPush }),
  useFocusEffect: (effect: () => void) => {
    const { useEffect } = require("react");
    useEffect(effect, [effect]);
  },
}));

jest.mock("@/stores/settings", () => ({
  useSettingsStore: (selector?: (s: { language: string; distanceUnit: string }) => unknown) => {
    const state = { language: "fr", distanceUnit: "metric" };
    return selector ? selector(state) : state;
  },
}));

// Read at call time, so a test may put a live session in the store before mounting.
jest.mock("@/stores/session", () => ({
  useSessionStore: (selector: (s: unknown) => unknown) => selector(mockSession),
}));

jest.mock("@/modules/bati-location", () => ({
  requestPermission: () => mockRequestPermission(),
  getPermissionStatus: () => mockPermissionStatus(),
  requestNotificationPermission: () => mockRequestNotificationPermission(),
  // Asked once per process by whichever door got there first, so the mock keeps the
  // call visible while the real one is the module's own business.
  ensureNotificationPermission: async () => {
    await mockRequestNotificationPermission();
  },
}));

// The goal sheet pads itself by the bottom inset; there is no device edge in a test. The rest of
// the module stays real: Tamagui's Sheet reads its context directly.
jest.mock("react-native-safe-area-context", () => ({
  ...jest.requireActual("react-native-safe-area-context"),
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));

// The store, not the writer: `withOutingGoal` runs for real, so what is asserted below is the
// config the quest screen will read back, not what a stub was handed.
jest.mock("@/db/questConfig", () => ({
  loadConfiguredQuest: (questId: number, level?: string) => mockLoadConfiguredQuest(questId, level),
  getQuestConfig: () => Promise.resolve(null),
  saveQuestConfig: (...args: unknown[]) => mockSaveQuestConfig(...args),
}));

const mockListOutings = jest.fn();

jest.mock("@/db/outings", () => ({
  listOutings: () => mockListOutings(),
}));

const mockRecentSessions = jest.fn();

jest.mock("@/db/completed", () => ({
  getRecentSessionHistory: () => mockRecentSessions(),
}));

const mockStartSession = jest.fn().mockResolvedValue(undefined);
const mockSession = { status: "idle", startSession: mockStartSession };
const mockRequestPermission = jest.fn();
const mockRequestNotificationPermission = jest.fn();
const mockLoadConfiguredQuest = jest.fn();
const mockSaveQuestConfig = jest.fn().mockResolvedValue(undefined);

/** The Warden's Round as the row holds it: a template and the movement it is made of. */
function outing(id: number, frName: string, frTitle: string) {
  return {
    quest: { id, frTitle, enTitle: frTitle, imagePath: "assets/images/quests/wardens_round.jpg" },
    exercise: { id: id * 10, frName, enName: frName },
  };
}

/** A one-slot outing of fifteen minutes, the shape every seeded way out ships with. */
const WALK = {
  id: 2,
  exercises: [{ id: 5, target: { type: "time", value: 900 }, exercise: { style: NON_REP_STYLE } }],
};

/** An indoor workout, the only kind the Replay tile offers. */
const CHOP = {
  id: 7,
  enTitle: "Chop Wood",
  frTitle: "Chop Wood",
  exercises: [{ id: 1, target: { type: "reps", value: 10 }, exercise: { style: "strength" } }],
};

function renderRow() {
  return render(
    <TamaguiProvider config={config} defaultTheme="dark">
      <QuickActions />
    </TamaguiProvider>,
  );
}

/** The tile, taken by the label it wears — the label is half of what this file pins. */
function tile(name: string) {
  return screen.getByLabelText(`Start: ${name}`);
}

/**
 * A tap on a tile as one synchronous press. The tile also answers a long press, and
 * `userEvent.press` releases on a real 130 ms timer: at the start of a full run, with every worker
 * starved, this file failed four runs out of four and never once alone. The double-tap test keeps
 * `userEvent`, because the gap between its two taps is what it pins.
 */
function tapTile(name: string) {
  return fireEvent.press(tile(name));
}

beforeEach(() => {
  mockPermissionStatus.mockReset().mockResolvedValue({ granted: true, canAskAgain: false });
  mockPush.mockClear();
  mockStartSession.mockClear();
  mockSaveQuestConfig.mockClear();
  mockSession.status = "idle";
  mockRequestPermission.mockReset().mockResolvedValue({ granted: true });
  mockRequestNotificationPermission.mockReset().mockResolvedValue({ granted: true });
  mockLoadConfiguredQuest
    .mockReset()
    .mockResolvedValue({ quest: { id: 2, exercises: [] }, level: "medium" });
  mockListOutings.mockResolvedValue([outing(2, "Course du Messager", "La Parole Doit Passer")]);
  mockRecentSessions.mockReset().mockResolvedValue([]);
});

it("names the movement, so the hero can see which one is the run", async () => {
  mockListOutings.mockResolvedValue([
    outing(1, "Marche du Veilleur", "La Ronde du Veilleur"),
    outing(2, "Course du Messager", "La Parole Doit Passer"),
  ]);

  await renderRow();

  expect(await screen.findByText("Course du Messager")).toBeTruthy();
  expect(screen.getByText("Marche du Veilleur")).toBeTruthy();
  // The quest title would leave the hero tapping to find out which one they want.
  expect(screen.queryByText("La Parole Doit Passer")).toBeNull();
});

it("says it starts, rather than wearing the label it had when it only opened a screen", async () => {
  await renderRow();

  // Two versions of one gesture is how a hero ends up running when they meant to read.
  expect(await screen.findByLabelText("Start: Course du Messager")).toBeTruthy();
});

it("starts the outing with no goal on it, position asked before notification", async () => {
  await renderRow();
  await screen.findByText("Course du Messager");
  await tapTile("Course du Messager");

  await waitFor(() => expect(mockStartSession).toHaveBeenCalledTimes(1));
  // Medium whatever the quest screen was left on: a level stretches an outing's duration and
  // multiplies its payout, and the hero who tapped here chose neither.
  expect(mockLoadConfiguredQuest).toHaveBeenCalledWith(2, "medium");
  expect(mockStartSession).toHaveBeenCalledWith({ id: 2, exercises: [] }, "medium", {
    goal: null,
  });
  // `null` is the whole of "a walk with no number on it" — an absent key would be the same
  // thing today and stop being it the day the store reads a saved goal instead.
  expect(mockStartSession.mock.calls[0]?.[2]?.goal).toBeNull();

  const permissionOrder = mockRequestPermission.mock.invocationCallOrder[0] ?? 0;
  const notificationOrder = mockRequestNotificationPermission.mock.invocationCallOrder[0] ?? 0;
  expect(permissionOrder).toBeLessThan(notificationOrder);

  expect(mockPush).toHaveBeenCalledWith("/session");
});

it("rejoins a live session instead of overwriting it", async () => {
  // A walk paused by the hardware back button still holds its uuid and its points; `startSession`
  // would overwrite the lot and orphan every fix already written.
  mockSession.status = "paused";

  await renderRow();
  await screen.findByText("Course du Messager");
  await tapTile("Course du Messager");

  expect(mockPush).toHaveBeenCalledWith("/session");
  expect(mockStartSession).not.toHaveBeenCalled();
  expect(mockRequestPermission).not.toHaveBeenCalled();
});

it("starts one session on a double tap, not two", async () => {
  await renderRow();
  await screen.findByText("Course du Messager");

  await userEvent.press(tile("Course du Messager"));
  await userEvent.press(tile("Course du Messager"));

  await waitFor(() => expect(mockStartSession).toHaveBeenCalledTimes(1));
});

it("starts nothing when the position is refused, and says where the grant lives", async () => {
  mockRequestPermission.mockResolvedValue({ granted: false });

  await renderRow();
  await screen.findByText("Course du Messager");
  await tapTile("Course du Messager");

  // No fix means no ground, and a session that measures nothing is not what the tile promised.
  await waitFor(() => expect(screen.getByText("Bati has no access to your location")).toBeTruthy());
  expect(mockStartSession).not.toHaveBeenCalled();
  expect(mockPush).not.toHaveBeenCalled();
  // The grant lives in Android's settings and nothing in the app can ask a second time.
  expect(screen.getByText("Open settings")).toBeTruthy();
});

it("writes the goal on the tile, and changes it from the tile without leaving", async () => {
  mockLoadConfiguredQuest.mockResolvedValue({ quest: WALK, level: "medium", config: null });

  await renderRow();

  // The slot's fifteen minutes, which is what the tap is about to run: said before it runs.
  await userEvent.press(
    await screen.findByLabelText("Goal for Course du Messager: 15 min. Change it"),
  );
  await userEvent.press(await screen.findByText("30 min"));

  // On a quest with nothing saved, the base is a bare medium, never the config the chip was
  // loaded with: that one carries a level the hero did not choose. And the half hour lands on
  // the slot, keyed the way the quest screen reads it back.
  await waitFor(() =>
    expect(mockSaveQuestConfig).toHaveBeenCalledWith(2, {
      level: "medium",
      targets: { "5": 1800 },
    }),
  );
  // Setting the goal is not leaving: the chip sits inside a tile that starts a GPS.
  expect(mockStartSession).not.toHaveBeenCalled();
});

it("replays the last workout in one tap, at the level it was saved at", async () => {
  mockRecentSessions.mockResolvedValue([{ questId: 7 }]);
  mockLoadConfiguredQuest.mockImplementation(async (id: number) =>
    id === 7
      ? { quest: CHOP, level: "hard", config: null }
      : { quest: { id, exercises: [] }, level: "medium" },
  );

  await renderRow();
  await userEvent.press(await screen.findByLabelText("Replay Chop Wood"));

  await waitFor(() => expect(mockStartSession).toHaveBeenCalledWith(CHOP, "hard"));
  expect(mockPush).toHaveBeenCalledWith("/session");
  // A workout, so no position is asked for.
  expect(mockRequestPermission).not.toHaveBeenCalled();
});

it("renders nothing at all when there is nothing to start", async () => {
  mockListOutings.mockResolvedValue([]);

  const view = await renderRow();
  // The whole subtree, not just the heading: an empty row that still reserved its height would
  // leave a gap on Home that no read is ever going to fill.
  await waitFor(() => expect(view.toJSON()).toBeNull());
});

it("explains nothing to a hero who already granted the position", async () => {
  // The module's own read, asked before anything is said and prompting nothing. A hero who goes
  // out every day does not need the reason for a dialog they will never see.
  await renderRow();
  await screen.findByText("Course du Messager");
  await tapTile("Course du Messager");

  await waitFor(() => expect(mockStartSession).toHaveBeenCalledTimes(1));
  expect(screen.queryByText(WHY)).toBeNull();
  expect(mockPermissionStatus).toHaveBeenCalled();
});

it("says why before Android asks, and only for the first tap of the process", async () => {
  // The phone that has not granted it yet: this is the tap that used to meet the system dialog
  // with nothing in front of it, on a door that skips the screen `quests.location_notice` lives on.
  mockPermissionStatus.mockResolvedValue({ granted: false, canAskAgain: true });
  mockRequestPermission.mockResolvedValue({ granted: false });

  await renderRow();
  await screen.findByText("Course du Messager");
  await tapTile("Course du Messager");

  expect(await screen.findByText(WHY)).toBeTruthy();
  // The order is the whole point: an unprimed dialog is refused more often, and a final refusal
  // cannot be undone from inside the app.
  expect(mockRequestPermission).not.toHaveBeenCalled();
  expect(mockStartSession).not.toHaveBeenCalled();

  // One confirmation, in the strip the row already uses, and the same tap carries on from there:
  // no second screen, no navigation, nothing to come back from.
  await userEvent.press(screen.getByLabelText("Continue"));
  await waitFor(() => expect(mockRequestPermission).toHaveBeenCalledTimes(1));

  // A why explains the dialog, it does not answer it: a refusal is exactly as final as it was,
  // and the strip says where the grant lives instead.
  await waitFor(() => expect(screen.getByText("Bati has no access to your location")).toBeTruthy());
  expect(screen.getByText("Open settings")).toBeTruthy();
  expect(screen.queryByText(WHY)).toBeNull();
  expect(mockStartSession).not.toHaveBeenCalled();
  expect(mockPush).not.toHaveBeenCalled();

  // Second tap, same process, grant still missing: straight to Android. Saying it again would be
  // one more tap between the hero and the door, for a reason already given.
  await tapTile("Course du Messager");

  await waitFor(() => expect(mockRequestPermission).toHaveBeenCalledTimes(2));
  expect(screen.queryByText(WHY)).toBeNull();
});
