import { adventureWeeksLabel } from "@/hooks/useReminderPace";

/**
 * How long an adventure takes: three sessions a week until the hero's own days say otherwise
 * (docs/designs/rappels.md, "Petits gains de cohérence").
 */
jest.mock("@/db/client", () => ({ db: {}, schema: jest.requireActual("@/db/schema") }));

const t = (key: string, options?: Record<string, unknown>) => `${key}:${String(options?.count)}`;

test("no days chosen: three a week, as it always was", () => {
  expect(adventureWeeksLabel(12, null, t as never)).toBe("adventures.weeks:4");
});

test("the hero's days set the pace, and the label says so", () => {
  expect(adventureWeeksLabel(12, 2, t as never)).toBe("adventures.weeks_pace:6");
  expect(adventureWeeksLabel(12, 6, t as never)).toBe("adventures.weeks_pace:2");
});
