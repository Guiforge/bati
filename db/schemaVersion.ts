/**
 * Increment this for a breaking schema/content change that needs a fresh start.
 *
 * No retro-compat: the DB filename is version-suffixed, so a bump simply opens a new empty file
 * and re-runs every migration from scratch — the old file is just orphaned. A backup taken under
 * a different version is refused on restore for the same reason (db/backup.ts).
 *
 * It lives alone, apart from db/client.ts, only so that code which must not load `expo-sqlite`
 * can still read it — db/backup.ts stamps it into the database, and the Node test suite asserts
 * against it.
 */
export const SCHEMA_VERSION = 3;
