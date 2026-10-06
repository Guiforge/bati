/**
 * One simulated device of the Node harness: the app's real data code (sync, cipher, backup files, merge,
 * migrations) running in this process, with the platform replaced at its edges only:
 *
 *   expo-file-system  -> the real disk, in a folder of its own          (fakeExpoFs.ts)
 *   expo-sqlite / db  -> better-sqlite3 on a file, real migrations       (__tests__/helpers/testDb.ts)
 *   expo-secure-store -> a Map per device
 *   bati-crypto       -> the Node doubles of the Kotlin module            (__tests__/helpers/nodeBatiCrypto*.ts)
 *
 * Each device gets its own module registry, so `deviceSync` of device A and of device B do not share a
 * variable: they meet only through the server, as two phones do. Everything the data code needs is required
 * while the device is made, never later, because a lazy `require` would find the mocks of the device made last.
 */
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { clientMock, createTestDb } from "../../../__tests__/helpers/testDb";
import { SCHEMA_VERSION } from "../../../db/schemaVersion";
import { makeExpoFs } from "./fakeExpoFs";

export type App = {
  deviceSync: typeof import("../../../src/deviceSync");
  cipher: typeof import("../../../src/backupCipher");
  files: typeof import("../../../src/backupFiles");
  ids: typeof import("../../../src/installId");
  cloud: typeof import("../../../src/cloudSync");
  dbBackup: typeof import("../../../db/backup");
  quest: typeof import("../../../src/questFile");
  unlock: typeof import("../../../src/vaultUnlock");
  completed: typeof import("../../../db/completed");
};

export type Device = {
  name: string;
  dir: string;
  app: App;
  /** The live database, for what a test seeds or reads straight. */
  sqlite: ReturnType<typeof createTestDb>["sqlite"];
  secure: Map<string, string>;
  /**
   * A copy of this device's database in a file of its own: what Android restores onto a new phone (the database
   * travels with the app's backup, the keystore does not).
   */
  copyOfDatabase(): string;
  addSessions(count: number, tag: string): string[];
  /**
   * The campaign moves past this session: it completed a step and a later step is completed too, so `deleteSession`
   * answers "locked" for it. False when this device does not hold the session.
   */
  lockSession(uuid: string): boolean;
  sessions(): string[];
  close(): void;
};

const DB_NAME = `bati.v${SCHEMA_VERSION}.db`;
let counter = 0;

/** `restoreFrom`: a database copied from another phone, with an empty secure store: Android's restore onto a new one. */
export async function newDevice(name: string, restoreFrom?: string): Promise<Device> {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), `bati-node-${name}-`));
  const dbDir = path.join(dir, "SQLite");
  fs.mkdirSync(dbDir, { recursive: true });
  if (restoreFrom) fs.copyFileSync(restoreFrom, path.join(dbDir, DB_NAME));
  const test = createTestDb(path.join(dbDir, DB_NAME), { migrated: restoreFrom !== undefined });
  const secure = new Map<string, string>();
  let app!: App;

  jest.isolateModules(() => {
    jest.doMock("expo-file-system", () => makeExpoFs(path.join(dir, "cache")));
    jest.doMock("expo-sqlite", () => ({ defaultDatabaseDirectory: dbDir }));
    jest.doMock("expo-secure-store", () => ({
      getItemAsync: (key: string) => Promise.resolve(secure.get(key) ?? null),
      setItemAsync: (key: string, value: string) => {
        secure.set(key, value);
        return Promise.resolve();
      },
      deleteItemAsync: (key: string) => {
        secure.delete(key);
        return Promise.resolve();
      },
      canUseBiometricAuthentication: () => false,
    }));
    jest.doMock("expo-sharing", () => ({
      isAvailableAsync: () => Promise.resolve(false),
      shareAsync: jest.fn(),
    }));
    jest.doMock("@/db/client", () => ({
      ...clientMock(test),
      DB_NAME,
      SAFETY_NAME: `${DB_NAME}.bak`,
      closeDatabase: () => Promise.resolve(),
    }));
    jest.doMock("@/modules/bati-crypto", () => ({
      batiCrypto: () =>
        jest.requireActual("../../../__tests__/helpers/nodeBatiCrypto").nodeBatiCrypto,
    }));
    jest.doMock("@/modules/bati-save", () => ({
      batiSave: () => {
        throw new Error("no save screen in Node");
      },
      NO_FILE_PICKER: "NO_FILE_PICKER",
    }));
    jest.doMock("@/src/reportError", () => ({
      reportError: (context: string, error: unknown) => reports.push({ context, error }),
    }));
    app = {
      deviceSync: require("../../../src/deviceSync"),
      cipher: require("../../../src/backupCipher"),
      files: require("../../../src/backupFiles"),
      ids: require("../../../src/installId"),
      cloud: require("../../../src/cloudSync"),
      dbBackup: require("../../../db/backup"),
      quest: require("../../../src/questFile"),
      unlock: require("../../../src/vaultUnlock"),
      completed: require("../../../db/completed"),
    };
  });
  // The floor Argon2, as the unit tests use: 64 MiB at every unlock makes a hundred syncs a very long test.
  app.cipher.argon.memoryKib = 19 * 1024;
  app.cipher.argon.fallbackKib = 19 * 1024;
  app.cipher.argon.passes = 2;

  // What the app's own opening of the database stamps on it, and what a peer checks before it reads a snapshot.
  await app.dbBackup.stampDatabaseIdentity();
  counter += 1;
  const device: Device = {
    name,
    dir,
    app,
    sqlite: test.sqlite,
    secure,
    copyOfDatabase() {
      const file = path.join(
        os.tmpdir(),
        `bati-restore-${name}-${Math.random().toString(36).slice(2)}.db`,
      );
      test.sqlite.exec(`VACUUM INTO '${file}'`);
      return file;
    },
    addSessions(count, tag) {
      const made: string[] = [];
      const insert = test.sqlite.prepare(
        "INSERT INTO completed_sessions (uuid, userLevel, xpEarned, performedAt, leaguesM, movingSeconds) VALUES (?, 'medium', ?, ?, 0, 0)",
      );
      for (let i = 0; i < count; i++) {
        const uuid = `${tag}-${String(i).padStart(3, "0")}-${counter}${i}`;
        insert.run(uuid, 10 + i, Math.floor(Date.now() / 1000) - 3600 * (count - i));
        made.push(uuid);
      }
      return made;
    },
    lockSession(uuid) {
      const row = test.sqlite
        .prepare("SELECT id FROM completed_sessions WHERE uuid = ?")
        .get(uuid) as { id: number } | undefined;
      if (!row) return false;
      const run = test.sqlite
        .prepare(
          "INSERT INTO adventure_runs (adventureId, status) VALUES ((SELECT min(id) FROM adventures), 'active')",
        )
        .run();
      const step = test.sqlite.prepare(
        "INSERT INTO adventure_run_steps (runId, stepIndex, questId, status, completedSessionId) VALUES (?, ?, (SELECT min(id) FROM quests), 'completed', ?)",
      );
      step.run(run.lastInsertRowid, 0, row.id);
      step.run(run.lastInsertRowid, 1, null);
      return true;
    },
    sessions() {
      return (
        test.sqlite.prepare("SELECT uuid FROM completed_sessions WHERE uuid IS NOT NULL").all() as {
          uuid: string;
        }[]
      )
        .map((row) => row.uuid)
        .sort();
    },
    close() {
      test.close();
      fs.rmSync(dir, { recursive: true, force: true });
    },
  };
  return device;
}

/** What the data code reported through `reportError`, for every device: the app's own error trail. */
export const reports: { context: string; error: unknown }[] = [];
