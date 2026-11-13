import fs from "node:fs";
import os from "node:os";
import path from "node:path";

import Database from "better-sqlite3";

import { clientMock, createTestDb } from "./helpers/testDb";

/**
 * A backup from the old phone, restored onto this one, as two real SQLite files. The hero's
 * preferences must arrive; the old phone's device-local ones must not, and this phone's must stay.
 * The case that shipped: the old phone's backup folder came along, its Android permission did not,
 * and the next restore failed on "the destination path does not exist".
 */
const t = createTestDb();
let dir: string;

beforeAll(() => {
  jest.resetModules();
  jest.doMock("../db/client", () => clientMock(t));
  dir = fs.mkdtempSync(path.join(os.tmpdir(), "bati-keep-"));
});

afterAll(() => {
  t.close();
  fs.rmSync(dir, { recursive: true, force: true });
});

const backup = () => require("../db/backup") as typeof import("../db/backup");

function setPref(sqlite: Database.Database, key: string, value: string) {
  sqlite
    .prepare(
      "INSERT INTO user_preferences (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value",
    )
    .run(key, value);
}

function addPair(sqlite: Database.Database, id: string) {
  sqlite
    .prepare(
      "INSERT INTO pairs (id, secret, name, selfId, createdAt, updatedAt) VALUES (?, 's', 'Léo', 'me', 1, 1)",
    )
    .run(id);
}

test("a copy without companions, restored on a phone that has some, says they leave", async () => {
  const staged = path.join(dir, "plain.db");
  await backup().snapshotDatabaseTo(staged);
  // Nobody here: nothing to say.
  expect(await backup().companionsLeaving(staged)).toBe(false);

  addPair(t.sqlite, "p1");
  expect(await backup().companionsLeaving(staged)).toBe(true);

  // A copy that holds companions of its own takes none away.
  const sealed = new Database(staged);
  addPair(sealed, "p2");
  sealed.close();
  expect(await backup().companionsLeaving(staged)).toBe(false);
  t.sqlite.exec("DELETE FROM pairs");
});

function prefs(file: string): Record<string, string> {
  const sqlite = new Database(file);
  const rows = sqlite.prepare("SELECT key, value FROM user_preferences").all() as {
    key: string;
    value: string;
  }[];
  sqlite.close();
  return Object.fromEntries(rows.map((r) => [r.key, r.value]));
}

test("the backup brings the hero, and this phone keeps its own folder, id and crash log", async () => {
  // The old phone, as its backup file.
  const staged = path.join(dir, "old-phone.db");
  await backup().snapshotDatabaseTo(staged);
  const old = new Database(staged);
  setPref(old, "villageName", "Hautecombe");
  setPref(old, "deviceId", "old-phone");
  setPref(old, "backupFolderUri", "content://old/tree/primary%3ADocuments");
  setPref(old, "customAvatarUri", "file:///data/old/avatar.jpg");
  // The photo itself, about 30 KB of it: the hero's face, not the old phone's cache.
  setPref(old, "customAvatar", `data:image/jpeg;base64,${"A".repeat(40_000)}`);
  setPref(old, "updateLatest", "9.9.9");
  setPref(old, "backupEncryption", "on");
  setPref(old, "savedSession", '{"questId":3}');
  setPref(old, "bigFeastsShown", '["reveal"]');
  old.close();

  // This phone: a folder of its own, and no custom avatar at all.
  setPref(t.sqlite, "deviceId", "this-phone");
  setPref(t.sqlite, "backupFolderUri", "content://this/tree/primary%3ABati");
  setPref(t.sqlite, "crashLog", "[]");
  setPref(t.sqlite, "bigFeastsShown", '["age"]');

  await backup().keepDeviceSettings(staged);

  const after = prefs(staged);
  expect(after.villageName).toBe("Hautecombe");
  expect(after.deviceId).toBe("this-phone");
  expect(after.backupFolderUri).toBe("content://this/tree/primary%3ABati");
  expect(after.crashLog).toBe("[]");
  // Feasts follow the hero (R38), like the streak: the backup's list wins over this phone's.
  expect(after.bigFeastsShown).toBe('["reveal"]');
  expect(after).not.toHaveProperty("customAvatarUri");
  expect(after.customAvatar).toBe(`data:image/jpeg;base64,${"A".repeat(40_000)}`);
  // The other phone's update check says nothing about this copy of the app.
  expect(after).not.toHaveProperty("updateLatest");
  // Sealing is this phone's choice: an import it declined to join must not lock it.
  expect(after).not.toHaveProperty("backupEncryption");
});

test("a backup from before the portable avatar keeps the photo this phone already ported", async () => {
  const staged = path.join(dir, "pre-avatar.db");
  await backup().snapshotDatabaseTo(staged);
  const old = new Database(staged);
  old.prepare("DELETE FROM user_preferences WHERE key = 'customAvatar'").run();
  old.close();
  setPref(t.sqlite, "customAvatar", "data:image/jpeg;base64,THIS");

  await backup().keepDeviceSettings(staged);

  expect(prefs(staged).customAvatar).toBe("data:image/jpeg;base64,THIS");
});

test("a session interrupted on either device does not survive the swap", async () => {
  const staged = path.join(dir, "interrupted.db");
  await backup().snapshotDatabaseTo(staged);
  const old = new Database(staged);
  setPref(old, "savedSession", '{"questId":3}');
  old.close();
  setPref(t.sqlite, "savedSession", '{"questId":7}');

  await backup().keepDeviceSettings(staged);

  // Resumed here while the other device finishes it too, it would count, and hit the boss, twice.
  expect(prefs(staged)).not.toHaveProperty("savedSession");
});

test("the hero's animal follows the backup, like the village name", async () => {
  const staged = path.join(dir, "animal.db");
  await backup().snapshotDatabaseTo(staged);
  const old = new Database(staged);
  setPref(old, "crestAnimal", "stag");
  old.close();
  setPref(t.sqlite, "crestAnimal", "boar");

  await backup().keepDeviceSettings(staged);

  expect(prefs(staged).crestAnimal).toBe("stag");
});

test("what this phone wrote to Health Connect leaves in no copy and survives a restore", async () => {
  t.sqlite.exec("DELETE FROM health_export");
  t.sqlite
    .prepare("INSERT INTO health_export (sessionUuid, version) VALUES ('mine', 7), ('newer', 9)")
    .run();

  const staged = path.join(dir, "health.db");
  await backup().snapshotDatabaseTo(staged);
  const copy = new Database(staged);
  expect(copy.prepare("SELECT count(*) n FROM health_export").get()).toEqual({ n: 0 });
  // As if the copy came from another phone that had written its own.
  copy.prepare("INSERT INTO health_export (sessionUuid, version) VALUES ('theirs', 3)").run();
  // An older copy: it holds 'mine' but not 'newer', a session played after it was made.
  copy.prepare("INSERT INTO completed_sessions (uuid, performedAt) VALUES ('mine', 0)").run();
  copy.close();

  await backup().keepDeviceSettings(staged);

  const restored = new Database(staged);
  expect(restored.prepare("SELECT sessionUuid, version FROM health_export").all()).toEqual([
    { sessionUuid: "mine", version: 7 },
  ]);
  // 'newer' is not in the ledger any more, so it is not taken back from Health Connect: the hero
  // never deleted it, the copy is only older.
  expect(
    restored.prepare("SELECT value FROM user_preferences WHERE key = 'healthExportSince'").get(),
  ).toBe(undefined);
  restored.close();
});

test("the Health Connect switch is this phone's: a restore neither brings nor drops it", async () => {
  setPref(t.sqlite, "healthExportSince", "1000");
  const staged = path.join(dir, "switch.db");
  await backup().snapshotDatabaseTo(staged);
  const copy = new Database(staged);
  setPref(copy, "healthExportSince", "2000");
  copy.close();

  await backup().keepDeviceSettings(staged);

  const restored = new Database(staged);
  expect(
    restored.prepare("SELECT value FROM user_preferences WHERE key = 'healthExportSince'").get(),
  ).toEqual({
    value: "1000",
  });
  restored.close();
  t.sqlite.exec("DELETE FROM user_preferences WHERE key = 'healthExportSince'");
});

test("a backup from before 0088 restores: the ledger is copied by the columns the copy has", async () => {
  t.sqlite.exec("DELETE FROM health_export");
  t.sqlite
    .prepare(
      "INSERT INTO health_export (sessionUuid, version, route, failed) VALUES ('mine', 7, 1, NULL)",
    )
    .run();
  const staged = path.join(dir, "pr1.db");
  await backup().snapshotDatabaseTo(staged);
  // The copy a build with 0087 and not 0088 wrote: its ledger has two columns.
  const copy = new Database(staged);
  copy.exec(
    "DROP TABLE health_export; CREATE TABLE health_export (sessionUuid text PRIMARY KEY NOT NULL, version integer NOT NULL)",
  );
  copy.prepare("INSERT INTO completed_sessions (uuid, performedAt) VALUES ('mine', 0)").run();
  copy.close();

  await backup().keepDeviceSettings(staged);

  const restored = new Database(staged);
  expect(restored.prepare("SELECT * FROM health_export").all()).toEqual([
    { sessionUuid: "mine", version: 7 },
  ]);
  restored.close();
  t.sqlite.exec("DELETE FROM health_export");
});

test("the route option, the past sessions question and a history run stay this phone's", async () => {
  for (const [key, value] of [
    ["healthExportRoute", "1"],
    ["healthHistoryAsked", "1"],
    ["healthHistoryRunning", "1"],
  ] as const) {
    setPref(t.sqlite, key, value);
  }
  const staged = path.join(dir, "options.db");
  await backup().snapshotDatabaseTo(staged);
  const copy = new Database(staged);
  copy.exec("DELETE FROM user_preferences WHERE key LIKE 'health%'");
  copy.close();

  await backup().keepDeviceSettings(staged);

  const restored = new Database(staged);
  expect(
    restored
      .prepare("SELECT key, value FROM user_preferences WHERE key LIKE 'health%' ORDER BY key")
      .all(),
  ).toEqual([
    { key: "healthExportRoute", value: "1" },
    { key: "healthHistoryAsked", value: "1" },
    { key: "healthHistoryRunning", value: "1" },
  ]);
  restored.close();
  t.sqlite.exec("DELETE FROM user_preferences WHERE key LIKE 'health%'");
});
