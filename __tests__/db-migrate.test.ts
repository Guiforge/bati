import Database from "better-sqlite3";

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

function freshRunner(sqlite: Database.Database) {
  jest.resetModules();
  jest.doMock("../db/client", () => ({ db: { $client: makeClient(sqlite) } }));
  return require("../db/migrate") as typeof import("../db/migrate");
}

describe("db/migrate", () => {
  let sqlite: Database.Database;

  beforeEach(() => {
    sqlite = new Database(":memory:");
    sqlite.pragma("foreign_keys = ON");
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
    const { sqlString } = require("../db/migrate") as typeof import("../db/migrate");

    expect(sqlString("plain")).toBe("'plain'");
    expect(sqlString("O'Brien")).toBe("'O''Brien'");
    expect(sqlString("'; DROP TABLE quests; --")).toBe("'''; DROP TABLE quests; --'");
  });
});
