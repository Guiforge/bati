import { fireEvent, render, screen, waitFor } from "@testing-library/react-native";
import { TamaguiProvider } from "tamagui";
import config from "@/tamagui.config";

/**
 * The victory screen's reminder offer and the pain stop's spared zone: what the hero sees, and the
 * state each answer leaves behind. The reads under them are mocked, the offer's rules are not.
 */

jest.mock("react-i18next", () => ({
  useTranslation: () => ({ t: (k: string) => k }),
  initReactI18next: { type: "3rdParty", init: () => {} },
}));
jest.mock("@/db/client", () => ({ db: {}, schema: {}, runMigrations: jest.fn() }));
jest.mock("@/src/reportError", () => ({ reportError: jest.fn() }));
jest.mock("@/hooks/useHaptics", () => ({ useHaptics: () => ({ selection: jest.fn() }) }));

const mockOffer = jest.fn();
const mockEnable = jest.fn();
jest.mock("@/src/reminders", () => ({
  winReminderOffer: () => mockOffer(),
  enableReminders: (...a: unknown[]) => mockEnable(...a),
  replanRemindersNow: async () => undefined,
}));
let mockNotNows = 0;
jest.mock("@/db/reminders", () => ({
  WEEKDAYS: ["sun", "mon", "tue", "wed", "thu", "fri", "sat"],
  reminderPrefs: {
    winNotNows: async () => mockNotNows,
    setWinNotNows: (n: number) => {
      mockNotNows = n;
      return Promise.resolve();
    },
  },
}));
const mockStartZone = jest.fn(async (..._a: unknown[]) => undefined);
jest.mock("@/db/pause", () => ({
  getZone: async () => null,
  startZone: (...a: unknown[]) => mockStartZone(...a),
}));
jest.mock("@/stores/session", () => ({
  useSessionStore: {
    getState: () => ({
      currentExerciseIndex: 0,
      quest: { exercises: [{ exercise: { muscles: ["chest", "arms"] } }] },
    }),
  },
}));

import { ReminderAfterWin } from "@/components/session/ReminderAfterWin";
import { SparedZoneOffer } from "@/components/session/SparedZoneOffer";

const wrap = (node: React.ReactNode) =>
  render(
    <TamaguiProvider config={config} defaultTheme="dark">
      {node}
    </TamaguiProvider>,
  );

beforeEach(() => {
  mockNotNows = 0;
  mockOffer.mockReset();
  mockEnable.mockReset();
  mockStartZone.mockClear();
});

describe("ReminderAfterWin", () => {
  test("stays silent when the rules say no", async () => {
    mockOffer.mockResolvedValue(null);
    await wrap(<ReminderAfterWin />);
    await waitFor(() => expect(mockOffer).toHaveBeenCalled());
    expect(screen.queryByTestId("victory-reminder-offer")).toBeNull();
  });

  test("Not now is counted, so the second one ends the asking", async () => {
    mockOffer.mockResolvedValue({ days: ["mon", "wed"], sessions: [] });
    await wrap(<ReminderAfterWin />);
    await fireEvent.press(await screen.findByTestId("victory-reminder-not-now"));
    await waitFor(() => expect(mockNotNows).toBe(1));
    expect(screen.queryByTestId("victory-reminder-offer")).toBeNull();
  });

  test("yes goes through the shared writer and says so", async () => {
    mockOffer.mockResolvedValue({ days: ["mon", "wed"], sessions: [] });
    mockEnable.mockResolvedValue(true);
    await wrap(<ReminderAfterWin />);
    await fireEvent.press(await screen.findByTestId("victory-reminder-yes"));
    expect(await screen.findByTestId("victory-reminder-on")).toBeTruthy();
    expect(mockEnable).toHaveBeenCalledWith({}, [], null);
  });

  test("a refused permission is said, not hidden", async () => {
    mockOffer.mockResolvedValue({ days: ["mon"], sessions: [] });
    mockEnable.mockResolvedValue(false);
    await wrap(<ReminderAfterWin />);
    await fireEvent.press(await screen.findByTestId("victory-reminder-yes"));
    expect(await screen.findByTestId("victory-reminder-denied")).toBeTruthy();
  });
});

describe("SparedZoneOffer", () => {
  test("the zones of the exercise that hurt are preselected and written for a week", async () => {
    await wrap(<SparedZoneOffer />);
    await fireEvent.press(await screen.findByTestId("pain-stop-zone-yes"));
    await waitFor(() => expect(mockStartZone).toHaveBeenCalledWith(["chest", "arms"], 1));
    expect(await screen.findByTestId("pain-stop-zone-done")).toBeTruthy();
  });

  test("two weeks", async () => {
    await wrap(<SparedZoneOffer />);
    await fireEvent.press(await screen.findByTestId("pain-stop-zone-weeks-2"));
    await fireEvent.press(screen.getByTestId("pain-stop-zone-yes"));
    await waitFor(() => expect(mockStartZone).toHaveBeenCalledWith(["chest", "arms"], 2));
  });
});
