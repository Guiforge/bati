/**
 * A name for a session that survives leaving this database.
 *
 * `completed_sessions.id` is an `AUTOINCREMENT` counter, so it is a name only inside one SQLite
 * file: two phones training the same week both write `id = 143`. Nothing breaks while a backup
 * is a whole-file `VACUUM INTO` — restoring replaces — but the day two journals have to merge row
 * by row there is no key that says "that session". This is that key.
 *
 * Version 7 rather than 4: the first 48 bits are the unix millisecond, so sorting the strings
 * sorts the sessions. `drizzle/0038_sessions_name_themselves.sql` backfills existing rows from
 * their own `performedAt` with the same layout, which is why the whole journal — before and after
 * the migration — orders by `uuid` exactly as it orders by time.
 *
 * ponytail: `Math.random()` for the 74 random bits, not a CSPRNG. This is local collision
 *           avoidance, not a secret: the ceiling is the day a uuid becomes something signed,
 *           quoted back by a server, or guessed at — then `expo-crypto` and its native module.
 *           Note that its `randomUUID()` is v4 and would cost the ordering above, so the swap is
 *           the random half only.
 */

/** What a uuid looks like here. The one definition — `uuidv7()` and the 0038 backfill share it. */
export const UUID_V7_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-7[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;

/** Random lowercase hex, `length` characters of it. */
function randomHex(length: number): string {
  let out = "";
  while (out.length < length) {
    // 8 hex chars per draw, zero-padded: `toString(16)` drops leading zeros, and a shorter
    // chunk would quietly shift every field after it.
    out += Math.floor(Math.random() * 0x1_0000_0000)
      .toString(16)
      .padStart(8, "0");
  }
  return out.slice(0, length);
}

/**
 * @param ms the instant this name stands for. Pass the session's `performedAt`, not the clock:
 *   the 0038 backfill reads each row's own `performedAt`, so a writer that reads `Date.now()`
 *   instead puts the save time in half the journal and the session time in the other half, and
 *   `ORDER BY uuid` stops being `ORDER BY performedAt` at the seam. It defaults to now for a
 *   name with no row behind it — `getDeviceId()`.
 */
export function uuidv7(ms: number = Date.now()): string {
  // 48 bits of unix milliseconds, hex. Twelve characters until the year 10889.
  const ts = ms.toString(16).padStart(12, "0");
  // The variant nibble is 8, 9, a or b — 2 bits fixed, 2 random.
  const variant = "89ab"[Math.floor(Math.random() * 4)];

  return `${ts.slice(0, 8)}-${ts.slice(8, 12)}-7${randomHex(3)}-${variant}${randomHex(3)}-${randomHex(12)}`;
}
