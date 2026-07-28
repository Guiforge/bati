/**
 * The reminder is a chain of guards: any one of them must leave nothing scheduled.
 * Everything the real module touches is mocked — this asserts the decision, not expo.
 */

type Permission = { granted: boolean };

const mockCancelAll = jest.fn(async (): Promise<void> => {});
const mockSchedule = jest.fn(async (_request: unknown): Promise<string> => "id");
const mockGetPermissions = jest.fn(async (): Promise<Permission> => ({ granted: true }));
const mockRequestPermissions = jest.fn(async (): Promise<Permission> => ({ granted: true }));
const mockSetChannel = jest.fn(async (_id: unknown, _channel: unknown): Promise<void> => {});

jest.mock("expo-notifications", () => ({
  cancelAllScheduledNotificationsAsync: () => mockCancelAll(),
  scheduleNotificationAsync: (request: unknown) => mockSchedule(request),
  getPermissionsAsync: () => mockGetPermissions(),
  requestPermissionsAsync: () => mockRequestPermissions(),
  setNotificationChannelAsync: (id: unknown, channel: unknown) => mockSetChannel(id, channel),
  AndroidImportance: { DEFAULT: 3 },
  SchedulableTriggerInputTypes: { DATE: "date" },
}));

const mockGetOathProgress = jest.fn();
const mockGetStreakInfo = jest.fn(async () => ({ lastWorkoutDate: null as string | null }));
const mockNotificationsEnabled = jest.fn(async () => true);

jest.mock("@/db/oaths", () => ({ getOathProgress: () => mockGetOathProgress() }));
jest.mock("@/db/streaks", () => ({ getStreakInfo: () => mockGetStreakInfo() }));
jest.mock("@/db/preferences", () => ({
  preferences: {
    getNotificationsEnabled: () => mockNotificationsEnabled(),
    getNotificationTime: async () => ({ hour: 18, minute: 0 }),
  },
}));
jest.mock("@/components/oath/useOathText", () => ({ oathText: () => "a sworn oath" }));
jest.mock("@/i18n", () => ({ t: (key: string) => key }));

import {
  ensureNotificationPermission,
  hasNotificationPermission,
  rescheduleOathReminder,
} from "@/src/notifications";

const unfulfilledOath = {
  isFulfilled: false,
  current: 1,
  target: 3,
  oath: { swornAt: "2026-03-01T09:00:00.000Z" },
};

beforeEach(() => {
  jest.clearAllMocks();
  mockGetPermissions.mockResolvedValue({ granted: true });
  mockRequestPermissions.mockResolvedValue({ granted: true });
  mockNotificationsEnabled.mockResolvedValue(true);
  mockGetOathProgress.mockResolvedValue(unfulfilledOath);
  mockGetStreakInfo.mockResolvedValue({ lastWorkoutDate: null });
});

describe("permission helpers", () => {
  it("reports the granted flag without asking", async () => {
    mockGetPermissions.mockResolvedValue({ granted: false });
    expect(await hasNotificationPermission()).toBe(false);
    expect(mockRequestPermissions).not.toHaveBeenCalled();
  });

  it("does not re-prompt when permission is already granted", async () => {
    expect(await ensureNotificationPermission()).toBe(true);
    expect(mockRequestPermissions).not.toHaveBeenCalled();
  });

  it("prompts once when permission is missing, and reports a refusal", async () => {
    mockGetPermissions.mockResolvedValue({ granted: false });
    mockRequestPermissions.mockResolvedValue({ granted: false });

    expect(await ensureNotificationPermission()).toBe(false);
    expect(mockRequestPermissions).toHaveBeenCalledTimes(1);
  });
});

describe("rescheduleOathReminder", () => {
  it("schedules a dated reminder when an oath is pending", async () => {
    await rescheduleOathReminder();

    expect(mockSchedule).toHaveBeenCalledTimes(1);
    const arg = mockSchedule.mock.calls[0][0] as {
      trigger: { type: string; date: Date };
      content: { title: string; body: string };
    };
    expect(arg.trigger.type).toBe("date");
    expect(arg.trigger.date).toBeInstanceOf(Date);
    expect(arg.content.title).toBe("notifications.oath_title");
  });

  // Cancelling first is what makes the whole thing idempotent — no ids are tracked.
  it("always clears the pending reminder before deciding", async () => {
    mockNotificationsEnabled.mockResolvedValue(false);
    await rescheduleOathReminder();

    expect(mockCancelAll).toHaveBeenCalledTimes(1);
    expect(mockSchedule).not.toHaveBeenCalled();
  });

  it.each([
    ["the toggle is off", () => mockNotificationsEnabled.mockResolvedValue(false)],
    [
      "permission was never granted",
      () => mockGetPermissions.mockResolvedValue({ granted: false }),
    ],
    ["no oath is sworn", () => mockGetOathProgress.mockResolvedValue(null)],
    [
      "the oath is already fulfilled",
      () => mockGetOathProgress.mockResolvedValue({ ...unfulfilledOath, isFulfilled: true }),
    ],
    [
      "the anchor date is unusable",
      () => mockGetStreakInfo.mockResolvedValue({ lastWorkoutDate: "not-a-date" }),
    ],
  ])("stays silent when %s", async (_case, arrange) => {
    arrange();
    await rescheduleOathReminder();
    expect(mockSchedule).not.toHaveBeenCalled();
  });

  it("counts from the oath date for a hero who never trained", async () => {
    await rescheduleOathReminder();

    expect(mockSchedule).toHaveBeenCalledTimes(1);
    const { date } = (mockSchedule.mock.calls[0][0] as { trigger: { date: Date } }).trigger;
    // swornAt is 2026-03-01, idle deadline lands three days later at the chosen hour.
    expect(date.getHours()).toBe(18);
    expect(date.getTime()).toBeGreaterThan(new Date("2026-03-01T09:00:00.000Z").getTime());
  });

  it("prefers the last workout over the oath date once the hero has trained", async () => {
    mockGetStreakInfo.mockResolvedValue({ lastWorkoutDate: "2026-06-10T09:00:00.000Z" });
    await rescheduleOathReminder();

    expect(mockSchedule).toHaveBeenCalledTimes(1);
    const { date } = (mockSchedule.mock.calls[0][0] as { trigger: { date: Date } }).trigger;
    expect(date.getTime()).toBeGreaterThan(new Date("2026-06-10T09:00:00.000Z").getTime());
  });
});
