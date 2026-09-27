import { act, fireEvent, render, screen, waitFor } from "@testing-library/react-native";
import { Alert } from "react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { TamaguiProvider } from "tamagui";

/**
 * The reminder line under Home's scene (docs/designs/rappels.md, "Où on le propose" and "Les
 * rappels ignorés"): the offer after the first session, the question after three ignored days, one
 * at a time, and never beside the update or the release notes.
 */
jest.mock("react-i18next", () => ({
  useTranslation: () => ({ t: (k: string) => k }),
  initReactI18next: { type: "3rdParty", init: () => {} },
}));
jest.mock("@/db/client", () => ({ db: {}, schema: jest.requireActual("@/db/schema") }));
jest.mock("@/src/reportError", () => ({ reportError: jest.fn() }));
const mockPush = jest.fn();
jest.mock("expo-router", () => ({
  useRouter: () => ({ push: mockPush }),
  useFocusEffect: (cb: () => void) => {
    const { useEffect } = require("react");
    useEffect(() => cb(), []);
  },
}));
jest.mock("@/hooks/useHaptics", () => ({ useHaptics: () => ({ selection: jest.fn() }) }));

const mockState = { enabled: false, resumeDate: null, log: [] as unknown[] };
jest.mock("@/modules/bati-reminders", () => ({
  isAvailable: () => true,
  getState: () => mockState,
  setEnabled: jest.fn(),
}));
let mockNotes = false;
let mockUpdate: string | null = null;
jest.mock("@/src/whatsNew", () => ({ hasUnseenNotes: async () => mockNotes }));
jest.mock("@/src/updateCheck", () => ({ checkForUpdate: async () => mockUpdate }));
let mockSessions = 0;
jest.mock("@/db/completed", () => ({
  ...jest.requireActual("@/db/completed"),
  getSessionAggregates: async () => ({ totalSessions: mockSessions }),
}));
let mockDays: Record<string, string> = {};
let mockAskedAt: string | null = null;
let mockDismissed = false;
jest.mock("@/db/reminders", () => ({
  ...jest.requireActual("@/db/reminders"),
  getReminderDays: async () => mockDays,
  getReminderSessions: async () => [],
  reminderPrefs: {
    askedAt: async () => mockAskedAt,
    setAskedAt: jest.fn().mockResolvedValue(undefined),
    streakFrom: async () => null,
    setStreakFrom: jest.fn().mockResolvedValue(undefined),
    offerDismissed: async () => mockDismissed,
    dismissOffer: jest.fn().mockResolvedValue(undefined),
  },
}));
jest.mock("@/db/homeOffer", () => ({ decideHomeOffer: jest.fn() }));
jest.mock("@/stores/session", () => ({ useSessionStore: { getState: () => ({}) } }));

import { format, subDays } from "date-fns";
import { ReminderCard } from "@/components/home/ReminderCard";
import { reminderCardKind } from "@/src/reminders";
import config from "@/tamagui.config";

const { reminderPrefs } = jest.requireMock("@/db/reminders") as {
  reminderPrefs: Record<string, jest.Mock>;
};
const Reminders = jest.requireMock("@/modules/bati-reminders") as Record<string, jest.Mock>;

const ignoredDays = [3, 2, 1].map((back) => ({
  date: format(subDays(new Date(), back), "yyyy-MM-dd"),
  variant: "gallery.0",
  snoozed: false,
  opened: false,
  paused: false,
}));

beforeEach(() => {
  jest.clearAllMocks();
  mockState.enabled = false;
  mockState.log = [];
  mockNotes = false;
  mockUpdate = null;
  mockSessions = 1;
  mockDays = {};
  mockAskedAt = null;
  mockDismissed = false;
});

describe("reminderCardKind", () => {
  test("the offer, after the first session, when no day was ever chosen", async () => {
    expect(await reminderCardKind()).toBe("offer");
  });

  test("no offer before a session, once days are chosen, or once it was closed", async () => {
    mockSessions = 0;
    expect(await reminderCardKind()).toBeNull();
    mockSessions = 1;
    mockDays = { mon: "20:00" };
    expect(await reminderCardKind()).toBeNull();
    mockDays = {};
    mockDismissed = true;
    expect(await reminderCardKind()).toBeNull();
  });

  test("the question after three ignored days, at most once a month", async () => {
    mockState.enabled = true;
    mockState.log = ignoredDays;
    expect(await reminderCardKind()).toBe("check");
    mockAskedAt = format(subDays(new Date(), 5), "yyyy-MM-dd");
    expect(await reminderCardKind()).toBeNull();
  });

  test("two ignored is not three", async () => {
    mockState.enabled = true;
    mockState.log = ignoredDays.slice(1);
    expect(await reminderCardKind()).toBeNull();
  });

  test("silent while an update or the release notes are up", async () => {
    mockNotes = true;
    expect(await reminderCardKind()).toBeNull();
    mockNotes = false;
    mockUpdate = "3.0.0";
    expect(await reminderCardKind()).toBeNull();
  });
});

const METRICS = {
  frame: { x: 0, y: 0, width: 390, height: 800 },
  insets: { top: 0, left: 0, right: 0, bottom: 0 },
};

async function mount() {
  await render(
    <SafeAreaProvider initialMetrics={METRICS}>
      <TamaguiProvider config={config} defaultTheme="dark">
        <ReminderCard />
      </TamaguiProvider>
    </SafeAreaProvider>,
  );
}

describe("ReminderCard", () => {
  test("the offer opens Settings, once", async () => {
    await mount();
    await waitFor(() => expect(screen.getByTestId("home-reminder-offer")).toBeTruthy());
    await act(async () => {
      await fireEvent.press(screen.getByTestId("home-reminder-offer"));
    });
    expect(mockPush).toHaveBeenCalledWith("/settings");
    expect(reminderPrefs.dismissOffer).toHaveBeenCalled();
    expect(screen.queryByTestId("home-reminder-offer")).toBeNull();
  });

  test("the cross on the question means they are fine, and it is not asked again this month", async () => {
    mockState.enabled = true;
    mockState.log = ignoredDays;
    await mount();
    await waitFor(() => expect(screen.getByTestId("home-reminder-check")).toBeTruthy());
    await act(async () => {
      await fireEvent.press(screen.getByTestId("home-reminder-dismiss"));
    });
    expect(reminderPrefs.setAskedAt).toHaveBeenCalled();
    expect(screen.queryByTestId("home-reminder-check")).toBeNull();
  });

  test("the question offers three answers, and turning off is one of them", async () => {
    mockState.enabled = true;
    mockState.log = ignoredDays;
    const alert = jest.spyOn(Alert, "alert").mockImplementation(() => undefined);
    await mount();
    await waitFor(() => expect(screen.getByTestId("home-reminder-check")).toBeTruthy());
    await act(async () => {
      await fireEvent.press(screen.getByTestId("home-reminder-check"));
    });
    const buttons = alert.mock.calls[0]?.[2] ?? [];
    expect(buttons.map((b) => b.text)).toEqual([
      "reminders.check_change",
      "reminders.check_off",
      "reminders.check_fine",
    ]);
    await act(() => {
      buttons[1]?.onPress?.();
    });
    expect(Reminders.setEnabled).toHaveBeenCalledWith(false);
    expect(reminderPrefs.setAskedAt).toHaveBeenCalled();

    await act(() => {
      buttons[0]?.onPress?.();
    });
    expect(mockPush).toHaveBeenCalledWith("/settings");
  });
});
