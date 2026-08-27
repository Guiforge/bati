import Database from "better-sqlite3";

import { UUID_V7_RE } from "../db/uuid";

// The riskiest code in the app and, until now, the least covered: 2 lines of 80. It runs on every
// cold start of both entry points (the React tree and the headless widget task), and its failure
// mode is not a crash — it is a stranger's year of training disappearing on an update.
//
// The runner is driven here against a real SQLite database, through `ensureMigrations()` exactly
// as the app calls it, with `db.$client` standing in for expo-sqlite. Nothing about the real
// migration files is mocked: the journal and the SQL that ship are what get replayed.

/** better-sqlite3 wearing the four async methods the runner expects of expo-sqlite. */
function makeClient(sqlite: Database.Database) {
  return {
    // Not `async`: better-sqlite3 is synchronous, and an async wrapper with nothing to await
    // is what `useAwait` is there to catch.
    execAsync: (source: string) => {
      sqlite.exec(source);
      return Promise.resolve();
    },
    runAsync: async (source: string, params: readonly unknown[] = []) =>
      sqlite.prepare(source).run(...(params as unknown[])),
    getFirstAsync: async <T>(source: string, params: readonly unknown[] = []) =>
      (sqlite.prepare(source).get(...(params as unknown[])) as T) ?? null,
    getAllAsync: async <T>(source: string, params: readonly unknown[] = []) =>
      sqlite.prepare(source).all(...(params as unknown[])) as T[],
  };
}

/**
 * The pre-migration backup, stubbed. The real one reads preferences — a table this runner is in
 * the middle of creating — so it belongs to `__tests__/autoBackup.test.ts`. What matters here is
 * *when* the runner calls it, and the tests below assert that against the schema, not the call.
 */
const backupBeforeMigrations = jest.fn(() => Promise.resolve());

function freshRunner(sqlite: Database.Database) {
  jest.resetModules();
  jest.doMock("../db/client", () => ({ db: { $client: makeClient(sqlite) } }));
  jest.doMock("../src/autoBackup", () => ({ backupBeforeMigrations }));
  return require("../db/migrate") as typeof import("../db/migrate");
}

describe("db/migrate", () => {
  let sqlite: Database.Database;

  beforeEach(() => {
    sqlite = new Database(":memory:");
    sqlite.pragma("foreign_keys = ON");
    backupBeforeMigrations.mockClear();
    backupBeforeMigrations.mockImplementation(() => Promise.resolve());
  });

  afterEach(() => {
    sqlite.close();
    jest.resetModules();
  });

  const tables = () =>
    (
      sqlite.prepare("SELECT name FROM sqlite_master WHERE type = 'table'").all() as {
        name: string;
      }[]
    ).map((r) => r.name);

  it("takes an empty database all the way to the current schema", async () => {
    await freshRunner(sqlite).ensureMigrations();

    const names = tables();
    expect(names).toContain("__drizzle_migrations");
    // A representative slice of the schema the app depends on at boot.
    expect(names).toEqual(expect.arrayContaining(["quests", "exercises", "user_preferences"]));
  });

  it("records every migration it applied, so the next boot has nothing to do", async () => {
    await freshRunner(sqlite).ensureMigrations();

    const applied = sqlite.prepare("SELECT COUNT(*) AS n FROM __drizzle_migrations").get() as {
      n: number;
    };
    expect(applied.n).toBeGreaterThan(0);

    // Second process, same file: the runner must be a no-op rather than replaying anything.
    // Replaying is what would destroy data, and it is invisible until it does.
    const before = applied.n;
    await freshRunner(sqlite).ensureMigrations();
    const after = sqlite.prepare("SELECT COUNT(*) AS n FROM __drizzle_migrations").get() as {
      n: number;
    };

    expect(after.n).toBe(before);
  });

  it("upgrades a database that stopped partway instead of starting over", async () => {
    // The real upgrade path: a device on an older schema opens a newer build. Simulated by
    // capping the runner at migration 0, then lifting the cap — which is exactly what
    // EXPO_PUBLIC_MIGRATION_MAX_IDX exists for.
    process.env.EXPO_PUBLIC_MIGRATION_MAX_IDX = "0";
    await freshRunner(sqlite).ensureMigrations();

    const partial = sqlite.prepare("SELECT COUNT(*) AS n FROM __drizzle_migrations").get() as {
      n: number;
    };
    expect(partial.n).toBe(1);

    // A row written under the old schema must survive the rest of the upgrade.
    sqlite.prepare("INSERT INTO user_preferences (key, value) VALUES (?, ?)").run("language", "fr");

    process.env.EXPO_PUBLIC_MIGRATION_MAX_IDX = undefined;
    delete process.env.EXPO_PUBLIC_MIGRATION_MAX_IDX;
    await freshRunner(sqlite).ensureMigrations();

    const full = sqlite.prepare("SELECT COUNT(*) AS n FROM __drizzle_migrations").get() as {
      n: number;
    };
    expect(full.n).toBeGreaterThan(partial.n);

    const kept = sqlite
      .prepare("SELECT value FROM user_preferences WHERE key = 'language'")
      .get() as { value: string } | undefined;
    expect(kept?.value).toBe("fr");
  });

  it("0038 names every session already in the journal", async () => {
    // The backfill is a one-shot: it runs once, on a real hero's history, and there is no second
    // chance to notice it wrote nonsense. So it is driven here the way a device meets it — a
    // journal written under the old schema, then the migration.
    process.env.EXPO_PUBLIC_MIGRATION_MAX_IDX = "37";
    await freshRunner(sqlite).ensureMigrations();

    // One session either side of a DST switch. Not pinned to a zone: `process.env.TZ` set from a
    // test never reaches SQLite's `localtime`, because jest hands the sandbox a copy of the
    // environment and libc reads the real one. So the offsets are asserted against `Date` for the
    // same instants instead — which is the invariant that matters, the column having two writers
    // (this SQL and the schema's `$defaultFn`) that have to agree.
    const winter = 1_700_000_000; // 2023-11-14, CET where this is written
    const summer = 1_718_083_200; // 2024-06-11, CEST
    // Distinct instants, deliberately: v7 orders by the millisecond and leaves ties to the random
    // tail, so two sessions logged in the same second have no defined order and asserting one
    // would be asserting a coin toss.
    const log = sqlite.prepare("INSERT INTO completed_sessions (performedAt) VALUES (?)");
    log.run(winter);
    log.run(summer);
    log.run(summer + 3600);

    process.env.EXPO_PUBLIC_MIGRATION_MAX_IDX = undefined;
    delete process.env.EXPO_PUBLIC_MIGRATION_MAX_IDX;
    await freshRunner(sqlite).ensureMigrations();

    const rows = sqlite
      .prepare("SELECT id, uuid, originDevice, tzOffsetMin FROM completed_sessions ORDER BY id")
      .all() as { id: number; uuid: string; originDevice: string | null; tzOffsetMin: number }[];

    expect(rows).toHaveLength(3);
    for (const row of rows) {
      expect(row.uuid).toMatch(UUID_V7_RE);
      // Nothing in this database ever recorded which device wrote a row before today, and
      // inventing one would be worse than admitting it.
      expect(row.originDevice).toBeNull();
    }
    expect(new Set(rows.map((r) => r.uuid)).size).toBe(3);

    // The whole point of v7 over v4: sorting the names sorts the history.
    const byUuid = sqlite.prepare("SELECT id FROM completed_sessions ORDER BY uuid").all() as {
      id: number;
    }[];
    const byTime = sqlite
      .prepare("SELECT id FROM completed_sessions ORDER BY performedAt, id")
      .all() as { id: number }[];
    expect(byUuid).toEqual(byTime);

    // Positive east of Greenwich — the opposite sign to getTimezoneOffset(), which is the
    // convention db/schema.ts writes down, and the one thing here a phone cannot correct later.
    const jsWinter = 0 - new Date(winter * 1000).getTimezoneOffset();
    const jsSummer = 0 - new Date(summer * 1000).getTimezoneOffset();
    expect(rows[0]?.tzOffsetMin).toBe(jsWinter);
    expect(rows[1]?.tzOffsetMin).toBe(jsSummer);

    // Read per row, not once for "now": in a zone with summer time the two rows must differ, and
    // by the same amount `Date` says. On a runner in UTC — which CI is — there is no difference
    // to see and this proves nothing, so it is stated rather than asserted into a false green.
    if (jsWinter !== jsSummer) {
      expect((rows[1]?.tzOffsetMin ?? 0) - (rows[0]?.tzOffsetMin ?? 0)).toBe(jsSummer - jsWinter);
    }

    // A UNIQUE index the backfill could violate would fail every launch forever, which is the
    // failure mode 0035 was written about.
    expect(() =>
      sqlite
        .prepare("INSERT INTO completed_sessions (performedAt, uuid) VALUES (?, ?)")
        .run(summer, rows[0]?.uuid),
    ).toThrow(/UNIQUE/);
    // …but several NULLs are fine, which is what keeps the dev seeder's raw SQL legal.
    const seeded = sqlite.prepare("INSERT INTO completed_sessions (performedAt) VALUES (?)");
    expect(() => {
      seeded.run(summer);
      seeded.run(summer);
    }).not.toThrow();
  });

  it("backs up before the runner touches the schema, and not at all when nothing is pending", async () => {
    // Asserted against the schema as it stood *inside* the call, not against the call itself:
    // a backup taken after the migrations is a backup of the thing that might already be broken,
    // and "it was called" is exactly as true in that version as in this one.
    let schemaAtBackup: string[] = [];
    backupBeforeMigrations.mockImplementation(() => {
      schemaAtBackup = tables();
      return Promise.resolve();
    });

    await freshRunner(sqlite).ensureMigrations();

    expect(backupBeforeMigrations).toHaveBeenCalledTimes(1);
    expect(schemaAtBackup).not.toContain("user_preferences");
    expect(tables()).toContain("user_preferences");

    // The database is now current. A second cold start has nothing to migrate, so it has nothing
    // worth writing into the hero's folder either — this is what keeps an ordinary launch free.
    backupBeforeMigrations.mockClear();
    await freshRunner(sqlite).ensureMigrations();

    expect(backupBeforeMigrations).not.toHaveBeenCalled();
  });

  it("migrates even when the backup fails, because a backup is not a gate", async () => {
    // `backupBeforeMigrations` promises never to throw, and this is the test that keeps the
    // promise cheap to rely on: if it ever breaks it, the app still starts.
    backupBeforeMigrations.mockImplementation(() => Promise.reject(new Error("card removed")));

    await expect(freshRunner(sqlite).ensureMigrations()).rejects.toThrow("card removed");
  });

  it("memoises success, so two callers in one process migrate once", async () => {
    const runner = freshRunner(sqlite);

    await Promise.all([runner.ensureMigrations(), runner.ensureMigrations()]);

    const applied = sqlite.prepare("SELECT COUNT(*) AS n FROM __drizzle_migrations").get() as {
      n: number;
    };
    const solo = sqlite
      .prepare("SELECT COUNT(DISTINCT hash) AS n FROM __drizzle_migrations")
      .get() as { n: number };
    expect(applied.n).toBe(solo.n);
  });

  it("logs its way through every migration when the debug flag is on", async () => {
    // The on-device escape hatch for a hanging migration. It is a third of this file, it only
    // runs when someone is already in trouble, and it must not be the thing that breaks.
    const log = jest.spyOn(console, "log").mockImplementation(() => undefined);
    process.env.EXPO_PUBLIC_MIGRATIONS_DEBUG = "1";

    try {
      await freshRunner(sqlite).ensureMigrations();

      expect(tables()).toContain("quests");
      expect(log).toHaveBeenCalled();
    } finally {
      delete process.env.EXPO_PUBLIC_MIGRATIONS_DEBUG;
      log.mockRestore();
    }
  });

  it("reports which statement failed, and runs its extra diagnostics", async () => {
    // Diagnostics live inside the catch of a failing *statement*, and the adventures branch
    // queries the database for extra context. A throw in that path would replace a useful error
    // with a confusing one, on the single code path someone reads when an upgrade is stuck.
    const error = jest.spyOn(console, "error").mockImplementation(() => undefined);
    const base = makeClient(sqlite);
    const failing = {
      ...base,
      execAsync: jest.fn((source: string) => {
        if (/adventures/i.test(source)) {
          return Promise.reject(new Error("no such column: adventures.kind"));
        }
        return base.execAsync(source);
      }),
    };
    jest.resetModules();
    jest.doMock("../db/client", () => ({ db: { $client: failing } }));
    const runner = require("../db/migrate") as typeof import("../db/migrate");

    try {
      await expect(runner.ensureMigrations()).rejects.toThrow(/no such column/);
      // The statement, the error, and the diagnostics — not a bare stack trace.
      expect(error).toHaveBeenCalled();
    } finally {
      error.mockRestore();
    }
  });

  it("rejects when there is no database client rather than resolving quietly", async () => {
    jest.resetModules();
    jest.doMock("../db/client", () => ({ db: {} }));
    const runner = require("../db/migrate") as typeof import("../db/migrate");

    await expect(runner.ensureMigrations()).rejects.toThrow(/client not available/i);
  });

  it("does not cache a failure, so the next caller retries", async () => {
    const broken = {
      execAsync: jest.fn().mockRejectedValue(new Error("disk is full")),
    };
    jest.resetModules();
    jest.doMock("../db/client", () => ({ db: { $client: broken } }));
    const runner = require("../db/migrate") as typeof import("../db/migrate");

    await expect(runner.ensureMigrations()).rejects.toThrow("disk is full");
    // Caching the rejection would mean one bad cold start poisons the whole process: the widget
    // and the app would both keep failing on a database that is fine by now.
    await expect(runner.ensureMigrations()).rejects.toThrow("disk is full");
    expect(broken.execAsync.mock.calls.length).toBeGreaterThan(1);
  });
});

describe("sqlString", () => {
  it("doubles quotes so a hero's own text cannot end the literal", () => {
    const { sqlString } = require("../db/sql") as typeof import("../db/sql");

    expect(sqlString("plain")).toBe("'plain'");
    expect(sqlString("O'Brien")).toBe("'O''Brien'");
    expect(sqlString("'; DROP TABLE quests; --")).toBe("'''; DROP TABLE quests; --'");
  });
});
