import type { SQLiteDatabase, SQLiteExecuteSyncResult, SQLiteStatement } from "expo-sqlite";

/**
 * The handle Drizzle is given: the app's own, except that a statement is finalised once its rows
 * have been read.
 *
 * Drizzle's expo driver prepares a statement for every query and never finalises it. One that read
 * only its first row (`.get()`, and every `getFirstSync`) is left on that row, still inside its read
 * transaction, and in WAL mode a reader that never ends pins the log: `wal_checkpoint(TRUNCATE)`
 * cannot empty it, so a deleted pair secret stayed in `-wal` for good (lot 0 bis, measured on a
 * release build). Finalising after the read ends the transaction.
 *
 * Safe because nothing in the app reuses a Drizzle statement: no `.prepare()` outside the tests,
 * and the driver makes a fresh one per query. A write is left as it is: it ran to its end in
 * `executeSync`, holds no reader, and the driver reads `changes` off the result afterwards.
 */
export function releasingStatements(database: SQLiteDatabase): SQLiteDatabase {
  return new Proxy(database, {
    get(target, prop) {
      if (prop === "prepareSync") {
        return (source: string) => releasing(target.prepareSync(source));
      }
      const value: unknown = Reflect.get(target, prop, target);
      return typeof value === "function" ? value.bind(target) : value;
    },
  });
}

function releasing(statement: SQLiteStatement): SQLiteStatement {
  const finalisingReads = <T>(result: SQLiteExecuteSyncResult<T>) => {
    const first = result.getFirstSync;
    const all = result.getAllSync;
    const once = <R>(read: () => R): R => {
      try {
        return read();
      } finally {
        statement.finalizeSync();
      }
    };
    // The result is a generator with these defined as configurable properties (expo-sqlite).
    Object.defineProperties(result, {
      getFirstSync: { value: () => once(first), configurable: true },
      getAllSync: { value: () => once(all), configurable: true },
    });
    return result;
  };
  return new Proxy(statement, {
    get(target, prop) {
      if (prop === "executeSync" || prop === "executeForRawResultSync") {
        return (...params: unknown[]) =>
          finalisingReads(
            (target[prop] as (...p: unknown[]) => SQLiteExecuteSyncResult<unknown>)(...params),
          );
      }
      const value: unknown = Reflect.get(target, prop, target);
      return typeof value === "function" ? value.bind(target) : value;
    },
  });
}
