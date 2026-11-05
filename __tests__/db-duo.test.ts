import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

import Database from "better-sqlite3";

import { batiCrypto } from "../modules/bati-crypto";
import { nodeBatiCrypto } from "./helpers/nodeBatiCrypto";
import { clientMock, createTestDb } from "./helpers/testDb";

/**
 * The duo's storage through the real migrations: the hero's week read back from the journal by R1,
 * a companion's envelopes kept by last writer, and the "fallen together" count that never goes down
 * (LOT1-SPEC.md § 1 and § 3). Week 45 of 2026 runs from Monday 2 to Sunday 8 November.
 */
jest.mock("../modules/bati-crypto", () => ({ batiCrypto: jest.fn() }));

let t: ReturnType<typeof createTestDb>;
let dir: string;

beforeEach(() => {
  jest.resetModules();
  jest.mocked(batiCrypto).mockReturnValue(nodeBatiCrypto);
  jest.doMock("../modules/bati-crypto", () => ({ batiCrypto: () => nodeBatiCrypto }));
  t = createTestDb();
  jest.doMock("../db/client", () => clientMock(t));
  dir = fs.mkdtempSync(path.join(os.tmpdir(), "bati-duo-"));
});

afterEach(() => {
  t.close();
  fs.rmSync(dir, { recursive: true, force: true });
});

const duo = () => require("../db/duo") as typeof import("../db/duo");
const pairs = () => require("../db/pairs") as typeof import("../db/pairs");
const backup = () => require("../db/backup") as typeof import("../db/backup");
const merge = () => require("../db/merge") as typeof import("../db/merge");

const W45 = { isoYear: 2026, isoWeek: 45 };
const W44 = { isoYear: 2026, isoWeek: 44 };
const PAIR = "00112233445566778899aabbccddeeff";
const local = (day: number, hour = 12) => new Date(2026, 10, day, hour);
const NOW = local(9, 18);

let uuid = 0;
/** One session row; an outing needs no sets, which keeps R1 down to its outing rule. */
function session(
  performedAt: Date,
  over: { tzOffsetMin?: number; stopReason?: string; leaguesM?: number; byHand?: string } = {},
) {
  uuid += 1;
  t.sqlite
    .prepare(
      `INSERT INTO completed_sessions (uuid, performedAt, tzOffsetMin, durationSeconds, outing, leaguesM, stopReason, byHand)
       VALUES (?, ?, ?, 900, 'walk', ?, ?, ?)`,
    )
    .run(
      `s${uuid}`,
      Math.floor(performedAt.getTime() / 1000),
      over.tzOffsetMin ?? -performedAt.getTimezoneOffset(),
      over.leaguesM ?? 1500,
      over.stopReason ?? null,
      over.byHand ?? null,
    );
}

const theirs = (stamp: number, days = [1, 0, 1, 0, 0, 0, 0]) => ({
  stamp,
  goal: 2,
  paused: false,
  days,
});

async function aPair(): Promise<string> {
  await pairs().acceptInvite(
    {
      pairId: PAIR,
      senderId: "a1a2a3a4a5a6a7a8",
      madeAt: 1793750400,
      secret: Buffer.alloc(32, 7).toString("base64"),
    },
    "Léo",
  );
  return PAIR;
}

describe("my week, read from the journal (F1 to F4)", () => {
  test("an outing counts, two on one day are one hit", async () => {
    session(local(2, 9));
    session(local(2, 18));
    session(local(4));
    expect(await duo().myWeekDays(W45, NOW)).toEqual([
      true,
      false,
      true,
      false,
      false,
      false,
      false,
    ]);
  });

  test("an outing done on Sunday counts for Sunday's week, whenever it is read", async () => {
    session(local(8, 21));
    const days = await duo().myWeekDays(W45, local(10));
    expect(days[6]).toBe(true);
    expect((await duo().myWeekDays({ isoYear: 2026, isoWeek: 46 }, local(10))).some(Boolean)).toBe(
      false,
    );
  });

  test("the day is the session's own: logged at 23:30 in New York, it is that Sunday", async () => {
    // 23:30 on Sunday 8 in UTC-5 is 04:30 UTC on Monday 9, and 05:30 in Paris.
    session(new Date(Date.UTC(2026, 10, 9, 4, 30)), { tzOffsetMin: -300 });
    expect((await duo().myWeekDays(W45, local(10)))[6]).toBe(true);
  });

  test("a session dated in the future is a moved clock, not a hit", async () => {
    session(local(7));
    expect((await duo().myWeekDays(W45, local(5))).some(Boolean)).toBe(false);
  });

  test("a hand-written session and a short outing land no hit", async () => {
    session(local(3), { byHand: "session" });
    session(local(4), { leaguesM: 400 });
    expect((await duo().myWeekDays(W45, NOW)).some(Boolean)).toBe(false);
  });

  test("F5: a second pain stop in a rolling week lands no hit", async () => {
    session(local(2), { stopReason: "pain" });
    session(local(5), { stopReason: "pain" });
    expect(await duo().myWeekDays(W45, NOW)).toEqual([
      true,
      false,
      false,
      false,
      false,
      false,
      false,
    ]);
  });
});

describe("their envelopes (S4)", () => {
  test("the newer one is kept, an older or repeated one changes nothing", async () => {
    const id = await aPair();
    expect(await duo().recordTheirWeek(id, W45, theirs(100))).toBe("new");
    expect(await duo().recordTheirWeek(id, W45, theirs(100))).toBe("same");
    expect(await duo().recordTheirWeek(id, W45, theirs(50, [0, 0, 0, 0, 0, 0, 0]))).toBe("same");
    expect(await duo().recordTheirWeek(id, W45, theirs(200, [1, 1, 1, 0, 0, 0, 0]))).toBe("new");
    expect((await duo().theirWeek(id, W45))?.days).toEqual([1, 1, 1, 0, 0, 0, 0]);
  });
});

describe("a fallen boss (S1, S2, S9)", () => {
  test("both weeks kept: fallen, counted once, and it stays when the journal changes", async () => {
    const id = await aPair();
    session(local(2));
    session(local(4));
    await duo().recordTheirWeek(id, W45, theirs(Math.floor(local(5).getTime() / 1000)));
    expect((await duo().readDuoWeek({ id, goal: 2 }, W45, NOW)).result).toBe("fallen");
    expect((await duo().readDuoWeek({ id, goal: 2 }, W45, NOW)).result).toBe("fallen");
    expect(await duo().fallenTogether()).toBe(1);

    t.sqlite.exec("DELETE FROM completed_sessions");
    expect((await duo().readDuoWeek({ id, goal: 2 }, W45, NOW)).result).toBe("fallen");
  });

  test("an unlink keeps the count and drops what the companion said", async () => {
    const id = await aPair();
    session(local(2));
    session(local(4));
    await duo().recordTheirWeek(id, W45, theirs(Math.floor(local(5).getTime() / 1000)));
    await duo().recordTheirWeek(id, W44, theirs(100));
    await duo().readDuoWeek({ id, goal: 2 }, W45, NOW);

    await pairs().unlinkPair(id);
    expect(await duo().fallenTogether()).toBe(1);
    expect(await duo().theirWeek(id, W44)).toBeNull();
    const words = t.sqlite
      .prepare("SELECT count(*) AS n FROM duo_weeks WHERE days IS NOT NULL")
      .get();
    expect(words).toEqual({ n: 0 });
  });
});

describe("plaintext copies and the hero's other device", () => {
  async function fallenWeek(): Promise<string> {
    const id = await aPair();
    session(local(2));
    session(local(4));
    await duo().recordTheirWeek(id, W45, theirs(Math.floor(local(5).getTime() / 1000)));
    await duo().readDuoWeek({ id, goal: 2 }, W45, NOW);
    return id;
  }

  test("a plaintext copy keeps the count, without the companion or what they said", async () => {
    const id = await fallenWeek();
    await duo().recordTheirWeek(id, W44, theirs(100));
    t.sqlite
      .prepare("INSERT INTO user_preferences (key, value) VALUES (?, '2026-11-05')")
      .run(`duo_sent_${id}`);
    const file = path.join(dir, "plain.db");
    await backup().snapshotDatabaseTo(file);
    await backup().scrubPairs(file);
    const copy = new Database(file);
    expect(copy.prepare("SELECT count(*) AS n FROM pairs").get()).toEqual({ n: 0 });
    expect(
      copy.prepare("SELECT count(*) AS n FROM user_preferences WHERE key LIKE 'duo_sent_%'").get(),
    ).toEqual({ n: 0 });
    // Only the fallen week stays, week 44 went with what the companion said of it.
    expect(copy.prepare("SELECT stamp, goal, paused, days FROM duo_weeks").all()).toEqual([
      { stamp: null, goal: null, paused: null, days: null },
    ]);
    expect(
      copy.prepare("SELECT count(*) AS n FROM duo_weeks WHERE fallenAt IS NOT NULL").get(),
    ).toEqual({ n: 1 });
    copy.close();
  });

  test("merging another device: their newer envelope wins, the earlier fall stays", async () => {
    const id = await aPair();
    await duo().recordTheirWeek(id, W45, theirs(100));
    const file = path.join(dir, "peer.db");
    await backup().snapshotDatabaseTo(file);
    const peer = new Database(file);
    peer
      .prepare("UPDATE duo_weeks SET stamp = 300, days = ?, fallenAt = 1000 WHERE pairId = ?")
      .run(JSON.stringify([1, 1, 0, 0, 0, 0, 0]), id);
    peer
      .prepare(
        "INSERT INTO duo_weeks (pairId, isoYear, isoWeek, stamp, goal, paused, days, fallenAt) VALUES (?, 2026, 44, 50, 3, 0, '[0,0,0,0,0,0,0]', NULL)",
      )
      .run(id);
    peer.close();
    t.sqlite.prepare("UPDATE duo_weeks SET fallenAt = 2000 WHERE pairId = ?").run(id);

    await merge().mergePeer(file);
    const rows = t.sqlite
      .prepare("SELECT isoWeek, stamp, days, fallenAt FROM duo_weeks ORDER BY isoWeek")
      .all();
    expect(rows).toEqual([
      { isoWeek: 44, stamp: 50, days: "[0,0,0,0,0,0,0]", fallenAt: null },
      { isoWeek: 45, stamp: 300, days: "[1,1,0,0,0,0,0]", fallenAt: 1000 },
    ]);
  });

  test("a pair unlinked on the other device takes its companion's words here too", async () => {
    const id = await fallenWeek();
    const file = path.join(dir, "peer.db");
    await backup().snapshotDatabaseTo(file);
    const peer = new Database(file);
    peer.prepare("DELETE FROM pairs").run();
    peer
      .prepare("INSERT INTO deleted_content (uuid, deletedAt) VALUES (?, ?)")
      .run(id, 4_000_000_000);
    peer.close();

    await merge().mergePeer(file);
    await merge().honourTombstones();
    expect(await pairs().listPairs()).toHaveLength(0);
    expect(await duo().theirWeek(id, W45)).toBeNull();
    expect(await duo().fallenTogether()).toBe(1);
  });
});

describe("the frozen goal (O1)", () => {
  test("a pair freezes the flame quota, within 2 and 4", async () => {
    t.sqlite
      .prepare("INSERT INTO user_preferences (key, value) VALUES ('oath', ?)")
      .run(JSON.stringify({ metric: "weekly_sessions", weeklyTarget: 9 }));
    await aPair();
    const [pair] = await pairs().listPairs();
    assert(pair);
    expect(pair.goal).toBe(4);
  });
});
