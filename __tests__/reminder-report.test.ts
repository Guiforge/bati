import { buildBugReportMailto } from "@/src/crashLog";

/**
 * The reminders' line in the bug report mail: counts, never a date or a word the hero wrote, and
 * nothing at all on a phone that never used them (docs/designs/rappels.md, "Mesurer sans
 * télémétrie").
 */
jest.mock("@/db/client", () => ({ db: {}, schema: jest.requireActual("@/db/schema") }));
const mockState = { enabled: false, resumeDate: null, log: [] as unknown[] };
let mockAvailable = true;
jest.mock("@/modules/bati-reminders", () => ({
  isAvailable: () => mockAvailable,
  getState: () => mockState,
}));
jest.mock("@/db/reminders", () => ({
  ...jest.requireActual("@/db/reminders"),
  getReminderSessions: async () => [
    {
      performedAt: new Date(2026, 0, 12, 21),
      outing: null,
      movingSeconds: null,
      durationSeconds: 1800,
    },
  ],
}));

const load = () =>
  (require("@/src/reminderReport") as typeof import("@/src/reminderReport")).reminderReportLine;

test("counts what rang and what followed, and says whether the switch is on", async () => {
  mockState.enabled = true;
  mockState.log = [
    {
      date: "2026-01-12",
      variant: "gallery.0",
      snoozed: false,
      opened: true,
      paused: false,
      postedAt: "20:00",
    },
    {
      date: "2026-01-13",
      variant: "gallery.1",
      snoozed: true,
      opened: false,
      paused: false,
      postedAt: "20:00",
    },
  ];
  expect(await load()()).toBe(
    "Reminders: on · posted 2 · workout within 2 h 1 · snoozed 1 · paused 0",
  );
});

test("a phone that never used them adds no line, and neither does a build without them", async () => {
  mockState.enabled = false;
  mockState.log = [];
  expect(await load()()).toBeNull();
  mockAvailable = false;
  mockState.enabled = true;
  expect(await load()()).toBeNull();
  mockAvailable = true;
});

test("the line lands in the technical block of the mail", () => {
  const url = buildBugReportMailto(
    [],
    [],
    "2.7.0",
    {
      subject: "s",
      prompt: "p",
      technicalHeader: "tech",
      noCrash: "nc",
      errorsHeader: "eh",
      noErrors: "ne",
      eventsHeader: "ev",
    },
    ["Reminders: on · posted 2"],
  );
  const body = decodeURIComponent(url.split("body=")[1] ?? "");
  expect(body).toMatch(/--- tech ---\nApp: Bati 2\.7\.0\nDevice: .*\nReminders: on · posted 2/);
});
