/**
 * What a restore is shown that is not an honest backup (I10): the app refuses it and says why, or accepts only
 * what it can run. Each file is made from a real database of a device, then spoiled one way.
 */
import fs from "node:fs";
import path from "node:path";

import { openRawSqlite } from "../../../__tests__/helpers/testDb";

import { type Device, newDevice } from "../harness/device";
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
});
