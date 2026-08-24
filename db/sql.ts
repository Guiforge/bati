/**
 * The SQLite helpers that must not load the driver: they import nothing, so anything may import
 * them.
 *
 * That constraint is the module, and it is the same one `db/schemaVersion.ts` was split out for.
 * `errorTrail` lives here because `src/autoBackup.ts` runs before the migration runner and has to
 * classify a read failure — pulling it out of `db/backup.ts` would have dragged `db/client.ts`,
 * and with it `expo-sqlite`, into a path that only wanted to read an error message.
 *
 * ## SQL literal quoting
 *
 * It lived in `db/migrate.ts` and was exported "because db/backup.ts interpolates file paths
 * into SQL too" — which made `backup → migrate` an edge, and left `migrate → backup` impossible
 * without a cycle. The migration runner needs to write a snapshot before it runs, so the edge
 * had to go the other way. A module that imports nothing cannot take part in a cycle at all.
 */
export function sqlString(value: string) {
  return `'${value.replaceAll("'", "''")}'`;
}

/**
 * Every message and driver code down the `cause` chain, lowercased into one string.
 *
 * Duck-typed rather than `instanceof Error`, which is the bug this replaced. Drizzle wraps the
 * driver error, so the useful text ("file is not a database") sits on `cause` while the outer
 * message only repeats the SQL — and an `instanceof` that answers false there discards the only
 * half worth reading. It answers false more often than it looks: jest's sandbox gives the test
 * realm its own `Error`, so four rejection tests classified correctly on one machine and
 * degraded to `unreadable` on CI, on the same driver and the same SQLite. Expo's native bridge
 * is the same hazard at runtime.
 *
 * The depth cap is for a `cause` that points back at its own error.
 *
 * `src/autoBackup.ts` has the same problem from the other end: it has to tell "the preferences
 * table does not exist yet" apart from a real read failure, and that text is on `cause` too.
 */
export function errorTrail(error: unknown): string {
  const parts: string[] = [];
  let current = error as { message?: unknown; code?: unknown; cause?: unknown } | null | undefined;

  for (let depth = 0; current && depth < 5; depth++) {
    if (typeof current.message === "string") parts.push(current.message);
    // `SQLITE_NOTADB` and friends outlive the prose: SQLite's wording has changed before.
    if (typeof current.code === "string") parts.push(current.code);
    current = current.cause as typeof current;
  }

  return parts.join(" ").toLowerCase();
}
