import { sql } from "drizzle-orm";
import type { TransactionTx } from "./client";

/**
 * Remembers that the hero deleted a quest or a movement, by uuid (0074), so device sync does not
 * read another device's copy as news and bring it back. `deletedAt` is `nextEditStamp`'s rule
 * applied to the row's `updatedAt`: never older than the row it removes, so a phone whose clock
 * runs ahead cannot leave a deletion that loses to the very copy it deleted. A deletion already
 * there only ever moves later. A row with no uuid (raw SQL) has nothing to remember.
 */
export async function writeContentTombstone(
  tx: TransactionTx,
  table: "quests" | "exercises" | "hero_bosses",
  id: number,
): Promise<void> {
  // `hero_bosses` holds hero rows only: no owner column to test.
  const owner =
    table === "quests" ? sql`author` : table === "exercises" ? sql`creator` : sql`'hero'`;
  await tx.run(sql`INSERT INTO deleted_content (uuid, deletedAt)
    SELECT uuid, max(unixepoch(), ifnull(updatedAt, 0) + 1) FROM ${sql.identifier(table)}
    WHERE id = ${id} AND ${owner} = 'hero' AND uuid IS NOT NULL
    ON CONFLICT(uuid) DO UPDATE SET deletedAt = max(deletedAt, excluded.deletedAt)`);
}
