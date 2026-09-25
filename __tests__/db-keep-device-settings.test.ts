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
  old.close();

  // This phone: a folder of its own, and no custom avatar at all.
  setPref(t.sqlite, "deviceId", "this-phone");
  setPref(t.sqlite, "backupFolderUri", "content://this/tree/primary%3ABati");
  setPref(t.sqlite, "crashLog", "[]");

  await backup().keepDeviceSettings(staged);

  const after = prefs(staged);
  expect(after.villageName).toBe("Hautecombe");
  expect(after.deviceId).toBe("this-phone");
  expect(after.backupFolderUri).toBe("content://this/tree/primary%3ABati");
  expect(after.crashLog).toBe("[]");
  expect(after).not.toHaveProperty("customAvatarUri");
});
