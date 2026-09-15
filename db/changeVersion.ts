import { sql } from "drizzle-orm";
import { db } from "./client";
import { dayKey } from "./dates";

/**
 * Every write the app has made, and the day: one query, cheap enough for every focus.
 *
 * `total_changes()` counts the rows this connection has inserted, updated or deleted since it
 * opened, and the app writes through one connection (`db/client.ts`). So it moves with a session
 * saved, an oath sworn, a quest configured, a favourite, an adventure step, a hero-written quest
 * or movement, the language: whatever a screen reads, without a list of tables to keep in step
 * with what it reads. The day is there for the windows ("the last 30 days", the flame) that move
 * with no write at all.
 *
 * Wider than any one screen needs, on purpose: a write nobody displays costs one extra reload,
 * a missed one costs a stale screen. It relies on reads never writing, which
 * `__tests__/db-change-version.test.ts` holds for Home's.
 */
export async function getChangeVersion(): Promise<string> {
  const row = await db.get<{ changes: number }>(sql`SELECT total_changes() AS changes`);
  return `${row?.changes ?? 0}|${dayKey(new Date())}`;
}
