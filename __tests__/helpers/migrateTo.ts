import type Database from "better-sqlite3";

/** better-sqlite3 wearing the four async methods the migration runner expects of expo-sqlite. */
export function makeClient(sqlite: Database.Database) {
  return {
    execAsync: (source: string) => {
      sqlite.exec(source);
      return Promise.resolve();
    },
    runAsync: (source: string, params: readonly unknown[] = []) =>
      Promise.resolve(sqlite.prepare(source).run(...(params as unknown[]))),
    getFirstAsync: <T>(source: string, params: readonly unknown[] = []) =>
      Promise.resolve((sqlite.prepare(source).get(...(params as unknown[])) as T) ?? null),
    getAllAsync: <T>(source: string, params: readonly unknown[] = []) =>
      Promise.resolve(sqlite.prepare(source).all(...(params as unknown[])) as T[]),
  };
}

/** The app's migration runner on `sqlite`, stopped after `maxIdx` when one is given. */
export async function migrate(sqlite: Database.Database, maxIdx?: number) {
  if (maxIdx === undefined) delete process.env.EXPO_PUBLIC_MIGRATION_MAX_IDX;
  else process.env.EXPO_PUBLIC_MIGRATION_MAX_IDX = String(maxIdx);
  jest.resetModules();
  jest.doMock("../../db/client", () => ({ db: { $client: makeClient(sqlite) } }));
  jest.doMock("../../src/autoBackup", () => ({
    backupBeforeMigrations: () => Promise.resolve(),
    copyBeforeMigrations: () => Promise.resolve(),
  }));
  try {
    await (require("../../db/migrate") as typeof import("../../db/migrate")).ensureMigrations();
  } finally {
    delete process.env.EXPO_PUBLIC_MIGRATION_MAX_IDX;
  }
}
