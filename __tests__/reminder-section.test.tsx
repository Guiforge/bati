import { act, fireEvent, render, screen, waitFor } from "@testing-library/react-native";
import { addDays, format } from "date-fns";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { TamaguiProvider } from "tamagui";

/**
 * Settings > Reminder (docs/designs/rappels.md, "Réglages"). The native half, the permission and
 * the reads are faked; the rules the section shows (the plan, the suggested days, the missed
 * reminder) are the real ones from db/reminders.ts.
 */
jest.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (k: string, o?: Record<string, unknown>) => (o ? `${k} ${JSON.stringify(o)}` : k),
  }),
  initReactI18next: { type: "3rdParty", init: () => {} },
}));
jest.mock("@/db/client", () => ({ db: {}, schema: jest.requireActual("@/db/schema") }));
jest.mock("@/src/reportError", () => ({ reportError: jest.fn() }));
jest.mock("expo-router", () => ({
  useFocusEffect: (cb: () => void) => {
    const { useEffect } = require("react");
    useEffect(() => cb(), []);
  },
}));
jest.mock("expo-linking", () => ({
  openSettings: jest.fn().mockResolvedValue(undefined),
  openURL: jest.fn().mockResolvedValue(undefined),
}));
jest.mock("@/hooks/useHaptics", () => ({
  useHaptics: () => ({ selection: jest.fn(), warning: jest.fn(), success: jest.fn() }),
}));
jest.mock("@/stores/settings", () => ({
  useSettingsStore: (selector: (s: { language: string }) => unknown) =>
    selector({ language: "en" }),
}));

const mockNative = {
  state: {
    enabled: false,
    resumeDate: null as string | null,
    plannedOn: null as string | null,
    log: [] as unknown[],
  },
  areEnabled: true,
};
jest.mock("@/modules/bati-reminders", () => ({
  isAvailable: () => true,
  getState: () => mockNative.state,
  areEnabled: () => mockNative.areEnabled,
  setEnabled: jest.fn(),
  pause: jest.fn(),
  resume: jest.fn(),
  is24Hour: () => true,
  pickTime: jest.fn().mockResolvedValue("07:15"),
  openChannelSettings: jest.fn(),
}));
jest.mock("@/modules/bati-location", () => ({
  requestNotificationPermission: jest.fn().mockResolvedValue({ granted: true }),
}));

let mockDays: Record<string, string> = {};
let mockOath: unknown = null;
jest.mock("@/db/reminders", () => ({
  ...jest.requireActual("@/db/reminders"),
  getReminderDays: async () => mockDays,
  getReminderSessions: async () => [],
  setReminderDays: jest.fn((days: Record<string, string>) => {
    mockDays = days;
    return Promise.resolve();
  }),
  reminderPrefs: {
    streakFrom: async () => null,
    setStreakFrom: jest.fn().mockResolvedValue(undefined),
  },
}));
jest.mock("@/db/oaths", () => ({ getOath: async () => mockOath }));
let mockQuota = 2;
jest.mock("@/db/streaks", () => ({ getWeeklyQuota: async () => mockQuota }));
jest.mock("@/src/deviceSync", () => ({ syncAccount: async () => null }));
jest.mock("@/src/reminders", () => ({
  replanRemindersNow: jest.fn().mockResolvedValue(undefined),
}));

import { ReminderSection } from "@/components/settings/ReminderSection";
import config from "@/tamagui.config";

const Reminders = jest.requireMock("@/modules/bati-reminders") as Record<string, jest.Mock>;
const { requestNotificationPermission } = jest.requireMock("@/modules/bati-location") as {
  requestNotificationPermission: jest.Mock;
};
const { setReminderDays, reminderPrefs } = jest.requireMock("@/db/reminders") as {
  setReminderDays: jest.Mock;
  reminderPrefs: { setStreakFrom: jest.Mock };
};
const { replanRemindersNow } = jest.requireMock("@/src/reminders") as {
  replanRemindersNow: jest.Mock;
};

const METRICS = {
  frame: { x: 0, y: 0, width: 390, height: 800 },
  insets: { top: 0, left: 0, right: 0, bottom: 0 },
};

async function mount() {
  await render(
    <SafeAreaProvider initialMetrics={METRICS}>
      <TamaguiProvider config={config} defaultTheme="dark">
        <ReminderSection />
      </TamaguiProvider>
    </SafeAreaProvider>,
  );
  await waitFor(() => expect(screen.getByTestId("settings-reminder")).toBeTruthy());
}

beforeEach(() => {
  jest.clearAllMocks();
  mockNative.state = { enabled: false, resumeDate: null, plannedOn: null, log: [] };
  mockNative.areEnabled = true;
  mockDays = {};
  mockOath = null;
  mockQuota = 2;
});

test("off by default: the preview says so, and nothing is asked until the switch is touched", async () => {
  await mount();
  expect(screen.getByText("reminders.off")).toBeTruthy();
  expect(requestNotificationPermission).not.toHaveBeenCalled();
});

test("turning it on asks the permission, then ticks days from the history and plans", async () => {
  await mount();
  await act(async () => {
    await fireEvent.press(screen.getByTestId("settings-reminder-switch"));
  });
  await waitFor(() => expect(replanRemindersNow).toHaveBeenCalled());
  expect(requestNotificationPermission).toHaveBeenCalledTimes(1);
  expect(Reminders.setEnabled).toHaveBeenCalledWith(true);
  // No history, no oath: Monday, Wednesday, Friday, at 18:00.
  expect(setReminderDays).toHaveBeenCalledWith({ mon: "18:00", wed: "18:00", fri: "18:00" });
  expect(reminderPrefs.setStreakFrom).toHaveBeenCalled();
});

test("a refused permission leaves the switch off, and says how to change it", async () => {
  requestNotificationPermission.mockResolvedValueOnce({ granted: false });
  await mount();
  await act(async () => {
    await fireEvent.press(screen.getByTestId("settings-reminder-switch"));
  });
  await waitFor(() => expect(screen.getByTestId("settings-reminder-note-denied")).toBeTruthy());
  expect(Reminders.setEnabled).not.toHaveBeenCalled();
  expect(screen.getByText("reminders.open_settings")).toBeTruthy();
});

test("a permission withdrawn in Android turns the switch off here, and says why", async () => {
  mockNative.state = { enabled: true, resumeDate: null, plannedOn: null, log: [] };
  mockNative.areEnabled = false;
  mockDays = { mon: "20:00" };
  await mount();
  await waitFor(() => expect(screen.getByTestId("settings-reminder-note-withdrawn")).toBeTruthy());
  expect(Reminders.setEnabled).toHaveBeenCalledWith(false);
});

test("the last day never unticks while the switch is on", async () => {
  mockNative.state = { enabled: true, resumeDate: null, plannedOn: null, log: [] };
  mockDays = { thu: "20:00" };
  await mount();
  await act(async () => {
    await fireEvent.press(screen.getByTestId("settings-reminder-day-thu"));
  });
  expect(screen.getByTestId("settings-reminder-note-keep_one_day")).toBeTruthy();
  expect(setReminderDays).not.toHaveBeenCalled();
});

test("the days start on the language's first day, and each reads whole to TalkBack", async () => {
  mockNative.state = { enabled: true, resumeDate: null, plannedOn: null, log: [] };
  mockDays = { tue: "20:00", thu: "20:00" };
  await mount();
  const days = screen.getAllByRole("checkbox");
  expect(days).toHaveLength(7);
  expect(days[0]?.props.testID).toBe("settings-reminder-day-sun");
  // The name, and the state beside it: TalkBack reads "Tuesday, checked".
  const tuesday = screen.getByLabelText("Tuesday");
  expect(tuesday.props.accessibilityState).toMatchObject({ checked: true });
  expect(screen.getByLabelText("Monday").props.accessibilityState).toMatchObject({
    checked: false,
  });
});

test("fewer days than the weekly oath asks for: one grey line, not a block", async () => {
  mockNative.state = { enabled: true, resumeDate: null, plannedOn: null, log: [] };
  mockDays = { mon: "20:00", thu: "20:00" };
  mockOath = { metric: "weekly_sessions", weeklyTarget: 3, fulfilledAt: null };
  await mount();
  await waitFor(() => expect(screen.getByTestId("settings-reminder-gap")).toBeTruthy());
  expect(screen.getByTestId("settings-reminder-gap").props.children).toContain(
    "reminders.oath_gap",
  );
});

test("one day and no weekly oath: the flame's count, once", async () => {
  mockNative.state = { enabled: true, resumeDate: null, plannedOn: null, log: [] };
  mockDays = { mon: "20:00" };
  await mount();
  await waitFor(() => expect(screen.getByTestId("settings-reminder-gap")).toBeTruthy());
  expect(screen.getByTestId("settings-reminder-gap").props.children).toContain(
    "reminders.flame_gap",
  );
});

test("the flame's line reads the flame's own quota", async () => {
  mockNative.state = { enabled: true, resumeDate: null, plannedOn: null, log: [] };
  mockDays = { mon: "20:00", thu: "20:00" };
  mockQuota = 3;
  await mount();
  await waitFor(() => expect(screen.getByTestId("settings-reminder-gap")).toBeTruthy());
  expect(screen.getByTestId("settings-reminder-gap").props.children).toContain('"count":3');
});

test("a pause, a resume and the switch are settings changes: ignored days count after them", async () => {
  mockNative.state = { enabled: true, resumeDate: null, plannedOn: null, log: [] };
  mockDays = { mon: "20:00" };
  await mount();
  await act(async () => {
    await fireEvent.press(screen.getByTestId("settings-reminder-pause-2"));
  });
  await waitFor(() => expect(reminderPrefs.setStreakFrom).toHaveBeenCalled());
});

test("the hour comes from Android's own picker, and every day takes it", async () => {
  mockNative.state = { enabled: true, resumeDate: null, plannedOn: null, log: [] };
  mockDays = { mon: "20:00", thu: "20:00" };
  await mount();
  await act(async () => {
    await fireEvent.press(screen.getByTestId("settings-reminder-hour"));
  });
  await waitFor(() => expect(setReminderDays).toHaveBeenCalledWith({ mon: "07:15", thu: "07:15" }));
});

test("a pause of a week, and the way back", async () => {
  mockNative.state = { enabled: true, resumeDate: null, plannedOn: null, log: [] };
  mockDays = { mon: "20:00" };
  await mount();
  await act(async () => {
    await fireEvent.press(screen.getByTestId("settings-reminder-pause-1"));
  });
  expect(Reminders.pause).toHaveBeenCalledWith(format(addDays(new Date(), 7), "yyyy-MM-dd"));

  mockNative.state = {
    enabled: true,
    resumeDate: format(addDays(new Date(), 3), "yyyy-MM-dd"),
    plannedOn: null,
    log: [],
  };
  await mount();
  await act(async () => {
    await fireEvent.press(screen.getAllByTestId("settings-reminder-resume")[0] as never);
  });
  expect(Reminders.resume).toHaveBeenCalled();
});

test("sound and vibration lead to the channel's own settings", async () => {
  await mount();
  await fireEvent.press(screen.getByTestId("settings-reminder-sound"));
  // Named in the app's language: the channel may not exist yet, and Android shows its name.
  expect(Reminders.openChannelSettings).toHaveBeenCalledWith("reminders.channel");
});
