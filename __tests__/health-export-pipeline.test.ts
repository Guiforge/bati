import { type FakeHealthConnect, fakeHealthConnect } from "./helpers/fakeHealthConnect";
import { brokenInvariants, healthJournal } from "./helpers/healthExportJournal";
import { clientMock, createTestDb } from "./helpers/testDb";

/**
 * W-04 PR 2, the rules of the brief one by one, against a real SQLite with every migration and a
 * fake Health Connect that behaves like the real one (client ids, versions, permissions).
 */
describe("Health Connect export: outings, route, past sessions", () => {
  const t = createTestDb();
  const j = healthJournal(t);
  const DAY = 24 * 60;

  beforeAll(() => {
    jest.resetModules();
    jest.doMock("../db/client", () => clientMock(t));
  });

  beforeEach(() => {
    t.sqlite.exec(
      "DELETE FROM completed_exercises; DELETE FROM completed_sessions; DELETE FROM health_export; DELETE FROM gps_points;",
    );
    t.sqlite.exec("DELETE FROM user_preferences WHERE key LIKE 'health%'");
  });

  afterAll(() => t.close());

  const sync = () =>
    require("../src/healthExport/sync") as typeof import("../src/healthExport/sync");

  async function switchedOn(hc: FakeHealthConnect, minutesAgo = 60) {
    expect(await sync().turnHealthExportOn(hc.port)).toBe(true);
    t.sqlite
      .prepare("UPDATE user_preferences SET value = ? WHERE key = 'healthExportSince'")
      .run(String(Date.now() - minutesAgo * 60_000));
  }

  const ledger = () =>
    t.sqlite.prepare("SELECT sessionUuid, version, route, failed FROM health_export").all() as {
      sessionUuid: string;
      version: number;
      route: number;
      failed: string | null;
    }[];

  async function settled(hc: FakeHealthConnect) {
    await sync().syncHealthConnect(hc.port);
    expect(await brokenInvariants(t, hc)).toEqual([]);
  }

  async function historyFixture() {
    const entries: { id: number; uuid: string; minutesAgo: number }[] = [];
    for (let i = 0; i < 45; i++) {
      const minutesAgo = (i + 2) * DAY;
      const entry =
        i % 3 === 0 ? await j.outing("run", minutesAgo) : await j.quest(minutesAgo, [10 + i, 8]);
      entries.push({ ...entry, minutesAgo });
    }
    return entries;
  }

  describe("1. GPS outings", () => {
    test.each([
      ["run", 56],
      ["ride", 8],
      ["walk", 79],
    ] as const)("a saved %s is one session of its type, plus its distance", async (kind, type) => {
      const hc = fakeHealthConnect();
      await switchedOn(hc);
      const { uuid } = await j.outing(kind, 10, { meters: 5400 });

      await settled(hc);

      expect(hc.records.size).toBe(1);
      const record = hc.records.get(`bati-${uuid}`);
      const row = t.sqlite
        .prepare("SELECT performedAt, durationSeconds FROM completed_sessions WHERE uuid = ?")
        .get(uuid) as { performedAt: number; durationSeconds: number };
      expect(record).toMatchObject({
        exerciseType: type,
        start: row.performedAt * 1000,
        end: (row.performedAt + row.durationSeconds) * 1000,
        segments: [],
        route: null,
      });
      expect([...hc.distances.values()]).toEqual([
        expect.objectContaining({ id: `bati-${uuid}-distance`, meters: 5400 }),
      ]);
    });

    test("an outing with no GPS points is a session without a distance", async () => {
      const hc = fakeHealthConnect();
      await switchedOn(hc);
      await j.outing("walk", 10, { points: 0 });
      await settled(hc);
      expect(hc.records.size).toBe(1);
      expect(hc.distances.size).toBe(0);
    });

    test("corrected in Bati: session and distance updated; deleted: both gone", async () => {
      const hc = fakeHealthConnect();
      await switchedOn(hc);
      const { id, uuid } = await j.outing("walk", 10, { points: 0 });
      await settled(hc);

      await j.typeDistance(id, 900);
      await settled(hc);
      expect(hc.records.size).toBe(1);
      expect(hc.distances.get(`bati-${uuid}-distance`)?.meters).toBe(900);
      const first = hc.records.get(`bati-${uuid}`)?.version ?? 0;

      await j.typeDistance(id, 950);
      await settled(hc);
      expect(hc.records.get(`bati-${uuid}`)?.version).toBeGreaterThan(first);
      expect(hc.distances.get(`bati-${uuid}-distance`)?.meters).toBe(950);

      // The typed distance taken back: the distance record goes with it.
      await j.typeDistance(id, null);
      await settled(hc);
      expect(hc.records.size).toBe(1);
      expect(hc.distances.size).toBe(0);

      await j.typeDistance(id, 800);
      await settled(hc);
      await j.remove(id);
      await settled(hc);
      expect(hc.records.size).toBe(0);
      expect(hc.distances.size).toBe(0);
    });

    test('a quest that no longer exists: the outing is named "Bati session"', async () => {
      const hc = fakeHealthConnect();
      await switchedOn(hc);
      const { id, uuid } = await j.outing("walk", 10);
      t.sqlite.prepare("UPDATE completed_sessions SET questId = NULL WHERE id = ?").run(id);
      await settled(hc);
      expect(hc.records.get(`bati-${uuid}`)?.title).toBe("Bati session");
    });

    test("an outing recorded on another phone is never written on its own", async () => {
      const hc = fakeHealthConnect();
      await switchedOn(hc);
      const { id } = await j.outing("run", 10);
      j.fromOtherPhone(id);
      await settled(hc);
      expect(hc.calls.upsert).toBe(0);
    });

    test("a failed write is retried silently on the next run, never doubled", async () => {
      const hc = fakeHealthConnect();
      await switchedOn(hc);
      await j.outing("run", 10);
      hc.state.failWrites = 1;
      await expect(sync().syncHealthConnect(hc.port)).rejects.toThrow("Health Connect said no");
      expect(hc.records.size).toBe(0);
      expect(await sync().readHealthExportState(hc.port)).toMatchObject({ pending: 1, failed: 0 });
      await settled(hc);
      expect(hc.records.size).toBe(1);
      expect(hc.distances.size).toBe(1);
    });
  });

  describe("2. With the GPS route", () => {
    test("off: no route is written, and the route permission is never asked", async () => {
      const hc = fakeHealthConnect();
      await switchedOn(hc);
      await j.outing("run", 10);
      await settled(hc);
      expect([...hc.records.values()][0]?.route).toBeNull();
      expect(hc.calls.routeRequest).toBe(0);
      expect(ledger()[0]?.route).toBe(0);
    });

    test("on: the route is written; off again: the next outing has none, the earlier keeps its own", async () => {
      const hc = fakeHealthConnect();
      await switchedOn(hc);
      expect(await sync().turnHealthRouteOn(hc.port)).toBe(true);
      expect(hc.calls.routeRequest).toBe(1);
      const first = await j.outing("run", 30, { points: 12 });
      await settled(hc);
      const route = hc.records.get(`bati-${first.uuid}`)?.route;
      expect(route).toHaveLength(12);
      // Where and when, nothing else: no altitude, no speed, no accuracy.
      expect(Object.keys(route?.[0] ?? {}).sort()).toEqual(["lat", "lon", "t"]);

      await sync().turnHealthRouteOff();
      const second = await j.outing("walk", 10);
      // The earlier outing corrected after the option went off: rewritten, with its route kept.
      j.correctedElsewhere(first.id);
      await settled(hc);
      expect(hc.records.get(`bati-${second.uuid}`)?.route).toBeNull();
      expect(hc.records.get(`bati-${first.uuid}`)?.route).toHaveLength(12);
      expect(hc.calls.upsert).toBe(3);
    });

    test("Android already allows the route, the option is off: still no route", async () => {
      // Granted long ago, or by another app's prompt: the option is the hero's word, not Android's.
      const hc = fakeHealthConnect();
      hc.state.routePermitted = true;
      await switchedOn(hc);
      await j.outing("run", 10);
      await sync().startHealthHistory();
      await j.outing("walk", 3 * DAY);
      await settled(hc);
      expect([...hc.records.values()].map((r) => r.route)).toEqual([null, null]);
    });

    test("turned on later: outings already sent are not sent again", async () => {
      const hc = fakeHealthConnect();
      await switchedOn(hc);
      const before = await j.outing("run", 30);
      await settled(hc);
      await sync().turnHealthRouteOn(hc.port);
      await settled(hc);
      expect(hc.calls.upsert).toBe(1);
      // Even corrected, it keeps the choice of its first write.
      j.correctedElsewhere(before.id);
      await settled(hc);
      expect(hc.records.get(`bati-${before.uuid}`)?.route).toBeNull();
    });

    test("refused: the option stays off, calmly, and outings still go", async () => {
      const hc = fakeHealthConnect();
      await switchedOn(hc);
      hc.state.routeGrant = false;
      expect(await sync().turnHealthRouteOn(hc.port)).toBe(false);
      expect(await sync().readHealthExportState(hc.port)).toMatchObject({ route: false });
      await j.outing("ride", 10);
      await settled(hc);
      expect(hc.records.size).toBe(1);
      expect(hc.calls.forbidden).toBe(0);
    });

    test("removed later in Android: outings go without the route, the option shows off", async () => {
      const hc = fakeHealthConnect();
      await switchedOn(hc);
      await sync().turnHealthRouteOn(hc.port);
      hc.state.routePermitted = false;
      const { uuid } = await j.outing("run", 10);
      await settled(hc);
      expect(hc.records.get(`bati-${uuid}`)?.route).toBeNull();
      expect(hc.calls.forbidden).toBe(0);
      expect(await sync().readHealthExportState(hc.port)).toMatchObject({ route: false });
      // Given back in Android: the option stays off until the hero turns it on.
      hc.state.routePermitted = true;
      expect(await sync().readHealthExportState(hc.port)).toMatchObject({ route: false });
    });

    test("turning the main switch off turns the route option off with it", async () => {
      const hc = fakeHealthConnect();
      await switchedOn(hc);
      await sync().turnHealthRouteOn(hc.port);
      await sync().turnHealthExportOff();
      await switchedOn(hc);
      expect(await sync().readHealthExportState(hc.port)).toMatchObject({ route: false });
    });
  });

  describe("3. Past sessions", () => {
    test("the question is asked once: never again, after a restart or with nothing done", async () => {
      const hc = fakeHealthConnect();
      await j.quest(3 * DAY);
      expect(await sync().takeHistoryQuestion()).toBe(false); // switch off: not now
      await switchedOn(hc);
      expect(await sync().takeHistoryQuestion()).toBe(true);
      expect(await sync().takeHistoryQuestion()).toBe(false);
      jest.isolateModules(() => {
        // A fresh module registry: what was asked lives in the database, not in memory.
        const fresh =
          require("../src/healthExport/sync") as typeof import("../src/healthExport/sync");
        return expect(fresh.takeHistoryQuestion()).resolves.toBe(false);
      });
      // Off and on again: still never asked twice.
      await sync().turnHealthExportOff();
      await switchedOn(hc);
      expect(await sync().takeHistoryQuestion()).toBe(false);
    });

    test("nothing in the past: no question", async () => {
      const hc = fakeHealthConnect();
      await switchedOn(hc);
      expect(await sync().takeHistoryQuestion()).toBe(false);
    });

    test("every eligible entry is sent, newest first, in batches, and the run ends", async () => {
      const hc = fakeHealthConnect();
      const entries = await historyFixture();
      const hand = await j.quest(50 * DAY);
      t.sqlite
        .prepare("UPDATE completed_sessions SET byHand = 'session' WHERE id = ?")
        .run(hand.id);
      await switchedOn(hc);
      await sync().startHealthHistory();
      const yields = jest.spyOn(global, "setTimeout");

      await settled(hc);

      expect(hc.records.size).toBe(45);
      expect(hc.writes).toEqual(entries.map((e) => `bati-${e.uuid}`));
      const zeroDelay = yields.mock.calls.filter(([, ms]) => ms === 0).length;
      expect(zeroDelay).toBeGreaterThanOrEqual(Math.ceil(45 / sync().HEALTH_EXPORT_BATCH));
      yields.mockRestore();
      expect(await sync().readHealthExportState(hc.port)).toMatchObject({
        history: { running: false, done: 45, total: 45, left: 0 },
      });
    });

    test("killed mid-run, restarted: it finishes, and nothing is doubled", async () => {
      const hc = fakeHealthConnect();
      await historyFixture();
      await switchedOn(hc);
      await sync().startHealthHistory();
      // The 23rd write lands in Health Connect and the process dies before the ledger hears of it.
      hc.state.hangAfterWrites = 23;
      sync()
        .syncHealthConnect(hc.port)
        .catch(() => undefined);
      await new Promise((resolve) => setTimeout(resolve, 200));
      expect(hc.writes).toHaveLength(23);

      // Next start: a new process on the same database and the same Health Connect.
      hc.state.hangAfterWrites = Number.POSITIVE_INFINITY;
      jest.resetModules();
      jest.doMock("../db/client", () => clientMock(t));
      await settled(hc);

      expect(hc.records.size).toBe(45);
      expect(new Set(hc.writes).size).toBe(45);
      // The one written but not marked is written once more at the same version, which Health
      // Connect ignores: still one record.
      expect(hc.writes).toHaveLength(46);
    });

    test("killed between Health Connect's answer and the ledger, then deleted: still taken back", async () => {
      // The property test's counterexample, kept as a scenario: the ledger used to learn of a write
      // only after Health Connect answered, so this record was orphaned for good.
      const hc = fakeHealthConnect();
      await switchedOn(hc);
      const { id } = await j.outing("walk", 5, { points: 0 });
      hc.state.hangAfterWrites = 1;
      sync()
        .syncHealthConnect(hc.port)
        .catch(() => undefined);
      await new Promise((resolve) => setTimeout(resolve, 100));
      expect(hc.records.size).toBe(1);

      hc.state.hangAfterWrites = Number.POSITIVE_INFINITY;
      jest.resetModules();
      jest.doMock("../db/client", () => clientMock(t));
      await j.remove(id);
      await settled(hc);
      expect(hc.records.size).toBe(0);
    });

    test("run twice: nothing doubled, nothing rewritten", async () => {
      const hc = fakeHealthConnect();
      await historyFixture();
      await switchedOn(hc);
      await sync().startHealthHistory();
      await settled(hc);
      await sync().startHealthHistory();
      await settled(hc);
      expect(hc.records.size).toBe(45);
      expect(hc.writes).toHaveLength(45);
    });

    test("stopped: what is sent stays, and starting again continues", async () => {
      const hc = fakeHealthConnect();
      await historyFixture();
      await switchedOn(hc);
      await sync().startHealthHistory();
      hc.state.onUpsert = () => {
        if (hc.writes.length === 4) return sync().stopHealthHistory();
      };
      await settled(hc);
      const sent = hc.records.size;
      expect(sent).toBeLessThan(45);
      expect(await sync().readHealthExportState(hc.port)).toMatchObject({
        history: { running: false, done: sent, left: 45 - sent },
      });

      hc.state.onUpsert = () => undefined;
      await sync().startHealthHistory();
      await settled(hc);
      expect(hc.records.size).toBe(45);
      expect(hc.writes).toHaveLength(45);
    });

    test("a session finished during a run goes through the normal path first", async () => {
      const hc = fakeHealthConnect();
      await historyFixture();
      await switchedOn(hc);
      await sync().startHealthHistory();
      let fresh = "";
      hc.state.onUpsert = async () => {
        if (hc.writes.length !== 3 || fresh) return;
        fresh = (await j.quest(1)).uuid;
        sync()
          .syncHealthConnect(hc.port)
          .catch(() => undefined);
      };
      await settled(hc);
      const at = hc.writes.indexOf(`bati-${fresh}`);
      // Written in the batch right after it was saved, ahead of the 25 history entries left.
      expect(at).toBeGreaterThanOrEqual(0);
      expect(at).toBeLessThanOrEqual(sync().HEALTH_EXPORT_BATCH);
      expect(hc.records.size).toBe(46);
    });

    test("one refused entry does not stop the run, and the failed count is exact", async () => {
      const hc = fakeHealthConnect();
      const entries = await historyFixture();
      const refused = [entries[3], entries[17], entries[40]];
      for (const e of refused) hc.state.refused.add(`bati-${e?.uuid}`);
      await switchedOn(hc);
      await sync().startHealthHistory();
      await settled(hc);
      expect(hc.records.size).toBe(42);
      expect(await sync().readHealthExportState(hc.port)).toMatchObject({
        failed: 3,
        pending: 0,
        history: { running: false, left: 0 },
      });
      expect(ledger().filter((r) => r.failed !== null)).toHaveLength(3);
      // Not tried again until the entry changes; then it goes.
      await sync().startHealthHistory();
      await settled(hc);
      expect(hc.writes).toHaveLength(42);
      hc.state.refused.clear();
      j.correctedElsewhere(refused[0]?.id ?? 0);
      await settled(hc);
      expect(hc.records.size).toBe(43);
      expect(await sync().readHealthExportState(hc.port)).toMatchObject({ failed: 2 });
    });

    test("a transient failure leaves the entry owed and the run on, then it goes", async () => {
      const hc = fakeHealthConnect();
      await historyFixture();
      await switchedOn(hc);
      await sync().startHealthHistory();
      hc.state.failOnCall = 7;
      await expect(sync().syncHealthConnect(hc.port)).rejects.toThrow("Rate limited");
      expect(hc.records.size).toBe(44);
      // Tried once, it is now this phone's to send: owed on the normal path, retried silently.
      expect(await sync().readHealthExportState(hc.port)).toMatchObject({
        failed: 0,
        pending: 1,
        history: { done: 44, total: 45, left: 0 },
      });
      await settled(hc);
      expect(hc.records.size).toBe(45);
      expect(hc.writes).toHaveLength(45);
    });

    test("permission removed mid-run: paused, nothing lost, it resumes", async () => {
      const hc = fakeHealthConnect();
      await historyFixture();
      await switchedOn(hc);
      await sync().startHealthHistory();
      hc.state.revokeAfterWrites = 10;
      await sync().syncHealthConnect(hc.port);
      expect(hc.records.size).toBe(10);
      expect(hc.calls.forbidden).toBe(1);
      expect(await sync().readHealthExportState(hc.port)).toMatchObject({
        kind: "withdrawn",
        history: { running: true, done: 10 },
      });

      hc.state.revokeAfterWrites = Number.POSITIVE_INFINITY;
      hc.state.permitted = true;
      await settled(hc);
      expect(hc.records.size).toBe(45);
      expect(hc.writes).toHaveLength(45);
    });

    test("entries from another phone: sent by a run, never on their own", async () => {
      const hc = fakeHealthConnect();
      await switchedOn(hc);
      const theirs = await j.quest(5);
      j.fromOtherPhone(theirs.id);
      await settled(hc);
      expect(hc.calls.upsert).toBe(0);

      await sync().startHealthHistory();
      await settled(hc);
      expect([...hc.records.keys()]).toEqual([`bati-${theirs.uuid}`]);
    });

    test("after sending, a past entry is like any other: corrected is updated, deleted is deleted", async () => {
      const hc = fakeHealthConnect();
      const quest = await j.quest(10 * DAY);
      const theirs = await j.outing("walk", 9 * DAY, { points: 0 });
      j.fromOtherPhone(theirs.id);
      await switchedOn(hc);
      await sync().startHealthHistory();
      await settled(hc);

      await j.correctQuest(quest.id, 40);
      await j.typeDistance(theirs.id, 700);
      await settled(hc);
      expect(hc.records.get(`bati-${quest.uuid}`)?.segments[0]?.reps).toBe(40);
      expect(hc.distances.get(`bati-${theirs.uuid}-distance`)?.meters).toBe(700);

      await j.remove(quest.id);
      await j.remove(theirs.id);
      await settled(hc);
      expect(hc.records.size).toBe(0);
      expect(hc.distances.size).toBe(0);
    });

    test("restoring an older backup after a run: no rewrite storm, nothing taken back", async () => {
      const hc = fakeHealthConnect();
      const entries = await historyFixture();
      await switchedOn(hc);
      await sync().startHealthHistory();
      await settled(hc);
      // The older copy lacks the ten newest entries; keepDeviceSettings keeps this phone's ledger
      // rows for the entries the copy holds (db-keep-device-settings), and a reload follows.
      const newest = entries.slice(0, 10);
      for (const e of newest) {
        t.sqlite.prepare("DELETE FROM health_export WHERE sessionUuid = ?").run(e.uuid);
        t.sqlite.prepare("DELETE FROM completed_sessions WHERE id = ?").run(e.id);
      }
      jest.resetModules();
      jest.doMock("../db/client", () => clientMock(t));
      const before = hc.calls.upsert;

      await sync().syncHealthConnect(hc.port);

      expect(hc.calls.upsert).toBe(before);
      expect(hc.calls.remove).toBe(0);
      expect(hc.records.size).toBe(45);
    });

    test("routes follow the option at the moment of sending", async () => {
      const hc = fakeHealthConnect();
      const old = await j.outing("run", 3 * DAY);
      await switchedOn(hc);
      await sync().turnHealthRouteOn(hc.port);
      await sync().startHealthHistory();
      await settled(hc);
      expect(hc.records.get(`bati-${old.uuid}`)?.route).not.toBeNull();
      expect(ledger()[0]?.route).toBe(1);
    });

    test("a delete Health Connect refuses for the moment stays owed, then goes", async () => {
      const hc = fakeHealthConnect();
      await switchedOn(hc);
      const { id } = await j.outing("run", 10);
      await settled(hc);
      await j.remove(id);
      hc.state.removeThrows = true;
      await expect(sync().syncHealthConnect(hc.port)).rejects.toThrow("busy");
      expect(await sync().readHealthExportState(hc.port)).toMatchObject({ pending: 1 });
      hc.state.removeThrows = false;
      await settled(hc);
      expect(hc.records.size).toBe(0);
      expect(hc.distances.size).toBe(0);
    });

    test("switch off during a run: it stops, and nothing more is written until it is on again", async () => {
      const hc = fakeHealthConnect();
      await historyFixture();
      await switchedOn(hc);
      await sync().startHealthHistory();
      hc.state.onUpsert = () => {
        if (hc.writes.length === 5) return sync().turnHealthExportOff();
      };
      await sync().syncHealthConnect(hc.port);
      const sent = hc.calls.upsert;
      await sync().syncHealthConnect(hc.port);
      expect(hc.calls.upsert).toBe(sent);
      expect(await sync().readHealthExportState(hc.port)).toEqual({ kind: "off" });
    });
  });

  describe("4. The line in the session detail", () => {
    test("nothing while off; waiting when owed; sent once written", async () => {
      const hc = fakeHealthConnect();
      const { uuid } = await j.quest(10);
      expect(await sync().healthExportStatus(hc.port, uuid)).toBeNull();
      await switchedOn(hc);
      expect(await sync().healthExportStatus(hc.port, uuid)).toBe("waiting");
      await settled(hc);
      expect(await sync().healthExportStatus(hc.port, uuid)).toBe("sent");
      hc.state.present = false;
      expect(await sync().healthExportStatus(hc.port, uuid)).toBeNull();
    });

    test("only for what this phone wrote or queued", async () => {
      const hc = fakeHealthConnect();
      await switchedOn(hc);
      const theirs = await j.quest(10);
      j.fromOtherPhone(theirs.id);
      const old = await j.quest(5 * DAY);
      const hand = await j.quest(5);
      t.sqlite
        .prepare("UPDATE completed_sessions SET byHand = 'session' WHERE id = ?")
        .run(hand.id);
      for (const e of [theirs, old, hand]) {
        expect(await sync().healthExportStatus(hc.port, e.uuid)).toBeNull();
      }
      // A history run queues them: now they are waiting.
      await sync().startHealthHistory();
      expect(await sync().healthExportStatus(hc.port, theirs.uuid)).toBe("waiting");
      expect(await sync().healthExportStatus(hc.port, hand.uuid)).toBeNull();
    });

    test("a corrected entry is waiting until it is sent again; a refused one says nothing", async () => {
      const hc = fakeHealthConnect();
      await switchedOn(hc);
      const { id, uuid } = await j.quest(10);
      await settled(hc);
      await j.correctQuest(id, 30);
      expect(await sync().healthExportStatus(hc.port, uuid)).toBe("waiting");
      hc.state.refused.add(`bati-${uuid}`);
      await sync().syncHealthConnect(hc.port);
      expect(await sync().healthExportStatus(hc.port, uuid)).toBeNull();
    });
  });
});
