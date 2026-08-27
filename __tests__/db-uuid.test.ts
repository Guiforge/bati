import assert from "node:assert/strict";

import { UUID_V7_RE, uuidv7 } from "../db/uuid";
import { clientMock, createTestDb } from "./helpers/testDb";

describe("db/uuid", () => {
  test("every draw is a well-formed v7", () => {
    for (let i = 0; i < 100; i++) {
      expect(uuidv7()).toMatch(UUID_V7_RE);
    }
  });

  test("1000 draws are 1000 distinct names", () => {
    const drawn = new Set(Array.from({ length: 1000 }, uuidv7));
    expect(drawn.size).toBe(1000);
  });

  // The one property v7 buys over v4, and the one that breaks silently: sorting the strings has
  // to sort the sessions. `db/exercises.ts` already leans on id order as a same-second
  // tiebreaker, and a merged journal would lean on this instead.
  test("sorts in time order", () => {
    const now = jest.spyOn(Date, "now");

    now.mockReturnValue(1_700_000_000_000);
    const winter = uuidv7();
    now.mockReturnValue(1_800_000_000_000);
    const later = uuidv7();
    // Same millisecond: the random tail decides, and neither is allowed to equal the other.
    now.mockReturnValue(1_800_000_000_000);
    const sameMs = uuidv7();

    now.mockRestore();

    expect([later, winter].sort()).toEqual([winter, later]);
    expect(sameMs).not.toBe(later);
    expect(later.slice(0, 13)).toBe(sameMs.slice(0, 13));
  });

  // A millisecond whose hex has a leading zero: `toString(16)` drops it, and an unpadded field
  // would shift every character after it — silently, since the shape stays uuid-ish.
  test("pads a timestamp with a leading zero", () => {
    const now = jest.spyOn(Date, "now").mockReturnValue(0x0_00f_4240);
    const padded = uuidv7();
    now.mockRestore();

    expect(padded).toMatch(UUID_V7_RE);
    expect(padded.slice(0, 13)).toBe("0000000f-4240");
  });
});

describe("db/preferences getDeviceId", () => {
  const t = createTestDb();

  beforeAll(() => {
    jest.resetModules();
    jest.doMock("../db/client", () => clientMock(t));
  });

  afterAll(() => {
    t.close();
  });

  test("draws once, then answers from the database", async () => {
    const prefs = require("../db/preferences") as typeof import("../db/preferences");

    const first = await prefs.getDeviceId();
    expect(first).toMatch(UUID_V7_RE);
    expect(await prefs.getDeviceId()).toBe(first);

    // Past the module memo: a fresh import must read the same name back, or every launch would
    // claim to be a different device.
    jest.resetModules();
    jest.doMock("../db/client", () => clientMock(t));
    const reloaded = require("../db/preferences") as typeof import("../db/preferences");
    expect(await reloaded.getDeviceId()).toBe(first);
  });
});

describe("createCompletedSession names its row", () => {
  const t = createTestDb();

  beforeAll(() => {
    jest.resetModules();
    jest.doMock("../db/client", () => clientMock(t));
  });

  afterAll(() => {
    t.close();
  });

  test("stamps uuid, originDevice and tzOffsetMin", async () => {
    const { createCompletedSession } =
      require("../db/completed") as typeof import("../db/completed");
    const { getDeviceId } = require("../db/preferences") as typeof import("../db/preferences");

    const exerciseId = (
      t.sqlite.prepare("SELECT id FROM exercises LIMIT 1").get() as { id: number } | undefined
    )?.id;
    assert(exerciseId);

    const log = () =>
      createCompletedSession({
        exercises: [{ exerciseId, sortOrder: 0, result: { type: "reps", value: 10 } }],
      });

    const rows = [await log(), await log()].map((id) => {
      const row = t.sqlite
        .prepare("SELECT uuid, originDevice, tzOffsetMin FROM completed_sessions WHERE id = ?")
        .get(id) as { uuid: string; originDevice: string; tzOffsetMin: number } | undefined;
      assert(row);
      return row;
    });

    const [first, second] = rows;
    assert(first);
    assert(second);

    expect(first.uuid).toMatch(UUID_V7_RE);
    expect(second.uuid).toMatch(UUID_V7_RE);
    expect(first.uuid).not.toBe(second.uuid);

    // One install, one origin — and it is the id the preferences table hands out.
    expect(first.originDevice).toBe(await getDeviceId());
    expect(second.originDevice).toBe(first.originDevice);

    // Positive east of Greenwich, the opposite sign to getTimezoneOffset().
    expect(first.tzOffsetMin).toBe(0 - new Date().getTimezoneOffset());
  });
});
