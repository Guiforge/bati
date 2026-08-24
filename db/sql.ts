/**
 * SQL literal quoting, alone in a file with no imports.
 *
 * It lived in `db/migrate.ts` and was exported "because db/backup.ts interpolates file paths
 * into SQL too" — which made `backup → migrate` an edge, and left `migrate → backup` impossible
 * without a cycle. The migration runner needs to write a snapshot before it runs, so the edge
 * had to go the other way. A module that imports nothing cannot take part in a cycle at all.
 */
export function sqlString(value: string) {
  return `'${value.replaceAll("'", "''")}'`;
}
