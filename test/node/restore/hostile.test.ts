/**
 * What a restore is shown that is not an honest backup (I10): the app refuses it and says why, or accepts only
 * what it can run. Each file is made from a real database of a device, then spoiled one way.
 */
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

import { getExerciseThumb } from "@/constants/assetMap";
import { SCHEMA_VERSION } from "@/db/schemaVersion";
import { migrate } from "../../../__tests__/helpers/migrateTo";
import { openRawSqlite } from "../../../__tests__/helpers/testDb";

import { type Device, newDevice, reports } from "../harness/device";
import { useDeviceClocks } from "../harness/world";

beforeAll(() => useDeviceClocks());

let a: Device;
let dir: string;

beforeEach(async () => {
  a = await newDevice("A");
  a.addSessions(3, "a");
  dir = fs.mkdtempSync(path.join(a.dir, "staged-"));
});
afterEach(() => a.close());

/** An honest copy of the device's database, which each test then spoils. */
function honestCopy(name: string): string {
  const file = path.join(dir, name);
  a.sqlite.exec(`VACUUM INTO '${file}'`);
  return file;
}

function spoil(file: string, sql: string): void {
  const db = openRawSqlite(file);
  db.exec(sql);
  db.close();
}

const check = (file: string) => a.app.dbBackup.validateBackup(file);

describe("a database that is not an honest backup", () => {
  test("an honest copy is accepted (the control of every case below)", async () => {
    expect(await check(honestCopy("ok.db"))).toEqual({ ok: true });
  });

  test("not SQLite: a text file, an empty file, random bytes", async () => {
    const text = path.join(dir, "text.db");
    fs.writeFileSync(
      text,
      "this is not a database, only a long enough sentence to fill a header ".repeat(80),
    );
    const empty = path.join(dir, "empty.db");
    fs.writeFileSync(empty, "");
    const noise = path.join(dir, "noise.db");
    fs.writeFileSync(
      noise,
      Buffer.from(Array.from({ length: 8192 }, (_, i) => (i * 31 + 7) % 256)),
    );

    expect(await check(text)).toEqual({ ok: false, reason: "notSqlite" });
    expect(await check(noise)).toEqual({ ok: false, reason: "notSqlite" });
    // Zero bytes is no database either, and never a Bati one.
    expect((await check(empty)).ok).toBe(false);
  });

  test("truncated: half of an honest copy", async () => {
    const file = honestCopy("half.db");
    fs.truncateSync(file, Math.floor(fs.statSync(file).size / 2));
    expect((await check(file)).ok).toBe(false);
  });

  test("another application's SQLite database", async () => {
    const file = path.join(dir, "other.db");
    const db = openRawSqlite(file);
    db.exec(
      "CREATE TABLE contacts (id INTEGER PRIMARY KEY, name TEXT); INSERT INTO contacts (name) VALUES ('x');",
    );
    db.close();
    expect(await check(file)).toEqual({ ok: false, reason: "notBati" });
  });

  test("a table missing from this build's schema", async () => {
    const file = honestCopy("missing.db");
    spoil(file, "DROP TABLE completed_sessions");
    expect(await check(file)).toEqual({ ok: false, reason: "schemaMismatch" });
  });

  test("an extra table", async () => {
    const file = honestCopy("extra.db");
    spoil(file, "CREATE TABLE loot (id INTEGER)");
    expect(await check(file)).toEqual({ ok: false, reason: "schemaMismatch" });
  });

  test("a TRIGGER that would run on the hero's next write is not a backup this build can adopt", async () => {
    const file = honestCopy("trigger.db");
    spoil(
      file,
      "CREATE TRIGGER wipe AFTER INSERT ON completed_sessions BEGIN DELETE FROM completed_sessions; END",
    );
    expect((await check(file)).ok).toBe(false);
  });

  test("a VIEW is not part of this build's schema either", async () => {
    const file = honestCopy("view.db");
    spoil(file, "CREATE VIEW everything AS SELECT * FROM completed_sessions");
    expect((await check(file)).ok).toBe(false);
  });

  test("a column of the wrong type is a different schema", async () => {
    const file = honestCopy("type.db");
    spoil(
      file,
      "ALTER TABLE completed_sessions RENAME TO old_sessions; CREATE TABLE completed_sessions AS SELECT * FROM old_sessions; DROP TABLE old_sessions",
    );
    expect(await check(file)).toEqual({ ok: false, reason: "schemaMismatch" });
  });

  // Passes now and pins the sink: whatever a restore leaves in `imagePath`, the screens only ever
  // draw a carried picture (one sink, `carriedPhoto`), never a request to a stranger's server.
  test("a URL in an exercise's imagePath survives the restore and is never drawn", async () => {
    const file = honestCopy("image.db");
    spoil(file, "UPDATE exercises SET imagePath = 'https://attacker.example/p.png'");
    expect(await check(file)).toEqual({ ok: true });
    await a.app.dbBackup.keepDeviceSettings(file);

    const db = openRawSqlite(file);
    const row = db.prepare("SELECT imagePath FROM exercises LIMIT 1").get() as {
      imagePath: string;
    };
    db.close();
    expect(row.imagePath).toBe("https://attacker.example/p.png");
    expect(getExerciseThumb(row.imagePath)).toBe(require("@/assets/placeholder.webp"));
  });
});

describe("a backup from an older migration", () => {
  const journal = require("../../../drizzle/meta/_journal.json") as {
    entries: { idx: number; when: number }[];
  };
  const newest = journal.entries.at(-1);
  const secondNewest = journal.entries.at(-2);
  assert(newest && secondNewest);

  const IMPORT_NAME = "bati-import.tmp.db";
  const sideFiles = ["-wal", "-shm", "-journal"];
  /** Where the app stages a picked file: beside the live database, under its own name. */
  const stagedPath = () => path.join(path.dirname(a.sqlite.name), IMPORT_NAME);
  const forward = (file: string) => a.app.dbBackup.bringForward(file);

  function latestIn(file: string): number {
    const db = openRawSqlite(file);
    const row = db.prepare("SELECT max(created_at) AS w FROM __drizzle_migrations").get() as {
      w: number;
    };
    db.close();
    return Number(row.w);
  }

  /** The current schema, as a phone on this build writes it, staged where the app stages one. */
  function stageCurrent(sql?: string): string {
    const file = stagedPath();
    a.sqlite.exec(`VACUUM INTO '${file}'`);
    if (sql) spoil(file, sql);
    return file;
  }

  /** What a phone one migration behind wrote: migrated by the app's runner, stamped, snapshotted. */
  async function stageOlder(sql?: string): Promise<string> {
    assert(secondNewest);
    const built = openRawSqlite(path.join(dir, "older.db"));
    await migrate(built, secondNewest.idx);
    // `migrate` leaves its mocked `db/client` instantiated in the shared registry, where it would
    // win over the next device's own (`jest.isolateModules` reads that registry first).
    jest.resetModules();
    built.exec(`PRAGMA application_id = ${a.app.dbBackup.BATI_APPLICATION_ID}`);
    built.exec(`PRAGMA user_version = ${SCHEMA_VERSION}`);
    if (sql) built.exec(sql);
    const file = stagedPath();
    built.exec(`VACUUM INTO '${file}'`);
    built.close();
    return file;
  }

  test("a backup that claims an older migration it cannot reach is refused before the swap", async () => {
    const file = stageCurrent(
      "DELETE FROM __drizzle_migrations WHERE created_at = (SELECT max(created_at) FROM __drizzle_migrations)",
    );
    reports.length = 0;

    expect(await forward(file)).toEqual({ ok: false, reason: "incompatibleVersion" });
    expect(reports.map((r) => r.context)).toContain("backup.bringForward");
  });

  test("an honest backup from an older Bati is brought forward and restores", async () => {
    const file = await stageOlder();
    expect(latestIn(file)).toBe(secondNewest.when);

    expect(await forward(file)).toEqual({ ok: true });
    expect(latestIn(file)).toBe(newest.when);
  });

  test.each([
    ["with a migration pending", true],
    ["with nothing pending", false],
  ])("bringing forward leaves no side file, %s", async (_label, pending) => {
    const file = pending ? await stageOlder() : stageCurrent();
    spoil(file, "PRAGMA journal_mode = WAL");

    expect(await forward(file)).toEqual({ ok: true });

    for (const suffix of sideFiles) expect(fs.existsSync(`${file}${suffix}`)).toBe(false);
    // The main file alone, copied away from anything beside it, holds the new migration row.
    const alone = path.join(dir, "alone.db");
    fs.copyFileSync(file, alone);
    expect(latestIn(alone)).toBe(newest.when);
  });

  test("an extra index is refused", async () => {
    const evil = "CREATE INDEX evil ON user_preferences(updatedAt)";
    expect(await check(stageCurrent(evil))).toEqual({ ok: false, reason: "schemaMismatch" });
    fs.rmSync(stagedPath());
    expect(await forward(await stageOlder(evil))).toEqual({
      ok: false,
      reason: "schemaMismatch",
    });
  });
});
