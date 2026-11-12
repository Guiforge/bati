import { fakeHealthConnect } from "./helpers/fakeHealthConnect";
import { clientMock, createTestDb } from "./helpers/testDb";

describe("Health Connect export", () => {
  const t = createTestDb();

  beforeAll(() => {
    jest.resetModules();
    jest.doMock("../db/client", () => clientMock(t));
  });

  beforeEach(() => {
    t.sqlite.exec(
      "DELETE FROM completed_exercises; DELETE FROM completed_sessions; DELETE FROM health_export;",
    );
    t.sqlite.exec("DELETE FROM user_preferences WHERE key = 'healthExportSince'");
  });

  afterAll(() => t.close());

  const sync = () =>
    require("../src/healthExport/sync") as typeof import("../src/healthExport/sync");
  const completed = () => require("../db/completed") as typeof import("../db/completed");

  const SQUAT = 1;
  const PUSH_UPS = 2;

  function questOne(): { id: number; enTitle: string } {
    return t.sqlite.prepare("SELECT id, enTitle FROM quests ORDER BY id LIMIT 1").get() as {
      id: number;
      enTitle: string;
    };
  }

  async function play(
    reps = [15, 12],
    startedMinutesAgo = 10,
  ): Promise<{ id: number; uuid: string }> {
    const start = new Date(Date.now() - startedMinutesAgo * 60_000);
    const id = await completed().createCompletedSession({
      questId: questOne().id,
      durationSeconds: 300,
      performedAt: start,
      exercises: [
        {
          exerciseId: SQUAT,
          sortOrder: 0,
          result: { type: "reps", value: reps[0] ?? 1 },
          performedAt: new Date(start.getTime() + 60_000),
        },
        {
          exerciseId: PUSH_UPS,
          sortOrder: 1,
          result: { type: "reps", value: reps[1] ?? 1 },
          performedAt: new Date(start.getTime() + 120_000),
        },
      ],
    });
    const { uuid } = t.sqlite
      .prepare("SELECT uuid FROM completed_sessions WHERE id = ?")
      .get(id) as {
      uuid: string;
    };
    return { id, uuid };
  }

  async function switchedOn(hc: ReturnType<typeof fakeHealthConnect>, minutesAgo = 60) {
    expect(await sync().turnHealthExportOn(hc.port)).toBe(true);
    // As if the switch had been turned on a while before the session.
    t.sqlite
      .prepare("UPDATE user_preferences SET value = ? WHERE key = 'healthExportSince'")
      .run(String(Date.now() - minutesAgo * 60_000));
  }

  test("a saved quest session is one calisthenics record with the quest's name, its times and the reps done", async () => {
    const hc = fakeHealthConnect();
    await switchedOn(hc);
    const { uuid } = await play([15, 12]);

    await sync().syncHealthConnect(hc.port);

    expect(hc.records.size).toBe(1);
    const record = hc.records.get(`bati-${uuid}`);
    const row = t.sqlite
      .prepare("SELECT performedAt FROM completed_sessions WHERE uuid = ?")
      .get(uuid) as {
      performedAt: number;
    };
    expect(record?.title).toBe(questOne().enTitle);
    expect(record?.start).toBe(row.performedAt * 1000);
    expect(record?.end).toBe((row.performedAt + 300) * 1000);
    // Squat has a segment type; push-ups have none and are named in the notes with their reps.
    expect(record?.segments.map((s) => s.reps)).toEqual([15]);
    expect(record?.notes).toContain("12");
  });

  test("writing the same session twice leaves one record", async () => {
    const hc = fakeHealthConnect();
    await switchedOn(hc);
    const { uuid } = await play();

    await sync().syncHealthConnect(hc.port);
    // As if the ledger had been lost between the write and its bookkeeping (the app killed).
    t.sqlite.exec("DELETE FROM health_export");
    await sync().syncHealthConnect(hc.port);
    await sync().syncHealthConnect(hc.port);

    expect([...hc.records.keys()]).toEqual([`bati-${uuid}`]);
  });

  test("a corrected session updates its record, a deleted one takes it back", async () => {
    const hc = fakeHealthConnect();
    await switchedOn(hc);
    const { id, uuid } = await play([15, 12]);
    await sync().syncHealthConnect(hc.port);

    const squatSet = t.sqlite
      .prepare("SELECT id FROM completed_exercises WHERE sessionId = ? AND exerciseId = ?")
      .get(id, SQUAT) as { id: number };
    const { correctLoggedSet } =
      require("../db/personalRecords") as typeof import("../db/personalRecords");
    expect(await correctLoggedSet(squatSet.id, 20)).toBe("updated");
    await sync().syncHealthConnect(hc.port);
    expect(hc.records.get(`bati-${uuid}`)?.segments[0]?.reps).toBe(20);
    expect(hc.records.size).toBe(1);

    expect(await completed().deleteSession(id)).toBe("deleted");
    await sync().syncHealthConnect(hc.port);
    expect(hc.records.size).toBe(0);
    expect(t.sqlite.prepare("SELECT count(*) n FROM health_export").get()).toEqual({ n: 0 });
  });

  // PR 2 changed this on purpose: a refused record used to stay owed and be retried on every run
  // forever; it is now marked failed at its version and counted, and retried once corrected.
  test("a session Health Connect refuses holds back neither the sessions after it nor the deletions", async () => {
    const hc = fakeHealthConnect();
    await switchedOn(hc);
    const gone = await play([5, 5], 30);
    await sync().syncHealthConnect(hc.port);
    const refused = await play([15, 12], 20);
    const later = await play([10, 10], 10);
    hc.state.refused.add(`bati-${refused.uuid}`);
    expect(await completed().deleteSession(gone.id)).toBe("deleted");

    await sync().syncHealthConnect(hc.port);

    expect([...hc.records.keys()]).toEqual([`bati-${later.uuid}`]);
    expect(await sync().readHealthExportState(hc.port)).toMatchObject({
      kind: "on",
      pending: 0,
      failed: 1,
    });
  });

  test("switching off during a run stops it before the next session", async () => {
    const hc = fakeHealthConnect();
    await switchedOn(hc);
    await play([15, 12], 20);
    await play([10, 10], 10);
    hc.state.onUpsert = () => sync().turnHealthExportOff();

    await sync().syncHealthConnect(hc.port);

    expect(hc.calls.upsert).toBe(1);
  });

  test("a restore that brings the journal back as it was rewrites nothing", async () => {
    const hc = fakeHealthConnect();
    await switchedOn(hc);
    const { id } = await play([15, 12]);
    const squatSet = t.sqlite
      .prepare("SELECT id FROM completed_exercises WHERE sessionId = ? AND exerciseId = ?")
      .get(id, SQUAT) as { id: number };
    const { correctLoggedSet } =
      require("../db/personalRecords") as typeof import("../db/personalRecords");
    await correctLoggedSet(squatSet.id, 20);
    await sync().syncHealthConnect(hc.port);
    const writes = hc.calls.upsert;

    // An older backup: the session as it was before the correction, the ledger kept by the restore.
    t.sqlite.prepare("UPDATE completed_sessions SET setsEditedAt = NULL WHERE id = ?").run(id);
    await sync().syncHealthConnect(hc.port);

    expect(hc.calls.upsert).toBe(writes);
    expect(await sync().readHealthExportState(hc.port)).toMatchObject({ kind: "on", pending: 0 });
  });

  test("a session another device recorded is not written; a correction to one this phone wrote is", async () => {
    const hc = fakeHealthConnect();
    await switchedOn(hc);
    const theirs = await play([5, 5]);
    t.sqlite
      .prepare("UPDATE completed_sessions SET originDevice = 'their-phone' WHERE id = ?")
      .run(theirs.id);
    const mine = await play([15, 12]);
    await sync().syncHealthConnect(hc.port);
    expect([...hc.records.keys()]).toEqual([`bati-${mine.uuid}`]);

    // What a merge does with a correction made on the other phone (db/merge.ts, 0072): the sets
    // and the later stamp come over together.
    t.sqlite
      .prepare(
        "UPDATE completed_exercises SET resultValue = 18 WHERE sessionId = ? AND exerciseId = ?",
      )
      .run(mine.id, SQUAT);
    t.sqlite
      .prepare("UPDATE completed_sessions SET setsEditedAt = unixepoch() + 5 WHERE id = ?")
      .run(mine.id);
    await sync().syncHealthConnect(hc.port);

    expect(hc.records.get(`bati-${mine.uuid}`)?.segments[0]?.reps).toBe(18);
    expect(hc.records.has(`bati-${theirs.uuid}`)).toBe(false);
  });

  test("a failed write keeps the session pending, silently, and the next start writes it", async () => {
    const hc = fakeHealthConnect();
    await switchedOn(hc);
    const { uuid } = await play();
    hc.state.failWrites = 1;

    await expect(sync().syncHealthConnect(hc.port)).rejects.toThrow("Health Connect said no");
    expect(await sync().readHealthExportState(hc.port)).toMatchObject({ kind: "on", pending: 1 });

    await sync().syncHealthConnect(hc.port);
    expect(hc.records.has(`bati-${uuid}`)).toBe(true);
    expect(await sync().readHealthExportState(hc.port)).toMatchObject({ kind: "on", pending: 0 });
  });

  test("switch off: nothing is written and nothing is owed, then or later", async () => {
    const hc = fakeHealthConnect();
    await play();
    await sync().syncHealthConnect(hc.port);
    expect(hc.calls.upsert).toBe(0);
    expect(await sync().readHealthExportState(hc.port)).toEqual({ kind: "off" });

    // Turned on now: what was done before stays out (sending the past is PR 2).
    expect(await sync().turnHealthExportOn(hc.port)).toBe(true);
    await sync().syncHealthConnect(hc.port);
    expect(hc.calls.upsert).toBe(0);

    await sync().turnHealthExportOff();
    await play([1, 1], 0);
    await sync().syncHealthConnect(hc.port);
    expect(hc.calls.upsert).toBe(0);
  });

  test("a hand-written session is not one the player recorded", async () => {
    const hc = fakeHealthConnect();
    await switchedOn(hc);
    const hand = await play();
    t.sqlite.prepare("UPDATE completed_sessions SET byHand = 'session' WHERE id = ?").run(hand.id);

    await sync().syncHealthConnect(hc.port);
    expect(hc.calls.upsert).toBe(0);
  });

  test("permission taken back in Android: no write, no crash, the switch says so, nothing lost", async () => {
    const hc = fakeHealthConnect();
    await switchedOn(hc);
    hc.state.permitted = false;
    await play();

    await sync().syncHealthConnect(hc.port);
    expect(hc.calls.upsert).toBe(0);
    expect(await sync().readHealthExportState(hc.port)).toMatchObject({
      kind: "withdrawn",
      pending: 1,
    });

    // Given back: the session kept waiting and goes now.
    expect(
      await sync().turnHealthExportOn({
        ...hc.port,
        requestPermission: () => Promise.resolve(true),
      }),
    ).toBe(true);
    hc.state.permitted = true;
    await sync().syncHealthConnect(hc.port);
    expect(hc.records.size).toBe(1);
  });

  test("permission refused: the switch stays off", async () => {
    const hc = fakeHealthConnect();
    hc.state.permitted = false;
    expect(await sync().turnHealthExportOn(hc.port)).toBe(false);
    expect(await sync().readHealthExportState(hc.port)).toEqual({ kind: "off" });
  });

  test("Health Connect absent: the setting does not exist and nothing is called", async () => {
    const hc = fakeHealthConnect();
    await switchedOn(hc);
    hc.state.present = false;
    hc.calls.permission = 0;
    await play();

    await sync().syncHealthConnect(hc.port);
    expect(await sync().readHealthExportState(hc.port)).toEqual({ kind: "unavailable" });
    expect(hc.calls).toMatchObject({ upsert: 0, remove: 0, permission: 0 });
  });
});
