import fs from "node:fs";
import os from "node:os";
import path from "node:path";

import Database from "better-sqlite3";

import { clientMock, createTestDb } from "./helpers/testDb";

/**
 * Every rejection below was probed against a real SQLite file before it was written down.
 * Two of them are counter-intuitive and are the reason the checks run in this order:
 *
 * - a zero-byte file is a *valid* SQLite database: it attaches, and `integrity_check` says "ok".
 *   Worse, `ATTACH` *creates* one when the path is free, so a candidate that vanished looks
 *   exactly like a candidate that was empty. `page_count` is the only thing that catches either,
 *   and it is read *after* `integrity_check`, where a database is already known to be readable
 *   and 0 pages can only mean "empty".
 * - zeroing bytes in the header's unused area does not make a file "corrupt" to SQLite. Damage
 *   has to land on a b-tree page for `integrity_check` to notice, which is why the corruption
 *   case below writes over page 4 rather than over an arbitrary offset.
 */

const t = createTestDb();
let dir: string;

beforeAll(() => {
  jest.resetModules();
  jest.doMock("../db/client", () => clientMock(t));
  dir = fs.mkdtempSync(path.join(os.tmpdir(), "bati-backup-"));
});

afterAll(() => {
  t.close();
  fs.rmSync(dir, { recursive: true, force: true });
});

function backupModule() {
  return require("../db/backup") as typeof import("../db/backup");
}

/** A file path inside the scratch dir that does not exist yet — VACUUM INTO insists on that. */
function scratch(name: string) {
  return path.join(dir, name);
}

/** Produces a snapshot of the live test database, the way the app's export does. */
async function makeValidBackup(name: string) {
  const { stampDatabaseIdentity, snapshotDatabaseTo } = backupModule();
  await stampDatabaseIdentity();
  const target = scratch(name);
  await snapshotDatabaseTo(target);
  return target;
}

describe("db/backup — identity", () => {
  test("stamps application_id and user_version onto the live database", async () => {
    const { stampDatabaseIdentity, BATI_APPLICATION_ID } = backupModule();
    const { SCHEMA_VERSION } =
      require("../db/schemaVersion") as typeof import("../db/schemaVersion");

    await stampDatabaseIdentity();

    expect(t.sqlite.pragma("application_id", { simple: true })).toBe(BATI_APPLICATION_ID);
    expect(t.sqlite.pragma("user_version", { simple: true })).toBe(SCHEMA_VERSION);
  });

  test("the stamp survives the snapshot, which is what lets a backup identify itself", async () => {
    const { BATI_APPLICATION_ID } = backupModule();
    const target = await makeValidBackup("identity.db");

    const snapshot = new Database(target, { readonly: true });
    expect(snapshot.pragma("application_id", { simple: true })).toBe(BATI_APPLICATION_ID);
    snapshot.close();
  });
});

describe("db/backup — export", () => {
  test("the snapshot opens and carries the same rows as the source", async () => {
    await t.db.run(
      require("drizzle-orm").sql.raw(
        "INSERT INTO user_preferences (key, value) VALUES ('exported', 'yes')",
      ),
    );
    const target = await makeValidBackup("export.db");

    const snapshot = new Database(target, { readonly: true });
    const row = snapshot.prepare("SELECT value FROM user_preferences WHERE key = 'exported'").get();
    expect(row).toEqual({ value: "yes" });
    snapshot.close();
  });

  test("refuses to overwrite an existing file, so a snapshot never clobbers one", async () => {
    const { snapshotDatabaseTo } = backupModule();
    const target = await makeValidBackup("once.db");

    await expect(snapshotDatabaseTo(target)).rejects.toThrow();
  });
});

describe("db/backup — validation accepts", () => {
  test("a snapshot this build produced", async () => {
    const { validateBackup } = backupModule();
    const target = await makeValidBackup("valid.db");

    expect(await validateBackup(target)).toEqual({ ok: true });
  });

  test("and leaves nothing attached, so a second validation still works", async () => {
    const { validateBackup } = backupModule();
    const first = await makeValidBackup("attach-1.db");
    const second = await makeValidBackup("attach-2.db");

    expect(await validateBackup(first)).toEqual({ ok: true });
    expect(await validateBackup(second)).toEqual({ ok: true });
  });
});

describe("db/backup — validation rejects", () => {
  async function rejectionFor(name: string, write: (target: string) => void | Promise<void>) {
    const { validateBackup } = backupModule();
    const target = scratch(name);
    await write(target);
    const result = await validateBackup(target);
    if (result.ok) throw new Error(`expected ${name} to be rejected`);
    return result.reason;
  }

  test("a text file", async () => {
    expect(
      await rejectionFor("poem.db", (p) => fs.writeFileSync(p, "dear diary, today I did not lift")),
    ).toBe("notSqlite");
  });

  test("a file whose SQLite header has been broken", async () => {
    expect(
      await rejectionFor("header.db", async (p) => {
        const source = await makeValidBackup("header-source.db");
        const bytes = fs.readFileSync(source);
        bytes.write("NotSQLite fmt 9\0", 0, "utf8");
        fs.writeFileSync(p, bytes);
      }),
    ).toBe("notSqlite");
  });

  test("a truncated file", async () => {
    expect(
      await rejectionFor("cut.db", async (p) => {
        const source = await makeValidBackup("cut-source.db");
        const bytes = fs.readFileSync(source);
        fs.writeFileSync(p, bytes.subarray(0, Math.floor(bytes.length / 2)));
      }),
    ).toBe("corrupt");
  });

  test("a file with a mangled b-tree page", async () => {
    expect(
      await rejectionFor("mangled.db", async (p) => {
        const source = await makeValidBackup("mangled-source.db");
        const bytes = fs.readFileSync(source);
        bytes.fill(0x41, 4096 * 3, 4096 * 4);
        fs.writeFileSync(p, bytes);
      }),
    ).toBe("corrupt");
  });

  test("an empty file — valid SQLite, and the reason page_count is checked at all", async () => {
    expect(await rejectionFor("empty.db", (p) => fs.writeFileSync(p, ""))).toBe("unreadable");
  });

  test("somebody else's database", async () => {
    expect(
      await rejectionFor("recipes.db", (p) => {
        const other = new Database(p);
        other.exec("CREATE TABLE recipes (id INTEGER PRIMARY KEY, title TEXT)");
        other.close();
      }),
    ).toBe("notBati");
  });

  test("a Bati backup from another SCHEMA_VERSION", async () => {
    expect(
      await rejectionFor("old-schema.db", async (p) => {
        const source = await makeValidBackup("old-schema-source.db");
        fs.copyFileSync(source, p);
        const stale = new Database(p);
        stale.pragma("user_version = 2");
        stale.close();
      }),
    ).toBe("incompatibleVersion");
  });

  test("a backup whose newest migration this build has never heard of", async () => {
    expect(
      await rejectionFor("from-the-future.db", async (p) => {
        const source = await makeValidBackup("future-source.db");
        fs.copyFileSync(source, p);
        const ahead = new Database(p);
        ahead
          .prepare("INSERT INTO __drizzle_migrations (hash, created_at) VALUES (?, ?)")
          .run("a-migration-from-a-later-release", 9_999_999_999_999);
        ahead.close();
      }),
    ).toBe("incompatibleVersion");
  });

  test("a backup with no migration history at all", async () => {
    expect(
      await rejectionFor("no-history.db", async (p) => {
        const source = await makeValidBackup("no-history-source.db");
        fs.copyFileSync(source, p);
        const blank = new Database(p);
        blank.exec("DELETE FROM __drizzle_migrations");
        blank.close();
      }),
    ).toBe("incompatibleVersion");
  });

  test("a path that does not exist", async () => {
    const { validateBackup } = backupModule();
    const result = await validateBackup(path.join(dir, "nested", "missing.db"));
    expect(result).toEqual({ ok: false, reason: "unreadable" });
  });

  /**
   * The case above only fails because the *parent directory* is missing. In a writable one —
   * which is where the staged import lives — `ATTACH` happily creates the file it was asked to
   * open, and every later check then describes a database SQLite invented a moment ago.
   */
  test("a candidate that vanished from a writable directory, rather than 'not Bati's'", async () => {
    const { validateBackup } = backupModule();
    const result = await validateBackup(scratch("vanished.db"));
    expect(result).toEqual({ ok: false, reason: "unreadable" });
  });

  test("two validations in a row, so a bound alias never outlives the first", async () => {
    const { validateBackup } = backupModule();
    const target = await makeValidBackup("twice.db");

    expect(await validateBackup(target)).toEqual({ ok: true });
    expect(await validateBackup(target)).toEqual({ ok: true });
  });

  /**
   * The four cases above passed here and came back `unreadable` on CI, on the same driver and
   * the same SQLite: the classifier reached the driver's message through `instanceof Error`, and
   * jest gives the test realm its own `Error` constructor, so `cause` was silently dropped.
   *
   * A real driver cannot reproduce that — it depends on which realm built the object — so this
   * feeds the classifier what a foreign realm looks like: the right shape, the wrong prototype.
   * Reverting to `instanceof` fails this and nothing else.
   */
  test("a driver error from another realm classifies like a native one", async () => {
    jest.resetModules();
    jest.doMock("../db/client", () => ({
      ...clientMock(t),
      db: {
        run: () => {
          throw Object.assign(Object.create(null), {
            message: "Failed to run the query 'ATTACH DATABASE ...'",
            cause: Object.assign(Object.create(null), {
              message: "file is not a database",
              code: "SQLITE_NOTADB",
            }),
          });
        },
      },
    }));

    try {
      const { validateBackup } = backupModule();
      expect(await validateBackup(scratch("realm.db"))).toEqual({ ok: false, reason: "notSqlite" });
    } finally {
      // In a `finally` because a failed expectation throws: without it, the throwing stub above
      // stays installed and takes the next test down with it, which is how a one-test regression
      // reads as two.
      jest.resetModules();
      jest.doMock("../db/client", () => clientMock(t));
    }
  });

  test("a path containing a quote, without breaking the SQL around it", async () => {
    const { validateBackup } = backupModule();
    const target = scratch("l'hero.db");
    fs.writeFileSync(target, "not a database");

    expect(await validateBackup(target)).toEqual({ ok: false, reason: "notSqlite" });
  });
});
