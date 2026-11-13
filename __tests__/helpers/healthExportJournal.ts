import assert from "node:assert/strict";
import type Database from "better-sqlite3";
import type { Locomotion } from "../../db/schema";
import type { HealthRecord } from "../../src/healthExport/port";
import type { FakeHealthConnect } from "./fakeHealthConnect";

/**
 * Journal entries as the app writes them (`createCompletedSession`, `appendPoints`, the journal's
 * own correction and deletion functions), for the Health Connect export suites. Modules are
 * required lazily: each suite mocks `db/client` and may reset the registry to simulate a kill.
 */
export function healthJournal(t: { sqlite: Database.Database }) {
  const completed = () => require("../../db/completed") as typeof import("../../db/completed");
  const gps = () => require("../../db/gps") as typeof import("../../db/gps");
  const SQUAT = 1;
  const PUSH_UPS = 2;

  const questId = () =>
    (t.sqlite.prepare("SELECT id FROM quests ORDER BY id LIMIT 1").get() as { id: number }).id;
  const MOVEMENT = { walk: "Warden's Walk", run: "Messenger's Run", ride: "Outrider's Ride" };
  const outingMovement = (kind: Locomotion) =>
    (
      t.sqlite
        .prepare("SELECT id FROM exercises WHERE enName = ? AND creator = 'Admin'")
        .get(MOVEMENT[kind]) as { id: number }
    ).id;
  const uuidOf = (id: number) =>
    (
      t.sqlite.prepare("SELECT uuid FROM completed_sessions WHERE id = ?").get(id) as {
        uuid: string;
      }
    ).uuid;

  return {
    /** A quest played in the session player, `minutesAgo` before now. */
    async quest(minutesAgo: number, reps: [number, number] = [15, 12]) {
      const start = new Date(Date.now() - minutesAgo * 60_000);
      const id = await completed().createCompletedSession({
        questId: questId(),
        durationSeconds: 300,
        performedAt: start,
        exercises: [
          {
            exerciseId: SQUAT,
            sortOrder: 0,
            result: { type: "reps", value: reps[0] },
            performedAt: new Date(start.getTime() + 60_000),
          },
          {
            exerciseId: PUSH_UPS,
            sortOrder: 1,
            result: { type: "reps", value: reps[1] },
            performedAt: new Date(start.getTime() + 120_000),
          },
        ],
      });
      return { id, uuid: uuidOf(id) };
    },

    /**
     * An outing saved by the player: its leagues and moving time from the reducer, its fixes one
     * every 10 s. No fixes at all is an outing whose service never started (no distance, no trace).
     */
    async outing(kind: Locomotion, minutesAgo: number, { meters = 3200, points = 30 } = {}) {
      const start = new Date(Date.now() - minutesAgo * 60_000);
      const durationSeconds = Math.max(points * 10, 600);
      const id = await completed().createCompletedSession({
        questId: questId(),
        durationSeconds,
        performedAt: start,
        outing: kind,
        leaguesM: points > 0 ? meters : null,
        movingSeconds: points > 0 ? durationSeconds - 60 : null,
        // The one set an outing has, as the player saves it: its movement, timed.
        exercises: [
          {
            exerciseId: outingMovement(kind),
            sortOrder: 0,
            result: { type: "time", value: durationSeconds },
            performedAt: new Date(start.getTime() + durationSeconds * 1000),
          },
        ],
      });
      const uuid = uuidOf(id);
      await gps().appendPoints(
        uuid,
        Array.from({ length: points }, (_, i) => ({
          t: start.getTime() + i * 10_000,
          lat: 48.85 + i * 1e-4,
          lon: 2.35 + i * 1e-4,
          ele: 35,
          baro: null,
          acc: 4,
          speed: 2.5,
          distFromPrev: i === 0 ? 0 : 11,
        })),
      );
      return { id, uuid };
    },

    /** The journal's own correction: a set's reps changed after saving. */
    async correctQuest(id: number, reps: number) {
      const set = t.sqlite
        .prepare(
          "SELECT id FROM completed_exercises WHERE sessionId = ? ORDER BY sortOrder LIMIT 1",
        )
        .get(id) as { id: number } | undefined;
      assert(set);
      const { correctLoggedSet } =
        require("../../db/personalRecords") as typeof import("../../db/personalRecords");
      assert.equal(await correctLoggedSet(set.id, reps), "updated");
    },

    /** The journal's correction for an outing without a trace: the hero types its distance. */
    async typeDistance(id: number, meters: number | null) {
      const { setHandDistance } =
        require("../../db/handEntries") as typeof import("../../db/handEntries");
      const result = await setHandDistance(id, meters);
      assert.equal(result.ok, true);
    },

    /**
     * What a merge does with a correction made on the other phone: the later stamp travels with
     * the row (db/merge.ts, 0072). Works on any entry, outings with a trace included.
     */
    correctedElsewhere(id: number) {
      t.sqlite
        .prepare(
          "UPDATE completed_sessions SET setsEditedAt = max(unixepoch(), ifnull(setsEditedAt, 0) + 1) WHERE id = ?",
        )
        .run(id);
    },

    async remove(id: number) {
      assert.equal(await completed().deleteSession(id), "deleted");
    },

    /** Recorded on another phone and received through sync. */
    fromOtherPhone(id: number) {
      t.sqlite
        .prepare("UPDATE completed_sessions SET originDevice = 'their-phone' WHERE id = ?")
        .run(id);
    },

    uuidOf,
  };
}

export type HealthJournal = ReturnType<typeof healthJournal>;

type LedgerRow = { sessionUuid: string; version: number; route: number; failed: string | null };

/** One entry, one record: Health Connect holds exactly the sent entries, under their own ids. */
function oneRecordPerEntry(hc: FakeHealthConnect, ledger: LedgerRow[]): string[] {
  const { healthRecordId } =
    require("../../src/healthExport/record") as typeof import("../../src/healthExport/record");
  const expected = new Set(
    ledger.filter((r) => r.failed === null).map((r) => healthRecordId(r.sessionUuid)),
  );
  const held = new Set(hc.records.keys());
  return [
    ...[...held]
      .filter((id) => !expected.has(id))
      .map((id) => `record without a sent entry: ${id}`),
    ...[...expected].filter((id) => !held.has(id)).map((id) => `sent entry missing: ${id}`),
  ];
}

/** Nothing left, in the ledger or in Health Connect, for an entry deleted in the journal. */
function nothingForDeleted(hc: FakeHealthConnect, ledger: LedgerRow[], journal: Set<string>) {
  const uuidOf = (id: string) => id.replace(/^bati-/, "").replace(/-distance$/, "");
  return [
    ...ledger
      .filter((r) => !journal.has(r.sessionUuid))
      .map((r) => `ledger keeps a deleted entry: ${r.sessionUuid}`),
    ...[...hc.distances.keys()]
      .filter((id) => !journal.has(uuidOf(id)))
      .map((id) => `distance for a deleted entry: ${id}`),
  ];
}

/** Every record, and its distance, equals what the mapper makes of the entry now. */
async function recordsAreCurrent(hc: FakeHealthConnect, ledger: LedgerRow[], journal: Set<string>) {
  const db = require("../../db/healthExport") as typeof import("../../db/healthExport");
  const sync =
    require("../../src/healthExport/sync") as typeof import("../../src/healthExport/sync");
  const record =
    require("../../src/healthExport/record") as typeof import("../../src/healthExport/record");
  const { language, format, fallbackTitle } = await sync.healthExportWording();
  const sent = ledger.filter((r) => r.failed === null && journal.has(r.sessionUuid));
  const sessions = await db.exportSessions(
    sent.map((r) => ({ uuid: r.sessionUuid, version: r.version, route: r.route === 1 })),
    language,
    fallbackTitle,
    (key) => key.route === true,
  );
  const broken: string[] = [];
  for (const session of sessions) {
    const want: HealthRecord = record.toHealthRecord(session, format);
    if (JSON.stringify(hc.records.get(want.id)) !== JSON.stringify(want)) {
      broken.push(`stale record: ${want.id}`);
    }
    const distance = hc.distances.get(record.distanceRecordId(session.uuid));
    if ((want.distance?.meters ?? null) !== (distance?.meters ?? null)) {
      broken.push(`stale distance: ${want.id}`);
    }
  }
  return broken;
}

/**
 * The invariants the export promises, checked against the fake once the queue is empty.
 * Returns the list of broken ones, so a failing property names what broke.
 */
export async function brokenInvariants(
  t: { sqlite: Database.Database },
  hc: FakeHealthConnect,
): Promise<string[]> {
  const journal = new Set(
    (t.sqlite.prepare("SELECT uuid FROM completed_sessions").all() as { uuid: string }[]).map(
      (r) => r.uuid,
    ),
  );
  const ledger = t.sqlite.prepare("SELECT * FROM health_export").all() as LedgerRow[];
  return [
    ...oneRecordPerEntry(hc, ledger),
    ...nothingForDeleted(hc, ledger, journal),
    ...(await recordsAreCurrent(hc, ledger, journal)),
  ];
}
