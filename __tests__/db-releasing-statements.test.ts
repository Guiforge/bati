import type { SQLiteDatabase } from "expo-sqlite";
import { releasingStatements } from "../db/releasingStatements";

/**
 * The one thing that empties the WAL after a secret is deleted: a statement Drizzle read from is
 * finalised, so no reader is left pinning the log. Jest has no expo-sqlite, so the handle is a fake
 * shaped like it; the measurement on a release build is in docs/designs/multiplayer/reviews/LOT1.md.
 */
function fakeDatabase() {
  const finalized: string[] = [];
  const prepareSync = (source: string) => {
    const result = (rows: unknown[]) => {
      const out = { changes: 1, lastInsertRowId: 7 } as Record<string, unknown>;
      Object.defineProperties(out, {
        getFirstSync: { value: () => rows[0] ?? null, configurable: true },
        getAllSync: { value: () => rows, configurable: true },
      });
      return out;
    };
    return {
      executeSync: () => result([{ a: 1 }, { a: 2 }]),
      executeForRawResultSync: () => result([[1], [2]]),
      finalizeSync: () => finalized.push(source),
      getColumnNamesSync: () => ["a"],
    };
  };
  const database = { prepareSync, execSync: jest.fn(), name: "bati" };
  return {
    database: database as unknown as SQLiteDatabase,
    finalized,
    execSync: database.execSync,
  };
}

test("a statement read for its first row is finalised, and still answers", () => {
  const { database, finalized } = fakeDatabase();
  const statement = releasingStatements(database).prepareSync("SELECT 1");
  expect(statement.executeSync([]).getFirstSync()).toEqual({ a: 1 });
  expect(finalized).toEqual(["SELECT 1"]);
});

test("reading every row, or the raw values, finalises too", () => {
  const { database, finalized } = fakeDatabase();
  const handle = releasingStatements(database);
  expect(handle.prepareSync("A").executeSync([]).getAllSync()).toHaveLength(2);
  expect(handle.prepareSync("B").executeForRawResultSync([]).getAllSync()).toEqual([[1], [2]]);
  expect(finalized).toEqual(["A", "B"]);
});

test("a write is left alone: its result is read for changes, never for rows", () => {
  const { database, finalized } = fakeDatabase();
  const result = releasingStatements(database).prepareSync("DELETE").executeSync([]);
  expect(result.changes).toBe(1);
  expect(result.lastInsertRowId).toBe(7);
  expect(finalized).toEqual([]);
});

test("everything else reaches the real handle", () => {
  const { database, execSync } = fakeDatabase();
  const handle = releasingStatements(database);
  handle.execSync("PRAGMA x");
  expect(execSync).toHaveBeenCalledWith("PRAGMA x");
  expect((handle as unknown as { name: string }).name).toBe("bati");
});
