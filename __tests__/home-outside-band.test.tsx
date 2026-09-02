import { render, screen, userEvent, waitFor } from "@testing-library/react-native";
import { TamaguiProvider } from "tamagui";
import { OutsideBand } from "@/components/home/OutsideBand";
import "@/i18n";
import config from "@/tamagui.config";

/**
 * The band exists because Home could not reach an expedition at all: `useSmartAction` follows
 * the oath's exercise chain or the muscles the last thirty days went light on, and an outing
 * carries no muscles. Asserted here is what the hero reads and where the tap goes, not that it
 * rendered — "it still renders" is what let the old four-tap hunt stand.
 *
 * The tap now *starts*, which puts three negative rules on this file, and a negative rule with no
 * test disappears at the first refactor with nobody watching it go: it does not overwrite a live
 * session, it does not start twice on a double tap, and it does not start a session that measures
 * nothing when the position was refused.
 *
 * The two preamble tests sit at the end of the file on purpose, in that order: the flag they
 * exercise is module-scoped, which is to say per process, and a test written after them would
 * find the why already said.
 */

// The band asks the module what the grant already is before it explains anything, which is the
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
  useSettingsStore: (selector?: (s: { language: string }) => unknown) => {
    const state = { language: "fr" };
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

jest.mock("@/db/questConfig", () => ({
  loadConfiguredQuest: (questId: number, level?: string) => mockLoadConfiguredQuest(questId, level),
}));

const mockListOutings = jest.fn();

jest.mock("@/db/outings", () => ({
  listOutings: () => mockListOutings(),
}));

const mockStartSession = jest.fn().mockResolvedValue(undefined);
const mockSession = { status: "idle", startSession: mockStartSession };
const mockRequestPermission = jest.fn();
const mockRequestNotificationPermission = jest.fn();
const mockLoadConfiguredQuest = jest.fn();

/** The Warden's Round as the band holds it: a template and the movement it is made of. */
function outing(id: number, frName: string, frTitle: string) {
  return {
    quest: { id, frTitle, enTitle: frTitle, imagePath: "assets/images/quests/wardens_round.jpg" },
    exercise: { id: id * 10, frName, enName: frName },
  };
}

function renderBand() {
  return render(
    <TamaguiProvider config={config} defaultTheme="dark">
      <OutsideBand />
    </TamaguiProvider>,
  );
}

/** The tile, taken by the label it now wears — the label is half of what this file pins. */
function tile(name: string) {
  return screen.getByLabelText(`Start: ${name}`);
}

beforeEach(() => {
  mockPermissionStatus.mockReset().mockResolvedValue({ granted: true, canAskAgain: false });
  mockPush.mockClear();
  mockStartSession.mockClear();
  mockSession.status = "idle";
  mockRequestPermission.mockReset().mockResolvedValue({ granted: true });
  mockRequestNotificationPermission.mockReset().mockResolvedValue({ granted: true });
  mockLoadConfiguredQuest
    .mockReset()
    .mockResolvedValue({ quest: { id: 2, exercises: [] }, level: "medium" });
  mockListOutings.mockResolvedValue([outing(2, "Course du Messager", "La Parole Doit Passer")]);
});

it("names the movement, so the hero can see which one is the run", async () => {
  mockListOutings.mockResolvedValue([
    outing(1, "Marche du Veilleur", "La Ronde du Veilleur"),
    outing(2, "Course du Messager", "La Parole Doit Passer"),
  ]);

  await renderBand();

  expect(await screen.findByText("Course du Messager")).toBeTruthy();
  expect(screen.getByText("Marche du Veilleur")).toBeTruthy();
  // The quest title would leave the hero tapping to find out which one they want.
  expect(screen.queryByText("La Parole Doit Passer")).toBeNull();
});

it("says it starts, rather than wearing the label it had when it only opened a screen", async () => {
  await renderBand();

  // Two versions of one gesture is how a hero ends up running when they meant to read.
  expect(await screen.findByLabelText("Start: Course du Messager")).toBeTruthy();
});

it("starts the outing with no goal on it, position asked before notification", async () => {
  await renderBand();
  await screen.findByText("Course du Messager");
  await userEvent.press(tile("Course du Messager"));

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

  await renderBand();
  await screen.findByText("Course du Messager");
  await userEvent.press(tile("Course du Messager"));

  expect(mockPush).toHaveBeenCalledWith("/session");
  expect(mockStartSession).not.toHaveBeenCalled();
  expect(mockRequestPermission).not.toHaveBeenCalled();
});

it("starts one session on a double tap, not two", async () => {
  await renderBand();
  await screen.findByText("Course du Messager");

  await userEvent.press(tile("Course du Messager"));
  await userEvent.press(tile("Course du Messager"));

  await waitFor(() => expect(mockStartSession).toHaveBeenCalledTimes(1));
});

it("starts nothing when the position is refused, and says where the grant lives", async () => {
  mockRequestPermission.mockResolvedValue({ granted: false });

  await renderBand();
  await screen.findByText("Course du Messager");
  await userEvent.press(tile("Course du Messager"));

  // No fix means no ground, and a session that measures nothing is not what the tile promised.
  await waitFor(() => expect(screen.getByText("Bati has no access to your location")).toBeTruthy());
  expect(mockStartSession).not.toHaveBeenCalled();
  expect(mockPush).not.toHaveBeenCalled();
  // The grant lives in Android's settings and nothing in the app can ask a second time.
  expect(screen.getByText("Open settings")).toBeTruthy();
});

it("hands the prepared door to the band rather than to a second target inside the tile", async () => {
  await renderBand();
  await screen.findByText("Course du Messager");

  // 40 dp is under DESIGN.md's 44×44 floor, and a 44 dp chevron would take 61% of a 72 dp tile
  // that starts a GPS. The way to the screen that can still set a duration is here instead.
  await userEvent.press(screen.getByLabelText("Set up an outing before heading out"));
  await userEvent.press(screen.getByText("Course du Messager"));

  expect(mockPush).toHaveBeenCalledWith("/quests/2");
  expect(mockStartSession).not.toHaveBeenCalled();
});

it("renders nothing at all when there is no way out to offer", async () => {
  mockListOutings.mockResolvedValue([]);

  const view = await renderBand();
  // The whole subtree, not just the heading: an empty band that still reserved its height would
  // leave a gap on Home that no read is ever going to fill.
  await waitFor(() => expect(view.toJSON()).toBeNull());
});

it("explains nothing to a hero who already granted the position", async () => {
  // The module's own read, asked before anything is said and prompting nothing. A hero who goes
  // out every day does not need the reason for a dialog they will never see.
  await renderBand();
  await screen.findByText("Course du Messager");
  await userEvent.press(tile("Course du Messager"));

  await waitFor(() => expect(mockStartSession).toHaveBeenCalledTimes(1));
  expect(screen.queryByText(WHY)).toBeNull();
  expect(mockPermissionStatus).toHaveBeenCalled();
});

it("says why before Android asks, and only for the first tap of the process", async () => {
  // The phone that has not granted it yet: this is the tap that used to meet the system dialog
  // with nothing in front of it, on a door that skips the screen `quests.location_notice` lives on.
  mockPermissionStatus.mockResolvedValue({ granted: false, canAskAgain: true });
  mockRequestPermission.mockResolvedValue({ granted: false });

  await renderBand();
  await screen.findByText("Course du Messager");
  await userEvent.press(tile("Course du Messager"));

  expect(await screen.findByText(WHY)).toBeTruthy();
  // The order is the whole point: an unprimed dialog is refused more often, and a final refusal
  // cannot be undone from inside the app.
  expect(mockRequestPermission).not.toHaveBeenCalled();
  expect(mockStartSession).not.toHaveBeenCalled();

  // One confirmation, in the strip the band already uses, and the same tap carries on from there:
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
  await userEvent.press(tile("Course du Messager"));

  await waitFor(() => expect(mockRequestPermission).toHaveBeenCalledTimes(2));
  expect(screen.queryByText(WHY)).toBeNull();
});
